/**
 * Lists in the explanatory notes where each paragraph starts with an amount:
 * "170,5 млн. евро допълнителни средства за …". Each becomes a row; rowIndex is the paragraph index.
 * No total is printed for these lists, so none is computed here.
 */
import { parseBgNumber } from "@/lib/ingest/bg-number";
import type { DocxExtract } from "@/lib/ingest/documents";
import type { ExtractedTable, TableRow } from "./extract";

const LEAD = /^(\d{1,3}(?:[\s ]\d{3})*(?:,\d+)?)\s*млн\.?\s*евро\s+(.+?)[;.]?$/;

export function paragraphAmounts(
  doc: DocxExtract,
  groups: { title: string; from: number; to: number }[],
  meta: { id: string; title: string; description: string; documentId: string; period: string },
): ExtractedTable {
  const byIndex = new Map(doc.paragraphs.map((p) => [p.index, p.text.replace(/\s+/g, " ").trim()]));
  const rows: TableRow[] = [];
  for (const g of groups) {
    rows.push({ label: g.title, level: 0, kind: "group", group: null, cells: {}, rowIndex: g.from - 1 });
    for (let i = g.from; i <= g.to; i++) {
      const t = byIndex.get(i);
      if (t === undefined) throw new Error(`${meta.id}: paragraph ${i} missing`);
      const m = LEAD.exec(t);
      if (!m) throw new Error(`${meta.id}: paragraph ${i} does not start with an amount: ${t.slice(0, 60)}`);
      const v = parseBgNumber(m[1]!);
      const label = m[2]!.charAt(0).toUpperCase() + m[2]!.slice(1);
      rows.push({ label, level: 1, kind: "data", group: g.title, cells: { [meta.period]: { value: v ? v.value : null, text: m[1]! } }, rowIndex: i });
    }
  }
  const first = groups[0]!.from;
  const last = groups.at(-1)!.to;
  return {
    id: meta.id,
    title: meta.title,
    description: meta.description,
    caption: `мотиви, абзаци ${first}–${last} в извлечения текст`,
    scope: "state",
    basis: "cash",
    documentId: meta.documentId,
    file: doc.file,
    tableIndex: -1,
    columns: [{ key: meta.period, col: 0, label: meta.period, period: meta.period, vintage: "draft", unit: "млн. €" }],
    textColumns: [],
    rows,
  };
}
