import {expect,test} from '@playwright/test';
for(const time of ['2026-11-05T20:59:59Z','2026-11-05T21:00:00Z'])test(`inactive homepage is inaccessible ${time}`,async({page})=>{
 await page.clock.setFixedTime(new Date(time));await page.addInitScript(()=>localStorage.setItem('foa-cookie-preferences','essential'));await page.goto('/');
 const after=time.includes('21:00');const active=page.locator(after?'[data-homepage-christmas]':'[data-homepage-fireworks]');const inactive=page.locator(after?'[data-homepage-fireworks]':'[data-homepage-christmas]');
 await expect(active).toBeVisible();await expect(inactive).toBeHidden();await expect(page.getByRole('main').getByRole('heading',{level:1})).toHaveCount(1);
 expect(await inactive.ariaSnapshot()).toBe('');
 expect(await page.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return ids.filter((id,i)=>ids.indexOf(id)!==i)})).toEqual([]);
 for(let i=0;i<45;i++){await page.keyboard.press('Tab');expect(await inactive.evaluate(e=>e.contains(document.activeElement))).toBe(false)}
 const ids=await inactive.locator('[id]').evaluateAll(es=>es.map(e=>e.id));expect(ids).toEqual([]);
});
