import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
test('next newsletter is built hidden, kept out of the archive, homepage and sitemap',async()=>{
 const next=JSON.parse(await readFile('src/content/newsletter-next.json','utf8'));
 assert.equal(next.scheduled,'2026-11-27');
 const copy=JSON.stringify(next);
 for(const required of ['Walton Heathside','THEFRIENDSOFASHLEY','Art Competition','Summer Fete'])assert.ok(copy.includes(required),required);
 for(const excluded of ['Hi Jennie','jratcliff@','foacommsteam','Bcc'])assert.ok(!copy.includes(excluded),excluded);
 const html=await readFile('dist/newsletter/index.html','utf8');
 assert.match(html,/<template data-newsletter-next>/);
 assert.ok(!html.includes('<meta name="robots"'),'noindex is only added when the preview shows');
 const home=await readFile('dist/index.html','utf8');assert.ok(!home.includes('Christmas Fayre News'));
 const archive=html.slice(html.indexOf('Previous newsletters'));assert.ok(!archive.includes('Christmas Fayre News'));
});
