import {expect,test} from '@playwright/test';

// Per-element 200% text (each computed font-size doubled inline): hero titles
// must keep every word on one line - no mid-word split - and stay inside the
// hero on the phone widths. The volunteering title rule was
// overflow-wrap:anywhere, which split "Volunteering" mid-word here.
const useLargeText=()=>{const elements=[...document.querySelectorAll('body *')]as HTMLElement[];const sizes=elements.map(e=>parseFloat(getComputedStyle(e).fontSize));elements.forEach((e,i)=>e.style.setProperty('font-size',sizes[i]*2+'px','important'));};
for(const width of [320,390])for(const route of ['/','/christmas-fayre-supporters/','/christmas-fayre-volunteering/'])
test(`hero title keeps whole words at 200% per-element text ${width} ${route}`,async({page})=>{
  await page.setViewportSize({width,height:1000});
  await page.goto(route);
  await page.evaluate(useLargeText);
  const result=await page.evaluate(()=>{
    const h1=document.querySelector('.narnia-landscape h1');
    if(!h1)return null;
    const hero=document.querySelector('.narnia-landscape')!.getBoundingClientRect();
    const bad:string[]=[];
    const walker=document.createTreeWalker(h1,NodeFilter.SHOW_TEXT);
    let n:Node|null;
    while((n=walker.nextNode())){
      const text=n.textContent??'';
      for(const m of text.matchAll(/\S+/g)){
        const rng=document.createRange();
        rng.setStart(n,m.index!);rng.setEnd(n,m.index!+m[0].length);
        const rects=[...rng.getClientRects()].filter(r=>r.width>0.5);
        if(new Set(rects.map(r=>Math.round(r.y))).size>1)bad.push(`split:${m[0]}`);
        if(rng.getBoundingClientRect().right>hero.right+1)bad.push(`over:${m[0]}`);
      }
    }
    return bad;
  });
  expect(result,`${route} hero title found`).not.toBeNull();
  expect(result,`${route} hero title words split or overflow at 200% per-element text`).toEqual([]);
});
