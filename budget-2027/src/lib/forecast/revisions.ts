/**
 * Forecast vintages: the same variable for the same year in two official documents
 * (bill for 2026, submitted 01.07.2026, vs bill for 2027, submitted 16.11.2026).
 * The only decomposition offered is the accounting identity Δbalance = Δrevenue − Δexpenditure,
 * with the printed-rounding residual shown explicitly. No invented attributions.
 */
import Decimal from "decimal.js";
import { docxRow, type DocxExtract, type Vintage } from "@/lib/ingest/documents";

export interface Vintages {
  old: DocxExtract;
  new: DocxExtract;
}

export interface RevisionRow {
  label: string;
  unit: string;
  year: string;
  oldValue: string | null;
  oldVintage: Vintage;
  newValue: string | null;
  newVintage: Vintage;
  revision: string | null;
}

export const MACRO_ROWS: [string, string][] = [
  ["БВП (млн. евро)", "млн. €"],
  ["БВП (реален растеж, %)", "%"],
  ["Потребление", "%"],
  ["Брутообразуване на основен капитал", "%"],
  ["Износ на стоки и услуги", "%"],
  ["Внос на стоки и услуги", "%"],
  ["Заетост (СНС) (%)", "%"],
  ["Коефициент на безработица (НРС) (%)", "%"],
  ["Компенсации на един нает (%)", "%"],
  ["Дефлатор на БВП (%)", "%"],
  ["Средногодишна инфлация (ХИПЦ) (%)", "%"],
];

export const KFP_ROWS: [string, string][] = [
  ["ПРИХОДИ, ПОМОЩИ И ДАРЕНИЯ", "млн. €"],
  ["ОБЩО РАЗХОДИ И ВНОСКА В БЮДЖЕТА НА ЕС", "млн. €"],
  ["Лихви", "млн. €"],
  ["БЮДЖЕТНО САЛДО (+/-)", "млн. €"],
];

/** Table indices of the macro and KFP tables in each extracted document. */
export const TABLE_IDX = { macro: { old: 9, new: 10 }, kfp: { old: 13, new: 13 } } as const;

function find(doc: DocxExtract, table: number, label: string, alt?: string) {
  try {
    return docxRow(doc, { table, label });
  } catch (e) {
    if (alt) return docxRow(doc, { table, label: alt });
    throw e;
  }
}

export function revisions(v: Vintages, kind: "macro" | "kfp", years: string[]): RevisionRow[] {
  const rows = kind === "macro" ? MACRO_ROWS : KFP_ROWS;
  const idx = TABLE_IDX[kind];
  const out: RevisionRow[] = [];
  for (const [label, unit] of rows) {
    // the 2026 bill prints "ОБЩО РАЗХОДИ И ВНОСКА В БЮДЖЕТ…" with a different ending
    const o = find(v.old, idx.old, label, label.startsWith("ОБЩО РАЗХОДИ") ? "ОБЩО РАЗХОДИ И ВНОСКА В БЮДЖЕТА НА ЕС" : undefined);
    const n = find(v.new, idx.new, label);
    for (const y of years) {
      const oc = o.find((c) => c.period === y);
      const nc = n.find((c) => c.period === y);
      if (!oc || !nc) continue;
      const ov = oc.parsed?.value ?? null;
      const nv = nc.parsed?.value ?? null;
      out.push({
        label,
        unit,
        year: y,
        oldValue: ov,
        oldVintage: oc.vintage,
        newValue: nv,
        newVintage: nc.vintage,
        revision: ov !== null && nv !== null ? new Decimal(nv).minus(ov).toString() : null,
      });
    }
  }
  return out;
}

export interface BalanceBridge {
  year: string;
  oldBalance: string;
  revenueEffect: string;
  expenditureEffect: string;
  residual: string;
  newBalance: string;
}

/** Δbalance = Δrevenue − Δexpenditure; residual = printed Δbalance − (Δrevenue − Δexpenditure). */
export function balanceBridge(rows: RevisionRow[], year: string): BalanceBridge {
  const get = (label: string) => {
    const r = rows.find((x) => x.label === label && x.year === year);
    if (!r || r.oldValue === null || r.newValue === null) throw new Error(`bridge: missing ${label} ${year}`);
    return r;
  };
  const rev = get("ПРИХОДИ, ПОМОЩИ И ДАРЕНИЯ");
  const exp = get("ОБЩО РАЗХОДИ И ВНОСКА В БЮДЖЕТА НА ЕС");
  const bal = get("БЮДЖЕТНО САЛДО (+/-)");
  const dRev = new Decimal(rev.revision!);
  const dExp = new Decimal(exp.revision!);
  const dBal = new Decimal(bal.revision!);
  return {
    year,
    oldBalance: bal.oldValue!,
    revenueEffect: dRev.toString(),
    expenditureEffect: dExp.negated().toString(),
    residual: dBal.minus(dRev.minus(dExp)).toString(),
    newBalance: bal.newValue!,
  };
}
