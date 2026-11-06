import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { routes } from "./routes";

test("every public page in the build is covered by the accessibility scans", () => {
  // Active pages are discovered; both retired URLs have separate redirect checks.
  expect(routes.length).toBeGreaterThan(0);
  expect(new Set(routes).size).toBe(routes.length);
  for (const retired of ["/events/fireworks-2026/", "/fireworks-volunteering/"]) expect(routes).not.toContain(retired);
  expect(routes).toContain("/");
  expect(routes).toContain("/404.html");
});

for (const route of routes) {
  test(`${route} has no serious or critical accessibility violations`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    const violations = results.violations.filter(({ impact }) =>
      impact === "serious" || impact === "critical"
    );

    expect(violations).toEqual([]);
  });
}

test("expanded newsletters have no serious or critical accessibility violations", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto("/newsletter/");
  for (const id of ["newsletter-latest-more", "newsletter-back-to-school-2026-more"]) {
    await page.locator(`[aria-controls="${id}"]`).click();
  }
  await expect(page.getByRole("button", { name: /Show less/ })).toHaveCount(2);
  await page.waitForFunction(() => document.getAnimations().length === 0);

  const results = await new AxeBuilder({ page })
    .include(".newsletter-board")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const violations = results.violations.filter(({ impact }) =>
    impact === "serious" || impact === "critical"
  );

  expect(violations).toEqual([]);
});

test("the reading room selector and an expanded older issue are accessible", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/newsletter/");
  await page.getByRole("navigation", { name: "Newsletter issues" }).getByRole("link").nth(1).click();
  await page.locator(".newsletter-reading-board .newsletter-read-more:visible").click();
  const results = await new AxeBuilder({ page })
    .include(".newsletter-page")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
});

test.describe("mobile viewport", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  const scan = (page: Page) =>
    new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
  const seriousOrCritical = (results: Awaited<ReturnType<typeof scan>>) =>
    results.violations.filter(({ impact }) => impact === "serious" || impact === "critical");

  for (const route of routes) {
    test(`${route} has no serious or critical violations and does not scroll sideways`, async ({ page }) => {
      await page.goto(route);

      await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeHidden();
      const menuButton = page.getByRole("button", { name: "Open menu" });
      await expect(menuButton).toBeVisible();
      const target = await menuButton.boundingBox();
      expect(target).not.toBeNull();
      expect(target!.width).toBeGreaterThanOrEqual(44);
      expect(target!.height).toBeGreaterThanOrEqual(44);
      expect(seriousOrCritical(await scan(page))).toEqual([]);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test("the open mobile menu has no serious or critical violations", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();

    expect(seriousOrCritical(await scan(page))).toEqual([]);
  });
});
