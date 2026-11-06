import { expect, test } from '@playwright/test';
// The interactive Fireworks experience is retired. Its former canvas/mode/torch
// expectations are replaced by absence, navigation, accessibility and layout
// contracts on both surviving old URLs, in each visitor mode they supported.
for(const route of ['/events/fireworks-2026/','/fireworks-volunteering/'])
for(const width of [320,360,390,430,768,1023,1440])
for(const theme of ['day','night'])for(const enlargement of ['normal','root','elements']){
 test(`retired ${route} ${width} ${theme} ${enlargement}`,async({page})=>{
  await page.setViewportSize({width,height:1000});await page.addInitScript(t=>{localStorage.setItem('foa-theme',t);localStorage.setItem('foa-cookie-preferences','essential')},theme);await page.goto(route);
  if(enlargement==='root')await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  if(enlargement==='elements')await page.evaluate(()=>{const es=[...document.querySelectorAll<HTMLElement>('body *')];const sizes=es.map(e=>parseFloat(getComputedStyle(e).fontSize));es.forEach((e,i)=>e.style.setProperty('font-size',`${sizes[i]*2}px`,'important'))});
  await expect(page.locator('main h1')).toHaveText(/has finished/);await expect(page.locator('main h1')).toBeVisible();
  await expect(page.locator('canvas,[data-fw-stage],.fw-torches,.vol-card,.add-calendar')).toHaveCount(0);
  await expect(page.locator('a[href*=ticketsource],a[href*=volunteersignup],form,input')).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const content=page.locator('.content-section .site-width');await expect(content).toContainText(/retired/);
  const links=content.getByRole('link');await expect(links).toHaveCount(2);
  for(const link of await links.all()){await expect(link).toBeVisible();expect(await link.getAttribute('href')).toMatch(/^\/(events\/christmas-fayre-2026|whats-on|get-involved)\/$/)}
  const clipping=await page.locator('main h1,main p,main a').evaluateAll(es=>es.filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.textContent));expect(clipping).toEqual([]);
 });
}
test('archived event guide PDF remains retrievable',async({page})=>{const r=await page.request.get('/events/fireworks-2026-event-guide.pdf');expect(r.status()).toBe(200);expect(r.headers()['content-type']).toContain('application/pdf')});
