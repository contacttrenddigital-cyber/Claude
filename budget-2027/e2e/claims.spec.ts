import { expect, test } from "@playwright/test";

// Проверките на изказвания са спрени засега (src/lib/features.ts): страницата връща 404 и никъде няма връзка към нея.
test("проверките на изказвания са скрити", async ({ page }) => {
  expect((await page.goto("/analizi/asen-vasilev"))?.status()).toBe(404);
  await page.goto("/");
  await expect(page.locator('a[href="/analizi/asen-vasilev"]')).toHaveCount(0);
  const sitemap = await (await page.request.get("/sitemap.xml")).text();
  expect(sitemap).not.toContain("asen-vasilev");
});

test("хронологията в пълното табло показва гласуването в комисията (по БТА)", async ({ page }) => {
  await page.goto("/tablo");
  await expect(page.getByText(/Комисията по бюджет и финанси одобрява законопроекта на първо гласуване/)).toBeVisible();
});
