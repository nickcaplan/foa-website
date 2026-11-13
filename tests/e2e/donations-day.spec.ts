import {test,expect} from "@playwright/test";
for(const width of [390,1440])for(const theme of ["day","night"])for(const scale of [100,200])test(`Donations Day notices fit ${width} ${theme} ${scale}`,async({page})=>{
 await page.clock.install({time:new Date("2026-11-11T12:00:00Z")});await page.setViewportSize({width,height:1000});await page.addInitScript(theme=>{localStorage.setItem("foa-theme",theme);localStorage.setItem("foa-cookie-preferences","essential")},theme);
 for(const route of ["/","/events/christmas-fayre-2026/"]){await page.goto(route);if(scale===200)await page.addStyleTag({content:"html{font-size:200%!important}"});const notice=page.locator(route === "/events/christmas-fayre-2026/" ? "#donations-day" : ".fayre-donations-notice");await expect(notice).toBeVisible();await expect(notice).toContainText("Friday 20th November");expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);}
 await page.clock.setSystemTime(new Date("2026-11-21T00:00:00Z"));await page.goto("/events/christmas-fayre-2026/");await expect(page.locator("#donations-day")).toBeHidden();
});

for (const width of [320, 390, 768, 1440]) for (const theme of ['day', 'night']) for (const scale of [100, 200]) test(`Fayre donation requests survive integration ${width} ${theme} ${scale}`, async ({page}) => {
  await page.setViewportSize({width, height: 1000});
  await page.addInitScript(theme => {localStorage.setItem('foa-theme', theme);localStorage.setItem('foa-cookie-preferences', 'essential')}, theme);
  await page.goto('/events/christmas-fayre-2026/');
  if (scale === 200) await page.addStyleTag({content: 'html{font-size:200%!important}'});
  const section = page.locator('section[aria-labelledby="xmas-donations-title"]');
  await expect(section.getByRole('heading')).toHaveText('Donations Day - Friday 20th November');
  const date = section.locator('.xmas-donations-date');
  const heading = section.getByRole('heading');
  const positions = await heading.evaluate(e => {const r=document.createRange();r.selectNodeContents(e.firstChild!);const d=e.querySelector('span')!;return {label:r.getBoundingClientRect().top,date:d.getBoundingClientRect().top}});
  if (width < 768) expect(positions.date).toBeGreaterThan(positions.label);
  if (scale === 100) {
    const lineCount = await date.evaluate(e => {const r=document.createRange();r.selectNodeContents(e);return r.getClientRects().length});
    expect(lineCount).toBe(1);
  }
  await expect(section.locator('.xmas-section__lead')).not.toContainText('Friday 20th November');
  await expect(section.locator('li')).toHaveCount(3);
  await expect(section).toContainText('Bottles (alcohol or non-alcoholic)');
  await expect(section).toContainText('max value £5');
  await expect(section).toContainText('new, sealed, chocolate boxes or boxed biscuits');
  await expect(section).toContainText('please let your class rep know');
  await expect(page.getByRole('link', {name: 'Enter the art competition'})).toHaveAttribute('href', '/christmas-fayre-art-competition/');
  await expect(page.locator('.narnia-landscape')).toContainText('tickets on the door');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  const overflow = await section.locator('li,li strong,li span,.xmas-donations__raffle').evaluateAll(es => es.filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent));
  expect(overflow).toEqual([]);
  const columns = await section.locator("li span").evaluateAll(es => es.map(e => ({width:e.getBoundingClientRect().width, fontSize:parseFloat(getComputedStyle(e).fontSize)})));
  for (const column of columns) expect(column.width / column.fontSize).toBeGreaterThan(4);
});
