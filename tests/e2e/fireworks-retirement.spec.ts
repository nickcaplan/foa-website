import { expect, test } from '@playwright/test';
for(const route of ['/events/fireworks-2026/','/fireworks-volunteering/'])for(const width of[320,390,768,1440])for(const js of[true,false])test(`old Fireworks URL redirects home ${route} ${width} js=${js}`,async({browser},testInfo)=>{
 const context=await browser.newContext({baseURL:String(testInfo.project.use.baseURL),viewport:{width,height:1000},javaScriptEnabled:js,reducedMotion:'reduce'});try {const page=await context.newPage();
 await page.goto(route);await expect(page).toHaveURL(String(testInfo.project.use.baseURL)+'/');
 await expect(page.getByRole('heading',{level:1,name:'Christmas Fayre',exact:true})).toBeVisible();
 await expect(page.locator('[data-homepage-fireworks],.fw-stage,.vol-card')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.goto('/whats-on/');await expect(page.locator('a[href*="fireworks"],[data-event-title="Fireworks on the Field"]')).toHaveCount(0);
 } finally {await context.close();}
});
test('retired homepage stays Christmas with historical device clock',async({page})=>{
 await page.clock.setFixedTime(new Date('2026-11-05T20:00:00Z'));await page.goto('/');await expect(page.locator('[data-homepage-fireworks]')).toHaveCount(0);await expect(page.getByRole('heading',{level:1,name:'Christmas Fayre',exact:true})).toBeVisible();await expect(page.locator('[data-homepage-christmas]')).not.toHaveAttribute('data-show-from');
});
