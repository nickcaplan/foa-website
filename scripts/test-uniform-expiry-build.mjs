import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {pathToFileURL} from 'node:url';import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';
const dir=await mkdtemp(join(tmpdir(),'uniform-expiry-'));
try {
 for(const date of ['2026-12-04T15:26:00Z','2026-12-05T10:00:00Z']) {
  const preload=join(dir,'clock.mjs');await writeFile(preload,`const OriginalDate=Date;const now=${Date.parse(date)};globalThis.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}};`);
  execFileSync('npm',['run','build','--','--outDir',join(dir,'site')],{stdio:'pipe',env:{...process.env,NODE_OPTIONS:`${process.env.NODE_OPTIONS??''} --import=${pathToFileURL(preload)}`}});
  const html=await readFile(join(dir,'site/uniform/index.html'),'utf8'),after=date.startsWith('2026-12-05');
  const card=html.match(/<div class="christmas-sale"[^>]*>/)?.[0];assert.ok(card);assert.equal(/\shidden(?:[\s>])/.test(card),after);
  const normal=html.match(/<div class="uniform-everyday"[^>]*>/)?.[0];assert.ok(normal);assert.equal(/\shidden(?:[\s>])/.test(normal),!after);
  const image=html.match(/property="og:image" content="([^"]+)"/)?.[1];assert.ok(image?.endsWith(after?'/brand/foa-logo-og.png':'/social/uniform-christmas-jumpers-2026-v1.jpg'));
  const description=html.match(/name="description" content="([^"]+)"/)?.[1];assert.equal(description?.includes('Christmas jumpers'),!after);
  const reps=await readFile(join(dir,'site/reps/index.html'),'utf8');assert.equal(reps.includes('Christmas jumper donations wanted'),!after);
  console.log(`Build at ${date}: Uniform visibility, evergreen/festive metadata and Reps expiry pass`);
 }
} finally { await rm(dir, { recursive: true, force: true }); }
