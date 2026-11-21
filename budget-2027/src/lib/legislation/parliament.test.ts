import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { billStatus, stageFromEvents } from "./parliament";

const fx = (f: string) => JSON.parse(readFileSync(join(__dirname, "fixtures", f), "utf8"));

describe("billStatus", () => {
  // https://www.parliament.bg/api/v1/bill/167645, изтеглено 21.11.2026: 24 комисии, 14 доклада, водещата (бюджет и финанси) — още без доклад в API
  it("Бюджет 2027 към 21.11.2026: доклади на комисиите, без гласуване в зала", () => {
    const s = billStatus(fx("bill_167645_2026-11-21.json"));
    expect(s.sign).toBe("52-602-01-71");
    expect(s.stage).toBe(1);
    expect(s.committees).toEqual({ assigned: 24, reported: 14, lead: "Комисия по бюджет и финанси", leadReported: false });
    expect(s.gazette).toBeNull();
    expect(s.events.map((e) => e.type)).toEqual(["SUBMITTED", "COMMITTEE_REPORTS"]);
    expect(s.events[1]).toMatchObject({ date: "2026-11-20", title: "Доклади за първо гласуване от 14 от 23 участващи комисии" });
  });

  // https://www.parliament.bg/api/v1/bill/165300: приет на първо (20.03.2024) и второ гласуване (24.04.2024), ДВ бр. 39/2024
  it("приет и обнародван законопроект минава през всички етапи", () => {
    const s = billStatus(fx("bill_165300_enacted.json"));
    expect(s.stage).toBe(5);
    expect(s.gazette).toEqual({ issue: "39", year: "2024" });
    const t = s.events.map((e) => [e.date, e.type]);
    expect(t).toContainEqual(["2024-03-20", "FIRST_READING"]);
    expect(t).toContainEqual(["2024-03-28", "SECOND_READING_REPORT"]);
    expect(t).toContainEqual(["2024-04-24", "SECOND_READING"]);
    expect(t).toContainEqual(["2024-04-24", "PROMULGATED"]);
  });
});

describe("stageFromEvents", () => {
  it("взима най-напредналия етап", () => {
    expect(stageFromEvents([])).toBe(0);
    expect(stageFromEvents(["COMMITTEE_REPORTS"])).toBe(1);
    expect(stageFromEvents(["COMMITTEE_REPORTS", "FIRST_READING", "SECOND_READING_REPORT"])).toBe(3);
    expect(stageFromEvents(["SECOND_READING", "PROMULGATED"])).toBe(5);
  });
  it("съвпада с billStatus за реалните отговори на API", () => {
    for (const f of ["bill_167645_2026-11-21.json", "bill_165300_enacted.json"]) {
      const s = billStatus(fx(f));
      expect(stageFromEvents(s.events.map((e) => e.type))).toBe(s.stage);
    }
  });
});
