import{test}from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';
test('December uniform sale carries Christmas jumper sale and donation details',async()=>{
const page=await readFile('dist/uniform/index.html','utf8');
assert.ok(page.includes('Friday 4th December'));assert.ok(!page.includes('Friday 6th November'));
assert.ok(page.includes('Christmas jumpers will be on sale'));assert.ok(page.includes('in good condition, age 5 and up'));
const whatsOn=await readFile('dist/whats-on/index.html','utf8');assert.ok(whatsOn.includes('Pre-loved uniform and Christmas jumper sale'));
const reps=await readFile('dist/reps/index.html','utf8');assert.ok(reps.includes('Christmas jumper donations wanted in good condition, age 5 and up'));assert.ok(reps.includes('2026-12-05T00:00:00.000Z'));
});
test('Christmas sale has its own decorative jumper and fixed readable festive palette',async()=>{
 const source=await readFile('src/pages/uniform.astro','utf8');
 assert.match(source,/class="christmas-knit"[^>]*aria-hidden="true"/);
 assert.match(source,/\.christmas-sale \.section-copy \{ color: var\(--christmas-sale-cream\)/);
 assert.ok(!source.includes('var(--paper)'));
});

test('Uniform shares the approved Fair Isle jumper beside the logo',async()=>{
const html=await readFile('dist/uniform/index.html','utf8');assert.match(html,/property="og:image"[^>]*uniform-christmas-jumpers-2026-v1.jpg/);assert.ok(html.includes('christmas-jumper-fair-isle.svg'));const art=await readFile('assets/brand/christmas-jumper-fair-isle.svg','utf8');assert.ok(art.includes('#762e3a'));
});

test("Sale date shares the jumper row rather than leaving a label-only row",async()=>{
 const html=await readFile("dist/uniform/index.html","utf8");
 assert.match(html, /class="christmas-sale-top"[^>]*>[\s\S]*class="christmas-sale-heading"[^>]*>[\s\S]*Next sale[\s\S]*Friday 4th December[\s\S]*class="christmas-knit"/);
});
