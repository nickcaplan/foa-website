import { expect, test } from '@playwright/test';
for (const width of [320, 390, 768, 1440]) {
  for (const scale of [1, 2]) {
    test(`sale heading and jumper at ${width}px text ${scale}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto('/uniform/');
      await page.evaluate(scale => document.documentElement.style.fontSize = `${16 * scale}px`, scale);
      await page.evaluate(() => document.fonts.ready);
      const label = await page.locator('.christmas-sale-top .eyebrow').boundingBox();
      const date = await page.locator('.christmas-sale-top h2').boundingBox();
      const jumper = await page.locator('.christmas-knit').boundingBox();
      expect(label).not.toBeNull(); expect(date).not.toBeNull(); expect(jumper).not.toBeNull();
      expect(date!.y - (label!.y + label!.height)).toBeGreaterThanOrEqual(9 * scale);
      expect(date!.y - (label!.y + label!.height)).toBeLessThan(13 * scale);
      expect(jumper!.width).toBeGreaterThanOrEqual(76);
      // Once the sale frame is narrower than about 14em (text zoom), the jumper
      // stacks under the heading so whole words fit; otherwise it sits beside.
      const stacked = width < 14 * 16 * scale;
      if (stacked) {
        expect(jumper!.y).toBeGreaterThanOrEqual(date!.y + date!.height);
      } else {
        expect(date!.x + date!.width).toBeLessThanOrEqual(jumper!.x);
        expect(jumper!.y).toBeLessThan(date!.y + date!.height);
        expect(jumper!.y + jumper!.height).toBeGreaterThan(label!.y);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  }
}
