# WANDEAZY - Premium Travel Booking Platform

Welcome to the Wandeazy frontend codebase. This project is a modern, cinematic, and high-performance travel booking application built with React 19, Vite, and Tailwind CSS.

## 🚀 Tech Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v3.4 + shadcn/ui
- **Animation**: Framer Motion + GSAP
- **State Management**: React Query (TanStack Query)
- **Routing**: React Router v7
- **Icons**: Lucide React
- **Primitives**: Radix UI

## 🛠️ Setup & Installation

1.  **Clone the repository** (if applicable) or navigate to the project directory.

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Run the development server**:
    ```bash
    npm run dev
    ```

4.  **Build for production**:
    ```bash
    npm run build
    ```
    The build also prerenders every public page, `sitemap.xml` and `robots.txt` from the API
    (`scripts/prerender.ts`). Set `SITE_URL` to the site's public address (default `https://wandeazy.com`),
    and make sure `API_URL` (or `PRERENDER_API_URL`) is reachable during the build. If it isn't, only the
    static pages are prerendered. To rebuild automatically when content changes, set `SITE_REBUILD_HOOK_URL` on the API to the host's deploy hook
    (see `server/.env.example`); otherwise rebuild after publishing new tours or articles.
    Check the result with `npm run seo:check`.

## 📂 Project Structure

```
src/
├── components/         # Reusable UI components
│   ├── home/           # Landing page specific sections
│   └── ui/             # Primitive components (Button, Input, etc.)
├── data/               # Mock data definitions
├── layouts/            # Global layouts (MainLayout)
├── lib/                # Utilities (cn, etc.)
├── pages/              # Page components (Home, TourDetails, etc.)
├── styles/             # Global styles
├── App.tsx             # Main router setup
└── main.tsx            # Entry point with providers
```

## 🎨 Design System

### Colors
- **Brand Blue**: `#0F172A` (Slate 900)
- **Brand Orange**: `#F97316` (Orange 500)
- **Background**: White / Dark Mode Support

### Typography
- **Display**: Bebas Neue / Sans-serif (via Tailwind config)
- **Body**: Inter / Sans-serif

### Animations
- **Parallax**: Hero section uses Framer Motion `useScroll`.
- **Micro-interactions**: Hover effects on cards and buttons.
- **Transitions**: Smooth page transitions and step-based animations.

## 🧩 Key Features (Mock)

- **Landing Page**: Cinematic hero, masonry destinations, swiper tours.
- **Search**: Functional mock search page with filters.
- **Tour Details**: Immersive gallery, itinerary accordion, booking widget.
- **Booking Flow**: Multi-step animated form (Traveller -> Addons -> Payment).
- **Dashboard**: User bookings and wishlist.

## ⚠️ Notes

- This is a **Frontend-Only** build. API calls are mocked using local data in `src/data/mock.ts`.
- Images are sourced from Unsplash (placeholders).
- Ensure you have Node.js 18+ installed.

---

**Developed by Google Antigravity**
