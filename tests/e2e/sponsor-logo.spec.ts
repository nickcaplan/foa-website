import {expect,test} from '@playwright/test';
for(const width of [320,390,1440])for(const deviceScaleFactor of [1,2,3])test(`official sponsor logo ${width}px at ${deviceScaleFactor}x`,async({browser})=>{
 const context=await browser.newContext({viewport:{width,height:1000},deviceScaleFactor});const page=await context.newPage();
 for(const route of ['/','/events/christmas-fayre-2026/']){
  await page.goto(route);const img=page.locator('.sponsor-ribbon img');await expect(img).toHaveAttribute('src','/sponsors/martin-flashman.png');await img.evaluate((e:HTMLImageElement)=>e.decode());
  const info=await img.evaluate((e:HTMLImageElement)=>({natural:e.naturalWidth,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height}));expect(info.natural).toBe(1280);expect(info.w).toBeGreaterThan(193);expect(info.w*deviceScaleFactor).toBeLessThanOrEqual(info.natural);expect(info.w/info.h).toBeCloseTo(1280/96,1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(0);
 }await context.close();
});
