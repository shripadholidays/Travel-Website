import { useState } from "react";
import { motion } from "framer-motion";
import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Container } from "@/components/ui/container";
import { usePublicSettings, type PlanTripStep } from "@/hooks/use-settings";
import { useEnabledFeatures } from '@/hooks/use-feature';
import { stripTravelMentions } from '@/lib/feature-links';

// Resolve icon name string → Lucide component
function resolveIcon(name: string): LucideIcon {
    const icon = (LucideIcons as Record<string, LucideIcon>)[name];
    return icon || LucideIcons.HelpCircle;
}

const FALLBACK_STEPS: PlanTripStep[] = [
    { icon: "Map", title: "Pick Destination", description: "Choose from 100+ locations" },
    { icon: "Calendar", title: "Select Dates", description: "When do you want to fly?" },
    { icon: "Settings", title: "Custom Addons", description: "Hotels, flights, & activities" },
    { icon: "CheckCircle2", title: "Confirm Travel", description: "Get ready to explore!" },
];

export const PlanTrip = () => {
    const [activeStep, setActiveStep] = useState(0);
    const { data } = usePublicSettings();
    const planTrip = data?.settings?.planTrip;

    const travelFeatures = useEnabledFeatures();
    // Never promise hotels/flights while those services are switched off
    const steps = ((planTrip?.steps?.length ?? 0) > 0 ? planTrip!.steps : FALLBACK_STEPS)
        .map((step) => ({ ...step, description: stripTravelMentions(step.description, travelFeatures) }));
    const heading = planTrip?.heading || "Plan Your Dream Trip";
    const subheading = planTrip?.subheading || "Easy as 1-2-3-4";

    return (
        <section className="py-24 bg-brand-dark text-white relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path d="M0 100 C 20 0 50 0 100 100 Z" fill="none" stroke="white" strokeWidth="0.5" />
                </svg>
            </div>

            <Container className="relative z-10">
                <div className="text-center mb-16">
                    <span className="text-brand-orange font-bold uppercase tracking-wider text-sm mb-2 block">{subheading}</span>
                    <h2 className="text-4xl md:text-5xl font-display font-bold">{heading}</h2>
                </div>

                <div className="max-w-4xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between relative">
                        <div className="hidden md:block absolute top-[2rem] left-0 w-full h-1 bg-white/10 z-0 rounded-full" />
                        <div
                            className="hidden md:block absolute top-[2rem] left-0 h-1 bg-gradient-to-r from-brand-orange to-rose-500 z-0 rounded-full transition-all duration-500 ease-out"
                            style={{ width: steps.length > 1 ? `${(activeStep / (steps.length - 1)) * 100}%` : '0%' }}
                        />

                        {steps.map((step, index) => {
                            const Icon = resolveIcon(step.icon);
                            const isActive = index <= activeStep;
                            const isCurrent = index === activeStep;

                            return (
                                <div
                                    key={index}
                                    className="relative z-10 flex flex-col items-center text-center cursor-pointer group flex-1"
                                    onMouseEnter={() => setActiveStep(index)}
                                >
                                    <motion.div
                                        animate={{
                                            scale: isCurrent ? 1.2 : isActive ? 1 : 0.9,
                                            backgroundColor: isActive ? "#F97316" : "#0F172A",
                                            borderColor: isActive ? "#F97316" : "#334155",
                                            y: isCurrent ? -10 : 0,
                                        }}
                                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                        className={cn(
                                            "w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 border-4 shadow-xl",
                                            isActive ? "shadow-orange-500/20" : "shadow-none"
                                        )}
                                    >
                                        <Icon className={cn("w-7 h-7 transition-colors duration-300", isActive ? "text-white" : "text-white/40")} />
                                    </motion.div>

                                    <motion.div animate={{ opacity: isActive ? 1 : 0.5, y: isActive ? 0 : 5 }}>
                                        <h3 className={cn("text-xl font-bold mb-2 transition-colors", isActive ? "text-white" : "text-white/40")}>
                                            {step.title}
                                        </h3>
                                        <p className="text-sm text-white/50 max-w-[150px] mx-auto leading-relaxed">
                                            {step.description}
                                        </p>
                                    </motion.div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </Container>
        </section>
    );
};
