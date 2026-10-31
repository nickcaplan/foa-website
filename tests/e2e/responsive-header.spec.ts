import { expect, test } from "@playwright/test";

for (const width of [320, 390, 768, 1023]) {
  test(`${width}px: homepage heading keeps every word inside the panel at its CSS size`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const title = page.locator(".hero-copy h1");
    await expect(title).toBeVisible();
    // The title is pure CSS (clamp with viewport-capped chrome), so it always scales with the visitor's text size.
    expect(await title.evaluate((heading) => heading.style.fontSize)).toBe("");
    const leading = await title.evaluate((heading) => {
      const style = getComputedStyle(heading);
      return parseFloat(style.lineHeight) / parseFloat(style.fontSize);
    });
    expect(leading).toBeCloseTo(1.2, 2);
    const fits = await title.evaluate((heading) => {
      const bounds = heading.getBoundingClientRect();
      const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        for (const word of walker.currentNode.textContent!.matchAll(/\S+/g)) {
          const range = document.createRange();
          range.setStart(walker.currentNode, word.index);
          range.setEnd(walker.currentNode, word.index + word[0].length);
          const rects = range.getClientRects();
          if (rects.length !== 1) return false;
          if (rects[0].left < bounds.left - 0.5 || rects[0].right > bounds.right + 0.5) return false;
        }
      }
      return true;
    });
    expect(fits, "no word breaks out of the panel").toBe(true);
  });
}

test("homepage heading scales with enlarged text and stays whole", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/");
  const title = page.locator(".hero-copy h1");
  const normal = await title.evaluate((heading) => parseFloat(getComputedStyle(heading).fontSize));
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  const enlarged = await title.evaluate((heading) => parseFloat(getComputedStyle(heading).fontSize));
  expect(enlarged / normal, "the title grows with the visitor's text size").toBeGreaterThan(1.8);
  const fits = await title.evaluate((heading) => {
    const bounds = heading.getBoundingClientRect();
    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      for (const word of walker.currentNode.textContent!.matchAll(/\S+/g)) {
        const range = document.createRange();
        range.setStart(walker.currentNode, word.index);
        range.setEnd(walker.currentNode, word.index + word[0].length);
        const rects = range.getClientRects();
        if (rects.length !== 1) return false;
        if (rects[0].left < bounds.left - 0.5 || rects[0].right > bounds.right + 0.5) return false;
      }
    }
    return true;
  });
  expect(fits, "words stay whole inside the panel at 200%").toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
});

test.describe("homepage heading without JavaScript", () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 390, height: 900 } });
  test("retains its readable CSS size", async ({ page }) => {
    await page.goto("/");
    const title = page.locator(".hero-copy h1");
    await expect(title).toBeVisible();
    expect(await title.evaluate((heading) => parseFloat(getComputedStyle(heading).fontSize))).toBeGreaterThanOrEqual(24);
    expect(await title.evaluate((heading) => heading.style.fontSize)).toBe("");
  });
});

// Below 80rem the burger takes over so links never wrap at the default text
// size; enlarged text may still wrap between items (approved 18 October 2026).
for (const route of ["/", "/uniform/", "/events/christmas-fayre-2026/"]) {
  for (const width of [1024, 1200]) {
    test(`${route}: ${width}px shows the burger instead of the navigation links`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route);
      await expect(page.locator(".site-header .home-introduction")).toBeVisible();
      await expect(page.locator(".desktop-nav")).toBeHidden();
      await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
      expect(await page.locator(".header-inner").evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    });
  }

  test(`${route}: desktop navigation and Night Mode fit enlarged text at 1440px`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(route);
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator(".site-header .home-introduction")).toBeVisible();
    await expect(page.getByRole("button", { name: "Open menu" })).toBeHidden();
    const controls = page.locator(".desktop-nav a, .header-theme-toggle button");
    const layout = await controls.evaluateAll((elements) => elements.map((element) => {
      const bounds = element.getBoundingClientRect();
      return { label: element.textContent?.trim() || element.getAttribute("aria-label"), left: bounds.left, right: bounds.right, viewport: innerWidth };
    }));
    expect(layout.length).toBeGreaterThan(0);
    for (const control of layout) {
      expect(control.left, control.label ?? route).toBeGreaterThanOrEqual(0);
      expect(control.right, control.label ?? route).toBeLessThanOrEqual(control.viewport);
    }
    const navigation = await page.locator(".desktop-nav").boundingBox();
    const theme = await page.locator(".header-theme-toggle").boundingBox();
    expect(navigation!.x + navigation!.width).toBeLessThanOrEqual(theme!.x);
    expect(await page.locator(".header-inner").evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  });
}

for (const route of ["/", "/newsletter/", "/uniform/", "/events/christmas-fayre-2026/", "/fireworks-volunteering/"]) {
  test(`${route}: mobile logos stay beside headings and reflow with enlarged text`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto(route);
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    await expect(page.locator(".page-logo-home"), route).toBeVisible();
    const layout = await page.locator(".mobile-page-heading").evaluate((element) => {
      const logo = element.querySelector(".page-logo-home")!.getBoundingClientRect();
      const copy = element.querySelector(".mobile-page-heading-copy")!.getBoundingClientRect();
      return { logoLeft: logo.left, logoRight: logo.right, copyLeft: copy.left, copyRight: copy.right, viewport: innerWidth, overflow: document.documentElement.scrollWidth - innerWidth };
    });
    if (route === "/") {
      // The Fireworks panel centres the logo above the full-width heading at phone width (this spec runs at 320px).
      expect(Math.abs(layout.logoLeft + (layout.logoRight - layout.logoLeft) / 2 - layout.viewport / 2), route).toBeLessThanOrEqual(1);
    } else {
      expect(layout.copyLeft, route).toBeGreaterThanOrEqual(layout.logoRight);
    }
    expect(layout.copyRight, route).toBeLessThanOrEqual(layout.viewport);
    expect(layout.overflow, route).toBeLessThanOrEqual(0);
  });
}

test("enlarged homepage text keeps the menu and hero actions inside a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/");
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });

  await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
  await expect(page.locator(".hero-copy .page-logo-home")).toBeVisible();
  expect(await page.locator(".hero-copy .mobile-page-heading, .hero-copy .page-logo-home, .hero-copy .page-logo-home img, .hero-copy .mobile-page-heading-copy, .hero-copy h1").evaluateAll((elements) =>
    elements.map((element) => {
      const { left, right } = element.getBoundingClientRect();
      return { element: element.className || element.tagName, left, right, viewport: window.innerWidth, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth };
    }).filter(({ left, right, viewport, scrollWidth, clientWidth }) =>
      left < 0 || right > viewport || scrollWidth > clientWidth),
  ), "Homepage logo and heading must reflow when text is enlarged").toEqual([]);
  expect(await page.locator(".footer-brand-home, .footer-brand-home img, .footer-brand-home h2").evaluateAll((elements) =>
    elements.map((element) => {
      const { left, right } = element.getBoundingClientRect();
      return { element: element.tagName, left, right, viewport: window.innerWidth };
    }).filter(({ left, right, viewport }) => left < 0 || right > viewport),
  ), "Footer branding must reflow when text is enlarged").toEqual([]);
  const layout = await page.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    const outside = (rect: DOMRect) => rect.width > 0 && (rect.left < 0 || rect.right > viewport);
    const elements = Array.from(document.body.querySelectorAll<HTMLElement>("*")).flatMap((element) => {
      if (element.closest(".visually-hidden") || getComputedStyle(element).visibility === "hidden" || !element.getClientRects().length) return [];
      const rect = element.getBoundingClientRect();
      const text = Array.from(element.childNodes).flatMap((node) => {
        if (node.nodeType !== Node.TEXT_NODE || !node.textContent?.trim()) return [];
        const range = document.createRange();
        range.selectNodeContents(node);
        return Array.from(range.getClientRects()).filter(outside).map(({ left, right }) => ({ text: node.textContent!.trim().slice(0, 100), left, right }));
      });
      if (!outside(rect) && !text.length) return [];
      return [{ element: element.tagName, className: element.getAttribute("class"), left: rect.left, right: rect.right, text }];
    });
    return { overflow: document.documentElement.scrollWidth - viewport, elements };
  });
  expect(layout.overflow, `Out-of-viewport content: ${JSON.stringify(layout.elements, null, 2)}`).toBeLessThanOrEqual(0);
  // The hero clips overflow, so document width alone cannot catch spilling actions.
  expect(await page.locator(".menu-toggle, .hero-actions .button").evaluateAll((elements) =>
    elements.every((element) => {
      const { left, right, width, height } = element.getBoundingClientRect();
      return left >= 0 && right <= window.innerWidth && width >= 44 && height >= 44;
    }),
  )).toBe(true);
});

// The header runs wider than the page column (80rem against 75rem) so the
// full navigation fits on one row beside the branding at desktop widths
// (approved 18 October 2026).
for (const width of [1280, 1440]) {
  for (const route of ["/", "/newsletter/", "/uniform/", "/events/christmas-fayre-2026/", "/fireworks-volunteering/"]) {
    test(`${route}: ${width}px keeps the desktop navigation on a single row`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator(".desktop-nav")).toBeVisible();
      const layout = await page.locator(".desktop-nav a").evaluateAll((links) =>
        links.map((link) => {
          const bounds = link.getBoundingClientRect();
          return { label: link.textContent?.trim(), top: Math.round(bounds.top), right: bounds.right, viewport: innerWidth };
        }),
      );
      expect(layout.length).toBeGreaterThan(1);
      for (const link of layout) {
        expect(link.top, link.label ?? route).toBe(layout[0].top);
        expect(link.right, link.label ?? route).toBeLessThanOrEqual(link.viewport);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    });
  }
}
