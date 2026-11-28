import { chromium } from 'playwright';
import fs from 'fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const OUT = process.env.QA_OUT || mkdtempSync(join(tmpdir(), 'qa-'));
const BASE='https://preview-pr-141.compass-5ic.pages.dev/?source-options=1&demo=1';
const ecb=fs.readFileSync(process.env.QA_ECB_JSON||process.argv[2],'utf8');
const b=await chromium.launch({channel:'chrome'});
const out=[];const log=(n,ok,d)=>out.push((ok?'PASS ':'FAIL ')+n+(d?' :: '+d:''));
const note=p=>p.evaluate(()=>{const n=document.querySelector('.sp-note');return n?n.textContent.replace(/\s+/g,' '):null});
const lsget=p=>p.evaluate(()=>localStorage.getItem('compass-fx-rates'));
async function run(mode,{vw=1280,seed=null,keepCtx=null,delay=0}={}){
 const c=keepCtx||await b.newContext({viewport:{width:vw,height:900},reducedMotion:'reduce'});
 const st={calls:0};
 const p=await c.newPage();
 await p.route('**/data-api.ecb.europa.eu/**',async r=>{st.calls++;
  if(mode==='live')return r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:ecb});
  if(mode==='delay'){await new Promise(x=>setTimeout(x,delay));return r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:ecb}).catch(()=>{});}
  if(mode==='fail')return r.abort();
  if(mode==='bad')return r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{"unexpected":true}'});
  if(mode==='500')return r.fulfill({status:500,body:'x',headers:{'access-control-allow-origin':'*'}});
 });
 if(seed) await p.addInitScript(s=>{localStorage.setItem('compass-fx-rates',s)},seed);
 await p.goto(BASE,{waitUntil:'domcontentloaded'});
 return {c,p,st};
}
async function gen(p){await p.locator('button:has-text("Fill it in for me")').first().click();await p.waitForTimeout(700);await p.locator('.gen').first().click();await p.waitForSelector('.sp-results',{timeout:30000});}
const live=/reference rates, 25 November 2026\./, fb=/live rates unavailable, using the saved rates from this date/;
// A live + cache + regenerate + reload
{const {c,p,st}=await run('live');await p.waitForTimeout(1500);const ls=await lsget(p);await gen(p);const n=await note(p);
 log('A live: shows live date, no unavailable',live.test(n)&&!fb.test(n),n&&n.slice(-170));
 log('A live: stored in localStorage with fetchedAt',!!ls&&/fetchedAt/.test(ls)&&/"live":true/.test(ls),ls&&ls.slice(0,90));
 await p.locator('button.gen').click();await p.waitForTimeout(800);
 log('A regenerate: no new ECB call',st.calls===1,'calls='+st.calls);
 await p.reload({waitUntil:'domcontentloaded'});
 // routes persist on page? reattach counter via context route: page.route is per page, re-add
 await p.route('**/data-api.ecb.europa.eu/**',r=>{st.calls++;return r.abort()});
 await gen(p);const n2=await note(p);
 log('A reload within 24h: live from storage, no new fetch',live.test(n2)&&st.calls===1,'calls='+st.calls+' '+(n2||'').slice(-100));
 globalThis.goodCache=await lsget(p);await c.close();}
// B delay 6s
{const {c,p,st}=await run('delay',{delay:6000});await gen(p);const n0=await note(p);
 const g0=await p.locator('button.gen').evaluate(e=>({t:e.offsetTop,l:e.offsetLeft,w:e.offsetWidth}));
 log('B 6s-slow: starts on fallback notice',fb.test(n0),'');
 await p.waitForFunction(()=>/25 November 2026/.test(document.querySelector('.sp-note')?.textContent||''),{timeout:15000}).catch(()=>{});
 const n1=await note(p);log('B 6s-slow: flips to live (within 15s limit)',live.test(n1),'');
 const g1=await p.locator('button.gen').evaluate(e=>({t:e.offsetTop,l:e.offsetLeft,w:e.offsetWidth}));
 log('B stable controls: Regenerate geometry unchanged on notice flip',JSON.stringify(g0)===JSON.stringify(g1),JSON.stringify({g0,g1}));
 await c.close();}
// C delay 17s => abort at 15s
{const t0=Date.now();const {c,p,st}=await run('delay',{delay:17000});await gen(p);
 await p.waitForTimeout(16500);const n=await note(p);const ls=await lsget(p);
 log('C 17s response: stays on fallback after 15s limit, nothing stored',fb.test(n)&&!ls,'calls='+st.calls+' ls='+ls);await c.close();}
// D fail, E bad, F 500
for(const m of ['fail','bad','500']){const {c,p,st}=await run(m);await gen(p);await p.waitForTimeout(800);const n=await note(p);const ls=await lsget(p);
 log(`D ${m}: fallback notice, nothing stored, no error`,fb.test(n)&&!ls,'calls='+st.calls);await c.close();}
// seeds
const good=globalThis.goodCache;const o=JSON.parse(good);
const mk=(f)=>JSON.stringify(f(structuredClone(o)));
const cases=[
 ['G fresh cache (1h old): used, no fetch',mk(x=>{x.fetchedAt=Date.now()-3600e3;return x}),true,0],
 ['H stale cache (25h): ignored, refetch',mk(x=>{x.fetchedAt=Date.now()-25*3600e3;return x}),true,1],
 ['I future fetchedAt: ignored, refetch',mk(x=>{x.fetchedAt=Date.now()+3*3600e3;return x}),true,1],
 ['J negative rate: ignored, refetch',mk(x=>{const k=Object.keys(x.set.rates)[0];x.set.rates[k]=-1;x.fetchedAt=Date.now();return x}),true,1],
 ['K missing currency: ignored, refetch',mk(x=>{const k=Object.keys(x.set.rates)[0];delete x.set.rates[k];x.fetchedAt=Date.now();return x}),true,1],
 ['L corrupt JSON: ignored, refetch, no crash','{"broken":',true,1],
 ['M live:false in cache: ignored, refetch',mk(x=>{x.set.live=false;x.fetchedAt=Date.now();return x}),true,1],
];
for(const [name,seed,_,exp] of cases){const {c,p,st}=await run('live',{seed});await p.waitForTimeout(1500);await gen(p);const n=await note(p);
 log(name,st.calls===exp&&live.test(n),'calls='+st.calls);await c.close();}
// real unmocked ECB at 390 + 320 overflow
for(const vw of [320,390]){const c=await b.newContext({viewport:{width:vw,height:900},reducedMotion:'reduce'});const p=await c.newPage();await p.goto(BASE,{waitUntil:'domcontentloaded'});await p.waitForTimeout(6000);await gen(p);const n=await note(p);
 const o2=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth}));
 log(`N real ECB at ${vw}: notice names a date, no overflow`,/European Central Bank reference rates, \d+ \w+ 2026/.test(n)&&o2.sw<=o2.iw+1,(n||'').slice(-140)+' live='+!fb.test(n));
 if(vw===390)await p.screenshot({path: join(OUT,'g141-390.png')});await c.close();}
console.log(out.join('\n'));await b.close();
