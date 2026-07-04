import { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, EffectFade } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { ArrowLeft, ArrowRight, ArrowRight as ArrowRightSm, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/context/CurrencyContext";
import { usePublicSettings, type PromoSlide } from "@/hooks/use-settings";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-fade";

const FALLBACK: PromoSlide[] = [
    {
        partner: "Singapore Tourism", title: "The Garden City Awaits",
        subtitle: "Experience the magic of Sentosa and the Gardens by the Bay.",
        image: "https://images.unsplash.com/photo-1565967511849-76a60a516170?q=80&w=1600",
        accentColor: "text-emerald-400", searchQuery: "Singapore", discount: "Save 25%", fromPrice: 1200,
    },
    {
        partner: "Visit Dubai", title: "Golden Sands & Skyscrapers",
        subtitle: "Discover the future of luxury in the heart of the desert.",
        image: "https://images.unsplash.com/photo-1603521097795-3b798129197f?q=80&w=1600",
        accentColor: "text-amber-400", searchQuery: "Dubai", discount: "Save 30%", fromPrice: 1500,
    },
    {
        partner: "Switzerland Tourism", title: "Alpine Peaks & Valleys",
        subtitle: "Breathe in the freshest air atop the world's most famous mountains.",
        image: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?q=80&w=1600",
        accentColor: "text-blue-200", searchQuery: "Switzerland", discount: "Save 20%", fromPrice: 1800,
    },
];

export const PromotionalCarousel = () => {
    const [swiper, setSwiper] = useState<SwiperType | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const { formatPrice } = useCurrency();
    const { data } = usePublicSettings();

    const slides = (data?.settings?.promoSlides?.length ?? 0) > 0
        ? data!.settings!.promoSlides
        : FALLBACK;

    return (
        <section className="py-12 bg-background">
            <Container>
                <div className="flex items-center gap-3 mb-8">
                    <div className="h-0.5 w-12 bg-brand-orange"></div>
                    <span className="text-brand-orange font-bold uppercase tracking-widest text-sm">Special Offers</span>
                </div>

                <div className="relative group rounded-[2.5rem] overflow-hidden shadow-2xl isolate bg-brand-dark">
                    <Swiper
                        modules={[Autoplay, Navigation, EffectFade]}
                        onSwiper={setSwiper}
                        onSlideChange={(s) => setActiveIndex(s.realIndex)}
                        effect="fade"
                        speed={1000}
                        autoplay={{ delay: 5000, disableOnInteraction: false }}
                        className="w-full"
                    >
                        {slides.map((slide, i) => (
                            <SwiperSlide key={i} className="relative w-full bg-brand-dark">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 min-h-[500px] md:min-h-[450px]">
                                    {/* Image */}
                                    <div className="relative lg:col-span-7 h-[300px] md:h-full overflow-hidden">
                                        <img
                                            src={slide.image}
                                            alt={slide.title}
                                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 md:group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-brand-dark/20 md:to-brand-dark" />
                                        <div className="absolute top-5 left-5 flex items-center gap-1.5 bg-brand-orange text-white text-sm font-bold px-3.5 py-1.5 rounded-full shadow-lg">
                                            <Sparkles className="w-4 h-4" />
                                            {slide.discount}
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="relative lg:col-span-5 flex flex-col justify-center p-8 md:p-12 lg:p-16 text-left">
                                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-700 delay-200">
                                            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full text-sm font-medium text-white w-fit">
                                                <span className="font-bold tracking-wider uppercase opacity-60">Wandeazy</span>
                                                <span className="opacity-40">×</span>
                                                <span className={cn("font-bold tracking-wide", slide.accentColor)}>{slide.partner}</span>
                                            </div>

                                            <div>
                                                <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-white leading-[1.1] mb-4">
                                                    {slide.title}
                                                </h2>
                                                <p className="text-base md:text-lg text-slate-400 leading-relaxed">{slide.subtitle}</p>
                                            </div>

                                            <div className="pt-2 flex flex-wrap items-center gap-5">
                                                <Button asChild className="bg-brand-orange hover:bg-brand-orange/90 text-white rounded-full px-8 py-6 text-base font-bold shadow-lg shadow-orange-500/20 transition-all group/cta">
                                                    <Link to={`/tours?q=${encodeURIComponent(slide.searchQuery || '')}`}>
                                                        Explore Deal
                                                        <ArrowRightSm className="w-4 h-4 ml-2 group-hover/cta:translate-x-1 transition-transform" />
                                                    </Link>
                                                </Button>
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-slate-400 uppercase tracking-wider">From</span>
                                                    <span className="text-xl font-bold font-display text-white">{formatPrice(slide.fromPrice)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </SwiperSlide>
                        ))}
                    </Swiper>

                    {/* Dots */}
                    <div className="absolute bottom-8 left-8 z-20 flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            {slides.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => swiper?.slideToLoop(i)}
                                    aria-label={`Go to slide ${i + 1}`}
                                    className={cn(
                                        "h-1.5 rounded-full transition-all duration-300",
                                        i === activeIndex ? "w-8 bg-brand-orange" : "w-1.5 bg-white/40 hover:bg-white/70"
                                    )}
                                />
                            ))}
                        </div>
                        <span className="text-xs font-medium text-white/60 tabular-nums">
                            {String(activeIndex + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
                        </span>
                    </div>

                    {/* Arrows */}
                    <div className="absolute bottom-8 right-8 z-20 flex gap-2.5">
                        <button onClick={() => swiper?.slidePrev()} aria-label="Previous slide" className="w-11 h-11 rounded-full flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/15 text-white hover:bg-white hover:text-brand-dark transition-all active:scale-95">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <button onClick={() => swiper?.slideNext()} aria-label="Next slide" className="w-11 h-11 rounded-full flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/15 text-white hover:bg-white hover:text-brand-dark transition-all active:scale-95">
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </Container>
        </section>
    );
};
