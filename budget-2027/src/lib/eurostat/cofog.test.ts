import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { COFOG_YEARS, cofogChecks, cofogEuTable, cofogGap, cofogHistoryTable } from "./cofog";
import { JsonStat } from "./jsonstat";

// Евростат gov_10a_exp, обновено 21.10.2026, изтеглено 21.11.2026 (S13, TE, PC_GDP)
const ds = JsonStat.parse(JSON.parse(readFileSync(join(__dirname, "fixtures/gov_10a_exp-2026-10-21.json"), "utf8")));
const meta = { documentId: "doc", file: "gov_10a_exp-2026-10-21.json" };

describe("COFOG", () => {
  it("България 2024: общо 39,2%, социална защита 14,4%, здравеопазване 5,4%, образование 4,3%, отбрана 1,3% от БВП", () => {
    const t = cofogEuTable(ds, "2024", meta);
    const bg = t.rows.find((r) => r.texts?.geo === "BG")!;
    expect([bg.cells.TOTAL!.value, bg.cells.GF10!.value, bg.cells.GF07!.value, bg.cells.GF09!.value, bg.cells.GF02!.value]).toEqual(["39.2", "14.4", "5.4", "4.3", "1.3"]);
    expect(t.rows.filter((r) => r.cells.TOTAL!.value === null)).toEqual([]);
  });

  it("България 2015–2024: общо 40,4% (2015) и 41,4% (2020)", () => {
    const t = cofogHistoryTable(ds, "BG", COFOG_YEARS, meta);
    const total = t.rows.find((r) => r.kind === "total")!;
    expect([total.cells["2015"]!.value, total.cells["2020"]!.value, total.cells["2024"]!.value]).toEqual(["40.4", "41.4", "39.2"]);
  });

  it("десетте функции дават общото (с точност до закръглянето)", () => {
    const eu = cofogChecks(cofogEuTable(ds, "2024", meta), []);
    expect(eu).toHaveLength(28);
    expect(eu.filter((c) => c.status !== "pass")).toEqual([]);
    expect(cofogChecks(cofogHistoryTable(ds, "BG", COFOG_YEARS, meta), COFOG_YEARS).filter((c) => c.status !== "pass")).toEqual([]);
  });
});

describe("cofogGap", () => {
  // 2024: социална защита 14,4% (BG) срещу 19,5% (ЕС-27) → −5,1 пр.п.; общо 39,2% срещу 48,8% → −9,6 пр.п.; ред и сигурност 2,8 срещу 1,7 → +1,1
  it("разлика България − ЕС-27 в процентни пунктове", () => {
    const g = Object.fromEntries(cofogGap(cofogEuTable(ds, "2024", meta)).map((x) => [x.code, [x.bg, x.eu, x.gap]]));
    expect(g.GF10).toEqual(["14.4", "19.5", "-5.1"]);
    expect(g.TOTAL).toEqual(["39.2", "48.8", "-9.6"]);
    expect(g.GF03).toEqual(["2.8", "1.7", "1.1"]);
  });
});
