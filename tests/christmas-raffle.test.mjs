import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
test('Christmas Fayre page links to the official Zeffy raffle page in a new tab',async()=>{
 const html=await readFile('dist/events/christmas-fayre-2026/index.html','utf8');
 const link=html.match(/<a[^>]*href="(https:\/\/www\.zeffy\.com\/en-GB\/ticketing\/the-friends-of-ashleys-christmas-raffle--2026)"[^>]*>/);
 assert.ok(link,'raffle link present');
 assert.match(link[0],/target="_blank"/);assert.match(link[0],/rel="noopener noreferrer"/);
 assert.ok(html.includes('Our online Christmas raffle opens on Monday 30th November'));
 assert.ok(html.includes('(opens in a new tab)'));
});
