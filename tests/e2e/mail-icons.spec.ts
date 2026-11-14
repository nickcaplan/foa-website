import {test,expect} from '@playwright/test';
const routes=['/contact/','/committee/','/get-involved/','/uniform/','/newsletter/','/playground.html'];
for(const width of [320,390,1440])for(const scale of [1,2])for(const theme of ['day','night'])test(`mail icons ${width} ${scale} ${theme}`,async({page})=>{
 test.setTimeout(90000);await page.setViewportSize({width,height:1000});await page.addInitScript(t=>{localStorage.setItem('foa-theme',t);localStorage.setItem('foa-cookie-preferences','essential')},theme);
 for(const route of routes){await page.goto(route);await page.evaluate(()=>document.fonts.ready);await page.evaluate(s=>document.documentElement.style.fontSize=16*s+'px',scale);
 const links=page.locator('a[href^="mailto:"]');expect(await links.count()).toBeGreaterThan(0);
 for(const a of await links.all()){
  await expect(a.locator('svg')).toHaveCount(1);await expect(a.locator('svg')).toHaveAttribute('aria-hidden','true');await expect(a.locator('[data-cta-arrow]')).toHaveCount(0);
  if(!await a.isVisible())continue;await a.scrollIntoViewIfNeeded();
  const result=await a.evaluate(e=>{const icon=e.querySelector('svg')!.getBoundingClientRect(),walker=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);let n;while(n=walker.nextNode()){if(n.parentElement?.closest('[aria-hidden],.visually-hidden')||!n.textContent?.trim())continue;const r=document.createRange();r.selectNodeContents(n);for(const b of r.getClientRects())if(b.width&&b.right>icon.left&&b.left<icon.right&&b.bottom>icon.top&&b.top<icon.bottom)return false}return icon.width>0&&icon.right<=document.documentElement.clientWidth+1&&icon.left>=-1});expect(result,route).toBe(true);
 }
 for(const word of await page.locator('a.button[href^="mailto:"] .cta-label').all()){const lines=await word.evaluate(e=>{const w=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){for(const m of n.textContent!.matchAll(/[A-Za-z]{3,}/g)){const r=document.createRange();r.setStart(n,m.index!);r.setEnd(n,m.index!+m[0].length);if(r.getClientRects().length>1)return false}}return true});expect(lines,route+' mail words stay whole').toBe(true);}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),route).toBeLessThanOrEqual(0);
 }
});
