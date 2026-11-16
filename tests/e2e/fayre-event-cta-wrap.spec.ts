import { expect, test } from "@playwright/test";

// The Fayre event page CTAs must wrap at word boundaries at 200% text: no word
// splits across lines. A short last line ("team" or "slot") is an intended wrap -
// the icon stays in its reserved right lane, so it cannot be stranded.
for (const width of [320, 390, 768]) {
  for (const theme of ["day", "night"]) {
    test(`event CTAs wrap at word boundaries at ${width}px with 200% text (${theme})`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript((t) => { localStorage.setItem("foa-theme", t); localStorage.setItem("foa-cookie-preferences", "essential"); }, theme);
      await page.goto("/events/christmas-fayre-2026/");
      await page.evaluate(() => { document.documentElement.style.fontSize = "32px"; });
      const bad = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>(".xmas-art-cta .cta-label, .xmas-stalls-cta .cta-label, main a.button[href^='mailto'] .cta-label")].flatMap((el) => {
          const texts: Text[] = [];
          (function walk(n: Node) { for (const c of n.childNodes) { if (c.nodeType === 3) texts.push(c as Text); else if (!(c as HTMLElement).classList?.contains("visually-hidden") && (c as HTMLElement).getAttribute?.("aria-hidden") !== "true") walk(c); } })(el);
          const range = document.createRange();
          const words: { w: string; tops: number[] }[] = [];
          for (const t of texts) {
            let offset = 0;
            for (const part of t.textContent!.split(/(\s+)/)) {
              const i = t.textContent!.indexOf(part, offset);
              offset = i + part.length;
              if (!part.trim()) continue;
              range.setStart(t, i); range.setEnd(t, i + part.length);
              const tops = [...new Set([...range.getClientRects()].map((r) => Math.round(r.top)))];
              words.push({ w: part, tops });
            }
          }
          const split = words.filter((word) => word.tops.length > 1).map((word) => word.w);
          const label = el.textContent!.trim().replace(/\s+/g, " ").slice(0, 40);
          return split.map((w) => `${label}: mid-word break in "${w}"`);
        }));
      expect(bad).toEqual([]);
    });
  }
}
