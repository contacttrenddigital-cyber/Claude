/**
 * Pick one printed cell from an official table by its row label. Throws when the row or the cell is
 * missing, so a changed document fails the build instead of showing a wrong or empty number.
 */
import type { TableData } from "@/lib/ingest/snapshot-schema";

export function rowByLabel(t: TableData, label: RegExp) {
  const rows = t.rows.filter((r) => r.kind !== "group" && label.test(r.label));
  if (rows.length !== 1) throw new Error(`${t.id}: ${rows.length} rows match ${label}`);
  return rows[0]!;
}

export function printed(t: TableData, label: RegExp, column: string): string {
  const v = rowByLabel(t, label).cells[column]?.value;
  if (v === null || v === undefined) throw new Error(`${t.id}: ${label} has no value in ${column}`);
  return v;
}
