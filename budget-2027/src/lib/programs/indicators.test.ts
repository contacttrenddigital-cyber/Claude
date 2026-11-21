import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { IndicatorExtract, indicatorTable } from "./indicators";

const x = IndicatorExtract.parse(JSON.parse(readFileSync(join(__dirname, "../../../data/extracted/indicators.json"), "utf8")));
const t = indicatorTable(x, { documentId: "d", file: "f" });

describe("показатели за изпълнение", () => {
  // МОН PDF, с. 21, програма 1700.01.01: „Изготвен анализ на ефективността …“, брой, цел 1 / 1 / 1 (2027–2029)
  it("МОН: целите се четат под заглавията на годините, единицата — отделно", () => {
    const r = t.rows.find((r) => r.texts?.program === "1700.01.01" && r.label.startsWith("Изготвен анализ на ефективността"))!;
    expect(r.texts).toMatchObject({ unit: "брой", page: "PDF 1700, с. 21", kind: "изпълнение" });
    expect([r.cells["2027"]!.text, r.cells["2028"]!.text, r.cells["2029"]!.text]).toEqual(["1", "1", "1"]);
  });

  // МФ PDF, с. 48, програма 1000.01.01: „Заседания на ЕКОФИН („Бюджет“)“, срок, „1 път годишно“
  it("текстовите цели остават текст, без числова стойност", () => {
    const r = t.rows.find((r) => r.texts?.program === "1000.01.01" && r.label.includes("ЕКОФИН („Бюджет“)"))!;
    expect(r.cells["2027"]).toEqual({ value: null, text: "1 път годишно" });
  });

  it("никоя стойност не е само мерна единица", () => {
    const bad = t.rows.filter((r) => ["2027", "2028", "2029"].some((y) => /^(брой|бр\.?|%)$/i.test(r.cells[y]!.text)));
    expect(bad).toEqual([]);
  });
});
