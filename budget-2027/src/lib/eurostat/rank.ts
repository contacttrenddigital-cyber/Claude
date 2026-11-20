/** Rank of a country among EU member states for one column (the EU aggregate is excluded). */
import Decimal from "decimal.js";
import type { TableData } from "@/lib/ingest/snapshot-schema";

export function rankOf(t: TableData, key: string, geo: string, order: "asc" | "desc") {
  const members = t.rows.filter((r) => r.kind === "data" && r.cells[key]?.value != null);
  const sorted = [...members].sort((a, b) => {
    const d = new Decimal(a.cells[key]!.value!).comparedTo(b.cells[key]!.value!);
    return order === "asc" ? d : -d;
  });
  const me = sorted.find((r) => r.texts?.geo === geo);
  if (!me) return null;
  const v = me.cells[key]!.value!;
  // ties share the best rank
  const rank = sorted.findIndex((r) => new Decimal(r.cells[key]!.value!).eq(v)) + 1;
  return { rank, of: sorted.length, value: v };
}
