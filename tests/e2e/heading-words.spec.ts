import { expect, test } from "@playwright/test";
import { routes } from "./routes";

// Every heading word must wrap whole: no mid-word splits from overflow-wrap, at
// phone widths with real text zoom (growing the root font size, which also grows
// rem-based layout the way iOS text sizing does). Hyphenated words may still
// break at their hyphens, so each hyphen-separated part is checked on its own.
const splitWords = () => {
  const broken: string[] = [];
  for (const heading of document.querySelectorAll("main h1, main h2, main h3, main .newsletter-summary-label")) {
    if (heading.closest(".visually-hidden, [aria-hidden='true']")) continue;
    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      for (const match of (node.textContent ?? "").matchAll(/[^\s-]+-?/g)) {
        // matchAll always sets index, so the non-null assertions are safe.
        range.setStart(node, match.index!);
        range.setEnd(node, match.index! + match[0].length);
        if (range.getClientRects().length > 1) broken.push(`${heading.tagName} "${match[0]}" in ${heading.textContent?.trim().slice(0, 40)}`);
      }
    }
  }
  return broken;
};

for (const theme of ["day", "night"] as const) {
  for (const width of [320, 360, 390]) {
    for (const scale of [1, 2]) {
      test.describe(`${theme} mode, ${width}px wide, ${scale * 100}% text`, () => {
        test.use({ viewport: { width, height: 850 } });

        test.beforeEach(async ({ page }) => {
          await page.addInitScript((mode) => {
            localStorage.setItem("foa-theme", mode);
            localStorage.setItem("foa-cookie-preferences", "essential");
          }, theme);
        });

        for (const route of routes) {
          test(`${route} heading words never split mid-word`, async ({ page }) => {
            await page.goto(route);
            await page.evaluate(() => document.fonts.ready);
            if (scale === 2) await page.evaluate(() => { document.documentElement.style.fontSize = "32px"; });
    // Doubling the root em mirrors iOS text-size zoom: every rem-based length
    // (type, padding, grid gaps) grows together, which is what splits words.
            expect(await page.evaluate(splitWords), "heading words split across lines").toEqual([]);
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "page scrolls sideways").toBe(true);
          });
        }
      });
    }
  }
}
