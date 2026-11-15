import{expect,test}from'@playwright/test';
// Hero titles must never break a word across lines: a split title reads as a
// typo (Nick's iPhone showed "COMPETITIO / N" on the Art Competition hero).
const routes=['/christmas-fayre-art-competition/','/christmas-fayre-volunteering/','/events/christmas-fayre-2026/'];
for(const width of [320,390])for(const mode of ['day','night'])for(const scale of [1,2])for(const route of routes)test(`hero title keeps whole words ${width} ${mode} text ${scale} ${route}`,async({page})=>{
 await page.setViewportSize({width,height:850});await page.addInitScript(mode=>{localStorage.setItem('foa-theme',mode);localStorage.setItem('foa-cookie-preferences','essential')},mode);
 await page.goto(route,{waitUntil:'networkidle'});
 if(scale===2)await page.evaluate(()=>document.documentElement.style.fontSize='32px');
 const split=await page.evaluate(()=>{
  const h1=document.querySelector('.view-hero h1, h1')!;
  const walker=document.createTreeWalker(h1,NodeFilter.SHOW_TEXT);
  const broken:string[]=[];let node;
  while((node=walker.nextNode())){
   for(const m of node.textContent!.matchAll(/\S+/g)){
    const range=document.createRange();range.setStart(node,m.index!);range.setEnd(node,m.index!+m[0].length);
    if(range.getClientRects().length>1)broken.push(m[0]);
   }
  }
  return broken;
 });
 expect(split,`hero title word split across lines: ${split}`).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(0);
});
