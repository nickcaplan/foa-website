import {test,expect} from '@playwright/test';
// The committee vacancy cards must stay fully readable at enlarged text:
// link visible, pill not overlapping, nothing clipped by the 4/5 box.
// Both vacancy cards show unconditionally: the 20 Nov 2026 vacancy flip has
// passed, so the date gates (and the departing Co-Comms member card) were
// removed, matching Get Involved.
for(const width of [320,390,768,1440])for(const scale of [1,2])test(`vacancy card readable ${width} @${scale}x`,async({page})=>{
  await page.setViewportSize({width,height:1000});
  await page.goto('/committee/');
  await page.addStyleTag({content:`html{font-size:${scale*100}%!important}`});
  const cards=page.locator('.member-card--vacancy');
  expect(await cards.evaluateAll(els=>els.filter(e=>(e as HTMLElement).offsetParent!==null).length),'both vacancy cards always visible').toBe(2);
  let tested=0;
  for(const card of await cards.all()){
  if(!(await card.isVisible()))continue;
  tested++;
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
  }
  expect(tested,'at least one vacancy card visible and asserted').toBeGreaterThan(0);
});

// Consistency: post-flip both vacancy cards are visible together, so they
// must use the SAME layout mode (both grown or both fixed) at every width
// and text scale - a grown card next to a fixed one is visibly uneven.
for(const width of [320,390,768,1440])for(const scale of [1,2])test(`vacancy cards share one layout mode ${width} @${scale}x`,async({page})=>{
  await page.setViewportSize({width,height:1000});
  await page.goto('/committee/');
  await page.addStyleTag({content:`html{font-size:${scale*100}%!important}`});
  const boxes=page.locator('.member-vacancy');
  const states=await boxes.evaluateAll(els=>els.filter(e=>(e as HTMLElement).offsetParent!==null).map(e=>e.classList.contains('member-vacancy--grown')));
  expect(states.length,'both vacancy cards visible post-flip').toBe(2);
  expect(new Set(states).size,`mixed layout modes at ${width}px @${scale}x: ${states}`).toBe(1);
  // And the grown cards must actually be the same height (equal-height grid).
  const heights=await boxes.evaluateAll(els=>els.filter(e=>(e as HTMLElement).offsetParent!==null).map(e=>Math.round(e.getBoundingClientRect().height)));
  expect(Math.abs(heights[0]-heights[1]),`uneven vacancy card heights at ${width}px @${scale}x: ${heights}`).toBeLessThanOrEqual(2);
});
// Alignment: the two vacancy cards sit side by side, so pill, title and CTA
// must land at the same offsets in both cards at every width and text
// scale. Measured from rendered rects, relative to each card's top.
for(const width of [320,390,768,1440])for(const scale of [1,2])test(`vacancy cards align pill, title and CTA ${width} @${scale}x`,async({page})=>{
  await page.setViewportSize({width,height:1000});
  await page.goto('/committee/');
  await page.addStyleTag({content:`html{font-size:${scale*100}%!important}`});
  await page.waitForTimeout(400);
  const boxes=page.locator('.member-vacancy');
  const offsets=await boxes.evaluateAll(els=>els.filter(e=>(e as HTMLElement).offsetParent!==null).map(b=>{
    const br=b.getBoundingClientRect();
    const top=(sel:string)=>{const r=(b as HTMLElement).querySelector(sel)!.getBoundingClientRect();return r.top-br.top};
    return {pill:top('.member-vacancy-label'),name:top('.member-vacancy-name'),link:top('.member-vacancy a')};
  }));
  expect(offsets.length,'both vacancy cards visible post-flip').toBe(2);
  for(const part of ['pill','name','link'] as const)expect(Math.abs(offsets[0][part]-offsets[1][part]),`misaligned ${part} at ${width}px @${scale}x: ${offsets[0][part]} vs ${offsets[1][part]}`).toBeLessThanOrEqual(1);
});
