import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("/programi: заглавие, достъпност, без скрол", async ({ page }) => {
  expect((await page.goto("/programi"))?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Бюджетни програми");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const serious = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious, JSON.stringify(serious.map((v) => ({ id: v.id, n: v.nodes.slice(0, 3).map((x) => x.target) })))).toEqual([]);
});

// МО PDF, с. 16: 1200.01.01, проект 2027 = 1 179 809,5 хил. €
test("програми: търсене и стойност на програма на МО", async ({ page }) => {
  await page.goto("/programi");
  await page.getByRole("searchbox", { name: "Търси в таблицата" }).fill("въоръжените сили");
  const row = page.getByRole("row", { name: /1200\.01\.01/ });
  await expect(row).toContainText(/1[\s ]179[\s ]809,5/);
  await expect(page.getByRole("heading", { name: /Не са публикувани/ })).toBeVisible();
});

test("профил на институция: програмите на МВР са показани", async ({ page }) => {
  await page.goto("/institutsii");
  await page.getByRole("link", { name: "Министерство на вътрешните работи" }).first().click();
  await expect(page.getByRole("heading", { name: "Бюджетни програми" })).toBeVisible();
  await expect(page.getByRole("row", { name: /1300\.01\.01/ })).toBeVisible();
});
