import {test} from 'node:test';
import assert from 'node:assert/strict';
import {alignPreviewLabel} from '../scripts/preview-label.mjs';
const base={slug:'nickcaplan/foa-website',pr:{number:88,labels:[]},label:'cloudflare',token:'test'};
for(const route of ['cloudflare','netlify']){
 test(`${route}: rejects failed label mutation before push`,async()=>{await assert.rejects(alignPreviewLabel({...base,route,api:async()=>({ok:false,status:403})}),/No push performed/)});
 test(`${route}: confirms selected provider`,async()=>{let calls=0;await alignPreviewLabel({...base,route,api:async()=>++calls===1?{ok:true}:{ok:true,json:route==='cloudflare'?[{name:'cloudflare'}]:[]}});assert.equal(calls,2)});
 test(`${route}: rejects mismatching label readback`,async()=>{await assert.rejects(alignPreviewLabel({...base,route,api:async()=>({ok:true,json:route==='netlify'?[{name:'cloudflare'}]:[]})}),/does not match/)});
}
test('Netlify: absent label DELETE404 is safe after verified readback',async()=>{let calls=0;await alignPreviewLabel({...base,route:'netlify',api:async()=>++calls===1?{ok:false,status:404}:{ok:true,json:[]}})});
test('No token cannot silently keep a Cloudflare label',async()=>{await assert.rejects(alignPreviewLabel({...base,route:'netlify',token:'',pr:{number:88,labels:[{name:'cloudflare'}]}}),/No push performed/)});
test('Verification error stops push',async()=>{let calls=0;await assert.rejects(alignPreviewLabel({...base,route:'cloudflare',api:async()=>++calls===1?{ok:true}:{ok:false,status:503}}),/No push performed/)});
