/**
 * Programme budgets (52-602-01-71.zip, one PDF per spending unit) → a cited table.
 *
 * A spending unit is published only when every programme row was read completely and the sum of its
 * programmes' "Общо разходи по бюджета (І.1+ІІ.)" for 2027 equals its expenditure ceiling in
 * Приложение № 4 (tolerance 0,5 хил. € for rounding). Units that fail are listed with the reason,
 * never shown with partial numbers.
 */
import Decimal from "decimal.js";
import { z } from "zod";
import type { Check } from "@/lib/ingest/snapshot";
import type { ExtractedTable, TableRow } from "@/lib/tables/extract";

const Years = z.record(z.string(), z.string());
const Program = z.object({
  code: z.string(),
  name: z.string().nullable(),
  page: z.number(),
  complete: z.boolean(),
  /** "year-tables": read from the yearly summary tables instead of the per-programme table */
  method: z.literal("year-tables").optional(),
  total: Years,
  budget: Years,
});

export const ProgramExtract = z.object({
  source: z.string(),
  ministries: z.array(
    z.object({
      code: z.string(),
      file: z.string(),
      sha256: z.string().regex(/^[a-f0-9]{64}$/),
      programs: z.array(Program),
      /** second reading of the same PDF from the yearly summary tables (see program_budgets.py) */
      alt: z.array(Program).optional(),
    }),
  ),
});
export type ProgramExtract = z.infer<typeof ProgramExtract>;

/** PDF code → spending unit as named in Приложение № 4 (prefix match). */
export const UNITS: Record<string, string> = {
  "0100": "Народно събрание",
  "0600": "Висш съдебен съвет (съдебна власт)",
  "0200": "Администрация на президента",
  "0300": "Министерски съвет",
  "0400": "Конституционен съд",
  "0500": "Сметна палата",
  "1000": "Министерство на финансите",
  "1100": "Министерство на външните работи",
  "1200": "Министерство на отбраната",
  "1300": "Министерство на вътрешните работи",
  "1400": "Министерство на правосъдието",
  "1500": "Министерство на труда и социалната политика",
  "1600": "Министерство на здравеопазването",
  "1700": "Министерство на образованието и науката",
  "1800": "Министерство на културата",
  "1900": "Министерство на околната среда и водите",
  "2000": "Министерство на икономиката, инвестициите и индустрията",
  "2100": "Министерство на регионалното развитие и благоустройството",
  "2200": "Министерство на земеделието и храните",
  "2300": "Министерство на транспорта и съобщенията",
  "2400": "Министерство на енергетиката",
  "2500": "Министерство на младежта и спорта",
  "3000": "Държавна агенция „Национална сигурност“",
  "3200": "Комисия за разкриване на документите",
  "3300": "Комисия за защита от дискриминация",
  "3400": "Комисия за защита на личните данни",
  "3700": "Комисия за отнемане на незаконно придобитото имущество",
  "3800": "Национална служба за охрана",
  "4000": "Омбудсман",
  "4100": "Национален статистически институт",
  "4200": "Комисия за защита на конкуренцията",
  "4300": "Комисия за регулиране на съобщенията",
  "4400": "Съвет за електронни медии",
  "4500": "Комисия за енергийно и водно регулиране",
  "4600": "Агенция за ядрено регулиране",
  "4800": "Държавна комисия по сигурността на информацията",
  "5300": "Държавна агенция „Държавен резерв и военновременни запаси“",
  "7100": "Министерство на туризма",
  "7400": "Министерство на иновациите и дигиталната трансформация",
  "8100": "Комисия за противодействие на корупцията",
  "8200": "Централна избирателна комисия",
  "8300": "Комисия за публичен надзор над регистрираните одитори",
  "8400": "Държавен фонд „Земеделие“",
  "8500": "Национално бюро за контрол на специалните разузнавателни средства",
  "8600": "Държавна агенция „Технически операции“",
};

const YEARS: [string, "actual" | "plan" | "draft" | "forecast", string][] = [
  ["2024", "actual", "2024 (отчет)"],
  ["2025", "actual", "2025 (отчет)"],
  ["2026", "plan", "2026 (закон)"],
  ["2027", "draft", "2027 (проект)"],
  ["2028", "forecast", "2028 (прогноза)"],
  ["2029", "forecast", "2029 (прогноза)"],
];

export interface UnitStatus {
  code: string;
  unit: string;
  file: string;
  programs: number;
  sum2027: string | null;
  ceiling: string | null;
  ok: boolean;
  reason: string | null;
  /** which reading of the PDF is published */
  use: "programs" | "alt";
  /** set when the unit has no row in Приложение № 4 and is reconciled with its article in the bill */
  reference: string | null;
}

const bg = (v: string) => new Decimal(v).toFixed(1).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, " ");

type Prog = z.infer<typeof Program>;

/** Sum of the 2027 budget column and the reason it cannot be published (null = reconciles). */
function evaluate(programs: Prog[], ceiling: string | null, unit: string | null, tolerance: string) {
  const complete = programs.filter((p) => p.complete);
  const sum = programs.length && complete.length === programs.length ? complete.reduce((s, p) => s.plus(p.budget["2027"]!), new Decimal(0)) : null;
  let reason: string | null = null;
  if (!unit || ceiling === null) reason = "няма отделен таван в Приложение № 4";
  else if (programs.length === 0) reason = "таблиците по програми не бяха разчетени от PDF файла";
  else if (complete.length < programs.length) reason = `${programs.length - complete.length} от ${programs.length} програми не бяха разчетени изцяло`;
  else if (sum!.minus(ceiling).abs().gt(tolerance)) reason = `сборът на програмите (${bg(sum!.toString())}) не е равен на тавана (${bg(ceiling)})`;
  return { sum, reason };
}

/** For units without a row in Приложение № 4: the expenditure the bill sets in its own article. */
export interface UnitReference {
  value: string;
  /** e.g. "законопроект за ДБ 2027, чл. 3, ал. 1 (разходи)" */
  locator: string;
}

export function reconcileUnits(x: ProgramExtract, ceilings: ExtractedTable, tolerance = "0.5", refs: Record<string, UnitReference> = {}): UnitStatus[] {
  return x.ministries.map((m) => {
    const unit = UNITS[m.code] ?? null;
    const ceilRow = unit ? ceilings.rows.find((r) => r.label.startsWith(unit)) : undefined;
    const ref = !ceilRow?.cells["2027"]?.value ? refs[m.code] : undefined;
    const ceiling = ceilRow?.cells["2027"]?.value ?? ref?.value ?? null;
    let use: "programs" | "alt" = "programs";
    let r = evaluate(m.programs, ceiling, unit, tolerance);
    // the PDF prints the same programmes twice (per-programme table and yearly summaries); when the first
    // reading does not match the ceiling and the second does, the second is published and says so
    if (r.reason && m.alt?.length) {
      const a = evaluate(m.alt, ceiling, unit, tolerance);
      if (!a.reason) {
        r = a;
        use = "alt";
      }
    }
    const list = use === "alt" ? m.alt! : m.programs;
    return {
      code: m.code,
      unit: unit ?? m.file,
      file: m.file,
      programs: list.length,
      sum2027: r.sum?.toString() ?? null,
      ceiling,
      ok: r.reason === null,
      reason: r.reason,
      use,
      reference: ref?.locator ?? null,
    };
  });
}

export function programChecks(status: UnitStatus[]): Check[] {
  return status.map((s) => ({
    id: `programs:${s.code}:ceiling-2027`,
    kind: "total" as const,
    status: s.ok ? ("pass" as const) : ("warn" as const),
    description: s.ok
      ? `Програмен бюджет ${s.code} (${s.unit}): сборът на ${s.programs} програми за 2027 г. = ${s.reference ? `разходите по ${s.reference}` : "таван по Приложение № 4"}${s.use === "alt" ? " (по годишните таблици в PDF; таблицата по програми не съвпада с тавана)" : ""}`
      : `Програмен бюджет ${s.code} (${s.unit}): не е публикуван — ${s.reason}`,
    details: { sum: s.sum2027, ceiling: s.ceiling },
  }));
}

export function programTable(x: ProgramExtract, status: UnitStatus[], meta: { documentId: string; file: string }): ExtractedTable {
  const rows: TableRow[] = [];
  let n = 0;
  for (const m of x.ministries) {
    const st = status.find((s) => s.code === m.code)!;
    if (!st.ok) continue;
    rows.push({ label: st.unit, level: 0, kind: "group", group: null, cells: {}, texts: { unit: m.code }, rowIndex: n++ });
    for (const p of st.use === "alt" ? m.alt! : m.programs) {
      rows.push({
        label: `${p.code} ${p.name ?? "(наименованието не е разчетено — виж PDF)"}${/^\d{4}\./.test(p.code) && !p.code.startsWith(m.code) ? " (кодът е както е отпечатан в PDF)" : ""}`,
        level: 1,
        kind: "data",
        group: st.unit,
        cells: {
          ...Object.fromEntries(YEARS.map(([y]) => [y, { value: p.budget[y] ?? null, text: p.budget[y] ? bg(p.budget[y]) : "" }])),
          all2027: { value: p.total["2027"] ?? null, text: p.total["2027"] ? bg(p.total["2027"]) : "" },
        },
        texts: { unit: m.code, page: `${m.file}, с. ${p.page}${p.method === "year-tables" ? " (годишна таблица)" : ""}` },
        rowIndex: n++,
      });
    }
  }
  return {
    id: "programBudgets",
    title: "Разходи по бюджетни програми",
    description:
      "Програмните бюджети на първостепенните разпоредители (приложения към законопроекта за 2027 г.): „Общо разходи по бюджета“ на всяка програма. Включени са само разпоредителите, при които сборът на програмите за 2027 г. е равен на тавана им в Приложение № 4.",
    caption: "таблица „Бюджетна прогноза по ведомствени и администрирани разходни параграфи на програмата“",
    scope: "ministry",
    basis: "cash",
    documentId: meta.documentId,
    file: meta.file,
    tableIndex: -1,
    columns: [
      ...YEARS.map(([y, vintage, label]) => ({ key: y, col: 0, label, period: y, vintage, unit: "хил. €" })),
      { key: "all2027", col: 0, label: "2027 вкл. други бюджети и ЕС", period: "2027", vintage: "draft" as const, unit: "хил. €" },
    ],
    textColumns: [{ key: "page", label: "Страница" }],
    rows,
  };
}
