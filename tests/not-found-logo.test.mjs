import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the crying logo drops the PTA label and the two lower icons", async () => {
  const html = await readFile(new URL("../dist/404.html", import.meta.url), "utf8");
  const svg = html.match(/<svg class="crying-logo"[\s\S]*?<\/svg>/)?.[0];
  assert.ok(svg, "crying logo is on the 404 page");
  // Four source paths (hexagons, title, PTA, icons): the PTA label is gone and the icons are clipped to the top hexagon.
  assert.match(svg, /clip-path="url\(#crying-logo-top-icon\)"/);
  assert.match(svg, /<clipPath id="crying-logo-top-icon"/);
  assert.doesNotMatch(svg, /fill="#105f5a"/, "PTA label path is removed");
});
