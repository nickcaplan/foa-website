import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
for(const width of [320,390,768,1440])for(const mode of ['day','night'])for(const scale of [1,2])test(`Glitter Tree credit ${width} ${mode} ${scale}`,async({page})=>{
 await page.setViewportSize({width,height:1000});
 await page.addInitScript(mode=>{localStorage.setItem('foa-theme',mode);localStorage.setItem('foa-cookie-preferences','essential')},mode);
 for(const path of ['/events/christmas-fayre-2026/','/christmas-fayre-volunteering/']){
  await page.goto(path);await page.addStyleTag({content:`html{font-size:${scale*100}%!important}`});
  const credit=page.getByRole('complementary',{name:'The Glitter Tree support'});await credit.scrollIntoViewIfNeeded();
  await credit.locator('img').evaluate((img:HTMLImageElement)=>img.decode());
  await expect(credit).toContainText('In collaboration with');await expect(credit).toContainText('They will match our spend with a donation.');
  await expect(credit).not.toContainText(/Rewards|10%|code/i);
  const link=credit.getByRole('link');await expect(link).toHaveAttribute('href','https://theglittertree.com/');await expect(link).toHaveAttribute('rel','noopener noreferrer');await expect(link).toHaveAttribute('target','_blank');
  await expect(page.locator('.xmas-area img,.fayre-volunteer__card img')).toHaveCount(0);
  if(path.includes('/events/'))await expect(page.locator('.narnia-landscape img[alt="Martin Flashman and Co"]')).toHaveCount(1);
  const preceding=path.includes('/events/')?page.getByRole('region',{name:'Where we need friendly faces'}).getByRole('link',{name:'Volunteer',exact:true}):page.getByRole('link',{name:/See the loan list/});
  const a=await preceding.boundingBox(),b=await credit.boundingBox();expect(b!.y).toBeGreaterThanOrEqual(a!.y+a!.height);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  const bounds=await link.evaluate(n=>({width:n.clientWidth,scroll:n.scrollWidth}));expect(bounds.scroll).toBeLessThanOrEqual(bounds.width+1);
  if(width===390&&scale===1)expect((await new AxeBuilder({page}).include('.fayre-supporter').analyze()).violations).toEqual([]);
 }
});
