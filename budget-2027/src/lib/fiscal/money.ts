/**
 * Fiscal number primitives.
 *
 * Rules (see docs/QUALITY_STANDARDS.md):
 * - Never use JS floating point for money. Every value is a Decimal built from a string.
 * - Every value carries an explicit unit; scaling between units is explicit.
 * - BGN → EUR uses the irrevocably fixed rate 1 EUR = 1.95583 BGN (Bulgaria in the euro area
 *   since 1 Jan 2026). Verified source: SIGMA Budget `about_data` → build.eurRate and trap
 *   "eur-bgn" (checked 2026-11-19). Primary legal source to be linked in docs/DATA_SOURCES.md.
 */
import Decimal from "decimal.js";

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };

/** Irrevocably fixed conversion rate, BGN per 1 EUR. */
export const EUR_BGN_RATE = new Decimal("1.95583");

export type Currency = "EUR" | "BGN";
export type Scale = "unit" | "thousand" | "million" | "billion";

export interface MoneyUnit {
  kind: "money";
  currency: Currency;
  scale: Scale;
}
export interface PercentUnit {
  kind: "percent";
}
export interface CountUnit {
  kind: "count";
}
export type Unit = MoneyUnit | PercentUnit | CountUnit;

const SCALE_FACTOR: Record<Scale, Decimal> = {
  unit: new Decimal(1),
  thousand: new Decimal(1e3),
  million: new Decimal(1e6),
  billion: new Decimal(1e9),
};

/**
 * Parse a unit label as published by SIGMA Budget / MoF ("млн. €", "хил. лв.", "%", "EUR").
 * Throws on unknown labels: an unknown unit must never be guessed.
 */
export function parseUnit(label: string): Unit {
  const s = label.trim().toLowerCase().replace(/\s+/g, " ");
  if (s === "%" || s === "процент" || s === "percent") return { kind: "percent" };
  if (s === "бр." || s === "брой" || s === "count") return { kind: "count" };

  let currency: Currency | undefined;
  if (/(€|eur|евро)/.test(s)) currency = "EUR";
  else if (/(лв|bgn|лева)/.test(s)) currency = "BGN";
  if (!currency) throw new UnitError(`Unknown unit label: "${label}"`);

  let scale: Scale = "unit";
  if (/^(хил|thousand|thous)/.test(s)) scale = "thousand";
  else if (/^(млн|million|mn|mio)/.test(s)) scale = "million";
  else if (/^(млрд|billion|bn)/.test(s)) scale = "billion";

  return { kind: "money", currency, scale };
}

export class UnitError extends Error {
  override name = "UnitError";
}

/** Strictly parse a numeric value. Accepts strings and Decimals only (no JS numbers). */
export function toDecimal(value: string | Decimal): Decimal {
  if (value instanceof Decimal) return value;
  const trimmed = value.trim();
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
    throw new UnitError(`Not a canonical decimal string: "${value}"`);
  }
  return new Decimal(trimmed);
}

/** Convert a money value from one unit to another (scale and currency). */
export function convertMoney(value: string | Decimal, from: MoneyUnit, to: MoneyUnit): Decimal {
  let v = toDecimal(value).times(SCALE_FACTOR[from.scale]);
  if (from.currency !== to.currency) {
    v = from.currency === "BGN" ? v.dividedBy(EUR_BGN_RATE) : v.times(EUR_BGN_RATE);
  }
  return v.dividedBy(SCALE_FACTOR[to.scale]);
}

/**
 * BGN → EUR the way SIGMA converts 2025 monthly reports: divide, then round.
 * Rounding happens once, after the division, never on intermediate values.
 */
export function bgnToEur(value: string | Decimal, decimals = 1): Decimal {
  return toDecimal(value).dividedBy(EUR_BGN_RATE).toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP);
}

/**
 * Percent change from `base` to `next`. Returns null when the base is zero
 * (a change from zero is undefined and must be shown as "n/a", not as infinity).
 */
export function percentChange(base: string | Decimal, next: string | Decimal): Decimal | null {
  const b = toDecimal(base);
  if (b.isZero()) return null;
  return toDecimal(next).minus(b).dividedBy(b.abs()).times(100);
}

/** Share of `part` in `total`, in percent. Null when total is zero. */
export function share(part: string | Decimal, total: string | Decimal): Decimal | null {
  const t = toDecimal(total);
  if (t.isZero()) return null;
  return toDecimal(part).dividedBy(t).times(100);
}

export interface ReconciliationResult {
  ok: boolean;
  sum: Decimal;
  total: Decimal;
  difference: Decimal;
  tolerance: Decimal;
}

/**
 * Check that components add up to the published total within a rounding tolerance.
 * Tolerance must be justified (e.g. 0.1 mn € for SIGMA's BGN→EUR converted 2025 rows).
 */
export function reconcile(
  parts: ReadonlyArray<string | Decimal>,
  total: string | Decimal,
  tolerance: string | Decimal = "0",
): ReconciliationResult {
  const sum = parts.reduce<Decimal>((acc, p) => acc.plus(toDecimal(p)), new Decimal(0));
  const t = toDecimal(total);
  const tol = toDecimal(tolerance);
  const difference = sum.minus(t);
  return { ok: difference.abs().lte(tol), sum, total: t, difference, tolerance: tol };
}

const SCALE_LABEL_BG: Record<Scale, string> = {
  unit: "",
  thousand: "хил. ",
  million: "млн. ",
  billion: "млрд. ",
};

/** Human label for a unit in Bulgarian, e.g. "млн. €". */
export function unitLabelBg(unit: Unit): string {
  if (unit.kind === "percent") return "%";
  if (unit.kind === "count") return "бр.";
  return `${SCALE_LABEL_BG[unit.scale]}${unit.currency === "EUR" ? "€" : "лв."}`;
}

/**
 * Format a value for display in Bulgarian (bg-BG): space as thousands separator,
 * comma as decimal separator. Uses Decimal → fixed string to avoid float artefacts.
 */
export function formatBg(value: string | Decimal, unit: Unit, decimals = 1): string {
  const fixed = toDecimal(value).toFixed(decimals, Decimal.ROUND_HALF_UP);
  const negative = fixed.startsWith("-");
  const [intPart, fracPart] = (negative ? fixed.slice(1) : fixed).split(".");
  const grouped = intPart!.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const num = `${negative ? "−" : ""}${grouped}${fracPart ? `,${fracPart}` : ""}`;
  return `${num} ${unitLabelBg(unit)}`;
}
