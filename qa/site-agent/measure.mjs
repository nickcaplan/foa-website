import { chromium } from 'playwright';
const [base, path, selector, width = '390', theme = 'day', scale = '1'] = process.argv.slice(2);
if (!base || !path || !selector) { console.error('usage: measure.mjs <baseUrl> <path> <selector> [width] [day|night] [textScale]'); process.exit(2); }
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: Number(width), height: 900 } });
await p.addInitScript((t) => localStorage.setItem('foa-theme', t), theme);
await p.goto(base + path);
await p.evaluate((s) => { document.documentElement.style.fontSize = `${16 * s}px`; }, Number(scale));
const r = await p.evaluate((sel) => {
  const root = document.querySelector(sel);
  if (!root) return { found: false };
  const clipped = [...root.querySelectorAll('*')].filter((e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible').length;
  const overflowing = [...root.querySelectorAll('*')].filter((e) => e.scrollWidth > e.clientWidth + 1).length;
  return { found: true, pageOverflow: document.documentElement.scrollWidth - innerWidth, clipped, overflowing };
}, selector);
console.log(JSON.stringify({ width: Number(width), theme, scale: Number(scale), ...r }));
await b.close();
