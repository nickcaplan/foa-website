import { expect, test } from "@playwright/test";
import { routes } from "./routes";

// Every pill CTA's trailing icon belongs in the right-edge lane, vertically
// centred on the button - never glued mid-button after the label, where its
// position drifts with the label length (Nick, 15 Nov).
for (const width of [320, 390, 1440]) {
  for (const route of routes) {
    test(`CTA trailing icons sit in the right-edge lane at ${width}px ${route}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(route);
      const failures = await page.evaluate(() => {
        const found: string[] = [];
        for (const cta of document.querySelectorAll<HTMLElement>("a.button, button.button")) {
          const box = cta.getBoundingClientRect();
          if (box.width === 0) continue; // whole CTA hidden (e.g. closed menu) - nothing to lane
          // #171: the home fundraising CTA is the one exception - up to 26rem its
          // arrow flows right after the label, because the symmetric icon lane
          // cannot fit "Fundraising" inside a 230px button at 200% text.
          if (cta.closest(".fundraising-card__cta") && window.innerWidth <= 416) continue;
          const icons = [...cta.querySelectorAll<HTMLElement>(".cta-icon, .external-link-icon")];
          if (icons.length === 0) continue;
          const name = cta.textContent?.trim().replace(/\s+/g, " ").slice(0, 40);
          for (const icon of icons) {
            const ib = icon.getBoundingClientRect();
            const style = window.getComputedStyle(icon);
            if (ib.width === 0 || style.visibility === "hidden" || style.display === "none") {
              found.push(`${name}: trailing icon is not rendered (display/visibility/size), so the lane cannot be checked`);
              continue;
            }
            const inset = box.right - ib.right;
            const midOffset = Math.abs((ib.top + ib.bottom) / 2 - (box.top + box.bottom) / 2);
            if (inset < 3 || inset > 24) found.push(`${name}: trailing icon sits ${inset.toFixed(1)}px from the button's right edge, not in the lane`);
            if (midOffset > 2) found.push(`${name}: trailing icon is ${midOffset.toFixed(1)}px off the button's vertical centre`);
          }
        }
        return found;
      });
      expect(failures).toEqual([]);
    });
  }
}
