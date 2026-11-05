import { expect, test } from '@playwright/test';
import {readFileSync} from 'node:fs';
test.beforeEach(async({page})=>{await page.clock.setFixedTime(new Date('2026-11-05T21:00:00Z'))});
const fayre=JSON.parse(readFileSync('src/content/events/christmas-fayre-2026.json','utf8'));
for (const width of [320,390,768,1024,1440]) for (const theme of ['day','night']) for (const large of [false,true]) {
 test(`Christmas homepage ${width} ${theme} enlarged=${large}`, async({page})=>{
  await page.setViewportSize({width,height:900});await page.addInitScript(mode=>{localStorage.setItem('foa-theme',mode);localStorage.setItem('foa-cookie-preferences','essential')},theme);await page.goto('/');
  if(large) await page.evaluate(()=>{const all=[...document.querySelectorAll<HTMLElement>('body *')];const sizes=all.map(e=>parseFloat(getComputedStyle(e).fontSize));all.forEach((e,i)=>e.style.setProperty('font-size',`${sizes[i]*2}px`,'important'))});
  await expect(page.getByRole('heading',{level:1,name:'The Ashley Christmas Fayre',exact:true})).toBeVisible();
  const details=page.getByRole('link',{name:'Event details',exact:true});await expect(details).toBeVisible();
  const dimensions=await details.evaluate(e=>({h:e.getBoundingClientRect().height,line:parseFloat(getComputedStyle(e).lineHeight),padding:parseFloat(getComputedStyle(e).paddingTop)}));expect(dimensions.h).toBeGreaterThanOrEqual(56);expect(dimensions.padding).toBeGreaterThanOrEqual(14);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const titleLayout = await page.locator('[data-homepage-christmas] h1').evaluate(h => {
   const walker=document.createTreeWalker(h,NodeFilter.SHOW_TEXT);let node;let word: DOMRect[] = [];
   while(node=walker.nextNode()) { const at=node.textContent?.indexOf('Christmas') ?? -1;if(at>=0){const range=document.createRange();range.setStart(node,at);range.setEnd(node,at+9);word=[...range.getClientRects()];break;} }
   const hero=h.closest('.hero-event')!.getBoundingClientRect();const side=h.closest('.hero-event')!.querySelector('.hero-actions')!.getBoundingClientRect();const title=h.getBoundingClientRect();
   return {whole:word?.length===1,contained:word?.every(r=>r.left>=hero.left&&r.right<=hero.right),separate:title.bottom<=side.top||title.right<=side.left};
  });
  expect(titleLayout).toEqual({whole:true,contained:true,separate:true});
  const actions=page.locator('.christmas-home-art .hero-actions');
  await expect(actions.getByRole('link')).toHaveCount(2);
  const positions=await actions.evaluate(el=>{const links=[...el.querySelectorAll('a')],sponsor=el.closest('article')!.querySelector('.sponsor-ribbon')!.getBoundingClientRect();return {below:el.getBoundingClientRect().top>=sponsor.bottom,ordered:links[0].getBoundingClientRect().bottom<=links[1].getBoundingClientRect().top,red:getComputedStyle(links[1]).backgroundColor}});
  expect(positions).toEqual({below:true,ordered:true,red:'rgb(167, 43, 57)'});
  const image=page.locator('.christmas-home-wreath');expect(await image.evaluate((e:HTMLImageElement)=>e.complete&&e.naturalWidth>0)).toBe(true);
  await expect(page.getByRole('link',{name:'Email the organisers'})).toHaveAttribute('href',/^mailto:ashleyschoolchristmasfair2026@gmail.com\?subject=/);
  await details.focus();await page.keyboard.press('Enter');await expect(page).toHaveURL(/\/events\/christmas-fayre-2026\/$/);await expect(page.getByRole('heading',{level:1,name:'Christmas Fayre'})).toBeVisible();
 });
}

for (const width of [320,390,768,1024,1440]) test(`Christmas homepage root text 200% ${width}`, async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/');await page.evaluate(()=>document.documentElement.style.fontSize='200%');
 const layout=await page.locator('[data-homepage-christmas]').evaluate(hero=>{const h=hero.querySelector('h1')!.getBoundingClientRect(),panel=hero.getBoundingClientRect(),action=hero.querySelector('.hero-actions')!.getBoundingClientRect();return {title:h.left>=panel.left&&h.right<=panel.right,action:action.left>=panel.left&&action.right<=panel.right,separate:h.bottom<=action.top||h.right<=action.left}});
 expect(layout).toEqual({title:true,action:true,separate:true});
 const word=await page.locator('[data-homepage-christmas] h1').evaluate(h=>{const t=[...h.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&n.textContent?.includes('Christmas'))!;const start=t.textContent!.indexOf('Christmas');const r=document.createRange();r.setStart(t,start);r.setEnd(t,start+9);const rects=[...r.getClientRects()],panel=h.closest('.hero-event')!.getBoundingClientRect();return rects.length===1&&rects.every(x=>x.left>=panel.left&&x.right<=panel.right)});expect(word).toBe(true);

});

for(const [date,label] of [[new Date(Date.parse(fayre.start)-86400000).toISOString(),'Tomorrow'],[fayre.start,'Today']]) test(`Christmas relative date ${label}`,async({page})=>{await page.clock.install({time:new Date(date)});await page.goto('/');await expect(page.locator('.hero-when [data-event-date]')).toHaveText(label);await expect(page.locator('.hero-when [data-event-date]')).toBeVisible();});

for(const width of [390,1023,1024,1440])for(const size of [100,200])test(`small tree clears content ${width} ${size}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.goto('/');if(size===200)await page.evaluate(()=>document.documentElement.style.fontSize='200%');
 const status=await page.locator('.christmas-home-tree').evaluate(el=>{const style=getComputedStyle(el),r=el.getBoundingClientRect(),hero=el.closest('.hero-event')!.getBoundingClientRect();const overlap=[...document.querySelectorAll('[data-homepage-christmas] .hero-copy h1,[data-homepage-christmas] .hero-copy p,.christmas-home-art,.menu-toggle')].some(e=>{const b=e.getBoundingClientRect();return r.left<b.right&&r.right>b.left&&r.top<b.bottom&&r.bottom>b.top});return{visible:style.display!=='none',overlap,inside:r.left>=hero.left&&r.right<=hero.right&&r.top>=hero.top&&r.bottom<=hero.bottom}});
 expect(status.visible).toBe(true);if(status.visible){expect(status.overlap).toBe(false);expect(status.inside).toBe(true)}
});

for (const width of [320,390]) test(`mobile Christmas title composition ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/');
 const composition=await page.locator('[data-homepage-christmas]').evaluate(hero=>{const title=hero.querySelector('h1')!,em=title.querySelector('em')!,tree=hero.querySelector('.christmas-home-tree')!,details=hero.querySelector('.hero-when')!;const t=title.getBoundingClientRect(),e=em.getBoundingClientRect(),r=tree.getBoundingClientRect(),d=details.getBoundingClientRect();return{size:parseFloat(getComputedStyle(title).fontSize),twoLines:e.top>t.top+20,treeAlongside:r.left>=t.right,detailsGap:d.top-t.bottom};});
 expect(composition.size).toBeGreaterThanOrEqual(36);expect(composition.twoLines).toBe(true);expect(composition.treeAlongside).toBe(true);expect(composition.detailsGap).toBeLessThan(50);
});

for(const width of [320,390]) test(`enlarged Christmas action words stay whole ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.goto('/');await page.evaluate(()=>document.documentElement.style.fontSize='200%');
 for(const text of ['organisers','details']) {
 const whole=await page.locator('.christmas-home-art .cta-word').filter({hasText:text}).evaluate(el=>{
 const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let n;const boxes=[];while(n=walker.nextNode()){if(n.textContent?.trim()){const r=document.createRange();r.selectNodeContents(n);boxes.push(...[...r.getClientRects()].filter(x=>x.width));}}
 return new Set(boxes.map(x=>Math.round(x.top))).size===1;
 });expect(whole).toBe(true);
 }
});
