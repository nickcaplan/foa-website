import {test,expect} from '@playwright/test';
// The committee vacancy card must stay fully readable at enlarged text:
// link visible, pill not overlapping, nothing clipped by the 4/5 box.
for(const width of [320,390,768,1440])for(const scale of [1,2])test(`vacancy card readable ${width} @${scale}x`,async({page})=>{
  await page.setViewportSize({width,height:1000});
  await page.goto('/committee/');
  await page.addStyleTag({content:`html{font-size:${scale*100}%!important}`});
  const card=page.locator('.member-card--vacancy');
  await card.scrollIntoViewIfNeeded();
  const link=card.getByRole('link',{name:/Ask us about the role/});
  await expect(link).toBeVisible();
  const m=await card.evaluate(el=>{
    const q=(s:string)=>el.querySelector(s)!;
    const box=q('.member-vacancy'),pill=q('.member-vacancy-label'),a=q('.member-vacancy a'),name=q('.member-vacancy-name');
    const r=(e:Element)=>{const b=e.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom}};
    const overlaps=(x:{left:number,right:number,top:number,bottom:number},y:{left:number,right:number,top:number,bottom:number})=>!(x.right<=y.left+2||y.right<=x.left+2||x.bottom<=y.top+2||y.bottom<=x.top+2);
    return {card:r(el),pill:r(pill),link:r(a),name:r(name),
      pillOverlapsName:overlaps(r(pill),r(name)),pillOverlapsLink:overlaps(r(pill),r(a)),
      scrollOverflow:document.documentElement.scrollWidth-innerWidth,
      grown:box.classList.contains('member-vacancy--grown')};
  });
  expect(m.scrollOverflow).toBeLessThanOrEqual(1);
  for(const key of ['pill','link','name'] as const){
    expect(m[key].left,`${key} left`).toBeGreaterThanOrEqual(m.card.left-1);
    expect(m[key].right,`${key} right`).toBeLessThanOrEqual(m.card.right+1);
    expect(m[key].top,`${key} top`).toBeGreaterThanOrEqual(m.card.top-1);
    expect(m[key].bottom,`${key} bottom`).toBeLessThanOrEqual(m.card.bottom+1);
  }
  expect(m.pillOverlapsName,'pill over name').toBe(false);
  expect(m.pillOverlapsLink,'pill over link').toBe(false);
  if(scale===1)expect(m.grown,'growth must stay off at normal text').toBe(false);
});
