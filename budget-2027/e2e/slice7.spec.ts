import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { E2E_PASSWORD } from "./global-setup";

for (const [path, h1] of [
  ["/scenarii", /Какво ако/],
  ["/moeto-tablo", /Моето табло/],
  ["/vizualizatsii", /Студио за карти/],
  ["/danni", /Отворени данни/],
  ["/prognozi", /Как се промениха прогнозите/],
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

test("сценарии: ДДС +10% подобрява салдото с 1 348,6 млн. €", async ({ page }) => {
  await page.goto("/scenarii");
  await page.getByRole("slider", { name: "ДДС, промяна в %" }).fill("10");
  await expect(page.getByText(/промяна \+1[\s ]348,6 млн\. €/)).toBeVisible();
});

test("моето табло: избор, запазване след презареждане и връзка", async ({ page }) => {
  await page.goto("/moeto-tablo");
  await page.getByRole("checkbox", { name: /ДДС/ }).check();
  await page.reload();
  await expect(page.getByRole("checkbox", { name: /ДДС/ })).toBeChecked();
  await page.goto("/moeto-tablo?m=macro.hicp");
  await expect(page.locator("article")).toHaveCount(1);
  await expect(page.locator("article")).toContainText("Инфлация (ХИПЦ)");
});

test("студио: PNG се изтегля с правилния размер", async ({ page }) => {
  await page.goto("/vizualizatsii");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Изтегли PNG" }).click()]);
  expect(dl.suggestedFilename()).toMatch(/\.png$/);
  const buf = await (await dl.createReadStream()).toArray();
  const png = Buffer.concat(buf);
  expect(png.subarray(1, 4).toString()).toBe("PNG");
  expect(png.readUInt32BE(16)).toBe(1080);
  await expect(page.getByLabel("Преглед на картата")).toContainText("Законопроект — не е приет");
});

test("отворени данни: CSV с метаданни и JSON", async ({ request }) => {
  const csv = await request.get("/api/danni/merki?format=csv");
  expect(csv.headers()["content-type"]).toContain("text/csv");
  const text = await csv.text();
  expect(text).toContain("# snapshot: snap-");
  expect(text).toContain("еднократен данък от 33%");
  const json = await (await request.get("/api/danni/tablitsi/functions")).json();
  expect(json.data.rows.length).toBeGreaterThan(20);
  expect((await request.get("/api/danni/nyama")).status()).toBe(404);
});

test("sitemap и robots", async ({ request }) => {
  const sm = await (await request.get("/sitemap.xml")).text();
  expect(sm).toContain("/obshtini/aytos");
  expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /admin");
});

test.describe("админ", () => {
  const login = async (page: import("@playwright/test").Page, email: string, password = E2E_PASSWORD) => {
    await page.goto("/admin");
    await page.getByLabel("Имейл").fill(email);
    await page.getByLabel("Парола").fill(password);
    await page.getByRole("button", { name: "Вход" }).click();
  };

  test("без вход: показва формата, не данните", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByLabel("Парола")).toBeVisible();
    await expect(page.getByText("Снимки на данните")).toHaveCount(0);
  });

  test("грешна парола: общо съобщение", async ({ page }) => {
    await login(page, "e2e-viewer@example.test", "wrong-password-xyz");
    await expect(page.locator("form [role=alert]")).toContainText("Невалиден имейл или парола");
  });

  test("наблюдател вижда снимките, но не може да публикува", async ({ page }) => {
    await login(page, "e2e-viewer@example.test");
    await expect(page.getByText("Снимки на данните")).toBeVisible();
    await expect(page.getByRole("button", { name: "Публикувай" })).toHaveCount(0);
    await expect(page.getByText("само за публикатор").first()).toBeVisible();
  });

  test("публикатор вижда бутона за публикуване на по-стари снимки", async ({ page }) => {
    await login(page, "e2e-publisher@example.test");
    await expect(page.getByRole("button", { name: "Публикувай" }).first()).toBeVisible();
    await page.getByRole("button", { name: "Изход" }).click();
    await expect(page.getByLabel("Парола")).toBeVisible();
  });

  test("заключване след 5 грешни опита", async ({ page }) => {
    for (let i = 0; i < 5; i++) await login(page, "e2e-lock@example.test", `bad-password-${i}`);
    await login(page, "e2e-lock@example.test");
    await expect(page.locator("form [role=alert]")).toContainText("временно заключен");
  });
});

test("прогнози: мост на дефицита с остатък от закръгляне", async ({ page }) => {
  await page.goto("/prognozi");
  const wf = page.locator("figure", { hasText: "Мост на салдото по КФП за 2027 г." });
  await expect(wf.locator("ol > li").first()).toContainText(/5[\s\u00a0]078,8/);
  await expect(wf.locator("ol > li").last()).toContainText(/4[\s\u00a0]907,0/);
  await expect(page.getByText(/остатък −0,1 млн\. €/)).toBeVisible();
});
