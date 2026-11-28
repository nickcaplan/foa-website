import { chromium } from 'playwright';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const outDir=process.argv[2]||mkdtempSync(join(tmpdir(),'qa-aud-'));
const b=await chromium.launch({channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']});
const p=await (await b.newContext({viewport:{width:390,height:900}})).newPage();
await p.goto('https://www.samanthafernando.com/listen/',{waitUntil:'load'});await p.waitForTimeout(2500);
const acc=p.locator('button:has-text("Reject")');if(await acc.count())await acc.first().click().catch(()=>{});
const cands=await p.evaluate(()=>[...document.querySelectorAll('button,a')].filter(e=>/play|listen/i.test((e.getAttribute('aria-label')||'')+(e.title||'')+e.textContent)&&e.getBoundingClientRect().width>0).slice(0,8).map(e=>[e.tagName,(e.getAttribute('aria-label')||e.textContent).trim().slice(0,40),e.getAttribute('onclick')]));
console.log(JSON.stringify(cands));
const state=()=>p.evaluate(()=>{const sb=document.getElementById('soundbar')||document.querySelector('[id*=soundbar]');const pos=[...document.querySelectorAll('[id*=soundbar],[id*=Soundbar]')].map(e=>e.id+':'+(e.textContent||'').trim().slice(0,30)+':'+(e.style.width||''));return{pos,pauseVisible:!!(document.getElementById('soundbarPauseBtn')?.getBoundingClientRect().width)}});
console.log('before',JSON.stringify(await state()));
const play=p.locator('button[onclick*="Playback"]:visible, button[aria-label^="Play"]:visible').first();
if(await play.count()){await play.click();}else{const t=p.locator('button:visible:has-text("Play")').first();if(await t.count())await t.click();}
await p.waitForTimeout(4000);console.log('t+4',JSON.stringify(await state()));await p.waitForTimeout(4000);console.log('t+8',JSON.stringify(await state()));
await p.screenshot({path:join(outDir,'sam-audio.png')});
await b.close();
console.log('screenshot in',outDir);
