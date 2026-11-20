import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Общини", () => {
  test("карта, легенда, списък от 265 общини, филтър по област и търсене", async ({ page }) => {
    await page.goto("/obshtini");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Колко получава всяка община");
    await expect(page.locator("svg[aria-label^='Карта на общините'] path").first()).toBeVisible();
    expect(await page.locator("svg[aria-label^='Карта на общините'] path").count()).toBe(265);
    await expect(page.getByText("265 общини", { exact: true })).toBeVisible();
    await page.getByLabel("Област").selectOption("Бургас");
    await expect(page.getByText(/^1[0-9] общини$/)).toBeVisible();
    await page.getByLabel("Търси община").fill("Айтос");
    await expect(page.getByText("1 общини", { exact: true })).toBeVisible();
    await page.getByRole("radio", { name: "Промяна 2027 срещу 2026" }).click();
    await expect(page.getByRole("list", { name: "Списък на общините" })).toContainText("%");
  });

  test("профил на община: сравнение 2026/2027 и източник", async ({ page }) => {
    await page.goto("/obshtini/aytos");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Община Айтос");
    // Айтос 2027: 21 225,2 хил. € (чл. 52); 2026: 19 879,3 хил. € (ЗДБ 2026 по СИГМА)
    const row = page.getByRole("row", { name: /Основни бюджетни взаимоотношения/ });
    await expect(row).toContainText(/21[\s ]225,2/);
    await expect(row).toContainText(/19[\s ]879,3/);
    await expect(page.getByText(/Отпечатано име в законопроекта/)).toBeVisible();
  });

  test("дублирано име получава областта в адреса", async ({ page }) => {
    expect((await page.goto("/obshtini/byala-varna"))?.status()).toBe(200);
    expect((await page.goto("/obshtini/byala-ruse"))?.status()).toBe(200);
  });

  test("достъпност и без хоризонтален скрол", async ({ page }) => {
    await page.goto("/obshtini");
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const serious = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious, JSON.stringify(serious.map((v) => ({ id: v.id, n: v.nodes.slice(0, 3).map((x) => x.target) })))).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });
});
