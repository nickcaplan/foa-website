import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the newsletter uses the standard site logo on desktop, mobile and in the menu while keeping the standard letterheads and footer", async () => {
  // Approved 17th October 2026: no envelope variant anywhere on the page.
  const html = await readFile(new URL("../dist/newsletter/index.html", import.meta.url), "utf8");
  assert.doesNotMatch(html, /newsletter-logo-page/);
  assert.doesNotMatch(html, /foa-logo-newsletter-ivory\.svg/);
  for (const region of [
    html.match(/<header\b[\s\S]*?<\/header>/)?.[0],
    html.match(/class="mobile-page-logo page-logo-home"[\s\S]*?<\/a>/)?.[0],
    html.match(/class="mobile-menu-home"[\s\S]*?<\/a>/)?.[0],
  ]) {
    assert.ok(region);
    assert.match(region, /src="[^"]*\/brand\/foa-logo-ivory\.svg"/);
  }
  // Nick, 25 Nov 2026: the envelope logo returns for the Newsletter link preview only.
  assert.match(html, /property="og:image" content="[^"]*\/brand\/foa-logo-newsletter-envelope-og\.png"/);
  assert.match(html, /name="twitter:image" content="[^"]*\/brand\/foa-logo-newsletter-envelope-og\.png"/);
  assert.match(html, /property="og:image:width" content="1200"/);
  assert.match(html, /property="og:image:height" content="630"/);
  assert.doesNotMatch(html, /<img[^>]+foa-logo-newsletter-envelope-og/);
  assert.match(html.match(/<footer\b[\s\S]*?<\/footer>/)?.[0] ?? "", /src="[^"]*\/brand\/foa-logo-ivory\.svg"/);
  const letterheads = html.match(/class="newsletter-letterhead"[^>]*>[\s\S]*?<\/div>/g);
  assert.ok(letterheads?.length);
  for (const letterhead of letterheads) {
    assert.match(letterhead, /src="[^"]*\/brand\/foa-logo\.svg"/);
  }
});

test("the default social preview is a 1200 by 630 PNG", async () => {
  const image = await readFile(new URL("../dist/brand/foa-logo-og.png", import.meta.url));
  assert.equal(image.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(image.readUInt32BE(16), 1200);
  assert.equal(image.readUInt32BE(20), 630);
});

test("the compact envelope fits within the circle's width without seams entering the logo", async () => {
  const svg = await readFile(new URL("../assets/brand/foa-logo-newsletter.svg", import.meta.url), "utf8");
  assert.match(svg, /M100 320L275 469L450 320V508H100Z/);
  assert.match(svg, /translate\(85 29\) scale\(0\.8315098468271335\)/);
  assert.ok(100 - 4 > 85, "The envelope's left outline stays inside the circle width");
  assert.ok(450 + 4 < 85 + 380, "The envelope's right outline stays inside the circle width");
  const seams = svg.match(/M100 508L([\d.]+) ([\d.]+)M450 508L([\d.]+) ([\d.]+)/);
  assert.ok(seams);
  for (const [x, y] of [[Number(seams[1]), Number(seams[2])], [Number(seams[3]), Number(seams[4])]]) {
    assert.ok(Math.hypot(x - 275, y - 219) > 190, "The seam stops outside the round logo");
  }
});

test("the newsletter link preview card is a 1200 by 630 PNG of the envelope logo", async () => {
  const image = await readFile(new URL("../dist/brand/foa-logo-newsletter-envelope-og.png", import.meta.url));
  assert.equal(image.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(image.readUInt32BE(16), 1200);
  assert.equal(image.readUInt32BE(20), 630);
});
