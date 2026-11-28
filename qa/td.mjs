import { chromium } from 'playwright';
const site=process.argv[2];const base=process.argv[3];
let paths=process.argv[4]?process.argv[4].split(','):['/'];
try{const sm=await (await fetch(base+'/sitemap-0.xml')).text();const u=[...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>new URL(m[1]).pathname);if(u.length)if(!process.argv[4])paths=[...new Set(['/',...u])];}catch(e){}
paths=paths.slice(0,25);
const b=await chromium.launch({channel:'chrome'});
const fails=[];let n=0;const extLinks=new Set();
for(const path of paths)for(const [vw,z] of [[320,false],[390,true],[1280,false]]){
 const c=await b.newContext({viewport:{width:vw,height:900},reducedMotion:'reduce'});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push('console:'+m.text().slice(0,120))});
 const bad=[];p.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base))bad.push(r.status()+' '+r.url())});
 let resp;try{resp=await p.goto(base+path,{waitUntil:'load',timeout:30000});}catch(e){fails.push([path,vw,'goto',String(e).slice(0,80)]);await c.close();continue}
 await p.waitForTimeout(700);
 const rej=p.locator('button:has-text("Reject analytics cookies")');if(await rej.count())await rej.first().click().catch(()=>{});
 if(z)await p.evaluate(()=>document.documentElement.style.setProperty('font-size','200%','important'));
 await p.waitForTimeout(300);
 const r=await p.evaluate(()=>{const imgs=[...document.images].filter(i=>i.complete&&i.naturalWidth===0&&i.getBoundingClientRect().width>0).map(i=>i.src.slice(-60));
  const wide=[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.right>innerWidth+1&&getComputedStyle(e).position!=='fixed'&&!e.closest('[style*="overflow"],.sr-only')}).length;
  const h1=document.querySelectorAll('h1').length;const links=[...document.querySelectorAll('a[href]')].map(a=>a.href);
  return{imgs,sx:document.documentElement.scrollWidth-innerWidth,h1,title:document.title,links}});
 n++;
 if(resp.status()!==200&&!path.includes('404'))fails.push([path,vw,'status',resp.status()]);
 if(r.imgs.length)fails.push([path,vw,'broken img',r.imgs.join(',')]);
 if(r.sx>0)fails.push([path,vw,'sideways scroll',r.sx]);
 if(r.h1!==1)fails.push([path,vw,'h1 count',r.h1]);
 if(!r.title)fails.push([path,vw,'no title']);
 if(errs.length)fails.push([path,vw,'errors',errs.slice(0,2).join(' | ')]);
 if(bad.length)fails.push([path,vw,'4xx/5xx',bad.slice(0,2).join(' | ')]);
 if(vw===1280)for(const l of r.links)if(l.startsWith('http'))extLinks.add(l.split('#')[0]);
 await c.close();}
await b.close();
// link check (HEAD/GET, status only)
const linkBad=[];const arr=[...extLinks];
await Promise.all(arr.map(async l=>{try{let r=await fetch(l,{method:'HEAD',redirect:'follow',signal:AbortSignal.timeout(15000)});if(r.status>=400&&r.status!==403&&r.status!==405&&r.status!==429&&r.status!==999)r=await fetch(l,{redirect:'follow',signal:AbortSignal.timeout(15000)});if(r.status>=400&&![403,429,999].includes(r.status))linkBad.push([l,r.status])}catch(e){linkBad.push([l,'err '+String(e.cause?.code||e.message).slice(0,30)])}}));
console.log(JSON.stringify({site,pages:paths.length,checks:n,fails,links:arr.length,linkBad}));
