import { defineConfig } from "@playwright/test";
import config from "./playwright.config";

export default defineConfig({
  ...config,
  webServer: { ...config.webServer, command: `npm run preview -- --ignore-lock --host 127.0.0.1 --port ${process.env.PLAYWRIGHT_PORT}` },
  testDir: "./tests/diagnostics",
  projects: config.projects?.filter((project) => project.name === "chromium"),
  workers: 1,
  retries: 0,
});
