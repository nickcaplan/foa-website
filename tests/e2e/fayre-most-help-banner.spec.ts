import {expect,test} from '@playwright/test';

// The Most-help-needed banner must never strand a single word on its last
// line: at enlarged text the value wraps, and a lone "left" reads as a bug.
for(const width of [320,390,768])for(const theme of ['day','night'])test(`most-help banner has no single-word last line at ${width}px ${theme} 200% text`,async({page})=>{
 await page.setViewportSize({width,height:800});
 await page.addInitScript(t=>{localStorage.setItem('foa-theme',t);localStorage.setItem('foa-cookie-preferences','essential')},theme);
 await page.goto('/christmas-fayre-volunteering/');
 await page.evaluate(()=>{document.documentElement.style.fontSize='32px'});
 await page.waitForFunction(()=>document.querySelector('[data-most-help] strong'));
 const result=await page.evaluate(()=>{
  const el=document.querySelector<HTMLElement>('[data-most-help]')!;
  const texts:Text[]=[];(function walk(n:Node){for(const c of n.childNodes){if(c.nodeType===3)texts.push(c as Text);else walk(c)}})(el);
  const range=document.createRange();
  const words:{w:string;top:number;bottom:number}[]=[];
  for(const t of texts){let offset=0;for(const part of t.textContent!.split(/(\s+)/)){const i=t.textContent!.indexOf(part,offset);offset=i+part.length;if(!part.trim())continue;range.setStart(t,i);range.setEnd(t,i+part.length);const r=range.getBoundingClientRect();words.push({w:part,top:r.top,bottom:r.bottom})}}
  const lines:{top:number;bottom:number;count:number}[]=[];
  for(const word of words){const line=lines.find(l=>word.top<l.bottom&&word.bottom>l.top);if(line){line.top=Math.min(line.top,word.top);line.bottom=Math.max(line.bottom,word.bottom);line.count++}else lines.push({top:word.top,bottom:word.bottom,count:1})}
  const last=lines[lines.length-1];
  return {lines:lines.length,lastCount:last?.count??0,text:el.textContent!.trim()};
 });
 expect(result.lastCount,`${result.lines} lines, last line words: "${result.text}"`).toBeGreaterThan(1);
});
