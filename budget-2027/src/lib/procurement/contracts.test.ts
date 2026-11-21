import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ContractRow, procurementChecks, procurementTables, toContracts } from "./contracts";

// ЦАИС ЕОП, отворени данни: договори, публикувани през 10.2026 (първите 40 подписани договора + 5 обявления „не е възложена“)
const rows = ContractRow.array().parse(JSON.parse(readFileSync(join(__dirname, "fixture-contracts-2026-10.json"), "utf8")));

describe("договори от ЦАИС ЕОП", () => {
  it("брои само подписаните договори; стойностите в евро са както са публикувани", () => {
    const { contracts } = toContracts(rows);
    expect(contracts).toHaveLength(40);
    const first = contracts[0]!;
    expect([first.buyer, first.buyerId, first.valueEur!.toFixed(2)]).toEqual(["АГЕНЦИЯ ПО ВПИСВАНИЯТА", "131282355", "470160.00"]);
  });

  it("сборът на 40-те договора е 5 986 431,17 € (≈ 6,0 млн. €) и всички разрези го дават", () => {
    const { contracts } = toContracts(rows);
    const t = procurementTables(contracts, "d");
    expect(t.find((x) => x.id === "procurementMonthly")!.rows[0]!.cells.value!.value).toBe("6.0");
    expect(procurementChecks(contracts, t).every((c) => c.status === "pass")).toBe(true);
  });

  it("лева се превръщат по 1,95583, другите валути не влизат в сбора", () => {
    const base = rows.find((r) => r.contractNumber && r.noAwarding !== "Да")!;
    const bgn = { ...base, contractValue: "195583,00", contractCurrency: "BGN", contractNumber: "X1" };
    const usd = { ...base, contractValue: "100,00", contractCurrency: "USD", contractNumber: "X2" };
    const { contracts, otherCurrency } = toContracts([bgn, usd]);
    expect(contracts[0]!.valueEur!.toFixed(2)).toBe("100000.00");
    expect(contracts[1]!.valueEur).toBeNull();
    expect(otherCurrency).toBe(1);
  });
});
