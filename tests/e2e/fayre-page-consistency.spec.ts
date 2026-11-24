import {test,expect} from '@playwright/test';
// Hero geometry is locked across the four hero-carrying Fayre pages; the
// supporters page joined the shared Narnia hero family (Nick, 19 Nov 2026).
const heroRoutes=['/events/christmas-fayre-2026/','/christmas-fayre-volunteering/','/christmas-fayre-art-competition/','/christmas-fayre-supporters/'];
const navRoutes=heroRoutes;
for(const width of [320,390,768,1024,1440]) for(const scale of [1,2]) for(const theme of ['day','night']) test(`Fayre shared frame ${width}/${scale}/${theme}`,async({page})=>{
 await page.setViewportSize({width,height:1000});
 const sizes:{width:number,height:number}[]=[];
 for(const route of heroRoutes){
  await page.goto(route);
  await page.evaluate(({scale,theme})=>{document.documentElement.style.fontSize=`${16*scale}px`;document.documentElement.dataset.theme=theme;},{scale,theme});
  const hero=page.locator('.narnia-landscape,.fayre-art-hero').first();
  const geometry=await hero.evaluate(el=>{const r=el.getBoundingClientRect(),h=el.querySelector('h1')!;const range=document.createRange();range.selectNodeContents(h);const tr=range.getBoundingClientRect();return {width:r.width,height:r.height,headingFits:h.scrollWidth<=h.clientWidth,clipLeft:tr.left-r.left,clipRight:r.right-tr.right};});
  expect(geometry.headingFits).toBe(true);sizes.push(geometry);
  // The hero clips overflowing content; a heading wider than the hero loses both
  // edges without tripping headingFits (QA on #194: "Competition" at 320px/200%).
  expect(Math.min(geometry.clipLeft,geometry.clipRight),'heading text clipped by the hero').toBeGreaterThanOrEqual(-1);
 }
 for(const route of navRoutes){
  await page.goto(route);
  await page.evaluate(({scale,theme})=>{document.documentElement.style.fontSize=`${16*scale}px`;document.documentElement.dataset.theme=theme;},{scale,theme});
  const nav=page.getByRole('navigation',{name:'Christmas Fayre pages'});
  await expect(nav.getByRole('link')).toHaveCount(4);
  await expect(nav.locator('[aria-current=page]')).toHaveCount(1);
  // The nav wraps to as many rows as it needs (no horizontal scrolling): every
  // label must be fully visible inside the nav's own box on every Fayre route.
  const navBox=(await nav.boundingBox())!;
  const boxes=await nav.getByRole('link').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,right:r.right};}));
  for(const b of boxes){expect(b.x).toBeGreaterThanOrEqual(navBox.x-1);expect(b.right).toBeLessThanOrEqual(navBox.x+navBox.width+1);}
  if(heroRoutes.includes(route)){
   const hero=page.locator('.narnia-landscape,.fayre-art-hero').first();
   expect((await nav.boundingBox())!.y).toBeGreaterThanOrEqual((await hero.boundingBox())!.y+(await hero.boundingBox())!.height);
  }
 }
 expect(Math.max(...sizes.map(s=>s.width))-Math.min(...sizes.map(s=>s.width))).toBeLessThanOrEqual(1);
 // Nick (17 Nov 2026): hero heights may differ by up to 10% - the Christmas Fayre event
 // hero carries the snow bank's clearance padding (#172). Widths stay pixel-locked.
 // The supporters hero rejoins the band (Nick, 19 Nov 2026): a raised >=75rem floor
 // levels it with the volunteering hero at wide desktop.
 if(scale===1){const hs=sizes.map(s=>s.height);expect(Math.max(...hs)-Math.min(...hs)).toBeLessThanOrEqual(Math.min(...hs)*0.1);}
});
