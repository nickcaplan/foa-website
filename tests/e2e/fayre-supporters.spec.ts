import { test, expect } from '@playwright/test';

// Guard for the Fayre Supporters page (Nick, 18 Nov 2026; design spec same day):
// Martin Flashman and Co front and centre, then Ottershaw Christmas Tree Farm
// and The Glitter Tree. Fails on main, where the page does not exist.

const route = '/christmas-fayre-supporters/';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('foa-theme', 'night');
    localStorage.setItem('foa-cookie-preferences', 'essential');
  });
});

test('supporters page loads with the Fayre navigation marking it current', async ({ page }) => {
  const response = await page.goto(route);
  expect(response!.status()).toBe(200);
  const nav = page.getByRole('navigation', { name: 'Christmas Fayre pages' });
  await expect(nav.getByRole('link')).toHaveCount(4);
  await expect(nav.getByRole('link', { name: 'Supporters' })).toHaveAttribute('aria-current', 'page');
});

test('Martin Flashman and Co leads the page, before Ottershaw and The Glitter Tree', async ({ page }) => {
  await page.goto(route);
  await expect(page.locator('h1')).toHaveText('Fayre supporters');
  const headings = await page.locator('.fayre-lead__name, .supporter-card h3').allTextContents();
  expect(headings).toEqual(['Martin Flashman and Co', 'Ottershaw Christmas Tree Farm', 'The Glitter Tree']);
  const lead = page.locator('.fayre-lead');
  await expect(lead.locator('.fayre-lead__label')).toHaveText('Christmas Fayre sponsor');
  await expect(lead.locator('.fayre-lead__well img')).toHaveAttribute('alt', 'Martin Flashman and Co');
});

test('each supporter links out to its own site, opening safely in a new tab', async ({ page }) => {
  await page.goto(route);
  const expected: [string, string[]][] = [
    ['supporter-martin', ['https://www.martinflashman.co.uk/']],
    ['supporter-ottershaw', ['https://www.mauricemandry.com/', 'https://www.instagram.com/ottershawchristmastreefarm/']],
    ['supporter-glitter', ['https://theglittertree.com/']],
  ];
  for (const [labelledby, hrefs] of expected) {
    const card = page.locator(`section[aria-labelledby="${labelledby}"]`);
    const links = card.locator('a.button');
    await expect(links).toHaveCount(hrefs.length);
    for (let i = 0; i < hrefs.length; i++) {
      await expect(links.nth(i)).toHaveAttribute('href', hrefs[i]!);
      await expect(links.nth(i)).toHaveAttribute('target', '_blank');
      await expect(links.nth(i)).toHaveAttribute('rel', /noopener/);
    }
  }
});

test('every supporter logo renders with its alt text', async ({ page }) => {
  await page.goto(route);
  for (const alt of ['Martin Flashman and Co', 'Ottershaw Christmas Tree Farm', 'The Glitter Tree']) {
    const logo = page.locator(`img[alt="${alt}"]`).first();
    await expect(logo).toBeVisible();
    expect(await logo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  }
});
