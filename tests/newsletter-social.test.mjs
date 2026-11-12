import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';

test('newsletter social metadata follows the configured latest issue',async()=>{
 const issues=await Promise.all((await readdir('src/content/newsletters')).filter(f=>f.endsWith('.json')).map(async f=>JSON.parse(await readFile(`src/content/newsletters/${f}`,'utf8'))));
 const latest=issues.find(i=>i.latest);assert.ok(latest?.published);
 const date=new Date(latest.published);
 const day=date.getUTCDate();const suffix=day>=11&&day<=13?'th':({1:'st',2:'nd',3:'rd'}[day%10]??'th');
 const formatted=new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'}).formatToParts(date).map(p=>p.type==='day'?`${p.value}${suffix}`:p.value).join('');
 const html=await readFile('dist/newsletter/index.html','utf8');
 const escape=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
 for(const key of ['og:title','twitter:title'])assert.ok(html.includes(`${key}" content="${escape(formatted+' Newsletter | The Friends of Ashley')}"`),key);
 for(const key of ['og:description','twitter:description'])assert.match(html,new RegExp(`(?:property|name)="${key}" content="${escape(latest.summary)}"`));
 const site=(process.env.SITE_URL||'https://www.thefriendsofashley.org').replace(/\/$/,'');
 const base=(process.env.BASE_PATH||'/').replace(/\/$/,'');
 assert.ok(html.includes(`<link rel="canonical" href="${site}${base}/newsletter/"`));
 assert.ok(html.includes(`<meta property="og:image" content="${site}${base}/brand/foa-logo-og.png"`));
});
