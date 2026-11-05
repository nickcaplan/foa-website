import { readdirSync } from "node:fs";
import { join } from "node:path";

// Routes are discovered from the served browser fixture (`.browser-fixture/`), so a new page is covered automatically.
// Add a route to `excluded` only with a reason.
const excluded = new Set<string>([
  "/playground.html", // hidden, noindex contact prototype, not a public route
]);

const discoverRoutes = (directory = ".browser-fixture", prefix = ""): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) return discoverRoutes(join(directory, entry.name), `${prefix}/${entry.name}`);
    if (entry.name === "index.html") return [`${prefix}/`];
    return entry.name.endsWith(".html") ? [`${prefix}/${entry.name}`] : [];
  });

export const routes = discoverRoutes()
  .filter((route) => !excluded.has(route) && !route.startsWith("/_astro/"))
  .sort();
