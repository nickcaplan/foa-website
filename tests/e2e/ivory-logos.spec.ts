import { expect, test } from "@playwright/test";

const routes = [
  ["/", "foa-logo-ivory.svg"],
  ["/uniform/", "foa-logo-uniform-ivory.svg"],
  ["/events/christmas-fayre-2026/", "foa-logo-christmas-ivory.svg"],
  ["/newsletter/", "foa-logo-ivory.svg"],
];

for (const width of [390, 1440]) {
  test(`ivory artwork loads and retains responsive branding in both modes at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const [route, artwork] of routes) {
      await page.goto(route);
      await page.evaluate(() => document.documentElement.removeAttribute("data-theme"));
      const logo = page.locator(width < 1024 ? (route === "/" ? ".homepage-mobile-identity img" : ".mobile-page-logo:visible img") : ".site-header .home-introduction img");
      await expect(logo).toBeVisible();
      expect(await logo.getAttribute("src")).toContain(`/brand/${artwork}`);
      await expect(logo).toHaveJSProperty("complete", true);
      expect(await logo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
      const day = await logo.boundingBox();
      expect(day).not.toBeNull();
      if (artwork === "foa-logo-ivory.svg") {
        await expect(logo).not.toHaveClass(/brand-logo--festive/);
        // Every page's mobile heading logo is the shared 128px, sitting beside the heading.
        expect(day!.width).toBeCloseTo(width < 1024 ? (route === "/" ? 48 : 128) : 112, 0);
      }
      await page.evaluate(() => document.documentElement.setAttribute("data-theme", "night"));
      expect(await logo.boundingBox()).toEqual(day);
      expect(await logo.getAttribute("src")).toContain(`/brand/${artwork}`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
      const footer = page.locator("footer img").first();
      // Only the Christmas Fayre page uses its own logo in the footer.
      expect(await footer.getAttribute("src")).toContain(route.includes("christmas-fayre") ? `/brand/${artwork}` : "/brand/foa-logo-ivory.svg");
    }
  });
}
