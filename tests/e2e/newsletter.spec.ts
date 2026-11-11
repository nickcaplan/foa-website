import { expect, test } from "@playwright/test";

test.describe("Newsletter expansion", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto("/newsletter/");
  });

  test("the latest newsletter preview shows the opening sections", async ({ page }) => {
    await expect(page.locator(".newsletter-issue").getByRole("heading", { name: "🎆 Fireworks on the Field", exact: true })).toBeVisible();
    await expect(page.locator(".newsletter-issue").getByRole("heading", { name: "🎄 Christmas Fayre: Saturday 5th December, 12pm - 3pm", exact: true })).toBeVisible();
  });

  test("every issue ends with the Instagram and Facebook group sign-off", async ({ page }) => {
    const issues = page.locator(".newsletter-sheet");
    expect(await issues.count()).toBeGreaterThan(1);
    for (const issue of await issues.all()) {
      const signOff = issue.locator(".newsletter-sign-off");
      await expect(signOff).toHaveCount(1);
      const instagram = signOff.getByRole("link", { name: "Follow us on Instagram", includeHidden: true });
      await expect(instagram).toHaveAttribute("href", "https://www.instagram.com/thefriendsofashley/");
      await expect(instagram).toHaveAttribute("target", "_blank");
      await expect(instagram.locator(".external-link-icon svg[data-cta-arrow=external]")).toHaveCount(1);
      const facebook = signOff.locator("a", { hasText: "Join our Facebook group" });
      await expect(facebook).toHaveAttribute("href", "https://www.facebook.com/groups/friendsofashley/");
      await expect(facebook).toHaveAttribute("target", "_blank");
      await expect(facebook.locator(".external-link-icon svg[data-cta-arrow=external]")).toHaveCount(1);
      // Both rows are a single linked action, without a plain-text introduction.
      await expect(signOff).not.toContainText("@thefriendsofashley");
      for (const row of await signOff.locator("p").all()) {
        expect(await row.textContent()).toBe(await row.locator("a").textContent());
        await expect(row.locator(".cta-word .cta-tail .external-link-icon")).toHaveCount(1);
      }
      // The group's name is not repeated.
      await expect(signOff).not.toContainText("Parent Community");
      // Each line starts with the service's logo, hidden from assistive technology.
      const icons = signOff.locator("svg.sign-off-icon");
      await expect(icons).toHaveCount(2);
      for (const icon of await icons.all()) {
        await expect(icon).toHaveAttribute("aria-hidden", "true");
      }
      // The sign-off comes after the issue's last section.
      expect(await signOff.evaluate((el) => !el.nextElementSibling || el.nextElementSibling.matches(".newsletter-expansion-actions"))).toBe(true);
    }
  });

  for (const width of [320, 768, 1440]) {
    for (const night of [false, true]) {
      for (const enlarged of [false, true]) {
        test(`sign-off rows align at ${width}px, ${night ? "Night" : "Day"}, ${enlarged ? "200%" : "normal"} text`, async ({ page }) => {
          await page.setViewportSize({ width, height: 900 });
          await page.emulateMedia({ reducedMotion: "reduce" });
          await page.evaluate(({ night, enlarged }) => {
            document.documentElement.dataset.theme = night ? "night" : "day";
            document.documentElement.style.fontSize = enlarged ? "200%" : "100%";
          }, { night, enlarged });
          await page.locator(".newsletter-issue .newsletter-read-more").click();
          const rows = await page.locator(".newsletter-issue .newsletter-sign-off p").evaluateAll(elements => elements.map(element => {
            const link = element.querySelector("a")!;
            const icon = element.querySelector("svg")!;
            const lastWord = element.querySelector(".cta-word")!;
            const arrow = lastWord.querySelector(".external-link-icon")!;
            const style = getComputedStyle(link);
            const range = document.createRange();
            range.selectNodeContents(link);
            return {
              textLeft: range.getClientRects()[0].left,
              iconLeft: icon.getBoundingClientRect().left,
              weight: style.fontWeight,
              colour: style.color,
              decoration: style.textDecorationLine,
              right: link.getBoundingClientRect().right,
              rowRight: element.getBoundingClientRect().right,
              lastWordTop: lastWord.getBoundingClientRect().top,
              arrowTop: arrow.getBoundingClientRect().top,
              lastWordBottom: lastWord.getBoundingClientRect().bottom,
            };
          }));
          expect(rows).toHaveLength(2);
          expect(rows[0].textLeft).toBeCloseTo(rows[1].textLeft, 0);
          expect(rows[0].iconLeft).toBeCloseTo(rows[1].iconLeft, 0);
          expect(rows[0].weight).toBe(rows[1].weight);
          expect(rows[0].colour).toBe(rows[1].colour);
          for (const row of rows) {
            expect(row.decoration).toContain("underline");
            expect(row.right).toBeLessThanOrEqual(row.rowRight + 1);
            expect(row.arrowTop).toBeGreaterThanOrEqual(row.lastWordTop);
            expect(row.arrowTop).toBeLessThan(row.lastWordBottom);
          }
          expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
        });
      }
    }
  }

  test("collapsed and expanded newsletters fit a 320px screen", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(await overflow()).toBeLessThanOrEqual(0);
    for (const trigger of await page.locator(".newsletter-read-more").all()) {
      await trigger.click();
      expect(await overflow()).toBeLessThanOrEqual(0);
    }
  });

  test("reduced motion expands immediately and restores the peek on collapse", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const more = page.locator("#newsletter-latest-more");
    const peek = page.locator(".newsletter-issue [data-newsletter-peek]");
    const trigger = page.locator('[aria-controls="newsletter-latest-more"]');
    await trigger.click();
    await expect(more).toBeVisible();
    await expect(peek).toBeHidden();
    expect(await more.evaluate((element) => element.getAnimations().length)).toBe(0);
    // Reduced-motion CSS still permits near-instant focus/hover transitions.
    await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0);
    await trigger.click();
    await expect(more).toBeHidden();
    await expect(peek).toBeVisible();
    await expect(trigger).toBeFocused();
  });

  for (const width of [390, 1024]) {
    test(`newsletter peeks fill a five-line fade at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const peek of await page.locator("[data-newsletter-peek]").all()) {
        const sizes = await peek.evaluate((element) => {
          const style = getComputedStyle(element);
          return {
            height: element.getBoundingClientRect().height,
            contentHeight: element.scrollHeight,
            expectedHeight: 5 * parseFloat(style.lineHeight) + 3 * parseFloat(getComputedStyle(document.documentElement).fontSize),
          };
        });
        expect(sizes.height).toBeCloseTo(sizes.expectedHeight, 0);
        expect(sizes.contentHeight).toBeGreaterThan(sizes.height);
      }
    });

    test(`newsletter introductions match body text size at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const sheet of await page.locator(".newsletter-sheet").all()) {
        const introSize = await sheet.locator(".newsletter-intro").evaluate((element) => getComputedStyle(element).fontSize);
        const bodySize = await sheet.locator(".newsletter-summary-section p:not(.newsletter-intro)").first().evaluate((element) => getComputedStyle(element).fontSize);
        expect(introSize).toBe(bodySize);
      }
    });

    test(`archived newsletter sheets have a visible gap at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const sheets = page.locator(".newsletter-summary.newsletter-sheet");
      const first = await sheets.nth(0).boundingBox();
      const second = await sheets.nth(1).boundingBox();
      expect(first).not.toBeNull();
      expect(second).not.toBeNull();
      expect(second!.y - (first!.y + first!.height)).toBeGreaterThanOrEqual(24);
    });
  }

  for (const [name, bodyId, hiddenText] of [
    ["latest", "newsletter-latest-more", "Pre-loved Uniform: Friday 4th December - Christmas Jumpers Needed!"],
    ["previous issue", "newsletter-autumn-term-2026-more", "Committee & Volunteer Shout-Outs: Could you be our Co-Secretary?"],
    ["archive", "newsletter-back-to-school-2026-more", "AGM: Come Along & Have Your Say!"],
  ]) {
    test(`${name} newsletter hides the rest until Read more is used`, async ({ page }) => {
      await expect(page.locator(`#${bodyId}`)).toBeHidden();
      const trigger = page.locator(`[aria-controls="${bodyId}"]`);
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
      await expect(trigger).toContainText("Read the full newsletter");
      const peek = page.locator(`#${bodyId}`).locator("xpath=preceding-sibling::div[@data-newsletter-peek]");
      await expect(peek).toBeVisible();
      await expect(peek).toHaveAttribute("aria-hidden", "true");
      await expect(peek).toHaveAttribute("inert", "");
    });

    test(`${name} newsletter expands and collapses in place`, async ({ page }) => {
      const more = page.locator(`#${bodyId}`);
      const trigger = page.locator(`[aria-controls="${bodyId}"]`);
      const peek = more.locator("xpath=preceding-sibling::div[@data-newsletter-peek]");
      await trigger.click();

      await expect(more.getByText(hiddenText).first()).toBeVisible();
      await expect(trigger).toHaveAttribute("aria-expanded", "true");
      await expect(trigger).toContainText("Show less");
      await expect(peek).toBeHidden();

      await trigger.click();
      await expect(more).toBeHidden();
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
      await expect(trigger).toContainText("Read the full newsletter");
      await expect(peek).toBeVisible();
    });
  }
});

test.describe("Newsletter reading room", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/newsletter/");
    await page.getByRole("button", { name: "Reject analytics cookies" }).click();
  });

  test("every issue uses the same reading width and preserves expansion state", async ({ page }) => {
    const board = page.getByRole("region", { name: "Newsletter reading board" });
    const selector = page.getByRole("navigation", { name: "Newsletter issues" });
    const links = selector.getByRole("link");
    const latest = page.locator(".newsletter-issue");
    const width = (await latest.boundingBox())!.width;
    await expect(latest.locator(".newsletter-summary-label")).toHaveText(await links.first().locator("strong").innerText().then(text => text.replace(/^Latest\s*/i, "")));
    await expect(latest.locator(":scope > .newsletter-summary-section")).toHaveCount(3);
    expect(width).toBeGreaterThan(650);
    const bounds = (await board.boundingBox())!;
    const paperInset = (await latest.boundingBox())!.y - bounds.y;
    const indexBounds = (await page.locator(".newsletter-issue-index").boundingBox())!;
    expect(indexBounds.x).toBeGreaterThan(bounds.x + bounds.width);
    expect(indexBounds.y).toBeCloseTo(bounds.y, 0);
    for (let issue = 1; issue < await links.count(); issue++) {
      await links.nth(issue).focus();
      await page.keyboard.press("Enter");
      const sheet = board.locator("article:visible");
      await expect(sheet.locator(":scope > .newsletter-summary-section")).toHaveCount(3);
      await expect(sheet).toBeFocused();
      await expect(sheet.locator(".newsletter-summary-label")).toHaveText(await links.nth(issue).locator("strong").innerText());
      await expect(latest).toBeHidden();
      await expect(links.nth(issue)).toHaveAttribute("aria-current", "true");
      expect((await sheet.boundingBox())!.width).toBeCloseTo(width, 0);
      expect((await sheet.boundingBox())!.y - (await board.boundingBox())!.y).toBeCloseTo(paperInset, 0);
      await expect(page.getByRole("button", { name: "Back to the latest newsletter" })).toHaveCount(0);
      const trigger = sheet.locator(".newsletter-read-more");
      const peek = sheet.locator("[data-newsletter-peek]");
      const fade = await peek.evaluate(element => ({
        height: element.getBoundingClientRect().height,
        expected: 5 * parseFloat(getComputedStyle(element).lineHeight) + 3 * parseFloat(getComputedStyle(document.documentElement).fontSize),
      }));
      expect(fade.height).toBeCloseTo(fade.expected, 0);
      await trigger.click();
      await expect(trigger).toHaveAttribute("aria-expanded", "true");
      await links.nth(0).click();
      await expect(latest).toBeVisible();
      await links.nth(issue).click();
      await expect(board.getByRole("button", { name: "Show less" })).toBeVisible();
      await links.first().focus();
      await page.keyboard.press("Enter");
      await expect(latest).toBeFocused();
      await expect(links.first()).toHaveAttribute("aria-current", "true");
    }
    await expect(page.locator("article[id^='newsletter-issue-']")).toHaveCount(await links.count());
  });

  test("returning to stacked layouts restores all issues and keyboard focus", async ({ page }) => {
    const links = page.getByRole("navigation", { name: "Newsletter issues" }).getByRole("link");
    await links.nth(1).click();
    const trigger = page.locator(".newsletter-reading-board article:visible .newsletter-read-more");
    await trigger.click();
    const id = await trigger.getAttribute("aria-controls");
    await links.nth(1).focus();
    await page.setViewportSize({ width: 390, height: 900 });
    await expect(page.locator(".newsletter-issue-index")).toBeHidden();
    await expect(page.locator(".newsletter-archive article")).toHaveCount(3);
    const previous = page.locator(".newsletter-archive article").first();
    await expect(previous).toBeFocused();
    await expect(page.locator(`#${id}`)).toBeVisible();
    await expect(page.locator(".newsletter-issue")).toBeVisible();
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.locator(".newsletter-reading-board article:visible")).toBeFocused();
    await expect(page.locator(`#${id}`)).toBeVisible();
  });

  for (const night of [false, true]) {
    for (const enlarged of [false, true]) {
      test(`whole issue rows highlight without shifting in ${night ? "Night" : "Day"} Mode with ${enlarged ? "200%" : "normal"} text`, async ({ page }) => {
        await page.setViewportSize({ width: enlarged ? 2880 : 1440, height: 1200 });
        await page.evaluate(({ night, enlarged }) => {
          document.documentElement.dataset.theme = night ? "night" : "day";
          document.documentElement.style.fontSize = enlarged ? "200%" : "100%";
        }, { night, enlarged });
        const links = page.getByRole("navigation", { name: "Newsletter issues" }).getByRole("link");
        const row = links.nth(1);
        await expect(row).toHaveCSS("font-size", enlarged ? "32px" : "16px");
        const highlight = await row.evaluate(element => {
          const probe = document.createElement("span");
          probe.style.backgroundColor = "var(--green-light)";
          element.append(probe);
          const colour = getComputedStyle(probe).backgroundColor;
          probe.remove();
          return colour;
        });
        await expect(row).toBeVisible();
        const textPosition = () => row.locator("strong").evaluate(element => {
          const text = element.getBoundingClientRect();
          const row = element.parentElement!.getBoundingClientRect();
          return { x: text.x - row.x, y: text.y - row.y, width: text.width, height: text.height };
        });
        const before = await textPosition();
        await row.hover();
        await expect(row).toHaveCSS("background-color", highlight);
        await expect(row.locator("strong")).toHaveCSS("text-decoration-line", "none");
        expect(await textPosition()).toEqual(before);
        await page.mouse.move(0, 0);
        await links.first().focus();
        await page.keyboard.press("Tab");
        await expect(row).toBeFocused();
        await expect(row).toHaveCSS("background-color", highlight);
        await expect(row).toHaveCSS("outline-style", "solid");
        const bounds = (await row.boundingBox())!;
        const date = (await row.locator("time").boundingBox())!;
        expect(date.y + date.height).toBeLessThan(bounds.y + bounds.height);
        // Click the empty bottom-right padding, not the title or date.
        await row.click({ position: { x: bounds.width - 5, y: bounds.height - 5 } });
        await page.mouse.move(0, 0);
        await expect(row).toHaveAttribute("aria-current", "true");
        await expect(row).toHaveCSS("background-color", highlight);
        await expect(links.first()).not.toHaveAttribute("aria-current");
        expect(await textPosition()).toEqual(before);
        await expect(page.locator(".newsletter-reading-board .newsletter-summary:visible")).toBeVisible();
      });
    }
  }

  test("a direct archive fragment opens that issue in the reading board", async ({ page }) => {
    await page.goto("/newsletter/#newsletter-issue-autumn-term-2026");
    await expect(page.locator(".newsletter-reading-board #newsletter-issue-autumn-term-2026")).toBeVisible();
  });

  test("switching issues keeps the page where it is", async ({ page }) => {
    const links = page.getByRole("navigation", { name: "Newsletter issues" }).getByRole("link");
    // Scroll so the selector sits at the bottom of the viewport, away from the top of the board.
    await page.evaluate(() => {
      const index = document.querySelector(".newsletter-issue-index")!;
      window.scrollTo({ top: index.getBoundingClientRect().bottom + window.scrollY - window.innerHeight + 40, behavior: "instant" });
    });
    const position = await page.evaluate(() => scrollY);
    expect(position).toBeGreaterThan(0);
    await links.nth(1).click();
    await expect(page.locator(".newsletter-reading-board .newsletter-summary:visible")).toBeVisible();
    expect(await page.evaluate(() => scrollY)).toBe(position);
    await links.first().click();
    await expect(page.locator(".newsletter-reading-board .newsletter-issue:visible")).toBeVisible();
    expect(await page.evaluate(() => scrollY)).toBe(position);
  });

  test("switching issues during collapse settles the animation without leaving a scroll loop", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const selector = page.getByRole("navigation", { name: "Newsletter issues" });
    await selector.getByRole("link").nth(1).click();
    const trigger = page.locator(".newsletter-reading-board article:visible .newsletter-read-more");
    await trigger.click();
    await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0);
    await page.evaluate(() => {
      document.querySelector<HTMLButtonElement>(".newsletter-reading-board article:not([hidden]) .newsletter-read-more")!.click();
      document.querySelector<HTMLAnchorElement>(".newsletter-issue-index a")!.click();
    });
    await expect(page.locator(".newsletter-issue")).toBeVisible();
    await selector.getByRole("link").nth(1).click();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator(".newsletter-reading-board article:visible [data-newsletter-peek]")).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0);
    const top = await page.evaluate(() => {
      window.scrollTo({ top: 600, behavior: "instant" });
      return scrollY;
    });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    expect(await page.evaluate(() => scrollY)).toBe(top);
  });

  test("without JavaScript all issues and their full text remain readable", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto("/newsletter/");
    await expect(page.locator(".newsletter-issue-index")).toBeHidden();
    for (const issue of await page.locator(".newsletter-sheet").all()) {
      await expect(issue).toBeVisible();
      await expect(issue.locator(".newsletter-more")).toBeVisible();
      await expect(issue.locator(".newsletter-read-more")).toBeHidden();
    }
    await context.close();
  });

  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    for (const night of [false, true]) {
      for (const enlarged of [false, true]) {
        test(`layout at ${width}px, ${night ? "Night" : "Day"}, ${enlarged ? "200%" : "normal"} text`, async ({ page }) => {
          await page.setViewportSize({ width, height: 900 });
          await page.evaluate(({ night, enlarged }) => {
            document.documentElement.dataset.theme = night ? "night" : "day";
            document.documentElement.style.fontSize = enlarged ? "200%" : "100%";
          }, { night, enlarged });
          const index = page.locator(".newsletter-issue-index");
          await expect(page.locator("html")).toHaveCSS("font-size", enlarged ? "32px" : "16px");
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          const spacing = await page.evaluate(() => {
            const hero = document.querySelector(".view-hero")!.getBoundingClientRect();
            const board = document.querySelector(".newsletter-reading-board")!.getBoundingClientRect();
            const reader = document.querySelector(".newsletter-reader-container")!;
            const index = document.querySelector(".newsletter-issue-index")!;
            return {
              gap: board.top - hero.bottom,
              paddingBottom: parseFloat(getComputedStyle(reader).paddingBottom),
              indexTop: getComputedStyle(index).display === "none" ? null : index.getBoundingClientRect().top,
              boardTop: board.top,
            };
          });
          const rootSize = enlarged ? 32 : 16;
          const expectedGap = width < 768 || width >= 1024 ? 2.25 * rootSize : Math.max(2.5 * rootSize, Math.min(width * 0.06, 4.5 * rootSize));
          expect(spacing.gap, "gap from title panel to cork board").toBeCloseTo(expectedGap, 0);
          expect(spacing.paddingBottom, "matching gap before footer").toBeCloseTo(expectedGap, 0);
          if (spacing.indexTop !== null) expect(spacing.indexTop).toBeCloseTo(spacing.boardTop, 0);
          if (width >= 1280 && !enlarged) {
            await expect(index).toBeVisible();
            await index.getByRole("link").nth(1).click();
          } else {
            await expect(index).toBeHidden();
            await expect(page.locator(".newsletter-archive")).toBeVisible();
          }
          const trigger = page.locator(".newsletter-sheet:visible .newsletter-read-more").first();
          await trigger.click();
          await expect(trigger).toHaveAttribute("aria-expanded", "true");
          expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
          const overflow = await page.locator(".newsletter-page p:visible, .newsletter-page h2:visible, .newsletter-page h3:visible, .newsletter-page a:visible, .newsletter-page button:visible").evaluateAll(elements => elements.filter(element => element.scrollWidth > element.clientWidth + 1).map(element => element.textContent));
          expect(overflow).toEqual([]);
          // Leave room for platform-dependent emoji glyphs as well as wrapped text.
          const crampedHeadings = await page.locator(".newsletter-sheet h3:visible").evaluateAll(elements => elements.filter(element => element.clientWidth < 1.5 * parseFloat(getComputedStyle(element).fontSize)).map(element => element.textContent));
          expect(crampedHeadings).toEqual([]);
          await trigger.click();
          await expect(trigger).toHaveAttribute("aria-expanded", "false");
        });
      }
    }
  }
});
