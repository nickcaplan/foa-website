import {test,expect} from '@playwright/test';
for(const width of[320,390,768,1440])test(`Fayre information and CTA widths ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.goto('/events/christmas-fayre-2026/');
 const leads=page.locator('.fayre-leads__card');await expect(leads).toHaveCount(2);await expect(leads.locator('svg[aria-hidden="true"]')).toHaveCount(0);
 const style=await leads.first().evaluate(e=>{const s=getComputedStyle(e);return{background:s.backgroundImage,shadow:s.boxShadow,align:s.textAlign,weight:s.fontWeight}});expect(style.background).toContain('linear-gradient');expect(style.shadow).toContain('inset');expect(style.align).toBe('left');expect(style.weight).toBe('700');
 expect(await page.locator('.narnia-landscape__footer').evaluate(e=>getComputedStyle(e).borderTopWidth)).toBe('0px');
 await expect(page.locator('.xmas-area')).toHaveCount(0);
 await page.goto('/whats-on/');const row=page.locator('[data-volunteer-actions]');
 await expect(row.getByRole('link',{name:'Event details',exact:true})).toHaveAttribute('href','/events/christmas-fayre-2026/');
 await expect(row.getByRole('link',{name:'Volunteer',exact:true})).toHaveAttribute('href','/christmas-fayre-volunteering/');
 await expect(row.locator('.event-volunteer-link svg[aria-hidden="true"]')).toHaveCount(1);
 expect(await row.locator('.event-volunteer-link .button').evaluate(e=>{const r=e.getBoundingClientRect(),s=e.querySelector('svg')!.getBoundingClientRect();return Math.abs((s.top+s.bottom)/2-(r.top+r.bottom)/2)})).toBeLessThan(1);
 const widths=await row.locator('.event-list-cta--button,.event-volunteer-link .button').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().width));expect(widths).toHaveLength(2);expect(Math.abs(widths[0]-widths[1])).toBeLessThan(1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBe(0);
});

for(const width of [390,1440]) test(`selected lead A equal widths at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.goto('/events/christmas-fayre-2026/');
 const boxes=await page.locator('.fayre-leads__card').evaluateAll(es=>es.map(e=>{const box=e.getBoundingClientRect(),text=e.querySelector('span')!.getBoundingClientRect(),parent=e.parentElement!.getBoundingClientRect();return{width:box.width,textWidth:text.width,parentWidth:parent.width,top:box.top}}));
 expect(boxes).toHaveLength(2);if(width===1440){expect(Math.abs(boxes[0].top-boxes[1].top)).toBeLessThan(1);expect(Math.abs(boxes[0].width-boxes[1].width)).toBeLessThan(1);expect(boxes[0].width*2).toBeLessThanOrEqual(boxes[0].parentWidth)}else for(const b of boxes)expect(Math.abs(b.width-b.parentWidth)).toBeLessThan(1);
});
