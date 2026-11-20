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

// Nick (16 Nov 2026): CTAs that appear as a stack must all be the same width
// on desktop ("the CTAs have different lengths"). The earlier automated width
// test checked phone gutters, not equal button widths. The get-involved role
// rows each render their button in a separate container. Group by the parent
// class so repeated rows, and any
// future stack on any page, are compared at desktop width.
for(const route of routes)test(`CTA stack widths match on desktop ${route}`,async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(route);
  const groups=await page.evaluate(()=>{
    const byKey=new Map<string,{w:number;t:string}[]>();
    for(const b of document.querySelectorAll('main a.button, main button.button')){
      if(b.getBoundingClientRect().width===0)continue;
      const key=[...(b.parentElement?.classList??[])].sort().join(' ');
      if(!key)continue;
      if(!byKey.has(key))byKey.set(key,[]);
      byKey.get(key)!.push({w:Math.round(b.getBoundingClientRect().width),t:b.textContent!.trim().replace(/\s+/g,' ').slice(0,30)});
    }
    return [...byKey.entries()].filter(([,v])=>v.length>1);
  });
  for(const [key,bs] of groups){
    const widths=bs.map(b=>b.w);
    expect(Math.max(...widths)-Math.min(...widths),`${route} .${key} CTA stack widths differ: ${JSON.stringify(bs)}`).toBeLessThanOrEqual(2);
  }
});
