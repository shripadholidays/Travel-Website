# Violation register

Audit of `E:\WandEazy\website` on 2026-10-26: client (Vite 7 + React 19 single-page app, React Router 7)
and server (Express 5, libSQL/Turso). Severity: S1 Critical · S2 High · S3 Medium · S4 Low · S5 Info.

Status: **FIXED** = changed and verified (evidence column) · **OPEN — OWNER** = the code is fixed, but live
data or a business decision is still needed · **ACCEPTED?** = a known limitation that needs the owner's
explicit acceptance · **INFO** = recorded only.

## Round 1: investigation (before any change)

What the app looked like to a crawler:

- Every URL answered with the same `index.html`: an empty `<div id="root">`, the homepage title, and
  `<link rel="canonical" href="https://wandeazy.com/">`. Titles, descriptions and canonicals were only
  set by JavaScript after load (`PageTitle.tsx`, a `useEffect`).
- `public/sitemap.xml` was hand-written, listed 10 static URLs and none of the 31 tour, destination,
  collection and article pages.
- The Organization JSON-LD in `index.html` claimed Facebook, Instagram and Twitter profiles that the
  site's own settings leave empty.
- Six tours showed, and sent to Google as Product `aggregateRating`, **5.0 from 1 review**. That one
  review was written by the account "WandEazy Admin", from the seed script's template text.

| ID | Sev | Finding | Root cause | Status |
|---|---|---|---|---|
| V-01 | S1 | No page content, title or canonical in the HTML for any URL. Crawlers that don't run JS (most AI answer engines, link previews) saw one empty page, and Google saw a homepage canonical on every URL until rendering. | Client-side rendering only | FIXED |
| V-02 | S2 | Hard-coded homepage canonical and `og:url` served for every route | `index.html` | FIXED |
| V-03 | S2 | Organization `sameAs` listed social profiles that don't exist in settings | `index.html` | FIXED |
| V-04 | S2 | Tour ratings (visible stars and Product `aggregateRating`) counted staff reviews | `rating-service.js` averaged every review | FIXED in code · OPEN — OWNER (live data) |
| V-05 | S2 | Sitemap missing all 31 detail pages; domain hard-coded | static `public/sitemap.xml` | FIXED |
| V-06 | S2 | `og:image` / `twitter:image` pointed to `/og-image.jpg`, which doesn't exist (404) | `index.html` | FIXED |
| V-07 | S3 | Canonical = `window.location.href`, so tracking and filter parameters became canonicals; internal search result pages indexable | `PageTitle.tsx` | FIXED |
| V-08 | S3 | Login, register, forgot/reset password and "tour not found" pages indexable; robots.txt didn't cover `/forgot-password`, `/reset-password/`, `/verify-email/`, `/bookings/`, `/checkout/`; supplier hotel pages indexable | per-page props, robots.txt | FIXED |
| V-09 | S3 | Draft or hidden tour shown to staff was indexable, with Product `InStock` | `TourDetails.tsx` | FIXED |
| V-10 | S3 | Soft 404s: every unknown URL answered HTTP 200 | `vercel.json` rewrite-all, nginx fallback | FIXED (Vercel emulated; nginx UNVERIFIED) |
| V-11 | S3 | Brand written "Wandeazy" (logo, titles) and "WandEazy" (config default, Flights/Hotels meta, local `.env`) | config, page copy | FIXED (hosting env UNVERIFIED) |
| V-12 | S3 | Homepage H1 was the rotating slide title ("Paradise Found"); not-found states had no H1 | `Hero.tsx`, pages | FIXED |
| V-13 | S3 | Hero / LCP images loaded `lazy` and stayed at opacity 0 until loaded | `ui/image.tsx` | FIXED |
| V-14 | S3 | Descriptions cut mid-word with `slice(0,160)`, HTML not stripped | pages | FIXED |
| V-15 | S3 | Article schema: missing author became a Person named "Wandeazy"; SVG publisher logo; no `dateModified` | `BlogDetails.tsx` | FIXED |
| V-16 | S4 | Tour pages used `og:type=article` | `TourDetails.tsx` | FIXED |
| V-17 | S4 | No BreadcrumbList, CollectionPage or ItemList data | — | FIXED |
| V-18 | S4 | Preconnects to Google Fonts, but no font is loaded (Inter, Playfair Display and Bebas Neue are declared in Tailwind and never fetched) | `index.html`, `tailwind.config.js` | preconnects removed (FIXED); fonts are a design decision (INFO) |
| V-19 | S3 | Unsupported claims: promo slides label tourism boards as "partner" ("Singapore Tourism", "Visit Dubai", "Switzerland Tourism"); About copy "trusted by travelers worldwide", "the best local operators on the planet" | defaults + live settings | defaults FIXED · OPEN — OWNER (live settings still contain them) |
| V-20 | S5 | `meta keywords` (ignored by search engines) | `index.html` | removed |
| V-21 | S4 | Tour URLs are opaque IDs (`/tour/6a4926…`), no readable slug | data model | ACCEPTED? (changing URLs needs slugs + 301 plan) |
| V-22 | S4 | No raster logo or icons (Organization logo and apple-touch-icon) | `public/` | FIXED |
| V-23 | S4 | `/about` and `/about/` both served | hosting | FIXED (Vercel `trailingSlash:false`, nginx 301, canonical) |
| V-24 | S5 | `WebSite` SearchAction: Google retired the sitelinks search box in 2024 | — | kept (valid, harmless) |
| V-25 | S5 | Production domain is not set anywhere; `https://wandeazy.com` only appears as a hard-coded value | config | made configurable (`SITE_URL`) · UNVERIFIED |
| V-26 | S2 | Seeded reviews ("Absolutely amazing experience!… exceeded all my expectations", by "WandEazy Admin") are shown publicly as traveller reviews on six tours | live database content | OPEN — OWNER |

## Round 2: remediation, with evidence

| ID | Fix | Files | Verified by |
|---|---|---|---|
| V-01 | Build-time prerender: each public page gets its own HTML with title, meta, canonical, OG/Twitter, JSON-LD and a plain, readable copy of its content (nav, H1, facts, itinerary, inclusions, FAQs, article body). React replaces it on start. | `client/scripts/prerender.ts`, `package.json` (build), `src/lib/seo.ts` | 41 pages generated; `seo:check` passes; Chrome: content replaced on mount, 1 page JSON-LD, no console errors |
| V-02, V-07 | Canonical = `SITE_URL` + path, with no query, hash or trailing slash; noindex pages get no canonical; `/tours` filters canonicalise to `/tours`; `?q=` searches are noindex | `seo.ts`, `PageTitle.tsx`, `SearchPage.tsx` | unit tests; Chrome: `?utm_source=` dropped, `?q=bali` gives noindex, `?category=Beach` gives canonical `/tours` |
| V-03 | Organization node built from settings; `sameAs` only for profiles that are set; email, phone and address only when published | `seo.ts` (`organizationJsonLd`), `index.html` | unit test; built HTML has no `sameAs` (all empty in settings) |
| V-04 | Ratings count only non-staff reviews (`STAFF_ROLES` from `config/permissions`); same rule fixed in homepage testimonials, which missed support, editor and manager | `server/src/services/rating-service.js`, `SettingsController.js` | new `tests/seo-ratings.test.js`; updated `api-coverage.test.js`; 137/137 server tests |
| V-05 | `sitemap.xml` + `robots.txt` generated at build from live data with `SITE_URL`; static copies removed | `prerender.ts`, `public/` | 41 URLs; every indexable page listed, every listed URL has a page (`seo:check`) |
| V-06, V-22 | `og-image.png` (1200×630), `logo-512.png`, `icon-192.png`, `apple-touch-icon.png` from the logo SVG; manifest icons | `client/public/`, `manifest.webmanifest`, `index.html` | served 200 from the preview server |
| V-08 | `noIndex` on auth pages, not-found states and hotel detail pages; robots.txt covers every account and checkout path | pages, `prerender.ts` | Chrome: `/no-such-page` and admin pages show `noindex, follow` |
| V-09 | Draft or hidden tours: noindex; Offer `Discontinued` when not active or past `validity` | `TourDetails.tsx`, `seo.ts` | unit tests |
| V-10, V-23 | `vercel.json`: `cleanUrls`, `trailingSlash:false`, rewrites only for app routes, so unknown paths get `404.html` with HTTP 404; nginx: same rules | `vercel.json`, `nginx.conf` | local Vercel-routing emulator: `/nope` 404, `/about/` 308, `/dashboard` 200 shell, prerendered pages 200 |
| V-11 | `config.app.name` defaults to "Wandeazy"; Flights/Hotels copy; local `.env` | `config/index.ts`, pages, `client/.env` (untracked) | titles all end "\| Wandeazy" |
| V-12 | Accurate visually-hidden H1 on Home; slide titles are H2; not-found H2s are now H1 | `Home.tsx`, `Hero.tsx`, detail pages | Chrome: one H1 per page |
| V-13 | `Image priority`: eager, `fetchpriority=high`, no fade, on Home first slide and the Tour, Destination, Collection and Article heroes | `ui/image.tsx`, pages | tour hero visible on load (screenshot) |
| V-14 | `summarize()`: strips markup, cuts at a word boundary | `seo.ts` | unit test; `seo:check` (no duplicates, length ≥ 50) |
| V-15, V-16, V-17 | `BlogPosting` with the organisation as fallback author; Product for tours; TouristDestination; CollectionPage; ItemList on lists; BreadcrumbList on detail pages; FAQPage from the same data as the visible FAQ | `seo.ts`, pages | JSON-LD parses on all 41 pages; values come from the same data as visible content |
| V-19 | Default copy rewritten to facts the site supports (24-hour free cancellation is enforced in `booking-service.js`); partner labels → destination names | `site-settings-defaults.json`, `About.tsx`, `PromotionalCarousel.tsx`, `AdminHomepage.tsx` | — |
| V-20, V-18 | Removed keywords meta and font preconnects | `index.html` | — |

Regression found and fixed during Round 2: **V-29 (S3)**, the prerender was not safe to run twice on the
same `dist` (it read its own output as the template). Now idempotent; verified with byte-identical output
on a second run.

## Round 3: adversarial re-inspection

Rebuilt the route inventory from the build (41 pages, unchanged from Round 2). Added `npm run seo:check`
and proved it fails on injected faults (duplicate title, wrong canonical, broken link). Then looked for
what the first two rounds missed:

| ID | Sev | Finding | Status |
|---|---|---|---|
| V-27 | S3 | `import * as LucideIcons` in 3 components put the whole icon library in the main bundle (1,325 KB, 385 KB gzipped) | FIXED: curated icon map `src/lib/icons.ts`, shared by the admin pickers; public pages lazy-loaded except Home. Main chunk is now 678 KB (216 KB gzipped) |
| V-28 | S3 | Tour title template and prerender would crash on a tour with no duration or location | FIXED: `tourTitle()` with guards + unit test |
| V-30 | S4 | `npm run build` ran `tsc` against a root tsconfig with `files: []`, so it type-checked nothing | FIXED: `tsc -p tsconfig.app.json` (now also checks `scripts/`) |
| V-31 | S4 | Titles repeated the brand ("About Wandeazy \| Wandeazy") | FIXED |
| V-32 | S3 | New tours or articles published after a build are not prerendered or in the sitemap until the next build (the app shell still serves them, and Google can render them) | FIXED IN CODE (needs hook URL): the API calls `SITE_REBUILD_HOOK_URL` after any successful change to tours, articles, destinations, collections, reviews or settings, grouped (2 min quiet, 15 min max). `server/tests/site-rebuild.test.js`, 7 tests |
| V-33 | S3 | Docker builds usually can't reach the API, so they prerender static pages only | ACCEPTED? Pass `PRERENDER_API_URL`; set `PRERENDER_REQUIRE_API=true` to fail the build instead |
| V-34 | S5 | Flights/Hotels flags went from on to off in the shared Turso database during the audit (not caused by the audit: tests use in-memory databases) | INFO: prerender follows the live setting |

Rechecked in Round 3: every S1/S2 item above against the built HTML and in Chrome (desktop and 390 px
wide). Edge data (missing duration, location, overview, author, `</script>` in content) is covered by
unit tests.

## Counts

Discovered 34 (S1 1 · S2 6 · S3 15 · S4 8 · S5 4, counting V-29 found in Round 2).
Fixed and verified: 25. Open for the owner: 3 (V-04 and V-19, fixed in code, live data pending; V-26).
Need explicit acceptance: 2 (V-21, V-33). V-32 needs only the hook URL set. Info only: 3 (V-24, V-25, V-34).
Regressions introduced and fixed: 1 (V-29). Reopened: 0.
