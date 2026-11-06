import { expect, test, type Page } from "@playwright/test";
import { routes } from "./routes";
import { readFileSync } from "node:fs";

const fireworks = JSON.parse(readFileSync(new URL("../../src/content/events/fireworks-2026.json", import.meta.url), "utf8"));

// Emulates 200% text on the narrowest supported screen by doubling every element's computed font size.
// Layout units (rem, px, container widths) are unchanged, so this is a harsher test than a browser text-size setting.
const useLargeText = (page: Page) =>
  page.evaluate(() => {
    const elements = [...document.querySelectorAll<HTMLElement>("body *")];
    const sizes = elements.map((element) => parseFloat(getComputedStyle(element).fontSize));
    elements.forEach((element, index) => element.style.setProperty("font-size", `${sizes[index] * 2}px`, "important"));
  });

// Visible text or boxes that end beyond the viewport, ignoring fixed controls, screen-reader-only text and
// purely decorative elements that are clipped on purpose.
const overflowing = (page: Page) =>
  page.evaluate(() => {
    const limit = document.documentElement.clientWidth + 0.5;
    const found: string[] = [];
    const range = document.createRange();
    for (const element of document.querySelectorAll<HTMLElement>("body *")) {
      if (element.closest(".visually-hidden, [aria-hidden='true'], [class*='fw-torch'], [class*='sparkle']")) continue;
      if (getComputedStyle(element).position === "fixed") continue;
      const box = element.getBoundingClientRect();
      if (box.width > 0 && box.right > limit) found.push(`${element.tagName.toLowerCase()}.${element.className} ends at ${Math.round(box.right)}px`);
      for (const node of element.childNodes) {
        if (node.nodeType !== Node.TEXT_NODE || !node.textContent?.trim()) continue;
        range.selectNodeContents(node);
        if (range.getBoundingClientRect().right > limit) found.push(`text "${node.textContent.trim().slice(0, 30)}" in ${element.tagName.toLowerCase()} ends beyond the screen`);
      }
    }
    return found;
  });

for (const theme of ["day", "night"] as const) {
  test.describe(`${theme} mode, 320px wide, 200% text`, () => {
    test.use({ viewport: { width: 320, height: 800 } });

    test.beforeEach(async ({ page }) => {
      await page.addInitScript((mode) => {
        localStorage.setItem("foa-theme", mode);
        localStorage.setItem("foa-cookie-preferences", "essential");
      }, theme);
    });

    for (const route of routes) {
      test(`${route} has no sideways scrolling and nothing runs off the screen`, async ({ page }) => {
        await page.goto(route);
        await useLargeText(page);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "page scrolls sideways").toBe(true);
        expect(await overflowing(page)).toEqual([]);
      });
    }

    test("footer links stay on screen and the columns stack when they cannot sit side by side", async ({ page }) => {
      await page.goto("/");
      await useLargeText(page);
      const rights = await page.locator(".footer-links a").evaluateAll((links) => links.map((link) => link.getBoundingClientRect().right));
      expect(Math.max(...rights)).toBeLessThanOrEqual(320);
      const columns = await page.locator(".footer-link-column").evaluateAll((items) => items.map((item) => item.getBoundingClientRect().top));
      expect(columns[1], "second column sits below the first").toBeGreaterThan(columns[0]);
    });

    test("Reps Hub headings wrap inside their own cards with wider text", async ({ page }) => {
      await page.clock.setFixedTime(new Date(Date.parse(fireworks.start) - 86400000));
      await page.goto("/reps/");
      await useLargeText(page);
      expect(await page.locator(".message-card h2").count()).toBeGreaterThan(0);
      // Keep the long-word regression reproducible across platform font metrics.
      await page.locator(".message-card h2").evaluateAll((headings) => {
        headings.forEach((heading) => (heading as HTMLElement).style.letterSpacing = "0.06em");
      });
      for (const heading of await page.locator(".message-card h2").all()) {
        const bounds = await heading.evaluate((element) => {
          const column = element.getBoundingClientRect();
          const range = document.createRange();
          range.selectNodeContents(element);
          return { left: column.left, right: column.right,
            lines: [...range.getClientRects()].map(({ left, right }) => ({ left, right })) };
        });
        expect(bounds.lines.length).toBeGreaterThan(0);
        for (const line of bounds.lines) {
          expect(line.left).toBeGreaterThanOrEqual(bounds.left - 0.5);
          expect(line.right).toBeLessThanOrEqual(bounds.right + 0.5);
        }
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });

    test("General information sections fit inside their column", async ({ page }) => {
      await page.goto("/get-involved/");
      await useLargeText(page);
      const blocks = page.locator(".view-hero, .content-section .site-width");
      expect(await blocks.count()).toBeGreaterThan(0);
      const rights = await blocks.evaluateAll((items) => items.map((item) => item.getBoundingClientRect().right));
      for (const right of rights) expect(right).toBeLessThanOrEqual(320);
      const spill = await blocks.evaluateAll((items) =>
        items.flatMap((item) => {
          const edge = item.getBoundingClientRect().right;
          return [...item.querySelectorAll("h2, p, li, dd, dt, span")].filter((inner) => inner.getBoundingClientRect().right > edge + 0.5).map((inner) => inner.textContent?.trim().slice(0, 30));
        }));
      expect(spill, "text that runs past the parchment edge").toEqual([]);
    });

    test("Christmas Fayre When, Where and Led by rows wrap instead of clipping", async ({ page }) => {
      await page.goto("/events/christmas-fayre-2026/");
      await useLargeText(page);
      const rights = await page.locator(".xmas-facts dd, .xmas-facts dd *").evaluateAll((items) => items.map((item) => item.getBoundingClientRect().right));
      expect(Math.max(...rights)).toBeLessThanOrEqual(320);
      const button = page.locator(".xmas-actions .button").first();
      const radius = await button.evaluate((element) => parseFloat(getComputedStyle(element).borderTopLeftRadius));
      const height = await button.evaluate((element) => element.getBoundingClientRect().height);
      expect(radius, "a button that wraps onto several lines is a rounded box, not an oval").toBeLessThan(height / 2);
    });

    test("About panel and its buttons stay inside the panel without breaking words", async ({ page }) => {
      await page.goto("/about/");
      await useLargeText(page);
      const panel = await page.locator(".impact-callout").evaluate((element) => element.getBoundingClientRect().right);
      const buttons = await page.locator(".impact-callout .button").evaluateAll((items) =>
        items.map((item) => ({ right: item.getBoundingClientRect().right, fits: item.scrollWidth <= item.clientWidth })));
      expect(buttons.length).toBeGreaterThan(0);
      for (const button of buttons) {
        expect(button.right).toBeLessThanOrEqual(panel);
        expect(button.fits).toBe(true);
      }
      const fundraising = await page.getByRole("link", { name: /See Our Fundraising Plans/ }).evaluate((element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        return [...range.getClientRects()].every((rect) => rect.right <= element.getBoundingClientRect().right + 0.5);
      });
      expect(fundraising).toBe(true);
    });
  });
}
