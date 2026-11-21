/**
 * Contributions of a self-insured person (НАП, Приложение № 1, категория 10: еднолични търговци,
 * собственици и съдружници, свободни професии, занаятчии, регистрирани земеделски стопани), born after
 * 31.12.1959, insured in a universal pension fund. The person pays everything on a monthly insurable income
 * of their choice between the minimum for the self-insured and the maximum insurable income.
 *
 * Rates (НАП, Приложение № 1, ред 10.1.2 и 10.2.2, by SIGMA rates.json; unchanged in 2027 per
 * Приложение № 2 към АСБП 2027–2029, ред 11–13): ДОО 14,8 % (18,3 % with „Общо заболяване и
 * майчинство“), УПФ 5 %, здравно 8 %. Thresholds: 2026 — ЗБДОО 2026 (by periods); 2027 — законопроект
 * за бюджета на ДОО, чл. 9, т. 2 и 3: 660 € and 2 400 €.
 * Income tax is NOT calculated: the tax base of the self-insured (recognised expenses, annual return) is
 * not in the project's sources.
 */
import Decimal from "decimal.js";

export interface SelfPeriod {
  from: string;
  to: string;
  months: number;
  min: string;
  max: string;
}

export const SELF_PERIODS: Record<2026 | 2027, SelfPeriod[]> = {
  2026: [
    { from: "2026-01-01", to: "2026-07-31", months: 7, min: "550.66", max: "2111.64" },
    { from: "2026-08-01", to: "2026-12-31", months: 5, min: "620.20", max: "2300" },
  ],
  2027: [{ from: "2027-01-01", to: "2027-12-31", months: 12, min: "660", max: "2400" }],
};

export const SELF_RATES = {
  doo: "14.8",
  dooWithSickness: "18.3",
  upf: "5",
  health: "8",
} as const;

export interface SelfLine {
  label: string;
  pct: string;
  amount: string;
}
export interface SelfPeriodResult extends SelfPeriod {
  base: string;
  /** the chosen income was outside the limits and was moved to the nearest one */
  adjusted: "min" | "max" | null;
  lines: SelfLine[];
  total: string;
}

const r2 = (d: Decimal) => d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

export function selfEmployedYear(income: string, sickness: boolean, year: 2026 | 2027) {
  const x = new Decimal(income);
  if (!x.isFinite() || x.isNegative()) throw new Error("Осигурителният доход трябва да е неотрицателно число");
  const periods: SelfPeriodResult[] = SELF_PERIODS[year].map((p) => {
    const adjusted = x.lt(p.min) ? ("min" as const) : x.gt(p.max) ? ("max" as const) : null;
    const base = adjusted === "min" ? new Decimal(p.min) : adjusted === "max" ? new Decimal(p.max) : x;
    const line = (label: string, pct: string) => ({ label, pct, amount: r2(base.times(pct).dividedBy(100)).toFixed(2) });
    const lines = [
      line(sickness ? "ДОО: пенсии и общо заболяване и майчинство" : "ДОО: фонд „Пенсии“", sickness ? SELF_RATES.dooWithSickness : SELF_RATES.doo),
      line("Универсален пенсионен фонд", SELF_RATES.upf),
      line("Здравно осигуряване", SELF_RATES.health),
    ];
    const total = lines.reduce((s, l) => s.plus(l.amount), new Decimal(0));
    return { ...p, base: base.toFixed(2), adjusted, lines, total: total.toFixed(2) };
  });
  const annual = periods.reduce((s, p) => s.plus(new Decimal(p.total).times(p.months)), new Decimal(0));
  return { year, periods, annual: annual.toFixed(2) };
}
