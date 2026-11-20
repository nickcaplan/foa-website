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
    test(`vacancy labels stay whole at 200% ${width} ${colorScheme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme });
      await page.goto('/get-involved/');
      await page.evaluate(async () => {
        document.documentElement.style.fontSize = '200%';
        await document.fonts.ready;
      });
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
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    });
  }
}
