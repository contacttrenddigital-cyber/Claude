/**
 * Provenance model: no fiscal number may exist in the app without a traceable official source.
 *
 * A `FiscalFigure` is the only shape a number may have when it reaches UI, charts or claims.
 * See docs/QUALITY_STANDARDS.md §1–§3.
 */
import { z } from "zod";
import { parseUnit, toDecimal, type Unit } from "@/lib/fiscal/money";

/** Domains whose documents we accept as primary or verified secondary sources. */
export const OFFICIAL_SOURCE_HOSTS = [
  "minfin.bg",
  "parliament.bg",
  "dv.parliament.bg",
  "nsi.bg",
  "bnb.bg",
  "nap.bg",
  "fiscalcouncil.bg",
  "bulnao.government.bg",
  "ec.europa.eu",
  "data.europa.eu",
  "data.egov.bg",
  "strategy.bg",
  "sigma-budget.midt.bg",
] as const;

export function isOfficialUrl(url: string): boolean {
  let host: string;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    host = u.hostname.toLowerCase();
  } catch {
    return false;
  }
  return OFFICIAL_SOURCE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

/** Budget scope. Numbers with different scopes are never summed or compared directly. */
export const Scope = z.enum([
  "state-budget", // Държавен бюджет (чл. 1 ЗДБ)
  "kfp", // Консолидирана фискална програма
  "kfp-excl-eu-contribution",
  "dco", // ДОО / НОИ
  "nhif", // НЗОК
  "municipal", // общини
  "eu-funds", // европейски средства
  "general-government-esa", // сектор „Държавно управление“ (ЕСС 2010, Евростат)
  "ministry", // бюджет на ведомство (чл. 2–47 ЗДБ)
  "program", // програмен бюджет
  "government-debt", // държавен дълг по Закона за държавния дълг
  "economy", // макроикономически показатели (БВП, инфлация, заетост)
  "parameter", // законови/бюджетни параметри (МРЗ, осигурителен доход, тавани)
]);
export type Scope = z.infer<typeof Scope>;

/**
 * Document status. `draft` (законопроект) ≠ `law` (приет закон) ≠ `report` (отчет) ≠ `forecast`.
 * `pending` means no data yet: the value MUST be null.
 * `mock` exists only so it can be rejected.
 */
export const Status = z.enum([
  "draft",
  "law",
  "report",
  "expected",
  "plan",
  "forecast",
  "partial",
  "pending",
  "mock",
]);
export type Status = z.infer<typeof Status>;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");
const decimalString = z.string().regex(/^-?\d+(\.\d+)?$/, "value must be a decimal string");

export const SourceRef = z.object({
  publisher: z.string().min(2),
  title: z.string().min(3),
  url: z.string().url().refine(isOfficialUrl, "source URL must be https on an official host"),
  /** When we retrieved it. */
  retrieved: isoDate,
  /** Locator inside the document: page, table, sheet!cell, article. */
  locator: z.string().min(1).optional(),
  /** SHA-256 of the original file, when available (SIGMA `explain_number` returns it). */
  sha256: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
  /** SIGMA provenance record id, e.g. "data/2026-09/kfp/rev". */
  sigmaRecord: z.string().optional(),
});
export type SourceRef = z.infer<typeof SourceRef>;

export const FiscalFigure = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    value: decimalString.nullable(),
    unit: z.string().min(1),
    scope: Scope,
    status: Status,
    /** Period the figure refers to: "2027", "2026-09", "2026-Q2", "2026-01..2026-09". */
    period: z.string().min(4),
    /** "Данни към" date from the source. */
    asOf: isoDate,
    source: SourceRef,
  })
  .superRefine((f, ctx) => {
    if (f.status === "pending" && f.value !== null) {
      ctx.addIssue({ code: "custom", message: "pending figures must have value = null" });
    }
    if (f.status !== "pending" && f.value === null) {
      ctx.addIssue({ code: "custom", message: "null value is only allowed with status 'pending'" });
    }
    try {
      parseUnit(f.unit);
    } catch {
      ctx.addIssue({ code: "custom", message: `unknown unit "${f.unit}"` });
    }
  });
export type FiscalFigure = z.infer<typeof FiscalFigure>;

export class PublishError extends Error {
  override name = "PublishError";
}

/** Gate before anything is rendered or exported. Throws on mock data or invalid provenance. */
export function assertPublishable(input: unknown): FiscalFigure {
  const parsed = FiscalFigure.safeParse(input);
  if (!parsed.success) {
    throw new PublishError(
      `Figure rejected: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
    );
  }
  if (parsed.data.status === "mock") {
    throw new PublishError(`Figure ${parsed.data.id} is mock data and cannot be published`);
  }
  return parsed.data;
}

export type ComparabilityResult = { comparable: true } | { comparable: false; reasons: string[] };

/**
 * Two figures may be compared/summed only if scope matches and units are of the same kind.
 * Status differences (draft vs law vs report) are allowed only when `allowStatusMix` is set and
 * must then be labelled in the UI.
 */
export function checkComparable(
  a: FiscalFigure,
  b: FiscalFigure,
  opts: { allowStatusMix?: boolean } = {},
): ComparabilityResult {
  const reasons: string[] = [];
  if (a.scope !== b.scope) reasons.push(`scope differs: ${a.scope} vs ${b.scope}`);
  const ua: Unit = parseUnit(a.unit);
  const ub: Unit = parseUnit(b.unit);
  if (ua.kind !== ub.kind) reasons.push(`unit kind differs: ${ua.kind} vs ${ub.kind}`);
  if (ua.kind === "money" && ub.kind === "money" && ua.currency !== ub.currency) {
    reasons.push(`currency differs: ${ua.currency} vs ${ub.currency} (convert explicitly first)`);
  }
  if (!opts.allowStatusMix && a.status !== b.status) {
    reasons.push(`status differs: ${a.status} vs ${b.status}`);
  }
  if (a.value === null || b.value === null) reasons.push("one of the values is pending (null)");
  return reasons.length ? { comparable: false, reasons } : { comparable: true };
}

/** Value as Decimal, refusing pending figures. */
export function figureValue(f: FiscalFigure) {
  if (f.value === null) throw new PublishError(`Figure ${f.id} is pending: no value`);
  return toDecimal(f.value);
}
