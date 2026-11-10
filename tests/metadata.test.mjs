import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const dist = path.resolve("dist");
const siteUrl = (process.env.SITE_URL || "https://example.com").replace(/\/$/, "");
const basePath = (process.env.BASE_PATH || "/").replace(/\/$/, "");

// Every built HTML page is checked unless it has an explicit reason not to be indexed.
const excluded = new Set([
  "/events/fireworks-2026/", // redirect checked separately
  "/fireworks-volunteering/", // redirect checked separately
  "/playground.html", // hidden, noindex contact prototype; checked separately below
  "/404.html", // error page, not a sitemap entry; checked separately below
]);

const discoverRoutes = async (directory = dist, prefix = "") => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    if (entry.isDirectory()) return discoverRoutes(path.join(directory, entry.name), `${prefix}/${entry.name}`);
    if (entry.name === "index.html") return [`${prefix}/`];
    return entry.name.endsWith(".html") ? [`${prefix}/${entry.name}`] : [];
  }));
  return nested.flat();
};

const publicRoutes = (await discoverRoutes()).filter((route) => !excluded.has(route) && !route.startsWith("/preview/")).sort();

const htmlFor = (route) => path.join(dist, route.replace(/^\//, ""), route.endsWith("/") ? "index.html" : "");
const read = (file) => readFile(file, "utf8");

const decodeHtml = (value) => value?.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (entity, code) => {
  if (code[0] === "#") return String.fromCodePoint(parseInt(code.slice(code[1].toLowerCase() === "x" ? 2 : 1), code[1].toLowerCase() === "x" ? 16 : 10));
  return { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" }[code.toLowerCase()] ?? entity;
});
const titleOf = (html) => decodeHtml(html.match(/<title>([^<]+)<\/title>/)?.[1]);
const attribute = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
const tagsOf = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "g"))].map((match) => match[0]);
const metaContent = (html, key, value) =>
  decodeHtml(attribute(tagsOf(html, "meta").find((tag) => attribute(tag, key) === value) ?? "", "content"));
const canonicalOf = (html) =>
  attribute(tagsOf(html, "link").find((tag) => attribute(tag, "rel") === "canonical") ?? "", "href");
const exists = async (file) => stat(file).then(() => true, () => false);

test("public routes are discovered from the build, including the homepage", () => {
  assert.ok(publicRoutes.includes("/"), "the build must include the homepage");
  for (const route of excluded) {
    assert.ok(!publicRoutes.includes(route), `${route} must be checked separately`);
  }
});

test("public pages declare language, one h1, one main landmark, a title and a description", async () => {
  const problems = [];
  for (const route of publicRoutes) {
    const html = await read(htmlFor(route));
    if (!/<html lang="en-GB"/.test(html)) problems.push(`${route}: missing lang="en-GB"`);
    const visibleHtml = html.replace(/<div class="hero-event"[^>]*\shidden(?:="[^"]*")?>[\s\S]*?(?=<div class="hero-event"|<div class="quick-list)/g, "");
    if ((visibleHtml.match(/<h1\b/g) ?? []).length !== 1) problems.push(`${route}: expected exactly one h1`);
    if ((html.match(/<main\b/g) ?? []).length !== 1) problems.push(`${route}: expected exactly one main`);
    if (!/<title>[^<]+\| The Friends of Ashley<\/title>|<title>The Friends of Ashley \|/.test(html)) problems.push(`${route}: title missing or off-pattern`);
    if (!metaContent(html, "name", "description")) problems.push(`${route}: missing meta description`);
  }

  assert.deepEqual(problems, []);
});

test("canonical and og:url match the deployed site URL and base path for every page", async () => {
  const problems = [];
  for (const route of publicRoutes) {
    const html = await read(htmlFor(route));
    const expected = `${siteUrl}${basePath}${route}`;
    if (canonicalOf(html) !== expected) problems.push(`${route}: canonical ${canonicalOf(html)} !== ${expected}`);
    if (metaContent(html, "property", "og:url") !== expected) problems.push(`${route}: og:url !== ${expected}`);
  }

  assert.deepEqual(problems, []);
});

test("social metadata uses the shared naming and a social image that exists", async () => {
  const problems = [];
  for (const route of publicRoutes) {
    const html = await read(htmlFor(route));
    if (metaContent(html, "property", "og:site_name") !== "The Friends of Ashley") problems.push(`${route}: og:site_name`);
    if (!metaContent(html, "property", "og:title")) problems.push(`${route}: og:title missing`);
    if (!metaContent(html, "property", "og:description")) problems.push(`${route}: og:description missing`);
    if (metaContent(html, "name", "twitter:card") !== "summary_large_image") problems.push(`${route}: twitter:card`);

    const image = metaContent(html, "property", "og:image");
    const expectedPrefix = `${siteUrl}${basePath}/`;
    if (!image?.startsWith(expectedPrefix)) {
      problems.push(`${route}: og:image ${image} does not start with ${expectedPrefix}`);
      continue;
    }
    const file = path.join(dist, decodeURIComponent(image.slice(expectedPrefix.length)));
    if (!(await exists(file))) problems.push(`${route}: og:image file not found (${image})`);
  }

  assert.deepEqual(problems, []);
});

test("robots.txt allows crawling and points to the sitemap for this site and base path", async () => {
  const robots = await read(path.join(dist, "robots.txt"));

  assert.match(robots, /^User-agent: \*$/m);
  assert.match(robots, /^Allow: \/$/m);
  assert.doesNotMatch(robots, /^Disallow:/m);
  assert.ok(
    robots.includes(`Sitemap: ${siteUrl}${basePath}/sitemap-index.xml`),
    `robots.txt should reference ${siteUrl}${basePath}/sitemap-index.xml, got:\n${robots}`,
  );
});

test("the sitemap lists every public route once, and nothing else", async () => {
  const index = await read(path.join(dist, "sitemap-index.xml"));
  assert.ok(index.includes(`${siteUrl}${basePath}/sitemap-0.xml`), "sitemap index should reference sitemap-0.xml");

  const sitemap = await read(path.join(dist, "sitemap-0.xml"));
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]).sort();
  const expected = publicRoutes.map((route) => `${siteUrl}${basePath}${route}`).sort();

  assert.deepEqual(locations, expected);
});

test("the contact playground is hidden from search engines and the sitemap", async () => {
  const playground = await read(path.join(dist, "playground.html"));
  const sitemap = await read(path.join(dist, "sitemap-0.xml"));

  assert.match(playground, /<meta name="robots" content="noindex">/);
  assert.ok(!sitemap.includes("playground"), "playground must not appear in the sitemap");
});

test("the 404 page is generated and kept out of the sitemap", async () => {
  const notFound = await read(path.join(dist, "404.html"));
  const sitemap = await read(path.join(dist, "sitemap-0.xml"));

  assert.match(notFound, /<h1\b/);
  assert.ok(!sitemap.includes("404"), "404 must not appear in the sitemap");
});

test("retired Fireworks redirects are excluded from indexing and point home", async () => {
  for (const route of ["/events/fireworks-2026/", "/fireworks-volunteering/"]) {
    const html = await read(htmlFor(route));
    assert.match(html, /http-equiv="refresh"/);
    assert.ok(html.includes(`url=${basePath}/`));
    assert.doesNotMatch(html, /application\/ld\+json/);
    assert.ok(!(await read(path.join(dist, "sitemap-0.xml"))).includes(route));
  }
});

test("the development-only tools are not shipped in the production build", async () => {
  for (const route of publicRoutes) {
    const html = await read(htmlFor(route));
    assert.ok(!html.includes("data-mobile-preview"), `${route} contains the mobile-preview control`);
    assert.ok(!html.includes("data-reset-cookie-preferences"), `${route} contains the cookie-reset developer control`);
    assert.ok(!html.includes("dev-tools"), `${route} contains developer tooling markup`);
  }
});


test("every dedicated event page includes its UK date in sharing metadata", async () => {
  const files = await readdir(path.resolve("src/content/events"));
  const eventRoutes = [];
  for (const file of files.filter((name) => name.endsWith(".json"))) {
    const event = JSON.parse(await read(path.resolve("src/content/events", file)));
    if (!event.path?.startsWith("/events/") || excluded.has(event.path)) continue;
    eventRoutes.push(event.path);
    const html = await read(htmlFor(event.path));
    const date = new Date(event.start);
    const day = Number(new Intl.DateTimeFormat("en-GB", { day: "numeric", timeZone: "Europe/London" }).format(date));
    const suffix = day % 100 >= 11 && day % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" }[day % 10] || "th");
    const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "Europe/London" }).format(date);
    const monthYear = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "Europe/London" }).format(date);
    const expectedDate = `${weekday} ${day}${suffix} ${monthYear}`;
    const title = metaContent(html, "property", "og:title");
    const description = metaContent(html, "property", "og:description");
    const pageTitle = event.path === "/events/fireworks-2026/" ? `${event.title} has finished` : event.title;
    if(event.path === "/events/christmas-fayre-2026/") assert.equal(title,"Christmas Fayre | Saturday 5 December 2026 | Ashley School");
    else assert.equal(title, `${pageTitle} - ${expectedDate} | The Friends of Ashley`, event.path);
    if(event.path === "/events/christmas-fayre-2026/") assert.ok(description.includes("Saturday 5 December, 12:00 - 15:00"));
    else assert.ok(description.startsWith(`${expectedDate}. `), event.path);
    assert.equal(metaContent(html, "name", "description"), description, event.path);
    assert.equal(metaContent(html, "name", "twitter:title"), title, event.path);
    assert.equal(metaContent(html, "name", "twitter:description"), description, event.path);
    assert.equal(titleOf(html), `${pageTitle} | The Friends of Ashley`, "browser title identifies the current landing");
  }
  assert.deepEqual(eventRoutes.sort(), publicRoutes.filter((route) => route.startsWith("/events/")), "every dedicated event route must have a canonical event record");
});

test("non-event pages keep their existing metadata without a sale date", async () => {
  for (const route of publicRoutes.filter((route) => !route.startsWith("/events/"))) {
    const html = await read(htmlFor(route));
    const customTitles = {"/":"The Friends of Ashley | Ashley School PTA","/whats-on/":"What's On at Ashley | The Friends of Ashley","/christmas-fayre-volunteering/":"Volunteer at the Christmas Fayre | Ashley School"};
    const expectedTitle=customTitles[route] ?? titleOf(html);
    assert.equal(metaContent(html, "property", "og:title"), expectedTitle, route);
    assert.equal(metaContent(html, "property", "og:description"), metaContent(html, "name", "description"), route);
    assert.equal(metaContent(html, "name", "twitter:title"), expectedTitle, route);
    assert.equal(metaContent(html, "name", "twitter:description"), metaContent(html, "name", "description"), route);
  }
});


test("metadata comparisons decode escaped event titles without double decoding", () => {
  const text = `Santa's \"Crafts\" & Games <2027>`;
  const encoded = "Santa&#39;s &quot;Crafts&quot; &amp; Games &lt;2027&gt;";
  assert.equal(titleOf(`<title>${encoded}</title>`), text);
  assert.equal(metaContent(`<meta property="og:title" content="${encoded}">`, "property", "og:title"), text);
  assert.equal(decodeHtml("&#x27;&#34;&apos;"), `'"'`);
  assert.equal(decodeHtml("&amp;lt;"), "&lt;");
});

test("design preview routes are noindex and omitted from the sitemap", async () => {
  const sitemap=await read(path.join(dist,"sitemap-0.xml"));
  for(const route of (await discoverRoutes()).filter(r=>r.startsWith("/preview/"))) {
    const html=await read(htmlFor(route));
    assert.match(html, /name="robots" content="noindex/);
    assert.ok(!sitemap.includes(route));
  }
});
