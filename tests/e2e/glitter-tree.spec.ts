import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
for(const width of [320,390,768,1440])for(const mode of ['day','night'])for(const scale of [1,2])test(`Glitter Tree supporter ${width} ${mode} ${scale}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.addInitScript(mode=>{localStorage.setItem('foa-theme',mode);localStorage.setItem('foa-cookie-preferences','essential')},mode);
 for(const path of ['/events/christmas-fayre-2026/','/preview/glitter-tree-details-b/','/christmas-fayre-volunteering/','/preview/glitter-tree-volunteering-b/']){
 await page.goto(path);await page.addStyleTag({content:`html{font-size:${scale*100}%!important}`});const credit=page.locator('.fayre-supporter');await credit.scrollIntoViewIfNeeded();await credit.locator('img').evaluate((img:HTMLImageElement)=>img.decode());await expect(credit).toContainText('The Glitter Tree');if(path.includes('-b/')){const bounds=await credit.evaluate(n=>{const c=getComputedStyle(n),a=n.querySelector('a')!.getBoundingClientRect();return {button:a.width,content:n.clientWidth-parseFloat(c.paddingLeft)-parseFloat(c.paddingRight)}});expect(bounds.button).toBeCloseTo(bounds.content,0)}await expect(credit).not.toContainText(/Rewards|10%|code/i);await expect(credit.locator('a')).toHaveAttribute('href','https://theglittertree.com/');await expect(credit.locator('a')).toHaveAttribute('rel','noopener noreferrer sponsored');expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 if(width===390&&scale===1)expect((await new AxeBuilder({page}).include('.fayre-supporter').analyze()).violations).toEqual([]);
 }
});
