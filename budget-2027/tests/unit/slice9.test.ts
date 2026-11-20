/**
 * Slice 9: sectors (Табл. III-1), risk tables (VII-1..3), education allocations (мотиви, абзаци 614–633),
 * Eurostat gov_10dd_edpt1 (обновено 21.10.2026). Expected values are as printed / as published.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import { SnapshotSchema } from "@/lib/ingest/snapshot-schema";
import { sectorRows } from "@/lib/analysis/sectors";
import { rankOf } from "@/lib/eurostat/rank";
import { JsonStat, cell, edptTable, edptUrl } from "@/lib/eurostat/jsonstat";
import { paragraphAmounts } from "@/lib/tables/paragraphs";
import { DocxExtract } from "@/lib/ingest/documents";

const ROOT = join(__dirname, "../..");
const latest = JSON.parse(readFileSync(join(ROOT, "data/snapshots/latest.json"), "utf8")).file as string;
const snap = SnapshotSchema.parse(JSON.parse(readFileSync(join(ROOT, "data/snapshots", latest), "utf8")));
const T = (id: string) => {
  const t = snap.tables.find((x) => x.id === id);
  if (!t) throw new Error(id);
  return t;
};

describe("sectors (Табл. III-1, КФП, млн. €)", () => {
  const s = sectorRows(T("functions"));
  it("denominator is the sum of the 9 main functions: 54 465,4 (2027)", () => {
    expect(s.rows).toHaveLength(9);
    expect(s.total.toFixed(1)).toBe("54465.4");
  });
  it("social protection 37,4%; health 12,7%; education 10,3%", () => {
    const by = (p: string) => s.rows.find((r) => r.label.startsWith(p))!;
    // 20 394,3 / 54 465,4; 6 911,7 / 54 465,4; 5 582,6 / 54 465,4
    expect(by("Социално осигуряване").share.toFixed(1)).toBe("37.4");
    expect(by("Здравеопазване").share.toFixed(1)).toBe("12.7");
    expect(by("Образование").share.toFixed(2)).toBe("10.25");
    // 5 582,6 vs 5 599,7 expected in 2026: −17,1, −0,31%
    expect(by("Образование").delta.toFixed(1)).toBe("-17.1");
    expect(by("Образование").change.toFixed(2)).toBe("-0.31");
    // 7 201,6 vs 9 821,9: −26,7%
    expect(by("Икономически дейности").change.toFixed(1)).toBe("-26.7");
  });
  it("shares add up to 100", () => {
    expect(s.rows.reduce((a, r) => a.plus(r.share), new Decimal(0)).toFixed(6)).toBe("100.000000");
  });
});

describe("risk tables", () => {
  it("S1/S2 by МФ and ЕК (Табл. VII-1)", () => {
    const r = T("sustainability").rows.find((x) => x.label.startsWith("Стойност"))!;
    expect([r.cells.mfS1!.value, r.cells.mfS2!.value, r.cells.ecS1!.value, r.cells.ecS2!.value]).toEqual(["2.1", "2.7", "0.7", "1.4"]);
  });
  it("alternative scenario: debt −0,9 пр.п. of GDP in 2029 (Табл. VII-3)", () => {
    const r = T("altScenario").rows.find((x) => x.label.startsWith("Държавен дълг"))!;
    expect(r.cells["2029"]!.text).toBe("-0,9");
    expect(T("altScenario").rows.filter((x) => x.kind === "group").map((x) => x.label)).toEqual([
      "БРУТЕН ВЪТРЕШЕН ПРОДУКТ",
      "ПАЗАР НА ТРУДА И ЦЕНИ",
      "ПЛАТЕЖЕН БАЛАНС",
      "БЮДЖЕТЕН СЕКТОР",
    ]);
  });
});

describe("education allocations (мотиви, абзаци 614–633)", () => {
  const t = T("educationAllocations");
  it("19 amounts, teachers' pay +7,5%: 170,5 млн. €", () => {
    expect(t.rows.filter((r) => r.kind === "data")).toHaveLength(19);
    const r = t.rows.find((x) => x.rowIndex === 614)!;
    expect(r.cells["2027"]!.value).toBe("170.5");
    expect(r.label).toMatch(/заплатите на педагогическите специалисти със 7,5 на сто/);
  });
  it("a paragraph without a leading amount is rejected", () => {
    const doc = DocxExtract.parse(JSON.parse(readFileSync(join(ROOT, "data/extracted/52-602-01-71.tables.json"), "utf8")));
    expect(() => paragraphAmounts(doc, [{ title: "x", from: 612, to: 614 }], { id: "x", title: "x", description: "x", documentId: "d", period: "2027" })).toThrow(
      /does not start with an amount/,
    );
  });
});

describe("Eurostat gov_10dd_edpt1", () => {
  it("url asks for both items, % of GDP, sector S13 and all EU-27", () => {
    const u = new URL(edptUrl(["2025"]));
    expect(u.searchParams.getAll("na_item")).toEqual(["B9", "GD"]);
    expect(u.searchParams.get("unit")).toBe("PC_GDP");
    expect(u.searchParams.get("sector")).toBe("S13");
    expect(u.searchParams.getAll("geo")).toHaveLength(28);
  });

  it("JSON-stat indexing (row-major over id/size) and restored decimals", () => {
    const ds = JsonStat.parse({
      label: "t",
      updated: "2026-10-21T11:00:00+0200",
      id: ["na_item", "geo", "time"],
      size: [2, 2, 2],
      value: { "0": -3.0, "1": -4.0, "6": 61.4 },
      status: { "1": "p" },
      dimension: {
        na_item: { category: { index: { B9: 0, GD: 1 } } },
        geo: { category: { index: { BG: 0, DE: 1 } } },
        time: { category: { index: { "2024": 0, "2025": 1 } } },
      },
    });
    expect(cell(ds, { na_item: "B9", geo: "BG", time: "2024" })).toEqual({ value: "-3.0", flag: null });
    expect(cell(ds, { na_item: "B9", geo: "BG", time: "2025" })).toEqual({ value: "-4.0", flag: "p" });
    expect(cell(ds, { na_item: "GD", geo: "DE", time: "2024" }).value).toBe("61.4");
    expect(cell(ds, { na_item: "GD", geo: "DE", time: "2025" }).value).toBeNull();
    expect(() => cell(ds, { na_item: "XX" })).toThrow(/not in dataset/);
  });

  it("the stored raw file rebuilds the published table (BG 2025: −4,0 and 29,9)", () => {
    const dir = join(ROOT, "data/raw/eurostat");
    let files: string[] = [];
    try {
      files = readdirSync(dir).filter((f) => f.endsWith(".json"));
    } catch {
      /* raw data is not in git; the published table is checked below */
    }
    const t = T("euFiscal");
    const bg = t.rows.find((r) => r.texts?.geo === "BG")!;
    expect(bg.cells["B9:2025"]!.value).toBe("-4.0");
    expect(bg.cells["GD:2025"]!.value).toBe("29.9");
    if (files.length) {
      const ds = JsonStat.parse(JSON.parse(readFileSync(join(dir, files.sort().at(-1)!), "utf8")));
      expect(edptTable(ds, ["2023", "2024", "2025"], { documentId: t.documentId, file: t.file }).rows).toEqual(t.rows);
    }
  });

  it("Bulgaria 2025: 4th lowest debt and 20th of 27 by balance", () => {
    const t = T("euFiscal");
    expect(rankOf(t, "GD:2025", "BG", "asc")).toEqual({ rank: 4, of: 27, value: "29.9" });
    expect(rankOf(t, "B9:2025", "BG", "desc")).toEqual({ rank: 20, of: 27, value: "-4.0" });
    expect(rankOf(t, "B9:2025", "XX", "desc")).toBeNull();
  });
});
