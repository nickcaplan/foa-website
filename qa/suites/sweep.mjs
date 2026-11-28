import { chromium } from 'playwright';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const OUT = process.env.QA_OUT || mkdtempSync(join(tmpdir(), 'qa-'));
const targets=JSON.parse(process.argv[2]);const tag=process.argv[3];
const b=await chromium.launch({channel:'chrome'});
const fn=()=>{
 const out={};const add=(k,v)=>{(out[k]??=[]).push(v)};
 const all=[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0});
 const sel=e=>e.tagName.toLowerCase()+(e.className&&typeof e.className==='string'?'.'+e.className.trim().split(/\s+/).slice(0,2).join('.'):'');
 const txt=e=>(e.textContent||'').replace(/\s+/g,' ').trim().slice(0,50);
 const emoji=/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2728}\u{2705}\u{274C}]/u;
 const lum=c=>{const m=c.match(/[\d.]+/g).map(Number);const f=v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4};return .2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2])};
 const hue=c=>{const m=c.match(/[\d.]+/g);if(!m||m.length<3)return null;let[r,g,b2]=m.slice(0,3).map(x=>x/255);const mx=Math.max(r,g,b2),mn=Math.min(r,g,b2);const d=mx-mn;if(d<.25||mx<.3)return null;let h;if(mx===r)h=((g-b2)/d)%6;else if(mx===g)h=(b2-r)/d+2;else h=(r-g)/d+4;h=Math.round(h*60);if(h<0)h+=360;return h};
 const bgOf=e=>{let x=e;while(x){const c=getComputedStyle(x).backgroundColor;if(c&&!/rgba\(0, 0, 0, 0\)|transparent/.test(c))return c;x=x.parentElement}return 'rgb(255,255,255)'};
 for(const e of all){
  const s=getComputedStyle(e),r=e.getBoundingClientRect();
  // 1 pulsing dots
  if(s.animationName!=='none'&&s.animationIterationCount==='infinite'){
    if(r.width<=18&&r.height<=18)add(1,'anim dot '+sel(e));
    if(/translate|marquee|scroll/i.test(s.animationName)&&r.width>600)add(12,'wide infinite anim '+sel(e));
  }
  if(/\b(live|online now|available now|status:)\b/i.test(e.children.length?'':e.textContent)&&txt(e).length<40)add(1,'status text "'+txt(e)+'"');
  // 2 left border
  const bl=parseFloat(s.borderLeftWidth),bt=parseFloat(s.borderTopWidth),br=parseFloat(s.borderRightWidth);
  if(bl>=3&&bt<bl&&br<bl&&s.borderLeftStyle==='solid')add(2,sel(e)+' bl='+bl);
  // 3 shiny buttons
  if(/^(a|button)$/i.test(e.tagName)&&/button|btn|cta/i.test(e.className+e.tagName)){
    if(/gradient/.test(s.backgroundImage))add(3,'gradient '+sel(e));
    if(s.animationName!=='none')add(3,'anim '+sel(e));
    const m=s.boxShadow.match(/(\d+)px (\d+)px (\d+)px/g);if(m&&m.some(x=>+x.split(' ')[2].replace('px','')>=18)&&!/rgba\(0, 0, 0/.test(s.boxShadow))add(3,'glow '+sel(e)+' '+s.boxShadow.slice(0,50));
  }
  // 4 eyebrows
  const fs=parseFloat(s.fontSize);const ls=parseFloat(s.letterSpacing)||0;
  if(!e.children.length&&txt(e)&&s.textTransform==='uppercase'&&fs<=14&&ls/fs>=.06&&!/^(a|button|label|th|li|span)$/i.test(e.tagName)||/eyebrow|kicker|pill|badge|chip/i.test(typeof e.className==='string'?e.className:''))add(4,sel(e)+' "'+txt(e)+'"');
  if(/\b(most popular|ai[- ]powered|verified|beta|soc ?2|new!?)\b/i.test(e.children.length?'':e.textContent)&&txt(e).length<30)add(4,'badge text "'+txt(e)+'"');
  // 5 gradient type, low contrast, sparkle
  if(s.webkitBackgroundClip==='text'||s.backgroundClip==='text')add(5,'gradient text '+sel(e));
  if(/^(p|li|span|div)$/i.test(e.tagName)&&!e.children.length&&txt(e).length>40){const fg=s.color;const l1=lum(fg),l2=lum(bgOf(e));const cr=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);if(cr<4.5)add(5,'contrast '+cr.toFixed(2)+' '+sel(e))}
  if(/[✨✦⭐]/.test(e.children.length?'':e.textContent))add(5,'sparkle '+sel(e));
  // 6 italic/serif accent word in headline
  if(/^(em|i|span|mark)$/i.test(e.tagName)&&e.closest('h1,h2,h3')){const ph=getComputedStyle(e.parentElement);if(s.fontStyle==='italic'||s.fontFamily!==ph.fontFamily||s.color!==ph.color)add(6,sel(e)+' "'+txt(e)+'" italic='+s.fontStyle+' colour '+(s.color!==ph.color?'differs':'same')+' family '+(s.fontFamily!==ph.fontFamily?'differs':'same'))}
  // 7 marker underline
  if(e.closest('h1,h2,h3')&&e.tagName!=='H1'&&e.tagName!=='H2'&&e.tagName!=='H3'){if(s.backgroundImage!=='none'||/wavy|underline/.test(s.textDecorationLine+s.textDecorationStyle)&&s.textDecorationLine!=='none')add(7,sel(e))}
  for(const ps of ['::before','::after']){const p=getComputedStyle(e,ps);if(p.content!=='none'&&e.closest('h1,h2,h3')&&p.position==='absolute'&&parseFloat(p.height)<14&&parseFloat(p.width)>20)add(7,'pseudo underline '+sel(e)+ps)}
  // 8 glass, nested cards, squircle, conic
  if(s.backdropFilter&&s.backdropFilter!=='none')add(8,'backdrop-filter '+sel(e));
  if(/conic-gradient/.test(s.backgroundImage+s.borderImageSource))add(8,'conic '+sel(e));
  const isCard=x=>{const c=getComputedStyle(x);return parseFloat(c.borderTopWidth)>0&&parseFloat(c.borderTopLeftRadius)>=8&&x.getBoundingClientRect().width>120&&x.getBoundingClientRect().height>60&&!/^(a|button|input|select|textarea|label)$/i.test(x.tagName)&&!/ctl|btn|button|pill|chip/i.test(typeof x.className==='string'?x.className:'')};
  if(isCard(e)){const inner=[...e.querySelectorAll('*')].find(isCard);if(inner)add(8,'card in card '+sel(e)+' > '+sel(inner))}
  if(Math.abs(r.width-r.height)<2&&r.width>=32&&r.width<=72&&e.querySelector('svg,img')&&parseFloat(s.borderTopLeftRadius)>=r.width*.2&&parseFloat(s.borderTopLeftRadius)<r.width*.5&&(s.backgroundColor!=='rgba(0, 0, 0, 0)'))add(8,'icon squircle '+sel(e));
  if(e.style&&/--mouse|--x|--cursor/.test(e.getAttribute('style')||''))add(8,'cursor var '+sel(e));
  // 11 stats
  if(!e.children.length&&/^(\d[\d,.]*\s?[%MK+]|\d{2,3},\d{3}\+?|\d+(\.\d+)?[xX×])$/.test(txt(e)))add(11,'"'+txt(e)+'" '+sel(e));
  // 12 marquee by name
  if(/marquee|logos?-?(track|scroll)/i.test(typeof e.className==='string'?e.className:''))add(12,sel(e));
  // 13 testimonials
  if(e.tagName==='BLOCKQUOTE'||/testimonial|review-card/i.test(typeof e.className==='string'?e.className:''))add(13,sel(e)+' "'+txt(e)+'"');
  // 15 emoji
  if(!e.children.length&&emoji.test(e.textContent))add(15,sel(e)+' "'+txt(e)+'"');
  // 16 buzzwords
  if(!e.children.length&&/\b(supercharge|10x|game[- ]changing|revolutioni[sz]e|unleash|seamless|cutting[- ]edge|next[- ]level|elevate your|streamline)\b/i.test(e.textContent))add(16,sel(e)+' "'+txt(e)+'"');
  // 17 em dash + neon
  if(!e.children.length&&/—/.test(e.textContent))add(17,'em dash '+sel(e)+' "'+txt(e)+'"');
  for(const prop of ['color','backgroundColor','borderTopColor']){const h=hue(s[prop]);if(h&&((h>=245&&h<=300)||(h>=175&&h<=195)))add(17,'neon hue '+h+' '+prop+' '+sel(e))}
  if(/radial-gradient/.test(s.backgroundImage)&&parseFloat(s.filter.replace(/\D+/g,''))>0)add(17,'blur orb '+sel(e));
 }
 // 10 grids: 3-up identical cards
 for(const g of document.querySelectorAll('*')){const s=getComputedStyle(g);if(s.display!=='grid')continue;const kids=[...g.children].filter(k=>k.getBoundingClientRect().width>0);if(kids.length>=3){const ws=new Set(kids.map(k=>Math.round(k.getBoundingClientRect().width)));const hs=kids.map(k=>Math.round(k.getBoundingClientRect().height));const card=kids.every(k=>k.querySelector('h2,h3,h4,strong')&&k.querySelector('p'));
   if(card&&kids.length===3&&ws.size===1)add(10,'3-up identical '+sel(g));
   if(kids.some(k=>getComputedStyle(k).gridColumnEnd.startsWith('span')&&getComputedStyle(k).gridRowEnd.startsWith('span')))add(10,'bento spans '+sel(g))}}
 // 11/12 count-up scripts
 if(document.querySelector('[data-count],[data-target],[data-counter]'))add(11,'count-up attr');
 return out};
const res={};
for(const t of targets){for(const vw of [390,1280]){
 const c=await b.newContext({viewport:{width:vw,height:900}});const p=await c.newPage();
 await p.goto(t.url,{waitUntil:'networkidle'}).catch(e=>{});
 await p.waitForTimeout(500);
 const o=await p.evaluate(fn);
 const key=t.name+'@'+vw;res[key]=Object.fromEntries(Object.entries(o).map(([k,v])=>[k,[...new Set(v)].slice(0,6)]));
 if(vw===1280||t.shot)await p.screenshot({path: join(OUT,`sw-${tag}-${t.name}-${vw}.png`),fullPage:true});
 await c.close();}}
console.log(JSON.stringify(res,null,1));
await b.close();
