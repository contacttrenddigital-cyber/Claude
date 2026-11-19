/**
 * Full-text search over the official documents' extracted text (bill paragraphs and table rows,
 * ДОО and НЗОК bills). Exact token matching only — no semantic guessing, no generated answers.
 */
import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DocxExtract, normLabel, tableCaption } from "@/lib/ingest/documents";

export interface SearchItem {
  docId: string;
  docTitle: string;
  url: string;
  locator: string;
  text: string;
  norm: string;
}

let INDEX: SearchItem[] | null = null;

const lower = (s: string) => s.toLowerCase().replace(/ё/g, "е");

function build(): SearchItem[] {
  const root = join(process.cwd(), "data/extracted");
  const items: SearchItem[] = [];
  const docx = (file: string, docId: string, title: string, url: string) => {
    const d = DocxExtract.parse(JSON.parse(readFileSync(join(root, `${file}.tables.json`), "utf8")));
    for (const p of d.paragraphs) items.push({ docId, docTitle: title, url, locator: `абзац ${p.index + 1}`, text: p.text, norm: lower(p.text) });
    d.tables.forEach((t) =>
      t.rows.forEach((r, i) => {
        const text = r.map((c) => normLabel(c)).filter(Boolean).join(" | ");
        if (text.length > 3) items.push({ docId, docTitle: title, url, locator: `${tableCaption(t).slice(0, 80)} (таблица ${t.index}), ред ${i + 1}`, text, norm: lower(text) });
      }),
    );
  };
  docx("52-602-01-71", "ns-52-602-01-71-docx", "Законопроект за ДБРБ 2027 с мотиви (НС 52-602-01-71)", "https://www.parliament.bg/bills/52/52-602-01-71.docx");
  docx("52-602-01-19", "ns-52-602-01-19-docx", "Законопроект за ДБРБ 2026 с мотиви (НС 52-602-01-19)", "https://www.parliament.bg/bills/52/52-602-01-19.docx");
  const txt = (file: string, docId: string, title: string, url: string) => {
    readFileSync(join(root, `${file}.txt`), "utf8")
      .split(/\n\s*\n/)
      .map((b) => b.replace(/\s+/g, " ").trim())
      // numbered points ("1. …", "а) …") belong to the article above them
      .reduce<string[]>((acc, b) => {
        if (acc.length && /^(\d+\.|[а-я]\))\s/.test(b)) acc[acc.length - 1] += ` ${b}`;
        else acc.push(b);
        return acc;
      }, [])
      .filter((b) => b.length > 20)
      .forEach((b, i) => items.push({ docId, docTitle: title, url, locator: `абзац ${i + 1}`, text: b, norm: lower(b) }));
  };
  txt("52-602-01-68", "ns-52-602-01-68-rtf", "Законопроект за бюджета на ДОО 2027 (НС 52-602-01-68)", "https://www.parliament.bg/bills/52/52-602-01-68.rtf");
  txt("52-602-01-70", "ns-52-602-01-70-rtf", "Законопроект за бюджета на НЗОК 2027 (НС 52-602-01-70)", "https://www.parliament.bg/bills/52/52-602-01-70.rtf");
  return items;
}

export function searchDocuments(query: string, limit = 50): { total: number; results: (SearchItem & { snippet: string })[]; docCount: number; itemCount: number } {
  INDEX ??= build();
  const tokens = lower(query).split(/\s+/).filter((t) => t.length >= 2).slice(0, 8);
  const docCount = new Set(INDEX.map((i) => i.docId)).size;
  if (!tokens.length) return { total: 0, results: [], docCount, itemCount: INDEX.length };
  const hits = INDEX.filter((i) => tokens.every((t) => i.norm.includes(t)));
  const results = hits.slice(0, limit).map((h) => {
    const at = h.norm.indexOf(tokens[0]!);
    const start = Math.max(0, at - 120);
    return { ...h, snippet: (start > 0 ? "…" : "") + h.text.slice(start, start + 360) + (h.text.length > start + 360 ? "…" : "") };
  });
  return { total: hits.length, results, docCount, itemCount: INDEX.length };
}
