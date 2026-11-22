import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Приложение № 2 към мотивите: МРЗ 620,20 → 660 €; корпоративен данък 10 %; данък върху разходите в натура 3 → 7 %
for (const [path, h1, text] of [
  ["/za-men", /Какво променя бюджетът за мен/, /Работя на заплата/],
  ["/za-men/zaplata", /Работя на заплата/, /660/],
  ["/za-men/pensioner", /Пенсионер съм/, /Осъвременяване/],
  ["/za-men/firma", /Имам фирма/, /7 %/],
  ["/za-men/obshtina", /Моята община/, /Избери своята община/],
] as const) {
  test(`${path}: роля, източници, достъпност`, async ({ page }) => {
    expect((await page.goto(path))?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(h1);
    await expect(page.locator("main")).toContainText(text);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const serious = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious, JSON.stringify(serious.map((v) => ({ id: v.id, n: v.nodes.slice(0, 3).map((x) => x.target) })))).toEqual([]);
  });
}

test("моята община: изборът води към страницата на общината", async ({ page }) => {
  await page.goto("/za-men/obshtina");
  await page.getByLabel("Твоята община").selectOption({ index: 3 });
  await page.getByRole("button", { name: "Покажи" }).click();
  await expect(page).toHaveURL(/\/obshtini\/[a-z0-9-]+$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Община");
});
