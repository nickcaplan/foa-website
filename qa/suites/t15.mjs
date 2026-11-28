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
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.click('#start-btn'); await page.waitForTimeout(300);
await page.click('#p1'); await page.waitForTimeout(300);
await page.evaluate(() => chessClock.setRemainingMs('p2', 2500));
await page.click('#p1'); await page.waitForTimeout(3500);
// loser flag text visible (not just in DOM)
const flag = await page.evaluate(() => {
  const p2 = document.getElementById('p2');
  const r = [...p2.querySelectorAll('.result')][0];
  const cs = r ? getComputedStyle(r) : null;
  return { phase: chessClock.getState().phase, loserVis: cs?.visibility, loserText: r?.textContent.trim().slice(0, 40), h: r ? Math.round(r.getBoundingClientRect().height) : 0 };
});
rec('loser flag-fall text visible', flag.phase === 'ended' && flag.loserVis === 'visible' && flag.h > 0, JSON.stringify(flag));
await page.screenshot({ path: join(OUT,'g2-flag.png') });
// ended bar at 320px, root-200 and element-200: Play again / Change time full width, no clipping
for (const mode of ['root', 'elements']) {
  await page.setViewportSize({ width: 320, height: 700 });
  if (mode === 'root') await page.evaluate(() => document.documentElement.style.setProperty('font-size', '200%', 'important'));
  else await page.evaluate(() => { const els = [...document.querySelectorAll('body *')]; const s = els.map(e => parseFloat(getComputedStyle(e).fontSize)); els.forEach((e, i) => e.style.setProperty('font-size', `${s[i] * 2}px`, 'important')); });
  await page.waitForTimeout(400);
  const bar = await page.evaluate(() => {
    const again = document.getElementById('again-btn');
    const change = document.getElementById('bar-change');
    const bad = [again, change].filter(b => b && (b.scrollWidth > b.clientWidth + 1 || b.getBoundingClientRect().width < document.querySelector('.bar').getBoundingClientRect().width - 24));
    return { bad: bad.map(b => b.textContent.trim()), side: document.documentElement.scrollWidth > innerWidth + 0.5, againW: Math.round(again.getBoundingClientRect().width) };
  });
  rec(`ended bar full-width, no clipping at 320px ${mode}-doubled`, bar.bad.length === 0 && !bar.side, JSON.stringify(bar));
  await page.screenshot({ path: join(OUT,`g2-end-320-${mode}.png`) });
  await page.evaluate(() => document.documentElement.style.removeProperty('font-size'));
}
// earlier holds: setup, presets, moves counts, paused label, sheet New game, persistence
await page.setViewportSize({ width: 390, height: 844 });
await page.evaluate(() => { localStorage.removeItem('chess-clock-game'); });
await page.reload({ waitUntil: 'networkidle' });
await page.evaluate(() => { if (!document.getElementById('setup-view') || document.getElementById('setup-view').offsetParent === null) chessClock.changeTime(); });
await page.waitForTimeout(300);
const setup = await page.evaluate(() => ({ playTop: Math.round(document.getElementById('start-btn').getBoundingClientRect().top), tiles: document.querySelectorAll('#preset-tiles [data-preset]').length }));
rec('setup intact: Play at top, 4 presets', setup.playTop < 400 && setup.tiles === 4, JSON.stringify(setup));
await page.fill('#name-p1', 'Luca');
await page.click('#start-btn'); await page.waitForTimeout(300);
await page.click('#p1'); await page.waitForTimeout(300);
await page.click('#pause-btn'); await page.waitForTimeout(200);
const paused = await page.evaluate(() => /paused|tap to resume/i.test(document.getElementById('p1').textContent));
await page.click('#p2'); await page.waitForTimeout(200);
rec('paused label + tap to resume', paused && (await page.evaluate(() => chessClock.getState().phase)) === 'running');
await page.click('#settings-btn'); await page.waitForTimeout(300);
const sheet = await page.evaluate(() => ({ newGame: [...document.querySelectorAll('#settings-sheet button')].some(b => /^New game/.test(b.textContent.trim())), resetInSheet: !!document.querySelector('#settings-sheet #reset-btn, #settings-sheet .sheet-danger'), helper: !!document.querySelector('.sheet .hint') }));
rec('sheet: New game label, reset in sheet, no helper', sheet.newGame && sheet.resetInSheet && !sheet.helper, JSON.stringify(sheet));
await page.click('#sheet-close'); await page.waitForTimeout(200);
await page.evaluate(() => chessClock.changeTime());
await page.waitForTimeout(200);
await page.evaluate(() => { localStorage.removeItem('chess-clock-game'); });
await page.reload({ waitUntil: 'networkidle' });
const pers = await page.evaluate(() => ({ name: document.getElementById('name-p1').value, sound: JSON.parse(localStorage.getItem('chess-clock-settings') || '{}').sound !== undefined }));
rec('persistence after reload', pers.name === 'Luca' && pers.sound);
const og = await page.evaluate(() => document.querySelector('meta[property="og:image"]').content);
rec('og:image resolves', (await page.request.get(ORIGIN + new URL(og).pathname)).status() === 200);
rec('no page errors', errs.length === 0, errs.join(';'));
await browser.close();
console.log('=== ' + results.length + ' checks, ' + results.filter(r => !r[1]).length + ' failed');
