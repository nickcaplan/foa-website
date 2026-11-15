import {test,expect} from '@playwright/test';
const routes=['/contact/','/committee/','/get-involved/','/uniform/','/newsletter/','/playground.html'];
for(const width of [320,390,1440])for(const scale of [1,2])for(const theme of ['day','night'])test(`mail icons ${width} ${scale} ${theme}`,async({page})=>{
 test.setTimeout(90000);await page.setViewportSize({width,height:1000});await page.addInitScript(t=>{localStorage.setItem('foa-theme',t);localStorage.setItem('foa-cookie-preferences','essential')},theme);
 for(const route of routes){await page.goto(route);await page.evaluate(()=>document.fonts.ready);await page.evaluate(s=>document.documentElement.style.fontSize=16*s+'px',scale);
 const links=page.locator('a[href^="mailto:"]');expect(await links.count()).toBeGreaterThan(0);
 for(const a of await links.all()){
  await expect(a.locator('svg')).toHaveCount(1);await expect(a.locator('svg')).toHaveAttribute('aria-hidden','true');await expect(a.locator('[data-cta-arrow]')).toHaveCount(0);
  if(!await a.isVisible())continue;await a.scrollIntoViewIfNeeded();
  const result=await a.evaluate(e=>{const icon=e.querySelector('svg')!.getBoundingClientRect(),walker=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);let n;while(n=walker.nextNode()){if(n.parentElement?.closest('[aria-hidden],.visually-hidden')||!n.textContent?.trim())continue;const r=document.createRange();r.selectNodeContents(n);for(const b of r.getClientRects())if(b.width&&b.right>icon.left&&b.left<icon.right&&b.bottom>icon.top&&b.top<icon.bottom)return {bad:n.textContent,r:[b.left,b.right,b.top,b.bottom],icon:[icon.left,icon.right,icon.top,icon.bottom],cls:e.className}}return icon.width>0&&icon.right<=document.documentElement.clientWidth+1&&icon.left>=-1?true:{viewport:icon.left+'..'+icon.right,cls:e.className}});expect(result===true,JSON.stringify({route,result})).toBe(true);
 }
 for(const word of await page.locator('a.button[href^="mailto:"] .cta-label').all()){const lines=await word.evaluate(e=>{const w=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){for(const m of n.textContent!.matchAll(/[A-Za-z]{3,}/g)){const r=document.createRange();r.setStart(n,m.index!);r.setEnd(n,m.index!+m[0].length);if(r.getClientRects().length>1)return false}}return true});expect(lines,route+' mail words stay whole').toBe(true);}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),route).toBeLessThanOrEqual(0);
 }
});

test('mail CTA envelopes are one consistent size site-wide', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.addInitScript(() => localStorage.setItem('foa-cookie-preferences', 'essential'));
  for (const route of routes.filter(r => r !== '/playground.html')) {
    await page.goto(route);
    await page.evaluate(() => document.fonts.ready);
    const sizes = await page.locator('a.button[href^="mailto:"]').evaluateAll((els) => els.map((e) => {
      const svg = e.querySelector('svg');
      if (!svg) return null;
      const r = svg.getBoundingClientRect();
      if (!r.width) return null;
      const em = parseFloat(getComputedStyle(e).fontSize);
      return { px: r.height, ratio: r.height / em, label: e.textContent?.trim().slice(0, 24) };
    }).filter((x): x is { px: number; ratio: number; label: string } => x !== null));
    for (const s of sizes) {
      // The shared convention is a ~21px envelope: 1.3em where it scales with
      // the button font (20.8-21.8px), pinned at 21px on uniform/contact.
      expect(s.px, `${route} "${s.label}" envelope ${s.px}px, want ~21px like every other mail CTA`).toBeGreaterThan(20.4);
      expect(s.px, `${route} "${s.label}" envelope ${s.px}px, want ~21px like every other mail CTA`).toBeLessThan(22.1);
    }
  }
});
