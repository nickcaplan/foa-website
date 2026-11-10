import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const standard = "foa-logo-ivory.svg";
const routes = [
  ["index.html", standard],
  ["uniform/index.html", standard],
  ["newsletter/index.html", standard],
  ["events/christmas-fayre-2026/index.html", "foa-logo-christmas-ivory.svg"],
];

test("ivory variants change only the badge fill and preserve the original artwork", async () => {
  for (const name of ["foa-logo", "foa-logo-fireworks", "foa-logo-christmas", "foa-logo-newsletter"]) {
    const original = await readFile(new URL(`../assets/brand/${name}.svg`, import.meta.url), "utf8");
    const ivory = await readFile(new URL(`../dist/brand/${name}-ivory.svg`, import.meta.url), "utf8");
    const badge = /(<circle\b[^>]*\br="220\.75"[^>]*\bfill=")#fff(")/g;
    assert.equal([...original.matchAll(badge)].length, 1);
    assert.equal(ivory, original.replace(badge, "$1#f3ead6$2"));
  }
});

test("shared branding uses ivory artwork without giving the standard logo festive sizing", async () => {
  for (const [route, logo] of routes) {
    const html = await readFile(new URL(`../dist/${route}`, import.meta.url), "utf8");
    const header = html.match(/<header\b[\s\S]*?<\/header>/)?.[0];
    const mobile = route === "index.html" ? html.match(/class="homepage-mobile-identity"[\s\S]*?<\/div>/)?.[0] : html.match(/class="mobile-page-logo page-logo-home"[\s\S]*?<\/a>/)?.[0];
    const menu = html.match(/class="mobile-menu-home"[\s\S]*?<\/a>/)?.[0];
    for (const region of [header, mobile, menu]) {
      assert.ok(region, `${route}: branding region exists`);
      assert.ok(region.includes(`/brand/${logo}`), `${route}: correct ivory variant`);
      if (logo === standard) assert.doesNotMatch(region, /brand-logo--festive/);
    }
    const footer = html.match(/<footer\b[\s\S]*?<\/footer>/)?.[0];
    // Only the Christmas Fayre page swaps in its own footer logo (30 October 2026).
    const footerLogo = route.startsWith("events/christmas-fayre-2026/") ? logo : standard;
    assert.ok(footer?.includes(`/brand/${footerLogo}`), `${route}: ivory footer`);
  }
});

test("the 404 badge and standalone contact branding also use ivory", async () => {
  const notFound = await readFile(new URL("../dist/404.html", import.meta.url), "utf8");
  assert.match(notFound, /<circle[^>]*r="220\.75"[^>]*fill="#f3ead6"/);
  const playground = await readFile(new URL("../dist/playground.html", import.meta.url), "utf8");
  assert.ok(playground.includes(`/brand/${standard}`));
});

test("the Fireworks logo keeps the standard badge sizing so there is no size jump between pages", async () => {
  for (const name of ["foa-logo-fireworks", "foa-logo-fireworks-ivory"]) {
    const svg = await readFile(new URL(`../assets/brand/${name}.svg`, import.meta.url), "utf8");
    assert.match(svg, /viewBox="-46\.75 -46\.75 550 550"/, name);
  }
});

test("the Christmas logo keeps its viewBox so badge sizing is unchanged", async () => {
  for (const name of ["foa-logo-christmas", "foa-logo-christmas-ivory"]) {
    const svg = await readFile(new URL(`../assets/brand/${name}.svg`, import.meta.url), "utf8");
    assert.match(svg, /viewBox="-31\.5 -53\.5 522\.5 522\.5"/, name);
  }
});
