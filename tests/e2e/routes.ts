import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

// Routes are discovered from the served browser fixture (`.browser-fixture/`), so a new page is covered automatically.
// Add a route to `excluded` only with a reason.
const excluded = new Set<string>([
  "/events/fireworks-2026/", // redirects checked by fireworks-retirement
  "/fireworks-volunteering/", // redirects checked by fireworks-retirement
  "/playground.html", // hidden, noindex contact prototype, not a public route
]);

// List mode does not start webServer. The normal build has the same route set.
if (!existsSync(".browser-fixture") && !existsSync("dist")) {
  const build = spawnSync(process.execPath, ["scripts/test/build-browser-fixture.mjs"], { stdio: "inherit" });
  if (build.error) throw build.error;
  if (build.status !== 0) throw new Error("Browser fixture build failed before route discovery");
}
const routeRoot = existsSync(".browser-fixture") ? ".browser-fixture" : "dist";
const discoverRoutes = (directory = routeRoot, prefix = ""): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) return discoverRoutes(join(directory, entry.name), `${prefix}/${entry.name}`);
    if (entry.name === "index.html") return [`${prefix}/`];
    return entry.name.endsWith(".html") ? [`${prefix}/${entry.name}`] : [];
  });

export const routes = discoverRoutes()
  .filter((route) => !excluded.has(route) && !route.startsWith("/_astro/"))
  .sort();
