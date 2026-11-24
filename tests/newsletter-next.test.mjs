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
test('next newsletter never shows a web address as link text',async()=>{
 const next=JSON.parse(await readFile('src/content/newsletter-next.json','utf8'));
 const texts=[...JSON.stringify(next).matchAll(/\[([^\]]+)\]\(/g)].map(m=>m[1]);
 assert.ok(texts.length>10);
 for(const t of texts.filter(x=>!x.includes("@")))assert.ok(!/www\.|https?:|\.org|\.com|\.co\.uk|\//i.test(t),t);
});
test('next newsletter shows a forward arrow on same-site links only; other newsletters are unchanged',async()=>{
 const html=await readFile('dist/newsletter/index.html','utf8');
 const tpl=html.slice(html.indexOf('<template data-newsletter-next>'),html.indexOf('</template>'));
 const internal=[...tpl.matchAll(/<a class="text-link" href="\/[^"]*">(.*?)<\/a>/g)];
 assert.ok(internal.length>=6,'expected the six same-site links');
 for(const [,inner] of internal)assert.ok(/<span class="cta-tail">[^<]+<span class="cta-icon" aria-hidden="true"><svg data-cta-arrow="forward"/.test(inner),inner);
 const rest=html.slice(html.indexOf('</template>'));
 assert.ok(!rest.includes('data-cta-arrow="forward"'),'only the next sheet gets same-site arrows');
});
test('next newsletter states the sale prices: coats and new-logo £3, jumpers £2, everything else £1',async()=>{
 const copy=JSON.stringify(JSON.parse(await readFile('src/content/newsletter-next.json','utf8')));
 assert.ok(copy.includes('Coats and new-logo items £3, Christmas jumpers £2, everything else £1, card only.'));
});
