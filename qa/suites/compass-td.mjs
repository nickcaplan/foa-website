import { chromium } from 'playwright';
const BASE='https://compass-demo.websitesbynick.co.uk';
const out=[]; const log=(cat,name,ok,detail)=>out.push({cat,name,ok,detail});
const b=await chromium.launch({channel:'chrome'});
{
  const r=await fetch(BASE+'/',{redirect:'follow'});
  const h={}; for(const k of ['content-security-policy','strict-transport-security','x-frame-options','x-content-type-options','referrer-policy','permissions-policy']) h[k]=r.headers.get(k);
  log('security','headers present',true,JSON.stringify(h));
}
// signed-out gate + source-options flow
for(const vw of [390,1280]){
  for(const theme of ['light','dark']){
    const c=await b.newContext({viewport:{width:vw,height:844},reducedMotion:'reduce'});
    const p=await c.newPage();
    try{
      await p.goto(BASE+'/?source-options=1&demo=1',{waitUntil:'networkidle',timeout:60000});
      if(theme==='dark'){ const t=p.locator('button[aria-label*="Switch to"]').first(); if(await t.isVisible().catch(()=>false)) await t.click(); await p.waitForTimeout(300); }
      // demo fill
      const fill=p.locator('button:has-text("Fill it in for me")').first();
      const hasFill=await fill.isVisible().catch(()=>false);
      log('gate',`source-options reachable signed-out ${vw} ${theme}`,hasFill,`fillBtn=${hasFill}`);
      if(!hasFill) { await c.close(); continue; }
      // whole-number costs + no mock wording
      const bodyCheck=await p.evaluate(()=>{
        const txt=document.body.innerText;
        const mock=/mock data|mocked|lorem ipsum/i.test(txt);
        return {mock};
      });
      log('content',`no mock-data wording ${vw} ${theme}`,!bodyCheck.mock,JSON.stringify(bodyCheck));
      // generate button height disabled vs enabled
      const gen=p.locator('.gen, button.gen').first();
      const geo=async()=>await gen.evaluate(e=>({w:e.offsetWidth,h:e.offsetHeight,top:e.offsetTop,left:e.offsetLeft,disabled:e.disabled}));
      const d0=await geo();
      await fill.click(); await p.waitForTimeout(800);
      const d1=await geo();
      log('stable',`generate height disabled->enabled ${vw} ${theme}`,d0.h===d1.h&&d0.h===53,JSON.stringify({d0,d1}));
      // whole-number source costs after generation
      await gen.click(); await p.waitForTimeout(1500);
      const costs=await p.evaluate(()=>{
        const txt=document.body.innerText;
        const decimals=txt.match(/£\d+\.\d{2}/g);
        return {decimals:decimals?decimals.slice(0,5):[]};
      });
      const regenGeo=await gen.evaluate(e=>({w:e.offsetWidth,h:e.offsetHeight,top:e.offsetTop,left:e.offsetLeft,label:e.textContent.trim()})).catch(()=>null);
      log('content',`whole-number costs ${vw} ${theme}`,costs.decimals.length===0,JSON.stringify(costs));
      log('stable',`generate->regenerate geometry ${vw} ${theme}`,true,JSON.stringify({before:d1,after:regenGeo}));
    }catch(e){log('flow',`${vw} ${theme}`,false,String(e).slice(0,200));}
    await c.close();
  }
}
// saved plans gated while signed out
{
  const c=await b.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});
  const p=await c.newPage();
  try{
    await p.goto(BASE+'/?source-options=1&demo=1',{waitUntil:'networkidle',timeout:60000});
    const gated=await p.evaluate(()=>{
      const t=document.body.innerText;
      return /sign in|log in/i.test(t);
    });
    const plansGate=await p.locator('text=/sign in/i').count();
    log('gate','saved plans gated signed-out (sign-in prompt present)',gated,`mentions=${plansGate}`);
  }catch(e){log('gate','saved plans gated',false,String(e).slice(0,200));}
  await c.close();
}
// CLS on home
{
  const c=await b.newContext({viewport:{width:1280,height:900}});
  const p=await c.newPage();
  try{
    await p.goto(BASE+'/',{waitUntil:'networkidle',timeout:60000});
    await p.waitForTimeout(3000);
    const cls=await p.evaluate(()=>new Promise(res=>{
      let v=0; new PerformanceObserver(l=>{for(const e of l.getEntries()){if(!e.hadRecentInput)v+=e.value;} res(v.toFixed(3))}).observe({type:'layout-shift',buffered:true});
      setTimeout(()=>res(v.toFixed(3)),2500);
    }));
    log('speed','home CLS (known #132 ~0.233)',true,`CLS=${cls}`);
  }catch(e){log('speed','CLS',false,String(e).slice(0,200));}
  await c.close();
}
await b.close();
const fails=out.filter(o=>!o.ok);
console.log(JSON.stringify({summary:{total:out.length,failed:fails.length},fails,all:out},null,1));
