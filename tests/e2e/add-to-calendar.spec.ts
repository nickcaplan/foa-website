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

const fireworksSummary = "An early quiet display, the main spectacular and an evening of food, games and family fun.";
const fayreSummary = "Led by Rachel Briscoe (Squirrel and Otter) and Sophie Glass (Fox).";

test.describe("Add to calendar", () => {
  test("the Fireworks page offers Google and the iCal download with exact times", async ({ page }) => {
    await page.goto("/events/fireworks-2026/");
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(canonical).toBeTruthy();

    const google = googleLink(page);
    await expect(google).toBeVisible();
    const googleHref = (await google.getAttribute("href"))!;
    expect(new URL(googleHref).origin + new URL(googleHref).pathname).toBe("https://calendar.google.com/calendar/render");
    const g = new URL(googleHref).searchParams;
    expect(g.get("action")).toBe("TEMPLATE");
    expect(g.get("text")).toBe("Fireworks on the Field");
    expect(g.get("dates")).toBe("20261105T163000Z/20261105T183000Z");
    expect(g.get("location")).toBe("Ashley School field, Ashley Road, Walton-on-Thames KT12 1HX");
    expectDetails(googleHref, fireworksSummary, canonical!);

    // Outlook was offered briefly, then Nick chose Google or iCal only (25 October 2026).
    await expect(page.getByRole("link", { name: /Outlook/ })).toHaveCount(0);

    // Nick's 25 October steering: one shared calendar icon for the cluster, no
    // per-link icons, and both choices carry an underline as the link signal.
    const cluster = page.locator(".add-calendar");
    await expect(cluster.locator(".calendar-icon")).toHaveCount(1);
    await expect(cluster.locator(".external-link-icon")).toHaveCount(0);
    await expect(google).toHaveCSS("text-decoration-line", /underline/);
    await expect(fileLink(page)).toHaveCSS("text-decoration-line", /underline/);

    const download = fileLink(page);
    await expect(download).toBeVisible();
    await expect(download).toHaveAttribute("href", /\/calendar\/fireworks-2026\.ics$/);
    // Nick asked on 25 October 2026 for the link to open the calendar app rather
    // than force a file save: no download attribute, so the browser/OS calendar
    // handler decides (Safari on iPhone shows the add-event sheet).
    expect(await download.getAttribute("download")).toBeNull();

    const ics = await fetchIcs(page, "/calendar/fireworks-2026.ics");
    expect(ics).toContain("SUMMARY:Fireworks on the Field");
    expect(ics).toContain("DTSTART:20261105T163000Z");
    expect(ics).toContain("DTEND:20261105T183000Z");
    expect(ics).toContain("LOCATION:Ashley School field\\, Ashley Road\\, Walton-on-Thames KT12 1HX");
    expect(ics).toContain("STATUS:CONFIRMED");
    expect(ics.replace(/\r\n[ \t]/g, "")).toContain(`URL:${canonical}`);
  });

  test("the Christmas Fayre page offers the same choices with its confirmed start and finish", async ({ page }) => {
    await page.goto("/events/christmas-fayre-2026/");
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");

    await expect(page.locator(".xmas-facts")).toContainText("12:00-15:00");
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
    // Fireworks, Santa's Grotto and both Happy Bags dates are upcoming.
    await expect(googleLink(page)).toHaveCount(4);
    await expect(page.getByRole("link", { name: /Outlook/ })).toHaveCount(0);
    const downloads = fileLink(page);
    await expect(downloads).toHaveCount(4);
    const hrefs = await downloads.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")));
    expect(hrefs).toEqual([
      "/calendar/fireworks-2026.ics",
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
