import { expect, test, type Page } from "@playwright/test";

// #171 #179 #180 #181 #184 #185: at browser-enlarged text (200%), words must
// never break mid-word on the pages the word-split issues covered.
//
// This emulates a real browser text-size setting by scaling the root font
// size: rem/em-based layout grows while px layout stays fixed, which is what
// Chrome's text scaling does. (large-text-narrow.spec.ts uses a harsher
// per-element doubling and checks overflow, not mid-word breaks.)

const pages = ["/", "/fundraising/", "/get-involved/"];

const splitWords = (page: Page) =>
  page.evaluate(() => {
    const found: string[] = [];
    const range = document.createRange();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent || ["SCRIPT", "STYLE", "NOSCRIPT", "SVG"].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
        if (parent.closest(".visually-hidden, [aria-hidden='true']")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const nodes: Text[] = [];
    let node = walker.nextNode();
    while (node) {
      nodes.push(node as Text);
      node = walker.nextNode();
    }
    for (const text of nodes) {
      for (const match of text.textContent.matchAll(/\S+/g)) {
        const word = match[0];
        // Hyphenated words (set-up) may wrap at their hyphen; that is fine.
        if (word.includes("-")) continue;
        range.setStart(text, match.index!);
        range.setEnd(text, match.index! + word.length);
        const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
        const lines = new Set(rects.map((r) => Math.round(r.y)));
        if (lines.size >= 2) {
          const owner = text.parentElement;
          const where = owner ? `${owner.tagName.toLowerCase()}.${String(owner.className).split(" ")[0]}` : "?";
          if (!found.some((f) => f.startsWith(`"${word}"`))) found.push(`"${word}" in ${where} breaks across ${lines.size} lines`);
        }
      }
    }
    return found;
  });

for (const width of [320, 390]) {
  for (const rootFont of [16, 32]) {
    test.describe(`${width}px wide, root font ${rootFont}px`, () => {
      test.use({ viewport: { width, height: 800 } });

      test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
          localStorage.setItem("foa-cookie-preferences", "essential");
        });
      });

      for (const path of pages) {
        test(`${path} keeps every word whole`, async ({ page }) => {
          await page.goto(path);
          await page.evaluate((size) => {
            document.documentElement.style.fontSize = `${size}px`;
          }, rootFont);
          // Open the mobile menu so its links are checked too.
          await page
            .locator("[data-menu-toggle]")
            .first()
            .click()
            .catch(() => {});
          await page.waitForTimeout(150);
          expect(await splitWords(page)).toEqual([]);
          const docOverflow = await page.evaluate(
            () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
          );
          expect(docOverflow, "page is wider than the screen").toBe(false);
        });
      }
    });
  }
}
