# Actions

The single backlog for the project: outstanding tasks, open questions and provisional content. When an item is resolved, move the outcome into [`PROJECT-BRIEF.md`](PROJECT-BRIEF.md) as a decision or specification and delete it here. See [`README.md`](README.md) for the documentation rules.

**Owners:** **FOA** = The FOA committee (decision or approval needed); **Owner** = project owner (Nick Caplan); **Dev** = implementation work.

## How to Use This File

- "What are the next steps?" Start with **Launch-blocking**, then **Soon**. Separate unblocked **Dev** work from items needing a decision from **FOA** or **Owner**.
- Before starting an item, check its **Blocked by** column and the *Open questions* section.

## Launch-Blocking

The site is live at `https://www.thefriendsofashley.org`. These items must be resolved before the site is treated as fully launched.

| Item | Owner | Blocked by |
|---|---|---|
| Confirm Fireworks capacity, refund/cancellation and bad-weather policy, accessibility details and provider data-processing responsibilities (provider is Buy Tickets). | FOA | FOA decision |
| Confirm access and retention arrangements for the shared FOA inbox and the Google contact form (ownership, who has access, retention). The Privacy Notice currently records these as pending. | FOA | FOA decision |
| Obtain higher-resolution committee portraits (Nick Caplan's replacement is already in use) and complete the final publication-consent check for all names, roles and portraits. | FOA / Owner | Supplied photos, consent |
| Inspect mobile-menu cold/warm-cache timings with responsive Fireworks WebP images and the compact term-by-term What's On listing (which no longer downloads event posters). Run `responsive-images.spec.ts` to confirm mobile/desktop image selection, no duplicate requests and archive layout. Repeat on live Android to distinguish menu response, network delay and image loading and review image quality. Calibrate timing budgets from repeated measurements. | Dev / Owner | Browser-capable environment; live Android and live-site network access for hosting measurements |
| Complete the final visual review of the homepage Fireworks card (now the parchment scroll with blackletter kicker) at narrow phone and mid desktop widths: timeline labels (about 9px, consider enlarging), and location line. Also check the compacted desktop card (cropped image, centred, single Event details button) at common laptop heights such as 720px, 768px and 900px, since it was only measured in a 700px-tall pane; the whole card above the fold is not yet confirmed. DOM checks passed with no overlap down to a 280px card, but 320px/200% zoom, forced-colours mode and a real-device look are still outstanding. | Owner | None |
| Complete the final mobile/desktop visual review of the Fireworks ticket CTAs: homepage hero (the card no longer has a ticket button) and the What's On row. The event-page summary, Tip, "Good to know", scroll edges and mobile sponsor placement were DOM-checked, including enlarged text; real-device review is still needed. | Owner | None |
| Check the Fireworks volunteering page (`/fireworks-volunteering/`) against the Volunteer Sign Up sheets: shift times, helper counts and the presales dates (the screenshot ended at Thursday 5th drop-off, so confirm whether a Thursday pick-up slot exists). Do a real-device visual check of the Fireworks-themed page (parchment cards, date chips and card headers at 320px and 390px, torches hidden on mobile), and of the new Volunteer buttons on the homepage hero and the Fireworks summary box. | Owner | None |
| Christmas Fayre page (`/events/christmas-fayre-2026/`): confirm with Rachel and Sophie whether there will be a sign-up sheet or link (only the Fayre email is published), what each area involves, and that the email address (read from the poster image) is exactly right. Do a real-device review of the baubles, snowfall (straight fall, spinning flakes) and the page length at 320px and 390px, plus reduced-motion and enlarged text. Decide how the page changes after the event. | Owner / FOA | Organiser confirmation |
| Review the Christmas logo (wreath and bow, header and mobile; confirm there is no size jump between pages and the wreath is not clipped) and the yellow "Help at the Fayre" button on What's On at mobile width. The [approved ivory SVG variants](PROJECT-BRIEF.md#design) now replace the JPG for website branding; original artwork and social-sharing images are retained. After deploy, check the link preview for `/events/christmas-fayre-2026/` in a real share (for example WhatsApp), which may cache the old image. | Dev / Owner | Deploy |
| Review the Fireworks logo (`assets/brand/foa-logo-fireworks-ivory.svg`, header on `/events/fireworks-2026/`) on desktop and mobile: it is scaled so its circle matches the standard logo, so confirm there is no size jump between pages and the bursts are not clipped (not checked in a rendered browser; Chrome launch was blocked). Decide whether a logo link-preview image is wanted (the page still shares the fireworks photograph). | Dev / Owner | Deploy |
| Update the autumn newsletter line "Online ticket link will be shared shortly" now that tickets are on sale. | FOA | FOA decision |
| Confirm how school families buy tokens in advance (the guide says the week before, but gives no route). Reconcile the guide's fairground cash/card label with its token FAQ and the existing token-only ticket-page advice; confirm current token prices, bag sizes and non-refundable/reusable conditions before changing that copy. | FOA | FOA decision |
| Complete a focused mobile and desktop review of all routes: page order, spacing, heading scale, event/date labels, newsletter formatting and navigation terminology. The Get Involved vacancy-to-volunteering gap has been reduced and DOM-checked at 390px and 1440px with no horizontal overflow. | Owner | None |

## Soon

- **Owner / FOA:** Before releasing the Friday 13 November newsletter, supply the Fireworks amount and funding purpose (the master Doc still has £XXXX / YYYY). The draft website issue omits only that unfinished sentence. Donations Day carries the confirmed Reception and KS1 and KS2 item lines. Confirm final newsletter publication after school review; a draft PR is not release approval.

- **Dev / Owner:** Monitor `http-cache-semantics` 4.2.0 for a fix to GHSA-ch52-4w7c-c8xp (high severity, no patched version published as of 23 October 2026), then update the Astro dependency tree and rerun the full vulnerability scan. It is an Astro build-tool dependency, not a shared HTTP cache serving visitors on this static GitHub Pages site. The push and weekly `Dependency scan (full)` runs remain red while this finding is unresolved. The dependency-scanning policy is recorded in [`PROJECT-BRIEF.md` → Technical direction](PROJECT-BRIEF.md#technical-direction).

- **Owner:** Complete a post-deployment real-device check of the term-by-term What's On page: empty/current-month heading bands, Day/Night Mode, Happy Bags expansion with a stationary date badge, the collapsed archive and enlarged text on a narrow phone and desktop. Automated coverage passes in CI, including 332 browser tests; local agent browser launches remain sandbox-blocked and Review-pane tools are unavailable. The production replacement is merged in PR #17; no further merge approval is outstanding for that change.

- **Owner / Dev:** Before publishing 2027/28 dates, confirm the next academic year's event content and approve the rollover of `academicYearStart` in `src/lib/academic-year.ts`. Do not advance the displayed year automatically; the current page has an honest no-upcoming-dates state after its year ends. Future-year dates deliberately fail the build until the configured year is reviewed.

- **Dev / Owner:** Review the [approved warm-ivory website logos](PROJECT-BRIEF.md#design) on standard, Fireworks, Christmas, Newsletter and 404 pages at mobile and desktop widths in Day/Night Mode, including title-panel/menu alignment and unchanged white newsletter letterheads. Newsletter now uses the standard site logo, not the retired envelope artwork. Verify header alignment when switching between Newsletter and other pages. Regression coverage is in `tests/e2e/ivory-logos.spec.ts` and `tests/e2e/newsletter-logo.spec.ts`; real-device review is still required.

- **Owner:** Review the [Uniform layout and desktop navigation](PROJECT-BRIEF.md#design) on real devices in Day/Night Mode and with enlarged text, including price-badge alignment. The owner confirmed the focused browser suites pass; [full verification and deployment passed](https://github.com/nicholascaplan/foa-website/actions/runs/38471027975), including 249 browser tests. Agent-side rendered checks remain blocked by browser-launch sandbox permissions and unavailable Review tools.

- **Owner:** Check real shares of Newsletter, Fireworks, Fireworks volunteering and Christmas Fayre after the compact social-card changes are published. Allow for chat apps caching previous images; Newsletter uses the standard roundel, both Fireworks pages use the Fireworks roundel and the Fayre uses its festive roundel.

- **Owner:** Review the Fireworks summary at 320px and 390px with normal and enlarged text. The quality-review fix allows wrapping and stacks labels when the parchment content is narrow. Regression coverage checks the rendered text inside its own columns, not only page-level overflow, in `tests/e2e/fireworks.spec.ts`.

- **Owner:** Recheck Fireworks volunteering at tablet widths, including 768px and 1000px, with normal and enlarged text. The torches now hide throughout the mobile/tablet title-panel layout below 64rem; desktop regression checks retain static torches outside the introduction.

- **Owner / Dev:** Resume the feedback-form prototype designs requested on 17th October 2026. Review an engaging design before implementation. Before publication, the owner must supply a Formspree form ID targeting the shared inbox; confirm handling, retention and Privacy Notice changes before adding a new processor. Do not publish a placeholder form action.

- **Owner:** Review the approved Newsletter reading room (desktop option C) on real devices: issue selection and return through the Latest row, equal reading widths and three-section previews for all issues, paper titles, five-line faded peeks, expansion/collapse scroll position and keyboard focus when returning to the stacked mobile/tablet archive. Include Day/Night Mode, enlarged text, reduced motion and archive-sheet spacing. [PR #22](https://github.com/nicholascaplan/foa-website/pull/22) is merged and [production verification and deployment passed](https://github.com/nicholascaplan/foa-website/actions/runs/39257105968): Astro check/build, all 118 site/unit tests and all 404 configured browser tests (365 Chromium and 39 Fireworks-specific WebKit tests). CI caught and now protects against emoji-heading overflow at 320px with 200% text; paper side gutters no longer consume the reading column. Newsletter-specific WebKit coverage and physical-device review remain outstanding; Review-pane tools are unavailable. Also check wrapping of the organisers' full names and class labels on Christmas Fayre, Get Involved and Reps Hub.

- **Dev / Owner:** Verify the approved mobile-menu treatment: 104px logo, 22px main links, 21px serif event links and consistent decorative arrows on plain links. Check logo/control clearance for standard and festive variants, wrapping at 320px and 390px, Contact Us visibility on a 667px-high screen and scrolling with enlarged text. The compact logo placement now starts at 26rem. Local check/build and site/unit tests passed, but rendered verification is blocked by Chrome-launch sandbox permissions and unavailable Review tools.

- **Owner:** Ask both iPhone reporters to repeat their Fireworks scrolling journey after the static-mobile fix is deployed; also review Android, portrait/landscape, Reduce Motion on/off, battery/performance and enlarged text. Confirm smooth scrolling, static flames and no fireworks covering the practical information. Use a real-device testing service if physical devices are unavailable; WebKit automation is compatibility coverage, not proof of iPhone performance. Do not restore mobile effects without real-device evidence and a separate decision. The owner confirmed the Chromium and WebKit Fireworks suites pass with the additional touch-capability safeguard, including fine-pointer/touch-capable coverage. Agent-side Playwright launches remain blocked by macOS sandbox permissions; CI runs the production browser suite.

- **Owner:** Complete a final visual/content review of the redesigned Get Involved and Reps Hub pages, including volunteer vacancy status and the charter-based role summary. Reps Hub messages come first, actions align across desktop cards, and mobile cards are compact. Responsive DOM checks passed; local automated browser tests remain blocked by Chrome-launch sandbox permissions (see the browser-suite task below).

- **Owner:** Complete the real-device review of corrected Get Involved desktop option B: corresponding headings, role rows, separators and buttons, full-width year-round support, unchanged mobile order and enlarged-text stacked appeals. All 29 focused regressions and the full 330-test Chromium production suite pass using bundled Chromium with the owner-authorised sandbox IPC allowances. The latest divider correction paints both strokes in one shared box; eight pixel-level tests confirm identical painted rows at 1280px and 1366px, standard and Retina scale in Day/Night Mode. Rendered DOM inspection covered 320px, 390px, 768px, 1024px and 1440px in both modes at normal and 200% text. Section gaps are consistent, all measured pages fit and the paired rows and buttons align. Astro check/build and all 118 site/unit tests pass. Installed Google Chrome and WebKit remain sandbox-blocked, and Review-pane tools are unavailable; this is not a full multi-browser gate result.
- **Dev / Owner:** Resolve local WebKit page-renderer startup within the sandbox runtime. Narrow lookup allowances for `com.apple.hiservices-xpcservice` and `com.apple.windowserver.active` enabled the automation handshake and context creation, but page creation still failed with sandbox-extension issuance errors for Launch Services, trust, fonts and WebKit bootstrap. The sandbox runtime's inspected configuration exposes Mach lookup/registration, not extension issuance; further lookup guesses are not an established fix. Experimental WebKit allowances were removed, preserving the working Chromium rules. Requires sandbox-runtime support or an explicitly approved alternative browser-verification environment; do not disable protections silently.

- **Dev / Owner:** Check the refreshed Reps Hub at mobile and desktop widths: four messages in two desktop columns, wrapping full public URLs, clipboard/manual-copy parity and expiry/empty-state behaviour. Content checks and all 88 site/unit tests pass, but the updated browser tests could not run because Chrome launch was sandbox-blocked. Review tools were unavailable.

| Item | Owner | Blocked by |
|---|---|---|
| Verify the approved [mobile logo/title-panel treatment](PROJECT-BRIEF.md#design) across all routes, including Home, the themed event pages and the 404, at 320px, 390px, 1023px, 1024px and 1440px. The owner approved the homepage appearance; cross-device review remains outstanding. Check consistent logo size/position and home links, title wrapping, the homepage's airier line spacing and wrap-preserving font fit after resizing or text enlargement, readable no-JavaScript fallback, mobile Christmas baubles below the opening copy, Day/Night Mode, unchanged desktop branding/navigation, footer branding and fixed burger/phone controls after scrolling. Retain checks for linked menu branding, event sublinks, focus and Contact Us visibility on a 667px-high phone. Coverage is in `tests/e2e/floating-menu.spec.ts`, `tests/e2e/responsive-header.spec.ts` and `tests/dev/dev-tools.spec.ts`. Astro check/build and all 108 site/unit tests passed; local Chrome launch remains sandbox-blocked and Review tools were unavailable. The CI deployment gate covers production browser checks; run local development tests in a browser-capable environment and retain real-device review. | Dev / Owner | Browser-capable environment and real-device review |
| Browser-check the Fundraising annual-support groups (icons, three-column layout from 64rem, single column below) and the ways-to-help cards with buttons at mobile and mid widths (only one desktop width was measured), then run the Fundraising Playwright spec outside the sandbox. Also confirm the `.info-card h2` weight change on Contact and Uniform. | Dev | Browser-capable environment |
| Complete final checks and review for [Christmas homepage PR #75](https://github.com/nickcaplan/foa-website/pull/75), then obtain explicit main-merge approval before publication. The existing Fireworks production homepage remains unchanged until that decision. | Owner / Dev | Final checks and explicit main-merge approval |
| Review fundraising animation smoothness on real devices. Focused regression coverage is in `tests/e2e/fundraising.spec.ts` (one-time trigger, final amounts, visual fill, reduced motion, no JavaScript, responsive sizing and enlarged text); execution is covered by the browser-suite task below. Connected-browser sampling on Home and Fundraising at 390px showed stable figure/track widths through count-up to the correct final amount; desktop layouts have also been DOM-checked. | Owner | Real-device review |
| Review the redesigned 404 page (crying logo, tear/ripple timing, puddle growth stopping at 30s, ruled link rows) in a rendered browser at mobile and desktop widths, including spacing above and below the content and reduced-motion behaviour. | Dev | None |
| Committee page: decide whether the routes to Reps Hub and About The FOA are clear enough; if not, use more explicit task-focused labels. | Owner | None |
| Decide whether About The FOA should carry a concise committee summary. The Committee page remains the canonical source; avoid duplicating member details. | Owner | None |
| Decide whether to publish short committee biographies. If so, present them as visible readable content, not desktop-only tooltips. | FOA | FOA decision |
| Run the 5–7 parent/carer task-based information-architecture test (see *Suggested IA test tasks* below). | Owner | Participants |
| Set up uptime monitoring for the `www` domain with an agreed alert recipient and response owner. | Owner | Tool choice |
| Upload more past FOA newsletters to the site. Obtain the source newsletters, confirm they are approved for public release (check for personal details, child-related information and committee names before publishing), and add them to the newsletter content collection. | Owner | Supplied newsletters, FOA approval to publish |
| Once more newsletters are published, consider a year filter on the newsletters listing. It must work as a real, keyboard-accessible control and degrade gracefully without JavaScript (for example, year links or anchors). | Dev | More newsletters uploaded |
| Agree who updates the fundraising totals and content-update date and how often (`src/content/fundraising/current-appeal.json`), and what the homepage band and Fundraising page show once the 2026/27 goal is reached or the campaign ends. | FOA | FOA decisions |
| Confirm delivery of the KS1 playground equipment after October half term, then update the shared fundraising impact summary. Confirm final quotes and purchase/funding status before adding project-completion labels to spending priorities. | FOA / Dev | School / FOA confirmation |
| Add future open house meetings to the website. Confirm the dates, times, location and audience with The FOA, then add them as events in the content collection (single structured source; do not duplicate in page copy). | Dev | FOA confirming meeting details |
| Remaining test gaps from the coverage review: base-path (`/foa-website/`) browser tests; 404 animation and reduced-motion tests; run `npm run test:dev` in CI; `EventDate`, `EventList` and `FundraisingSummary` client scripts; a primary-navigation order test; make `event-dates.spec.ts` independent of live content (see below). Decide whether a year-group scan is wanted (the site legitimately shows year groups on Fireworks volunteering, Fundraising and newsletters). | Dev | Decision on year-group rule |
| Finish deriving event-date browser clocks from structured content: Welcome Tea archive and uniform-sale boundaries now derive from their event records, but Fireworks Today/Tomorrow and Santa's Grotto examples in `event-dates.spec.ts` retain fixed dates. Use the configured academic-year scope when maintaining these fixtures. | Dev | None |
| Confirm no expired-row flash or Fireworks-row jump on What's On on a real device. Build-time visibility and the synchronous inline date check pass generated-output tests and CI browser coverage, including blocked module downloads and mobile/desktop overflow checks. Local Chrome launch remains sandbox-blocked. | Owner | Real-device review |
| Without JavaScript the mobile menu button does nothing, so the footer is the only mobile navigation. Decide whether that fallback is acceptable or the nav should render by default and collapse once JS runs. | Owner | None |
| Check public Night Mode on real devices (iOS Safari and Android Chrome): zoom, keyboard focus, flash on load, and device-setting changes. Automated production verification passes; physical-device review is still required. | Owner | Real-device review |
| Run `npm run test:dev` outside the sandbox or with an approved Chrome-launch override. Verify the homepage phone-size control beside the burger at 320px, 390px and tablet widths, its dropdown, text clearance and fixed position after scrolling, plus desktop navigation and the interior-page controls. The control has moved outside the menu and regression coverage has been updated, but local Chrome launch remains blocked, so rendered verification is outstanding. Astro check/build and all 88 site/unit tests pass; the full gate reached browser tests but timed out after sandbox-blocked launches. Production browser tests, including Night Mode, run in the GitHub Actions deployment gate (`npm run verify`). | Dev | Browser-capable environment |
| Reduce test-suite runtime without weakening regression coverage: split large Night Mode loops and measure retry/worker/setup costs, including before/after gate runtime for the separated throttled diagnostic. See *Test-suite runtime follow-up* below for evidence and priority order. | Dev | Code/config changes unblocked; browser-capable environment or CI for timing comparisons |

### Test-suite runtime follow-up

The browser suite is the main runtime cost, not static generation or Node tests. Local measurements: `check` 4.5s, `build` 1.6s, and all 88 Node tests 0.7s. A [successful CI run](https://github.com/nicholascaplan/foa-website/actions/runs/38074376571) passed 178 browser tests in 1.7 minutes; a [later failing run](https://github.com/nicholascaplan/foa-website/actions/runs/38083599905) took 4 minutes for 184 tests, with repeated focus failures and click timeouts. Browser/dependency installation cost 39–42s. These are historical CI baselines. The owner's latest full local run had 188 passes and three overflow failures in 1.5 minutes; its throttled navigation diagnostic passed in 39.6s. Agent-side Chrome launch remains sandbox-blocked. Compare clean, equivalent revisions before treating these numbers as a performance improvement.

Prioritised follow-up (recommendations, not changes to the current gate):

1. Measure a clean deployment-gate baseline before tuning timeouts. CI currently retries twice: two tests in the historical failing run each exhausted 30s on all three attempts, costing roughly 180s of aggregate worker time. Use no retries for focused debugging; assess reducing CI to one retry rather than masking failures with longer timeouts.
2. Verify the new unthrottled seven-destination touch journey and measure repeatable before/after gate runtime for the separated throttled diagnostic (see `TEST-STRATEGY.md` → Visual and performance checks). Configuration discovery succeeds for both suites and check/build plus all 88 site/unit tests pass; the focused browser run is blocked before execution by macOS Chrome-launch permissions. The owner's earlier diagnostic run took 39.6s; this is not a measured gate saving, since the normal gate retains the touch journey and other tests run in parallel.
3. Parameterise the all-route layout loops in `tests/e2e/night-mode.spec.ts` by route and viewport. The current three tests perform 48 route visits and 96 Day/Night checks, each sharing a default 30s timeout and repeating its whole loop on retry. Compare scheduling gains against extra browser-context setup costs.
4. Keep full CI accessibility coverage (64 route-level axe scans across desktop/mobile and Day/Night, plus interactive scans), but consider a smaller local smoke command. This coverage is intentional, not redundant. Benchmark worker counts: `fullyParallel` is already enabled and the sampled CI runs used two workers; more workers may introduce contention.
5. Measure browser-install caching separately from test execution. Lower-priority costs are the five 800ms Fireworks waits per browser project (8s aggregate worker time across Chromium/WebKit), which intentionally detect delayed animation work, and the roughly 3s project-base build/site-test stage, which protects a separate hosting contract. Do not remove that coverage just to shorten the gate.

Compare equivalent revisions, worker counts and clean pass/failure outcomes; aggregate worker time is not wall-clock time. Record measured before/after results when implementing these changes.

## Later

- **Owner / Dev:** Decide whether What's On should gain a desktop grid. Compare two columns of months within each term against three term columns and the current full-width list, keeping mobile chronological and checking the uneven number of events per term. No grid or grid/list toggle has been approved. The separate option B month-heading band is approved and implemented, not a desktop-grid decision.
- **Owner / Dev:** Revisit desktop-specific layouts after the What's On work (deferred 18 October 2026). Compare options before implementation, preserving the mobile reading order and comfortable text widths rather than filling space for its own sake. Priorities:
  - Fireworks event body: compare a narrower schedule column beside practical/travel information, with volunteering below; do not add sticky ticket controls without separate review.
  - Homepage: review introduction/actions/artwork balance at ordinary laptop heights, especially 720px and 768px.
  - Fundraising and Reps Hub: refine existing column proportions, spacing, action alignment and interaction stability rather than adding more grids. Keep Uniform, Committee and Contact simple unless rendered review identifies a specific problem.
  - Across the site: check readable line lengths, uneven column heights, expansion-induced movement and reflow with enlarged text. These are ideas to assess, not approved redesigns.
- A live pre-loved uniform stock list remains a maybe, not approved scope (17th October 2026). Confirm an owner and a reliable stock-update process before building it.
- Select and integrate a CMS, only after editor ownership, preview/publish workflow, annual access handover, urgent-update and failed-build procedures are confirmed (see *Open questions → Content management*).
- Formal manual accessibility testing (keyboard, zoom, screen reader), then publish a public accessibility statement.
- Moderated Community Notice Board (deferred; no public route). Needs the decisions listed under *Open questions → Notice Board*.
- Additional reviewed translations and RTL testing; FAQs page; native share.
- Optional homepage fundraising enhancement: milestone ticks (25%, 50%, 75%, 100%) that light up amber as the bar passes them, with short labels such as "Halfway!". Needs FOA-approved wording. Other ideas considered: moving end-marker, progress-based message under the bar.
- Low-priority "Inspiration" archive of past event posters (standalone page or within What's On).
- Selective screenshot visual regression, after the visual design is approved.
- AI support bot for common parent/carer questions. Needs approved knowledge sources, committee ownership, privacy/safeguarding boundaries, human escalation, accessibility, cost and failure handling. Must not answer safety-critical, transactional or sensitive queries without reviewed safeguards.
- Confirm the wording of the inclusive membership statement against the FOA constitution.
- Confirm who is authorised to approve website content.

## Provisional Content

These facts appear on the site or in drafts but are not confirmed by an authorised FOA owner. Keep them labelled as provisional or absent from public pages until confirmed.

- Fireworks: capacity; what the quiet display involves and its accessibility characteristics; step-free access and toilets; refund, cancellation and bad-weather policy; event-day contact. Parking, first aid and lost-child help are now sourced from the supplied 2026 Event Guide.
- Uniform: accepted and rejected items; donation conditions (washed, labelled, bagged); bin-emptying frequency; whether sale dates are regular or ad hoc; size requests between sales.
- Privacy Notice details about shared-inbox and Google Form access/retention.
- Reps Hub copy (pending FOA approval).
- Confirm whether the November uniform sale's 15:45 finish also applies to December; December currently retains only its confirmed 15:25 start.
- Co-Secretary recruitment copy (final wording and publication review).
- AGM volunteer recruitment: reconfirm whether the Eco Stall lead and Summer Fete/Big Picnic organiser opportunities remain open, and confirm those events' plans and dates before listing them as confirmed events. Get Involved labels the event plans as unconfirmed and routes enquiries to the committee.
- Arabic translation quality (demonstration only; human review required).
- Santa's Grotto (14th December 2026): the start time, location wording and whether to list it publicly (it is usually a secret from the children) are unconfirmed. It is listed as an all-day event at Ashley School.

## Open Questions

Resolve these as part of the related items above, then record outcomes in the brief.

### Brand and tone

- Are there official colour values and brand-use restrictions?
- Is occasional illustration wanted, or should typography and simple graphics remain the visual language?
- Should the retained school logo (`assets/brand/school-logo-big.png`) be displayed anywhere? Retention is approved, but public use and placement need separate approval. Keep the purpose's three pillars as HTML text.

### Homepage and navigation

- Does Uniform deserve a permanent top-level navigation item year-round?
- Is "Get Involved" understood to include Committee and Reps?
- Should a language control appear in the header at launch?

### Committee

- Should the Committee page show elected dates or terms?
- Is the shared Gmail address the permanent public contact route?
- Who approves any biographies?

### Events

- Is Fireworks recurring content with a stable URL, or year-specific?
- Are attractions included in the entry price?
- Does the £8.50 ticket and free under-2 entry need advance reservation by ticket type?

### Reps Hub

- Is the page intentionally unlisted or public?
- Who writes and approves messages? How do expired messages disappear?
- Should native device sharing and translated versions be offered? (Dev view: keep Copy as the primary action. If sharing is added, make it a feature-detected `navigator.share` enhancement alongside Copy, not a replacement.)

### Notice Board

- Can parents submit notices, or only email The FOA?
- Which categories are allowed; are commercial services allowed?
- Who moderates; what is the standard expiry; will author names ever be shown; what is the takedown procedure?
- (Already decided: if restored, the Committee owns review, expiry and takedowns.)

### Languages

- Which languages are genuinely needed at launch, who translates and reviews, and which pages need full translation?
- Is English plus browser translation acceptable for MVP?
- Should locale-specific URLs be public and indexed? Who updates translations when English changes?

### Content management and operations

- Should repository ownership move from `nicholascaplan` to an account or organisation managed by The FOA?
- If Sanity is selected, who owns the project? Which committee members need editing access; how are editors added and removed each year?
- Who responds when a build fails? What delay between publishing and the site updating is acceptable? How are urgent cancellations published if automation fails?

### Analytics

- Is current analytics coverage enough, or are further decisions it should support needed? Do not add other optional technologies without extending the Privacy Notice and consent control.

## Suggested IA Test Tasks

For the parent/carer testing session (include at least one participant who uses English as an additional language). Do not coach; record hesitation, misread labels and missed content.

1. Find the Fireworks start time and whether tickets are available.
2. Find where to donate uniform.
3. Find the next uniform sale.
4. Copy the Fireworks information for a class WhatsApp group.
5. Understand what the Co-Secretary role involves.
6. Say whether a Community Notice Board would be useful.
