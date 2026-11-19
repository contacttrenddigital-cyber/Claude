/** Shared helpers for building page view models from the published snapshot. */
import type { BarSeries } from "@/components/charts/YearBars";
import type { SeriesView } from "./types";
import type { TableData } from "@/lib/ingest/snapshot-schema";
import type { Published } from "./published";

export function bars(name: string, color: BarSeries["color"], s: SeriesView): BarSeries {
  return {
    name,
    color,
    points: s.points.map((p) => ({ period: p.period, value: p.value, vintage: p.vintage, source: p.sources[0]!.locator.split(" (")[0]! })),
  };
}

export function billSource(p: Published) {
  const d = p.documents.find((x) => x.id === "ns-52-602-01-71-docx")!;
  return { url: d.url, title: "Законопроект за ДБРБ 2027 с мотиви (НС, вх. № 52-602-01-71)" };
}

/** Source link for one of the social fund bills (ДОО, НЗОК). */
export function lawSource(p: Published, id: "ns-52-602-01-68-rtf" | "ns-52-602-01-70-rtf") {
  const d = p.documents.find((x) => x.id === id)!;
  return { url: d.url, title: d.title };
}

/** Bars for one table row across its year columns (values as printed). */
export function rowBars(name: string, color: BarSeries["color"], t: TableData, label: string, caption: string): BarSeries {
  const r = t.rows.find((x) => x.label === label);
  if (!r) throw new Error(`${t.id}: row „${label}“ not found`);
  return {
    name,
    color,
    points: t.columns.map((c) => ({ period: c.period, value: r.cells[c.key]?.value ?? null, vintage: c.vintage, source: caption })),
  };
}

import type { FindingsData } from "@/lib/findings";

/** Adapter from the published read model to the pure findings interface. */
export function findingsData(p: Published): FindingsData {
  const obs = (k: string, per: string) => p.series[`${k}@bill-2026-11-16`]?.points.find((x) => x.period === per);
  return {
    value: (k, per) => obs(k, per)?.value ?? null,
    sourceValues: (k, per) => obs(k, per)?.sources.map((s) => s.value) ?? [],
    table: (id) => p.tables[id]!,
    measures: p.measures.map((m) => ({ direction: m.direction, title: m.title, effect2027: m.effect2027, locator: m.locator })),
    versionDiffs: p.versionDiffs,
  };
}

export interface MetricCard {
  key: string;
  label: string;
  short: string;
  unit: string;
  changeIn: "percent" | "pp";
  source: string;
  points: { period: string; vintage: string; value: string | null }[];
}

/** Compact, serialisable list of all bill metrics for client workspaces (dashboard, card studio). */
export function metricCards(p: Published): MetricCard[] {
  return Object.values(p.series)
    .filter((s) => s.versionId === "bill-2026-11-16")
    .map((s) => ({
      key: s.metric.key,
      label: s.metric.label,
      short: s.metric.short,
      unit: s.metric.unit,
      changeIn: s.metric.changeIn,
      source: s.points[0]?.sources[0]?.locator.split(" (")[0] ?? "",
      points: s.points.map((x) => ({ period: x.period, vintage: x.vintage, value: x.value })),
    }))
    .sort((a, b) => a.short.localeCompare(b.short, "bg"));
}
