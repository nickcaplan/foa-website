import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { isHidden } from "../src/lib/event-visibility.ts";

const dist = path.resolve("dist");
const basePath = (process.env.BASE_PATH || "/").replace(/\/$/, "");

const filesUnder = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(target) : [target];
  }));
  return nested.flat();
};

const outputPath = (urlPath) => {
  const decoded = decodeURIComponent(urlPath.split(/[?#]/, 1)[0]);
  const withoutBase = basePath && decoded.startsWith(`${basePath}/`)
    ? decoded.slice(basePath.length)
    : decoded;
  const relative = withoutBase.replace(/^\//, "");
  if (!relative || relative.endsWith("/")) return path.join(dist, relative, "index.html");
  return path.join(dist, relative);
};

const welcomeTea = JSON.parse(await readFile(path.resolve("src/content/events/welcome-tea-2026.json"), "utf8"));
const archiveFrom = new Date(welcomeTea.archiveFrom).toISOString();
const appeal = JSON.parse(await readFile(path.resolve("src/content/fundraising/current-appeal.json"), "utf8"));
const money = (value) => `£${value.toLocaleString("en-GB")}`;

test("Fireworks defaults to immersive experience with shared guide facts and no poster", async () => {
  const html = await readFile(path.join(dist, "events/fireworks-2026/index.html"), "utf8");
  assert.match(html, /<body[^>]*fw-theme/);
  assert.match(html, /<div[^>]*data-fw-stage[^>]*data-fw-paused/);
  assert.match(html, /<canvas[^>]*data-fw-sky[^>]*width="0"[^>]*height="0"/);
  assert.doesNotMatch(html, /data-fw-mode|Immersive/);
  assert.doesNotMatch(html, /fireworks-poster\.jpg|ferris wheel/i);
  for (const fact of ["no on-site parking", "Harmony Centre", "St John Ambulance", "Event closes", "cash or card", "subject to availability"]) {
    assert.ok(html.includes(fact), `Missing guide fact: ${fact}`);
  }
});

test("the Christmas Fayre page keeps its social card within chat size limits", async () => {
  const html = await readFile(path.join(dist, "events/christmas-fayre-2026/index.html"), "utf8");
  assert.match(html, /<meta\b[^>]*property="og:image"[^>]*foa-logo-christmas-og\.png/);
  // WhatsApp drops link preview images over 600KB, so the Christmas
  // preview is a compact PNG card (approved 18 October 2026).
  const image = await readFile(path.join(dist, "brand/foa-logo-christmas-og.png"));
  assert.equal(image.readUInt32BE(16), 1200);
  assert.equal(image.readUInt32BE(20), 630);
  assert.ok(image.length < 600 * 1024, `foa-logo-christmas-og.png is ${image.length} bytes`);
});

test("both Fireworks pages keep their social image within chat size limits", async () => {
  for (const route of ["events/fireworks-2026", "fireworks-volunteering"]) {
    const html = await readFile(path.join(dist, route, "index.html"), "utf8");
    assert.doesNotMatch(html, /<link\b[^>]*rel="preload"[^>]*fireworks-1600\.jpg/);
    assert.match(html, /<meta\b[^>]*property="og:image"[^>]*foa-logo-fireworks-og\.png/, route);
  }
  // WhatsApp drops link preview images over 600KB, so the Fireworks
  // preview is a compact PNG card (approved 18 October 2026).
  const image = await readFile(path.join(dist, "brand/foa-logo-fireworks-og.png"));
  assert.ok(image.length < 600 * 1024, `foa-logo-fireworks-og.png is ${image.length} bytes`);
});

test("Get Involved exposes the AGM volunteer teams and shared enquiry route", async () => {
  const html = await readFile(path.join(dist, "get-involved/index.html"), "utf8");
  const groupHeadings = [...html.matchAll(/<h2 id="group-[^"]+">([^<]+)<\/h2>/g)].map((match) => match[1]);
  assert.deepEqual(groupHeadings, ["Help at an event", "Put your skills to use", "Support throughout the year"]);
  assert.ok(html.indexOf('id="volunteering-title"') < html.indexOf('id="group-green"'));
  assert.ok(html.indexOf('id="group-neutral"') < html.indexOf('id="closing-title"'));
  for (const role of ["Pre-loved uniform sales", "Quartermasters", "Event comperes", "Eco Stall lead", "Fireworks shadowing", "Lead a community event"]) {
    assert.ok(html.includes(`<h3>${role}`), `Missing volunteer team: ${role}`);
  }
  assert.match(html, /Summer Fete and Big Picnic/);
  assert.match(html, /Plans and dates are still to be confirmed/);
  assert.doesNotMatch(html, /Could you help lead an event\?|Not ready to lead\?/);
  assert.ok(html.includes('href="mailto:thefriendsofashley@gmail.com?subject=Volunteering%20with%20The%20FOA"'));
  for (const route of ["uniform", "reps"]) {
    assert.ok(html.includes(`href="${basePath}/${route}/"`));
  }
});

test("Reps Hub puts shareable messages first and preserves ticket links and sale timings when copied", async () => {
  const html = await readFile(path.join(dist, "reps/index.html"), "utf8");
  assert.ok(html.indexOf('class="message-grid"') < html.indexOf('id="reps-role-title"'));
  const cards = [...html.matchAll(/<article class="message-card"[^>]*>([\s\S]*?)<\/article>/g)].map((match) => match[1]);
  assert.equal(cards.length, 4);
  const fireworks = JSON.parse(await readFile(path.resolve("src/content/events/fireworks-2026.json"), "utf8"));
  const uniform = JSON.parse(await readFile(path.resolve("src/content/events/uniform-november-2026.json"), "utf8"));
  const fayre = JSON.parse(await readFile(path.resolve("src/content/events/christmas-fayre-2026.json"), "utf8"));
  assert.ok(cards[0].includes(`href="${fireworks.ticketUrl}"`));
  assert.ok(cards[0].includes("Buy Fireworks tickets"));
  assert.ok(cards[0].match(/data-copy-text="([^"]*)"/)?.[1].includes(`Buy Fireworks tickets: ${fireworks.ticketUrl}`));
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" });
  const range = `${time.format(new Date(uniform.start))}-${time.format(new Date(uniform.end))}`;
  assert.ok(cards[2].match(/data-copy-text="([^"]*)"/)?.[1].includes(range));
  for (const date of [uniform.start, uniform.end]) {
    assert.ok(cards[2].includes(`datetime="${new Date(date).toISOString()}"`));
  }
  const fayreRange = `${time.format(new Date(fayre.start))}-${time.format(new Date(fayre.end))}`;
  assert.ok(cards[3].includes('class="message-time"'));
  assert.ok(cards[3].replace(/<[^>]+>/g, "").includes(fayreRange));
  for (const date of [fayre.start, fayre.end]) {
    assert.ok(cards[3].includes(`datetime="${new Date(date).toISOString()}"`));
  }
  assert.ok(cards[2].includes("weather permitting"));
  assert.ok(cards[3].includes("rather than stalls being assigned to year groups"));
  assert.ok(cards[3].includes("No experience needed"));
  for (const [index, route] of ["/events/fireworks-2026/", "/fireworks-volunteering/", "/uniform/", "/events/christmas-fayre-2026/"].entries()) {
    const url = `https://www.thefriendsofashley.org${basePath}${route}`;
    assert.ok(cards[index].includes(`>${url}</a>`), `Missing visible URL: ${url}`);
    assert.ok(cards[index].match(/data-copy-text="([^"]*)"/)?.[1].includes(url), `Missing copied URL: ${url}`);
  }
  for (const role of fireworks.volunteerRoles) {
    assert.ok(cards[1].includes(role.name.toLowerCase()));
  }
  assert.doesNotMatch(cards.join(""), /—|Tombola, Entrance &amp; Tokens, and Glitter Tattoos/);
  assert.doesNotMatch(html, /class leads for the Christmas Fayre/);
  assert.equal([...html.matchAll(/data-reviewed="2026-10-11"/g)].length, 2);
  assert.equal([...html.matchAll(/data-reviewed="2026-10-30"/g)].length, 1);
  assert.ok(cards[0].includes("Download the event guide"));
  assert.ok(cards[0].includes(`>${`https://www.thefriendsofashley.org${basePath}`}/events/fireworks-2026-event-guide.pdf</a>`));
  assert.ok(cards[0].match(/data-copy-text="([^"]*)"/)?.[1].includes(`Download the event guide: https://www.thefriendsofashley.org${basePath}/events/fireworks-2026-event-guide.pdf`));
  assert.equal([...html.matchAll(/data-reviewed="2026-10-26"/g)].length, 1);
  assert.equal(fayreRange, "12:00-15:00");
  assert.ok(cards[3].match(/data-copy-text="([^"]*)"/)?.[1].includes(`${fayreRange} at Ashley School`));
  assert.ok(html.includes('data-expires-at="2026-12-05T15:00:00.000Z"'));
  assert.ok(cards[0].includes("now on sale to the wider public"));
  assert.ok(cards[0].match(/data-copy-text="([^"]*)"/)?.[1].includes("now on sale to the wider public"));
  assert.equal([...html.matchAll(/data-expires-at="/g)].length, 4);
});

test("Christmas Fayre organisers include approved surnames and class names across the site", async () => {
  const christmas = JSON.parse(await readFile(path.resolve("src/content/events/christmas-fayre-2026.json"), "utf8"));
  assert.equal(christmas.lead, "Rachel Briscoe (Squirrel and Otter) and Sophie Glass (Fox)");
  for (const route of ["newsletter", "events/christmas-fayre-2026", "get-involved", "reps"]) {
    const html = await readFile(path.join(dist, route, "index.html"), "utf8");
    for (const lead of christmas.lead.split(/(?<=\)) and /)) {
      assert.ok(html.includes(lead), `${route} should include the approved organiser names and classes`);
    }
  }
});

test("navigation exposes the menu on Home and both menus on interior pages", async () => {
  for (const route of ["index.html", "fundraising/index.html"]) {
    const html = await readFile(path.join(dist, route), "utf8");
    const labels = route === "index.html" ? ["Mobile navigation"] : ["Primary navigation", "Mobile navigation"];
    for (const label of labels) {
      const nav = html.match(new RegExp(`<nav[^>]*aria-label="${label}"[^>]*>([\\s\\S]*?)<\\/nav>`))?.[1];
      assert.ok(nav);
      const destinations = [...nav.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
      const expected = ["/", "/newsletter/", "/whats-on/", "/fundraising/", "/get-involved/", "/uniform/"];
      if (label === "Mobile navigation") {
        expected.splice(3, 0, "/events/fireworks-2026/", "/events/christmas-fayre-2026/");
        expected.push("/contact/");
      }
      assert.deepEqual(destinations, expected.map((destination) => `${basePath}${destination}`));
      if (route.startsWith("fundraising/")) {
        assert.match(nav, /href="[^"]*\/fundraising\/" aria-current="page"/);
      }
    }
  }
});

test("fundraising uses shared totals, approved estimates and annual support", async () => {
  const html = await readFile(path.join(dist, "fundraising/index.html"), "utf8");
  const homepage = await readFile(path.join(dist, "index.html"), "utf8");
  const about = await readFile(path.join(dist, "about/index.html"), "utf8");
  const raised = appeal.sources.reduce((sum, { amount }) => sum + amount, 0);
  const planned = appeal.priorities.reduce((sum, { estimate }) => sum + estimate, 0);
  for (const page of [html, homepage]) {
    assert.ok(page.includes(money(raised)));
    assert.ok(page.includes(money(appeal.target)));
    assert.ok(page.includes(`aria-valuenow="${Math.min(raised, appeal.target)}"`));
  }
  for (const page of [homepage, about]) {
    assert.ok(page.includes(`href="${basePath}/fundraising/"`));
  }
  const homepageBand = homepage.match(/<section class="fundraising-update"[\s\S]*?<\/section>/)?.[0];
  assert.ok(homepageBand);
  assert.doesNotMatch(homepageBand, /Donate via JustGiving/);
  for (const page of [html, about]) assert.ok(page.includes(money(appeal.previousYear.raised)));
  for (const { label, amount } of appeal.sources) {
    assert.ok(html.includes(label));
    assert.ok(html.includes(money(amount)));
  }
  for (const { title, estimate } of appeal.priorities) {
    assert.ok(html.includes(title));
    assert.ok(html.includes(money(estimate)));
  }
  assert.ok(html.includes(money(planned)));
  // Astro escapes apostrophes in text nodes; compare visible copy, not its encoding.
  const visibleCopy = html.replace(/&#(?:39|x27);/gi, "'");
  for (const { title, items } of appeal.annualSupport) {
    assert.ok(visibleCopy.includes(title));
    for (const { label } of items) assert.ok(visibleCopy.includes(label));
  }
  assert.ok(html.includes(`datetime="${appeal.updated}"`));
  assert.doesNotMatch(html, /gross income/i);
});

test("production ships the responsive Night Mode theme but none of the local development tools", async () => {
  const outputFiles = (await filesUnder(dist)).filter((file) => /\.(html|css|js)$/.test(file));
  let themeStyles = false;
  for (const file of outputFiles) {
    const content = await readFile(file, "utf8");
    assert.doesNotMatch(content, /data-dev-|foa-dev-night-mode/, path.relative(dist, file));
    // Dev tool CSS is bundled with the header component, so only markup and scripts are checked for the tools themselves.
    if (!/\.css$/.test(file)) {
      // Component styles are inlined on the standalone playground; only the rendered tool markup/scripts are forbidden.
      const markupAndScripts = content.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
      assert.doesNotMatch(markupAndScripts, /dev-tools|data-mobile-preview/, path.relative(dist, file));
    }
    if (/\.css$/.test(file) && /data-theme=["']?night/.test(content)) themeStyles = true;
  }
  assert.ok(themeStyles, "the Night Mode stylesheet is built");
  for (const page of ["index.html", "404.html", "uniform/index.html"]) {
    const html = await readFile(path.join(dist, page), "utf8");
    assert.equal(html.match(/data-theme-initializer/g)?.length, 1, page);
    const expectedToggles = 2;
    assert.equal(html.match(/data-theme-toggle(?!\])/g)?.length, expectedToggles, page);
    if (page === "index.html") {
      assert.match(html, /<header\b[^>]*class="site-header site-header--home"/, `${page} shares the introduction and desktop navigation in one header`);
      assert.match(html, /class="mobile-menu-theme"[\s\S]*?data-theme-toggle/, `${page} places Night Mode in the menu`);
    } else {
      assert.match(html, /<header\b[\s\S]*?data-theme-toggle[\s\S]*?<\/header>/, `${page} keeps the desktop control in the header`);
      assert.match(html, /class="mobile-menu-theme"[\s\S]*?data-theme-toggle/, `${page} keeps the mobile control in the menu`);
    }
    assert.ok(html.indexOf("data-theme-initializer") < html.indexOf("<body"), `${page} sets the theme before the body`);
  }
});

test("the homepage omits the recruitment notice and every footer logo links home", async () => {
  const html = await readFile(path.join(dist, "index.html"), "utf8");
  assert.doesNotMatch(html, /class="notice-strip"/);
  const htmlFiles = (await filesUnder(dist)).filter((file) => file.endsWith(".html"));
  for (const file of htmlFiles) {
    if (path.basename(file) === "playground.html") continue;
    const page = await readFile(file, "utf8");
    if (!page.includes('<footer class="site-footer">')) continue;
    const logo = page.match(/<a class="footer-brand-home" href="([^"]+)"/);
    assert.ok(logo, path.relative(dist, file));
    assert.equal(logo[1], `${basePath}/`, path.relative(dist, file));
  }
});

test("the footer and mobile menu share social links without adding them to primary navigation", async () => {
  const html = await readFile(path.join(dist, "index.html"), "utf8");
  const group = html.match(/<div class="social-links footer-follow" role="group" aria-label="([^"]+)">/);
  assert.ok(group, "footer social group is present");
  assert.equal(group[1], "Follow The Friends of Ashley");
  for (const location of ["footer-follow", "mobile-menu-follow"]) {
    const social = html.match(new RegExp(`<div class="social-links ${location}"[^>]*>([\\s\\S]*?)</div>`))?.[1];
    assert.ok(social, location);
    assert.match(social, /href="https:\/\/www\.instagram\.com\/thefriendsofashley\/" target="_blank" rel="noopener noreferrer" aria-label="[^"]*\(opens in a new tab\)"/);
    assert.match(social, /href="https:\/\/www\.facebook\.com\/groups\/friendsofashley\/" target="_blank" rel="noopener noreferrer" aria-label="[^"]*\(opens in a new tab\)"/);
  }
  const primary = html.match(/<nav class="desktop-nav"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
  assert.ok(primary);
  assert.doesNotMatch(primary, /instagram|facebook/);
  assert.match(html, /Contact Us<\/a>\s*<\/nav>\s*<div class="social-links mobile-menu-follow"/);
});

test("the homepage shows Fireworks in the initial HTML without Welcome Tea or date switching", async () => {
  const homepage = await readFile(path.join(dist, "index.html"), "utf8");
  assert.match(homepage, /<article class="event-feature event-feature--poster">/);
  // One parchment panel unites the hero copy and the event card; the h1 names the event once.
  assert.match(homepage, /<div class="hero-event">/);
  assert.match(homepage, /<h1[^>]*>Fireworks on the <em>Field\.<\/em><\/h1>/);
  assert.doesNotMatch(homepage, /<h2>Fireworks on the Field<\/h2>/);
  // Date and venue are separate blocks so the venue never strands a word on mobile;
  // the times keep their number bound to its label with a non-breaking space.
  assert.match(homepage, /<strong class="hero-when-date">Thursday 5th November,<\/strong> <strong class="hero-when-venue">Ashley School\u00a0field\.<\/strong> Gates open\u00a016:30, event closes\u00a018:30\./);
  // Nick's call: no FOA introduction on the homepage hero; the panel is entirely about the event.
  assert.doesNotMatch(homepage, /hero-tagline/);
  assert.doesNotMatch(homepage, /class="site-width home-intro"/);
  assert.match(homepage, new RegExp(`rel="preload" as="image" href="${basePath}/events/fireworks-960.webp"`));
  const heroActions = homepage.match(/<div class="hero-actions">([\s\S]*?)<\/div>/)?.[1];
  assert.ok(heroActions, "homepage hero actions are present");
  assert.match(heroActions, new RegExp(`href="${basePath}/events/fireworks-2026-event-guide\\.pdf" download="Fireworks 2026 Event Guide\\.pdf"`));
  assert.match(heroActions, /Download the event/);
  assert.match(heroActions, /\(PDF, 9\.9 MB\)/);
  const actions = homepage.match(/<div class="event-feature-actions">([\s\S]*?)<\/div>/)?.[1];
  assert.ok(actions, "homepage event feature actions are present");
  assert.doesNotMatch(actions, /event-guide|Download the event/);
  assert.equal(homepage.match(/fireworks-2026-event-guide\.pdf/g)?.length, 1, "guide link appears once");
  assert.doesNotMatch(homepage, /Welcome Tea|welcome-tea|data-show-before|data-show-from/);
});

test("What's On switches Welcome Tea from upcoming to past at the content archive time", async () => {
  const whatsOn = await readFile(path.join(dist, "whats-on", "index.html"), "utf8");
  assert.match(whatsOn, new RegExp(`data-show-before="${archiveFrom}"`));
  assert.match(whatsOn, new RegExp(`data-show-from="${archiveFrom}"`));
});

test("What's On delivers build-time visibility and a standalone early date check", async () => {
  const html = await readFile(path.join(dist, "whats-on", "index.html"), "utf8");
  const initializer = html.match(/<script\b[^>]*data-event-visibility-initializer[^>]*>([\s\S]*?)<\/script>/);
  assert.ok(initializer, "A synchronous inline date check must precede the footer");
  assert.ok(initializer.index < html.indexOf("<footer"));
  assert.doesNotMatch(initializer[0], /\b(?:src|type|defer|async)=/);

  const entries = [...html.matchAll(/<(?:article|a)\b[^>]*class="event-list-item"[^>]*>/g)].map(([tag]) => {
    const dataset = Object.fromEntries([...tag.matchAll(/data-(show-before|show-from|expires-at|expires-on|show-from-day)="([^"]+)"/g)]
      .map(([, name, value]) => [name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()), value]));
    return { dataset, hidden: /\shidden(?:\s|>|=)/.test(tag), past: tag.includes('data-past="true"') };
  });
  assert.ok(entries.length > 0);
  for (const entry of entries) {
    assert.equal(entry.hidden, isHidden(entry.dataset, Date.now()), JSON.stringify(entry.dataset));
  }
  const sectionTag = html.match(/<section\b[^>]*data-past-events-section[^>]*>/)?.[0];
  assert.ok(sectionTag);
  assert.equal(/\shidden(?:\s|>|=)/.test(sectionTag), !entries.some((entry) => entry.past && !entry.hidden));

  // Run the actual generated script with no downloaded modules, including
  // times before the build and after the summer/winter all-day boundaries.
  for (const iso of ["2026-10-03T11:59:59Z", archiveFrom, "2026-12-17T00:00:00Z"]) {
    const now = Date.parse(iso);
    const nodes = entries.map((entry) => ({ ...entry }));
    const pastSection = { hidden: true, querySelector: () => nodes.find((node) => node.past && !node.hidden) };
    class FixedDate extends Date { static now() { return now; } }
    runInNewContext(initializer[1], {
      Date: FixedDate,
      Intl,
      document: {
        querySelectorAll: (selector) => selector.startsWith("[data-show-before]") ? nodes : [],
        querySelector: (selector) => selector === "[data-past-events-section]" ? pastSection : null,
      },
    });
    for (const node of nodes) assert.equal(node.hidden, isHidden(node.dataset, now), `${iso}: ${JSON.stringify(node.dataset)}`);
    assert.equal(pastSection.hidden, !nodes.some((node) => node.past && !node.hidden));
  }
});

test("the homepage and Fireworks event page credit the sponsor with an accessible local logo", async () => {
  for (const page of ["index.html", "events/fireworks-2026/index.html"]) {
    const html = await readFile(path.join(dist, page), "utf8");
    assert.match(html, /class="sponsor-ribbon"/);
    assert.match(html, new RegExp(`src="${basePath}/sponsors/martin-flashman.jpeg" alt="Martin Flashman and Co" width="225" height="33"`));
  }
});

test("external links communicate their destination and open safely in a new tab", async () => {
  const htmlFiles = (await filesUnder(dist)).filter((file) => file.endsWith(".html"));
  const externalLinkTags = [];
  let externalLinkIndicators = 0;

  for (const file of htmlFiles) {
    const html = await readFile(file, "utf8");
    externalLinkTags.push(...html.matchAll(/<a\s+[^>]*href="https?:\/\/[^>]+>/g).map((match) => match[0]));
    externalLinkIndicators += html.match(/class="[^"]*external-link-icon[^"]*"/g)?.length ?? 0;
  }

  assert.ok(externalLinkTags.length > 0);
  for (const link of externalLinkTags) {
    assert.match(link, /target="_blank"/);
    assert.match(link, /rel="noopener noreferrer"/);
  }
  // The shared footer/menu social links are exempt from the visible arrow: the brand
  // icon plus service name already makes the destination obvious (approved
  // 21 October 2026, see docs/PROJECT-BRIEF.md). Every other external link
  // keeps the indicator.
  const socialExemptions = externalLinkTags.filter((tag) => tag.includes('class="social-link"')
    && /href="https:\/\/(?:www\.instagram\.com\/thefriendsofashley\/|www\.facebook\.com\/groups\/friendsofashley\/)"/.test(tag)).length;
  // The Add to calendar Google choice drops the arrow by Nick's 25 October 2026
  // steering: the pair shows one shared calendar icon and both service names are
  // underlined as the link signal (see docs/PROJECT-BRIEF.md).
  const addCalendarExemptions = externalLinkTags.filter((tag) => tag.includes('href="https://calendar.google.com/')).length;
  assert.ok(externalLinkIndicators + socialExemptions + addCalendarExemptions >= externalLinkTags.length);
});

test("all generated internal links and assets resolve", async () => {
  const htmlFiles = (await filesUnder(dist)).filter((file) => file.endsWith(".html"));
  const missing = [];

  for (const file of htmlFiles) {
    const html = await readFile(file, "utf8");
    for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const reference = match[1];
      if (/^(?:https?:|mailto:|tel:|#|data:)/.test(reference)) continue;
      const target = reference.startsWith("/")
        ? outputPath(reference)
        : path.resolve(path.dirname(file), reference.split(/[?#]/, 1)[0]);
      try {
        await stat(target);
      } catch {
        missing.push(`${path.relative(dist, file)} -> ${reference}`);
      }
    }
  }

  assert.deepEqual(missing, []);
});

const escapeHtml = (text) => text.replace(/&/g, "&amp;").replace(/'/g, "&#39;").replace(/"/g, "&quot;");
const christmas = JSON.parse(await readFile(path.resolve("src/content/events/christmas-fayre-2026.json"), "utf8"));
const fireworks = JSON.parse(await readFile(path.resolve("src/content/events/fireworks-2026.json"), "utf8"));

test("the Christmas Fayre page lists every help area from the event record", async () => {
  const html = await readFile(path.join(dist, "events/christmas-fayre-2026/index.html"), "utf8");
  const areas = [...html.matchAll(/<li class="xmas-area">[\s\S]*?<span>([^<]*)<\/span>/g)].map((match) => match[1]);
  assert.deepEqual(areas, christmas.helpAreas.map((area) => escapeHtml(area.name)));
  assert.equal(areas.length, 7);
});

test("the Christmas Fayre page uses the Fayre inbox for every sign-up link, with a clear subject", async () => {
  const html = await readFile(path.join(dist, "events/christmas-fayre-2026/index.html"), "utf8");
  const links = [...html.matchAll(/href="(mailto:[^"]+)"/g)].map((match) => match[1]);
  assert.equal(links.length, 2);
  for (const link of links) {
    assert.equal(link, `mailto:${christmas.contactEmail}?subject=Helping%20at%20the%20Christmas%20Fayre`);
  }
  assert.equal([...html.matchAll(/>Email the Fayre <span class="cta-word">tea<span class="cta-tail">m<span/g)].length, 2);
});

test("the Christmas Fayre page keeps reminders in a plain list, separate from the help areas", async () => {
  const html = await readFile(path.join(dist, "events/christmas-fayre-2026/index.html"), "utf8");
  const notes = html.match(/<div class="xmas-notes">([\s\S]*?)<\/div>/)?.[1] ?? "";
  assert.match(notes, /<h3>Good to know<\/h3>/);
  assert.equal([...notes.matchAll(/<li>/g)].length, 3);
  for (const reminder of ["Join in anywhere", "Bring a friend", "No experience needed"]) assert.match(notes, new RegExp(reminder));
  assert.doesNotMatch(notes, /xmas-area/);
});

test("the Christmas Fayre page shows the date, place and lead from the event record, with decoration hidden from assistive technology", async () => {
  const html = await readFile(path.join(dist, "events/christmas-fayre-2026/index.html"), "utf8");
  assert.match(html, /<dd><span class="xmas-nowrap">Saturday 5th December,<\/span> <span class="xmas-nowrap">12:00-15:00<\/span><\/dd>/);
  assert.match(html, new RegExp(`<dd>${christmas.location}</dd>`));
  assert.ok(html.includes(`<dd>${christmas.lead.split(/(?<=\)) and /).map(escapeHtml).join("<br>")}</dd>`));
  // One visible decoration row at each breakpoint, in its approved position.
  assert.match(html, /<ul class="xmas-baubles xmas-baubles--desktop" aria-hidden="true">/);
  assert.match(html, /<ul class="xmas-baubles xmas-baubles--mobile" aria-hidden="true">/);
  const baubleRows = [...html.matchAll(/<ul class="xmas-baubles xmas-baubles--(?:desktop|mobile)" aria-hidden="true">([\s\S]*?)<\/ul>/g)];
  assert.equal(baubleRows.length, 2);
  for (const [, row] of baubleRows) {
    assert.equal([...row.matchAll(/<li style="--i:\d+;/g)].length, 20);
  }
  assert.equal([...html.matchAll(/<i style="--side:/g)].length, 28);
  assert.match(html, /<dt>Entry<\/dt><dd>£2, under 12s go free<\/dd>/);
  assert.match(html, /<dt>What’s on<\/dt><dd>Fun Zone games<br\/?>Art and craft stalls<br\/?>Festive food and drink<\/dd>/);
  assert.match(html, /<div class="xmas-snow" aria-hidden="true">/);
  assert.match(html, /<p class="xmas-credit"><img src="[^"]*martin-flashman-mark\.png" alt="Martin Flashman and Co"/);
  assert.doesNotMatch(html, /With thanks to/);
});

test("the Fireworks volunteering page shows every role, shift and sign-up link from the event record", async () => {
  const html = await readFile(path.join(dist, "fireworks-volunteering/index.html"), "utf8");
  assert.match(html, /<h1>Fireworks <span>Volunteering<\/span><\/h1>/);
  assert.doesNotMatch(html, /class="fw-kicker"/);
  assert.match(html, /Help make Fireworks on the Field awesome\./);
  assert.equal([...html.matchAll(/<li class="vol-card">/g)].length, fireworks.volunteerRoles.length);
  for (const role of fireworks.volunteerRoles) {
    const card = html.split('<li class="vol-card">').find((part) => part.includes(`<h3>${escapeHtml(role.name)}</h3>`));
    assert.ok(card, `no card for ${role.name}`);
    assert.match(card, new RegExp(`vol-card__group">${escapeHtml(role.group)}<`));
    assert.ok(card.includes(escapeHtml(role.dates)), `${role.name}: dates`);
    assert.ok(card.includes(escapeHtml(role.description)), `${role.name}: description`);
    for (const shift of role.shifts) {
      assert.ok(card.includes(`<dt>${escapeHtml(shift.label)}</dt>`), `${role.name}: ${shift.label} label`);
      assert.ok(card.includes(escapeHtml(shift.when.replace(/(\d{1,2}:\d{2})[–-](?=\d{1,2}:\d{2})/g, "$1-"))), `${role.name}: ${shift.label} time`);
      assert.match(card, new RegExp(`${shift.helpers} ${shift.helpers === 1 ? "helper" : "helpers"} per (?:slot|shift)`));
    }
    assert.ok(card.includes(`href="${role.url}"`), `${role.name}: sign-up link`);
  }
});

test("Fireworks volunteering sign-ups go to Volunteer Sign Up, open safely in a new tab and say so", async () => {
  const html = await readFile(path.join(dist, "fireworks-volunteering/index.html"), "utf8");
  const links = [...html.matchAll(/<a class="button button--amber vol-card__action"[^>]*>[\s\S]*?<\/a>/g)].map((match) => match[0]);
  assert.equal(links.length, fireworks.volunteerRoles.length);
  for (const link of links) {
    assert.match(link, /href="https:\/\/volunteersignup\.org\/[A-Za-z0-9]+"/);
    assert.match(link, /target="_blank"/);
    assert.match(link, /rel="noopener noreferrer"/);
    assert.match(link, /\(opens Volunteer Sign Up in a new tab\)/);
  }
  const urls = fireworks.volunteerRoles.map((role) => role.url);
  assert.equal(new Set(urls).size, urls.length, "each role has its own sign-up link");
});

test("Fireworks volunteering links back to the event page and never asks for personal details", async () => {
  const html = await readFile(path.join(dist, "fireworks-volunteering/index.html"), "utf8");
  assert.ok(html.includes(`href="${basePath}${fireworks.path}"`));
  assert.doesNotMatch(html, /<form|<input|type="tel"/);
});


test("every built footer uses the verified charity disclosure", async () => {
  for (const file of (await filesUnder(dist)).filter(file => file.endsWith(".html"))) {
    const html = await readFile(file, "utf8");
    if (!html.includes('class="footer-bottom"')) continue;
    assert.ok(html.includes("Registered charity 1024028"), file);
    assert.ok(!html.includes("1042944"), file);
    assert.ok(!html.includes("Parent-led. Child-focused. All welcome."), file);
  }
});


test("current event displays use a plain hyphen, preserving original newsletter prose", async () => {
  for (const file of (await filesUnder(dist)).filter((file) => file.endsWith(".html"))) {
    if (file === path.join(dist, "newsletter/index.html")) continue; // Published newsletter prose is historical source copy.
    const html = await readFile(file, "utf8");
    const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "").replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, "");
    assert.doesNotMatch(visible, /\d{1,2}:\d{2}(?:\s*[\u2013\u2014]\s*|\s+to\s+)\d{1,2}:\d{2}/, file);
  }
});

test("published newsletter retains its original time-range prose", async () => {
  const html = await readFile(path.join(dist, "newsletter/index.html"), "utf8");
  assert.match(html, /16:30 to 18:30/);
});
