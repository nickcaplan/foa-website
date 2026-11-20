import { expect, test, type Page } from "@playwright/test";

async function opportunityLayout(page: Page) {
  return page.locator(".involved-content").evaluate((content) => {
    const bounds = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width };
    };
    const groups = Array.from(content.querySelectorAll(".involved-group"));
    const overflow = Array.from(content.querySelectorAll("h2, h3, p, .involved-action")).flatMap((element) => {
      const rect = element.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(element);
      return Array.from(range.getClientRects()).filter((text) => text.left < rect.left - 1 || text.right > rect.right + 1)
        .map((text) => ({ text: element.textContent?.trim(), bounds: bounds(element), left: text.left, right: text.right }));
    });
    return {
      feature: bounds(content.querySelector(".involved-feature")!),
      featureCopy: bounds(content.querySelector(".involved-feature__copy")!),
      featureActions: bounds(content.querySelector(".involved-feature__actions")!),
      closing: bounds(content.querySelector(".involved-closing")!),
      closingCopy: bounds(content.querySelector(".involved-closing > div")!),
      closingAction: bounds(content.querySelector(".involved-closing > a")!),
      groups: groups.map((group) => ({
        ...bounds(group), heading: bounds(group.querySelector("h2")!),
        rows: Array.from(group.querySelectorAll(".involved-row")).map((row) => ({
          ...bounds(row), text: bounds(row.querySelector(".involved-text")!),
          action: bounds(row.querySelector(".involved-action")!),
        })),
      })),
      overflow,
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
    };
  });
}

function expectPairedRows(layout: Awaited<ReturnType<typeof opportunityLayout>>) {
  const [first, second] = layout.groups;
  expect(first.top).toBeCloseTo(second.top, 0);
  expect(first.width).toBeCloseTo(second.width, 0);
  expect(Math.abs(first.heading.bottom - second.heading.bottom)).toBeLessThan(0.01);
  expect(second.left).toBeGreaterThan(first.right);
  expect(first.rows).toHaveLength(second.rows.length);
  first.rows.forEach((row, index) => {
    const neighbour = second.rows[index];
    expect(row.top, `Role ${index + 1} starts`).toBeCloseTo(neighbour.top, 0);
    expect(row.bottom, `Role ${index + 1} separators`).toBeCloseTo(neighbour.bottom, 0);
    expect(row.text.top, `Role ${index + 1} copy starts`).toBeCloseTo(neighbour.text.top, 0);
    expect(row.action.top, `Role ${index + 1} button tops`).toBeCloseTo(neighbour.action.top, 0);
    expect(row.action.bottom, `Role ${index + 1} button bottoms`).toBeCloseTo(neighbour.action.bottom, 0);
  });
}

for (const width of [320, 390, 768, 1024, 1440]) {
  for (const enlargedText of [false, true]) {
    for (const colorScheme of ["light", "dark"] as const) {
      test(`Get Involved opportunity layout at ${width}px in ${colorScheme}${enlargedText ? " with enlarged text" : ""}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
        await page.goto("/get-involved/");
        if (enlargedText) {
          await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
        }
        await expect(page.locator(".involved-content")).toHaveCSS("font-size", enlargedText ? "32px" : "16px");
        await page.evaluate(() => document.fonts.ready);
        if (colorScheme === "dark") {
          await expect(page.locator("html")).toHaveAttribute("data-theme", "night");
        } else {
          await expect(page.locator("html")).not.toHaveAttribute("data-theme", "night");
        }

        const paired = width >= 1024 && !enlargedText;
        const groups = page.locator(".involved-group");
        await expect(groups.locator(":scope > h2")).toHaveText([
          "Help at an event", "Support throughout the year",
        ]);
        // Wait for the container-query layout, not just for fonts or stylesheet insertion.
        await expect(groups.first()).toHaveCSS("display", paired ? "grid" : "block");
        const layout = await opportunityLayout(page);
        const [first, second] = layout.groups;
        expect(first.top - layout.feature.bottom, "Gap below the vacancy appeal").toBeGreaterThanOrEqual(31);
        expect(layout.closing.top - Math.max(first.bottom, second.bottom), "Gap before the closing appeal").toBeGreaterThanOrEqual(31);
        expect(layout.pageWidth, JSON.stringify(layout, null, 2)).toBeLessThanOrEqual(layout.viewportWidth);
        expect(layout.overflow).toEqual([]);

        for (const group of layout.groups) {
          for (const row of group.rows) {
            expect(row.action.top).toBeGreaterThanOrEqual(row.text.bottom - 1);
            // Phone widths (< 768px): buttons span the full card row from the
            // icon's left edge; wider viewports keep them under the text column.
            expect(row.action.left).toBeCloseTo(width < 768 ? row.left : row.text.left, 0);
            expect(row.action.right).toBeLessThanOrEqual(row.right + 1);
          }
        }
        if (paired) {
          expectPairedRows(layout);
        } else {
          expect(second.top).toBeGreaterThanOrEqual(first.bottom);
          expect(second.left).toBeCloseTo(first.left, 0);
          expect(second.width).toBeCloseTo(first.width, 0);
        }
        if (enlargedText || width <= 768) {
          expect(layout.featureActions.top).toBeGreaterThanOrEqual(layout.featureCopy.bottom);
          expect(layout.closingAction.top).toBeGreaterThanOrEqual(layout.closingCopy.bottom);
        }
      });
    }
  }
}

test("narrow enlarged descriptions wrap wide words within their own column", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/get-involved/");
  await page.addStyleTag({ content: "html { font-size: 200% !important; } .involved-text p { letter-spacing: 0.15em; }" });
  await page.evaluate(() => document.fonts.ready);
  const description = page.locator(".involved-text p").filter({ hasText: "Help with announcements and music" });
  const wordWidth = await description.evaluate((element) => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d")!;
    const style = getComputedStyle(element);
    context.font = `${style.fontSize} ${style.fontFamily}`;
    return context.measureText("announcements").width + 12 * parseFloat(style.letterSpacing);
  });
  const bounds = await description.boundingBox();
  expect(wordWidth, "The word would overflow without a wrapping fallback").toBeGreaterThan(bounds!.width);
  const layout = await opportunityLayout(page);
  expect(layout.overflow).toEqual([]);
  expect(layout.pageWidth).toBeLessThanOrEqual(layout.viewportWidth);
});

test("paired opportunity rows stay aligned when copy and a button wrap", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto("/get-involved/");
  await page.evaluate(() => document.fonts.ready);
  const firstRow = page.locator(".involved-group").first().locator(".involved-row").first();
  await firstRow.locator("p").evaluate((element) => {
    element.textContent += " This deliberately longer test description checks that neighbouring roles remain aligned when one description takes more space.";
  });
  await firstRow.locator("a").evaluate((element) => {
    element.textContent = "Find out how to help at the Christmas Fayre with your family and friends";
  });
  const layout = await opportunityLayout(page);
  expect(layout.groups[0].rows[0].action.bottom - layout.groups[0].rows[0].action.top).toBeGreaterThan(44);
  expectPairedRows(layout);
  expect(layout.overflow).toEqual([]);
  expect(layout.pageWidth).toBeLessThanOrEqual(layout.viewportWidth);
});

for (const width of [1280, 1366]) {
  for (const deviceScaleFactor of [1, 2]) {
    for (const colorScheme of ["light", "dark"] as const) {
      test(`paired heading rules share painted pixel rows at ${width}px, ${deviceScaleFactor}x in ${colorScheme}`, async ({ browser }) => {
        const context = await browser.newContext({
          viewport: { width, height: 900 }, deviceScaleFactor, colorScheme, reducedMotion: "reduce",
        });
        try {
          const page = await context.newPage();
          await page.goto("/get-involved/");
          const rejectCookies = page.getByRole("button", { name: "Reject analytics cookies" });
          if (await rejectCookies.isVisible()) await rejectCookies.click();
          const headings = page.locator(".involved-group > h2");
          await headings.first().scrollIntoViewIfNeeded();
          await page.evaluate(() => document.fonts.ready);
          const layout = await opportunityLayout(page);
          expectPairedRows(layout);
          const [first, second] = layout.groups;
          const clip = {
            x: Math.floor(first.left), y: Math.floor(first.heading.bottom) - 4,
            width: Math.ceil(second.right) - Math.floor(first.left), height: 8,
          };
          const foregrounds = await headings.evaluateAll((elements) => [
            getComputedStyle(elements[0]).getPropertyValue("--green").trim(),
            getComputedStyle(elements[1]).getPropertyValue("--ink").trim(),
          ]);
          const image = await page.screenshot({ clip, animations: "disabled" });
          // Decode only this eight-pixel strip in the browser. No golden image,
          // extra image dependency or full-page screenshot is needed.
          const rows = await page.evaluate(async ({ png, foregrounds, centres }) => {
            const image = new Image();
            image.src = `data:image/png;base64,${png}`;
            await image.decode();
            const canvas = document.createElement("canvas");
            canvas.width = image.width;
            canvas.height = image.height;
            const drawing = canvas.getContext("2d")!;
            drawing.drawImage(image, 0, 0);
            return centres.map((centre, index) => {
              drawing.fillStyle = foregrounds[index];
              const rgb = drawing.fillStyle.replace("#", "").match(/../g)!.map((part) => parseInt(part, 16));
              const pixels = drawing.getImageData(Math.floor(centre * image.width), 0, 1, image.height).data;
              return Array.from({ length: image.height }, (_, row) => row).filter((row) =>
                rgb.every((channel, index) => Math.abs(pixels[row * 4 + index] - channel) <= 1));
            });
          }, {
            png: image.toString("base64"), foregrounds,
            centres: [first, second].map((group) => ((group.left + group.right) / 2 - clip.x) / clip.width),
          });
          expect(rows[0].length, "The green heading rule is actually painted").toBeGreaterThan(0);
          expect(rows[1], "Both coloured strokes must occupy the same device-pixel rows").toEqual(rows[0]);
        } finally {
          await context.close();
        }
      });
    }
  }
}
