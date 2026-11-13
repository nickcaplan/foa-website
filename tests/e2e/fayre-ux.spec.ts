import{test,expect}from'@playwright/test';
// Layout assertions exercise Donations Day while it is still current.
test.beforeEach(async({page})=>{await page.clock.setFixedTime(new Date('2026-10-11T12:00:00Z'))});
for(const width of[320,390,768,1024,1280,1440,1920])for(const scale of[1,2])test(`parent reading layout ${width} ${scale}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.goto('/events/christmas-fayre-2026/');await page.evaluate(s=>document.documentElement.style.fontSize=`${16*s}px`,scale);await page.evaluate(()=>document.fonts.ready);
 const align=await page.locator('.xmas-section h2,.xmas-section__lead,.xmas-notes h3').evaluateAll(es=>es.map(e=>getComputedStyle(e).textAlign));expect(new Set(align)).toEqual(new Set(['left']));
 const lefts=await page.locator('.narnia-landscape,.xmas-upcoming,.xmas-section > .site-width,.xmas-stage > div.site-width').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().left));expect(Math.max(...lefts)-Math.min(...lefts)).toBeLessThan(1);
 const rows=await page.locator('.xmas-donations li').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return{top:r.top,left:r.left}}));
 const roomy=await page.locator('.xmas-upcoming').evaluate(e=>e.clientWidth>=56*parseFloat(getComputedStyle(e).fontSize));
 expect(Math.abs(rows[0].top-rows[1].top)<1).toBe(roomy);
 if(roomy){const tops=await page.locator('.xmas-donations li span').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().top));expect(Math.max(...tops)-Math.min(...tops)).toBeLessThan(1)}
 const notes=await page.locator('.xmas-help-copy,.xmas-notes').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().left));expect(notes[1]>notes[0]+100).toBe(roomy);
 const edges=await page.locator('.narnia-landscape,.xmas-upcoming,.xmas-followup').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return{left:r.left,right:r.right}}));for(const edge of edges.slice(1)){expect(Math.abs(edge.left-edges[0].left)).toBeLessThan(1);expect(Math.abs(edge.right-edges[0].right)).toBeLessThan(1)}
 const errors=await page.locator('.xmas-stage .button').evaluateAll(es=>es.flatMap(e=>{const l=e.querySelector('.cta-label')!,a=e.querySelector('.cta-icon')!;const r=document.createRange();r.selectNodeContents(l);const rects=[...r.getClientRects()].filter(r=>r.width>1&&r.height>1);const ar=a.getBoundingClientRect();return rects.filter(r=>r.width>ar.width+1&&r.right>ar.left-5).map(r=>({text:e.textContent,width:r.width,overlap:r.right-ar.left}))}));expect(errors).toEqual([]);
 const shell=await page.locator('.xmas-upcoming').boundingBox();const expectedShell=Math.min(width-(width>=768?3:2)*16*scale,75*16*scale);expect(Math.abs(shell!.width-expectedShell)).toBeLessThan(1);
 const art=await page.locator('.xmas-art-cta .button').boundingBox();const slot=await page.locator('.xmas-art-cta').boundingBox();expect(Math.abs(art!.width-slot!.width)).toBeLessThan(1);
 if(scale===1&&width>=1024){const buttons=await page.locator('.xmas-stage .button').evaluateAll(es=>es.map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})));expect(new Set(buttons.map(e=>Math.round(e.w)))).toEqual(new Set([352]));for(const b of buttons)expect(b.h).toBeGreaterThanOrEqual(56);}
 const heroAlignment=await page.locator('.narnia-landscape h1,.narnia-landscape__copy').evaluateAll(es=>es.map(e=>getComputedStyle(e).textAlign));expect(new Set(heroAlignment)).toEqual(new Set(['center']));
 const copy=await page.locator('#xmas-art-title + p').boundingBox();const action=await page.locator('.xmas-art-cta').boundingBox();expect(action!.y).toBeGreaterThanOrEqual(copy!.y+copy!.height);expect(Math.abs(action!.x-copy!.x)).toBeLessThan(1);
 const heroButton=await page.locator('.narnia-landscape .button').boundingBox();const hero=await page.locator('.narnia-landscape').boundingBox();expect(heroButton!.x+heroButton!.width).toBeLessThan(hero!.x+hero!.width);
 const volunteer=page.locator('.xmas-stalls-cta .cta-label');expect(await volunteer.evaluate(e=>e.getBoundingClientRect().height/parseFloat(getComputedStyle(e).lineHeight))).toBeLessThan(1.1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(0);
});

test('reworked Fayre actions complete their public journeys and remain useful without JavaScript',async({page,browser})=>{
 await page.goto('/events/christmas-fayre-2026/');await page.locator('.xmas-art-cta a').click();await expect(page).toHaveURL(/christmas-fayre-art-competition/);await expect(page.getByRole('heading',{level:1})).toBeVisible();await page.goBack();await page.locator('.xmas-stalls-cta a').click();await expect(page).toHaveURL(/christmas-fayre-volunteering/);await expect(page.getByRole('link',{name:/Sign up on JustSignup/})).toHaveAttribute('href',/justsignup/);
 const context=await browser.newContext({javaScriptEnabled:false});const nojs=await context.newPage();await nojs.goto('/events/christmas-fayre-2026/');await expect(nojs.locator('.xmas-art-cta a')).toHaveAttribute('href','/christmas-fayre-art-competition/');await expect(nojs.locator('.xmas-contact a')).toHaveAttribute('href',/^mailto:/);await context.close();
});

for(const width of [320,390,1280,1440,1920])test(`short copy has no last-line orphan and contact has its own row ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.goto('/events/christmas-fayre-2026/');await page.evaluate(()=>document.fonts.ready);
 const orphans=await page.locator('.xmas-stage h2,.xmas-donations strong,.xmas-donations span,.xmas-donations__raffle,#xmas-art-title + p,.xmas-points li,.xmas-contact__leads').evaluateAll(es=>es.flatMap(e=>{const groups=new Map<number,string[]>();const walker=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);while(walker.nextNode()){const t=walker.currentNode;for(const m of t.textContent!.matchAll(/\S+/g)){const r=document.createRange();r.setStart(t,m.index!);r.setEnd(t,m.index!+m[0].length);const raw=r.getBoundingClientRect().top;const y=[...groups.keys()].find(k=>Math.abs(k-raw)<=8)??raw;groups.set(y,[...(groups.get(y)||[]),m[0]])}}const lines=[...groups.values()];return lines.length>1&&lines.at(-1)!.length<2?[{text:e.textContent,lines}]:[]}));expect(orphans).toEqual([]);
 const leads=await page.locator('.xmas-contact__leads').boundingBox();const contact=await page.locator('.xmas-contact').boundingBox();const shell=await page.locator('.xmas-followup').boundingBox();expect(leads!.y).toBeGreaterThan(contact!.y);expect(leads!.y+leads!.height).toBeLessThan(contact!.y+contact!.height);expect(Math.abs(contact!.width-shell!.width)).toBeLessThan(1);await expect(page.locator('.xmas-stage > .fayre-leads')).toHaveCount(0);
});
for(const width of [390,1280,1440,1920])test(`contact organisers top right only when roomy ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.goto('/events/christmas-fayre-2026/');await page.evaluate(()=>document.fonts.ready);
 const heading=await page.locator('#xmas-contact-title').boundingBox();const leads=await page.locator('.xmas-contact__leads').boundingBox();const box=await page.locator('.xmas-contact').boundingBox();
 if(width>=1280){expect(Math.abs(heading!.y-leads!.y)).toBeLessThan(5);expect(leads!.x).toBeGreaterThan(heading!.x+heading!.width);expect(box!.x+box!.width-leads!.x-leads!.width).toBeGreaterThanOrEqual(20);expect(box!.x+box!.width-leads!.x-leads!.width).toBeLessThan(28);}else expect(leads!.y).toBeGreaterThan(heading!.y+heading!.height);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBe(0);
});
