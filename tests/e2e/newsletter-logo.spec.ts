import { expect, test } from "@playwright/test";

// Approved 17th October 2026: the Newsletter page uses the standard site logo
// (no envelope variant) at the standard size and position, like every other
// page. These tests guard against the envelope artwork coming back.
test.describe("Newsletter standard logo", () => {
  test.use({ javaScriptEnabled: false });

  for (const width of [320, 390, 1440]) {
    test(`the standard logo is used without JavaScript at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/newsletter/");
      const logo = page.locator(width < 1024 ? ".mobile-page-logo img" : ".site-header .brand-logo");
      await expect(logo).toBeVisible();
      await expect(logo).toHaveAttribute("src", /\/brand\/foa-logo-ivory\.svg$/);
      await expect(page.locator('img[src*="foa-logo-newsletter-ivory"]')).toHaveCount(0);
      const bounds = await logo.boundingBox();
      expect(bounds).not.toBeNull();
      await page.goto("/about/");
      const standard = await page.locator(width < 1024 ? ".mobile-page-logo img" : ".site-header .brand-logo").boundingBox();
      expect(bounds!.width).toBeCloseTo(standard!.width, 0);
      expect(bounds!.x).toBeCloseTo(standard!.x, 0);
      expect(bounds!.y).toBeCloseTo(standard!.y, 0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    });
  }

  // Desktop menu shows from 80rem (1280px) after the single-row nav change
  // (approved 18 October 2026); at 1024px the menu button shows instead.
  for (const width of [1280, 1440]) {
    test(`desktop branding and navigation stay aligned when opening Newsletter at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const measure = async () => {
        await page.evaluate(() => document.fonts.ready);
        return page.locator(".site-header").evaluate((header) => {
          const bounds = (selector: string) => {
            const { x, y, width, height } = header.querySelector(selector)!.getBoundingClientRect();
            return { x, y, width, height };
          };
          return {
            branding: bounds(".home-introduction p"),
            navigation: bounds(".desktop-nav"),
            firstLink: bounds(".desktop-nav a"),
            theme: bounds(".header-theme-toggle"),
            row: bounds(".header-inner"),
          };
        });
      };
      await page.goto("/uniform/");
      const standard = await measure();
      await page.locator(".desktop-nav").getByRole("link", { name: "Newsletter", exact: true }).click();
      await expect(page).toHaveURL(/\/newsletter\/$/);
      const newsletter = await measure();
      for (const key of ["branding", "navigation", "firstLink", "theme", "row"] as const) {
        for (const dimension of ["x", "y", "width", "height"] as const) {
          expect(newsletter[key][dimension], `${key} ${dimension}`).toBeCloseTo(standard[key][dimension], 1);
        }
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
      await page.locator(".desktop-nav").getByRole("link", { name: "Uniform", exact: true }).click();
      expect(await measure()).toEqual(standard);
    });
  }
});

test("the newsletter mobile menu also uses the standard logo", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/newsletter/");
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  const logo = page.locator(".mobile-menu-logo");
  await expect(logo).toBeVisible();
  await expect(logo).toHaveAttribute("src", /\/brand\/foa-logo-ivory\.svg$/);
});
