import { expect, test } from "@playwright/test";

// QA #197/#198/#199: at 320px with enlarged text, ordinary copy on the Uniform,
// Newsletter and Reps pages split words mid-word ("payment s", "newslett er",
// "REPRESENT ATIVES"). No word should break inside itself: overflow-wrap must
// only rescue words that genuinely overflow their line (break-word), never
// shatter words that would fit whole on the next line (anywhere). URLs may
// break anywhere (long unspaced strings need rescue) and hyphenated words may
// break at their hyphens, so each hyphen-separated part is checked on its own.
const splitWords = () => {
  const broken: string[] = [];
  const scope = document.querySelectorAll(
    "main p, main li, main a, main button, main strong, main span, main h1, main h2, main h3"
  );
  for (const el of scope) {
    if (el.closest(".visually-hidden, [aria-hidden='true'], .cookie-banner")) continue;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      for (const match of (node.textContent ?? "").matchAll(/[^\s-]+-?/g)) {
        const word = match[0];
        if (/www\.|https?:|@|\//.test(word)) continue; // URLs, addresses and slash-joined lists may break anywhere
        // matchAll always sets index, so the non-null assertions are safe.
        range.setStart(node, match.index!);
        range.setEnd(node, match.index! + word.length);
        if (range.getClientRects().length > 1) {
          broken.push(`${el.tagName} "${word}" in ${el.textContent?.trim().slice(0, 40)}`);
        }
      }
    }
  }
  return broken;
};

const routes = ["/uniform/", "/newsletter/", "/reps/"];
for (const theme of ["day", "night"] as const) {
  for (const width of [320, 390]) {
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
          test(`${route} copy words never split mid-word`, async ({ page }) => {
            await page.goto(route);
            await page.evaluate(async (s) => {
              document.documentElement.style.fontSize = `${16 * s}px`;
              await document.fonts.ready;
              // Let the enlarged-root layout settle (snow banks, tapers).
              await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
            }, scale);
            const broken = await page.evaluate(splitWords);
            expect(broken, `words split mid-word: ${broken.join("; ")}`).toEqual([]);
          });
        }
      });
    }
  }
}
