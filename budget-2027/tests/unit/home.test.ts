/** Home page facts (Приложение № 3 / Табл. VI-1, проект 2027) and text formatting. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { homeFacts } from "@/lib/home";
import { bgText } from "@/lib/format";
import { SnapshotSchema } from "@/lib/ingest/snapshot-schema";

const ROOT = join(__dirname, "../..");
const latest = JSON.parse(readFileSync(join(ROOT, "data/snapshots/latest.json"), "utf8")).file as string;
const snap = SnapshotSchema.parse(JSON.parse(readFileSync(join(ROOT, "data/snapshots", latest), "utf8")));
const get = (k: string) => snap.observations.find((o) => o.metricKey === k && o.period === "2027" && o.versionId === "bill-2026-11-16")?.value ?? null;

describe("home facts", () => {
  it("51,1 / 56,0 / 4,9 / 44,3 млрд. € from the printed млн. € values", () => {
    // 51 065,2; 55 972,1; −4 907,0; 44 343,9 млн. €
    const f = homeFacts(get);
    expect(f.map((x) => [x.key, x.raw, x.value])).toEqual([
      ["kfp.revenue", "51065.2", "51.1"],
      ["kfp.expenditure", "55972.1", "56.0"],
      ["kfp.balance", "-4907.0", "4.9"],
      ["debt.government", "44343.9", "44.3"],
    ]);
    expect(f[2]!.pctGdp).toBe("-3.5");
  });
  it("throws instead of showing a missing number", () => {
    expect(() => homeFacts(() => null)).toThrow(/missing/);
  });
});

describe("bgText", () => {
  it("formats decimals in generated sentences, leaves years and integers", () => {
    expect(bgText("с 34.6% през 2027 г. и 3355.6 млн. €")).toBe("с 34,6% през 2027 г. и 3 355,6 млн. €");
    expect(bgText("2026 г.: 12 мерки")).toBe("2026 г.: 12 мерки");
    expect(bgText("-0.10 пр.п.")).toBe("−0,10 пр.п.");
  });
});
