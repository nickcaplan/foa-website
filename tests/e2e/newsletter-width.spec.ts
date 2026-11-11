import {expect,test} from '@playwright/test';
for(const theme of ['day','night'])for(const width of [390,768,1280,1440])test(`newsletter reading frame uses available width ${width} ${theme}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.addInitScript(theme=>{localStorage.setItem('foa-theme',theme);localStorage.setItem('foa-cookie-preferences','essential')},theme);await page.goto('/newsletter/');
 const dimensions=()=>page.locator('.newsletter-reading-board article:visible').evaluate(el=>{const rect=el.getBoundingClientRect(),style=getComputedStyle(el);return{paper:rect.width,text:rect.width-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight),frame:el.parentElement!.getBoundingClientRect().width}});
 const latest=await dimensions();
 if(width===1440){expect(latest.text).toBeGreaterThanOrEqual(920);expect(latest.paper/latest.frame).toBeGreaterThan(.95)}
 if(width===1280)expect(latest.text).toBeGreaterThanOrEqual(800);
 if(width===390)expect(latest.paper).toBeCloseTo(310,0);
 if(width>=1280){await page.getByRole('navigation',{name:'Newsletter issues'}).getByRole('link').nth(1).click();expect((await dimensions()).text).toBeCloseTo(latest.text,0)}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
