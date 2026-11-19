import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PAGES: [string, RegExp, RegExp][] = [
  ["/danatsi", /Данъци 2027/, /Какво се променя/],
  ["/osigurovki", /Осигуровки, МРЗ и социални плащания/, /Труд и осигуровки/],
  ["/prihodi", /Откъде идват парите/, /Структура на приходите/],
  ["/razhodi", /Къде отиват парите/, /По функции/],
  ["/defitsit", /Дефицит: два различни показателя/, /2025–2029/],
  ["/dalg", /Дългът и цената му/, /Структура на дълга/],
  ["/investitsii", /Публичните инвестиции/, /Приоритетни инвестиционни проекти/],
  ["/institutsii", /Колко може да харчи всяка институция/, /Всички институции/],
  ["/institutsii/ministerstvo-na-otbranata", /Министерство на отбраната/, /Разходи за отбрана/],
  ["/izpalnenie", /Обещано → изпълнено/, /програма и отчет/],
];

for (const [path, h1, section] of PAGES) {
  test(`${path}: заглавие, раздел, източник, без скрол, достъпност`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(h1);
    await expect(page.getByRole("heading", { name: section }).first()).toBeVisible();
    await expect(page.getByText(/Източник|Народно събрание/).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const serious = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious, JSON.stringify(serious.map((v) => ({ id: v.id, n: v.nodes.slice(0, 3).map((x) => x.target) })))).toEqual([]);
  });
}

test("данъци: маркира промените (акциз на цигари 2027)", async ({ page }) => {
  await page.goto("/danatsi");
  const row = page.locator("#promeni").getByRole("row", { name: /Акциз на цигари/ });
  await expect(row).toContainText("промяна");
  await expect(row).toContainText("126");
});

test("инвестиции: филтър по институция и търсене на проект", async ({ page }) => {
  await page.goto("/investitsii");
  await page.getByLabel("Отговорна институция").selectOption("Министерство на отбраната");
  await expect(page.getByText(/F-16 Block 70/).first()).toBeVisible();
  await page.getByLabel("Търси проект").fill("Калотина");
  await expect(page.getByText(/проекта · 2027/)).toContainText("0 проекта");
});

test("институции: търсене и връзка към профил", async ({ page }) => {
  await page.goto("/institutsii");
  await page.getByLabel("Търси в таблицата").fill("образованието");
  await page.getByRole("region", { name: /Тавани на разходите/ }).getByRole("link", { name: "Министерство на образованието и науката" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Министерство на образованието и науката");
});

test("менюто „Още“ води към страниците", async ({ page }) => {
  await page.goto("/");
  await page.locator("summary", { hasText: "Още" }).click();
  await page.locator("details[open]").getByRole("link", { name: "Изпълнение" }).click();
  await expect(page).toHaveURL(/\/izpalnenie$/);
});
