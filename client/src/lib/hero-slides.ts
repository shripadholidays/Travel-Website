import type { HeroSlide } from "@/hooks/use-settings";
import type { Tour } from "@/types";

/** Used until the admin settings load (and if they have no slides): the trips we actually sell */
export const DEFAULT_HERO_SLIDES: HeroSlide[] = [
    {
        title: "Into the Himalayas", subtitle: "Hills & Mountains",
        description: "Snow peaks, houseboats on Dal Lake and high mountain passes: Shimla, Manali, Kashmir and Leh.",
        image: "/images/hero/dal-lake.webp", color: "from-emerald-600/80",
        ctaLink: "/tours?category=Hill", ctaLabel: "See mountain trips", bestMonths: [3, 4, 5, 6, 9, 10],
    },
    {
        title: "Royal Rajasthan", subtitle: "Forts & Deserts",
        description: "Palaces in Jaipur, lakes in Udaipur and camel rides across the Jaisalmer dunes.",
        image: "/images/hero/hawa-mahal.webp", color: "from-orange-600/80",
        ctaLink: "/tours?place=Rajasthan", ctaLabel: "See Rajasthan trips", bestMonths: [10, 11, 12, 1, 2, 3],
    },
    {
        title: "Sacred Journeys", subtitle: "Pilgrimages",
        description: "Char Dham, Varanasi, Vaishno Devi, Dwarka and more, with stays and travel arranged for you.",
        image: "/images/hero/varanasi.webp", color: "from-amber-600/80",
        ctaLink: "/tours?category=Pilgrimage", ctaLabel: "See pilgrimages", bestMonths: [],
    },
    {
        title: "Backwaters & Beaches", subtitle: "Kerala, Goa & Andaman",
        description: "Houseboats on the Kerala backwaters, tea hills, and quiet beaches in Goa and the Andamans.",
        image: "/images/hero/alleppey.webp", color: "from-cyan-600/80",
        ctaLink: "/tours?category=Beach", ctaLabel: "See beach trips", bestMonths: [10, 11, 12, 1, 2, 3, 4],
    },
    {
        title: "Beyond India", subtitle: "Dubai · Bali · Thailand",
        description: "Dubai, Bali, Thailand, Sri Lanka, Nepal and more, planned from India.",
        image: "/images/hero/dubai-marina.webp", color: "from-blue-500/80",
        ctaLink: "/tours?category=International", ctaLabel: "See trips abroad", bestMonths: [11, 12, 1, 2, 3],
    },
    {
        title: "Your Trip, Your Way", subtitle: "Build Your Own",
        description: "Pick the places, set the days and watch your estimated budget as you go.",
        image: "/images/hero/pangong.webp", color: "from-rose-600/80",
        ctaLink: "/build-trip", ctaLabel: "Build my trip", bestMonths: [],
    },
];

export interface TourFilter {
    category?: string;
    place?: string;
}

/** The tours a slide's button leads to, read from its link ("/tours?category=Hill") */
export function slideFilter(slide: HeroSlide): TourFilter | null {
    try {
        const url = new URL(slide.ctaLink || "", "https://x.invalid");
        if (url.pathname !== "/tours") return null;
        const category = url.searchParams.get("category") || undefined;
        const place = url.searchParams.get("place") || undefined;
        return category || place ? { category, place } : null;
    } catch {
        return null;
    }
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Whether a tour is one of the tours a slide leads to (the same rule the tours page uses) */
export function tourMatches(filter: TourFilter, tour: Pick<Tour, "categories" | "location">) {
    if (filter.category && !filter.category.split(",").some((c) => tour.categories?.includes(c.trim()))) return false;
    if (filter.place && !new RegExp(`\\b${escape(filter.place)}\\b`, "i").test(tour.location || "")) return false;
    return true;
}

export const inSeason = (slide: HeroSlide, month: number) => !!slide.bestMonths?.includes(month);

/**
 * Which slide suits this visitor best, from the tours they looked at most recently
 * (newer views count more). -1 when nothing they viewed matches a slide.
 */
export function pickSlide(slides: HeroSlide[], viewed: Pick<Tour, "categories" | "location">[]) {
    let best = -1;
    let bestScore = 0;
    slides.forEach((slide, idx) => {
        const filter = slideFilter(slide);
        if (!filter) return;
        const score = viewed.reduce((sum, tour, i) => sum + (tourMatches(filter, tour) ? viewed.length - i : 0), 0);
        if (score > bestScore) { best = idx; bestScore = score; }
    });
    return best;
}

/** The visitor's pick first, then slides in season this month, then the rest, each in the admin's order */
export function orderSlides(slides: HeroSlide[], picked: number, month: number) {
    const rank = (s: HeroSlide, i: number) => (i === picked ? 0 : inSeason(s, month) ? 1 : 2);
    return slides
        .map((slide, i) => ({ slide, i, rank: rank(slide, i) }))
        .sort((a, b) => a.rank - b.rank || a.i - b.i)
        .map(({ slide, i }) => ({ slide, picked: i === picked }));
}
