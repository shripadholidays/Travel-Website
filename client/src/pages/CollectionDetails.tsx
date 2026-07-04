import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useCollection } from "@/hooks/use-collections";
import { TourCard } from "@/components/TourCard";
import { Image } from "@/components/ui/image";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { PageTitle } from "@/components/PageTitle";
import { Container } from "@/components/ui/container";

export const CollectionDetails = () => {
    const { slug } = useParams();
    const { data, isLoading } = useCollection(slug!);
    const collection = data?.collection;
    const tours = collection?.tours ?? [];

    if (isLoading) {
        return (
            <div className="bg-background min-h-screen flex items-center justify-center">
                <Spinner label="Loading collection…" />
            </div>
        );
    }

    if (!collection) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
                <PageTitle title="Collection Not Found" noIndex />
                <h2 className="text-3xl font-display font-bold mb-4">Collection not found</h2>
                <p className="text-muted-foreground mb-8">This collection may have been moved or removed.</p>
                <Button variant="brand" asChild><Link to="/collections">View all collections</Link></Button>
            </div>
        );
    }

    return (
        <div className="bg-background min-h-screen pb-24">
            <PageTitle
                title={collection.name}
                description={collection.description}
                image={collection.coverImage}
            />

            {/* Hero */}
            <div className="relative h-[50vh] min-h-[340px] w-full overflow-hidden">
                <Image src={collection.coverImage} alt={collection.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/30" />

                <div className="absolute top-0 left-0 w-full pt-28 z-20">
                    <Container>
                        <Link to="/collections" className="inline-block">
                            <Button variant="ghost" className="group bg-white/10 backdrop-blur-md hover:bg-white/20 text-white border border-white/20 rounded-full pl-5 pr-7 py-6 transition-all">
                                <ArrowLeft className="w-5 h-5 mr-3 group-hover:-translate-x-1 transition-transform" />
                                <span className="font-bold tracking-wide">All Collections</span>
                            </Button>
                        </Link>
                    </Container>
                </div>

                <div className="absolute inset-x-0 bottom-0 pb-10 z-20">
                    <Container>
                        <span className="text-xs font-bold uppercase tracking-wider text-white bg-brand-orange px-3 py-1 rounded-full inline-block mb-4">
                            {tours.length} {tours.length === 1 ? "Tour" : "Tours"}
                        </span>
                        <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-3 drop-shadow-lg">{collection.name}</h1>
                        <p className="text-lg text-white/90 max-w-2xl drop-shadow-md">{collection.description}</p>
                    </Container>
                </div>
            </div>

            <Container className="py-12">
                {tours.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {tours.map((tour) => (
                            <TourCard key={tour._id} tour={tour} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 px-6 bg-gradient-to-br from-secondary/40 to-secondary/10 rounded-[2rem] border border-slate-100">
                        <div className="w-16 h-16 rounded-full bg-brand-orange/10 flex items-center justify-center mx-auto mb-5">
                            <Sparkles className="w-8 h-8 text-brand-orange" />
                        </div>
                        <h3 className="text-2xl font-display font-bold mb-2">No tours in this collection yet</h3>
                        <p className="text-muted-foreground max-w-md mx-auto mb-6">We're curating the perfect experiences for this collection. Check back soon.</p>
                        <Button variant="brand" asChild><Link to="/tours">Browse all tours</Link></Button>
                    </div>
                )}
            </Container>
        </div>
    );
};
