import { expect, test, type Page } from "@playwright/test";

const route = "/events/christmas-fayre-2026/";

const shown = (page: Page, selector: string) =>
  page.locator(selector).evaluateAll((nodes) => nodes.filter((node) => node.getClientRects().length > 0 && getComputedStyle(node).display !== "none").length);

test.describe("Christmas Fayre decoration", () => {
  test("shows every bauble and snowflake on a desktop-width screen", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(route);

    expect(await shown(page, ".xmas-baubles li")).toBe(20);
    expect(await shown(page, ".xmas-snow i")).toBe(28);
  });

  for (const width of [320, 390, 768, 1280, 1920]) {
    test(`keeps snowflakes out of the reading area at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(route);

      // The snow layer fills the viewport while scrolling, so check every flake against the
      // content column (the widest section, 62rem, or the page width less 1rem each side).
      const result = await page.evaluate(() => {
        const content = Math.min(document.documentElement.clientWidth - 32, 62 * parseFloat(getComputedStyle(document.documentElement).fontSize));
        const left = (document.documentElement.clientWidth - content) / 2;
        const right = left + content;
        const inside = [...document.querySelectorAll(".xmas-snow i")]
          .filter((flake) => getComputedStyle(flake).display !== "none")
          .filter((flake) => {
            const box = flake.getBoundingClientRect();
            return box.right > left + 0.5 && box.left < right - 0.5;
          }).length;
        return inside;
      });
      expect(result).toBe(0);
    });
  }

  for (const width of [320, 390, 767]) {
    test(`is reduced to 7 hangers and 14 flakes at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(route);

      expect(await shown(page, ".xmas-baubles li")).toBe(7);
      expect(await shown(page, ".xmas-snow i")).toBe(14);
    });
  }

  for (const width of [390, 820, 1280]) {
    test(`places the sponsor mark below the logo on phones and tablets, below the title on wide screens at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route);

      const mark = (await page.locator(".xmas-credit img").boundingBox())!;
      const title = (await page.locator("#xmas-title").boundingBox())!;
      await expect(page.getByText("Something magical is coming", { exact: false })).toHaveCount(0);
      if (width < 1024) {
        const logo = (await page.locator(".mobile-page-logo").boundingBox())!;
        expect(mark.y, "mark sits below the Christmas logo").toBeGreaterThanOrEqual(logo.y + logo.height);
        expect(mark.x, "mark is in the logo column, not under the title").toBeLessThan(title.x);
      } else {
        expect(mark.y, "mark sits below the title").toBeGreaterThanOrEqual(title.y + title.height);
      }
    });
  }

  for (const width of [320, 390, 820]) {
    test(`fits the baubles below the title beside the logo at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route);
      const title = (await page.locator("#xmas-title").boundingBox())!;
      const copy = (await page.locator(".mobile-page-heading-copy").boundingBox())!;
      const baubles = (await page.locator(".xmas-baubles--mobile").boundingBox())!;
      const facts = (await page.locator(".xmas-facts").boundingBox())!;
      expect(baubles.y).toBeGreaterThanOrEqual(title.y + title.height);
      expect(baubles.x).toBeGreaterThanOrEqual(copy.x);
      expect(baubles.x + baubles.width).toBeLessThanOrEqual(copy.x + copy.width + 1);
      expect(facts.y).toBeGreaterThanOrEqual(baubles.y + baubles.height);
      expect(await page.locator(".xmas-hero__frame > .xmas-baubles--mobile").count()).toBe(0);
    });
  }

  test("puts the fact labels beside their values on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route);

    for (const row of await page.locator(".xmas-facts > div").all()) {
      const label = (await row.locator("dt").boundingBox())!;
      const value = (await row.locator("dd").boundingBox())!;
      expect(value.x, "value sits to the right of its label").toBeGreaterThanOrEqual(label.x + label.width);
      expect(Math.abs(value.y - label.y), "label and value share a row").toBeLessThan(30);
      expect(value.x + value.width, "value fits in the viewport").toBeLessThanOrEqual(390);
    }
  });

  test("stacks the fact labels above their values when text is enlarged", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route);
    await page.addStyleTag({ content: "html { font-size: 160%; }" });

    for (const row of await page.locator(".xmas-facts > div").all()) {
      const label = (await row.locator("dt").boundingBox())!;
      const value = (await row.locator("dd").boundingBox())!;
      expect(value.y, "value sits below its label").toBeGreaterThanOrEqual(label.y + label.height);
      expect(value.x + value.width, "value fits in the viewport").toBeLessThanOrEqual(390);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });

  test("is hidden from assistive technology and never takes focus", async ({ page }) => {
    await page.goto(route);

    for (const baubles of await page.locator(".xmas-baubles").all()) {
      await expect(baubles).toHaveAttribute("aria-hidden", "true");
    }
    await expect(page.locator(".xmas-snow")).toHaveAttribute("aria-hidden", "true");
    await expect(page.locator(".xmas-baubles a, .xmas-baubles button, .xmas-snow a, .xmas-snow button")).toHaveCount(0);
  });

  test("animates by default", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(route);

    await expect(page.locator(".xmas-snow i").first()).not.toHaveCSS("animation-name", "none");
    await expect(page.locator(".xmas-baubles__item").first()).not.toHaveCSS("animation-name", "none");
  });

  test.describe("with reduced motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("snowflakes and baubles stay still", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(route);

      const animated = await page.evaluate(() =>
        [...document.querySelectorAll(".xmas-snow i, .xmas-baubles__item")].filter((node) => {
          const style = getComputedStyle(node);
          const before = getComputedStyle(node, "::before");
          return style.animationName !== "none" || before.animationName !== "none";
        }).length
      );
      expect(animated).toBe(0);
      await expect(page.getByRole("heading", { level: 1, name: "Christmas Fayre" })).toBeVisible();
    });
  });
});

test.describe("Christmas Fayre layout", () => {
  for (const width of [320, 390, 768, 1024, 1440]) {
    test(`does not scroll sideways at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test("keeps the sign-up button and help areas reachable by keyboard", async ({ page }) => {
    await page.goto(route);

    const buttons = page.getByRole("link", { name: /Email the Fayre team/ });
    await expect(buttons).toHaveCount(2);
    for (const link of await buttons.all()) {
      await expect(link).toHaveAttribute("href", /^mailto:.+\?subject=Helping%20at%20the%20Christmas%20Fayre$/);
    }
    const button = buttons.first();
    await expect(button).toHaveAttribute("href", /^mailto:.+\?subject=Helping%20at%20the%20Christmas%20Fayre$/);
    await button.focus();
    await expect(button).toBeFocused();
    await expect(page.locator(".xmas-area")).toHaveCount(7);
  });
});

test.describe("Christmas Fayre without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the helper call, help areas and contact route are all present", async ({ page }) => {
    await page.goto(route);

    await expect(page.getByRole("heading", { level: 1, name: "Christmas Fayre" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Where we need friendly faces" })).toBeVisible();
    await expect(page.locator(".xmas-area")).toHaveCount(7);
    await expect(page.getByRole("heading", { name: "Good to know" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Email the Fayre team/ }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Email the Fayre team/ }).last()).toBeVisible();
  });
});

for (const width of [1024, 1200, 1440, 1920]) test(`desktop single fact list at ${width}`, async ({ page }) => {
  await page.setViewportSize({width, height:1000});
  await page.goto(route);
  const frame = (await page.locator('.xmas-hero__frame').boundingBox())!;
  const labels = await page.locator('.xmas-facts dt').all();
  const first = (await labels[0].boundingBox())!;
  let lastY = first.y - 1;
  for (const label of labels) {
    const box = (await label.boundingBox())!;
    expect(Math.abs(box.x - first.x)).toBeLessThan(2);
    expect(box.y).toBeGreaterThan(lastY); lastY=box.y;
  }
  if (width >= 1200) expect(frame.width).toBeGreaterThan(900);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
});

for (const width of [1024, 1440, 1920]) test(`desktop fact list is balanced inside its frame at ${width}`, async ({page}) => {
  await page.setViewportSize({width,height:1000}); await page.goto(route);
  const frame=(await page.locator('.xmas-hero__frame').boundingBox())!;
  const label=(await page.locator('.xmas-facts dt').first().boundingBox())!;
  const value=(await page.locator('.xmas-facts dd').first().boundingBox())!;
  expect(Math.abs((label.x + value.x + value.width)/2 - (frame.x + frame.width/2))).toBeLessThan(2);
  expect(value.x - label.x - label.width).toBeGreaterThanOrEqual(39);
});
