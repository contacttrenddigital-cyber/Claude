/**
 * Labour-contract payroll calculator (НАП категория 1, III категория труд) for 2026 vs 2027.
 *
 * Model (documented in docs/FISCAL_METHODOLOGY.md § Калкулатор):
 *   insurable base = min(gross, max insurable income of the period)
 *   each contribution = round2(base × rate)            (employer and employee separately)
 *   monthly tax base  = gross − employee contributions − monthly advance child relief (2027 only)
 *   monthly tax       = round2(max(0, tax base) × 10 %)
 *   annual tax        = round2(max(0, Σ(gross − employee contr.) − child reliefs) × 10 %)
 * Not modelled (flagged in the result): minimum insurable income by activity/profession,
 * other employment categories, other incomes, other tax reliefs, sick leave.
 * Pure function, decimal arithmetic only; runs in the browser — inputs never leave the device.
 */
import Decimal from "decimal.js";
import type { ContributionRates, YearRules } from "./rules";

export interface PayrollInput {
  grossMonthly: string;
  bornBefore1960: boolean;
  tzpbPct: string;
  children: 0 | 1 | 2 | 3;
  disabledChild: boolean;
  /** annual actual expenses for child health/education/sport (2027 child-development relief) */
  childDevelopmentExpenses: string;
  /** take the child relief monthly through the employer (2027 proposal) instead of annually */
  monthlyAdvanceRelief: boolean;
}

export interface ContributionLine {
  key: keyof ContributionRates | "tzpb";
  label: string;
  employerPct: string;
  employeePct: string;
  employer: string;
  employee: string;
}

export interface PeriodResult {
  from: string;
  to: string;
  months: number;
  gross: string;
  insurableBase: string;
  capped: boolean;
  lines: ContributionLine[];
  employeeContributions: string;
  employerContributions: string;
  monthlyAdvanceRelief: string;
  taxBase: string;
  tax: string;
  net: string;
  employerCost: string;
}

export interface YearResult {
  year: number;
  legalStatus: YearRules["legalStatus"];
  periods: PeriodResult[];
  annual: {
    gross: string;
    employeeContributions: string;
    employerContributions: string;
    childRelief: string;
    childDevelopmentRelief: string;
    taxBase: string;
    tax: string;
    net: string;
    employerCost: string;
    /** annual tax − Σ monthly withheld tax (negative = refund through the annual return) */
    taxSettlement: string;
  };
  warnings: string[];
}

const LABELS: Record<ContributionLine["key"], string> = {
  pensions: "Фонд „Пенсии“ (ДОО)",
  upf: "Универсален пенсионен фонд",
  sickness: "Общо заболяване и майчинство",
  unemployment: "Безработица",
  health: "Здравно осигуряване",
  tzpb: "Трудова злополука и професионална болест",
};

const D = (v: string | number | Decimal) => new Decimal(v);
const r2 = (d: Decimal) => d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

export class PayrollInputError extends Error {
  override name = "PayrollInputError";
}

export function validateInput(i: PayrollInput, rules: YearRules) {
  const g = D(i.grossMonthly);
  if (!g.isFinite() || g.isNegative()) throw new PayrollInputError("Брутната заплата трябва да е неотрицателно число");
  if (g.gt(1_000_000)) throw new PayrollInputError("Стойността е извън допустимия диапазон");
  const t = D(i.tzpbPct);
  if (t.lt(rules.tzpbRange.min) || t.gt(rules.tzpbRange.max)) {
    throw new PayrollInputError(`Вноската за ТЗПБ трябва да е между ${rules.tzpbRange.min} и ${rules.tzpbRange.max} %`);
  }
  if (D(i.childDevelopmentExpenses).isNegative()) throw new PayrollInputError("Разходите не могат да са отрицателни");
  if (i.disabledChild && i.children === 0) throw new PayrollInputError("Посочено е дете с увреждане, но броят на децата е 0");
}

function pick<T>(children: number, v: { one: T; two: T; threePlus: T }): T | null {
  return children === 0 ? null : children === 1 ? v.one : children === 2 ? v.two : v.threePlus;
}

export function calculateYear(input: PayrollInput, rules: YearRules): YearResult {
  validateInput(input, rules);
  const gross = D(input.grossMonthly);
  const rates = input.bornBefore1960 ? rules.ratesBefore1960 : rules.ratesAfter1959;
  const warnings: string[] = [];
  const advance =
    input.monthlyAdvanceRelief && rules.monthlyAdvanceRelief && input.children > 0
      ? // both reliefs (чл. 22в and чл. 22г) can be advanced; annual amounts / 12 ≈ these monthly figures
        D(pick(input.children, rules.monthlyAdvanceRelief)!).plus(input.disabledChild ? rules.monthlyAdvanceRelief.disabled : 0)
      : D(0);
  if (input.monthlyAdvanceRelief && !rules.monthlyAdvanceRelief) {
    warnings.push(`За ${rules.year} г. месечното ползване на облекчението за деца чрез работодателя не е предвидено; облекчението е годишно.`);
  }

  const periods: PeriodResult[] = rules.periods.map((p) => {
    const max = D(p.maxInsurable.value);
    const base = Decimal.min(gross, max);
    if (gross.lt(p.minWage.value) && gross.gt(0)) {
      warnings.push(
        `Брутната заплата е под минималната работна заплата (${p.minWage.value} € от ${p.from}). При пълно работно време това не е допустимо; осигуровките се дължат поне върху минималния осигурителен доход.`,
      );
    }
    const lines: ContributionLine[] = (Object.keys(rates) as (keyof ContributionRates)[])
      .filter((k) => !(D(rates[k].employer).isZero() && D(rates[k].employee).isZero()))
      .map((k) => ({
        key: k,
        label: LABELS[k],
        employerPct: rates[k].employer,
        employeePct: rates[k].employee,
        employer: r2(base.times(rates[k].employer).dividedBy(100)).toFixed(2),
        employee: r2(base.times(rates[k].employee).dividedBy(100)).toFixed(2),
      }));
    lines.push({
      key: "tzpb",
      label: LABELS.tzpb,
      employerPct: D(input.tzpbPct).toString(),
      employeePct: "0",
      employer: r2(base.times(input.tzpbPct).dividedBy(100)).toFixed(2),
      employee: "0.00",
    });
    const emp = lines.reduce((a, l) => a.plus(l.employee), D(0));
    const er = lines.reduce((a, l) => a.plus(l.employer), D(0));
    const taxBase = Decimal.max(0, gross.minus(emp).minus(advance));
    const tax = r2(taxBase.times(rules.pitRate.value).dividedBy(100));
    return {
      from: p.from,
      to: p.to,
      months: p.months,
      gross: gross.toFixed(2),
      insurableBase: base.toFixed(2),
      capped: gross.gt(max),
      lines,
      employeeContributions: emp.toFixed(2),
      employerContributions: er.toFixed(2),
      monthlyAdvanceRelief: advance.toFixed(2),
      taxBase: taxBase.toFixed(2),
      tax: tax.toFixed(2),
      net: gross.minus(emp).minus(tax).toFixed(2),
      employerCost: gross.plus(er).toFixed(2),
    };
  });

  const sum = (f: (p: PeriodResult) => string) => periods.reduce((a, p) => a.plus(D(f(p)).times(p.months)), D(0));
  const annualGross = sum((p) => p.gross);
  const annualEmp = sum((p) => p.employeeContributions);
  const annualEr = sum((p) => p.employerContributions);
  const withheld = sum((p) => p.tax);

  const childRelief =
    input.children === 0
      ? D(0)
      : D(pick(input.children, rules.childRelief)!.value).plus(input.disabledChild ? rules.disabledChildRelief.value : 0);
  const devCap = rules.childDevelopmentCap && input.children > 0 ? D(pick(input.children, rules.childDevelopmentCap)!) : D(0);
  const devRelief = Decimal.min(D(input.childDevelopmentExpenses), devCap);
  if (!rules.childDevelopmentCap && D(input.childDevelopmentExpenses).gt(0)) {
    warnings.push(`Облекчението за детско развитие не съществува за ${rules.year} г.; разходите не се приспадат.`);
  }
  const annualTaxBase = Decimal.max(0, annualGross.minus(annualEmp).minus(childRelief).minus(devRelief));
  const annualTax = r2(annualTaxBase.times(rules.pitRate.value).dividedBy(100));
  if (rules.legalStatus === "proposed") {
    warnings.push("Правилата за 2027 г. са предложени в законопроектите и могат да се променят при приемането им.");
  }

  return {
    year: rules.year,
    legalStatus: rules.legalStatus,
    periods,
    annual: {
      gross: annualGross.toFixed(2),
      employeeContributions: annualEmp.toFixed(2),
      employerContributions: annualEr.toFixed(2),
      childRelief: childRelief.toFixed(2),
      childDevelopmentRelief: devRelief.toFixed(2),
      taxBase: annualTaxBase.toFixed(2),
      tax: annualTax.toFixed(2),
      net: annualGross.minus(annualEmp).minus(annualTax).toFixed(2),
      employerCost: annualGross.plus(annualEr).toFixed(2),
      taxSettlement: annualTax.minus(withheld).toFixed(2),
    },
    warnings: [...new Set(warnings)],
  };
}

export interface Comparison {
  y2026: YearResult;
  y2027: YearResult;
  /** 2027 − 2026, annual */
  delta: { net: string; tax: string; employeeContributions: string; employerCost: string };
  /** monthly: last period of 2026 (from 01.08) vs 2027 */
  monthlyDelta: { net: string; employerCost: string };
}

export function compareYears(input: PayrollInput, r2026: YearRules, r2027: YearRules): Comparison {
  const a = calculateYear(input, r2026);
  const b = calculateYear(input, r2027);
  const d = (x: string, y: string) => D(y).minus(x).toFixed(2);
  const lastA = a.periods.at(-1)!;
  const b0 = b.periods[0]!;
  return {
    y2026: a,
    y2027: b,
    delta: {
      net: d(a.annual.net, b.annual.net),
      tax: d(a.annual.tax, b.annual.tax),
      employeeContributions: d(a.annual.employeeContributions, b.annual.employeeContributions),
      employerCost: d(a.annual.employerCost, b.annual.employerCost),
    },
    monthlyDelta: { net: d(lastA.net, b0.net), employerCost: d(lastA.employerCost, b0.employerCost) },
  };
}
