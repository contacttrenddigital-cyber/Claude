/**
 * Scenario lab: pure accounting arithmetic on the 2027 KFP. No behavioural or macro effects,
 * no multipliers — a change in a line moves the balance by exactly that amount.
 * Debt effect assumes the whole change in the balance is financed by (or repays) debt.
 */
import Decimal from "decimal.js";

export interface Baseline {
  revenue: string;
  expenditure: string;
  balance: string;
  gdp: string;
  debt: string;
  lines: Record<LineKey, string>;
}

export type LineKey = "vat" | "excise" | "pit" | "cit" | "social" | "capital" | "personnel" | "socialPayments";

export const LINES: { key: LineKey; label: string; side: "revenue" | "expenditure"; metric: string }[] = [
  { key: "vat", label: "ДДС", side: "revenue", metric: "kfp.revenue.vat" },
  { key: "excise", label: "Акцизи", side: "revenue", metric: "kfp.revenue.excise" },
  { key: "pit", label: "Данъци върху доходите на физическите лица", side: "revenue", metric: "kfp.revenue.pit" },
  { key: "cit", label: "Корпоративни данъци", side: "revenue", metric: "kfp.revenue.cit" },
  { key: "social", label: "Осигурителни вноски", side: "revenue", metric: "kfp.revenue.social" },
  { key: "capital", label: "Капиталови разходи", side: "expenditure", metric: "kfp.expenditure.capital" },
  { key: "personnel", label: "Разходи за персонал", side: "expenditure", metric: "kfp.expenditure.personnel" },
  { key: "socialPayments", label: "Социални и здравноосигурителни плащания", side: "expenditure", metric: "kfp.expenditure.social" },
];

export interface ScenarioInput {
  /** percent change per line, e.g. "-10" */
  pct: Partial<Record<LineKey, string>>;
  /** percent change of nominal GDP (affects only the ratios) */
  gdpPct: string;
}

export interface ScenarioResult {
  lineDeltas: { key: LineKey; label: string; side: "revenue" | "expenditure"; base: string; delta: string }[];
  revenue: string;
  expenditure: string;
  balance: string;
  balancePctGdp: string;
  baseBalancePctGdp: string;
  gdp: string;
  debt: string;
  debtPctGdp: string;
  baseDebtPctGdp: string;
  balanceDelta: string;
}

export class ScenarioError extends Error {
  override name = "ScenarioError";
}

const LIMIT = new Decimal(50);

export function runScenario(b: Baseline, input: ScenarioInput): ScenarioResult {
  const pct = (s: string | undefined) => {
    const d = new Decimal(s ?? "0");
    if (!d.isFinite() || d.abs().gt(LIMIT)) throw new ScenarioError("Промяната трябва да е между −50% и +50%");
    return d;
  };
  const gdpPct = pct(input.gdpPct);
  let dRev = new Decimal(0);
  let dExp = new Decimal(0);
  const lineDeltas = LINES.map((l) => {
    const base = new Decimal(b.lines[l.key]);
    const delta = base.times(pct(input.pct[l.key])).dividedBy(100);
    if (l.side === "revenue") dRev = dRev.plus(delta);
    else dExp = dExp.plus(delta);
    return { key: l.key, label: l.label, side: l.side, base: base.toString(), delta: delta.toDecimalPlaces(1).toString() };
  });
  const revenue = new Decimal(b.revenue).plus(dRev);
  const expenditure = new Decimal(b.expenditure).plus(dExp);
  // start from the printed balance (the printed table rounds; revenue − expenditure may differ by 0.1)
  const effect = dRev.minus(dExp);
  const balance = new Decimal(b.balance).plus(effect);
  // identity check: the baseline must satisfy revenue − expenditure = balance
  if (new Decimal(b.revenue).minus(b.expenditure).minus(b.balance).abs().gt("0.2")) throw new ScenarioError("Базата не е съгласувана");
  const gdp = new Decimal(b.gdp).times(gdpPct.plus(100)).dividedBy(100);
  const balanceDelta = effect;
  const debt = new Decimal(b.debt).minus(balanceDelta); // more deficit → more debt
  const r = (d: Decimal, dp = 1) => d.toDecimalPlaces(dp).toFixed(dp);
  return {
    lineDeltas,
    revenue: r(revenue),
    expenditure: r(expenditure),
    balance: r(balance),
    balancePctGdp: r(balance.dividedBy(gdp).times(100), 2),
    baseBalancePctGdp: r(new Decimal(b.balance).dividedBy(b.gdp).times(100), 2),
    gdp: r(gdp),
    debt: r(debt),
    debtPctGdp: r(debt.dividedBy(gdp).times(100), 2),
    baseDebtPctGdp: r(new Decimal(b.debt).dividedBy(b.gdp).times(100), 2),
    balanceDelta: r(balanceDelta),
  };
}
