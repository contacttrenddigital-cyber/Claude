/**
 * Budget laws of the social funds (ДОО, НЗОК) print each article as a numbered list of indicators:
 * "Чл. 1. (1) Приема … по приходите …" followed by rows "1.", "1.1.", … with an amount in хил. €.
 * The ДОО bill lays the whole law out in one grid where labels wrap onto continuation rows;
 * the НЗОК bill has one clean table per paragraph with the heading in the preceding text.
 *
 * Parsing keeps the printed text and the row of the amount. Hierarchy comes from the item code
 * ("1.1.3." → depth 2), never from indentation.
 */
import Decimal from "decimal.js";
import { reconcile } from "@/lib/fiscal/money";
import { NumberFormatError, parseBgNumber } from "@/lib/ingest/bg-number";
import { normLabel, type DocxExtract } from "@/lib/ingest/documents";
import type { Check } from "@/lib/ingest/snapshot";
import type { ExtractedTable, TableRow } from "./extract";

export interface LawItem {
  code: string;
  label: string;
  value: string | null;
  text: string;
  depth: number;
  table: number;
  row: number;
}

export type SectionKind = "revenue" | "expenditure" | "balance";

export interface LawSection {
  article: number;
  paragraph: number;
  heading: string;
  kind: SectionKind;
  items: LawItem[];
}

const CODE = /^([IVX]+|\d+(?:\.\d+)*)\.$/;
const HEADING = /^(?:Чл\.\s*(\d+)\.\s*)?\((\d+)\)\s/;

/** "I." → 0 (grand total), "1." → 1, "1.1." → 2, … */
export function codeDepth(code: string): number {
  if (/^[IVX]+\.$/.test(code)) return 0;
  return code.replace(/\.$/, "").split(".").length;
}

function amount(text: string): { value: string | null; text: string } {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return { value: null, text: "" };
  try {
    const p = parseBgNumber(t);
    return { value: p ? p.value : null, text: t };
  } catch (e) {
    if (e instanceof NumberFormatError) return { value: null, text: t };
    throw e;
  }
}

function kindOf(heading: string): SectionKind {
  if (/дефицит/i.test(heading)) return "balance";
  if (/разход/i.test(heading)) return "expenditure";
  if (/приход/i.test(heading)) return "revenue";
  throw new Error(`Cannot classify law paragraph: ${heading.slice(0, 80)}`);
}

/** Parse the given tables of a law into its article paragraphs. */
export function parseLawSections(doc: DocxExtract, tables: number[]): LawSection[] {
  const out: LawSection[] = [];
  let article = 0;
  let cur: LawSection | null = null;
  let collectingHeading = false;
  const open = (text: string) => {
    const m = HEADING.exec(text)!;
    if (m[1]) article = Number(m[1]);
    cur = { article, paragraph: Number(m[2]), heading: text, kind: "revenue", items: [] };
    out.push(cur);
    collectingHeading = true;
  };
  for (const ti of tables) {
    const t = doc.tables[ti];
    if (!t) throw new Error(`table ${ti} missing`);
    // НЗОК: the heading is the paragraph right before the table
    const ctx = t.context.at(-1) ?? "";
    if (HEADING.test(normLabel(ctx))) {
      open(normLabel(ctx));
      collectingHeading = false;
    }
    t.rows.forEach((r, ri) => {
      const c0 = normLabel(r[0] ?? "");
      const c1 = normLabel(r[1] ?? "");
      const last = amount(r.at(-1) ?? "");
      if (!c0 && !c1 && !last.text) {
        collectingHeading = false;
        return;
      }
      if (HEADING.test(c0) && !c1) return open(c0);
      if (!cur) return;
      const sec = cur as LawSection;
      if (CODE.test(c0)) {
        collectingHeading = false;
        sec.items.push({ code: c0, label: c1, value: last.value, text: last.text, depth: codeDepth(c0), table: ti, row: ri });
        return;
      }
      if (/^ДЕФИЦИТ/.test(c0)) {
        collectingHeading = false;
        sec.items.push({ code: "", label: c0, value: last.value, text: last.text, depth: 0, table: ti, row: ri });
        return;
      }
      const prev = sec.items.at(-1);
      if (!c0 && c1 && prev && prev.value === null) {
        // wrapped label; the amount sits on the last line
        prev.label = `${prev.label} ${c1}`;
        if (last.text) Object.assign(prev, { value: last.value, text: last.text, table: ti, row: ri });
        return;
      }
      if (collectingHeading && c0 && !c1 && !last.text) sec.heading = `${sec.heading} ${c0}`;
    });
  }
  for (const s of out) s.kind = kindOf(s.heading);
  return out;
}

export function section(sections: LawSection[], article: number, paragraph: number): LawSection {
  const s = sections.find((x) => x.article === article && x.paragraph === paragraph);
  if (!s) throw new Error(`чл. ${article}, ал. ${paragraph} not found`);
  return s;
}

/** The fund's name as printed: „Пенсии“, „Безработица“, … or the institution. */
export function fundName(s: LawSection): string {
  const q = /„([^“]+)“/.exec(s.heading);
  if (q) return q[1]!;
  if (/консолидирания бюджет/i.test(s.heading)) return "Консолидиран бюджет на ДОО";
  if (/Националния осигурителен институт/i.test(s.heading)) return "Национален осигурителен институт";
  if (/НЗОК|здравноосигурителна каса/i.test(s.heading)) return "НЗОК";
  return s.heading.slice(0, 60);
}

/** Each item with children (next depth) must equal their sum; "в т.ч." lists may be partial. */
export function lawTreeChecks(id: string, title: string, s: LawSection, tolerance = "0.2"): Check[] {
  const out: Check[] = [];
  const items = s.items.filter((i) => i.code);
  items.forEach((p, i) => {
    const kids: LawItem[] = [];
    for (let j = i + 1; j < items.length && items[j]!.depth > p.depth; j++) if (items[j]!.depth === p.depth + 1) kids.push(items[j]!);
    if (kids.length === 0 || p.value === null || kids.some((k) => k.value === null)) return;
    const r = reconcile(kids.map((k) => k.value!), p.value, tolerance);
    const partial = kids.every((k) => /^в т\.ч\./i.test(k.label));
    const ok = r.ok || (partial && r.sum.lte(p.value));
    out.push({
      id: `law:${id}:${s.article}.${s.paragraph}:${p.code}`,
      kind: "total",
      status: ok ? "pass" : "fail",
      description: `${title}, чл. ${s.article}, ал. ${s.paragraph}: подточките на ${p.code} „${p.label.slice(0, 60)}“ ${r.ok ? "дават сбора" : partial ? "(„в т.ч.“) не надхвърлят сбора" : "не дават сбора"}`,
      details: { sum: r.sum.toString(), printed: p.value, difference: r.difference.toString() },
    });
  });
  return out;
}

/** Printed balance = revenue total − expenditure total, per article. */
export function lawBalanceCheck(id: string, title: string, rev: LawSection, exp: LawSection, bal: LawSection): Check {
  const total = (s: LawSection) => s.items.find((i) => i.depth === 0 && i.code)?.value ?? null;
  const b = bal.items.find((i) => /^ДЕФИЦИТ/.test(i.label))?.value ?? null;
  const r = total(rev);
  const e = total(exp);
  const cid = `law:${id}:${rev.article}:balance`;
  if (r === null || e === null || b === null) return { id: cid, kind: "identity", status: "warn", description: `${title}: липсва стойност за салдото` };
  const d = new Decimal(r).minus(e).minus(b);
  return {
    id: cid,
    kind: "identity",
    status: d.abs().lte("0.1") ? "pass" : "fail",
    description: `${title}, чл. ${rev.article}: приходи − разходи = отпечатаното салдо`,
    details: { revenue: r, expenditure: e, balance: b, difference: d.toString() },
  };
}

/** Render a paragraph as a cited table (one column: the 2027 draft amount). */
export function lawSectionAsTable(
  s: LawSection,
  meta: { id: string; title: string; description: string; documentId: string; file: string; scope: string },
): ExtractedTable {
  const rows: TableRow[] = s.items
    .filter((i) => i.code)
    .map((i, n) => ({
      label: i.depth === 0 ? i.label : `${i.code} ${i.label}`,
      level: i.depth === 0 ? 0 : i.depth - 1,
      kind: i.depth === 0 ? ("total" as const) : ("data" as const),
      group: null,
      cells: { "2027": { value: i.value, text: i.text } },
      rowIndex: n,
    }));
  return {
    ...meta,
    caption: `чл. ${s.article}, ал. ${s.paragraph}`,
    basis: "cash",
    tableIndex: -1,
    columns: [{ key: "2027", col: 2, label: "2027", period: "2027", vintage: "draft", unit: "хил. €" }],
    textColumns: [],
    rows,
  };
}

/** One row per fund: revenue, expenditure and the printed balance from paragraphs (1)–(3). */
export function fundsSummaryTable(
  sections: LawSection[],
  articles: number[],
  meta: { id: string; title: string; description: string; documentId: string; file: string; scope: string },
): ExtractedTable {
  const total = (s: LawSection) => s.items.find((i) => i.depth === 0 && i.code)!;
  const rows: TableRow[] = articles.map((a, n) => {
    const rev = section(sections, a, 1);
    const exp = section(sections, a, 2);
    const bal = section(sections, a, 3).items.find((i) => /^ДЕФИЦИТ/.test(i.label))!;
    return {
      label: `${fundName(rev)} (чл. ${a})`,
      level: a === 1 ? 0 : 1,
      kind: a === 1 ? ("total" as const) : ("data" as const),
      group: null,
      cells: {
        revenue: { value: total(rev).value, text: total(rev).text },
        expenditure: { value: total(exp).value, text: total(exp).text },
        balance: { value: bal.value, text: bal.text },
      },
      rowIndex: n,
    };
  });
  return {
    ...meta,
    caption: `чл. ${articles[0]}–${articles.at(-1)}, ал. 1–3`,
    basis: "cash",
    tableIndex: -1,
    columns: [
      { key: "revenue", col: 2, label: "Приходи и трансфери", period: "2027", vintage: "draft", unit: "хил. €" },
      { key: "expenditure", col: 2, label: "Разходи и трансфери", period: "2027", vintage: "draft", unit: "хил. €" },
      { key: "balance", col: 2, label: "Дефицит (−) / излишък (+)", period: "2027", vintage: "draft", unit: "хил. €" },
    ],
    textColumns: [],
    rows,
  };
}
