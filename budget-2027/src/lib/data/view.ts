/** Shared helpers for building page view models from the published snapshot. */
import type { BarSeries } from "@/components/charts/YearBars";
import type { SeriesView } from "./types";
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
