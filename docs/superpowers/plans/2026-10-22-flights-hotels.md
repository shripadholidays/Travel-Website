# Flights & Hotels Booking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add admin-switchable Flights and Hotels booking (mock provider, Stripe test checkout) to WandEazy without affecting the existing tour booking flow.

**Architecture:** Server: a provider layer (`server/src/providers`) behind controllers guarded by a `requireFeature` middleware that reads `SiteSettings.features` (30 s cache). Orders live in a new `TravelOrder` model; `Payment` gains an optional `order` ref and the existing Stripe webhook finalizes orders. Client: a `useFeature` hook + `FeatureGate`/`FeatureRoute` hide every public surface when a switch is off; new lazy-loaded pages reuse the Home accordion hero, TourCard styling and the existing Stripe `PaymentElement` form.

**Tech Stack:** Express 5 + Mongoose 8 (CommonJS), Jest + Supertest (new, local Mongo test DB); React 19 + Vite 7 + Tailwind 3 + TanStack Query, Vitest + Testing Library (new), GSAP + `@gsap/react`, anime.js 3, framer-motion, react-leaflet, Stripe.

**Spec:** `docs/superpowers/specs/2026-10-22-flights-hotels-design.md` · **Mockups:** https://claude.ai/artifact/Ed88vhdKrWPTJPQzoWgiPZ

**Conventions (from the codebase):**
- Responses via `ResponseHandler.success(res, data, msg)` / `.fail(res, code, msg)` → client `api.get<T>()` returns `json.data`.
- Auth: `isLoggedIn` (JWT cookie `config.auth.cookieName`, payload `{ email }`) + `authorize(...roles)`.
- Money: all provider prices are **USD** (site base currency); the client displays with `useCurrency().formatPrice(usd)`; Stripe charges `pricing.currency`.
- "Off" 404 body must equal the global 404: `ResponseHandler.fail(res, 404, "Sorry, can't find that route!")`.

---

## File map

**Server — create**
| File | Responsibility |
|---|---|
| `src/app.js` | Express app (moved out of `server.js`) so tests can import it |
| `src/services/travel-config.js` | Cached `{ features, markup }` from SiteSettings; `clearTravelConfigCache()` |
| `src/middlewares/require-feature.js` | `requireFeature(nameOrResolver)`, `requireAnyFeature()` |
| `src/providers/errors.js` | `ProviderError(code, status, message)`, `withTimeout()` |
| `src/providers/util.js` | `hashString`, `seededRandom`, `encodeOfferId`, `decodeOfferId`, `round2`, `TtlCache` |
| `src/providers/pricing.js` | `applyMarkup()` |
| `src/providers/data/airports.json` | Curated airports (India + major international) |
| `src/providers/data/hotels.json` | Mock hotel catalogue |
| `src/providers/flights/{index,mock,duffel}.js` | Flight provider selection + mock + sandbox stub |
| `src/providers/hotels/{index,mock,liteapi}.js` | Hotel provider selection + mock + sandbox stub |
| `src/models/TravelOrder.js` | Order model + `toPublic()` |
| `src/services/travel-order-service.js` | `finalizeOrder`, `refundPayment` |
| `src/controllers/{Flight,Hotel,TravelOrder}Controller.js` | HTTP handlers |
| `src/routes/{flight,hotel,travel-order}-route.js` | Routers |
| `jest.config.js`, `tests/setup-env.js`, `tests/helpers.js`, `tests/*.test.js` | Tests |

**Server — modify:** `server.js`, `src/models/SiteSettings.js` (features, travelMarkup), `src/models/Payment.js` (optional booking, `order`), `src/controllers/SettingsController.js` (public/updatable fields, cache bust), `src/controllers/PaymentController.js` (webhook → orders), `src/routes/admin-route.js`, `src/middlewares/rate-limit.js` + `src/config/index.js` (search limiter), `example.env`, `package.json`.

**Client — create**
| File | Responsibility |
|---|---|
| `src/types/travel.ts` | Travel types |
| `src/hooks/use-feature.ts` | `useFeature`, `useFeatureState`, `useEnabledFeatures` |
| `src/hooks/use-travel.ts` | Query/mutation hooks |
| `src/lib/feature-links.ts` | `withFeatureLinks`, `addonsCopy` |
| `src/components/FeatureGate.tsx` | `FeatureGate`, `FeatureRoute` |
| `src/components/payment/StripePaymentForm.tsx` | Extracted from BookingPage |
| `src/components/travel/*` | AccordionHero, Eyebrow, FlightSearchForm, FlightCard, FlightFilters, FlightDetailsDialog, HotelSearchForm, HotelCard, HotelMap, PlaneLoader, AnimatedPrice, TravelOrderCard, TripAddons, TravellerFields |
| `src/components/home/TravelSearchTabs.tsx` | Home search card |
| `src/pages/{Flights,Hotels,HotelDetails,TravelCheckout}.tsx` | Pages |
| `src/pages/admin/AdminTravelOrders.tsx` | Admin orders |
| `src/test/setup.ts`, `*.test.ts(x)` | Tests |

**Client — modify:** `App.tsx`, `hooks/use-settings.ts`, `components/Navbar.tsx`, `components/Footer.tsx`, `components/home/PlanTrip.tsx`, `pages/Home.tsx`, `pages/TourDetails.tsx`, `pages/BookingPage.tsx`, `pages/Dashboard.tsx`, `layouts/AdminLayout.tsx`, `pages/admin/AdminSettings.tsx`, `vite.config.ts`, `package.json`.

---

## Phase A — Server foundation

### Task A1: Split app from server, add Jest

**Files:** Create `server/src/app.js`, `server/jest.config.js`, `server/tests/setup-env.js`, `server/tests/helpers.js`, `server/tests/health.test.js`; Modify `server/server.js`, `server/package.json`.

- [x] Install: `cd server && npm i -D jest@29.7.0 supertest@7.0.0`
- [x] `package.json` scripts: `"test": "jest --runInBand"`.
- [x] Move everything in `server.js` from line 1 through the global error handler (just before `// --- Start server after DB connection ---`) into `src/app.js`, fix relative requires (`./src/...` → `./...`), and end with `module.exports = app;`. `server.js` becomes:

```js
require('dotenv').config();
const mongoose = require('mongoose');
const config = require('./src/config');
const connectDB = require('./src/database/connect-db');
const logger = require('./src/utils/logger');
const app = require('./src/app');

const { port: PORT } = config.app;
const { uri: DB_URI } = config.db;

let server;
(async () => { /* unchanged connect + listen block */ })();
/* unchanged gracefulShutdown + signal handlers */
```

- [x] `jest.config.js`: `{ testEnvironment: 'node', setupFiles: ['<rootDir>/tests/setup-env.js'], testTimeout: 20000 }`
- [x] `tests/setup-env.js` sets (before dotenv loads, so `.env` cannot override): `NODE_ENV=test`, `DB_URI=process.env.TEST_DB_URI || 'mongodb://127.0.0.1:27017/wandeazy_test'`, `STRIPE_SECRET_KEY=''`, `STRIPE_WEBHOOK_SECRET=''`, `RATE_LIMIT_API_MAX=100000`, `RATE_LIMIT_SEARCH_MAX=100000`, `FLIGHT_PROVIDER=mock`, `HOTEL_PROVIDER=mock`, `SESSION_SECRET=test`.
- [x] `tests/helpers.js`: `connect()`, `disconnect()`, `reset()` (deleteMany on every collection + `clearTravelConfigCache()`), `createUser(role='user')`, `cookieFor(user)` → `` `${config.auth.cookieName}=${jwt.sign({ email }, config.auth.jwtSecret)}` ``, `setFeatures({ flights, hotels }, markup)` (upsert SiteSettings + clear cache).
- [x] `tests/health.test.js`: `GET /` returns 200 `status: 'success'`.
- [x] Run `npm test` → PASS. Run `npm run dev` briefly → server still starts. Commit `chore(server): split app from server and add jest`.

### Task A2: Settings fields + travel config cache + requireFeature

**Files:** Modify `SiteSettings.js`, `SettingsController.js`; Create `services/travel-config.js`, `middlewares/require-feature.js`; Test `tests/require-feature.test.js`.

- [x] SiteSettings schema adds:
```js
features: { flights: { type: Boolean, default: false }, hotels: { type: Boolean, default: false } },
travelMarkup: { flightPct: { type: Number, default: 5, min: 0, max: 50 }, hotelPct: { type: Number, default: 8, min: 0, max: 50 } },
```
- [x] `PUBLIC_FIELDS` += `'features'` (markup stays private). `UPDATABLE` += `'features', 'travelMarkup'`. After `settings.save()` in `updateSettings` call `clearTravelConfigCache()`.
- [x] `travel-config.js`: `getTravelConfig()` (30 s TTL, `SiteSettings.findOne().lean()`, defaults off, markup falls back to `FLIGHT_MARKUP_PCT`/`HOTEL_MARKUP_PCT` env then 5/8), `getFeatures()`, `isKindEnabled(kind)` (`flight→flights`, `hotel→hotels`), `getMarkupPct(kind)`, `clearTravelConfigCache()`.
- [x] `require-feature.js`: `requireFeature(nameOrResolver)` resolves `'flight'|'hotel'|'flights'|'hotels'` (or a `(req) => kind` function) and returns the global-404 body when off; `requireAnyFeature()` 404s when both off.
- [x] Tests: off → 404 with global message; on → next(); resolver from `req.body.kind`; public `/api/v1/settings` exposes `features` but not `travelMarkup`; PUT `/admin/settings` with `{ features: { flights: true } }` is reflected immediately (cache busted).
- [x] `npm test` PASS → commit `feat(server): feature switches for flights and hotels`.

## Phase B — Provider layer

### Task B1: Utilities, errors, pricing

- [x] `providers/util.js`: `hashString(str)` (FNV-1a 32-bit), `seededRandom(seed)` (mulberry32), `round2`, `encodeOfferId(obj)` / `decodeOfferId(id)` (base64url JSON; decode throws `ProviderError('INVALID_OFFER', 400)`), `class TtlCache { constructor(ttlMs); get(key); set(key, value) }`.
- [x] `providers/errors.js`: `class ProviderError extends Error { constructor(code, status, message) }`, `withTimeout(promise, ms = 15000)` → rejects `ProviderError('PROVIDER_TIMEOUT', 504, 'The supplier took too long to respond')`.
- [x] `providers/pricing.js`: `applyMarkup(supplierAmount, pct, currency='USD')` → `{ supplierAmount, markupPct, markupAmount: round2(s*pct/100), total: round2(s + markupAmount), currency }`.
- [x] Tests `tests/providers-util.test.js`: same seed → same sequence; encode/decode round-trip; bad id throws INVALID_OFFER; `applyMarkup(100, 5)` → total 105; `applyMarkup(19.99, 8).total === 21.59`; withTimeout rejects with PROVIDER_TIMEOUT.
- [x] Commit `feat(server): provider utilities and pricing`.

### Task B2: Mock flight provider

- [x] `data/airports.json`: `[{ code, city, name, country, lat, lon }]` — DEL BOM BLR MAA CCU HYD GOI COK AMD PNQ JAI LKO ATQ IXC GAU SXR TRV IXB VNS IXZ + DXB AUH DOH SIN BKK KUL LHR CDG FRA AMS JFK SFO SYD NRT HKG IST CMB KTM MLE DPS ZRH.
- [x] `flights/mock.js` exports `{ name: 'mock', searchAirports(q), search(params), getOffer(id), book(input), cancel(ref) }`:
  - `search({ from, to, departDate, returnDate?, adults=1, cabin='economy' })` validates codes (`UNKNOWN_AIRPORT` 400), `from !== to` (`SAME_AIRPORT` 400), dates `YYYY-MM-DD` (`INVALID_DATE` 400), adults 1–9.
  - Deterministic rng from `hashString(from|to|departDate|returnDate|cabin|adults)`; 8–12 offers; airlines: domestic `6E IndiGo, AI Air India, QP Akasa Air, SG SpiceJet`; international adds `EK Emirates (DXB), QR Qatar Airways (DOH), SQ Singapore Airlines (SIN)` (hubs used as `via`).
  - Haversine distance → duration `distance/780*60 + 35` min, +90–210 per stop; departure on 5-minute grid; `departTime`, `arriveTime` (`HH:mm`), `arriveDayOffset`.
  - Price/adult USD: `(35 + km * (domestic ? 0.065 : 0.055)) * cabinMult(1|1.65|3.1) * (stops ? 0.86 : 1) * jitter(0.88–1.25)`; round trip adds a mirrored inbound slice and ×1.9.
  - Offer: `{ id, kind:'flight', provider:'mock', airline, cabin, baggageKg, refundable, fareRules, adults, international, slices:[{ from, to, departDate, departTime, arriveTime, arriveDayOffset, durationMinutes, stops, via, flightNumber }], supplierAmount, supplierPerAdult, currency:'USD', expiresAt }`; id encodes `{ k:'f', p:params, i:index, exp: now+20min }`.
  - `getOffer(id)`: decode, expired → `OFFER_EXPIRED` 410, regenerate and return index `i` with the same id/expiry.
  - `book()`: `MOCK_BOOK_FAIL=true` → `ProviderError('BOOKING_FAILED', 502)`; else `{ providerRef: 'WZ' + 6 base36 chars upper, status: 'confirmed' }`. `cancel()` → `{ status: 'cancelled' }`.
- [x] `flights/duffel.js`: same interface, every method throws `ProviderError('PROVIDER_NOT_CONFIGURED', 501)` unless `DUFFEL_API_KEY` set (sandbox wiring is a later task). `flights/index.js` picks by `FLIGHT_PROVIDER` (default mock).
- [x] Tests: deterministic results for same params; offers sorted unspecified but count 8–12; DEL→DXB `international: true`; DEL→BOM domestic airlines only; getOffer returns identical price; expired id → 410; unknown airport → 400; round trip has 2 slices.
- [x] Commit `feat(server): mock flight provider`.

### Task B3: Mock hotel provider

- [x] `data/hotels.json`: ~30 hotels in Goa, Jaipur, Delhi, Mumbai, Udaipur, Kochi, Manali, Dubai, Bali, Bangkok, Singapore, Paris: `{ id, name, city, country, area, stars, rating, lat, lng, amenities, tag, basePrice, description, images }` (images: a small pool of Unsplash hotel photos).
- [x] `hotels/mock.js`: `searchPlaces(q)`, `search({ place, checkIn, checkOut, rooms=1, adults=2 })` (nights ≥ 1 else `INVALID_DATES` 400; unknown place → empty list), `getHotel(hotelId, params)` (`HOTEL_NOT_FOUND` 404; returns details + 3 room offers: Deluxe ×1.0 refundable, Premier ×1.35 refundable, Suite ×2.1 non-refundable), `getOffer(id)`, `book`, `cancel` (same semantics as flights). Offer: `{ id, kind:'hotel', provider:'mock', hotel:summary, checkIn, checkOut, nights, rooms, adults, roomCode, roomName, refundable, cancellationPolicy, supplierAmount, supplierPerNight, currency:'USD', expiresAt }`. Search returns the cheapest (Deluxe) offer per hotel.
- [x] `hotels/liteapi.js` stub + `hotels/index.js` by `HOTEL_PROVIDER`.
- [x] Tests: Goa returns only Goa hotels; nights computed; getHotel returns 3 rooms; Suite non-refundable; getOffer stable; invalid dates → 400.
- [x] Commit `feat(server): mock hotel provider`.

## Phase C — Public search API

### Task C1: Flight & hotel routes

- [x] `config.rateLimit.search = { windowMs: RATE_LIMIT_SEARCH_WINDOW_MS || 60_000, max: RATE_LIMIT_SEARCH_MAX || 30 }`; `searchLimiter` exported from `rate-limit.js`.
- [x] `FlightController`: `airports` (q ≥ 1 char, max 10), `search` (TtlCache 10 min keyed by params; maps offers with `toPublicFlight(offer, pct)` → removes `supplier*`, adds `price` (markup total) and `pricePerAdult`), `getOffer`. Errors → `sendProviderError(res, err)` (ProviderError → its status + message; else 500).
- [x] `HotelController`: `places`, `search`, `getHotel` (roomOffers marked up), using `toPublicHotel`.
- [x] Routes: `/api/v1/flights` → `router.use(requireFeature('flights'))`; `GET /airports`, `GET /search` (+searchLimiter), `GET /offers/:id`. `/api/v1/hotels` → `requireFeature('hotels')`; `GET /places`, `GET /search` (+searchLimiter), `GET /:id`. Mount in `app.js`.
- [x] Tests `tests/search-api.test.js`: every endpoint 404 (global body) when off; 200 when on; `supplierAmount` never present in any response; price = supplier × (1 + pct).
- [x] Commit `feat(server): flight and hotel search API behind switches`.

## Phase D — Orders & payments

### Task D1: Models

- [x] `TravelOrder` schema per spec §3.1 plus `offerId`, `failureReason`; indexes `{ user:1, createdAt:-1 }`, `{ kind:1, status:1 }`; method `toPublic()` returns the object without `pricing.supplierAmount/markupPct/markupAmount`, `provider`, `failureReason`.
- [x] `Payment`: `booking.required: false`; add `order: { type: ObjectId, ref: 'TravelOrder' }`; `pre('validate')` → error unless exactly one of booking/order.
- [x] Tests: payment with neither/both fails validation; `toPublic` hides supplier fields.
- [x] Commit `feat(server): TravelOrder model and payment order ref`.

### Task D2: Order service, controller, routes, webhook

- [x] `travel-order-service.js`: `getProvider(kind)`, `finalizeOrder(order, { paymentIntentId } = {})` (no-op unless pending; book → confirmed + providerRef; failure → failed + failureReason + `refundPayment`), `refundPayment(order)` (Stripe refund when key + completed payment; marks Payment `refunded`).
- [x] `TravelOrderController`:
  - `createOrder` — validates `kind`, `offerId`, `travellers[]` (title, firstName, lastName; passport fields when `offer.international`), `contact.email`; re-prices via `getOffer`; if `quotedTotal` differs by > 0.009 and not `acceptPriceChange` → `success({ priceChanged: true, newTotal })` (no order). Optional `linkedBooking` must belong to user (400 otherwise). Creates pending order; Stripe configured → PaymentIntent (metadata `travelOrderId`) + Payment, returns `{ order, clientSecret }`; otherwise `finalizeOrder` immediately and returns `{ order }`.
  - `confirmOrder` — owner only, kind enabled (else 404); pending + Stripe → retrieve PaymentIntent; `succeeded` → payment completed + finalize; else 400 `Payment not completed`. Returns `{ order }`.
  - `getMyOrders` — `kind ∈ enabled kinds`, populate `linkedBooking` (`travelDate`, `tour` title/location), `toPublic`.
  - `cancelOrder` — owner, kind enabled, status pending|confirmed, `offer.refundable === false && confirmed` → 400; provider.cancel when confirmed; `refundPayment`; status cancelled.
  - `adminList` (`?kind&status`, populate user, limit 200, full docs), `adminUpdate` (`status` ∈ enum; cancelled from confirmed → provider.cancel + refund).
- [x] Routes `/api/v1/travel-orders`: `isLoggedIn, authorize('user','moderator','admin')`; `POST /` (`requireFeature(req => req.body.kind)`), `GET /` (`requireAnyFeature()`), `POST /:id/confirm`, `PATCH /:id/cancel`. Admin router: `GET /travel-orders`, `PATCH /travel-orders/:id`.
- [x] Webhook: `payment_intent.succeeded` → `if (payment.booking) {…existing…} else if (payment.order) finalizeOrder(order, { paymentIntentId })`.
- [x] Tests `tests/travel-orders.test.js`: create without Stripe → confirmed with providerRef; `supplierAmount` absent; quotedTotal mismatch → priceChanged, no order saved; with acceptPriceChange → created; `MOCK_BOOK_FAIL=true` → failed; GET lists only enabled kinds; both off → 404; hotel switched off → POST kind hotel 404 and cancel of an existing hotel order 404; admin sees orders even when switches off; non-refundable confirmed cancel → 400; another user's order → 404; linkedBooking of another user → 400.
- [x] Commit `feat(server): travel orders, payments and admin endpoints`.

## Phase E — Client foundation

### Task E1: Vitest, types, settings types, feature hooks, links helper

- [x] `cd client && npm i -D vitest@3.2.4 @testing-library/react@16.3.0 @testing-library/jest-dom@6.6.3 jsdom@26.1.0` and `npm i animejs@3.2.2 @gsap/react@2.1.2 && npm i -D @types/animejs@3.1.13`; script `"test": "vitest run"`; `vite.config.ts` adds `test: { environment: 'jsdom', setupFiles: './src/test/setup.ts', globals: true }` (with `/// <reference types="vitest/config" />`).
- [x] `use-settings.ts`: `SiteSettings` gains `features: { flights: boolean; hotels: boolean }`, `travelMarkup: { flightPct: number; hotelPct: number }`; `PublicSettings = Omit<SiteSettings, '_id' | 'travelMarkup'>`.
- [x] `types/travel.ts` mirrors the public server shapes (FlightOffer, FlightSlice, HotelSummary, HotelOffer, HotelDetails, Airport, Traveller, TravelOrder, AdminTravelOrder, Cabin).
- [x] `use-feature.ts`: `useFeatureState(f) → { enabled, loading }`, `useFeature(f) → boolean` (false while loading), `useEnabledFeatures() → { flights, hotels, any }`.
- [x] `lib/feature-links.ts`: `withFeatureLinks(links, features)` inserts `{label:'Flights',path:'/flights'}` / `{label:'Hotels',path:'/hotels'}` right after the `/tours` item (or append), skipping existing paths and removing them when disabled (admin-entered nav links to `/flights` vanish when off); `addonsCopy(features)` → `"Hotels, flights & activities" | "Flights & activities" | "Hotels & activities" | "Activities & experiences"`; `stripTravelMentions(text, features)` replaces descriptions mentioning hotels/flights with `addonsCopy`.
- [x] `components/FeatureGate.tsx`: `FeatureGate({ feature | any, children, fallback=null })`; `FeatureRoute({ feature, children })` → spinner while loading, `<NotFound/>` when off.
- [x] Tests: `feature-links.test.ts` (insert order, removal when off, no duplicates, copy variants), `FeatureGate.test.tsx` (mocks `usePublicSettings`; off renders nothing / NotFound; on renders children).
- [x] Commit `feat(client): feature switch hooks and gates`.

### Task E2: Travel hooks + Stripe form extraction

- [x] `use-travel.ts`: `useAirports(q)`, `usePlaces(q)`, `useFlightSearch(params|null)`, `useFlightOffer(id)`, `useHotelSearch(params|null)`, `useHotel(id, params)`, `useCreateTravelOrder()`, `useConfirmTravelOrder()`, `useMyTravelOrders(enabled)`, `useCancelTravelOrder()`, `useAdminTravelOrders(filters)`, `useUpdateAdminTravelOrder()`; search queries `staleTime: 5 min`, `retry: false` on 4xx.
- [x] Move `stripePromise`, `stripeAppearance`, `StripePaymentForm` from `BookingPage.tsx` into `components/payment/StripePaymentForm.tsx` (exported, unchanged behaviour, optional `submitLabel`); BookingPage imports them.
- [x] `npm run build` passes → commit `feat(client): travel data hooks; extract Stripe form`.

## Phase F — Shared travel UI (matches mockups / live theme)

### Task F1: Building blocks
- [x] `AccordionHero` (panels prop; framer-motion `layout` like Home Hero; inactive grayscale + vertical label; active tint + orange eyebrow + huge bold title + children slot; mobile shows active only), `Eyebrow` (orange 40px rule + uppercase), `PlaneLoader` (anime.js: plane SVG follows dashed path, loops; static under reduced motion), `AnimatedPrice` (anime.js count-up into `formatPrice`), `useStaggerIn(ref, deps)` GSAP helper (`useGSAP`, `.travel-card` from `{y:24, autoAlpha:0}` stagger .06; skip on reduced motion).
- [x] Commit `feat(client): travel UI building blocks`.

### Task F2: Flights page
- [x] `FlightSearchForm` (round/one-way pills, airport comboboxes with keyboard support + ⇄ swap button rotating via anime.js, dates, adults/cabin selects, orange pill submit; `compact` variant for Home; resolves `toQuery` into an airport), `FlightFilters` (stops, departure buckets, airlines, max price; bottom sheet on mobile), `FlightCard` (TourCard-style card: airline badge, times, dashed route with plane, stops colour, price, Select), `FlightDetailsDialog` (slices, baggage, fare rules, price breakdown, Continue → `/checkout/travel/flight/:offerId`).
- [x] `pages/Flights.tsx`: URL-driven search params, AccordionHero (Weekend trips / Fly anywhere / International / Domestic / Long haul), overlapping search card, sort tabs Cheapest/Fastest/Best, `aria-live` count, PlaneLoader while loading, empty/error states (Retry), linked-trip banner when `linkedBooking`.
- [x] Commit `feat(client): flights search page`.

### Task F3: Hotels pages
- [x] `HotelSearchForm`, `HotelCard` (TourCard pattern), `HotelMap` (react-leaflet with price-pill `divIcon`s), `pages/Hotels.tsx` (list/map toggle, filters: 4★+, free cancellation, breakfast), `pages/HotelDetails.tsx` (gallery, amenities, room offers with "Free cancellation" badges → checkout).
- [x] Commit `feat(client): hotels search and details pages`.

### Task F4: Checkout
- [x] `TravellerFields` (title/first/last; passport fields for international flights), `pages/TravelCheckout.tsx` (`checkout/travel/:kind/:offerId`, protected): loads offer (flight offer or hotel room offer), steps Travellers → Review → Pay → Confirmed; price-changed banner with Accept; Stripe `Elements` + `StripePaymentForm` → `confirmOrder`; no Stripe → confirmed directly; expired offer → toast + back to results.
- [x] Commit `feat(client): travel checkout`.

## Phase G — Integration into existing site

### Task G1: Routes, navbar, footer, home, plan-trip
- [x] `App.tsx`: lazy `Flights`, `Hotels`, `HotelDetails`, `TravelCheckout`, `AdminTravelOrders`; public `flights`, `hotels`, `hotels/:id` wrapped in `FeatureRoute`; protected `checkout/travel/:kind/:offerId` (FeatureRoute by kind inside page); admin `travel-orders`.
- [x] Navbar: compute `navItems = withFeatureLinks(sortedOrFallback, features)` once; use for desktop and mobile; `/flights` and `/hotels` get the transparent header like Home.
- [x] Footer explore links through `withFeatureLinks`.
- [x] Home: `<TravelSearchTabs/>` after `<Hero/>` inside `FeatureGate any` (tabs Tours | Flights | Hotels).
- [x] PlanTrip: step descriptions through `stripTravelMentions`.
- [x] Commit `feat(client): surface flights and hotels across the site`.

### Task G2: Tour links, dashboard, admin
- [x] `TripAddons` (variant `tour` | `success`): "Fly there" / "Stay nearby" cards (each behind its own feature) prefilled from `tour.location` city, travel date, nights and `linkedBooking`. Insert into TourDetails sticky sidebar and BookingPage success step.
- [x] Dashboard: Flights / Hotels tabs (only when enabled) listing `TravelOrderCard`s with cancel; linked orders shown under each tour booking.
- [x] AdminLayout: "Travel Orders" (Plane icon) under Operations. `AdminTravelOrders` table with kind/status filters, cancel/mark actions. AdminSettings "Booking services" card: two Switches + markup inputs, saved via `useUpdateSiteSettings({ features, travelMarkup })`.
- [x] Commit `feat(client): trip add-ons, dashboard orders, admin switches`.

## Phase H — Verification

- [x] `cd server && npm test` all PASS; `cd client && npm test && npm run build && npx tsc -b` clean; `npm run lint` no new errors.
- [x] Chrome: switches off → no Flights/Hotels links, `/flights` NotFound, API 404, home identical; admin turns both on → nav links, home tabs, search DEL→DXB, select, checkout (Stripe test card `4242 4242 4242 4242` or no-Stripe instant confirm), order in dashboard and admin; hotels Goa flow; switch hotels off → hotel tab/orders vanish for traveller, still in admin.
- [x] Update spec status, commit `docs: flights & hotels implemented`.
