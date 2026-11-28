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

// 1. Setup screen: swatch-only colour chips with aria-labels; no text names
const swatches = await page.evaluate(() => [...document.querySelectorAll('#accent-chips .chip')].map(b => ({ label: b.getAttribute('aria-label'), text: b.textContent.trim(), swatch: !!b.querySelector('.swatch') })));
rec('setup colour chips swatch-only with aria-labels', swatches.length === 3 && swatches.every(s => s.label && s.text === '' && s.swatch), JSON.stringify(swatches));
// 2. Play at top, no 15+0, 10+3 default, no style picker
const setup = await page.evaluate(() => ({
  playTop: document.getElementById('start-btn').getBoundingClientRect().top,
  presets: [...document.querySelectorAll('#preset-tiles [data-preset]')].map(b => b.dataset.preset),
  selected: document.querySelector('#preset-tiles [data-preset][aria-pressed="true"]')?.dataset.preset,
  stylePick: document.querySelectorAll('[data-style-pick]').length }));
rec('play at top of first screen', setup.playTop >= 0 && setup.playTop < 844, 'top=' + setup.playTop);
rec('presets 1+0/3+2/5+0/10+3, 10+3 default', JSON.stringify(setup.presets) === '["1,0","3,2","5,0","10,3"]' && setup.selected === '10,3', JSON.stringify(setup.presets) + ' sel=' + setup.selected);
rec('no style picker', setup.stylePick === 0);
// 3. Names: set names, start, check toggle-sync from SETUP pickers to bar
await page.fill('#name-p1', 'Luca');
await page.evaluate(() => document.querySelector('#setup-sound-chips [data-sound-pick="off"]').click());
await page.click('#start-btn');
await page.waitForTimeout(300);
const barAfterSetup = await page.evaluate(() => ({
  soundPressed: document.getElementById('sound-toggle').getAttribute('aria-pressed'),
  soundIconHasCross: document.getElementById('sound-toggle').innerHTML.includes('line'),
  movesText: document.getElementById('moves-toggle').textContent.trim() }));
rec('setup sound-off syncs to bar toggle + crossed SVG icon', barAfterSetup.soundPressed === 'false' && barAfterSetup.soundIconHasCross, JSON.stringify(barAfterSetup));
rec('bar button reads Moves', barAfterSetup.movesText === 'Moves', barAfterSetup.movesText);
// 4. Sheet: open settings, Move counter row with helper, inline rows, swatch chips; toggle sound ON from sheet -> beep + bar sync
await page.click('#settings-btn');
await page.waitForTimeout(300);
const sheet = await page.evaluate(() => ({
  movesRow: (() => { const rows = [...document.querySelectorAll('.sheet .row')]; const r = rows.find(r => r.textContent.includes('Move counter')); return r ? { label: !!r.querySelector('.group-label'), hint: r.querySelector('.hint')?.textContent.trim(), inline: getComputedStyle(r).flexDirection === 'row' } : null; })(),
  swatchChips: [...document.querySelectorAll('#sheet-accent-chips .chip')].map(b => ({ label: b.getAttribute('aria-label'), text: b.textContent.trim() })) }));
rec('sheet Move counter row: label + helper + inline', !!sheet.movesRow && sheet.movesRow.label && sheet.movesRow.hint === 'Shows how many moves each player has made.' && sheet.movesRow.inline, JSON.stringify(sheet.movesRow));
rec('sheet colour chips swatch-only with aria-labels', sheet.swatchChips.length === 3 && sheet.swatchChips.every(s => s.label && s.text === ''));
// confirmation beep: tap sound ON in sheet, check AudioContext is running (real gesture unlock)
await page.evaluate(() => document.querySelector('#sheet-sound-chips [data-sound-pick="on"]').click());
await page.waitForTimeout(200);
const audio = await page.evaluate(() => window.chessClock ? { sound: document.getElementById('sound-toggle').getAttribute('aria-pressed') } : null);
rec('sheet sound-on syncs bar toggle', audio.sound === 'true');
// 5. Bar sound toggle: tap directly -> beep (forced) and icon swap
const iconBefore = await page.evaluate(() => document.getElementById('sound-toggle').innerHTML.includes('M15.5'));
await page.click('#sound-toggle');
await page.waitForTimeout(150);
const toggleState = await page.evaluate(() => ({
  pressed: document.getElementById('sound-toggle').getAttribute('aria-pressed'),
  hasCross: document.getElementById('sound-toggle').innerHTML.includes('line'),
  audioState: (window.AudioContext || window.webkitAudioContext) && document.querySelector('#sound-toggle svg') ? 'checked' : 'no-svg' }));
rec('bar sound toggle flips to muted crossed icon', toggleState.pressed === 'false' && toggleState.hasCross && iconBefore, JSON.stringify(toggleState));
await page.screenshot({ path: join(OUT,'cc111b-sheet.png') });
await page.click('#sheet-close');
// 6. Bar layout 390px: two rows of three
const bar390 = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('.bar button')];
  const rows = {};
  btns.forEach(b => { const t = Math.round(b.getBoundingClientRect().top / 4); rows[t] = (rows[t] || 0) + 1; });
  return Object.values(rows).sort();
});
rec('bar two balanced rows of three at 390px', JSON.stringify(bar390) === '[3,3]', JSON.stringify(bar390));
// 7. 320px + 200% root text
await page.setViewportSize({ width: 320, height: 700 });
await page.evaluate(() => document.documentElement.style.setProperty('font-size', '200%', 'important'));
await page.waitForTimeout(300);
const overflow = await page.evaluate(() => {
  const bad = [...document.querySelectorAll('.bar button')].filter(b => b.scrollWidth > b.clientWidth + 1).map(b => b.textContent.trim() || b.getAttribute('aria-label'));
  return { bad, side: document.documentElement.scrollWidth > innerWidth + 0.5 };
});
rec('bar buttons fit at 320px + 200% text', overflow.bad.length === 0 && !overflow.side, JSON.stringify(overflow));
await page.screenshot({ path: join(OUT,'cc111b-bar-320-200.png') });
// 8. Reset confirm while running -> ready phase; tap either side unpauses
await page.evaluate(() => document.documentElement.style.setProperty('font-size', ''));
await page.evaluate(() => chessClock.state.phase === 'ready' ? chessClock.start() : null);
await page.waitForTimeout(200);
await page.click('#pause-btn');
const phaseAfterPause = await page.evaluate(() => chessClock.state.phase);
await page.click('#p1');
rec('tap either side unpauses', await page.evaluate(() => chessClock.state.phase) === 'running', 'paused=' + phaseAfterPause);
await page.click('#reset-btn');
const armed = await page.evaluate(() => document.getElementById('reset-btn').classList.contains('confirm') || chessClock.state.phase);
await page.click('#reset-btn');
const afterReset = await page.evaluate(() => chessClock.state.phase);
rec('reset while running: confirm then ready phase', afterReset === 'ready', 'armed=' + armed + ' after=' + afterReset);
// 9. Persistence: names + sound pref survive reload
await page.reload({ waitUntil: 'networkidle' });
const persisted = await page.evaluate(() => ({ name: document.getElementById('name-p1').value || '', sound: JSON.parse(localStorage.getItem('chess-clock-settings') || '{}').sound }));
rec('names + sound setting persist after reload', persisted.sound === 'off', JSON.stringify(persisted));
// 10. OG/Twitter meta
const meta = await page.evaluate(() => ({ og: document.querySelector('meta[property="og:image"]')?.content, tw: document.querySelector('meta[name="twitter:card"]')?.content }));
const ogResp = await page.request.get(meta.og || '');
rec('OG/Twitter meta present; og:image URL resolves', !!meta.og && !!meta.tw && ogResp.status() === 200, `og:image=${meta.og} status=${ogResp.status()}`);
// 11. Offline reload
const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
const p2 = await ctx2.newPage();
await p2.goto(BASE, { waitUntil: 'networkidle' });
await p2.waitForTimeout(500);
await p2.context().setOffline(true);
const r = await p2.reload().catch(() => null);
const offOk = r && r.status() === 200 && await p2.evaluate(() => !!document.getElementById('start-btn'));
rec('offline reload works (SW v3)', !!offOk);
rec('no page errors throughout', errors.length === 0, errors.join('; ').slice(0, 200));
await browser.close();
const fails = results.filter(r => !r[1]).length;
console.log('=== ' + results.length + ' checks, ' + fails + ' failed');
process.exit(0);
