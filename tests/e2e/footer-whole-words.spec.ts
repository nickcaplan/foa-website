import { expect, test, type Page } from "@playwright/test";

// The shared footer keeps every word whole at 320px and 390px with enlarged text, in both themes.
// Per-element doubling doubles each element's computed font size (layout units stay put, so it is the harsher test);
// root doubling is what a browser text-size setting does.
const doubleElements = (page: Page) =>
  page.evaluate(() => {
    const elements = [...document.querySelectorAll<HTMLElement>("body *")];
    const sizes = elements.map((element) => parseFloat(getComputedStyle(element).fontSize));
    elements.forEach((element, index) => element.style.setProperty("font-size", `${sizes[index] * 2}px`, "important"));
  });
const doubleRoot = (page: Page) => page.evaluate(() => document.documentElement.style.setProperty("font-size", "200%", "important"));

const splitWords = (page: Page) =>
  page.evaluate(() => {
    const found: string[] = [];
    const walker = document.createTreeWalker(document.querySelector(".site-footer")!, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent ?? "";
      // A hyphenated word may wrap after its hyphen; each hyphen-free part must stay whole.
      for (const match of text.matchAll(/[^\s-]+/g)) {
        const range = document.createRange();
        range.setStart(node, match.index!);
        range.setEnd(node, match.index! + match[0].length);
        const tops = new Set([...range.getClientRects()].filter((rect) => rect.width > 0).map((rect) => Math.round(rect.top / 4)));
        if (tops.size > 1) found.push(match[0]);
      }
    }
    return found;
  });

for (const theme of ["day", "night"] as const) {
  for (const width of [320, 390]) {
    for (const mode of ["normal", "doubled element text", "200% root text"] as const) {
      test(`${theme} mode, ${width}px, ${mode}: footer words stay whole`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.addInitScript((value) => {
          localStorage.setItem("foa-theme", value);
          localStorage.setItem("foa-cookie-preferences", "essential");
        }, theme);
        await page.goto("/");
        if (mode === "doubled element text") await doubleElements(page);
        if (mode === "200% root text") await doubleRoot(page);
        expect(await splitWords(page)).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "page scrolls sideways").toBe(true);
        // The brand name stays readable: logo and name either share a line with room, or the name sits under the logo.
        const brand = await page.evaluate(() => {
          const logo = document.querySelector(".footer-brand-home img")!.getBoundingClientRect();
          const name = document.querySelector(".footer-brand h2")!.getBoundingClientRect();
          return { logoRight: logo.right, logoBottom: logo.bottom, nameLeft: name.left, nameTop: name.top, nameRight: name.right };
        });
        expect(brand.nameRight, "brand name stays on screen").toBeLessThanOrEqual(width + 0.5);
        const sharesLine = brand.nameTop < brand.logoBottom - 1;
        if (sharesLine) expect(brand.nameLeft).toBeGreaterThanOrEqual(brand.logoRight);
      });
    }
  }
}
