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
          const icons = [...cta.querySelectorAll<HTMLElement>(".cta-icon, .external-link-icon")].filter((el) => el.getBoundingClientRect().width > 0);
          if (icons.length === 0) continue;
          const box = cta.getBoundingClientRect();
          for (const icon of icons) {
            const ib = icon.getBoundingClientRect();
            const inset = box.right - ib.right;
            const midOffset = Math.abs((ib.top + ib.bottom) / 2 - (box.top + box.bottom) / 2);
            const name = cta.textContent?.trim().replace(/\s+/g, " ").slice(0, 40);
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
