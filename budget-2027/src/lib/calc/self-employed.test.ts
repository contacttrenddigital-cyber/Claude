import { describe, expect, it } from "vitest";
import { selfEmployedYear } from "./self-employed";

// НАП, Приложение № 1 (изх. ВК-30-10237 от 12.08.2026), ред 10.1.2: ДОО 14,8 + УПФ 5 + здравно 8 = 27,8 %;
// ред 10.2.2 (с общо заболяване и майчинство): 18,3 + 5 + 8 = 31,3 % (по СИГМА rates.json).
// Законопроект за бюджета на ДОО 2027, чл. 9, т. 2 и 3: минимален доход за самоосигуряващите се 660 €, максимален 2 400 €.
describe("самоосигуряващ се", () => {
  it("2027, доход 1 000 €: 148,00 + 50,00 + 80,00 = 278,00 € на месец, 3 336,00 € за годината", () => {
    const r = selfEmployedYear("1000", false, 2027);
    expect(r.periods[0]!.lines.map((l) => l.amount)).toEqual(["148.00", "50.00", "80.00"]);
    expect(r.periods[0]!.total).toBe("278.00");
    expect(r.annual).toBe("3336.00");
  });

  it("с общо заболяване и майчинство: 31,3 % от 1 000 € = 313,00 €", () => {
    expect(selfEmployedYear("1000", true, 2027).periods[0]!.total).toBe("313.00");
  });

  it("под минимума се осигурява върху 660 €, над максимума — върху 2 400 € (2027)", () => {
    const lo = selfEmployedYear("300", false, 2027).periods[0]!;
    expect([lo.base, lo.adjusted, lo.total]).toEqual(["660.00", "min", "183.48"]); // 660 × 27,8 % = 183,48
    const hi = selfEmployedYear("5000", false, 2027).periods[0]!;
    expect([hi.base, hi.adjusted, hi.total]).toEqual(["2400.00", "max", "667.20"]); // 2 400 × 27,8 % = 667,20
  });

  it("2026: два периода с различни прагове (550,66 / 620,20 € минимум)", () => {
    const r = selfEmployedYear("600", false, 2026);
    expect(r.periods.map((p) => [p.base, p.adjusted])).toEqual([["600.00", null], ["620.20", "min"]]);
  });
});

import { calculateYear } from "./payroll";
import { RULES_2027 } from "./rules";

// Законопроект за бюджета на ДОО 2027, Приложение № 1, ред 1 („Растениевъдство…“), „Ръководители“: 996,00 €.
// Брутна заплата 700 € < 996 € → осигуровки върху 996 €: 65,54 + 21,91 + 13,94 + 3,98 + 31,87 = 137,24 € (работник);
// данък = 10 % × (700 − 137,24) = 56,28 €; нето = 700 − 137,24 − 56,28 = 506,48 €.
describe("минимален осигурителен доход по дейност", () => {
  const base = { grossMonthly: "700", bornBefore1960: false, tzpbPct: "0.4", children: 0 as const, disabledChild: false, childDevelopmentExpenses: "0", monthlyAdvanceRelief: false };
  it("осигуровките са върху МОД, данъкът — върху брутната заплата минус тях", () => {
    const p = calculateYear({ ...base, minInsurable: { "2027-01-01": "996.00" } }, RULES_2027).periods[0]!;
    expect([p.insurableBase, p.raisedToMin, p.employeeContributions, p.tax, p.net]).toEqual(["996.00", true, "137.24", "56.28", "506.48"]);
  });
  it("без избрана дейност осигуровките са върху брутната заплата", () => {
    const p = calculateYear(base, RULES_2027).periods[0]!;
    expect([p.insurableBase, p.raisedToMin]).toEqual(["700.00", false]);
  });
});
