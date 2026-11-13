import assert from "node:assert/strict";
import test from "node:test";
import { renderInline } from "../src/lib/inline.ts";

test("HTML in content is escaped", () => {
  const html = renderInline(`<script>alert("x")</script> & more`);
  assert.doesNotMatch(html, /<script/);
  assert.equal(html, "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; more");
});

test("external links open safely in a new tab and announce it", () => {
  const html = renderInline("[Donate](https://example.org/give)");
  assert.match(html, /href="https:\/\/example\.org\/give"/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /\(opens in a new tab\)/);
  assert.match(html, /><span class="cta-word">Donat<span class="cta-tail">e<span class="external-link-icon" aria-hidden="true">/);
});

test("mailto links use the shared decorative envelope, without opening a new tab", () => {
  const html = renderInline("[Email us](mailto:hello@example.org)");
  assert.match(html, /href="mailto:hello@example\.org"/);
  assert.match(html, /class="cta-icon" aria-hidden="true"/);
  assert.match(html, /m3 7 9 6 9-6/);
  assert.doesNotMatch(html, /target=/);
});

test("URL labels keep only their final character with the icon so domains can wrap", () => {
  for (const label of ["ashleyschool.org.uk/calendar", "tinyurl.com/foa-feedback", "Visit ashleyschool.org.uk/calendar"]) {
    const html = renderInline(`[${label}](https://example.org/)`);
    assert.ok(html.includes(`>${label.slice(0, -1)}<span class="cta-tail">${label.slice(-1)}<span`));
    assert.ok(!html.includes(`<span class="cta-tail">${label}`));
  }
  const escaped = renderInline('[example.org/&](https://example.org/)');
  assert.match(escaped, /example\.org\/<span class="cta-tail">&amp;<span/);
});

test("ordinary multiword labels glue only the final word to the icon", () => {
  assert.match(renderInline("[Read the calendar](https://example.org/)"), /Read the <span class="cta-word">calenda<span class="cta-tail">r<span/);
});

test("links to our website use the existing text-link style and open in the same tab", () => {
  assert.equal(
    renderInline("[Event information](https://www.thefriendsofashley.org/events/fireworks-2026/)"),
    '<a class="text-link" href="/events/fireworks-2026/">Event information</a>',
  );
});

test("internal newsletter links use the supplied base-aware URL helper", () => {
  const html = renderInline(
    "[Uniform](https://www.thefriendsofashley.org/uniform/?size=small&item=coat#requests)",
    (path) => `/foa-website${path}`,
  );
  assert.equal(html, '<a class="text-link" href="/foa-website/uniform/?size=small&amp;item=coat#requests">Uniform</a>');
  assert.equal(renderInline("[Home](https://www.thefriendsofashley.org/)"), '<a class="text-link" href="/">Home</a>');
});

test("lookalike hosts and URLs with credentials are not treated as internal", () => {
  for (const href of [
    "https://www.thefriendsofashley.org.example.com/uniform/",
    "https://www.thefriendsofashley.org@other.example/uniform/",
    "https://user@www.thefriendsofashley.org/uniform/",
  ]) {
    assert.match(renderInline(`[Visit](${href})`), /target="_blank"/);
  }
});

test("only http, https and mailto links are linkified", () => {
  for (const href of ["javascript:alert(1)", "data:text/html,x", "/relative", "ftp://example.org"]) {
    const html = renderInline(`[x](${href})`);
    assert.doesNotMatch(html, /<a /, href);
  }
});

test("a quote in a link target cannot break out of the attribute", () => {
  const html = renderInline(`[x](https://example.org/"onmouseover="alert(1))`);
  assert.doesNotMatch(html, /onmouseover="/);
});

test("bold and italic are rendered, including inside link text", () => {
  assert.equal(renderInline("**bold** and *italic*"), "<strong>bold</strong> and <em>italic</em>");
  assert.match(renderInline("[**Go**](https://example.org)"), /<strong>Go<\/strong>/);
});

test("plain text is unchanged", () => {
  assert.equal(renderInline("Doors open at 3:25pm."), "Doors open at 3:25pm.");
});
