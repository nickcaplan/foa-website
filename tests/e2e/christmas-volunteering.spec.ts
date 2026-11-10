import{expect,test}from'@playwright/test';
for(const width of [320,390,768,1440])for(const mode of ['day','night'])for(const scale of [1,2])test(`Fayre volunteering ${width} ${mode} text ${scale}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.addInitScript(mode=>{localStorage.setItem('foa-theme',mode);localStorage.setItem('foa-cookie-preferences','essential')},mode);
 const requests:string[]=[];page.on('request',r=>{if(/justsignup/.test(r.url()))requests.push(r.url())});
 await page.goto('/');await page.getByRole('link',{name:'Sign up to help',exact:true}).click();await expect(page).toHaveURL(/\/christmas-fayre-volunteering\/$/);
 await page.evaluate(scale=>document.documentElement.style.fontSize=16*scale+'px',scale);
 await expect(page.getByRole('heading',{level:1})).toHaveText('Christmas Fayre Volunteering');
 await expect(page.locator('.fayre-volunteer__card')).toHaveCount(12);
 for(const link of await page.locator('.fayre-volunteer__action').all()){await expect(link).toHaveAttribute('href',/^https:\/\/justsignup.io\/s\/uhyd1u3wq4#s-/);await expect(link).toHaveAttribute('rel','noopener noreferrer');await expect(link).toHaveAttribute('target','_blank')}
 expect(requests).toEqual([]);await expect(page.locator('iframe')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBe(0);
 const escaped=await page.locator('.fayre-volunteer__card').evaluateAll(cards=>cards.filter(card=>[...card.querySelectorAll('h3,p,a')].some(child=>{const r=child.getBoundingClientRect(),c=card.getBoundingClientRect();return r.left<c.left||r.right>c.right})).length);expect(escaped).toBe(0);
 await page.getByRole('link',{name:'Back to Christmas Fayre details'}).click();await expect(page).toHaveURL(/\/events\/christmas-fayre-2026\/$/);
 await expect(page.getByRole('link',{name:'Sign up to help',exact:true})).toHaveAttribute('href','/christmas-fayre-volunteering/');
});
