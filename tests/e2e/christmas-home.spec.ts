import { expect, test } from '@playwright/test';
import {readFileSync} from 'node:fs';
const fayre=JSON.parse(readFileSync('src/content/events/christmas-fayre-2026.json','utf8'));
for (const width of [320,390,768,1024,1440]) for (const theme of ['day','night']) for (const large of [false,true]) {
 test(`Christmas homepage ${width} ${theme} enlarged=${large}`, async({page})=>{
  await page.setViewportSize({width,height:900});await page.addInitScript(mode=>{localStorage.setItem('foa-theme',mode);localStorage.setItem('foa-cookie-preferences','essential')},theme);await page.goto('/');
  if(large) await page.evaluate(()=>{const all=[...document.querySelectorAll<HTMLElement>('body *')];const sizes=all.map(e=>parseFloat(getComputedStyle(e).fontSize));all.forEach((e,i)=>e.style.setProperty('font-size',`${sizes[i]*2}px`,'important'))});
  await expect(page.getByRole('heading',{level:1,name:'Christmas Fayre'})).toBeVisible();
  const details=page.getByRole('link',{name:'Event details',exact:true});await expect(details).toBeVisible();
  const dimensions=await details.evaluate(e=>({h:e.getBoundingClientRect().height,line:parseFloat(getComputedStyle(e).lineHeight),padding:parseFloat(getComputedStyle(e).paddingTop)}));expect(dimensions.h).toBeGreaterThanOrEqual(56);expect(dimensions.padding).toBeGreaterThanOrEqual(14);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const titleLayout = await page.locator('h1').evaluate(h => {
   const walker=document.createTreeWalker(h,NodeFilter.SHOW_TEXT);let node;let word: DOMRect[] = [];
   while(node=walker.nextNode()) { const at=node.textContent?.indexOf('Christmas') ?? -1;if(at>=0){const range=document.createRange();range.setStart(node,at);range.setEnd(node,at+9);word=[...range.getClientRects()];break;} }
   const hero=h.closest('.hero-event')!.getBoundingClientRect();const side=h.closest('.hero-event')!.querySelector('.hero-actions')!.getBoundingClientRect();const title=h.getBoundingClientRect();
   return {whole:word?.length===1,contained:word?.every(r=>r.left>=hero.left&&r.right<=hero.right),separate:title.bottom<=side.top||title.right<=side.left};
  });
  expect(titleLayout).toEqual({whole:true,contained:true,separate:true});
  const image=page.locator('.christmas-home-wreath');expect(await image.evaluate((e:HTMLImageElement)=>e.complete&&e.naturalWidth>0)).toBe(true);
  await expect(page.getByRole('link',{name:'Help at the Fayre'})).toHaveAttribute('href',/^mailto:ashleyschoolchristmasfair2026@gmail.com\?subject=/);
  await details.focus();await page.keyboard.press('Enter');await expect(page).toHaveURL(/\/events\/christmas-fayre-2026\/$/);await expect(page.getByRole('heading',{level:1,name:'Christmas Fayre'})).toBeVisible();
 });
}

for (const width of [320,390,768,1024,1440]) test(`Christmas homepage root text 200% ${width}`, async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/');await page.evaluate(()=>document.documentElement.style.fontSize='200%');
 const layout=await page.locator('.hero-event').evaluate(hero=>{const h=hero.querySelector('h1')!.getBoundingClientRect(),panel=hero.getBoundingClientRect(),action=hero.querySelector('.hero-actions')!.getBoundingClientRect();return {title:h.left>=panel.left&&h.right<=panel.right,action:action.left>=panel.left&&action.right<=panel.right,separate:h.bottom<=action.top||h.right<=action.left}});
 expect(layout).toEqual({title:true,action:true,separate:true});
 const word=await page.locator('.hero-event h1').evaluate(h=>{const t=[...h.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&n.textContent?.includes('Christmas'))!;const start=t.textContent!.indexOf('Christmas');const r=document.createRange();r.setStart(t,start);r.setEnd(t,start+9);const rects=[...r.getClientRects()],panel=h.closest('.hero-event')!.getBoundingClientRect();return rects.length===1&&rects.every(x=>x.left>=panel.left&&x.right<=panel.right)});expect(word).toBe(true);

});

for(const [date,label] of [[new Date(Date.parse(fayre.start)-86400000).toISOString(),'Tomorrow'],[fayre.start,'Today']]) test(`Christmas relative date ${label}`,async({page})=>{await page.clock.install({time:new Date(date)});await page.goto('/');await expect(page.locator('.hero-when [data-event-date]')).toHaveText(label);await expect(page.locator('.hero-when [data-event-date]')).toBeVisible();});
