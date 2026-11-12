import test from 'node:test';import assert from 'node:assert/strict';import{readFile,stat,readdir}from'node:fs/promises';
test('12 November loading audit: woodland stays below 80 KiB',async()=>{
 const html=await readFile('dist/index.html','utf8');assert.match(html,/narnia-woodland-continuation\.avif/);assert.ok((await stat('assets/brand/narnia-woodland-continuation.avif')).size<=80*1024);
});
test('12 November loading audit: committee portraits stay below 190 KiB together with intrinsic dimensions',async()=>{
 let bytes=0;const html=await readFile('dist/committee/index.html','utf8');
 for(const name of await readdir('src/content/committee')){if(!name.endsWith('.json'))continue;const d=JSON.parse(await readFile('src/content/committee/'+name));assert.match(d.portrait,/\.webp$/);assert.ok(d.portraitWidth>0&&d.portraitHeight>0);bytes+=(await stat('assets/'+d.portrait)).size;assert.ok(html.includes(`width="${d.portraitWidth}" height="${d.portraitHeight}" loading="lazy"`));}assert.ok(bytes<=190*1024);
});
test('small Art route styles are inline while the shared stylesheet stays cacheable',async()=>{
 const html=await readFile('dist/christmas-fayre-art-competition/index.html','utf8');const styles=[...html.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)];assert.equal(styles.length,1);assert.match(styles[0][0],/BaseLayout/);assert.match(html,/<style>/);
});
