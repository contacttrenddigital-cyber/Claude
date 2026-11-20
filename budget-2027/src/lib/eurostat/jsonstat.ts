/**
 * Eurostat dissemination API (JSON-stat 2.0) → a cited table of EU countries.
 * Values are kept as the decimal text Eurostat sends; flags (e.g. "p" provisional) are kept.
 * Only same-year, same-status values are compared (all are notified outturns, ESA 2010).
 */
import Decimal from "decimal.js";
import { z } from "zod";
import type { ExtractedTable, TableRow } from "@/lib/tables/extract";

export const EUROSTAT_API = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data";

/** EU-27 member states and the EU aggregate, with Bulgarian names. */
export const EU_GEOS: Record<string, string> = {
  EU27_2020: "ЕС-27",
  BE: "Белгия",
  BG: "България",
  CZ: "Чехия",
  DK: "Дания",
  DE: "Германия",
  EE: "Естония",
  IE: "Ирландия",
  EL: "Гърция",
  ES: "Испания",
  FR: "Франция",
  HR: "Хърватия",
  IT: "Италия",
  CY: "Кипър",
  LV: "Латвия",
  LT: "Литва",
  LU: "Люксембург",
  HU: "Унгария",
  MT: "Малта",
  NL: "Нидерландия",
  AT: "Австрия",
  PL: "Полша",
  PT: "Португалия",
  RO: "Румъния",
  SI: "Словения",
  SK: "Словакия",
  FI: "Финландия",
  SE: "Швеция",
};

export function edptUrl(years: string[]): string {
  const q = new URLSearchParams({ format: "JSON", lang: "EN", unit: "PC_GDP", sector: "S13", freq: "A" });
  for (const n of ["B9", "GD"]) q.append("na_item", n);
  for (const g of Object.keys(EU_GEOS)) q.append("geo", g);
  for (const y of years) q.append("time", y);
  return `${EUROSTAT_API}/gov_10dd_edpt1?${q.toString()}`;
}

const Category = z.object({ index: z.record(z.string(), z.number()), label: z.record(z.string(), z.string()).optional() });
export const JsonStat = z.object({
  label: z.string(),
  updated: z.string(),
  id: z.array(z.string()),
  size: z.array(z.number()),
  value: z.record(z.string(), z.number()),
  status: z.record(z.string(), z.string()).optional(),
  dimension: z.record(z.string(), z.object({ category: Category })),
});
export type JsonStat = z.infer<typeof JsonStat>;

/** Value at the given category codes (one per dimension), or null when Eurostat has none. */
export function cell(ds: JsonStat, at: Record<string, string>): { value: string | null; flag: string | null } {
  let idx = 0;
  ds.id.forEach((dim, k) => {
    const code = at[dim] ?? Object.keys(ds.dimension[dim]!.category.index)[0]!;
    const pos = ds.dimension[dim]!.category.index[code];
    if (pos === undefined) throw new Error(`${dim}=${code} not in dataset`);
    idx = idx * ds.size[k]! + pos;
  });
  const v = ds.value[String(idx)];
  // Eurostat publishes % of GDP with 1 decimal; JSON drops trailing zeros (-3.0 → -3), so restore it
  return { value: v === undefined ? null : new Decimal(v).toFixed(1), flag: ds.status?.[String(idx)] ?? null };
}

const NA: Record<string, string> = { B9: "Салдо (дефицит −)", GD: "Дълг" };

export function edptTable(ds: JsonStat, years: string[], meta: { documentId: string; file: string }): ExtractedTable {
  const columns = (["B9", "GD"] as const).flatMap((na) =>
    years.map((y) => ({ key: `${na}:${y}`, col: 0, label: `${NA[na]}, ${y}`, period: y, vintage: "actual" as const, unit: "%" })),
  );
  const rows: TableRow[] = Object.entries(EU_GEOS).map(([geo, name], i) => ({
    label: name,
    level: 0,
    kind: geo === "EU27_2020" ? ("total" as const) : ("data" as const),
    group: null,
    cells: Object.fromEntries(
      columns.map((c) => {
        const [na, y] = c.key.split(":") as [string, string];
        const x = cell(ds, { na_item: na, geo, time: y });
        return [c.key, { value: x.value, text: x.value === null ? "" : `${x.value.replace(".", ",")}${x.flag ? ` (${x.flag})` : ""}` }];
      }),
    ),
    texts: { geo },
    rowIndex: i,
  }));
  return {
    id: "euFiscal",
    title: "Салдо и дълг на сектор „Държавно управление“ в ЕС, % от БВП",
    description: `Евростат, gov_10dd_edpt1 (EDP нотификация, ЕСС 2010), обновено ${ds.updated.slice(0, 10)}. Отчетни данни; еднакъв обхват за всички държави.`,
    caption: "gov_10dd_edpt1, S13, PC_GDP",
    scope: "general-government-esa",
    basis: "accrual",
    documentId: meta.documentId,
    file: meta.file,
    tableIndex: -1,
    columns,
    textColumns: [],
    rows,
  };
}
