/**
 * Signed public contracts from the monthly open data of ЦАИС ЕОП (Агенция по обществени поръчки).
 * A row counts as a signed contract when it has a contract number and the notice is not "no award"
 * (noAwarding ≠ "Да"). Duplicates (same procurement number, lot, contract number and supplier) count once.
 * Values: EUR as published; BGN converted at the fixed rate 1,95583 (rounded to cents after dividing);
 * other currencies are left out of the sums and counted separately. Framework agreements carry their
 * maximum value, not payments. Contract values are not budget expenditure: different scope and timing.
 */
import Decimal from "decimal.js";
import { z } from "zod";
import type { Check } from "@/lib/ingest/snapshot";
import type { TableData } from "@/lib/ingest/snapshot-schema";

export const EUR_BGN = "1.95583";

export const ContractRow = z.object({
  publicationDate: z.string(),
  uniqueProcurementNumber: z.string().nullable(),
  tenderName: z.string().nullable(),
  procedureType: z.string().nullable(),
  buyerName: z.string().nullable(),
  buyerRegistryNumber: z.string().nullable(),
  buyerMainActivity: z.string().nullable(),
  lotIdentifier: z.string().nullable(),
  contractNumber: z.string().nullable(),
  contractDate: z.string().nullable(),
  contractValue: z.string().nullable(),
  contractCurrency: z.string().nullable(),
  contractSubject: z.string().nullable(),
  supplierName: z.string().nullable(),
  supplierRegisterNumber: z.string().nullable(),
  isEuFunded: z.string().nullable(),
  isFrameworkAgreement: z.string().nullable(),
  noAwarding: z.string().nullable(),
});
export type ContractRow = z.infer<typeof ContractRow>;

export interface Contract {
  month: string; // YYYY-MM of publication
  date: string | null;
  upn: string;
  buyer: string;
  buyerId: string;
  activity: string;
  procedure: string;
  subject: string;
  supplier: string;
  supplierId: string;
  valueEur: Decimal | null;
  printed: string; // value and currency as published
  eu: boolean;
  framework: boolean;
}

export function toContracts(rows: ContractRow[]): { contracts: Contract[]; otherCurrency: number; duplicates: number } {
  const seen = new Set<string>();
  const out: Contract[] = [];
  let otherCurrency = 0;
  let duplicates = 0;
  for (const r of rows) {
    if (!r.contractNumber || r.noAwarding === "Да") continue;
    const key = [r.uniqueProcurementNumber, r.lotIdentifier, r.contractNumber, r.supplierRegisterNumber].join("|");
    if (seen.has(key)) {
      duplicates++;
      continue;
    }
    seen.add(key);
    const raw = (r.contractValue ?? "").replace(/\s/g, "").replace(",", ".");
    const cur = (r.contractCurrency ?? "").trim();
    let valueEur: Decimal | null = null;
    if (/^-?\d+(\.\d+)?$/.test(raw)) {
      if (cur === "EUR") valueEur = new Decimal(raw);
      else if (cur === "BGN") valueEur = new Decimal(raw).dividedBy(EUR_BGN).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      else otherCurrency++;
    }
    out.push({
      month: r.publicationDate.slice(0, 7),
      date: r.contractDate ? r.contractDate.slice(0, 10) : null,
      upn: r.uniqueProcurementNumber ?? "",
      buyer: (r.buyerName ?? "").trim(),
      buyerId: (r.buyerRegistryNumber ?? "").trim(),
      activity: (r.buyerMainActivity ?? "").trim() || "не е посочена",
      procedure: (r.procedureType ?? "").trim() || "не е посочен",
      subject: (r.contractSubject ?? r.tenderName ?? "").trim(),
      supplier: (r.supplierName ?? "").trim(),
      supplierId: (r.supplierRegisterNumber ?? "").trim(),
      valueEur,
      printed: `${r.contractValue ?? ""} ${cur}`.trim(),
      eu: r.isEuFunded === "Да",
      framework: r.isFrameworkAgreement === "Да",
    });
  }
  return { contracts: out, otherCurrency, duplicates };
}

const sum = (cs: Contract[]) => cs.reduce((s, c) => (c.valueEur ? s.plus(c.valueEur) : s), new Decimal(0));
const mln = (d: Decimal) => d.dividedBy(1_000_000).toDecimalPlaces(1, Decimal.ROUND_HALF_UP).toFixed(1);

function group<K extends string>(cs: Contract[], key: (c: Contract) => K) {
  const m = new Map<K, Contract[]>();
  for (const c of cs) m.set(key(c), [...(m.get(key(c)) ?? []), c]);
  return m;
}

function table(id: string, title: string, documentId: string, columns: { key: string; label: string; unit: string }[], rows: { label: string; cells: Record<string, string | null>; texts?: Record<string, string> }[], textColumns: { key: string; label: string }[] = []): TableData {
  return {
    id,
    title,
    description: "Регистър на обществените поръчки (ЦАИС ЕОП), отворени данни за договорите по месеци, 2026 г.",
    caption: "ЦАИС ЕОП, отворени данни: договори, публикувани през месеца (JSON)",
    scope: "обществени поръчки",
    basis: "договорена стойност",
    documentId,
    file: "contracts-2026-*.json",
    tableIndex: -1,
    columns: columns.map((c, i) => ({ key: c.key, col: i + 1, label: c.label, period: "2026", vintage: "actual" as const, unit: c.unit })),
    textColumns,
    rows: rows.map((r, i) => ({ label: r.label, level: 0, kind: "data" as const, group: null, rowIndex: i + 1, texts: r.texts, cells: Object.fromEntries(Object.entries(r.cells).map(([k, v]) => [k, { value: v, text: v ?? "" }])) })),
  };
}

export function procurementTables(cs: Contract[], documentId: string) {
  const byMonth = [...group(cs, (c) => c.month)].sort(([a], [b]) => a.localeCompare(b));
  const byActivity = [...group(cs, (c) => c.activity)].sort(([, a], [, b]) => sum(b).comparedTo(sum(a)));
  const byProcedure = [...group(cs, (c) => c.procedure)].sort(([, a], [, b]) => b.length - a.length);
  const byBuyer = [...group(cs, (c) => c.buyerId || `име: ${c.buyer}`)].sort(([, a], [, b]) => sum(b).comparedTo(sum(a)));
  const cols = [
    { key: "count", label: "Договори", unit: "" },
    { key: "value", label: "Стойност", unit: "млн. €" },
    { key: "eu", label: "С европейско финансиране", unit: "млн. €" },
  ];
  const row = (label: string, list: Contract[], texts?: Record<string, string>) => ({
    label,
    texts,
    cells: { count: String(list.length), value: mln(sum(list)), eu: mln(sum(list.filter((c) => c.eu))) },
  });
  const mostCommon = (xs: string[]) => {
    const m = new Map<string, number>();
    for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
  };
  const largest = [...cs].filter((c) => c.valueEur).sort((a, b) => b.valueEur!.comparedTo(a.valueEur!)).slice(0, 300);
  return [
    table("procurementMonthly", "Договори по обществени поръчки по месец на публикуване, 2026", documentId, cols, byMonth.map(([m, l]) => row(m, l))),
    table("procurementByActivity", "Договори по основна дейност на възложителя, 2026", documentId, cols, byActivity.map(([a, l]) => row(a, l))),
    table("procurementByProcedure", "Договори по вид процедура, 2026", documentId, cols, byProcedure.map(([p, l]) => row(p, l))),
    table(
      "procurementTopBuyers",
      "Възложители с най-голяма стойност на договорите, 2026",
      documentId,
      cols,
      byBuyer.slice(0, 50).map(([id, l]) => row(mostCommon(l.map((c) => c.buyer)), l, { eik: id.startsWith("име:") ? "" : id })),
      [{ key: "eik", label: "ЕИК/БУЛСТАТ" }],
    ),
    table(
      "procurementLargest",
      "Най-големите договори, 2026 (300)",
      documentId,
      [{ key: "value", label: "Стойност", unit: "€" }],
      largest.map((c) => ({
        label: c.subject.slice(0, 220),
        cells: { value: c.valueEur!.toFixed(2) },
        texts: { buyer: c.buyer, supplier: c.supplier || "—", date: c.date ?? c.month, upn: c.upn, flags: [c.eu ? "ЕС" : "", c.framework ? "рамково споразумение" : ""].filter(Boolean).join(", ") },
      })),
      [
        { key: "buyer", label: "Възложител" },
        { key: "supplier", label: "Изпълнител" },
        { key: "date", label: "Дата" },
        { key: "upn", label: "Уникален № на поръчката" },
        { key: "flags", label: "Бележки" },
      ],
    ),
  ];
}

/** Every breakdown adds up to the same total (count and value). */
export function procurementChecks(cs: Contract[], tables: TableData[]): Check[] {
  const total = { count: cs.length, value: mln(sum(cs)) };
  return tables
    .filter((t) => ["procurementMonthly", "procurementByActivity", "procurementByProcedure"].includes(t.id))
    .map((t) => {
      const n = t.rows.reduce((s, r) => s + Number(r.cells.count!.value), 0);
      // values are summed from unrounded contracts, so compare the counts exactly and the value within rounding
      const v = t.rows.reduce((s, r) => s.plus(r.cells.value!.value!), new Decimal(0));
      const ok = n === total.count && v.minus(total.value).abs().lte(new Decimal(t.rows.length).times("0.05"));
      return { id: `procurement:${t.id}:total`, kind: "total" as const, status: ok ? ("pass" as const) : ("fail" as const), description: `${t.title}: редовете дават общия брой и стойност`, details: { count: `${n} / ${total.count}`, value: `${v.toFixed(1)} / ${total.value}` } };
    });
}

/** Totals from the unrounded contract values (млн. €, one decimal). */
export function procurementTotals(cs: Contract[]) {
  return { count: String(cs.length), value: mln(sum(cs)), eu: mln(sum(cs.filter((c) => c.eu))) };
}
