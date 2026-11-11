import { execFileSync } from "node:child_process";
import { defineConfig, devices } from "@playwright/test";

// Pick a free port once in the main process; workers inherit it via the environment.
process.env.PLAYWRIGHT_PORT ??= execFileSync(
  process.execPath,
  [
    "-e",
    "const s=require('net').createServer().listen(0,'127.0.0.1',()=>{console.log(s.address().port);s.close()})",
  ],
  { encoding: "utf8" },
).trim();
const origin = `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: origin,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        channel: process.env.CI ? undefined : "chrome",
      },
    },
    {
      name: "webkit-fireworks",
      testMatch: ["fireworks.spec.ts", "narnia-hero.spec.ts"],
      use: { ...devices["Desktop Safari"] },
    },
  ],
  webServer: {
    command: `node scripts/test/build-browser-fixture.mjs && npm run preview -- --outDir .browser-fixture --ignore-lock --host 127.0.0.1 --port ${process.env.PLAYWRIGHT_PORT}`,
    url: origin,
    reuseExistingServer: false,
  },
});
