/** Read model for the political statements archive. */
import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";

export interface FigureView {
  id: string;
  label: string;
  value: string | null;
  unit: string | null;
  documentId: string;
  check: { kind: string } & Record<string, unknown> | null;
}

export const getClaimsArchive = cache(async (speaker: string) => {
  const statements = await db.politicalStatement.findMany({
    where: { speaker },
    orderBy: { saidOn: "asc" },
    include: { claims: { orderBy: { ordinal: "asc" } } },
  });
  const docIds = new Set<string>();
  for (const s of statements) {
    s.documentIds.forEach((d) => docIds.add(d));
    for (const c of s.claims) for (const f of c.figures as unknown as FigureView[]) docIds.add(f.documentId);
  }
  const docs = await db.sourceDocument.findMany({ where: { id: { in: [...docIds] } } });
  const documents = Object.fromEntries(
    docs.map((d) => [
      d.id,
      { id: d.id, title: d.title, publisher: d.publisher, url: d.pageUrl ?? d.url, sha256: d.sha256, publishedOn: d.publishedOn?.toISOString().slice(0, 10) ?? null },
    ]),
  );
  return {
    statements: statements.map((s) => ({
      id: s.id,
      date: s.saidOn.toISOString().slice(0, 10),
      title: s.title,
      platform: s.platform,
      summary: s.summary,
      budgetVersion: s.budgetVersion,
      documentIds: s.documentIds,
      claims: s.claims.map((c) => ({
        id: c.id,
        topic: c.topic,
        kind: c.kind as "factual" | "forecast" | "opinion",
        quote: c.quote,
        verdict: c.verdict,
        reasoning: c.reasoning,
        context: c.context,
        governmentPosition: c.governmentPosition,
        figures: c.figures as unknown as FigureView[],
        calculation: c.calculation as { formula: string; result: string; unit: string } | null,
        reviewedBy: c.reviewedBy,
        reviewedOn: c.reviewedOn.toISOString().slice(0, 10),
      })),
    })),
    documents,
  };
});

export type ClaimsArchiveView = Awaited<ReturnType<typeof getClaimsArchive>>;
export type ClaimView = ClaimsArchiveView["statements"][number]["claims"][number];
