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
