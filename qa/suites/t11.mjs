import { chromium } from 'playwright';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const OUT = process.env.QA_OUT || mkdtempSync(join(tmpdir(), 'qa-'));
const ORIGIN = process.env.QA_BASE || 'http://localhost:8123';
const BASE = ORIGIN + '/chess-clock/';
const results = [];
const rec = (n, ok, d='') => { results.push([n,ok]); console.log((ok?'PASS':'FAIL')+' | '+n+(d?' | '+d:'')); };
const browser = await chromium.launch({channel:'chrome'});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.goto(BASE, { waitUntil: 'networkidle' });
// start a game
await page.evaluate(() => chessClock.start());
await page.waitForTimeout(300);
// bar rows incl. status at 390px
const rows390 = await page.evaluate(() => {
  const items = [...document.querySelectorAll('.bar > *')];
  const rows = {};
  items.forEach(b => { const t = Math.round(b.getBoundingClientRect().top / 8); rows[t] = (rows[t] || 0) + 1; });
  return Object.values(rows).sort();
});
rec('bar two balanced rows of three at 390px (incl. status)', JSON.stringify(rows390) === '[3,3]', JSON.stringify(rows390));
// sheet screenshot with new layout
await page.click('#settings-btn');
await page.waitForTimeout(400);
await page.screenshot({ path: join(OUT,'cc111b-sheet2.png') });
await page.click('#sheet-close');
await page.waitForTimeout(400);
// confirmation beep: tap sound toggle (currently sound on by default) -> forced beep before muting; audio ctx must be running
await page.tap('#sound-toggle');
await page.waitForTimeout(200);
const st1 = await page.evaluate(() => chessClock.getState());
rec('bar tap mutes + audio context running (beep path exercised)', st1.settings.sound === 'off' && st1.audio === 'running', JSON.stringify({ sound: st1.settings.sound, audio: st1.audio }));
// unpause: pause then tap player 1 side
await page.tap('#pause-btn');
await page.tap('#p1');
rec('tap either side unpauses', (await page.evaluate(() => chessClock.getState())).phase === 'running');
// reset while running: confirm then ready
await page.tap('#p2'); // switch to p2 active first
await page.waitForTimeout(200);
await page.tap('#reset-btn');
const armed = await page.evaluate(() => document.getElementById('reset-btn').classList.contains('confirm'));
const phaseAfterOne = await page.evaluate(() => chessClock.getState().phase);
await page.tap('#reset-btn');
const phaseAfterTwo = await page.evaluate(() => chessClock.getState().phase);
rec('reset while running: one tap arms confirm (still running), second resets to ready', armed && phaseAfterOne === 'running' && phaseAfterTwo === 'ready', `armed=${armed} one=${phaseAfterOne} two=${phaseAfterTwo}`);
// persistence across reload
await page.evaluate(() => { document.getElementById('name-p1').value = ''; chessClock.changeTime(); });
await page.waitForTimeout(200);
await page.fill('#name-p1', 'Luca');
await page.evaluate(() => document.querySelector('#setup-moves-chips [data-moves-pick="on"]').click());
await page.reload({ waitUntil: 'networkidle' });
const pers = await page.evaluate(() => ({ name: document.getElementById('name-p1').value, moves: JSON.parse(localStorage.getItem('chess-clock-settings')).moves, sound: JSON.parse(localStorage.getItem('chess-clock-settings')).sound }));
rec('names + moves + sound persist after reload', pers.name === 'Luca' && pers.moves === 'on' && pers.sound === 'off', JSON.stringify(pers));
// offline reload
const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
const p2 = await ctx2.newPage();
await p2.goto(BASE, { waitUntil: 'networkidle' });
await p2.waitForTimeout(600);
await p2.context().setOffline(true);
const r = await p2.reload().catch(() => null);
const offOk = r && r.status() === 200 && await p2.evaluate(() => !!document.getElementById('start-btn'));
rec('offline reload works (SW v3)', !!offOk);
// og:image resolution on the LOCAL serve (file name check against repo layout)
const og = await page.evaluate(() => document.querySelector('meta[property="og:image"]').content);
const localResp = await page.request.get(ORIGIN + new URL(og).pathname);
rec('og:image path exists in build', localResp.status() === 200, `${og} -> ${localResp.status()}`);
rec('no page errors throughout', errors.length === 0, errors.join(';'));
await browser.close();
const fails = results.filter(r => !r[1]);
console.log('=== ' + results.length + ' checks, ' + fails.length + ' failed');
