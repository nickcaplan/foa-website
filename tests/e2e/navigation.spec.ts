import { devices, expect, test } from "@playwright/test";

test("main task routes are reachable through normal navigation", async ({ page }) => {
  await page.goto("/");

  const destinations = [
    { name: "Newsletter", path: "/newsletter/" },
    { name: "What's On", path: "/whats-on/" },
    { name: "Fundraising", path: "/fundraising/" },
    { name: "Uniform", path: "/uniform/" },
    { name: "Get Involved", path: "/get-involved/" },
  ];

  const first = destinations[0];
  await page.getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: first.name }).click();
  await expect(page).toHaveURL(new RegExp(`${first.path}$`));
  await expect(page.getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: first.name }))
    .toHaveAttribute("aria-current", "page");

  for (const destination of destinations.slice(1)) {
    await page.getByRole("navigation", { name: "Primary navigation" })
      .getByRole("link", { name: destination.name }).click();
    await expect(page).toHaveURL(new RegExp(`${destination.path}$`));
    await expect(page.getByRole("navigation", { name: "Primary navigation" })
      .getByRole("link", { name: destination.name }))
      .toHaveAttribute("aria-current", "page");
  }
});

test.describe("mobile menu touch journeys", () => {
  const { defaultBrowserType: _browserType, ...device } = devices["Pixel 5"];
  test.use(device);

  test("all menu task routes load successfully and close the menu", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("foa-cookie-preferences", "essential");
    });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");

    for (const destination of [
      { name: "Get Involved", path: "/get-involved/" },
      { name: "Uniform", path: "/uniform/" },
      { name: "Contact Us", path: "/contact/" },
      { name: "Home", path: "/" },
      { name: "What's On", path: "/whats-on/" },
      { name: "Fundraising", path: "/fundraising/" },
      { name: "Newsletter", path: "/newsletter/" },
    ]) {
      await page.getByRole("button", { name: "Open menu" }).tap();
      const navigation = page.getByRole("navigation", { name: "Mobile navigation" });
      const [response] = await Promise.all([
        page.waitForResponse((response) => response.request().isNavigationRequest()
          && response.request().frame() === page.mainFrame()
          && new URL(response.url()).pathname === destination.path),
        navigation.getByRole("link", { name: destination.name, exact: true }).tap(),
      ]);
      expect(response.status(), destination.name).toBe(200);
      await expect(page).toHaveURL((url) => url.pathname === destination.path);
      await expect(page.locator("main h1:visible")).toBeVisible();
      await expect(page.locator("[data-mobile-menu]")).toHaveAttribute("aria-hidden", "true");
    }
    expect(errors).toEqual([]);
  });
});

test("cookie choices are unobtrusive, remembered and can be changed", async ({ page }) => {
  await page.goto("/");

  const banner = page.locator("[data-cookie-banner]");
  await expect(banner).toBeVisible();
  await page.getByRole("button", { name: "Reject analytics cookies" }).click();
  await expect(banner).toBeHidden();
  await expect(page.locator("[data-google-analytics]")).toHaveCount(0);

  await page.reload();
  await expect(banner).toBeHidden();

  await page.getByRole("contentinfo").getByRole("link", { name: "Privacy & cookies", exact: true }).click();
  await page.getByRole("button", { name: "Cookie preferences", exact: true }).click();
  await expect(banner).toBeVisible();
  await page.getByRole("button", { name: "Allow analytics cookies" }).click();
  await expect(banner).toBeHidden();
  await expect(page.locator("[data-google-analytics]")).toHaveCount(1);
});

test.describe("mobile navigation", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const width of [320, 360, 390, 430]) {
    test(`Contact Us fits without scrolling at ${width}px wide`, async ({ page }) => {
      await page.setViewportSize({ width, height: 667 });
      await page.goto("/events/fireworks-2026/");
      await page.getByRole("button", { name: "Open menu" }).click();
      const panel = page.locator(".mobile-menu-panel");
      await expect(panel).toHaveJSProperty("scrollTop", 0);
      const contact = await panel.getByRole("link", { name: "Contact Us", exact: true }).boundingBox();
      expect(contact).not.toBeNull();
      expect(contact!.y + contact!.height).toBeLessThanOrEqual(667 - 16);
      const layout = await panel.evaluate((element) => ({
        overflow: element.scrollWidth - element.clientWidth,
        targets: [...element.querySelectorAll("nav a, button")].map((target) => target.getBoundingClientRect().height),
        logoTopGap: getComputedStyle(element.querySelector(".mobile-menu-logo")!).marginTop,
      }));
      expect(layout.overflow).toBeLessThanOrEqual(0);
      for (const height of layout.targets) expect(height).toBeGreaterThanOrEqual(44);
      expect(layout.logoTopGap).toBe(width >= 416 ? "8px" : "44px");
      if (width >= 416) {
        const logo = await panel.locator(".mobile-menu-logo").boundingBox();
        const controls = await panel.locator(".mobile-menu-controls").boundingBox();
        expect(logo!.y).toBeLessThan(controls!.y + controls!.height);
        expect(logo!.x + logo!.width).toBeLessThanOrEqual(controls!.x);
      }
    });
  }

  test("Contact Us remains reachable on short screens with enlarged text", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 480 });
    await page.goto("/");
    await page.addStyleTag({ content: "html { font-size: 200%; }" });
    await page.getByRole("button", { name: "Open menu" }).click();
    const panel = page.locator(".mobile-menu-panel");
    const contact = panel.getByRole("link", { name: "Contact Us", exact: true });
    await contact.scrollIntoViewIfNeeded();
    await expect(contact).toBeInViewport({ ratio: 1 });
    expect(await panel.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(0);
    await contact.click();
    await expect(page).toHaveURL(/\/contact\/$/);
  });

  test("opens with accessible state and closes by button, Escape and backdrop", async ({ page }) => {
    await page.goto("/");

    const openButton = page.getByRole("button", { name: "Open menu" });
    const closeButton = page.getByRole("button", { name: "Close menu" });
    const menu = page.locator("[data-mobile-menu]");

    await openButton.click();
    await expect(openButton).toHaveAttribute("aria-expanded", "true");
    await expect(menu).toHaveAttribute("aria-hidden", "false");
    await expect(closeButton).toBeVisible();
    await expect(closeButton).toBeEnabled();

    await closeButton.click();
    await expect(openButton).toHaveAttribute("aria-expanded", "false");
    await expect(menu).toHaveAttribute("aria-hidden", "true");
    await expect(openButton).toBeFocused();

    await openButton.click();
    await page.keyboard.press("Escape");
    await expect(menu).toHaveAttribute("aria-hidden", "true");
    await expect(openButton).toBeFocused();

    await openButton.click();
    await menu.click({ position: { x: 10, y: 400 } });
    await expect(menu).toHaveAttribute("aria-hidden", "true");
    await expect(openButton).toBeFocused();
  });

  test("exposes the task routes and closes after following a link", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();

    const navigation = page.getByRole("navigation", { name: "Mobile navigation" });
    await expect(navigation.getByRole("link"))
      .toHaveText(["Home→", "Newsletter→", "What's On→", "Christmas Fayre→", "Fundraising→", "Get Involved→", "Uniform→", "Contact Us"]);
    await expect(navigation.locator(".mobile-menu-arrow")).toHaveCount(7);
    for (const arrow of await navigation.locator(".mobile-menu-arrow").all()) {
      await expect(arrow).toHaveAttribute("aria-hidden", "true");
    }
    const typography = await navigation.evaluate((element) => {
      const main = getComputedStyle(element.querySelector("a")!);
      const event = getComputedStyle(element.querySelector(".mobile-menu-events a")!);
      return { mainSize: main.fontSize, eventSize: event.fontSize, mainFont: main.fontFamily, eventFont: event.fontFamily };
    });
    expect(typography.mainSize).toBe("22px");
    expect(typography.eventSize).toBe("21px");
    expect(typography.eventFont).toBe(typography.mainFont);
    await expect(page.locator(".mobile-menu-logo")).toHaveCSS("width", "104px");

    await navigation.getByRole("link", { name: "Uniform" }).click();
    await expect(page).toHaveURL(/\/uniform\/$/);
    await expect(page.locator("[data-mobile-menu]")).toHaveAttribute("aria-hidden", "true");

    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.getByRole("navigation", { name: "Mobile navigation" })
      .getByRole("link", { name: "Uniform" }))
      .toHaveAttribute("aria-current", "page");

    await page.getByRole("navigation", { name: "Mobile navigation" })
      .getByRole("link", { name: "Fundraising" }).click();
    await expect(page).toHaveURL(/\/fundraising\/$/);
    await expect(page.locator("[data-mobile-menu]")).toHaveAttribute("aria-hidden", "true");
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.getByRole("navigation", { name: "Mobile navigation" })
      .getByRole("link", { name: "Fundraising" }))
      .toHaveAttribute("aria-current", "page");
  });
});
