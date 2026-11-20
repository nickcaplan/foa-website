import {expect,test} from '@playwright/test';

// #174 review follow-up: the client script starts from the build snapshot, so a
// failed (or slow) first fetch must not wipe the SSR counts, replace the
// "Most help needed" line, clear "Last updated", or unhide sold-out cards.
// The clock is advanced 32 minutes so the 30s render interval and the 15m
// reload interval fire repeatedly against the failed fetch.
test('failed availability fetch keeps the build snapshot on screen',async({page})=>{
 await page.clock.install({time:new Date()});
 await page.route('**/fayre-availability.json',route=>route.abort());
 await page.addInitScript(()=>{localStorage.setItem('foa-cookie-preferences','essential')});
 // The SSR hidden-card count, read from the HTML before any client script runs.
 const html=await (await page.request.get('/christmas-fayre-volunteering/')).text();
 const ssrHidden=(html.match(/data-availability-code="[^"]+"[^>]*hidden/g)||[]).length;
 await page.goto('/christmas-fayre-volunteering/');
 await page.waitForTimeout(500);
 await page.clock.fastForward(32*60000);
 const state=await page.evaluate(()=>{
  const summary=document.querySelector<HTMLElement>('[data-most-help]');
  const count=document.querySelector<HTMLElement>('[data-availability-code] .fayre-volunteer__availability strong');
  const updated=document.querySelector<HTMLElement>('[data-availability-updated]');
  const cards=[...document.querySelectorAll<HTMLElement>('[data-availability-code]')];
  return {
   summary:summary?.textContent??'',
   count:count?.textContent??'',
   updated:updated?.textContent??'',
   hiddenCards:cards.filter(c=>c.hidden).length,
   states:cards.map(c=>c.querySelector('.fayre-volunteer__availability')?.getAttribute('data-state')),
  };
 });
 expect(state.summary).toContain('Most help needed');
 expect(state.count).toMatch(/\d+ \/ \d+/);
 expect(state.updated).toContain('Last updated');
 expect(state.hiddenCards).toBe(ssrHidden);
 expect(state.states.every(s=>s!=='unavailable')).toBe(true);
});

// A successful fetch must still apply NEW data over the seeded build snapshot:
// an activity with places at SSR sells out, so its card hides.
test('successful availability fetch applies new data over the build snapshot',async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('foa-cookie-preferences','essential')});
 const live=await (await page.request.get('/fayre-availability.json')).json();
 let target:{code:string;activity:any}|null=null;
 for(const [code,activity] of Object.entries<any>(live.activities??{})){
  if(activity.rows?.length&&activity.rows.some((r:any)=>r.open>0)){target={code,activity};break;}
 }
 test.skip(!target,'no activity with open places in the fixture');
 // The SSR HTML shows this card; the fetched snapshot sells it out.
 const html=await (await page.request.get('/christmas-fayre-volunteering/')).text();
 expect(html).toContain(`data-availability-code="${target!.code}"`);
 for(const row of target!.activity.rows)row.open=0;
 target!.activity.checkedAt=new Date().toISOString();
 await page.route('**/fayre-availability.json',route=>route.fulfill({json:live}));
 await page.goto('/christmas-fayre-volunteering/');
 await page.waitForTimeout(1500);
 const state=await page.evaluate(code=>{
  const card=document.querySelector<HTMLElement>(`[data-availability-code="${code}"]`);
  return {hidden:card?.hidden,full:card?.classList.contains('fayre-volunteer__card--full'),text:card?.querySelector('.fayre-volunteer__availability')?.textContent??''};
 },target!.code);
 expect(state.hidden).toBe(false);
 expect(state.full).toBe(true);
 expect(state.text).toContain('0 places left');
});
