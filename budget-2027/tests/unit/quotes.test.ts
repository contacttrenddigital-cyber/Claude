/** Anti-drift: every quoted passage is verbatim in the cited paragraph (whitespace normalised). */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { QUOTES } from "@/lib/social/quotes";
import { defenseGap } from "@/lib/social/defense";

const norm = (s: string) => s.replace(/\s+/g, " ").trim();
const paras = (doc: string) =>
  new Map(
    (JSON.parse(readFileSync(join(__dirname, `../../data/extracted/${doc}.tables.json`), "utf8")).paragraphs as { index: number; text: string }[]).map((p) => [
      p.index,
      norm(p.text),
    ]),
  );

describe("quotes", () => {
  const cache = new Map<string, Map<number, string>>();
  for (const [key, q] of Object.entries(QUOTES)) {
    it(`${key} is in ${q.doc}, paragraph ${q.paragraph}`, () => {
      if (!cache.has(q.doc)) cache.set(q.doc, paras(q.doc));
      expect(cache.get(q.doc)!.get(q.paragraph)).toContain(norm(q.text));
    });
  }
});

describe("defense: NATO-classified plan vs. national plan row (Табл. III-2, % от БВП)", () => {
  it("2026 equal; 2027–2029 the NATO row is 0,10 пр.п. lower", () => {
    // printed: 2,15/2,23/2,45/2,55 (НАТО) and 2,15/2,33/2,55/2,65 (Национален план)
    const nato = { "2026": "2.15", "2027": "2.23", "2028": "2.45", "2029": "2.55" };
    const plan = { "2026": "2.15", "2027": "2.33", "2028": "2.55", "2029": "2.65" };
    const g = defenseGap(nato, plan);
    expect(g.map((x) => [x.period, x.gap?.toFixed(2)])).toEqual([
      ["2026", "0.00"],
      ["2027", "-0.10"],
      ["2028", "-0.10"],
      ["2029", "-0.10"],
    ]);
  });
  it("missing values stay missing", () => {
    expect(defenseGap({ "2027": "2.23" }, { "2027": null })[0]!.gap).toBeNull();
  });
});
