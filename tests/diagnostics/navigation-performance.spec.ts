import { devices, expect, test } from "@playwright/test";

const destinations = [
  { name: "Uniform", path: "/uniform/" },
  { name: "Contact Us", path: "/contact/" },
  { name: "Home", path: "/" },
  { name: "What's On", path: "/whats-on/" },
  { name: "Fundraising", path: "/fundraising/" },
  { name: "Newsletter", path: "/newsletter/" },
];

test.use({ ...devices["Pixel 5"] });

test("mobile menu navigation diagnostics with cold and warm HTTP cache", async ({ page, context, browserName }, testInfo) => {
  test.skip(browserName !== "chromium", "Network/CPU throttling requires Chromium CDP");
  test.setTimeout(180_000);
  await context.addInitScript(() => {
    localStorage.setItem("foa-cookie-preferences", "essential");
    document.addEventListener("click", (event) => {
      if (event.target instanceof Element && event.target.closest('#mobile-menu a[href]')) {
        sessionStorage.setItem("foa-test-menu-tap", String(performance.timeOrigin + performance.now()));
      }
    }, true);
  });
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  // This synthetic profile is repeatable, not a claim to emulate a physical Android phone.
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false, latency: 150, downloadThroughput: 3_000_000 / 8,
    uploadThroughput: 1_000_000 / 8, connectionType: "cellular4g",
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const results: unknown[] = [];
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    for (const cache of ["cold", "warm"] as const) {
      for (let sample = 1; sample <= 2; sample += 1) {
        await page.goto("/");
        for (const destination of destinations) {
          await page.getByRole("button", { name: "Open menu" }).tap();
          const link = page.getByRole("navigation", { name: "Mobile navigation" })
            .getByRole("link", { name: destination.name, exact: true });
          if (cache === "cold") await cdp.send("Network.clearBrowserCache");
          const destinationUrl = new URL(await link.getAttribute("href") ?? "", page.url()).href;
          expect(new URL(destinationUrl).pathname).toBe(destination.path);
          const responsePromise = page.waitForResponse((response) => response.request().isNavigationRequest()
            && response.request().frame() === page.mainFrame() && response.url() === destinationUrl);
          await link.tap();
          const response = await responsePromise;
          if (response.status() !== 200) {
            const failure = {
              route: destination.path, cache, sample, url: response.url(), status: response.status(),
              headers: await response.allHeaders(), body: (await response.text()).slice(0, 2000),
            };
            await testInfo.attach("navigation-response-failure.json", {
              body: JSON.stringify(failure, null, 2), contentType: "application/json",
            });
          }
          expect(response.status(), `${cache} sample ${sample}: ${destination.name} (${response.url()})`).toBe(200);
          await expect(page).toHaveURL((url) => url.pathname === destination.path);
          await expect(page.locator("main h1")).toBeVisible();
          const tapToHeadingVisibleMs = await page.evaluate(() => performance.timeOrigin + performance.now()
            - Number(sessionStorage.getItem("foa-test-menu-tap")));
          await page.waitForLoadState("load");
          await expect(page.locator("[data-mobile-menu]")).toHaveAttribute("aria-hidden", "true");
          const metrics = await page.evaluate(() => {
            const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
            const tap = Number(sessionStorage.getItem("foa-test-menu-tap"));
            const paint = performance.getEntriesByName("first-contentful-paint")[0];
            return {
              tapToNavigationMs: performance.timeOrigin - tap,
              tapToDomContentLoadedMs: performance.timeOrigin + navigation.domContentLoadedEventEnd - tap,
              tapToFirstContentfulPaintMs: paint ? performance.timeOrigin + paint.startTime - tap : null,
              tapToLoadMs: performance.timeOrigin + navigation.loadEventEnd - tap,
              ttfbMs: navigation.responseStart - navigation.requestStart,
              resources: performance.getEntriesByType("resource").map((entry) => {
                const resource = entry as PerformanceResourceTiming;
                return { path: new URL(resource.name).pathname, type: resource.initiatorType,
                  durationMs: resource.duration, transferBytes: resource.transferSize };
              }),
            };
          });
          expect(Number.isFinite(metrics.tapToNavigationMs)).toBe(true);
          expect(metrics.tapToNavigationMs).toBeGreaterThanOrEqual(0);
          results.push({ route: destination.path, cache, sample, tapToHeadingVisibleMs, ...metrics });
        }
      }
    }
    expect(errors).toEqual([]);
  } finally {
    const report = { profile: { device: "Pixel 5", latencyMs: 150, downloadMbps: 3, uploadMbps: 1, cpuSlowdown: 4 },
      note: "Local preview timings; warm cache is permitted, not guaranteed. FCP is not proof that destination content is usable. No timing budgets yet.", results, errors };
    await testInfo.attach("mobile-navigation-performance.json", {
      body: JSON.stringify(report, null, 2), contentType: "application/json",
    });
    console.log(JSON.stringify(report));
    await cdp.detach();
  }
});
