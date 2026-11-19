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
    "Galeta",
    "W3 Colour",
    "Moore's Tree Company",
    "Giardina Family Butchers",
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
    ["supporter-galeta", ["https://galeta.co.uk/"]],
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
    "Galeta",
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
          const h3 = el.querySelector("h3")!;
          // Compact single-column cards float the logo top right and wrap the
          // heading ink around it, so box-overlap is the wrong check: measure
          // each heading line box against the logo image box instead.
          const logoImg = el.querySelector(".supporter-card__logo img");
          // Giardina Family Butchers is a text-only card: no logo, nothing to
          // overlap, so there is no geometry to check.
          if (!logoImg) return null;
          const range = document.createRange();
          range.selectNodeContents(h3);
          const lines = [...range.getClientRects()].map((r) => ({
            x: r.x, y: r.y, w: r.width, h: r.height,
          }));
          const i = logoImg.getBoundingClientRect();
          const c = el.getBoundingClientRect();
          const pad = parseFloat(getComputedStyle(el).paddingRight);
          return {
            text: h3.textContent,
            lines,
            i: { x: i.x, y: i.y, w: i.width, h: i.height },
            contentRight: c.x + c.width - pad,
            contentWidth: c.width - 2 * pad,
          };
        });
        if (!geo) continue;
        const label = `${width}px ${theme} "${geo.text}"`;
        for (const ln of geo.lines) {
          const overlap =
            ln.x < geo.i.x + geo.i.w &&
            geo.i.x < ln.x + ln.w &&
            ln.y < geo.i.y + geo.i.h &&
            geo.i.y < ln.y + ln.h;
          expect(overlap, `${label}: logo overlaps heading ink`).toBe(false);
        }
        expect(
          geo.i.x + geo.i.w,
          `${label}: logo stays inside the card's content box`,
        ).toBeLessThanOrEqual(geo.contentRight + 1);
        expect(
          Math.max(...geo.lines.map((l) => l.w)),
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
          // Compact single-column cards wrap the heading ink around the
          // floated logo, so check each line box: stacked (logo wholly above
          // the line) or at least 8px of horizontal clearance.
          const range = document.createRange();
          range.selectNodeContents(h3);
          const logoImg = card.querySelector(".supporter-card__logo img");
          // Text-only card (Giardina Family Butchers): no logo, no clearance
          // to measure.
          if (!logoImg) return [];
          const logo = logoImg.getBoundingClientRect();
          return [...range.getClientRects()].map((ink) => ({
            stacked: logo.bottom <= ink.top + 2,
            gap: logo.left - ink.right,
          }));
        }),
      );
      for (const [i, lines] of clearances.entries())
        for (const c of lines)
          expect(
            c.stacked || c.gap >= 8,
            `${width}px ${scale * 100}% card ${i}: heading/logo clearance`,
          ).toBe(true);
    }
  }
});

// Nick (19 Nov 2026, 18:52, design agent 4-card spec): from 1100px the three
// partner cards share one row of equal columns - copy starts level and the
// CTAs bottom-align. Below that each card takes a full-width row of its own
// (no equal-height across rows). Fails if the desktop trio drifts out of
// alignment or the tablet layout keeps side-by-side cards.
test("the three partner cards align in their desktop row and stack full-width below", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
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
  expect(m.length).toBe(6);
  // Six cards form two rows of three equal columns; copy starts level and
  // CTAs bottom-align within each row independently.
  for (const row of [m.slice(0, 3), m.slice(3, 6)]) {
    for (let i = 1; i < 3; i++) {
      expect(
        Math.abs(row[0].copyTop - row[i].copyTop),
        `1440px card ${i}: copy start difference`,
      ).toBeLessThanOrEqual(2);
      expect(
        Math.abs(row[0].ctaBottom - row[i].ctaBottom),
        `1440px card ${i}: CTA bottom difference`,
      ).toBeLessThanOrEqual(2);
    }
  }
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto(route);
  const rows = await page.evaluate(() => {
    const row = document
      .querySelector(".fayre-supporters__row")!
      .getBoundingClientRect();
    return [...document.querySelectorAll(".supporter-card")].map((card) => {
      const c = card.getBoundingClientRect();
      return { top: c.top, widthRatio: c.width / row.width };
    });
  });
  expect(rows.length).toBe(6);
  for (let i = 0; i < 6; i++) {
    expect(rows[i].widthRatio, `768px card ${i}: full-width row`).toBeGreaterThan(0.98);
    if (i > 0)
      expect(rows[i].top, `768px card ${i}: own row`).toBeGreaterThan(rows[i - 1].top + 5);
  }
});


// Nick (19 Nov 2026, 18:52, design agent 4-card spec): below 1100px each
// partner card is a full-width row with the logo right, the copy left beside
// it, and the CTA spanning the card's full internal width. Fails if the copy
// drops under the logo row or the CTA shrinks to the copy column.
// Nick (19 Nov 2026, 21:00; design agent compact-card-spec): in the
// single-column list each partner card floats its logo top right with the
// title at the top left, copy flowing around the logo, and the CTA full width
// below both. Cards size to content - no floors. Fails if a reserved logo
// column or logo-only top row returns, or the CTA loses its full width.
test("single-column partner cards float the logo top right with a full-width CTA below", async ({
  page,
}) => {
  for (const width of [768, 820]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(route);
    const ratios = await page.evaluate(() =>
      [...document.querySelectorAll(".supporter-card")].map((card) => {
        const pad = parseFloat(getComputedStyle(card).paddingLeft);
        const c = card.getBoundingClientRect();
        const h3 = card.querySelector("h3")!.getBoundingClientRect();
        const copy = card
          .querySelector("p:not(.supporter-card__actions)")!
          .getBoundingClientRect();
        const logoImg = card.querySelector(".supporter-card__logo img");
        const logo = logoImg ? logoImg.getBoundingClientRect() : null;
        const cta = card
          .querySelector(".supporter-card__actions")!
          .getBoundingClientRect();
        const inner = c.width - 2 * pad;
        return {
          logoFlushRight: logo ? c.x + c.width - pad - logo.right : null,
          logoTopVsTitle: logo ? logo.top - h3.top : null,
          titleTopLeft: h3.left - (c.x + pad),
          ctaBelow: cta.top - Math.max(copy.bottom, logo ? logo.bottom : 0),
          ctaRatio: cta.width / inner,
          h3Min: getComputedStyle(card.querySelector("h3")!).minHeight,
        };
      }),
    );
    for (const [i, r] of ratios.entries()) {
      if (r.logoFlushRight !== null) {
        expect(Math.abs(r.logoFlushRight), `${width}px card ${i}: logo flush right`).toBeLessThanOrEqual(2);
        expect(Math.abs(r.logoTopVsTitle!), `${width}px card ${i}: logo top-aligned with title`).toBeLessThanOrEqual(6);
      }
      expect(Math.abs(r.titleTopLeft), `${width}px card ${i}: title top left`).toBeLessThanOrEqual(2);
      expect(r.ctaBelow, `${width}px card ${i}: CTA below text and logo`).toBeGreaterThanOrEqual(-1);
      expect(r.ctaRatio, `${width}px card ${i}: CTA full internal width`).toBeGreaterThan(0.85);
      expect(r.h3Min, `${width}px card ${i}: no heading floor`).toBe("0px");
    }
  }
});


// Nick (19 Nov 2026, 21:00; design agent compact-card-spec): the compact
// layout uses fixed px padding (12px phones, 20px from 768px) that does not
// double at enlarged text, and cards size independently to their content -
// the short Galeta card must come out shorter than the farm card, with no
// forced shared heights. Fails if rem padding or equal-height floors return.
test("compact single-column cards use fixed padding and independent heights", async ({
  page,
}) => {
  await page.goto(route);
  for (const [width, wantPad] of [[390, 12], [768, 20]] as const) {
    await page.setViewportSize({ width, height: 900 });
    const m = await page.evaluate(() =>
      [...document.querySelectorAll(".supporter-card")].map((card) => ({
        name: card.querySelector("h3")!.textContent,
        pad: parseFloat(getComputedStyle(card).paddingLeft),
        h: card.getBoundingClientRect().height,
      })),
    );
    for (const c of m)
      expect(c.pad, `${width}px ${c.name}: fixed px padding`).toBe(wantPad);
    if (width === 390) {
      const farm = m.find((c) => c.name!.includes("Ottershaw"))!;
      const galeta = m.find((c) => c.name === "Galeta")!;
      expect(
        galeta.h,
        `390px: Galeta (${Math.round(galeta.h)}px) shorter than farm (${Math.round(farm.h)}px)`,
      ).toBeLessThan(farm.h - 20);
    }
  }
  // Fixed px padding at enlarged text too: 390 at 200% keeps 12px.
  await page.setViewportSize({ width: 390, height: 900 });
  await page.evaluate(
    () => (document.documentElement.style.fontSize = "32px"),
  );
  const pad = await page.evaluate(
    () => parseFloat(getComputedStyle(document.querySelector(".supporter-card")!).paddingLeft),
  );
  expect(pad, "390px 200%: padding stays 12px").toBe(12);
});

// Design verdict (19 Nov 2026, 74aaacd review) + compact-card-spec: the row
// switch sits exactly at 1152px (72rem) - single column at 1151, three
// columns at 1152. Fails if the boundary drifts.
test("the three-column switch sits exactly at 1152px", async ({ page }) => {
  await page.goto(route);
  const cols = async (w: number) => {
    await page.setViewportSize({ width: w, height: 900 });
    return page.evaluate(() => {
      const tops = [...document.querySelectorAll(".supporter-card")].map((c) =>
        Math.round(c.getBoundingClientRect().top),
      );
      return new Set(tops).size;
    });
  };
  expect(await cols(1151), "1151px: single column").toBe(6);
  expect(await cols(1152), "1152px: two rows of three columns").toBe(2);
});

// Nick (19 Nov 2026, after #210 shipped): bigger card titles on desktop. The
// bump (1.25rem -> 1.5rem) applies only in the side-by-side three-column row;
// the compact single-column layout keeps its spec'd 1.25rem, and enlarged text
// follows the row collapse (the rem doubles naturally, no extra bump). Fails
// if the desktop row drops back to 1.25rem or the bump leaks into compact.
test("card titles are bigger only in the desktop three-column row", async ({
  page,
}) => {
  await page.goto(route);
  const size = async () =>
    page.evaluate(() =>
      parseFloat(getComputedStyle(document.querySelector(".supporter-card h3")!).fontSize),
    );
  await page.setViewportSize({ width: 1440, height: 900 });
  expect(await size(), "1440px desktop row").toBe(24);
  await page.setViewportSize({ width: 1151, height: 900 });
  expect(await size(), "1151px single column").toBe(20);
  await page.setViewportSize({ width: 390, height: 900 });
  expect(await size(), "390px phone").toBe(20);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(
    () => (document.documentElement.style.fontSize = "32px"),
  );
  expect(await size(), "1440px at 200% text stays compact-spec").toBe(40);
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
    /fayre-supporters-2026-v2\.jpg/,
  );
  const alt = await page
    .locator('meta[property="og:image:alt"]')
    .getAttribute("content");
  expect(alt).toContain("Martin Flashman and Co");
  expect(alt).toContain("Ottershaw Christmas Tree Farm");
  expect(alt).toContain("The Glitter Tree");
  expect(alt).toContain("Galeta");
});

// Nick (19 Nov 2026, 18:38, design agent Direction A): small sponsor marks in
// the hero, directly below the subtitle. A non-interactive duplicate group:
// names and links stay in the body cards. Fails on main, where the row does
// not exist.
test("the hero shows the sponsor mark row below the subtitle, non-interactive", async ({
  page,
}) => {
  await page.goto(route);
  const row = page.locator(".narnia-landscape__supporters");
  await expect(row).toHaveCount(1);
  await expect(row).toHaveAttribute("aria-hidden", "true");
  const imgs = row.locator("img");
  await expect(imgs).toHaveCount(4);
  for (const img of await imgs.all()) await expect(img).toHaveAttribute("alt", "");
  await expect(imgs.nth(0)).toHaveAttribute("src", /martin-flashman\.png/);
  await expect(imgs.nth(1)).toHaveAttribute("src", /ottershaw/);
  await expect(imgs.nth(2)).toHaveAttribute("src", /glitter-tree/);
  await expect(imgs.nth(3)).toHaveAttribute("src", /galeta\.svg/);
  // Nothing in the row is a link or otherwise interactive.
  await expect(row.locator("a, button")).toHaveCount(0);
  // It sits directly after the subtitle in the hero copy.
  const order = await page.evaluate(() => {
    const intro = document.querySelector(".narnia-landscape__intro")!;
    const row = document.querySelector(".narnia-landscape__supporters")!;
    return intro.nextElementSibling === row;
  });
  expect(order).toBe(true);
  // The three partner marks share one indivisible wrapper, so a wrap drops
  // them under Martin together - never one orphan, never Galeta alone.
  const shared = await page.evaluate(() => {
    const partners = document.querySelector(
      ".narnia-landscape__supporters-partners",
    )!;
    return partners.querySelectorAll("img").length === 3;
  });
  expect(shared).toBe(true);
});

// Revised 4-mark spec (19 Nov 2026, 18:52), CSS px per viewport tier: Martin
// first and widest (152/176/200/224), Ottershaw 28x40 (34x48 from 768px),
// Glitter on a 40px white tile (48px from 768px), Galeta's dark-ink wordmark
// on an 80x40 cream tile (88x48 at 768, 96x48 at 1440; #FFF6EB, Glitter's 4px
// radius), gaps 16/20/24/28. On phones the partner group wraps under Martin
// as a unit with 8px between the lines; from 768px all four share one line.
// Fails on any size drift.
test("the hero sponsor row matches the revised 4-mark sizes", async ({
  page,
}) => {
  const tiers = [
    { w: 320, lead: 152, side: [28, 40], tile: 40, galeta: [80, 40], gap: 16, lines: 2 },
    { w: 390, lead: 176, side: [28, 40], tile: 40, galeta: [80, 40], gap: 20, lines: 2 },
    { w: 768, lead: 200, side: [34, 48], tile: 48, galeta: [88, 48], gap: 24, lines: 1 },
    { w: 1440, lead: 224, side: [34, 48], tile: 48, galeta: [96, 48], gap: 28, lines: 1 },
  ];
  for (const t of tiers) {
    await page.setViewportSize({ width: t.w, height: 900 });
    await page.goto(route);
    const m = await page.evaluate(() => {
      const row = document.querySelector(".narnia-landscape__supporters")!;
      const lead = row
        .querySelector(".narnia-landscape__supporters-lead")!
        .getBoundingClientRect();
      const [otter, glitter, galeta] = [
        ...row.querySelectorAll(".narnia-landscape__supporters-partners img"),
      ].map((i) => i.getBoundingClientRect());
      return {
        lead: { w: lead.width, top: lead.top, bottom: lead.bottom },
        otter: [otter.width, otter.height],
        tile: [glitter.width, glitter.height],
        galeta: [galeta.width, galeta.height],
        partnerTop: otter.top,
        gap: otter.left - glitter.right > 0 ? glitter.left - otter.right : glitter.left - otter.right,
        lineGap: otter.top - lead.bottom,
        tileBg: getComputedStyle(
          row.querySelector(".narnia-landscape__supporters-tile")!,
        ).backgroundColor,
        creamBg: getComputedStyle(
          row.querySelector(".narnia-landscape__supporters-cream")!,
        ).backgroundColor,
      };
    });
    expect(Math.abs(m.lead.w - t.lead), `${t.w}px lead width`).toBeLessThanOrEqual(1);
    expect(Math.abs(m.otter[0] - t.side[0]), `${t.w}px otter width`).toBeLessThanOrEqual(1);
    expect(Math.abs(m.otter[1] - t.side[1]), `${t.w}px otter height`).toBeLessThanOrEqual(1);
    expect(Math.abs(m.tile[0] - t.tile), `${t.w}px tile width`).toBeLessThanOrEqual(1);
    expect(Math.abs(m.tile[1] - t.tile), `${t.w}px tile height`).toBeLessThanOrEqual(1);
    expect(Math.abs(m.galeta[0] - t.galeta[0]), `${t.w}px galeta tile width`).toBeLessThanOrEqual(1);
    expect(Math.abs(m.galeta[1] - t.galeta[1]), `${t.w}px galeta tile height`).toBeLessThanOrEqual(1);
    expect(Math.abs(m.gap - t.gap), `${t.w}px partner gap`).toBeLessThanOrEqual(1);
    expect(m.tileBg, `${t.w}px glitter tile is white`).toBe("rgb(255, 255, 255)");
    expect(m.creamBg, `${t.w}px galeta tile is warm cream`).toBe("rgb(255, 246, 235)");
    if (t.lines === 2) {
      expect(m.partnerTop, `${t.w}px: partner group wraps under Martin`).toBeGreaterThan(m.lead.bottom + 5);
      expect(Math.abs(m.lineGap - 8), `${t.w}px: 8px between the two lines`).toBeLessThanOrEqual(2);
    } else {
      const leadMid = (m.lead.top + m.lead.bottom) / 2;
      expect(Math.abs(m.partnerTop + (t.side[1] / 2) - leadMid), `${t.w}px: one shared line, marks vertically centred`).toBeLessThanOrEqual(2);
    }
  }
});


// Direction A spacing: 12px below the subtitle at normal text, 16px at
// enlarged text, and always at least 32px clear of the hero's bottom edge
// (the snow bank peaks at 30px). Fails if the row drifts.
test("the hero sponsor row keeps its spacing and bottom clearance", async ({
  page,
}) => {
  for (const width of [320, 390, 768, 1440]) {
    for (const scale of [1, 2]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route);
      if (scale === 2)
        await page.evaluate(
          () => (document.documentElement.style.fontSize = "32px"),
        );
      const m = await page.evaluate(() => {
        const row = document
          .querySelector(".narnia-landscape__supporters")!
          .getBoundingClientRect();
        const intro = document
          .querySelector(".narnia-landscape__intro")!
          .getBoundingClientRect();
        const hero = document
          .querySelector(".narnia-landscape")!
          .getBoundingClientRect();
        return { above: row.top - intro.bottom, below: hero.bottom - row.bottom };
      });
      const want = scale === 1 ? 12 : 16;
      expect(
        Math.abs(m.above - want),
        `${width}px ${scale * 100}%: subtitle-to-row gap`,
      ).toBeLessThanOrEqual(2);
      expect(
        m.below,
        `${width}px ${scale * 100}%: row-to-hero-bottom clearance`,
      ).toBeGreaterThanOrEqual(32);
    }
  }
});

// Revised 4-mark wrap rule: the three partner marks are indivisible - if the
// row cannot fit they drop under Martin together, never one orphan and never
// Galeta alone, with 8px between the two lines. At 320px with 200% text the
// row wraps; the partners must share a line below Martin.
test("the partner marks wrap together under Martin, never one orphan", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto(route);
  await page.evaluate(
    () => (document.documentElement.style.fontSize = "32px"),
  );
  const m = await page.evaluate(() => {
    const row = document.querySelector(".narnia-landscape__supporters")!;
    const lead = row
      .querySelector(".narnia-landscape__supporters-lead")!
      .getBoundingClientRect();
    const [otter, glitter, galeta] = [
      ...row.querySelectorAll(".narnia-landscape__supporters-partners img"),
    ].map((i) => i.getBoundingClientRect());
    return {
      leadBottom: lead.bottom,
      otterTop: otter.top,
      glitterTop: glitter.top,
      galetaTop: galeta.top,
      lineGap: otter.top - lead.bottom,
    };
  });
  expect(m.otterTop).toBeGreaterThan(m.leadBottom + 5);
  expect(Math.abs(m.otterTop - m.glitterTop)).toBeLessThanOrEqual(2);
  expect(Math.abs(m.otterTop - m.galetaTop)).toBeLessThanOrEqual(2);
  expect(Math.abs(m.lineGap - 8), "8px between the two lines").toBeLessThanOrEqual(2);
});

// Design re-review of ca0e1d3 (19 Nov 2026): enlarged text must collapse the
// partner row to one full-width card per row - three narrow columns at 200%
// split CTA labels mid-word ("farm's", "Glitter"). The row collapse keys off
// the page band's inline size (40rem doubles with root text), so it responds
// to available copy width, not viewport alone. Fails on ca0e1d3.
test("enlarged text stacks the partner cards full-width with full-width CTAs", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(route);
  await page.evaluate(
    () => (document.documentElement.style.fontSize = "32px"),
  );
  const m = await page.evaluate(() => {
    const row = document
      .querySelector(".fayre-supporters__row")!
      .getBoundingClientRect();
    return [...document.querySelectorAll(".supporter-card")].map((card) => {
      const c = card.getBoundingClientRect();
      const pad = parseFloat(getComputedStyle(card).paddingLeft);
      const cta = card
        .querySelector(".supporter-card__actions .button")!
        .getBoundingClientRect();
      return {
        top: c.top,
        widthRatio: c.width / row.width,
        ctaRatio: cta.width / (c.width - 2 * pad),
        logoRowH: card.querySelector(".supporter-card__logo")
          ? parseFloat(
              getComputedStyle(card.querySelector(".supporter-card__logo")!).height,
            )
          : null,
        h3Min: getComputedStyle(card.querySelector("h3")!).minHeight,
        name: card.querySelector("h3")!.textContent,
      };
    });
  });
  expect(m.length).toBe(6);
  for (let i = 0; i < 6; i++) {
    expect(m[i].widthRatio, `${m[i].name}: full-width row`).toBeGreaterThan(0.98);
    if (i > 0)
      expect(m[i].top, `${m[i].name}: own row`).toBeGreaterThan(m[i - 1].top + 5);
    expect(m[i].ctaRatio, `${m[i].name}: CTA fills the card`).toBeGreaterThan(0.95);
  }
  // The alignment floors belong only to the side-by-side row: single-column
  // cards keep natural logo rows and no two-line heading minimum. Galeta's
  // short wordmark is the tell: a fixed 7rem row would strand it in an empty
  // band (224px at 200% text); natural sizing keeps it near its ~94px.
  const galeta = m.find((c) => c.name === "Galeta")!;
  expect(galeta.logoRowH, "Galeta: no fixed logo row").toBeLessThan(150);
  expect(galeta.h3Min, "Galeta: no heading floor").toBe("0px");
});

// Design re-review of ca0e1d3 (19 Nov 2026): where the partner cards form a
// row, their CTAs share one consistent size - the card's full internal width.
// Fails on ca0e1d3 (hug-content widths 307/280/198).
test("partner CTAs share one width in the desktop row", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(route);
  const w = await page.evaluate(() =>
    [...document.querySelectorAll(".supporter-card .fayre-supporters__button")].map(
      (b) => b.getBoundingClientRect().width,
    ),
  );
  expect(w.length).toBe(6);
  // Two rows of three equal columns: every CTA spans its card's full
  // internal width, so all six share one width.
  for (let i = 1; i < 6; i++)
    expect(Math.abs(w[0] - w[i]), `card 0/${i} CTA width`).toBeLessThanOrEqual(2);
});

test("partner CTAs share one height across the whole three-column range", async ({
  page,
}) => {
  // Design verdict (19 Nov 2026): below the fit point the farm label wraps and
  // its CTA grows taller than its row-mates, so the three-column switch waits
  // until every label fits one line (72rem = 1152px; measured wrap ~1130px).
  await page.goto(route);
  for (const width of [1152, 1200, 1300, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const h = await page.evaluate(() =>
      [...document.querySelectorAll(".supporter-card .fayre-supporters__button")].map(
        (b) => b.getBoundingClientRect().height,
      ),
    );
    expect(h.length, `CTA count at ${width}`).toBe(6);
    // Row-mates share one CTA height; rows are independent of each other.
    for (const row of [h.slice(0, 3), h.slice(3, 6)]) {
      expect(Math.abs(row[0] - row[1]), `CTA heights at ${width}`).toBeLessThanOrEqual(1);
      expect(Math.abs(row[0] - row[2]), `CTA heights at ${width}`).toBeLessThanOrEqual(1);
    }
  }
  // Below the switch the row stays one full-width card per row (no 3-col wrap).
  await page.setViewportSize({ width: 1100, height: 900 });
  const tops = await page.evaluate(() =>
    [...document.querySelectorAll(".supporter-card")].map(
      (c) => Math.round(c.getBoundingClientRect().top),
    ),
  );
  expect(new Set(tops).size, "partner cards stack below 1152px").toBe(6);
});
