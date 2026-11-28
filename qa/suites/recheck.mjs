import { chromium } from 'playwright';
const out=[]; const log=(name,ok,detail)=>out.push({name,ok,detail});
const b=await chromium.launch({channel:'chrome'});
const UA='Mozilla/5.0 (Linux; Android 11; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36';
async function wordSplitCheck(page, selector, label){
  const res=await page.evaluate((sel)=>{
    const els=[...document.querySelectorAll(sel)].filter(e=>e.getBoundingClientRect().width>0&&(e.textContent||'').trim());
    const cv=document.createElement('canvas').getContext('2d');
    const bad=[];
    for(const e of els){
      const cs=getComputedStyle(e);
      cv.font=`${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const avail=e.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight);
      for(const w of (e.textContent||'').trim().split(/\s+/)){
        const ww=cv.measureText(w.replace(/\u00a0/g,' ')).width;
        // allow CSS hyphenation: check overflow-wrap/word-break
        const breaks=cs.overflowWrap==='break-word'||cs.overflowWrap==='anywhere'||cs.wordBreak==='break-word'||cs.wordBreak==='break-all'||cs.hyphens==='auto';
        if(breaks && ww>avail+1){ bad.push({w:w.slice(0,20),ww:Math.round(ww),avail:Math.round(avail),el:(e.textContent||'').trim().slice(0,40)}); break; }
      }
    }
    return {checked:els.length,bad:bad.slice(0,6)};
  },selector);
  log(label,res.bad.length===0,JSON.stringify(res));
}
// foa #208: newsletter ordering list at 320px 200%
{
  const c=await b.newContext({viewport:{width:320,height:700},userAgent:UA});
  await c.addInitScript(()=>{localStorage.setItem('foa-theme','day');localStorage.setItem('foa-cookie-preferences','essential');});
  const p=await c.newPage();
  await p.goto('https://www.thefriendsofashley.org/newsletter/',{waitUntil:'networkidle',timeout:60000});
  await p.evaluate(()=>document.documentElement.style.setProperty('font-size','200%','important'));
  await p.waitForTimeout(500);
  await wordSplitCheck(p,'ol li, ul li','foa #208 newsletter ordering list 320px 200%');
  await c.close();
}
// foa #207: fundraising at 768px 200%
{
  const c=await b.newContext({viewport:{width:768,height:900}});
  await c.addInitScript(()=>{localStorage.setItem('foa-theme','day');localStorage.setItem('foa-cookie-preferences','essential');});
  const p=await c.newPage();
  await p.goto('https://www.thefriendsofashley.org/fundraising/',{waitUntil:'networkidle',timeout:60000});
  await p.evaluate(()=>document.documentElement.style.setProperty('font-size','200%','important'));
  await p.waitForTimeout(500);
  await wordSplitCheck(p,'p, li','foa #207 fundraising words 768px 200%');
  await c.close();
}
// sam #89: home cards, works buttons, listen titles at 390 200%
{
  const c=await b.newContext({viewport:{width:390,height:844},userAgent:UA});
  const p=await c.newPage();
  await p.goto('https://www.samanthafernando.com/',{waitUntil:'networkidle',timeout:60000});
  await p.evaluate(()=>document.documentElement.style.setProperty('font-size','200%','important'));
  await p.waitForTimeout(500);
  await wordSplitCheck(p,'h2,h3,p,button','sam #89 home 390px 200%');
  const p2=await c.newPage();
  await p2.goto('https://www.samanthafernando.com/works/',{waitUntil:'networkidle',timeout:60000});
  await p2.evaluate(()=>document.documentElement.style.setProperty('font-size','200%','important'));
  await p2.waitForTimeout(500);
  await wordSplitCheck(p2,'button, h3, a','sam #89 works actions 390px 200%');
  const p3=await c.newPage();
  await p3.goto('https://www.samanthafernando.com/listen/',{waitUntil:'networkidle',timeout:60000});
  await p3.evaluate(()=>document.documentElement.style.setProperty('font-size','200%','important'));
  await p3.waitForTimeout(500);
  await wordSplitCheck(p3,'h3, button','sam #89 listen titles 390px 200%');
  await c.close();
}
await b.close();
console.log(JSON.stringify(out,null,1));
