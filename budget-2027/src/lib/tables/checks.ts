/** Reconciliation checks for extracted tables (sums, cross-table consistency). */
import Decimal from "decimal.js";
import { reconcile } from "@/lib/fiscal/money";
import type { Check } from "@/lib/ingest/snapshot";
import type { ExtractedTable, TableRow } from "./extract";

const val = (r: TableRow, k: string) => r.cells[k]?.value ?? null;

/** Level-1 rows directly under a level-0 row must sum to it (when all parts are numeric). */
export function childSumChecks(t: ExtractedTable, keys: string[], tolerance = "0.3"): Check[] {
  const out: Check[] = [];
  const data = t.rows.filter((r) => r.kind !== "group");
  for (let i = 0; i < data.length; i++) {
    const parent = data[i]!;
    if (parent.level !== 0) continue;
    const kids: TableRow[] = [];
    for (let j = i + 1; j < data.length && data[j]!.level === 1; j++) kids.push(data[j]!);
    if (kids.length < 2) continue;
    for (const k of keys) {
      const p = val(parent, k);
      const parts = kids.map((c) => val(c, k));
      if (p === null || parts.some((x) => x === null)) continue;
      const r = reconcile(parts as string[], p, tolerance);
      out.push({
        id: `tbl:${t.id}:children:${parent.rowIndex}:${k}`,
        kind: "total",
        status: r.ok ? "pass" : "warn",
        description: `${t.title}: подредовете на „${parent.label}“ (${k}) дават сбора`,
        details: { sum: r.sum.toString(), printed: p, difference: r.difference.toString() },
      });
    }
  }
  return out;
}

/** Data rows (excluding groups and totals) sum to the printed total row. */
export function grandTotalChecks(t: ExtractedTable, keys: string[], tolerance = "0.3"): Check[] {
  const total = t.rows.find((r) => r.kind === "total");
  if (!total) throw new Error(`${t.id}: no total row`);
  return keys.map((k) => {
    const parts = t.rows.filter((r) => r.kind === "data").map((r) => val(r, k) ?? "0");
    const r = reconcile(parts, val(total, k)!, tolerance);
    return {
      id: `tbl:${t.id}:total:${k}`,
      kind: "total" as const,
      status: r.ok ? ("pass" as const) : ("fail" as const),
      description: `${t.title}: сборът на редовете (${k}) = ред „${total.label}“`,
      details: { sum: r.sum.toString(), printed: total.cells[k]!.value, difference: r.difference.toString() },
    };
  });
}

export function crossCheck(id: string, description: string, a: string | null, b: string | null, tolerance: string): Check {
  if (a === null || b === null) return { id, kind: "cross-source", status: "warn", description: `${description}: липсва стойност` };
  const d = new Decimal(a).minus(b);
  return {
    id,
    kind: "cross-source",
    status: d.abs().lte(tolerance) ? "pass" : "warn",
    description,
    details: { a, b, difference: d.toString(), tolerance },
  };
}

export function sumTopLevel(t: ExtractedTable, k: string): string {
  return t.rows
    .filter((r) => r.kind === "data" && r.level === 0)
    .reduce((s, r) => s.plus(val(r, k) ?? "0"), new Decimal(0))
    .toString();
}
