import { test, expect } from "@playwright/test";

// 20 November 2026: Nick's phone caught the Supporters hero showing three
// empty white boxes mid-load on a slow connection. Logos and tiles now stay
// invisible until their bytes arrive, then fade in, so a slow load never
// reads as broken. Failed images are revealed so their alt text still shows,
// and without scripting images render normally.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("foa-theme", "night");
    localStorage.setItem("foa-cookie-preferences", "essential");
  });
});

const tile = (page: import("@playwright/test").Page) =>
  page.locator('img.narnia-landscape__supporters-tile[src*="w3-colour.svg"]');

test("a stuck hero tile never paints as an empty box, then fades in", async ({ page }) => {
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/sponsors/w3-colour.svg", async (route) => {
    await gate;
    await route.continue();
  });
  // domcontentloaded: the stuck image holds back the full load event by design.
  await page.goto("/christmas-fayre-supporters/", { waitUntil: "domcontentloaded" });
  // The stuck tile is invisible - no white box - while its neighbours show.
  await expect(tile(page)).toHaveCSS("opacity", "0");
  await expect(
    page.locator('img.narnia-landscape__supporters-tile[src*="glitter-tree.webp"]'),
  ).toHaveCSS("opacity", "1");
  release();
  await expect(tile(page)).toHaveCSS("opacity", "1");
});

test("a failed image is revealed so its alt text shows instead of a void", async ({ page }) => {
  await page.route("**/sponsors/w3-colour.svg", (route) => route.abort());
  await page.goto("/christmas-fayre-supporters/");
  await expect(tile(page)).toHaveClass(/is-loaded/);
  await expect(tile(page)).toHaveCSS("opacity", "1");
});

test("without scripting every image renders normally", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/christmas-fayre-supporters/");
  await expect(tile(page)).toHaveCSS("opacity", "1");
  await context.close();
});

test("a stuck sponsor logo never leaves an empty painted capsule", async ({ page }) => {
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/sponsors/martin-flashman.png", async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto("/christmas-fayre-supporters/", { waitUntil: "domcontentloaded" });
  const well = page.locator(".fayre-lead__well");
  // The dark capsule is unpainted while its logo is pending.
  await expect(well).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  release();
  await expect(well).toHaveCSS("background-color", "rgb(16, 45, 56)");
  await expect(well.locator("img")).toHaveCSS("opacity", "1");
});

test("a stuck committee portrait never leaves an empty painted frame", async ({ page }) => {
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(/\/committee\/[^/]+\.(jpg|jpeg|png|webp|avif)/, async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto("/committee/", { waitUntil: "domcontentloaded" });
  const frame = page.locator(".member-photo").first();
  await frame.scrollIntoViewIfNeeded();
  await expect(frame).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  release();
  await expect(frame.locator("img")).toHaveClass(/is-loaded/);
  await expect(frame).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
});

test("loaded brand logos fade in on an ordinary page", async ({ page }) => {
  await page.goto("/committee/");
  const portrait = page.locator(".member-photo img").first();
  // Lazy below the fold: bring it into view so the browser fetches it.
  await portrait.scrollIntoViewIfNeeded();
  await expect(portrait).toHaveClass(/is-loaded/);
  await expect(portrait).toHaveCSS("opacity", "1");
});
