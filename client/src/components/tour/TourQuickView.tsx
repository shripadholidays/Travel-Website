import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { Link } from "react-router-dom";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Clock, Images, MapPin, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Image } from "@/components/ui/image";
import { Skeleton } from "@/components/ui/skeleton";
import { ReviewSection } from "@/components/ReviewSection";
import { TourBookingPanel } from "@/components/tour/TourBookingPanel";
import { TourInclusions, TourItinerary, TourOverview, TourQuickFacts } from "@/components/tour/TourSections";
import { TourGallery, tourPhotos } from "@/components/tour/TourGallery";
import { useCurrency } from "@/context/CurrencyContext";
import { useTour } from "@/hooks/use-tours";
import { useTourActions, useTourBooking } from "@/hooks/use-tour-actions";
import { withChoice } from "@/lib/package-options";
import { useTourModal } from "@/hooks/use-tour-modal";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import { cn } from "@/lib/utils";
import type { Tour } from "@/types";

/**
 * Tour quick view: opens over the current page when a trip card is clicked.
 * Mounted once in MainLayout and driven by `?tour=<id>` (see useTourModal).
 */
export const TourQuickView = () => {
    const { tourId, preview, closeTour } = useTourModal();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Keep rendering the last tour while the close animation plays.
    const last = useRef<{ id: string; preview?: Tour } | null>(null);
    if (tourId) last.current = { id: tourId, preview: preview?._id === tourId ? preview : last.current?.id === tourId ? last.current.preview : undefined };
    const shown = last.current;

    return (
        <DialogPrimitive.Root open={!!tourId} onOpenChange={(open) => { if (!open) closeTour(); }}>
            <DialogPrimitive.Portal>
                {/* A fixed-size window with space above and below; only its content scrolls (full screen on phones) */}
                <DialogPrimitive.Overlay className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-blue/60 backdrop-blur-sm sm:p-6 lg:p-10 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 duration-300 motion-reduce:animate-none">
                    <DialogPrimitive.Content
                        aria-describedby={undefined}
                        // Focus the scroll area, not the close button: keyboard scrolling works and no ring flashes on open
                        onOpenAutoFocus={(e) => { e.preventDefault(); scrollRef.current?.focus({ preventScroll: true }); }}
                        className="relative flex flex-col w-full h-dvh sm:h-full sm:max-h-[56rem] sm:max-w-5xl bg-background sm:rounded-[2rem] shadow-2xl overflow-hidden focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-10 sm:data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-bottom-10 sm:data-[state=closed]:zoom-out-95 duration-300 ease-out motion-reduce:animate-none"
                    >
                        {/* Sits above the scrolling content, so it is always in reach */}
                        <DialogPrimitive.Close
                            className="absolute right-4 top-4 z-30 w-10 h-10 rounded-full bg-white/95 backdrop-blur-md text-brand-blue shadow-lg flex items-center justify-center hover:bg-white hover:scale-105 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
                            aria-label="Close"
                        >
                            <X className="w-5 h-5" />
                        </DialogPrimitive.Close>
                        <div ref={scrollRef} tabIndex={-1} className="scrollbar-brand flex-1 min-h-0 overflow-y-auto overscroll-contain focus:outline-none">
                            {shown && <QuickViewBody key={shown.id} id={shown.id} preview={shown.preview} scrollRef={scrollRef} />}
                        </div>
                    </DialogPrimitive.Content>
                </DialogPrimitive.Overlay>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
};

type SectionKey = "overview" | "photos" | "included" | "itinerary" | "reviews";
const SECTION_LABELS: Record<SectionKey, string> = {
    overview: "Overview",
    photos: "Photos",
    included: "What's included",
    itinerary: "Itinerary",
    reviews: "Reviews",
};
const BAR_HEIGHT = 64;

/**
 * Follows the modal's own scroll: which section is being read, whether the hero has scrolled
 * away, and reading progress (written straight to the bar's style, so scrolling never re-renders).
 */
function useModalScroll(scrollRef: RefObject<HTMLDivElement | null>, heroRef: RefObject<HTMLDivElement | null>, keys: SectionKey[], progressRef: RefObject<HTMLDivElement | null>) {
    const [active, setActive] = useState<SectionKey | null>(null);
    const [heroGone, setHeroGone] = useState(false);
    const keysKey = keys.join(",");

    useEffect(() => {
        const root = scrollRef.current;
        if (!root) return;
        let frame = 0;
        const onScroll = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                const max = root.scrollHeight - root.clientHeight;
                if (progressRef.current) progressRef.current.style.transform = `scaleX(${max > 0 ? root.scrollTop / max : 0})`;
                setHeroGone(!!heroRef.current && root.scrollTop > heroRef.current.offsetHeight - BAR_HEIGHT - 8);
                // The last section whose top has passed under the bar is the one being read
                const top = root.getBoundingClientRect().top + BAR_HEIGHT + 24;
                let current: SectionKey | null = null;
                for (const key of keys) {
                    const el = root.querySelector<HTMLElement>(`[data-qv-section="${key}"]`);
                    if (el && el.getBoundingClientRect().top <= top) current = key;
                }
                // At the very bottom, the last section counts even if it is short
                if (max > 0 && root.scrollTop >= max - 2) current = keys[keys.length - 1] ?? current;
                setActive(current);
            });
        };
        onScroll();
        root.addEventListener("scroll", onScroll, { passive: true });
        return () => {
            cancelAnimationFrame(frame);
            root.removeEventListener("scroll", onScroll);
        };
    }, [scrollRef, heroRef, progressRef, keysKey]); // eslint-disable-line react-hooks/exhaustive-deps

    return { active, heroGone };
}

const QuickViewBody = ({ id, preview, scrollRef }: { id: string; preview?: Tour; scrollRef: RefObject<HTMLDivElement | null> }) => {
    const { data, isLoading } = useTour(id);
    const full = data?.tour;
    // Card data paints the hero straight away; the sections fill in once the tour loads.
    const tour = full ?? preview;
    const booking = useTourBooking(full ?? preview);
    // The trip length and hotel class picked change the price, length and day plan shown
    const shown = tour ? withChoice(tour, booking.choice) : tour;
    const actions = useTourActions(tour);
    const { formatPrice } = useCurrency();
    const { addTour } = useRecentlyViewed();
    const reduceMotion = useReducedMotion();
    const heroRef = useRef<HTMLDivElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (full) addTour(full);
    }, [full?._id]); // eslint-disable-line react-hooks/exhaustive-deps

    const photos = full ? tourPhotos(full) : [];
    const keys: SectionKey[] = full ? ([
        full.overview?.about && "overview",
        photos.length > 1 && "photos",
        (full.inclusions?.length ?? 0) > 0 && "included",
        (full.itinerary?.length ?? 0) > 0 && "itinerary",
        "reviews",
    ].filter(Boolean) as SectionKey[]) : [];
    const { active, heroGone } = useModalScroll(scrollRef, heroRef, keys, progressRef);

    const goTo = useCallback((key: SectionKey) => {
        const root = scrollRef.current;
        const el = root?.querySelector<HTMLElement>(`[data-qv-section="${key}"]`);
        if (!root || !el) return;
        const top = el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop - BAR_HEIGHT - 16;
        root.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
    }, [scrollRef, reduceMotion]);

    if (!tour) {
        if (isLoading) return <QuickViewSkeleton />;
        return (
            <div className="px-6 py-20 text-center">
                <DialogPrimitive.Title className="text-2xl font-display font-bold text-brand-blue mb-3">Tour not found</DialogPrimitive.Title>
                <p className="text-muted-foreground mb-8">This tour does not exist or has been removed.</p>
                <Button asChild><Link to="/tours">Browse all tours</Link></Button>
            </div>
        );
    }

    const image = tour.imageURL || tour.images?.[0] || '';
    const rating = tour.reviews?.rating ?? 0;
    const reviewCount = tour.reviews?.basedOn ?? 0;

    return (
        <>
            {/* Hero: the photo settles into place as the window opens */}
            <div ref={heroRef} className="relative h-72 sm:h-[22rem] w-full overflow-hidden bg-brand-blue">
                <Image src={image} alt={tour.title} className="w-full h-full object-cover animate-qv-hero" />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/90 via-brand-dark/20 to-brand-dark/40" />
                {photos.length > 1 && (
                    <button
                        type="button"
                        onClick={() => goTo("photos")}
                        className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/95 px-3.5 py-2 text-sm font-semibold text-brand-blue shadow-lg transition-transform hover:scale-[1.03] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
                    >
                        <Images className="h-4 w-4 text-brand-orange" /> {photos.length} photos
                    </button>
                )}
                <div className="absolute bottom-0 inset-x-0 p-6 sm:p-8">
                    <div className="flex flex-wrap gap-2 mb-3">
                        {(tour.categories ?? []).slice(0, 3).map((tag) => (
                            <span key={tag} className="px-3 py-1 bg-brand-orange text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
                                {tag}
                            </span>
                        ))}
                    </div>
                    <DialogPrimitive.Title className="text-4xl sm:text-5xl font-display font-bold text-white mb-3 drop-shadow-lg max-w-3xl text-balance leading-[0.95]">
                        {tour.title}
                    </DialogPrimitive.Title>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-white/90 font-medium">
                        <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-brand-orange" /> {tour.location}</span>
                        <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-brand-orange" /> {tour.duration.days}D/{tour.duration.nights}N</span>
                        {rating > 0 && (
                            <span className="flex items-center gap-1.5"><Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /> {rating} <span className="text-white/70">({reviewCount} {reviewCount === 1 ? "review" : "reviews"})</span></span>
                        )}
                    </div>
                </div>
            </div>

            {/* Sticky bar: section tabs, the title once the hero has gone, and reading progress */}
            <div className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur-md" style={{ height: BAR_HEIGHT }}>
                <div className="flex h-full items-center pl-4 pr-16 sm:pl-7">
                    <div
                        className={cn(
                            "hidden md:block min-w-0 shrink-0 transition-all duration-300 ease-out",
                            heroGone ? "w-60 mr-4 opacity-100 translate-y-0" : "w-0 mr-0 opacity-0 translate-y-1",
                        )}
                        aria-hidden={!heroGone}
                    >
                        <p className="truncate font-display text-xl leading-none text-brand-blue">{tour.title}</p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">From <span className="font-semibold text-brand-blue">{formatPrice(tour.price, tour.currency)}</span> / person</p>
                    </div>
                    {keys.length > 0 ? (
                        <nav aria-label="Tour sections" className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            {keys.map((key) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => goTo(key)}
                                    aria-current={active === key ? "true" : undefined}
                                    className={cn(
                                        "relative shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange",
                                        active === key ? "text-white" : "text-slate-600 hover:bg-slate-100 hover:text-brand-blue",
                                    )}
                                >
                                    {active === key && (
                                        <motion.span
                                            layoutId={`qv-tab-${id}`}
                                            className="absolute inset-0 rounded-full bg-brand-blue"
                                            transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 40 }}
                                        />
                                    )}
                                    <span className="relative">{SECTION_LABELS[key]}</span>
                                </button>
                            ))}
                        </nav>
                    ) : (
                        <Skeleton className="h-8 w-72 rounded-full" />
                    )}
                </div>
                <div ref={progressRef} className="absolute inset-x-0 -bottom-px h-0.5 origin-left bg-brand-orange" style={{ transform: "scaleX(0)" }} aria-hidden="true" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-8 lg:gap-10 p-5 sm:p-8">
                <div className="space-y-12 min-w-0">
                    <TourQuickFacts tour={shown ?? tour} />
                    {full ? (
                        <>
                            {keys.includes("overview") && <div data-qv-section="overview"><TourOverview tour={full} compact /></div>}
                            {keys.includes("photos") && <div data-qv-section="photos"><TourGallery tour={full} compact /></div>}
                            {keys.includes("included") && <div data-qv-section="included"><TourInclusions tour={full} compact /></div>}
                            {keys.includes("itinerary") && <div data-qv-section="itinerary"><TourItinerary tour={withChoice(full, booking.choice)} compact /></div>}
                            <div data-qv-section="reviews"><ReviewSection tourId={full._id} /></div>
                        </>
                    ) : (
                        <SectionsSkeleton />
                    )}
                </div>

                <div className="relative">
                    <div className="lg:sticky space-y-4" style={{ top: BAR_HEIGHT + 20 }}>
                        <TourBookingPanel tour={tour} booking={booking} actions={actions} compact />
                        <Link
                            to={`/tour/${tour._id}`}
                            className="group flex items-center justify-center gap-1.5 rounded-xl text-sm font-semibold text-brand-blue hover:text-brand-orange transition-colors py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
                        >
                            Open full page with map <ArrowUpRight className="w-4 h-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Mobile: price + Book Now stay in reach while reading */}
            <div className="lg:hidden sticky bottom-0 z-20 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 flex items-center gap-3">
                <div className="flex-1">
                    <p className="text-[11px] uppercase font-bold text-muted-foreground tracking-wide">{tour.packageOptions ? "Your package" : "From"}</p>
                    <p className="text-xl font-bold font-display text-brand-blue tabular-nums">{formatPrice((shown ?? tour).price, tour.currency)}<span className="text-xs font-medium text-muted-foreground ml-1">/ person</span></p>
                </div>
                <Button asChild className="h-12 px-7 text-base font-bold bg-brand-orange hover:bg-brand-orange/90 shadow-lg shadow-brand-orange/20 rounded-2xl text-white flex-shrink-0">
                    <Link to="/book" state={booking.bookState}>Book Now</Link>
                </Button>
            </div>
        </>
    );
};

const SectionsSkeleton = () => (
    <div className="space-y-8" aria-hidden="true">
        {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-3">
                <Skeleton className="h-7 w-40" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-3/4" />
            </div>
        ))}
    </div>
);

const QuickViewSkeleton = () => (
    <div>
        <DialogPrimitive.Title className="sr-only">Loading tour</DialogPrimitive.Title>
        <Skeleton className="h-72 sm:h-[22rem] w-full rounded-none" />
        <div className="p-5 sm:p-8"><SectionsSkeleton /></div>
    </div>
);
