import {test,expect} from '@playwright/test';
for(const width of[320,390,768,1440])test(`Fayre information and CTA widths ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.goto('/events/christmas-fayre-2026/');
 const leads=page.locator('.xmas-contact__leads');await expect(leads).toHaveText('Led by Rachel Briscoe Sophie Glass');await expect(leads.locator('svg')).toHaveCount(0);await expect(leads.locator('strong')).toHaveText('Led by');await expect(leads.locator('.xmas-contact__lead-person')).toHaveCount(2);
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

for(const width of [390,1440])test(`contact identifies both organisers without separate cards ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.goto('/events/christmas-fayre-2026/');
 await expect(page.locator('.fayre-leads__card')).toHaveCount(0);const people=page.locator('.xmas-contact .xmas-contact__lead-person');await expect(people).toHaveCount(2);await expect(people.nth(0)).toContainText('Rachel Briscoe');await expect(people.nth(1)).toContainText('Sophie Glass');
 const lines=await people.evaluateAll(es=>es.map(e=>({width:e.getBoundingClientRect().width,parent:e.parentElement!.getBoundingClientRect().width,height:e.getBoundingClientRect().height,line:parseFloat(getComputedStyle(e).lineHeight)})));for(const l of lines){expect(l.width).toBeLessThanOrEqual(l.parent);expect(l.height/l.line).toBeLessThanOrEqual(width===390?2.1:1.1)}
});
for(const width of [320,360,390,430])for(const scale of [1,2])test(`names-only team panel ${width} at ${scale*100}%`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.goto('/events/christmas-fayre-2026/');await page.evaluate(s=>document.documentElement.style.fontSize=`${s*16}px`,scale);await page.evaluate(()=>document.fonts.ready);
 const panel=page.locator('.xmas-contact__leads');await expect(panel).not.toContainText('(');await expect(panel.locator('.xmas-contact__lead-person')).toHaveText(['Rachel Briscoe','Sophie Glass']);
 const boxes=await panel.locator('strong,.xmas-contact__lead-person').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom}}));
 for(let i=1;i<boxes.length;i++)expect(boxes[i].y).toBeGreaterThanOrEqual(boxes[i-1].bottom-1);
 const parent=await panel.boundingBox();for(const box of boxes){expect(box.x).toBeGreaterThanOrEqual(parent!.x);expect(box.right).toBeLessThanOrEqual(parent!.x+parent!.width+1);}expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBe(0);
});
