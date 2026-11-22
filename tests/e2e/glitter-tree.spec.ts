import {test,expect} from '@playwright/test';
// Removed from the Fayre event page (Nick, 21 November 2026), after the
// volunteering page removal (Nick, 20 November 2026, #224): the Glitter Tree
// credit now lives on the Supporters page only.
for(const path of ['/events/christmas-fayre-2026/','/christmas-fayre-volunteering/'])for(const scale of [1,2])test(`Glitter Tree credit stays off ${path} at text scale ${scale}`,async({page})=>{
 await page.setViewportSize({width:390,height:1000});
 await page.addInitScript(()=>localStorage.setItem('foa-cookie-preferences','essential'));
 await page.goto(path);
 if(scale===2)await page.addStyleTag({content:'html{font-size:200%!important}'});
 await expect(page.locator('.fayre-supporter')).toHaveCount(0);
 await expect(page.getByRole('complementary',{name:'The Glitter Tree support'})).toHaveCount(0);
 await expect(page.getByRole('link',{name:/Visit The Glitter Tree/})).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});
test('Glitter Tree is still credited on the Supporters page',async({page})=>{
 await page.goto('/christmas-fayre-supporters/');
 await expect(page.getByRole('link',{name:/Glitter Tree/}).first()).toBeVisible();
 expect(await page.evaluate(()=>[...document.querySelectorAll('a[href]')].some(a=>(a as HTMLAnchorElement).href.startsWith('https://theglittertree.com/')))).toBe(true);
});
