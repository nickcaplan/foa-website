# Checks for every site

## Widths, text size and themes
- Phone widths 320 and 390, tablet 768 and desktop 1280 to 1440.
- Enlarged text at 200%. For sites with fixed pixel fonts, doubling the root font size is not a true 200%, so note what was actually exercised.
- Every theme the site supports (FOA has Day and Night).
- **Pass:** no sideways scrolling, no clipped or overlapping text, no mid-word breaks, no unreachable controls, no console or page errors, no failed requests. A deliberate wrap that matches the design is a note, not a finding.
- Pairs of buttons keep equal widths, labels stay centred and icons keep a shared edge.

## Stable controls (Nick's rule)
No control may change size, shape or position between its states (idle, hover, focus, pressed, on and off, paused and running, open and closed, loading, error). Check by measuring each control in each state at 320, 390 and 200% text.
- Text labels: judge the centre line and height.
- Buttons and containers: judge position and full size.
- **Pass:** nothing moves or resizes. Any change blocks a pass, even if it looks fine.

## Interaction
Use keyboard only through the main journeys; focus is visible and returns sensibly after menus and dialogs close. Try repeated clicks, back and forward mid-flow, deep links and stale saved state. Respect reduced-motion.

## Links and content
- Every internal link, anchor, image, document and audio file resolves. Redirect chains end somewhere useful.
- External links: check the target and that it opens, but only read the link itself when the site refuses automated visits.
- No placeholder or TBC text, stale dates, expired events shown as upcoming, or pages that contradict each other. Report inconsistencies; never invent replacement facts.
- Copy rules: British English, plain hyphens only, no Oxford commas (FOA copy rules in `AGENTS.md`).

## Dependencies and security
- Run the production dependency audit in each repo (omit dev dependencies). **Pass:** no high or critical findings, and nothing new since the last run.
- Check the security headers on the live site. Missing headers are known items per site (see `known-items.md`): report a change, not the standing gap.

## Page speed
Compare like for like (phone, then desktop; cold, then warm). Flag a measured slowdown against the last run or a pre-merge baseline. If there is no baseline, say "unmeasured", not "no impact".
