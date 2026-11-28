# Method notes

How to build the checks in the other files from scratch. These are the practical details that are easy to lose: which tools, how to put a page into a state, how to measure, and where facts come from. They describe what to do, not code. Page structure changes, so find the current elements by role and visible label first, and note any change here.

## Environment
- Use Playwright for Node with the system Chrome (the Chrome channel), not a downloaded browser. Install Playwright in a scratch folder outside any repo. Chromium only; there is no Safari engine.
- Working files can be lost between runs. Rebuild from these notes and say in the report which checks were reduced.
- Read GitHub through the public API and `git ls-remote`: a PR's current head is the pull ref, a commit's CI is its check-runs list, deploys are the repo's Pages deployment and run lists.
- With no preview for a PR, build the exact head and serve it on a local port. Stop the server afterwards.

## Putting a page into a state
- **Viewports:** 320, 390 and 768 wide, 1280 or 1440 for desktop. Phone height around 740 to 900; also try a short 320 by 740.
- **200% text:** set the root element's font size to double its normal value, then wait for layout to settle. On sites that use fixed pixel sizes this is only an approximation and the report should say so.
- **Themes (FOA):** set the saved theme value to "day" or "night" before the page loads. The saved key is `foa-theme`.
- **Cookie banners:** choose the reject option the first time, and also test accept in a fresh browser context. Never dismiss it in a way a real visitor could not.
- **Reduced motion:** run the layout checks with reduced motion on, and run the motion checks with it off.
- **Fresh state:** use a new browser context per width and theme so saved state does not leak between runs.

## Measuring
- **Overflow:** compare the page's scroll width with the viewport width; also look for any element wider than its parent or with clipped text.
- **Mid-word breaks:** for every text block, check that a word is not split across lines unless the design allows it. Measure the rendered word, not the source.
- **Stable controls:** record each control's layout position and size (offset top, left, width, height) before, during and after each state change, at 320, 390 and 200%. For text labels use the centre line and height; for buttons and containers use all four. Any difference is a failure.
- **Equal pairs and shared edges:** compare widths of paired buttons and the right edge of their icons.
- **Gaps (chess clock):** measure the distance from the bottom of a setup group title to the top of its first control; it must be at least 12 px.
- **Links:** collect every anchor on every page from the sitemap, check internal targets and fragments, and request external targets with an ordinary browser user agent. Treat a 403 or 406 from a ticket, payment or social provider as "refuses automated visits" and check the link target text only.
- **Errors:** record console errors, page errors and failed requests on every page.
- **Speed:** load each key page cold, then warm, on a phone profile and a desktop profile, and compare against the previous report.

## Facts and where they come from
- **Page list:** the site's sitemap. FOA also has the class reps page.
- **FOA Fayre times:** the newest FOA newsletter email is the source for the Fayre running order. Compare it with the live "On the day" timeline.
- **FOA availability:** the live availability data file shows when it was last checked; compare to the current London time.
- **Dependencies:** run the repo's production dependency audit (omit dev dependencies) in a fresh clone of main.
- **Landed commits:** Nick squash-merges. To tie a landed commit to a gated head, compare their trees. A branch based on older main shows later-landed work as removed in a plain diff, so use a three-dot diff.

## Audio playback (Sam)
1. Open the Listen page at 390 wide, reject analytics in the banner.
2. Find the player's play control by its label (it may read "Preview" or "Play"). Click it.
3. Read the soundbar's elapsed time, wait a few seconds, read it again. It must have moved forward. Also confirm the control now offers pause.
4. Pause, then resume: elapsed time must carry on, not restart.
5. Let a short track finish: the control must return to a replay or play state.
6. Record the track length and the times you saw.
Launch Chrome with autoplay allowed. Real playback is required, not a mocked player.

## Chess clock (WBN)
Check the setup screen, a running game, pause and resume, the settings sheet, sound toggle, move counter, a flagged game, an ended game, a reload mid-game, low-time state, and the share image. Do each at 320, 390 and 200% text, in each theme the page offers. Run stable-controls on every state change. Seed a short game time by editing saved state in the browser rather than waiting.

## Slopstrap
Look at the rendered page and the visible copy, not only the diff. For each of the 17 items scan every section at 390 and 1280 wide in all themes, and the page source for decorative symbols. Report existing tells separately (see `known-items.md`).

## Reporting mechanics
- Check for an existing issue before filing. The agent cannot close issues.
- Attach screenshots only where they prove something. Keep them small.
- Write a clean report even when the run was reduced: lead with the verdict, then what was and was not checked.
