import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import { TourCard } from "@/components/TourCard";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export const RecentlyViewedTours = () => {
    const { tours, clearAll } = useRecentlyViewed();

    if (tours.length === 0) return null;

    return (
        <section className="py-16 bg-slate-50/60">
            <Container>
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-brand-orange mb-1">Continue Exploring</p>
                        <h2 className="text-3xl font-display font-bold text-brand-blue">Recently viewed</h2>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAll}
                        className="text-muted-foreground hover:text-foreground gap-1.5"
                    >
                        <X className="w-3.5 h-3.5" /> Clear
                    </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tours.map((tour) => (
                        <TourCard key={tour._id} tour={tour} />
                    ))}
                </div>
            </Container>
        </section>
    );
};
