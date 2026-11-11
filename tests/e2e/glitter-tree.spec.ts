import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
for(const width of [320,390,768,1440])for(const mode of ['day','night'])for(const scale of [1,2])test(`Glitter Tree supporter ${width} ${mode} ${scale}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.addInitScript(mode=>{localStorage.setItem('foa-theme',mode);localStorage.setItem('foa-cookie-preferences','essential')},mode);
 for(const path of ['/events/christmas-fayre-2026/','/preview/glitter-tree-details-b/','/christmas-fayre-volunteering/','/preview/glitter-tree-volunteering-b/']){
 await page.goto(path);
 if(path==='/preview/glitter-tree-details-b/'){
  await expect(page.locator('.xmas-area img')).toHaveCount(0);
  const tiles=await page.locator('.xmas-area').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().height));
  expect(Math.max(...tiles)-Math.min(...tiles)).toBeLessThan(1);
  await expect(page.locator('.narnia-landscape img[alt="Martin Flashman and Co"]')).toHaveCount(1);
  await expect(page.locator('.narnia-landscape img[alt="The Glitter Tree"]')).toHaveCount(0);
  await expect(page.locator('.fayre-supporter--b')).toHaveCount(1);
 }
 if(path==='/preview/glitter-tree-volunteering-b/'){
  const activity=page.locator('.fayre-volunteer__card').filter({has:page.getByRole('heading',{name:'Glitter Tattoos',exact:true})});
  await expect(page.locator('.fayre-volunteer__card img')).toHaveCount(0);
  await expect(activity.locator('.fayre-supporter')).toHaveCount(0);
  await expect(page.locator('.fayre-volunteer>.fayre-supporter')).toHaveCount(1);
  const heights=await page.locator('.fayre-volunteer__card').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().height));
  expect(heights.length).toBeGreaterThan(3);
 }
 await page.addStyleTag({content:`html{font-size:${scale*100}%!important}`});const credit=page.locator('.fayre-supporter');await credit.scrollIntoViewIfNeeded();await credit.locator('img').evaluate((img:HTMLImageElement)=>img.decode());await expect(credit).toContainText('The Glitter Tree');if(path.includes('-b/')){const bounds=await credit.evaluate(n=>{const c=getComputedStyle(n),a=n.querySelector('a')!.getBoundingClientRect();return {button:a.width,content:n.clientWidth-parseFloat(c.paddingLeft)-parseFloat(c.paddingRight)}});if(width>=768){if(scale===1)expect(bounds.button).toBeLessThan(bounds.content*0.6)}else expect(bounds.button).toBeCloseTo(bounds.content,0)}await expect(credit).not.toContainText(/Rewards|10%|code/i);await expect(credit.locator('a')).toHaveAttribute('href','https://theglittertree.com/');await expect(credit.locator('a')).toHaveAttribute('rel','noopener noreferrer sponsored');expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 if(width===390&&scale===1)expect((await new AxeBuilder({page}).include('.fayre-supporter').analyze()).violations).toEqual([]);
 }
});
