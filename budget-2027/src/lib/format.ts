import { Decimal, convertMoney, formatBg, parseUnit, toDecimal, unitLabelBg, type MoneyUnit } from "@/lib/fiscal/money";
import type { Vintage } from "@/lib/ingest/documents";

export const VINTAGE_SHORT: Record<Vintage, string> = {
  actual: "отчет",
  expected: "очакв.",
  plan: "закон",
  draft: "проект",
  forecast: "прогноза",
};

export const VINTAGE_LONG: Record<Vintage, string> = {
  actual: "отчет",
  expected: "очаквано изпълнение",
  plan: "план по закона",
  draft: "проект",
  forecast: "прогноза",
};

export function decimalsFor(unit: string): number {
  return unit === "€" ? 0 : 1;
}

/** "−4 907,0 млн. €" */
export function fmt(value: string | null, unit: string, decimals = decimalsFor(unit)): string {
  if (value === null) return "няма данни";
  return formatBg(value, parseUnit(unit), decimals);
}

/** Number only, no unit: "−4 907,0" */
export function fmtNum(value: string | Decimal | null, decimals = 1): string {
  if (value === null) return "—";
  const s = formatBg(value, { kind: "count" }, decimals);
  return s.replace(/ бр\.$/, "");
}

/** Explicit sign for changes: "+1 449,9", "−3 355,6", "±0,0" */
export function fmtSigned(value: string | Decimal, decimals = 1): string {
  const d = toDecimal(value instanceof Decimal ? value.toFixed() : value);
  const body = fmtNum(d.abs(), decimals);
  if (d.toDecimalPlaces(decimals).isZero()) return `±${body}`;
  return `${d.isNegative() ? "−" : "+"}${body}`;
}

/** Re-scale a money value for display, e.g. хил. € → млрд. € (exact decimal scaling). */
export function rescale(value: string, from: string, to: string): string {
  return convertMoney(value, parseUnit(from) as MoneyUnit, parseUnit(to) as MoneyUnit).toString();
}

const MONTHS = ["", "януари", "февруари", "март", "април", "май", "юни", "юли", "август", "септември", "октомври", "ноември", "декември"];

/** "2026-11-16" → "16.11.2026 г." */
export function dateBg(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y} г.`;
}

/** "2026-11-16" → "16 ноември 2026 г." */
export function dateBgLong(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${Number(d)} ${MONTHS[Number(m)]} ${y} г.`;
}

/** Canonical Bulgarian unit label: "млн. €", "%", "€". */
export function unitOf(unit: string): string {
  return unitLabelBg(parseUnit(unit));
}
