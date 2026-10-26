import { useCollections } from "@/hooks/use-collections";
import { Image } from "@/components/ui/image";
import { ArrowRight, Compass } from "lucide-react";
import { Link } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/PageTitle";
import { collectionPath, graph, itemListJsonLd } from "@/lib/seo";

import { Container } from "@/components/ui/container";

export const CollectionsPage = () => {
    const { data, isLoading, isError, refetch } = useCollections();
    const collections = data?.collections ?? [];

    if (isLoading) {
        return (
            <div className="pt-24 pb-12 bg-background min-h-screen flex items-center justify-center">
                <Spinner label="Loading collections..." />
            </div>
        );
    }

    return (
        <div className="pt-24 pb-12 bg-background min-h-screen">
            <PageTitle
                title="Tour Collections by Travel Style"
                description="Hand-picked Wandeazy tour collections grouped by travel style, such as beach getaways, adventure and trekking, culture, luxury and honeymoons."
                jsonLd={collections.length > 0 ? graph(itemListJsonLd(collections.map((c) => ({ name: c.name, path: collectionPath(c) })))) : undefined}
            />
            <Container>
                <h1 className="text-4xl md:text-6xl font-display font-bold text-center mb-6">Our Collections</h1>
                <p className="text-lg text-muted-foreground text-center max-w-2xl mx-auto mb-16">
                    Hand-picked experiences for every type of traveler. Whether you seek luxury, adventure, or relaxation, we have curated the perfect journey for you.
                </p>

                {isError ? (
                    <div className="text-center py-20">
                        <h3 className="text-xl font-bold mb-2">Couldn't load collections</h3>
                        <p className="text-muted-foreground mb-4">Please try again in a moment.</p>
                        <Button variant="brand" onClick={() => refetch()}>Retry</Button>
                    </div>
                ) : collections.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground">
                        <Compass className="w-12 h-12 mx-auto mb-4 text-brand-orange" />
                        <h3 className="text-xl font-bold mb-2">No collections yet</h3>
                        <p className="mb-4">Check back soon for curated travel collections.</p>
                        <Button variant="brand" asChild><Link to="/tours">Browse all tours</Link></Button>
                    </div>
                ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {collections.map((item) => (
                        <div key={item._id} className="group relative h-[400px] rounded-[2.5rem] overflow-hidden border border-border shadow-sm hover:shadow-2xl transition-all duration-500">
                            <Image
                                src={item.coverImage}
                                alt={item.name}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-tr from-black/80 via-black/20 to-transparent z-10" />

                            <div className="absolute bottom-0 left-0 p-10 z-20 w-full">
                                <h2 className="text-3xl font-display font-bold text-white mb-3">{item.name}</h2>
                                <p className="text-white/80 mb-6 max-w-md">{item.description}</p>

                                <Link
                                    to={`/collections/${item.slug}`}
                                    className="inline-flex items-center gap-2 text-white font-medium hover:gap-4 transition-all"
                                >
                                    Explore Collection <ArrowRight className="w-5 h-5" />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
                )}
            </Container>
        </div>
    )
}
