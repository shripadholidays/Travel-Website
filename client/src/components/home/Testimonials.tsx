import { Star, Quote, BadgeCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { Image } from "@/components/ui/image";
import { Container } from "@/components/ui/container";
import { motion } from "framer-motion";
import { usePublicSettings, useHighlights, type Testimonial } from "@/hooks/use-settings";

// A card is either an admin-written testimonial or a real review left on a tour
type StoryItem = Testimonial & { tourId?: string; tourTitle?: string; verified?: boolean };

export const Testimonials = () => {
    const { data } = usePublicSettings();
    const { data: highlights } = useHighlights();
    const curated = data?.settings?.testimonials ?? [];
    const items: StoryItem[] = curated.length > 0
        ? curated
        : (highlights?.reviews ?? []).map((r) => ({
            name: r.name,
            role: r.title,
            image: r.image,
            quote: r.quote,
            rating: r.rating,
            location: r.location,
            tourId: r.tourId,
            tourTitle: r.tourTitle,
            verified: r.verified,
        }));

    // No real stories yet: show nothing rather than invented ones
    if (items.length === 0) return null;

    const columns = [0, 1, 2];

    return (
        <section className="py-24 bg-brand-light relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
                <div className="absolute top-10 left-10 w-64 h-64 bg-brand-orange rounded-full blur-[100px]" />
                <div className="absolute bottom-10 right-10 w-96 h-96 bg-brand-blue rounded-full blur-[120px]" />
            </div>

            <Container>
                <div className="text-center mb-16 relative z-10">
                    <span className="text-brand-orange font-bold tracking-widest uppercase text-sm mb-2 block">Voice of Travelers</span>
                    <h2 className="text-4xl md:text-5xl font-display font-bold text-brand-blue">Stories from the Road</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
                    {columns.map((colIndex) => (
                        <div key={colIndex} className={`flex flex-col gap-8 ${colIndex === 1 ? 'md:mt-12' : ''}`}>
                            {items
                                .filter((_, i) => i % 3 === colIndex)
                                .map((item, i) => (
                                    <TestimonialCard key={i} item={item} index={i} />
                                ))}
                        </div>
                    ))}
                </div>
            </Container>
        </section>
    );
};

const TestimonialCard = ({ item, index }: { item: StoryItem; index: number }) => (
    <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6, delay: index * 0.1 }}
        whileHover={{ y: -10 }}
        className="bg-white p-8 rounded-[2rem] shadow-sm hover:shadow-2xl hover:shadow-brand-blue/10 transition-all duration-500 border border-slate-100 group relative"
    >
        <Quote className="absolute top-8 right-8 w-8 h-8 text-brand-orange/20 group-hover:text-brand-orange/40 transition-colors" />

        <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-md ring-2 ring-slate-100 group-hover:ring-brand-orange/30 transition-all">
                {item.image ? (
                    <Image src={item.image} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-brand-orange/10 text-brand-orange font-bold text-xl flex items-center justify-center">
                        {item.name.charAt(0).toUpperCase()}
                    </div>
                )}
            </div>
            <div>
                <h4 className="font-bold text-lg text-brand-blue leading-tight">{item.name}</h4>
                {item.verified ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 uppercase tracking-wide">
                        <BadgeCheck className="w-3.5 h-3.5" /> Verified traveller
                    </span>
                ) : (
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{item.role}</span>
                )}
            </div>
        </div>

        <div className="flex gap-1 mb-4">
            {[...Array(5)].map((_, i) => (
                <Star key={i} className={`w-4 h-4 ${i < item.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} />
            ))}
        </div>

        <p className="text-slate-600 leading-relaxed italic mb-4">"{item.quote}"</p>

        {item.tourId ? (
            <Link
                to={{ search: `?tour=${item.tourId}` }}
                state={{ tourModal: true }}
                preventScrollReset
                className="flex items-center gap-2 text-xs font-medium text-brand-orange/80 hover:text-brand-orange"
            >
                <div className="w-1.5 h-1.5 rounded-full bg-brand-orange" />
                {item.tourTitle}
            </Link>
        ) : item.location && (
            <div className="flex items-center gap-2 text-xs font-medium text-brand-orange/80">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-orange" />
                Trip to {item.location}
            </div>
        )}
    </motion.div>
);
