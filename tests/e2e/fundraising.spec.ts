import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const appeal = JSON.parse(readFileSync("src/content/fundraising/current-appeal.json", "utf8"));
const raised = appeal.sources.reduce((sum: number, source: { amount: number }) => sum + source.amount, 0);
const money = (value: number) => `£${value.toLocaleString("en-GB")}`;

for (const route of ["/", "/fundraising/"]) {
  test(`${route} animates once to accurate final figures with a slightly wider fill`, async ({ page }) => {
    await page.goto(route);
    const card = page.locator("[data-fundraising-card]");
    await card.scrollIntoViewIfNeeded();
    await expect(card).toHaveClass(/is-filled/);
    await expect(card.locator("[data-count-to]")).toHaveText(money(raised));
    await expect(card.getByRole("progressbar")).toHaveAttribute("aria-valuenow", String(Math.min(raised, appeal.target)));
    // Compare the final style target, independently of the transition timing.
    const display = await card.locator(".fundraising-progress__fill").evaluate((element) =>
      parseFloat((element as HTMLElement).style.getPropertyValue("--progress")),
    );
    const actual = Math.min(100, (raised / appeal.target) * 100);
    if (actual > 0 && actual < 100) expect(display).toBeGreaterThan(actual);
    else expect(display).toBe(actual);
    expect(display).toBeLessThanOrEqual(Math.min(100, actual + 4));
    await page.evaluate(() => window.scrollTo(0, 0));
    await card.scrollIntoViewIfNeeded();
    await expect(card.locator("[data-count-to]")).toHaveText(money(raised));
  });

  test(`${route} shows the real total before the card scrolls into view (#204)`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(route);
    const card = page.locator("[data-fundraising-card]");
    const top = await card.evaluate((element) => element.getBoundingClientRect().top);
    test.skip(top <= 900, "card already in view on this route");
    await page.waitForTimeout(1600);
    await expect(card.locator("[data-count-to]")).toHaveText(money(raised));
    await card.scrollIntoViewIfNeeded();
    await expect(card).toHaveClass(/is-filled/);
    await expect(card.locator("[data-count-to]")).toHaveText(money(raised));
  });

  test(`${route} shows final figures immediately with reduced motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(route);
    const card = page.locator("[data-fundraising-card]");
    await expect(card.locator("[data-count-to]")).toHaveText(money(raised));
    await expect(card).not.toHaveClass(/is-armed|is-filled/);
  });
}

for (const width of [320, 390, 768, 820, 1024, 1440]) {
  test(`Fundraising content stays within its columns at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/fundraising/");
    await expect(page.locator(".fundraising-support-shapes li")).toHaveCount(appeal.annualSupport.flatMap(({ items }: { items: unknown[] }) => items).length);
    await expect(page.locator(".fundraising-updated")).toHaveCSS("font-style", "italic");
    await expect(page.getByText("For more background", { exact: false })).toHaveCount(0);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    const spilling = await page.locator(".fundraising-priority").evaluateAll((items) => items.filter((item) =>
      item.scrollWidth > item.clientWidth + 1,
    ).length);
    expect(spilling).toBe(0);
    const impact = await page.locator(".fundraising-last-impact").boundingBox();
    const sources = await page.locator(".fundraising-last-sources").boundingBox();
    expect(impact).not.toBeNull();
    expect(sources).not.toBeNull();
    if (width >= 1024) expect(Math.abs(impact!.y - sources!.y)).toBeLessThanOrEqual(1);
    else expect(sources!.y).toBeGreaterThanOrEqual(impact!.y + impact!.height);
  });
}

for (const route of ["/", "/fundraising/"]) {
  for (const width of [320, 768, 1440]) {
    test(`${route} tolerates enlarged text at ${width}px without horizontal overflow`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route);
      await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
      if (route === "/") {
        const action = page.getByRole("link", { name: "See Our Fundraising Plans" });
        await expect(action).toBeVisible();
        expect(await action.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          return bounds.left >= 0 && bounds.right <= window.innerWidth
            && element.scrollWidth <= element.clientWidth;
        })).toBe(true);
      }
    });
  }
}

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  for (const route of ["/", "/fundraising/"]) {
    test(`${route} retains the total and visible progress`, async ({ page }) => {
      await page.goto(route);
      const card = page.locator("[data-fundraising-card]");
      await expect(card.locator("[data-count-to]")).toHaveText(money(raised));
      expect(await card.locator(".fundraising-progress__fill").evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThan(0);
    });
  }
});
