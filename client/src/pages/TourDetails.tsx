import { useParams, Link } from "react-router-dom";
import { useTour } from "@/hooks/use-tours";
import { Button } from "@/components/ui/button";
import { Image } from "@/components/ui/image";
import { MapPin, Clock, Star } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useCurrency } from "@/context/CurrencyContext";
import { TourMap } from "@/components/TourMap";
import { ReviewSection } from "@/components/ReviewSection";
import { useEffect } from "react";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import { useTourActions, useTourBooking } from "@/hooks/use-tour-actions";
import { SectionHeading, TourInclusions, TourItinerary, TourOverview, TourQuickFacts } from "@/components/tour/TourSections";
import { TourGallery } from "@/components/tour/TourGallery";
import { TourBookingPanel } from "@/components/tour/TourBookingPanel";

import { Container } from "@/components/ui/container";

import { PageTitle } from "@/components/PageTitle";

export const TourDetails = () => {
    const { id } = useParams();
    const { data, isLoading } = useTour(id!);
    const { formatPrice } = useCurrency();

    const { addTour: addToRecentlyViewed } = useRecentlyViewed();
    const tour = data?.tour;
    const booking = useTourBooking(tour?._id);
    const actions = useTourActions(tour);

    // Track this tour as recently viewed once loaded
    useEffect(() => {
        // A staff preview of an unpublished tour is not a traveller's visit
        if (tour && (tour.status ?? 'active') === 'active') addToRecentlyViewed(tour);
    }, [tour?._id]); // eslint-disable-line react-hooks/exhaustive-deps

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Spinner label="Loading tour details…" />
            </div>
        );
    }

    if (!tour) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
                <PageTitle title="Tour Not Found" />
                <h2 className="text-3xl font-display font-bold mb-4">Tour not found</h2>
                <p className="text-muted-foreground mb-8">The tour you are looking for does not exist or has been removed.</p>
                <Link to="/tours"><Button>Browse all tours</Button></Link>
            </div>
        );
    }

    const image = tour.imageURL || tour.images?.[0] || '';
    const durationLabel = `${tour.duration.days}D/${tour.duration.nights}N`;
    const rating = tour.reviews?.rating ?? 0;
    const reviewCount = tour.reviews?.basedOn ?? 0;
    const tags = tour.categories ?? [];
    const description = tour.overview?.about ?? '';

    return (
        <div className="bg-background min-h-screen pb-24 lg:pb-0">
            <PageTitle
                title={tour.title}
                description={description?.slice(0, 160) || `Book ${tour.title} in ${tour.location} with Wandeazy.`}
                image={image}
                type="article"
                jsonLd={{
                    '@context': 'https://schema.org',
                    '@type': 'Product',
                    name: tour.title,
                    description: description?.slice(0, 200),
                    image: image,
                    category: tags[0] || 'Tour',
                    offers: {
                        '@type': 'Offer',
                        price: tour.price,
                        priceCurrency: tour.currency || 'USD',
                        availability: 'https://schema.org/InStock',
                    },
                    ...(rating > 0 && reviewCount > 0
                        ? {
                            aggregateRating: {
                                '@type': 'AggregateRating',
                                ratingValue: rating,
                                reviewCount: reviewCount,
                            },
                        }
                        : {}),
                }}
            />
            {tour.status && tour.status !== 'active' && (
                <div className="sticky top-0 z-40 bg-amber-100 border-b border-amber-300 text-amber-900 text-sm" role="status">
                    <Container className="flex flex-wrap items-center justify-between gap-2 py-2">
                        <span><strong>Staff preview.</strong> This tour is {tour.status === 'draft' ? 'a draft' : 'hidden'}, so travellers can't see or book it.</span>
                        <Link to={`/admin/tours/${tour._id}/edit`} className="font-semibold underline">Edit tour</Link>
                    </Container>
                </div>
            )}
            {/* Hero Gallery */}
            <div className="relative h-[60vh] md:h-[70vh] w-full overflow-hidden">
                <Image src={image} alt={tour.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                <div className="absolute bottom-0 left-0 w-full p-8 md:p-12">
                    <Container>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {tags.map(tag => (
                                <span key={tag} className="px-3 py-1 bg-brand-orange text-white text-xs font-bold rounded-full uppercase tracking-wider">
                                    {tag}
                                </span>
                            ))}
                        </div>
                        <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-4 drop-shadow-lg max-w-4xl">{tour.title}</h1>
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-white/90 font-medium">
                            <span className="flex items-center gap-2"><MapPin className="w-5 h-5 text-brand-orange" /> {tour.location}</span>
                            <span className="flex items-center gap-2"><Clock className="w-5 h-5 text-brand-orange" /> {durationLabel}</span>
                            {rating > 0 && (
                                <span className="flex items-center gap-2"><Star className="w-5 h-5 text-yellow-400 fill-yellow-400" /> {rating} <span className="text-white/70">({reviewCount} {reviewCount === 1 ? "review" : "reviews"})</span></span>
                            )}
                        </div>
                    </Container>
                </div>
            </div>

            {/* Sticky mobile booking bar — hidden on large screens which have the sidebar */}
            <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl px-4 py-3 flex items-center gap-3">
                <div className="flex-1">
                    <p className="text-[11px] uppercase font-bold text-muted-foreground tracking-wide">From</p>
                    <p className="text-xl font-bold font-display text-brand-blue">{formatPrice(tour.price, tour.currency)}<span className="text-xs font-medium text-muted-foreground ml-1">/ person</span></p>
                </div>
                <Button asChild className="h-12 px-7 text-base font-bold bg-brand-orange hover:bg-brand-orange/90 shadow-lg shadow-brand-orange/20 rounded-2xl text-white flex-shrink-0">
                    <Link to="/book" state={booking.bookState}>
                        Book Now
                    </Link>
                </Button>
            </div>

            <Container className="py-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-12">
                    <TourQuickFacts tour={tour} className="-mt-2" />
                    <TourOverview tour={tour} />
                    <TourGallery tour={tour} />
                    <TourInclusions tour={tour} />
                    <TourItinerary tour={tour} />

                    {/* Map */}
                    <section>
                        <SectionHeading>Location</SectionHeading>
                        <TourMap location={tour.location} label={tour.title} />
                    </section>

                    {/* Reviews */}
                    <ReviewSection tourId={tour._id} />
                </div>

                {/* Sidebar Booking Widget */}
                <div className="relative">
                    <TourBookingPanel tour={tour} booking={booking} actions={actions} className="sticky top-28" />
                </div>
            </Container>
        </div>
    );
};

