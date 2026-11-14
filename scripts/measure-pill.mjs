import { chromium } from 'playwright';
const browser = await chromium.launch();
for (const [vw, scale] of [[768,1],[320,2],[768,2],[1440,1]]) {
  const page = await browser.newPage({ viewport: { width: vw, height: 1000 } });
  await page.goto('http://localhost:8917/committee/');
  await page.addStyleTag({ content: `html{font-size:${scale*100}%!important}` });
  const m = await page.locator('.member-card--vacancy').evaluate(el => {
    const q = s => el.querySelector(s);
    const r = e => { const b = e.getBoundingClientRect(); return { t: +b.top.toFixed(1), b: +b.bottom.toFixed(1), l: +b.left.toFixed(1), r: +b.right.toFixed(1) }; };
    const box = q('.member-vacancy'), pill = q('.member-vacancy-label'), a = q('.member-vacancy a'), name = q('.member-vacancy-name');
    return { box: r(box), pill: r(pill), link: r(a), name: r(name), grown: box.scrollHeight > box.clientHeight + 1, sw: box.scrollWidth, cw: box.clientWidth };
  });
  console.log(vw + '@' + scale + 'x', JSON.stringify(m));
  await page.close();
}
await browser.close();
