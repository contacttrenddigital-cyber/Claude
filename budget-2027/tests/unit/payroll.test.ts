/**
 * Payroll calculator. Expected values computed by hand from the cited rules (rules.ts):
 * employee 6.58 + 2.2 + 1.4 + 0.4 + 3.2 = 13.78 %; employer 8.22 + 2.8 + 2.1 + 0.6 + 4.8 = 18.52 % + ТЗПБ.
 */
import { describe, expect, it } from "vitest";
import { PayrollInputError, calculateYear, compareYears, type PayrollInput } from "@/lib/calc/payroll";
import { RULES_2026, RULES_2027 } from "@/lib/calc/rules";

const base: PayrollInput = {
  grossMonthly: "1500",
  bornBefore1960: false,
  tzpbPct: "0.4",
  children: 0,
  disabledChild: false,
  childDevelopmentExpenses: "0",
  monthlyAdvanceRelief: false,
};

describe("one month, gross 1 500 €, 2027", () => {
  const r = calculateYear(base, RULES_2027).periods[0]!;
  it("employee contributions 13.78 % = 206,70 €", () => {
    // 1500×6.58%=98.70; ×2.2%=33.00; ×1.4%=21.00; ×0.4%=6.00; ×3.2%=48.00 → 206.70
    expect(r.employeeContributions).toBe("206.70");
  });
  it("tax 10 % of (1500 − 206,70) = 129,33 €; net 1 163,97 €", () => {
    expect(r.taxBase).toBe("1293.30");
    expect(r.tax).toBe("129.33");
    expect(r.net).toBe("1163.97");
  });
  it("employer 18.52 % + 0.4 % ТЗПБ = 283,80 €; cost 1 783,80 €", () => {
    expect(r.employerContributions).toBe("283.80");
    expect(r.employerCost).toBe("1783.80");
  });
  it("born before 1960: same totals, no UPF line", () => {
    const o = calculateYear({ ...base, bornBefore1960: true }, RULES_2027).periods[0]!;
    expect(o.employeeContributions).toBe("206.70");
    expect(o.employerContributions).toBe("283.80");
    expect(o.lines.find((l) => l.key === "upf")).toBeUndefined();
  });
});

describe("maximum insurable income", () => {
  it("2027: contributions capped at 2 400 €", () => {
    const r = calculateYear({ ...base, grossMonthly: "5000" }, RULES_2027).periods[0]!;
    expect(r.insurableBase).toBe("2400.00");
    expect(r.capped).toBe(true);
    // 2400 × 13.78 % = 330.72
    expect(r.employeeContributions).toBe("330.72");
  });
  it("2026: two periods, 2 111,64 € (Jan–Jul) and 2 300 € (Aug–Dec)", () => {
    const r = calculateYear({ ...base, grossMonthly: "5000" }, RULES_2026);
    expect(r.periods.map((p) => p.insurableBase)).toEqual(["2111.64", "2300.00"]);
    expect(r.periods.map((p) => p.months)).toEqual([7, 5]);
  });
  it("high earner pays more in 2027 because the cap rises (2 300 → 2 400): +13,78 €/month employee", () => {
    const c = compareYears({ ...base, grossMonthly: "5000" }, RULES_2026, RULES_2027);
    // employee: 100 × 13.78 % = 13.78 more contributions; tax falls by 1.378 → net −12.40
    const a = c.y2026.periods.at(-1)!;
    const b = c.y2027.periods[0]!;
    expect(Number(b.employeeContributions) - Number(a.employeeContributions)).toBeCloseTo(13.78, 2);
    expect(c.monthlyDelta.net).toBe("-12.40");
  });
  it("below the cap the month is identical in 2026 (from 01.08) and 2027", () => {
    const c = compareYears(base, RULES_2026, RULES_2027);
    expect(c.monthlyDelta).toEqual({ net: "0.00", employerCost: "0.00" });
  });
});

describe("child reliefs", () => {
  it("annual relief one child: 3 067,75 € (2026) → 5 000 € (2027)", () => {
    const i = { ...base, children: 1 as const };
    expect(calculateYear(i, RULES_2026).annual.childRelief).toBe("3067.75");
    expect(calculateYear(i, RULES_2027).annual.childRelief).toBe("5000.00");
  });
  it("2027: annual tax falls by 10 % of the larger relief", () => {
    const c = compareYears({ ...base, children: 1 }, RULES_2026, RULES_2027);
    // (5000 − 3067.75) × 10 % = 193.225 → tax difference −193.22 or −193.23 by rounding of totals
    expect(Math.abs(Number(c.delta.tax) + 193.23)).toBeLessThanOrEqual(0.01);
  });
  it("disabled child adds 12 000 € (2027) / 6 135,50 € (2026)", () => {
    const i = { ...base, children: 1 as const, disabledChild: true };
    expect(calculateYear(i, RULES_2027).annual.childRelief).toBe("17000.00");
    expect(calculateYear(i, RULES_2026).annual.childRelief).toBe("9203.25");
  });
  it("monthly advance relief (2027) lowers monthly tax; the annual return settles the rest", () => {
    const y = calculateYear({ ...base, children: 1, monthlyAdvanceRelief: true }, RULES_2027);
    expect(y.periods[0]!.monthlyAdvanceRelief).toBe("416.66");
    // annual relief 5000 vs 12 × 416.66 = 4999.92 → tiny extra tax due at the annual return
    expect(Number(y.annual.taxSettlement)).toBeCloseTo(-0.0, 0);
  });
  it("advance relief is not available in 2026 and produces a warning", () => {
    const y = calculateYear({ ...base, children: 1, monthlyAdvanceRelief: true }, RULES_2026);
    expect(y.periods[0]!.monthlyAdvanceRelief).toBe("0.00");
    expect(y.warnings.join(" ")).toMatch(/не е предвидено/);
  });
  it("child development relief: actual expenses up to the cap (2027 only)", () => {
    expect(calculateYear({ ...base, children: 2, childDevelopmentExpenses: "5000" }, RULES_2027).annual.childDevelopmentRelief).toBe("4000.00");
    expect(calculateYear({ ...base, children: 2, childDevelopmentExpenses: "1500" }, RULES_2027).annual.childDevelopmentRelief).toBe("1500.00");
    expect(calculateYear({ ...base, children: 2, childDevelopmentExpenses: "1500" }, RULES_2026).annual.childDevelopmentRelief).toBe("0.00");
  });
  it("tax base never goes negative", () => {
    const y = calculateYear({ ...base, grossMonthly: "700", children: 3, disabledChild: true }, RULES_2027);
    expect(y.annual.tax).toBe("0.00");
  });
});

describe("validation and warnings", () => {
  it("rejects negative salary, out-of-range ТЗПБ and inconsistent children", () => {
    expect(() => calculateYear({ ...base, grossMonthly: "-1" }, RULES_2027)).toThrow(PayrollInputError);
    expect(() => calculateYear({ ...base, tzpbPct: "2" }, RULES_2027)).toThrow(/ТЗПБ/);
    expect(() => calculateYear({ ...base, disabledChild: true }, RULES_2027)).toThrow(/увреждане/);
    expect(() => calculateYear({ ...base, childDevelopmentExpenses: "-5" }, RULES_2027)).toThrow(PayrollInputError);
    expect(() => calculateYear({ ...base, grossMonthly: "2000000" }, RULES_2027)).toThrow(PayrollInputError);
  });
  it("warns below the minimum wage and for proposed rules", () => {
    const y = calculateYear({ ...base, grossMonthly: "600" }, RULES_2027);
    expect(y.warnings.join(" ")).toMatch(/под минималната работна заплата \(660 €/);
    expect(y.warnings.join(" ")).toMatch(/предложени в законопроектите/);
  });
  it("contribution lines reconcile to totals", () => {
    const p = calculateYear({ ...base, grossMonthly: "2345.67", tzpbPct: "1.1" }, RULES_2027).periods[0]!;
    const sum = (k: "employer" | "employee") => p.lines.reduce((a, l) => a + Math.round(Number(l[k]) * 100), 0) / 100;
    expect(sum("employee").toFixed(2)).toBe(p.employeeContributions);
    expect(sum("employer").toFixed(2)).toBe(p.employerContributions);
  });
});
