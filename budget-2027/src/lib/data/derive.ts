/**
 * Derived numbers shown on the dashboard. Every function is pure, decimal-only and unit-tested
 * (tests/unit/derive.test.ts) — see skill fiscal-calculation-auditor.
 */
import { Decimal, percentChange, toDecimal } from "@/lib/fiscal/money";
import type { PointView, SeriesView } from "./types";

export function point(series: SeriesView, period: string): PointView | undefined {
  return series.points.find((p) => p.period === period);
}

export interface Change {
  /** change in the metric's own unit (e.g. млн. € or percentage points) */
  absolute: string;
  /** relative change in % — only for level metrics; null for shares/rates (use pp) or zero base */
  relative: string | null;
  kind: "percent" | "pp";
}

/** Change from `base` to `current` period of the same series (same scope, unit and document). */
export function change(series: SeriesView, current: string, base: string): Change | null {
  const c = point(series, current)?.value;
  const b = point(series, base)?.value;
  if (c == null || b == null) return null;
  const absolute = toDecimal(c).minus(toDecimal(b));
  if (series.metric.changeIn === "pp") {
    return { absolute: absolute.toString(), relative: null, kind: "pp" };
  }
  const rel = percentChange(b, c);
  return { absolute: absolute.toString(), relative: rel ? rel.toDecimalPlaces(1).toString() : null, kind: "percent" };
}

export interface WaterfallStep {
  key: string;
  label: string;
  /** signed contribution (revenue +, expenditure −) */
  value: string;
  start: string;
  end: string;
  kind: "inflow" | "outflow" | "total";
  formula?: string;
}

/**
 * Revenue → expenditure → balance waterfall for one year of the KFP.
 * Segments: revenue components (+), expenditure components (−), ending at the printed balance.
 * "Текущи нелихвени" = текущи разходи − лихви (current expenditure in Annex 3 includes interest).
 * Throws if the arithmetic does not land on the printed balance within `tolerance`.
 */
export function kfpWaterfall(
  s: Record<string, SeriesView>,
  period: string,
  tolerance = "0.3",
): WaterfallStep[] {
  const v = (key: string) => {
    const x = s[key] ? point(s[key]!, period)?.value : undefined;
    if (x == null) throw new Error(`waterfall: missing ${key} ${period}`);
    return toDecimal(x);
  };
  const inflows: [string, string, Decimal][] = [
    ["kfp.revenue.taxSocial", "Данъци и осигуровки", v("kfp.revenue.taxSocial")],
    ["kfp.revenue.nonTax", "Неданъчни приходи", v("kfp.revenue.nonTax")],
    ["kfp.revenue.grants", "Помощи и дарения (вкл. ЕС)", v("kfp.revenue.grants")],
  ];
  const currentNonInterest = v("kfp.expenditure.current").minus(v("kfp.expenditure.interest"));
  const other = v("kfp.expenditure.abroad").plus(v("kfp.expenditure.stateReserve")).plus(v("kfp.expenditure.contingency"));
  const outflows: [string, string, Decimal, string?][] = [
    ["current", "Текущи разходи без лихви", currentNonInterest, "текущи разходи − лихви"],
    ["kfp.expenditure.interest", "Лихви", v("kfp.expenditure.interest")],
    ["kfp.expenditure.capital", "Капиталови разходи", v("kfp.expenditure.capital")],
    ["other", "Резерви и трансфери за чужбина", other, "трансфери за чужбина + държавен резерв + резерв за непредвидени"],
    ["kfp.expenditure.euContribution", "Вноска в бюджета на ЕС", v("kfp.expenditure.euContribution")],
  ];
  const steps: WaterfallStep[] = [];
  let level = new Decimal(0);
  for (const [key, label, val] of inflows) {
    steps.push({ key, label, value: val.toString(), start: level.toString(), end: level.plus(val).toString(), kind: "inflow" });
    level = level.plus(val);
  }
  steps.push({ key: "kfp.revenue", label: "Приходи общо", value: level.toString(), start: "0", end: level.toString(), kind: "total" });
  for (const [key, label, val, formula] of outflows) {
    steps.push({ key, label, value: val.negated().toString(), start: level.toString(), end: level.minus(val).toString(), kind: "outflow", formula });
    level = level.minus(val);
  }
  const printed = v("kfp.balance");
  if (level.minus(printed).abs().gt(tolerance)) {
    throw new Error(`waterfall: computed balance ${level} ≠ printed ${printed}`);
  }
  steps.push({ key: "kfp.balance", label: "Салдо (дефицит)", value: printed.toString(), start: "0", end: printed.toString(), kind: "total" });
  return steps;
}

export type MeasureGroup = "pays-more" | "relief-or-more-spending" | "cuts";

/**
 * Classification of a discretionary measure by the sign of its 2027 budget effect (MoF estimate):
 * revenue > 0 → someone pays more; revenue < 0 or expenditure > 0 → relief / more spending;
 * expenditure < 0 → spending cut. This is arithmetic on the official estimate, not a judgement.
 */
export function measureGroup(direction: "revenue" | "expenditure", effect: string | null): MeasureGroup | null {
  if (effect === null) return null;
  const e = toDecimal(effect);
  if (e.isZero()) return null;
  if (direction === "revenue") return e.gt(0) ? "pays-more" : "relief-or-more-spending";
  return e.gt(0) ? "relief-or-more-spending" : "cuts";
}

export interface BalanceChange {
  /** how the deficit (negative balance) moves; "surplus" when either side is ≥ 0 */
  direction: "smaller-deficit" | "larger-deficit" | "unchanged" | "not-a-deficit";
  /** change in the size of the deficit, positive number in the metric's unit */
  magnitude: string;
  /** relative change of the deficit size in %, positive number; null for zero base */
  relative: string | null;
}

/**
 * Balances are negative when in deficit, so "+589,3 (+8,9%)" would read as a bigger deficit while
 * it means a smaller one. This describes the change in the size of the deficit in words instead.
 */
export function deficitChange(series: SeriesView, current: string, base: string): BalanceChange | null {
  const c = point(series, current)?.value;
  const b = point(series, base)?.value;
  if (c == null || b == null) return null;
  const cd = toDecimal(c);
  const bd = toDecimal(b);
  if (cd.gte(0) || bd.gte(0)) return { direction: "not-a-deficit", magnitude: cd.minus(bd).abs().toString(), relative: null };
  const size = cd.abs().minus(bd.abs()); // > 0: deficit grows
  const rel = percentChange(bd.abs(), cd.abs());
  return {
    direction: size.isZero() ? "unchanged" : size.gt(0) ? "larger-deficit" : "smaller-deficit",
    magnitude: size.abs().toString(),
    relative: rel === null ? null : rel.abs().toDecimalPlaces(1).toString(),
  };
}
