import {test,expect} from '@playwright/test';
for(const width of [320,390,768,1440])for(const scale of [1,2])test(`email CTA ${width} ${scale}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.addInitScript(()=>{localStorage.setItem('foa-theme','night');localStorage.setItem('foa-cookie-preferences','essential')});
 for(const [route,cardSelector]of [['/christmas-fayre-volunteering/','.fayre-volunteer__contact'],['/events/christmas-fayre-2026/','.xmas-contact']]){
  await page.goto(route);if(scale===2)await page.addStyleTag({content:'html{font-size:200%!important}'});
  const card=page.locator(cardSelector),link=card.getByRole('link',{name:/Email/});await expect(link).toHaveAttribute('href',/^mailto:/);await link.scrollIntoViewIfNeeded();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBe(0);
  if(width<768){const box=await link.boundingBox(),available=await link.evaluate(e=>{const p=e.parentElement!,s=getComputedStyle(p);return p.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight)});expect(box!.width).toBeGreaterThanOrEqual(available-1);}
  const geometry=await link.evaluate(e=>({w:e.clientWidth,scroll:e.scrollWidth}));expect(geometry.scroll).toBeLessThanOrEqual(geometry.w+1);
 }
});
