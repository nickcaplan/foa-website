import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

// 20 November 2026: Nick's phone caught the Supporters hero showing three
// empty white boxes on a slow connection. Tiles and logos now stay invisible
// until their bytes arrive (then fade in), hero artwork is preloaded, and the
// below-fold footer logo is lazy. These tests pin that contract.

const dist = new URL("../dist/", import.meta.url);
const read = (path) => readFile(new URL(path, dist), "utf8");
// CI builds with a base path (e.g. /foa-website); local builds use /.
const base = (process.env.BASE_PATH || "/").replace(/\/$/, "");
const withBase = (path) => `${base}${path}`;

test("every page carries the head image-reveal script, gated and error-safe", async () => {
  const pages = ["index.html", "christmas-fayre-supporters/index.html", "committee/index.html", "uniform/index.html"];
  for (const page of pages) {
    const html = await read(page);
    const script = html.match(/<script data-image-reveal>([\s\S]*?)<\/script>/)?.[1];
    assert.ok(script, `${page}: inline reveal script present in the head`);
    assert.match(script, /classList\.add\("img-reveal"\)/, `${page}: gates the CSS on scripting being on`);
    for (const type of ["load", "error"]) {
      assert.match(script, new RegExp(`"${type}"`), `${page}: listens for ${type}`);
    }
    assert.match(script, /true\)/, `${page}: listeners use capture (load/error do not bubble)`);
    assert.match(script, /is-loaded/, `${page}: failed images are revealed so alt text still shows`);
  }
});

test("the reveal rule never hides images without scripting and respects reduced motion", async () => {
  const cssName = (await readdir(new URL("_astro/", dist))).find((name) => /^BaseLayout\..*\.css$/.test(name));
  assert.ok(cssName, "shared stylesheet found");
  const css = await read(`_astro/${cssName}`);
  // Gated on html.img-reveal, which only the inline script sets.
  assert.match(css, /html\.img-reveal img\.reveal-on-load:not\(\.is-loaded\)\{opacity:0\}/);
  const motionBlocks = [...css.matchAll(/@media ?\(prefers-reduced-motion:no-preference\)\{(.*?)\}\}/gs)].map((m) => m[1]);
  assert.ok(motionBlocks.some((block) => /img\.reveal-on-load\{transition:opacity/.test(block)), "fade only when motion is allowed");
  // Without the reduced-motion guard there is no transition at all.
  const outside = css.replace(/@media ?\(prefers-reduced-motion:no-preference\)\{[^@]*\}/gs, "");
  assert.doesNotMatch(outside, /reveal-on-load\{transition/, "no transition outside the motion guard");
});

test("supporter tiles and cards never paint as empty boxes", async () => {
  const html = await read("christmas-fayre-supporters/index.html");
  const hero = html.match(/narnia-landscape__supporters"[\s\S]*?<\/span>\s*<\/div>/)?.[0];
  assert.ok(hero, "hero supporters strip found");
  const heroImgs = [...hero.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
  assert.equal(heroImgs.length, 6, "six hero logos");
  for (const tag of heroImgs) {
    assert.match(tag, /class="[^"]*reveal-on-load/, `hero logo fades in: ${tag.slice(0, 80)}`);
  }
  const cards = [...html.matchAll(/<img\b[^>]*loading="lazy"[^>]*>/g)].map((m) => m[0]);
  // Lead well, six card logos, the site footer logo and the lazy mobile menu logo.
  assert.deepEqual(cards.map((tag) => tag.match(/src="([^"]*)"/)?.[1]).sort(), [
    "/brand/foa-logo-christmas-ivory.svg",
    "/brand/foa-logo-christmas-ivory.svg",
    "/brand/glitter-tree.webp",
    "/sponsors/galeta.svg",
    "/sponsors/giardina-monogram.svg",
    "/sponsors/martin-flashman.png",
    "/sponsors/moores-tree-company.jpg",
    "/sponsors/ottershaw-christmas-tree-farm.png",
    "/sponsors/w3-colour.svg",
  ].map(withBase).sort());
  for (const tag of cards) {
    assert.match(tag, /class="[^"]*reveal-on-load/, `lazy logo fades in: ${tag.slice(0, 80)}`);
    assert.match(tag, /decoding="async"/, "lazy logos decode off the main thread");
  }
});

test("the hero artwork is preloaded on the Christmas hero pages", async () => {
  for (const page of ["index.html", "events/christmas-fayre-2026/index.html", "christmas-fayre-supporters/index.html", "christmas-fayre-art-competition/index.html"]) {
    const html = await read(page);
    const preloads = [...html.matchAll(/<link\b[^>]*rel="preload"[^>]*as="image"[^>]*>/g)];
    assert.deepEqual(preloads.map((m) => m[0].match(/href="([^"]*)"/)?.[1]),
      [withBase("/brand/narnia-hero-landscape.avif")], `${page}: exactly one image preload, the hero artwork`);
  }
});

test("below-fold brand images are lazy, brand logos fade in everywhere", async () => {
  const html = await read("committee/index.html");
  const footer = html.match(/<footer\b[\s\S]*?<\/footer>/)?.[0];
  assert.match(footer, /<img\b[^>]*loading="lazy"[^>]*>/, "footer logo is below the fold and lazy");
  for (const tag of [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0])) {
    assert.match(tag, /reveal-on-load/, `every committee-page image fades in: ${tag.slice(0, 90)}`);
  }
});
