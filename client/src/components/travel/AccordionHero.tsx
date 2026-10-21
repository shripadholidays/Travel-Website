import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image } from '@/components/ui/image';
import { cn } from '@/lib/utils';

export interface HeroPanel {
    label: string;
    title: string;
    image: string;
    /** Tailwind gradient start, same convention as the Home hero slides (e.g. "from-blue-500/80"). */
    color: string;
}

interface AccordionHeroProps {
    panels: HeroPanel[];
    defaultIndex?: number;
    eyebrow: string;
    description: string;
}

/** The Home page accordion hero, reused for Flights and Hotels so they feel native. */
export const AccordionHero = ({ panels, defaultIndex = 1, eyebrow, description }: AccordionHeroProps) => {
    const [activeIdx, setActiveIdx] = useState(defaultIndex);

    return (
        <section className="relative h-[78vh] min-h-[560px] w-full overflow-hidden bg-black flex">
            {panels.map((panel, idx) => {
                const isActive = idx === activeIdx;
                return (
                    <motion.div
                        key={panel.label}
                        layout
                        onClick={() => setActiveIdx(idx)}
                        onHoverStart={() => setActiveIdx(idx)}
                        className={cn(
                            'relative h-full border-r border-white/10 cursor-pointer overflow-hidden transition-all duration-700 ease-in-out',
                            isActive ? 'flex-[4]' : 'flex-[0.5] hover:flex-[0.8] hidden md:block',
                        )}
                    >
                        <motion.div
                            className="absolute inset-0"
                            animate={{ scale: isActive ? 1.08 : 1 }}
                            transition={{ duration: 0.7 }}
                        >
                            <Image
                                src={panel.image}
                                alt={panel.title}
                                className={cn('w-full h-full brightness-75 transition-all duration-500', isActive ? 'grayscale-0' : 'grayscale')}
                            />
                        </motion.div>
                        <div className={cn(
                            'absolute inset-0 bg-gradient-to-t to-transparent transition-opacity duration-500',
                            panel.color,
                            isActive ? 'opacity-80' : 'opacity-40',
                        )} />

                        <div className="absolute inset-0 p-8 pb-36 flex flex-col justify-end">
                            {!isActive && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-white font-display font-bold text-4xl whitespace-nowrap -rotate-90 tracking-widest opacity-50 uppercase">
                                        {panel.label}
                                    </span>
                                </div>
                            )}
                            <AnimatePresence mode="wait">
                                {isActive && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 40 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 20 }}
                                        transition={{ delay: 0.15, duration: 0.5 }}
                                        className="max-w-2xl"
                                    >
                                        <span className="inline-block text-brand-orange font-bold text-sm tracking-[0.3em] uppercase mb-4">
                                            {eyebrow}
                                        </span>
                                        <h1 className="text-5xl sm:text-6xl md:text-8xl font-display font-bold text-white mb-6 leading-none">
                                            {panel.title}
                                        </h1>
                                        <p className="text-white/80 text-lg md:text-xl max-w-md font-light">{description}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                );
            })}
        </section>
    );
};
