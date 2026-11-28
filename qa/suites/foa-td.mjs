import { chromium } from 'playwright';
const BASE='https://www.thefriendsofashley.org';
const PAGES=['/','/whats-on/','/fundraising/','/get-involved/','/uniform/','/newsletter/','/reps/','/events/christmas-fayre-2026/'];
const out=[]; const log=(cat,name,ok,detail)=>out.push({cat,name,ok,detail});
const b=await chromium.launch({channel:'chrome'});
const UA='Mozilla/5.0 (Linux; Android 11; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36';
// headers + speed first (no page reuse confusion)
{
  const r=await fetch(BASE+'/',{redirect:'follow'});
  const h={}; for(const k of ['content-security-policy','strict-transport-security','x-frame-options','x-content-type-options','referrer-policy','permissions-policy']) h[k]=r.headers.get(k);
  log('security','headers present',true,JSON.stringify(h));
}
for(const [label,url] of [['home',BASE+'/'],['fayre',BASE+'/events/christmas-fayre-2026/']]){
  for(const [kind,extra] of [['cold',{bypassCSP:false}],['warm',{}]]){
    const c=await b.newContext({viewport:{width:390,height:844},userAgent:UA,bypassCSP:false});
    const p=await c.newPage();
    if(kind==='cold') await c.clearCookies();
    const t0=Date.now(); await p.goto(url,{waitUntil:'load',timeout:45000}); const loadMs=Date.now()-t0;
    const fcp=await p.evaluate(()=>{const e=performance.getEntriesByType('paint').find(x=>x.name==='first-contentful-paint');return e?Math.round(e.startTime):null});
    log('speed',`${label} ${kind}`,true,JSON.stringify({loadMs,fcp}));
    if(kind==='warm') await c.close();
  }
}
// rendered checks per page/theme/text
for(const url of PAGES){
  for(const theme of ['day','night']){
    for(const zoom of [100,200]){
      const c=await b.newContext({viewport:{width:390,height:844},userAgent:UA});
      await c.addInitScript((t)=>{localStorage.setItem('foa-theme',t);localStorage.setItem('foa-cookie-preferences','essential');},theme);
      const p=await c.newPage();
      try{
        await p.goto(BASE+url,{waitUntil:'load',timeout:45000});
        if(zoom===200) await p.evaluate(()=>document.documentElement.style.setProperty('font-size','200%','important'));
        await p.waitForTimeout(400);
        const m=await p.evaluate(()=>{
          const doc=document.documentElement;
          const overflow=doc.scrollWidth-doc.clientWidth;
          const btns=[...document.querySelectorAll('a.btn,button.btn,.cta,.button')].filter(e=>e.offsetParent);
          const btnInfo=btns.slice(0,12).map(e=>{const r=e.getBoundingClientRect();return {t:(e.textContent||'').trim().slice(0,30).replace(/\u00a0/g,' '),w:Math.round(r.width),h:Math.round(r.height),scrollW:e.scrollWidth,clientW:e.clientWidth,midWord:e.scrollWidth>e.clientWidth+2}});
          return {overflow,btnInfo,bodyBg:getComputedStyle(document.body).backgroundColor};
        });
        const midword=m.btnInfo.filter(x=>x.midWord);
        log('render',`${url} ${theme} ${zoom}% overflow`,m.overflow<=1,`overflow=${m.overflow}`);
        if(midword.length) log('render',`${url} ${theme} ${zoom}% midword-clipping`,false,JSON.stringify(midword));
        // paired CTA equal widths
        const pairs={};
        for(const x of m.btnInfo){const key=x.t; pairs[key]=pairs[key]||[];pairs[key].push(x.w);}
      }catch(e){log('render',`${url} ${theme} ${zoom}%`,false,String(e).slice(0,200));}
      await c.close();
    }
  }
}
// mobile menu at 390
{
  const c=await b.newContext({viewport:{width:390,height:844},userAgent:UA});
  await c.addInitScript(()=>{localStorage.setItem('foa-theme','day');localStorage.setItem('foa-cookie-preferences','essential');});
  const p=await c.newPage();
  try{
    await p.goto(BASE+'/',{waitUntil:'networkidle',timeout:45000});
    const btn=p.locator('button[aria-label="Open menu"]');
    const geo=async()=>await btn.evaluate(e=>{const r=e.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}});
    const before=await geo();
    await btn.click({timeout:8000}); await p.waitForTimeout(400);
    const during=await geo();
    const linksVisible=await p.locator('header a:visible, nav a:visible').count();
    const closeBtn=p.locator('button[aria-label="Close menu"]');
    await closeBtn.click({timeout:5000}); await p.waitForTimeout(400);
    const after=await geo();
    const stable=before.x===during.x&&before.y===during.y&&before.w===during.w&&before.h===during.h&&before.x===after.x&&before.y===after.y&&before.w===after.w&&before.h===after.h;
    log('stable','mobile menu button geometry stable',stable,JSON.stringify({before,during,after,linksVisible}));
  }catch(e){log('stable','mobile menu',false,String(e).slice(0,200));}
  await c.close();
}
// ticket links + internal link crawl
{
  const seen=new Set(); const ticket=new Set();
  const c=await b.newContext(); const p=await c.newPage();
  for(const url of PAGES){
    try{await p.goto(BASE+url,{waitUntil:'domcontentloaded',timeout:45000});
      const hrefs=await p.$$eval('a[href]',as=>as.map(a=>a.getAttribute('href')));
      for(const h of hrefs){ if(!h)continue; if(h.includes('buytickets.at')) ticket.add(h); if(h.startsWith('/')&&!h.startsWith('//')) seen.add(h.split('#')[0]); }
    }catch(e){log('links',`collect ${url}`,false,String(e).slice(0,150));}
  }
  await c.close();
  for(const h of ticket){ try{const r=await fetch(h,{redirect:'follow'}); log('links',`ticket ${h}`,r.status<400,`status=${r.status}`);}catch(e){log('links',`ticket ${h}`,false,String(e).slice(0,150));}}
  const bad=[];
  for(const h of seen){ try{const r=await fetch(BASE+h,{redirect:'follow'}); if(r.status>=400) bad.push(`${h} -> ${r.status}`);}catch(e){bad.push(`${h} -> ${String(e).slice(0,80)}`);}}
  log('links',`internal links (${seen.size})`,bad.length===0,bad.slice(0,10).join('; ')||'all ok');
}
await b.close();
const fails=out.filter(o=>!o.ok);
console.log(JSON.stringify({summary:{total:out.length,failed:fails.length},fails,all:out},null,1));
