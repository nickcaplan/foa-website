import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

const SMALL_CSS_INLINE_LIMIT = 16 * 1024;

export default defineConfig({
  output: "static",
  redirects: {
    "/events/fireworks-2026/": { destination: process.env.BASE_PATH || "/", status: 301 },
    "/fireworks-volunteering/": { destination: process.env.BASE_PATH || "/", status: 301 },
  },
  site: process.env.SITE_URL || "https://www.thefriendsofashley.org",
  base: process.env.BASE_PATH || "/",
  // 12 November 2026 audit: inline small route styles to remove extra cold
  // render-blocking round trips; keep the large shared stylesheet cacheable.
  vite: { build: { assetsInlineLimit: (filePath, content) =>
    filePath.endsWith('.css') ? content.byteLength <= SMALL_CSS_INLINE_LIMIT : undefined } },
  publicDir: "./assets",
  integrations: [sitemap({ filter: (page) => !page.includes("/preview/") && !/\/(events\/fireworks-2026|fireworks-volunteering)\/?$/.test(page) })],
});
