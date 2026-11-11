import {expect,test} from '@playwright/test';
for(const theme of ['day','night'])for(const width of [390,768,1280,1440])test(`newsletter reading frame uses available width ${width} ${theme}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.addInitScript(theme=>{localStorage.setItem('foa-theme',theme);localStorage.setItem('foa-cookie-preferences','essential')},theme);await page.goto('/newsletter/');
 const dimensions=()=>page.locator('.newsletter-reading-board article:visible').evaluate(el=>{const rect=el.getBoundingClientRect(),style=getComputedStyle(el);return{paper:rect.width,text:rect.width-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight),frame:el.parentElement!.getBoundingClientRect().width}});
 const latest=await dimensions();
 if(width===1440){expect(latest.text).toBeGreaterThanOrEqual(920);expect(latest.paper/latest.frame).toBeGreaterThan(.95)}
 if(width===1280)expect(latest.text).toBeGreaterThanOrEqual(800);
 if(width===390){expect(latest.paper).toBeCloseTo(334,0);expect(latest.text).toBeGreaterThanOrEqual(308)}
 if(width>=1280){await page.getByRole('navigation',{name:'Newsletter issues'}).getByRole('link').nth(1).click();expect((await dimensions()).text).toBeCloseTo(latest.text,0)}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

for(const width of [360,390,430])for(const theme of ['day','night'])for(const enlarged of [false,true])test(`phone reading width ${width} ${theme} enlarged=${enlarged}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.goto('/newsletter/');await page.evaluate(({theme,enlarged})=>{document.documentElement.dataset.theme=theme;document.documentElement.style.fontSize=enlarged?'200%':'100%'},{theme,enlarged});
 const size=await page.locator('.newsletter-reading-board article').evaluate(el=>el.clientWidth-parseFloat(getComputedStyle(el).paddingLeft)-parseFloat(getComputedStyle(el).paddingRight));
 expect(size).toBeGreaterThanOrEqual(width-(enlarged?164:84));
 const header=page.locator('.newsletter-reading-board .newsletter-letterhead');
 const date=header.locator('time');
 expect(parseFloat(await date.evaluate(el=>getComputedStyle(el).fontSize))).toBeLessThan(enlarged?20:10);
 if(!enlarged){const h=(await header.boundingBox())!;expect(h.height).toBeLessThan(70);expect((await date.boundingBox())!.y).toBeLessThan(h.y+50);if(width>=390)expect((await date.boundingBox())!.y).toBeLessThan(h.y+20)}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('.newsletter-reading-board .newsletter-read-more').click();await expect(page.locator('.newsletter-reading-board .newsletter-more')).toBeVisible();
});
