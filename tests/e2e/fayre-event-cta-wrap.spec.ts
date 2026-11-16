import { expect, test } from "@playwright/test";

// The Fayre event page CTAs must wrap at word boundaries at 200% text: no word
// splits across lines. A short last line ("team" or "slot") is an intended wrap -
// the icon stays in its reserved right lane, so it cannot be stranded.
for (const width of [320, 390, 448, 768]) {
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

// Regression (reviewer): the Art and Email CTAs at 200% text must keep every
// line clear of the icon lane by a real margin, and no line may hold a single
// word (orphan). Measured from rendered rects, not from intent comments.
for (const width of [320, 390, 448, 768]) {
  for (const theme of ["day", "night"]) {
    test(`event CTAs keep icon clearance and have no orphan lines at ${width}px with 200% text (${theme})`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript((t) => { localStorage.setItem("foa-theme", t); localStorage.setItem("foa-cookie-preferences", "essential"); }, theme);
      await page.goto("/events/christmas-fayre-2026/");
      await page.evaluate(() => { document.documentElement.style.fontSize = "32px"; });
      const bad = await page.evaluate(() => {
        const out: string[] = [];
        for (const a of document.querySelectorAll<HTMLElement>(".xmas-art-cta a.button, .xmas-contact .xmas-actions a.button--amber")) {
          const label = a.querySelector<HTMLElement>(".cta-label")!;
          const icon = a.querySelector<HTMLElement>(".cta-icon")!.getBoundingClientRect();
          const texts: Text[] = [];
          (function walk(n: Node) { for (const c of n.childNodes) { if (c.nodeType === 3) texts.push(c as Text); else if (!(c as HTMLElement).classList?.contains("visually-hidden") && (c as HTMLElement).getAttribute?.("aria-hidden") !== "true") walk(c); } })(label);
          const range = document.createRange();
          const lines = new Map<number, { words: string[]; right: number }>();
          for (const t of texts) {
            let offset = 0;
            for (const part of t.textContent!.split(/(\s+)/)) {
              const i = t.textContent!.indexOf(part, offset);
              offset = i + part.length;
              if (!part.trim()) continue;
              range.setStart(t, i); range.setEnd(t, i + part.length);
              for (const r of range.getClientRects()) {
                if (!r.width) continue;
                const key = Math.round(r.top);
                const line = lines.get(key) ?? { words: [], right: 0 };
                line.words.push(part);
                line.right = Math.max(line.right, r.right);
                lines.set(key, line);
              }
            }
          }
          const name = a.closest(".xmas-art-cta") ? "art" : "email";
          const rows = [...lines.entries()].sort((a2, b2) => a2[0] - b2[0]).map(([, v]) => v);
          for (const [idx, line] of rows.entries()) {
            if (rows.length > 1 && line.words.length < 2) out.push(`${name}: orphan line ${idx + 1} "${line.words.join(" ")}"`);
            const clearance = icon.left - line.right;
            if (clearance < 6) out.push(`${name}: line "${line.words.join(" ")}" ends ${Math.round(line.right - icon.left)}px into the icon lane`);
          }
        }
        return out;
      });
      expect(bad).toEqual([]);
    });
  }
}
