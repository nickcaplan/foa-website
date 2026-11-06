import {expect,test} from '@playwright/test';
for(const time of ['2026-11-05T20:59:59Z','2026-11-05T21:00:00Z'])test(`retired homepage has one accessible Christmas panel ${time}`,async({page})=>{
 await page.clock.setFixedTime(new Date(time));await page.addInitScript(()=>localStorage.setItem('foa-cookie-preferences','essential'));await page.goto('/');
 await expect(page.locator('[data-homepage-christmas]')).toBeVisible();await expect(page.locator('[data-homepage-fireworks]')).toHaveCount(0);await expect(page.getByRole('main').getByRole('heading',{level:1})).toHaveCount(1);
 expect(await page.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return ids.filter((id,i)=>ids.indexOf(id)!==i)})).toEqual([]);
 await expect(page.locator('a[href*="ticketsource"],a[href*="fireworks-volunteering"]')).toHaveCount(0);
});
