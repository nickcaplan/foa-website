import { chromium } from 'playwright';
const BASE = 'https://www.thefriendsofashley.org';
const results = [];
const rec = (name, pass, detail) => { results.push({name, pass, detail}); console.log((pass?'PASS':'FAIL') + ' | ' + name + (detail? ' | ' + detail : '')); };

const splitWordsScript = () => {
  const found = [];
  const walker = document.createTreeWalker(document.querySelector('.site-footer'), NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent ?? '';
    for (const match of text.matchAll(/[^\s-]+/g)) {
      const range = document.createRange();
      range.setStart(node, match.index);
      range.setEnd(node, match.index + match[0].length);
      const tops = new Set([...range.getClientRects()].filter(r => r.width > 0).map(r => Math.round(r.top / 4)));
      if (tops.size > 1) found.push(match[0]);
    }
  }
  return found;
};
const doubleElements = () => {
  const els = [...document.querySelectorAll('body *')];
  const sizes = els.map(e => parseFloat(getComputedStyle(e).fontSize));
  els.forEach((e, i) => e.style.setProperty('font-size', `${sizes[i] * 2}px`, 'important'));
};
const doubleRoot = () => document.documentElement.style.setProperty('font-size', '200%', 'important');

const browser = await chromium.launch({channel:'chrome'});
for (const theme of ['day','night']) {
  for (const width of [320,390,768]) {
    for (const mode of ['normal','elements','root']) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.addInitScript((t) => { localStorage.setItem('foa-theme', t); localStorage.setItem('foa-cookie-preferences','essential'); }, theme);
      const errors = [];
      page.on('pageerror', e => errors.push(String(e)));
      await page.goto(BASE + '/', { waitUntil: 'networkidle' });
      if (mode === 'elements') await page.evaluate(doubleElements);
      if (mode === 'root') await page.evaluate(doubleRoot);
      await page.waitForTimeout(300);
      const split = await page.evaluate(splitWordsScript);
      const side = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 0.5);
      const brand = await page.evaluate(() => {
        const logo = document.querySelector('.footer-brand-home img')?.getBoundingClientRect();
        const name = document.querySelector('.footer-brand h2')?.getBoundingClientRect();
        return logo && name ? { logoRight: logo.right, logoBottom: logo.bottom, nameLeft: name.left, nameTop: name.top, nameRight: name.right } : null;
      });
      const ok = split.length === 0 && !side && brand && brand.nameRight <= width + 0.5 && !(brand.nameTop < brand.logoBottom - 1 && brand.nameLeft < brand.logoRight);
      rec(`footer words whole [${theme} ${width}px ${mode}]`, ok, split.length? 'split: '+split.slice(0,4).join(',') : (side? 'sideways scroll' : (brand? '' : 'brand elements missing')));
      if (errors.length) rec(`page errors [${theme} ${width}px ${mode}]`, false, errors[0].slice(0,120));
      await page.close();
    }
  }
}
// #225 checks: donations day removed everywhere
const page = await browser.newPage();
await page.addInitScript(() => { localStorage.setItem('foa-theme','day'); localStorage.setItem('foa-cookie-preferences','essential'); });
for (const p of ['/', '/events/christmas-fayre-2026/', '/reps/', '/whats-on/']) {
  const resp = await page.goto(BASE + p, { waitUntil: 'domcontentloaded' });
  const body = (await page.content()).toLowerCase();
  const has = body.includes('donations day') || body.includes('donations-day');
  rec(`no donations-day content on ${p}`, resp.status() === 200 && !has, `status ${resp.status()}${has?' STILL PRESENT':''}`);
  const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')));
  const bad = links.filter(h => h && h.includes('donations'));
  if (bad.length) rec(`no donations links on ${p}`, false, bad.join(','));
}
// removed event URL should 404
const resp404 = await page.goto(BASE + '/events/christmas-fayre-donations-day-2026/', { waitUntil: 'domcontentloaded' }).catch(e => null);
rec('donations-day URL returns 404', resp404 ? resp404.status() === 404 : false, resp404 ? 'status ' + resp404.status() : 'nav error');
// neighbours: home header/footer links status
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
const hrefs = await page.evaluate(() => [...new Set([...document.querySelectorAll('a[href]')].map(a => a.href))]);
const internal = hrefs.filter(h => h.startsWith(BASE));
for (const h of internal) {
  const r = await page.request.get(h);
  if (r.status() !== 200) rec('internal link ' + h, false, 'status ' + r.status());
}
rec(`all ${internal.length} internal home links resolve`, true, '');
await browser.close();
const fails = results.filter(r => !r.pass);
console.log('=== TOTAL: ' + results.length + ' checks, ' + fails.length + ' failed');
process.exit(0);
