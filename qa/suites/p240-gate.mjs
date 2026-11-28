import { chromium } from 'playwright';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const OUT = process.env.QA_OUT || mkdtempSync(join(tmpdir(), 'qa-'));
const BASE='https://1a4e2642.foa-website.pages.dev';
const out=[]; const log=(n,ok,d)=>out.push({n,ok,d});
const b=await chromium.launch({channel:'chrome'});
async function probe(vw,z200,tag){
  const c=await b.newContext({viewport:{width:vw,height:900},reducedMotion:'reduce'});
  const p=await c.newPage();
  try{
    await p.goto(BASE+'/uniform/',{waitUntil:'networkidle'});
    const rej=p.locator('button:has-text("Reject analytics cookies")');
    if(await rej.count()) await rej.first().click();
    if(z200){ await p.evaluate(()=>document.documentElement.style.setProperty('font-size','200%','important')); await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(400); }
    const r=await p.evaluate(()=>{
      const vis=e=>!!e && !e.hidden && e.getClientRects().length>0;
      const rows=[...document.querySelectorAll('.price-list li')].filter(vis).map(li=>({label:li.querySelector('span')?.textContent.trim(),price:li.querySelector('strong')?.textContent.trim()}));
      const copy=document.querySelector('.christmas-sale .section-copy')?.textContent.trim();
      const saleVisible=vis(document.querySelector('.christmas-sale'));
      // word splits in price list + sale copy
      const splits=[];
      const range=document.createRange();
      for(const el of [...document.querySelectorAll('.price-list li, .christmas-sale p')].filter(vis)){
        const w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT); let n;
        while((n=w.nextNode())){
          for(const word of n.textContent.split(/\s+/)){
            if(!word||word.length<3) continue;
            const i=n.textContent.indexOf(word);
            range.setStart(n,i); range.setEnd(n,i+word.length);
            if(range.getClientRects().length>1){ splits.push(word); break; }
          }
        }
      }
      // CTA geometry
      const ctas=[...document.querySelectorAll('.uniform-action')].map(a=>({w:a.offsetWidth,h:a.offsetHeight,top:a.offsetTop,left:a.offsetLeft}));
      return {rows,copy,saleVisible,splits,ctas,scrollW:document.documentElement.scrollWidth,innerW:window.innerWidth};
    });
    // hover/focus stability on CTAs
    const a=p.locator('.uniform-action').first();
    const g0=await a.evaluate(e=>({w:e.offsetWidth,h:e.offsetHeight,top:e.offsetTop,left:e.offsetLeft}));
    await a.hover(); await p.waitForTimeout(150);
    const g1=await a.evaluate(e=>({w:e.offsetWidth,h:e.offsetHeight,top:e.offsetTop,left:e.offsetLeft}));
    await a.focus(); await p.waitForTimeout(150);
    const g2=await a.evaluate(e=>({w:e.offsetWidth,h:e.offsetHeight,top:e.offsetTop,left:e.offsetLeft}));
    const stable=JSON.stringify(g0)===JSON.stringify(g1)&&JSON.stringify(g0)===JSON.stringify(g2);
    log(tag, r.scrollW<=r.innerW+1 && r.splits.length===0 && stable, JSON.stringify({...r,stable,g0,g1,g2}));
    await p.screenshot({path: join(OUT,`p240-${tag.replace(/ /g,'_')}.png`)});
  }catch(e){log(tag,false,String(e).slice(0,200));}
  await c.close();
}
await probe(320,false,'320');
await probe(390,false,'390');
await probe(1280,false,'1280');
await probe(390,true,'390-200');
// reps hub + ics
{
  const c=await b.newContext({viewport:{width:390,height:900}});
  const p=await c.newPage();
  await p.goto(BASE+'/reps/',{waitUntil:'networkidle'});
  const r=await p.evaluate(()=>{
    const t=document.body.innerText;
    const i=t.indexOf('Prices:');
    return {found:i>=0, snippet:i>=0?t.slice(i,i+120):null, scrollW:document.documentElement.scrollWidth, innerW:window.innerWidth};
  });
  log('reps hub',r.found&&r.scrollW<=r.innerW+1,JSON.stringify(r));
  const ics=await p.evaluate(async()=>{
    const resp=await fetch('/calendar/uniform-december-2026.ics');
    const txt=await resp.text();
    return {status:resp.status, hasPrice:txt.includes('Christmas jumpers £2'), len:txt.length};
  });
  log('ics',ics.status===200&&ics.hasPrice,JSON.stringify(ics));
  await c.close();
}
console.log(JSON.stringify(out,null,1));
await b.close();
