/**
 * Eurostat gov_10a_exp: general government expenditure by function (COFOG), % of GDP, sector S13.
 * Outturns on ESA 2010, the same method for every member state. Not comparable line by line with
 * the КФП functions in the bill (different scope and method — SIGMA trap "kfp-cofog").
 */
import Decimal from "decimal.js";
import type { Check } from "@/lib/ingest/snapshot";
import type { ExtractedTable } from "@/lib/tables/extract";
import { EUROSTAT_API, EU_GEOS, cell, type JsonStat } from "./jsonstat";

export const COFOG: Record<string, string> = {
  GF01: "Общи държавни служби",
  GF02: "Отбрана",
  GF03: "Обществен ред и сигурност",
  GF04: "Икономически дейности",
  GF05: "Опазване на околната среда",
  GF06: "Жилищно строителство и благоустройство",
  GF07: "Здравеопазване",
  GF08: "Отдих, култура и религия",
  GF09: "Образование",
  GF10: "Социална защита",
};
export const COFOG_YEARS = Array.from({ length: 10 }, (_, i) => String(2015 + i)); // 2015–2024

export function cofogUrl(years: string[] = COFOG_YEARS): string {
  const q = new URLSearchParams({ format: "JSON", lang: "EN", unit: "PC_GDP", sector: "S13", na_item: "TE", freq: "A" });
  for (const c of ["TOTAL", ...Object.keys(COFOG)]) q.append("cofog99", c);
  for (const g of Object.keys(EU_GEOS)) q.append("geo", g);
  for (const y of years) q.append("time", y);
  return `${EUROSTAT_API}/gov_10a_exp?${q.toString()}`;
}

const text = (x: { value: string | null; flag: string | null }) => (x.value === null ? "" : `${x.value.replace(".", ",")}${x.flag ? ` (${x.flag})` : ""}`);

/** All member states for one year: one column per function plus the total. */
export function cofogEuTable(ds: JsonStat, year: string, meta: { documentId: string; file: string }): ExtractedTable {
  const codes = [...Object.keys(COFOG), "TOTAL"];
  return {
    id: "euCofog",
    title: `Разходи на сектор „Държавно управление“ по функции (COFOG) в ЕС, ${year}, % от БВП`,
    description: `Евростат, gov_10a_exp, обновено ${ds.updated.slice(0, 10)}. Отчетни данни по ЕСС 2010; еднакъв обхват за всички държави.`,
    caption: `gov_10a_exp, S13, TE, PC_GDP, ${year}`,
    scope: "general-government-esa",
    basis: "accrual",
    documentId: meta.documentId,
    file: meta.file,
    tableIndex: -1,
    columns: codes.map((c, i) => ({ key: c, col: i + 1, label: c === "TOTAL" ? "Общо" : COFOG[c]!, period: year, vintage: "actual" as const, unit: "%" })),
    textColumns: [],
    rows: Object.entries(EU_GEOS).map(([geo, name], i) => ({
      label: name,
      level: 0,
      kind: geo === "EU27_2020" ? ("total" as const) : ("data" as const),
      group: null,
      cells: Object.fromEntries(codes.map((c) => {
        const x = cell(ds, { cofog99: c, geo, time: year });
        return [c, { value: x.value, text: text(x) }];
      })),
      texts: { geo },
      rowIndex: i,
    })),
  };
}

/** One country over the years: one row per function, one column per year. */
export function cofogHistoryTable(ds: JsonStat, geo: string, years: string[], meta: { documentId: string; file: string }): ExtractedTable {
  return {
    id: `cofogHistory${geo}`,
    title: `${EU_GEOS[geo]}: разходи по функции (COFOG), ${years[0]}–${years.at(-1)}, % от БВП`,
    description: `Евростат, gov_10a_exp, обновено ${ds.updated.slice(0, 10)}. Отчетни данни по ЕСС 2010.`,
    caption: `gov_10a_exp, S13, TE, PC_GDP, geo=${geo}`,
    scope: "general-government-esa",
    basis: "accrual",
    documentId: meta.documentId,
    file: meta.file,
    tableIndex: -1,
    columns: years.map((y, i) => ({ key: y, col: i + 1, label: y, period: y, vintage: "actual" as const, unit: "%" })),
    textColumns: [],
    rows: [...Object.keys(COFOG), "TOTAL"].map((c, i) => ({
      label: c === "TOTAL" ? "Общо разходи" : COFOG[c]!,
      level: c === "TOTAL" ? 0 : 1,
      kind: c === "TOTAL" ? ("total" as const) : ("data" as const),
      group: null,
      cells: Object.fromEntries(years.map((y) => {
        const x = cell(ds, { cofog99: c, geo, time: y });
        return [y, { value: x.value, text: text(x) }];
      })),
      texts: { cofog: c },
      rowIndex: i,
    })),
  };
}

/** The ten functions add up to the total (each value is rounded to 0.1 pp, so up to 0.5 pp of rounding). */
export function cofogChecks(t: ExtractedTable, keys: string[]): Check[] {
  const out: Check[] = [];
  const rows = t.id === "euCofog" ? t.rows : [];
  if (t.id === "euCofog") {
    for (const r of rows) {
      const parts = Object.keys(COFOG).map((c) => r.cells[c]?.value ?? null);
      const total = r.cells.TOTAL?.value ?? null;
      if (total === null || parts.some((p) => p === null)) continue;
      const d = parts.reduce((s, p) => s.plus(p!), new Decimal(0)).minus(total);
      out.push({ id: `cofog:${r.texts?.geo}:sum`, kind: "total", status: d.abs().lte("0.5") ? "pass" : "warn", description: `COFOG ${r.label}: десетте функции дават общото`, details: { difference: d.toString() } });
    }
  } else {
    const total = t.rows.find((r) => r.kind === "total")!;
    for (const k of keys) {
      const parts = t.rows.filter((r) => r.kind === "data").map((r) => r.cells[k]?.value ?? null);
      if (total.cells[k]?.value == null || parts.some((p) => p === null)) continue;
      const d = parts.reduce((s, p) => s.plus(p!), new Decimal(0)).minus(total.cells[k]!.value!);
      out.push({ id: `cofog:${t.id}:${k}:sum`, kind: "total", status: d.abs().lte("0.5") ? "pass" : "warn", description: `${t.title}: десетте функции дават общото, ${k}`, details: { difference: d.toString() } });
    }
  }
  return out;
}

/** Bulgaria against the EU-27 aggregate, per function, in percentage points of GDP (same year, same source). */
export function cofogGap(t: ExtractedTable, geo = "BG") {
  const me = t.rows.find((r) => r.texts?.geo === geo);
  const eu = t.rows.find((r) => r.texts?.geo === "EU27_2020");
  if (!me || !eu) throw new Error(`${t.id}: no ${geo} or EU27_2020`);
  return [...Object.keys(COFOG), "TOTAL"].map((c) => {
    const a = me.cells[c]?.value ?? null;
    const b = eu.cells[c]?.value ?? null;
    return { code: c, label: c === "TOTAL" ? "Общо разходи" : COFOG[c]!, bg: a, eu: b, gap: a === null || b === null ? null : new Decimal(a).minus(b).toFixed(1) };
  });
}
