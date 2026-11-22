import { expect, test } from "@playwright/test";

// Защитните заглавки са зададени и страниците работят без нарушения на CSP (карта, калкулатор, студио, табло).
test("CSP и HSTS: заглавките са зададени", async ({ request }) => {
  const h = (await request.get("/")).headers();
  expect(h["content-security-policy"]).toContain("default-src 'self'");
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["strict-transport-security"]).toContain("max-age=");
});

for (const path of ["/", "/obshtini", "/kalkulator", "/vizualizatsii", "/tablo", "/dogovori"]) {
  test(`CSP: без блокирани ресурси на ${path}`, async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (m) => {
      if (/Content Security Policy|Refused to/i.test(m.text())) violations.push(m.text());
    });
    page.on("pageerror", (e) => violations.push(e.message));
    await page.goto(path, { waitUntil: "networkidle" });
    expect(violations).toEqual([]);
  });
}
