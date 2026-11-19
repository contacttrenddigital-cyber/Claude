/**
 * Whole-table extraction, reconciliation checks, municipality join, slugs, Annex 2 grouping and CSV
 * export — against the real extracted bill (НС 52-602-01-71).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DocxExtract, EmfTableExtract } from "@/lib/ingest/documents";
import { annex3AsTable, extractTable, levelOf, locatorOf } from "@/lib/tables/extract";
import { TABLES, tableSpec } from "@/lib/tables/catalog";
import { childSumChecks, crossCheck, grandTotalChecks, sumTopLevel } from "@/lib/tables/checks";
import { joinByName, normName, normRegion } from "@/lib/municipal/join";
import { municipalitySlug } from "@/lib/municipal/slug";
import { slugify } from "@/lib/slug";
import { changedRows, numberedRows, rowsInRange } from "@/lib/data/assumptions";
import { toCsv } from "@/lib/export";

const doc = DocxExtract.parse(JSON.parse(readFileSync("data/extracted/52-602-01-71.tables.json", "utf8")));
const annex = EmfTableExtract.parse(JSON.parse(readFileSync("data/extracted/52-602-01-71.annex3.json", "utf8")));
const T = (id: string) => extractTable(doc, tableSpec(id), "doc");

describe("table extraction", () => {
  it("extracts every catalogued table", () => {
    for (const s of TABLES) expect(extractTable(doc, s, "doc").rows.length, s.id).toBeGreaterThan(5);
    expect(() => tableSpec("nope")).toThrow(/unknown table/);
    expect(() => extractTable(doc, { ...tableSpec("functions"), table: 999 }, "doc")).toThrow(/missing/);
  });
  it("levels: '- ' and numbered sub-items are level 1", () => {
    expect(levelOf("- съдебна власт")).toBe(1);
    expect(levelOf("в т.ч. Пенсии")).toBe(1);
    expect(levelOf("Обща изравнителна субсидия", "2.1.")).toBe(1);
    expect(levelOf("Образование", "1.")).toBe(0);
  });
  it("municipalities: 265 data rows, 27 region groups, printed total 5 162 139,3", () => {
    const m = T("municipalities");
    expect(m.rows.filter((r) => r.kind === "data")).toHaveLength(265);
    expect(m.rows.filter((r) => r.kind === "group")).toHaveLength(27);
    expect(m.rows.find((r) => r.kind === "total")!.cells.total!.value).toBe("5162139.3");
    expect(grandTotalChecks(m, ["total", "delegated", "equalizing", "winter", "capital"]).every((c) => c.status === "pass")).toBe(true);
  });
  it("functions: sub-rows add up and the total equals KFP expenditure without the EU contribution (54 465,3 ± 0,5)", () => {
    const f = T("functions");
    expect(childSumChecks(f, ["2026", "2027", "2028", "2029"]).every((c) => c.status === "pass")).toBe(true);
    expect(sumTopLevel(f, "2027")).toBe("54465.4");
    expect(crossCheck("x", "y", sumTopLevel(f, "2027"), "54465.3", "0.5").status).toBe("pass");
    expect(crossCheck("x", "y", "1", "2", "0.5").status).toBe("warn");
    expect(crossCheck("x", "y", null, "2", "0.5").status).toBe("warn");
  });
  it("grand total check requires a total row", () => {
    expect(() => grandTotalChecks(T("functions"), ["2027"])).toThrow(/no total row/);
  });
  it("keeps non-numeric printed cells as text (debt duration)", () => {
    const row = T("debtStructure").rows.find((r) => r.label.startsWith("Средна продължителност"))!;
    expect(row.cells["2027"]).toEqual({ value: null, text: "9 г. и 4 м." });
  });
  it("projects keep their number, institution and indicator", () => {
    const p = T("projects").rows.find((r) => r.label.includes("F-16"))!;
    expect(p.label).toMatch(/\[NP-25\.001-0014\]$/);
    expect(p.texts?.institution).toBe("Министерство на отбраната");
    expect(p.cells["2027"]!.value).toBe("4000.0");
  });
  it("Annex 3 page as a table, with locator", () => {
    const t = annex3AsTable(annex, 2, { id: "e", title: "t", description: "d", documentId: "doc", file: "f" });
    expect(t.rows.find((r) => r.label === "Капиталови разходи")!.cells["2027"]!.value).toBe("6005.0");
    expect(t.columns.find((c) => c.key === "2027")!.vintage).toBe("draft");
    expect(locatorOf(T("ceilings"), T("ceilings").rows[0]!)).toMatch(/таблица 36/);
  });
});

describe("municipality join", () => {
  const codes = JSON.parse(readFileSync("data/snapshots/" + JSON.parse(readFileSync("data/snapshots/latest.json", "utf8")).file, "utf8")).municipalities.map(
    (m: { code: string; name: string; region: string }) => ({ id: m.code, name: m.name, region: m.region }),
  );
  it("normalises quotes, Latin homoglyphs and documented aliases", () => {
    expect(normName("„Tунджа”")).toBe("тунджа");
    expect(normName("Aйтос")).toBe("айтос");
    expect(normName("СТОЛИЧНА ОБЩИНА")).toBe("столична");
    expect(normName("Добричка")).toBe("добрич-селска");
    expect(normRegion("ОБЛАСТ СОФИЯ-ГРАД")).toBe("софия");
  });
  it("matches all 265 bill rows to unique codes", () => {
    const rows = T("municipalities").rows.filter((r) => r.kind === "data");
    const j = joinByName(rows, codes);
    expect(j.matched).toHaveLength(265);
    expect(j.unmatched).toEqual([]);
    expect(j.duplicates).toEqual([]);
  });
  it("disambiguates repeated names by region and reports what it cannot match", () => {
    const j = joinByName(
      [
        { label: "Бяла", group: "ОБЛАСТ РУСЕ" },
        { label: "Несъществуваща", group: "ОБЛАСТ РУСЕ" },
      ],
      codes,
    );
    expect(j.matched[0]!.code).toBe("RSE04");
    expect(j.unmatched.map((r) => r.label)).toEqual(["Несъществуваща"]);
  });
  it("slugs: transliteration and region suffix for duplicates", () => {
    expect(slugify("Министерство на отбраната")).toBe("ministerstvo-na-otbranata");
    expect(slugify("Щастливци Ъгъл Юг Ябълка")).toBe("shtastlivtsi-agal-yug-yabalka");
    const all = [{ name: "Бяла" }, { name: "Бяла" }, { name: "Айтос" }];
    expect(municipalitySlug({ name: "Бяла", region: "Русе" }, all)).toBe("byala-ruse");
    expect(municipalitySlug({ name: "Айтос", region: "Бургас" }, all)).toBe("aytos");
  });
});

describe("Annex 2 grouping", () => {
  const a = T("assumptions");
  it("rows inherit the printed number of their parent", () => {
    const n = numberedRows(a);
    expect(n.find((x) => x.row.label.startsWith("Акциз на цигари"))!.n).toBe(8);
  });
  it("tax rows 1–9 include excises; social rows 21+ include child benefits", () => {
    const tax = rowsInRange(a, 1, 9);
    expect(a.rows.filter((r) => tax.includes(r.rowIndex)).some((r) => r.label.startsWith("Акциз на цигари"))).toBe(true);
    const social = rowsInRange(a, 21, 99);
    expect(a.rows.filter((r) => social.includes(r.rowIndex)).some((r) => r.label.startsWith("- за първо дете"))).toBe(true);
  });
  it("changed rows: cigarette excise changes, VAT rate does not", () => {
    const ch = changedRows(a).map((r) => r.label);
    expect(ch.some((l) => l.startsWith("Акциз на цигари"))).toBe(true);
    expect(ch.some((l) => l.startsWith("Размер на данъчната ставка за облагане с ДДС"))).toBe(false);
  });
});

describe("CSV export", () => {
  it("adds BOM, metadata comments and escapes quotes, commas and newlines", () => {
    const csv = toCsv(["a", "b"], [["x,y", 'он каза "да"'], [null, 1.5]], { snapshot: "snap-1" });
    expect(csv.startsWith("﻿# snapshot: snap-1\na,b\n")).toBe(true);
    expect(csv).toContain('"x,y","он каза ""да"""');
    expect(csv).toContain(",1.5");
  });
});
