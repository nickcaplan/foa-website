import { expect, test } from "@playwright/test";

for (const width of [320, 390, 1440]) for (const scale of [1, 2]) for (const theme of ["day", "night"]) {
  test(`Fayre timeline ${width}px ${scale * 100}% text ${theme}`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem("foa-theme", t), theme);
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/events/christmas-fayre-2026/");
    await page.evaluate((s) => { document.documentElement.style.fontSize = `${16 * s}px`; }, scale);
    const rows = page.locator(".xmas-timeline .schedule li");
    await expect(rows).toHaveCount(6);
    const labels = await rows.locator("strong").allTextContents();
    expect(labels).toEqual(["Fayre opens", "Art Competition winners announced", "Christmas tree auction", "Mini Dance Performers", "Ashley School Choir performance", "Fayre closes"]);
    const times = await rows.locator("time").evaluateAll((es) => es.map((e) => e.getBoundingClientRect()));
    const labelBoxes = await rows.locator("strong").evaluateAll((es) => es.map((e) => e.getBoundingClientRect()));
    for (let i = 0; i < 6; i++) {
      const t = times[i], l = labelBoxes[i];
      // Beside each other with no overlap, or stacked with the time first.
      expect(t.right <= l.left + 1 || t.bottom <= l.top + 1, `row ${i}: time and label overlap`).toBe(true);
    }
    // Each row draws one marker dot and, except the last, a joining line.
    const marks = await rows.evaluateAll((es) => es.map((e) => [getComputedStyle(e, "::after").width, getComputedStyle(e, "::before").display]));
    expect(marks.every((m) => m[0] === "14px")).toBe(true);
    expect(marks.slice(0, 5).every((m) => m[1] !== "none")).toBe(true);
    expect(marks[5][1]).toBe("none");
    // No time clips.
    const clipped = await rows.locator("time").evaluateAll((es) => es.filter((e) => e.scrollWidth > e.clientWidth + 1).length);
    expect(clipped).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });
}
