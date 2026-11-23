import {expect,test} from '@playwright/test';
for(const width of [320,390,768,1440])for(const scale of [1,2])for(const theme of ['day','night'])test(`hero status geometry stable ${width} ${scale} ${theme}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.clock.install({time:new Date('2026-11-23T20:00:00Z')});
 await page.addInitScript(t=>localStorage.setItem('foa-theme',t),theme);
 await page.route('**/christmas-fayre-volunteering/',async r=>{const response=await r.fetch();await r.fulfill({response,body:(await response.text()).replace(/data-availability-snapshot="[^"]*"/,'data-availability-snapshot="{}"')})});
 await page.route('**/fayre-availability.json',r=>r.fulfill({json:{schema:1,activities:{}}}));
 await page.goto('/christmas-fayre-volunteering/');await page.evaluate(s=>document.documentElement.style.fontSize=`${s*16}px`,scale);await page.evaluate(()=>document.fonts.ready);
 const measure=()=>page.locator('[data-most-help]').evaluate(el=>{const b=el.getBoundingClientRect(),hero=el.closest('.narnia-landscape')!.getBoundingClientRect();return {top:b.top+scrollY,height:b.height,heroHeight:hero.height}});
 const fallback=await measure();
 await page.locator('[data-help-content]').evaluate(el=>{const strong=document.createElement('strong');strong.textContent='Most help needed';const span=document.createElement('span');span.textContent='Tokens - 11\u00a0places\u00a0left';el.replaceChildren(strong,span)});
 const counted=await measure();
 expect(counted).toEqual(fallback);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
