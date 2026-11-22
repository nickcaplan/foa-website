import { expect, test } from '@playwright/test';

// The Committee hero carries the same vacancy jump nav as Get Involved
// (Nick, 22 Nov 2026): phones show the two CTAs side by side with down
// arrows for the same-page jumps; desktop keeps the plain header.
test('committee vacancy jump nav links to both vacancy cards', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/committee/');
  const roles = page.getByRole('navigation', { name: 'Current role vacancies' });
  const links = await roles.getByRole('link').all();
  expect(links.length).toBe(2);
  await expect(roles.getByRole('link')).toHaveText(['Secretary', 'Co-Comms']);
  for (const link of links) {
    await expect(link).toHaveAttribute('href', /^#committee-/);
    await expect(link.locator('svg[data-cta-arrow="down"]')).toHaveCount(1);
    await expect(link.locator('[data-cta-arrow="forward"]')).toHaveCount(0);
  }
  await roles.getByRole('link', { name: 'Secretary', exact: true }).click();
  await expect(page.locator('#committee-secretary')).toBeInViewport();
  await roles.getByRole('link', { name: 'Co-Comms', exact: true }).click();
  await expect(page.locator('#committee-co-comms')).toBeInViewport();
});

for (const width of [320, 390, 430]) {
  test(`committee vacancy CTAs sit side by side at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/committee/');
    const links = await page.getByRole('navigation', { name: 'Current role vacancies' }).getByRole('link').all();
    expect(links.length).toBe(2);
    const boxes = await Promise.all(links.map(l => l.boundingBox()));
    const [a, b] = boxes.map(box => box!);
    expect(Math.abs(a.y - b.y), 'same row').toBeLessThanOrEqual(1);
    expect(a.x + a.width, 'left pill ends before right begins').toBeLessThanOrEqual(b.x + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });
}

for (const width of [768, 1440]) {
  test(`committee vacancy jump nav hidden at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/committee/');
    await expect(page.getByRole('navigation', { name: 'Current role vacancies' })).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });
}

// Enlarged text wraps the CTAs to stacked with the words and icons intact.
for (const method of ['root', 'per-element']) {
  test(`committee vacancy labels stay whole at 200% 390 light ${method}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto('/committee/');
    await page.evaluate(async (method) => {
      if (method === 'root') document.documentElement.style.fontSize = '200%';
      else {
        const elements = [...document.querySelectorAll<HTMLElement>('body *')];
        const sizes = elements.map(el => parseFloat(getComputedStyle(el).fontSize));
        elements.forEach((el, i) => el.style.setProperty('font-size', `${sizes[i] * 2}px`, 'important'));
      }
      await document.fonts.ready;
    }, method);
    const labels = page.locator('.involved-vacancies .cta-label');
    expect(await labels.evaluateAll(elements => elements.flatMap(el => {
      const node = el.firstChild!;
      return [...(node.textContent ?? '').matchAll(/[^-]+/g)].filter(word => {
        const range = document.createRange();
        range.setStart(node, word.index!);
        range.setEnd(node, word.index! + word[0].length);
        return new Set([...range.getClientRects()].map(r => Math.round(r.top))).size > 1;
      }).map(word => word[0]);
    }))).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });
}

// Like Get Involved, both vacancy cards and the jump nav must work without
// JavaScript: no date gates remain, so nothing waits on a client script.
for (const width of [320, 390]) {
  test(`committee vacancies and jump nav work without JS at ${width}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height: 844 }, javaScriptEnabled: false });
    try {
      const page = await context.newPage();
      await page.goto('/committee/');
      const roles = page.getByRole('navigation', { name: 'Current role vacancies' });
      await expect(roles.getByRole('link')).toHaveText(['Secretary', 'Co-Comms']);
      for (const id of ['#committee-secretary', '#committee-co-comms']) {
        const card = page.locator(id);
        await expect(card).toBeVisible();
        await expect(card).not.toHaveAttribute('hidden');
        await expect(card).not.toHaveAttribute('data-show-from');
      }
      await roles.getByRole('link', { name: 'Co-Comms', exact: true }).click();
      await expect(page.locator('#committee-co-comms')).toBeInViewport();
    } finally { await context.close(); }
  });
}
