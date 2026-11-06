import { expect, test } from "@playwright/test";

for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  test(`homepage loads no fireworks photo at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const requests: string[] = [];
    page.on("request", (request) => {
      if (/\/events\/fireworks-\d+\.(jpg|webp)$/.test(request.url())) requests.push(request.url());
    });
    await page.goto("/");
    // Nick's call: the hero poster photo is removed; the sponsor credit stays.
    const ribbon = page.locator(".hero-event:not([hidden]) .sponsor-ribbon");
    await expect(ribbon).toHaveCount(1);
    await expect(ribbon).toBeVisible();
    await expect(page.getByRole("img", { name: "Fireworks lighting up the sky over the school field." })).toHaveCount(0);
    expect(requests, "the homepage must not fetch a fireworks photo").toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

  test(`the compact archive stays readable without loading event posters at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/whats-on/");
    await page.getByText("Earlier this year", { exact: true }).click();
    await expect(page.locator('[data-past="true"]').filter({ hasText: "Welcome Tea" })).toBeVisible();
    await expect(page.locator('[data-yearview-earlier] img')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
