/**
 * Read model for public pages: only the currently PUBLISHED snapshot is ever shown.
 * Every observation passes the provenance gate (assertPublishable) before it is returned.
 */
import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { assertPublishable, type Status } from "@/lib/provenance/schema";
import type { Vintage } from "@/lib/ingest/documents";
import type { MeasureView, SeriesView } from "./types";
import { TableSchema, type TableData } from "@/lib/ingest/snapshot-schema";

const STATUS_OF: Record<Vintage, Status> = {
  actual: "report",
  expected: "expected",
  plan: "law",
  draft: "draft",
  forecast: "forecast",
};

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

export class NoPublishedSnapshotError extends Error {
  override name = "NoPublishedSnapshotError";
}

/**
 * SNAPSHOT_SOURCE=file: read the snapshot committed in git (data/snapshots/published.json, written by
 * scripts/vercel-build.sh) instead of the database. Used when the database cannot be reached at build
 * time; the content is the same snapshot the database would publish. Admin features are off in this mode.
 */
export const getPublished = cache(async () => (process.env.SNAPSHOT_SOURCE === "file" ? fromFile() : fromDb()));

async function fromDb() {
  const snapshot = await db.dataSnapshot.findFirst({
    where: { publishedAt: { not: null }, supersededAt: null },
    orderBy: { publishedAt: "desc" },
  });
  if (!snapshot) throw new NoPublishedSnapshotError("Няма публикувана снимка на данните");

  const [observations, measures, checks, diffs, events, versions, documents, tables] = await Promise.all([
    db.metricObservation.findMany({
      where: { snapshotId: snapshot.id },
      include: { metric: true, sources: { include: { document: true }, orderBy: { ordinal: "asc" } } },
      orderBy: [{ metricKey: "asc" }, { period: "asc" }],
    }),
    db.budgetMeasure.findMany({ where: { snapshotId: snapshot.id }, include: { document: true } }),
    db.validationCheck.findMany({ where: { snapshotId: snapshot.id } }),
    db.versionDiff.findMany({ where: { snapshotId: snapshot.id } }),
    db.legislativeEvent.findMany({ orderBy: { date: "asc" }, include: { document: true } }),
    db.budgetVersion.findMany({ orderBy: { date: "asc" } }),
    db.sourceDocument.findMany({ where: { snapshotDocuments: { some: { snapshotId: snapshot.id } } }, orderBy: [{ versionId: "desc" }, { id: "asc" }] }),
    db.dataTable.findMany({ where: { snapshotId: snapshot.id } }),
  ]);
  const refs = await db.snapshotReference.findMany({ where: { snapshotId: snapshot.id } });
  const ref = (k: string) => refs.find((r) => r.key === k)?.data ?? [];
  const munis = await db.municipalBudget.findMany({ where: { snapshotId: snapshot.id }, orderBy: { name: "asc" } });

  const series: Record<string, SeriesView> = {};
  for (const o of observations) {
    const key = `${o.metricKey}@${o.versionId}`;
    const value = o.value === null ? null : o.value.toString();
    const first = o.sources[0]!;
    // Provenance gate — throws on missing/unofficial source, bad unit, or mock data.
    assertPublishable({
      id: `${key}:${o.period}`,
      label: o.metric.label,
      value,
      unit: o.unit,
      scope: o.metric.scope,
      status: value === null ? "pending" : STATUS_OF[o.vintage],
      period: o.period,
      asOf: iso(first.document.publishedOn) ?? iso(first.document.retrievedOn)!,
      source: {
        publisher: first.document.publisher,
        title: first.document.title,
        url: first.document.url,
        retrieved: iso(first.document.retrievedOn)!,
        locator: first.locator,
        sha256: first.document.sha256,
      },
    });
    const s = (series[key] ??= {
      metric: {
        key: o.metric.key,
        label: o.metric.label,
        short: o.metric.short,
        definition: o.metric.definition,
        scope: o.metric.scope,
        basis: o.metric.basis,
        unit: o.metric.unit,
        changeIn: o.metric.changeIn as "percent" | "pp",
      },
      versionId: o.versionId,
      points: [],
    });
    s.points.push({
      period: o.period,
      vintage: o.vintage,
      value,
      review: o.review,
      sources: o.sources.map((x) => ({
        locator: x.locator,
        value: x.value === null ? null : x.value.toString(),
        documentId: x.documentId,
        documentTitle: x.document.title,
        publisher: x.document.publisher,
        url: x.document.url,
        pageUrl: x.document.pageUrl,
        sha256: x.document.sha256,
        retrievedOn: iso(x.document.retrievedOn)!,
      })),
    });
  }

  const measureViews: MeasureView[] = measures.map((m) => ({
    id: m.id,
    direction: m.direction as "revenue" | "expenditure",
    title: m.title,
    effect2027: m.effect2027?.toString() ?? null,
    effect2028: m.effect2028?.toString() ?? null,
    effect2029: m.effect2029?.toString() ?? null,
    locator: m.locator,
    documentTitle: m.document.title,
    url: m.document.url,
  }));

  return {
    glossary: ref("glossary") as { slug: string; term: string; definition: string; aliases: string[]; documentId: string }[],
    committees: ref("committees") as { name: string; role: string; documentId: string }[],
    municipalities: munis.map((m) => ({
      code: m.code,
      name: m.name,
      billName: m.billName,
      region: m.region,
      population: m.population,
      populationAsOf: iso(m.populationAsOf)!,
      y2027: m.y2027 as Record<string, string | null>,
      y2026: m.y2026 as Record<string, string | null>,
      perCapita2027: m.perCapita2027.toString(),
      perCapita2026: m.perCapita2026.toString(),
      billLocator: m.billLocator,
    })),
    tables: Object.fromEntries(tables.map((t) => [t.id, TableSchema.parse(t.data)])) as Record<string, TableData>,
    snapshot: {
      id: snapshot.id,
      createdAt: snapshot.createdAt.toISOString(),
      publishedAt: snapshot.publishedAt!.toISOString(),
      publishedBy: snapshot.publishedBy,
      retrievedOn: iso(snapshot.retrievedOn)!,
      sigmaVersion: snapshot.sigmaVersion,
    },
    series,
    measures: measureViews,
    checks: checks.map((c) => ({
      id: c.checkId,
      kind: c.kind,
      status: c.status,
      description: c.description,
      details: (c.details ?? null) as Record<string, string | null> | null,
    })),
    versionDiffs: diffs.map((d) => ({
      label: d.label,
      period: d.period,
      before: d.before?.toString() ?? null,
      after: d.after?.toString() ?? null,
      difference: d.difference?.toString() ?? null,
      fromId: d.fromId,
      toId: d.toId,
    })),
    events: events.map((e) => ({
      id: e.id,
      date: iso(e.date)!,
      type: e.type,
      title: e.title,
      note: e.note,
      documentId: e.documentId,
      documentTitle: e.document.title,
      url: e.document.pageUrl ?? e.document.url,
    })),
    versions: versions.map((v) => ({ ...v, date: iso(v.date)! })),
    documents: documents.map((d) => ({
      id: d.id,
      title: d.title,
      publisher: d.publisher,
      url: d.url,
      pageUrl: d.pageUrl,
      sha256: d.sha256,
      bytes: d.bytes,
      mime: d.mime,
      retrievedOn: iso(d.retrievedOn)!,
      publishedOn: iso(d.publishedOn),
      legalStatus: d.legalStatus,
      versionId: d.versionId,
    })),
  };
}

async function fromFile(): Promise<Awaited<ReturnType<typeof fromDb>>> {
  const { readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const { SnapshotSchema } = await import("@/lib/ingest/snapshot-schema");
  const root = process.cwd();
  const snap = SnapshotSchema.parse(JSON.parse(await readFile(join(root, "data/snapshots/published.json"), "utf8")));
  const extra = JSON.parse(await readFile(join(root, "data/events/legislative.json"), "utf8")) as {
    documents: { id: string; publisher: string; title: string; url: string; publishedAt?: string | null }[];
    events: { id: string; date: string; type: string; title: string; documentId: string; note: string | null }[];
  };
  const docs = new Map(snap.documents.map((d) => [d.id, d]));
  const metrics = new Map(snap.metrics.map((m) => [m.key, m]));
  const str = (v: unknown) => (v === null || v === undefined ? null : String(v));

  const series: Record<string, SeriesView> = {};
  for (const o of snap.observations) {
    const key = `${o.metricKey}@${o.versionId}`;
    const metric = metrics.get(o.metricKey)!;
    const value = str(o.value);
    const first = docs.get(o.sources[0]!.documentId)!;
    assertPublishable({
      id: `${key}:${o.period}`,
      label: metric.label,
      value,
      unit: o.unit,
      scope: metric.scope,
      status: value === null ? "pending" : STATUS_OF[o.vintage],
      period: o.period,
      asOf: first.publishedOn ?? first.retrievedOn,
      source: { publisher: first.publisher, title: first.title, url: first.url, retrieved: first.retrievedOn, locator: o.sources[0]!.locator, sha256: first.sha256 },
    });
    const s = (series[key] ??= { metric: { ...metric, changeIn: metric.changeIn }, versionId: o.versionId, points: [] });
    s.points.push({
      period: o.period,
      vintage: o.vintage,
      value,
      review: o.review,
      sources: o.sources.map((x) => {
        const d = docs.get(x.documentId)!;
        return { locator: x.locator, value: str(x.value), documentId: x.documentId, documentTitle: d.title, publisher: d.publisher, url: d.url, pageUrl: d.pageUrl, sha256: d.sha256, retrievedOn: d.retrievedOn };
      }),
    });
  }
  for (const s of Object.values(series)) s.points.sort((a, b) => a.period.localeCompare(b.period));

  const allDocs = [...snap.documents, ...extra.documents.map((d) => ({ ...d, pageUrl: null }))];
  const docOf = (id: string) => allDocs.find((d) => d.id === id);
  const events = [...snap.legislativeEvents, ...extra.events].sort((a, b) => a.date.localeCompare(b.date));
  return {
    glossary: snap.glossary,
    committees: snap.committees,
    municipalities: [...snap.municipalities]
      .sort((a, b) => a.name.localeCompare(b.name, "bg"))
      .map((m) => ({
        ...m,
        y2027: Object.fromEntries(Object.entries(m.y2027).map(([k, v]) => [k, str(v)])),
        y2026: Object.fromEntries(Object.entries(m.y2026).map(([k, v]) => [k, str(v)])),
        perCapita2027: String(m.perCapita2027),
        perCapita2026: String(m.perCapita2026),
      })),
    tables: Object.fromEntries(snap.tables.map((t) => [t.id, t])) as Record<string, TableData>,
    snapshot: {
      id: snap.id,
      createdAt: snap.createdAt,
      publishedAt: snap.createdAt,
      publishedBy: process.env.PUBLISHED_BY ?? "Claude (автоматична проверка)",
      retrievedOn: snap.retrievedOn,
      sigmaVersion: snap.sigma.dataVersion,
    },
    series,
    measures: snap.measures.map((m) => {
      const d = docs.get(m.documentId)!;
      return {
        id: m.id,
        direction: m.direction,
        title: m.title,
        effect2027: str(m.effects["2027"]),
        effect2028: str(m.effects["2028"]),
        effect2029: str(m.effects["2029"]),
        locator: m.locator,
        documentTitle: d.title,
        url: d.url,
      };
    }),
    checks: snap.checks.map((c) => ({ id: c.id, kind: c.kind, status: c.status, description: c.description, details: c.details ?? null })),
    versionDiffs: snap.versionDiffs.map((d) => ({ label: d.label, period: d.period, before: str(d.before), after: str(d.after), difference: str(d.difference), fromId: "mf-draft-2026-11-06", toId: "bill-2026-11-16" })),
    events: events.map((e) => {
      const d = docOf(e.documentId);
      return { id: e.id, date: e.date, type: e.type, title: e.title, note: e.note, documentId: e.documentId, documentTitle: d?.title ?? "", url: d?.pageUrl ?? d?.url ?? "" };
    }),
    versions: [...snap.versions].sort((a, b) => a.date.localeCompare(b.date)),
    // same order as the database query: versionId desc (nulls first, as in PostgreSQL), then id
    documents: snap.documents
      .map((d) => ({ ...d, versionId: d.versionId ?? null }))
      .sort((a, b) => (a.versionId === b.versionId ? a.id.localeCompare(b.id) : a.versionId === null ? -1 : b.versionId === null ? 1 : b.versionId.localeCompare(a.versionId))),
  };
}

export type Published = Awaited<ReturnType<typeof getPublished>>;

export function seriesOf(p: Published, key: string, versionId = "bill-2026-11-16"): SeriesView {
  const s = p.series[`${key}@${versionId}`];
  if (!s) throw new Error(`Series ${key}@${versionId} not in published snapshot`);
  return s;
}

export function tableOf(p: Published, id: string): TableData {
  const t = p.tables[id];
  if (!t) throw new Error(`Table ${id} not in published snapshot`);
  return t;
}

export function documentOf(p: Published, id: string) {
  return p.documents.find((d) => d.id === id);
}
