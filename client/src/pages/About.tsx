import { Link } from "react-router-dom";
import { resolveIcon } from "@/lib/icons";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/PageTitle";
import { usePublicSettings, useHighlights, liveStats, type AboutValue } from "@/hooks/use-settings";

const FALLBACK_VALUES: AboutValue[] = [
    { icon: "Globe2", title: "Global Reach", description: "Hand-picked experiences in destinations around the world." },
    { icon: "ShieldCheck", title: "Travel With Confidence", description: "Secure payments, trusted local partners and clear cancellation terms." },
    { icon: "Heart", title: "Crafted With Care", description: "Every itinerary is curated by travel specialists, not algorithms." },
    { icon: "Users", title: "Real Support", description: "A real team that answers every message within 24 hours." },
];

export const AboutPage = () => {
    const { data } = usePublicSettings();
    const about = data?.settings?.aboutPage;
    const { data: highlights } = useHighlights();

    const heroImage = about?.heroImage || "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1600&q=80";
    const heroHeadline = about?.heroHeadline || "We turn wanderlust into unforgettable journeys";
    const heroSubtext = about?.heroSubtext || "Wandeazy was born from a simple belief: extraordinary travel should be effortless, personal, and within reach for everyone.";
    const storyParagraph1 = about?.storyParagraph1 || "Wandeazy puts together tours to destinations around the world and lets you book them online in a few steps, with secure payment and free cancellation up to 24 hours before departure.";
    const storyParagraph2 = about?.storyParagraph2 || "Every tour page shows the day-by-day itinerary and exactly what is and isn't included, so you know what you are booking. Want something different? Tell us and we'll plan a custom trip with you.";
    // Admin-written stats win; otherwise real numbers, never made-up ones
    const stats = (about?.stats?.length ?? 0) > 0 ? about!.stats : liveStats(highlights?.stats);
    const values = (about?.values?.length ?? 0) > 0 ? about!.values : FALLBACK_VALUES;
    const ctaHeading = about?.ctaHeading || "Ready to start your journey?";
    const ctaSubtext = about?.ctaSubtext || "Browse our curated tours or tell us about your dream trip — we'll handle the rest.";
    const ctaBtn1Label = about?.ctaBtn1Label || "Explore Tours";
    const ctaBtn1Link = about?.ctaBtn1Link || "/tours";
    const ctaBtn2Label = about?.ctaBtn2Label || "Plan My Trip";
    const ctaBtn2Link = about?.ctaBtn2Link || "/contact?topic=trip";

    return (
        <div className="bg-background min-h-screen">
            <PageTitle
                title="About Us"
                description="Who Wandeazy is, how we put together our tours and what you can expect when you book a trip with us."
            />

            {/* Hero */}
            <div className="relative h-[50vh] min-h-[360px] w-full overflow-hidden">
                <img src={heroImage} alt="Travelers exploring the world" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
                <Container className="absolute inset-0 flex flex-col justify-center">
                    <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-4 max-w-3xl">{heroHeadline}</h1>
                    <p className="text-lg text-white/80 max-w-2xl">{heroSubtext}</p>
                </Container>
            </div>

            <Container className="py-16 md:py-24 space-y-20">
                {/* Story */}
                <section className="max-w-3xl mx-auto text-center">
                    <h2 className="text-3xl font-display font-bold mb-6">Our Story</h2>
                    <p className="text-lg text-muted-foreground leading-relaxed mb-4">{storyParagraph1}</p>
                    {storyParagraph2 && (
                        <p className="text-lg text-muted-foreground leading-relaxed">{storyParagraph2}</p>
                    )}
                </section>

                {/* Stats */}
                {stats.length > 0 && (
                    <section className="flex flex-wrap justify-center gap-x-16 gap-y-8 text-center">
                        {stats.map((s) => (
                            <div key={s.label} className="min-w-[8rem]">
                                <div className="text-4xl md:text-5xl font-display font-bold text-brand-orange tabular-nums">{s.value}</div>
                                <div className="text-sm text-muted-foreground mt-2">{s.label}</div>
                            </div>
                        ))}
                    </section>
                )}

                {/* Values */}
                <section>
                    <h2 className="text-3xl font-display font-bold text-center mb-12">Why Travel With Us</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {values.map((v) => {
                            const Icon = resolveIcon(v.icon);
                            return (
                                <div key={v.title} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-shadow">
                                    <div className="w-12 h-12 rounded-xl bg-brand-orange/10 flex items-center justify-center mb-4">
                                        <Icon className="w-6 h-6 text-brand-orange" />
                                    </div>
                                    <h3 className="font-bold text-lg mb-2">{v.title}</h3>
                                    <p className="text-muted-foreground text-sm">{v.description}</p>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* CTA */}
                <section className="bg-brand-blue rounded-[2.5rem] p-10 md:p-16 text-center text-white">
                    <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">{ctaHeading}</h2>
                    <p className="text-white/70 mb-8 max-w-xl mx-auto">{ctaSubtext}</p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button variant="brand" size="lg" asChild>
                            <Link to={ctaBtn1Link}>{ctaBtn1Label}</Link>
                        </Button>
                        <Button variant="glass" size="lg" asChild>
                            <Link to={ctaBtn2Link}>{ctaBtn2Label}</Link>
                        </Button>
                    </div>
                </section>
            </Container>
        </div>
    );
};
