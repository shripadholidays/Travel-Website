import { Link } from "react-router-dom";
import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/PageTitle";
import { usePublicSettings, type AboutStat, type AboutValue } from "@/hooks/use-settings";

function resolveIcon(name: string): LucideIcon {
    return (LucideIcons as unknown as Record<string, LucideIcon>)[name] || LucideIcons.HelpCircle;
}

const FALLBACK_STATS: AboutStat[] = [
    { value: "120k+", label: "Happy travelers" },
    { value: "500+", label: "Curated tours" },
    { value: "50+", label: "Destinations" },
    { value: "4.9/5", label: "Average rating" },
];

const FALLBACK_VALUES: AboutValue[] = [
    { icon: "Globe2", title: "Global Reach", description: "Hand-picked experiences across 50+ countries and counting." },
    { icon: "ShieldCheck", title: "Travel With Confidence", description: "Secure payments, verified partners, and free cancellation on most tours." },
    { icon: "Heart", title: "Crafted With Care", description: "Every itinerary is curated by travel specialists, not algorithms." },
    { icon: "Users", title: "Real Support", description: "A dedicated team available around the clock, wherever you roam." },
];

export const AboutPage = () => {
    const { data } = usePublicSettings();
    const about = data?.settings?.aboutPage;

    const heroImage = about?.heroImage || "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1600&q=80";
    const heroHeadline = about?.heroHeadline || "We turn wanderlust into unforgettable journeys";
    const heroSubtext = about?.heroSubtext || "Wandeazy was born from a simple belief: extraordinary travel should be effortless, personal, and within reach for everyone.";
    const storyParagraph1 = about?.storyParagraph1 || "What started as a small group of travel obsessives sketching itineraries on napkins has grown into a platform trusted by travelers worldwide. We've walked the trails, tasted the food, and slept under the stars — so we know exactly what makes a trip worth taking.";
    const storyParagraph2 = about?.storyParagraph2 || "Today, we partner with the best local operators on the planet to bring you experiences that are authentic, responsible, and unforgettable.";
    const stats = (about?.stats?.length ?? 0) > 0 ? about!.stats : FALLBACK_STATS;
    const values = (about?.values?.length ?? 0) > 0 ? about!.values : FALLBACK_VALUES;
    const ctaHeading = about?.ctaHeading || "Ready to start your journey?";
    const ctaSubtext = about?.ctaSubtext || "Browse our curated tours or tell us about your dream trip — we'll handle the rest.";
    const ctaBtn1Label = about?.ctaBtn1Label || "Explore Tours";
    const ctaBtn1Link = about?.ctaBtn1Link || "/tours";
    const ctaBtn2Label = about?.ctaBtn2Label || "Plan My Trip";
    const ctaBtn2Link = about?.ctaBtn2Link || "/contact";

    return (
        <div className="bg-background min-h-screen">
            <PageTitle
                title="About Us"
                description="Learn about Wandeazy — our mission to craft unforgettable, hassle-free travel experiences around the world."
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
                <section className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    {stats.map((s) => (
                        <div key={s.label}>
                            <div className="text-4xl md:text-5xl font-display font-bold text-brand-orange">{s.value}</div>
                            <div className="text-sm text-muted-foreground mt-2">{s.label}</div>
                        </div>
                    ))}
                </section>

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
