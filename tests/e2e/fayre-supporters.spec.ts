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
  await expect(page.locator("h1")).toHaveText("Fayre supporters");
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
      [
        "https://www.mauricemandry.com/",
        "https://www.instagram.com/ottershawchristmastreefarm/",
      ],
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

// Day-mode contrast guard: the hero title sits on the pale view-hero panel
// (--green-light #dfeadd), where the shared xmas gold gradient reads 1.18:1.
// The page override paints a solid deep gold (4.82:1) in day mode only.
// Fails without the fayre-supporters.css day override (colour + fill + gradient).
test("hero title keeps at least 3:1 contrast on the pale day panel", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("foa-theme", "day"));
  await page.goto(route);
  const title = page.locator(".fayre-supporters-hero .view-hero h1");
  await expect(title).toBeVisible();
  const ratio = await title.evaluate((el) => {
    const lum = (rgb: number[]) => {
      const f = (c: number) =>
        c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      const [r, g, b] = rgb.map((c) => f(c / 255));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const parse = (s: string) =>
      s
        .match(/[\d.]+/g)!
        .slice(0, 3)
        .map(Number);
    const style = getComputedStyle(el);
    if (style.backgroundImage !== "none")
      throw new Error(
        `title still paints a gradient: ${style.backgroundImage}`,
      );
    const fill = style.webkitTextFillColor;
    const panel = getComputedStyle(el.closest(".view-hero")!).backgroundColor;
    const [hi, lo] = [lum(parse(fill)), lum(parse(panel))].sort(
      (a, b) => b - a,
    );
    return (hi + 0.05) / (lo + 0.05);
  });
  expect(ratio).toBeGreaterThanOrEqual(3);
});
