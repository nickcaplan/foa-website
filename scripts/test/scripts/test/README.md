# Browser fixtures and real deployment builds

`npm run build` remains the normal wall-clock build. CI validates its site
contracts and uploads only `dist` for production.

Playwright builds an independent `.browser-fixture` with an October 11, 2026
build clock. This keeps the 2026 campaign cards present for historical browser
scenarios, including no-JavaScript fallback tests. The preload is passed only to
that child build process; it is not imported by production source or normal
builds. The server serves that output explicitly, not deployment `dist`.

Tests about a live campaign pin their own browser time. Lifecycle tests move
that clock past expiration and retain the original exact assertions. Normal
site contracts still validate the current-time output and archive semantics.
