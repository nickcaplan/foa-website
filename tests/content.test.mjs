import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { ordinalDateFormatter } from "../src/lib/dates.ts";

const contentDir = path.resolve("src/content");
const assetsDir = path.resolve("assets");
const dist = path.resolve("dist");

const loadCollection = async (name) => {
  const directory = path.join(contentDir, name);
  const files = (await readdir(directory)).filter((file) => file.endsWith(".json")).sort();
  return Promise.all(files.map(async (file) => ({
    id: file.replace(/\.json$/, ""),
    data: JSON.parse(await readFile(path.join(directory, file), "utf8")),
  })));
};
const exists = (file) => stat(file).then(() => true, () => false);

test("every event ends after it starts and has a valid UK start", async () => {
  const problems = [];
  for (const { id, data } of await loadCollection("events")) {
    if (Number.isNaN(new Date(data.start).getTime())) problems.push(`${id}: invalid start`);
    if (data.end && !(new Date(data.end) > new Date(data.start))) problems.push(`${id}: end is not after start`);
  }

  assert.deepEqual(problems, []);
});

test("events that switch to past content do so after they take place", async () => {
  const problems = [];
  for (const { id, data } of await loadCollection("events")) {
    if (data.archiveFrom && new Date(data.archiveFrom) < new Date(data.start)) {
      problems.push(`${id}: archiveFrom ${data.archiveFrom} is before the event start ${data.start}`);
    }
    if (data.archive && data.archiveFrom) {
      problems.push(`${id}: archive and archiveFrom are both set, so it would be listed as both past and upcoming`);
    }
  }

  assert.deepEqual(problems, []);
});

test("event images exist and have alternative text", async () => {
  const problems = [];
  for (const { id, data } of await loadCollection("events")) {
    if (!data.image) continue;
    if (!data.imageAlt?.trim()) problems.push(`${id}: image has no imageAlt`);
    if (!(await exists(path.join(assetsDir, data.image)))) problems.push(`${id}: image file "${data.image}" not found in assets/`);
  }

  assert.deepEqual(problems, []);
});

test("event links point to generated internal pages", async () => {
  const problems = [];
  for (const { id, data } of await loadCollection("events")) {
    if (!data.path) continue;
    if (!/^\/[^?#]*\/$/.test(data.path)) {
      problems.push(`${id}: path "${data.path}" should be an internal path starting and ending with "/"`);
      continue;
    }
    if (!(await exists(path.join(dist, data.path, "index.html")))) problems.push(`${id}: no generated page for ${data.path}`);
  }

  assert.deepEqual(problems, []);
});

test("exactly one newsletter is marked latest and it is the most recently published", async () => {
  const newsletters = await loadCollection("newsletters");
  const latest = newsletters.filter(({ data }) => data.latest);

  assert.equal(latest.length, 1, `expected exactly one latest newsletter, found ${latest.map(({ id }) => id).join(", ") || "none"}`);
  for (const { id, data } of newsletters) {
    assert.ok(data.published && !Number.isNaN(new Date(data.published).getTime()), `${id}: needs a valid published date`);
    assert.ok(new Date(latest[0].data.published) >= new Date(data.published), `${id} is newer than the newsletter marked latest`);
  }
});

test("the newsletter page presents the latest issue first and archives the rest", async () => {
  const newsletters = await loadCollection("newsletters");
  const html = await readFile(path.join(dist, "newsletter", "index.html"), "utf8");
  const archiveStart = html.indexOf("Previous newsletters");
  const latestStart = html.indexOf("newsletter-board");
  assert.ok(latestStart !== -1 && archiveStart > latestStart, "latest section should come before the archive");

  const escape = (text) => text.replaceAll("&", "&amp;");
  // The page h1 names the latest issue; every paper sheet also carries its
  // original collection title beneath the letterhead.
  const heroTitle = (title) => escape(`${title.replace(/\s+News$/, "").trim()} Newsletter`);
  const beforeArchive = html.slice(0, archiveStart);
  const latestSection = html.slice(latestStart, archiveStart);
  const archiveSection = html.slice(archiveStart, html.indexOf('<aside class="newsletter-issue-index"'));
  for (const { id, data } of newsletters) {
    const title = escape(data.title);
    if (data.latest) {
      assert.ok(beforeArchive.includes(`<h1>${heroTitle(data.title)}</h1>`), `${id} is marked latest but its title does not name the page`);
      assert.ok(latestSection.includes("newsletter-issue newsletter-sheet"), "latest section should present the issue sheet");
      assert.ok(latestSection.includes(`<p class="newsletter-summary-label">${title}</p>`), `${id} should show its collection title on the paper`);
      assert.ok(!archiveSection.includes(`>${title}<`), `${id} is latest but also appears in the archive`);
    } else {
      assert.ok(archiveSection.includes(title), `${id} should be in the archive`);
      assert.ok(!beforeArchive.includes(`<h1>${heroTitle(data.title)}</h1>`), `${id} is not marked latest but names the page`);
    }
  }
});

test("newsletter letterheads show just the publication date without an email label", async () => {
  const newsletters = await loadCollection("newsletters");
  const html = await readFile(path.join(dist, "newsletter", "index.html"), "utf8");
  const dates = [...html.matchAll(/<time class="newsletter-letterhead-date" datetime="([^"]+)">([^<]+)<\/time>/g)];
  assert.equal(dates.length, newsletters.length);
  const formatter = ordinalDateFormatter({ weekday: "long", timeZone: "UTC" });
  for (const [, datetime, label] of dates) {
    assert.equal(label, formatter(new Date(datetime)));
  }
});

test("the half term newsletter omits email-only copy and renders clean links", async () => {
  const html = await readFile(path.join(dist, "newsletter", "index.html"), "utf8");
  const latest = html.slice(html.indexOf('id="newsletter-issue-half-term-2026"'), html.indexOf('id="newsletter-issue-autumn-term-2026"'));
  assert.ok(latest.includes("Friday 16th October"));
  assert.ok(latest.includes('datetime="2026-10-16T00:00:00.000Z"'));
  assert.ok(latest.includes("two-week half term break"));
  assert.ok(!latest.includes("You can find the full newsletter on our new website"));
  assert.ok(!latest.includes("attached poster"));
  assert.ok(!latest.includes("\\!"));
  for (const label of ["Buy tickets", "Event information", "volunteer sign-up links", "Find out how to help", "uniform information and requests", "See our fundraising plans"]) {
    const links = [...latest.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)].map((match) => match[1].replace(/<[^>]+>/g, ""));
    assert.ok(links.some((text) => text.startsWith(label)), `${label} should render as a clean link label`);
  }
});

test("newsletter links to our pages stay internal while ticket links remain external", async () => {
  const html = await readFile(path.join(dist, "newsletter", "index.html"), "utf8");
  const latest = html.slice(html.indexOf('id="newsletter-issue-half-term-2026"'), html.indexOf('id="newsletter-issue-autumn-term-2026"'));
  const links = [...latest.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)];
  for (const route of ["/events/fireworks-2026/", "/fireworks-volunteering/", "/events/christmas-fayre-2026/", "/uniform/", "/fundraising/", "/"]) {
    const link = links.find(([, attributes]) => {
      const href = attributes.match(/href="([^"]+)"/)?.[1];
      return href?.startsWith("/") && href.endsWith(route);
    });
    assert.ok(link, `${route} should be an internal link`);
    assert.match(link[1], /class="text-link"/);
    assert.doesNotMatch(link[1], /target=|rel=/);
    assert.doesNotMatch(link[2], /external-link-icon|opens in a new tab/);
  }
  const ticketLink = links.find(([, attributes]) => attributes.includes("https://buytickets.at/"));
  assert.ok(ticketLink);
  assert.match(ticketLink[1], /target="_blank"/);
  assert.match(ticketLink[2], /external-link-icon/);
});

test("newsletter expansion offers an inert faded peek and a clear primary action", async () => {
  const html = await readFile(path.join(dist, "newsletter", "index.html"), "utf8");
  const newsletters = await loadCollection("newsletters");
  const expandableCount = newsletters.filter(({ data }) => (data.sections?.length ?? 0) > (data.latest ? 3 : 1)).length;
  const peeks = [...html.matchAll(/<div class="newsletter-peek"([^>]*)>/g)];
  assert.equal(peeks.length, expandableCount);
  for (const [, attributes] of peeks) {
    assert.match(attributes, /aria-hidden="true"/);
    assert.match(attributes, /\binert\b/);
  }
  const buttons = [...html.matchAll(/<button class="button button--primary newsletter-read-more"[^>]*>([\s\S]*?)<\/button>/g)];
  assert.equal(buttons.length, expandableCount);
  assert.ok(buttons.every(([, content]) => content.includes("Read the full newsletter")));
  const latestPeek = html.slice(html.indexOf('class="newsletter-peek"'), html.indexOf('id="newsletter-latest-more"'));
  assert.ok(latestPeek.includes("Pre-loved Uniform"));
  assert.ok(latestPeek.includes("wherever you are"), "the fade continues into the following section rather than leaving blank space");
});

test("committee entries have unique display order, names, roles and existing portraits", async () => {
  const members = await loadCollection("committee");
  const orders = members.map(({ data }) => data.order);
  const problems = [];

  if (new Set(orders).size !== orders.length) problems.push(`display order values are not unique: ${orders.join(", ")}`);
  for (const { id, data } of members) {
    if (!data.name?.trim()) problems.push(`${id}: missing name`);
    if (!data.role?.trim()) problems.push(`${id}: missing role`);
    if (!(await exists(path.join(assetsDir, data.portrait)))) problems.push(`${id}: portrait "${data.portrait}" not found in assets/`);
  }

  assert.deepEqual(problems, []);
});

test("committee pages show names and roles only, with no personal contact details", async () => {
  const members = await loadCollection("committee");
  const html = await readFile(path.join(dist, "committee", "index.html"), "utf8");

  for (const { data } of members) {
    assert.ok(html.includes(data.name), `${data.name} should be on the committee page`);
    assert.ok(html.includes(data.role), `${data.role} should be on the committee page`);
  }
  const mailtoTargets = [...html.matchAll(/href="mailto:([^"?]+)/g)].map((match) => match[1]);
  assert.ok(mailtoTargets.length > 0);
  for (const address of mailtoTargets) {
    assert.equal(address, "thefriendsofashley@gmail.com", "only the shared FOA contact route may be linked");
  }
});
