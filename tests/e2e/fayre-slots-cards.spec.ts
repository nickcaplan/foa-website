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

for (const width of [320, 390, 640, 768, 820, 900, 1024, 1280, 1440]) {
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
          const heading = card.querySelector<HTMLElement>(".fayre-volunteer__heading")!;
          const title = card.querySelector("h3")!.getBoundingClientRect();
          const count = card.querySelector(".fayre-volunteer__availability")!.getBoundingClientRect();
          const cardTop = card.getBoundingClientRect().top;
          if (count.top < title.bottom - 1) bad.push(`${card.dataset.activityName}: count overlaps the title row`);
          // The slots line sits directly under its own title at the tight flex gap on every card.
          const gap = parseFloat(getComputedStyle(heading).rowGap || getComputedStyle(heading).gap);
          if (Math.abs(count.top - title.bottom - gap) > 1) bad.push(`${card.dataset.activityName}: title-to-slots gap ${Math.round(count.top - title.bottom)}px, expected ${Math.round(gap)}px`);
          // Description rows stay aligned across a visual row (extra title height lands before it).
          const desc = card.querySelector(".fayre-volunteer__heading + p")!.getBoundingClientRect().top - cardTop;
          // Slots-to-description gap is the heading's controlled bottom margin, never less; a same-row
          // two-line title may only push the description down further, not shrink this gap.
          const headMargin = parseFloat(getComputedStyle(heading).marginBottom);
          if (count.bottom + headMargin - 1 > cardTop + desc) bad.push(`${card.dataset.activityName}: slots-to-description gap ${Math.round(cardTop + desc - count.bottom)}px, expected at least ${Math.round(headMargin)}px`);
          const rowCards = rows.get(Math.round(cardTop))!;
          for (const other of rowCards) {
            if (other === card) continue;
            const otherDesc = other.querySelector(".fayre-volunteer__heading + p")!.getBoundingClientRect().top - other.getBoundingClientRect().top;
            if (Math.abs(otherDesc - desc) > 1) bad.push(`${card.dataset.activityName}: description sits at a different offset than a same-row card (${Math.round(desc)} vs ${Math.round(otherDesc)})`);
          }
          // Words joined by a non-breaking space in the title must stay on one line (Nick: no orphaned "+ Trail").
          const h3 = card.querySelector("h3")!;
          const nbRange = document.createRange();
          (function walkNb(n: Node) {
            for (const c of n.childNodes) {
              if (c.nodeType === 3) {
                const t = c.textContent ?? "";
                let m; const re = /(\S+)\u00a0(\S+)/g;
                while ((m = re.exec(t))) {
                  nbRange.setStart(c, m.index); nbRange.setEnd(c, m.index + m[1].length);
                  const a = nbRange.getBoundingClientRect();
                  nbRange.setStart(c, m.index + m[0].length - m[2].length); nbRange.setEnd(c, m.index + m[0].length);
                  const b2 = nbRange.getBoundingClientRect();
                  if (Math.abs(a.top - b2.top) > 1) bad.push(`${card.dataset.activityName}: non-breaking pair "${m[1]} ${m[2]}" split across lines`);
                }
              } else walkNb(c);
            }
          })(h3);
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

test("a full stall stays on the page as a muted card and reopens when a slot frees up on refresh", async ({ page }) => {
  const [full, open] = anchors;
  await page.route("**/fayre-availability.json", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify(snapshot({ [full]: 0, [open]: 3 })) }));
  await page.goto("/christmas-fayre-volunteering/");
  const fullCard = page.locator(`[data-availability-code="${full}"]`);
  const openCard = page.locator(`[data-availability-code="${open}"]`);
  await expect(openCard).toBeVisible();
  await expect(fullCard, "a stall with no slots left stays on the page as a muted card").toBeVisible();
  await expect(fullCard).toHaveClass(/fayre-volunteer__card--full/);
  await expect(fullCard.locator(".fayre-volunteer__availability"), "the availability line reads Full with 0 places left").toHaveText("Full · 0 places left");
  await expect(fullCard.locator("a.fayre-volunteer__action"), "a full stall has no signup button").toBeHidden();
  const fullNote = fullCard.locator(".fayre-volunteer__booked");
  await expect(fullNote, "a full stall shows a Fully booked note in place of the button").toBeVisible();
  await expect(fullNote).toHaveText("Fully booked");
  // Guard for the #175 design review: muting is by surface and border, never whole-card opacity, which would drop the status text below contrast.
  const mute = await fullCard.evaluate((card) => {
    const cs = getComputedStyle(card);
    return { opacity: cs.opacity, background: cs.backgroundColor, border: cs.borderTopColor };
  });
  expect(mute.opacity, "a muted card keeps full opacity so its text stays readable").toBe("1");
  const openSurface = await openCard.evaluate((card) => {
    const cs = getComputedStyle(card);
    return { background: cs.backgroundColor, border: cs.borderTopColor };
  });
  expect(mute.background, "a muted card has a quieter surface than its siblings").not.toBe(openSurface.background);
  // The full note reserves the action row, so gaining or losing the full state moves nothing (Nick 20 Nov: the 52px phone shift).
  const geometry = async () => fullCard.evaluate((card) => {
    const next = card.nextElementSibling;
    return { h: card.getBoundingClientRect().height, nextTop: next ? next.getBoundingClientRect().top : null };
  });
  const fullGeometry = await geometry();

  // The 15-minute refresh re-reads the published file; reload to fetch the updated snapshot.
  await page.unroute("**/fayre-availability.json");
  await page.route("**/fayre-availability.json", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify(snapshot({ [full]: 2, [open]: 3 })) }));
  await page.reload();
  await expect(fullCard, "a stall with a freed slot returns to normal").toBeVisible();
  await expect(fullCard).not.toHaveClass(/fayre-volunteer__card--full/);
  await expect(fullCard.locator(".fayre-volunteer__availability")).toContainText("2 / 5 slots remaining");
  await expect(fullCard.locator("a.fayre-volunteer__action"), "a reopened stall has its signup button back").toBeVisible();
  await expect(fullCard.locator(".fayre-volunteer__booked"), "a reopened stall hides the Fully booked note").toBeHidden();
  const reopenedGeometry = await geometry();
  expect(Math.abs(reopenedGeometry.h - fullGeometry.h), "card height is identical full or open").toBeLessThanOrEqual(1);
  expect(Math.abs((reopenedGeometry.nextTop ?? 0) - (fullGeometry.nextTop ?? 0)), "the cards below never move").toBeLessThanOrEqual(1);

  // Design 20 Nov: under enlarged text the open button wraps to two lines while the note stayed on one,
  // so the full card still shrank (42px at 375px/200%; 96px plus label clipping at 320px/200%). Both
  // states now occupy the action row at once, so the row is the taller of the two in every state.
  const setRootText = (px: number) => page.evaluate((v) => { document.documentElement.style.fontSize = `${v}px`; }, px);
  const routeSlots = (fullOpen: number) => page.route("**/fayre-availability.json", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify(snapshot({ [full]: fullOpen, [open]: 3 })) }));
  for (const width of [375, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await setRootText(32);
    const openGeometry = await geometry();
    await page.unroute("**/fayre-availability.json");
    await routeSlots(0);
    await page.reload();
    await setRootText(32);
    await expect(fullCard).toHaveClass(/fayre-volunteer__card--full/);
    const fullWide = await geometry();
    expect(Math.abs(fullWide.h - openGeometry.h), `card height is identical open or full at ${width}px with 200% text`).toBeLessThanOrEqual(1);
    expect(Math.abs((fullWide.nextTop ?? 0) - (openGeometry.nextTop ?? 0)), `the cards below never move at ${width}px with 200% text`).toBeLessThanOrEqual(1);
    // The note reflows inside the card instead of clipping past its right edge.
    const noteBox = await fullCard.locator(".fayre-volunteer__booked").evaluate((el) => {
      const r = el.getBoundingClientRect();
      const c = el.closest("[data-availability-code]")!.getBoundingClientRect();
      return { left: r.left, right: r.right, cardLeft: c.left, cardRight: c.right };
    });
    expect(noteBox.right, `the Fully booked note stays inside its card at ${width}px with 200% text`).toBeLessThanOrEqual(noteBox.cardRight + 1);
    expect(noteBox.left).toBeGreaterThanOrEqual(noteBox.cardLeft - 1);
    await page.unroute("**/fayre-availability.json");
    await routeSlots(2);
    await page.reload();
    await expect(fullCard).not.toHaveClass(/fayre-volunteer__card--full/);
  }
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
