// Build the 1200x630 Fayre Supporters social card (v3): the design agent's
// logo-led layout (Nick, 20 Nov 2026) rendered from scripts/social/
// fayre-supporters-2026-v3.html with the seven real sponsor assets.
// Run from the repo root: node scripts/generate-social-supporters-v3.mjs
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(`file://${root}/scripts/social/fayre-supporters-2026-v3.html`);
await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode())));
const broken = await page.evaluate(() => [...document.images].filter((i) => !i.naturalWidth).length);
if (broken) {
  console.error(`${broken} image(s) failed to load`);
  process.exitCode = 1;
} else {
  await page.screenshot({ path: `${root}/assets/social/fayre-supporters-2026-v3.jpg`, type: "jpeg", quality: 93 });
  console.log("assets/social/fayre-supporters-2026-v3.jpg written");
}
await browser.close();
