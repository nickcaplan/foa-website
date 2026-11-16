import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const fayre = JSON.parse(readFileSync(new URL("../../src/content/events/christmas-fayre-2026.json", import.meta.url), "utf8"));
test.setTimeout(90000);

const anchors: string[] = fayre.signupActivities.map((activity: { anchor: string }) => activity.anchor);

const snapshot = (counts: Record<string, number>) => ({
  schema: 1,
  checkedAt: new Date().toISOString(),
  eventEndsAt: "2026-12-05T15:30:00+00:00",
  activities: Object.fromEntries(Object.entries(counts).map(([anchor, open]) => [
    anchor,
    { checkedAt: new Date().toISOString(), rows: [{ endsAt: "2026-12-05T14:00:00+00:00", open, capacity: 5 }] },
  ])),
});

for (const width of [320, 390, 768, 1440]) {
  for (const scale of [1, 2]) {
    test(`slots line sits below the title on every card at ${width}px with ${scale * 100}% text`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/christmas-fayre-volunteering/");
      if (scale === 2) await page.evaluate(() => { document.documentElement.style.fontSize = "32px"; });
      await page.waitForFunction(() => document.querySelectorAll(".fayre-volunteer__count").length > 0);
      const misaligned = await page.evaluate(() => {
        const cards = [...document.querySelectorAll<HTMLElement>("[data-availability-code]")];
        const bad: string[] = [];
        // Alignment only matters within a visual row: in one-column layouts every
        // card is its own row, so a 2-line title pushing its slots line down is fine.
        const rows = new Map<number, HTMLElement[]>();
        for (const card of cards) {
          const top = Math.round(card.getBoundingClientRect().top);
          rows.set(top, [...(rows.get(top) ?? []), card]);
        }
        for (const card of cards) {
          const title = card.querySelector("h3")!.getBoundingClientRect();
          const count = card.querySelector(".fayre-volunteer__availability")!.getBoundingClientRect();
          const cardTop = card.getBoundingClientRect().top;
          if (count.top < title.bottom - 1) bad.push(`${card.dataset.activityName}: count overlaps the title row`);
          const rowCards = rows.get(Math.round(cardTop))!;
          const expectedTop = count.top - cardTop;
          for (const other of rowCards) {
            if (other === card) continue;
            const otherCount = other.querySelector(".fayre-volunteer__availability")!.getBoundingClientRect();
            const otherTop = other.getBoundingClientRect().top;
            if (Math.abs(otherCount.top - otherTop - expectedTop) > 1) bad.push(`${card.dataset.activityName}: count sits at a different offset than a same-row card (${Math.round(expectedTop)} vs ${Math.round(otherCount.top - otherTop)})`);
          }
          const icon = card.querySelector(".fayre-volunteer__action .cta-icon")!.getBoundingClientRect();
          const label = card.querySelector(".fayre-volunteer__action .cta-label")!;
          const range = document.createRange();
          const texts: Text[] = [];
          (function walk(n: Node) { for (const c of n.childNodes) { if (c.nodeType === 3 && !c.parentElement?.closest(".visually-hidden")) texts.push(c as Text); else walk(c); } })(label);
          for (const t of texts) { range.selectNodeContents(t); for (const r of range.getClientRects()) { if (r.width && !(r.right <= icon.left || r.left >= icon.right)) bad.push(`${card.dataset.activityName}: icon overlaps button text`); } }
        }
        return bad;
      });
      expect(misaligned).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "page scrolls sideways").toBe(true);
    });
  }
}

test("a full stall leaves the page and returns when a slot frees up on refresh", async ({ page }) => {
  const [full, open] = anchors;
  await page.route("**/fayre-availability.json", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify(snapshot({ [full]: 0, [open]: 3 })) }));
  await page.goto("/christmas-fayre-volunteering/");
  const fullCard = page.locator(`[data-availability-code="${full}"]`);
  const openCard = page.locator(`[data-availability-code="${open}"]`);
  await expect(openCard).toBeVisible();
  await expect(fullCard, "a stall with no slots left stays on the page").toBeHidden();

  // The 15-minute refresh re-reads the published file; reload to fetch the updated snapshot.
  await page.unroute("**/fayre-availability.json");
  await page.route("**/fayre-availability.json", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify(snapshot({ [full]: 2, [open]: 3 })) }));
  await page.reload();
  await expect(fullCard, "a stall with a freed slot does not return").toBeVisible();
  await expect(fullCard.locator(".fayre-volunteer__availability")).toContainText("2 / 5 slots remaining");
});

for (const width of [320, 390, 768]) {
test(`slots line and card button have no single-word last line at ${width}px with 200% text`, async ({ page }) => {
  await page.setViewportSize({ width, height: 700 });
  await page.goto("/christmas-fayre-volunteering/");
  await page.evaluate(() => { document.documentElement.style.fontSize = "32px"; });
  await page.waitForFunction(() => document.querySelectorAll(".fayre-volunteer__count").length > 0);
  const orphans = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>(".fayre-volunteer__availability, .fayre-volunteer__action")].flatMap((el) => {
      // Collect every rendered word with its rect, walking text nodes in order (skip visually-hidden text).
      const texts: Text[] = [];
      (function walk(n: Node) { for (const c of n.childNodes) { if (c.nodeType === 3) texts.push(c as Text); else if (!(c as HTMLElement).classList?.contains("visually-hidden")) walk(c); } })(el);
      const range = document.createRange();
      const words: { w: string; top: number; bottom: number; right: number }[] = [];
      for (const t of texts) {
        let offset = 0;
        for (const part of t.textContent!.split(/(\s+)/)) {
          const i = t.textContent!.indexOf(part, offset);
          offset = i + part.length;
          if (!part.trim()) continue;
          range.setStart(t, i); range.setEnd(t, i + part.length);
          const r = range.getBoundingClientRect();
          words.push({ w: part, top: r.top, bottom: r.bottom, right: r.right });
        }
      }
      if (words.length < 2) return [];
      // Group words into rendered lines by vertical overlap (mixed font sizes share a baseline, not a top).
      const lines: { top: number; bottom: number; count: number }[] = [];
      for (const word of words) {
        const line = lines.find((l) => word.top < l.bottom && word.bottom > l.top);
        if (line) { line.top = Math.min(line.top, word.top); line.bottom = Math.max(line.bottom, word.bottom); line.count++; }
        else lines.push({ top: word.top, bottom: word.bottom, count: 1 });
      }
      const last = lines[lines.length - 1];
      const card = el.closest("[data-availability-code]");
      const box = (card ?? el).getBoundingClientRect();
      const name = el.closest("[data-activity-name]")?.getAttribute("data-activity-name") ?? el.textContent!.trim().replace(/\s+/g, " ").slice(0, 30);
      const spill = words.filter((word) => word.right > box.right - 1).map((word) => word.w);
      const what = el.classList.contains("fayre-volunteer__action") ? "card button" : "slots line";
      const orphan = lines.length > 1 && last.count === 1 ? [`${name}: ${what} last line is a single word`] : [];
      const overflow = card && spill.length ? [`${name}: text spills past the card right edge (${spill.join(" ")})`] : [];
      return [...orphan, ...overflow];
    }));
  expect(orphans).toEqual([]);
});
}

for (const width of [320, 390, 768]) {
test(`no mid-word breaks in card titles or buttons at ${width}px with 200% text`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/christmas-fayre-volunteering/");
  await page.evaluate(() => { document.documentElement.style.fontSize = "32px"; });
  await page.waitForFunction(() => document.querySelectorAll(".fayre-volunteer__count").length > 0);
  const split = await page.evaluate(() => {
    const targets = [...document.querySelectorAll<HTMLElement>("[data-availability-code] h3, [data-availability-code] .fayre-volunteer__action .cta-label, .fayre-volunteer__loan .fayre-volunteer__action .cta-label, .fayre-volunteer__contact .cta-label")];
    const bad: string[] = [];
    const range = document.createRange();
    for (const el of targets) {
      const texts: Text[] = [];
      (function walk(n: Node) { for (const c of n.childNodes) { if (c.nodeType === 3 && !(c.parentElement?.closest(".visually-hidden,[aria-hidden=true]"))) texts.push(c as Text); else walk(c); } })(el);
      for (const t of texts) {
        let offset = 0;
        for (const part of t.textContent!.split(/(\s+)/)) {
          const i = t.textContent!.indexOf(part, offset);
          offset = i + part.length;
          if (!part.trim()) continue;
          range.setStart(t, i); range.setEnd(t, i + part.length);
          const tops = new Set([...range.getClientRects()].filter((r) => r.width).map((r) => Math.round(r.top)));
          if (tops.size > 1) bad.push(`${el.tagName}.${el.className}: word "${part}" split across lines`);
        }
      }
    }
    return bad;
  });
  expect(split).toEqual([]);
});
}
