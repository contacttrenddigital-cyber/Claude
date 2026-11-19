/**
 * Generic extraction of whole tables from the bill (DOCX) into a typed, cited structure.
 * Each row keeps its exact printed text, a hierarchy level and a locator. Numeric cells are
 * parsed strictly; non-numeric cells (e.g. "8 г. и 8 м.", "15 (от 1 януари 2026 г.)") are kept as text.
 */
import { normLabel, tableCaption, type DocxExtract, type Vintage } from "@/lib/ingest/documents";
import { NumberFormatError, parseBgNumber } from "@/lib/ingest/bg-number";

export interface ColumnSpec {
  key: string;
  col: number;
  label: string;
  period: string;
  vintage: Vintage;
  unit: string;
}

export interface TableSpec {
  id: string;
  title: string;
  description: string;
  table: number;
  scope: string;
  basis: string;
  labelCol: number;
  /** extra label column (e.g. project number) appended to the label */
  idCol?: number;
  columns: ColumnSpec[];
  firstDataRow: number;
  /** extra text columns kept verbatim (e.g. responsible institution) */
  textCols?: { key: string; col: number; label: string }[];
  /** rows whose label matches are group headers (no values), e.g. "ОБЛАСТ БЛАГОЕВГРАД" */
  headerPattern?: string;
  /** row label of the printed grand total */
  totalLabel?: string;
}

export interface Cell {
  value: string | null;
  text: string;
}

export interface TableRow {
  label: string;
  level: number;
  kind: "data" | "group" | "total";
  group: string | null;
  cells: Record<string, Cell>;
  texts?: Record<string, string>;
  rowIndex: number;
}

export interface ExtractedTable {
  id: string;
  title: string;
  description: string;
  caption: string;
  scope: string;
  basis: string;
  documentId: string;
  file: string;
  tableIndex: number;
  columns: ColumnSpec[];
  textColumns: { key: string; label: string }[];
  rows: TableRow[];
}

function parseCell(text: string): Cell {
  const t = text.trim();
  try {
    const p = parseBgNumber(t);
    return { value: p ? p.value : null, text: t };
  } catch (e) {
    if (e instanceof NumberFormatError) return { value: null, text: t };
    throw e;
  }
}

/** "- съдебна власт" → 1; "в т.ч. Пенсии" → 1; "2.1." → 1; "1." / plain → 0 */
export function levelOf(label: string, number?: string): number {
  if (/^[-–]\s/.test(label) || /^в т\.ч\./i.test(label) || /^от тях/i.test(label)) return 1;
  if (number && /^\d+\.\d+\.?$/.test(number.trim())) return 1;
  return 0;
}

export function extractTable(doc: DocxExtract, spec: TableSpec, documentId: string): ExtractedTable {
  const t = doc.tables[spec.table];
  if (!t) throw new Error(`${spec.id}: table ${spec.table} missing`);
  const rows: TableRow[] = [];
  let group: string | null = null;
  t.rows.slice(spec.firstDataRow).forEach((r, i) => {
    const rowIndex = spec.firstDataRow + i;
    let label = normLabel(r[spec.labelCol] ?? "");
    const num = spec.labelCol > 0 ? normLabel(r[0] ?? "") : undefined;
    if (spec.idCol !== undefined && r[spec.idCol]) label = `${label} [${normLabel(r[spec.idCol])}]`;
    if (!label) return;
    if (spec.headerPattern && new RegExp(spec.headerPattern).test(label)) {
      group = label;
      rows.push({ label, level: 0, kind: "group", group: null, cells: {}, rowIndex });
      return;
    }
    const cells: Record<string, Cell> = {};
    for (const c of spec.columns) cells[c.key] = parseCell(r[c.col] ?? "");
    const texts = spec.textCols ? Object.fromEntries(spec.textCols.map((c) => [c.key, normLabel(r[c.col] ?? "")])) : undefined;
    const isTotal = !!spec.totalLabel && label === spec.totalLabel;
    rows.push({ label, level: isTotal ? 0 : levelOf(label, num), kind: isTotal ? "total" : "data", group: isTotal ? null : group, cells, texts, rowIndex });
  });
  return {
    id: spec.id,
    title: spec.title,
    description: spec.description,
    caption: tableCaption(t),
    scope: spec.scope,
    basis: spec.basis,
    documentId,
    file: doc.file,
    tableIndex: spec.table,
    columns: spec.columns,
    textColumns: (spec.textCols ?? []).map(({ key, label }) => ({ key, label })),
    rows,
  };
}

export function locatorOf(t: ExtractedTable, row: TableRow): string {
  return `${t.caption} (таблица ${t.tableIndex} в ${t.file}), ред ${row.rowIndex + 1} „${row.label}“`;
}

/** Annex 3 (EMF vector text) as a table: one page of rows with year columns. */
export function annex3AsTable(
  annex: import("@/lib/ingest/documents").EmfTableExtract,
  page: number,
  meta: { id: string; title: string; description: string; documentId: string; file: string },
): ExtractedTable {
  const pg = annex.pages.find((p) => p.page === page)!;
  const columns: ColumnSpec[] = pg.columns.map((y, i) => ({
    key: String(y),
    col: i,
    label: String(y),
    period: String(y),
    vintage: vintageFromLabelSafe(pg.statuses[String(y)] ?? ""),
    unit: page <= 2 ? "млн. €" : "%",
  }));
  const rows: TableRow[] = pg.rows
    .filter((r) => r.label && Object.keys(r.cells).length > 0)
    .map((r, i) => ({
      label: normLabel(r.label),
      level: /^(от |помощи от|- |Заплати|Други възнаграждения|Осигурителни вноски|Субсидии и други текущи трансфери$|Субсидии и други текущи трансфери за|Пенсии|Текущи трансфери|Здравноосигурителни плащания|НЗОК|Народно събрание|Съдебна власт|Външни лихви|Вътрешни лихви|ДДС|Акцизи|Данък върху застрахователните|Мита|Корпоративни данъци|Данъци върху доходите|Осигурителни вноски за|Здравноосигурителни вноски|Имуществени|Приходи от такси|Приходи и доходи|Глоби|Постъпления|Приходи от концесии|Други приходи)/.test(normLabel(r.label))
        ? 1
        : 0,
      kind: "data" as const,
      group: null,
      cells: Object.fromEntries(
        columns.map((c) => {
          const cell = r.cells[c.key];
          return [c.key, cell ? { value: parseCellValue(cell.text), text: cell.text } : { value: null, text: "" }];
        }),
      ),
      rowIndex: i,
    }));
  return { ...meta, caption: `${annex.label}, с. ${page}`, scope: "kfp", basis: "cash", tableIndex: -page, columns, textColumns: [], rows };
}

function parseCellValue(text: string): string | null {
  return parseCell(text).value;
}

function vintageFromLabelSafe(l: string): Vintage {
  const s = l.toLowerCase();
  return s.includes("отчет") ? "actual" : s.includes("очакв") ? "expected" : s.includes("проект") ? "draft" : "forecast";
}
