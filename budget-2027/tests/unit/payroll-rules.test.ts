/**
 * Anti-drift: every constant in src/lib/calc/rules.ts must match the printed source.
 * Sources: bill 52-602-01-71 (Приложение № 2 = DOCX table 35; motives paragraphs),
 * ДОО bill 52-602-01-68 (чл. 9), НЗОК bill 52-602-01-70 (motives).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import Decimal from "decimal.js";
import { DocxExtract, normLabel } from "@/lib/ingest/documents";
import { parseBgNumber } from "@/lib/ingest/bg-number";
import { RULES_2026, RULES_2027 } from "@/lib/calc/rules";

const docx = DocxExtract.parse(JSON.parse(readFileSync("data/extracted/52-602-01-71.tables.json", "utf8")));
const a2 = docx.tables[35]!.rows;
const row = (no: string, occurrence = 1) => a2.filter((r) => r[0]?.trim() === no)[occurrence - 1]!;
const cellNum = (r: string[], col: number) => new Decimal(parseBgNumber(r[col]!.trim())!.value);
const para = (i: number) => normLabel(docx.paragraphs[i - 1]!.text); // locators are 1-based
const doo = normLabel(readFileSync("data/extracted/52-602-01-68.txt", "utf8"));
const nzok = normLabel(readFileSync("data/extracted/52-602-01-70.txt", "utf8"));
const COL = { 2026: 3, 2027: 4 } as const;

describe("Приложение № 2 (АСБП 2027–2029) ↔ rules.ts", () => {
  it("is the assumptions table", () => {
    expect(normLabel(a2[0]!.join(" "))).toMatch(/ОСНОВНИ ДОПУСКАНИЯ.*2026 г\..*2027 г\./);
  });
  it("ред 3: PIT 10 % both years", () => {
    for (const y of [2026, 2027] as const) expect(cellNum(row("3."), COL[y]).eq((y === 2026 ? RULES_2026 : RULES_2027).pitRate.value)).toBe(true);
  });
  it("ред 10: minimum wage 620,20 (2026) and 660 (2027)", () => {
    expect(cellNum(row("10."), COL[2026]).eq(RULES_2026.periods[1]!.minWage.value)).toBe(true);
    expect(cellNum(row("10."), COL[2027]).eq(RULES_2027.periods[0]!.minWage.value)).toBe(true);
  });
  it("ред 18: max insurable income 2 111,64 / 2 300 (2026) and 2 400 (2027)", () => {
    expect(normLabel(row("18.")[COL[2026]]!)).toMatch(/2 111,64.*1 януари.*2300.*1 август/);
    expect(RULES_2026.periods.map((p) => p.maxInsurable.value)).toEqual(["2111.64", "2300"]);
    expect(cellNum(row("18."), COL[2027]).eq(RULES_2027.periods[0]!.maxInsurable.value)).toBe(true);
  });
  it("ред 11–13, 20: contribution rates and splits are unchanged and match", () => {
    for (const col of [COL[2026], COL[2027]]) {
      expect(row("11.1.", 2)[col]).toMatch(/^14,8 за родените след 31 декември 1959/);
      expect(cellNum(row("11.3."), col).eq(3.5)).toBe(true);
      expect(cellNum(row("11.5."), col).eq(1)).toBe(true);
      expect(cellNum(row("12."), col).eq(8)).toBe(true);
      expect(cellNum(row("13."), col).eq(5)).toBe(true);
      expect(row("20.1.")[col]).toBe("60:40");
      expect(row("20.3.")[col]).toBe("60:40");
      expect(row("20.2.", 1)[col]).toMatch(/^11,02:8,78/);
      expect(row("20.2.", 2)[col]).toMatch(/^8,22:6,58/);
    }
    for (const r of [RULES_2026, RULES_2027]) {
      const a = r.ratesAfter1959;
      // pensions 14.8 = 8.22 + 6.58; UPF 5 = 2.8 + 2.2; pensions+UPF split = 11.02 : 8.78
      expect(new Decimal(a.pensions.employer).plus(a.pensions.employee).eq(14.8)).toBe(true);
      expect(new Decimal(a.upf.employer).plus(a.upf.employee).eq(5)).toBe(true);
      expect(new Decimal(a.pensions.employer).plus(a.upf.employer).eq(11.02)).toBe(true);
      expect(new Decimal(a.pensions.employee).plus(a.upf.employee).eq(8.78)).toBe(true);
      // 60:40 splits of 3.5 %, 1 % and 8 %
      expect([a.sickness, a.unemployment, a.health].map((x) => [x.employer, x.employee])).toEqual([["2.1", "1.4"], ["0.6", "0.4"], ["4.8", "3.2"]]);
      expect(r.ratesBefore1960.pensions).toEqual({ employer: "11.02", employee: "8.78" });
      expect(r.tzpbRange).toMatchObject({ min: "0.4", max: "1.1" });
    }
    expect(row("11.4.", 2)[COL[2027]]).toMatch(/от 0,4 до 1,1 на сто/);
  });
});

describe("motives paragraphs ↔ child reliefs", () => {
  it("абзац 589: minimum wage 660 for 2027", () => {
    expect(para(589)).toContain("660 евро за 2027 г.");
  });
  it("абзац 844: old and new child relief amounts", () => {
    const p = para(844);
    expect(p).toContain("за едно дете от 3 067,75 евро на 5 000 евро");
    expect(p).toContain("за две деца от 6 135,50 евро на 10 000 евро");
    expect(p).toContain("за три и повече деца от 9 203,25 евро на 15 000 евро");
    expect(p).toContain("за едно дете с увреждане от 6 135,50 евро на 12 000 евро");
    expect([RULES_2026.childRelief.one.value, RULES_2026.childRelief.two.value, RULES_2026.childRelief.threePlus.value]).toEqual(["3067.75", "6135.50", "9203.25"]);
    expect([RULES_2027.childRelief.one.value, RULES_2027.childRelief.two.value, RULES_2027.childRelief.threePlus.value]).toEqual(["5000", "10000", "15000"]);
    expect([RULES_2026.disabledChildRelief.value, RULES_2027.disabledChildRelief.value]).toEqual(["6135.50", "12000"]);
  });
  it("абзац 931: monthly advance relief amounts", () => {
    const p = para(931);
    expect(p).toContain("с 416,66 евро при едно дете, 833,33 евро при две деца, 1 250 евро при три и повече деца и 1 000 евро за дете с увреждане");
    expect(RULES_2027.monthlyAdvanceRelief).toMatchObject({ one: "416.66", two: "833.33", threePlus: "1250", disabled: "1000" });
  });
  it("абзац 932: child development relief caps", () => {
    expect(para(932)).toContain("до 2 000 евро при едно ненавършило пълнолетие дете, до 4 000 евро при две деца и до 6 000 евро при три и повече деца");
    expect(RULES_2027.childDevelopmentCap).toMatchObject({ one: "2000", two: "4000", threePlus: "6000" });
  });
});

describe("ДОО and НЗОК bills (independent cross-check for 2027)", () => {
  it("ДОО чл. 9: max 2 400 €, self-employed minimum 660 €", () => {
    expect(doo).toContain("максимален месечен размер на осигурителния доход – 2 400 евро");
    expect(doo).toContain("минимален месечен размер на осигурителния доход за самоосигуряващите се лица – 660 евро");
  });
  it("НЗОК: 8 % health contribution, split 60:40 in 2027", () => {
    expect(nzok).toContain("здравноосигурителната вноска от 8 на сто");
    expect(nzok).toContain("за 2027 г. е 60:40");
  });
});
