import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowUpRight, Clock, MapPin, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Image } from "@/components/ui/image";
import { Skeleton } from "@/components/ui/skeleton";
import { ReviewSection } from "@/components/ReviewSection";
import { TourBookingPanel } from "@/components/tour/TourBookingPanel";
import { TourInclusions, TourItinerary, TourOverview, TourQuickFacts } from "@/components/tour/TourSections";
import { TourGallery } from "@/components/tour/TourGallery";
import { useCurrency } from "@/context/CurrencyContext";
import { useTour } from "@/hooks/use-tours";
import { useTourActions, useTourBooking } from "@/hooks/use-tour-actions";
import { useTourModal } from "@/hooks/use-tour-modal";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import type { Tour } from "@/types";

/**
 * Tour quick view: opens over the current page when a trip card is clicked.
 * Mounted once in MainLayout and driven by `?tour=<id>` (see useTourModal).
 */
export const TourQuickView = () => {
    const { tourId, preview, closeTour } = useTourModal();

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
                        className="relative flex flex-col w-full h-dvh sm:h-full sm:max-h-[56rem] sm:max-w-5xl bg-background sm:rounded-[2rem] shadow-2xl overflow-hidden focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-10 sm:data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-bottom-10 sm:data-[state=closed]:zoom-out-95 duration-300 ease-out motion-reduce:animate-none"
                    >
                        {/* Sits above the scrolling content, so it is always in reach */}
                        <DialogPrimitive.Close
                            className="absolute right-4 top-4 z-30 w-10 h-10 rounded-full bg-white/95 backdrop-blur-md text-brand-blue shadow-lg flex items-center justify-center hover:bg-white hover:scale-105 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
                            aria-label="Close"
                        >
                            <X className="w-5 h-5" />
                        </DialogPrimitive.Close>
                        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                            {shown && <QuickViewBody key={shown.id} id={shown.id} preview={shown.preview} />}
                        </div>
                    </DialogPrimitive.Content>
                </DialogPrimitive.Overlay>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
};

const QuickViewBody = ({ id, preview }: { id: string; preview?: Tour }) => {
    const { data, isLoading } = useTour(id);
    const full = data?.tour;
    // Card data paints the hero straight away; the sections fill in once the tour loads.
    const tour = full ?? preview;
    const booking = useTourBooking(tour?._id);
    const actions = useTourActions(tour);
    const { formatPrice } = useCurrency();
    const { addTour } = useRecentlyViewed();

    useEffect(() => {
        if (full) addTour(full);
    }, [full?._id]); // eslint-disable-line react-hooks/exhaustive-deps

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
            {/* Hero */}
            <div className="relative h-64 sm:h-80 w-full overflow-hidden">
                <Image src={image} alt={tour.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/30" />
                <div className="absolute bottom-0 inset-x-0 p-6 sm:p-8">
                    <div className="flex flex-wrap gap-2 mb-3">
                        {(tour.categories ?? []).slice(0, 3).map((tag) => (
                            <span key={tag} className="px-3 py-1 bg-brand-orange text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
                                {tag}
                            </span>
                        ))}
                    </div>
                    <DialogPrimitive.Title className="text-3xl sm:text-4xl font-display font-bold text-white mb-3 drop-shadow-lg max-w-3xl text-balance">
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

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-8 p-5 sm:p-8">
                <div className="space-y-10 min-w-0">
                    <TourQuickFacts tour={tour} />
                    {full ? (
                        <>
                            <TourOverview tour={full} compact />
                            <TourGallery tour={full} compact />
                            <TourInclusions tour={full} compact />
                            <TourItinerary tour={full} compact />
                            <ReviewSection tourId={full._id} />
                        </>
                    ) : (
                        <SectionsSkeleton />
                    )}
                </div>

                <div className="relative">
                    <div className="lg:sticky lg:top-6 space-y-4">
                        <TourBookingPanel tour={tour} booking={booking} actions={actions} compact />
                        <Link
                            to={`/tour/${tour._id}`}
                            className="flex items-center justify-center gap-1.5 text-sm font-semibold text-brand-blue hover:text-brand-orange transition-colors py-2"
                        >
                            Open full page with map <ArrowUpRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Mobile: price + Book Now stay in reach while reading */}
            <div className="lg:hidden sticky bottom-0 z-20 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 flex items-center gap-3">
                <div className="flex-1">
                    <p className="text-[11px] uppercase font-bold text-muted-foreground tracking-wide">From</p>
                    <p className="text-xl font-bold font-display text-brand-blue">{formatPrice(tour.price, tour.currency)}<span className="text-xs font-medium text-muted-foreground ml-1">/ person</span></p>
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
        <Skeleton className="h-64 sm:h-80 w-full rounded-none" />
        <div className="p-5 sm:p-8"><SectionsSkeleton /></div>
    </div>
);
