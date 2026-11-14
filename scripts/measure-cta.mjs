import { chromium } from 'playwright';
const browser = await chromium.launch();
for (const vw of [320, 390, 768, 1440]) {
  const page = await browser.newPage({ viewport: { width: vw, height: 900 } });
  await page.addInitScript(() => localStorage.setItem('foa-cookie-preferences', 'essential'));
  await page.goto('http://localhost:8917/events/christmas-fayre-2026/');
  const m = await page.evaluate(() => {
    const r = e => e ? (b => [ +b.x.toFixed(1), +b.width.toFixed(1) ])(e.getBoundingClientRect()) : null;
    return { vol: r(document.querySelector('.xmas-stalls-cta .button')), art: r(document.querySelector('.xmas-art-cta .button')), sup: r(document.querySelector('.fayre-supporter a.button')) };
  });
  console.log(vw, JSON.stringify(m));
  await page.close();
}
await browser.close();
