/** Scenario lab arithmetic against the 2027 bill figures (Приложение № 3, Табл. VI-1). */
import { describe, expect, it } from "vitest";
import { runScenario, ScenarioError, type Baseline } from "@/lib/scenario/model";

const b: Baseline = {
  revenue: "51065.2",
  expenditure: "55972.1",
  balance: "-4907.0",
  gdp: "141301.8",
  debt: "44343.9",
  lines: { vat: "13485.8", excise: "4102.9", pit: "5015.2", cit: "4563.0", social: "12883.2", capital: "6005.0", personnel: "13817.7", socialPayments: "23511.7" },
};

describe("runScenario", () => {
  it("no change reproduces the baseline (−3,47 % of GDP; debt 31,38 %)", () => {
    const r = runScenario(b, { pct: {}, gdpPct: "0" });
    expect(r.balance).toBe("-4907.0");
    expect(r.balancePctGdp).toBe("-3.47");
    expect(r.debtPctGdp).toBe("31.38");
  });
  it("VAT +10 % improves the balance by exactly 1 348,58 (shown 1 348,6)", () => {
    const r = runScenario(b, { pct: { vat: "10" }, gdpPct: "0" });
    expect(r.lineDeltas.find((l) => l.key === "vat")!.delta).toBe("1348.6");
    expect(r.balanceDelta).toBe("1348.6");
  });
  it("capital −20 % improves the balance and lowers debt by the same amount", () => {
    const r = runScenario(b, { pct: { capital: "-20" }, gdpPct: "0" });
    expect(r.balanceDelta).toBe("1201.0");
    expect(r.debt).toBe("43142.9");
  });
  it("GDP change moves only the ratios", () => {
    const r = runScenario(b, { pct: {}, gdpPct: "-5" });
    expect(r.balance).toBe("-4907.0");
    expect(r.balancePctGdp).toBe("-3.66");
  });
  it("rejects changes beyond ±50 %", () => {
    expect(() => runScenario(b, { pct: { vat: "80" }, gdpPct: "0" })).toThrow(ScenarioError);
  });
  it("rejects an inconsistent baseline", () => {
    expect(() => runScenario({ ...b, balance: "-1000" }, { pct: {}, gdpPct: "0" })).toThrow(/съгласувана/);
  });
});
