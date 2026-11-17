import test from 'node:test';import assert from 'node:assert/strict';import{readFile,stat,readdir}from'node:fs/promises';
test('12 November loading audit: woodland stays below 80 KiB',async()=>{
 const html=await readFile('dist/index.html','utf8');assert.match(html,/narnia-woodland-continuation\.avif/);assert.ok((await stat('assets/brand/narnia-woodland-continuation.avif')).size<=80*1024);
});
test('12 November loading audit: committee portraits stay below 190 KiB together with intrinsic dimensions',async()=>{
 let bytes=0;const html=await readFile('dist/committee/index.html','utf8');
 for(const name of await readdir('src/content/committee')){if(!name.endsWith('.json'))continue;const d=JSON.parse(await readFile('src/content/committee/'+name));assert.match(d.portrait,/\.webp$/);assert.ok(d.portraitWidth>0&&d.portraitHeight>0);bytes+=(await stat('assets/'+d.portrait)).size;
 const tag=[...html.matchAll(/<img\b[^>]*>/g)].map(m=>m[0]).find(t=>t.includes(d.portrait));assert.ok(tag);
 for(const [name,value]of Object.entries({width:d.portraitWidth,height:d.portraitHeight,loading:'lazy'}))assert.match(tag,new RegExp(`\\s${name}="${value}"`));
 const data=await readFile('assets/'+d.portrait);let dimensions;
 for(let offset=12;offset+8<=data.length;){const kind=data.toString('ascii',offset,offset+4),length=data.readUInt32LE(offset+4),start=offset+8;
 if(kind==='VP8 '){assert.equal(data.toString('hex',start+3,start+6),'9d012a');dimensions=[data.readUInt16LE(start+6)&16383,data.readUInt16LE(start+8)&16383];break;}
 if(kind==='VP8X'){dimensions=[1+data.readUIntLE(start+4,3),1+data.readUIntLE(start+7,3)];break;}
 offset=start+length+(length%2);}
 assert.deepEqual(dimensions,[d.portraitWidth,d.portraitHeight]);}assert.ok(bytes<=190*1024);
});
test('fayre route styles ship in the shared head stylesheet, not body-inlined',async()=>{
 // Updated 17 November 2026 for the layout-shift fix: the old invariant required
 // page styles inlined in the body, which applied after first paint and caused the
 // #182 cold-load hero shift. The new invariant: fayre/hero rules live in the
 // head-linked FayrePageStyles bundle; no body <style> may carry them.
 const html=await readFile('dist/christmas-fayre-art-competition/index.html','utf8');
 const styles=[...html.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)].map(m=>m[0]);
 assert.ok(styles.some(t=>/FayrePageStyles/.test(t)),'FayrePageStyles bundle linked in the head');
 const body=html.split(/<body[^>]*>/i)[1]??'';
 const bodyHero=[...body.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].filter(m=>/xmas-hero|fayre-hero/.test(m[1]));
 assert.equal(bodyHero.length,0,'no fayre/hero rules inlined in the body');
});
