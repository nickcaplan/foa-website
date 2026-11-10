import {expect,test} from '@playwright/test';

for(const width of [320,390,768,1024,1440])for(const mode of ['day','night'])for(const large of [false,true])test(`Narnia homepage ${width} ${mode} enlarged=${large}`,async({page})=>{
 await page.setViewportSize({width,height:1000});
 await page.addInitScript(mode=>{localStorage.setItem('foa-theme',mode);localStorage.setItem('foa-cookie-preferences','essential')},mode);
 await page.goto('/');
 if(large)await page.evaluate(()=>{const els=[...document.querySelectorAll<HTMLElement>('body *')],sizes=els.map(e=>parseFloat(getComputedStyle(e).fontSize));els.forEach((e,i)=>e.style.setProperty('font-size',`${sizes[i]*2}px`,'important'))});
 await expect(page.getByRole('heading',{level:1,name:'Christmas Fayre'})).toBeVisible();
 await expect(page.locator('.narnia-landscape__art')).toHaveJSProperty('complete',true);
 expect(await page.locator('.narnia-landscape__art').evaluate((i:HTMLImageElement)=>i.naturalWidth)).toBeGreaterThan(0);
 await expect(page.locator('.sponsor-ribbon img')).toHaveAttribute('alt','Martin Flashman and Co');
 const hero=page.locator('.narnia-landscape');
 await expect(hero.getByRole('link',{name:'Sign up to help'})).toHaveAttribute('href','/events/christmas-fayre-2026/#sign-up');
 await expect(hero.getByRole('link',{name:'Event details'})).toHaveAttribute('href','/events/christmas-fayre-2026/');
 await expect(hero.locator('.button')).toHaveText('Event details');
 await expect(hero.locator('.narnia-landscape__footer a')).toHaveText('Sign up to help');
 const geometry=await hero.evaluate(el=>{const h=el.querySelector('h1')!.getBoundingClientRect(),a=el.querySelector('.button')!.getBoundingClientRect(),r=el.getBoundingClientRect();return{separate:h.bottom<=a.top,contained:h.left>=r.left&&h.right<=r.right,overflow:document.documentElement.scrollWidth-innerWidth}});
 expect(geometry).toEqual({separate:true,contained:true,overflow:0});
 await hero.getByRole('link',{name:'Event details'}).click();await expect(page).toHaveURL(/\/events\/christmas-fayre-2026\/$/);
});

for(const width of [320,390,768])for(const large of [false,true])test(`homepage identity ${width} enlarged=${large}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.goto('/');if(large)await page.evaluate(()=>document.documentElement.style.fontSize='200%');
 const identity=page.locator('.homepage-mobile-identity');await expect(identity).toBeVisible();
 const clear=await identity.evaluate(el=>{const p=el.querySelector('p')!.getBoundingClientRect(),m=document.querySelector('.menu-toggle')!.getBoundingClientRect();return p.right<=m.left||p.top>=m.bottom});expect(clear).toBe(true);
});
