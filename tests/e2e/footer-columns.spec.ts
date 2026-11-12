import { expect, test } from "@playwright/test";

const columnsOf = async (page: import("@playwright/test").Page) =>
  page.locator(".footer-links a").evaluateAll((links) => {
    const boxes = links.map((link) => link.getBoundingClientRect());
    const lefts = [...new Set(boxes.map((box) => Math.round(box.left)))];
    const perColumn = lefts.map((left) => boxes.filter((box) => Math.round(box.left) === left).length);
    const heights = [...new Set(boxes.map((box) => Math.round(box.height)))];
    return { lefts, perColumn, heights, maxRight: Math.max(...boxes.map((box) => box.right)) };
  });

for (const width of [1280, 1440, 1920]) {
  test(`footer links sit in three balanced one-line columns at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => localStorage.setItem("foa-cookie-preferences", "essential"));
    await page.goto("/");
    const result = await columnsOf(page);
    expect(result.perColumn).toEqual([4, 4, 4]);
    expect(result.heights, "every link stays on one line so the rows line up").toHaveLength(1);
    expect(result.maxRight).toBeLessThanOrEqual(width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("footer links keep two columns on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.addInitScript(() => localStorage.setItem("foa-cookie-preferences", "essential"));
  await page.goto("/");
  expect((await columnsOf(page)).perColumn).toEqual([7, 5]);
});
