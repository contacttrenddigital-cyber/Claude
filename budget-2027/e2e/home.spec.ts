import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const NB = "[\\s\\u00a0]";

test.describe("Начална страница", () => {
  test("казва какво е платформата и води към трите входа", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("обяснен ясно");
    await expect(page.getByText(/още не е приет/)).toBeVisible();
    for (const [name, href] of [["Как ме засяга?", "/kalkulator"], ["Къде отиват парите?", "/sektori"], ["Вярно ли е?", "/analizi/asen-vasilev"]] as const)
      await expect(page.getByRole("link", { name: new RegExp(name.replace("?", "\\?")) }).filter({ hasText: name }).first()).toHaveAttribute("href", href);
  });

  // Приложение № 3 / Табл. VI-1, проект 2027: 51 065,2; 55 972,1; −4 907,0; 44 343,9 млн. €
  test("четирите числа в млрд. €, изречението под тях и смяна на годината", async ({ page }) => {
    await page.goto("/");
    const card = page.locator("[aria-labelledby=facts-title]");
    for (const v of ["51,1", "56,0", "4,9", "44,3"]) await expect(card).toContainText(v);
    await expect(page.locator("main")).toContainText(/Разликата от 4,9 млрд\. € е дефицитът/);
    // 2026 (очаквано): разходи 56 807,2 → 56,8; дефицит −7 191,9 → 7,2
    await card.getByRole("radio", { name: /2026/ }).click();
    await expect(card.getByRole("radio", { name: /2026/ })).toHaveAttribute("aria-checked", "true");
    await expect(card).toContainText("56,8");
    await expect(card).toContainText("7,2");
  });

  // Табл. III-1, 2026: 19 240,7 / 55 525,2 = 34,7% → „35%“
  test("секторите сменят годината", async ({ page }) => {
    await page.goto("/");
    const kade = page.locator("#kade");
    await kade.getByRole("radio", { name: /2026/ }).click();
    await expect(kade).toContainText("общо 55,5 млрд. €");
    await expect(kade.getByRole("listitem").filter({ hasText: "Социално" })).toContainText("35%");
  });

  // Табл. III-1: 20 394,3 / 54 465,4 = 37,4%
  test("къде отиват парите: най-голямото перо и връзка към секторите", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#kade-title")).toContainText("37% от разходите");
    await expect(page.locator("#kade")).toContainText("общо 54,5 млрд. €");
    await page.locator("#kade").getByRole("link", { name: /Всички сектори/ }).click();
    await expect(page).toHaveURL(/\/sektori$/);
  });

  test("находките са с български формат на числата", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/с 34,6% през 2027/)).toBeVisible();
  });

  for (const scheme of ["light", "dark"] as const) {
    test(`достъпност и без хоризонтален скрол (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto("/");
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      const serious = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious, JSON.stringify(serious.map((v) => ({ id: v.id, n: v.nodes.slice(0, 3).map((x) => x.target) })))).toEqual([]);
    });
  }

  test("картинка за споделяне", async ({ page, request }) => {
    await page.goto("/");
    const og = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(og).toMatch(/\/og\.png$/);
    expect((await request.get("/og.png")).status()).toBe(200);
  });
});

test("меню на телефон: отваря се, затваря се с Escape", async ({ page, isMobile }) => {
  test.skip(!isMobile, "само на телефон");
  await page.goto("/");
  await page.getByRole("button", { name: "Отвори менюто" }).click();
  await expect(page.locator("#mobile-menu")).toBeVisible();
  await expect(page.locator("#mobile-menu").getByRole("link", { name: /Калкулатор на заплатата/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#mobile-menu")).toHaveCount(0);
});

test("калкулатор на телефон: резултатът се вижда веднага", async ({ page, isMobile }) => {
  test.skip(!isMobile, "само на телефон");
  await page.goto("/kalkulator");
  await page.getByLabel("Брутна заплата на месец, €").fill("2000");
  const bar = page.getByRole("link", { name: /Нетна заплата 2027/ });
  await expect(bar).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
});

test("страници: за платформата и 404", async ({ page }) => {
  await page.goto("/za-platformata");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Бюджетът на държавата е и твой бюджет");
  const r = await page.goto("/nyama-takava");
  expect(r?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Тази страница не съществува");
  await page.getByRole("link", { name: "Към началото" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("калкулатор: бързите примери сменят заплатата", async ({ page }) => {
  await page.goto("/kalkulator");
  await page.getByRole("button", { name: "2 400 €" }).click();
  await expect(page.getByLabel("Брутна заплата на месец, €")).toHaveValue("2400");
  await expect(page.getByRole("button", { name: "2 400 €" })).toHaveClass(/bg-tile/);
});

test("твърдения: накратко по оценки (8 потвърдени от 21)", async ({ page }) => {
  await page.goto("/analizi/asen-vasilev");
  await expect(page.getByRole("region", { name: "Накратко" })).toContainText(/Потвърдени\s*8\s*от 21/);
});
