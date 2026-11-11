import { expect, test } from '@playwright/test';
for (const width of [320, 390, 768, 1440]) {
  for (const scale of [1, 2]) {
    test(`sale heading fills the space beside the jumper at ${width}px text ${scale}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto('/uniform/');
      await page.evaluate(scale => document.documentElement.style.fontSize = `${16 * scale}px`, scale);
      await page.evaluate(() => document.fonts.ready);
      const label = await page.locator('.christmas-sale-top .eyebrow').boundingBox();
      const date = await page.locator('.christmas-sale-top h2').boundingBox();
      const jumper = await page.locator('.christmas-knit').boundingBox();
      expect(label).not.toBeNull(); expect(date).not.toBeNull(); expect(jumper).not.toBeNull();
      expect(date!.y - (label!.y + label!.height)).toBeLessThan(16);
      expect(date!.x + date!.width).toBeLessThanOrEqual(jumper!.x);
      expect(jumper!.y).toBeLessThan(date!.y + date!.height);
      expect(jumper!.y + jumper!.height).toBeGreaterThan(label!.y);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  }
}
