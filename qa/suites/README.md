# qa/suites

Recovered and cleaned Playwright checks. Run from the repo root (Playwright is already a dev dependency): `node qa/suites/<file>`. They launch system Chrome (`channel: 'chrome'`).

Screenshots go to `QA_OUT` (env) or a temp directory that is printed nowhere by default; set `QA_OUT=/some/dir` to keep them. Local-build checks take `QA_BASE` (default http://localhost:8123): serve a build first.

Production, read-only (load and read pages only):
- foa-td.mjs, sam-td.mjs, compass-td.mjs: text-size, theme, link and stable-control suites per site. JSON summary on stdout.
- recheck.mjs: re-checks for FOA #208 and Sam #89 (list and action wrapping at 320/390 and 200%).
- sam-player8.mjs: Sam listen page player: starts playback, then waits for the natural end. Takes about 25 s.
- sweep.mjs: slopstrap DOM sweep. `node sweep.mjs '<targets json>' <tag>`.
- foa-pmqa.mjs, p240-gate.mjs, c135-prod.mjs, c135-probe2.mjs, g141.mjs: per-feature checks kept as examples. g141 needs `QA_ECB_JSON` or a path argument pointing to a saved ECB rate file.
- guard200.js: a snippet to paste into a page, not a Node script. Doubles root font size and measures overflow, clipping and mid-word splits.

Local build (set QA_BASE to the served build):
- p119-stable.mjs, p122h-stability.mjs: chess clock stable-controls state checks (size, shape, position across states at 320, 390 and 200%).
- t10.mjs, t11.mjs, t15.mjs, t17.mjs: chess clock behaviour checks. t10 and t11 are the versions before a later in-place edit that could not be replayed.

Some checks are tied to the pages and selectors of the time they were written, so a failure can mean the page changed.
