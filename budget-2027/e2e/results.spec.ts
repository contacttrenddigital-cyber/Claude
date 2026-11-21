import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// МОН PDF, с. 21, 1700.01.01: „Изготвен анализ на ефективността …“, цел 2027 = 1; програмата: 158 355,4 хил. € (2027)
test("пари срещу резултати: програма, пари и цели", async ({ page }) => {
  expect((await page.goto("/pari-sreshtu-rezultati"))?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Какво обещават срещу парите");
  const box = page.locator("#programa");
  await box.locator("select").nth(0).selectOption("Министерство на образованието и науката");
  await box.locator("select").nth(1).selectOption("1700.01.01");
  await expect(box.getByText(/158[\s ]355,4/)).toBeVisible();
  await expect(box.getByText(/Изготвен анализ на ефективността/).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const serious = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious, JSON.stringify(serious.map((v) => ({ id: v.id, n: v.nodes.slice(0, 3).map((x) => x.target) })))).toEqual([]);
});
