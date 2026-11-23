import {expect,test} from '@playwright/test';
const route='/christmas-fayre-volunteering/';
const code='s-6b8rcxcfrk1lv003tvbq';
for(const count of [0,1,11]) test(`Tokens hero uses its own ${count} places, never the largest activity`,async({page})=>{
 await page.clock.install({time:new Date('2026-11-23T19:00:00Z')});
 const activities=Object.fromEntries([code,'s-58jrhbakre1cok8d8g46'].map((key,i)=>[key,{name:i?'Fun Zone':'Tokens + Maps',checkedAt:'2026-11-23T19:00:00Z',rows:[{endsAt:'2026-12-05T15:30:00Z',open:i?20:count}]}]));
 await page.route('**/fayre-availability.json',r=>r.fulfill({json:{schema:1,activities}}));
 await page.goto(route);
 const summary=page.locator('[data-most-help]');
 await expect(summary.locator('strong')).toHaveText('Most help needed');
 await expect(summary.locator('span')).toHaveText(`Tokens - ${count} ${count===1?'place':'places'} left`);
 await expect(summary).not.toContainText('Fun Zone');
});
test('missing Tokens data without a usable seed shows a check fallback',async({page})=>{
 await page.route('**/christmas-fayre-volunteering/',async r=>{
  const response=await r.fetch();
  const body=(await response.text()).replace(/data-availability-snapshot="[^"]*"/,'data-availability-snapshot="{}"');
  await r.fulfill({response,body});
 });
 await page.route('**/fayre-availability.json',r=>r.fulfill({json:{schema:1,activities:{}}}));
 await page.goto(route);
 await expect(page.locator('[data-most-help]')).toHaveText('Check JustSignup for Tokens places.');
});
test('no JavaScript hero uses the same validated Tokens count as its card',async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();await page.goto(route);
 const numbers=page.locator(`[data-availability-code="${code}"] .fayre-volunteer__count`);
 // The historical browser-fixture clock can predate the seed's check time.
 if(await numbers.count()){
  const count=(await numbers.first().textContent())!.split('/')[0].trim();
  await expect(page.locator('[data-most-help] strong')).toHaveText('Most help needed');
  await expect(page.locator('[data-most-help] span')).toContainText(count);
 }else await expect(page.locator('[data-most-help]')).toHaveText('Check JustSignup for Tokens places.');
 await context.close();
});
test('ended event retains the finished message',async({page})=>{
 await page.clock.install({time:new Date('2026-12-05T16:00:00Z')});await page.goto(route);
 await expect(page.locator('[data-most-help]')).toHaveText('Volunteering has finished. Thank you to everyone who helped.');
});
