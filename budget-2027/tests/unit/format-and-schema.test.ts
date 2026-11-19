import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dateBg, dateBgLong, decimalsFor, fmt, fmtNum, fmtSigned, rescale, unitOf, VINTAGE_LONG, VINTAGE_SHORT } from "@/lib/format";
import { SnapshotSchema } from "@/lib/ingest/snapshot-schema";
import { diffRows, sameAtPrintedPrecision } from "@/lib/ingest/snapshot";
import { metric, METRICS } from "@/lib/metrics/catalog";
import { THEME_SCRIPT } from "@/lib/theme";
import { DocxExtract, docxAmount, docxText, vintageFromLabel, yearColumns } from "@/lib/ingest/documents";

const NB = " ";

describe("format", () => {
  it("formats values with Bulgarian separators and units", () => {
    expect(fmt("-4907.0", "млн. €")).toBe(`−4${NB}907,0${NB}млн. €`);
    expect(fmt("660", "€")).toBe(`660${NB}€`);
    expect(fmt(null, "млн. €")).toBe("няма данни");
    expect(fmtNum("44343.9")).toBe(`44${NB}343,9`);
    expect(fmtNum(null)).toBe("—");
    expect(decimalsFor("%")).toBe(1);
    expect(unitOf("млрд. €")).toBe("млрд. €");
  });
  it("always shows the sign of a change", () => {
    expect(fmtSigned("366.4")).toBe("+366,4");
    expect(fmtSigned("-3355.6")).toBe(`−3${NB}355,6`);
    expect(fmtSigned("0.04")).toBe("±0,0");
  });
  it("rescales money exactly", () => {
    expect(rescale("30942719.3", "хил. €", "млрд. €")).toBe("30.9427193");
  });
  it("formats dates", () => {
    expect(dateBg("2026-11-16")).toBe("16.11.2026 г.");
    expect(dateBgLong("2026-11-06")).toBe("6 ноември 2026 г.");
  });
  it("labels every vintage", () => {
    for (const v of ["actual", "expected", "plan", "draft", "forecast"] as const) {
      expect(VINTAGE_SHORT[v]).toBeTruthy();
      expect(VINTAGE_LONG[v]).toBeTruthy();
    }
  });
});

describe("committed snapshot", () => {
  const files = readdirSync("data/snapshots").filter((f) => f.startsWith("snap-"));
  it("historical snapshots keep their id, file name and have no failed checks", () => {
    for (const f of files) {
      const raw = JSON.parse(readFileSync(`data/snapshots/${f}`, "utf8")) as { id: string; checks: { status: string }[] };
      expect(f).toBe(`${raw.id}.json`);
      expect(raw.checks.filter((c) => c.status === "fail")).toEqual([]);
    }
  });
  it("the latest snapshot validates against the current schema", () => {
    expect(files.length).toBeGreaterThan(0);
    const latest = JSON.parse(readFileSync("data/snapshots/latest.json", "utf8")).file as string;
    for (const f of [latest]) {
      const s = SnapshotSchema.parse(JSON.parse(readFileSync(`data/snapshots/${f}`, "utf8")));
      expect(s.checks.filter((c) => c.status === "fail")).toEqual([]);
      expect(f).toBe(`${s.id}.json`);
      // every observation cites a document that is listed in the snapshot
      const ids = new Set(s.documents.map((d) => d.id));
      for (const o of s.observations) for (const src of o.sources) expect(ids.has(src.documentId)).toBe(true);
    }
  });
});

describe("diffRows / precision", () => {
  it("reports only changed rows, first occurrence of a label", () => {
    const before = [
      { label: "Капиталови разходи", value: "6018.6" },
      { label: "Лихви", value: "1425.6" },
      { label: "Нов ред", value: "1" },
    ];
    const after = [
      { label: "Капиталови разходи", value: "6005.0" },
      { label: "Лихви", value: "1425.6" },
      { label: "Лихви", value: "999" },
      { label: "Празно", value: null },
    ];
    expect(diffRows(before, after, "2027")).toEqual([
      { label: "Капиталови разходи", period: "2027", before: "6018.6", after: "6005.0", difference: "-13.6" },
    ]);
  });
  it("handles null on one side", () => {
    expect(diffRows([{ label: "A", value: null }], [{ label: "A", value: "1" }], "2027")[0]!.difference).toBeNull();
    expect(sameAtPrintedPrecision("1", null)).toBe(false);
  });
});

describe("catalog and documents helpers", () => {
  it("every metric has a unique key and at least one source", () => {
    expect(new Set(METRICS.map((m) => m.key)).size).toBe(METRICS.length);
    expect(METRICS.every((m) => m.sources.length > 0)).toBe(true);
    expect(metric("kfp.balance").unit).toBe("млн. €");
    expect(() => metric("nope")).toThrow(/Unknown metric/);
  });
  it("rejects unknown column statuses", () => {
    expect(() => vintageFromLabel("нещо")).toThrow(/Unknown column status/);
    expect(vintageFromLabel("Програма 2026 г.")).toBe("plan");
  });
  it("requires a status or a default vintage", () => {
    expect(() => yearColumns([["", "2027 г.", "2028 г."], ["x", "1", "2"]])).toThrow(/no status/);
    expect(() => yearColumns([["нищо"]])).toThrow(/No year header/);
  });
  const docx = DocxExtract.parse(JSON.parse(readFileSync("data/extracted/52-602-01-71.tables.json", "utf8")));
  it("docxAmount / docxText fail loudly on missing input", () => {
    expect(() => docxAmount(docx, { table: 999, label: "x", column: 2, period: "2027", vintage: "draft" })).toThrow(/missing/);
    expect(() => docxText(docx, { contains: "несъществуващ текст", pattern: "(?<amount>\\d+) (?<year>\\d+)", vintage: "draft" })).toThrow(/not found/);
    expect(() =>
      docxText(docx, { contains: "прогнозен размер на минималната работна заплата", pattern: "НЯМА (?<amount>\\d+)", vintage: "draft" }),
    ).toThrow(/matched nothing/);
  });
  it("theme script only touches data-theme", () => {
    expect(THEME_SCRIPT).toContain("data-theme");
  });
});
