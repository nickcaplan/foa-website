import {expect,test} from '@playwright/test';
for(const width of [320,390,768,1440])test(`homepage short date remains one line at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.goto('/');
 const hero=page.locator('[data-homepage-christmas]');const date=hero.locator('.narnia-landscape__date');
 await expect(date).toHaveText('Sat 5 Dec · 12:00 - 15:00');
 expect(await date.evaluate(e=>e.getBoundingClientRect().height)).toBeLessThan(30);
 await expect(hero.locator('a.button')).toHaveCount(3);
 await expect(hero.locator('a.button').nth(0)).toHaveText('Event details');
 await expect(hero.locator('a.button').nth(1)).toHaveText('Volunteer');
 await expect(hero.locator('a.button').nth(2)).toHaveText('Art Competition');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(0);
 await page.goto('/events/christmas-fayre-2026/');
 await expect(page.locator('.narnia-landscape__date')).toContainText('Saturday 5th December');
});
