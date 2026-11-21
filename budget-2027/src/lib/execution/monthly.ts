/**
 * Monthly execution of the consolidated fiscal programme (КФП) from SIGMA (`execution.json`,
 * schema execution/2): cumulative amounts from the start of the year, млн. €, as decimal strings.
 * Each value points to the original MoF report through `execution-provenance.json`
 * (sheet „стартова“, column B for КФП, row per line). 2025 is converted from млн. лв. by SIGMA.
 */
import Decimal from "decimal.js";
import { z } from "zod";
import type { Check } from "@/lib/ingest/snapshot";
import type { TableData } from "@/lib/ingest/snapshot-schema";

const Num = z.string().regex(/^-?\d+(\.\d+)?$/);
const Year = z.object({
  months: z.number().int().min(1).max(12),
  currency: z.enum(["EUR", "BGN"]),
  files: z.array(z.object({ month: z.number(), file: z.string(), sha256: z.string() })),
  kfp: z.record(z.string(), z.array(Num.nullable())),
});
export const ExecutionSchema = z.object({
  meta: z.object({ asOf: z.string(), unit: z.literal("млн. €"), mock: z.literal(false), schema: z.literal("execution/2") }),
  rows: z.array(z.object({ id: z.string(), label: z.string(), short: z.string(), level: z.number(), row: z.number().optional() })),
  data: z.record(z.string(), Year),
  plan2026: z.object({ kfp: z.record(z.string(), Num) }),
  pendingMonths: z.array(z.object({ month: z.number(), status: z.string() })),
});
export const ExecutionProvenanceSchema = z.object({
  sheet: z.string(),
  columns: z.object({ kfp: z.string() }),
  rows: z.record(z.string(), z.number()),
});
export type Execution = z.infer<typeof ExecutionSchema>;

/** Lines shown on the site (main aggregates of the report). */
export const MONTHLY_ROWS = ["rev", "rev.tax", "rev.nontax", "rev.grants", "exp.total", "exp.personnel", "exp.social", "exp.interest", "exp.capex", "balance"] as const;
const MONTH = ["яну", "фев", "мар", "апр", "май", "юни", "юли", "авг", "сеп", "окт", "ное", "дек"];

const label = (e: Execution, id: string) => {
  const r = e.rows.find((x) => x.id === id);
  if (!r) throw new Error(`execution: no row ${id}`);
  return r;
};

/** Cumulative 2026 КФП by month (columns 2026-01 … latest). */
export function monthlyTable(e: Execution, documentId: string, year = "2026"): TableData {
  const y = e.data[year];
  if (!y) throw new Error(`execution: no ${year}`);
  const keys = Array.from({ length: y.months }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
  return {
    id: `executionMonthly${year}`,
    title: `Изпълнение на КФП по месеци, ${year} (натрупано)`,
    description: "Натрупани суми от началото на годината по месечните отчети на МФ, касова основа.",
    caption: `СИГМА, набор „Месечно изпълнение на КФП“ (execution.json); оригинал: месечните отчети на МФ, лист „стартова“, колона B (КФП). Данни към ${e.meta.asOf}.`,
    scope: "КФП",
    basis: "касова",
    documentId,
    file: "execution.json",
    tableIndex: -1,
    columns: keys.map((k, i) => ({ key: k, col: i + 1, label: MONTH[i]!, period: k, vintage: "actual" as const, unit: "млн. €" })),
    textColumns: [],
    rows: MONTHLY_ROWS.map((id, idx) => {
      const r = label(e, id);
      const series = y.kfp[id];
      if (!series) throw new Error(`execution: ${year} has no kfp/${id}`);
      return {
        label: r.label,
        level: r.level === 0 ? 0 : 1,
        kind: "data" as const,
        group: null,
        rowIndex: idx + 1,
        cells: Object.fromEntries(keys.map((k, i) => [k, { value: series[i] ?? null, text: series[i] ?? "" }])),
      };
    }),
  };
}

/** Latest month of 2026 against the same month of 2025 (converted from лв. by SIGMA) and the 2026 plan. */
export function sameMonthTable(e: Execution, documentId: string): TableData {
  const y = e.data["2026"]!;
  const prev = e.data["2025"]!;
  const m = y.months;
  const ids = MONTHLY_ROWS.filter((id) => id !== "balance");
  return {
    id: "executionSameMonth",
    title: `КФП към края на ${MONTH[m - 1]} 2026 срещу същия месец на 2025 и плана за 2026`,
    description: "2025 г. е превърната от млн. лв. в млн. € по фиксирания курс 1,95583 (СИГМА); сборовете може да се разминават с до 0,1 млн. €.",
    caption: `СИГМА, execution.json: data/2026 и data/2025 (месец ${m}), plan2026 (Приложение № 1 към мотивите, закон за 2026 г.).`,
    scope: "КФП",
    basis: "касова",
    documentId,
    file: "execution.json",
    tableIndex: -1,
    columns: [
      { key: "prev", col: 1, label: `2025, ${MONTH[m - 1]}`, period: `2025-${String(m).padStart(2, "0")}`, vintage: "actual" as const, unit: "млн. €" },
      { key: "cur", col: 2, label: `2026, ${MONTH[m - 1]}`, period: `2026-${String(m).padStart(2, "0")}`, vintage: "actual" as const, unit: "млн. €" },
      { key: "plan", col: 3, label: "План 2026", period: "2026", vintage: "plan" as const, unit: "млн. €" },
    ],
    textColumns: [],
    rows: ids.map((id, idx) => {
      const r = label(e, id);
      const cell = (v: string | null | undefined) => ({ value: v ?? null, text: v ?? "" });
      return {
        label: r.label,
        level: r.level === 0 ? 0 : 1,
        kind: "data" as const,
        group: null,
        rowIndex: idx + 1,
        cells: { prev: cell(prev.kfp[id]?.[m - 1]), cur: cell(y.kfp[id]?.[m - 1]), plan: cell(e.plan2026.kfp[id]) },
      };
    }),
  };
}

/** Report identities, checked for every published month of 2026 (tolerance 0.01 млн. €). */
export function monthlyChecks(e: Execution, year = "2026"): Check[] {
  const y = e.data[year]!;
  const v = (id: string, i: number) => y.kfp[id]?.[i] ?? null;
  const out: Check[] = [];
  for (let i = 0; i < y.months; i++) {
    const m = `${year}-${String(i + 1).padStart(2, "0")}`;
    const [rev, exp, tr, eu, bal, tot] = ["rev", "exp", "transfers", "eucontrib", "balance", "exp.total"].map((id) => v(id, i));
    if ([rev, exp, tr, eu, bal, tot].some((x) => x === null)) {
      out.push({ id: `exec:${m}:identity`, kind: "identity", status: "warn", description: `КФП ${m}: липсва ред за равенствата` });
      continue;
    }
    const d1 = new Decimal(rev!).minus(exp!).plus(tr!).minus(eu!).minus(bal!);
    out.push({
      id: `exec:${m}:balance`,
      kind: "identity",
      status: d1.abs().lte("0.01") ? "pass" : "fail",
      description: `КФП ${m}: приходи − разходи + трансфери − вноска в ЕС = салдо`,
      details: { difference: d1.toString() },
    });
    const d2 = new Decimal(exp!).plus(eu!).minus(tot!);
    out.push({
      id: `exec:${m}:total`,
      kind: "identity",
      status: d2.abs().lte("0.01") ? "pass" : "fail",
      description: `КФП ${m}: разходи + вноска в ЕС = разходи с вноската`,
      details: { difference: d2.toString() },
    });
  }
  return out;
}

/** Locator of one value in the original report (for SourceNote-like citations). */
export function originalCell(p: z.infer<typeof ExecutionProvenanceSchema>, e: Execution, year: string, month: number, id: string) {
  const f = e.data[year]?.files.find((x) => x.month === month);
  const row = p.rows[id];
  if (!f || row === undefined) return null;
  return { file: f.file, sha256: f.sha256, sheet: p.sheet, cell: `${p.columns.kfp}${row}` };
}
