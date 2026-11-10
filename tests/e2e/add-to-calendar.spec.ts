import { expect, test, type Page } from "@playwright/test";

const googleLink = (page: Page) => page.getByRole("link", { name: "Google (opens in a new tab)" });
const fileLink = (page: Page) => page.getByRole("link", { name: "iCal" });

const fetchIcs = async (page: Page, path: string) => {
  const response = await page.request.get(path);
  expect(response.status(), `Fetching ${path} must succeed`).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/calendar");
  return response.text();
};

// The details body mirrors the ICS description and points at the live canonical page.
const expectDetails = (href: string, summary: string, canonical: string) => {
  const url = new URL(href);
  const details = url.searchParams.get("details") ?? url.searchParams.get("body");
  expect(details).toBe(`${summary}\n\nDetails: ${canonical}`);
};

const fayreSummary = "Led by Rachel Briscoe (Squirrel and Otter) and Sophie Glass (Fox).";

test.describe("Add to calendar", () => {
  test("retired Fireworks page has no calendar CTA but preserves its historical ICS", async ({ page }) => {
    await page.goto("/events/fireworks-2026/");
    const canonical = new URL("/events/fireworks-2026/", (await page.locator('link[rel="canonical"]').getAttribute("href"))!).href;
    await expect(googleLink(page)).toHaveCount(0);await expect(fileLink(page)).toHaveCount(0);
    await expect(page.getByRole("heading",{level:1,name:"Christmas Fayre"})).toBeVisible();
    const ics = await fetchIcs(page, "/calendar/fireworks-2026.ics");
    for(const value of ["SUMMARY:Fireworks on the Field","DTSTART:20261105T163000Z","DTEND:20261105T183000Z","STATUS:CONFIRMED"])expect(ics).toContain(value);
    expect(ics.replace(/\r\n[ \t]/g, "")).toContain(`URL:${canonical}`);
  });

  test("the Christmas Fayre page offers the same choices with its confirmed start and finish", async ({ page }) => {
    await page.goto("/events/christmas-fayre-2026/");
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");

    await expect(page.locator(".narnia-landscape__date")).toContainText("12:00 - 15:00");
    const eventData = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
    expect(eventData.startDate).toBe("2026-12-05T12:00:00.000Z");
    expect(eventData.endDate).toBe("2026-12-05T15:00:00.000Z");
    const g = new URL((await googleLink(page).getAttribute("href"))!).searchParams;
    expect(g.get("text")).toBe("Christmas Fayre");
    expect(g.get("dates")).toBe("20261205T120000Z/20261205T150000Z");
    expect(g.get("ctz")).toBe("Europe/London");

    expectDetails((await googleLink(page).getAttribute("href"))!, fayreSummary, canonical!);

    const ics = await fetchIcs(page, "/calendar/christmas-fayre-2026.ics");
    expect(ics).toContain("DTSTART:20261205T120000Z");
    expect(ics).toContain("DTEND:20261205T150000Z");
    expect(ics).toContain("STATUS:TENTATIVE");
  });

  test("What's On offers the service choices for upcoming events and never for past events", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-11-04T12:00:00Z"));
    await page.goto("/whats-on/");
    // Retired Fireworks is excluded; Santa's Grotto and both Happy Bags dates remain upcoming.
    await expect(googleLink(page)).toHaveCount(3);
    await expect(page.getByRole("link", { name: /Outlook/ })).toHaveCount(0);
    const downloads = fileLink(page);
    await expect(downloads).toHaveCount(3);
    const hrefs = await downloads.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")));
    expect(hrefs).toEqual([
      "/calendar/santas-grotto-2026.ics",
      "/calendar/happy-bags-january-2027.ics",
      "/calendar/happy-bags-april-2027.ics",
    ]);
    for (const link of await downloads.all()) expect(await link.getAttribute("download")).toBeNull();
    // Santa's Grotto is an all-day event: Google gets whole UK dates with an exclusive end.
    const grottoRow = page.locator(".event-list-item", { hasText: "Santa's Grotto" });
    const g = new URL((await grottoRow.getByRole("link", { name: "Google (opens in a new tab)" }).getAttribute("href"))!).searchParams;
    expect(g.get("dates")).toBe("20261214/20261215");
    // Rows that are one whole link (Christmas Fayre, uniform sales) cannot nest calendar links.
    await expect(page.locator("a.event-list-item", { hasText: "Christmas Fayre" }).getByRole("link", { name: "Google (opens in a new tab)" })).toHaveCount(0);
  });

  test("all-day events download a whole-day UK calendar entry", async ({ page }) => {
    const ics = await fetchIcs(page, "/calendar/happy-bags-january-2027.ics");
    expect(ics).toContain("DTSTART;VALUE=DATE:20270113");
    expect(ics).toContain("DTEND;VALUE=DATE:20270114");
  });

  test("timed sales keep their exact minutes", async ({ page }) => {
    const ics = await fetchIcs(page, "/calendar/uniform-november-2026.ics");
    expect(ics).toContain("DTSTART:20261106T152500Z");
    expect(ics).toContain("DTEND:20261106T154500Z");
  });
});
