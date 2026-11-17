import {expect,test} from '@playwright/test';

// Nick (17 Nov 2026): the Narnia hero CTAs size to their label on every page
// that uses the hero (homepage, Fayre event, volunteering) - no full-width
// pills. The old rule was width:100% capped at 22rem: 352px on desktop and the
// full content width on phone (332px at 390px). The 320px threshold below
// fails on that rule at both widths and passes for any label that sits on one
// line at normal text ("Art Competition" is the longest, ~230px).
for(const width of [390,1440])for(const route of ['/','/events/christmas-fayre-2026/','/christmas-fayre-volunteering/'])
test(`hero CTA sizes to its label ${width} ${route}`,async({page})=>{
  await page.setViewportSize({width,height:1000});
  await page.goto(route);
  const buttons=await page.locator('.narnia-landscape__action').all();
  expect(buttons.length,`${route} hero has a CTA`).toBeGreaterThan(0);
  for(const b of buttons){
    const box=await b.boundingBox();
    expect(box!.width,`${route} hero CTA "${(await b.textContent())!.trim().slice(0,30)}" is wider than its label needs`).toBeLessThan(320);
  }
});
