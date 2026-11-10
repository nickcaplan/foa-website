import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";

const load = (name: string) => JSON.parse(readFileSync(new URL(`../../src/content/events/${name}.json`, import.meta.url), "utf8"));
// Use a still-listed event to test archive transitions; Fireworks is permanently excluded.
const event = load("christmas-fayre-2026");
const boundary = Date.parse(event.end);
const monthLabel = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "Europe/London" }).format(new Date(event.start));

for (const width of [320, 390, 768, 1440]) {
  for (const theme of ["day", "night"]) {
    for (const scale of [100, 200]) {
      test(`date and heading gaps stay compact at ${width}px in ${theme} mode with ${scale}% text`, async ({ page }) => {
        await page.clock.setFixedTime(new Date("2026-10-21T12:00:00Z"));
        await page.setViewportSize({ width, height: 900 });
        await page.goto("/whats-on/");
        await page.evaluate(({ theme, scale }) => {
          document.documentElement.dataset.theme = theme;
          document.documentElement.style.fontSize = `${scale}%`;
        }, { theme, scale });
        const metrics = await page.locator('[data-yearview-term]:visible').first().evaluate((term) => {
          const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
          const label = term.querySelector(".section-heading .eyebrow")!.getBoundingClientRect();
          const title = term.querySelector("h2")!.getBoundingClientRect();
          const rows = [...term.querySelectorAll<HTMLElement>('[data-month-key]:not([hidden]) .event-list-item:not([hidden])')].map((row) => {
            const badge = row.querySelector(".compact-date")!.getBoundingClientRect();
            const copy = row.querySelector(":scope > div:not(.compact-date)")!.getBoundingClientRect();
            const heading = row.querySelector("h4")!.getBoundingClientRect();
            return { gap: copy.left - badge.right, stacked: copy.top >= badge.bottom,
              copyLeft: copy.left, headingLeft: heading.left, badgeTop: badge.top, copyTop: copy.top };
          });
          return { rem, termGap: title.top - label.bottom, rows };
        });
        expect(metrics.termGap).toBeCloseTo(0.125 * metrics.rem, 1);
        expect(metrics.rows.length).toBeGreaterThan(1);
        const copyLeft = metrics.rows[0].copyLeft;
        for (const row of metrics.rows) {
          expect(row.headingLeft).toBeCloseTo(row.copyLeft, 1);
          expect(row.copyLeft).toBeCloseTo(copyLeft, 1);
          if (!row.stacked) {
            expect(row.gap).toBeCloseTo(0.625 * metrics.rem, 1);
            expect(row.copyTop).toBeCloseTo(row.badgeTop, 1);
          }
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      });
    }
  }
}

test("the current month disappears when its last event expires and upcoming months lead", async ({ page }) => {
  const tea = load("welcome-tea-2026");
  const expiry = Date.parse(tea.archiveFrom ?? tea.end ?? tea.start);
  await page.clock.install({ time: new Date(expiry - 30_000) });
  await page.goto("/whats-on/");
  const october = page.locator('[data-month-key="2026-10"]');
  await expect(october).toBeVisible();
  await expect(october.locator("[data-current-chip]")).toBeVisible();
  await page.clock.runFor(60_000);
  await expect(october).toBeHidden();
  await expect(page.locator("[data-month-key]:visible").first()).toHaveAttribute("data-month-key", "2026-11");
  await expect(page.locator(".term-earlier")).toHaveAttribute("open", "");
  await expect(page.locator('[data-earlier-month="2026-10"]')).toBeVisible();
});

for (const width of [320, 1440]) {
  for (const theme of ["day", "night"]) {
    test(`month bands hide empty months and mark upcoming and archived months at ${width}px in ${theme} mode`, async ({ page }) => {
      await page.clock.setFixedTime(new Date(Date.parse(event.start) - 10 * 86400000));
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/whats-on/");
      await page.evaluate((theme) => document.documentElement.dataset.theme = theme, theme);
      const emptyMonth = page.locator('[data-month-key="2026-10"]');
      await expect(emptyMonth).toBeHidden();
      await expect(page.locator(".term-earlier")).toHaveAttribute("open", "");
      for (const textScale of [100, 200]) {
        await page.addStyleTag({ content: `html { font-size: ${textScale}% !important; }` });
        const headings = page.locator(".term-month-heading:visible");
        expect(await headings.count()).toBeGreaterThan(2);
        for (const heading of await headings.all()) {
          const band = await heading.evaluate((element) => {
            const style = getComputedStyle(element);
            const box = element.getBoundingClientRect();
            const month = element.parentElement!.getBoundingClientRect();
            const probe = document.createElement("span");
            probe.style.background = "var(--paper-deep)";
            element.append(probe);
            const expectedBackground = getComputedStyle(probe).backgroundColor;
            probe.remove();
            return { background: style.backgroundColor, expectedBackground,
              border: style.borderBottomWidth, padding: parseFloat(style.paddingInlineStart),
              width: box.width, monthWidth: month.width, left: box.left, monthLeft: month.left };
          });
          expect(band.background).toBe(band.expectedBackground);
          expect(band.border).toBe("1px");
          expect(band.padding).toBeGreaterThan(0);
          expect(band.width).toBeCloseTo(band.monthWidth, 1);
          expect(band.left).toBeCloseTo(band.monthLeft, 1);
        }
        const list = page.locator('[data-month-key="2026-11"] > .event-list');
        expect(await list.evaluate((element) => getComputedStyle(element).borderTopWidth)).toBe("0px");
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
    });
  }
}

for (const width of [320, 390, 1440]) {
  for (const textScale of [100, 200]) {
    test(`Happy Bags date stays anchored when its explanation opens and closes at ${width}px with ${textScale}% text`, async ({ page }) => {
      const happyBags = load("happy-bags-january-2027");
      await page.clock.setFixedTime(new Date(Date.parse(happyBags.start) - 7 * 86400000));
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/whats-on/");
      await page.addStyleTag({ content: `html { font-size: ${textScale}% !important; }` });
      const row = page.locator('[data-past="false"]').filter({ hasText: happyBags.title }).first();
      const details = row.locator("details");
      const measure = () => row.evaluate((element) => {
        const row = element.getBoundingClientRect();
        const badge = element.querySelector(".compact-date")!.getBoundingClientRect();
        return { top: badge.top - row.top, left: badge.left - row.left, width: badge.width, height: badge.height, rowHeight: row.height };
      });
      const before = await measure();
      await details.locator("summary").click();
      await expect(details).toHaveAttribute("open", "");
      const expanded = await measure();
      expect(expanded.rowHeight).toBeGreaterThan(before.rowHeight);
      for (const key of ["top", "left", "width", "height"] as const) {
        expect(expanded[key], `Expanded badge ${key}`).toBeCloseTo(before[key], 1);
      }
      await details.locator("summary").click();
      await expect(details).not.toHaveAttribute("open", "");
      const collapsed = await measure();
      for (const key of ["top", "left", "width", "height", "rowHeight"] as const) {
        expect(collapsed[key], `Collapsed badge ${key}`).toBeCloseTo(before[key], 1);
      }
    });
  }
}

for (const width of [390, 1440]) {
  test(`archive keeps events, month headings and focus through refreshes at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.clock.install({ time: new Date(boundary + 60_000) });
    await page.goto("/whats-on/");
    await expect(page.locator(".term-earlier")).toHaveAttribute("open", "");
    const archive = page.locator("[data-yearview-earlier]");
    const archivedEvent = archive.locator(".event-list-item:not([hidden])").filter({ hasText: event.title });
    await expect(archivedEvent).toHaveCount(1);
    await expect(archive.locator("[data-earlier-month]").filter({ hasText: event.title }).locator(".term-month-heading")).toHaveText(monthLabel);
    const link = archivedEvent.getByRole("link", { name: event.title });
    await link.focus();
    const inventory = () => archive.locator(".event-list-item:not([hidden])").allTextContents();
    const before = await inventory();
    const headings = await archive.locator(".term-month-heading").allTextContents();
    for (let refresh = 0; refresh < 2; refresh++) {
      await page.clock.runFor(60_000);
      expect(await inventory()).toEqual(before);
      expect(await archive.locator(".term-month-heading").allTextContents()).toEqual(headings);
      await expect(link).toBeFocused();
      await expect(page.locator(".term-earlier")).toHaveAttribute("open", "");
    }
    expect((await new AxeBuilder({ page }).analyze()).violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
  });
}

test("an event crossing its end switches once without dropping or duplicating visible events", async ({ page }) => {
  await page.clock.install({ time: new Date(boundary - 30_000) });
  await page.goto("/whats-on/");
  const upcoming = page.locator('[data-past="false"]').filter({ hasText: event.title });
  const archived = page.locator('[data-past="true"]').filter({ hasText: event.title });
  await expect(upcoming).toHaveJSProperty("hidden", false);
  await expect(archived).toHaveJSProperty("hidden", true);
  const count = await page.locator(".event-list-item:not([hidden])").count();
  await page.clock.runFor(60_000);
  await expect(upcoming).toHaveJSProperty("hidden", true);
  await expect(archived).toHaveJSProperty("hidden", false);
  await page.clock.runFor(60_000);
  expect(await page.locator(".event-list-item:not([hidden])").count()).toBe(count);
});

for (const date of ["2026-08-01T12:00:00Z", "2027-02-01T12:00:00Z", "2027-07-01T12:00:00Z", "2027-09-01T12:00:00Z"]) {
  test(`year view has honest month and empty states at ${date}`, async ({ page }) => {
    await page.clock.setFixedTime(new Date(date));
    await page.goto("/whats-on/");
    const current = page.locator("[data-current-chip]:visible");
    await expect(current).toHaveCount(0);
    await expect(page.locator("[data-empty-note]")).toHaveCount(0);
    if (date.startsWith("2027-09")) {
      await expect(page.locator("[data-yearview-term]:visible")).toHaveCount(0);
      await expect(page.locator("[data-yearview-empty]")).toBeVisible();
    }
  });
}

test("upcoming actions and information survive refreshes and narrow enlarged text", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-18T12:00:00Z") });
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/whats-on/");
  await expect(page.locator('[data-event-title="Christmas Fayre"][data-past="false"]').getByRole("link", { name: "Event details", exact: true })).toBeVisible();
  await page.getByText("What are Happy Bags?", { exact: true }).first().click();
  const info = page.locator(".event-list-info").first();
  await page.clock.runFor(60_000);
  await expect(info).toHaveAttribute("open", "");
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
  const overflow = await page.evaluate(() => ({
    width: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    elements: [...document.querySelectorAll("main *")].filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && (rect.right > innerWidth + 1 || rect.left < -1);
    }).map((element) => ({ tag: element.tagName, class: element.className, text: element.textContent?.trim().slice(0, 60) })),
  }));
  expect(overflow.scrollWidth, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.width);
  await page.evaluate(() => document.documentElement.dataset.theme = "night");
  expect((await new AxeBuilder({ page }).analyze()).violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
});

for (const javaScriptEnabled of [true, false]) {
  for (const width of [390, 1440]) {
    test.describe(`archive default at ${width}px JS=${javaScriptEnabled}`, () => {
      test.use({ javaScriptEnabled });
      test("starts open and supports closing and reopening with the keyboard", async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto("/whats-on/");
        const archive = page.locator(".term-earlier");
        const summary = archive.locator("summary");
        await expect(archive).toHaveAttribute("open", "");
        await expect(archive.locator("[data-yearview-earlier]")).toBeVisible();
        await summary.focus();
        await page.keyboard.press("Enter");
        await expect(archive).not.toHaveAttribute("open", "");
        await expect(archive.locator("[data-yearview-earlier]")).toBeHidden();
        await expect(summary).toBeFocused();
        await page.keyboard.press("Space");
        await expect(archive).toHaveAttribute("open", "");
        await expect(archive.locator("[data-yearview-earlier]")).toBeVisible();
        await expect(summary).toBeFocused();
      });
    });
  }
}
