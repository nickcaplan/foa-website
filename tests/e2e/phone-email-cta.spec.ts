import {test,expect} from '@playwright/test';
for(const theme of ['day','night'])for(const width of [320,390,768,1440])for(const scale of [1,2])test(`email CTA ${theme} ${width} ${scale}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.addInitScript(theme=>{localStorage.setItem('foa-theme',theme);localStorage.setItem('foa-cookie-preferences','essential')},theme);
 for(const [route,cardSelector]of [['/christmas-fayre-volunteering/','.fayre-volunteer__contact'],['/events/christmas-fayre-2026/','.xmas-contact']]){
  await page.goto(route);if(scale===2)await page.addStyleTag({content:'html{font-size:200%!important}'});
  const card=page.locator(cardSelector),link=card.getByRole('link',{name:/Email/});await expect(link).toHaveAttribute('href',/^mailto:/);await link.scrollIntoViewIfNeeded();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBe(0);
  if(width<768){const box=await link.boundingBox(),available=await link.evaluate(e=>{const p=e.parentElement!,s=getComputedStyle(p);return p.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight)});expect(box!.width).toBeGreaterThanOrEqual(available-1);}
  await expect(link.locator('.cta-icon')).toHaveCount(1);await expect(link.locator('.cta-icon')).toHaveAttribute('aria-hidden','true');await expect(link.locator('[data-cta-arrow]')).toHaveCount(0);
  const icon=await link.locator('.cta-icon').boundingBox(),box=await link.boundingBox();expect(icon!.x).toBeGreaterThan(box!.x);expect(icon!.x+icon!.width).toBeLessThanOrEqual(box!.x+box!.width);expect(icon!.y+icon!.height).toBeLessThanOrEqual(box!.y+box!.height);
  const overlap=await link.locator('.cta-label').evaluate(e=>{const icon=e.querySelector('.cta-icon')!.getBoundingClientRect();const walker=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);let n;while(n=walker.nextNode()){if(n.parentElement?.closest('[aria-hidden]')||!n.textContent?.trim())continue;const range=document.createRange();range.selectNodeContents(n);for(const r of range.getClientRects())if(r.width&&r.right>icon.left&&r.left<icon.right&&r.bottom>icon.top&&r.top<icon.bottom)return true}return false});expect(overlap).toBe(false);
  const onLastLine=await link.locator('.cta-label').evaluate(e=>{const icon=e.querySelector('.cta-icon')!.getBoundingClientRect(),walker=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);let n,last:DOMRect|undefined;while(n=walker.nextNode()){if(n.parentElement?.closest('[aria-hidden]')||!n.textContent?.trim())continue;const r=document.createRange();r.selectNodeContents(n);for(const b of r.getClientRects())if(b.width)last=b}return !!last&&icon.top<last.bottom&&icon.bottom>last.top});expect(onLastLine).toBe(true);
  const geometry=await link.evaluate(e=>({w:e.clientWidth,scroll:e.scrollWidth}));expect(geometry.scroll).toBeLessThanOrEqual(geometry.w+1);
 }
});
