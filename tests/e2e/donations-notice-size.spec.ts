import{test,expect}from'@playwright/test';
for(const route of['/'])for(const width of[320,390,768,1280,1920])for(const scale of[1,2])test(`notice ${route} ${width} ${scale}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.goto(route);await page.evaluate(s=>document.documentElement.style.fontSize=`${16*s}px`,scale);
 const box=page.locator('.fayre-donations-notice');await expect(box).toBeVisible();await expect(box).toContainText('Friday 20th November');
 const r=await box.evaluate(e=>{const r=e.getBoundingClientRect(),p=e.parentElement!.getBoundingClientRect();return{width:r.width,centre:r.x+r.width/2,parentCentre:p.x+p.width/2,overflow:e.scrollWidth-e.clientWidth}});
 expect(r.overflow).toBeLessThanOrEqual(1);expect(Math.abs(r.centre-r.parentCentre)).toBeLessThan(1);expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 if(width>=1280&&scale===1)expect(r.width).toBeLessThan(600);
});
for(const width of[390,768,1024,1280,1440,1920])test(`volunteering reading headings ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.goto('/christmas-fayre-volunteering/');
 const align=await page.locator('.fayre-volunteer__intro,.fayre-volunteer__closing h2,.fayre-volunteer__loan h2').evaluateAll(es=>es.map(e=>getComputedStyle(e).textAlign));expect(new Set(align)).toEqual(new Set(['left']));
 const edges=await page.locator('.narnia-landscape,.fayre-volunteer__intro,.fayre-volunteer__grid,.fayre-volunteer__closing').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return{left:r.left,right:r.right}}));for(const edge of edges.slice(1)){expect(Math.abs(edge.left-edges[0].left)).toBeLessThan(1);expect(Math.abs(edge.right-edges[0].right)).toBeLessThan(1)}
});

for(const width of[320,390,768,1280,1920])for(const scale of[1,2])test(`volunteering without donation notice ${width} ${scale}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.goto('/christmas-fayre-volunteering/');await page.evaluate(s=>document.documentElement.style.fontSize=`${16*s}px`,scale);
 await expect(page.locator('.fayre-donations-notice')).toHaveCount(0);
 await expect(page.getByText('Friday 20th November')).toHaveCount(0);
 const loan=page.locator('.fayre-volunteer__loan');await expect(loan.getByRole('heading')).toHaveText('Lend a little Narnia magic');
 await expect(loan.getByRole('link')).toHaveAttribute('target','_blank');
 const gap=await loan.evaluate(e=>e.getBoundingClientRect().top-e.previousElementSibling!.getBoundingClientRect().bottom);
 expect(gap).toBeGreaterThan(0);expect(gap).toBeLessThanOrEqual(64*scale);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 const action=loan.locator('.button');await action.focus();await expect(action).toBeFocused();
 const overflow=await action.evaluate(e=>e.scrollWidth-e.clientWidth);expect(overflow).toBeLessThanOrEqual(1);
 if(width>=390){const lines=await action.locator('.cta-label').evaluate(e=>e.getBoundingClientRect().height/parseFloat(getComputedStyle(e).lineHeight));expect(lines).toBeLessThanOrEqual(2.1)}
});
