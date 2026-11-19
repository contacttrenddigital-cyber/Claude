/**
 * Load a data snapshot into PostgreSQL (idempotent) and optionally publish it.
 *
 *   npx tsx scripts/seed-snapshot.ts                       # load latest, do not publish
 *   npx tsx scripts/seed-snapshot.ts --publish --by "Име"  # load and publish (audited)
 *
 * A snapshot with any failed check can never be published. Publishing supersedes the previous
 * published snapshot; nothing is deleted, so earlier values stay queryable.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient, Prisma } from "@prisma/client";
import { SnapshotSchema } from "../src/lib/ingest/snapshot-schema";

const ROOT = join(__dirname, "..");
const args = process.argv.slice(2);
const publish = args.includes("--publish");
const by = args.includes("--by") ? args[args.indexOf("--by") + 1] : undefined;
const fileArg = args.find((a) => a.endsWith(".json"));

const dec = (v: string | null | undefined) => (v === null || v === undefined ? null : new Prisma.Decimal(v));
const day = (d: string | null) => (d ? new Date(`${d}T00:00:00Z`) : null);

async function main() {
  const file =
    fileArg ?? join(ROOT, "data/snapshots", JSON.parse(readFileSync(join(ROOT, "data/snapshots/latest.json"), "utf8")).file);
  const snap = SnapshotSchema.parse(JSON.parse(readFileSync(file, "utf8")));
  if (publish && !by) throw new Error("--publish requires --by <name>");
  const failed = snap.checks.filter((c) => c.status === "fail");
  if (publish && failed.length) throw new Error(`Refusing to publish: ${failed.length} failed checks`);

  const db = new PrismaClient();
  const job = await db.importJob.create({ data: { kind: "snapshot-seed", status: "running", log: `file=${file}` } });
  try {
    await db.$transaction(
      async (tx) => {
        for (const v of snap.versions) {
          await tx.budgetVersion.upsert({
            where: { id: v.id },
            create: { ...v, date: day(v.date)! },
            update: { label: v.label, stage: v.stage, legalStatus: v.legalStatus, evidence: v.evidence },
          });
        }
        for (const d of snap.documents) {
          const data = { ...d, retrievedOn: day(d.retrievedOn)!, publishedOn: day(d.publishedOn) };
          const existing = await tx.sourceDocument.findUnique({ where: { id: d.id } });
          if (existing && existing.sha256 !== d.sha256) {
            throw new Error(`Document ${d.id} changed (sha256 ${existing.sha256} → ${d.sha256}); give the new version a new id`);
          }
          if (!existing) await tx.sourceDocument.create({ data });
        }
        for (const m of snap.metrics) {
          await tx.metric.upsert({ where: { key: m.key }, create: m, update: m });
        }

        const exists = await tx.dataSnapshot.findUnique({ where: { id: snap.id } });
        if (!exists) {
          await tx.dataSnapshot.create({
            data: {
              id: snap.id,
              createdAt: new Date(snap.createdAt),
              retrievedOn: day(snap.retrievedOn)!,
              sigmaVersion: snap.sigma.dataVersion,
            },
          });
          for (const o of snap.observations) {
            await tx.metricObservation.create({
              data: {
                snapshotId: snap.id,
                metricKey: o.metricKey,
                versionId: o.versionId,
                period: o.period,
                vintage: o.vintage,
                value: dec(o.value),
                unit: o.unit,
                review: o.review,
                sources: {
                  create: o.sources.map((s, i) => ({
                    documentId: s.documentId,
                    ordinal: i,
                    locator: s.locator,
                    value: dec(s.value),
                    original: s.original,
                  })),
                },
              },
            });
          }
          await tx.budgetMeasure.createMany({
            data: snap.measures.map((m) => ({
              id: `${snap.id}:${m.id}`,
              snapshotId: snap.id,
              versionId: m.versionId,
              direction: m.direction,
              title: m.title,
              effect2027: dec(m.effects["2027"]),
              effect2028: dec(m.effects["2028"]),
              effect2029: dec(m.effects["2029"]),
              unit: m.unit,
              basis: m.basis,
              documentId: m.documentId,
              locator: m.locator,
            })),
          });
          await tx.validationCheck.createMany({
            data: snap.checks.map((c) => ({
              snapshotId: snap.id,
              checkId: c.id,
              kind: c.kind,
              status: c.status,
              description: c.description,
              details: c.details ?? undefined,
            })),
          });
          for (const t of snap.tables) {
            await tx.dataTable.create({ data: { snapshotId: snap.id, id: t.id, title: t.title, documentId: t.documentId, data: t } });
          }
          await tx.snapshotReference.createMany({
            data: [
              { snapshotId: snap.id, key: "glossary", data: snap.glossary },
              { snapshotId: snap.id, key: "committees", data: snap.committees },
            ],
          });
          await tx.municipalBudget.createMany({
            data: snap.municipalities.map((m) => ({
              ...m,
              snapshotId: snap.id,
              populationAsOf: day(m.populationAsOf)!,
              perCapita2027: dec(m.perCapita2027)!,
              perCapita2026: dec(m.perCapita2026)!,
            })),
          });
          await tx.versionDiff.createMany({
            data: snap.versionDiffs.map((d) => ({
              snapshotId: snap.id,
              fromId: "mf-draft-2026-11-06",
              toId: "bill-2026-11-16",
              label: d.label,
              period: d.period,
              before: dec(d.before),
              after: dec(d.after),
              difference: dec(d.difference),
            })),
          });
        }
        await tx.snapshotDocument.createMany({
          data: snap.documents.map((d) => ({ snapshotId: snap.id, documentId: d.id })),
          skipDuplicates: true,
        });
        for (const e of snap.legislativeEvents) {
          await tx.legislativeEvent.upsert({
            where: { id: e.id },
            create: { ...e, date: day(e.date)! },
            update: { title: e.title, note: e.note, documentId: e.documentId, type: e.type },
          });
        }

        if (publish) {
          await tx.dataSnapshot.updateMany({
            where: { publishedAt: { not: null }, supersededAt: null, NOT: { id: snap.id } },
            data: { supersededAt: new Date() },
          });
          await tx.dataSnapshot.update({ where: { id: snap.id }, data: { publishedAt: new Date(), publishedBy: by } });
          await tx.auditLog.create({
            data: { action: "snapshot.publish", target: snap.id, details: { by, file, checks: snap.checks.length } },
          });
        }
      },
      { timeout: 120_000 },
    );
    await db.importJob.update({
      where: { id: job.id },
      data: { status: "succeeded", finishedAt: new Date(), snapshotId: snap.id },
    });
    console.log(`${snap.id}: loaded${publish ? " and published" : ""} (${snap.observations.length} observations)`);
  } catch (e) {
    await db.importJob.update({ where: { id: job.id }, data: { status: "failed", finishedAt: new Date(), log: String(e) } });
    throw e;
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
