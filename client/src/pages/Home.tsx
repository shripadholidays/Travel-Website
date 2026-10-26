import { Hero } from "@/components/home/Hero";
import { DestinationsGrid } from "@/components/home/DestinationsGrid";
import { FeaturedTours } from "@/components/home/FeaturedTours";
import { PromotionalCarousel } from "@/components/home/PromotionalCarousel";
import { Collections } from "@/components/home/Collections";
import { PlanTrip } from "@/components/home/PlanTrip";
import { SupportSection } from "@/components/home/SupportSection";
import { Testimonials } from "@/components/home/Testimonials";
import { FaqSection } from "@/components/home/FaqSection";
import { RecentlyViewedTours } from "@/components/home/RecentlyViewedTours";
import { PageTitle } from "@/components/PageTitle";
import { graph, websiteJsonLd } from "@/lib/seo";
import { FeatureGate } from "@/components/FeatureGate";
import { TravelSearchTabs } from "@/components/home/TravelSearchTabs";

export const Home = () => {
    return (
        <div className="bg-background min-h-screen">
            <PageTitle
                title="Curated Tours & Holiday Packages"
                description="Browse curated tours and holiday packages to destinations worldwide with Wandeazy. Compare day-by-day itineraries and inclusions, then book online securely."
                jsonLd={graph(websiteJsonLd())}
            />
            <h1 className="sr-only">Wandeazy: curated tours and holiday packages worldwide</h1>
            <Hero />
            <FeatureGate any>
                <TravelSearchTabs />
            </FeatureGate>
            <DestinationsGrid />
            <PromotionalCarousel />
            <Collections />
            <FeaturedTours />
            <RecentlyViewedTours />
            <PlanTrip />
            <Testimonials />
            <FaqSection />
            <SupportSection />
        </div>
    );
};
