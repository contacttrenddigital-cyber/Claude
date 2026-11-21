import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Светлата тема: същите страници без сериозни нарушения на достъпността (контраст и др.) и без хоризонтален скрол.
test.describe("светла тема", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      try {
        localStorage.setItem("theme", "light");
      } catch {
        /* no storage */
      }
    });
  });

  for (const path of ["/", "/razhodi", "/defitsit", "/pensii", "/zdraveopazvane", "/sektori", "/obshtini", "/kalkulator", "/iztochnitsi", "/tablo"]) {
    test(`${path}: достъпност и ширина`, async ({ page }) => {
      expect((await page.goto(path))?.status()).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      const serious = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious, JSON.stringify(serious.map((v) => ({ id: v.id, n: v.nodes.slice(0, 4).map((x) => x.target) })))).toEqual([]);
    });
  }
});
