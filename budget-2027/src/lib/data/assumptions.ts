/** Grouping of Приложение № 2 rows by their printed numbering (1–9 taxes, 10–20 labour & insurance, 21+ social). */
import type { TableData } from "@/lib/ingest/snapshot-schema";

export function numberedRows(t: TableData) {
  let current = 0;
  return t.rows.map((r) => {
    const n = parseInt((r.texts?.no ?? "").trim(), 10);
    if (!Number.isNaN(n)) current = n;
    return { row: r, n: current };
  });
}

export function rowsInRange(t: TableData, from: number, to: number): number[] {
  return numberedRows(t)
    .filter(({ n }) => n >= from && n <= to)
    .map(({ row }) => row.rowIndex);
}

/** rows whose printed 2026 and 2027 texts differ (whitespace-insensitive) */
export function changedRows(t: TableData, a = "2026", b = "2027") {
  const norm = (s: string | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
  return t.rows.filter((r) => r.kind === "data" && norm(r.cells[b]?.text) && norm(r.cells[a]?.text) !== norm(r.cells[b]?.text));
}
