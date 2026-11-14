import { chromium } from 'playwright';
const prefix = process.argv[2] || 'shot';
const browser = await chromium.launch();
for (const [vw, scale] of [[390,1],[390,2],[1440,1],[1440,2]]) {
  const page = await browser.newPage({ viewport: { width: vw, height: vw < 800 ? 844 : 900 } });
  await page.addInitScript(() => localStorage.setItem('foa-cookie-preferences', 'essential'));
  await page.goto('http://localhost:8917/committee/');
  await page.addStyleTag({ content: `html{scroll-behavior:auto!important;font-size:${scale*100}%!important}` });
  const card = page.locator('.member-card--vacancy');
  await card.scrollIntoViewIfNeeded();
  await page.evaluate(() => scrollBy(0, -120));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `/tmp/${prefix}-${vw}-${scale}x.png` });
  await page.close();
}
await browser.close();
