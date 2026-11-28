import { chromium } from 'playwright';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const OUT = process.env.QA_OUT || mkdtempSync(join(tmpdir(), 'qa-'));
const base = process.env.QA_BASE || 'http://localhost:8123';
const b = await chromium.launch({channel:'chrome'});
const sel = '#sheet-reset, #sheet-change-time, #sheet-close, #sheet-resume';
const boxes = (p) => p.evaluate((s) => [...document.querySelectorAll(s)].filter(e => e.offsetParent).map((b) => {
  const r = b.getBoundingClientRect();
  return [b.id, Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
}), sel);
let failures = 0;
for (const width of [320, 390]) {
  for (const font200 of [false, true]) {
    const p = await b.newPage({ viewport: { width, height: 900 } });
    const errs = [];
    p.on('pageerror', e => errs.push(String(e).slice(0, 80)));
    await p.goto(base + '/chess-clock/');
    if (font200) await p.addStyleTag({ content: 'html { font-size: 200% !important; }' });
    await p.evaluate(() => { localStorage.clear(); chessClock.start(); chessClock.press('p1'); });
    await p.locator('#settings-btn').click();
    await p.waitForTimeout(600);
    const tag = `${width}px font200=${font200}`;
    const dflt = await boxes(p);
    // arm reset
    await p.locator('#sheet-reset').click();
    const armedR = await boxes(p);
    // arm change-time too
    await p.locator('#sheet-change-time').click();
    const armedBoth = await boxes(p);
    // wait for disarm (3s timer)
    await p.waitForTimeout(3400);
    const disarmed = await boxes(p);
    const eq = (a, b2) => JSON.stringify(a) === JSON.stringify(b2);
    const r1 = eq(dflt, armedR), r2 = eq(dflt, armedBoth), r3 = eq(dflt, disarmed);
    if (!r1 || !r2 || !r3) failures++;
    console.log(`${tag}: default==armedReset ${r1}, ==armedBoth ${r2}, ==disarmed ${r3}, errors=${errs.length}`);
    if (!r1 || !r2) { console.log('  default:', JSON.stringify(dflt)); console.log('  armedBoth:', JSON.stringify(armedBoth)); }
    // sibling size consistency: reset vs change-time chips
    const [reset, change] = dflt;
    console.log(`  siblings: reset ${reset[3]}x${reset[4]} vs change-time ${change[3]}x${change[4]} -> ${reset[3]===change[3] && reset[4]===change[4] ? 'consistent' : 'DIFFER'}`);
    // sheet itself must not resize
    const sheetBox = await p.evaluate(() => { const r = document.querySelector('.sheet').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; });
    console.log(`  sheet: ${sheetBox[0]}x${sheetBox[1]}`);
    if (width === 320 && font200) await p.screenshot({ path: join(OUT,'p119-sheet-320-200.png') });
    await p.close();
  }
}
console.log(failures ? `FAILURES: ${failures}` : 'ALL STABLE');
await b.close(); process.exit(0);
