/** „Под лупа“ findings recomputed from the committed snapshot (values from НС 52-602-01-71). */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { computeFindings, type FindingsData } from "@/lib/findings";
import { SnapshotSchema } from "@/lib/ingest/snapshot-schema";

const latest = JSON.parse(readFileSync("data/snapshots/latest.json", "utf8"));
const s = SnapshotSchema.parse(JSON.parse(readFileSync(`data/snapshots/${latest.file}`, "utf8")));
const obs = (k: string, p: string) => s.observations.find((o) => o.metricKey === k && o.period === p && o.versionId === "bill-2026-11-16");
const data: FindingsData = {
  value: (k, p) => obs(k, p)?.value ?? null,
  sourceValues: (k, p) => obs(k, p)?.sources.map((x) => x.value) ?? [],
  table: (id) => s.tables.find((t) => t.id === id)!,
  measures: s.measures.map((m) => ({ direction: m.direction, title: m.title, effect2027: m.effects["2027"] ?? null, locator: m.locator })),
  versionDiffs: s.versionDiffs,
};
const F = computeFindings(data);
const f = (id: string) => F.find((x) => x.id === id)!;

describe("findings", () => {
  it("8 findings, each with all seven parts", () => {
    expect(F).toHaveLength(8);
    for (const x of F) for (const k of ["title", "method", "calculation", "conclusion", "limitations", "response"] as const) expect(x[k].length).toBeGreaterThan(5);
  });
  it("interest: 1 059,2 → 1 425,6 = +34,6 %; to 2029 (2 297,0) = +116,9 %", () => {
    expect(f("lihvi").calculation).toBe("(1425.6 − 1059.2) / 1059.2 × 100 = 34.6%; 2029 спрямо 2026: 116.9%");
  });
  it("capital: 9 360,6 → 6 005,0 = −3 355,6 (−35,8 %)", () => {
    expect(f("kapitalovi").calculation).toBe("6005.0 − 9360.6 = -3355.6 млн. € (-35.8%)");
  });
  it("largest functional cut is energy (−1 378,6)", () => {
    expect(f("sakrashtavania-funktsii").calculation).toMatch(/^минно дело, горива и енергия: -1378\.6 млн\. €/);
  });
  it("windfall tax is 36,5 % of the 2 189,5 of new revenue measures", () => {
    expect(f("danachni-merki").calculation).toBe("Сбор на 21 мерки = 2189.5 млн. €; най-голямата е 800.0 млн. € (36.5% от сбора)");
  });
  it("GDP 2025 discrepancy = 530,5", () => {
    expect(f("bvp-2025").calculation).toBe("116548.5 − 116018 = 530.5 млн. €");
  });
  it("capital execution 2026 = 47,0 %", () => {
    expect(f("izpalnenie-kapitalovi").calculation).toBe("4420.8 / 9408.1 × 100 = 47.0%");
  });
  it("version changes: 6 rows", () => {
    expect(f("promeni-versii").calculation).toMatch(/^6 реда/);
  });
});
