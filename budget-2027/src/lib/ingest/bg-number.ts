/**
 * Strict parser for numbers as printed in Bulgarian official documents.
 *
 *   "44 016,4" → "44016.4"     "-3 492,2" / "−3 492,2" / "(3 492,2)" → "-3492.2"
 *   "37,8%"    → "37.8" (percent: true)        "" / "—" / "-" / "х" → null (empty cell)
 *
 * Anything else throws: an unparseable printed value must be looked at by a person,
 * never coerced to a number or to zero.
 */
export interface ParsedNumber {
  /** Canonical decimal string ("-1234.5"). */
  value: string;
  percent: boolean;
  /** Exact printed text, kept for provenance. */
  original: string;
}

export class NumberFormatError extends Error {
  override name = "NumberFormatError";
}

const EMPTY = new Set(["", "-", "–", "—", "х", "x", "n/a", "…"]);

export function parseBgNumber(text: string): ParsedNumber | null {
  const original = text;
  let s = text.replace(/[   ]/g, " ").trim();
  if (EMPTY.has(s.toLowerCase())) return null;

  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1).trim();
  }
  if (/^[-−–]/.test(s)) {
    negative = !negative;
    s = s.slice(1).trim();
  }
  let percent = false;
  if (s.endsWith("%")) {
    percent = true;
    s = s.slice(0, -1).trim();
  }
  // thousands: groups of 3 separated by single spaces; decimals after a comma
  if (!/^\d{1,3}( \d{3})*(,\d+)?$/.test(s) && !/^\d+(,\d+)?$/.test(s)) {
    throw new NumberFormatError(`Unparseable printed number: "${original}"`);
  }
  const canonical = s.replace(/ /g, "").replace(",", ".");
  const isZero = /^0+(\.0+)?$/.test(canonical);
  return { value: negative && !isZero ? `-${canonical}` : canonical, percent, original };
}
