import {test,expect} from '@playwright/test';
const routes=['/events/christmas-fayre-2026/','/christmas-fayre-volunteering/','/christmas-fayre-art-competition/'];
for(const width of [320,390,1024,1440]) for(const scale of [1,2]) for(const theme of ['day','night']) test(`Fayre shared frame ${width}/${scale}/${theme}`,async({page})=>{
 await page.setViewportSize({width,height:1000});
 const sizes:{width:number,height:number}[]=[];
 for(const route of routes){
  await page.goto(route);
  await page.evaluate(({scale,theme})=>{document.documentElement.style.fontSize=`${16*scale}px`;document.documentElement.dataset.theme=theme;},{scale,theme});
  const hero=page.locator('.narnia-landscape,.fayre-art-hero').first();
  const geometry=await hero.evaluate(el=>{const r=el.getBoundingClientRect(),h=el.querySelector('h1')!;return {width:r.width,height:r.height,headingFits:h.scrollWidth<=h.clientWidth};});
  expect(geometry.headingFits).toBe(true);sizes.push(geometry);
  const nav=page.getByRole('navigation',{name:'Christmas Fayre pages'});
  await expect(nav.getByRole('link')).toHaveCount(3);
  await expect(nav.locator('[aria-current=page]')).toHaveCount(1);
  const ys=await nav.getByRole('link').evaluateAll(els=>els.map(el=>Math.round(el.getBoundingClientRect().top)));
  expect(new Set(ys).size).toBe(1);
  expect((await nav.boundingBox())!.y).toBeGreaterThanOrEqual((await hero.boundingBox())!.y+geometry.height);
 }
 expect(Math.max(...sizes.map(s=>s.width))-Math.min(...sizes.map(s=>s.width))).toBeLessThanOrEqual(1);
 if(scale===1)expect(Math.max(...sizes.map(s=>s.height))-Math.min(...sizes.map(s=>s.height))).toBeLessThanOrEqual(1);
});
