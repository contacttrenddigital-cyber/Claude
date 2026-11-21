import { describe, expect, it } from "vitest";
import { printed, rowByLabel } from "./pick";
import type { TableData } from "@/lib/ingest/snapshot-schema";

// Приложение № 1 към мотивите, изпълнение на КФП към 30.09.2026 г.: приходи 68,3%, разходи 66,1%
const t = {
  id: "execution2026",
  rows: [
    { rowIndex: 3, kind: "data", level: 0, label: "ПРИХОДИ, ПОМОЩИ И ДАРЕНИЯ", cells: { pct: { value: "68.3", text: "68,3" } } },
    { rowIndex: 11, kind: "data", level: 0, label: "РАЗХОДИ И ВНОСКА В БЮДЖЕТА НА ЕС", cells: { pct: { value: "66.1", text: "66,1" } } },
    { rowIndex: 16, kind: "data", level: 0, label: "Резерв за непредвидени", cells: { pct: { value: null, text: "" } } },
  ],
} as unknown as TableData;

describe("printed", () => {
  it("returns the printed value of the only matching row", () => {
    expect(printed(t, /^ПРИХОДИ/, "pct")).toBe("68.3");
    expect(printed(t, /^РАЗХОДИ/, "pct")).toBe("66.1");
  });
  it("fails on no match, several matches or an empty cell", () => {
    expect(() => rowByLabel(t, /липсва/)).toThrow(/0 rows/);
    expect(() => rowByLabel(t, /И/)).toThrow(/rows match/);
    expect(() => printed(t, /^Резерв/, "pct")).toThrow(/no value/);
  });
});
