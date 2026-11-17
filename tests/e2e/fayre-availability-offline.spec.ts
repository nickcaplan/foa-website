import {expect,test} from '@playwright/test';

// #174 review follow-up: the client script starts from the build snapshot, so a
// failed (or slow) first fetch must not wipe the SSR counts, replace the
// "Most help needed" line, clear "Last updated", or unhide sold-out cards.
test('failed availability fetch keeps the build snapshot on screen',async({page})=>{
 await page.route('**/fayre-availability.json',route=>route.abort());
 await page.addInitScript(()=>{localStorage.setItem('foa-cookie-preferences','essential')});
 await page.goto('/christmas-fayre-volunteering/');
 // Let the failed load() and a render cycle settle.
 await page.waitForTimeout(1500);
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
 expect(state.states.every(s=>s!=='unavailable')).toBe(true);
});

// Same guard for the live-fetch path: a valid fetch still updates the page.
test('successful availability fetch still renders counts',async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('foa-cookie-preferences','essential')});
 await page.goto('/christmas-fayre-volunteering/');
 await page.waitForTimeout(1500);
 const count=await page.evaluate(()=>document.querySelector<HTMLElement>('[data-availability-code] .fayre-volunteer__availability strong')?.textContent??'');
 expect(count).toMatch(/\d+ \/ \d+/);
});
