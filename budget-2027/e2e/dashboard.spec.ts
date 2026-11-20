import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const NB = "[\\s\\u00a0]";
const num = (s: string) => new RegExp(s.replace(/ /g, NB));

test.describe("Пълно табло (/tablo)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tablo");
  });

  test("показва заглавието, правния статус и ключовите числа от законопроекта", async ({ page }) => {
    await expect(page.locator("html")).toHaveAttribute("lang", "bg");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Пълно табло");
    await expect(page.getByText("Законопроект — не е приет", { exact: true })).toBeVisible();
    const kpis = page.locator("#pokazateli");
    await expect(kpis.getByText(num("−4 907,0"))).toBeVisible(); // салдо по КФП
    await expect(kpis.getByText(num("−5 995,9"))).toBeVisible(); // ЕСС
    await expect(kpis.getByText(num("44 343,9"))).toBeVisible(); // държавен дълг
    await expect(kpis.getByText(num("1 425,6"))).toBeVisible(); // лихви
    await expect(kpis.getByText(/Дефицитът е по-малък с 2[\s\u00a0]284,9/)).toBeVisible();
  });

  test("всяко число има разгъваем източник с точното място в документа", async ({ page }) => {
    const tile = page.locator("article", { has: page.getByRole("heading", { name: "Капиталови разходи" }) });
    await tile.getByText("Източник: Народно събрание").click();
    await expect(tile.getByText(/Приложение № 3: КФП 2025-2029, с\. 2/)).toBeVisible();
    await expect(tile.getByText(/SHA-256/)).toBeVisible();
    const link = tile.getByRole("link", { name: "оригинален файл" });
    await expect(link).toHaveAttribute("href", "https://www.parliament.bg/bills/52/52-602-01-71.docx");
  });

  test("водопадът завършва на отпечатаното салдо", async ({ page }) => {
    const wf = page.locator("figure", { hasText: "КФП 2027: от приходите до салдото" });
    await expect(wf.getByRole("listitem").last()).toContainText(num("−4 907,0"));
    await expect(wf.getByText(/текущи разходи − лихви/)).toBeVisible();
  });

  test("графиките имат таблица с данните и клавиатурен фокус", async ({ page }) => {
    const fig = page.locator("figure", { hasText: "Бюджетно салдо, % от БВП" });
    await fig.getByText("Таблица с данните").click();
    await expect(fig.locator("table tbody tr")).toHaveCount(5);
    await expect(fig.locator("table")).toContainText("няма данни"); // ЕСС 2025 не е в Табл. II-5
    const bar = fig.locator('rect[role="graphics-symbol"]').first();
    await bar.focus();
    await expect(fig.getByRole("status")).toContainText("2025");
  });

  test("изследователят на мерките превключва групи и търси", async ({ page }) => {
    const panel = page.locator("#merki");
    await expect(panel.getByRole("tab", { name: /Кой плаща повече\?/ })).toHaveAttribute("aria-selected", "true");
    await expect(panel.getByText(/еднократен данък от 33% върху свръхпечалбата/)).toBeVisible();
    await panel.getByRole("tab", { name: /Къде се съкращава\?/ }).click();
    await expect(panel.getByText(/Оптимизиране на персонала в силовите/)).toBeVisible();
    await panel.getByRole("tab", { name: /Кой плаща повече\?/ }).click();
    await panel.getByLabel("Търси в мерките").fill("хазарт");
    const items = panel.locator("#measures-panel > ol > li");
    await expect(items).toHaveCount(3);
    await panel.getByLabel("Търси в мерките").fill("няма-такава-мярка");
    await expect(panel.getByText("Няма мерки, които отговарят на търсенето.")).toBeVisible();
  });

  test("показва разликите между проекта от 06.11 и внесения текст", async ({ page }) => {
    const sec = page.locator("#promeni");
    await expect(sec.getByRole("row", { name: /Капиталови разходи/ })).toContainText(num("6 018,6"));
    await expect(sec.getByRole("row", { name: /Капиталови разходи/ })).toContainText(num("−13,6"));
  });

  test("темата се помни след презареждане", async ({ page }) => {
    const menu = page.getByRole("button", { name: "Отвори менюто" });
    if (await menu.isVisible()) await menu.click(); // on phones the theme switch is in the menu
    await page.getByRole("button", { name: /Смени темата/ }).filter({ visible: true }).first().click(); // system → dark
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  for (const scheme of ["light", "dark"] as const) {
    test(`без сериозни нарушения на достъпността (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.reload();
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      const serious = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious, JSON.stringify(serious.map((v) => ({ id: v.id, nodes: v.nodes.slice(0, 3).map((n) => n.target) })), null, 1)).toEqual([]);
    });
  }

  test("няма хоризонтален скрол", async ({ page }) => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("security headers", async ({ request }) => {
    const res = await request.get("/");
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
    expect(res.headers()["x-powered-by"]).toBeUndefined();
  });
});

test.describe("Източници", () => {
  test("изброява документите с SHA-256 и проверките", async ({ page }) => {
    await page.goto("/iztochnitsi");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Източници и проверки");
    await expect(page.getByText("SHA-256 183c1863afb530446fa9a2eb34ea253de7ef83e48270b0550b7546787fb2db0f")).toBeVisible();
    await expect(page.getByText(/Счетоводни равенства/)).toBeVisible();
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(r.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
  });
});
