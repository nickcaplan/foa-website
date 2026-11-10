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
