/**
 * The four headline facts on the home page, from printed values only (Приложение № 3 / Табл. VI-1).
 * Display in млрд. € with one decimal; the printed balance is used as is (revenue − expenditure differs
 * from it by 0,1 млн. € of rounding, which is invisible at 1 decimal in млрд.).
 */
import Decimal from "decimal.js";

export interface HomeFact {
  key: string;
  value: string; // млрд. €, 1 decimal, absolute value
  raw: string; // printed, млн. €
  pctGdp: string | null;
}

const bn = (v: string) => new Decimal(v).abs().dividedBy(1000).toDecimalPlaces(1, Decimal.ROUND_HALF_UP).toFixed(1);

export function homeFacts(get: (key: string) => string | null): HomeFact[] {
  const need = (k: string) => {
    const v = get(k);
    if (v === null) throw new Error(`home: ${k} missing`);
    return v;
  };
  const fact = (key: string, pct?: string): HomeFact => ({ key, value: bn(need(key)), raw: need(key), pctGdp: pct ? get(pct) : null });
  return [
    fact("kfp.revenue", "kfp.revenue.pctGdp"),
    fact("kfp.expenditure", "kfp.expenditure.pctGdp"),
    fact("kfp.balance", "kfp.balance.pctGdp"),
    fact("debt.government", "debt.government.pctGdp"),
  ];
}
