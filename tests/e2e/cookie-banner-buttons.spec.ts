import { expect, test, type Page } from "@playwright/test";

// Issue #221: the paired Allow / Reject buttons must keep equal widths (and heights when side by side)
// at every width, in both themes, with normal and 200% text.
const doubleText = (page: Page) =>
  page.evaluate(() => {
    const elements = [...document.querySelectorAll<HTMLElement>("body *")];
    const sizes = elements.map((element) => parseFloat(getComputedStyle(element).fontSize));
    elements.forEach((element, index) => element.style.setProperty("font-size", `${sizes[index] * 2}px`, "important"));
  });

const doubleRoot = (page: Page) => page.evaluate(() => document.documentElement.style.setProperty("font-size", "200%", "important"));

const widths = [320, 390, 768, 1024, 1440];

for (const theme of ["day", "night"] as const) {
  for (const width of widths) {
    for (const mode of ["normal", "doubled element text", "200% root text"] as const) {
      test(`${theme} mode, ${width}px, ${mode}: cookie banner buttons are equal`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.addInitScript((value) => localStorage.setItem("foa-theme", value), theme);
        await page.goto("/");
        await expect(page.locator("[data-cookie-banner]")).toBeVisible();
        if (mode === "doubled element text") await doubleText(page);
        if (mode === "200% root text") await doubleRoot(page);
        const boxes = await page.locator(".cookie-banner-actions .button").evaluateAll((buttons) =>
          buttons.map((button) => {
            const box = button.getBoundingClientRect();
            return { left: box.left, top: box.top, width: box.width, height: box.height };
          }),
        );
        expect(boxes).toHaveLength(2);
        const [allow, reject] = boxes;
        expect(Math.abs(allow.width - reject.width), `widths ${allow.width} vs ${reject.width}`).toBeLessThanOrEqual(0.5);
        const sideBySide = Math.abs(allow.top - reject.top) < 2;
        if (sideBySide) expect(Math.abs(allow.height - reject.height), "heights").toBeLessThanOrEqual(0.5);
        // Stacked buttons share a left edge as well.
        else expect(Math.abs(allow.left - reject.left)).toBeLessThanOrEqual(0.5);
      });
    }
  }
}
