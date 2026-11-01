import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { routes } from "./routes";

const key = "foa-theme";
const dayBackground = "rgb(246, 241, 231)";
const nightBackground = "rgb(23, 36, 29)";
const menuToggleOf = (page: Page) => page.locator(".mobile-menu [data-theme-toggle]");
const headerToggleOf = (page: Page) => page.locator(".site-header [data-theme-toggle]");
const themeToggleIsInMenu = async (page: Page) =>
  !(await headerToggleOf(page).isVisible());
const themeToggleOf = async (page: Page) => {
  const inMenu = await themeToggleIsInMenu(page);
  return inMenu ? menuToggleOf(page) : headerToggleOf(page);
};
const openMenu = async (page: Page) => {
  const trigger = page.getByRole("button", { name: "Open menu" });
  if (!(await trigger.isVisible())) await page.evaluate(() => window.scrollTo(0, 800));
  await expect(trigger).toBeVisible();
  if (await page.locator("[data-mobile-menu]").getAttribute("aria-hidden") === "true") await trigger.click();
  await expect(page.locator("[data-mobile-menu]")).toHaveAttribute("aria-hidden", "false");
};
const openThemeToggle = async (page: Page) => {
  const toggle = await themeToggleOf(page);
  if (await themeToggleIsInMenu(page)) await openMenu(page);
  await expect(toggle).toBeVisible();
  return toggle;
};
const closeMenu = async (page: Page) => {
  if (await page.locator("[data-mobile-menu]").getAttribute("aria-hidden") === "false") {
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-mobile-menu]")).toHaveAttribute("aria-hidden", "true");
    await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();
  }
};

// Colour transitions make computed styles lag behind a theme switch, which skews contrast scans.
const freezeTransitions = (page: Page) => page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; }" });

test("every page in the build is covered by the Night Mode scans", () => {
  expect(routes.length).toBeGreaterThanOrEqual(15);
  for (const route of ["/", "/fundraising/", "/fireworks-volunteering/", "/events/christmas-fayre-2026/", "/events/fireworks-2026/", "/about/", "/whats-on/", "/404.html"]) {
    expect(routes).toContain(route);
  }
});

for (const [scheme, night] of [["dark", true], ["light", false]] as const) {
  test(`a first visit follows a ${scheme} device setting`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/");
    await expect(page.locator("html")).toHaveCSS("color-scheme", scheme);
    await expect(page.locator("body")).toHaveCSS("background-color", night ? nightBackground : dayBackground);
    const toggle = await openThemeToggle(page);
    await expect(toggle).toHaveAttribute("aria-pressed", String(night));
    await closeMenu(page);
    expect(await page.evaluate((storageKey) => localStorage.getItem(storageKey), key)).toBeNull();
  });
}

test("the theme is applied before the page body so there is no flash", async ({ page }) => {
  const html = await (await page.goto("/"))!.text();
  expect(html.indexOf("data-theme-initializer")).toBeGreaterThan(-1);
  expect(html.indexOf("data-theme-initializer")).toBeLessThan(html.indexOf("<body"));
});

test("mobile Night Mode sits beside the close button without a labelled row", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto("/");
  await openMenu(page);
  const toggle = menuToggleOf(page);
  const close = page.getByRole("button", { name: "Close menu" });
  await expect(toggle).toBeVisible();
  await expect(page.locator(".mobile-menu-theme")).toHaveText("");
  const toggleBox = await toggle.boundingBox();
  const closeBox = await close.boundingBox();
  expect(toggleBox).not.toBeNull();
  expect(closeBox).not.toBeNull();
  expect(toggleBox!.x + toggleBox!.width).toBeLessThanOrEqual(closeBox!.x);
  expect(Math.abs(toggleBox!.y + toggleBox!.height / 2 - closeBox!.y - closeBox!.height / 2)).toBeLessThanOrEqual(1);
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
});

test("the toggle is keyboard accessible, remembered, and independent of cookie consent", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  const toggle = await openThemeToggle(page);
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await toggle.focus();
  await page.keyboard.press("Space");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(toggle).toBeFocused();
  await expect(page.locator("html")).toHaveCSS("color-scheme", "light");
  expect(await page.evaluate((storageKey) => localStorage.getItem(storageKey), key)).toBe("day");
  expect(await page.evaluate(() => localStorage.getItem("foa-cookie-preferences"))).toBeNull();
  await expect(page.locator("[data-google-analytics]")).toHaveCount(0);
  await closeMenu(page);

  // An explicit Day choice beats a dark device setting, across navigation and reloads.
  await openMenu(page);
  await page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "Uniform" }).click();
  await expect(page.locator("body")).toHaveCSS("background-color", dayBackground);
  await page.reload();
  const uniformToggle = await openThemeToggle(page);
  await expect(uniformToggle).toHaveAttribute("aria-pressed", "false");
  await uniformToggle.click();
  await closeMenu(page);
  await page.reload();
  const reloadedToggle = await openThemeToggle(page);
  await expect(reloadedToggle).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate((storageKey) => localStorage.getItem(storageKey), key)).toBe("night");
});

test("device setting changes apply only while the visitor has not chosen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  const toggle = await openThemeToggle(page);
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(toggle).toHaveAttribute("aria-pressed", "true");

  await toggle.click();
  await closeMenu(page);
  await page.emulateMedia({ colorScheme: "light" });
  const dayToggle = await openThemeToggle(page);
  await expect(dayToggle).toHaveAttribute("aria-pressed", "false");
  await closeMenu(page);
  await expect(page.locator("body")).toHaveCSS("background-color", dayBackground);
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("body")).toHaveCSS("background-color", dayBackground);
});

test("blocked storage falls back safely but still allows switching", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new DOMException("Blocked", "SecurityError"); } });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  const toggle = await openThemeToggle(page);
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await closeMenu(page);
  await expect(page.locator("body")).toHaveCSS("background-color", nightBackground);
  await page.reload();
  await expect(await openThemeToggle(page)).toHaveAttribute("aria-pressed", "false");
  await closeMenu(page);
});

test("invalid saved values are ignored in favour of the device setting", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.addInitScript((storageKey) => localStorage.setItem(storageKey, "unexpected"), key);
  await page.goto("/");
  const toggle = await openThemeToggle(page);
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await closeMenu(page);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false, colorScheme: "dark" });

  test("the page stays in Day Mode and the unusable toggle is not shown", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toHaveCSS("background-color", dayBackground);
    for (const toggle of await page.locator("[data-theme-toggle]").all()) await expect(toggle).toBeHidden();
  });
});

for (const width of [320, 390, 1440]) {
  test(`${width}px: all routes remain readable and fit in both modes`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light" });
    for (const route of routes) {
      const response = await page.goto(route);
      // The static preview serves 404.html with a 200 when requested directly.
      expect(response?.status(), route).toBe(200);
      const inMenu = await themeToggleIsInMenu(page);
      // Fireworks and Christmas pages keep their own night-sky theme in both modes.
      const themed = (await page.locator("body.fw-theme, body.xmas-theme").count()) > 0;
      let themedBackground = "";
      for (const night of [false, true]) {
        await page.evaluate(() => window.scrollTo(0, 0));
        const toggle = await openThemeToggle(page);
        if (await toggle.getAttribute("aria-pressed") !== String(night)) await toggle.click();
        await expect(toggle).toHaveAttribute("aria-pressed", String(night));
        const sizes = await page.evaluate((insideMenu) => {
          const toggle = document.querySelector(insideMenu ? ".mobile-menu [data-theme-toggle]" : ".site-header [data-theme-toggle]")!.getBoundingClientRect();
          const header = document.querySelector(".site-header")?.getBoundingClientRect();
          const brand = document.querySelector(".brand")?.getBoundingClientRect();
          const menu = document.querySelector(".menu-toggle")!.getBoundingClientRect();
          return {
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            target: Math.min(toggle.width, toggle.height),
            insideHeader: insideMenu || Boolean(header && toggle.top >= header.top && toggle.bottom <= header.bottom && toggle.left >= 0 && toggle.right <= window.innerWidth),
            sameRow: insideMenu || Boolean(!brand || (toggle.top < brand.bottom && toggle.bottom > brand.top)),
            clearOfMenu: insideMenu || menu.width === 0 || toggle.right <= menu.left || toggle.left >= menu.right,
            alteredImages: [...document.querySelectorAll<HTMLImageElement>("img")].filter((image) => getComputedStyle(image).filter !== "none").length,
          };
        }, inMenu);
        await closeMenu(page);
        if (!night) themedBackground = await page.locator("body").evaluate((body) => getComputedStyle(body).backgroundColor);
        await expect(page.locator("body")).toHaveCSS("background-color", themed ? themedBackground : night ? nightBackground : dayBackground);
        expect(sizes.overflow, `${route} ${night ? "night" : "day"}`).toBeLessThanOrEqual(0);
        expect(sizes.target).toBeGreaterThanOrEqual(44);
        if (!inMenu) {
          expect(sizes.insideHeader, route).toBe(true);
          expect(sizes.sameRow, `${route} ${width}px toggle row`).toBe(true);
          expect(sizes.clearOfMenu, route).toBe(true);
        }
        expect(sizes.alteredImages).toBe(0);
      }
    }
  });
}

for (const width of [390, 1440]) {
  for (const route of routes) {
    test(`${width}px: ${route} has no serious Night Mode accessibility violations`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
      await page.goto(route);
      await freezeTransitions(page);
      const toggle = await openThemeToggle(page);
      await expect(toggle).toHaveAttribute("aria-pressed", "true");
      await closeMenu(page);
      if (route === "/newsletter/") {
        for (const id of ["newsletter-latest-more", "newsletter-back-to-school-2026-more"]) {
          if (width === 1440 && id !== "newsletter-latest-more") {
            await page.getByRole("navigation", { name: "Newsletter issues" }).locator('a[href="#newsletter-issue-back-to-school-2026"]').click();
          }
          await page.locator(`[aria-controls="${id}"]`).click();
        }
        await expect(page.getByRole("button", { name: /Show less/ })).toHaveCount(width === 1440 ? 1 : 2);
        await page.waitForFunction(() => document.getAnimations().length === 0);
        await expect(page.locator(".newsletter-sheet").first()).toHaveCSS("color", "rgb(25, 49, 39)");
        await expect(page.locator(".newsletter-sheet").first()).toHaveCSS("background-color", "rgb(231, 222, 204)");
      }
      await expect(page.locator("[data-mobile-menu]")).toHaveAttribute("aria-hidden", "true");
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(results.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
    });
  }
}

test("patched amber and heading accents use the Night Mode ink", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/about/");
  await freezeTransitions(page);
  for (const number of await page.locator(".pillar-number").all()) await expect(number).toHaveCSS("color", "rgb(244, 211, 157)");
  await page.goto("/get-involved/");
  await freezeTransitions(page);
  const badge = page.locator(".involved-badge").first();
  await expect(badge).toBeVisible();
  await expect(badge).toHaveCSS("color", "rgb(244, 211, 157)");
  await expect(badge).toHaveCSS("background-color", "rgb(73, 56, 30)");
});

test("pages with their own parchment or night-sky theme look the same in both modes", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light" });
  const snapshot = () => page.evaluate(() => {
    const roots = document.querySelectorAll(".event-feature--poster, .fw-event, .fw-vol, .xmas-frame");
    return [...roots].flatMap((root) => [root, ...root.querySelectorAll("*")]).filter((element) => !element.closest(".visually-hidden")).map((element, index) => {
      const style = getComputedStyle(element);
      const ownText = [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
      return [index, element.tagName, element.className, ownText ? style.color : "", style.backgroundColor, style.backgroundImage, style.borderTopWidth === "0px" ? "" : style.borderColor, style.boxShadow].join("|");
    });
  });
  for (const route of ["/", "/events/fireworks-2026/", "/events/christmas-fayre-2026/", "/fireworks-volunteering/"]) {
    await page.goto(route);
    await freezeTransitions(page);
    let toggle = await openThemeToggle(page);
    await closeMenu(page);
    const day = await snapshot();
    // Sanity floor that the snapshot captured real content: the homepage
    // poster is intentionally lean (kicker, linked image, sponsor ribbon) and
    // yields 7 entries; the other themed pages keep the original floor of 10.
    // The exact day/night equality below is the real check.
    expect(day.length, route).toBeGreaterThan(route === "/" ? 5 : 10);
    toggle = await openThemeToggle(page);
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await closeMenu(page);
    expect(await snapshot(), route).toEqual(day);
    toggle = await openThemeToggle(page);
    await toggle.click();
    await closeMenu(page);
  }
});

test("mobile menu keeps visible dividers and readable links in Night Mode", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
  await page.goto("/");
  await freezeTransitions(page);
  await page.getByRole("button", { name: "Reject analytics cookies" }).click();
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(menuToggleOf(page)).toHaveAttribute("aria-pressed", "true");
  const link = page.locator(".mobile-menu nav a:not(.button):not([aria-current])").first();
  await expect(link).toBeVisible();
  await expect(link).toHaveCSS("border-bottom-color", "rgb(101, 120, 107)");
  await expect(link).toHaveCSS("color", "rgb(238, 232, 220)");
});

test("mobile menu and cookie controls remain accessible at enlarged scale", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
  await page.goto("/");
  await page.getByRole("button", { name: "Reject analytics cookies" }).click();
  await page.getByRole("button", { name: "Open menu" }).click();
  const scan = () => new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect((await scan()).violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();
  await page.getByRole("contentinfo").getByRole("link", { name: "Privacy & cookies", exact: true }).click();
  await page.getByRole("button", { name: "Cookie preferences", exact: true }).click();
  await expect(page.locator("[data-cookie-banner]")).toBeVisible();
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  expect((await scan()).violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
});
