import { expect, test } from "@playwright/test";

// #177 and #178: Fayre CTA labels must never split a word mid-word at enlarged
// text. Each case is the exact QA reproduction: the named CTA on its route at
// the filed viewport, 100% and 200% root text, day and night. The word-by-word
// Range check fails on main (both CTAs split) and passes with the fixes.
const cases: { route: string; button: string; width: number; name: string }[] = [
  { route: "/christmas-fayre-art-competition/", button: ".art-comp__back .button", width: 390, name: "back-to-fayre CTA (#177)" },
  { route: "/christmas-fayre-volunteering/", button: ".fayre-volunteer__loan .button", width: 320, name: "loan-list CTA (#178)" },
];

for (const theme of ["day", "night"] as const) {
  for (const scale of [1, 2]) {
    test.describe(`${theme} mode, ${scale * 100}% text`, () => {
      test.beforeEach(async ({ page }) => {
        await page.addInitScript((mode) => {
          localStorage.setItem("foa-theme", mode);
          localStorage.setItem("foa-cookie-preferences", "essential");
        }, theme);
      });
      for (const { route, button, width, name } of cases) {
        test(`${route} ${name} keeps whole words at ${width}px`, async ({ page }) => {
          await page.setViewportSize({ width, height: 850 });
          await page.goto(route);
          await page.evaluate(async (s) => {
            document.documentElement.style.fontSize = `${16 * s}px`;
            await document.fonts.ready;
            await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          }, scale);
          const broken = await page.locator(button).evaluateAll((buttons) =>
            buttons.flatMap((btn) => {
              const range = document.createRange();
              const found: string[] = [];
              const walker = document.createTreeWalker(btn, NodeFilter.SHOW_TEXT);
              for (let node = walker.nextNode(); node; node = walker.nextNode()) {
                const text = node.textContent ?? "";
                for (const match of text.matchAll(/\S+/g)) {
                  range.setStart(node, match.index!);
                  range.setEnd(node, match.index! + match[0].length);
                  if (range.getClientRects().length > 1) found.push(match[0]);
                }
              }
              return found;
            }));
          expect(broken, `CTA words split mid-word: ${broken.join("; ")}`).toEqual([]);
        });
      }
    });
  }
}
