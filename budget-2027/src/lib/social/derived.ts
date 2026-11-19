/**
 * Derived shares for the ДОО and НЗОК pages. Every input is a printed amount from the bill tables;
 * shares are Decimal and rounded only for display.
 */
import Decimal from "decimal.js";
import { share } from "@/lib/fiscal/money";
import type { TableData } from "@/lib/ingest/snapshot-schema";

type Row = TableData["rows"][number];

/** Row by its printed item code ("1.", "1.1.", …) or, for the grand total, kind "total". */
export function byCode(t: TableData, code: string): Row {
  const r = code === "total" ? t.rows.find((x) => x.kind === "total") : t.rows.find((x) => x.label.startsWith(`${code} `));
  if (!r) throw new Error(`${t.id}: row ${code} not found`);
  return r;
}

export function amount(t: TableData, code: string): string {
  const v = byCode(t, code).cells["2027"]?.value;
  if (v === null || v === undefined) throw new Error(`${t.id}: row ${code} has no amount`);
  return v;
}

export interface DerivedShare {
  /** percent, unrounded */
  value: Decimal;
  part: string;
  total: string;
  /** printed rows used */
  rows: string[];
}

function sh(t: TableData, codes: string[], totalCode = "total"): DerivedShare {
  const part = codes.reduce((s, c) => s.plus(amount(t, c)), new Decimal(0));
  const total = amount(t, totalCode);
  return { value: share(part, total)!, part: part.toString(), total, rows: codes };
}

/** ДОО (чл. 1, ал. 1): own insurance revenue vs. transfers from the central budget (items 4 and 5). */
export function dooFunding(rev: TableData) {
  return { contributions: sh(rev, ["1."]), central: sh(rev, ["4.", "5."]) };
}

/** ДОО (чл. 1, ал. 2): pensions as a share of all expenditure and transfers. */
export function dooPensionsShare(exp: TableData): DerivedShare {
  return sh(exp, ["1.1."]);
}

/** НЗОК (чл. 1, ал. 1): health contributions vs. transfers for those insured by the state. */
export function nzokFunding(rev: TableData) {
  return { contributions: sh(rev, ["1.1."]), stateInsured: sh(rev, ["1.2."]) };
}

/** НЗОК (чл. 1, ал. 2): largest health insurance payments as a share of the total budget. */
export function nzokPaymentShares(exp: TableData) {
  return { hospital: sh(exp, ["1.1.3.7."]), medicines: sh(exp, ["1.1.3.5."]) };
}
