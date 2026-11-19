/**
 * Load the verified claims archive and extra legislative events into PostgreSQL (idempotent:
 * replaces the archive's statements). Run after `npm run test` has verified the archive.
 *   npx tsx scripts/seed-claims.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { ClaimsArchive } from "../src/lib/claims/schema";

const ROOT = join(__dirname, "..");
const day = (d: string) => new Date(`${d.slice(0, 10)}T00:00:00Z`);

async function main() {
  const a = ClaimsArchive.parse(JSON.parse(readFileSync(join(ROOT, "data/claims/asen-vasilev.json"), "utf8")));
  const ev = JSON.parse(readFileSync(join(ROOT, "data/events/legislative.json"), "utf8")) as {
    documents: { id: string; publisher: string; title: string; url: string; publishedAt: string; sha256: string }[];
    events: { id: string; date: string; type: string; title: string; documentId: string; note: string | null }[];
  };
  const db = new PrismaClient();
  try {
    const docs = [
      ...a.documents.map((d) => ({ ...d, mime: "text/html" })),
      ...ev.documents.map((d) => ({ ...d, mime: "text/html", note: null })),
    ];
    await db.$transaction(async (tx) => {
      for (const d of docs) {
        const data = {
          sha256: d.sha256,
          bytes: 0,
          publisher: d.publisher,
          title: d.title,
          url: d.url,
          pageUrl: null,
          mime: d.url.endsWith(".docx") ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : d.mime,
          retrievedOn: day(a.reviewedOn),
          publishedOn: d.publishedAt ? day(d.publishedAt) : null,
          legalStatus: d.note ?? null,
          versionId: null,
        };
        await tx.sourceDocument.upsert({ where: { id: d.id }, create: { id: d.id, ...data }, update: data });
      }
      for (const e of ev.events) {
        const data = { date: day(e.date), type: e.type, title: e.title, note: e.note, documentId: e.documentId };
        await tx.legislativeEvent.upsert({ where: { id: e.id }, create: { id: e.id, ...data }, update: data });
      }
      await tx.politicalStatement.deleteMany({ where: { speaker: a.speaker } });
      for (const s of a.statements) {
        await tx.politicalStatement.create({
          data: {
            id: s.id,
            speaker: a.speaker,
            saidOn: day(s.date),
            title: s.title,
            platform: s.platform,
            summary: s.summary,
            budgetVersion: s.budgetVersion,
            documentIds: s.documentIds,
            claims: {
              create: s.claims.map((c, i) => ({
                id: c.id,
                ordinal: i,
                topic: c.topic,
                kind: c.kind,
                quote: c.quote,
                verdict: c.verdict,
                reasoning: c.reasoning,
                context: c.context,
                governmentPosition: c.governmentPosition,
                figures: c.figures,
                calculation: c.calculation ?? undefined,
                reviewedBy: a.reviewer,
                reviewedOn: day(a.reviewedOn),
              })),
            },
          },
        });
      }
      await tx.auditLog.create({ data: { action: "claims.seed", target: a.speaker, details: { statements: a.statements.length, reviewer: a.reviewer } } });
    });
    console.log(`${a.statements.length} statements, ${a.statements.reduce((n, s) => n + s.claims.length, 0)} claims loaded`);
  } finally {
    await db.$disconnect();
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
