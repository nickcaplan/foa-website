import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(() => localStorage.setItem('foa-cookie-preferences', 'essential'));
await page.goto('http://localhost:8917/committee/');
await page.waitForTimeout(600);
const m = await page.locator('.member-card--vacancy').evaluate(el => {
  const box = el.querySelector('.member-vacancy');
  const pill = box.querySelector('.member-vacancy-label');
  const name = box.querySelector('.member-vacancy-name');
  return { grown: box.classList.contains('member-vacancy--grown'), sh: box.scrollHeight, ch: box.clientHeight,
    pb: pill.getBoundingClientRect().bottom, nt: name.getBoundingClientRect().top, roomy: !!document.querySelector('.committee-grid--roomy') };
});
console.log(JSON.stringify(m));
await page.screenshot({ path: '/tmp/recheck-1440-1x.png' });
await browser.close();
