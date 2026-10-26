import { useState } from "react";
import { useDestinations } from "@/hooks/use-destinations";
import { DestinationCard } from "@/components/DestinationCard";
import { Search, Globe2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { PageTitle } from "@/components/PageTitle";
import { destinationPath, graph, itemListJsonLd } from "@/lib/seo";

import { Container } from "@/components/ui/container";

export const DestinationsPage = () => {
    const { data, isLoading, isError, refetch } = useDestinations();
    const [query, setQuery] = useState("");
    const destinations = data?.destinations ?? [];

    const filtered = destinations.filter((d) => {
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return (
            d.name?.toLowerCase().includes(q) ||
            d.country?.toLowerCase().includes(q) ||
            d.continent?.toLowerCase().includes(q)
        );
    });

    if (isLoading) {
        return (
            <div className="pt-24 pb-12 bg-background min-h-screen flex items-center justify-center">
                <Spinner label="Loading destinations..." />
            </div>
        );
    }

    return (
        <div className="pt-24 pb-12 bg-background min-h-screen">
            <PageTitle
                title="Travel Destinations Worldwide"
                description="Explore Wandeazy travel destinations around the world, each with its highlights, best time to visit and the tours you can book there."
                jsonLd={destinations.length > 0 ? graph(itemListJsonLd(destinations.map((d) => ({ name: d.name, path: destinationPath(d) })))) : undefined}
            />
            <Container>
                <h1 className="text-4xl md:text-6xl font-display font-bold text-center mb-6">Explore the World</h1>
                <p className="text-lg text-muted-foreground text-center max-w-2xl mx-auto mb-10">
                    From iconic landmarks to hidden gems, discover the destinations that inspire wanderlust.
                </p>

                {/* Search */}
                <div className="relative max-w-md mx-auto mb-12">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    <Input
                        placeholder="Search by name, country, or region..."
                        className="pl-10 h-12 rounded-xl"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        aria-label="Search destinations"
                    />
                </div>

                {isError ? (
                    <div className="text-center py-20">
                        <h3 className="text-xl font-bold mb-2">Couldn't load destinations</h3>
                        <p className="text-muted-foreground mb-4">Please try again in a moment.</p>
                        <Button variant="brand" onClick={() => refetch()}>Retry</Button>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground">
                        <Globe2 className="w-12 h-12 mx-auto mb-4 text-brand-orange" />
                        <h3 className="text-xl font-bold mb-2">
                            {query ? "No destinations match your search" : "No destinations yet"}
                        </h3>
                        <p className="mb-4">
                            {query ? "Try a different search term." : "Check back soon for new destinations."}
                        </p>
                        {query ? (
                            <Button variant="outline" onClick={() => setQuery("")}>Clear search</Button>
                        ) : (
                            <Button variant="brand" asChild><Link to="/tours">Browse tours</Link></Button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-[300px]">
                        {filtered.map((dest) => (
                            <DestinationCard key={dest._id} dest={dest} />
                        ))}
                    </div>
                )}
            </Container>
        </div>
    );
};
