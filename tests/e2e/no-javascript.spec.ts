import { expect, test } from "@playwright/test";

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("a parent can still find the Fireworks details from What's On", async ({ page }) => {
    await page.goto("/whats-on/");

    const fireworks = page.getByRole("link", { name: /Fireworks on the Field/ });
    await expect(fireworks).toBeVisible();
    await fireworks.click();

    await expect(page.getByRole("heading", { level: 1, name: "Fireworks on the Field" })).toBeVisible();
    await expect(page.locator(".event-summary").getByText("16:30-18:30", { exact: true })).toBeVisible();
  });

  test("the build-time archive opens with the keyboard without JavaScript or stale appeals", async ({ page }) => {
    await page.goto("/whats-on/");
    const archive = page.locator("[data-past-events-section]");
    await expect(archive).toBeVisible();
    const disclosure = archive.locator("details");
    await expect(disclosure).not.toHaveAttribute("open", "");
    await archive.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(disclosure).toHaveAttribute("open", "");
    await expect(archive.locator(".event-list-item:not([hidden])").first()).toBeVisible();
    await expect(archive.locator(".event-list-actions, .event-list-cta, .event-list-info")).toHaveCount(0);
  });

  test("the homepage still shows a featured event and links to the task routes", async ({ page }) => {
    await page.goto("/");

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1, name: "Fireworks on the Field" })).toBeVisible();
    await expect(main.getByRole("heading", { name: "Welcome Tea" })).toHaveCount(0);
    await expect(main.getByRole("link", { name: "Volunteer at Fireworks" })).toBeVisible();
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
