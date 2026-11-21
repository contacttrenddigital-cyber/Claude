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
  const st = reconcileUnits(x, ceilings);

  it("МО: 11 programmes add up to the ceiling", () => {
    const mo = st.find((s) => s.code === "1200")!;
    expect(mo).toMatchObject({ ok: true, programs: 11, ceiling: "2987033.5" });
    expect(mo.sum2027).toBe("2987033.5");
    const p = x.ministries.find((m) => m.code === "1200")!.programs.find((q) => q.code === "1200.01.01")!;
    expect(p.budget["2027"]).toBe("1179809.5");
    expect(p.budget["2024"]).toBe("891205.4");
    expect(p.page).toBe(16);
  });

  it("units without a ceiling or with unread programmes are not published", () => {
    expect(st.find((s) => s.code === "0100")).toMatchObject({ ok: false, reason: "няма отделен таван в Приложение № 4" });
    // Сметна палата: the 2027 amounts are not in the PDF's text layer
    expect(st.find((s) => s.code === "0500")!.ok).toBe(false);
    const t = programTable(x, st, { documentId: "d", file: "f" });
    expect(t.rows.some((r) => r.group === "Сметна палата")).toBe(false);
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
