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

export const getPublished = cache(async () => {
  const snapshot = await db.dataSnapshot.findFirst({
    where: { publishedAt: { not: null }, supersededAt: null },
    orderBy: { publishedAt: "desc" },
  });
  if (!snapshot) throw new NoPublishedSnapshotError("Няма публикувана снимка на данните");

  const [observations, measures, checks, diffs, events, versions, documents] = await Promise.all([
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
    db.sourceDocument.findMany({ orderBy: [{ versionId: "desc" }, { id: "asc" }] }),
  ]);

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
});

export type Published = Awaited<ReturnType<typeof getPublished>>;

export function seriesOf(p: Published, key: string, versionId = "bill-2026-11-16"): SeriesView {
  const s = p.series[`${key}@${versionId}`];
  if (!s) throw new Error(`Series ${key}@${versionId} not in published snapshot`);
  return s;
}
