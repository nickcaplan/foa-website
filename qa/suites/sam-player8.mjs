import { chromium } from 'playwright';
const BASE='https://www.samanthafernando.com';
const out=[]; const log=(cat,name,ok,detail)=>out.push({cat,name,ok,detail});
const b=await chromium.launch({channel:'chrome'});
const c=await b.newContext({viewport:{width:390,height:844},userAgent:'Mozilla/5.0 (Linux; Android 11; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36'});
const p=await c.newPage();
try{
  await p.goto(BASE+'/listen/',{waitUntil:'networkidle',timeout:60000});
  const banner=p.locator('#cookieConsentBanner');
  if(await banner.isVisible().catch(()=>false)) await p.locator('#rejectAnalyticsCookies').click().catch(()=>{});
  await p.waitForTimeout(500);
  // first Spotify row play button
  const playBtn=p.locator('button:has-text("Preview")').first();
  const label=(await playBtn.textContent()||'').trim();
  await playBtn.click({timeout:8000});
  // wait for soundbar to show playing state
  let playing=false, t0=Date.now(), playingAt=0;
  for(let i=0;i<60;i++){
    const al=await p.locator('#soundbarPauseBtn').getAttribute('aria-label').catch(()=>null);
    if(al==='Pause playback'){ playing=true; playingAt=Date.now()-t0; break; }
    await p.waitForTimeout(500);
  }
  log('playback','spotify reaches Pause playback state',playing,`label="${label}" playingAtMs=${playingAt}`);
  if(playing){
    // wait for natural end flip back to Play playback (30s previews; allow 45s)
    let ended=false, endAt=0; const t1=Date.now();
    for(let i=0;i<90;i++){
      const al=await p.locator('#soundbarPauseBtn').getAttribute('aria-label').catch(()=>null);
      if(al==='Play playback'||al==='Replay track'){ ended=true; endAt=Date.now()-t1; break; }
      await p.waitForTimeout(500);
    }
    log('playback','natural end flips back to Replay/Play state',ended,`playedMs=${endAt}`);
  }
}catch(e){log('playback','spotify flow',false,String(e).slice(0,250));}
await b.close();
console.log(JSON.stringify({summary:{total:out.length,failed:out.filter(o=>!o.ok).length},all:out},null,1));
