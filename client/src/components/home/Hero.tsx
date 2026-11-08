import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useQueries } from "@tanstack/react-query";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Image } from "@/components/ui/image";
import { cn } from "@/lib/utils";
import { api } from "@/services/api";
import { usePublicSettings, type HeroSlide } from "@/hooks/use-settings";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import { useTours } from "@/hooks/use-tours";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/context/CurrencyContext";
import { DEFAULT_HERO_SLIDES, inSeason, orderSlides, pickSlide, slideFilter } from "@/lib/hero-slides";
import type { PaginatedData, Tour } from "@/types";

/** A slide as shown to this visitor: with a personal note and the cheapest trip it leads to */
interface ShownSlide extends HeroSlide {
    key: string;
    badge?: string;
    priceFrom?: string;
}

const FALLBACK_TEXT = "Handpicked trips across India and abroad, planned around you.";
// The slide this visitor's recent browsing pointed to, so it can come first straight away next visit
const PICK_KEY = "wandeazy.heroPick";
// How long each slide stays on a phone before the next one
const SLIDE_MS = 4000;
const EASE_OUT = [0.2, 0, 0, 1] as const;

function useIsMobile() {
    const query = "(max-width: 767px)"; // Tailwind's md breakpoint
    const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
    useEffect(() => {
        const list = window.matchMedia(query);
        const update = () => setMobile(list.matches);
        update();
        list.addEventListener("change", update);
        return () => list.removeEventListener("change", update);
    }, []);
    return mobile;
}

function readPick() {
    try { return localStorage.getItem(PICK_KEY); } catch { return null; }
}

/**
 * Puts the slide that matches the tours this visitor looked at first ("Picked for you"), then the
 * trips in season this month ("Best time to go"), greets signed-in travellers by name and adds
 * the starting price of each slide's trips.
 */
function usePersonalSlides(base: HeroSlide[]): ShownSlide[] {
    const { user } = useAuth();
    const { formatPrice } = useCurrency();
    const { ids } = useRecentlyViewed();
    // The same request as "Recently viewed" further down the page, so it is only fetched once
    const viewed = useTours({ ids: ids.join(","), limit: ids.length || 1 }, { enabled: ids.length > 0 });
    const cheapest = useQueries({
        queries: base.map((slide) => {
            const filter = slideFilter(slide);
            const params = { ...filter, limit: 1, sort: "price_low" };
            const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
            return {
                queryKey: ["tours", params],
                queryFn: () => api.get<PaginatedData<Tour>>(`/tours?${query}`),
                enabled: !!filter,
                staleTime: 5 * 60_000,
            };
        }),
    });
    const prices = cheapest.map((q) => q.data?.tours?.[0]);

    // null until the viewed tours have loaded; until then last visit's pick stands in
    const livePick = useMemo(() => {
        if (!viewed.data) return null;
        const byId = new Map(viewed.data.tours.map((t) => [t._id, t]));
        return pickSlide(base, ids.map((id) => byId.get(id)).filter((t): t is Tour => !!t));
    }, [viewed.data, ids, base]);
    const picked = ids.length === 0 ? -1 : livePick ?? base.findIndex((s) => s.title === readPick());

    useEffect(() => {
        try {
            if (ids.length === 0 || livePick === -1) localStorage.removeItem(PICK_KEY);
            else if (livePick !== null) localStorage.setItem(PICK_KEY, base[livePick].title);
        } catch {
            // storage blocked: the pick just isn't remembered
        }
    }, [ids.length, livePick, base]);

    const firstName = user?.displayName?.trim().split(/\s+/)[0];
    const priceKey = prices.map((t) => (t ? `${t.price}${t.currency}` : "")).join("|");
    return useMemo(() => {
        const month = new Date().getMonth() + 1;
        return orderSlides(base, picked, month).map(({ slide, picked: isPick }, pos) => {
            const tour = prices[base.indexOf(slide)];
            const notes = [
                isPick ? (firstName ? `Picked for you, ${firstName}` : "Picked for you") : pos === 0 && firstName ? `Hi ${firstName}` : "",
                !isPick && inSeason(slide, month) ? "Best time to go" : "",
            ].filter(Boolean);
            return {
                ...slide,
                key: slide._id ?? slide.title,
                badge: notes.join(" · ") || undefined,
                priceFrom: tour ? formatPrice(tour.price, tour.currency) : undefined,
            };
        });
        // prices is a new array each render; priceKey says when its contents change
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [base, picked, firstName, formatPrice, priceKey]);
}

export const Hero = () => {
    const { data } = usePublicSettings();
    const base = (data?.settings?.heroSlides?.length ?? 0) > 0
        ? data!.settings!.heroSlides
        : DEFAULT_HERO_SLIDES;
    const slides = usePersonalSlides(base);
    const isMobile = useIsMobile();

    return isMobile ? <MobileHero slides={slides} /> : <DesktopHero slides={slides} />;
};

const SlideBadge = ({ text }: { text?: string }) => text ? (
    <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-black/35 px-3 py-1 text-xs font-medium text-white">
        <Sparkles className="h-3.5 w-3.5 text-brand-orange" aria-hidden />
        {text}
    </span>
) : null;

const PriceFrom = ({ price, className }: { price?: string; className?: string }) => price ? (
    <p className={cn("text-white/70 tabular-nums", className)}>
        Trips from <span className="font-semibold text-white">{price}</span>
    </p>
) : null;

const DesktopHero = ({ slides }: { slides: ShownSlide[] }) => {
    // The first slide (this visitor's pick, or what's in season) starts open
    const [activeIdx, setActiveIdx] = useState(0);

    return (
        <div className="relative h-screen w-full overflow-hidden bg-black flex flex-col">
            {/* Accordion Container */}
            <div className="flex-1 flex w-full">
                {slides.map((slide, idx) => {
                    const isActive = idx === activeIdx;
                    return (
                        <motion.div
                            key={slide.key}
                            layout
                            onClick={() => setActiveIdx(idx)}
                            onHoverStart={() => setActiveIdx(idx)}
                            className={cn(
                                "relative h-full border-r border-white/10 cursor-pointer overflow-hidden transition-all duration-700 ease-in-out",
                                isActive ? "flex-[4]" : "flex-[0.5] hover:flex-[0.8]"
                            )}
                        >
                            {/* Background Image */}
                            <motion.div
                                className="absolute inset-0 w-full h-full"
                                animate={{ scale: isActive ? 1.1 : 1 }}
                                transition={{ duration: 0.7 }}
                            >
                                <Image
                                    src={slide.image}
                                    alt={slide.title}
                                    priority={idx === 0}
                                    className={cn(
                                        "w-full h-full object-cover brightness-75 transition-all duration-500",
                                        isActive ? "grayscale-0" : "grayscale"
                                    )}
                                />
                            </motion.div>

                            {/* Gradient Overlay */}
                            <div className={cn(
                                "absolute inset-0 bg-gradient-to-t to-transparent opacity-60 transition-opacity duration-500",
                                slide.color,
                                isActive ? "opacity-80" : "opacity-40"
                            )} />

                            {/* Content */}
                            <div className="absolute inset-0 p-8 flex flex-col justify-end">
                                {/* Vertical Label for Inactive */}
                                {!isActive && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <h3 className="text-white font-display font-bold text-4xl whitespace-nowrap -rotate-90 tracking-widest opacity-50 uppercase">
                                            {slide.subtitle}
                                        </h3>
                                    </div>
                                )}

                                {/* Active Content */}
                                <AnimatePresence mode="wait">
                                    {isActive && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 50 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 20 }}
                                            transition={{ delay: 0.2, duration: 0.5 }}
                                            className="max-w-2xl"
                                        >
                                            <SlideBadge text={slide.badge} />
                                            <motion.span
                                                initial={{ x: -20, opacity: 0 }}
                                                animate={{ x: 0, opacity: 1 }}
                                                className="block text-brand-orange font-bold text-sm tracking-[0.3em] uppercase mb-4"
                                            >
                                                {slide.subtitle}
                                            </motion.span>

                                            <h2 className="text-6xl md:text-8xl font-display font-bold text-white mb-6 leading-none">
                                                {slide.title}
                                            </h2>

                                            <p className={cn("text-white/80 text-lg md:text-xl max-w-md font-light text-pretty", slide.priceFrom ? "mb-3" : "mb-8")}>
                                                {slide.description || FALLBACK_TEXT}
                                            </p>
                                            <PriceFrom price={slide.priceFrom} className="text-base mb-8" />

                                            <Button asChild className="bg-snow text-ink hover:bg-brand-orange hover:text-white rounded-full px-8 py-6 text-lg font-bold group transition-all duration-300">
                                                <Link to={slide.ctaLink || "/destinations"}>
                                                    {slide.ctaLabel || `Explore ${slide.subtitle}`}
                                                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                                </Link>
                                            </Button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

const textItem = {
    hidden: { opacity: 0, y: 12, filter: "blur(4px)" },
    show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.4, ease: EASE_OUT } },
};

/**
 * Phones: one full-screen photo at a time that cross-fades to the next every few seconds, with
 * story-style progress bars. Swipe or tap a bar to move; holding a finger on it pauses.
 */
const MobileHero = ({ slides }: { slides: ShownSlide[] }) => {
    const reduceMotion = useReducedMotion();
    const [active, setActive] = useState(0);
    const [paused, setPaused] = useState(false);
    // Photos are only fetched once their slide is current or next, not all at once
    const [loaded, setLoaded] = useState<Set<number>>(() => new Set([0, 1]));
    const touch = useRef<{ x: number; y: number } | null>(null);
    const count = slides.length;
    const slide = slides[active] ?? slides[0];

    // The first slide's text is there on arrival; only later slides animate in
    const isFirst = useRef(true);
    const go = (idx: number) => {
        isFirst.current = false;
        setActive(((idx % count) + count) % count);
    };

    useEffect(() => {
        const next = (active + 1) % count;
        setLoaded((prev) => (prev.has(active) && prev.has(next) ? prev : new Set([...prev, active, next])));
    }, [active, count]);

    return (
        <section
            aria-roledescription="carousel"
            aria-label="Featured trips"
            // svh keeps the button and bars above phone browser toolbars (browsers without it keep h-screen)
            className="relative h-screen w-full overflow-hidden bg-black touch-pan-y select-none"
            style={{ height: "100svh" }}
            onTouchStart={(e) => {
                touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                setPaused(true);
            }}
            onTouchEnd={(e) => {
                setPaused(false);
                const start = touch.current;
                touch.current = null;
                if (!start) return;
                const t = e.changedTouches[0];
                const dx = t.clientX - start.x;
                // A sideways swipe, not a scroll
                if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(t.clientY - start.y)) go(active + (dx < 0 ? 1 : -1));
            }}
            onTouchCancel={() => setPaused(false)}
        >
            {/* Photos, stacked and cross-faded */}
            {slides.map((s, idx) => {
                const isActive = idx === active;
                return (
                    <div
                        key={s.key}
                        aria-hidden={!isActive}
                        className={cn(
                            "absolute inset-0 transition-opacity duration-700 ease-out",
                            isActive ? "opacity-100 z-[1]" : "opacity-0"
                        )}
                    >
                        {loaded.has(idx) && (
                            <img
                                src={s.image}
                                alt={isActive ? s.title : ""}
                                loading={idx === 0 ? "eager" : "lazy"}
                                fetchPriority={idx === 0 ? "high" : undefined}
                                decoding="async"
                                className={cn(
                                    "h-full w-full object-cover transition-transform ease-linear",
                                    // A slow push-in while the slide shows; the reset waits until it has faded out
                                    isActive && !reduceMotion ? "scale-[1.08] duration-[6000ms]" : "scale-100 duration-0 delay-700"
                                )}
                            />
                        )}
                        <div className={cn("pointer-events-none absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t to-transparent opacity-70", s.color)} />
                    </div>
                );
            })}

            {/* Shade: top for the menu, bottom for the text */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-32 bg-gradient-to-b from-black/50 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-[70%] bg-gradient-to-t from-black/90 via-black/45 to-transparent" />

            {/* Text */}
            <div
                className="absolute inset-x-0 bottom-0 z-[3] px-6"
                style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
            >
                {/* A new key per slide replays the entrance; the old text goes at once so there's no empty gap */}
                <motion.div
                        key={active}
                        initial={reduceMotion || isFirst.current ? false : "hidden"}
                        animate="show"
                        variants={{ show: { transition: { staggerChildren: 0.05 } } }}
                    >
                        {slide.badge && (
                            <motion.div variants={textItem}><SlideBadge text={slide.badge} /></motion.div>
                        )}
                        <motion.p variants={textItem} className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-brand-orange">
                            {slide.subtitle}
                        </motion.p>
                        <motion.h2 variants={textItem} className="mb-3 font-display text-[2.75rem] font-bold leading-[0.95] text-white text-balance">
                            {slide.title}
                        </motion.h2>
                        <motion.p variants={textItem} className={cn("max-w-[34ch] text-[15px] leading-relaxed text-white/75 text-pretty", slide.priceFrom ? "mb-2" : "mb-6")}>
                            {slide.description || FALLBACK_TEXT}
                        </motion.p>
                        {slide.priceFrom && (
                            <motion.div variants={textItem}><PriceFrom price={slide.priceFrom} className="mb-5 text-sm" /></motion.div>
                        )}
                        <motion.div variants={textItem} className="flex items-center justify-between">
                            <Link
                                to={slide.ctaLink || "/destinations"}
                                className="inline-flex h-12 items-center gap-2 rounded-full bg-snow pl-6 pr-5 text-[15px] font-semibold text-ink transition-transform duration-150 active:scale-[0.96]"
                            >
                                {slide.ctaLabel || `Explore ${slide.subtitle}`}
                                <ArrowRight className="h-4 w-4" strokeWidth={2} />
                            </Link>
                            <span className="text-sm font-medium tabular-nums text-white/60">
                                <span className="text-white">{String(active + 1).padStart(2, "0")}</span> / {String(count).padStart(2, "0")}
                            </span>
                        </motion.div>
                </motion.div>

                {/* Progress bars: the current one fills, then the next slide comes in */}
                {count > 1 && (
                    <div className="mt-3 flex gap-1.5">
                        {slides.map((_, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => go(idx)}
                                aria-label={`Show slide ${idx + 1}`}
                                aria-current={idx === active}
                                className="flex h-8 flex-1 items-center"
                            >
                                <span className="relative h-[3px] w-full overflow-hidden rounded-full bg-white/25">
                                    {(idx < active || (idx === active && reduceMotion)) && <span className="absolute inset-0 bg-white" />}
                                    {idx === active && !reduceMotion && (
                                        <span
                                            key={active}
                                            className="absolute inset-0 origin-left bg-white animate-[fill-x_linear_forwards]"
                                            style={{ animationDuration: `${SLIDE_MS}ms`, animationPlayState: paused ? "paused" : "running" }}
                                            onAnimationEnd={() => go(active + 1)}
                                        />
                                    )}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};
