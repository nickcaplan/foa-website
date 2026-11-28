# Site agent: PR workflow and helper specs

Notes for the agent that prepares and ships FOA website pull requests. Everything below is written so the helpers can be rebuilt from scratch after a workspace reset. No scripts are kept in the repo, only these specs.

## Setup after a reset
1. Clone the repo, branch from `origin/main`. Playwright is already a dev dependency, run `npm ci`.
2. Get the GitHub token for the repo from the secret store and write it to a private file. Never print it, never put it in a command line that is logged, never commit it. Push with an `http.extraheader` of `Authorization: Basic base64("x-access-token:<token>")`. Call the API with `Authorization: Bearer <token>`.
3. Commit as author and committer `nickcaplan <19152137+nickcaplan@users.noreply.github.com>`, set per command with `git -c user.name=... -c user.email=...`.
4. Report a reset (missing clone, token file or helpers) to the parent at once, and say what was recovered and what was rebuilt.

## Pull request rules
- Branch off main, never commit to main, no force-push or history rewrite. To catch up, merge main into the branch.
- Put `[CF-Pages-Skip]` at the end of every commit message pushed to a PR branch. Leave it off the squash commit that lands on main.
- Scoped `git add` (named paths, never `-A` at the repo root).
- No tool, assistant or co-author references in commits, PR text or files. No secrets.
- Open PRs as draft. The `preview` label goes on only when Nick or the parent says so, and the preview link is then line 1 of the PR body.
- The PR body starts with legible before and after screenshots, or the line "No screenshots needed, because ..." with the reason.
- Merge only on Nick's explicit "Merge" for the exact head SHA: mark ready for review, then squash merge with the head SHA guard, commit title = PR title plus ` (#N)`, empty body.
- A commit pushed to a PR branch voids earlier review, QA and design sign-off for that PR.
- Never send the newsletter.
- Work on the content of the newsletter Google Doc is read-only unless the parent says otherwise. Keep the site newsletter file and the Doc in step.

## CI reporting
Report CI per check, using the check-runs API for the exact head SHA: `GET /repos/nickcaplan/foa-website/commits/<sha>/check-runs`, and list each check name with its `conclusion`. "Green" means conclusion `success` for both Verify site shards, osv-scanner, the osv scan, preview-branch and availability. `neutral` (redirect rules, header rules, pages changed) and `skipped` (full dependency scan, freshness audit, deploy on a PR) are expected. Read the PR head SHA in the same call as the report, and say if it moved. Verify takes about 5 to 8 minutes. Poll with sleeps under 2 minutes per call.

## Screenshot evidence
- Store PNGs on the branch `docs/pr-screenshot-evidence`, in a folder per PR (`pr-<topic>/`, with `before/` for before images). Commit with `[CF-Pages-Skip]`, push, and link the images in the PR body with raw GitHub URLs pinned to the evidence commit SHA, not the branch name.
- Take the shot of the changed element or section only, at 1440 and 390 and 320 where relevant, night theme unless day is the point. Show before (main) and after (branch).
- To capture: build the branch (`npm run build`), serve `dist/` with `python3 -m http.server <port>` started in the background and killed afterwards, and drive Chromium with Playwright.

## Helper 1: element screenshot
Inputs: base URL, path, CSS selector, output file, width (default 390), theme (day or night, default day), text scale (default 1).
Behaviour: launch Chromium; viewport width x 900; before navigation add an init script that sets `localStorage['foa-theme']` to the theme; open base+path; inject a style `.cookie-banner{display:none!important}`; set `document.documentElement.style.fontSize` to 16 times the scale in px; scroll the first match of the selector into view; screenshot that element only to the output path. Hide the skip link and floating menu button when the screenshot would otherwise include them. Look at the image before using it.

## Helper 2: overflow and clipping measure
Same inputs as helper 1 without the output file. After the same setup, print one JSON line with: width, theme, scale, whether the selector matched, page overflow (`document.documentElement.scrollWidth - innerWidth`, must be 0 or less), and counts of descendants of the selector whose `scrollWidth > clientWidth + 1`. For layout work also measure, per row, the gap between neighbouring items using range bounding boxes of the real text, not element boxes. A wrap rule from Nick applies: no word splits at any width or text size, and no single-word last line. Check at 320, 390 and 1440 px, at 100 percent and 200 percent text, in day and night themes.

## Helper 3: newsletter Doc diff
Purpose: detect edits to the draft newsletter Google Doc without reading it by eye.
1. Export the Doc as HTML JSON (an object with a `content` HTML string).
2. From `<body>` on, take every `h1` to `h6`, `p` and `li` element in order. Turn each `<a href>` into `[text](url)`, and unwrap Google redirect links (`https://www.google.com/url?q=<real>&...`) to the real URL taken from the `q` parameter, so session parameters do not cause false diffs. Strip other tags, unescape entities, trim, drop empty lines.
3. Print one line per block as `<h|p|l> | <text>`.
4. Keep the last output as the baseline. On each check, regenerate and `diff` the baseline against the new file. If identical, say nothing. If different, report the changed lines to the parent, then replace the baseline with the new output.
The check runs about every 30 minutes on a schedule.

## Live check after a merge
Wait for the deploy run on the merge commit to complete (query actions runs by head SHA, workflow "Verify and deploy site"). Then fetch key pages with a cache-busting query string (the edge cache holds pages for about 10 minutes): home, the changed page, newsletter, uniform, reps, volunteering, contact, get involved. Expect 200, and look for a marker string from the change in the HTML. Say what was not checked (for example visuals).

## Tests to run before pushing
`npm run build`, `npm test` (unit, runs against `dist/`), and the Playwright specs that touch the changed page. When adding a section or element to a page, grep `tests/e2e` for specs that assume section order or a single instance (for example the compact Fayre roles, Fayre UX and floating menu specs) and run them. Kill stale preview servers on the e2e port before a run if tests hang.
