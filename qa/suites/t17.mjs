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
await page.screenshot({ path: join(OUT,'h-setup.png') });
// all four presets update the readout (hero clock + summary/play area)
const readouts = [];
for (const p of ['1,0', '3,2', '5,0', '10,3']) {
  await page.click(`#preset-tiles [data-preset="${p}"]`);
  await page.waitForTimeout(200);
  const r = await page.evaluate(() => ({
    hero: document.querySelector('.setup-clock')?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 40) || document.getElementById('setup-view').textContent.match(/\d+[:+]\d+/g)?.join(' '),
    summary: (document.querySelector('.play-summary, [class*="summary"]')?.textContent || '').trim() }));
  readouts.push({ p, ...r });
}
rec('all four presets update readouts', readouts.every((r, i) => JSON.stringify(r).includes(['1','3','5','10'][i])), JSON.stringify(readouts));
// custom time: open Custom time disclosure, change minutes/inc, check readout updates
const custom = await page.evaluate(() => {
  const d = [...document.querySelectorAll('details.disclosure, .disclosure')].find(x => /custom/i.test(x.textContent));
  return !!d;
});
await page.evaluate(() => { const d = [...document.querySelectorAll('.disclosure summary, summary')].find(x => /custom/i.test(x.textContent)); d?.click(); });
await page.waitForTimeout(300);
const customInputs = await page.evaluate(() => [...document.querySelectorAll('#setup-view input[type="number"], #setup-view select')].map(i => i.id || i.name));
if (customInputs.length >= 2) {
  await page.evaluate(() => { const mins = document.querySelector('#custom-minutes, [id*="minute"]'); if (mins) { mins.value = '7'; mins.dispatchEvent(new Event('change', { bubbles: true })); mins.dispatchEvent(new Event('input', { bubbles: true })); } });
  await page.waitForTimeout(200);
}
const customReadout = await page.evaluate(() => document.getElementById('setup-view').textContent.match(/7\s*(min|\+)/g)?.join(' '));
rec('custom time updates readout', customInputs.length > 0 && !!customReadout, JSON.stringify({ customInputs, customReadout }));
// game starts and runs
await page.fill('#name-p1', 'Luca');
await page.click('#start-btn');
await page.waitForTimeout(400);
await page.click('#p1'); await page.waitForTimeout(1500);
const running = await page.evaluate(() => { const s = chessClock.getState(); return { phase: s.phase, active: s.active }; });
rec('game starts and runs', running.phase === 'running', JSON.stringify(running));
// settings open
await page.click('#settings-btn'); await page.waitForTimeout(300);
rec('settings sheet opens', await page.evaluate(() => !!document.querySelector('#settings-sheet [role="dialog"], .sheet-backdrop [class*="sheet"]')));
await page.screenshot({ path: join(OUT,'h-sheet.png') });
await page.click('#sheet-close'); await page.waitForTimeout(300);
// 320px + 200% root text on setup
await page.evaluate(() => chessClock.changeTime());
await page.setViewportSize({ width: 320, height: 700 });
await page.waitForTimeout(300);
await page.evaluate(() => document.documentElement.style.setProperty('font-size', '200%', 'important'));
await page.waitForTimeout(400);
const fit = await page.evaluate(() => {
  const bad = [...document.querySelectorAll('.setup button, .setup input, .tile')].filter(b => b.scrollWidth > b.clientWidth + 1).map(b => b.textContent.trim().slice(0, 20));
  return { bad, side: document.documentElement.scrollWidth > innerWidth + 0.5 };
});
await page.screenshot({ path: join(OUT,'h-setup-320-200.png'), fullPage: true });
rec('setup fits at 320px 200% root text', fit.bad.length === 0 && !fit.side, JSON.stringify(fit));
rec('no page errors', errs.length === 0, errs.join(';'));
await browser.close();
console.log('=== ' + results.length + ' checks, ' + results.filter(r => !r[1]).length + ' failed');
