import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// ЦАИС ЕОП, отворени данни, януари–октомври 2026: 29 567 подписани договора; най-голям възложител по стойност — МТС (ЕИК 000695388)
test("договори: обобщение, възложители и търсене", async ({ page }) => {
  expect((await page.goto("/dogovori"))?.status()).toBe(200);
  const facts = page.getByRole("region", { name: "Накратко" });
  await expect(facts).toContainText(/29[\s ]567/);
  await expect(page.getByText("МИНИСТЕРСТВО НА ТРАНСПОРТА И СЪОБЩЕНИЯТА").first()).toBeVisible();
  await page.getByRole("searchbox", { name: "Търси в таблицата" }).fill("железопътен");
  await expect(page.getByRole("region", { name: /Най-големите договори/ }).getByRole("row").nth(1)).toContainText(/железопътен/i);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const serious = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious, JSON.stringify(serious.map((v) => ({ id: v.id, n: v.nodes.slice(0, 3).map((x) => x.target) })))).toEqual([]);
});
