import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

test("all pages share the larger desktop introduction/navigation row and an independent mobile burger", async () => {
  const homepage = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
  assert.match(homepage, /<header\b[^>]*class="site-header site-header--home"/);
  assert.equal(homepage.match(/<button\b[^>]*\bdata-menu-toggle(?:\s|>)/g)?.length, 1);
  assert.equal(homepage.match(/\bdata-theme-toggle(?=[\s=>])/g)?.length, 2);
  assert.match(homepage, /class="mobile-menu-theme"[\s\S]*?data-theme-toggle/);
  assert.match(homepage, /aria-label="Primary navigation"/);
  const homeHeader = homepage.match(/<header\b[\s\S]*?<\/header>/)?.[0];
  assert.ok(homeHeader);
  assert.doesNotMatch(homeHeader, /class="brand"/);
  assert.match(homeHeader, /class="home-introduction"/);
  assert.equal(homepage.match(/class="home-introduction"/g)?.length, 1);

  for (const route of ["uniform/index.html", "events/fireworks-2026/index.html", "events/christmas-fayre-2026/index.html"]) {
    const html = await readFile(new URL(`../dist/${route}`, import.meta.url), "utf8");
    const header = html.match(/<header\b[\s\S]*?<\/header>/)?.[0];
    assert.ok(header, route);
    assert.match(header, /aria-label="Primary navigation"/, route);
    assert.equal(header.match(/\bdata-theme-toggle(?=[\s=>])/g)?.length, 1, route);
    assert.equal(html.match(/<button\b[^>]*\bdata-menu-toggle(?:\s|>)/g)?.length, 1, route);
    assert.equal(html.match(/\bdata-theme-toggle(?=[\s=>])/g)?.length, 2, route);
    assert.match(html, /class="mobile-menu-theme"[\s\S]*?data-theme-toggle/, route);
    assert.match(html, /<a class="mobile-menu-home" href="\/(?:foa-website\/)?" aria-label="The Friends of Ashley home">/, route);
    assert.match(html, /aria-label="Event details"[\s\S]*?href="\/(?:foa-website\/)?events\/fireworks-2026\/"[\s\S]*?href="\/(?:foa-website\/)?events\/christmas-fayre-2026\/"/, route);
    const menuStart = html.indexOf('id="mobile-menu"');
    assert.ok(menuStart > html.indexOf("</header>"), route);
    assert.match(html.slice(menuStart), /data-theme-toggle\b/, route);
    assert.match(header, /class="brand home-introduction"/, route);
    assert.match(header, /<img[^>]*width="160"[^>]*height="160"/, route);
    const pageLogo = html.match(/<a class="mobile-page-logo page-logo-home"[\s\S]*?<\/a>/)?.[0];
    assert.ok(pageLogo, route);
    assert.match(pageLogo, /href="\/(?:foa-website\/)?" aria-label="The Friends of Ashley home">/, route);
    assert.match(pageLogo, /<img[^>]*width="160"[^>]*height="160"/, route);
    assert.doesNotMatch(pageLogo, /<p\b|<strong\b|<span\b/, route);
    assert.ok(html.indexOf(pageLogo) < html.indexOf("<h1"), route);
    assert.match(html, /class="mobile-page-heading">[\s\S]*?class="mobile-page-logo page-logo-home"[\s\S]*?class="mobile-page-heading-copy">[\s\S]*?<h1/, route);
    assert.doesNotMatch(html, /class="site-width mobile-page-logo"/, route);
    assert.doesNotMatch(header, /data-menu-toggle/, route);
    assert.doesNotMatch(html, /data-header-menu-sentinel\b/, route);
  }
});

test("the homepage retains desktop branding and uses the shared inline mobile logo", async () => {
  const html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
  const introduction = html.match(/<div\b[^>]*\bclass="home-introduction"[^>]*>[\s\S]*?<\/div>/)?.[0];
  assert.ok(introduction);
  assert.match(introduction, /The Friends of Ashley/);
  assert.match(introduction, /<img[^>]*width="160"[^>]*height="160"/);
  assert.ok(html.indexOf(introduction) < html.indexOf("<h1"));
  const main = html.match(/<main\b[\s\S]*?<\/main>/)?.[0];
  assert.ok(main);
  assert.match(main, /class="hero-copy">\s*<div class="mobile-page-heading">[\s\S]*?class="mobile-page-logo page-logo-home"[\s\S]*?class="mobile-page-heading-copy">[\s\S]*?<h1>Fireworks on the <em>Field\.<\/em><\/h1>/);
  assert.doesNotMatch(main, /mobile-home-introduction|class="home-introduction"|Ashley C of E Primary School PTA/);
  assert.doesNotMatch(main, /Parent-led\. Child-focused\. All welcome\.|class="eyebrow">Parent-led/);
});

test("the footer logo links home on the homepage and interior pages", async () => {
  for (const route of ["index.html", "uniform/index.html"]) {
    const html = await readFile(new URL(`../dist/${route}`, import.meta.url), "utf8");
    assert.match(html, /<a class="footer-brand-home" href="\//, route);
  }
});

test("every public page embeds one mobile home-linked logo beside its heading", async () => {
  const discoverPages = async (directory) => {
    const entries = await readdir(directory, { withFileTypes: true });
    return (await Promise.all(entries.map((entry) => {
      const path = new URL(entry.name + (entry.isDirectory() ? "/" : ""), directory);
      return entry.isDirectory() ? discoverPages(path) : entry.name.endsWith(".html") ? [path] : [];
    }))).flat();
  };
  const root = new URL("../dist/", import.meta.url);
  for (const path of await discoverPages(root)) {
    if (path.href === new URL("playground.html", root).href) continue;
    const html = await readFile(path, "utf8");
    const main = html.match(/<main\b[\s\S]*?<\/main>/)?.[0];
    assert.ok(main, path.pathname);
    assert.equal(main.match(/class="mobile-page-logo page-logo-home"/g)?.length, 1, path.pathname);
    assert.match(main, /class="mobile-page-heading">[\s\S]*?class="mobile-page-logo page-logo-home"[\s\S]*?class="mobile-page-heading-copy">[\s\S]*?<h1/, path.pathname);
    if (html.includes('class="view-hero')) {
      assert.match(main, /<section class="view-hero[\s\S]*?class="mobile-page-heading"[\s\S]*?<\/h1>\s*<\/div>\s*<\/div>\s*<p>/, path.pathname);
    }
  }
});
