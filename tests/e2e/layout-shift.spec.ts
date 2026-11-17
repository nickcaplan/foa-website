import{expect,test}from'@playwright/test';
// Nick's option A (16 Nov 2026): a repo test for load-time layout shift, filed after
// his issue #173 and QA's #182 (Fayre event hero repainted ~700px -> ~433px about
// 180ms into cold loads, CLS ~0.29 @390 / ~0.38 @1440). Cause: page-level hero
// overrides inlined in the body applied after first paint. The fix bundles every
// hero rule into the head stylesheet; this test guards it with cold contexts and a
// buffered LayoutShift observer, exactly like QA's reproduction.
const pages:[string,string][]=[['event','/events/christmas-fayre-2026/'],['volunteering','/christmas-fayre-volunteering/'],['art','/christmas-fayre-art-competition/'],['homepage','/']];
for(const [name,route] of pages) for(const width of [390,1440]) test(`no load-time layout shift on ${name} at ${width}`,async({browser})=>{
 const context=await browser.newContext({viewport:{width,height:900}});
 const page=await context.newPage();
 await page.addInitScript(()=>{
  (window as any).__cls=0;
  new PerformanceObserver(list=>{for(const entry of list.getEntries()){const e=entry as any;if(!e.hadRecentInput)(window as any).__cls+=e.value;}}).observe({type:'layout-shift',buffered:true} as any);
 });
 await page.goto(route);
 await page.waitForTimeout(3000); // QA observed the shift 150-200ms in; observe well past it
 const cls=await page.evaluate(()=>(window as any).__cls);
 await context.close();
 expect(cls,`cold-load CLS on ${route} @${width}px (was ~0.29/0.38 in #182)`).toBeLessThan(0.02);
});

// Structural guard: the mechanism behind #182 was hero CSS inlined in the body,
// which applies after first paint. The fix hoists every hero rule into a head
// stylesheet. Assert the served HTML keeps it that way - this fails deterministically
// on the old structure regardless of machine timing.
for(const [name,route] of pages) test(`hero styles ship in the head, not the body, on ${name}`,async({request})=>{
 const html=await (await request.get(route)).text();
 const body=html.split(/<body[^>]*>/i)[1]??'';
 const head=html.split(/<\/head>/i)[0]??'';
 const bodyHeroStyles=[...body.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].filter(m=>/xmas-hero|fayre-hero/.test(m[1]));
 expect(bodyHeroStyles.length,`${route} inlines hero CSS in the body (the #182 mechanism)`).toBe(0);
 const headCss=[...head.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/gi)].map(m=>m[1]);
 expect(headCss.length,`${route} links no head stylesheet`).toBeGreaterThan(0);
 let bundled='';
 for(const href of headCss) bundled+=await (await request.get(href)).text();
 expect(bundled,`${route} hero rules missing from the head stylesheet`).toMatch(/xmas-hero|fayre-hero/);
});
