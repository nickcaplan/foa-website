import { expect, test } from "@playwright/test";

declare global {
  interface Window { __fwWork: { contexts: number; frames: number }; }
}

async function recordCanvasWork(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    window.__fwWork = { contexts: 0, frames: 0 };
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: Parameters<typeof getContext>) {
      window.__fwWork.contexts += 1;
      return getContext.apply(this, args);
    } as typeof getContext;
    const requestFrame = window.requestAnimationFrame;
    window.requestAnimationFrame = (callback) => {
      window.__fwWork.frames += 1;
      return requestFrame.call(window, callback);
    };
  });
}

async function expectStaticEffects(page: import("@playwright/test").Page) {
  await expect(page.locator("[data-fw-stage]")).toHaveAttribute("data-fw-paused", "");
  await expect(page.locator(".fw-torch__flames canvas")).toHaveCount(0);
  await expect(page.locator(".fw-flame").first()).toBeVisible();
  await expect(page.locator(".fw-sky")).toBeHidden();
  expect(await page.evaluate(() => {
    const stage = document.querySelector("[data-fw-stage]")!;
    const flame = document.querySelector(".fw-flame")!;
    const halo = document.querySelector(".fw-torch__halo")!;
    return [getComputedStyle(stage, "::before").animationName, getComputedStyle(flame).animationName, getComputedStyle(halo).animationName];
  })).toEqual(["none", "none", "none"]);
  expect(await page.locator(".site-header").evaluate((header) => getComputedStyle(header).backdropFilter)).toBe("none");
  expect(await page.locator("[data-fw-sky]").evaluate((canvas) => ({ width: (canvas as HTMLCanvasElement).width, height: (canvas as HTMLCanvasElement).height }))).toEqual({ width: 0, height: 0 });
}

test("the Fireworks page offers the event guide PDF as a download", async ({ page }) => {
  await page.goto("/events/fireworks-2026/");
  const link = page.getByRole("link", { name: /Download the event guide/ });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", /\/events\/fireworks-2026-event-guide\.pdf$/);
  await expect(link).toHaveAttribute("download", "Fireworks 2026 Event Guide.pdf");
  const response = await page.request.get("/events/fireworks-2026-event-guide.pdf");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/pdf");
});

test("clicking through from What's On does not show a return breadcrumb", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-04T12:00:00Z"));
  await page.goto("/whats-on/");
  await page.getByRole("link", { name: /Fireworks on the Field/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Fireworks on the Field" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Back to What's On/i })).toHaveCount(0);
});

for (const width of [360, 390, 430]) {
  test(`the Fireworks mobile summary keeps every row aligned and readable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1100 });
    await page.goto("/events/fireworks-2026/");
    const layout = await page.evaluate(async () => {
      await document.fonts.ready;
      const summary = document.querySelector(".event-summary")!;
      const rows = [...summary.querySelectorAll("dl > div")].map((row) => {
        const label = row.querySelector("dt")!;
        const value = row.querySelector("dd")!;
        const labelRect = label.getBoundingClientRect();
        const valueRect = value.getBoundingClientRect();
        const mapLink = value.querySelector<HTMLAnchorElement>(".fw-map-link");
        const range = document.createRange();
        range.selectNodeContents(value);
        const walker = document.createTreeWalker(value, NodeFilter.SHOW_TEXT);
        const textTops: number[] = [];
        while (walker.nextNode()) {
          const node = walker.currentNode;
          if (!node.textContent?.trim() || node.parentElement?.closest(".visually-hidden, [aria-hidden='true']")) continue;
          range.selectNodeContents(node);
          textTops.push(...[...range.getClientRects()].filter((rect) => rect.width > 0).map((rect) => Math.round(rect.top * 10) / 10));
        }
        const textLines = new Set(textTops).size;
        const hyphenatedWord = value.querySelector<HTMLElement>(".fw-ticket-price__unbreakable");
        return {
          label: label.textContent?.trim(),
          labelX: labelRect.x,
          labelWidth: labelRect.width,
          labelScrollWidth: label.scrollWidth,
          valueX: valueRect.x,
          valueWidth: valueRect.width,
          valueScrollWidth: value.scrollWidth,
          valueHeight: valueRect.height,
          textLines,
          underTwoLines: hyphenatedWord?.getClientRects().length ?? 0,
          text: value.textContent?.replace(/\s+/g, " ").trim(),
        };
      });
      const mapLink = summary.querySelector<HTMLAnchorElement>(".fw-map-link")!;
      const linkLabel = mapLink.querySelector<HTMLElement>(".fw-map-link__label")!;
      const arrow = mapLink.querySelector<HTMLElement>(".external-link-icon")!;
      const date = summary.querySelector(".fw-date")!;
      const dateRange = document.createRange();
      dateRange.selectNodeContents(date);
      return {
        rows,
        linkLabelTop: linkLabel.getBoundingClientRect().top,
        arrowTop: arrow.getBoundingClientRect().top,
        arrowDecoration: getComputedStyle(arrow).textDecorationLine,
        dateLineCount: new Set([...dateRange.getClientRects()].filter((rect) => rect.width > 0).map((rect) => Math.round(rect.top * 10) / 10)).size,
        noHorizontalOverflow: document.documentElement.scrollWidth <= innerWidth,
      };
    });
    expect(layout.rows.map((row) => row.label)).toEqual(["When", "Where", "Tickets"]);
    expect(new Set(layout.rows.map((row) => row.labelX)).size).toBe(1);
    expect(new Set(layout.rows.map((row) => row.valueX)).size).toBe(1);
    expect(new Set(layout.rows.map((row) => row.labelWidth)).size).toBe(1);
    expect(layout.rows.every((row) => row.labelScrollWidth <= row.labelWidth + 1)).toBe(true);
    expect(layout.rows.every((row) => row.valueScrollWidth <= row.valueWidth + 1)).toBe(true);
    expect(layout.rows[0].textLines).toBe(1);
    expect(layout.rows[1].textLines).toBe(1);
    expect(layout.rows[2].textLines).toBeLessThanOrEqual(2);
    expect(layout.rows[2].underTwoLines).toBe(1);
    expect(layout.rows[2].text).toBe("£8.50 per person; under-2s free");
    expect(Math.abs(layout.linkLabelTop - layout.arrowTop)).toBeLessThanOrEqual(2.1);
    expect(layout.arrowDecoration).toBe("none");
    // The full ordinal date may wrap on a narrow parchment; keep it readable.
    expect(layout.dateLineCount).toBeGreaterThanOrEqual(1);
    expect(layout.dateLineCount).toBeLessThanOrEqual(2);
    expect(layout.noHorizontalOverflow).toBe(true);
  });
}

for (const width of [320, 360, 390, 430, 1440]) {
  for (const textSize of [100, 200]) {
    test(`Fireworks summary content fits its own columns at ${width}px with ${textSize}% text`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1100 });
      await page.goto("/events/fireworks-2026/");
      await page.evaluate((size) => { document.documentElement.style.fontSize = `${size}%`; }, textSize);
      const layout = await page.locator(".event-summary").evaluate(async (summary) => {
        await document.fonts.ready;
        const panel = summary.getBoundingClientRect();
        return [...summary.querySelectorAll("dt, dd, .fw-date")].map((element) => {
          const bounds = element.getBoundingClientRect();
          const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
          const textBounds = [];
          while (walker.nextNode()) {
            const node = walker.currentNode;
            if (!node.textContent?.trim() || node.parentElement?.closest(".visually-hidden")) continue;
            const range = document.createRange();
            range.selectNodeContents(node);
            textBounds.push(...[...range.getClientRects()].filter((rect) => rect.width > 0));
          }
          return {
            text: element.textContent?.trim(),
            width: element.clientWidth,
            scrollWidth: element.scrollWidth,
            contained: textBounds.every((rect) => rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1 && rect.left >= panel.left && rect.right <= panel.right && rect.right <= innerWidth),
          };
        });
      });
      for (const element of layout) {
        expect(element.scrollWidth, element.text).toBeLessThanOrEqual(element.width + 1);
        expect(element.contained, element.text).toBe(true);
      }
    });
  }
}

for (const width of [390, 768, 1000, 1023, 1024, 1440]) {
  for (const textSize of [100, 200]) {
    test(`volunteering torches stay clear of the introduction at ${width}px with ${textSize}% text`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1100 });
      await page.goto("/fireworks-volunteering/");
      await page.evaluate((size) => { document.documentElement.style.fontSize = `${size}%`; }, textSize);
      if (width < 1024) {
        await expect(page.locator(".fw-torches")).toBeHidden();
      } else {
        await expect(page.locator(".fw-torches")).toBeVisible();
        const overlaps = await page.locator(".fw-title-copy").evaluate(async (copy) => {
          await document.fonts.ready;
          const torches = [...document.querySelectorAll(".fw-torch__head, .fw-torch__flames, .fw-torch__pole")].map((torch) => torch.getBoundingClientRect());
          const walker = document.createTreeWalker(copy, NodeFilter.SHOW_TEXT);
          const collisions = [];
          while (walker.nextNode()) {
            const node = walker.currentNode;
            if (!node.textContent?.trim() || node.parentElement?.closest(".visually-hidden")) continue;
            const range = document.createRange();
            range.selectNodeContents(node);
            for (const rect of range.getClientRects()) {
              if (rect.width > 0 && torches.some((torch) => rect.left < torch.right && rect.right > torch.left && rect.top < torch.bottom && rect.bottom > torch.top)) collisions.push(node.textContent);
            }
          }
          return collisions;
        });
        expect(overlaps).toEqual([]);
      }
    });
  }
}

for (const width of [320, 390, 768, 1024, 1440]) {
  test(`the Fireworks experience fits without overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/events/fireworks-2026/");
    await expect(page.locator("body")).toHaveClass(/fw-theme/);
    const layout = await page.evaluate(async () => {
      await document.fonts.ready;
      const summary = document.querySelector(".event-summary")!.getBoundingClientRect();
      const sponsor = document.querySelector(".event-hero-sponsor")!.getBoundingClientRect();
      const kicker = document.querySelector(".fw-kicker")!;
      const poles = [...document.querySelectorAll(".fw-torch__pole")].map((pole) => {
        const rect = pole.getBoundingClientRect();
        return { left: rect.left, right: rect.right };
      });
      const introBottom = document.querySelector(".event-hero-intro")!.getBoundingClientRect().bottom;
      const flameTop = document.querySelector(".fw-torch__flames")!.getBoundingClientRect().top;
      return {
        summary: { x: summary.x, y: summary.y, width: summary.width, height: summary.height },
        sponsor: { x: sponsor.x, y: sponsor.y, width: sponsor.width },
        kicker: { width: kicker.getBoundingClientRect().width, scrollWidth: kicker.scrollWidth, fontSize: getComputedStyle(kicker).fontSize },
        poles,
        introBottom,
        flameTop,
        noOverflow: document.documentElement.scrollWidth <= innerWidth,
      };
    });
    if (width < 768) {
      expect(layout.sponsor.y).toBeGreaterThanOrEqual(layout.summary.y + layout.summary.height + 10);
      expect(Math.abs(layout.sponsor.width - layout.summary.width)).toBeLessThanOrEqual(1);
      expect(layout.kicker.scrollWidth).toBeLessThanOrEqual(layout.kicker.width);
      expect(layout.summary.x - 6).toBeGreaterThan(layout.poles[0].right);
      expect(layout.summary.x + layout.summary.width + 6).toBeLessThan(layout.poles[1].left);
      expect(layout.flameTop).toBeGreaterThan(layout.introBottom);
    }
    expect(layout.noOverflow).toBe(true);
  });
}

test("Fireworks uses the immersive design by default without a mode control", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/events/fireworks-2026/");
  await expect(page.locator("body")).toHaveClass(/fw-theme/);
  await expect(page.locator("[data-fw-mode], [data-fw-mode-bar]")).toHaveCount(0);
  await expect(page.locator(".fw-torch__flames canvas")).toHaveCount(2);
  await expect(page.locator(".fw-torches")).toBeVisible();
  await expect(page.locator(".fw-ivy")).toHaveCount(0);
  await expect(page.locator(".poster-figure")).toHaveCount(0);
   const headerStyles = () => page.locator(".site-header, .brand, .brand p span, .menu-toggle").evaluateAll((elements) => elements.map((element) => {
    const style = getComputedStyle(element);
    return { color: style.color, background: style.backgroundColor, border: style.borderBottomColor };
  }));
  const header = await headerStyles();
  expect(await page.locator(".event-summary").evaluate((element) => getComputedStyle(element, "::before").height)).toBe("24px");
  await expect(page.locator(".event-summary .fw-date")).toHaveText("Thursday 5th November");
  await page.clock.setFixedTime(new Date("2026-11-04T12:00:00Z"));
  await page.goto("/whats-on/");
  expect(await headerStyles()).toEqual(header);
});

test("reduced motion keeps the default design but uses static flames", async ({ page }) => {
  await recordCanvasWork(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/events/fireworks-2026/");
  await expect(page.locator("body")).toHaveClass(/fw-theme/);
  await expect(page.locator("[data-fw-stage]")).toHaveAttribute("data-fw-paused", "");
  await expect(page.locator(".fw-flame").first()).toBeVisible();
  await expect(page.locator(".fw-torch__flames canvas")).toHaveCount(0);
  await expect(page.locator(".fw-sky")).toBeHidden();
  expect(await page.evaluate(() => window.__fwWork)).toEqual({ contexts: 0, frames: 0 });
});

test("a narrow non-touch viewport starts no canvas work, including after scrolling", async ({ page }) => {
  await recordCanvasWork(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/events/fireworks-2026/");
  await expectStaticEffects(page);
  await page.locator(".schedule").scrollIntoViewIfNeeded();
  await page.getByRole("heading", { name: "Before you come." }).scrollIntoViewIfNeeded();
  await page.waitForTimeout(800); // Beyond the opening sequence's first scheduled launch.
  expect(await page.evaluate(() => window.__fwWork)).toEqual({ contexts: 0, frames: 0 });
});

test.describe("touch-device safety", () => {
  test.use({ hasTouch: true, deviceScaleFactor: 3 });

  test("portrait, landscape and wider touch screens stay static without canvas work", async ({ page }) => {
    await recordCanvasWork(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/events/fireworks-2026/");
    for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1194, height: 834 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await expectStaticEffects(page);
      await page.locator(".schedule").scrollIntoViewIfNeeded();
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await expectStaticEffects(page);
    }
    await page.waitForTimeout(800);
    expect(await page.evaluate(() => window.__fwWork)).toEqual({ contexts: 0, frames: 0 });
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
    await page.getByRole("button", { name: "Close menu" }).click();
    await expect(page.getByRole("link", { name: /Buy tickets/ })).toBeVisible();
  });

  test("a direct landscape visit never creates canvas renderers", async ({ page }) => {
    await recordCanvasWork(page);
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto("/events/fireworks-2026/");
    await expectStaticEffects(page);
    expect(await page.evaluate(() => window.__fwWork)).toEqual({ contexts: 0, frames: 0 });
  });
});

test("a wide touch-capable device with a fine pointer starts no canvas work", async ({ page }) => {
  await recordCanvasWork(page);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "maxTouchPoints", { get: () => 1 });
  });
  await page.setViewportSize({ width: 1194, height: 834 });
  await page.goto("/events/fireworks-2026/");
  expect(await page.evaluate(() => matchMedia("(any-pointer: coarse)").matches)).toBe(false);
  await expectStaticEffects(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expectStaticEffects(page);
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => window.__fwWork)).toEqual({ contexts: 0, frames: 0 });
});

test("switching desktop to narrow or reduced motion stops drawing and releases the sky buffer", async ({ page }) => {
  await recordCanvasWork(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/events/fireworks-2026/");
  await expect(page.locator(".fw-torch__flames canvas")).toHaveCount(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("[data-fw-stage]")).toHaveAttribute("data-fw-paused", "");
  const stopped = await page.evaluate(() => ({ ...window.__fwWork }));
  await page.locator(".schedule").scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => window.__fwWork)).toEqual(stopped);
  expect(await page.locator("[data-fw-sky]").evaluate((canvas) => (canvas as HTMLCanvasElement).width)).toBe(0);

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator("[data-fw-stage]")).not.toHaveAttribute("data-fw-paused", "");
  await expect(page.locator(".fw-torch__flames canvas")).toHaveCount(2);
  await expect.poll(() => page.locator("[data-fw-sky]").evaluate((canvas) => (canvas as HTMLCanvasElement).width)).toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("[data-fw-stage]")).toHaveAttribute("data-fw-paused", "");
  const reduced = await page.evaluate(() => ({ ...window.__fwWork }));
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => window.__fwWork)).toEqual(reduced);
  await expect(page.locator(".fw-flame").first()).toBeVisible();
  expect(await page.locator("[data-fw-sky]").evaluate((canvas) => (canvas as HTMLCanvasElement).width)).toBe(0);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the page and guide details remain usable", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/events/fireworks-2026/");
    await expect(page.locator("body")).toHaveClass(/fw-theme/);
    await expect(page.locator("[data-fw-mode]")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Fireworks on the Field" })).toBeVisible();
    await expect(page.getByText("St John Ambulance will be in the Hive throughout the event.")).toBeVisible();
    await expect(page.getByRole("link", { name: /Buy tickets/ })).toBeVisible();
    await expectStaticEffects(page);
  });
});

for (const width of [320, 393, 768, 1440]) {
  for (const textSize of [100, 200]) {
    test(`event torches end at the first parchment at ${width}px and ${textSize}% text`, async ({ page }) => {
      await page.setViewportSize({ width, height: 873 });
      await page.goto("/events/fireworks-2026/");
      await page.evaluate((size) => { document.documentElement.style.fontSize = `${size}%`; }, textSize);
      const bounds = () => page.evaluate(async () => {
        await document.fonts.ready;
        const summary = document.querySelector(".event-summary")!.getBoundingClientRect();
        const torches = document.querySelector(".fw-torches")!.getBoundingClientRect();
        const poles = [...document.querySelectorAll(".fw-torch__pole")].map((pole) => pole.getBoundingClientRect().bottom);
        const later = [...document.querySelectorAll(".event-main > .event-block")].map((panel) => panel.getBoundingClientRect().top);
        const roll = parseFloat(getComputedStyle(document.body).getPropertyValue("--fw-roll-overhang"));
        return { end: torches.bottom, paperEnd: summary.bottom + roll, poles, later };
      });
      await expect.poll(async () => Math.abs((await bounds()).end - (await bounds()).paperEnd)).toBeLessThanOrEqual(1);
      for (const panel of await page.locator(".event-main > .event-block").all()) {
        await panel.scrollIntoViewIfNeeded();
        const layout = await bounds();
        expect(Math.abs(layout.end - layout.paperEnd)).toBeLessThanOrEqual(1);
        expect(layout.poles).toHaveLength(2);
        expect(layout.poles.every((bottom) => Math.abs(bottom - layout.end) <= 1)).toBe(true);
        expect(layout.later.every((top) => top > layout.end)).toBe(true);
      }
    });
  }
}

// Detail grids must reflow from their own width, not only the viewport.
for (const width of [320, 390, 820, 1440]) {
  for (const theme of ["day", "night"]) {
    for (const enlargement of ["normal", "root", "elements"]) {
      test(`Fireworks detail columns contain their text at ${width}px ${theme} ${enlargement}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.addInitScript((theme) => localStorage.setItem("foa-theme", theme), theme);
        await page.goto("/events/fireworks-2026/");
        if (enlargement === "root") await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
        if (enlargement === "elements") await page.evaluate(() => {
          const elements = [...document.querySelectorAll<HTMLElement>("body *")];
          const sizes = elements.map((element) => parseFloat(getComputedStyle(element).fontSize));
          elements.forEach((element, index) => element.style.setProperty("font-size", `${sizes[index] * 2}px`, "important"));
        });
        await page.evaluate(() => document.fonts.ready);
        await expect(page.locator(".good-to-know").first()).toHaveCSS("font-size", enlargement === "normal" ? "16px" : "32px");
        if (enlargement === "normal" && width >= 820) {
          const columnCounts = await page.locator(".good-to-know").evaluateAll((lists) => lists.map((list) => getComputedStyle(list).gridTemplateColumns.split(" ").length));
          expect(columnCounts).toEqual([2, 2]);
        }
        const failures = await page.locator(".good-to-know").evaluateAll((lists) => lists.flatMap((list) => {
          const errors: string[] = [];
          for (const row of list.children) {
            const label = row.querySelector("dt")!;
            const value = row.querySelector("dd")!;
            const rowBox = row.getBoundingClientRect();
            const shouldStack = rowBox.width <= 17 * parseFloat(getComputedStyle(row).fontSize);
            const labelBox = label.getBoundingClientRect();
            const valueBox = value.getBoundingClientRect();
            if (shouldStack && valueBox.top < labelBox.bottom - 1) errors.push("detail row did not stack");
            if (valueBox.width < 1) errors.push("collapsed value column");
            if (valueBox.top < labelBox.bottom - 1 && valueBox.left < labelBox.right - 1) errors.push("overlapping label/value");
            for (const cell of [label, value]) {
              const box = cell.getBoundingClientRect();
              const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
              const range = document.createRange();
              while (walker.nextNode()) {
                const node = walker.currentNode;
                if (!node.textContent?.trim() || node.parentElement?.closest('.visually-hidden, [aria-hidden="true"]')) continue;
                range.selectNodeContents(node);
                if ([...range.getClientRects()].some((rect) => rect.width > 1 && (rect.left < box.left - 1 || rect.right > box.right + 1))) errors.push(`${cell.tagName}: text outside its column`);
              }
            }
          }
          return errors;
        }));
        expect(failures).toEqual([]);
      });
    }
  }
}
