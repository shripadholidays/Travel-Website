# SEO, GEO & AEO audit: release certificate

1. **Application / environment:** Wandeazy (`E:\WandEazy\website`), local production build with live Turso data.
2. **Date:** 2026-10-26.
3. **Architecture:** Vite 7 + React 19 SPA with React Router 7 (client), Express 5 + libSQL (API).
   Now with build-time prerendering of public pages. Hosting: Vercel (`vercel.json`) or nginx (Docker).
4. **Routes discovered:** 41 public pages, 4 conditional or app-shell route groups, private routes, and 404 (route-inventory.md).
5. **Routes audited:** all 41 public pages, by automated checks on every page and browser checks on each page type. App-shell and private routes: indexing behaviour checked.
6. **Coverage:** 100% of public pages by automated checks. Manual browser checks cover representative pages of each template, not every page.
7. **Violations discovered:** 34 (S1 1, S2 6, S3 15, S4 8, S5 4).
8. **Fixed and verified:** 25.
9. **Remaining:** S2: V-04 (live ratings not yet recomputed) and V-26 (seeded admin reviews shown as traveller reviews). S3: V-19 (live copy), V-33 awaiting acceptance; V-32 fixed in code, active once `SITE_REBUILD_HOOK_URL` is set. S4: V-21 awaiting acceptance.
10–12. **Rounds:** see violation-register.md (Round 1 findings, Round 2 fixes with evidence, Round 3 adversarial findings V-27 to V-34).
13. **Files changed:** see the commit. Main pieces: `client/src/lib/seo.ts`, `client/scripts/prerender.ts`, `client/scripts/seo-check.ts`, `client/src/components/PageTitle.tsx`, `client/src/lib/icons.ts`, `client/vercel.json`, `client/nginx.conf`, `server/src/services/rating-service.js`.
14. **Build / types / tests:** all pass (automated-test-results.md).
15. **Sitemap, robots, canonical, structured data:** generated from live data; every indexable page self-canonical and in the sitemap; JSON-LD parses on every page and is built from the same data as the visible content.
16. **Performance / accessibility:** main JS 385 → 216 KB gzipped; LCP heroes now fetched first; one H1 per page. Field Core Web Vitals UNVERIFIED.
17. **GEO / AEO:** content readable without JavaScript; consistent "Wandeazy" brand entity; no invented profiles, ratings or partners in code; FAQ answers match the enforced 24-hour cancellation rule; robots.txt open to AI crawlers.
18. **Geographic SEO:** no physical location or service area is published, so no LocalBusiness address or location pages, and none were invented. Destination pages are travel content, not local landing pages. Not applicable beyond that.
19. **Unverified:** see unverified-checks.md (domain, hosting env, live routing, external validators, Search Console, CWV field data).
20. **Accepted exceptions:** none accepted yet. V-21 and V-33 await the owner.

## Verdict: **ARRESTED — RELEASE BLOCKED**

The code is ready, but two High findings are in the live data, not the code: tour ratings still include
the admin's own reviews until `npm run ratings:recompute` runs (V-04), and the seeded admin reviews are
still shown publicly (V-26). Once those are resolved, and V-19 copy is reviewed and V-21/V-33 are
accepted, this moves to **CONDITIONAL** pending the unverified external checks after deployment.
