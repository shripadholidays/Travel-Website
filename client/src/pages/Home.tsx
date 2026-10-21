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
import { FeatureGate } from "@/components/FeatureGate";
import { TravelSearchTabs } from "@/components/home/TravelSearchTabs";

export const Home = () => {
    return (
        <div className="bg-background min-h-screen">
            <PageTitle
                title="Premium Travel & Tour Booking"
                description="Plan your dream trip with Wandeazy. Browse curated tours and breathtaking destinations worldwide, compare deals, and book unforgettable travel experiences with ease."
                jsonLd={{
                    '@context': 'https://schema.org',
                    '@type': 'WebSite',
                    name: 'Wandeazy',
                    url: 'https://wandeazy.com',
                    potentialAction: {
                        '@type': 'SearchAction',
                        target: 'https://wandeazy.com/tours?q={search_term_string}',
                        'query-input': 'required name=search_term_string',
                    },
                }}
            />
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
