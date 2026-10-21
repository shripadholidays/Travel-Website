# Flights & Hotels Booking — Design Spec

**Date:** 2026-10-22 · **Branch:** `feature/flights-hotels` · **Status:** Implemented on feature/flights-hotels (2026-10-22)

## 1. Goal

Add flight and hotel booking (India + international) to WandEazy as **add-on services**. WandEazy stays a trip creation/management site; flights and hotels support tours and can also be booked standalone.

Decisions taken:

| Topic | Decision |
|---|---|
| Placement | Both: standalone `/flights` + `/hotels` pages **and** "Complete your trip" links from tour pages/booking |
| Data | Mock providers first, sandbox-ready provider switch (`FLIGHT_PROVIDER`, `HOTEL_PROVIDER`) |
| Payment | Reuse existing Stripe (test mode) flow |
| Data model | New `TravelOrder` model; existing `Booking` untouched |
| Future suppliers | Flights: TripJack (India), Duffel (international). Hotels: LiteAPI |

Out of scope: Tailwind v4 migration (project stays on Tailwind 3.4), Vercel's black/Geist visual identity (DESIGN.md used for principles only), combined single payment for tour + flight + hotel, multi-city flights, real supplier credentials.

## 2. Feature switches (admin-only)

- Stored in `SiteSettings.features = { flights: Boolean, hotels: Boolean }`, both default **false**.
- Toggled only in **Admin → Settings → Booking services** (also holds `flightMarkupPct`, `hotelMarkupPct`).
- Exposed to the client through the existing public settings endpoint (`features` only, booleans).

**When a switch is OFF the feature does not exist for the public site — no exceptions:**

| Surface | OFF behaviour |
|---|---|
| Navbar (desktop + mobile), footer | Link not rendered |
| Home search tabs / home section | Tab not rendered; both off → home identical to today |
| Routes `/flights*`, `/hotels*`, `/checkout/travel/*` | `FeatureRoute` renders the NotFound page; lazy chunk never requested |
| Tour details "Fly there / Stay nearby" box | Not rendered |
| Booking Success "Complete your trip" card | Not rendered |
| Plan-Trip fallback copy mentioning flights/hotels | Removed from fallback text |
| Traveller dashboard tabs, "My Trips" linked items | Not rendered, including past orders |
| Public API (`/flights`, `/hotels`, `/airports`, `/orders` of that kind) | `404 Not Found` via `requireFeature` |
| Code | Route chunks lazy-loaded → never downloaded |

Admin always keeps: the switches, and the **Travel Orders** page (all orders, any switch state).

Implementation units:
- Server `middleware/requireFeature.js` — `requireFeature('flights')` reads cached settings (30 s TTL, busted on settings save) and returns 404 when off.
- Client `hooks/use-feature.ts` — `useFeature('flights'): boolean` from `usePublicSettings()`; returns `false` while loading (no flash of links).
- Client `components/FeatureGate.tsx` — `<FeatureGate feature="hotels">…</FeatureGate>`; router builds feature routes only when enabled.

## 3. Server design

### 3.1 `TravelOrder` model (`server/src/models/TravelOrder.js`)

```
user            ObjectId → User, required
kind            'flight' | 'hotel', required, indexed
linkedBooking   ObjectId → Booking, optional (tour booking this belongs to)
provider        'mock' | 'duffel' | 'tripjack' | 'liteapi'
providerRef     String (supplier booking/PNR id)
offerId         String (supplier offer id used to book)
status          'pending' | 'confirmed' | 'cancelled' | 'failed', default 'pending'
offer           Mixed — normalized snapshot (flight segments / hotel+room+dates)
travellers      [{ title, firstName, lastName, dob, gender, passportNumber?, passportExpiry?, nationality? }]
contact         { email, phone }
pricing         { supplierAmount, markupPct, markupAmount, total, currency }
paymentId       ObjectId → Payment
timestamps
```

`Payment` changes: `booking` becomes optional; add `order: ObjectId → TravelOrder`; validator requires exactly one of `booking`/`order`.

### 3.2 Provider layer (`server/src/providers/`)

```
flights/index.js   → picks by FLIGHT_PROVIDER (default 'mock')
flights/mock.js    flights/duffel.js (sandbox stub, wired later)
hotels/index.js    → picks by HOTEL_PROVIDER (default 'mock')
hotels/mock.js     hotels/liteapi.js (sandbox stub)
pricing.js         applyMarkup(supplierAmount, pct) → pricing object
cache.js           in-memory TTL cache (searches 10 min)
```

Interface (identical shapes for every supplier):
- `search(params) → { offers: NormalizedOffer[], expiresAt }`
- `getOffer(id) → NormalizedOffer` (live re-price)
- `book({ offerId, travellers, contact }) → { providerRef, status }`
- `cancel(providerRef) → { status, refundAmount }`

Mock flights: deterministic results seeded from route+date (IndiGo, Air India, Akasa Air, SpiceJet, Emirates, Qatar, Singapore Airlines); domestic and international, non-stop and 1-stop. Mock hotels: Goa, Jaipur, Delhi, Mumbai, Kerala, Dubai, Bali, Bangkok, Singapore, Paris. Mock offers expire after 20 min.

Markup is applied server-side only; the client never receives `supplierAmount`. All provider prices are USD (the site's base currency) and are displayed through the existing currency switcher.

### 3.3 Routes (`/api/v1`)

| Method & path | Guard | Purpose |
|---|---|---|
| `GET /flights/airports?q=` | flights | Airport autocomplete (curated static JSON, India + major international) |
| `GET /flights/search` | flights | Search |
| `GET /flights/offers/:id` | flights | Re-priced offer |
| `GET /hotels/places?q=` | hotels | City/hotel autocomplete |
| `GET /hotels/search` | hotels | Search |
| `GET /hotels/:id` | hotels | Hotel detail + rooms |
| `POST /travel-orders` | feature of `kind`, logged in | Re-price, create pending order + Stripe PaymentIntent; returns `clientSecret`, `priceChanged` |
| `GET /travel-orders` | logged in, any feature on | Own orders, filtered to enabled kinds only |
| `POST /travel-orders/:id/confirm`, `PATCH /travel-orders/:id/cancel` | feature of kind, owner | Cancel via provider |
| `GET /admin/travel-orders`, `PATCH /admin/travel-orders/:id` | admin | All orders, any switch state |

Flow: Stripe webhook `payment_intent.succeeded` → if `Payment.order` set → `provider.book()` → order `confirmed` (or `failed` + automatic Stripe refund). Search routes use the existing `/api/` rate limiter plus a stricter 30 req/min search limiter.

## 4. UX

### 4.1 Pages

- **Navbar:** "Flights", "Hotels" after "Tours" when enabled.
- **Home:** search card under hero with tabs Tours | Flights | Hotels (only enabled tabs).
- **`/flights`:** navy hero band + search card (one-way/round-trip, From/To combobox with ⇄ swap, dates, travellers & cabin popover). Results: filter rail (stops, airlines, departure-time buckets, price slider; bottom sheet on mobile), sort tabs Cheapest/Fastest/Best, flight cards (logo, `06:10 DEL → 09:25 DXB` in Bebas, duration line with stop dots, orange price, Select). Select → side drawer: fare breakdown, baggage, refund rules, Continue. Search state lives in the URL query.
- **`/hotels`:** search (place combobox, check-in/out, rooms & guests). Results: list/map toggle (Leaflet), cards with photo, stars, amenity chips, per-night + total. **`/hotels/:id`:** Swiper gallery, room list with "Free cancellation" badges, Choose room.
- **`/checkout/travel/:kind/:offerId`:** stepper Travellers → Review → Pay (Stripe `PaymentElement`) → Confirmation with reference. Price-changed banner requires acceptance before Pay.
- **Tour links:** tour details "Fly there / Stay nearby" box and BookingPage Success "Complete your trip" card open search prefilled with destination + dates and `?linkedBooking=<id>`.
- **Dashboard:** "My Trips" groups each tour booking with its linked orders; separate Flights / Hotels tabs. Only enabled kinds render.
- **Admin:** `/admin/travel-orders` table (kind, status, provider, ref, traveller, total, date; filters; cancel/refund actions). Settings → Booking services card.

### 4.2 Visual system

Match the live site's visual language (verified against `Navbar.tsx`, `Hero.tsx`, `TourCard.tsx`, `AdminLayout.tsx`):
- Tokens: `brand-blue #0F172A`, `brand-orange #F97316`, `brand-light #F8FAFC`, `brand-dark #020617`; slate neutrals (`slate-100` borders, `slate-50` fills).
- Type: use the existing classes (`font-display` headings, `font-sans` body). Note: `index.html` never loads the Google Fonts stylesheet, so today everything renders as bold Arial; the mockups match that. Fixing font loading is out of scope (user: "works for now"). Logo = orange balloon SVG + "Wandeazy" extrabold. Eyebrow labels orange uppercase with a 40px orange rule before them. Prices navy bold, `tabular-nums`.
- Hero: Flights/Hotels reuse the Home accordion pattern — full-height photo panels, inactive panels grayscale with vertical labels, active panel with per-slide colour tint, orange eyebrow, huge bold title. Offer bar (orange→rose gradient) on top. Transparent navbar over the hero with links inside a glass pill, outlined "Log in", orange "Sign Up"; inner pages use the frosted `bg-white/90` navbar.
- Buttons: `rounded-full` pills — orange with `shadow-lg shadow-brand-orange/20`, navy, or outlined; circular arrow button (`bg-slate-50`, hover orange).
- Cards: TourCard style — white, `rounded-[2rem]`, `border-slate-100`, inner image `rounded-[1.5rem]`, white/95 pill chips, navy/90 rating chip with yellow star, orange location with pin icon.
- Admin: white sidebar, active item orange `rounded-xl` with orange shadow, `bg-slate-50` content.
- Map: existing Leaflet styling (`#aadaff` ground, rounded zoom controls). Skeleton loaders, not spinners. Mockups: https://claude.ai/artifact/Ed88vhdKrWPTJPQzoWgiPZ

### 4.3 Motion

- **GSAP** (`useGSAP`): search-card entrance timeline, home section ScrollTrigger reveal, results stagger.
- **anime.js** (new dep, lazy-loaded in feature chunks): plane along dashed route path during loading, swap-button rotation, price count-up.
- **framer-motion:** existing drawers/modals.
- All motion disabled/reduced under `prefers-reduced-motion`.

### 4.4 Accessibility (web-design-guidelines)

Labelled inputs; ARIA combobox autocomplete with full keyboard support; visible focus rings; ≥44px tap targets; `aria-live` result counts; no horizontal scroll at 360px.

## 5. Error handling

| Case | Behaviour |
|---|---|
| No results | Empty state + "try nearby dates" |
| Provider timeout (15 s) / down | "Couldn't reach airlines/hotels" + Retry |
| Offer expired | "Prices refreshed" → automatic re-search |
| Price changed at `POST /orders` | `priceChanged: true` → banner, user must accept |
| Payment failed | Order stays `pending`; retry allowed |
| Paid but `book()` failed | Stripe refund, status `failed`, visible in admin |
| Feature switched off mid-flow | API 404 → client shows NotFound |

## 6. Testing

- Server: unit tests for `pricing.js`, mock providers (shape + determinism), `requireFeature`; route tests asserting every public flight/hotel endpoint returns 404 when OFF and 200 when ON; webhook order-confirmation path.
- Client: `useFeature`/`FeatureGate` tests, nav/home/dashboard hide when OFF.
- E2E (manual, Chrome): search → select → checkout → Stripe test card `4242…` → confirmation → dashboard, for both kinds; then switch OFF and verify every surface is gone.

## 7. Environment

```
FLIGHT_PROVIDER=mock      HOTEL_PROVIDER=mock
FLIGHT_MARKUP_PCT=5       HOTEL_MARKUP_PCT=8   (defaults; admin settings override)
DUFFEL_API_KEY=           TRIPJACK_API_KEY=     LITEAPI_KEY=
```
