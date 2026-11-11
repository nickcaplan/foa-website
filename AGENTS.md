# Agent Instructions

Durable working rules for AI agents contributing to The Friends of Ashley website. Read this first, then follow the pointers below. This file is about **how to behave**; product detail lives in the brief.

## Start Here

| You need | Read |
|---|---|
| Product, decisions, requirements, architecture | [`docs/PROJECT-BRIEF.md`](docs/PROJECT-BRIEF.md) |
| What is outstanding, who owns it, what blocks it | [`docs/ACTIONS.md`](docs/ACTIONS.md) |
| Testing approach | [`docs/TEST-STRATEGY.md`](docs/TEST-STRATEGY.md) |
| Where documentation belongs, and why it is structured this way | [`docs/README.md`](docs/README.md) |
| Commands to run, build and verify | [`README.md`](README.md) |

Read the brief before substantial design, content or architecture work.

## Project Context

- Website for The Friends of Ashley (FOA), the PTA for Ashley C of E Primary School, Walton-on-Thames.
- Astro 7, static output, typed local content collections, locally built CSS, deployed to GitHub Pages at `www.thefriendsofashley.org`. The site is live; work is operational follow-up, quality and later scope.
- Do not select or integrate a CMS until content ownership, editor access, preview and publishing workflows are confirmed.

## Confirmed Direction

- Warm modern editorial community noticeboard; mobile-first with deliberate desktop layouts.
- Prioritise current events and practical parent tasks. Do not make the public site feel like a SaaS dashboard.
- Primary navigation: Home, What's On, Fundraising, Get Involved, Uniform. Newsletter also appears in the desktop header and mobile menu, between Home and What's On.
- Follow the [confirmed header and mobile title-panel design](docs/PROJECT-BRIEF.md#design). Keep the burger fixed outside the header whenever full navigation is hidden, and preserve the approved mobile logo treatment. Read exact responsive thresholds from the shared styles and regression tests rather than duplicating them here.
- Heritage green is primary; amber is mainly for events and celebration.
- Ticket purchases use an external provider. Auctions, parent accounts and unmoderated publishing are out of scope.

The full decision list is in the brief.

## Content and Safety Rules

- Use British English in new and updated copy and documentation. Use ordinary ASCII hyphens for prose dashes, not en dashes or em dashes (confirmed 31 October 2026). Do not use Oxford commas.
- Whenever the site is updated or a page is added, review `src/pages/reps.astro` for related messages that need adding, updating or retiring. Keep visible and copied messages consistent with the canonical pages, include full public website links and check review and expiry dates. If the change has no relevance to class reps, no message change is needed.
- Do not invent event, accessibility, ticketing, uniform, committee or legal facts. Label unknown or provisional information clearly; the provisional list is in `docs/ACTIONS.md`.
- Committee presentation uses names and roles (plus approved portraits) only.
- Do not publish children's names or other unnecessary child-related personal information. Class names may be included alongside adult organisers when supplied and approved by the project owner.
- Do not add personal contact details; use the shared FOA contact route.
- Safety-critical and transactional translations require human review.
- A final pre-publication check is still required for committee names, roles and portrait consent.

### Naming convention for public copy

Applies to site copy, metadata, navigation labels, structured data and documentation. It does not apply to filenames, URLs, email addresses or code identifiers.

- Full name: **The Friends of Ashley**. Shortened form after introduction: **The FOA**.
- On first mention in longer copy, use **The Friends of Ashley (FOA)** if the abbreviation is used later.
- Never write "Friends of Ashley" without **The**, and never use bare "FOA" as the organisation name in copy or titles.
- Keep `thefriendsofashley@gmail.com` and other technical identifiers unchanged.
- Correct: "Contact The FOA about volunteering." Incorrect: "Contact FOA about volunteering."

## Implementation Expectations

- Preserve semantic HTML, keyboard access, visible focus and reduced-motion support.
- Keep important body copy comfortably readable.
- Use real links and buttons, not clickable generic elements.
- Keep design values in central CSS tokens.
- **Inspect your own changes before handing them back (confirmed 19 October 2026).** After every change, review the implementation for defects and unintended effects, not only whether it matches the requested structure or passes tests. For visible changes, inspect the affected page at mobile, tablet and desktop widths in Day/Night Mode with normal and enlarged text. Check corresponding row, separator and action alignment, readable columns, wrapping, spacing, overflow and interaction states. Add regression assertions for the actual defect, including alignment within neighbouring columns rather than just their outer widths. Fix issues you find without leaving the user to discover them. If rendered inspection is blocked, complete the source-level review and report the unverified checks explicitly; do not call the change visually verified or ready on the strength of a build alone.
- For floating controls, check ancestor styles as well as the control itself: `filter`, `backdrop-filter` and transforms can make a fixed element scroll with its ancestor. A `display: none` wrapper also hides a fixed child. Verify the control stays in the viewport after scrolling at both mobile and desktop widths.
- **Always check consistency across the site.** Before calling a change ready, inspect every affected page, shared component, formatter, copied message and relevant documentation against the current style. Prefer a shared fix over page-specific exceptions and add coverage for cross-site consistency.
- Keep event facts in one structured source (the content collections); do not duplicate them in page copy.
- Use `withBase()` for asset and internal URLs so the site works at the root and at `/foa-website/`.
- Avoid new external runtime dependencies or optional tracking unless explicitly approved. Analytics is consent-controlled; extend the Privacy Notice and consent control before adding anything optional.
- Check layout at both mobile and desktop widths whenever you add or move visible content, not just that the build passes. Specifically look for:
  - **Excess whitespace.** Section padding and inner container padding stack (for example `.content-section` plus `.event-body`), as do trailing borders and bottom padding on the last block before a section edge or the footer. Add spacing in one place only.
  - **Oversized media.** Images, posters and frames must have a sensible maximum width on desktop; do not let them fill the full container.
  - **Unbalanced columns.** A tall item beside a short one leaves a gap; adjust widths or placement rather than accepting it.
  - **Existing layout hooks.** Reuse an existing grid or column structure before adding a new section with custom spacing.
  - **Mobile order.** Check that content moved into a side column still reads sensibly when it stacks.
  Do this in a rendered page (DOM and computed-size checks are preferred over screenshots, see Context Size Guard), and do not assume a clean build means the spacing is right.
- **When working through a visual design choice** (icons, layouts, colours, component styles), do not iterate blindly on the live page. Build a throwaway comparison sheet with 3–5 labelled options side by side, at a large size and at the real size, in the session temp folder (not the repo), and open it with `tools.browser.preview({ path })` via `execute`. Then ask the user to choose by label. Delete or ignore the sheet once a choice is made.
- Verify with the commands in [`README.md`](README.md) (`npm run verify` is the full gate), and check whitespace after edits.
- When creating pull requests for this website, include screenshots of visible changes in the PR description (preference confirmed 21 October 2026). Capture the actual PR revision, label relevant viewports and states, and verify the embedded image URLs work. If capture or hosting is blocked, report that explicitly rather than claiming screenshots were added.
- **PR previews split between Netlify and Cloudflare Pages (added 10 November 2026).** Before pushing a pull request branch, run `node scripts/preview-route.mjs` from the repository root instead of a plain `git push`. It checks this month's Netlify build minutes and routes the preview: with headroom it prefixes the HEAD commit message with `[CF-Pages-Skip]` (Cloudflare Pages skips, Netlify builds); at or over the threshold it removes the prefix and labels the PR `cloudflare`, so `scripts/netlify-ignore.mjs` skips the Netlify build and Cloudflare Pages builds the preview. Put the preview URL from whichever provider built it in the PR description. When the `cloudflare` label is present, the Netlify check posts "Deploy Preview canceled" by design and the Cloudflare Pages check carries the preview. When creating a PR while Netlify is near the limit, add the `cloudflare` label at creation so the first build also skips Netlify. The script needs `NETLIFY_TOKEN` and `GITHUB_TOKEN` (or `GH_TOKEN`) in the environment; without them it routes to Netlify, the previous behaviour.
- **After every push, check the GitHub Actions build for the exact pushed commit.** Poll until the relevant build workflows finish (for example, use `gh run list --commit <sha>` to find the runs, then `gh run watch <run-id> --exit-status`). Report whether the build passed or failed, with a link to the run; if it failed, summarise the failing job or step. Do not treat a successful push as a successful build. If no run appears, access is blocked, or polling times out, explicitly report the build as unverified rather than passed.
- **A change to the CI workflow must pass the full check twice before it is merged: once with an empty cache and once with a warm cache.** On 18 October 2026 a change that caches the Playwright test browsers passed its first run and was merged, then failed on main: the first run had started from an empty cache, so the warm-cache path had never been exercised. When the cache hit, the browser install step was skipped, which also skipped the system libraries the WebKit (Safari engine) tests need; WebKit could not launch, that test shard failed and the deploy was blocked. Two rules follow. The browser cache restores the browser programs only, so `npx playwright install-deps` must run on every job even when the cache hits and only the browser download may be skipped. And after any workflow change, clear the saved cache for the first run, then re-run so the second run uses the saved cache; call the change ready only when both runs are green.
  Since 22 October 2026 the verification jobs run in the official Playwright container, which already holds the browsers and their system libraries, so the browser cache and `install-deps` steps are gone. The empty-cache and warm-cache rule still applies to any change to the workflow, and to any cache added back later.
- **Record decisions when they are made.** When the site changes, write down what was chosen, when it was approved and what it replaces: in `docs/PROJECT-BRIEF.md` for product and design decisions, in this file for working rules. Anyone picking up the site later, with any tool, should be able to continue from the repo alone.
- **Known sandbox limitation:** Playwright's local Chrome launch can be blocked by macOS sandbox permissions (`bootstrap_check_in … Permission denied`, `Operation not permitted`, or `kill EPERM`). When these launch errors occur, the affected browser tests did not run; report them as blocked, not as application regressions or passing tests. Inspect the first launch error rather than repeatedly rerunning the full suite. Report successful check/build/unit-test stages separately, and do not assume unrelated assertion failures or Review-pane navigation errors have the same cause. Browser checks require an approved sandbox override or a run outside the sandbox; user-configured overrides live in `~/.nwb/box/box.json`.
- **Sandboxed Chromium verification:** On 19 October 2026 the owner authorised targeted browser IPC allowances in the user sandbox config. Bundled Playwright Chromium then passed the full Chromium production suite with the sandbox enabled; installed Google Chrome still failed a restricted system query, and WebKit remained blocked. Prefer a temporary Playwright configuration outside the repo that imports the committed configuration, retains its Chromium project settings but sets `channel: undefined`, and gives `testDir`, `webServer.cwd` and `outputDir` explicit paths. Do not silently change the committed runner or omit tests. Report the engine and projects actually run. User sandbox settings are machine-specific and not committed; do not broaden them or disable the sandbox without authorisation.
- **Stop any server you start for verification** (`npm run preview`, test dev servers) once you have finished checking. `npm test` picks a free port itself, so a leftover server no longer blocks it, but it still wastes resources. Prefer foreground commands with a timeout, and never leave a timed-out Playwright run behind. The dev server on 4321 is the exception: leave it running for the Review pane.
- **Always finish a response that made changes by opening the affected page inside OpenCode**, not in an external browser: confirm the dev server is running (`npm run dev`, `http://localhost:4321/`; start it if not), then open the specific affected page (not just the site root) in the Review pane with `tools.browser.tabs.open({ url })` via `execute`. Also state the URL in the reply. If the browser tools are unavailable, say so and give the URL instead.
- After changing Astro content schemas, collection loaders, content-driven route filters or Astro configuration, start a **fresh** development server and make an HTTP request to every affected route. Confirm a successful response and the expected content. Do not rely only on `astro check`, a production build or an already-running dev server: Astro's dev content store can retain stale collection state after schema changes.

## Context Size Guard

Provider requests fail with `HTTP 413` when a session's history is too large, almost always because of accumulated base64 images (pasted screenshots and browser tool screenshots). The full history is resent on every turn, so a session that crosses the limit keeps failing.

- **Read PDFs through the `pdf-to-text` skill** (user-level, `~/.config/opencode/skills/pdf-to-text`), not by passing them whole to `read`. Run `--info` first, extract to markdown, then `grep`/`read` the output. For image-only pages (for example `assets/events/fireworks-2026-event-guide.pdf` page 1), render just the needed pages with `--images`. The skill is per-machine; if it is missing, say so rather than falling back to reading large PDFs directly.

- Avoid browser screenshots unless needed; prefer DOM or text checks. Do not retake full-page screenshots repeatedly.
- After any turn that adds images, and every ~10 tool calls in a long session, check the current session's stored size:

  ```sh
  sqlite3 -readonly ~/.local/share/opencode/opencode.db "select round(sum(length(m.data))/1048576.0,1) total_mb, round(sum(case when m.data like '%image/png%' or m.data like '%data:image%' or m.data like '%screenshot.png%' then length(m.data) else 0 end)/1048576.0,1) image_mb from session_message m where m.session_id=(select id from session_v2 where directory='$PWD' order by time_updated desc limit 1)"
  ```

- Warn the user when `image_mb` reaches **2.5** or `total_mb` reaches **4**. Past failures all had at least 4.6 MB of images; sessions without failures had at most 1.2 MB. Suggest starting a fresh session with a short summary, cropping or compressing pasted images, or switching model.
- This is an estimate of stored size, not the exact request size, and the limit may vary by model.

## Documentation Rules

Full rules and rationale are in [`docs/README.md`](docs/README.md). The essentials:

- **One home per fact; link, don't copy.**
- Open tasks, questions and provisional content go in `docs/ACTIONS.md` only. Do not create other backlogs or put status or "next step" text in the README or brief.
- Confirmed decisions, scope, requirements and architecture go in `docs/PROJECT-BRIEF.md`. Edit entries in place; do not append dated session logs. Git history is the changelog.
- When an action is resolved, move its outcome into the brief and delete it from `ACTIONS.md`.
- Do not add new documentation files without a clear question that no existing file answers.
- Update `README.md` only if commands, entry points or the file layout change.
- The user does not want Atlassian Artifacts uploads. Do not ask about or offer uploading files to Atlassian Artifacts; keep files in the repository unless the user explicitly requests another destination.

## Session Closure

When the user says "close session", "end session" or clearly wraps up:

1. Update `docs/ACTIONS.md` (new, resolved or re-prioritised items).
2. Update `docs/PROJECT-BRIEF.md` only if a decision, scope, requirement or architecture changed (and its `Last updated` date).
3. Update `README.md` or this file only if commands, structure or agent rules changed.
4. Run verification appropriate to the files changed.
5. Inspect Git status. Summarise what was completed, what remains and the first recommended next action.
6. If the repository is connected to GitHub, commit and push the completed session changes after documentation and verification. Do not commit or push unrelated changes, or if the user asks you not to.

Material decisions must not exist only in the conversation.

## Resuming Work

When asked "What are the next steps?":

1. Read `docs/ACTIONS.md`: Launch-blocking first, then Soon.
2. Check each item's **Blocked by** column and the Open Questions section.
3. Check the current worktree (`git status`) rather than assuming the docs match exactly.
4. Answer with the first actionable steps in priority order, separating unblocked **Dev** work from decisions needed from the user.

## Visual consistency gate

Before sending preview screenshots, follow the pre-send checklist in `docs/PROJECT-BRIEF.md`. Run `tests/e2e/cta-icon-wrap.spec.ts` and the Fayre feedback checks. Inspect hosted phone and desktop pixels across all similar controls, including text links, pills, calendar choices and external actions. Structured controls use right-edge icon lanes: arrows in the same menu/list column align with each other; paired stacked buttons share the same icon x position. Only inline prose links keep adjacent icons. Use the shared SVG shape and text-relative size, never font arrow glyphs. Check equal paired widths, icon alignment, label wrapping and shared column edges before presenting the result.

## Final design and performance review

Before calling a visible change ready, make separate whole-journey and whole-page passes on the hosted revision. Exercise controls, repeated actions, loading and error states, then judge hierarchy, spacing, readability and consistency of the complete page. Apply the viewport, theme and enlarged-text checks above. Passing tests or finding no overlap is not a design verdict (confirmed 5 November 2026).

Check performance after changes (confirmed 2 November 2026). For changes that may affect loading or animation, compare like-for-like phone and desktop cold/warm measurements before and after. Flag a measured slowdown before merge and check production after deployment. If a baseline or live check is missing, say what remains unmeasured; do not infer zero impact.
