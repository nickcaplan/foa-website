import { expect, test } from '@playwright/test';
const routes = [
 {path:'/events/fireworks-2026/',title:'Fireworks on the Field has finished',primary:'Christmas Fayre details',destination:'/events/christmas-fayre-2026/'},
 {path:'/fireworks-volunteering/',title:'Fireworks volunteering has finished',primary:'Current ways to help',destination:'/get-involved/'}
];
for(const route of routes)for(const width of[320,390,768,1440])for(const js of[true,false])for(const large of[false,true])test(`retired ${route.path} ${width} js=${js} large=${large}`,async({browser})=>{
 const context=await browser.newContext({viewport:{width,height:1000},javaScriptEnabled:js,reducedMotion:'reduce'});
 await context.addInitScript(()=>localStorage.setItem('foa-cookie-preferences','essential'));
 const page=await context.newPage();await page.goto(test.info().project.use.baseURL+route.path);
 if(large)await page.evaluate(()=>document.documentElement.style.fontSize='200%');
 await expect(page.getByRole('heading',{level:1,name:route.title,exact:true})).toBeVisible();
 await expect(page.locator('main h1')).toHaveCount(1);
 const whole=await page.locator('main h1').evaluate(h=>{const panel=h.closest('.view-hero')!.getBoundingClientRect(),walker=document.createTreeWalker(h,NodeFilter.SHOW_TEXT);while(walker.nextNode())for(const word of walker.currentNode.textContent!.matchAll(/\S+/g)){const r=document.createRange();r.setStart(walker.currentNode,word.index);r.setEnd(walker.currentNode,word.index+word[0].length);const rects=[...r.getClientRects()];if(rects.length!==1||rects[0].left<panel.left||rects[0].right>panel.right)return false;}return true});expect(whole,'every heading word remains whole inside its panel').toBe(true);

 await expect(page.locator('[data-fw-stage],canvas,.vol-card,form,input')).toHaveCount(0);
 await expect(page.locator('a[href*="ticketsource.co.uk"],a[href*="volunteersignup.org"]')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const primary=page.getByRole('link',{name:route.primary,exact:true});await expect(primary).toBeVisible();await expect(primary).toHaveAttribute('href',route.destination);
 if(js&&width<1024){await page.getByRole('button',{name:'Open menu',exact:true}).click();await expect(page.getByRole('dialog',{name:'Site menu'})).toBeVisible();await expect(page.getByRole('dialog').getByRole('link',{name:'Fireworks on the Field',exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Close menu',exact:true}).click();}
 if(width>=1024)await expect(page.getByRole("navigation",{name:"Primary navigation"}).getByRole("link",{name:"Fireworks on the Field",exact:true})).toHaveCount(0);
 await primary.click();await expect(page).toHaveURL(new RegExp(route.destination+'$'));await expect(page.getByRole('heading',{level:1})).toBeVisible();await context.close();
});
test('retired homepage stays Christmas with historical device clock',async({page})=>{
 await page.clock.setFixedTime(new Date('2026-11-05T20:00:00Z'));await page.goto('/');await expect(page.locator('[data-homepage-fireworks]')).toHaveCount(0);await expect(page.getByRole('heading',{level:1,name:'The Ashley Christmas Fayre',exact:true})).toBeVisible();await expect(page.locator('[data-homepage-christmas]')).not.toHaveAttribute('data-show-from');
});
