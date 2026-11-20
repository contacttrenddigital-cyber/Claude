import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const [path, h1] of [
  ["/pensii", /Пенсии и общественото осигуряване/],
  ["/zdraveopazvane", /Здравеопазването и здравната каса/],
  ["/otbrana", /Разходите за отбрана/],
] as const) {
  test(`${path}: заглавие, достъпност, без скрол`, async ({ page }) => {
    expect((await page.goto(path))?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(h1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const serious = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious, JSON.stringify(serious.map((v) => ({ id: v.id, n: v.nodes.slice(0, 3).map((x) => x.target) })))).toEqual([]);
  });
}

// законопроект за бюджета на ДОО 2027, чл. 1: 16 527 469,0 хил. €; пенсии 14 669 530,1 хил. € (88,8%)
test("пенсии: бюджет на ДОО, дял на пенсиите и таблица на фондовете", async ({ page }) => {
  await page.goto("/pensii");
  await expect(page.getByRole("article").filter({ hasText: "Бюджет на ДОО" })).toContainText(/16[\s ]527,5/);
  await expect(page.getByRole("article").filter({ hasText: /^Пенсии/ })).toContainText("88,8%");
  const funds = page.getByRole("region", { name: "Бюджет на ДОО по фондове, 2027" });
  await expect(funds.getByRole("row", { name: /Пенсии \(чл\. 2\)/ })).toContainText(/−6[\s ]838[\s ]070,4|-6[\s ]838[\s ]070,4/);
  await expect(page.getByText(/нарастват с 1 164,3 млн\. евро/)).toBeVisible();
});

// законопроект за бюджета на НЗОК 2027, чл. 1, ал. 2, т. 1.1.3.7: 2 531 632,1 хил. € (44,5%)
test("здравеопазване: болнична помощ и търсене в таблицата", async ({ page }) => {
  await page.goto("/zdraveopazvane");
  await expect(page.getByRole("article").filter({ hasText: "Болнична помощ" })).toContainText("44,5%");
  await page.getByRole("searchbox", { name: "Търси в таблицата" }).fill("дентална");
  const t = page.getByRole("region", { name: "Бюджет на НЗОК: разходи и трансфери, 2027" });
  await expect(t.getByRole("row", { name: /дентална помощ/ })).toContainText(/248[\s ]601,8/);
});

// Табл. III-2: 2,23% (НАТО) срещу 2,33% (Национален план) за 2027 г.
test("отбрана: разлика между двата реда в % от БВП", async ({ page }) => {
  await page.goto("/otbrana");
  await expect(page.getByRole("article").filter({ hasText: "Спрямо националния план" })).toContainText(/[−-]0,10/);
  const gap = page.getByRole("table", { name: /Разлика между двата реда/ });
  await expect(gap.getByRole("row", { name: /^2029/ })).toContainText("2,65%");
});

test("навигация: пенсии, здраве и отбрана са в менюто", async ({ page }) => {
  await page.goto("/");
  const burger = page.getByRole("button", { name: "Отвори менюто" });
  const phone = await burger.isVisible();
  if (phone) await burger.click();
  else await page.getByRole("button", { name: "Бюджетът" }).click();
  const scope = phone ? page.locator("#mobile-menu") : page.locator("#menu-byudzhetat");
  for (const name of ["Здравеопазване", "Отбрана"]) await expect(scope.getByRole("link", { name: new RegExp(`^${name}`) })).toBeVisible();
  if (phone) await expect(scope.getByRole("link", { name: /^Пенсии/ })).toBeVisible();
});
