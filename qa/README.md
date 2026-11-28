# QA probe scripts

Small Playwright scripts for production checks. Read-only: they load pages and read the DOM, nothing is submitted or purchased.

## Setup (manual, not a repo dependency)
    mkdir /tmp/qa && cd /tmp/qa && npm init -y && npm i playwright
    # uses system Chrome via channel: 'chrome'; copy the .mjs files in

## Scripts
- td.mjs: theme and text-size probe. `node td.mjs <name> <baseUrl> [commaPaths]`
- live-timeline.mjs: checks the live timeline rows and order on production.
- aud.mjs: Sam music page, clicks Play and checks the soundbar elapsed time advances.

## Notes
- FOA theme key: localStorage `foa-theme` = day | night.
- Stable controls: compare offsetTop/Left/Width/Height at 320, 390 and 200%.
- External purchase pages (Zeffy etc.) return 403 to scripts: check the href only.
- Not yet written: per-site suites, stable-controls state checks, slopstrap DOM sweep.

## Site agent helpers
See [site-agent/README.md](site-agent/README.md) for the screenshot, overflow and newsletter Doc diff helpers used when preparing pull requests.
