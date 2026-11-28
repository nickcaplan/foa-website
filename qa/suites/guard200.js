// 200% text guard: double root font, then measure overflow, clipping, mid-word splits, CTA pairs
const html=document.documentElement;
const orig=html.style.fontSize;
html.style.fontSize='200%';
await new Promise(r=>setTimeout(r,700));
const out={url:location.pathname};
out.horizScroll=document.documentElement.scrollWidth>document.documentElement.clientWidth+1;
// clipped text: elements whose scrollWidth exceeds clientWidth with non-visible overflow
const clipped=[];
for(const el of document.querySelectorAll('a,button,strong,span,p,h1,h2,h3,h4,dt,dd,li,label')){
  const cs=getComputedStyle(el);
  if(cs.overflow==='visible')continue;
  if(el.scrollWidth>el.clientWidth+1||el.scrollHeight>el.clientHeight+2){
    const t=el.textContent.trim().slice(0,40);
    if(t) clipped.push({tag:el.tagName,cls:(el.className||'').toString().slice(0,30),t});
  }
}
out.clipped=clipped.slice(0,8);
// mid-word splits: words >=8 chars rendered on multiple lines (via range rects), re-measured with overflow-wrap forced off
const splits=[];
for(const el of document.querySelectorAll('p,li,a,button,h1,h2,h3,h4,dt,dd,strong,span,summary,label')){
  const text=el.textContent;
  if(!text||text.length>300)continue;
  const words=text.match(/[A-Za-z]{8,}/g);
  if(!words)continue;
  const range=document.createRange();
  for(const node of el.childNodes){
    if(node.nodeType!==3)continue;
    const nv=node.textContent;
    for(const w of new Set(words)){
      let idx=nv.indexOf(w);
      while(idx>=0){
        range.setStart(node,idx);range.setEnd(node,idx+w.length);
        const rects=[...range.getClientRects()].filter(r=>r.width>1&&r.height>1);
        if(rects.length>1){
          // necessary-break check: does it still split with break-word forced?
          const prev=el.style.overflowWrap;
          el.style.overflowWrap='break-word';el.style.wordBreak='normal';
          const rects2=[...range.getClientRects()].filter(r=>r.width>1&&r.height>1);
          el.style.overflowWrap=prev;
          if(rects2.length>1) splits.push({w,ctx:el.textContent.trim().slice(0,50)});
        }
        idx=nv.indexOf(w,idx+1);
      }
    }
  }
}
out.splits=[...new Map(splits.map(s=>[s.w,s])).values()].slice(0,10);
// CTA equal widths: sibling primary/secondary buttons in the same container
const pairs=[];
document.querySelectorAll('div,section,li,article').forEach(c=>{
  const bs=[...c.children].filter(e=>e.matches('a.button,a[class*=button],button.button, a, button')&&getComputedStyle(e).display!=='none');
  if(bs.length===2){
    const w=bs.map(b=>Math.round(b.getBoundingClientRect().width));
    if(w[0]>0&&Math.abs(w[0]-w[1])>4&&w[0]>50&&w[1]>50) pairs.push({ctx:c.textContent.trim().slice(0,40),w});
  }
});
out.unequalCTAs=pairs.slice(0,6);
html.style.fontSize=orig;
return out;
