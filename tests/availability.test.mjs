import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
const source = await readFile('src/lib/fireworks-availability.ts','utf8');
const compiled = ts.transpileModule(source,{ compilerOptions:{module:ts.ModuleKind.ES2022}}).outputText;
const {remaining,compareRemaining} = await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
const now = Date.parse('2026-11-05T17:00:00Z');
const activity={checkedAt:'2026-11-05T16:30:00Z',rows:[{endsAt:'2026-11-05T16:59:59Z',open:4},{endsAt:'2026-11-05T17:00:00Z',open:2},{endsAt:'2026-11-05T17:30:00Z',open:3}]};
test('excludes ended at exact boundary, retains ongoing and upcoming places',()=>assert.equal(remaining(activity,now),3));
test('unavailable and stale data are not zero',()=>{for(const a of [undefined,{}, {...activity,unavailable:true},{...activity,checkedAt:'2026-11-05T15:00:00Z'},{...activity,checkedAt:'2026-11-05T18:00:00Z'},{...activity,rows:[{endsAt:'bad',open:4}]}]) assert.equal(remaining(a,now),null);});
test('fresh fully filled and ended shifts yield genuine zero',()=>assert.equal(remaining({...activity,rows:[{endsAt:'2026-11-05T18:00:00Z',open:0}]},now),0));

test('orders descending validated totals, stable ties, unknown last',()=>{
 const rows=[{name:'Prize',n:14},{name:'Bar',n:5},{name:'Entrance',n:17},{name:'Tokens',n:10},{name:'Unknown',n:null}];
 assert.deepEqual(rows.sort((a,b)=>compareRemaining(a.n,b.n)).map(x=>x.name),['Entrance','Prize','Tokens','Bar','Unknown']);
 assert.equal(compareRemaining(5,5),0);assert.equal(compareRemaining(null,null),0);assert.ok(compareRemaining(0,null)<0);
});
