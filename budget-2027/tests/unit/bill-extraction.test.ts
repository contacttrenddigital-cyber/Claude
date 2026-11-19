/**
 * Extraction tests against the real extracted 2027 bill (НС вх. № 52-602-01-71, 16.11.2026).
 * Expected values are the printed values in the document; locations are in the comments.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DocxExtract, EmfTableExtract, docxRow, emfRow, yearColumns } from "@/lib/ingest/documents";
import {
  extractMeasures,
  extractObservations,
  identityChecks,
  sameAtPrintedPrecision,
  valueOf,
} from "@/lib/ingest/snapshot";

const docx = DocxExtract.parse(JSON.parse(readFileSync("data/extracted/52-602-01-71.tables.json", "utf8")));
const annex3 = EmfTableExtract.parse(JSON.parse(readFileSync("data/extracted/52-602-01-71.annex3.json", "utf8")));
const inputs = { versionId: "bill-2026-11-16", docx, annex3, docxId: "ns-52-602-01-71-docx" };
const { observations, checks } = extractObservations(inputs);

describe("documents", () => {
  it("extract belongs to the hashed DOCX", () => {
    expect(docx.sha256).toBe("183c1863afb530446fa9a2eb34ea253de7ef83e48270b0550b7546787fb2db0f");
  });

  it("reads column statuses from the document, not from assumptions", () => {
    // Табл. II-1: "2025 Отчет | 2026 Очакв. | 2027 Проект | 2028 Прогноза | 2029 Прогноза"
    const { columns } = yearColumns(docx.tables[13]!.rows);
    expect(Object.fromEntries([...columns].map(([y, c]) => [y, c.vintage]))).toEqual({
      "2025": "actual",
      "2026": "expected",
      "2027": "draft",
      "2028": "forecast",
      "2029": "forecast",
    });
  });

  it("Annex 3 capital expenditure 2027 = 6 005,0 млн. € (Приложение № 3, с. 2)", () => {
    const row = emfRow(annex3, { page: 2, label: "Капиталови разходи" });
    expect(row.find((c) => c.period === "2027")!.parsed!.value).toBe("6005.0");
    expect(row.find((c) => c.period === "2026")!.parsed!.value).toBe("9360.6");
  });

  it("keeps empty printed cells as null", () => {
    // Приложение № 3, с. 1: "Превишение на приходите над разходите на БНБ" has no 2027–2029 values
    const row = emfRow(annex3, { page: 1, label: "Превишение на приходите над разходите на БНБ" });
    expect(row.find((c) => c.period === "2027")!.parsed).toBeNull();
  });

  it("selects the % of GDP sub-column in Табл. II-5", () => {
    const pct = docxRow(docx, { table: 17, label: "20. Баланс", offset: 1 });
    expect(pct.find((c) => c.period === "2027")!.parsed).toMatchObject({ value: "-4.2", percent: true });
  });

  it("throws on unknown row labels instead of guessing", () => {
    expect(() => emfRow(annex3, { page: 2, label: "Несъществуващ ред" })).toThrow(/not found/);
  });
});

describe("observations", () => {
  it("headline 2027 values (submitted bill)", () => {
    expect(valueOf(observations, "kfp.revenue", "2027")).toBe("51065.2");
    expect(valueOf(observations, "kfp.expenditure", "2027")).toBe("55972.1");
    expect(valueOf(observations, "kfp.balance", "2027")).toBe("-4907.0");
    expect(valueOf(observations, "kfp.balance.pctGdp", "2027")).toBe("-3.5");
    expect(valueOf(observations, "esa.balance", "2027")).toBe("-5995.9");
    expect(valueOf(observations, "esa.balance.pctGdp", "2027")).toBe("-4.2");
    expect(valueOf(observations, "debt.government", "2027")).toBe("44343.9");
    expect(valueOf(observations, "param.minimumWage", "2027")).toBe("660");
    expect(valueOf(observations, "param.maxInsurableIncome", "2027")).toBe("2400");
    expect(valueOf(observations, "stateBudget.revenue", "2027")).toBe("30942719.3");
  });

  it("marks values printed in two places as cross-checked", () => {
    const o = observations.find((x) => x.metricKey === "kfp.balance" && x.period === "2027")!;
    expect(o.review).toBe("cross_checked");
    expect(o.sources).toHaveLength(2);
  });

  it("flags the real 2025 GDP discrepancy but not rounding differences", () => {
    // Приложение № 3: 116 548,5; Табл. I-2: 116 018 → conflict. 2027: 141 301,8 vs 141 302 → same.
    const gdp = (p: string) => observations.find((x) => x.metricKey === "macro.gdp" && x.period === p)!;
    expect(gdp("2025").review).toBe("conflict");
    expect(gdp("2027").review).toBe("cross_checked");
    expect(checks.find((c) => c.id === "xsrc:macro.gdp:2025")!.status).toBe("warn");
  });

  it("sameAtPrintedPrecision compares at the less precise value", () => {
    expect(sameAtPrintedPrecision("141301.8", "141302")).toBe(true);
    expect(sameAtPrintedPrecision("116548.5", "116018")).toBe(false);
    expect(sameAtPrintedPrecision(null, null)).toBe(true);
    expect(sameAtPrintedPrecision("0", null)).toBe(false);
  });
});

describe("accounting identities", () => {
  const ids = identityChecks(observations);
  it("all identities hold for 2025–2029", () => {
    const failed = ids.filter((c) => c.status !== "pass");
    expect(failed, JSON.stringify(failed, null, 1)).toEqual([]);
    expect(ids.length).toBeGreaterThanOrEqual(35);
  });

  it("detects a broken identity", () => {
    const broken = observations.map((o) =>
      o.metricKey === "kfp.balance" && o.period === "2027" ? { ...o, value: "-4000.0" } : o,
    );
    expect(identityChecks(broken).find((c) => c.id === "id:balance:2027")!.status).toBe("fail");
  });
});

describe("measures", () => {
  const { measures, checks: mc } = extractMeasures(inputs, { revenueTable: 19, expenditureTable: 20 });
  it("extracts all discretionary measures with full titles", () => {
    expect(measures.filter((m) => m.direction === "revenue")).toHaveLength(26);
    expect(measures.filter((m) => m.direction === "expenditure")).toHaveLength(10);
    const windfall = measures.find((m) => m.title.startsWith("Въвеждане в ЗКПО на еднократен данък от 33%"))!;
    expect(windfall.effects).toEqual({ "2027": "800.0", "2028": "-800.0", "2029": null });
  });
  it("measure sums reconcile with the printed totals", () => {
    expect(mc.every((c) => c.status === "pass")).toBe(true);
  });
});
