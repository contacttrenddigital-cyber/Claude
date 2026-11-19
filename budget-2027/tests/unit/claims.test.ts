/**
 * Every number in the Asen Vasilev archive is re-read from the official documents and every
 * calculation is recomputed. Quotes are checked against the saved articles when they exist locally
 * (articles are copyrighted and not committed).
 */
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ClaimsArchive } from "@/lib/claims/schema";
import { checkFigure, recompute, type Extracts } from "@/lib/claims/verify";
import { DocxExtract, EmfTableExtract, normLabel } from "@/lib/ingest/documents";
import { SnapshotSchema } from "@/lib/ingest/snapshot-schema";

const archive = ClaimsArchive.parse(JSON.parse(readFileSync("data/claims/asen-vasilev.json", "utf8")));
const x: Extracts = {
  docx: {
    "52-602-01-71": DocxExtract.parse(JSON.parse(readFileSync("data/extracted/52-602-01-71.tables.json", "utf8"))),
    "52-602-01-19": DocxExtract.parse(JSON.parse(readFileSync("data/extracted/52-602-01-19.tables.json", "utf8"))),
  },
  annex3: EmfTableExtract.parse(JSON.parse(readFileSync("data/extracted/52-602-01-71.annex3.json", "utf8"))),
  texts: { "52-602-01-68": readFileSync("data/extracted/52-602-01-68.txt", "utf8") },
};
const latest = JSON.parse(readFileSync("data/snapshots/latest.json", "utf8"));
const snap = SnapshotSchema.parse(JSON.parse(readFileSync(`data/snapshots/${latest.file}`, "utf8")));
const knownDocs = new Set([...snap.documents.map((d) => d.id), ...archive.documents.map((d) => d.id)]);
const claims = archive.statements.flatMap((s) => s.claims.map((c) => ({ s, c })));

describe("archive structure", () => {
  it("has statements and unique claim ids", () => {
    expect(archive.statements.length).toBeGreaterThanOrEqual(3);
    expect(new Set(claims.map(({ c }) => c.id)).size).toBe(claims.length);
  });
  it("every cited document exists (snapshot or archive)", () => {
    for (const { s, c } of claims) {
      for (const id of s.documentIds) expect(knownDocs.has(id), id).toBe(true);
      for (const f of c.figures) expect(knownDocs.has(f.documentId), `${c.id}/${f.id}: ${f.documentId}`).toBe(true);
    }
  });
});

describe.each(claims.map(({ c }) => [c.id, c] as const))("claim %s", (_id, c) => {
  it("every checked figure matches the printed document", () => {
    for (const f of c.figures) {
      if (!f.check) continue;
      const r = checkFigure(f.value, f.check, x);
      expect(r.ok, `${c.id}/${f.id} (${f.label}): expected ${f.value}, found ${r.found} at ${r.message}`).toBe(true);
    }
  });
  it("calculation reproduces the stated result", () => {
    const r = recompute(c);
    expect(r.ok, `${c.id}: computed ${r.computed} vs stated ${c.calculation?.result}`).toBe(true);
  });
  it("paragraph references in the text point to the quoted government wording", () => {
    const doc = x.docx["52-602-01-71"]!;
    for (const field of [c.governmentPosition, c.context, c.reasoning]) {
      // forms: "абзац 721): „…“", "Абзац 721: „…“", "(абзац 695)"
      for (const m of (field ?? "").matchAll(/[Аа]бзац (\d+)\)?:? „([^“]+)“|\([Аа]бзац (\d+)\)/g)) {
        const n = Number(m[1] ?? m[3]);
        const p = doc.paragraphs[n - 1];
        expect(p, `${c.id}: абзац ${n} exists`).toBeTruthy();
        if (m[2]) expect(normLabel(p!.text), `${c.id}: абзац ${n}`).toContain(normLabel(m[2].replace(/…$/, "")));
      }
    }
  });
});

const raw = (f: string) => (existsSync(f) ? readFileSync(f, "utf8") : null);
const articles: Record<string, string | null> = {
  "av-2026-11-07-analysis": raw("data/raw/media/a1.html"),
  "av-2026-11-09-video": raw("data/raw/media/a3.html"),
  "av-2026-11-15-nova": raw("data/raw/media/a4.html"),
};
describe.skipIf(!articles["av-2026-11-07-analysis"])("quotes are verbatim (local raw articles)", () => {
  const plain = (h: string) =>
    normLabel(
      h
        .replace(/<(script|style)[\s\S]*?<\/\1>/g, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&quot;/g, '"')
        .replace(/&#8211;|&ndash;/g, "–"),
    );
  for (const s of archive.statements) {
    it(s.id, () => {
      const text = plain(articles[s.id]!);
      for (const c of s.claims) expect(text, c.id).toContain(normLabel(c.quote));
    });
  }
});
