/**
 * Builds an immutable, reviewable data snapshot from extracted official documents.
 * Pure functions: no I/O. scripts/build-snapshot.ts does the file and network work.
 */
import { Decimal, reconcile, toDecimal } from "@/lib/fiscal/money";
import { METRICS, type MetricDef, type SourceSpec } from "@/lib/metrics/catalog";
import {
  docxAmount,
  docxRow,
  docxText,
  emfRow,
  normLabel,
  yearColumns,
  type DocxExtract,
  type EmfTableExtract,
  type ExtractedCell,
  type Vintage,
} from "./documents";
import { parseBgNumber } from "./bg-number";

export type ReviewStatus = "cross_checked" | "single_source" | "conflict";

export interface SourceValue {
  documentId: string;
  locator: string;
  value: string | null;
  original: string | null;
}

export interface Observation {
  metricKey: string;
  versionId: string;
  period: string;
  vintage: Vintage;
  value: string | null;
  unit: MetricDef["unit"];
  review: ReviewStatus;
  sources: SourceValue[];
}

export interface Check {
  id: string;
  kind: "cross-source" | "identity" | "total" | "version-diff";
  status: "pass" | "fail" | "warn";
  description: string;
  details?: Record<string, string | null>;
}

export interface Measure {
  id: string;
  versionId: string;
  direction: "revenue" | "expenditure";
  title: string;
  effects: Record<string, string | null>;
  unit: "млн. €";
  basis: "accrual";
  documentId: string;
  locator: string;
}

export interface DocumentInputs {
  versionId: string;
  docx: DocxExtract;
  annex3: EmfTableExtract;
  /** documentId used for citations (SourceDocument.id). */
  docxId: string;
}

function readSource(inp: DocumentInputs, spec: SourceSpec): { documentId: string; cells: ExtractedCell[] } {
  switch (spec.kind) {
    case "annex3":
      return { documentId: inp.docxId, cells: emfRow(inp.annex3, spec) };
    case "docxTable":
      return { documentId: inp.docxId, cells: docxRow(inp.docx, spec) };
    case "docxAmount":
      return { documentId: inp.docxId, cells: docxAmount(inp.docx, { ...spec, vintage: "draft" }) };
    case "docxText":
      return { documentId: inp.docxId, cells: docxText(inp.docx, { ...spec, vintage: "draft" }) };
  }
}

export function extractObservations(inp: DocumentInputs, metrics: MetricDef[] = METRICS) {
  const observations: Observation[] = [];
  const checks: Check[] = [];
  for (const m of metrics) {
    const perSource = m.sources.map((s) => readSource(inp, s));
    const periods = new Map<string, { vintage: Vintage; values: SourceValue[] }>();
    perSource.forEach(({ documentId, cells }, i) => {
      for (const c of cells) {
        const p = periods.get(c.period) ?? { vintage: c.vintage, values: [] };
        if (i === 0) p.vintage = c.vintage;
        p.values.push({
          documentId,
          locator: c.locator,
          value: c.parsed?.value ?? null,
          original: c.parsed?.original ?? null,
        });
        periods.set(c.period, p);
      }
    });
    for (const [period, { vintage, values }] of periods) {
      const primary = values[0]!;
      let review: ReviewStatus = "single_source";
      if (values.length > 1) {
        const agree = values.every((v) => sameAtPrintedPrecision(v.value, primary.value));
        review = agree ? "cross_checked" : "conflict";
        checks.push({
          id: `xsrc:${m.key}:${period}`,
          kind: "cross-source",
          status: agree ? "pass" : "warn",
          description: agree
            ? `${m.short} ${period}: ${values.length} места в документа съвпадат`
            : `${m.short} ${period}: стойностите в документа се различават`,
          details: Object.fromEntries(values.map((v, i) => [`${i + 1}: ${v.locator}`, v.value])),
        });
      }
      observations.push({
        metricKey: m.key,
        versionId: inp.versionId,
        period,
        vintage,
        value: primary.value,
        unit: m.unit,
        review,
        sources: values,
      });
    }
  }
  return { observations, checks };
}

const decimals = (v: string) => (v.includes(".") ? v.split(".")[1]!.length : 0);

/**
 * Two printed values agree when they are equal at the precision of the less precise one
 * (e.g. "141301.8" in Annex 3 vs "141302" in Табл. I-2, which prints whole millions).
 */
export function sameAtPrintedPrecision(a: string | null, b: string | null): boolean {
  if (a === null || b === null) return a === b;
  const dp = Math.min(decimals(a), decimals(b));
  return toDecimal(a).toDecimalPlaces(dp, Decimal.ROUND_HALF_UP).eq(toDecimal(b).toDecimalPlaces(dp, Decimal.ROUND_HALF_UP));
}

export function valueOf(obs: Observation[], key: string, period: string): string | null {
  return obs.find((o) => o.metricKey === key && o.period === period)?.value ?? null;
}

/** Accounting identities that must hold in the published tables (within printed rounding). */
export function identityChecks(obs: Observation[]): Check[] {
  const periods = [...new Set(obs.filter((o) => o.metricKey === "kfp.revenue").map((o) => o.period))];
  const out: Check[] = [];
  const add = (id: string, description: string, parts: string[], signs: number[], total: string, tol: string, period: string) => {
    const vals = parts.map((k) => valueOf(obs, k, period));
    const t = valueOf(obs, total, period);
    if (vals.some((v) => v === null) || t === null) {
      out.push({ id: `${id}:${period}`, kind: "identity", status: "warn", description: `${description} (${period}): липсва стойност` });
      return;
    }
    const r = reconcile(
      vals.map((v, i) => toDecimal(v!).times(signs[i]!)),
      t,
      tol,
    );
    out.push({
      id: `${id}:${period}`,
      kind: "identity",
      status: r.ok ? "pass" : "fail",
      description: `${description} (${period})`,
      details: { sum: r.sum.toString(), total: r.total.toString(), difference: r.difference.toString(), tolerance: tol },
    });
  };
  for (const p of periods) {
    add("id:revenue", "Приходи = данъчно-осигурителни + неданъчни + помощи", ["kfp.revenue.taxSocial", "kfp.revenue.nonTax", "kfp.revenue.grants"], [1, 1, 1], "kfp.revenue", "0.2", p);
    add("id:expenditure", "Общо разходи = разходи + вноска в ЕС", ["kfp.expenditure.excl", "kfp.expenditure.euContribution"], [1, 1], "kfp.expenditure", "0.2", p);
    add("id:expenditure-excl", "Разходи = нелихвени + лихви", ["kfp.expenditure.nonInterest", "kfp.expenditure.interest"], [1, 1], "kfp.expenditure.excl", "0.2", p);
    add(
      "id:expenditure-structure",
      "Разходи = текущи (вкл. лихви) + капиталови + трансфери за чужбина + държавен резерв + резерв за непредвидени",
      ["kfp.expenditure.current", "kfp.expenditure.capital", "kfp.expenditure.abroad", "kfp.expenditure.stateReserve", "kfp.expenditure.contingency"],
      [1, 1, 1, 1, 1],
      "kfp.expenditure.excl",
      "0.3",
      p,
    );
    add("id:balance", "Салдо = приходи − общо разходи", ["kfp.revenue", "kfp.expenditure"], [1, -1], "kfp.balance", "0.2", p);
    add("id:financing", "Финансиране = −салдо", ["kfp.balance"], [-1], "kfp.financing", "0", p);
    add("id:debt", "Държавен дълг = външен + вътрешен", ["debt.external", "debt.domestic"], [1, 1], "debt.government", "0.2", p);
    // % of GDP consistency: balance / GDP × 100, compared at the printed precision (0.1 pp)
    const bal = valueOf(obs, "kfp.balance", p);
    const gdp = valueOf(obs, "macro.gdp", p);
    const pct = valueOf(obs, "kfp.balance.pctGdp", p);
    if (bal && gdp && pct) {
      const computed = toDecimal(bal).dividedBy(toDecimal(gdp)).times(100);
      const ok = computed.minus(toDecimal(pct)).abs().lte("0.05");
      out.push({
        id: `id:balance-pct:${p}`,
        kind: "identity",
        status: ok ? "pass" : "fail",
        description: `Салдо, % БВП = салдо / БВП × 100 (${p})`,
        details: { computed: computed.toDecimalPlaces(3).toString(), printed: pct },
      });
    }
  }
  return out;
}

/** Discretionary measures (Табл. II-7 revenue, Табл. II-8 expenditure), accrual basis, млн. €. */
export function extractMeasures(inp: DocumentInputs, spec: { revenueTable: number; expenditureTable: number }) {
  const measures: Measure[] = [];
  const checks: Check[] = [];
  for (const [direction, tableIdx] of [
    ["revenue", spec.revenueTable],
    ["expenditure", spec.expenditureTable],
  ] as const) {
    const t = inp.docx.tables[tableIdx]!;
    const { headerIdx, columns } = yearColumns(t.rows, "draft");
    const sums: Record<string, Decimal> = {};
    let totalRow: string[] | undefined;
    t.rows.slice(headerIdx + 1).forEach((row, i) => {
      const title = normLabel(row[0] ?? "");
      if (!title) return;
      if (/^Общо/.test(title)) {
        totalRow = row;
        return;
      }
      const effects: Record<string, string | null> = {};
      for (const [year, { col }] of columns) {
        const v = parseBgNumber(row[col] ?? "")?.value ?? null;
        effects[year] = v;
        if (v !== null) sums[year] = (sums[year] ?? new Decimal(0)).plus(v);
      }
      measures.push({
        id: `${inp.versionId}:${direction}:${i + 1}`,
        versionId: inp.versionId,
        direction,
        title,
        effects,
        unit: "млн. €",
        basis: "accrual",
        documentId: inp.docxId,
        locator: `${normLabel(t.context.at(-1) ?? "")} (таблица ${tableIdx} в ${inp.docx.file}), ред ${headerIdx + i + 2}`,
      });
    });
    if (!totalRow) throw new Error(`Table ${tableIdx}: no "Общо" row`);
    for (const [year, { col }] of columns) {
      const printed = parseBgNumber(totalRow[col] ?? "")?.value ?? "0";
      const r = reconcile([sums[year] ?? new Decimal(0)], printed, "0.2");
      checks.push({
        id: `total:measures-${direction}:${year}`,
        kind: "total",
        status: r.ok ? "pass" : "fail",
        description: `Сбор на ${direction === "revenue" ? "приходните" : "разходните"} мерки ${year} = ред „Общо“`,
        details: { sum: r.sum.toString(), printed, difference: r.difference.toString() },
      });
    }
  }
  return { measures, checks };
}

export interface VersionDiffRow {
  label: string;
  period: string;
  before: string | null;
  after: string | null;
  difference: string | null;
}

/** Compare rows of two versions of the same table by exact label (first occurrence). */
export function diffRows(
  before: { label: string; value: string | null }[],
  after: { label: string; value: string | null }[],
  period: string,
): VersionDiffRow[] {
  const seen = new Set<string>();
  const out: VersionDiffRow[] = [];
  for (const a of after) {
    const key = normLabel(a.label);
    if (seen.has(key)) continue;
    seen.add(key);
    const b = before.find((x) => normLabel(x.label) === key);
    if (!b) continue;
    const diff =
      a.value !== null && b.value !== null ? toDecimal(a.value).minus(toDecimal(b.value)).toString() : null;
    if (diff !== "0") out.push({ label: key, period, before: b.value, after: a.value, difference: diff });
  }
  return out;
}
