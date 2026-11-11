import {expect,test} from '@playwright/test';
for(const width of [390,1024,1440])for(const theme of ['day','night'])for(const scale of [1,2])test(`homepage link rules match columns ${width} ${theme} text${scale}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.goto('/');await page.evaluate(({theme,scale})=>{document.documentElement.dataset.theme=theme;document.documentElement.style.fontSize=16*scale+'px'},{theme,scale});
 const list=page.locator('.hero-links');const desktop=await page.evaluate(()=>matchMedia('(min-width:64rem)').matches);
 await expect(list).toHaveCSS('border-top-width',desktop?'0px':'1px');
 const rows=await list.locator('.quick-row').evaluateAll(els=>els.map(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return{top:s.borderTopWidth,bottom:s.borderBottomWidth,tc:s.borderTopColor,bc:s.borderBottomColor,x:r.x,y:r.y,right:r.right}}));
 expect(rows).toHaveLength(2);for(const row of rows){expect(row.bottom).toBe('1px');expect(row.top).toBe(desktop?'1px':'0px');if(desktop)expect(row.tc).toBe(row.bc)}
 if(desktop){expect(rows[0].right).toBeLessThan(rows[1].x);expect(rows[0].y).toBeCloseTo(rows[1].y,0)}
 await expect(page.locator('.narnia-donations')).toHaveCount(1);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
