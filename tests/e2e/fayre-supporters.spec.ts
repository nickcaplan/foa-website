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

// Nick (19 Nov 2026, 16:38): the whole lead-sponsor block is a card like the
// supporter cards, visibly differentiated as the lead: same panel and radius,
// but a solid brighter gold keyline instead of the supporters' faint one.
// Fails if the block loses the card treatment or its lead keyline.
test("the Martin Flashman lead block is a differentiated card", async ({
  page,
}) => {
  await page.goto(route);
  const style = await page.locator(".fayre-lead").evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      background: cs.backgroundColor,
      border: cs.borderTop,
      radius: cs.borderTopLeftRadius,
    };
  });
  expect(style.background).toBe("rgb(23, 56, 68)");
  expect(style.border).toContain("1px");
  expect(style.border).toContain("201, 166, 95");
  expect(style.radius).toBe("10.4px");
});

// Nick (19 Nov 2026, second pass): too much whitespace inside the sponsor
// cards. The logo now spans the heading and copy rows, so the copy starts
// directly under the heading instead of below a logo-tall top row. Fails if
// the copy drops back below the logo row.
test("supporter card copy starts directly under the heading", async ({
  page,
}) => {
  // The compact beside-logo layout applies on wide cards at normal text;
  // narrower cards and enlarged text take the full card width once past the
  // logo row (the next tests), which is the design-approved direction for
  // copy columns under ~240px (round 7).
  for (const width of [1440]) {
    for (const scale of [1]) {
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

// Design re-review (19 Nov 2026, round 6): below 48rem the logo column was
// reserved for the whole card, forcing one-word paragraph lines at 200% text.
// Copy and CTA now span the full card width once past the logo row. Fails if
// the paragraph column is reserved again on narrow layouts.
test("supporter card copy and CTA use the full card width on narrow layouts", async ({
  page,
}) => {
  for (const width of [320, 390]) {
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
          const c = el.getBoundingClientRect();
          const pad = parseFloat(getComputedStyle(el).paddingLeft);
          const content = c.width - 2 * pad;
          const p = el
            .querySelector(".supporter-card__copy > p:not(.supporter-card__actions)")!
            .getBoundingClientRect();
          const a = el
            .querySelector(".supporter-card__actions")!
            .getBoundingClientRect();
          return {
            text: el.querySelector("h3")!.textContent,
            copyRatio: p.width / content,
            ctaRatio: a.width / content,
          };
        });
        const label = `${width}px ${scale * 100}% "${geo.text}"`;
        expect(geo.copyRatio, `${label}: copy full width`).toBeGreaterThan(0.85);
        expect(geo.ctaRatio, `${label}: CTA row full width`).toBeGreaterThan(0.85);
      }
    }
  }
});

// Nick (19 Nov 2026, 16:42): the last supporter card sat flush against the
// footer's gold line. Sibling Fayre pages all keep a 2.5rem gap between their
// last content and the footer (measured on the Fayre, Volunteering and Art
// Competition pages at 390 and 1440); the supporters page now matches that
// rhythm. Fails if the page's bottom padding is removed or shrinks.
test("the last supporter card keeps the sibling 2.5rem gap above the footer", async ({
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
        const footer = document
          .querySelector(".site-footer")!
          .getBoundingClientRect();
        const row = document
          .querySelector(".fayre-supporters__row")!
          .getBoundingClientRect();
        return footer.top - row.bottom;
      });
      expect(
        gap,
        `${width}px ${scale * 100}%: gap above the footer gold line`,
      ).toBeGreaterThanOrEqual(40 * scale - 2);
      expect(
        gap,
        `${width}px ${scale * 100}%: gap above the footer gold line`,
      ).toBeLessThanOrEqual(40 * scale + 16);
    }
  }
});

// Design re-review of 96024ee (19 Nov 2026, round 7): at 320px with 200% text
// the Ottershaw heading's longest word overflowed its column and touched the
// tree logo. The heading text must always clear the logo: either the logo is
// stacked on its own row above the heading, or there is a real gap between
// the heading's ink and the logo. Fails on the 96024ee layout.
test("the heading ink always clears the card logo", async ({ page }) => {
  for (const width of [320, 390, 768, 1024, 1440]) {
    for (const scale of [1, 2]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route);
      if (scale === 2)
        await page.evaluate(
          () => (document.documentElement.style.fontSize = "32px"),
        );
      const clearances = await page.evaluate(() =>
        [...document.querySelectorAll(".supporter-card")].map((card) => {
          const h3 = card.querySelector("h3")!;
          const range = document.createRange();
          range.selectNodeContents(h3);
          const ink = range.getBoundingClientRect();
          const logo = card
            .querySelector(".supporter-card__logo img")!
            .getBoundingClientRect();
          return { stacked: logo.bottom <= ink.top + 2, gap: logo.left - ink.right };
        }),
      );
      for (const [i, c] of clearances.entries())
        expect(
          c.stacked || c.gap >= 8,
          `${width}px ${scale * 100}% card ${i}: heading/logo clearance`,
        ).toBe(true);
    }
  }
});

// Design re-review of 96024ee (19 Nov 2026, round 7): the paired supporter
// cards must read as a pair - copy starts level and the CTAs line up across
// the row. Fails on the 96024ee layout (34px vs 21px copy offset at 1440).
test("the paired supporter cards align their copy and CTAs", async ({
  page,
}) => {
  for (const width of [768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(route);
    const m = await page.evaluate(() =>
      [...document.querySelectorAll(".supporter-card")].map((card) => {
        const copy = card
          .querySelector("p:not(.supporter-card__actions)")!
          .getBoundingClientRect();
        const cta = card
          .querySelector(".supporter-card__actions")!
          .getBoundingClientRect();
        return { copyTop: copy.top, ctaBottom: cta.bottom };
      }),
    );
    expect(m.length).toBe(2);
    expect(
      Math.abs(m[0].copyTop - m[1].copyTop),
      `${width}px: copy start difference`,
    ).toBeLessThanOrEqual(2);
    expect(
      Math.abs(m[0].ctaBottom - m[1].ctaBottom),
      `${width}px: CTA bottom difference`,
    ).toBeLessThanOrEqual(2);
  }
});

// Design re-review of 96024ee (19 Nov 2026, round 7): at 768/820 the copy
// column beside the reserved logo column was 179-195px (ragged 5-line wraps).
// Below ~240px of copy column the copy takes the full card width under the
// logo row. Fails on the 96024ee layout.
test("tablet copy uses the full card width below the logo row", async ({
  page,
}) => {
  for (const width of [768, 820]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(route);
    const ratios = await page.evaluate(() =>
      [...document.querySelectorAll(".supporter-card")].map((card) => {
        const copy = card
          .querySelector("p:not(.supporter-card__actions)")!
          .getBoundingClientRect();
        const inner =
          card.getBoundingClientRect().width -
          2 * parseFloat(getComputedStyle(card).paddingLeft);
        return copy.width / inner;
      }),
    );
    for (const [i, r] of ratios.entries())
      expect(r, `${width}px card ${i}: copy width ratio`).toBeGreaterThan(0.85);
  }
});

// Design re-review of 96024ee (19 Nov 2026, round 7): the page shared the
// Fayre social card, whose alt text describes the Fayre date and venue.
// Supporters now has its own card with accurate alt text.
test("supporters has its own social card with accurate alt text", async ({
  page,
}) => {
  await page.goto(route);
  const ogImage = page.locator('meta[property="og:image"]');
  await expect(ogImage).toHaveAttribute(
    "content",
    /fayre-supporters-2026-v1\.jpg/,
  );
  const alt = await page
    .locator('meta[property="og:image:alt"]')
    .getAttribute("content");
  expect(alt).toContain("Martin Flashman and Co");
  expect(alt).toContain("Ottershaw Christmas Tree Farm");
  expect(alt).toContain("The Glitter Tree");
});
