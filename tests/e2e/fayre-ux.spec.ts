import{test,expect}from'@playwright/test';
for(const width of[320,390,768,1024,1280,1440,1920])for(const scale of[1,2])test(`parent reading layout ${width} ${scale}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.goto('/events/christmas-fayre-2026/');await page.evaluate(s=>document.documentElement.style.fontSize=`${16*s}px`,scale);await page.evaluate(()=>document.fonts.ready);
 const align=await page.locator('.xmas-section h2,.xmas-section__lead,.xmas-notes h3,.fayre-leads__card').evaluateAll(es=>es.map(e=>getComputedStyle(e).textAlign));expect(new Set(align)).toEqual(new Set(['left']));
 const lefts=await page.locator('.narnia-landscape,.xmas-upcoming,.xmas-section > .site-width,.xmas-stage > div.site-width').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().left));expect(Math.max(...lefts)-Math.min(...lefts)).toBeLessThan(1);
 const rows=await page.locator('.xmas-donations li').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return{top:r.top,left:r.left}}));
 const roomy=await page.locator('.xmas-upcoming').evaluate(e=>e.clientWidth>=56*parseFloat(getComputedStyle(e).fontSize));
 expect(Math.abs(rows[0].top-rows[1].top)<1).toBe(roomy);
 const notes=await page.locator('.xmas-help-copy,.xmas-notes').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().left));expect(notes[1]>notes[0]+100).toBe(roomy);
 const edges=await page.locator('.narnia-landscape,.xmas-upcoming,.xmas-contact').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return{left:r.left,right:r.right}}));for(const edge of edges.slice(1)){expect(Math.abs(edge.left-edges[0].left)).toBeLessThan(1);expect(Math.abs(edge.right-edges[0].right)).toBeLessThan(1)}
 const errors=await page.locator('.xmas-stage .button').evaluateAll(es=>es.flatMap(e=>{const l=e.querySelector('.cta-label')!,a=e.querySelector('.cta-icon')!;const r=document.createRange();r.selectNodeContents(l);const rects=[...r.getClientRects()].filter(r=>r.width>1&&r.height>1);const ar=a.getBoundingClientRect();return rects.filter(r=>r.width>ar.width+1&&r.right>ar.left-5).map(r=>({text:e.textContent,width:r.width,overlap:r.right-ar.left}))}));expect(errors).toEqual([]);
 const volunteer=page.locator('.xmas-stalls-cta .cta-label');expect(await volunteer.evaluate(e=>e.getBoundingClientRect().height/parseFloat(getComputedStyle(e).lineHeight))).toBeLessThan(1.1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(0);
});
