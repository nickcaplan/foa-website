# QA probe scripts

Small Playwright scripts for production checks. Read-only: they load pages and read the DOM, nothing is submitted or purchased.

## Setup
Inside this repo Playwright is already installed (dev dependency), so run the scripts from the repo root with `node qa/<script>.mjs`. Outside the repo only, install it by hand and copy the .mjs files in:
    mkdir /tmp/qa && cd /tmp/qa && npm init -y && npm i playwright

The three scripts launch system Chrome (`channel: 'chrome'`), so Chrome must be installed. aud.mjs and live-timeline.mjs write a screenshot to an output directory: pass one as the last argument, or a temp directory is created and printed.

## Scripts
- td.mjs: theme and text-size probe. `node qa/td.mjs <name> <baseUrl> [commaPaths]`
- live-timeline.mjs: one-off check for the Christmas Fayre "On the day" timeline (`.xmas-timeline`, PR 248) on production: rows, order, markers, overflow. Not a general probe. `node qa/live-timeline.mjs [outDir]`
- aud.mjs: Sam music page, clicks Play and checks the soundbar elapsed time advances. `node qa/aud.mjs [outDir]`

## Notes
- FOA theme key: localStorage `foa-theme` = day | night.
- Stable controls: compare offsetTop/Left/Width/Height at 320, 390 and 200%.
- External purchase pages (Zeffy etc.) return 403 to scripts: check the href only.
- Not yet written: per-site suites, stable-controls state checks, slopstrap DOM sweep.

## Site agent helpers
See [site-agent/README.md](site-agent/README.md) for the screenshot, overflow and newsletter Doc diff helpers used when preparing pull requests.
