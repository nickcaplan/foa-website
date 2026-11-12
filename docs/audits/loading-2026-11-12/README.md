# Loading audit - 12 November 2026

## Answer

The Committee page is the phone outlier, mainly because of its oversized portraits. The homepage has a large decorative background. The Art Competition delay was not reproduced. These fixes reduce bytes and cold loading without changing the approved layout. They do not prove the cause of the reported stall.

## Live coverage

All 15 public sitemap URLs returned 200. Fresh Chromium context per route, browser cache cleared for cold visits, immediate reload for warm. Desktop 1440x1000; synthetic phone 390x844, 3Mbps down, 150ms latency and 4x CPU throttle. Essential-only consent. One sample per combination, one test location. Visible images are decoded before the final observation, then 1.5 seconds allowed for paint. These are lab samples, not field percentiles. Warm visits are cache reloads, not repeat users across different routes.

An earlier pass waited only 1.5 seconds after load and undercounted lazy Committee portraits. The final tables and CSV files use the completed-image pass.

| Page | Desktop cold/warm LCP ms | Phone cold/warm LCP ms | Cold resource transfer KiB |
|---|---:|---:|---:|
| / | 240 / 72 | 1592 / 124 | 352.4 |
| /about/ | 256 / 32 | 580 / 64 | 31.2 |
| /christmas-fayre-art-competition/ | 364 / 48 | 700 / 80 | 98.3 |
| /christmas-fayre-volunteering/ | 324 / 48 | 744 / 72 | 99.2 |
| /committee/ | 436 / 108 | 2548 / 124 | 718.1 |
| /contact/ | 260 / 40 | 560 / 56 | 31.2 |
| /events/christmas-fayre-2026/ | 296 / 76 | 828 / 112 | 118.5 |
| /fundraising/ | 300 / 36 | 620 / 72 | 31.2 |
| /get-involved/ | 248 / 36 | 572 / 60 | 31.2 |
| /meeting-minutes/ | 256 / 36 | 576 / 56 | 31.2 |
| /newsletter/ | 320 / 104 | 776 / 112 | 43.6 |
| /privacy/ | 284 / 40 | 588 / 40 | 31.2 |
| /reps/ | 288 / 36 | 600 / 56 | 32.7 |
| /uniform/ | 268 / 40 | 584 / 56 | 33.7 |
| /whats-on/ | 264 / 40 | 616 / 76 | 33.1 |

Resource transfer excludes the document and only counts resources observed during the visit, not every lazy asset below the fold. Browser transfer includes protocol overhead.

## Art Competition

https://www.thefriendsofashley.org/christmas-fayre-art-competition/

The essential-only cold visit fetched five resources: shared CSS (about 19KB encoded), Christmas CSS (3.5KB), route CSS (1.7KB), the logo (13.6KB encoded) and the hero AVIF (61.3KB). No web fonts, video, external embeds or third-party requests were observed in this consent state. Earlier response headers included a CDN MISS, roughly 116ms request-to-first-byte, 6.4KB gzip HTML and cache max-age 600; that is not evidence of a major origin cold start. Clearing browser cache does not force a CDN miss.

Six additional phone checks covered direct entry and menu navigation with no saved consent, essential-only, and analytics allowed. All reached the correct page. Only the analytics-allowed state requested Google Tag Manager / Google Analytics. These checks were functional, not repeated latency benchmarks.

## Proposed fixes

1. Convert the decorative woodland JPEG from 229,772 bytes to a 79,166-byte AVIF, leaving the original available.
2. Convert all seven committee portraits to WebP, capped at 640x900, total 181,976 bytes. Keep originals. Record real intrinsic dimensions to reserve space. The displayed crops/layout are unchanged.
3. Inline CSS files up to 16KiB raw, including the small Art route styles, while leaving the large shared stylesheet as a separate cacheable asset. This removes two render-blocking requests on the Art page, at the cost of repeating the small CSS in each HTML document.

## Controlled comparison

Three samples per variant/profile/cache on local static builds with network emulation. Phone: 3Mbps, 150ms, 4x CPU. Desktop: 20Mbps, 40ms. Unlike production, the local Python server does not gzip responses, so these timings isolate the code/resource comparison and should not be presented as live speed predictions. Visible-image decode is awaited. Baseline was main 6bc19de, before the sponsor PNG change; the performance branch is rebased on 09413d2. Sponsor loading is not a claimed performance improvement.

| Route/profile | Cold LCP median before/after ms | Warm before/after ms |
|---|---:|---:|
| / mobile | 1920 / 1092 | 112 / 108 |
| /committee/ mobile | 2760 / 1428 | 152 / 100 |
| /christmas-fayre-art-competition/ mobile | 1080 / 1008 | 80 / 80 |
| / desktop | 352 / 360 | 72 / 76 |
| /committee/ desktop | 604 / 376 | 128 / 52 |
| /christmas-fayre-art-competition/ desktop | 316 / 288 | 48 / 44 |

Desktop homepage and warm loads did not show a meaningful improvement. Avoid generalising the cold-phone gain to every user.

## Verification and limits

Local phone/desktop before/after screenshots were personally inspected for Home, Committee and Art. Image quality and crops remain suitable at the displayed size; no layout change intended. Existing budget limits were not raised. Added regression caps for the woodland and total committee portraits plus route-CSS request count. Type checks, production build and content tests run locally. Full CI is required before merge.

Not tested: Nick's actual device/network/browser, geographic field distribution, actual user percentiles, forced CDN purge, every historical/private/preview URL, newsletter iframe interactions or external donation/sign-up sites. This report does not establish a definitive cause for Nick's Art Competition stall.

## Sources

- Live sitemap: https://www.thefriendsofashley.org/sitemap-index.xml and https://www.thefriendsofashley.org/sitemap-0.xml
- All route URLs are recorded verbatim in the PR measurement comment.
- Individual local comparison timings are in the PR measurement comment.

- Individual measurements: https://github.com/nickcaplan/foa-website/pull/114#issuecomment-6821039154
