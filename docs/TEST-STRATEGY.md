# Test Strategy

## Purpose

The test suite should make routine content and frontend changes safe without making the static site expensive to maintain. Coverage is risk-based: protect what parents rely on, what changes often, and what can fail silently in a generated deployment.

The strategy complements, rather than replaces, stakeholder content review, real-device review and manual accessibility testing.

## Testing Principles

- Test public behaviour and generated output rather than Astro implementation details.
- Keep the default verification path deterministic, headless and suitable for GitHub Actions.
- Prefer a small number of high-value journey tests over exhaustive page-by-page duplication.
- Put assertions at the lowest useful layer: schema rules in content validation, links in generated-site tests, and interactions in a real browser.
- Use roles, accessible names and stable public URLs as browser-test selectors. Add test-specific selectors only when no meaningful accessible selector exists.
- Avoid exact full-page HTML snapshots, broad text dumps and pixel screenshots for content that changes frequently.
- Every production bug should receive a focused regression test at the lowest layer that can reproduce it reliably.
- Tests must support both root hosting and the temporary `/foa-website/` GitHub Pages base path.

## Risk Priorities

### Highest priority

- Users can reach the main task routes and the generated links and assets resolve.
- Mobile navigation opens, closes and exposes the correct state to assistive technology.
- Time-sensitive event and uniform information is rendered from valid structured content in the intended order.
- Reps Hub copy actions and newsletter issue selection and expansion work, including keyboard and failure states.
- Pages retain essential accessibility foundations: landmarks, heading structure, names, focusable controls and no detectable WCAG violations in representative routes.
- Canonical URLs, social metadata, robots rules, sitemap entries and Event structured data remain correct across deployment base paths.

### Medium priority

- Responsive layouts remain usable at representative narrow mobile and desktop widths.
- The 404 page, external contact handoff and future ticket-provider handoff behave as intended.
- JavaScript-enhanced features leave the underlying content and navigation usable when JavaScript is unavailable where practical.

### Later or conditional

- Screenshot regression for a small set of stable pages once the visual design is approved.
- CMS preview, publication and expiry tests after a CMS is selected.
- Ticket-provider end-to-end checks after the real provider and URL are confirmed.
- Locale and RTL browser coverage when a translated locale is approved for launch.
- Analytics and consent tests if analytics is introduced.

## Test Layers

### 1. Static checks and content validation

Keep `astro check` as the first, fast gate. Astro content schemas should reject invalid field types and unsupported states during the build.

As the content model grows, add explicit validation for business invariants that a field schema alone cannot express, for example:

- An event end time is later than its start time.
- An archived event is not also featured as current content.
- A linked event has a valid internal path or approved external URL.
- Exactly one newsletter is marked as latest.
- Committee display order values are unique.
- Images that are supplied also have meaningful alternative text where required.

Do not unit-test Astro templates solely to reproduce checks already provided by TypeScript, Astro or the content schema.

### 2. Generated-site contract tests

Continue using Node's built-in test runner against `dist/`. These tests are fast and should cover contracts that do not require a browser:

- Every expected public route is generated.
- Every generated internal link, stylesheet, script and local asset resolves.
- Main navigation destinations are present on public pages.
- Required metadata is present and canonical URLs respect `SITE_URL` and `BASE_PATH`. `tests/metadata.test.mjs` discovers HTML routes recursively from `dist/`, including standalone `.html` pages, so new pages receive metadata, social-image and exact sitemap-membership checks automatically. Only the playground and 404 pages are excluded from these public-route checks; both have separate assertions.
- Sitemap, robots output and the no-indexed playground behaviour are correct.
- Event structured data is valid JSON and contains the confirmed source fields.
- Important collection-driven ordering and separation rules hold, such as upcoming versus archived events and latest versus previous newsletters.

Pure logic lives in `src/lib` (event visibility and UK-day labels in `event-visibility.ts`, content rendering in `inline.ts`, and the visual fundraising percentage in `fundraising-progress.ts`) and is unit-tested directly with the same runner, including clock-change, escaping and empty/reached/exceeded-goal edge cases. Browser tests then only need to prove the wiring.

Do not assert on minified CSS, editable prose or facts the link crawler already covers. Where a test needs an event date, derive it from the content file rather than hard-coding it.

Prefer structural parsing over increasingly broad regular expressions when these tests expand. Keep content assertions focused on critical facts and ordering; do not freeze every sentence of editable copy.

### 3. Browser end-to-end tests

Use Playwright for interactions and complete parent journeys. Run against a production build served locally so routing, built scripts and base-path behaviour match deployment closely. The production suite starts a dedicated preview server on a free port chosen at run time (override with `PLAYWRIGHT_PORT`) with `--ignore-lock` and does not reuse an existing server, keeping it separate from normal development/preview sessions and the development suite.

Initial browser scenarios:

1. Navigate from Home to What's On, Fundraising, Uniform and Get Involved using normal links; verify the destination and current-page indication.
2. At a mobile viewport, open the menu, verify `aria-expanded` and visibility, close it with the close button, backdrop and Escape key, and verify sensible focus behaviour.
3. Select a previous newsletter in the desktop reading room, verify its content and full reading width, expand/collapse it and return to the latest issue. Retain the stacked archive on mobile/tablet and with enlarged text; preserve content, expansion state and keyboard focus across layout changes.
4. Copy a Reps Hub message with a mocked clipboard, verify success feedback, and verify the feedback clears. Simulate an unavailable or rejected clipboard and verify failure feedback.
5. Follow a key parent journey to find the Fireworks time and uniform donation information.
6. Verify Today/Tomorrow labels using a fixed browser clock near a date boundary rather than depending on the day the test runs.
7. Confirm the development-only mobile-preview control is absent from the production build.

Generated-site contracts in `tests/site.test.mjs` cover Fireworks in the initial homepage HTML without Welcome Tea or date switching, and the Welcome Tea archive boundary on What's On. Browser date tests freeze only Date (not animation or interval timers), assert successful navigation and verify UK-time event visibility across visitor timezones.

What's On contracts also check build-time `hidden` attributes and execute the actual generated inline initializer without downloaded modules at archive and all-day expiry boundaries. Browser regressions block external script downloads and check that the early initializer corrects a stale build, with mobile and desktop overflow checks.

Further browser scenarios now covered: clicking through from What's On opens the Fireworks page without a return breadcrumb; key event information stays reachable with JavaScript disabled (the footer is the mobile navigation fallback); and axe plus a no-horizontal-scroll check run at a 390px viewport, including the open mobile menu.

The Fireworks suite also runs in a focused `webkit-fireworks` project alongside Chromium. It checks static narrow/touch views (including direct landscape visits, orientation changes and wider touch screens), no initial canvas contexts or animation-frame requests, no new drawing work after scrolling or preference changes, and cancellation/buffer release when desktop switches into static mode. `tests/fireworks-motion.test.mjs` exercises the real initializer against a minimal browser harness to verify lazy canvas creation, cancellation and buffer release without launching a browser. The no-JavaScript page is static from its initial HTML. These are behavioural and compatibility checks, not physical-iPhone performance benchmarks; real-device follow-up is tracked in `ACTIONS.md`.

Keep browser coverage concentrated on shared navigation and unique interactions. Static pages with no distinct behaviour should be covered by generated-site and accessibility checks rather than repetitive end-to-end tests.

The production year view at `/whats-on/` has focused coverage in `tests/e2e/year-view.spec.ts`: archive rows, month headings, keyboard focus and disclosure state survive repeated one-minute refreshes at mobile and desktop widths; an event crossing its end time switches exactly once; current/empty month and end-of-year states are checked; helper actions and expandable information survive refreshes. Happy Bags opening/closing tests compare the date badge's position and size relative to its row at 320px, 390px and 1440px with normal and 200% text, while confirming that the explanation really expands. Expanded archive and Night Mode information states receive axe checks, with a 320px enlarged-text overflow check. `tests/event-lifecycle.test.mjs` covers explicit archive overrides, end/start fallbacks, UK all-day boundaries at both clock changes, academic-year labels/month assignment and section visibility without node movement. Generated-output contracts execute the actual early initializer without module downloads. Test boundaries derive from structured event content where applicable.

Fundraising coverage is defined in `tests/e2e/fundraising.spec.ts`: the shared Home/Fundraising animation runs once and reaches the real amount; the modest visual fill does not alter accessible progress values; reduced-motion and no-JavaScript modes retain final figures; responsive columns, previous-year alignment and enlarged text do not overflow. Generated-site tests cover shared financial content, both menu orders/current-page indication and the absence of a donation CTA in the homepage band. Browser execution blockers and manual-review follow-ups belong in `ACTIONS.md`.

Get Involved coverage in `tests/e2e/get-involved.spec.ts` checks mobile, tablet and desktop layouts in Day/Night Mode at normal and 200% text. The desktop assertions compare corresponding headings, role starts, separators and both button edges across the paired columns, not merely their outer widths. Eight additional checks decode an eight-pixel screenshot strip at 1280px and 1366px, standard and Retina scale in both modes, asserting that the two coloured heading rules actually paint on the same device-pixel rows. A deliberately longer description and wrapping action label exercise shared-track resizing. A narrow enlarged-description regression deliberately widens “announcements” beyond its paragraph using letter spacing, then checks that the text still fits its own column. This protects against platform font differences, including the Linux overflow found by CI, without relaxing the overflow assertion. Every opportunity group keeps its action beneath the copy. Tests also protect the vacancy and closing appeals' stacked fallback, section gaps, text bounds and page overflow. They wait for the expected text size and container-query layout before measuring. Browser execution blockers and results belong in `ACTIONS.md`.

Night Mode is covered by `tests/e2e/night-mode.spec.ts` against the production build: first visit follows the device setting, the initializer runs before the body, keyboard operation, persistence, blocked storage, invalid saved values, device-setting changes, the no-JavaScript fallback, independence from cookie consent, responsive placement at 320, 390 and 1440px, an axe scan of every built page in Night Mode with colour transitions frozen, and enlarged-text mobile menu checks. Theme interactions use the menu on mobile and the header on desktop, including the homepage. Axe cannot judge text over gradients or images, so the themed artwork (homepage parchment scroll, Fireworks and Christmas stages) is instead asserted to render identically in Day and Night Mode, and patched accents have pinned colours. `tests/site.test.mjs` asserts the built site ships the theme but none of the local development tools. The remaining local-only dev tools (phone preview, header layout with dev controls, mobile homepage controls inside the menu) are covered separately by `tests/dev/dev-tools.spec.ts` and `playwright.dev.config.ts` (`npm run test:dev`), which starts its own fresh development server without replacing an existing one.

Month-heading band coverage in `tests/e2e/year-view.spec.ts` checks hidden empty months plus upcoming and archived month bands at 320px and 1440px in Day/Night Mode with normal and 200% text: bands use the shared deeper-paper colour, span their month container, retain the fine bottom rule and padding, omit the redundant event-list top rule and avoid horizontal overflow. Date-to-heading spacing checks also cover tablet widths, aligned event-copy columns and the enlarged-text stacked fallback.

Narrow large-text coverage in `tests/e2e/large-text-narrow.spec.ts` loads every built page at 320px in Day/Night Mode with text enlarged to 200% (every element's font size doubled, a harsher test than a browser setting). It asserts there is no sideways scrolling and that no text or box ends beyond the screen, apart from decorative elements clipped on purpose. Focused checks cover the footer link columns, the Fireworks parchment panels, the Christmas Fayre facts and email button, the About panel buttons and Reps Hub headings within their own card columns. The heading regression adds wider letter spacing to protect against platform font differences. `tests/e2e/reps.spec.ts` also checks heading text bounds, time containment and date-badge/time alignment at mobile, tablet and desktop widths in both modes with normal and enlarged text. Enlarged timing checks use wider Verdana text and letter spacing to reproduce Linux font overflow locally, retaining complete clock times on a single line while allowing the range to wrap between them.

Newsletter coverage in `tests/e2e/newsletter.spec.ts` protects the option C reading room and stacked fallback at 320px, 390px, 768px, 1024px, 1280px and 1440px in Day/Night Mode with normal and 200% text. Tests compare the reading width of latest and older issues, check the issue selector's top alignment, keyboard selection and return focus, expansion-state retention, unchanged page position when switching issues, fragment navigation and full-text no-JavaScript fallback. Existing preview, five-line fade, typography and archive-gap checks run in the stacked layout; desktop selection checks also measure the selected issue's fade. Accessibility suites cover the issue selector and an expanded older issue, including Night Mode.

`tests/e2e/cta-icon-wrap.spec.ts` sets and asserts each route's actual viewport at 320px, 390px and 1440px, rather than overwriting a shared suite setting inside a loop. It compares trailing icons with the final text line, including both 200% text emulations. Focused Newsletter, Fireworks volunteering and Uniform checks at mobile, tablet and desktop widths cover both themes and text sizes with a wider Verdana fallback, expanded archived-newsletter URLs and text/icon containment inside each neighbouring content column. `tests/e2e/uniform.spec.ts` measures visible text ranges independently of nested icons and retains equal button-height and width assertions. Unit tests protect wrap-safe URL labels and escaping in the inline renderer.

`tests/e2e/section-spacing.spec.ts` checks title-to-content and content-to-footer gaps on About, Committee, Contact, Meeting Minutes, Privacy and Get Involved at mobile, tablet and desktop widths in Day/Night Mode with normal and 200% text. It protects the desktop-only spacing reduction, unchanged mobile/tablet margins and unchanged What's On spacing. Contact's column alignment and stacked enlarged-text fallback, About's pillar-heading containment and page-level overflow are also checked. Newsletter's existing layout matrix checks its board gap and neighbouring issue-selector alignment.

`tests/e2e/fireworks.spec.ts` checks both detail lists at phone, tablet and desktop widths in Day/Night Mode with normal text and both 200% text emulations. Text must fit its own label/value cell with no collapsed or overlapping columns, including enlarged tablet layouts.

`tests/e2e/fireworks.spec.ts` also checks that event-page torches end at the first parchment and never follow the later panels while scrolling, at phone, tablet and desktop widths with normal and enlarged text.

### 4. Automated accessibility checks

Fireworks map links share the trailing-icon regression selector, including the tablet width that previously left the arrow alone. Focused checks verify both links remain inside their parchment columns at normal and enlarged text.

The 320px social-menu regressions also force a wider Verdana fallback in Day/Night Mode, checking that the icons remain beside the labels and that labels fit their own pill borders. This protects against Linux font wrapping that was not reproduced by the default macOS font.

`tests/e2e/social-links.spec.ts` checks footer social-pill label and icon bounds inside each pill, corresponding column alignment and spacing at 320px, 390px, 768px, 1024px and 1440px in Day/Night Mode with normal and 200% text. This includes the 768px enlarged-text regression that page-level overflow checks miss. Menu checks retain the secondary placement below Contact Us, short-screen scrolling, enlarged-text label containment and keyboard focus wrapping through the added links. Tall-screen regressions at 390px, 768px and 1024px compare the separator and pill edges with Contact Us, retaining the 0.75rem gaps instead of a flexible spacer in both themes and text sizes. Menu checks also compare both pill edges on the same row and keep each icon beside its label at normal text size, including 320px phones; narrow enlarged-text views retain the stacked fallback. Existing navigation tests retain Contact Us visibility on a 667px-high phone.

`tests/e2e/footer-credit.spec.ts` checks the footer utility typography, compact row/stack alignment, corrected charity disclosure, credit colours and visible keyboard focus at 320px, 390px, 820px and 1440px in Day/Night Mode with normal and 200% text. Text enlargement covers the whole page, waits for text-relative container queries to settle and is reapplied after navigation to Privacy. Assertions confirm the enlarged sizes on both pages, no horizontal overflow, keyboard access to both consent choices on 667px-high phones and focus returning to Cookie preferences after rejection.

The floating-menu regression suite covers the mobile homepage (a 48px trigger is available from arrival alongside the introduction, with no recruitment banner), full desktop homepage navigation with no burger even after scrolling, branding from 64rem and full navigation from 80rem, and interior-page scrolling (the header leaves the viewport while one trigger stays fixed below 80rem). It also checks menu focus containment, close/focus recovery, mobile Night Mode inside the menu, responsive theme placement and overflow. The footer logo remains a working home link. The shared accessibility tests check a rendered touch target of at least 44px, not an exact legacy CSS minimum. Browser execution is still required to verify rendered positioning and interactions.

`tests/e2e/accessibility.spec.ts` runs `@axe-core/playwright` against **every page in the production build** (discovered from `dist/`, at desktop and 390px mobile widths), so a new route is scanned with no test edit. Only `/playground.html` is excluded, in an explicit `excluded` list. Interactive states (expanded newsletters, the open mobile menu) are scanned separately. The page types this must always cover include:

- Home
- What's On
- Fireworks event detail
- Uniform
- Committee
- Newsletter with its issue selector and expanded content
- Reps Hub
- Contact
- 404

Fail on serious and critical violations initially. Review all reported violations and tighten the threshold when the baseline is clean; do not create broad rule exclusions. Any narrow exception must include a reason and a follow-up action.

Automated checks do not establish WCAG 2.2 AA conformance. Before launch, manually verify keyboard-only use, visible focus, 200% zoom, mobile text enlargement, reduced motion and representative screen-reader journeys.

### 5. Visual and performance checks

Do not start with broad screenshot regression while page content and spacing are still being refined. After visual approval, add a small baseline set at approximately 390px mobile and one desktop width for Home, What's On, an event page and one dense content page. Mask only genuinely dynamic date labels and keep review of changed baselines explicit.

Use Lighthouse or an equivalent deployed-site check as a scheduled or pre-launch diagnostic rather than a blocking check on every change at first. Track mobile performance, image weight, layout shift and accessibility; set blocking budgets only after measuring a stable baseline.

`tests/performance.test.mjs` adds blocking generated-output budgets for the seven mobile-menu destinations: 4 KiB estimated gzip for directly referenced and inline JavaScript, 18.25 KiB estimated gzip for linked stylesheets (raised from 18 KiB on 13 November 2026 for the three-column footer; a later PR is to reduce stylesheet size), 500 KiB of eager images on Home and 100 KiB on each other destination. Responsive candidate lists must be ascending by width: the inventory counts the last (largest) candidate once, including preloads, rather than estimating a specific device's selection. CSS backgrounds, fonts, lazy images, transitive script imports and consented third-party resources are outside this inventory. Each test prints measured sizes and its eager-image list. Additional contracts protect matching preload/image candidates, individual derivative sizes and lazy/asynchronous past-event posters. `tests/e2e/responsive-images.spec.ts` checks mobile and desktop image selection, no duplicate original/variant download, successful poster loading after scrolling and overflow. These browser checks must run before claiming rendered verification.

`tests/diagnostics/navigation-performance.spec.ts` follows all seven menu destinations in touch-enabled Chromium with a Pixel 5 viewport, 150ms synthetic latency, 3Mbps download, 1Mbps upload and 4x CPU slowdown. It takes two samples per destination with cleared HTTP cache, then two with caching permitted. It asserts successful navigation, a visible destination heading, closed menu and no page errors, but does not impose uncalibrated timing thresholds. Its JSON attachment and console report contain menu-link activation to navigation, heading visibility, DOMContentLoaded, first contentful paint and load timings, plus document TTFB and resource timings/transfer bytes. Heading visibility includes test-observation overhead; FCP is not proof of usable content; zero resource transfer bytes can mean cached or unexposed timing data. These local-preview diagnostics neither benchmark a physical Android phone nor measure GitHub Pages latency. Analytics is rejected to keep third-party traffic out of the baseline. The opt-in diagnostic command is listed in the root README; its separate Playwright configuration reuses the production-preview setup, with Chromium only, one worker and no retries. It is outside the routine verification gate. `tests/e2e/navigation.spec.ts` retains an unthrottled touch journey through all seven destinations, checking HTTP success, the destination heading, closed menu and no page errors. Generated-output asset budgets remain in the verification gate.

## Manual Testing

Automation cannot approve facts, tone or usability. Retain these manual activities:

- Real-device checks on a small phone, a current iPhone or Android device, and desktop.
- Keyboard navigation through every interactive control.
- VoiceOver or NVDA checks of navigation, menu, dialog and clipboard feedback.
- Content approval for dates, prices, roles, contact routes and provisional operational information.
- Lightweight task-based information-architecture testing with parents and carers.
- External-provider checkout and privacy review when ticketing or forms change.

Record reusable manual checks in a short release checklist once launch preparation begins.

## Execution And CI

The intended commands are:

```sh
npm run check          # Astro, TypeScript and content validation
npm run build          # Static generation
npm run test:site      # Generated-output contract tests
npm run test:e2e       # Playwright journeys and accessibility checks
npm run verify         # Required pull-request and deployment gate
```

Local runs use installed Chrome on macOS, while CI uses bundled Chromium on Linux with different fallback fonts. Narrow-width and enlarged-text layout tests can therefore pass locally and fail in CI. To reproduce, temporarily set `--font-body` to a wide font such as `Verdana, sans-serif` in `src/styles/global.css`, then run the affected specs with `--retries=0`.

During the first implementation phase, keep `npm test` as the convenient aggregate command. It creates a fresh production build before running tests that consume `dist/`. `npm run verify` remains the authoritative CI gate and adds Astro and TypeScript diagnostics before `npm test`.

Recommended cadence:

- Every pull request and push to `main`: check, build, generated-site tests, Chromium browser journeys and automated accessibility scans.
- Before launch and after changes to shared CSS, navigation or interactions: Chromium plus WebKit, Firefox and manual mobile review.
- Scheduled or pre-launch: deployed-site link check and mobile performance run. Dependency vulnerability scanning runs in CI; see [`PROJECT-BRIEF.md` → Hosting, domain and deployment](PROJECT-BRIEF.md#52-hosting-domain-and-deployment).

CI uses the latest available Node 22.x version at or above 22.18.0, which supports the default TypeScript type stripping required by the direct `src/lib/*.ts` unit-test imports. Cache Playwright browser downloads in CI only if it materially improves build time without obscuring failures.

The verification jobs retain `test-results/` as separate `browser-test-results-shard-1` and `browser-test-results-shard-2` artifacts for 14 days, including available browser-failure evidence, even when verification fails. Workflow and job names are recorded in [`PROJECT-BRIEF.md` → Hosting, domain and deployment](PROJECT-BRIEF.md#52-hosting-domain-and-deployment). Opt-in mobile-navigation diagnostic JSON is attached to its separate Playwright run, not generated by the deployment gate.

Test-suite runtime evidence and proposed optimisations are tracked in [`ACTIONS.md` → Test-suite runtime follow-up](ACTIONS.md#test-suite-runtime-follow-up). These proposals do not change the verification gate until implemented; distinguish test runtime from browser installation, retries and aggregate worker time when comparing measurements.

## Coverage And Maintenance

Line coverage is not a useful primary target for this mostly static Astro site. Track confidence through requirement and journey coverage instead:

- Each client-side interaction has a successful-path and important failure-path browser test.
- Each public route is generated and reachable by the link crawler or expected-route test.
- Each distinct page template is represented in automated accessibility scans.
- Each confirmed high-risk business rule has one focused contract test.

Tests should fail with a message that identifies the broken route, reference or behaviour. Quarantine is not the default response to a flaky test: fix nondeterministic clocks, animation, network access and selectors. Tests must not depend on live third-party services.

## Implementation Order

Build in this order, so the broadest protection and the riskiest bespoke behaviour come first:

1. Playwright and `@axe-core/playwright` with production-preview configuration.
2. Mobile-menu browser tests and representative accessibility scans.
3. Newsletter dialog, Reps Hub clipboard success/failure and fixed-clock event-transition coverage.
4. Generated-site contracts for expected routes, metadata, structured data, sitemap/robots and collection ordering.
5. Fixed-clock date-label tests and key parent journeys.
6. Cross-browser CI coverage once the Chromium suite is stable and fast.
7. Selective visual regression and performance baselines after design approval.
8. Extensions when CMS, ticketing, analytics or translated locales are introduced.

Steps 3–4 take priority because they protect interactions and output that can fail without breaking static route generation. Defer visual regression, cross-browser expansion and conditional CMS/ticketing/analytics tests until the Chromium baseline and operational content are stable. Which steps are complete, and what remains, is tracked in [`ACTIONS.md`](ACTIONS.md).
