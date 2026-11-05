import { expect, test } from '@playwright/test';
for (const width of [320,390,768,1440]) for (const theme of ['day','night']) for (const large of [false,true]) {
 test(`Christmas homepage ${width} ${theme} enlarged=${large}`, async({page})=>{
  await page.setViewportSize({width,height:900});await page.addInitScript(mode=>{localStorage.setItem('foa-theme',mode);localStorage.setItem('foa-cookie-preferences','essential')},theme);await page.goto('/');
  if(large) await page.evaluate(()=>{const all=[...document.querySelectorAll<HTMLElement>('body *')];const sizes=all.map(e=>parseFloat(getComputedStyle(e).fontSize));all.forEach((e,i)=>e.style.setProperty('font-size',`${sizes[i]*2}px`,'important'))});
  await expect(page.getByRole('heading',{level:1,name:'Christmas Fayre'})).toBeVisible();
  const details=page.getByRole('link',{name:'Event details',exact:true});await expect(details).toBeVisible();
  const dimensions=await details.evaluate(e=>({h:e.getBoundingClientRect().height,line:parseFloat(getComputedStyle(e).lineHeight),padding:parseFloat(getComputedStyle(e).paddingTop)}));expect(dimensions.h).toBeGreaterThanOrEqual(56);expect(dimensions.padding).toBeGreaterThanOrEqual(14);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const image=page.locator('.christmas-home-wreath');expect(await image.evaluate((e:HTMLImageElement)=>e.complete&&e.naturalWidth>0)).toBe(true);
  await expect(page.getByRole('link',{name:'Help at the Fayre'})).toHaveAttribute('href',/^mailto:ashleyschoolchristmasfair2026@gmail.com\?subject=/);
  await details.focus();await page.keyboard.press('Enter');await expect(page).toHaveURL(/\/events\/christmas-fayre-2026\/$/);await expect(page.getByRole('heading',{level:1,name:'Christmas Fayre'})).toBeVisible();
 });
}
