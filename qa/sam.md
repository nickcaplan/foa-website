# Samantha Fernando (Sam)

Repo rules, including the real-audio requirement, are in that repo's `AGENTS.md` ("Production QA agents" and the site focus). Do not copy them here.

## Pages
Home, Biography, Works, Listen, Watch, Writing, Contact, Privacy, 404.

## Checks and expected outcomes
- Shared checks in `checks.md`, Chromium only.
- **Audio playback (required every run and after any player change):**
  - On the Listen page, start the player with the visible play control.
  - Pass: the playback state changes to playing and the elapsed time advances over several seconds.
  - Also check pause then resume without a restart, and that a track played to its natural end returns to a replay or play state.
  - Fail: no state change, elapsed time stuck, the player restarting on resume, or a console error from the player.
  - Consent: the cookie banner must not block or move the soundbar. Reject analytics and confirm audio still works.
- Embedded players and videos load and are labelled. External media pages may refuse automated visits: check the embed itself.
- Cookie banner: accept and reject both work and are remembered.
- Contact form: check validation and layout only. Never submit.
- Ticket or booking links: check the href only.
- The page build is generated, so after a merge also confirm the stylesheet matches the landed build (a missed rebuild shows as unstyled new classes).
