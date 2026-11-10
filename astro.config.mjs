import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  output: "static",
  redirects: {
    "/events/fireworks-2026/": { destination: process.env.BASE_PATH || "/", status: 301 },
    "/fireworks-volunteering/": { destination: process.env.BASE_PATH || "/", status: 301 },
  },
  site: process.env.SITE_URL || "https://example.com",
  base: process.env.BASE_PATH || "/",
  publicDir: "./assets",
  integrations: [sitemap({ filter: (page) => !page.includes("/preview/") && !/\/(events\/fireworks-2026|fireworks-volunteering)\/?$/.test(page) })],
});
