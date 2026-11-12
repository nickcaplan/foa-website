import {expect,test} from '@playwright/test';

for (const route of ['home','fayre']) {
  for (const width of [320,390,768,1440]) {
    for (const scale of [1,2]) {
      test(`${route}: centred readable hero at ${width}px with ${scale * 100}% text`, async ({page}) => {
        await page.setViewportSize({width,height:1000});
        await page.goto(route==='home'?'/':'/events/christmas-fayre-2026/');
        await page.evaluate(scale=>{document.documentElement.style.fontSize=`${16 * scale}px`;},scale);
        const hero=page.locator('.narnia-landscape');
        await expect(hero.getByRole('heading',{level:1})).toHaveText('Christmas Fayre');
        await expect(hero.locator('.narnia-landscape__date')).toContainText('12:00 - 15:00');
        await expect(hero.locator('.narnia-landscape__time')).toHaveCSS('white-space','nowrap');
        const measurements=await hero.evaluate(node=>{
          const heading=node.querySelector('h1')!;
          const copy=node.querySelector('.narnia-landscape__copy')!;
          const h=heading.getBoundingClientRect();const c=copy.getBoundingClientRect();
          return {centreOffset:Math.abs((h.x+h.width/2)-(c.x+c.width/2)),align:getComputedStyle(heading).textAlign,overflow:document.documentElement.scrollWidth-innerWidth};
        });
        expect(measurements.centreOffset).toBeLessThan(2);
        expect(measurements.align).toBe('center');
        expect(measurements.overflow).toBeLessThanOrEqual(0);
        await expect(hero.getByRole('link',{name:/Volunteer/})).toHaveAttribute('href','/christmas-fayre-volunteering/');
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
    if(route==='fayre')await expect(page.locator('.homepage-mobile-identity')).toBeVisible();
    await page.evaluate(()=>scrollTo(0,800));
    expect((await trigger.boundingBox())!.y).toBe(before.y);
    await trigger.click();await expect(page.getByRole('button',{name:'Close menu'})).toBeFocused();
    await page.keyboard.press('Escape');await expect(trigger).toBeFocused();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(0);
  });
}

for (const route of ['fayre', 'volunteer']) for (const width of [320, 390, 768, 1440]) for (const scale of [1, 2]) {
  test(`${route}: content edges align at ${width}px with ${scale * 100}% text`, async ({page}) => {
    await page.setViewportSize({width, height:1000});
    await page.goto(route === 'fayre' ? '/events/christmas-fayre-2026/' : '/christmas-fayre-volunteering/');
    await page.evaluate(scale => {document.documentElement.style.fontSize = `${16 * scale}px`;}, scale);
    const selectors = route === 'fayre' ? ['.narnia-landscape', '[data-fayre-help-roles]'] : ['.narnia-landscape', '.fayre-volunteer__intro', '.fayre-volunteer__grid'];
    const edges = await page.evaluate(selectors => selectors.map(selector => {
      const r = document.querySelector(selector)!.getBoundingClientRect();
      return {left:r.left, right:r.right};
    }), selectors);
    for (const edge of edges.slice(1)) {
      expect(Math.abs(edge.left - edges[0].left)).toBeLessThan(1);
      expect(Math.abs(edge.right - edges[0].right)).toBeLessThan(1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });
}

for (const [width, height] of [[390, 844], [412, 915]]) {
  test(`homepage phone hero stays compact without stretching at ${width}x${height}`, async ({page}) => {
    await page.setViewportSize({width, height});
    await page.goto('/');
    const layout = await page.locator('.narnia-landscape').evaluate(node => ({
      height: node.getBoundingClientRect().height,
      size: getComputedStyle(node.querySelector('.narnia-landscape__body')!, '::before').backgroundSize,
    }));
    expect(layout.height).toBeLessThan(620);
    expect(layout.size).toContain('cover');
  });
}

for (const width of [360, 390, 412, 1280, 1366, 1440]) {
  test(`art competition theme text and equal hairlines are centred at ${width}px`, async ({page}) => {
    await page.setViewportSize({width, height:900});
    await page.goto('/christmas-fayre-art-competition/');
    await page.evaluate(() => document.fonts.ready);
    const layout = await page.locator('.art-comp-banner').evaluate(panel => {
      const theme = panel.querySelector('.view-hero-copy > p')!;
      const title = panel.querySelector('h1')!;
      const textCentre = (node: Element) => {
        const range = document.createRange();
        range.selectNodeContents(node);
        const r = range.getBoundingClientRect();
        return r.x + r.width / 2;
      };
      const r = panel.getBoundingClientRect();
      return {
        themeCentre: textCentre(theme), titleCentre: textCentre(title), panelCentre: r.x + r.width / 2,
        before: parseFloat(getComputedStyle(theme, '::before').width),
        after: parseFloat(getComputedStyle(theme, '::after').width),
      };
    });
    expect(Math.abs(layout.themeCentre - layout.titleCentre)).toBeLessThan(1);
    expect(Math.abs(layout.themeCentre - layout.panelCentre)).toBeLessThan(1);
    expect(Math.abs(layout.before - layout.after)).toBeLessThan(1);
    expect(layout.before).toBeGreaterThan(0);
  });
}

for (const route of ['/christmas-fayre-art-competition/', '/events/christmas-fayre-2026/', '/christmas-fayre-volunteering/']) {
  for (const width of [1024, 1280, 1440]) {
    test(`${route}: full hero outline clears the desktop header at ${width}px`, async ({page}) => {
      await page.setViewportSize({width, height:900});
      await page.goto(route);
      const gap = await page.evaluate(() => {
        const header = document.querySelector('.site-header')!.getBoundingClientRect();
        const hero = document.querySelector('.art-comp-banner, .narnia-landscape')!.getBoundingClientRect();
        return hero.top - header.bottom;
      });
      expect(gap).toBeCloseTo(24, 0);
    });
  }
}
