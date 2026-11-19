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
