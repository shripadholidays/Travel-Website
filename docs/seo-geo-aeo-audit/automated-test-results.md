# Automated test results (2026-10-26, final run)

| Command | Result |
|---|---|
| `client: npm run build` (`tsc -p tsconfig.app.json` → `vite build` → prerender) | pass; 41 pages prerendered from the local API (Turso data); main chunk 677.7 KB / 216.4 KB gzip (was 1,325 KB / 385.5 KB) |
| `client: npm run seo:check` | pass: 41 pages, 41 indexable, 41 in sitemap, no problems. Fault injection (duplicate title, wrong canonical, broken link) correctly failed with 3 problems |
| `client: npx vitest run` | 6 files, 32 tests pass (10 new + 1 more in `src/lib/seo.test.ts`) |
| `server: npm test` | 16 suites, 144 tests pass (new `tests/site-rebuild.test.js`) (new `tests/seo-ratings.test.js`; `api-coverage.test.js` updated for the staff-review rule) |
| Prerender idempotency | second run on the same `dist` gives byte-identical output |
| `SITE_URL=https://staging.example.test` prerender | canonical, sitemap and robots use the override |

## Routing (local emulator of `vercel.json`, serving `dist`)

`/`, `/tours`, `/tour/<id>`, `/destinations/japan`, `/collections/beach-getaways`, `/blog/solo-travel-guide`,
`/faq` → 200 with their own title · `/tour/unknownid`, `/login`, `/dashboard`, `/admin/tours`,
`/checkout/…`, `/reset-password/abc` → 200 app shell · `/nope`, `/random/deep/path` → **404** ·
`/about/`, `/about.html` → 308 to `/about` · `/spa` → `X-Robots-Tag: noindex`.

## Browser (Chrome, desktop and 390×844)

After the app starts: the prerendered content and its JSON-LD are replaced, with exactly one page JSON-LD
and one site JSON-LD. Client-side navigation updates title, canonical and robots on `/faq`,
`/destinations`, a destination page, `/tours?q=bali` (noindex, no canonical), `/tours?category=Beach`
(canonical `/tours`), admin (noindex) and a not-found page (noindex). One H1 per page. No horizontal
scroll at 390 px. Every admin-chosen icon resolves. No console errors.
