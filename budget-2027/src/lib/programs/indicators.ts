/**
 * Performance indicators of the programme budgets (scripts/extract/indicators.py, pdfplumber): the
 * name, unit and target text of each year, exactly as printed. No value is converted or computed, and
 * no cost per unit is derived (docs/PERFORMANCE_INDICATOR_METHODS.md).
 */
import { z } from "zod";
import type { Check } from "@/lib/ingest/snapshot";
import type { TableData } from "@/lib/ingest/snapshot-schema";
import { UNITS } from "./programs";

const Row = z.union([
  z.object({ program: z.string().nullable(), page: z.number(), heading: z.string() }),
  z.object({
    program: z.string().nullable(),
    page: z.number(),
    kind: z.enum(["изпълнение", "полза/ефект"]),
    name: z.string(),
    unit: z.string(),
    values: z.record(z.string(), z.string()),
    complete: z.boolean(),
  }),
]);
export const IndicatorExtract = z.object({
  source: z.string(),
  units: z.array(z.object({ code: z.string(), file: z.string(), sha256: z.string().regex(/^[a-f0-9]{64}$/), indicators: z.array(Row) })),
});
export type IndicatorExtract = z.infer<typeof IndicatorExtract>;

export const INDICATOR_YEARS = ["2027", "2028", "2029"] as const;

export function indicatorTable(x: IndicatorExtract, meta: { documentId: string; file: string }): TableData {
  const rows: TableData["rows"] = [];
  let n = 0;
  for (const u of x.units) {
    let heading: string | null = null;
    for (const r of u.indicators) {
      if ("heading" in r) {
        heading = r.heading;
        continue;
      }
      rows.push({
        label: heading && r.name.length < 60 && !/^\d/.test(r.name) ? `${heading} ${r.name}` : r.name,
        level: 1,
        kind: "data",
        group: r.program ? `${u.code} · ${r.program}` : `${u.code} · програмата не е разчетена`,
        cells: Object.fromEntries(INDICATOR_YEARS.map((y) => [y, { value: null, text: r.values[y] ?? "" }])),
        texts: { unit: r.unit, kind: r.kind, page: `PDF ${u.code}, с. ${r.page}`, program: r.program ?? "", spending: u.code },
        rowIndex: n++,
      });
    }
  }
  return {
    id: "performanceIndicators",
    title: "Показатели за изпълнение и целеви стойности по програми",
    description: "Таблиците „Показатели за изпълнение“ и „Ползи/ефекти“ от програмните бюджети към законопроекта за 2027 г., както са отпечатани.",
    caption: "програмни бюджети, таблици с показатели (целеви стойности 2027–2029)",
    scope: "ministry",
    basis: "цели",
    documentId: meta.documentId,
    file: meta.file,
    tableIndex: -1,
    columns: INDICATOR_YEARS.map((y, i) => ({ key: y, col: i + 1, label: y === "2027" ? "Цел 2027 (проект)" : `Цел ${y} (прогноза)`, period: y, vintage: y === "2027" ? ("draft" as const) : ("forecast" as const), unit: "" })),
    textColumns: [
      { key: "unit", label: "Мерна единица" },
      { key: "kind", label: "Вид" },
      { key: "page", label: "Страница" },
    ],
    rows,
  };
}

/** Coverage: indicators per spending unit, and how many are tied to a published programme code. */
export function indicatorChecks(x: IndicatorExtract, programCodes: Set<string>): Check[] {
  const all = x.units.flatMap((u) => u.indicators.filter((r): r is Extract<typeof r, { name: string }> => "name" in r));
  const tied = all.filter((r) => r.program && programCodes.has(r.program));
  const none = x.units.filter((u) => !u.indicators.some((r) => "name" in r)).map((u) => `${u.code} ${UNITS[u.code] ?? ""}`.trim());
  return [
    {
      id: "indicators:coverage",
      kind: "total",
      status: "pass",
      description: `Показатели: ${all.length} от ${x.units.length - none.length} разпоредители; ${tied.length} са към код на публикувана програма`,
      details: { withoutIndicatorTables: none.join("; ") || "—", incomplete: String(all.filter((r) => !r.complete).length) },
    },
  ];
}
