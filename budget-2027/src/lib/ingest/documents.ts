/**
 * Typed readers for the extracted official documents (output of scripts/extract/*.py).
 * Each reader returns cells together with a human-readable locator, so every number can be
 * cited as "<document>, <table/page>, <row>, <column>".
 */
import { z } from "zod";
import { parseBgNumber, type ParsedNumber } from "./bg-number";

export const DocxExtract = z.object({
  file: z.string(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  tables: z.array(
    z.object({
      index: z.number(),
      context: z.array(z.string()),
      rows: z.array(z.array(z.string())),
    }),
  ),
  paragraphs: z.array(z.object({ index: z.number(), afterTable: z.number(), text: z.string() })),
});
export type DocxExtract = z.infer<typeof DocxExtract>;

const EmfCell = z.object({ text: z.string(), x: z.number(), y: z.number() });
export const EmfTableExtract = z.object({
  label: z.string(),
  pages: z.array(
    z.object({
      file: z.string(),
      sha256: z.string(),
      page: z.number(),
      columns: z.array(z.number()),
      statuses: z.record(z.string(), z.string()),
      rows: z.array(
        z.object({
          page: z.number(),
          y: z.number(),
          label: z.string(),
          cells: z.record(z.string(), EmfCell),
        }),
      ),
    }),
  ),
});
export type EmfTableExtract = z.infer<typeof EmfTableExtract>;

/** Budget-document vintage of a column. */
export type Vintage = "actual" | "expected" | "plan" | "draft" | "forecast";

export function vintageFromLabel(label: string): Vintage {
  const s = label.toLowerCase();
  if (s.includes("отчет")) return "actual";
  if (s.includes("очакв")) return "expected";
  if (s.includes("проект")) return "draft";
  if (s.includes("прогноз")) return "forecast";
  if (s.includes("програма") || s.includes("закон") || s.includes("план")) return "plan";
  throw new Error(`Unknown column status label: "${label}"`);
}

export const VINTAGE_LABEL_BG: Record<Vintage, string> = {
  actual: "отчет",
  expected: "очаквано изпълнение",
  plan: "план по закон",
  draft: "проект",
  forecast: "прогноза",
};

export function normLabel(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export interface ExtractedCell {
  period: string;
  vintage: Vintage;
  parsed: ParsedNumber | null;
  locator: string;
}

function findRow<T>(rows: T[], getLabels: (r: T) => string[], label: string, occurrence = 1) {
  const want = normLabel(label);
  let seen = 0;
  for (let i = 0; i < rows.length; i++) {
    if (getLabels(rows[i]!).some((l) => normLabel(l) === want)) {
      seen++;
      if (seen === occurrence) return i;
    }
  }
  throw new Error(`Row "${label}" (occurrence ${occurrence}) not found`);
}

/** Annex 3 (EMF vector text). */
export function emfRow(
  annex: EmfTableExtract,
  spec: { page: number; label: string; occurrence?: number },
): ExtractedCell[] {
  const page = annex.pages.find((p) => p.page === spec.page);
  if (!page) throw new Error(`Annex page ${spec.page} missing`);
  const idx = findRow(page.rows, (r) => [r.label], spec.label, spec.occurrence);
  const row = page.rows[idx]!;
  return page.columns.map((year) => {
    const cell = row.cells[String(year)];
    const status = page.statuses[String(year)];
    if (!status) throw new Error(`No status for column ${year} on annex page ${spec.page}`);
    return {
      period: String(year),
      vintage: vintageFromLabel(status),
      parsed: cell ? parseBgNumber(cell.text) : null,
      locator: `${annex.label}, с. ${spec.page} (${page.file}), ред „${normLabel(row.label)}“, колона ${year} ${status}${cell ? ` [x=${cell.x}, y=${cell.y}]` : " [празна клетка]"}`,
    };
  });
}

/** Column map of a DOCX table: year → { col, vintage }. Years may be followed by a status in the same
 * cell ("2025\nОтчет"), in the next row, or in a spanning row above ("Отчетни данни" / "Прогноза"). */
export function yearColumns(rows: string[][], defaultVintage?: Vintage) {
  const headerIdx = rows.findIndex((r) => r.filter((c) => /\b20\d\d\b/.test(c)).length >= 2);
  if (headerIdx < 0) throw new Error("No year header row");
  const header = rows[headerIdx]!;
  const above = headerIdx > 0 ? rows[headerIdx - 1]! : [];
  const below = rows[headerIdx + 1] ?? [];
  const out = new Map<string, { col: number; vintage: Vintage; statusLabel: string }>();
  let spanning = "";
  for (let c = 0; c < header.length; c++) {
    if (above[c]) spanning = above[c]!;
    const m = header[c]!.match(/\b(20\d\d)\b/);
    if (!m || out.has(m[1]!)) continue;
    const inCell = header[c]!.replace(m[1]!, "").replace(/г\./, "").trim();
    const belowText = below[c]?.trim() ?? "";
    const belowIsStatus = belowText !== "" && !/\d/.test(belowText);
    const statusLabel = inCell || (belowIsStatus ? belowText : "") || spanning;
    if (!statusLabel) {
      if (!defaultVintage) throw new Error(`Column ${m[1]} has no status label`);
      out.set(m[1]!, { col: c, vintage: defaultVintage, statusLabel: VINTAGE_LABEL_BG[defaultVintage] });
      continue;
    }
    out.set(m[1]!, { col: c, vintage: vintageFromLabel(statusLabel), statusLabel: normLabel(statusLabel) });
  }
  return { headerIdx, columns: out };
}

export function tableCaption(t: DocxExtract["tables"][number]) {
  const cap = [...t.context].reverse().find((c) => /^(Табл\.|Приложение|Чл\.)/.test(c)) ?? t.context.at(-1) ?? "";
  return normLabel(cap).slice(0, 140);
}

/** One row of a DOCX table across its year columns. `offset` selects a sub-column of a year group
 * (e.g. Табл. II-5 has "млн. евро" at +0 and "% от БВП" at +1). */
export function docxRow(
  doc: DocxExtract,
  spec: { table: number; label: string; occurrence?: number; offset?: number; years?: string[] },
): ExtractedCell[] {
  const t = doc.tables[spec.table];
  if (!t) throw new Error(`Table ${spec.table} missing`);
  const { headerIdx, columns } = yearColumns(t.rows);
  const idx = findRow(t.rows.slice(headerIdx + 1), (r) => r, spec.label, spec.occurrence) + headerIdx + 1;
  const row = t.rows[idx]!;
  const cap = tableCaption(t);
  const out: ExtractedCell[] = [];
  for (const [year, { col, vintage, statusLabel }] of columns) {
    if (spec.years && !spec.years.includes(year)) continue;
    const c = col + (spec.offset ?? 0);
    const text = row[c] ?? "";
    out.push({
      period: year,
      vintage,
      parsed: parseBgNumber(text),
      locator: `${cap} (таблица ${spec.table} в ${doc.file}), ред ${idx + 1} „${normLabel(row.find((x) => x && !parseSafe(x)) ?? spec.label)}“, колона ${year} ${statusLabel}`,
    });
  }
  return out;
}

function parseSafe(s: string) {
  try {
    return parseBgNumber(s);
  } catch {
    return null;
  }
}

/** A single-amount DOCX table (e.g. чл. 1 ЗДБ: "№ | Показатели | Сума"). */
export function docxAmount(
  doc: DocxExtract,
  spec: { table: number; label: string; occurrence?: number; column: number; period: string; vintage: Vintage },
): ExtractedCell[] {
  const t = doc.tables[spec.table];
  if (!t) throw new Error(`Table ${spec.table} missing`);
  const idx = findRow(t.rows, (r) => r, spec.label, spec.occurrence);
  const text = t.rows[idx]![spec.column] ?? "";
  return [
    {
      period: spec.period,
      vintage: spec.vintage,
      parsed: parseBgNumber(text),
      locator: `${tableCaption(t)} (таблица ${spec.table} в ${doc.file}), ред ${idx + 1} „${normLabel(spec.label)}“, колона ${spec.column + 1}`,
    },
  ];
}

/** Values stated in running text, e.g. "660 евро за 2027 г., 680 евро за 2028 г.". */
export function docxText(
  doc: DocxExtract,
  spec: { contains: string; pattern: string; vintage: Vintage; period?: string },
): ExtractedCell[] {
  const p = doc.paragraphs.find((x) => normLabel(x.text).includes(spec.contains));
  if (!p) throw new Error(`Paragraph containing "${spec.contains}" not found`);
  const re = new RegExp(spec.pattern, "g");
  const out: ExtractedCell[] = [];
  for (const m of normLabel(p.text).matchAll(re)) {
    const amount = m.groups?.amount;
    const year = m.groups?.year ?? spec.period;
    if (!amount || !year) throw new Error("pattern must define (?<amount>) and (?<year>) groups, or spec.period");
    out.push({
      period: year,
      vintage: spec.vintage,
      parsed: parseBgNumber(amount),
      locator: `${doc.file}, абзац ${p.index + 1}: „${m[0]}“`,
    });
  }
  if (!out.length) throw new Error(`Pattern matched nothing in paragraph ${p.index}`);
  return out;
}
