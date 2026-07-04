import { Star, Quote } from "lucide-react";
import { Image } from "@/components/ui/image";
import { Container } from "@/components/ui/container";
import { motion } from "framer-motion";
import { usePublicSettings, type Testimonial } from "@/hooks/use-settings";

const FALLBACK: Testimonial[] = [
    { name: "Sarah Johnson", role: "Adventure Enthusiast", image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200", quote: "Wandeazy made my trip to Bali absolutely unforgettable. The curated experiences were top-notch!", rating: 5, location: "Bali, Indonesia" },
    { name: "Michael Chen", role: "Travel Photographer", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200", quote: "As a photographer, I look for unique spots. Their guides knew exactly where to take me for the perfect shot.", rating: 5, location: "Kyoto, Japan" },
    { name: "Emma Watson", role: "Solo Traveler", image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200", quote: "I felt so safe and well-cared for. If you're traveling solo, this is the agency to book with.", rating: 5, location: "Swiss Alps" },
    { name: "David Miller", role: "Family Vacation", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200", quote: "Planning a trip for 5 people is a nightmare, but Wandeazy handled everything perfectly.", rating: 5, location: "Paris, France" },
    { name: "Lisa Wong", role: "Foodie", image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200", quote: "The culinary tour they organized was beyond my expectations. Authentic flavors every step of the way.", rating: 4, location: "Bangkok, Thailand" },
    { name: "James Wilson", role: "Hiker", image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=200", quote: "The trekking guides were professional and fun. Machu Picchu was a dream come true.", rating: 5, location: "Cusco, Peru" },
];

export const Testimonials = () => {
    const { data } = usePublicSettings();
    const items = (data?.settings?.testimonials?.length ?? 0) > 0
        ? data!.settings!.testimonials
        : FALLBACK;

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

const TestimonialCard = ({ item, index }: { item: Testimonial; index: number }) => (
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
                <Image src={item.image} alt={item.name} className="w-full h-full object-cover" />
            </div>
            <div>
                <h4 className="font-bold text-lg text-brand-blue leading-tight">{item.name}</h4>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{item.role}</span>
            </div>
        </div>

        <div className="flex gap-1 mb-4">
            {[...Array(5)].map((_, i) => (
                <Star key={i} className={`w-4 h-4 ${i < item.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} />
            ))}
        </div>

        <p className="text-slate-600 leading-relaxed italic mb-4">"{item.quote}"</p>

        {item.location && (
            <div className="flex items-center gap-2 text-xs font-medium text-brand-orange/80">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-orange" />
                Trip to {item.location}
            </div>
        )}
    </motion.div>
);
