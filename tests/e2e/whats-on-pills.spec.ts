import {expect,test} from '@playwright/test';
for(const width of [390,1440])for(const theme of ['day','night']){
 test(`What's On and volunteering use pills at ${width}px ${theme}`,async({page})=>{
  await page.setViewportSize({width,height:1000});
  await page.addInitScript(theme=>localStorage.setItem('foa-theme',theme),theme);
  await page.goto('/whats-on/');
  const deadline=page.locator('[data-yearview-term] [data-event-title="Christmas Fayre Art Competition deadline"]');
  await expect(deadline).toBeVisible();
  await expect(deadline).toContainText('Monday 30th November');
  await expect(deadline.locator('.event-list-cta')).toHaveAttribute('href','/christmas-fayre-art-competition/');
  for(const route of ['/whats-on/','/christmas-fayre-volunteering/']){
   await page.goto(route);
   const shapes=await page.locator('main .button:visible, main .event-list-cta:visible').evaluateAll(es=>es.map(e=>({text:e.textContent,radius:parseFloat(getComputedStyle(e).borderTopLeftRadius),height:e.getBoundingClientRect().height})));
   expect(shapes.length).toBeGreaterThan(0);
   for(const shape of shapes)expect(shape.radius,shape.text??'').toBeGreaterThanOrEqual(shape.height/2);
   if(route==='/whats-on/'){
    for(const row of await page.locator('[data-yearview-term] [data-yearview-event]:visible').all()){
     const action=row.locator('.event-list-cta:visible, .event-volunteer-link .button:visible').last();
     if(await action.count()){const a=await action.boundingBox();const c=await row.locator('.add-calendar').boundingBox();expect(c!.y).toBeGreaterThanOrEqual(a!.y+a!.height+8)}
    }
   }
   expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(0);
  }
  await expect(page.getByRole('link',{name:'See Fayre details'})).toHaveClass(/button--amber/);
  const contrast=await page.getByRole('link',{name:'See Fayre details'}).evaluate(e=>{const c=getComputedStyle(e);const lum=(s:string)=>{const rgb=s.match(/[\d.]+/g)!.slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]};const a=lum(c.color),b=lum(c.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)});expect(contrast).toBeGreaterThanOrEqual(4.5);
 });
}
test('art deadline remains upcoming through its UK day and archives after it',async({page})=>{
 await page.clock.setFixedTime(new Date('2026-11-30T23:59:00Z'));await page.goto('/whats-on/');
 await expect(page.locator('[data-yearview-term] [data-event-title="Christmas Fayre Art Competition deadline"]')).toBeVisible();
 await page.clock.setFixedTime(new Date('2026-12-01T00:01:00Z'));await page.reload();
 await expect(page.locator('[data-yearview-term] [data-event-title="Christmas Fayre Art Competition deadline"]')).toBeHidden();
 await expect(page.locator('[data-yearview-earlier] [data-event-title="Christmas Fayre Art Competition deadline"]')).toBeVisible();
});

test('every upcoming event has Google and iCal, with confirmed December calendar-only duration',async({page})=>{
 await page.clock.setFixedTime(new Date('2026-11-11T12:00:00Z'));await page.goto('/whats-on/');
 const rows=page.locator('[data-yearview-term] [data-yearview-event]:visible');
 expect(await rows.count()).toBeGreaterThan(0);
 for(const row of await rows.all()){
  const google=row.getByRole('link',{name:/^Google/});const ical=row.getByRole('link',{name:/^iCal/});
  await expect(google).toHaveCount(1);await expect(ical).toHaveCount(1);
  const href=await google.getAttribute('href');expect(new URL(href!).searchParams.get('dates')).toBeTruthy();
  const response=await page.request.get((await ical.getAttribute('href'))!);expect(response.ok()).toBeTruthy();expect(await response.text()).toContain('BEGIN:VEVENT');
 }
 const december=page.locator('[data-yearview-term] [data-event-title="Pre-loved uniform and Christmas jumper sale"]');
 await expect(december.locator('time')).toHaveText('Friday 4th December, 15:25');
 const google=new URL((await december.getByRole('link',{name:/^Google/}).getAttribute('href'))!);expect(google.searchParams.get('dates')).toBe('20261204T152500Z/20261204T154500Z');
 const ics=await page.request.get((await december.getByRole('link',{name:/^iCal/}).getAttribute('href'))!);expect(await ics.text()).toContain('DTEND:20261204T154500Z');
 await expect(page.locator('[data-yearview-earlier] .add-calendar')).toHaveCount(0);
});
