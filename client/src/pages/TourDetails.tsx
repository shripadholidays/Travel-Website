import { useParams, Link } from "react-router-dom";
import { useTour } from "@/hooks/use-tours";
import { Button } from "@/components/ui/button";
import { Image } from "@/components/ui/image";
import { MapPin, Clock, Star, CheckCircle2, XCircle, Users, Share2, Heart, Minus, Plus, Calendar as CalendarIcon, Moon, Tag, ShieldCheck } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useCurrency } from "@/context/CurrencyContext";
import { TourMap } from "@/components/TourMap";
import { ReviewSection } from "@/components/ReviewSection";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useWishlist, useAddToWishlist, useRemoveFromWishlist } from "@/hooks/use-wishlist";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

import { Container } from "@/components/ui/container";

import { PageTitle } from "@/components/PageTitle";

export const TourDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data, isLoading } = useTour(id!);
    const { formatPrice } = useCurrency();
    const { user } = useAuth();
    const { data: wishlistData } = useWishlist();
    const addToWishlist = useAddToWishlist();
    const removeFromWishlist = useRemoveFromWishlist();
    const [date, setDate] = useState<Date>();
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [guests, setGuests] = useState(2);

    const tour = data?.tour;
    const isWishlisted = !!wishlistData?.wishlist?.tours?.some((t) => t._id === tour?._id);

    const handleShare = async () => {
        const url = window.location.href;
        const shareData = { title: tour?.title ?? 'Wandeazy Tour', text: tour?.title, url };
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(url);
                toast.success('Link copied to clipboard!');
            }
        } catch {
            // user cancelled the share sheet — no-op
        }
    };

    const handleWishlist = () => {
        if (!user) {
            toast.error('Please sign in to save tours.');
            navigate('/login');
            return;
        }
        if (!tour) return;
        if (isWishlisted) {
            removeFromWishlist.mutate(tour._id, {
                onSuccess: () => toast.success('Removed from wishlist.'),
            });
        } else {
            addToWishlist.mutate(tour._id, {
                onSuccess: () => toast.success('Added to wishlist!'),
            });
        }
    };

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
    const totalPrice = tour.price * guests;

    return (
        <div className="bg-background min-h-screen pb-24">
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
                        priceCurrency: 'USD',
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
                                <span className="flex items-center gap-2"><Star className="w-5 h-5 text-yellow-400 fill-yellow-400" /> {rating} <span className="text-white/70">({reviewCount} reviews)</span></span>
                            )}
                        </div>
                    </Container>
                </div>
            </div>

            <Container className="py-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-12">
                    {/* Quick facts strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 -mt-2">
                        <QuickFact icon={Clock} label="Duration" value={`${tour.duration.days} Days`} />
                        <QuickFact icon={Moon} label="Nights" value={`${tour.duration.nights} Nights`} />
                        <QuickFact icon={Star} label="Rating" value={rating > 0 ? `${rating} / 5` : "New"} />
                        <QuickFact icon={Tag} label="Type" value={tags[0] || "Tour"} />
                    </div>

                    {/* Overview */}
                    <section>
                        <SectionHeading>Overview</SectionHeading>
                        <p className="text-lg text-muted-foreground leading-relaxed">
                            {description}
                        </p>
                    </section>

                    {/* Inclusions */}
                    <section>
                        <SectionHeading>What's Included</SectionHeading>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {(tour.inclusions ?? []).map((item, i) => (
                                <li
                                    key={i}
                                    className={cn(
                                        "flex items-center gap-3 p-4 rounded-2xl border transition-colors",
                                        item.included
                                            ? "bg-green-50/50 border-green-100"
                                            : "bg-slate-50 border-slate-100"
                                    )}
                                >
                                    {item.included ? (
                                        <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-green-500" />
                                    ) : (
                                        <XCircle className="w-5 h-5 flex-shrink-0 text-slate-300" />
                                    )}
                                    <span className={cn("font-medium", !item.included && "text-muted-foreground line-through decoration-slate-300")}>
                                        {item.title}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </section>

                    {/* Itinerary */}
                    <section>
                        <SectionHeading
                            aside={
                                <span className="text-sm font-medium text-muted-foreground bg-secondary/60 px-3 py-1.5 rounded-full">
                                    {(tour.itinerary ?? []).length} days
                                </span>
                            }
                        >
                            Itinerary
                        </SectionHeading>
                        <Accordion type="single" collapsible defaultValue="day-1" className="w-full">
                            {(tour.itinerary ?? []).map((item, idx, arr) => {
                                const isLast = idx === arr.length - 1;
                                return (
                                    <AccordionItem key={item.day} value={`day-${item.day}`} className="border-none">
                                        <div className="relative flex gap-5">
                                            {/* Timeline rail + node */}
                                            <div className="flex flex-col items-center pt-5">
                                                <div className="relative z-10 w-11 h-11 shrink-0 rounded-full bg-brand-orange text-white flex flex-col items-center justify-center shadow-md shadow-brand-orange/30">
                                                    <span className="text-[9px] font-bold uppercase leading-none opacity-80">Day</span>
                                                    <span className="text-base font-bold font-display leading-none">{item.day}</span>
                                                </div>
                                                {!isLast && <div className="w-px flex-1 bg-gradient-to-b from-brand-orange/40 to-slate-200 my-1" />}
                                            </div>

                                            {/* Day content */}
                                            <div className={cn("flex-1", !isLast && "pb-2")}>
                                                <AccordionTrigger className="hover:no-underline group/day py-5 [&>svg]:text-muted-foreground">
                                                    <div className="text-left">
                                                        <span className="block font-bold text-lg group-hover/day:text-brand-orange transition-colors">
                                                            {item.location}
                                                        </span>
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6 pr-4">
                                                    {item.activity}
                                                </AccordionContent>
                                            </div>
                                        </div>
                                    </AccordionItem>
                                );
                            })}
                        </Accordion>
                    </section>

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
                    <div className="sticky top-28 bg-white border border-slate-100 rounded-[2rem] p-8 shadow-2xl shadow-brand-blue/5 space-y-6">
                        <div className="flex items-center justify-between pb-6 border-b border-slate-100">
                            <div>
                                <span className="text-sm font-medium text-muted-foreground">Price per person</span>
                                <div className="text-3xl font-bold font-display text-brand-blue">{formatPrice(tour.price)}</div>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleShare}
                                    aria-label="Share tour"
                                    className="rounded-full hover:bg-brand-light hover:text-brand-orange active:scale-95 transition-all"
                                >
                                    <Share2 className="w-5 h-5" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleWishlist}
                                    aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                                    aria-pressed={isWishlisted}
                                    disabled={addToWishlist.isPending || removeFromWishlist.isPending}
                                    className="rounded-full hover:bg-brand-light hover:text-red-500 active:scale-95 transition-all"
                                >
                                    <Heart className={cn("w-5 h-5", isWishlisted && "fill-red-500 text-red-500")} />
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* Date Selection */}
                            <div className="space-y-3">
                                <label className="text-sm font-bold flex items-center gap-2 text-brand-blue"><CalendarIcon className="w-4 h-4 text-brand-orange" /> Select Date</label>
                                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-full h-14 justify-start text-left font-medium text-lg bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700 rounded-2xl",
                                                !date && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {date ? format(date, "PPP") : <span>When do you want to travel?</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={date}
                                            onSelect={(d) => {
                                                setDate(d);
                                                setIsCalendarOpen(false);
                                            }}
                                            initialFocus
                                            disabled={(date) => date < new Date()}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Guest Counter */}
                            <div className="space-y-3">
                                <label className="text-sm font-bold flex items-center gap-2 text-brand-blue"><Users className="w-4 h-4 text-brand-orange" /> Guests</label>
                                <div className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-2xl">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-10 w-10 rounded-xl hover:bg-white hover:shadow-sm disabled:opacity-50"
                                        onClick={() => setGuests(Math.max(1, guests - 1))}
                                        disabled={guests <= 1}
                                    >
                                        <Minus className="w-4 h-4" />
                                    </Button>
                                    <span className="text-xl font-bold w-12 text-center">{guests}</span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-10 w-10 rounded-xl hover:bg-white hover:shadow-sm"
                                        onClick={() => setGuests(guests + 1)}
                                    >
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Total Price Section */}
                            <div className="bg-brand-light/30 p-4 rounded-2xl border border-brand-light/60 space-y-2">
                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                    <span>{formatPrice(tour.price)} × {guests} {guests === 1 ? 'guest' : 'guests'}</span>
                                    <span>{formatPrice(totalPrice)}</span>
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-brand-light/60">
                                    <span className="font-bold text-brand-blue">Total</span>
                                    <span className="text-2xl font-bold font-display text-brand-orange">{formatPrice(totalPrice)}</span>
                                </div>
                            </div>
                        </div>

                        <Button asChild className="w-full h-14 text-lg font-bold bg-brand-orange hover:bg-brand-orange/90 shadow-lg shadow-brand-orange/20 rounded-2xl group relative overflow-hidden text-white">
                            <Link to="/book" state={{ tourId: tour._id, date: date ? format(date, 'yyyy-MM-dd') : '', guests }}>
                                <span className="relative z-10">Book Now</span>
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                            </Link>
                        </Button>

                        <div className="space-y-2 pt-1">
                            <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                                <span>Free cancellation up to 24h before</span>
                            </p>
                            <p className="text-center text-xs text-muted-foreground">
                                You won't be charged yet
                            </p>
                        </div>
                    </div>
                </div>
            </Container>
        </div>
    );
};

const SectionHeading = ({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) => (
    <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
            <span className="w-1.5 h-7 rounded-full bg-brand-orange" />
            <h2 className="text-2xl md:text-3xl font-display font-bold text-brand-blue">{children}</h2>
        </div>
        {aside}
    </div>
);

const QuickFact = ({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) => (
    <div className="flex items-center gap-3 bg-white border border-slate-100 rounded-2xl p-3.5 shadow-sm">
        <div className="w-9 h-9 rounded-xl bg-brand-orange/10 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-brand-orange" />
        </div>
        <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
            <p className="text-sm font-bold text-brand-blue truncate">{value}</p>
        </div>
    </div>
);
