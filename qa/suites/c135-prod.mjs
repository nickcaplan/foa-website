import { chromium } from 'playwright';
const PROD = 'https://compass-demo.websitesbynick.co.uk';
const results = [];
const rec = (n, ok, d='') => { results.push(ok); console.log((ok?'PASS':'FAIL')+' | '+n+(d?' | '+d:'')); };
const browser = await chromium.launch({channel:'chrome'});
// source-options journey signed out on production
for (const [vp, theme] of [[390,'light'],[1280,'dark'],[1920,'light']]) {
  const page = await browser.newPage({ viewport: { width: vp, height: 844 }, reducedMotion: 'reduce' });
  await page.goto(PROD + '/?demo=1&source-options=1#/planner', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const tag = `prod ${theme} ${vp}px`;
  const tog = page.locator('button[aria-label*="Switch to"]');
  const currentlyDark = /switch to light/i.test(await tog.getAttribute('aria-label'));
  if (currentlyDark !== (theme === 'dark')) { await tog.click(); await page.waitForTimeout(400); }
  // Generate box stability disabled->enabled
  const sel = await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(b=>/generate my/i.test(b.textContent)); b.setAttribute('data-qa-gen','1'); return 'button[data-qa-gen]'; });
  const box = () => page.evaluate((s) => { const el = document.querySelector(s); return el ? {w:el.offsetWidth,h:el.offsetHeight} : null; }, sel);
  const dis = await box();
  await page.locator('button', { hasText: /fill it in|another example/i }).first().click();
  await page.waitForTimeout(800);
  const en = await box();
  rec(`${tag}: Generate box same disabled->enabled`, dis && en && dis.w===en.w && dis.h===en.h, `${dis?.w}x${dis?.h} -> ${en?.w}x${en?.h}`);
  await page.locator(sel).click();
  await page.waitForTimeout(2500);
  const t = await page.evaluate(() => document.body.innerText);
  rec(`${tag}: source options shown signed out`, /Source options\. No allocated plan\./.test(t));
  rec(`${tag}: no DEMO/MOCK wording`, !/demo data|mock data/i.test(t));
  const costs = await page.evaluate(() => [...document.querySelectorAll('.sp-option dl div')].filter(d=>/Source cost/.test(d.textContent)).map(d=>d.querySelector('dd').textContent.trim()));
  rec(`${tag}: costs whole numbers`, costs.length === 0 || costs.every(c => /^[\d,]+$/.test(c)), `${costs.length} costs`);
  const noScroll = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
  rec(`${tag}: no sideways scroll`, noScroll);
  await page.close();
}
// gating: My plans signed out on production (seeded demo plans exist in fresh storage? plans load gated)
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await page.goto(PROD + '/?source-options=1#/plans', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const cards = await page.locator('.plancard, .plan-card').count();
  const signin = await page.locator('button', { hasText: /sign in/i }).count();
  rec('prod #/plans signed out: gated, no plan cards', cards === 0 && signin > 0, `cards=${cards} signin=${signin}`);
  await page.close();
  // legacy planner without source-options still gates after generate
  const p2 = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await p2.goto(PROD + '/?demo=1#/planner', { waitUntil: 'networkidle' });
  await p2.waitForTimeout(600);
  await p2.locator('button', { hasText: /fill it in|another example/i }).first().click(); await p2.waitForTimeout(700);
  await p2.locator('button', { hasText: /generate my/i }).first().click(); await p2.waitForTimeout(2500);
  const t2 = await p2.evaluate(() => document.body.innerText);
  const emailFields = await p2.locator('input[type="email"]').count();
  rec('prod legacy planner: still gates to sign-in after generate', /sign in/i.test(t2) && emailFields > 0 && !/Source options\. No allocated plan\./.test(t2), `emailFields=${emailFields}`);
  await p2.close();
}
// home + sign-in page sanity
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(PROD + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const t = await page.evaluate(() => document.body.innerText);
  rec('prod home loads, no page errors', errors.length === 0 && /COMPASS|media plan/i.test(t), errors[0]||'');
  await page.close();
}
await browser.close();
const failed = results.filter(r=>!r).length;
console.log(`=== C135PROD: ${results.length} checks, ${failed} failed`);
process.exit(failed?1:0);
