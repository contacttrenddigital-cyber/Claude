import { describe, expect, it } from "vitest";
import {
  Decimal,
  EUR_BGN_RATE,
  UnitError,
  bgnToEur,
  convertMoney,
  formatBg,
  parseUnit,
  percentChange,
  reconcile,
  share,
  toDecimal,
  unitLabelBg,
} from "@/lib/fiscal/money";

describe("parseUnit", () => {
  it.each([
    ["млн. €", { kind: "money", currency: "EUR", scale: "million" }],
    ["хил. €", { kind: "money", currency: "EUR", scale: "thousand" }],
    ["млрд. €", { kind: "money", currency: "EUR", scale: "billion" }],
    ["млн. лв.", { kind: "money", currency: "BGN", scale: "million" }],
    ["EUR", { kind: "money", currency: "EUR", scale: "unit" }],
    ["%", { kind: "percent" }],
  ])("parses %s", (label, expected) => {
    expect(parseUnit(label)).toEqual(expected);
  });

  it("refuses to guess unknown units", () => {
    expect(() => parseUnit("кг")).toThrow(UnitError);
    expect(() => parseUnit("млн.")).toThrow(UnitError);
  });
});

describe("toDecimal", () => {
  it("accepts canonical decimal strings only", () => {
    expect(toDecimal("33898.456").toString()).toBe("33898.456");
    expect(() => toDecimal("1,5")).toThrow(UnitError);
    expect(() => toDecimal("1e6")).toThrow(UnitError);
    expect(() => toDecimal("")).toThrow(UnitError);
  });
});

describe("currency and scale conversion", () => {
  it("uses the fixed rate 1.95583", () => {
    expect(EUR_BGN_RATE.toString()).toBe("1.95583");
  });

  it("converts BGN → EUR without float drift", () => {
    // 1.95583 BGN is exactly 1 EUR
    expect(
      convertMoney("1.95583", parseUnit("лв.") as never, parseUnit("€") as never).toString(),
    ).toBe("1");
  });

  it("scales thousand € → million €", () => {
    const r = convertMoney("17600000", parseUnit("хил. €") as never, parseUnit("млрд. €") as never);
    expect(r.toString()).toBe("17.6");
  });

  it("round-trips EUR → BGN → EUR", () => {
    const eur = parseUnit("млн. €") as never;
    const bgn = parseUnit("млн. лв.") as never;
    const back = convertMoney(convertMoney("123.4", eur, bgn), bgn, eur);
    expect(back.toString()).toBe("123.4");
  });

  it("bgnToEur rounds once, after the division", () => {
    expect(bgnToEur("100").toString()).toBe("51.1"); // 51.129...
    expect(bgnToEur("100", 3).toString()).toBe("51.129");
  });
});

describe("derived metrics", () => {
  it("percentChange returns null for a zero base", () => {
    expect(percentChange("0", "5")).toBeNull();
    expect(percentChange("200", "250")!.toString()).toBe("25");
    expect(percentChange("-200", "-100")!.toString()).toBe("50");
  });

  it("share returns null for a zero total", () => {
    expect(share("1", "0")).toBeNull();
    expect(share("25", "200")!.toString()).toBe("12.5");
  });
});

describe("reconcile", () => {
  it("passes exact sums", () => {
    expect(reconcile(["0.1", "0.2"], "0.3").ok).toBe(true);
  });
  it("fails outside tolerance and reports the difference", () => {
    const r = reconcile(["10", "20"], "30.2", "0.1");
    expect(r.ok).toBe(false);
    expect(r.difference.toString()).toBe("-0.2");
  });
  it("passes inside a justified rounding tolerance", () => {
    expect(reconcile(["10", "20"], "30.1", "0.1").ok).toBe(true);
  });
});

describe("formatBg", () => {
  it("uses bg-BG separators and unit labels", () => {
    expect(formatBg("56810.4", parseUnit("млн. €"))).toBe("56 810,4 млн. €");
    expect(formatBg("-1234.56", parseUnit("хил. €"), 2)).toBe("−1 234,56 хил. €");
    expect(formatBg(new Decimal("3"), parseUnit("%"), 0)).toBe("3 %");
  });
  it("labels units in Bulgarian", () => {
    expect(unitLabelBg(parseUnit("млрд. лв."))).toBe("млрд. лв.");
    expect(unitLabelBg({ kind: "count" })).toBe("бр.");
  });
});
