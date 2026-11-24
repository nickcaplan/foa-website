import { expect, test } from '@playwright/test';

// The role names must be discoverable at scrollY=0, not after the first
// full description. Keep the first-visit cookie notice present as well.
for (const width of [320, 390, 430]) {
  for (const colorScheme of ['light', 'dark'] as const) {
    for (const javaScriptEnabled of [true, false]) {
      test(`both vacancies on initial phone load ${width} ${colorScheme} JS=${javaScriptEnabled}`, async ({ browser }) => {
        const context = await browser.newContext({ viewport: { width, height: 844 }, colorScheme, javaScriptEnabled });
        try {
          const page = await context.newPage();
          await page.goto('/get-involved/');
          await expect(page.locator('.view-hero-copy > p')).toHaveText('Keep our paperwork in order as Secretary, or help share our news as Co-Comms. Read about each role below.');
          const roles = page.getByRole('navigation', { name: 'Current role vacancies' });
          await expect(roles.getByRole('link')).toHaveText(['Secretary', 'Co-Comms']);
          const banner = page.getByRole('complementary', { name: 'Analytics cookies' });
          const cookieTop = javaScriptEnabled ? (await banner.boundingBox())!.y : 844;
          for (const link of await roles.getByRole('link').all()) {
            await expect(link).toBeInViewport({ ratio: 1 });
            const box = (await link.boundingBox())!;
            expect(box.y + box.height, 'role remains above cookie notice').toBeLessThanOrEqual(cookieTop);
          }
          await expect(page.locator('.involved-feature')).toHaveCount(2);
          for (const card of await page.locator('.involved-feature').all()) {
            await expect(card).toBeVisible();
            await expect(card).not.toHaveAttribute('hidden');
            await expect(card).not.toHaveAttribute('data-show-from');
          }
          expect(await page.evaluate(() => scrollY)).toBe(0);
          await roles.getByRole('link', { name: 'Co-Comms', exact: true }).click();
          await expect(page.locator('#co-comms-title')).toBeInViewport();
        } finally { await context.close(); }
      });
    }
  }
}

for (const width of [320, 390, 430, 768, 1440]) {
  for (const colorScheme of ['light', 'dark'] as const) {
    for (const method of ['root', 'per-element']) test(`vacancy labels stay whole at 200% ${width} ${colorScheme} ${method}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme });
      await page.goto('/get-involved/');
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
        // Check each hyphen-separated part too, so Co-Comms cannot evade
        // the assertion just because it contains a permitted hyphen.
        return [...(node.textContent ?? '').matchAll(/[^-]+/g)].filter(word => {
          const range = document.createRange();
          range.setStart(node, word.index!);
          range.setEnd(node, word.index! + word[0].length);
          return new Set([...range.getClientRects()].map(r => Math.round(r.top))).size > 1;
        }).map(word => word[0]);
      }))).toEqual([]);
      // The jump nav is hidden at 48rem and up (Nick, 22 Nov 2026), so its
      // label geometry only applies when it is rendered.
      if (await labels.first().isVisible()) for (const label of await labels.all()) {
        const geometry = await label.evaluate(el => {
          const range = document.createRange(); range.selectNode(el.firstChild!);
          const text = range.getBoundingClientRect();
          const icon = el.querySelector('svg')!.getBoundingClientRect();
          const pill = el.closest('a')!.getBoundingClientRect();
          return { textRight: text.right, iconLeft: icon.left, iconRight: icon.right, pillRight: pill.right };
        });
        expect(geometry.textRight).toBeLessThanOrEqual(geometry.iconLeft - 1);
        expect(geometry.iconRight).toBeLessThanOrEqual(geometry.pillRight);
      }
      // All cards share these styles. Check every word, including the event
      // helper CTA and compere copy, rather than only the vacancy summary.
      const cardProblems = await page.locator('.involved-content').evaluate(root => {
        const problems: string[] = [];
        for (const el of root.querySelectorAll<HTMLElement>('p, h2, h3, .cta-label')) {
          const bounds = el.getBoundingClientRect();
          const icon = el.querySelector('svg')?.getBoundingClientRect();
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
          while (walker.nextNode()) {
            const node = walker.currentNode;
            for (const word of (node.textContent ?? '').matchAll(/[A-Za-z]+/g)) {
              const range = document.createRange();
              range.setStart(node, word.index!);
              range.setEnd(node, word.index! + word[0].length);
              const rects = [...range.getClientRects()];
              if (new Set(rects.map(r => Math.round(r.top))).size > 1) problems.push(`split: ${word[0]}`);
              for (const r of rects) {
                if (r.left < bounds.left - 1 || r.right > bounds.right + 1) problems.push(`outside label/copy: ${word[0]}`);
                if (icon && r.right > icon.left + 1 && r.left < icon.right - 1 && r.bottom > icon.top + 1 && r.top < icon.bottom - 1) problems.push(`icon collision: ${word[0]}`);
              }
            }
          }
        }
        return problems;
      });
      expect(cardProblems).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    });
  }
}

// Nick's rule (20 Nov 2026, on this PR): arrow direction means destination.
// Same-page jumps get a down arrow; right arrows mean leaving the page.
test('vacancy jump links carry a down arrow, not a forward one', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/get-involved/');
  const roles = page.getByRole('navigation', { name: 'Current role vacancies' });
  const links = await roles.getByRole('link').all();
  expect(links.length).toBe(2);
  for (const link of links) {
    await expect(link).toHaveAttribute('href', /^#/);
    await expect(link.locator('svg[data-cta-arrow="down"]')).toHaveCount(1);
    await expect(link.locator('[data-cta-arrow="forward"]')).toHaveCount(0);
  }
});

// Nick (22 Nov 2026): phones show the two CTAs side by side on one row.
for (const width of [320, 390, 430]) {
  test(`vacancy CTAs sit side by side at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/get-involved/');
    const links = await page.getByRole('navigation', { name: 'Current role vacancies' }).getByRole('link').all();
    expect(links.length).toBe(2);
    const boxes = await Promise.all(links.map(l => l.boundingBox()));
    const [a, b] = boxes.map(box => box!);
    expect(Math.abs(a.y - b.y), 'same row').toBeLessThanOrEqual(1);
    expect(a.x + a.width, 'left pill ends before right begins').toBeLessThanOrEqual(b.x + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });
}

// Nick (22 Nov 2026): desktop keeps the plain header, without the jump nav.
for (const width of [768, 1440]) {
  test(`vacancy jump nav hidden at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/get-involved/');
    await expect(page.getByRole('navigation', { name: 'Current role vacancies' })).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });
}
