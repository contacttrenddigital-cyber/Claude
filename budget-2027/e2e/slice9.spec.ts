import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const [path, h1] of [
  ["/sektori", /Разходите по сектори/],
  ["/obrazovanie", /Образованието в бюджета/],
  ["/zaplati", /Заплатите в бюджета/],
  ["/biznes", /Какво променя бюджетът за фирмите/],
  ["/riskove", /Рисковете пред бюджета/],
  ["/sravnenia", /България сред държавите от ЕС/],
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

// Табл. III-1: 20 394,3 / 54 465,4 = 37,4%
test("сектори: дял на социалната функция и връзка към пенсиите", async ({ page }) => {
  await page.goto("/sektori");
  const row = page.getByRole("row", { name: /Социално осигуряване/ });
  await expect(row).toContainText("37,4%");
  await row.getByRole("link", { name: "Пенсии и ДОО" }).click();
  await expect(page).toHaveURL(/\/pensii$/);
});

// мотиви, абзац 614: 170,5 млн. €
test("образование: изброените средства и тавана на МОН", async ({ page }) => {
  await page.goto("/obrazovanie");
  await expect(page.getByRole("row", { name: /педагогическите специалисти/ }).first()).toContainText("170,5");
  await expect(page.getByRole("article").filter({ hasText: "Таван на МОН" })).toContainText(/918,3/);
});

// Приложение № 2: МРЗ 660 € от 1.01.2027
test("заплати: МРЗ и мерки за персонала", async ({ page }) => {
  await page.goto("/zaplati");
  await expect(page.getByRole("article").filter({ hasText: "Минимална работна заплата" })).toContainText("660,00");
  await expect(page.getByRole("table", { name: "Мерки, свързани със заплатите" }).getByRole("row")).toHaveCount(6);
});

test("бизнес: акциз за автомобили и цитат за свръхпечалбата", async ({ page }) => {
  await page.goto("/biznes");
  await expect(page.getByRole("row", { name: /над 500 kW/ })).toContainText("6 000");
  await expect(page.getByText(/33% върху свръхпечалбата/).first()).toBeVisible();
});

// Табл. VII-1: МФ S1 2,1; ЕК S1 0,7
test("рискове: индикатори за устойчивост", async ({ page }) => {
  await page.goto("/riskove");
  const t = page.getByRole("region", { name: /Индикатори за фискална устойчивост/ });
  await expect(t.getByRole("row", { name: /Стойност, от която/ })).toContainText(/2,1.*2,7.*0,7.*1,4/);
});

// Евростат: BG 2025 дълг 29,9%, 4-и най-нисък
test("сравнения: мястото на България", async ({ page }) => {
  await page.goto("/sravnenia");
  await expect(page.getByRole("article").filter({ hasText: "Дълг на България" })).toContainText("4-и най-нисък от 27");
  await page.getByRole("searchbox", { name: "Търси в таблицата" }).fill("Бълг");
  await expect(page.getByRole("region", { name: /Салдо и дълг/ }).getByRole("row", { name: /България/ })).toContainText("29,9");
});
