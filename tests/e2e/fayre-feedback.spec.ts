import {test,expect} from '@playwright/test';
for(const width of[320,390,768,1440])test(`Fayre information and CTA widths ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.goto('/events/christmas-fayre-2026/');
 const leads=page.locator('.fayre-leads__card');await expect(leads).toHaveCount(2);await expect(leads.locator('svg[aria-hidden="true"]')).toHaveCount(4);
 expect(await leads.first().evaluate(e=>({background:getComputedStyle(e).backgroundColor,radius:getComputedStyle(e).borderRadius}))).toEqual({background:'rgba(0, 0, 0, 0)',radius:'0px'});
 expect(await page.locator('.narnia-landscape__footer').evaluate(e=>getComputedStyle(e).borderTopWidth)).toBe('0px');
 const heights=await page.locator('.xmas-area').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().height));expect(Math.max(...heights)-Math.min(...heights)).toBeLessThan(1);
 const paths=await page.locator('.xmas-area').evaluateAll(els=>Object.fromEntries(els.map(e=>[e.textContent?.trim(),e.querySelector('path')?.getAttribute('d')])));
 expect(paths.BBQ).not.toBe(paths['Café']);expect(paths.Bar).not.toBe(paths['Café']);expect(paths.Bar).not.toBe(paths.BBQ);
 await page.goto('/whats-on/');const row=page.locator('[data-volunteer-actions]');
 await expect(row.getByRole('link',{name:'Event details',exact:true})).toHaveAttribute('href','/events/christmas-fayre-2026/');
 await expect(row.getByRole('link',{name:'Explore volunteering',exact:true})).toHaveAttribute('href','/christmas-fayre-volunteering/');
 await expect(row.locator('.event-volunteer-link svg[aria-hidden="true"]')).toHaveCount(1);
 const widths=await row.locator('.event-list-cta--button,.event-volunteer-link .button').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().width));expect(widths).toHaveLength(2);expect(Math.abs(widths[0]-widths[1])).toBeLessThan(1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBe(0);
});
