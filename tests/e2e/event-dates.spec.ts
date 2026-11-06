import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const welcomeTea = JSON.parse(readFileSync(new URL("../../src/content/events/welcome-tea-2026.json", import.meta.url), "utf8"));
const archiveTime = Date.parse(welcomeTea.archiveFrom);

// Welcome Tea starts at 13:00 BST (12:00 UTC) on 2026-10-03 and archives from then; Fireworks is on 2026-11-05.
const lastMomentOfWelcomeTea = new Date(archiveTime - 30_000).toISOString();
const firstMomentAfterWelcomeTea = new Date(archiveTime).toISOString();

const openAt = async (page: Page, isoTime: string, path: string) => {
  // Only freeze Date: event rules do not need mocked animation or interval timers.
  await page.clock.setFixedTime(new Date(isoTime));
  const response = await page.goto(path);
  expect(response?.status(), `Navigation to ${path} at ${isoTime} must succeed`).toBe(200);
};

const homepageWelcomeTea = (page: Page) =>
  page.getByRole("main").getByRole("heading", { level: 2, name: "Welcome Tea" });
const homepageChristmas = (page: Page) =>
  page.getByRole("main").getByRole("heading", { level: 1, name: "The Ashley Christmas Fayre" });

test.describe("Permanent Christmas homepage across former Fireworks switch", () => {
 for (const timezoneId of ["Europe/London", "America/Los_Angeles"]) test.describe(timezoneId, () => {
  test.use({timezoneId});
  for(const offset of [-1,0,1000]) test(`boundary ${offset}`,async({page})=>{
   await page.route("**/*",route=>route.request().resourceType()==="script"?route.abort():route.continue());
   await openAt(page,new Date(Date.parse("2026-11-05T21:00:00Z")+offset).toISOString(),"/");
   await expect(homepageChristmas(page)).toBeVisible();
   await expect(page.locator('[data-homepage-fireworks]')).toHaveCount(0);
   await expect(homepageWelcomeTea(page)).toHaveCount(0);
  });
  test("an open homepage stays Christmas across the former boundary",async({page})=>{
   await page.clock.install({time:new Date("2026-11-05T20:59:59Z")});await page.goto("/");
   await expect(homepageChristmas(page)).toBeVisible();await page.clock.runFor(1000);await expect(homepageChristmas(page)).toBeVisible();
   await expect(page.locator('[data-homepage-fireworks]')).toBeHidden();
  });
 });
});

test.describe("What's On event sections (UK time)", () => {
  test.use({ timezoneId: "Europe/London" });

  const welcomeTeaListItem = (page: Page) =>
    page.locator('[data-past="false"]').filter({ hasText: welcomeTea.title });
  const pastEvents = (page: Page) => page.locator("[data-past-events-section]");

  for (const offset of [-1000, 0]) {
    test(`sets event visibility without downloaded JavaScript ${offset < 0 ? "before" : "at"} the archive boundary`, async ({ page }) => {
      // A blocked module represents an arbitrarily slow script download.
      // The parser-time inline check must still correct a stale build.
      await page.route("**/*", (route) => route.request().resourceType() === "script" ? route.abort() : route.continue());
      await openAt(page, new Date(archiveTime + offset).toISOString(), "/whats-on/");
      await expect(welcomeTeaListItem(page)).toHaveJSProperty("hidden", offset >= 0);
      const archived = pastEvents(page).locator('[data-past="true"]').filter({ hasText: welcomeTea.title });
      await expect(archived).toHaveJSProperty("hidden", offset < 0);
      const fireworks = page.locator('[data-past="false"]').filter({ hasText: "Fireworks on the Field" });
      await expect(fireworks).toHaveCount(0);
    });
  }

  test("lists Welcome Tea as upcoming before its archive date", async ({ page }) => {
    await openAt(page, lastMomentOfWelcomeTea, "/whats-on/");

    await expect(welcomeTeaListItem(page)).toBeVisible();
    await expect(pastEvents(page).locator('[data-past="true"]').filter({ hasText: welcomeTea.title })).toHaveJSProperty("hidden", true);
  });

  test("moves Welcome Tea to past events when it starts at 1pm", async ({ page }) => {
    await openAt(page, firstMomentAfterWelcomeTea, "/whats-on/");

    await expect(welcomeTeaListItem(page)).toBeHidden();
    await expect(pastEvents(page)).toBeVisible();
    await expect(pastEvents(page).locator("details")).toHaveAttribute("open", "");
    await expect(pastEvents(page).getByRole("heading", { name: "Welcome Tea" })).toBeVisible();
  });

  test("does not resurrect retired Fireworks with a historical device clock", async ({ page }) => {
    await openAt(page, firstMomentAfterWelcomeTea, "/whats-on/");

    await expect(page.locator('[data-past="false"]').filter({ hasText: "Fireworks on the Field" })).toHaveCount(0);
  });

  test("hides a timed event at its confirmed end time", async ({ page }) => {
    const sale = JSON.parse(readFileSync(new URL("../../src/content/events/uniform-november-2026.json", import.meta.url), "utf8"));
    const end = Date.parse(sale.end ?? sale.start);
    const novemberSale = page.locator('[data-month-key="2026-11"] .event-list-item').filter({ hasText: sale.title });

    await openAt(page, new Date(end - 30_000).toISOString(), "/whats-on/");
    await expect(novemberSale).toBeVisible();

    await openAt(page, new Date(end).toISOString(), "/whats-on/");
    await expect(novemberSale).toBeHidden();
  });

  test("lists Santa's Grotto without a time and hides it after 14th December", async ({ page }) => {
    const grotto = page.locator('[data-past="false"]').filter({ hasText: "Santa's Grotto" });

    await openAt(page, "2026-12-14T23:59:00Z", "/whats-on/");
    await expect(grotto).toBeVisible();
    await expect(grotto).toContainText("Monday 14th December · Ashley School");

    await openAt(page, "2026-12-15T00:00:00Z", "/whats-on/");
    await expect(grotto).toBeHidden();
  });
});

test.describe("Today and Tomorrow labels use UK time, not the visitor's timezone", () => {
  const saleLabel = (page: Page) =>
    page.locator('[data-month-key="2026-11"] [data-past="false"]').filter({ hasText: "Pre-loved uniform sale" }).locator(".relative-date");

  test.describe("behind the UK", () => {
    test.use({ timezoneId: "America/Los_Angeles" });

    test("shows Today on the UK event day even though it is still the day before locally", async ({ page }) => {
      await openAt(page, "2026-11-06T01:00:00Z", "/whats-on/");

      await expect(saleLabel(page)).toHaveText("Today");
    });
  });

  test.describe("ahead of the UK", () => {
    test.use({ timezoneId: "Pacific/Auckland" });

    test("shows Tomorrow on the UK day before even though it is already the event day locally", async ({ page }) => {
      await openAt(page, "2026-11-05T12:00:00Z", "/whats-on/");

      await expect(saleLabel(page)).toHaveText("Tomorrow");
    });
  });
});
