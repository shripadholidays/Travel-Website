# Route inventory

Generated from the production build (`client/dist`) on 2026-10-26 with the live API data.
Origin used: `https://wandeazy.com` (config default — **unverified**, see unverified-checks.md).

## Prerendered, indexable, listed in sitemap.xml (41)

| Path | Title | Page structured data |
|---|---|---|
| `/` | Curated Tours & Holiday Packages \| Wandeazy | WebSite |
| `/about` | About Us \| Wandeazy | — |
| `/blog/must-try-foods-around-world` | 10 Foods You Must Try Around the World \| Wandeazy | BlogPosting, BreadcrumbList |
| `/blog/solo-travel-guide` | Solo Travel: A Complete Guide for First-Timers \| Wandeazy | BlogPosting, BreadcrumbList |
| `/blog/travel-world-on-budget` | How to Travel the World on a Budget \| Wandeazy | BlogPosting, BreadcrumbList |
| `/blog/ultimate-packing-guide` | The Ultimate Packing Guide for Any Trip \| Wandeazy | BlogPosting, BreadcrumbList |
| `/blog` | Travel Magazine: Guides & Tips \| Wandeazy | ItemList |
| `/collections/adventure-trekking` | Adventure & Trekking Tours \| Wandeazy | CollectionPage, BreadcrumbList |
| `/collections/beach-getaways` | Beach Getaways Tours \| Wandeazy | CollectionPage, BreadcrumbList |
| `/collections/cultural-experiences` | Cultural Experiences Tours \| Wandeazy | CollectionPage, BreadcrumbList |
| `/collections/luxury-escapes` | Luxury Escapes Tours \| Wandeazy | CollectionPage, BreadcrumbList |
| `/collections/romantic-honeymoons` | Romantic Honeymoons Tours \| Wandeazy | CollectionPage, BreadcrumbList |
| `/collections` | Tour Collections by Travel Style \| Wandeazy | ItemList |
| `/contact` | Contact Us \| Wandeazy | — |
| `/destinations/france` | France Tours & Travel Guide \| Wandeazy | TouristDestination, BreadcrumbList |
| `/destinations/iceland` | Iceland Tours & Travel Guide \| Wandeazy | TouristDestination, BreadcrumbList |
| `/destinations/india` | India Tours & Travel Guide \| Wandeazy | TouristDestination, BreadcrumbList |
| `/destinations/indonesia` | Indonesia Tours & Travel Guide \| Wandeazy | TouristDestination, BreadcrumbList |
| `/destinations/italy` | Italy Tours & Travel Guide \| Wandeazy | TouristDestination, BreadcrumbList |
| `/destinations/japan` | Japan Tours & Travel Guide \| Wandeazy | TouristDestination, BreadcrumbList |
| `/destinations/kenya` | Kenya Tours & Travel Guide \| Wandeazy | TouristDestination, BreadcrumbList |
| `/destinations/maldives` | Maldives Tours & Travel Guide \| Wandeazy | TouristDestination, BreadcrumbList |
| `/destinations/switzerland` | Switzerland Tours & Travel Guide \| Wandeazy | TouristDestination, BreadcrumbList |
| `/destinations/uae` | UAE Tours & Travel Guide \| Wandeazy | TouristDestination, BreadcrumbList |
| `/destinations` | Travel Destinations Worldwide \| Wandeazy | ItemList |
| `/faq` | Frequently Asked Questions \| Wandeazy | FAQPage |
| `/privacy` | Privacy Policy \| Wandeazy | — |
| `/terms` | Terms of Service \| Wandeazy | — |
| `/tour/6a4926ca4997e7a7805a54fd` | Majestic Himalayan Trek: 7-Day Nepal Tour \| Wandeazy | Product, BreadcrumbList |
| `/tour/6a4926ca4997e7a7805a550c` | Bali Paradise Escape: 5-Day Bali Tour \| Wandeazy | Product, BreadcrumbList |
| `/tour/6a4926ca4997e7a7805a5518` | Romantic Paris Getaway: 4-Day Paris Tour \| Wandeazy | Product, BreadcrumbList |
| `/tour/6a4926ca4997e7a7805a5523` | Dubai Luxury Experience: 5-Day Dubai Tour \| Wandeazy | Product, BreadcrumbList |
| `/tour/6a4926ca4997e7a7805a5530` | Maldives Island Retreat: 6-Day Maldives Tour \| Wandeazy | Product, BreadcrumbList |
| `/tour/6a4926ca4997e7a7805a553f` | Discover Tokyo: 6-Day Tokyo Tour \| Wandeazy | Product, BreadcrumbList |
| `/tour/6a4926ca4997e7a7805a554c` | African Safari Adventure: 7-Day Masai Mara Tour \| Wandeazy | Product, BreadcrumbList |
| `/tour/6a4926ca4997e7a7805a555b` | Swiss Alps Explorer: 6-Day Switzerland Tour \| Wandeazy | Product, BreadcrumbList |
| `/tour/6a4926ca4997e7a7805a5568` | Ancient Rome & Amalfi Coast: 7-Day Rome Tour \| Wandeazy | Product, BreadcrumbList |
| `/tour/6a4926ca4997e7a7805a5576` | New York City Break: 4-Day New York Tour \| Wandeazy | Product, BreadcrumbList |
| `/tour/6a4926ca4997e7a7805a5581` | Iceland Northern Lights: 5-Day Reykjavik Tour \| Wandeazy | Product, BreadcrumbList |
| `/tour/6a4926ca4997e7a7805a558e` | Thailand Island Hopping: 7-Day Phuket Tour \| Wandeazy | Product, BreadcrumbList |
| `/tours` | All Tours & Holiday Packages \| Wandeazy | ItemList |

Every page above also carries the site-wide `TravelAgency` node. All 41 pass `npm run seo:check`:
one title, unique title and description, self-canonical, listed in the sitemap, one H1, readable
content without JavaScript, JSON-LD parses, no internal link that 404s.

## Served by the app shell, or excluded

| Route | What it is | Indexing | Hosting |
|---|---|---|---|
| `/tour/:id`, `/destinations/:slug`, `/collections/:slug`, `/blog/:slug` added after the build | App shell; the page sets its tags once loaded | index (canonical set in browser) | SPA rewrite; not in sitemap until next build |
| `/tours?q=…` | Search results | noindex, follow; no canonical | — |
| `/tours?category=…` and other filters | Filtered list | canonical → `/tours` | — |
| `/flights`, `/hotels` | Only when switched on in Admin (off at audit time → 404 page) | index when on | prerendered + in sitemap only when on |
| `/hotels/:id` | Live supplier rates | noindex | SPA rewrite |
| `/login`, `/register`, `/forgot-password`, `/reset-password/:t`, `/verify-email/:t` | Auth | noindex + robots Disallow | SPA rewrite |
| `/dashboard`, `/book`, `/bookings/:id`, `/checkout/travel/…`, `/write-article` | Signed-in | noindex + robots Disallow | SPA rewrite |
| `/admin`, `/admin/*` | Staff | noindex + robots Disallow | SPA rewrite |
| any other path | Not found | HTTP 404 + noindex | `404.html` |
