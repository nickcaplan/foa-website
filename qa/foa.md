# The Friends of Ashley (FOA)

Repo rules and the post-merge and twice-daily prompts are in `AGENTS.md`, "Production QA agents" and "The Friends of Ashley QA focus". Do not copy them here.

## Pages
Home, What's On, the Christmas Fayre event page, Fundraising, Get Involved, Uniform, Newsletter and the class reps page. Check every page in the sitemap on each twice-daily run.

## Checks and expected outcomes
- Shared checks in `checks.md` at all widths, Day and Night, 200% text. Expected: the supporters hero wraps 3 and 3 at 200%; that is the design.
- Header, mobile menu and footer: the menu button keeps its size and position when the menu opens and closes. Menu links all work.
- Ticket links: confirm the href points to the ticket provider. Never click through to buy.
- Fayre page: the "On the day" timeline shows its rows in the right order with the right times, matching the latest FOA newsletter. Times, dates and prices agree across pages.
- Cookie consent: reject and accept both close the banner and the choice is remembered.
- Newsletter and Uniform lists keep words whole at 320 and 200% text.
- **Availability data:** the live availability file must be refreshed. Flag only if the scheduled runs stop, or the file's checked time is more than 30 minutes old between 07:00 and 21:00 London time.
- Copy rules from `AGENTS.md` (name form "The Friends of Ashley", British English, plain hyphens).

## After a merge
Confirm the deploy finished, the changed page matches the merged tree, then the shared checks on the changed page and its neighbours.
