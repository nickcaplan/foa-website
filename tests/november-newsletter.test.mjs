import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
test('November newsletter carries supplied content without email scaffolding or unfinished figures',async()=>{
 const issue=JSON.parse(await readFile('src/content/newsletters/november-2026.json','utf8'));
 assert.equal(issue.published,'2026-11-13');assert.equal(issue.latest,true);assert.equal(issue.sections.length,7);
 const copy=JSON.stringify(issue);for(const required of ['1500+','Helen Platt','£25 Amazon voucher','Friday 20th November','Full details to be shared shortly','GOOD condition','Summer Fete','Big Picnic'])assert.ok(copy.includes(required),required);
 for(const excluded of ['£XXXX','YYYY','Hi Jennie','jratcliff@','To/Cc','age 5 and up'])assert.ok(!copy.includes(excluded),excluded);
 const html=await readFile('dist/newsletter/index.html','utf8');assert.ok(html.includes('Friday 13th November'));assert.ok(html.includes('newsletter-issue-half-term-2026'));assert.ok(!html.includes('£XXXX'));assert.ok(!html.includes('YYYY'));
 const home=await readFile('dist/index.html','utf8');assert.ok(home.includes('November News'));
});
