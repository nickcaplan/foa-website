# Websites by Nick (WBN)

WBN has no QA prompt of its own in the repo. Use the shared prompts in the other repos' `AGENTS.md`, applied to this site.

## Pages
Home, Experience, other site pages in the sitemap and the chess clock at /chess-clock/.

## Post-merge check
First confirm production matches the landed build (the live page content and styles match the merged tree), then do the rendered checks.

## Checks and expected outcomes
- Shared checks in `checks.md`.
- Headings: plain, as in the merged design.
- **Chess clock:**
  - Setup screen: each group title keeps at least 12 px of space above its first control, at 320, 390 and 200% text.
  - Stable controls: pause and resume, sound toggle, move counter, turn and result indicators must not move or resize between states.
  - Behaviour: each side starts, switches and stops the right clock; pause and resume keep the time; a flagged or ended game shows the result; a reload restores or clears the saved game as designed.
  - Themes and widths: readable at 320 with 200% text; the share image resolves.
  - Low-time state: styling changes but layout does not.
- Do not test anything that sends data to a third party.
