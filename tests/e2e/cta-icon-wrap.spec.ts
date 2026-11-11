import { expect, test, type Page } from "@playwright/test";

// Structured controls align icons in right-edge lanes; prose links stay inline.
const ctas = "a:has(.cta-icon), a:has(.external-link-icon), a.fw-map-link, a.button, .event-list-cta, a.event-list-calendar, .add-calendar a, a.text-link, a.designer-credit, .member-vacancy a, .newsletter-sign-off a";

// Returns a description of every CTA whose trailing icon sits on a different
// line from the end of its label.
const strandedIcons = (page: Page) =>
  page.evaluate((selector) => {
    const failures: string[] = [];
    for (const arrow of document.querySelectorAll("a [aria-hidden=true],button [aria-hidden=true]")) {
      if (/^[→↗]$/.test(arrow.textContent?.trim() ?? "") ) failures.push(`Font-dependent arrow glyph: ${arrow.closest("a,button")?.textContent?.trim().slice(0,60)}`);
    }
    for (const svg of document.querySelectorAll<SVGElement>('svg[data-cta-arrow="forward"]')) {
      if (!svg.getBoundingClientRect().width) continue;
      const em = parseFloat(getComputedStyle(svg).fontSize);
      const box = svg.getBoundingClientRect();
      if (Math.abs(box.width/em - 1.05) > .03 || Math.abs(box.height/em - 1.05) > .03 || svg.querySelector("path")?.getAttribute("d") !== "M5 12h14M12 5l7 7-7 7" || svg.getAttribute("stroke-width") !== "2") failures.push("Forward arrow geometry/size differs from shared icon");
    }
    const range = document.createRange();
    for (const cta of document.querySelectorAll<HTMLElement>(selector)) {
      const icon = [...cta.querySelectorAll<HTMLElement>("[aria-hidden='true']")]
        .filter((el) => el.getBoundingClientRect().width > 0)
        .pop();
      if (!icon) continue;
      const label = icon.closest(".cta-label") ?? cta;
      const textNodes: Text[] = [];
      const walker = document.createTreeWalker(label, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node) {
        if (node.textContent?.trim() && !(node.parentElement?.closest(".visually-hidden, [aria-hidden='true']"))) textNodes.push(node as Text);
        node = walker.nextNode();
      }
      if (textNodes.length === 0) continue;
      range.selectNodeContents(textNodes[textNodes.length - 1]);
      const lines = [...range.getClientRects()];
      if (lines.length === 0) continue;
      const lastLine = lines.reduce((lowest, rect) => (rect.top > lowest.top ? rect : lowest));
      const iconBox = icon.getBoundingClientRect();
      const isPill = cta.matches("a.button, .event-list-cta--button");
      const structured = isPill || !!icon.closest(".button,.event-list-cta,.quick-row,.mobile-menu nav a");
      if (!structured) {
        const sameLine = iconBox.top < lastLine.bottom - 1 && iconBox.bottom > lastLine.top + 1;
        const gap = (iconBox.left - lastLine.right) / parseFloat(getComputedStyle(label).fontSize);
        if (gap < .12 || gap > .55) failures.push(`${cta.textContent?.trim().slice(0,40)}: inconsistent icon gap ${gap.toFixed(2)}em`);
        if (!sameLine) {
          failures.push(`${cta.textContent?.trim().replace(/\s+/g, " ").slice(0, 40)}: icon line y=${Math.round(iconBox.top)} but label's last line y=${Math.round(lastLine.top)}`);
        }
      }
      // Containment: a button CTA's icon must stay inside the button's own
      // border box, including under 200% text - an icon hanging outside the
      // pill is a bug wherever the icon sits.
      if (isPill) {
        const box = cta.getBoundingClientRect();
        if (iconBox.right > box.right + 1 || iconBox.left < box.left - 1 || iconBox.top < box.top - 1 || iconBox.bottom > box.bottom + 1) {
          failures.push(`${cta.textContent?.trim().replace(/\s+/g, " ").slice(0, 40)}: icon (right=${Math.round(iconBox.right)}, bottom=${Math.round(iconBox.bottom)}) lies outside its button (right=${Math.round(box.right)}, bottom=${Math.round(box.bottom)})`);
        }
      }
    }
    return failures;
  }, ctas);

// Emulates 200% text by doubling every computed font size (same approach as large-text-narrow.spec.ts).
const useLargeText = (page: Page) =>
  page.evaluate(() => {
    const elements = [...document.querySelectorAll<HTMLElement>("body *")];
    const sizes = elements.map((element) => parseFloat(getComputedStyle(element).fontSize));
    elements.forEach((element, index) => element.style.setProperty("font-size", `${sizes[index] * 2}px`, "important"));
  });

// Every public route is covered: the rule is site-wide.
import { routes } from "./routes";
const pages = routes;
const widths = [320, 390, 820, 1440];

test.describe("CTA trailing icons stay with the label", () => {
  for (const width of widths) {
    for (const path of pages) {
      test(`${path} at ${width}px`, async ({ page }) => {
        // Set each test's viewport explicitly: test.use() inside this loop
        // would overwrite the shared suite's viewport for every width.
        await page.setViewportSize({ width, height: 900 });
        await page.goto(path);
        expect(await page.evaluate(() => innerWidth)).toBe(width);
        expect(await strandedIcons(page)).toEqual([]);
      });
    }
  }

  test.describe("200% text at 390px", () => {
    test.use({ viewport: { width: 390, height: 900 } });
    for (const path of pages) {
      test(`${path} (per-element fonts)`, async ({ page }) => {
        await page.goto(path);
        await useLargeText(page);
        expect(await strandedIcons(page)).toEqual([]);
      });
      test(`${path} (root font size)`, async ({ page }) => {
        await page.goto(path);
        await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
        expect(await strandedIcons(page)).toEqual([]);
      });
    }
  });
});

test.describe("Wrapping stays inside the neighbouring content column", () => {
  for (const width of [320, 768, 1280, 1366, 1440]) {
    for (const night of [false, true]) {
      for (const textSize of ["normal", "200% per-element", "200% root"]) {
        for (const path of ["/newsletter/", "/uniform/"]) {
          test(`${path} ${width}px ${night ? "Night" : "Day"} ${textSize}`, async ({ page }) => {
            await page.setViewportSize({ width, height: 900 });
            await page.emulateMedia({ reducedMotion: "reduce" });
            await page.addInitScript((theme) => localStorage.setItem("foa-theme", theme), night ? "night" : "day");
            await page.goto(path === "/newsletter/" ? `${path}#newsletter-issue-autumn-term-2026` : path);
            if (textSize === "200% per-element") await useLargeText(page);
            if (textSize === "200% root") await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
            // Reproduce the wider fallback fonts used by Linux CI, not only macOS fonts.
            await page.addStyleTag({ content: ".cta-label, .newsletter-more a { font-family: Verdana, sans-serif !important; }" });
            await page.evaluate(async () => {
              await document.fonts.ready;
              // Let font/text/style changes finish a rendered layout before
              // measuring label and icon boxes.
              await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
            });
            if (path === "/fireworks-volunteering/") {
              await expect(page.locator('.vol-grid,.vol-card__action')).toHaveCount(0);
              await expect(page.locator('.content-section a')).toHaveCount(2);
              for(const link of await page.locator('.content-section a').all())expect(await link.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
            }
            if (path === "/newsletter/") {
              await page.locator("#newsletter-issue-autumn-term-2026 .newsletter-read-more").click();
              await expect(page.locator('.newsletter-more a[href="https://ashleyschool.org.uk/calendar"]')).toBeVisible();
            }
            expect(await strandedIcons(page)).toEqual([]);
            expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
            const overflow = await page.locator(path === "/fireworks-volunteering/" ? ".content-section a:visible" : ".newsletter-more a:visible, .uniform-action").evaluateAll((links) => links.flatMap((link) => {
              const column = link.closest("p, li, .newsletter-more, .vol-card, .view-hero-action, .uniform-cta")!.getBoundingClientRect();
              const range = document.createRange();
              const rects = [...link.querySelectorAll(".cta-icon, .external-link-icon")].map((icon) => icon.getBoundingClientRect());
              const walker = document.createTreeWalker(link, NodeFilter.SHOW_TEXT);
              let node = walker.nextNode();
              while (node) {
                if (node.textContent?.trim() && !node.parentElement?.closest('.visually-hidden, [aria-hidden="true"]')) {
                  range.selectNodeContents(node);
                  rects.push(...range.getClientRects());
                }
                node = walker.nextNode();
              }
              const outside = rects.filter((rect) => rect.width > 1 && (rect.left < column.left - 1 || rect.right > column.right + 1));
              return outside.length ? [{ text: link.textContent, column: { left: column.left, right: column.right }, outside: outside.map(({ left, right }) => ({ left, right })) }] : [];
            }));
            expect(overflow, "link text and icon must stay inside their own column").toEqual([]);
          });
        }
      }
    }
  }
});

for (const width of [390,1440]) test(`paired CTA consistency and short labels at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});
 for(const route of ['/','/whats-on/','/events/christmas-fayre-2026/','/christmas-fayre-volunteering/']){
  await page.goto(route);
  const bad=await page.locator('a.button:visible,.event-list-cta--button:visible').evaluateAll(es=>es.flatMap(e=>{const walker=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);let n;const rects: DOMRect[]=[];while(n=walker.nextNode()){if(!n.textContent?.trim()||n.parentElement?.closest('.visually-hidden,[aria-hidden="true"]'))continue;const r=document.createRange();r.selectNodeContents(n);rects.push(...r.getClientRects());}const text=e.textContent?.trim()??'';return /^(Volunteer|Event details|Sign up on JustSignup|Choose a slot)/.test(text)&&rects.some(r=>Math.abs(r.top-rects[0].top)>3)?[text]:[]}));
  expect(bad,route).toEqual([]);
  if(route==='/whats-on/'){
   const sizes=await page.locator('[data-volunteer-actions] .event-list-cta--button,[data-volunteer-actions] .event-volunteer-link .button').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return{width:r.width,height:r.height}}));expect(sizes).toHaveLength(2);expect(Math.abs(sizes[0].width-sizes[1].width)).toBeLessThan(1);expect(Math.abs(sizes[0].height-sizes[1].height)).toBeLessThan(1);
  }
 }
 if(width===390){await page.getByRole('button',{name:'Open menu'}).click();expect(await strandedIcons(page)).toEqual([]);await expect(page.getByRole('link',{name:'Fayre Volunteering',exact:true})).toBeVisible();}
});

for (const width of [320,390]) test(`open menu shares arrow geometry at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/');await page.getByRole('button',{name:'Open menu'}).click();
 await expect(page.locator('.mobile-menu-arrow svg[data-cta-arrow="forward"]')).toHaveCount(9);
 expect(await strandedIcons(page)).toEqual([]);
});

for(const width of [390,1440]) test(`grouped arrow columns at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});
 const aligned=async(selector:string)=>{const xs=await page.locator(selector).evaluateAll(es=>es.map(e=>e.getBoundingClientRect().right));expect(xs.length).toBeGreaterThan(1);expect(Math.max(...xs)-Math.min(...xs)).toBeLessThan(1)};
 await page.goto('/');await aligned('.narnia-landscape .button .cta-icon');
 const rows=await page.locator('.quick-row').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect(),i=e.querySelector('.cta-icon')!.getBoundingClientRect();return{right:r.right,inset:r.right-i.right}}));expect(rows).toHaveLength(2);expect(Math.abs(rows[0].inset-rows[1].inset)).toBeLessThan(1);if(width===390)await aligned('.quick-row .cta-icon');
 if(width===390){await page.getByRole('button',{name:'Open menu'}).click();await aligned('.mobile-menu-arrow');}
 await page.goto('/whats-on/');await aligned('[data-volunteer-actions] [data-cta-arrow="forward"]');
 await page.goto('/christmas-fayre-volunteering/');const insets=await page.locator('.fayre-volunteer__action').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().right-e.querySelector('.cta-icon')!.getBoundingClientRect().right));expect(Math.max(...insets)-Math.min(...insets)).toBeLessThan(1);
});
