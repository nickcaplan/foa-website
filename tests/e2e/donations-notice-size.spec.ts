import{test,expect}from'@playwright/test';
for(const route of['/events/christmas-fayre-2026/','/christmas-fayre-volunteering/','/'])for(const width of[320,390,768,1280,1920])for(const scale of[1,2])test(`notice ${route} ${width} ${scale}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.goto(route);await page.evaluate(s=>document.documentElement.style.fontSize=`${16*s}px`,scale);
 const box=page.locator('.fayre-donations-notice');await expect(box).toBeVisible();await expect(box).toContainText('Friday 20th November');
 const r=await box.evaluate(e=>{const r=e.getBoundingClientRect(),p=e.parentElement!.getBoundingClientRect();return{width:r.width,centre:r.x+r.width/2,parentCentre:p.x+p.width/2,overflow:e.scrollWidth-e.clientWidth}});
 expect(r.overflow).toBeLessThanOrEqual(1);expect(Math.abs(r.centre-r.parentCentre)).toBeLessThan(1);expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 if(width>=1280&&scale===1)expect(r.width).toBeLessThan(600);
});
