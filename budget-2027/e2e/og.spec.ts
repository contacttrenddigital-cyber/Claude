import { expect, test } from "@playwright/test";

// Картинките за споделяне се генерират от публикуваната снимка: PNG 1200×630 и мета таг към тях.
for (const path of ["/", "/razhodi", "/defitsit", "/pensii", "/zdraveopazvane", "/kalkulator", "/obshtini/boynitsa"]) {
  test(`OG картинка за ${path}`, async ({ page, request }) => {
    await page.goto(path);
    const og = await page.locator('meta[property="og:image"]').first().getAttribute("content");
    expect(og).toContain("opengraph-image");
    const res = await request.get(new URL(og!).pathname + new URL(og!).search);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/png");
    const png = await res.body();
    // PNG header: width and height at bytes 16–23
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
  });
}
