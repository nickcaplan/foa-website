import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the Fayre page lists the six day-of timings from the newsletter, in order", async () => {
  const html = await readFile(new URL("../dist/events/christmas-fayre-2026/index.html", import.meta.url), "utf8");
  const section = html.match(/<section[^>]*aria-labelledby="xmas-timeline-title"[\s\S]*?<\/section>/)?.[0];
  assert.ok(section, "timeline section is on the page");
  assert.match(section, /<h2 id="xmas-timeline-title"[^>]*>On the day<\/h2>/);
  const rows = [...section.matchAll(/<li[^>]*>\s*<time datetime="([^"]+)"[^>]*>([^<]+)<\/time>\s*<span><strong>([^<]+)<\/strong>/g)].map((m) => [m[1], m[2], m[3]]);
  assert.deepEqual(rows, [
    ["2026-12-05T12:00:00.000Z", "12:00", "Fayre opens"],
    ["2026-12-05T13:00:00.000Z", "13:00", "Art Competition winners announced"],
    ["2026-12-05T13:15:00.000Z", "13:15", "Christmas tree auction"],
    ["2026-12-05T13:30:00.000Z", "13:30 - 13:45", "Mini Dance Performers"],
    ["2026-12-05T14:00:00.000Z", "14:00 - 14:15", "Ashley School Choir performance"],
    ["2026-12-05T15:00:00.000Z", "15:00", "Fayre closes"],
  ]);
  assert.ok(section.indexOf("12:00") < section.indexOf("15:00"));
  assert.doesNotMatch(section, /Heathside/);
});

test("the timeline sits before the Art Competition section", async () => {
  const html = await readFile(new URL("../dist/events/christmas-fayre-2026/index.html", import.meta.url), "utf8");
  assert.ok(html.indexOf('aria-labelledby="xmas-timeline-title"') < html.indexOf('aria-labelledby="xmas-art-title"'));
});
