import { chromium } from 'playwright';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const outDir=process.argv[2]||mkdtempSync(join(tmpdir(),'qa-timeline-'));
const b=await chromium.launch({channel:'chrome'});const base='https://www.thefriendsofashley.org';
for(const theme of ['day','night'])for(const [vw,z] of [[320,false],[390,false],[390,true],[768,false],[1440,false],[1440,true]]){
 const c=await b.newContext({viewport:{width:vw,height:900},reducedMotion:'reduce'});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(t=>localStorage.setItem('foa-theme',t),theme);
 const resp=await p.goto(base+'/events/christmas-fayre-2026/',{waitUntil:'domcontentloaded'});await p.waitForTimeout(1200);
 const rej=p.locator('button:has-text("Reject analytics cookies")');if(await rej.count())await rej.first().click();
 if(z){await p.evaluate(()=>document.documentElement.style.setProperty('font-size','200%','important'));await p.waitForTimeout(400);}
 const r=await p.evaluate(()=>{const s=document.querySelector('.xmas-timeline');if(!s)return{none:true};
  const rows=[...s.querySelectorAll('li')].map(li=>{const t=li.querySelector('time'),st=li.querySelector('strong');const tr=t.getBoundingClientRect(),sr=st.getBoundingClientRect();
   const a=getComputedStyle(li,'::after');const lr=li.getBoundingClientRect();const dx=lr.left+parseFloat(a.left)+7,dy=lr.top+parseFloat(a.top)+7;
   return[t.textContent.replace(/\u00a0/g,' '),st.textContent,t.scrollWidth>t.clientWidth+1,Math.round(tr.height/parseFloat(getComputedStyle(t).lineHeight)),Math.abs(dy-(tr.top+parseFloat(getComputedStyle(t).lineHeight)/2))<1.5,(dx+7>tr.left&&dx-7<tr.right&&dy+7>tr.top&&dy-7<tr.bottom)]});
  return{rows,sx:document.documentElement.scrollWidth-innerWidth,order:[...document.querySelectorAll('.xmas-stage section[aria-labelledby]')].map(e=>e.getAttribute('aria-labelledby'))}});
 console.log(JSON.stringify({theme,vw,z,status:resp.status(),errs:errs.length,...r}));
 if(theme==='day'&&!z&&[390,1440].includes(vw)){const el=p.locator('.xmas-timeline');await el.scrollIntoViewIfNeeded();await p.evaluate(()=>document.querySelectorAll('.skip-link,.menu-toggle--floating').forEach(e=>e.style.visibility='hidden'));await el.screenshot({path:join(outDir,`prod248-${vw}.png`)});}
 await c.close();}
await b.close();
console.log('screenshots in',outDir);
