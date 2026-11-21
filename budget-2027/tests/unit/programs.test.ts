/**
 * Programme budgets (52-602-01-71.zip). Expected: МО 1200.01.01 „Подготовка и използване на
 * въоръжените сили“ 2027 = 1 179 809,5 хил. € (МО PDF, с. 16); the 11 МО programmes add up to the
 * МО ceiling 2 987 033,5 хил. € (Приложение № 4).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ProgramExtract, programChecks, programTable, reconcileUnits } from "@/lib/programs/programs";
import { SnapshotSchema } from "@/lib/ingest/snapshot-schema";

const ROOT = join(__dirname, "../..");
const x = ProgramExtract.parse(JSON.parse(readFileSync(join(ROOT, "data/extracted/program-budgets.json"), "utf8")));
const latest = JSON.parse(readFileSync(join(ROOT, "data/snapshots/latest.json"), "utf8")).file as string;
const snap = SnapshotSchema.parse(JSON.parse(readFileSync(join(ROOT, "data/snapshots", latest), "utf8")));
const ceilings = snap.tables.find((t) => t.id === "ceilings")!;

describe("programme budgets", () => {
  const st = reconcileUnits(x, ceilings, "0.5", {
    "0100": { value: "69657.0", locator: "чл. 3, ал. 1 от законопроекта за държавния бюджет" },
    "0600": { value: "868105.3", locator: "чл. 2, ал. 1 от законопроекта за държавния бюджет" },
  });

  it("МО: 11 programmes add up to the ceiling", () => {
    const mo = st.find((s) => s.code === "1200")!;
    expect(mo).toMatchObject({ ok: true, programs: 11, ceiling: "2987033.5" });
    expect(mo.sum2027).toBe("2987033.5");
    const p = x.ministries.find((m) => m.code === "1200")!.programs.find((q) => q.code === "1200.01.01")!;
    expect(p.budget["2027"]).toBe("1179809.5");
    expect(p.budget["2024"]).toBe("891205.4");
    expect(p.page).toBe(16);
  });

  it("all 45 units reconcile; the five without a usable ceiling row are handled explicitly", () => {
    expect(st.filter((s) => !s.ok)).toEqual([]);
    // НС and ВСС: no row in Приложение № 4 → the expenditure in their own article of the bill
    // (чл. 3, ал. 1: 69 657,0 хил. €; чл. 2, ал. 1: 868 105,3 хил. €)
    expect(st.find((s) => s.code === "0100")).toMatchObject({ ok: true, programs: 8, sum2027: "69657", reference: expect.stringMatching(/чл\. 3/) });
    expect(st.find((s) => s.code === "0600")).toMatchObject({ ok: true, sum2027: "868105.3", reference: expect.stringMatching(/чл\. 2/) });
    // МИДТ prints the programmes of 7400.02.00 as 7500.02.xx: kept as printed, the sum is the ceiling 45 787,1
    expect(st.find((s) => s.code === "7400")).toMatchObject({ ok: true, sum2027: "45787.1", ceiling: "45787.1" });
    const t = programTable(x, st, { documentId: "d", file: "f" });
    expect(t.rows.some((r) => r.label.startsWith("7500.02.01") && r.label.includes("кодът е както е отпечатан"))).toBe(true);
  });

  it("a unit without a ceiling and without a reference is not published", () => {
    const s = reconcileUnits(x, ceilings).find((u) => u.code === "0100")!; // no refs passed
    expect(s).toMatchObject({ ok: false, reason: "няма отделен таван в Приложение № 4" });
  });

  // МОН prints no per-programme table: the yearly table „Проект за 2027 г.“ (PDF, с. 15) gives 12 programmes,
  // incl. 1700.03.00 „Администрация“ 6 955,7, which add up to the МОН ceiling 918 253,4 хил. € (Приложение № 4)
  it("МОН: read from the yearly tables, adds up to the ceiling", () => {
    expect(st.find((s) => s.code === "1700")).toMatchObject({ ok: true, programs: 12, sum2027: "918253.4", ceiling: "918253.4" });
  });

  // КЗД: the per-programme table prints 0,0 in „Общо разходи по бюджета“; the yearly table gives 2 468,3 = ceiling
  it("КЗД: the second reading is used only because the first does not match the ceiling", () => {
    const s = st.find((u) => u.code === "3300")!;
    expect(s).toMatchObject({ ok: true, use: "alt", sum2027: "2468.3" });
    expect(programChecks([s])[0]!.description).toMatch(/по годишните таблици/);
  });

  it("every published unit reconciles exactly and every check is consistent with the status", () => {
    const ok = st.filter((s) => s.ok);
    expect(ok.length).toBeGreaterThanOrEqual(30);
    for (const s of ok) expect(Math.abs(Number(s.sum2027) - Number(s.ceiling))).toBeLessThanOrEqual(0.5);
    const checks = programChecks(st);
    expect(checks.filter((c) => c.status === "pass")).toHaveLength(ok.length);
  });

  it("a changed amount makes the unit fail instead of being shown", () => {
    const broken = structuredClone(x);
    const mo = broken.ministries.find((m) => m.code === "1200")!;
    mo.programs[0]!.budget["2027"] = "1179808.5"; // −1,0: beyond the 0,5 rounding tolerance
    for (const p of mo.alt ?? []) p.budget["2027"] = "0"; // and the second reading does not rescue it
    const s = reconcileUnits(broken, ceilings).find((u) => u.code === "1200")!;
    expect(s.ok).toBe(false);
    expect(s.reason).toMatch(/не е равен на тавана/);
  });

  it("incomplete rows are never published", () => {
    const broken = structuredClone(x);
    const u = broken.ministries.find((m) => m.code === "1300")!;
    u.programs[0]!.complete = false;
    delete u.alt; // no second reading that matches the ceiling
    expect(reconcileUnits(broken, ceilings).find((u) => u.code === "1300")!.reason).toMatch(/не бяха разчетени изцяло/);
  });
});
