# WandEazy Full CMS Buildout Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make every hardcoded section of the WandEazy website manageable from the admin portal, add file upload support (local → S3/R2 ready), and add CSV/JSON bulk import throughout.

**Architecture:** Expand SiteSettings MongoDB document to hold all content (hero slides, offer bar, promo carousel, testimonials, FAQs, plan-trip steps, support section, about page, nav links). Add multer-based upload endpoint. Build admin pages for every section. Wire all frontend components to read from the API instead of hardcoded arrays.

**Tech Stack:** Express 5, Mongoose, multer (uploads), React 19, TanStack Query, Zod, Tailwind, Radix UI, Sonner toasts, react-hook-form, Papa Parse (CSV parsing)

---

## PHASE 1 — SERVER FOUNDATION

### Task 1: Install multer + expand SiteSettings model
- [ ] `cd wandeazy-share/server && npm install multer`
- [ ] Rewrite `src/models/SiteSettings.js` with all new fields (heroSlides, offerBar, promoSlides, planTrip, testimonials, supportSection, faqs, aboutPage, navLinks, footerLinks)

### Task 2: Upload controller + route
- [ ] Create `src/controllers/UploadController.js` — multer disk storage to `uploads/` dir, return full URL
- [ ] Create `src/routes/upload-route.js`
- [ ] Register in `server.js`: `app.use('/uploads', express.static('uploads'))` + route

### Task 3: Expand SettingsController
- [ ] Add new fields to `updateSettings` (all new schema fields)
- [ ] Expand `getPublicSettings` to include heroSlides, offerBar, promoSlides, planTrip, testimonials, supportSection, faqs, aboutPage, navLinks

### Task 4: Add admin routes for upload + new settings endpoints
- [ ] Add `POST /upload` to admin-route.js
- [ ] Add `PUT /settings/hero-slides`, `PUT /settings/offer-bar`, etc. OR use single `PUT /admin/settings` (already exists — just expand body)

### Task 5: Missing admin views — server side
- [ ] AdminController: add `getInquiries`, `getSubscribers`, `getReviews`, `deleteReview`, `getPayments`
- [ ] Add routes to admin-route.js

---

## PHASE 2 — CLIENT SHARED COMPONENTS

### Task 6: useUpload hook + updated use-settings types
- [ ] Create `src/hooks/use-upload.ts`
- [ ] Expand `SiteSettings` type in `use-settings.ts`

### Task 7: ImagePicker component
- [ ] Create `src/components/ui/ImagePicker.tsx` — tabs: "URL" (text input + preview) | "Upload" (file input → useUpload)

### Task 8: ListEditor component  
- [ ] Create `src/components/ui/ListEditor.tsx` — generic ordered list with add / remove / move-up / move-down

### Task 9: JsonCsvImporter component
- [ ] Install papaparse: `cd wandeazy-share/client && npm install papaparse @types/papaparse`
- [ ] Create `src/components/ui/JsonCsvImporter.tsx` — modal with paste area + file upload, parses CSV or JSON, calls onImport(rows[])

---

## PHASE 3 — HOME PAGE ADMIN FORMS

### Task 10: AdminHomepage — Offer Bar + Nav Links editor
- [ ] Create `src/pages/admin/AdminHomepage.tsx`

### Task 11: Hero Slides admin form (inside AdminHomepage or own tab)

### Task 12: Promo Carousel admin form

### Task 13: Plan Trip Steps admin form

### Task 14: Testimonials admin form + CSV/JSON import

### Task 15: Support Section admin form

### Task 16: FAQ admin page (CRUD + CSV/JSON import)
- [ ] Create `src/pages/admin/AdminFAQ.tsx`

---

## PHASE 4 — WIRE FRONTEND COMPONENTS TO API

### Task 17: Hero.tsx — reads heroSlides from public settings
### Task 18: OfferBar.tsx — reads offerBar from public settings (real countdown end date)
### Task 19: PromotionalCarousel.tsx — reads promoSlides from public settings
### Task 20: PlanTrip.tsx — reads planTrip steps from public settings
### Task 21: Testimonials.tsx — reads testimonials from public settings
### Task 22: SupportSection.tsx — reads supportSection from public settings
### Task 23: FaqSection.tsx + FAQ.tsx — reads faqs from public settings

---

## PHASE 5 — ABOUT PAGE

### Task 24: AdminAbout.tsx — editor for all about page fields
### Task 25: About.tsx — reads aboutPage from public settings

---

## PHASE 6 — TOURS FULL FORM

### Task 26: AdminTours full-page tour editor (replace tiny dialog)
- All fields: title, location, price, days/nights, currency, validity, imageURL, images[], categories[], inclusions[], itinerary[], overview.about, overview.gallery[], EMI, coordinates
- isFeatured toggle, status (active/inactive/draft)
- JSON import

---

## PHASE 7 — COLLECTIONS ADMIN (new page)

### Task 27: AdminCollections.tsx — full CRUD + tour assignment + JSON import

---

## PHASE 8 — DESTINATIONS ENHANCEMENT  

### Task 28: AdminDestinations — add coordinates (lat/lng), gallery images[], isActive toggle

---

## PHASE 9 — MISSING ADMIN VIEWS

### Task 29: AdminInquiries.tsx — list + status management
### Task 30: AdminSubscribers.tsx — list + CSV export
### Task 31: AdminReviews.tsx — moderation (view/delete)
### Task 32: AdminPayments.tsx — view Stripe payment records

---

## PHASE 10 — SIDEBAR + ROUTING

### Task 33: Update AdminLayout.tsx sidebar (all new routes, grouped sections)
### Task 34: Update App.tsx with all new admin routes

---
