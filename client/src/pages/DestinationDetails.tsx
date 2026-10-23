import { useParams, Link } from "react-router-dom";
import { useDestination } from "@/hooks/use-destinations";
import { useTours } from "@/hooks/use-tours";
import { TourCard } from "@/components/TourCard";
import { TourMap } from "@/components/TourMap";
import { Image } from "@/components/ui/image";
import { Button } from "@/components/ui/button";
import {
    ArrowLeft, MapPin, Star, Compass, Globe2, CalendarRange,
    Camera, Utensils, Mountain, Building2, Sparkles, Flag, MessageCircle,
    Waves, Heart, Gem, Sun, Landmark, type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { Spinner } from "@/components/ui/spinner";
import { PageTitle } from "@/components/PageTitle";
import type { Destination, Tour } from "@/types";

import { Container } from "@/components/ui/container";

// Icons for trip styles, used when a destination's "why visit" cards come from its tours
const STYLE_ICONS: Record<string, LucideIcon> = {
    beach: Waves, relaxation: Sun, adventure: Mountain, trekking: Mountain, nature: Mountain,
    culture: Landmark, history: Landmark, city: Building2, food: Utensils, culinary: Utensils,
    luxury: Gem, romance: Heart, honeymoon: Heart, photography: Camera,
};
const HIGHLIGHT_ICONS = [Camera, Utensils, Mountain, Building2];

type Highlight = { icon: LucideIcon; title: string; text: string };

/** Written highlights first; otherwise the trip styles real tours here cover; otherwise none. */
function buildHighlights(destination: Destination, tours: Tour[], shortName: string): Highlight[] {
    if (destination.highlights?.length) {
        return destination.highlights.map((h, i) => ({ icon: HIGHLIGHT_ICONS[i % HIGHLIGHT_ICONS.length], title: h.title, text: h.text }));
    }
    const counts = new Map<string, number>();
    tours.forEach((t) => t.categories?.forEach((c) => counts.set(c, (counts.get(c) || 0) + 1)));
    return [...counts].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([style, n]) => ({
        icon: STYLE_ICONS[style.toLowerCase()] ?? Sparkles,
        title: style,
        text: n === tours.length
            ? (n === 1
                ? `Our ${shortName} tour includes ${style.toLowerCase()} experiences.`
                : `All ${n} of our ${shortName} tours include ${style.toLowerCase()} experiences.`)
            : `${n} of our ${tours.length} ${shortName} tours focus on ${style.toLowerCase()}.`,
    }));
}

export const DestinationDetails = () => {
    const { slug } = useParams();
    const { data: destData, isLoading } = useDestination(slug!);
    const destination = destData?.destination;

    // Same matching rule as the tour count on destination cards
    const { data: toursData } = useTours({ destination: slug, limit: 12 }, { enabled: !!slug });
    const destinationTours = toursData?.tours ?? [];

    if (isLoading) {
        return (
            <div className="bg-background min-h-screen flex items-center justify-center">
                <Spinner label="Loading destination…" />
            </div>
        );
    }

    if (!destination) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
                <PageTitle title="Destination Not Found" noIndex />
                <h2 className="text-3xl font-display font-bold mb-4">Destination not found</h2>
                <p className="text-muted-foreground mb-8">This destination may have been moved or removed.</p>
                <Button variant="brand" asChild><Link to="/destinations">Explore Destinations</Link></Button>
            </div>
        );
    }

    const shortName = destination.name.split(',')[0];
    const galleryImages = (destination.images?.length ? destination.images : [destination.coverImage]).slice(0, 4);
    const highlights = buildHighlights(destination, destinationTours, shortName);
    const askLink = `/contact?topic=trip&about=${encodeURIComponent(shortName)}&source=destination`;
    const toursLink = `/tours?place=${encodeURIComponent(destination.country || shortName)}`;

    return (
        <div className="bg-background min-h-screen pb-24">
            <PageTitle
                title={destination.name}
                description={destination.description?.slice(0, 160)}
                image={destination.coverImage}
                jsonLd={{
                    '@context': 'https://schema.org',
                    '@type': 'TouristDestination',
                    name: destination.name,
                    description: destination.description?.slice(0, 200),
                    image: destination.coverImage,
                    address: {
                        '@type': 'PostalAddress',
                        addressCountry: destination.country,
                    },
                }}
            />

            {/* Hero */}
            <div className="relative h-[70vh] min-h-[440px] md:h-[78vh] md:min-h-[560px] w-full overflow-hidden">
                <Image src={destination.coverImage} alt={destination.name} className="w-full h-full object-cover" />
                {/* Smooth dark scrim — darkens top (navbar) and bottom (text), clears the middle */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent" />
                <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/95 via-black/55 to-transparent" />

                {/* Hero content */}
                <div className="absolute inset-x-0 bottom-0 pb-16 md:pb-20 z-10">
                    <Container>
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7 }}
                            className="max-w-3xl"
                        >
                            <Link
                                to="/destinations"
                                className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm font-medium mb-5 transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" /> Back to Destinations
                            </Link>

                            <div className="flex flex-wrap items-center gap-2 mb-4">
                                <span className="inline-flex items-center gap-1.5 bg-brand-orange text-white text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full">
                                    <MapPin className="w-3.5 h-3.5" /> {destination.country}
                                </span>
                                <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full">
                                    <Globe2 className="w-3.5 h-3.5" /> {destination.continent}
                                </span>
                            </div>

                            <h1 className="text-5xl md:text-7xl font-display font-bold text-white mb-4 leading-[0.95] drop-shadow-2xl">
                                {shortName}
                            </h1>
                            <p className="text-lg md:text-xl text-white/90 max-w-2xl leading-relaxed drop-shadow-md">
                                {destination.description}
                            </p>

                            {/* Stat chips */}
                            <div className="flex flex-wrap gap-3 mt-7">
                                <HeroStat icon={Compass} value={destination.tourCount ? String(destination.tourCount) : "Soon"} label={destination.tourCount === 1 ? "Tour" : "Tours"} />
                                {destination.rating > 0 && (
                                    <HeroStat icon={Star} value={destination.rating.toFixed(1)} label="Avg rating" starred />
                                )}
                                <HeroStat icon={Globe2} value={destination.continent} label="Region" />
                            </div>
                        </motion.div>
                    </Container>
                </div>
            </div>

            {/* Content sheet pulls up over the hero for a clean transition */}
            <div className="relative z-10 -mt-8 rounded-t-[2.5rem] bg-background">
            <Container className="pt-14 pb-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-14">
                    {/* Why visit / highlights */}
                    {highlights.length > 0 && (
                    <section>
                        <SectionHeading>Why Visit {shortName}</SectionHeading>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {highlights.map((h) => {
                                const Icon = h.icon;
                                return (
                                    <div key={h.title} className="flex gap-4 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-shadow">
                                        <div className="w-11 h-11 shrink-0 rounded-xl bg-brand-orange/10 flex items-center justify-center">
                                            <Icon className="w-5 h-5 text-brand-orange" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold mb-1">{h.title}</h3>
                                            {h.text && <p className="text-sm text-muted-foreground leading-relaxed">{h.text}</p>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                    )}

                    {/* Gallery */}
                    {galleryImages.length > 1 && (
                        <section>
                            <SectionHeading>Gallery</SectionHeading>
                            <div className="grid grid-cols-2 gap-4">
                                {galleryImages.map((img, i) => (
                                    <div
                                        key={i}
                                        className={`relative overflow-hidden rounded-2xl group ${i === 0 ? "col-span-2 h-[260px]" : "h-[180px]"}`}
                                    >
                                        <Image src={img} alt={`${shortName} ${i + 1}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Tours */}
                    <section>
                        <SectionHeading
                            aside={
                                destinationTours.length > 0 ? (
                                    <span className="text-sm font-medium text-muted-foreground bg-secondary/60 px-3 py-1.5 rounded-full">
                                        {destinationTours.length} {destinationTours.length === 1 ? "experience" : "experiences"}
                                    </span>
                                ) : undefined
                            }
                        >
                            Top Tours in {shortName}
                        </SectionHeading>

                        {destinationTours.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {destinationTours.map((tour) => (
                                    <TourCard key={tour._id} tour={tour} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16 px-6 bg-gradient-to-br from-secondary/40 to-secondary/10 rounded-[2rem] border border-slate-100">
                                <div className="w-16 h-16 rounded-full bg-brand-orange/10 flex items-center justify-center mx-auto mb-5">
                                    <Sparkles className="w-8 h-8 text-brand-orange" />
                                </div>
                                <h3 className="text-2xl font-display font-bold mb-2">New tours coming soon</h3>
                                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                                    We're hand-crafting unforgettable experiences in {shortName}. In the meantime,
                                    explore our full collection of curated tours.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                    <Button variant="brand" asChild><Link to="/tours">Browse All Tours</Link></Button>
                                    <Button variant="outline" asChild><Link to={askLink}>Plan a Custom Trip</Link></Button>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Map */}
                    <section>
                        <SectionHeading>On the Map</SectionHeading>
                        <TourMap location={`${shortName}, ${destination.country}`} label={shortName} />
                    </section>
                </div>

                {/* Sidebar — sticky info card (mirrors the tour booking widget) */}
                <div className="relative">
                    <div className="sticky top-28 space-y-6">
                        <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-2xl shadow-brand-blue/5 space-y-6">
                            <div className="pb-6 border-b border-slate-100">
                                <span className="text-sm font-medium text-muted-foreground">Destination</span>
                                <h3 className="text-2xl font-bold font-display text-brand-blue">{shortName}</h3>
                                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                                    <MapPin className="w-4 h-4 text-brand-orange" /> {destination.country}, {destination.continent}
                                </p>
                            </div>

                            {/* Key facts */}
                            <div className="space-y-3">
                                <InfoRow icon={Compass} label="Available tours" value={destination.tourCount ? String(destination.tourCount) : "Coming soon"} />
                                {destination.rating > 0 && (
                                    <InfoRow icon={Star} label="Average rating" value={`${destination.rating.toFixed(1)} / 5`} starred />
                                )}
                                {destination.bestTimeToVisit && (
                                    <InfoRow icon={CalendarRange} label="Best time to visit" value={destination.bestTimeToVisit} />
                                )}
                                <InfoRow icon={Globe2} label="Region" value={destination.continent} />
                                <InfoRow icon={Flag} label="Country" value={destination.country} />
                            </div>

                            {/* CTA */}
                            <Button asChild className="w-full h-14 text-base font-bold bg-brand-orange hover:bg-brand-orange/90 shadow-lg shadow-brand-orange/20 rounded-2xl">
                                <Link to={destinationTours.length > 0 ? toursLink : askLink}>
                                    {destinationTours.length > 0 ? "View All Tours" : "Plan Your Trip"}
                                </Link>
                            </Button>

                            <Button asChild variant="outline" className="w-full h-12 rounded-2xl">
                                <Link to={askLink} className="flex items-center justify-center gap-2">
                                    <MessageCircle className="w-4 h-4" /> Ask a Specialist
                                </Link>
                            </Button>

                            <p className="text-center text-xs text-muted-foreground">
                                Secure checkout · Replies within 24 hours
                            </p>
                        </div>
                    </div>
                </div>
            </Container>

            {/* Plan trip CTA banner */}
            <Container className="pb-4">
                <section className="relative overflow-hidden rounded-[2.5rem] bg-brand-blue p-10 md:p-14 text-center">
                    <div className="absolute -top-16 -right-16 w-64 h-64 bg-brand-orange/20 rounded-full blur-3xl" />
                    <div className="relative">
                        <CalendarRange className="w-10 h-10 text-brand-orange mx-auto mb-4" />
                        <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-3">
                            Ready to explore {shortName}?
                        </h2>
                        <p className="text-white/70 max-w-xl mx-auto mb-8">
                            Tell us your dates and interests — our travel specialists will craft the perfect itinerary just for you.
                        </p>
                        <Button variant="brand" size="lg" asChild>
                            <Link to={askLink}>Start Planning</Link>
                        </Button>
                    </div>
                </section>
            </Container>
            </div>
        </div>
    );
};

const InfoRow = ({ icon: Icon, label, value, starred }: { icon: typeof Compass; label: string; value: string; starred?: boolean }) => (
    <div className="flex items-center justify-between">
        <span className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <Icon className={`w-4 h-4 ${starred ? "text-yellow-400 fill-yellow-400" : "text-brand-orange"}`} />
            {label}
        </span>
        <span className="font-bold text-sm text-brand-blue">{value}</span>
    </div>
);

const HeroStat = ({ icon: Icon, value, label, starred }: { icon: typeof Compass; value: string; label: string; starred?: boolean }) => (
    <div className="flex items-center gap-2.5 bg-black/30 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-2.5 shadow-lg">
        <Icon className={`w-5 h-5 ${starred ? "text-yellow-400 fill-yellow-400" : "text-brand-orange"}`} />
        <div className="text-left leading-tight">
            <p className="text-white font-bold text-sm">{value}</p>
            <p className="text-white/70 text-[11px] uppercase tracking-wide">{label}</p>
        </div>
    </div>
);

const SectionHeading = ({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) => (
    <div className="flex items-center justify-between mb-7">
        <div className="flex items-center gap-3">
            <span className="w-1.5 h-7 rounded-full bg-brand-orange" />
            <h2 className="text-2xl md:text-3xl font-display font-bold text-brand-blue">{children}</h2>
        </div>
        {aside}
    </div>
);
