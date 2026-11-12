import { expect, test } from "@playwright/test";

for (const width of [320, 390, 554, 768, 1023, 1024, 1200, 1440]) {
  for (const enlargedText of [false, true]) {
    test(`uniform action icons sit clear of their labels in the pill lane at ${width}px${enlargedText ? " with enlarged text" : ""}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/uniform/");
      if (enlargedText) {
        await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
      }
      await page.evaluate(() => document.fonts.ready);

      const buttons = [
        page.getByRole("link", { name: "Email the Preloved team", exact: true }),
        page.getByRole("link", { name: "Reserve via Google Form (opens in a new tab)", exact: true }),
      ];
      await expect(buttons[0]).toHaveClass(/\bbutton--primary\b/);
      await expect(buttons[1]).toHaveClass(/\bbutton--amber\b/);
      const heights: number[] = [];
      for (const button of buttons) {
        await expect(button).toBeVisible();
        const layout = await button.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          const label = element.querySelector(".cta-label")!;
          const range = document.createRange();
          const walker = document.createTreeWalker(label, NodeFilter.SHOW_TEXT);
          const lines: DOMRect[] = [];
          let node = walker.nextNode();
          while (node) {
            if (node.textContent?.trim() && !node.parentElement?.closest('.visually-hidden, [aria-hidden="true"]')) {
              range.selectNodeContents(node);
              lines.push(...range.getClientRects());
            }
            node = walker.nextNode();
          }
          const lastLine = lines[lines.length - 1];
          const icon = element.querySelector('[aria-hidden="true"]')!.getBoundingClientRect();
          // Pinned lane (rule approved 30 Oct 2026): the icon must not
          // intersect any label line - text never runs beneath it.
          const overlapsLabel = lines.some((line) => !(icon.right < line.left + 1 || icon.left > line.right - 1 || icon.bottom < line.top + 1 || icon.top > line.bottom - 1));
          const container = element.closest(".uniform-cta")!.getBoundingClientRect();
          const containerStyle = getComputedStyle(element.closest(".uniform-cta")!);
          return {
            labelRight: lastLine.right,
            iconLeft: icon.left,
            overlapsLabel,
            iconRight: icon.right,
            buttonRight: bounds.right,
            height: bounds.height,
            width: bounds.width,
            availableWidth: container.width - parseFloat(containerStyle.paddingLeft) - parseFloat(containerStyle.paddingRight),
            labelHeight: Math.max(...lines.map((line) => line.bottom)) - Math.min(...lines.map((line) => line.top)),
            lineHeight: parseFloat(getComputedStyle(element).lineHeight),
          };
        });
        expect(layout.iconLeft).toBeGreaterThan(layout.labelRight);
        expect(layout.overlapsLabel).toBe(false);
        expect(layout.iconRight).toBeLessThan(layout.buttonRight);
        expect(layout.height).toBeGreaterThanOrEqual(44);
        heights.push(layout.height);
        if (width < 1024 || enlargedText) {
          expect(Math.abs(layout.width - layout.availableWidth)).toBeLessThan(1);
        }
        if (!enlargedText && width >= 390) {
          expect(layout.labelHeight).toBeLessThanOrEqual(layout.lineHeight + 1);
        }
      }
      expect(Math.abs(heights[0] - heights[1])).toBeLessThan(1);

      const prices = await page.locator(".price-list li").evaluateAll((rows) => rows.map((row) => {
        const label = row.querySelector("span")!.getBoundingClientRect();
        const price = row.querySelector("strong")!.getBoundingClientRect();
        const bounds = row.getBoundingClientRect();
        return {
          stacked: price.top >= label.bottom,
          priceRight: price.right,
          rowRight: bounds.right,
          labelRight: label.right,
        };
      }));
      expect(prices).toHaveLength(2);
      expect(prices[0].stacked).toBe(prices[1].stacked);
      expect(Math.abs(prices[0].priceRight - prices[1].priceRight)).toBeLessThan(1);
      for (const price of prices) {
        expect(price.priceRight).toBeLessThanOrEqual(price.rowRight + 1);
        expect(price.labelRight).toBeLessThanOrEqual(price.rowRight + 1);
      }
      expect(await page.locator(".price-note").evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
      const overflow = await page.evaluate(() => {
        const viewport = document.documentElement.clientWidth;
        const outside = (rect: DOMRect) => rect.width > 0 && (rect.left < -1 || rect.right > viewport + 1);
        const elements = Array.from(document.body.querySelectorAll<HTMLElement>("*"))
          .filter((element) => element instanceof HTMLElement)
          .flatMap((element) => {
            if (element.closest(".visually-hidden") || element.matches(".skip-link:not(:focus)") || !element.getClientRects().length) return [];
            const style = getComputedStyle(element);
            if (style.visibility === "hidden" || style.display === "none") return [];
            const bounds = element.getBoundingClientRect();
            const text = Array.from(element.childNodes).flatMap((node) => {
              if (node.nodeType !== Node.TEXT_NODE || !node.textContent?.trim()) return [];
              const range = document.createRange();
              range.selectNodeContents(node);
              return Array.from(range.getClientRects()).filter(outside).map(({ left, right }) => ({
                text: node.textContent!.trim().slice(0, 100), left, right,
              }));
            });
            if (!outside(bounds) && !text.length) return [];
            return [{
              element: element.tagName.toLowerCase(), class: element.className,
              left: bounds.left, right: bounds.right, text,
              fontSize: style.fontSize, minWidth: style.minWidth,
              columns: style.gridTemplateColumns, overflowWrap: style.overflowWrap,
            }];
          });
        return { viewport, scrollWidth: document.documentElement.scrollWidth, elements };
      });
      expect(overflow.scrollWidth, JSON.stringify(overflow, null, 2)).toBeLessThanOrEqual(overflow.viewport);
    });
  }
}
