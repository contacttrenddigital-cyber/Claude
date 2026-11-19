/**
 * Derived dashboard numbers, recomputed from the real extracted bill (НС 52-602-01-71).
 * Expected values were computed by hand from the printed figures quoted in each comment.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DocxExtract, EmfTableExtract } from "@/lib/ingest/documents";
import { extractObservations } from "@/lib/ingest/snapshot";
import { METRICS } from "@/lib/metrics/catalog";
import { change, deficitChange, kfpWaterfall, measureGroup } from "@/lib/data/derive";
import type { SeriesView } from "@/lib/data/types";

const docx = DocxExtract.parse(JSON.parse(readFileSync("data/extracted/52-602-01-71.tables.json", "utf8")));
const annex3 = EmfTableExtract.parse(JSON.parse(readFileSync("data/extracted/52-602-01-71.annex3.json", "utf8")));
const { observations } = extractObservations({ versionId: "bill-2026-11-16", docx, annex3, docxId: "doc" });

const series: Record<string, SeriesView> = {};
for (const m of METRICS) {
  series[m.key] = {
    metric: { key: m.key, label: m.label, short: m.short, definition: m.definition, scope: m.scope, basis: m.basis, unit: m.unit, changeIn: m.changeIn },
    versionId: "bill-2026-11-16",
    points: observations
      .filter((o) => o.metricKey === m.key)
      .map((o) => ({ period: o.period, vintage: o.vintage, value: o.value, review: o.review, sources: [] })),
  };
}

describe("change()", () => {
  it("level metric: interest 1 059,2 (2026 очакв.) → 1 425,6 (2027) = +366,4 млн. €, +34,6%", () => {
    expect(change(series["kfp.expenditure.interest"]!, "2027", "2026")).toEqual({ absolute: "366.4", relative: "34.6", kind: "percent" });
  });
  it("capital: 9 360,6 → 6 005,0 = −3 355,6 млн. €, −35,8%", () => {
    expect(change(series["kfp.expenditure.capital"]!, "2027", "2026")).toEqual({ absolute: "-3355.6", relative: "-35.8", kind: "percent" });
  });
  it("ratios change in percentage points, never in %", () => {
    // ХИПЦ 4,8% → 4,0%
    expect(change(series["macro.hicp"]!, "2027", "2026")).toEqual({ absolute: "-0.8", relative: null, kind: "pp" });
  });
  it("returns null when a period is missing", () => {
    expect(change(series["esa.balance"]!, "2027", "2025")).toBeNull(); // Табл. II-5 starts at 2026
  });
});

describe("deficitChange()", () => {
  it("KFP: −7 191,9 → −4 907,0 is a smaller deficit by 2 284,9 (31,8%)", () => {
    expect(deficitChange(series["kfp.balance"]!, "2027", "2026")).toEqual({
      direction: "smaller-deficit",
      magnitude: "2284.9",
      relative: "31.8",
    });
  });
  it("ESA: −6 585,2 → −5 995,9 is a smaller deficit by 589,3 (8,9%)", () => {
    expect(deficitChange(series["esa.balance"]!, "2027", "2026")).toMatchObject({ direction: "smaller-deficit", magnitude: "589.3", relative: "8.9" });
  });
  it("KFP 2025 → 2026: −3 492,2 → −7 191,9 is a larger deficit", () => {
    expect(deficitChange(series["kfp.balance"]!, "2026", "2025")!.direction).toBe("larger-deficit");
  });
});

describe("kfpWaterfall()", () => {
  const steps = kfpWaterfall(series, "2027");
  it("ends exactly on the printed balance −4 907,0", () => {
    expect(steps.at(-1)).toMatchObject({ key: "kfp.balance", value: "-4907" }); // Decimal drops the trailing zero of "-4 907,0"
  });
  it("separates interest from current expenditure (48 191,4 − 1 425,6 = 46 765,8)", () => {
    expect(steps.find((s) => s.key === "current")!.value).toBe("-46765.8");
    expect(steps.find((s) => s.key === "kfp.expenditure.interest")!.value).toBe("-1425.6");
  });
  it("revenue total equals the printed 51 065,2", () => {
    expect(steps.find((s) => s.key === "kfp.revenue")!.value).toBe("51065.2");
  });
  it("reconciles for every year 2025–2029", () => {
    for (const y of ["2025", "2026", "2027", "2028", "2029"]) expect(() => kfpWaterfall(series, y)).not.toThrow();
  });
  it("throws when the arithmetic does not reach the printed balance", () => {
    const broken = { ...series, "kfp.expenditure.capital": { ...series["kfp.expenditure.capital"]!, points: series["kfp.expenditure.capital"]!.points.map((p) => ({ ...p, value: p.period === "2027" ? "7005.0" : p.value })) } };
    expect(() => kfpWaterfall(broken, "2027")).toThrow(/≠ printed/);
  });
});

describe("measureGroup()", () => {
  it.each([
    ["revenue", "800.0", "pays-more"],
    ["revenue", "-137.5", "relief-or-more-spending"],
    ["expenditure", "170.5", "relief-or-more-spending"],
    ["expenditure", "-162.8", "cuts"],
    ["revenue", null, null],
    ["revenue", "0", null],
  ] as const)("%s %s → %s", (dir, eff, g) => {
    expect(measureGroup(dir, eff)).toBe(g);
  });
});
