# Compass (demo)

Repo rules are in `CONTRIBUTING.md` ("Production QA agents" and "Compass QA focus"). Do not copy them here. The demo is served from main.

## Scope
Signed-out only unless Nick provides a dedicated test account. Never sign up or trigger email. Signed-in flows are therefore **not checked**: say so on every run.

## Checks and expected outcomes
- Shared checks in `checks.md`. Compass uses pixel fonts, so doubling the root font size is not a true 200%; say what was exercised.
- Home and the demo views load with no console errors.
- Core flows signed out: source options, the generate and regenerate actions, plan and results views, gated routes (they must redirect or explain, never show gated content).
- Stable controls: the Generate and Regenerate action must not change width or position between states. This is a known open item (see `known-items.md`).
- The app code loads lazily in a separate chunk, so check the app after a hard reload, not only after navigating from the home page.
- The daily rate refresh workflow, when it lands, is an automation: check it by reading its runs, never by triggering it.
