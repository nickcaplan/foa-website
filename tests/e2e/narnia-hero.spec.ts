import {expect,test} from '@playwright/test';

for (const route of ['home','fayre']) {
  for (const width of [390,768,1440]) {
    for (const scale of [1,2]) {
      test(`${route}: centred readable hero at ${width}px with ${scale * 100}% text`, async ({page}) => {
        await page.setViewportSize({width,height:1000});
        await page.goto(route==='home'?'/':'/events/christmas-fayre-2026/');
        await page.evaluate(scale=>{document.documentElement.style.fontSize=`${16 * scale}px`;},scale);
        const hero=page.locator('.narnia-landscape');
        await expect(hero.getByRole('heading',{level:1})).toHaveText('Christmas Fayre');
        const measurements=await hero.evaluate(node=>{
          const heading=node.querySelector('h1')!;
          const copy=node.querySelector('.narnia-landscape__copy')!;
          const h=heading.getBoundingClientRect();const c=copy.getBoundingClientRect();
          return {centreOffset:Math.abs((h.x+h.width/2)-(c.x+c.width/2)),align:getComputedStyle(heading).textAlign,overflow:document.documentElement.scrollWidth-innerWidth};
        });
        expect(measurements.centreOffset).toBeLessThan(2);
        expect(measurements.align).toBe('center');
        expect(measurements.overflow).toBeLessThanOrEqual(0);
        await expect(hero.getByRole('link',{name:/Sign up to help/})).toHaveAttribute('href','/christmas-fayre-volunteering/');
      });
    }
  }
}

for (const route of ['home','fayre'])for(const width of [320,390,768,1023]) {
  test(`${route}: ${width}px custom hero keeps the menu clear and usable`,async({page})=>{
    await page.setViewportSize({width,height:900});
    await page.goto(route==='home'?'/':'/events/christmas-fayre-2026/');
    const trigger=page.getByRole('button',{name:'Open menu'});
    const before=(await trigger.boundingBox())!;
    await expect(trigger).toBeVisible();
    const overlap=await page.locator('main h1,main p,main a').evaluateAll(elements=>{
      const b=document.querySelector('.menu-toggle')!.getBoundingClientRect();
      return elements.filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&r.left<b.right&&r.right>b.left&&r.top<b.bottom&&r.bottom>b.top}).map(e=>e.textContent);
    });
    expect(overlap).toEqual([]);
    if(route==='fayre')await expect(page.locator('.narnia-mobile-brand .page-logo-home')).toBeVisible();
    await page.evaluate(()=>scrollTo(0,800));
    expect((await trigger.boundingBox())!.y).toBe(before.y);
    await trigger.click();await expect(page.getByRole('button',{name:'Close menu'})).toBeFocused();
    await page.keyboard.press('Escape');await expect(trigger).toBeFocused();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(0);
  });
}
