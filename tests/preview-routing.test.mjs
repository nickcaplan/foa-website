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
import {selectNetlifyAccount,readPreviewPullRequest,choosePreviewProvider} from '../scripts/preview-config.mjs';
import{mkdtempSync,writeFileSync,rmSync}from'node:fs';import{tmpdir}from'node:os';import{join}from'node:path';import{execFileSync}from'node:child_process';
test('team selection does not depend on API ordering',()=>{assert.equal(selectNetlifyAccount([{slug:'other',id:'1'},{slug:'nickcaplan',id:'2'}],'nickcaplan'),'2');assert.throws(()=>selectNetlifyAccount([],'nickcaplan'))});
test('failed PR lookup differs from an empty successful lookup',()=>{assert.throws(()=>readPreviewPullRequest({ok:false,status:503}));assert.equal(readPreviewPullRequest({ok:true,json:[]}),null)});
test('Cloudflare requires quota threshold and confirmed readiness',()=>{assert.equal(choosePreviewProvider(250,240,false),'netlify');assert.equal(choosePreviewProvider(250,240,true),'cloudflare');assert.equal(choosePreviewProvider(170,240,true),'netlify')});
test('message-only amend preserves tree and staged files',()=>{
const dir=mkdtempSync(join(tmpdir(),'preview-amend-'));const git=(...args)=>execFileSync('git',args,{cwd:dir,encoding:'utf8'}).trim();
try{git('init','-q');git('config','user.name','test');git('config','user.email','test@example.invalid');writeFileSync(join(dir,'file'),'initial');git('add','file');git('commit','-qm','initial');const tree=git('rev-parse','HEAD^{tree}');writeFileSync(join(dir,'file'),'staged');git('add','file');git('commit','--amend','--only','-m','[CF-Pages-Skip] initial');assert.equal(git('rev-parse','HEAD^{tree}'),tree);assert.equal(git('show',':file'),'staged')}finally{rmSync(dir,{recursive:true,force:true})}
});
