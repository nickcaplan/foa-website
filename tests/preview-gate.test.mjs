import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {shouldBuild} from '../scripts/netlify-ignore.mjs';
const route = createRequire(import.meta.url)('../scripts/preview-branch.cjs');
const sha = 'a'.repeat(40), old = 'b'.repeat(40), repo = 'nickcaplan/foa-website';
function pr(labels = [], extra = {}) {return {number: 12, state: 'open', base: {ref: 'main', repo: {full_name: repo}}, head: {sha, repo: {full_name: repo}}, labels: labels.map(name => ({name})), ...extra};}
const env = {CONTEXT:'deploy-preview', PULL_REQUEST:'true', REVIEW_ID:'12'};
for (const labels of [[], ['preview'], ['netlify'], ['preview','cloudflare'], ['preview','netlify','cloudflare'], ['preview','netlify']]) {
  test(`Netlify only accepts explicit provider: ${labels}`, async () => {
    assert.equal(await shouldBuild(env, async () => ({ok:true, json:async()=>pr(labels)})), labels.length === 2 && labels.includes('netlify'));
  });
}
for (const invalid of [{}, {...env, CONTEXT:'branch-deploy'}, {...env, PULL_REQUEST:'false'}, {...env, REVIEW_ID:'12/other'}, {...env, REVIEW_ID:undefined}]) {
  test(`missing or invalid context skips ${JSON.stringify(invalid)}`, async () => assert.equal(await shouldBuild(invalid, () => {throw Error('must not fetch');}), false));
}
for (const request of [async()=>{throw Error('network');}, async()=>({ok:false,status:403}), async()=>({ok:true,json:async()=>{throw Error('bad json');}}), async()=>({ok:true,json:async()=>({})}), async()=>({ok:true,json:async()=>pr(['preview','netlify'],{state:'closed'})}), async()=>({ok:true,json:async()=>pr(['preview','netlify'],{number:13})})]) {
  test('Netlify unknown or stale response skips', async () => assert.equal(await shouldBuild(env, request), false));
}
test('real ignore process exits zero without context', () => assert.equal(spawnSync(process.execPath,['scripts/netlify-ignore.mjs'],{env:{PATH:process.env.PATH}}).status,0));
function harness(p = pr(), refs = [], latest = p) {
  const writes = []; let reads = 0;
  const github = {paginate:async()=>refs, rest:{pulls:{get:async()=>({data:reads++ ? latest : p})},git:{
    listMatchingRefs(){}, getCommit:async()=>({data:{tree:{sha:'tree-exact'}}}),
    createCommit:async x=>{writes.push(['commit',x]);return {data:{sha:'wrapper'}};},
    createRef:async x=>writes.push(['create',x]), deleteRef:async x=>writes.push(['delete',x]),
  }}};
  return {writes, run:()=>route({github,context:{repo:{owner:'nickcaplan',repo:'foa-website'},payload:{pull_request:{number:12}}},core:{info(){}}})};
}
for (const p of [pr(), pr(['netlify']), pr(['preview','netlify']), pr(['preview'],{state:'closed'}), pr(['preview'],{head:{sha,repo:{full_name:'other/fork'}}}), pr(['preview'],{base:{ref:'other'}})]) {
  test('no consent, alternate provider, closed or fork: no build',async()=>{const h=harness(p);await h.run();assert.deepEqual(h.writes,[]);});
}
test('label: exactly one wrapper and ref, original tree and parent unchanged',async()=>{
  const h=harness(pr(['preview']));await h.run();assert.equal(h.writes.length,2);
  assert.equal(h.writes[0][1].tree,'tree-exact');assert.deepEqual(h.writes[0][1].parents,[sha]);
  assert.match(h.writes[0][1].message,/^Preview PR #12/);assert.equal(h.writes[1][1].ref,`refs/heads/preview/pr-12/${sha}`);
});
test('repeat event for same head: no second build',async()=>{const h=harness(pr(['preview']),[{ref:`refs/heads/preview/pr-12/${sha}`}]);await h.run();assert.deepEqual(h.writes,[]);});
test('new head builds once, then deletes only old controlled ref',async()=>{
  const h=harness(pr(['preview']),[{ref:`refs/heads/preview/pr-12/${old}`},{ref:'refs/heads/preview/pr-123/foreign'}]);await h.run();
  assert.deepEqual(h.writes.map(x=>x[0]),['commit','create','delete']);assert.equal(h.writes[2][1].ref,`heads/preview/pr-12/${old}`);
});
test('unlabel removes controlled refs without creating a preview',async()=>{
  const h=harness(pr(),[{ref:`refs/heads/preview/pr-12/${old}`}]);await h.run();assert.deepEqual(h.writes.map(x=>x[0]),['delete']);
});
for (const latest of [pr(),pr(['preview','netlify']),pr(['preview'],{state:'closed'}),pr(['preview'],{head:{sha:old,repo:{full_name:repo}}})]) {
 test('consent/head changes during API calls prevent publication',async()=>{const h=harness(pr(['preview']),[],latest);await h.run();assert.deepEqual(h.writes.map(x=>x[0]),['commit']);});
}
test('workflow uses trusted code, pinned actions and serial per-PR execution',()=>{
 const s=readFileSync('.github/workflows/preview-on-label.yml','utf8');assert.match(s,/pull_request_target:/);assert.match(s,/persist-credentials: false/);assert.match(s,/cancel-in-progress: false/);assert.doesNotMatch(s,/ref:.*head|git push|--force/);assert.equal((s.match(/uses: .*@[a-f0-9]{40}/g)||[]).length,2);
});
test('retired router cannot amend, force-push or change labels',()=>{
 const s=readFileSync('scripts/preview-route.mjs','utf8');assert.doesNotMatch(s,/--amend|--force|fetch\(|alignPreviewLabel|NETLIFY_TOKEN/);assert.match(s,/startsWith\('\[CF-Pages-Skip\]'\)/);
});
test('live PR lookup failure stops before any preview writes',async()=>{
 let writes=0;const github={rest:{pulls:{get:async()=>{throw Error('API unavailable');}}},paginate:async()=>{writes++;}};
 await assert.rejects(route({github,context:{repo:{owner:'nickcaplan',repo:'foa-website'},payload:{pull_request:{number:12}}},core:{info(){}}}));assert.equal(writes,0);
});
