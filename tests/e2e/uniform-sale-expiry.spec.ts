import {expect,test} from '@playwright/test';
for(const width of [390,1440])for(const when of ['2026-12-04T15:24:59Z','2026-12-04T15:26:00Z','2026-12-04T23:59:59Z','2026-12-05T00:00:00Z','2026-12-05T10:00:00Z'])test(`uniform sale boundary ${when} at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.addInitScript(()=>{localStorage.setItem('foa-theme','night');localStorage.setItem('foa-cookie-preferences','essential')});await page.clock.setFixedTime(new Date(when));const expired=when>='2026-12-05T00:00:00Z';await page.goto('/uniform/');
 await expect(page.locator('.christmas-sale')).toBeVisible({visible:!expired});await expect(page.locator('.christmas-knit')).toBeVisible({visible:!expired});await expect(page.locator('.uniform-everyday')).toBeVisible({visible:expired});
 await expect(page.getByRole('heading',{name:'Uniform prices and donations'})).toBeVisible();await expect(page.getByRole('link',{name:'Email the Preloved team',exact:true})).toBeVisible();
 if(expired){expect(await page.locator('body').innerText()).not.toContain('Christmas jumpers wanted');expect(await page.locator('body').innerText()).not.toContain('Friday 4th December');await page.screenshot({path:`/tmp/uniform-expired-${width}.jpg`,fullPage:true});}
 await page.goto('/reps/');await expect(page.locator('.message-card').filter({hasText:'Pre-loved uniform and Christmas jumpers'})).toBeVisible({visible:!expired});
 await page.goto('/whats-on/');
 await expect(page.locator('[data-event-title="Pre-loved uniform and Christmas jumper sale"][data-past="false"]')).toBeVisible({visible:!expired});
 await expect(page.locator('[data-event-title="Pre-loved uniform and Christmas jumper sale"][data-past="true"]')).toBeVisible({visible:expired});
});
test('an open uniform page flips without a navigation after the cutoff',async({page})=>{
 await page.clock.install({time:new Date('2026-12-04T23:59:30Z')});await page.goto('/uniform/');await expect(page.locator('.christmas-sale')).toBeVisible();await page.clock.fastForward(61000);await expect(page.locator('.christmas-sale')).toBeHidden();await expect(page.locator('.uniform-everyday')).toBeVisible();
});
