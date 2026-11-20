/**
 * Sector view of Табл. III-1 (КФП по функции): each main function's share of the total and its
 * change against the 2026 expected outturn. Denominator = sum of the main functions, which the
 * snapshot checks against КФП expenditure excluding the EU contribution (Приложение № 3).
 */
import Decimal from "decimal.js";
import { percentChange, share } from "@/lib/fiscal/money";
import type { TableData } from "@/lib/ingest/snapshot-schema";

export interface SectorRow {
  label: string;
  rowIndex: number;
  value: string;
  base: string;
  share: Decimal;
  change: Decimal;
  delta: Decimal;
}

export function sectorRows(functions: TableData, year = "2027", baseYear = "2026"): { total: Decimal; rows: SectorRow[] } {
  const main = functions.rows.filter((r) => r.kind === "data" && r.level === 0);
  const v = (r: (typeof main)[number], k: string) => {
    const x = r.cells[k]?.value;
    if (x === null || x === undefined) throw new Error(`${functions.id}: ${r.label} has no ${k}`);
    return x;
  };
  const total = main.reduce((s, r) => s.plus(v(r, year)), new Decimal(0));
  return {
    total,
    rows: main.map((r) => ({
      label: r.label,
      rowIndex: r.rowIndex,
      value: v(r, year),
      base: v(r, baseYear),
      share: share(v(r, year), total)!,
      change: percentChange(v(r, baseYear), v(r, year))!,
      delta: new Decimal(v(r, year)).minus(v(r, baseYear)),
    })),
  };
}
