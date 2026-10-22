import { useState, useEffect, useMemo } from "react";
import { Search, MapPin, ArrowUpRight, Clock, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { useTours } from "@/hooks/use-tours";
import { useDestinations } from "@/hooks/use-destinations";
import { Image } from "@/components/ui/image";
import { useTourModal } from "@/hooks/use-tour-modal";

export const SearchDialog = () => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const { openTour } = useTourModal();
    const navigate = useNavigate();

    // Fetch all tours and destinations once for instant client-side filtering
    const { data: toursData } = useTours({ limit: 100 });
    const { data: destinationsData } = useDestinations();

    const allTours = toursData?.tours ?? [];
    const allDestinations = destinationsData?.destinations ?? [];

    // Live filtering
    const filteredTours = useMemo(() => {
        if (!query) return [];
        const q = query.toLowerCase();
        return allTours
            .filter(t => t.title.toLowerCase().includes(q) || t.location.toLowerCase().includes(q))
            .slice(0, 3);
    }, [query, allTours]);

    const filteredDestinations = useMemo(() => {
        if (!query) return [];
        const q = query.toLowerCase();
        return allDestinations
            .filter(d => d.name.toLowerCase().includes(q))
            .slice(0, 2);
    }, [query, allDestinations]);

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "/" && !open) {
                e.preventDefault();
                setOpen(true);
            }
        };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, [open]);

    const handleSelect = (path: string) => {
        setOpen(false);
        navigate(path);
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setOpen(false);
        navigate(`/tours?q=${query}`);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button
                    aria-label="Search"
                    className="flex items-center justify-center rounded-full w-9 h-9 border border-current/15 text-current hover:bg-current/10 hover:scale-105 active:scale-95 transition-all"
                >
                    <Search className="w-[18px] h-[18px]" />
                </button>
            </DialogTrigger>
            {/* Command Palette Style: Top-aligned, no border, glass effect */}
            <DialogContent className="fixed top-[20%] left-[50%] translate-y-0 sm:max-w-3xl p-0 gap-0 bg-white/95 backdrop-blur-2xl border-white/20 shadow-2xl overflow-hidden rounded-3xl z-[100] data-[state=open]:slide-in-from-top-[10%]">
                <DialogTitle className="sr-only">Search</DialogTitle>

                {/* Search Header */}
                <form onSubmit={handleSearchSubmit} className="relative flex items-center px-8 py-8 border-b border-brand-blue/5">
                    <Search className="w-7 h-7 text-brand-orange mr-6" />
                    <input
                        placeholder="Where to next?"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="flex-1 bg-transparent border-none text-3xl font-display font-bold text-brand-blue placeholder:text-brand-blue/20 focus:outline-none focus:ring-0"
                        autoFocus
                    />
                    <div className="hidden sm:flex items-center gap-2">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-brand-orange">
                            ESC
                        </Button>
                    </div>
                </form>

                {/* Results Area */}
                <div className="max-h-[60vh] overflow-y-auto px-2 py-2">
                    {!query ? (
                        <div className="p-4">
                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 px-2">Trending Destinations</h4>
                            <div className="flex flex-wrap gap-2">
                                {["Bali", "Japan", "Italy", "Swiss Alps", "Safari"].map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => { setQuery(tag); }}
                                        className="px-4 py-2 rounded-full bg-brand-light/50 text-brand-blue text-sm font-bold hover:bg-brand-orange hover:text-white transition-all duration-300 transform hover:scale-105"
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 p-2">
                            {/* Destinations Matches */}
                            {filteredDestinations.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 px-2">Destinations</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        {filteredDestinations.map(dest => (
                                            <div
                                                key={dest._id}
                                                onClick={() => handleSelect(`/destinations/${dest.slug}`)}
                                                className="group relative h-24 rounded-xl overflow-hidden cursor-pointer"
                                            >
                                                <Image src={dest.coverImage} alt={dest.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors" />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <span className="text-white font-bold text-lg">{dest.name}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Tours Matches */}
                            {filteredTours.length > 0 ? (
                                <div>
                                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 px-2">Tours</h4>
                                    <div className="space-y-1">
                                        {filteredTours.map(tour => (
                                            <div
                                                key={tour._id}
                                                onClick={() => { setOpen(false); openTour(tour); }}
                                                className="group flex items-center gap-4 p-2 rounded-xl hover:bg-brand-light/50 cursor-pointer transition-colors"
                                            >
                                                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                                                    <Image src={tour.imageURL} alt={tour.title} className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h5 className="font-bold text-brand-blue truncate group-hover:text-brand-orange transition-colors">{tour.title}</h5>
                                                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {tour.location}</span>
                                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {tour.duration.days}D/{tour.duration.nights}N</span>
                                                        <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> {tour.reviews?.rating ?? 0}</span>
                                                    </div>
                                                </div>
                                                <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-brand-orange opacity-0 group-hover:opacity-100 transition-all" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                filteredDestinations.length === 0 && (
                                    <div className="text-center py-12 text-muted-foreground">
                                        No results found for "{query}"
                                    </div>
                                )
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
