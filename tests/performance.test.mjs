import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";
import test from "node:test";

const dist = path.resolve("dist");
const base = (process.env.BASE_PATH || "/").replace(/\/$/, "");
const kib = 1024;
// Headroom above the optimised October 2026 build, not target load timings.
// Don't silently raise a failing budget.
const routes = [
  // Raised 11 November 2026 for the approved Christmas wreath identity-bar logo
  // (foa-logo-christmas-ivory.svg, 43 KiB) alongside the Narnia hero artwork.
  { route: "/", eagerImageKiB: 140 },
  { route: "/whats-on/", eagerImageKiB: 100 },
  ...["newsletter", "fundraising", "get-involved", "uniform", "contact"].map((name) => ({
    route: `/${name}/`, eagerImageKiB: 100,
  })),
];
const attribute = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
const localFile = (url) => {
  if (!url || !url.startsWith("/") || url.startsWith("//")) return null;
  assert.ok(!base || url.startsWith(`${base}/`), `asset ${url} must respect base ${base}`);
  return path.join(dist, decodeURIComponent(url.slice(base.length).split(/[?#]/)[0]));
};

for (const { route, eagerImageKiB } of routes) {
  test(`performance asset budgets: ${route}`, async (t) => {
    const html = await readFile(path.join(dist, route, "index.html"), "utf8");
    const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
      .filter(([, attrs]) => attribute(` ${attrs}`, "type") !== "application/ld+json");
    const inline = scripts.filter(([, attrs]) => !attribute(` ${attrs}`, "src"))
      .map(([, , body]) => body).join("\n");
    const scriptFiles = new Set(scripts.map(([, attrs]) => localFile(attribute(` ${attrs}`, "src"))).filter(Boolean));
    const styleFiles = new Set();
    const imageFiles = new Set();
    for (const [tag] of html.matchAll(/<(?:link|img)\b[^>]*>/g)) {
      if (tag.startsWith("<img") && attribute(tag, "loading") !== "lazy") {
        // Count the largest candidate once: a conservative viewport-independent budget.
        const candidates = (attribute(tag, "srcset") || "").split(",").filter(Boolean);
        const largest = candidates.at(-1)?.trim().split(/\s+/)[0];
        const file = localFile(largest || attribute(tag, "src"));
        if (file) imageFiles.add(file);
      }
      if (tag.startsWith("<link")) {
        const file = localFile(attribute(tag, "href"));
        if (!file) continue;
        if (attribute(tag, "rel") === "stylesheet") styleFiles.add(file);
        if (attribute(tag, "rel") === "preload" && attribute(tag, "as") === "image") {
          const largest = attribute(tag, "imagesrcset")?.split(",").at(-1)?.trim().split(/\s+/)[0];
          imageFiles.add(localFile(largest) || file);
        }
      }
    }
    const compressedBytes = async (files) => (await Promise.all([...files].map(async (file) => gzipSync(await readFile(file)).length)))
      .reduce((sum, bytes) => sum + bytes, 0);
    const scriptGzip = gzipSync(inline).length + await compressedBytes(scriptFiles);
    const styleGzip = await compressedBytes(styleFiles);
    const images = await Promise.all([...imageFiles].map(async (file) => ({
      asset: path.relative(dist, file), bytes: (await stat(file)).size,
    })));
    const eagerImages = images.reduce((sum, image) => sum + image.bytes, 0);
    t.diagnostic(JSON.stringify({ route, htmlBytes: Buffer.byteLength(html), scriptGzipBytes: scriptGzip,
      stylesheetGzipBytes: styleGzip, eagerImageBytes: eagerImages, images }));
    assert.ok(scriptGzip <= 4 * kib, `${route}: referenced/inline JS gzip estimate ${scriptGzip} exceeds 4 KiB`);
    assert.ok(styleGzip <= 18.25 * kib, `${route}: stylesheet gzip estimate ${styleGzip} exceeds 18.25 KiB`);
    assert.ok(eagerImages <= eagerImageKiB * kib, `${route}: eager image bytes ${eagerImages} exceed ${eagerImageKiB} KiB`);
  });
}

test("homepage ships no poster photo or image preload", async () => {
  // Nick's call: the hero poster photo is removed, so the homepage must not
  // fetch it eagerly or preload it. The per-route eager-image budget above
  // keeps the remaining images honest.
  const html = await readFile(path.join(dist, "index.html"), "utf8");
  const fireworksImage = [...html.matchAll(/<img\b[^>]*>/g)].map(([tag]) => tag)
    .find((tag) => attribute(tag, "src")?.includes("/events/fireworks-"));
  assert.equal(fireworksImage, undefined, "no fireworks photo on the homepage");
  const imagePreload = [...html.matchAll(/<link\b[^>]*>/g)].map(([tag]) => tag)
    .find((tag) => attribute(tag, "rel") === "preload" && attribute(tag, "as") === "image");
  assert.equal(imagePreload, undefined, "no image preload on the homepage");
});

test("the term-by-term listing does not download event posters", async () => {
  const html = await readFile(path.join(dist, "whats-on/index.html"), "utf8");
  assert.match(html, /data-yearview-earlier/);
  assert.doesNotMatch(html, /<img[^>]*src="[^"]*\/events\//);
});
