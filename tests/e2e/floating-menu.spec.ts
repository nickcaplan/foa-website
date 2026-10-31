import { expect, test } from "@playwright/test";
import { routes } from "./routes";

for (const width of [320, 390, 768, 1023]) {
  test(`${width}px: every page has no header and a clear, fixed mobile burger`, async ({ page }) => {
    // A healthy sweep of every route takes ~20s per width; 60s caps a genuinely missing element without failing slow-but-healthy runs.
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const route of routes) {
      await page.goto(route);
      const header = page.locator(".site-header");
      const trigger = page.getByRole("button", { name: "Open menu" });
      await expect(header, route).toBeHidden();
      await expect(trigger, route).toBeVisible();
      await expect(trigger).toHaveCSS("position", "fixed");
      const before = await trigger.boundingBox();
      expect(before!.width).toBe(48);
      expect(before!.height).toBe(48);
      expect(before!.x + before!.width).toBeLessThanOrEqual(width);
      {
        const logo = page.locator(".page-logo-home");
        await expect(logo, route).toBeVisible();
        await expect(logo).toHaveAttribute("href", "/");
        const logoBox = (await logo.boundingBox())!;
        expect(logoBox.x + logoBox.width, route).toBeLessThan(before!.x);
        await expect(logo.locator("p, strong, span")).toHaveCount(0);
        const heading = (await page.locator(".mobile-page-heading-copy").boundingBox())!;
        if (route === "/") {
          // The combined Fireworks panel stacks the shared page-heading logo above a full-width heading.
          expect(logoBox.width, "/: logo matches the shared 128px page-heading size").toBe(128);
          if (width < 768) {
            // Phones: the logo is centred; the empty side margin beside a left-aligned logo read as a mistake beside the floating control.
            expect(Math.abs(logoBox.x + logoBox.width / 2 - (heading.x + heading.width / 2)), "/: the logo is centred above the heading").toBeLessThanOrEqual(1);
          } else {
            expect(heading.x, "/: the heading spans the panel under the logo").toBe(logoBox.x);
          }
          expect(heading.y, "/: the heading sits below the logo").toBeGreaterThanOrEqual(logoBox.y + logoBox.height);
        } else {
          expect(logoBox.width, `${route}: approved 128px logo size`).toBe(128);
          expect(logoBox.x, `${route}: consistent left anchor`).toBe(32);
          expect(logoBox.y, `${route}: consistent top anchor`).toBe(40);
          expect(heading.x, `${route}: the heading sits beside the logo`).toBeGreaterThanOrEqual(logoBox.x + logoBox.width);
        }
      }
      const logoBottom = await page.locator(".mobile-page-logo").evaluate((element) => element.getBoundingClientRect().bottom);
      if (route === "/") {
        const copy = page.locator(".hero-copy");
        await expect(copy.locator(".page-logo-home")).toBeVisible();
        await expect(copy.locator(".eyebrow")).toHaveCount(0);
        const title = (await copy.locator("h1").boundingBox())!;
        expect(title.y, "Homepage heading sits below the logo, clear of the controls").toBeGreaterThanOrEqual(logoBottom);
        expect(await copy.locator("h1").evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(24);
        const intro = (await copy.locator(":scope > p").boundingBox())!;
        const logo = (await copy.locator(".page-logo-home").boundingBox())!;
        expect(intro.x, "Homepage introduction uses the full panel width").toBe(title.x);
        expect(intro.y, "Homepage introduction follows the logo/title row").toBeGreaterThanOrEqual(logoBottom);
      }
      const panel = page.locator(".view-hero");
      if (await panel.count()) {
        expect((await panel.boundingBox())!.y, route).toBe(16);
        await expect(panel.locator(".page-logo-home"), route).toBeVisible();
        const eyebrow = await panel.locator(".eyebrow").boundingBox();
        expect(eyebrow!.y, `${route}: eyebrow should clear the floating controls`).toBeGreaterThanOrEqual(before!.y + before!.height);
        const intro = (await panel.locator(".view-hero-copy > p").boundingBox())!;
        const logo = (await panel.locator(".page-logo-home").boundingBox())!;
        expect(intro.x, `${route}: introduction uses the full panel width`).toBe(logo.x);
        expect(intro.y, `${route}: introduction sits below the logo`).toBeGreaterThanOrEqual(logoBottom);
      }
      const stage = page.locator(".fw-stage, .xmas-stage");
      if (await stage.count()) {
        expect((await stage.boundingBox())!.y, `${route}: artwork starts at the top without a logo strip`).toBe(0);
        await expect(stage.locator(".page-logo-home"), route).toBeVisible();
        await expect(page.locator("#main-content")).toHaveCSS("padding-top", "0px");
        await expect(stage).toHaveCSS("padding-top", "0px");
        if (route === "/events/fireworks-2026/") {
          const kicker = page.locator(".fw-kicker");
          await expect(kicker).toHaveCSS("min-height", "0px");
          const kickerBox = await kicker.boundingBox();
          expect(kickerBox!.y, `${route}: kicker should clear the floating controls`).toBeGreaterThanOrEqual(before!.y + before!.height);
          const title = await page.locator("main h1").boundingBox();
          expect(title!.y, `${route}: main heading should clear the controls`).toBeGreaterThanOrEqual(before!.y + before!.height);
        }
        if (route === "/fireworks-volunteering/") {
          await expect(page.locator(".fw-kicker")).toHaveCount(0);
          const title = await page.getByRole("heading", { level: 1, name: "Fireworks Volunteering" }).boundingBox();
          expect(title!.y, `${route}: heading should clear the floating controls`).toBeGreaterThanOrEqual(before!.y + before!.height);
          await expect(page.locator("main h1 span")).toHaveCSS("display", "block");
          await expect(page.locator(".event-hero-intro")).toHaveCSS("margin-top", "12px");
        }
        if (route === "/events/christmas-fayre-2026/") {
          await expect(page.locator(".xmas-baubles--desktop")).toBeHidden();
          await expect(page.locator(".xmas-baubles--mobile")).toBeVisible();
          const baubles = (await page.locator(".xmas-baubles--mobile").boundingBox())!;
          const title = (await page.locator("#xmas-title").boundingBox())!;
          expect(baubles.y, "Baubles must not push the opening logo down").toBeGreaterThanOrEqual(title.y + title.height);
        }
      }
      const overlapping = await page.locator("main h1, main h2, main p, main a, main button").evaluateAll((elements) => {
        const burger = document.querySelector(".menu-toggle")!.getBoundingClientRect();
        return elements.filter((element) => {
          const r = element.getBoundingClientRect();
          const right = r.right - parseFloat(getComputedStyle(element).paddingRight);
          return r.width && r.height && r.left < burger.right && right > burger.left && r.top < burger.bottom && r.bottom > burger.top;
        }).map((element) => element.textContent?.trim());
      });
      expect(overlapping, `${route}: opening copy must not sit beneath the burger`).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), route).toBeLessThanOrEqual(0);
      await page.evaluate(() => window.scrollTo(0, 800));
      await expect(trigger).toBeInViewport();
      expect((await trigger.boundingBox())!.y, route).toBe(before!.y);
      if (await page.evaluate((bottom) => scrollY > bottom, logoBottom)) {
        await expect(page.locator(".page-logo-home"), route).not.toBeInViewport();
      }
      const scroll = await page.evaluate(() => scrollY);
      await trigger.click();
      await expect(page.getByRole("button", { name: "Close menu" })).toBeFocused();
      await expect(page.locator(".mobile-menu [data-theme-toggle]")).toBeVisible();
      const focusable = page.locator("[data-mobile-menu] a[href], [data-mobile-menu] button:not([disabled])");
      await focusable.last().focus();
      await page.keyboard.press("Tab");
      await expect(focusable.first()).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      await expect(focusable.last()).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
      expect(await page.evaluate(() => scrollY), route).toBe(scroll);
      await trigger.click();
      await page.locator(".mobile-menu-home").click();
      await expect(page).toHaveURL(/\/$/);
      await expect(page.locator("body")).toHaveClass("homepage");
      if (route !== "/") {
        await page.goto(route);
        await page.locator(".page-logo-home").click();
        await expect(page).toHaveURL(/\/$/);
        await expect(page.locator("body")).toHaveClass("homepage");
      }
    }
  });
}

// The full navigation shows from 80rem (1280px) up, where the header runs
// wider than the page column; below that the burger takes over so links never
// wrap (approved 18 October 2026).
for (const width of [1280, 1440]) {
  test(`${width}px: all pages use the homepage desktop navigation, with no burger after scrolling`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator(".site-header"), route).toBeVisible();
      await expect(page.locator(".mobile-page-logo"), route).toBeHidden();
      if (route === "/events/christmas-fayre-2026/") {
        await expect(page.locator(".xmas-baubles--desktop")).toBeVisible();
        await expect(page.locator(".xmas-baubles--mobile")).toBeHidden();
      }
      await expect(page.getByRole("navigation", { name: "Primary navigation" }), route).toBeVisible();
      await expect(page.locator(".menu-toggle"), route).toBeHidden();
      const introduction = await page.locator(".site-header .home-introduction").boundingBox();
      const navigation = await page.locator(".desktop-nav").boundingBox();
      expect(navigation!.x, route).toBeGreaterThanOrEqual(introduction!.x + introduction!.width);
      expect(navigation!.y, route).toBeGreaterThanOrEqual(introduction!.y);
      expect(navigation!.y + navigation!.height, route).toBeLessThanOrEqual(introduction!.y + introduction!.height);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), route).toBeLessThanOrEqual(0);
      await page.evaluate(() => window.scrollTo(0, 800));
      await expect(page.locator(".menu-toggle"), route).toBeHidden();
    }
  });
}

for (const route of ["/", "/newsletter/", "/uniform/"]) {
  test(`${route}: 1024px shows the burger instead of navigation links, with no wrapping`, async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto(route);
    await expect(page.locator(".site-header"), route).toBeVisible();
    await expect(page.locator(".desktop-nav"), route).toBeHidden();
    await expect(page.getByRole("button", { name: "Open menu" }), route).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), route).toBeLessThanOrEqual(0);
  });
}
