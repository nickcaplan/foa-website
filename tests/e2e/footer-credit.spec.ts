import { expect, test } from "@playwright/test";

for (const width of [320, 390, 820, 1440]) {
  for (const theme of ["day", "night"]) {
    for (const enlarged of [false, true]) {
      test(`footer credit and cookie route at ${width}px ${theme} enlarged=${enlarged}`, async ({ page }) => {
        await page.setViewportSize({ width, height: width <= 390 ? 667 : 1000 });
        await page.addInitScript((theme) => {
          localStorage.setItem("foa-cookie-preferences", "essential");
          localStorage.setItem("foa-theme", theme);
        }, theme);
        await page.goto("/");
        const enlargeText = async () => page.evaluate(async () => {
          await document.fonts.ready;
          const elements = [...document.querySelectorAll<HTMLElement>("body, body *")];
          const sizes = elements.map(element => parseFloat(getComputedStyle(element).fontSize));
          elements.forEach((element, index) => element.style.fontSize = `${sizes[index] * 2}px`);
          // Let text-relative container queries settle before measuring alignment.
          await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        });
        if (enlarged) await enlargeText();
        const footer = page.getByRole("contentinfo");
        const credit = footer.getByRole("link", { name: "Made with love by Nick (opens in a new tab)", exact: true });
        await expect(credit).toHaveAttribute("href", "https://websitesbynick.co.uk/");
        await expect(credit).toHaveAttribute("target", "_blank");
        await expect(credit.locator(".credit-name")).toHaveCSS("text-decoration-line", "underline");
        await expect(credit).toHaveCSS("text-decoration-line", "none");
        await expect(credit.locator(".credit-heart")).toHaveCSS("color", "rgb(220, 169, 86)");
        await credit.focus();
        await page.keyboard.press("Tab");
        await page.keyboard.press("Shift+Tab");
        await expect(credit).toBeFocused();
        await expect(credit).toHaveCSS("outline-color", theme === "night" ? "rgb(255, 197, 113)" : "rgb(239, 186, 96)");
        await expect(credit).toHaveCSS("outline-style", "solid");
        expect((await credit.boundingBox())!.height).toBeGreaterThanOrEqual(44);
        const utility = page.locator(".footer-bottom");
        await expect(utility).toHaveCSS("font-size", enlarged ? "26.24px" : "13.12px");
        await expect(utility).toContainText("Registered charity 1024028");
        await expect(utility).not.toContainText("Child-focused");
        await expect(utility.locator(":scope > *")).toHaveCount(2);
        const rhythm = await utility.evaluate(element => {
          const items = [...element.children] as HTMLElement[];
          const boxes = items.map(item => item.getBoundingClientRect());
          const fonts = [items[0], items[1], items[1].querySelector(".credit-name")!].map(item => {
            const style = getComputedStyle(item);
            return [style.fontFamily, style.fontSize, style.fontWeight, style.fontStyle];
          });
          return { fonts, boxes: boxes.map(box => ({top:box.top,bottom:box.bottom,left:box.left,right:box.right,height:box.height})) };
        });
        expect(rhythm.fonts[1]).toEqual(rhythm.fonts[0]);
        expect(rhythm.fonts[2]).toEqual(rhythm.fonts[0]);
        if (!enlarged && width === 390) {
          expect(Math.abs((rhythm.boxes[0].top + rhythm.boxes[0].bottom) / 2 - (rhythm.boxes[1].top + rhythm.boxes[1].bottom) / 2)).toBeLessThanOrEqual(1);
          expect(rhythm.boxes[1].left - rhythm.boxes[0].right).toBeGreaterThanOrEqual(16);
          expect(rhythm.boxes[0].height).toBeLessThan(30);
        }
        if (width === 320 || (enlarged && width <= 390)) {
          expect(rhythm.boxes[1].top).toBeGreaterThanOrEqual(rhythm.boxes[0].bottom);
          expect(rhythm.boxes[1].top - rhythm.boxes[0].bottom).toBeLessThanOrEqual(8);
        }

        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
        await expect(footer.getByRole("button", { name: "Cookie preferences", exact: true })).toHaveCount(0);
        await footer.getByRole("link", { name: "Privacy & cookies", exact: true }).click();
        await expect(page).toHaveURL(/\/privacy\/#cookie-settings$/);
        // Full-page navigation resets inline styles, so enlarge the destination too.
        if (enlarged) await enlargeText();
        const control = page.getByRole("main").getByRole("button", { name: "Cookie preferences", exact: true });
        const controlSize = await control.evaluate(element => parseFloat(getComputedStyle(element).fontSize));
        expect(controlSize).toBe(enlarged ? 32 : 16);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
        await control.focus();
        await page.keyboard.press("Enter");
        await expect(page.getByRole("button", { name: "Allow analytics cookies", exact: true })).toBeFocused();
        const reject = page.getByRole("button", { name: "Reject analytics cookies", exact: true });
        await page.keyboard.press("Tab");
        await expect(reject).toBeFocused();
        await expect(reject).toBeInViewport();
        await page.keyboard.press("Enter");
        await expect(page.locator("[data-cookie-banner]")).toBeHidden();
        await expect(control).toBeFocused();
        expect(await page.evaluate(() => localStorage.getItem("foa-cookie-preferences"))).toBe("essential");
        await expect(page.locator("[data-google-analytics]")).toHaveCount(0);
      });
    }
  }
}
