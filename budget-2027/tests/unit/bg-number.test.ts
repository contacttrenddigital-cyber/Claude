import { describe, expect, it } from "vitest";
import { NumberFormatError, parseBgNumber } from "@/lib/ingest/bg-number";

describe("parseBgNumber", () => {
  it.each([
    ["44 016,4", "44016.4", false],
    ["-3 492,2", "-3492.2", false],
    ["−3 492,2", "-3492.2", false],
    ["(3 492,2)", "-3492.2", false],
    ["37,8%", "37.8", true],
    ["-0,7", "-0.7", false],
    ["30 942 719,3", "30942719.3", false],
    ["660", "660", false],
    ["0,0%", "0.0", true],
    ["-0,0", "0.0", false],
    ["116 548,5", "116548.5", false],
  ])("%s → %s", (text, value, percent) => {
    expect(parseBgNumber(text)).toEqual({ value, percent, original: text });
  });

  it.each(["", "-", "—", "х"])("empty cell %j → null (never zero)", (t) => {
    expect(parseBgNumber(t)).toBeNull();
  });

  it.each(["1.234,5", "12 34", "abc", "1,2,3", "1e6"])("refuses ambiguous %j", (t) => {
    expect(() => parseBgNumber(t)).toThrow(NumberFormatError);
  });
});
