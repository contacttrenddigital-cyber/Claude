import { describe, expect, it } from "vitest";
import {
  PublishError,
  assertPublishable,
  checkComparable,
  figureValue,
  isOfficialUrl,
  type FiscalFigure,
} from "@/lib/provenance/schema";

// Test fixture shaped like a real SIGMA record (values from explain_number data/2026-09/kfp/rev,
// checked 2026-11-19). Fixtures are for testing the validator only, never for display.
const base: FiscalFigure = {
  id: "kfp-rev-2026-09",
  label: "Приходи КФП, януари–септември 2026",
  value: "33898.456",
  unit: "млн. €",
  scope: "kfp",
  status: "report",
  period: "2026-01..2026-09",
  asOf: "2026-09-30",
  source: {
    publisher: "Министерство на финансите",
    title: "Месечен отчет КФП, септември 2026",
    url: "https://www.minfin.bg/bg/statistics/5",
    retrieved: "2026-11-19",
    locator: "стартова!B11",
    sha256: "34a01ba7d55c029c1b5bc2cf312fc383f3bc125b3d77955767cd045da3ee03ec",
    sigmaRecord: "data/2026-09/kfp/rev",
  },
};

describe("isOfficialUrl", () => {
  it("accepts official https hosts and subdomains", () => {
    expect(isOfficialUrl("https://www.minfin.bg/bg/statistics/5")).toBe(true);
    expect(isOfficialUrl("https://sigma-budget.midt.bg/data/outlook.json")).toBe(true);
    expect(isOfficialUrl("https://ec.europa.eu/eurostat")).toBe(true);
  });
  it("rejects http, look-alikes and random sites", () => {
    expect(isOfficialUrl("http://www.minfin.bg/")).toBe(false);
    expect(isOfficialUrl("https://minfin.bg.evil.com/")).toBe(false);
    expect(isOfficialUrl("https://notminfin.bg/")).toBe(false);
    expect(isOfficialUrl("https://example.com/")).toBe(false);
    expect(isOfficialUrl("not a url")).toBe(false);
  });
});

describe("assertPublishable", () => {
  it("accepts a fully sourced figure", () => {
    expect(assertPublishable(base).id).toBe("kfp-rev-2026-09");
  });
  it("rejects mock data", () => {
    expect(() => assertPublishable({ ...base, status: "mock" })).toThrow(PublishError);
  });
  it("rejects figures without an official source", () => {
    expect(() =>
      assertPublishable({ ...base, source: { ...base.source, url: "https://blog.example.com/x" } }),
    ).toThrow(/official host/);
  });
  it("rejects float-typed values", () => {
    expect(() => assertPublishable({ ...base, value: 33898.456 })).toThrow(PublishError);
  });
  it("requires null for pending and forbids null otherwise", () => {
    expect(() => assertPublishable({ ...base, status: "pending" })).toThrow(/pending/);
    expect(assertPublishable({ ...base, status: "pending", value: null }).value).toBeNull();
    expect(() => assertPublishable({ ...base, value: null })).toThrow(/null value/);
  });
  it("rejects unknown units", () => {
    expect(() => assertPublishable({ ...base, unit: "пари" })).toThrow(/unknown unit/);
  });
});

describe("checkComparable", () => {
  it("allows same scope/unit/status", () => {
    expect(checkComparable(base, { ...base, id: "b" })).toEqual({ comparable: true });
  });
  it("blocks state budget vs KFP", () => {
    const r = checkComparable(base, { ...base, scope: "state-budget" });
    expect(r.comparable).toBe(false);
  });
  it("blocks draft vs law unless explicitly allowed", () => {
    const draft = { ...base, status: "draft" as const };
    const law = { ...base, status: "law" as const };
    expect(checkComparable(draft, law).comparable).toBe(false);
    expect(checkComparable(draft, law, { allowStatusMix: true }).comparable).toBe(true);
  });
  it("blocks mixed currencies and unit kinds", () => {
    expect(checkComparable(base, { ...base, unit: "млн. лв." }).comparable).toBe(false);
    expect(checkComparable(base, { ...base, unit: "%" }).comparable).toBe(false);
  });
  it("blocks pending values", () => {
    expect(checkComparable(base, { ...base, status: "report", value: null }).comparable).toBe(
      false,
    );
  });
});

describe("figureValue", () => {
  it("returns a Decimal and refuses pending", () => {
    expect(figureValue(base).toString()).toBe("33898.456");
    expect(() => figureValue({ ...base, status: "pending", value: null })).toThrow(PublishError);
  });
});
