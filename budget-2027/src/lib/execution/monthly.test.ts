import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ExecutionSchema, monthlyChecks, monthlyTable, originalCell, sameMonthTable } from "./monthly";

// СИГМА execution.json (данни към 30.09.2026, изтеглено 21.11.2026), съкратено до редовете, които ползваме.
// Произход: data/2026-09/kfp/rev → 2026-EU_funds_0926_BG_WEB.xls, лист „стартова“, клетка B11 = 33 898,456 млн. €
const e = ExecutionSchema.parse(JSON.parse(readFileSync(join(__dirname, "fixture-execution.json"), "utf8")));

describe("месечно изпълнение на КФП", () => {
  it("таблица по месеци: 9 месеца на 2026, приходите към септември = 33 898,456 млн. €", () => {
    const t = monthlyTable(e, "doc");
    expect(t.columns.map((c) => c.key)).toEqual(["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"]);
    const rev = t.rows.find((r) => r.label === "Приходи, помощи и дарения")!;
    expect(rev.cells["2026-09"]!.value).toBe("33898.456");
    expect(rev.cells["2026-01"]!.value).toBe("3606.847");
  });

  it("същия месец на 2025 и плана: приходи 30 552,656 (2025, сеп.) и план 49 615,3 млн. €", () => {
    const t = sameMonthTable(e, "doc");
    const rev = t.rows.find((r) => r.label === "Приходи, помощи и дарения")!;
    expect(rev.cells).toMatchObject({ prev: { value: "30552.656" }, cur: { value: "33898.456" }, plan: { value: "49615.3" } });
  });

  it("равенствата на отчета се изпълняват за всеки месец", () => {
    const c = monthlyChecks(e);
    expect(c).toHaveLength(18);
    expect(c.filter((x) => x.status !== "pass")).toEqual([]);
  });

  it("клетката в оригинала", () => {
    expect(originalCell({ sheet: "стартова", columns: { kfp: "B" }, rows: { rev: 11 } }, e, "2026", 9, "rev")).toEqual({
      file: "2026-EU_funds_0926_BG_WEB.xls",
      sha256: "34a01ba7d55c029c1b5bc2cf312fc383f3bc125b3d77955767cd045da3ee03ec",
      sheet: "стартова",
      cell: "B11",
    });
  });
});
