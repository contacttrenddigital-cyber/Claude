/**
 * Re-verifies every figure of a claims archive against the extracted official documents and
 * recomputes every calculation. Pure: callers pass the loaded extracts.
 */
import Decimal from "decimal.js";
import { normLabel, docxRow, emfRow, yearColumns, type DocxExtract, type EmfTableExtract } from "@/lib/ingest/documents";
import { parseBgNumber } from "@/lib/ingest/bg-number";
import type { Claim, FigureCheck } from "./schema";

export interface Extracts {
  docx: Record<string, DocxExtract>; // by file stem, e.g. "52-602-01-71"
  annex3: EmfTableExtract;
  texts: Record<string, string>; // plain texts, e.g. "52-602-01-68"
}

export interface FigureResult {
  id: string;
  ok: boolean;
  found: string | null;
  message: string;
}

const eq = (a: string, b: string) => new Decimal(a).eq(new Decimal(b));

export function checkFigure(value: string | null, check: FigureCheck, x: Extracts): Omit<FigureResult, "id"> {
  const doc = "file" in check ? x.docx[check.file] : x.docx["52-602-01-71"];
  switch (check.kind) {
    case "docxRow": {
      const cell = docxRow(doc!, { table: check.table, label: check.label }).find((c) => c.period === check.year);
      const found = cell?.parsed?.value ?? null;
      return { ok: found !== null && value !== null && eq(found, value), found, message: cell?.locator ?? "клетката не е намерена" };
    }
    case "docxCell": {
      const t = doc!.tables[check.table]!;
      const row = t.rows.find((r) => r.some((c) => normLabel(c) === normLabel(check.label)));
      const found = row ? (parseBgNumber(row[check.col] ?? "")?.value ?? null) : null;
      return { ok: found !== null && value !== null && eq(found, value), found, message: `таблица ${check.table}, ред „${check.label}“, колона ${check.col + 1}` };
    }
    case "annex3": {
      const cell = emfRow(x.annex3, { page: check.page, label: check.label }).find((c) => c.period === check.year);
      const found = cell?.parsed?.value ?? null;
      return { ok: found !== null && value !== null && eq(found, value), found, message: cell?.locator ?? "" };
    }
    case "paragraph": {
      const p = doc!.paragraphs[check.paragraph - 1];
      const ok = !!p && normLabel(p.text).includes(normLabel(check.contains));
      return { ok, found: ok ? check.contains : null, message: `абзац ${check.paragraph}` };
    }
    case "text": {
      const t = x.texts[check.file] ?? "";
      const ok = normLabel(t).includes(normLabel(check.contains));
      return { ok, found: ok ? check.contains : null, message: `текст на ${check.file}` };
    }
    case "measure": {
      const t = doc!.tables[check.table]!;
      const { headerIdx, columns } = yearColumns(t.rows, "draft");
      const row = t.rows.slice(headerIdx + 1).find((r) => normLabel(r[0] ?? "").startsWith(normLabel(check.startsWith)));
      const found = row ? (parseBgNumber(row[columns.get("2027")!.col] ?? "")?.value ?? null) : null;
      return { ok: found !== null && value !== null && eq(found, value), found, message: `таблица ${check.table}, мярка „${check.startsWith}…“, 2027` };
    }
    case "measuresPositiveSum": {
      const t = doc!.tables[check.table]!;
      const { headerIdx, columns } = yearColumns(t.rows, "draft");
      const col = columns.get("2027")!.col;
      let sum = new Decimal(0);
      for (const r of t.rows.slice(headerIdx + 1)) {
        if (/^Общо/.test(normLabel(r[0] ?? ""))) continue;
        const v = parseBgNumber(r[col] ?? "")?.value;
        if (v && new Decimal(v).gt(0)) sum = sum.plus(v);
      }
      const found = sum.toString();
      return { ok: value !== null && eq(found, value), found, message: `сбор на положителните мерки в таблица ${check.table}, 2027` };
    }
  }
}

/** Recompute a claim's calculation from its figures, rounded to the decimals of the stated result. */
export function recompute(claim: Claim): { ok: boolean; computed: string | null } {
  const c = claim.calculation;
  if (!c) return { ok: true, computed: null };
  const val = (ref: string) => {
    if (/^-?\d+(\.\d+)?$/.test(ref)) return new Decimal(ref);
    const f = claim.figures.find((x) => x.id === ref);
    if (!f || f.value === null) throw new Error(`${claim.id}: input ${ref} has no value`);
    return new Decimal(f.value);
  };
  const [a, b] = [val(c.inputs[0]!), c.inputs[1] ? val(c.inputs[1]) : undefined];
  let r: Decimal;
  switch (c.op) {
    case "diff":
      r = a.minus(b!);
      break;
    case "pct_change":
      r = b!.minus(a).dividedBy(a.abs()).times(100);
      break;
    case "ratio":
      r = a.dividedBy(b!);
      break;
    case "share":
      r = a.dividedBy(b!).times(100);
      break;
    case "sum":
      r = c.inputs.map(val).reduce((s, v) => s.plus(v), new Decimal(0));
      break;
    case "per_capita":
      r = a.times(1_000_000).dividedBy(b!); // млн. € → € per person
      break;
  }
  const dp = c.result.includes(".") ? c.result.split(".")[1]!.length : 0;
  const computed = r.toDecimalPlaces(dp, Decimal.ROUND_HALF_UP).toFixed(dp);
  return { ok: new Decimal(computed).eq(c.result), computed };
}
