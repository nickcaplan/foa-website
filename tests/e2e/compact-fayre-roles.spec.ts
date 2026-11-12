import {expect,test} from '@playwright/test';
for(const width of [320,390,1440])for(const scale of [1,2])test(`compact Fayre roles ${width}px ${scale*100}% text`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.goto('/events/christmas-fayre-2026/');
 await page.evaluate(s=>document.documentElement.style.fontSize=`${16*s}px`,scale);
 const section=page.locator('section[aria-labelledby="xmas-areas-title"]');
 await expect(section.locator('.xmas-area,.xmas-areas')).toHaveCount(0);
 const roles=section.locator('[data-fayre-help-roles]');
 for(const name of ['Fun Zone','Craft Workshop','Café','Photo booth + Trail prizes','Kids Tombola','Bottle Tombola','Entrance & Tokens','Glitter Tattoos','BBQ','Bar'])await expect(roles).toContainText(name);
 await expect(section.getByRole('link',{name:'Volunteer',exact:true})).toHaveAttribute('href','/christmas-fayre-volunteering/');
 await expect(section.getByRole('heading',{name:'Good to know'})).toBeVisible();
 await expect(section.locator('.xmas-points li')).toHaveCount(3);
 const order=await page.locator('.xmas-stage section[aria-labelledby]').evaluateAll(es=>es.map(e=>e.getAttribute('aria-labelledby')));
 expect(order).toEqual(['xmas-title','xmas-donations-title','xmas-art-title','xmas-areas-title','fayre-leads-title','xmas-contact-title']);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(0);
});
