import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const load=async()=>JSON.parse(await readFile('src/content/newsletters/christmas-fayre-2026.json','utf8'));
test('27 November newsletter is the latest issue and the 13 November issue moves to the archive',async()=>{
 const issue=await load();
 assert.equal(issue.published,'2026-11-27');assert.equal(issue.latest,true);
 const copy=JSON.stringify(issue);
 for(const required of ['Walton Heathside','THEFRIENDSOFASHLEY','Art Competition','Summer Fete','age 5 and up'])assert.ok(copy.includes(required),required);
 for(const excluded of ['Hi Jennie','jratcliff@','foacommsteam','Bcc','XXX','£XXXX'])assert.ok(!copy.includes(excluded),excluded);
 const nov=JSON.parse(await readFile('src/content/newsletters/november-2026.json','utf8'));assert.equal(nov.latest,false);
 const html=await readFile('dist/newsletter/index.html','utf8');
 assert.ok(!html.includes('<template data-newsletter-next>'));
 assert.ok(html.includes('Friday 27th November'));
 const archive=html.slice(html.indexOf('Previous newsletters'),html.indexOf('<aside class="newsletter-issue-index"'));
 assert.ok(archive.includes('November News'));assert.ok(!archive.includes('Christmas Fayre News'));
});
test('27 November newsletter never shows a web address as link text',async()=>{
 const texts=[...JSON.stringify(await load()).matchAll(/\[([^\]]+)\]\(/g)].map(m=>m[1]);
 assert.ok(texts.length>10);
 for(const t of texts.filter(x=>!x.includes("@")))assert.ok(!/www\.|https?:|\.org|\.com|\.co\.uk|\//i.test(t),t);
});
test('latest newsletter shows a forward arrow on same-site links only; archived issues are unchanged',async()=>{
 const html=await readFile('dist/newsletter/index.html','utf8');
 const split=html.indexOf('Previous newsletters');
 const latest=html.slice(0,split),rest=html.slice(split);
 const internal=[...latest.matchAll(/<a class="text-link" href="\/[^"]*">(.*?)<\/a>/g)];
 assert.ok(internal.length>=6,'expected the six same-site links');
 for(const [,inner] of internal)assert.ok(/<span class="cta-tail">[^<]+<span class="cta-icon" aria-hidden="true"><svg data-cta-arrow="forward"/.test(inner),inner);
 assert.ok(!rest.includes('data-cta-arrow="forward"'),'only the latest sheet gets same-site arrows');
});
test('27 November newsletter states the sale prices: coats and new-logo £3, jumpers £2, everything else £1',async()=>{
 const copy=JSON.stringify(await load());
 assert.ok(copy.includes('Coats and new-logo items £3, Christmas jumpers £2, everything else £1, card only.'));
});
