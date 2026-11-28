import { chromium } from 'playwright';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const OUT = process.env.QA_OUT || mkdtempSync(join(tmpdir(), 'qa-'));
const NOAUTH = 'https://preview-pr-135-no-auth.compass-5ic.pages.dev';
const results = [];
const rec = (n, ok, d='') => { results.push(ok); console.log((ok?'PASS':'FAIL')+' | '+n+(d?' | '+d:'')); };
const browser = await chromium.launch({channel:'chrome'});
async function attempt(vp, wantTheme) {
  const page = await browser.newPage({ viewport: { width: vp, height: 844 }, reducedMotion: 'reduce' });
  await page.goto(NOAUTH + '/?demo=1&source-options=1#/planner', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const tog = page.locator('button[aria-label*="Switch to"]');
  const currentlyDark = /switch to light/i.test(await tog.getAttribute('aria-label'));
  if (currentlyDark !== (wantTheme === 'dark')) { await tog.click(); await page.waitForTimeout(400); }
  await page.locator('button', { hasText: /fill it in|another example/i }).first().click();
  await page.waitForTimeout(700);
  await page.locator('button', { hasText: /generate my/i }).first().click();
  await page.waitForTimeout(2500);
  return page;
}
async function run(vp, wantTheme, shot) {
  const tag = `${wantTheme} ${vp}px`;
  let page, options = 0, tries = 0;
  while (tries < 3 && options === 0) {
    if (page) await page.close();
    tries++;
    page = await attempt(vp, wantTheme);
    options = await page.locator('.sp-option').count();
  }
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const m = bg.match(/\d+/g).map(Number);
  rec(`${tag}: theme actually ${wantTheme}`, (m[0]+m[1]+m[2] > 400) === (wantTheme === 'light'), `bg=${bg}`);
  rec(`${tag}: source options rendered (tries=${tries})`, options > 0, `${options} option cards`);
  if (options > 0) {
    const costs = await page.evaluate(() => [...document.querySelectorAll('.sp-option dl div')].filter(d=>/Source cost/.test(d.textContent)).map(d=>d.querySelector('dd').textContent.trim()));
    const bad = costs.filter(c => !/^[\d,]+$/.test(c));
    rec(`${tag}: source costs whole numbers`, costs.length > 0 && bad.length === 0, `${costs.length} costs, bad: ${bad.slice(0,3).join(';')}`);
  }
  const noScroll = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
  rec(`${tag}: no sideways scroll`, noScroll);
  await page.screenshot({ path: join(OUT,`c135-${shot}-results.png`), fullPage: true });
  await page.close();
}
await run(390, 'light', '390l2');
await run(390, 'dark', '390d2');
await run(1280, 'light', '1280l2');
await run(1440, 'light', '1440l2');
await run(1920, 'dark', '1920d2');
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await page.goto(NOAUTH + '/?source-options=1#/plans', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const hasEmail = await page.locator('input[type="email"]').count();
  const hasSignInBtn = await page.locator('button', { hasText: /sign in|continue/i }).count();
  const cards = await page.locator('.plancard, .plan-card, [aria-label*="plan actions"]').count();
  rec('noauth #/plans: sign-in form rendered', hasEmail > 0 || hasSignInBtn > 0, `email=${hasEmail} signinBtn=${hasSignInBtn}`);
  rec('noauth #/plans: no saved-plan content', cards === 0, `cards=${cards}`);
  await page.screenshot({ path: join(OUT,'c135-plans-gated.png'), fullPage: true });
  await page.close();
}
await browser.close();
const failed = results.filter(r=>!r).length;
console.log(`=== C135b: ${results.length} checks, ${failed} failed`);
process.exit(failed?1:0);
