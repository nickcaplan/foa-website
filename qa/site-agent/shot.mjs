import { chromium } from 'playwright';
const [base, path, selector, out, width = '390', theme = 'day', scale = '1'] = process.argv.slice(2);
if (!base || !path || !selector || !out) { console.error('usage: shot.mjs <baseUrl> <path> <selector> <out.png> [width] [day|night] [textScale]'); process.exit(2); }
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: Number(width), height: 900 } });
await p.addInitScript((t) => localStorage.setItem('foa-theme', t), theme);
await p.goto(base + path);
await p.addStyleTag({ content: '.cookie-banner{display:none!important}' });
await p.evaluate((s) => { document.documentElement.style.fontSize = `${16 * s}px`; }, Number(scale));
const el = p.locator(selector).first();
await el.scrollIntoViewIfNeeded();
await el.screenshot({ path: out });
await b.close();
console.log(out);
