import { test, expect, type Page } from "@playwright/test";

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
    ["supporter-glitter", ["https://theglittertree.com/pages/rewards"]],
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

// The Glitter Tree Rewards code (Nick, 22 Nov 2026): parents get 10% off at
// theglittertree.com with THEFRIENDSOFASHLEY and The Glitter Tree gives 10%
// back to the FOA. Long tokens (the code, the domain) may split only when
// they cannot fit a line of their own. The card hides overflow, so the
// clipping check runs element by element - a document scrollWidth check
// misses a word cut off inside the card (design review, 22 Nov 2026,
// found the domain clipped at 320px/200%).
for (const width of [320, 390])
  for (const scale of [1, 2])
    test(`Glitter Tree card carries the Rewards code at ${width}px, text scale ${scale}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(route);
      if (scale === 2)
        await page.addStyleTag({ content: "html{font-size:200%!important}" });
      const card = page.locator('section[aria-labelledby="supporter-glitter"]');
      await expect(card).toContainText("THEFRIENDSOFASHLEY");
      await expect(card).toContainText("10% off");
      await expect(card).toContainText("10% back to the FOA");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
      ).toBeLessThanOrEqual(1);
      const clipped = await card.evaluate((el) => {
        const bad: string[] = [];
        for (const node of Array.from(el.querySelectorAll("*"))) {
          // .visually-hidden is clipped to 1px on purpose for screen readers.
          if ((node as HTMLElement).classList?.contains("visually-hidden"))
            continue;
          if (node.scrollWidth > node.clientWidth + 1)
            bad.push(
              `${node.tagName.toLowerCase()}.${(node as HTMLElement).className} ${node.scrollWidth}>${node.clientWidth}`,
            );
        }
        return bad;
      });
      expect(clipped).toEqual([]);
    });

// The domain in the Rewards paragraph is a real link to the same Rewards
// page as the Visit button (Nick, 22 Nov 2026: "theglittertree.com - make
// this clickable"), opening safely in a new tab like the other external
// links on the page, and it must stay whole enough to read: it may split
// only when it cannot fit a line of its own.
test("Glitter Tree domain links to the Rewards page from the copy", async ({
  page,
}) => {
  await page.goto(route);
  const card = page.locator('section[aria-labelledby="supporter-glitter"]');
  const link = card.locator(
    '.supporter-card__copy a.supporter-card__domain',
  );
  await expect(link).toHaveCount(1);
  await expect(link).toHaveAttribute(
    "href",
    "https://theglittertree.com/pages/rewards",
  );
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", /noopener/);
  await expect(link).toContainText("theglittertree.com");
  // Screen-reader-only new-tab notice, matching the page's other external links.
  await expect(link.locator(".visually-hidden")).toHaveText(
    " (opens in a new tab)",
  );
  // It reads as a link on the dark card: underlined in the gold accent.
  const style = await link.evaluate((el) => {
    const s = getComputedStyle(el);
    return { decoration: s.textDecorationLine, weight: s.fontWeight };
  });
  expect(style.decoration).toContain("underline");
  expect(Number(style.weight)).toBeGreaterThanOrEqual(700);
  // The site's external-link arrow (Nick, 22 Nov 2026: "Links should always
  // have an arrow with them"), decorative and hidden from screen readers.
  // It sits inline bound to the final fragment (cta-tail), never in the
  // button icon lane (position:absolute is reserved for .button CTAs).
  const icon = link.locator(".external-link-icon");
  await expect(icon).toHaveAttribute("aria-hidden", "true");
  await expect(icon.locator("svg")).toBeVisible();
  const iconPos = await icon.evaluate(
    (el) => getComputedStyle(el).position,
  );
  expect(iconPos).not.toBe("absolute");
  const tail = link.locator(".cta-tail");
  await expect(tail).toHaveCSS("white-space", "nowrap");
  await expect(tail).toContainText("com");
});

// Copy button for the Rewards code (Nick, 22 Nov 2026): one button press
// (click or keyboard) copies THEFRIENDSOFASHLEY, the button label confirms
// in place, and an aria-live region (visually hidden, so nothing moves)
// announces the detail; when the clipboard is unavailable the code is
// selected and the region says how to copy it manually.
// CTA order (Nick, 22 Nov 2026): the copy action leads; the visit link
// follows, keeping the filled style of every other CTA on the page. The
// copy button takes the ghost style.
test("copy code leads as the ghost CTA, visit link follows filled", async ({
  page,
}) => {
  await page.goto("/christmas-fayre-supporters/");
  const actions = page.locator(".supporter-card__actions", {
    has: page.locator("[data-copy-code]"),
  });
  const ctas = actions.locator(".fayre-supporters__button");
  await expect(ctas).toHaveCount(2);
  await expect(ctas.nth(0)).toHaveAttribute("data-copy-code", "THEFRIENDSOFASHLEY");
  await expect(ctas.nth(0)).toHaveClass(/fayre-supporters__button--ghost/);
  await expect(ctas.nth(1)).toHaveAttribute("href", "https://theglittertree.com/pages/rewards");
  await expect(ctas.nth(1)).not.toHaveClass(/fayre-supporters__button--ghost/);
});

test("copy button copies the Rewards code and confirms", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(route);
  const button = page.getByRole("button", {
    name: /copy code thefriendsofashley to the clipboard/i,
  });
  await expect(button).toBeVisible();
  // Decorative copy icon (Nick, 22 Nov 2026): hidden from screen readers,
  // and it must survive every label state.
  const icon = button.locator(".cta-icon");
  await expect(icon).toHaveAttribute("aria-hidden", "true");
  await expect(icon.locator("svg")).toBeVisible();
  await button.press("Enter");
  // Assert the live region first: the confirmation reverts after 4s, and
  // slower assertions ahead of it can push the read past that window on a
  // cold server (the label and region are set in the same synchronous block).
  await expect(page.locator("[data-copy-feedback]")).toHaveText(
    "Code copied to the clipboard.",
  );
  await expect(page.locator("[data-copy-label]")).toContainText("Copied");
  await expect(icon.locator("svg")).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe("THEFRIENDSOFASHLEY");
  // The label reverts after the confirmation window, icon intact.
  await expect(page.locator("[data-copy-label]")).toContainText(/Copy\s*code/, {
    timeout: 8000,
  });
  await expect(icon.locator("svg")).toBeVisible();
});

test("copy failure selects the code and explains the manual route", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: () => Promise.reject(new Error("denied")) },
      configurable: true,
    });
  });
  await page.goto(route);
  await page
    .getByRole("button", { name: /copy code thefriendsofashley/i })
    .click();
  const feedback = page.locator("[data-copy-feedback]");
  await expect(feedback).toContainText("Copy was not available");
  await expect(feedback).toContainText("Ctrl+C");
  await expect(page.locator("[data-copy-label]")).toContainText("Failed");
  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe(
    "THEFRIENDSOFASHLEY",
  );
});

// Design review, 22 Nov 2026: the feedback states must also fit the card at
// 320px with 200% text - the first version's messages embedded the code
// token and clipped about 60px sideways (the flex item could not shrink
// below the token). The messages now avoid the token and the line carries
// min-width:0 with break-word as the last resort.
for (const state of ["success", "failure"] as const)
  test(`copy feedback ${state} fits the card at 320px, 200% text`, async ({
    page,
    context,
  }) => {
    if (state === "success")
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    else
      await page.addInitScript(() => {
        Object.defineProperty(navigator, "clipboard", {
          value: { writeText: () => Promise.reject(new Error("denied")) },
          configurable: true,
        });
      });
    await page.setViewportSize({ width: 320, height: 1000 });
    await page.goto(route);
    await page.addStyleTag({ content: "html{font-size:200%!important}" });
    // The button must keep one line and one height in both states: the icon
    // lane's padding reserve once squeezed "Copy failed" into a two-line
    // wrap, growing the button (measured, 22 Nov 2026).
    const copyButton = page.locator("[data-copy-code]");
    const heightBefore = await copyButton.evaluate(
      (b) => b.getBoundingClientRect().height,
    );
    await page
      .getByRole("button", { name: /copy code thefriendsofashley/i })
      .click();
    const feedback = page.locator("[data-copy-feedback]");
    await expect(feedback).not.toBeEmpty();
    expect(
      await copyButton.evaluate((b) => b.getBoundingClientRect().height),
    ).toBe(heightBefore);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
    const clipped = await page
      .locator('section[aria-labelledby="supporter-glitter"]')
      .evaluate((el) => {
        const bad: string[] = [];
        for (const node of Array.from(el.querySelectorAll("*"))) {
          if ((node as HTMLElement).classList?.contains("visually-hidden"))
            continue;
          if (node.scrollWidth > node.clientWidth + 1)
            bad.push(
              `${node.tagName.toLowerCase()}.${(node as HTMLElement).className} ${node.scrollWidth}>${node.clientWidth}`,
            );
        }
        return bad;
      });
    expect(clipped).toEqual([]);
  });

// Design review, 22 Nov 2026 (second blocker): the confirmation must have a
// fixed footprint - a feedback line that grew from empty shifted the
// neighbouring Ottershaw/Galeta CTAs 67.5px on success and 89.25px on
// failure at 1280px, then back when it cleared. The button label flips in
// place and the live region is visually hidden, so neither outcome may move
// any card, CTA block or the button itself.
const cardFootprint = (page: Page) =>
  page.evaluate(() => {
    // Document-relative: Playwright scrolls the button into view on click,
    // which moves every viewport-relative rect without any layout change.
    const y = window.scrollY;
    const button = document.querySelector("[data-copy-code]");
    return {
      cards: [...document.querySelectorAll(".supporter-card")].map((card) => {
        const c = card.getBoundingClientRect();
        const a = card
          .querySelector(".supporter-card__actions")!
          .getBoundingClientRect();
        return {
          top: c.top + y,
          height: c.height,
          actionsTop: a.top + y,
          actionsBottom: a.bottom + y,
        };
      }),
      button: button
        ? (() => {
            const b = button.getBoundingClientRect();
            return { top: b.top + y, height: b.height, width: b.width };
          })()
        : null,
    };
  });

test("copy success does not move any card or CTA at 1280px", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(route, { waitUntil: "networkidle" });
  const before = await cardFootprint(page);
  await page
    .getByRole("button", { name: /copy code thefriendsofashley/i })
    .click();
  await expect(page.locator("[data-copy-label]")).toHaveText("Copied");
  expect(await cardFootprint(page)).toEqual(before);
});

test("copy failure does not move any card or CTA at 1280px", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: () => Promise.reject(new Error("denied")) },
      configurable: true,
    });
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(route, { waitUntil: "networkidle" });
  const before = await cardFootprint(page);
  await page
    .getByRole("button", { name: /copy code thefriendsofashley/i })
    .click();
  await expect(page.locator("[data-copy-label]")).toContainText("Failed");
  expect(await cardFootprint(page)).toEqual(before);
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
          // Every card carries a logo image now (Giardina's slot holds the
          // tonal Instagram glyph tile), so the null guard is just a guard.
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

// Nick (19 Nov 2026, 22:24, on #213): the desktop rows use the same compact
// structure as mobile - logo top right beside the title, title top left,
// copy and CTA below. Six cards form two rows of three equal columns with
// equal card heights and bottom-aligned CTAs per row; below the switch each
// card takes a full-width row of its own. Fails if the stacked logo band or
// its floors return, or the tablet layout keeps side-by-side cards.
test("desktop partner rows keep the compact structure with aligned CTAs", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(route);
  const m = await page.evaluate(() =>
    [...document.querySelectorAll(".supporter-card")].map((card) => {
      const c = card.getBoundingClientRect();
      const padL = parseFloat(getComputedStyle(card).paddingLeft);
      const padR = parseFloat(getComputedStyle(card).paddingRight);
      const padT = parseFloat(getComputedStyle(card).paddingTop);
      const h3 = card.querySelector("h3")!.getBoundingClientRect();
      const logoImg = card.querySelector(".supporter-card__logo img");
      const logo = logoImg ? logoImg.getBoundingClientRect() : null;
      const cta = card
        .querySelector(".supporter-card__actions")!
        .getBoundingClientRect();
      return {
        top: c.top,
        h: c.height,
        titleTop: h3.top - (c.top + padT),
        titleLeft: h3.left - (c.left + padL),
        logoFlushRight: logo ? c.right - padR - logo.right : null,
        logoVsTitle: logo ? logo.top - h3.top : null,
        ctaBottom: cta.bottom,
      };
    }),
  );
  expect(m.length).toBe(6);
  for (const [rowIdx, row] of [m.slice(0, 3), m.slice(3, 6)].entries()) {
    for (const [i, c] of row.entries()) {
      const label = `1440px row ${rowIdx} card ${i}`;
      expect(Math.abs(c.titleTop), `${label}: title at the top padding`).toBeLessThanOrEqual(2);
      expect(Math.abs(c.titleLeft), `${label}: title flush left`).toBeLessThanOrEqual(2);
      if (c.logoFlushRight !== null) {
        expect(Math.abs(c.logoFlushRight), `${label}: logo flush right`).toBeLessThanOrEqual(2);
        expect(Math.abs(c.logoVsTitle!), `${label}: logo top-aligned with title`).toBeLessThanOrEqual(6);
      }
      expect(Math.abs(row[0].h - c.h), `${label}: equal card height in row`).toBeLessThanOrEqual(2);
      expect(Math.abs(row[0].ctaBottom - c.ctaBottom), `${label}: CTA bottom-aligned`).toBeLessThanOrEqual(2);
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


// Nick (19 Nov 2026, on the design PASS review, #213): no Instagram glyph -
// the logo slot carries an ornate G monogram in a square navy box,
// favicon-like, in Giardina's own colours (navy fascia + white serif
// lettering, sampled from their Google Maps storefront photo; Cinzel
// Decorative, OFL, matches the fascia's Roman capitals). The slot is
// aria-hidden and non-interactive, the heading starts at the card's top
// padding beside it, the CTA bottom-aligns with its row-mates and the outer
// card height matches theirs. Fails if the monogram gains a link, stops
// loading, becomes a white brand panel, or the dead space returns.
test("the Giardina card carries an ornate G monogram tile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(route);
  const tile = page.locator(".supporter-card--monogram img");
  await tile.scrollIntoViewIfNeeded();
  await tile.evaluate((i: HTMLImageElement) =>
    i.complete && i.naturalWidth > 0
      ? true
      : new Promise((res) => i.addEventListener("load", () => res(true), { once: true })),
  );
  const t = await page.evaluate(() => {
    const card = document.querySelector(".supporter-card--monogram")!;
    const c = card.getBoundingClientRect();
    const pad = parseFloat(getComputedStyle(card).paddingTop);
    const slot = card.querySelector(".supporter-card__logo--monogram")!;
    const img = slot.querySelector("img")!;
    const imgR = img.getBoundingClientRect();
    const cs = getComputedStyle(img);
    const h3 = card.querySelector("h3")!;
    const h3r = h3.getBoundingClientRect();
    const copy = card
      .querySelector("p:not(.supporter-card__actions)")!
      .getBoundingClientRect();
    const cta = card
      .querySelector(".supporter-card__actions")!
      .getBoundingClientRect();
    const rowMates = [
      ...document.querySelectorAll(
        ".supporter-card:not(.supporter-card--monogram)",
      ),
    ]
      .map((m) => {
        const r = m.getBoundingClientRect();
        return {
          top: r.top,
          h: r.height,
          ctaBottom: m
            .querySelector(".supporter-card__actions")!
            .getBoundingClientRect().bottom,
        };
      })
      .filter((m) => Math.abs(m.top - c.top) < 5);
    return {
      src: img.getAttribute("src"),
      alt: img.getAttribute("alt"),
      ariaHidden: slot.getAttribute("aria-hidden"),
      interactive: slot.querySelectorAll("a, button").length,
      loaded: img.complete && img.naturalWidth > 0,
      tileBg: cs.backgroundColor,
      tileBorder: cs.borderTopWidth,
      h3TopVsPad: h3r.top - (c.top + pad),
      h3OverlapsTile: !(
        h3r.right <= imgR.left ||
        imgR.right <= h3r.left ||
        h3r.bottom <= imgR.top ||
        imgR.bottom <= h3r.top
      ),
      titleSize: getComputedStyle(h3).fontSize,
      copyGap: copy.top - h3r.bottom,
      cardH: c.height,
      mateH: rowMates.map((m) => m.h),
      ctaBottom: cta.bottom,
      mateCtaBottom: rowMates.map((m) => m.ctaBottom),
    };
  });
  expect(t.src, "tile uses the self-hosted G monogram").toContain(
    "giardina-monogram.svg",
  );
  expect(t.alt, "monogram is decorative").toBe("");
  expect(t.ariaHidden, "monogram slot is aria-hidden").toBe("true");
  expect(t.interactive, "monogram is non-interactive").toBe(0);
  expect(t.loaded, "monogram image loads").toBe(true);
  expect(t.tileBg, "no white brand panel behind the monogram").not.toBe(
    "rgb(255, 255, 255)",
  );
  expect(t.h3OverlapsTile, "heading ink clears the tile").toBe(false);
  expect(t.titleSize, "card keeps the desktop title size").toBe("24px");
  expect(Math.abs(t.h3TopVsPad), "heading at the top padding").toBeLessThanOrEqual(2);
  expect(Math.abs(t.copyGap - 9.6), "normal copy gap").toBeLessThanOrEqual(2);
  expect(t.mateH.length, "two row-mates").toBe(2);
  for (const h of t.mateH)
    expect(Math.abs(t.cardH - h), "equal outer card height").toBeLessThanOrEqual(2);
  for (const b of t.mateCtaBottom)
    expect(Math.abs(t.ctaBottom - b), "CTA bottom-aligned").toBeLessThanOrEqual(2);
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
  const sizes = async () =>
    page.evaluate(() =>
      [...document.querySelectorAll(".supporter-card h3")].map((h) =>
        parseFloat(getComputedStyle(h).fontSize),
      ),
    );
  await page.setViewportSize({ width: 1440, height: 900 });
  expect(await sizes(), "1440px desktop row").toEqual(Array(6).fill(24));
  await page.setViewportSize({ width: 1152, height: 900 });
  expect(await sizes(), "1152px switch: already the desktop row").toEqual(Array(6).fill(24));
  await page.setViewportSize({ width: 1151, height: 900 });
  expect(await sizes(), "1151px single column").toEqual(Array(6).fill(20));
  await page.setViewportSize({ width: 390, height: 900 });
  expect(await sizes(), "390px phone").toEqual(Array(6).fill(20));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(
    () => (document.documentElement.style.fontSize = "32px"),
  );
  expect(await sizes(), "1440px at 200% text stays compact-spec").toEqual(Array(6).fill(40));
});

// Design re-review of 96024ee (19 Nov 2026, round 7): the page shared the
// Fayre social card, whose alt text describes the Fayre date and venue.
// Supporters now has its own card with accurate alt text. The v3 card
// (20 Nov 2026) shows the seven sponsor logos and its alt names all seven.
test("supporters has its own social card with accurate alt text", async ({
  page,
}) => {
  await page.goto(route);
  const ogImage = page.locator('meta[property="og:image"]');
  await expect(ogImage).toHaveAttribute(
    "content",
    /fayre-supporters-2026-v3\.jpg/,
  );
  const alt = await page
    .locator('meta[property="og:image:alt"]')
    .getAttribute("content");
  expect(alt).toContain("Martin Flashman and Co");
  expect(alt).toContain("Ottershaw Christmas Tree Farm");
  expect(alt).toContain("The Glitter Tree");
  expect(alt).toContain("Galeta");
  expect(alt).toContain("W3 Colour");
  expect(alt).toContain("Moore's Tree Company");
  expect(alt).toContain("Giardina Family Butchers");
});

// Nick (19 Nov 2026, 18:38, design agent Direction A): small sponsor marks in
// the hero, directly below the subtitle. A non-interactive duplicate group:
// names and links stay in the body cards. Nick (19 Nov 2026, 22:26): W3
// Colour and Moore's Tree Company join as tiled marks. Nick (22:32): no text
// treatment for Giardina - the hero carries logo marks only; Giardina stays
// on its card. Fails on main, where the row does not exist.
test("the hero shows the sponsor mark row below the subtitle, non-interactive", async ({
  page,
}) => {
  await page.goto(route);
  const row = page.locator(".narnia-landscape__supporters");
  await expect(row).toHaveCount(1);
  await expect(row).toHaveAttribute("aria-hidden", "true");
  const imgs = row.locator("img");
  await expect(imgs).toHaveCount(6);
  for (const img of await imgs.all()) await expect(img).toHaveAttribute("alt", "");
  await expect(imgs.nth(0)).toHaveAttribute("src", /martin-flashman\.png/);
  await expect(imgs.nth(1)).toHaveAttribute("src", /ottershaw/);
  await expect(imgs.nth(2)).toHaveAttribute("src", /glitter-tree/);
  await expect(imgs.nth(3)).toHaveAttribute("src", /galeta\.svg/);
  await expect(imgs.nth(4)).toHaveAttribute("src", /w3-colour\.svg/);
  await expect(imgs.nth(5)).toHaveAttribute("src", /moores-tree-company\.jpg/);
  // No text mark for Giardina anywhere in the hero.
  await expect(row.locator(".narnia-landscape__supporters-word")).toHaveCount(0);
  // Nothing in the row is a link or otherwise interactive.
  await expect(row.locator("a, button")).toHaveCount(0);
  // It sits directly after the subtitle in the hero copy.
  const order = await page.evaluate(() => {
    const intro = document.querySelector(".narnia-landscape__intro")!;
    const row = document.querySelector(".narnia-landscape__supporters")!;
    return intro.nextElementSibling === row;
  });
  expect(order).toBe(true);
  // The five partner marks share one wrapper.
  const shared = await page.evaluate(() => {
    const partners = document.querySelector(
      ".narnia-landscape__supporters-partners",
    )!;
    return partners.querySelectorAll("img").length === 5;
  });
  expect(shared).toBe(true);
});

// Six-mark spec (19 Nov 2026, after Nick added W3 and Moore's to the hero),
// CSS px per viewport tier: Martin first and widest (152/176/200/224),
// Ottershaw 24x34 at 320 (28x40 from 390, 34x48 from 768px), Glitter, W3 and
// Moore's on 34px white tiles (40px from 390, 48px from 768px), Galeta's
// dark-ink wordmark on a 68x34 cream tile (80x40 from 390, 88x48 at 768,
// 96x48 at 1440; #FFF6EB, Glitter's 4px radius), gaps 12/20/24 (1440 keeps
// the 768 gaps so all six marks share one line inside the 624px column). On
// phones the partner group wraps under Martin as a unit on one line with 8px
// between the lines; from 768px all six share one line. Giardina has no hero
// mark (Nick, 22:32: logo marks only). Fails on any size drift.
test("the hero sponsor row matches the six-mark sizes", async ({ page }) => {
  const tiers = [
    { w: 320, lead: 152, side: [24, 34], tile: 34, galeta: [68, 34], gap: 12, lines: 2 },
    { w: 390, lead: 176, side: [28, 40], tile: 40, galeta: [80, 40], gap: 20, lines: 2 },
    { w: 768, lead: 200, side: [34, 48], tile: 48, galeta: [88, 48], gap: 24, lines: 1 },
    { w: 1440, lead: 224, side: [34, 48], tile: 48, galeta: [96, 48], gap: 24, lines: 1 },
  ];
  for (const t of tiers) {
    await page.setViewportSize({ width: t.w, height: 900 });
    await page.goto(route);
    const m = await page.evaluate(() => {
      const row = document.querySelector(".narnia-landscape__supporters")!;
      const lead = row
        .querySelector(".narnia-landscape__supporters-lead")!
        .getBoundingClientRect();
      const imgs = [
        ...row.querySelectorAll(".narnia-landscape__supporters-partners img"),
      ].map((i) => i.getBoundingClientRect());
      const [otter, glitter, galeta, w3, moores] = imgs;
      const gaps = [];
      for (let k = 0; k + 1 < imgs.length; k++) {
        if (Math.abs(imgs[k].top - imgs[k + 1].top) < 2)
          gaps.push(imgs[k + 1].left - imgs[k].right);
      }
      return {
        lead: { w: lead.width, top: lead.top, bottom: lead.bottom },
        otter: [otter.width, otter.height],
        glitter: [glitter.width, glitter.height],
        galeta: [galeta.width, galeta.height],
        w3: [w3.width, w3.height],
        moores: [moores.width, moores.height],
        partnerTop: otter.top,
        partnerTops: imgs.map((r) => r.top),
        gaps,
        lineGap: otter.top - lead.bottom,
        tileBgs: [
          ...row.querySelectorAll(".narnia-landscape__supporters-tile"),
        ].map((i) => getComputedStyle(i).backgroundColor),
        creamBg: getComputedStyle(
          row.querySelector(".narnia-landscape__supporters-cream")!,
        ).backgroundColor,
      };
    });
    expect(Math.abs(m.lead.w - t.lead), `${t.w}px lead width`).toBeLessThanOrEqual(1);
    expect(Math.abs(m.otter[0] - t.side[0]), `${t.w}px otter width`).toBeLessThanOrEqual(1);
    expect(Math.abs(m.otter[1] - t.side[1]), `${t.w}px otter height`).toBeLessThanOrEqual(1);
    for (const [name, g] of [["glitter", m.glitter], ["w3", m.w3], ["moores", m.moores]] as const) {
      expect(Math.abs(g[0] - t.tile), `${t.w}px ${name} tile width`).toBeLessThanOrEqual(1);
      expect(Math.abs(g[1] - t.tile), `${t.w}px ${name} tile height`).toBeLessThanOrEqual(1);
    }
    expect(Math.abs(m.galeta[0] - t.galeta[0]), `${t.w}px galeta tile width`).toBeLessThanOrEqual(1);
    expect(Math.abs(m.galeta[1] - t.galeta[1]), `${t.w}px galeta tile height`).toBeLessThanOrEqual(1);
    for (const bg of m.tileBgs)
      expect(bg, `${t.w}px partner tiles are white`).toBe("rgb(255, 255, 255)");
    expect(m.creamBg, `${t.w}px galeta tile is warm cream`).toBe("rgb(255, 246, 235)");
    if (t.lines === 2) {
      expect(m.partnerTop, `${t.w}px: partner group wraps under Martin`).toBeGreaterThan(m.lead.bottom + 5);
      expect(Math.abs(m.lineGap - 8), `${t.w}px: 8px between the two lines`).toBeLessThanOrEqual(2);
    } else {
      expect(m.gaps.length, `${t.w}px: partners share one line`).toBe(4);
      for (const g of m.gaps)
        expect(Math.abs(g - t.gap), `${t.w}px partner gap`).toBeLessThanOrEqual(1);
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

// Six-mark wrap rule (19 Nov 2026): whatever the viewport and text size, the
// hero row must never overflow horizontally and every mark stays inside the
// hero. At 320px with 200% text the partner group drops under Martin as a
// block with 8px between the lines. Fails on any horizontal scrollbar or a
// mark escaping the hero bounds.
test("the hero marks never overflow and stay inside the hero", async ({
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
        const hero = document
          .querySelector(".narnia-landscape")!
          .getBoundingClientRect();
        const row = document.querySelector(".narnia-landscape__supporters")!;
        const lead = row
          .querySelector(".narnia-landscape__supporters-lead")!
          .getBoundingClientRect();
        const parts = [
          ...row.querySelectorAll(".narnia-landscape__supporters-partners img"),
        ].map((i) => i.getBoundingClientRect());
        return {
          scrollW: document.documentElement.scrollWidth,
          clientW: document.documentElement.clientWidth,
          heroL: hero.left,
          heroR: hero.right,
          heroB: hero.bottom,
          leadBottom: lead.bottom,
          partnerTop: parts[0].top,
          lineGap: parts[0].top - lead.bottom,
          parts: parts.map((r) => ({
            top: r.top, left: r.left, right: r.right, bottom: r.bottom,
          })),
        };
      });
      const label = `${width}px ${scale * 100}%`;
      expect(m.scrollW, `${label}: no horizontal overflow`).toBeLessThanOrEqual(m.clientW);
      for (const [i, p] of m.parts.entries()) {
        expect(p.left, `${label}: mark ${i} inside hero (left)`).toBeGreaterThanOrEqual(m.heroL - 1);
        expect(p.right, `${label}: mark ${i} inside hero (right)`).toBeLessThanOrEqual(m.heroR + 1);
        expect(p.bottom, `${label}: mark ${i} inside hero (bottom)`).toBeLessThanOrEqual(m.heroB + 1);
      }
      if ((width === 320 || width === 390) && scale === 2) {
        expect(m.partnerTop, `${label}: partner group drops under Martin`).toBeGreaterThan(m.leadBottom + 5);
        expect(Math.abs(m.lineGap - 8), `${label}: 8px between the lines`).toBeLessThanOrEqual(2);
        // Design agent final review (19 Nov 2026): enlarged text wraps the
        // group an intentional 3+2 - Ottershaw/Glitter/Galeta, then
        // W3/Moore's - never a 4+1 orphan line.
        const lines = new Map<number, number>();
        for (const p of m.parts) {
          const key = [...lines.keys()].find((k) => Math.abs(k - p.top) < 2);
          lines.set(key ?? p.top, (lines.get(key ?? p.top) ?? 0) + 1);
        }
        const counts = [...lines.entries()].sort((a, b) => a[0] - b[0]).map(([, n]) => n);
        expect(counts, `${label}: intentional 3+2 wrap, no orphan`).toEqual([3, 2]);
      }
    }
  }
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
// row, their outbound CTAs share one consistent size - the card's full
// internal width. Fails on ca0e1d3 (hug-content widths 307/280/198). The
// selector counts the link CTAs only: the Glitter card also carries an
// in-page copy-code button (Nick, 22 Nov 2026), which is not a partner CTA.
test("partner CTAs share one width in the desktop row", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(route);
  const w = await page.evaluate(() =>
    [...document.querySelectorAll(".supporter-card a.fayre-supporters__button")].map(
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
      [...document.querySelectorAll(".supporter-card a.fayre-supporters__button")].map(
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
