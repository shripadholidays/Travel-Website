# Unverified checks and owner actions

## Owner actions (these block a clean release)

1. **Recompute tour ratings on the live database.** The code now ignores staff reviews, but stored
   ratings only change when a review changes. Until this runs, six tours still show and send
   "5.0 (1 review)" from the admin's own review:
   `cd server && npm run ratings:recompute`
2. **Remove or keep the seeded reviews (V-26).** Six reviews by "WandEazy Admin" with template text are
   shown publicly as traveller reviews. Delete them in Admin → Reviews unless they are genuine.
3. **Live settings copy (V-19).** In Admin → Homepage → promo slides, the "Partner" names are tourism
   boards. Keep them only if those partnerships are real. In Admin → About, "trusted by travelers
   worldwide" and "the best local operators on the planet" are unsupported. The new default wording is
   in `server/src/models/site-settings-defaults.json`.
4. **Decide on the two remaining limitations** in violation-register.md (V-21, V-33).
5. **Turn on automatic rebuilds (V-32).** Vercel → Project → Settings → Git → Deploy Hooks → create one for the
   production branch, then set `SITE_REBUILD_HOOK_URL=<that URL>` on the API host and restart it. The API log
   then shows "Site rebuild requested" about 2 minutes after an edit, and a new deploy appears in Vercel.

## Unverified (no access from this machine)

| Check | Why it couldn't be verified | How to verify |
|---|---|---|
| Production domain is `https://wandeazy.com` | Not set in any config; only hard-coded defaults and the `hello@wandeazy.com` contact email point to it | Set `SITE_URL` on the hosting build (Vercel env / Docker `--build-arg`) |
| `APP_NAME` on the hosting provider | Local `.env` said "WandEazy" (changed to "Wandeazy"); hosted env unknown | Check Vercel env vars: `APP_NAME`/`VITE_APP_NAME` should be `Wandeazy` or unset |
| Build-time API access on the host | The prerender needs the API during the build | Look for "prerendered 41 pages" (not "static pages only") in the deploy log |
| nginx config (Docker image) | Docker Desktop not running | `docker compose up --build`; `curl -I localhost/nope` → 404; `/about/` → 301; `/tour/<id>` → 200 |
| Real Vercel routing | Verified with a local emulator of `vercel.json`, not on Vercel | After deploy: `curl -I https://<site>/nope` → 404, `/about/` → 308, `/dashboard` → 200 |
| Rich Results Test / Schema Markup Validator | External tools; site not deployed with these changes | Test `/`, one `/tour/…`, one `/blog/…`, `/faq` |
| Indexing, coverage, sitemap acceptance | No Search Console / Bing Webmaster access | Submit `/sitemap.xml`; inspect a tour URL |
| Core Web Vitals field data (LCP/INP/CLS, p75) | No live traffic data; only bundle sizes measured | PageSpeed Insights on the deployed home and tour pages |
| CDN / WAF blocking of crawlers (incl. GPTBot, ClaudeBot, PerplexityBot, Google-Extended) | Hosting edge not accessible | robots.txt allows all; check the host's bot protection settings |
| Deploy hook on the real host | No Vercel access; tested against a mocked hook | Publish a draft tour, check the API log and Vercel deployments |
| AI answer visibility, rankings | External, not controllable by code | Post-release monitoring only |
