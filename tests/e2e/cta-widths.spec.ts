import {test,expect} from '@playwright/test';
import {routes} from './routes';
// Shared CTA pattern: no button may extend beyond the standard 16px page
// gutter (the Glitter Tree CTA used to out-widen every other CTA this
// way). Routes come from the shared discovered list so new pages are
// covered automatically; widths span the phone range and the 47.99rem
// breakpoint edge.
for(const width of [320,375,390,768])for(const route of routes)test(`CTA widths ${width} ${route}`,async({page})=>{
  await page.setViewportSize({width,height:1000});
  await page.goto(route);
  const boxes=await page.evaluate(()=>[...document.querySelectorAll('a.button, button.button')].filter(e=>e.getBoundingClientRect().width>0).map(e=>{const b=e.getBoundingClientRect();return {x:b.x,right:b.right,w:b.width,t:e.textContent!.trim().slice(0,30)}}));
  expect(boxes.length,'page has buttons').toBeGreaterThan(0);
  for(const b of boxes){
    expect(b.x,`${route} "${b.t}" left edge inside gutter`).toBeGreaterThanOrEqual(15.5);
    expect(b.right,`${route} "${b.t}" right edge inside gutter`).toBeLessThanOrEqual(width-15.5);
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),'no horizontal scroll').toBeLessThanOrEqual(1);
});
