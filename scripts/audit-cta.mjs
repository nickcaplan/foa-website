import { chromium } from 'playwright';
const routes = ['/', '/committee/', '/get-involved/', '/contact/', '/uniform/', '/newsletter/', '/whats-on/', '/events/christmas-fayre-2026/', '/christmas-fayre-volunteering/', '/christmas-fayre-art-competition/', '/reps/', '/meeting-minutes/', '/privacy/'];
const browser = await chromium.launch();
for (const vw of [320, 390]) {
  for (const route of routes) {
    const page = await browser.newPage({ viewport: { width: vw, height: 1000 } });
    await page.addInitScript(() => localStorage.setItem('foa-cookie-preferences', 'essential'));
    await page.goto('http://localhost:8917' + route);
    const m = await page.evaluate(() => [...document.querySelectorAll('a.button')].map(e => { const b = e.getBoundingClientRect(); return { x: +b.x.toFixed(1), w: +b.width.toFixed(1) }; }));
    const bad = m.filter(b => b.x < 14.5 || b.x + b.w > vw - 14.5);
    console.log(vw, route, 'buttons:' + m.length, bad.length ? 'OUTLIERS ' + JSON.stringify(bad) : 'ok');
    await page.close();
  }
}
await browser.close();
