import { chromium } from 'playwright';
const base = process.env.QA_BASE || 'http://localhost:8191';
const b = await chromium.launch({channel:'chrome'});
const LONG = 'Alessandro Maximilian';  // 21 chars
let fail = 0;
const els = ['#p1 .side', '#p1 .pname', '#p1 .mv', '#p1 .time', '#p1 .note', '#p1 .turn-pill', '#p1 .result',
             '#p2 .side', '#p2 .pname', '#p2 .mv', '#p2 .time', '#p2 .note', '#p2 .turn-pill', '#p2 .result'];
for (const counter of ['off', 'on']) {
  for (const [width, height] of [[320, 900], [390, 900], [320, 740]]) {
    for (const font200 of [false, true]) {
      for (const loser of ['p2', 'p1']) {
        const p = await b.newPage({ viewport: { width, height } });
        const errs = [];
        p.on('pageerror', e => errs.push(String(e).slice(0, 80)));
        await p.goto(base + '/chess-clock/');
        await p.waitForFunction(() => window.chessClock);
        await p.evaluate(() => localStorage.clear());
        await p.goto(base + '/chess-clock/');
        await p.waitForFunction(() => window.chessClock);
        if (font200) await p.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
        await p.evaluate((n) => { document.getElementById('name-p1').value = n; document.getElementById('name-p1').dispatchEvent(new Event('input')); document.getElementById('name-p2').value = n; document.getElementById('name-p2').dispatchEvent(new Event('input')); }, LONG);
        await p.evaluate(() => chessClock.start());
        if (counter === 'on') {
          await p.locator('#settings-btn').click();
          await p.waitForTimeout(400);
          await p.evaluate(() => { const s = document.getElementById('settings-sheet'); [...s.querySelectorAll('button[data-moves-pick="on"]')].find(x => x.offsetParent)?.click(); });
          await p.locator('#sheet-resume').click();
          await p.waitForTimeout(250);
        }
        const snap = () => p.evaluate((sel) => sel.map((s) => {
          const e = document.querySelector(s);
          if (!e) return [s, null];
          const r = e.getBoundingClientRect();
          const card = e.closest('.player').getBoundingClientRect();
          return [s, Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height), Math.round(r.x + r.width / 2), Math.round(r.y - card.y)];
        }), els);
        await p.waitForTimeout(250);
        const ready = await snap();
        await p.evaluate((l) => chessClock.press(l === 'p2' ? 'p1' : 'p2'), loser);
        await p.waitForTimeout(150);
        const running = await snap();
        await p.evaluate(() => chessClock.pause());
        await p.waitForTimeout(150);
        const paused = await snap();
        await p.evaluate((l) => { chessClock.resume(); chessClock.setRemainingMs(l, 600); }, loser);
        await p.waitForFunction((l) => chessClock.getState().phase === 'ended', loser, { timeout: 8000 });
        const ended = await snap();
        // judge: text labels (.pname, .time) by centre-x, y, height; others by full rect
        const stable = (a, c) => a.every((row, i) => {
          const [s, ax, ay, aw, ah, acx, acy] = row, [, bx, by, bw, bh, bcx, bcy] = c[i];
          if (s.includes('.pname') || s.includes('.time') || s.includes('.mv')) return ay === by && ah === bh && acx === bcx;
          return ax === bx && ay === by && aw === bw && ah === bh;
        });
        const tag = `counter=${counter} ${width}px font200=${font200} loser=${loser}`;
        const ok = stable(ready, running) && stable(ready, paused) && stable(ready, ended);
        if (!ok) { fail++; console.log(`${tag}: UNSTABLE`); for (let i = 0; i < els.length; i++) { if (!stable([ready[i]], [running[i]])) console.log('  DIFF running', JSON.stringify(ready[i]), '->', JSON.stringify(running[i])); if (!stable([ready[i]], [ended[i]])) console.log('  DIFF ended', JSON.stringify(ready[i]), '->', JSON.stringify(ended[i])); } }
        else console.log(`${tag}: stable, errors=${errs.length}`);
        await p.close();
      }
    }
  }
}
console.log(fail ? `FAILURES ${fail}` : 'ALL STABLE (16 configs)');
await b.close(); process.exit(0);
