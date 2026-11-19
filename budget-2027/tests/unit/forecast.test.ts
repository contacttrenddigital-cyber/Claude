/**
 * Forecast revisions between the 2026 bill (52-602-01-19, 01.07.2026) and the 2027 bill
 * (52-602-01-71, 16.11.2026). Expected values are the printed figures in Табл. I-2 and II-1 of each.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DocxExtract } from "@/lib/ingest/documents";
import { balanceBridge, revisions } from "@/lib/forecast/revisions";

const v = {
  old: DocxExtract.parse(JSON.parse(readFileSync("data/extracted/52-602-01-19.tables.json", "utf8"))),
  new: DocxExtract.parse(JSON.parse(readFileSync("data/extracted/52-602-01-71.tables.json", "utf8"))),
};

describe("macro revisions", () => {
  const r = revisions(v, "macro", ["2026", "2027", "2028"]);
  const get = (l: string, y: string) => r.find((x) => x.label === l && x.year === y)!;
  it("GDP deflator 2026: 5,2 → 9,1 (+3,9 пр.п.)", () => {
    expect(get("Дефлатор на БВП (%)", "2026")).toMatchObject({ oldValue: "5.2", newValue: "9.1", revision: "3.9" });
  });
  it("nominal GDP 2027: 134 592 → 141 302", () => {
    expect(get("БВП (млн. евро)", "2027")).toMatchObject({ oldValue: "134592", newValue: "141302", revision: "6710" });
  });
  it("real growth 2027 unchanged at 2,5 %; investment 2027 revised from +1,0 to −0,7", () => {
    expect(get("БВП (реален растеж, %)", "2027").revision).toBe("0");
    expect(get("Брутообразуване на основен капитал", "2027")).toMatchObject({ oldValue: "1.0", newValue: "-0.7" });
  });
  it("keeps the vintage labels of each document", () => {
    expect(get("Дефлатор на БВП (%)", "2026")).toMatchObject({ oldVintage: "forecast", newVintage: "forecast" });
  });
});

describe("KFP balance bridge 2027", () => {
  const r = revisions(v, "kfp", ["2026", "2027", "2028"]);
  it("balance 2027: −5 078,8 (old forecast) → −4 907,0 (draft)", () => {
    const b = r.find((x) => x.label === "БЮДЖЕТНО САЛДО (+/-)" && x.year === "2027")!;
    expect(b).toMatchObject({ oldValue: "-5078.8", newValue: "-4907.0", oldVintage: "forecast", newVintage: "draft" });
  });
  it("decomposes into +793,2 revenue and −621,3 expenditure with a 0,1 rounding residual", () => {
    const br = balanceBridge(r, "2027");
    expect(br).toMatchObject({ revenueEffect: "793.2", expenditureEffect: "-621.3", residual: "-0.1" });
  });
  it("2026 plan and 2026 expected are identical (−7 191,9)", () => {
    const b = r.find((x) => x.label === "БЮДЖЕТНО САЛДО (+/-)" && x.year === "2026")!;
    expect(b.revision).toBe("0");
  });
  it("throws when a bridge component is missing", () => {
    expect(() => balanceBridge(r, "2030")).toThrow(/missing/);
  });
});
