import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const fireworks = JSON.parse(readFileSync(new URL("../../src/content/events/fireworks-2026.json", import.meta.url), "utf8"));
const beforeFireworks = new Date(Date.parse(fireworks.start) - 86400000);

// Layout/copy cases describe the campaign while it is live. Individual lifecycle
// cases can move the browser clock forward without changing deployed builds.
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: beforeFireworks });
});

for (const width of [320, 390, 768, 1440]) {
  for (const theme of ["day", "night"]) {
    for (const enlarged of [false, true]) {
      test(`message headings and timings fit their columns at ${width}px, ${theme}, ${enlarged ? "200% text with wider timings" : "normal text"}`, async ({ page }) => {
        await page.clock.setSystemTime(beforeFireworks);
        await page.setViewportSize({ width, height: 900 });
        await page.addInitScript((theme) => {
          localStorage.setItem("foa-theme", theme);
          localStorage.setItem("foa-cookie-preferences", "essential");
        }, theme);
        await page.goto("/reps/");
        if (enlarged) await page.addStyleTag({ content: "html { font-size: 200% !important; } .message-time { letter-spacing: 0.08em; font-family: Verdana, sans-serif; }" });
        await expect(page.locator("html")).toHaveCSS("font-size", enlarged ? "32px" : "16px");
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        expect(await page.locator(".message-card h2").count()).toBeGreaterThan(0);
        for (const heading of await page.locator(".message-card h2").all()) {
          const bounds = await heading.evaluate((element) => {
            const column = element.getBoundingClientRect();
            const range = document.createRange();
            range.selectNodeContents(element);
            return { left: column.left, right: column.right,
              lines: [...range.getClientRects()].map(({ left, right }) => ({ left, right })) };
          });
          expect(bounds.lines.length).toBeGreaterThan(0);
          for (const line of bounds.lines) {
            expect(line.left).toBeGreaterThanOrEqual(bounds.left - 0.5);
            expect(line.right).toBeLessThanOrEqual(bounds.right + 0.5);
          }
        }
        for (const row of await page.locator(".message-when").all()) {
          const bounds = await row.evaluate((element) => {
            const column = element.getBoundingClientRect();
            const badge = element.querySelector(".message-date")!.getBoundingClientRect();
            const time = element.querySelector(".message-time")!.getBoundingClientRect();
            return { left: column.left, right: column.right, top: column.top,
              badge: { left: badge.left, top: badge.top, bottom: badge.bottom },
              time: { left: time.left, right: time.right, top: time.top, bottom: time.bottom } };
          });
          expect(bounds.time.left).toBeGreaterThanOrEqual(bounds.left - 0.5);
          expect(bounds.time.right).toBeLessThanOrEqual(bounds.right + 0.5);
          expect(bounds.badge.top).toBeCloseTo(bounds.top, 1);
          if (bounds.time.top >= bounds.badge.bottom) {
            expect(bounds.time.left).toBeCloseTo(bounds.badge.left, 1);
          } else {
            expect(bounds.time.bottom).toBeGreaterThan(bounds.badge.top);
          }
          for (const time of await row.locator("time").all()) {
            const clock = await time.evaluate((element) => {
              const range = document.createRange();
              range.selectNodeContents(element);
              return { left: element.getBoundingClientRect().left, right: element.getBoundingClientRect().right,
                lines: [...range.getClientRects()].map(({ left, right }) => ({ left, right })) };
            });
            expect(clock.lines).toHaveLength(1);
            expect(clock.lines[0].left).toBeGreaterThanOrEqual(bounds.left - 0.5);
            expect(clock.lines[0].right).toBeLessThanOrEqual(bounds.right + 0.5);
          }
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      });
    }
  }
}

test("Reps Hub actions align across desktop cards", async ({ page }) => {
  await page.clock.setSystemTime(beforeFireworks);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/reps/");
  const tops = await page.locator(".message-actions").evaluateAll((rows) =>
    rows.map((row) => row.getBoundingClientRect().top),
  );
  expect(tops).toHaveLength(4);
  for (const row of [tops.slice(0, 2), tops.slice(2)]) {
    expect(Math.max(...row) - Math.min(...row)).toBeLessThan(1);
  }
});

test("Fireworks uses a readable ticket link and keeps its URL in copied text", async ({ page }) => {
  await page.clock.setSystemTime(beforeFireworks);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/reps/");
  const card = page.locator(".message-card").first();
  const ticket = card.getByRole("link", { name: /https:\/\/buytickets\.at/ });
  await expect(ticket).toBeVisible();
  const url = await ticket.getAttribute("href");
  expect(url).toBeTruthy();
  expect(await card.getByRole("button", { name: "Copy message" }).getAttribute("data-copy-text"))
    .toContain(`Buy Fireworks tickets: ${url}`);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("all messages keep their visible website URLs when copied", async ({ page }) => {
  await page.goto("/reps/");
  for (const card of await page.locator(".message-card").all()) {
    const copyText = await card.getByRole("button", { name: "Copy message" }).getAttribute("data-copy-text");
    for (const link of await card.getByRole("link", { name: /https:\/\/www\.thefriendsofashley\.org/ }).all()) {
      expect(copyText).toContain(await link.innerText());
    }
  }
});

test("expired messages disappear and the empty state becomes visible", async ({ page }) => {
  await page.clock.setSystemTime(new Date("2026-10-11T12:00:00Z"));
  await page.goto("/reps/");
  await expect(page.locator(".message-card:visible")).toHaveCount(4);
  await page.clock.setSystemTime(new Date("2026-11-07T12:00:00Z"));
  await page.clock.fastForward(60000);
  await expect(page.locator(".message-card:visible")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Christmas Fayre", exact: true })).toBeVisible();
  await page.clock.setSystemTime(new Date("2026-12-05T13:00:00Z"));
  await page.clock.fastForward(60000);
  await expect(page.locator(".message-card:visible")).toHaveCount(1);
  await page.clock.setSystemTime(new Date("2026-12-05T15:00:00Z"));
  await page.clock.fastForward(60000);
  await expect(page.locator(".message-card:visible")).toHaveCount(0);
  await expect(page.locator("[data-messages-empty]")).toBeVisible();
});

test.describe("Reps Hub copy actions", () => {
  test("copies the message, confirms it and clears the confirmation", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__copied = [];
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText: async (text: string) => { (window as any).__copied.push(text); } },
      });
    });
    await page.goto("/reps/");

    const card = page.locator(".message-card").first();
    const expected = await card.getByRole("button", { name: "Copy message" }).getAttribute("data-copy-text");
    await card.getByRole("button", { name: "Copy message" }).click();

    await expect(card.getByRole("status")).toHaveText("Copied to clipboard.");
    expect(await page.evaluate(() => (window as any).__copied)).toEqual([expected]);

    await page.clock.fastForward(3100);
    await expect(card.getByRole("status")).toHaveText("");
  });

  test("shows manual-copy guidance when the clipboard rejects", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText: async () => { throw new Error("denied"); } },
      });
    });
    await page.goto("/reps/");

    const card = page.locator(".message-card").first();
    await card.getByRole("button", { name: "Copy message" }).click();

    await expect(card.getByRole("status")).toContainText("Copy was not available");
  });

  test("shows manual-copy guidance when the clipboard is unavailable", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
    });
    await page.goto("/reps/");

    const card = page.locator(".message-card").first();
    await card.getByRole("button", { name: "Copy message" }).click();

    await expect(card.getByRole("status")).toContainText("Copy was not available");
  });

  test("keeps feedback scoped to the message that was copied", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText: async () => {} },
      });
    });
    await page.goto("/reps/");

    const cards = page.locator(".message-card");
    await cards.nth(1).getByRole("button", { name: "Copy message" }).focus();
    await page.keyboard.press("Enter");

    await expect(cards.nth(1).getByRole("status")).toHaveText("Copied to clipboard.");
    await expect(cards.nth(0).getByRole("status")).toHaveText("");
  });
});


test("Christmas Fayre shows and copies the corrected full time range", async ({ page }) => {
  await page.goto("/reps/");
  const card = page.locator(".message-card", { has: page.getByRole("heading", { name: "Christmas Fayre", exact: true }) });
  await expect(card.locator(".message-time")).toHaveText("12:00-15:00");
  await expect(card).toContainText("12:00-15:00 at Ashley School");
  expect(await card.getByRole("button", { name: "Copy message" }).getAttribute("data-copy-text")).toContain("12:00-15:00 at Ashley School");
  await expect(card).toHaveAttribute("data-expires-at", "2026-12-05T15:00:00.000Z");
});
