import{test}from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';
test('December uniform sale carries Christmas jumper sale and donation details',async()=>{
const page=await readFile('dist/uniform/index.html','utf8');
assert.ok(page.includes('Friday 4th December'));assert.ok(!page.includes('Friday 6th November'));
assert.ok(page.includes('Christmas jumpers will be on sale'));assert.ok(page.includes('in good condition, age 5 and up'));
const whatsOn=await readFile('dist/whats-on/index.html','utf8');assert.ok(whatsOn.includes('Pre-loved uniform and Christmas jumper sale'));
const reps=await readFile('dist/reps/index.html','utf8');assert.ok(reps.includes('Christmas jumper donations wanted in good condition, age 5 and up'));assert.ok(reps.includes('2026-12-04T15:25:00.000Z'));
});
test('Christmas sale has its own decorative jumper and fixed readable festive palette',async()=>{
 const source=await readFile('src/pages/uniform.astro','utf8');
 assert.match(source,/class="christmas-knit"[^>]*aria-hidden="true"/);
 assert.match(source,/\.christmas-sale \.section-copy \{ color: var\(--christmas-sale-cream\)/);
 assert.ok(!source.includes('var(--paper)'));
});
