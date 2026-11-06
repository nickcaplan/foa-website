import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import test from "node:test";
import { academicYearLabel } from "../src/lib/academic-year.ts";

test("What's On is the canonical indexed year view with no duplicate prototype route", async () => {
  const html = await readFile("dist/whats-on/index.html", "utf8");
  assert.ok(html.includes(academicYearLabel()));
  assert.match(html, /data-yearview-term/);
  assert.match(html, /data-yearview-earlier/);
  assert.match(html, /<h2[^>]*>Autumn term<\/h2>/);
  assert.match(html, /<h3[^>]*>November/);
  assert.doesNotMatch(html, /Fireworks on the Field|events\/fireworks-2026\//);
  assert.doesNotMatch(html, /content="noindex/);
  await assert.rejects(access("dist/prototype/year-view/index.html"));
});

test("past rows retain dates and detail links but never publish active helper or ticket appeals", async () => {
  const html = await readFile("dist/whats-on/index.html", "utf8");
  const pastSection = html.slice(html.indexOf("data-yearview-earlier"));
  assert.match(pastSection, /data-past="true"/);
  assert.doesNotMatch(pastSection, /events\/fireworks-2026\//);
  assert.doesNotMatch(pastSection, /class="(?:event-list-actions|event-list-cta|event-list-info)/);
  assert.match(html.slice(0, html.indexOf("data-yearview-earlier")), /What are Happy Bags\?/);
});
