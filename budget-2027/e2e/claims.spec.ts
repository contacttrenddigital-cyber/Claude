import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Асен Василев — проверка на твърдения", () => {
  test.beforeEach(async ({ page }) => page.goto("/analizi/asen-vasilev"));

  test("показва изказванията, обхвата и всички твърдения", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Асен Василев за Бюджет 2027");
    await expect(page.getByText(/3 изказвания, 21 твърдения/)).toBeVisible();
    await expect(page.getByText(/Facebook профил на Асен Василев/)).toBeVisible();
    await expect(page.getByText("21 от 21 твърдения")).toBeVisible();
  });

  test("твърдението за инвестициите показва числа, пресмятане и позиция на правителството", async ({ page }) => {
    const card = page.locator("#c03-public-investment");
    await expect(card.getByText("Частично вярно").first()).toBeVisible();
    await expect(card.getByText(/408,1 млн\. €/).first()).toBeVisible();
    await expect(card.getByText(/−36,0 %/)).toBeVisible();
    await expect(card.getByText(/Плана за възстановяване и устойчивост/).first()).toBeVisible();
  });

  test("филтрите по оценка, тема и търсене работят", async ({ page }) => {
    await page.getByRole("combobox", { name: /^Оценка/ }).selectOption("Прогноза");
    await expect(page.getByText("3 от 21 твърдения")).toBeVisible();
    await page.getByRole("combobox", { name: /^Оценка/ }).selectOption("всички");
    await page.locator("#main").getByRole("combobox", { name: /^Тема/ }).selectOption("Пенсии");
    await expect(page.getByText("3 от 21 твърдения")).toBeVisible();
    await page.locator("#main").getByRole("combobox", { name: /^Тема/ }).selectOption("всички");
    await page.getByRole("searchbox", { name: /^Търси/ }).fill("гълъбарника");
    await expect(page.getByText("1 от 21 твърдения")).toBeVisible();
    await expect(page.locator("#c19-336-46-290")).toContainText("Недостатъчно данни");
  });

  test("прогнозите никога не са оценени като верни или неверни", async ({ page }) => {
    await page.getByRole("combobox", { name: /^Оценка/ }).selectOption("Прогноза");
    for (const id of ["c02-inflation-2027", "c15-recession", "c18-crash"]) {
      await expect(page.locator(`#${id}`)).toContainText("прогноза");
    }
  });

  test("достъпност и мобилна ширина", async ({ page }) => {
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    const serious = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious, JSON.stringify(serious.map((v) => ({ id: v.id, n: v.nodes.slice(0, 3).map((x) => x.target) })))).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });
});

test("хронологията в пълното табло показва гласуването в комисията (по БТА)", async ({ page }) => {
  await page.goto("/tablo");
  await expect(page.getByText(/Комисията по бюджет и финанси одобрява законопроекта на първо гласуване/)).toBeVisible();
});
