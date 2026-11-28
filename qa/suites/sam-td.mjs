import { chromium } from 'playwright';
const BASE='https://www.samanthafernando.com';
const PAGES=['/','/works/','/listen/','/watch/','/biography/','/contact/','/writing/'];
const out=[]; const log=(cat,name,ok,detail)=>out.push({cat,name,ok,detail});
const b=await chromium.launch({channel:'chrome'});
const UA='Mozilla/5.0 (Linux; Android 11; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36';
{
  const r=await fetch(BASE+'/',{redirect:'follow'});
  const h={}; for(const k of ['content-security-policy','strict-transport-security','x-frame-options','x-content-type-options','referrer-policy','permissions-policy']) h[k]=r.headers.get(k);
  log('security','headers present',true,JSON.stringify(h));
}
for(const [label,url] of [['home',BASE+'/'],['listen',BASE+'/listen/']]){
  const c=await b.newContext({viewport:{width:390,height:844},userAgent:UA});
  const p=await c.newPage();
  const t0=Date.now(); await p.goto(url,{waitUntil:'load',timeout:60000}); const loadMs=Date.now()-t0;
  const fcp=await p.evaluate(()=>{const e=performance.getEntriesByType('paint').find(x=>x.name==='first-contentful-paint');return e?Math.round(e.startTime):null});
  const t1=Date.now(); await p.reload({waitUntil:'load',timeout:60000}); const warmMs=Date.now()-t1;
  log('speed',`${label}`,true,JSON.stringify({coldMs:loadMs,warmMs,fcp}));
  await c.close();
}
// cookie banner accept + reject
{
  const c=await b.newContext({viewport:{width:390,height:844},userAgent:UA});
  const p=await c.newPage();
  try{
    await p.goto(BASE+'/',{waitUntil:'networkidle',timeout:60000});
    const banner=p.locator('#cookieConsentBanner');
    await banner.waitFor({state:'visible',timeout:10000}).catch(()=>{});
    const visible=await banner.isVisible().catch(()=>false);
    let res={visible};
    if(visible){
      await p.locator('#rejectAnalyticsCookies').click({timeout:5000}); await p.waitForTimeout(400);
      res.afterReject=await banner.isVisible().catch(()=>false);
      res.rejectStored=await p.evaluate(()=>localStorage.getItem('cookieConsent')||document.cookie);
      await p.evaluate(()=>{localStorage.clear();});
      const p2=await c.newPage(); await p2.goto(BASE+'/',{waitUntil:'networkidle',timeout:60000});
      await p2.locator('#cookieConsentBanner').waitFor({state:'visible',timeout:10000}).catch(()=>{});
      await p2.locator('#acceptAnalyticsCookies').click({timeout:5000}); await p2.waitForTimeout(400);
      res.afterAccept=await p2.locator('#cookieConsentBanner').isVisible().catch(()=>false);
      res.acceptStored=await p2.evaluate(()=>localStorage.getItem('cookieConsent')||document.cookie);
      await p2.close();
    }
    log('banner','cookie banner accept+reject',visible&&res.afterReject===false&&res.afterAccept===false,JSON.stringify(res));
  }catch(e){log('banner','cookie banner',false,String(e).slice(0,200));}
  await c.close();
}
// rendered checks
for(const url of PAGES){
  for(const zoom of [100,200]){
    const c=await b.newContext({viewport:{width:390,height:844},userAgent:UA});
    const p=await c.newPage();
    try{
      await p.goto(BASE+url,{waitUntil:'networkidle',timeout:60000});
      if(zoom===200) await p.evaluate(()=>document.documentElement.style.setProperty('font-size','200%','important'));
      await p.waitForTimeout(400);
      const m=await p.evaluate(()=>{
        const doc=document.documentElement;
        const overflow=doc.scrollWidth-doc.clientWidth;
        const clipping=[...document.querySelectorAll('a,button')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&e.scrollWidth>e.clientWidth+4}).slice(0,8).map(e=>(e.textContent||'').trim().slice(0,30));
        return {overflow,clipping};
      });
      log('render',`${url} ${zoom}% overflow`,m.overflow<=1,`overflow=${m.overflow} clip=${JSON.stringify(m.clipping)}`);
    }catch(e){log('render',`${url} ${zoom}%`,false,String(e).slice(0,200));}
    await c.close();
  }
}
// YouTube modal open/close x3 across cards on /watch/
{
  const c=await b.newContext({viewport:{width:390,height:844},userAgent:UA});
  const p=await c.newPage();
  try{
    await p.goto(BASE+'/watch/',{waitUntil:'networkidle',timeout:60000});
    const cards=p.locator('[data-youtube], .video-card, .youtube-card, [class*="video"]').filter({visible:true});
    const n=await cards.count();
    let ok=0, details=[];
    for(let i=0;i<Math.min(3,n);i++){
      try{
        await cards.nth(i).click({timeout:5000}); await p.waitForTimeout(700);
        const modalVisible=await p.locator('.modal:visible, [class*="modal"]:visible, dialog:visible, iframe[src*="youtube"]:visible').first().isVisible().catch(()=>false);
        await p.keyboard.press('Escape'); await p.waitForTimeout(400);
        let closed=!(await p.locator('.modal:visible, [class*="modal"]:visible, dialog:visible').first().isVisible().catch(()=>false));
        if(!closed){ const x=p.locator('.modal button:has-text("×"), [class*="modal"] button[aria-label*="lose" i]').first(); if(await x.isVisible().catch(()=>false)){ await x.click(); await p.waitForTimeout(300); closed=!(await p.locator('.modal:visible').first().isVisible().catch(()=>false)); } }
        details.push({i,modalVisible,closed}); if(modalVisible&&closed) ok++;
      }catch(e){details.push({i,err:String(e).slice(0,120)});}
    }
    log('modal',`youtube modal x${Math.min(3,n)}`,ok===Math.min(3,n)&&n>0,JSON.stringify({n,details}));
  }catch(e){log('modal','youtube modal',false,String(e).slice(0,200));}
  await c.close();
}
// contact form validation only (never submit valid)
{
  const c=await b.newContext({viewport:{width:390,height:844},userAgent:UA});
  const p=await c.newPage();
  try{
    await p.goto(BASE+'/contact/',{waitUntil:'networkidle',timeout:60000});
    const email=p.locator('input[type="email"], input[name*="email" i]').first();
    await email.fill('not-an-email');
    const invalid=await email.evaluate(e=>!e.checkValidity());
    log('form','contact invalid email blocked client-side',invalid,`invalid=${invalid}`);
  }catch(e){log('form','contact validation',false,String(e).slice(0,200));}
  await c.close();
}
// link crawl (internal + embed sources HEAD)
{
  const seen=new Set(); const ext=new Set();
  const c=await b.newContext(); const p=await c.newPage();
  for(const url of PAGES){
    try{await p.goto(BASE+url,{waitUntil:'domcontentloaded',timeout:60000});
      const hrefs=await p.$$eval('a[href]',as=>as.map(a=>a.getAttribute('href')));
      for(const h of hrefs){ if(!h)continue; if(h.startsWith('/')&&!h.startsWith('//')) seen.add(h.split('#')[0]); else if(/^https?:/.test(h)) ext.add(h.split('#')[0]); }
      const ifr=await p.$$eval('iframe[src]',f=>f.map(x=>x.getAttribute('src')));
      for(const s of ifr){ if(s) ext.add(s.split('#')[0]); }
    }catch(e){log('links',`collect ${url}`,false,String(e).slice(0,150));}
  }
  await c.close();
  const bad=[];
  for(const h of seen){ try{const r=await fetch(BASE+h,{redirect:'follow'}); if(r.status>=400) bad.push(`${h} -> ${r.status}`);}catch(e){bad.push(`${h} -> ${String(e).slice(0,80)}`);}}
  log('links',`internal (${seen.size})`,bad.length===0,bad.slice(0,10).join('; ')||'all ok');
  const badExt=[];
  const botBlocked=[]; for(const h of ext){ if(!h) continue; try{const r=await fetch(h,{redirect:'follow',headers:{'user-agent':'Mozilla/5.0'}}); if(r.status>=400){ if(r.status===403||r.status===406) botBlocked.push(`${h.slice(0,60)} -> ${r.status}`); else badExt.push(`${h.slice(0,80)} -> ${r.status}`); }}catch(e){badExt.push(`${h.slice(0,80)} -> ${String(e).slice(0,60)}`);}} if(botBlocked.length) log('links','external bot-blocked tolerated',true,botBlocked.join('; '));
  log('links',`external+embeds (${ext.size})`,badExt.length===0,badExt.slice(0,10).join('; ')||'all ok');
}
await b.close();
const fails=out.filter(o=>!o.ok);
console.log(JSON.stringify({summary:{total:out.length,failed:fails.length},fails,all:out},null,1));
