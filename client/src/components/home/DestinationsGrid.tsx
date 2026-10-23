import { motion } from "framer-motion";
import { useDestinations } from "@/hooks/use-destinations";
import { ArrowUpRight } from "lucide-react";
import { cn, tourCountLabel } from "@/lib/utils";
import { Image } from "@/components/ui/image";
import { Link } from "react-router-dom";

import { Container } from "@/components/ui/container";

export const DestinationsGrid = () => {
    const { data, isLoading } = useDestinations();
    const all = data?.destinations ?? [];
    const topDestinations = all.slice(0, 5);
    // The bento layout (2x2 hero + 4 tiles) only tiles cleanly with exactly 5 items.
    const useBento = topDestinations.length === 5;

    return (
        <section className="py-24 bg-background">
            <Container>
                <div className="flex justify-between items-end mb-12">
                    <div>
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            className="text-4xl md:text-5xl font-display font-bold mb-4 text-brand-blue"
                        >
                            Top Destinations
                        </motion.h2>
                        <p className="text-muted-foreground text-lg max-w-xl">
                            Explore the places our tours take you.
                        </p>
                        <Link to="/destinations" className="md:hidden inline-flex items-center gap-2 text-brand-orange font-medium mt-4">
                            View all destinations <ArrowUpRight className="w-4 h-4" />
                        </Link>
                    </div>
                    <Link to="/destinations" className="hidden md:flex items-center gap-2 text-brand-orange font-medium hover:gap-4 transition-all">
                        View all destinations <ArrowUpRight className="w-5 h-5" />
                    </Link>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 grid-rows-2 gap-3 md:gap-6 h-[440px] sm:h-[560px] md:h-[600px]">
                        {[...Array(5)].map((_, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "rounded-3xl bg-secondary/40 animate-pulse",
                                    i === 0 ? "col-span-2 row-span-2" : "col-span-1 row-span-1"
                                )}
                            />
                        ))}
                    </div>
                ) : topDestinations.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground">
                        <p>No destinations to show yet.</p>
                    </div>
                ) : (
                    // Balanced bento (5 items): hero 2x2 + 4 tiles fill a 4x2 grid. Otherwise a uniform grid (no gaps).
                    <div
                        className={cn(
                            "grid gap-3 md:gap-6",
                            useBento
                                ? "grid-cols-2 md:grid-cols-4 grid-rows-2 h-[440px] sm:h-[560px] md:h-[600px]"
                                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 auto-rows-[260px]"
                        )}
                    >
                        {topDestinations.map((dest, index) => (
                            <motion.div
                                key={dest._id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.08 }}
                                className={cn(
                                    "relative group overflow-hidden rounded-3xl cursor-pointer shadow-sm",
                                    useBento && index === 0 && "col-span-2 row-span-2"
                                )}
                            >
                                <Link to={`/destinations/${dest.slug}`} className="block w-full h-full">
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent z-20" />

                                    <Image
                                        src={dest.coverImage}
                                        alt={dest.name}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    />

                                    <div className={cn("absolute z-30", useBento && index === 0 ? "bottom-7 left-7" : "bottom-4 left-4")}>
                                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-white bg-brand-orange px-2.5 py-1 rounded-full mb-2 inline-block shadow-sm">
                                            {tourCountLabel(dest.tourCount)}
                                        </span>
                                        <h3 className={cn("font-bold text-white leading-tight drop-shadow-md", useBento && index === 0 ? "text-3xl md:text-4xl" : "text-lg md:text-xl")}>
                                            {dest.name}
                                        </h3>
                                    </div>

                                    <div className="absolute top-4 right-4 z-30 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                        <div className="w-9 h-9 md:w-10 md:h-10 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-brand-blue shadow-md">
                                            <ArrowUpRight className="w-5 h-5" />
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                )}
            </Container>
        </section>
    );
};
