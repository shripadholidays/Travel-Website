import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Image } from "@/components/ui/image";
import { cn } from "@/lib/utils";
import { usePublicSettings, type HeroSlide } from "@/hooks/use-settings";

const FALLBACK_SLIDES: HeroSlide[] = [
    {
        title: "Paradise Found", subtitle: "Pristine Beaches",
        image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2073&auto=format&fit=crop",
        color: "from-blue-500/80", ctaLink: "/destinations", ctaLabel: "Explore",
    },
    {
        title: "Alpine Peaks", subtitle: "Mountain Escapes",
        image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2070&auto=format&fit=crop",
        color: "from-emerald-600/80", ctaLink: "/destinations", ctaLabel: "Explore",
    },
    {
        title: "Urban Lights", subtitle: "City Breaks",
        image: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=2144&auto=format&fit=crop",
        color: "from-purple-600/80", ctaLink: "/destinations", ctaLabel: "Explore",
    },
    {
        title: "Golden Sands", subtitle: "Desert Safaris",
        image: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?q=80&w=2070&auto=format&fit=crop",
        color: "from-orange-600/80", ctaLink: "/destinations", ctaLabel: "Explore",
    },
    {
        title: "Deep Wilds", subtitle: "Jungle Trekking",
        image: "https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=2070&auto=format&fit=crop",
        color: "from-green-800/80", ctaLink: "/destinations", ctaLabel: "Explore",
    },
];

export const Hero = () => {
    const { data } = usePublicSettings();
    const slides = (data?.settings?.heroSlides?.length ?? 0) > 0
        ? data!.settings!.heroSlides
        : FALLBACK_SLIDES;

    const [activeIdx, setActiveIdx] = useState(1);

    return (
        <div className="relative h-screen w-full overflow-hidden bg-black flex flex-col">
            {/* Accordion Container */}
            <div className="flex-1 flex w-full">
                {slides.map((slide, idx) => {
                    const isActive = idx === activeIdx;
                    return (
                        <motion.div
                            key={idx}
                            layout
                            onClick={() => setActiveIdx(idx)}
                            onHoverStart={() => setActiveIdx(idx)}
                            className={cn(
                                "relative h-full border-r border-white/10 cursor-pointer overflow-hidden transition-all duration-700 ease-in-out",
                                isActive ? "flex-[4]" : "flex-[0.5] hover:flex-[0.8] hidden md:block"
                            )}
                        >
                            {/* Background Image */}
                            <motion.div
                                className="absolute inset-0 w-full h-full"
                                animate={{ scale: isActive ? 1.1 : 1 }}
                                transition={{ duration: 0.7 }}
                            >
                                <Image
                                    src={slide.image}
                                    alt={slide.title}
                                    priority={idx === 0}
                                    className={cn(
                                        "w-full h-full object-cover brightness-75 transition-all duration-500",
                                        isActive ? "grayscale-0" : "grayscale"
                                    )}
                                />
                            </motion.div>

                            {/* Gradient Overlay */}
                            <div className={cn(
                                "absolute inset-0 bg-gradient-to-t to-transparent opacity-60 transition-opacity duration-500",
                                slide.color,
                                isActive ? "opacity-80" : "opacity-40"
                            )} />

                            {/* Content */}
                            <div className="absolute inset-0 p-8 flex flex-col justify-end">
                                {/* Vertical Label for Inactive */}
                                {!isActive && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <h3 className="text-white font-display font-bold text-4xl whitespace-nowrap -rotate-90 tracking-widest opacity-50 uppercase">
                                            {slide.subtitle}
                                        </h3>
                                    </div>
                                )}

                                {/* Active Content */}
                                <AnimatePresence mode="wait">
                                    {isActive && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 50 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 20 }}
                                            transition={{ delay: 0.2, duration: 0.5 }}
                                            className="max-w-2xl"
                                        >
                                            <motion.span
                                                initial={{ x: -20, opacity: 0 }}
                                                animate={{ x: 0, opacity: 1 }}
                                                className="inline-block text-brand-orange font-bold text-sm tracking-[0.3em] uppercase mb-4"
                                            >
                                                {slide.subtitle}
                                            </motion.span>

                                            <h2 className="text-5xl sm:text-6xl md:text-8xl font-display font-bold text-white mb-6 leading-none">
                                                {slide.title}
                                            </h2>

                                            <p className="text-white/80 text-lg md:text-xl max-w-md mb-8 font-light">
                                                Immerse yourself in the world's most breathtaking landscapes. Your journey begins here.
                                            </p>

                                            <Button asChild className="bg-white text-black hover:bg-brand-orange hover:text-white rounded-full px-8 py-6 text-lg font-bold group transition-all duration-300">
                                                <Link to={slide.ctaLink || "/destinations"}>
                                                    {slide.ctaLabel || `Explore ${slide.subtitle}`}
                                                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                                </Link>
                                            </Button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Mobile dots */}
            <div className="md:hidden absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-20">
                {slides.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => setActiveIdx(idx)}
                        aria-label={`Show slide ${idx + 1}`}
                        aria-current={idx === activeIdx}
                        className={cn("w-2 h-2 rounded-full transition-colors", idx === activeIdx ? "bg-white" : "bg-white/30")}
                    />
                ))}
            </div>
        </div>
    );
};
