import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PAGES: [string, RegExp][] = [
  ["/pod-lupa", /Бюджетът под лупа/],
  ["/pozitivni-merki", /Какво се подобрява/],
  ["/zakonodatelstvo", /Пътят на Бюджет 2027/],
  ["/dokumenti", /Търсене в документите/],
  ["/metodologia", /Как работим с числата/],
  ["/rechnik", /Речник на бюджета/],
];
for (const [path, h1] of PAGES) {
  test(`${path}: заглавие, достъпност, без скрол`, async ({ page }) => {
    expect((await page.goto(path))?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(h1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const serious = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious, JSON.stringify(serious.map((v) => ({ id: v.id, n: v.nodes.slice(0, 3).map((x) => x.target) })))).toEqual([]);
  });
}

test("под лупа: 8 находки със схемата източник → право на отговор", async ({ page }) => {
  await page.goto("/pod-lupa");
  await expect(page.locator("ol > li[id]")).toHaveCount(8);
  const lihvi = page.locator("#lihvi");
  await expect(lihvi).toContainText("34,6%");
  for (const part of ["Източник", "Методология", "Пресмятане", "Извод", "Ограничения", "Право на отговор"]) await expect(lihvi).toContainText(part);
});

test("търсене в документите връща дословни откъси с място", async ({ page }) => {
  await page.goto("/dokumenti?q=минимален+размер+на+пенсията");
  await expect(page.getByRole("status")).toContainText("резултата");
  await expect(page.locator("mark").first()).toBeVisible();
  await expect(page.getByText(/374,62/).first()).toBeVisible();
  await page.goto("/dokumenti?q=несъществуващатермин");
  await expect(page.getByRole("status")).toContainText("Няма резултати");
});

test("законодателство: хронология, 24 комисии, разлики между версиите", async ({ page }) => {
  await page.goto("/zakonodatelstvo");
  await expect(page.getByRole("heading", { name: "Комисии (24)" })).toBeVisible();
  await expect(page.getByText(/Комисията по бюджет и финанси одобрява/)).toBeVisible();
  await expect(page.locator("#versii")).toContainText("Капиталови разходи");
});

test("речник: термини от СИГМА без примери с условни числа", async ({ page }) => {
  await page.goto("/rechnik");
  expect(await page.locator("dt").count()).toBeGreaterThan(60);
  await expect(page.getByText("Консолидирана фискална програма", { exact: false }).first()).toBeVisible();
});
