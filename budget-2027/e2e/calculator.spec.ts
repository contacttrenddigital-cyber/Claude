import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const money = (s: string) => new RegExp(s.replace(/ /g, "[\\s\\u00a0]"));

test.describe("Калкулатор", () => {
  test("брутна 1 500 € без деца: същото нето през 2026 и 2027", async ({ page }) => {
    await page.goto("/kalkulator");
    const r = page.getByRole("region", { name: "Резултат" }).or(page.locator("section", { has: page.getByRole("heading", { name: "Резултат" }) }));
    // 1500 − 206,70 − 129,33 = 1 163,97
    await expect(r.getByText(money("1 163,97 €")).first()).toBeVisible();
    await expect(r.getByText(/годишното нето е същото/)).toBeVisible();
  });

  test("промяна на заплатата и деца преизчислява на място", async ({ page }) => {
    await page.goto("/kalkulator");
    await page.getByLabel("Брутна месечна заплата по трудов договор, €").fill("2600");
    await page.getByLabel("Брой ненавършили пълнолетие деца").selectOption("1");
    // по-висок таван → повече осигуровки; по-високо облекчение → по-малко данък
    await expect(page.getByText(/осигуровките на работника се увеличават/)).toBeVisible();
    await expect(page.getByText(/данъкът намалява/)).toBeVisible();
    await expect(page.getByText(money("2 042,35 €")).first()).toBeVisible();
  });

  test("невалиден вход показва грешка, без резултат", async ({ page }) => {
    await page.goto("/kalkulator");
    await page.getByLabel("Брутна месечна заплата по трудов договор, €").fill("абв");
    await expect(page.locator("#calc-error")).toContainText("Въведи брутна заплата");
    await expect(page.getByRole("heading", { name: "Резултат" })).toHaveCount(0);
  });

  test("сценарият се зарежда от връзка и показва източници", async ({ page }) => {
    await page.goto("/kalkulator?bruto=1500&detsa=2&razhodi=1500&avans=1");
    await expect(page.getByLabel("Брутна месечна заплата по трудов договор, €")).toHaveValue("1500");
    await expect(page.getByLabel("Брой ненавършили пълнолетие деца")).toHaveValue("2");
    await expect(page.getByText(/месечно облекчение за деца/).first()).toBeVisible();
    await expect(page.getByText(/ред 18/).first()).toBeVisible();
    await expect(page.getByText(/чл\. 9, т\. 3/)).toBeVisible();
  });

  test("достъпност", async ({ page }) => {
    await page.goto("/kalkulator?bruto=2600&detsa=1");
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    const serious = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious, JSON.stringify(serious.map((v) => ({ id: v.id, n: v.nodes.slice(0, 3).map((x) => x.target) })))).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });
});
