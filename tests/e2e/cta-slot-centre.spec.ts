import {expect,test} from '@playwright/test';
for(const width of [320,390,768,1440])for(const scale of [1,3])test(`volunteering slot CTA label centred ${width} ${scale===3?'200% element text':'1x'}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.addInitScript(()=>localStorage.setItem('foa-cookie-preferences','essential'));await page.goto('/christmas-fayre-volunteering/');
 await page.evaluate(s=>{if(s===3){const els=[...document.querySelectorAll<HTMLElement>('body *')],sizes=els.map(e=>parseFloat(getComputedStyle(e).fontSize));els.forEach((e,i)=>e.style.setProperty('font-size',sizes[i]*2+'px','important'))}},scale);
 const offsets=await page.locator('.fayre-volunteer__grid .fayre-volunteer__action').evaluateAll(es=>es.map(e=>{const b=e.getBoundingClientRect(),l=e.querySelector('.cta-label')!.getBoundingClientRect();return Math.abs((b.left+b.right)/2-(l.left+l.right)/2)}));
 expect(offsets.length).toBeGreaterThan(0);expect(Math.max(...offsets)).toBeLessThanOrEqual(1);
});
