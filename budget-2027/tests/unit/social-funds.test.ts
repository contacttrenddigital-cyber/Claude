/**
 * ДОО and НЗОК bills for 2027 (НС 52-602-01-68 and 52-602-01-70, внесени на 16.11.2026),
 * parsed from the committed extracts. Expected values are the printed amounts in хил. €.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import { DocxExtract } from "@/lib/ingest/documents";
import { codeDepth, fundName, lawBalanceCheck, lawTreeChecks, parseLawSections, section } from "@/lib/tables/law";
import { DOO_FUND_ARTICLES, DOO_TABLES, NZOK_TABLES, socialFundTables } from "@/lib/tables/social-funds";
import { amount, dooFunding, dooPensionsShare, nzokFunding, nzokPaymentShares } from "@/lib/social/derived";
import type { DocxExtract as DocxT } from "@/lib/ingest/documents";

const load = (n: string) => DocxExtract.parse(JSON.parse(readFileSync(join(__dirname, `../../data/extracted/${n}.tables.json`), "utf8")));
const doo = load("52-602-01-68");
const nzok = load("52-602-01-70");
const built = socialFundTables(doo, nzok, { doo: "ns-52-602-01-68-rtf", nzok: "ns-52-602-01-70-rtf" });
const T = (id: string) => built.tables.find((t) => t.id === id)!;

describe("law parsing", () => {
  it("extracts are tied to the original RTF files", () => {
    expect(doo.file).toBe("52-602-01-68.rtf");
    expect(doo.via).toMatch(/LibreOffice/);
    expect(nzok.file).toBe("52-602-01-70.rtf");
  });

  it("code depth comes from the item number", () => {
    expect(codeDepth("I.")).toBe(0);
    expect(codeDepth("II.")).toBe(0);
    expect(codeDepth("1.")).toBe(1);
    expect(codeDepth("1.1.3.5.4.1.")).toBe(6);
  });

  it("ДОО: 8 articles × 3 paragraphs, wrapped labels joined", () => {
    const s = parseLawSections(doo, DOO_TABLES);
    expect(s).toHaveLength(24);
    expect(s.map((x) => fundName(x)).filter((_, i) => i % 3 === 0)).toEqual([
      "Консолидиран бюджет на ДОО",
      "Пенсии",
      "Пенсии за лицата по чл. 69",
      "Пенсии, несвързани с трудова дейност",
      "Трудова злополука и професионална болест",
      "Общо заболяване и майчинство",
      "Безработица",
      "Национален осигурителен институт",
    ]);
    const exp = section(s, 1, 2);
    const it21 = exp.items.find((i) => i.code === "2.1.")!;
    expect(it21.label).toMatch(/^На Министерството на здравеопазването.*Кодекса за социално осигуряване$/);
    expect(it21.value).toBe("1610.6");
  });

  it("ДОО: every parent equals its items and every fund balances", () => {
    const s = parseLawSections(doo, DOO_TABLES);
    const tree = s.flatMap((x) => lawTreeChecks("doo", "ДОО", x));
    expect(tree.length).toBeGreaterThan(40);
    expect(tree.filter((c) => c.status !== "pass")).toEqual([]);
    for (const a of DOO_FUND_ARTICLES) expect(lawBalanceCheck("doo", "ДОО", section(s, a, 1), section(s, a, 2), section(s, a, 3)).status).toBe("pass");
  });

  it("НЗОК: headings come from the paragraph before each table", () => {
    const s = parseLawSections(nzok, NZOK_TABLES);
    expect(s.map((x) => [x.article, x.paragraph, x.kind])).toEqual([
      [1, 1, "revenue"],
      [1, 2, "expenditure"],
    ]);
    expect(s.flatMap((x) => lawTreeChecks("nzok", "НЗОК", x)).filter((c) => c.status !== "pass")).toEqual([]);
  });

  it("a wrong amount fails the tree check", () => {
    const broken: DocxT = JSON.parse(JSON.stringify(nzok));
    const row = broken.tables[0]!.rows.find((r) => r[0] === "1.1.")!;
    row[2] = "3 458 463,3";
    const s = parseLawSections(broken, NZOK_TABLES);
    const bad = lawTreeChecks("nzok", "НЗОК", section(s, 1, 1)).filter((c) => c.status === "fail");
    expect(bad.map((c) => c.id)).toEqual(["law:nzok:1.1:1."]);
  });

  it("all built checks pass", () => {
    expect(built.checks.filter((c) => c.status !== "pass")).toEqual([]);
  });
});

describe("fund summary (чл. 1–8, хил. €)", () => {
  it("printed totals and balances", () => {
    const f = T("dooFunds");
    const row = (s: string) => f.rows.find((r) => r.label.startsWith(s))!.cells;
    expect(row("Консолидиран").revenue!.value).toBe("16527469.0");
    expect(row("Консолидиран").balance!.value).toBe("0.0");
    expect(row("Пенсии (чл. 2)").expenditure!.value).toBe("13232474.8");
    expect(row("Пенсии (чл. 2)").balance!.value).toBe("-6838070.4");
    expect(row("Безработица").balance!.value).toBe("45190.8");
  });
});

describe("derived shares (fiscal-calculation-auditor: independent recomputation)", () => {
  it("ДОО revenue: 56,5% insurance revenue, 42,5% central budget transfers (items 4 + 5)", () => {
    // чл. 1, ал. 1: 9 342 037,2; 300 385,0 + 6 717 054,2 = 7 017 439,2; total 16 527 469,0
    const f = dooFunding(T("dooRevenue"));
    expect(f.contributions.value.toFixed(1)).toBe("56.5");
    expect(f.central.part).toBe("7017439.2");
    expect(f.central.value.toFixed(2)).toBe("42.46");
    // the remainder are non-tax revenue (168 389,9) and VAT paid (−397,3)
    const rest = new Decimal(100).minus(f.central.value).minus(f.contributions.value);
    expect(rest.toFixed(2)).toBe("1.02");
  });

  it("ДОО expenditure: pensions are 88,8%", () => {
    // чл. 1, ал. 2: 14 669 530,1 / 16 527 469,0
    expect(dooPensionsShare(T("dooExpenditure")).value.toFixed(1)).toBe("88.8");
  });

  it("НЗОК: contributions 60,8%, transfers for state-insured persons 38,3%", () => {
    // чл. 1, ал. 1: 3 458 462,3 and 2 176 803,6 of 5 683 586,8
    const f = nzokFunding(T("nzokRevenue"));
    expect(f.contributions.value.toFixed(1)).toBe("60.8");
    expect(f.stateInsured.value.toFixed(1)).toBe("38.3");
  });

  it("НЗОК: hospital care 44,5%, medicines and devices for home treatment 25,6%", () => {
    // чл. 1, ал. 2: 2 531 632,1 (1.1.3.7.) and 1 454 439,8 (1.1.3.5.) of 5 683 586,8
    const s = nzokPaymentShares(T("nzokExpenditure"));
    expect(s.hospital.value.toFixed(1)).toBe("44.5");
    expect(s.medicines.value.toFixed(1)).toBe("25.6");
    expect(amount(T("nzokExpenditure"), "1.1.3.7.")).toBe("2531632.1");
  });

  it("missing rows throw instead of returning zero", () => {
    expect(() => amount(T("nzokRevenue"), "9.")).toThrow(/not found/);
  });
});
