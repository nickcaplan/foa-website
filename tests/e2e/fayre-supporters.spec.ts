import { test, expect } from "@playwright/test";

// Guard for the Fayre Supporters page (Nick, 18 Nov 2026; design spec same day):
// Martin Flashman and Co front and centre, then Ottershaw Christmas Tree Farm
// and The Glitter Tree. Fails on main, where the page does not exist.

const route = "/christmas-fayre-supporters/";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("foa-theme", "night");
    localStorage.setItem("foa-cookie-preferences", "essential");
  });
});

test("supporters page loads with the Fayre navigation marking it current", async ({
  page,
}) => {
  const response = await page.goto(route);
  expect(response!.status()).toBe(200);
  const nav = page.getByRole("navigation", { name: "Christmas Fayre pages" });
  await expect(nav.getByRole("link")).toHaveCount(4);
  await expect(nav.getByRole("link", { name: "Supporters" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("Martin Flashman and Co leads the page, before Ottershaw and The Glitter Tree", async ({
  page,
}) => {
  await page.goto(route);
  await expect(page.locator(".narnia-landscape h1")).toHaveText("Fayre Supporters");
  const headings = await page
    .locator(".fayre-lead__name, .supporter-card h3")
    .allTextContents();
  expect(headings).toEqual([
    "Martin Flashman and Co",
    "Ottershaw Christmas Tree Farm",
    "The Glitter Tree",
  ]);
  const lead = page.locator(".fayre-lead");
  await expect(lead.locator(".fayre-lead__label")).toHaveText(
    "Christmas Fayre sponsor",
  );
  await expect(lead.locator(".fayre-lead__well img")).toHaveAttribute(
    "alt",
    "Martin Flashman and Co",
  );
});

test("each supporter links out to its own site, opening safely in a new tab", async ({
  page,
}) => {
  await page.goto(route);
  const expected: [string, string[]][] = [
    ["supporter-martin", ["https://www.martinflashman.co.uk/"]],
    [
      "supporter-ottershaw",
      ["https://www.mauricemandry.com/"],
    ],
    ["supporter-glitter", ["https://theglittertree.com/"]],
  ];
  for (const [labelledby, hrefs] of expected) {
    const card = page.locator(`section[aria-labelledby="${labelledby}"]`);
    const links = card.locator("a.button");
    await expect(links).toHaveCount(hrefs.length);
    for (let i = 0; i < hrefs.length; i++) {
      await expect(links.nth(i)).toHaveAttribute("href", hrefs[i]!);
      await expect(links.nth(i)).toHaveAttribute("target", "_blank");
      await expect(links.nth(i)).toHaveAttribute("rel", /noopener/);
    }
  }
});

test("every supporter logo renders with its alt text", async ({ page }) => {
  await page.goto(route);
  for (const alt of [
    "Martin Flashman and Co",
    "Ottershaw Christmas Tree Farm",
    "The Glitter Tree",
  ]) {
    const logo = page.locator(`img[alt="${alt}"]`).first();
    await expect(logo).toBeVisible();
    expect(
      await logo.evaluate((img: HTMLImageElement) => img.naturalWidth),
    ).toBeGreaterThan(0);
  }
});

// Family-hero guard (Nick, 19 Nov 2026): the supporters hero is the shared
// dark winter panel - gold keyline, snow edge, cream title - in BOTH themes,
// replacing the pale view-hero panel (whose shared gold read 1.18:1 in day).
// Fails if the page loses the Narnia hero or the panel lightens.
test("hero is the shared dark winter panel in day and night", async ({
  page,
}) => {
  for (const theme of ["day", "night"]) {
    await page.addInitScript(
      (t) => localStorage.setItem("foa-theme", t),
      theme,
    );
    await page.goto(route);
    const hero = page.locator(".narnia-landscape").first();
    await expect(hero).toBeVisible();
    const title = hero.locator("h1");
    await expect(title).toHaveText("Fayre Supporters");
    const colours = await hero.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        background: style.backgroundColor,
        border: style.borderTopColor,
        title: getComputedStyle(el.querySelector("h1")!).color,
        snow: el.querySelector(".xmas-snow") !== null,
      };
    });
    expect(colours.background, `${theme} panel`).toBe("rgb(16, 45, 56)");
    expect(colours.border, `${theme} keyline`).toBe("rgb(185, 154, 91)");
    expect(colours.title, `${theme} title`).toBe("rgb(255, 243, 213)");
    expect(colours.snow, `${theme} snow edge`).toBe(true);
  }
});
// Design review (19 Nov 2026, head 2ebbe21): at 320/390px with 200% text the
// enlarged card logos crushed the supporter headings - the logo's auto grid
// track sized to the image, leaving the heading a 6px column and pushing the
// logo through the card padding. The logo track is now reserved with a
// definite cap (minmax(0,38%)), so the heading always keeps its column.
// Fails if a logo touches its heading, escapes the card's content box, or the
// heading column is crushed below a quarter of the content width.
test("card logos never overlap their headings at narrow widths and 200% text", async ({
  page,
}) => {
  for (const width of [320, 390]) {
    for (const theme of ["day", "night"]) {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(
        (t) => localStorage.setItem("foa-theme", t),
        theme,
      );
      await page.goto(route);
      await page.evaluate(
        () => (document.documentElement.style.fontSize = "32px"),
      );
      const cards = page.locator(".supporter-card");
      for (const card of await cards.all()) {
        const geo = await card.evaluate((el) => {
          const h = el.querySelector("h3")!.getBoundingClientRect();
          const i = el
            .querySelector(".supporter-card__logo img")!
            .getBoundingClientRect();
          const c = el.getBoundingClientRect();
          const pad = parseFloat(getComputedStyle(el).paddingRight);
          return {
            text: el.querySelector("h3")!.textContent,
            h: { x: h.x, y: h.y, w: h.width, h: h.height },
            i: { x: i.x, y: i.y, w: i.width, h: i.height },
            contentRight: c.x + c.width - pad,
            contentWidth: c.width - 2 * pad,
          };
        });
        const label = `${width}px ${theme} "${geo.text}"`;
        const overlap =
          geo.h.x < geo.i.x + geo.i.w &&
          geo.i.x < geo.h.x + geo.h.w &&
          geo.h.y < geo.i.y + geo.i.h &&
          geo.i.y < geo.h.y + geo.h.h;
        expect(overlap, `${label}: logo overlaps heading`).toBe(false);
        expect(
          geo.i.x + geo.i.w,
          `${label}: logo stays inside the card's content box`,
        ).toBeLessThanOrEqual(geo.contentRight + 1);
        expect(
          geo.h.w,
          `${label}: heading keeps a usable column`,
        ).toBeGreaterThanOrEqual(geo.contentWidth * 0.25);
      }
    }
  }
});
// Nick (19 Nov 2026, second pass): the gold rule under the Martin lead sits too
// close to "With thanks to". The h2's margin-top was set but lost to the shared
// .xmas-theme h2 margin:0 (0,1,1 beats the bare class) - the override needs the
// theme class on the selector. Fails if the visible gap between the lead
// section's bottom border and the heading drops below 3rem at any size.
test("the gold rule above 'With thanks to' keeps a 3rem gap", async ({
  page,
}) => {
  for (const width of [320, 390, 1440]) {
    for (const scale of [1, 2]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route);
      if (scale === 2)
        await page.evaluate(
          () => (document.documentElement.style.fontSize = "32px"),
        );
      const gap = await page.evaluate(() => {
        const lead = document
          .querySelector(".fayre-lead")!
          .getBoundingClientRect();
        const h2 = document
          .querySelector(".fayre-supporters__thanks-heading")!
          .getBoundingClientRect();
        return h2.top - lead.bottom;
      });
      expect(
        gap,
        `${width}px ${scale * 100}%: gap between rule and heading`,
      ).toBeGreaterThanOrEqual(48 * scale - 2);
    }
  }
});

// Nick (19 Nov 2026, second pass): the Martin Flashman logo well was missing
// the card treatment the other supporters get - it had the panel background
// and radius but no border. Fails if the well loses its gold keyline.
test("the Martin Flashman logo well carries the supporter card border", async ({
  page,
}) => {
  await page.goto(route);
  const border = await page
    .locator(".fayre-lead__well")
    .evaluate((el) => getComputedStyle(el).borderTop);
  expect(border).toContain("1px");
  expect(border).toContain("185, 154, 91");
});

// Nick (19 Nov 2026, second pass): too much whitespace inside the sponsor
// cards. The logo now spans the heading and copy rows, so the copy starts
// directly under the heading instead of below a logo-tall top row. Fails if
// the copy drops back below the logo row.
test("supporter card copy starts directly under the heading", async ({
  page,
}) => {
  for (const width of [320, 1440]) {
    for (const scale of [1, 2]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route);
      if (scale === 2)
        await page.evaluate(
          () => (document.documentElement.style.fontSize = "32px"),
        );
      const cards = page.locator(".supporter-card");
      for (const card of await cards.all()) {
        const geo = await card.evaluate((el) => {
          const h = el.querySelector("h3")!.getBoundingClientRect();
          const p = el
            .querySelector(".supporter-card__copy > p:not(.supporter-card__actions)")!
            .getBoundingClientRect();
          return { gap: p.top - h.bottom, text: el.querySelector("h3")!.textContent };
        });
        expect(
          geo.gap,
          `${width}px ${scale * 100}% "${geo.text}": copy under heading`,
        ).toBeLessThanOrEqual(36 * scale);
      }
    }
  }
});
