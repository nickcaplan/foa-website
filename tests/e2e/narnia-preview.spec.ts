import {expect,test} from '@playwright/test';

for (const route of ['narnia-home','narnia-fayre']) {
  for (const width of [390,768,1440]) {
    for (const scale of [1,2]) {
      test(`${route}: centred readable hero at ${width}px with ${scale * 100}% text`, async ({page}) => {
        await page.setViewportSize({width,height:1000});
        await page.goto(`/preview/${route}/`);
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
        await expect(hero.getByRole('link',{name:'Sign up to help'})).toHaveAttribute('href',route==='narnia-home'?'/events/christmas-fayre-2026/#sign-up':'#sign-up');
      });
    }
  }
}

for (const route of ['narnia-home','narnia-fayre'])for(const width of [320,390,768,1023]) {
  test(`${route}: ${width}px custom hero keeps the menu clear and usable`,async({page})=>{
    await page.setViewportSize({width,height:900});
    await page.goto(`/preview/${route}/`);
    const trigger=page.getByRole('button',{name:'Open menu'});
    const before=(await trigger.boundingBox())!;
    await expect(trigger).toBeVisible();
    const overlap=await page.locator('main h1,main p,main a').evaluateAll(elements=>{
      const b=document.querySelector('.menu-toggle')!.getBoundingClientRect();
      return elements.filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&r.left<b.right&&r.right>b.left&&r.top<b.bottom&&r.bottom>b.top}).map(e=>e.textContent);
    });
    expect(overlap).toEqual([]);
    if(route==='narnia-fayre')await expect(page.locator('.poster-preview-note .page-logo-home')).toBeVisible();
    await page.evaluate(()=>scrollTo(0,800));
    expect((await trigger.boundingBox())!.y).toBe(before.y);
    await trigger.click();await expect(page.getByRole('button',{name:'Close menu'})).toBeFocused();
    await page.keyboard.press('Escape');await expect(trigger).toBeFocused();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(0);
  });
}

for(const option of ['a','b'])test(`sign-up ${option} moves keyboard focus to the form`,async({page})=>{
  await page.route('https://justsignup.io/**',r=>r.fulfill({contentType:'text/html',body:'<p>External form fixture</p>'}));
  await page.goto(`/preview/signup-${option}/`);
  await page.locator('[data-load-signup]').focus();await page.keyboard.press('Enter');
  await expect(page.locator('[data-signup-frame]')).toBeFocused();
  await expect(page.locator('[data-load-signup]')).toBeHidden();
  await expect(page.getByRole('link',{name:/Open the sign-up page on/})).toHaveAttribute('href','https://justsignup.io/s/uhyd1u3wq4');
});
