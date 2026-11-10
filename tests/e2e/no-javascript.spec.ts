import { expect, test } from "@playwright/test";

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("What's On does not link to retired Fireworks with JavaScript disabled", async ({ page }) => {
    await page.goto("/whats-on/");
    await expect(page.locator('a[href*="fireworks"]')).toHaveCount(0);
    await page.goto("/events/fireworks-2026/");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { level: 1, name: "Christmas Fayre" })).toBeVisible();
  });

  test("the build-time archive starts open and toggles with the keyboard without JavaScript or stale appeals", async ({ page }) => {
    await page.goto("/whats-on/");
    const archive = page.locator("[data-past-events-section]");
    await expect(archive).toBeVisible();
    const disclosure = archive.locator("details");
    await expect(disclosure).toHaveAttribute("open", "");
    await archive.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(disclosure).not.toHaveAttribute("open", "");
    await page.keyboard.press("Space");
    await expect(disclosure).toHaveAttribute("open", "");
    await expect(archive.locator(".event-list-item:not([hidden])").first()).toBeVisible();
    await expect(archive.locator(".event-list-actions, .event-list-cta, .event-list-info")).toHaveCount(0);
  });

  test("the homepage still shows a featured event and links to the task routes", async ({ page }) => {
    await page.goto("/");

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(main.getByRole("heading", { level: 1 })).toHaveText(/Christmas Fayre|Fireworks on the Field/);
    await expect(main.getByRole("heading", { name: "Welcome Tea" })).toHaveCount(0);
    await expect(main.getByRole("link", { name: "Christmas Fayre details", exact: true })).toBeVisible();
    await expect(main.getByRole("link", { name: "Christmas Fayre details", exact: true })).toHaveAttribute("href", "/events/christmas-fayre-2026/");
    await expect(main.getByRole("link", { name: "Get involved Roles, meetings" })).toBeVisible();
  });

  test("the primary routes are reachable at a mobile width", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const footer = page.getByRole("navigation", { name: "Footer navigation" });
    for (const name of ["What's On", "Get Involved", "Uniform"]) {
      await expect(footer.getByRole("link", { name })).toBeVisible();
    }
  });
});
