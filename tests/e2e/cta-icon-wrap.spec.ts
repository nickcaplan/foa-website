import { expect, test, type Page } from "@playwright/test";

// Nick's rule (24 Oct 2026, amended 30 Oct 2026): an inline CTA's trailing
// icon (arrow, external-link marker, calendar glyph) must stay on the same
// line as the final word of its label - it may never wrap onto a line of its
// own. Detects recurrence by comparing the icon's box with the label's last
// text line.
//
// Amendment (approved by Nick, 30 Oct 2026): pill buttons (a.button,
// .event-list-cta--button) pin the icon in a reserved lane at the pill's
// right edge instead. For those, this spec asserts the icon clears the label
// text entirely and stays inside the pill; the same-line rule still applies
// to every other (inline) CTA.
//
// A compliant inline CTA keeps its whole label (including the icon) in a
// single .cta-label span, with no whitespace between the final word and the
// icon.

const ctas = "a.fw-map-link, a.button, .event-list-cta, a.event-list-calendar, .add-calendar a, a.text-link, a.designer-credit, .member-vacancy a, .newsletter-sign-off a";

// Returns a description of every CTA whose trailing icon sits on a different
// line from the end of its label.
const strandedIcons = (page: Page) =>
  page.evaluate((selector) => {
    const failures: string[] = [];
    const range = document.createRange();
    for (const cta of document.querySelectorAll<HTMLElement>(selector)) {
      const icon = [...cta.querySelectorAll<HTMLElement>("[aria-hidden='true']")]
        .filter((el) => el.getBoundingClientRect().width > 0)
        .pop();
      if (!icon) continue;
      const textNodes: Text[] = [];
      const walker = document.createTreeWalker(cta, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node) {
        if (node.textContent?.trim() && !(node.parentElement?.closest(".visually-hidden, [aria-hidden='true']"))) textNodes.push(node as Text);
        node = walker.nextNode();
      }
      if (textNodes.length === 0) continue;
      range.selectNodeContents(textNodes[textNodes.length - 1]);
      const lines = [...range.getClientRects()];
      if (lines.length === 0) continue;
      const lastLine = lines.reduce((lowest, rect) => (rect.top > lowest.top ? rect : lowest));
      const iconBox = icon.getBoundingClientRect();
      const isPill = cta.matches("a.button, .event-list-cta--button");
      if (!isPill) {
        const sameLine = iconBox.top < lastLine.bottom - 1 && iconBox.bottom > lastLine.top + 1;
        if (!sameLine) {
          failures.push(`${cta.textContent?.trim().replace(/\s+/g, " ").slice(0, 40)}: icon line y=${Math.round(iconBox.top)} but label's last line y=${Math.round(lastLine.top)}`);
        }
      }
      if (isPill) {
        // Pinned lane: the icon must clear the label text entirely - text may
        // never run beneath it, including when the label wraps at 200% text.
        const label = cta.querySelector(".cta-label");
        if (label) {
          const labelBox = label.getBoundingClientRect();
          const overlaps = !(iconBox.right < labelBox.left + 1 || iconBox.left > labelBox.right - 1 || iconBox.bottom < labelBox.top + 1 || iconBox.top > labelBox.bottom - 1);
          if (overlaps) {
            failures.push(`${cta.textContent?.trim().replace(/\s+/g, " ").slice(0, 40)}: pinned icon overlaps its label text`);
          }
        }
      }
      // Containment: a button CTA's icon must stay inside the button's own
      // border box, including under 200% text - an icon hanging outside the
      // pill is a bug wherever the icon sits.
      if (isPill) {
        const box = cta.getBoundingClientRect();
        if (iconBox.right > box.right + 1 || iconBox.left < box.left - 1 || iconBox.top < box.top - 1 || iconBox.bottom > box.bottom + 1) {
          failures.push(`${cta.textContent?.trim().replace(/\s+/g, " ").slice(0, 40)}: icon (right=${Math.round(iconBox.right)}, bottom=${Math.round(iconBox.bottom)}) lies outside its button (right=${Math.round(box.right)}, bottom=${Math.round(box.bottom)})`);
        }
      }
    }
    return failures;
  }, ctas);

// Emulates 200% text by doubling every computed font size (same approach as large-text-narrow.spec.ts).
const useLargeText = (page: Page) =>
  page.evaluate(() => {
    const elements = [...document.querySelectorAll<HTMLElement>("body *")];
    const sizes = elements.map((element) => parseFloat(getComputedStyle(element).fontSize));
    elements.forEach((element, index) => element.style.setProperty("font-size", `${sizes[index] * 2}px`, "important"));
  });

// Every public route is covered: the rule is site-wide.
import { routes } from "./routes";
const pages = routes;
const widths = [320, 390, 820, 1440];

test.describe("CTA trailing icons stay with the label", () => {
  for (const width of widths) {
    for (const path of pages) {
      test(`${path} at ${width}px`, async ({ page }) => {
        // Set each test's viewport explicitly: test.use() inside this loop
        // would overwrite the shared suite's viewport for every width.
        await page.setViewportSize({ width, height: 900 });
        await page.goto(path);
        expect(await page.evaluate(() => innerWidth)).toBe(width);
        expect(await strandedIcons(page)).toEqual([]);
      });
    }
  }

  test.describe("200% text at 390px", () => {
    test.use({ viewport: { width: 390, height: 900 } });
    for (const path of pages) {
      test(`${path} (per-element fonts)`, async ({ page }) => {
        await page.goto(path);
        await useLargeText(page);
        expect(await strandedIcons(page)).toEqual([]);
      });
      test(`${path} (root font size)`, async ({ page }) => {
        await page.goto(path);
        await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
        expect(await strandedIcons(page)).toEqual([]);
      });
    }
  });
});

test.describe("Wrapping stays inside the neighbouring content column", () => {
  for (const width of [320, 768, 1280, 1366, 1440]) {
    for (const night of [false, true]) {
      for (const textSize of ["normal", "200% per-element", "200% root"]) {
        for (const path of ["/newsletter/", "/uniform/"]) {
          test(`${path} ${width}px ${night ? "Night" : "Day"} ${textSize}`, async ({ page }) => {
            await page.setViewportSize({ width, height: 900 });
            await page.emulateMedia({ reducedMotion: "reduce" });
            await page.addInitScript((theme) => localStorage.setItem("foa-theme", theme), night ? "night" : "day");
            await page.goto(path === "/newsletter/" ? `${path}#newsletter-issue-autumn-term-2026` : path);
            if (textSize === "200% per-element") await useLargeText(page);
            if (textSize === "200% root") await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
            // Reproduce the wider fallback fonts used by Linux CI, not only macOS fonts.
            await page.addStyleTag({ content: ".cta-label, .newsletter-more a { font-family: Verdana, sans-serif !important; }" });
            await page.evaluate(async () => {
              await document.fonts.ready;
              // Let font/text/style changes finish a rendered layout before
              // measuring label and icon boxes.
              await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
            });
            if (path === "/fireworks-volunteering/") {
              await expect(page.locator('.vol-grid,.vol-card__action')).toHaveCount(0);
              await expect(page.locator('.content-section a')).toHaveCount(2);
              for(const link of await page.locator('.content-section a').all())expect(await link.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
            }
            if (path === "/newsletter/") {
              await page.locator("#newsletter-issue-autumn-term-2026 .newsletter-read-more").click();
              await expect(page.locator('.newsletter-more a[href="https://ashleyschool.org.uk/calendar"]')).toBeVisible();
            }
            expect(await strandedIcons(page)).toEqual([]);
            expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
            const overflow = await page.locator(path === "/fireworks-volunteering/" ? ".content-section a:visible" : ".newsletter-more a:visible, .uniform-action").evaluateAll((links) => links.flatMap((link) => {
              const column = link.closest("p, li, .newsletter-more, .vol-card, .view-hero-action")!.getBoundingClientRect();
              const range = document.createRange();
              const rects = [...link.querySelectorAll(".cta-icon, .external-link-icon")].map((icon) => icon.getBoundingClientRect());
              const walker = document.createTreeWalker(link, NodeFilter.SHOW_TEXT);
              let node = walker.nextNode();
              while (node) {
                if (node.textContent?.trim() && !node.parentElement?.closest('.visually-hidden, [aria-hidden="true"]')) {
                  range.selectNodeContents(node);
                  rects.push(...range.getClientRects());
                }
                node = walker.nextNode();
              }
              const outside = rects.filter((rect) => rect.width > 1 && (rect.left < column.left - 1 || rect.right > column.right + 1));
              return outside.length ? [{ text: link.textContent, column: { left: column.left, right: column.right }, outside: outside.map(({ left, right }) => ({ left, right })) }] : [];
            }));
            expect(overflow, "link text and icon must stay inside their own column").toEqual([]);
          });
        }
      }
    }
  }
});
