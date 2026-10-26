import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Image } from "@/components/ui/image";
import { cn } from "@/lib/utils";
import { usePublicSettings, type HeroSlide } from "@/hooks/use-settings";

const FALLBACK_SLIDES: HeroSlide[] = [
    {
        title: "Paradise Found", subtitle: "Pristine Beaches",
        image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2073&auto=format&fit=crop",
        color: "from-blue-500/80", ctaLink: "/destinations", ctaLabel: "Explore",
    },
    {
        title: "Alpine Peaks", subtitle: "Mountain Escapes",
        image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2070&auto=format&fit=crop",
        color: "from-emerald-600/80", ctaLink: "/destinations", ctaLabel: "Explore",
    },
    {
        title: "Urban Lights", subtitle: "City Breaks",
        image: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=2144&auto=format&fit=crop",
        color: "from-purple-600/80", ctaLink: "/destinations", ctaLabel: "Explore",
    },
    {
        title: "Golden Sands", subtitle: "Desert Safaris",
        image: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?q=80&w=2070&auto=format&fit=crop",
        color: "from-orange-600/80", ctaLink: "/destinations", ctaLabel: "Explore",
    },
    {
        title: "Deep Wilds", subtitle: "Jungle Trekking",
        image: "https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=2070&auto=format&fit=crop",
        color: "from-green-800/80", ctaLink: "/destinations", ctaLabel: "Explore",
    },
];

// The slide that starts open; its photo is fetched first
const INITIAL_SLIDE = 1;
const AUTOPLAY_MS = 6000;
const AUTOPLAY_AFTER_TOUCH_MS = 10000;

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

export const Hero = () => {
    const { data } = usePublicSettings();
    const slides = (data?.settings?.heroSlides?.length ?? 0) > 0
        ? data!.settings!.heroSlides
        : FALLBACK_SLIDES;

    const [activeIdx, setActiveIdx] = useState(INITIAL_SLIDE);
    const isMobile = useIsMobile();
    const reduceMotion = useReducedMotion();
    // Set when the visitor swipes or taps, so the slideshow doesn't move under their finger
    const [touchedAt, setTouchedAt] = useState(0);
    const swipeStart = useRef<{ x: number; y: number } | null>(null);
    const count = slides.length;

    const show = (idx: number) => {
        setActiveIdx(((idx % count) + count) % count);
        setTouchedAt(Date.now());
    };

    // Phones show one slide at a time, so they move on by themselves (desktop opens slides on hover)
    useEffect(() => {
        if (!isMobile || reduceMotion || count < 2) return;
        const delay = Math.max(AUTOPLAY_MS, touchedAt + AUTOPLAY_AFTER_TOUCH_MS - Date.now());
        const id = window.setTimeout(() => setActiveIdx((i) => (i + 1) % count), delay);
        return () => window.clearTimeout(id);
    }, [isMobile, reduceMotion, count, activeIdx, touchedAt]);

    // Fetch the next slide's photo early so a swipe doesn't land on an empty frame
    useEffect(() => {
        if (!isMobile || count < 2) return;
        const next = slides[(activeIdx + 1) % count]?.image;
        if (next) new window.Image().src = next;
    }, [isMobile, activeIdx, count, slides]);

    return (
        // svh: phone browsers' toolbars would otherwise cover the button and dots at the bottom
        // (browsers without svh ignore the style and keep h-screen)
        <div className="relative h-screen w-full overflow-hidden bg-black flex flex-col" style={{ height: "100svh" }}>
            {/* Accordion Container */}
            <div
                className="flex-1 flex w-full touch-pan-y"
                onTouchStart={(e) => {
                    const t = e.touches[0];
                    swipeStart.current = { x: t.clientX, y: t.clientY };
                }}
                onTouchEnd={(e) => {
                    const start = swipeStart.current;
                    swipeStart.current = null;
                    if (!start || !isMobile) return;
                    const t = e.changedTouches[0];
                    const dx = t.clientX - start.x;
                    // A sideways swipe, not a scroll
                    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(t.clientY - start.y)) show(activeIdx + (dx < 0 ? 1 : -1));
                }}
            >
                {slides.map((slide, idx) => {
                    const isActive = idx === activeIdx;
                    return (
                        <motion.div
                            key={idx}
                            layout
                            onClick={() => (isMobile ? setTouchedAt(Date.now()) : setActiveIdx(idx))}
                            onHoverStart={() => setActiveIdx(idx)}
                            className={cn(
                                "relative h-full border-r border-white/10 cursor-pointer overflow-hidden transition-all duration-700 ease-in-out",
                                isActive ? "flex-[4]" : "flex-[0.5] hover:flex-[0.8] hidden md:block"
                            )}
                        >
                            {/* Background Image */}
                            <motion.div
                                className="absolute inset-0 w-full h-full"
                                initial={false}
                                // On phones the incoming photo fades in rather than cutting
                                animate={{ scale: isActive ? 1.1 : 1, opacity: isMobile && !isActive ? 0 : 1 }}
                                transition={{ duration: 0.7, opacity: { duration: 0.4 } }}
                            >
                                <Image
                                    src={slide.image}
                                    alt={slide.title}
                                    priority={idx === INITIAL_SLIDE}
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
                            <div className="absolute inset-0 p-6 pb-14 md:p-8 flex flex-col justify-end">
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
                                            <motion.span
                                                initial={{ x: -20, opacity: 0 }}
                                                animate={{ x: 0, opacity: 1 }}
                                                className="inline-block text-brand-orange font-bold text-sm tracking-[0.3em] uppercase mb-4"
                                            >
                                                {slide.subtitle}
                                            </motion.span>

                                            <h2 className="text-5xl sm:text-6xl md:text-8xl font-display font-bold text-white mb-6 leading-none">
                                                {slide.title}
                                            </h2>

                                            <p className="text-white/80 text-lg md:text-xl max-w-md mb-8 font-light">
                                                Immerse yourself in the world's most breathtaking landscapes. Your journey begins here.
                                            </p>

                                            <Button asChild className="bg-white text-black hover:bg-brand-orange hover:text-white rounded-full px-8 py-6 text-lg font-bold group transition-all duration-300">
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

            {/* Mobile dots */}
            <div className="md:hidden absolute bottom-1 left-0 right-0 flex justify-center z-20">
                {slides.map((_, idx) => (
                    // A finger-sized button around a small dot
                    <button
                        key={idx}
                        onClick={() => show(idx)}
                        aria-label={`Show slide ${idx + 1}`}
                        aria-current={idx === activeIdx}
                        className="w-9 h-9 flex items-center justify-center"
                    >
                        <span className={cn("h-2 rounded-full transition-all duration-300", idx === activeIdx ? "w-6 bg-white" : "w-2 bg-white/40")} />
                    </button>
                ))}
            </div>
        </div>
    );
};
