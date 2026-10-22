import { CheckCircle2, Clock, Moon, Star, Tag, XCircle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import type { Tour } from "@/types";

// Sections shared by the tour details page and the tour quick-view modal.
// `compact` tightens type and spacing for the modal.

export const SectionHeading = ({ children, aside, compact }: { children: React.ReactNode; aside?: React.ReactNode; compact?: boolean }) => (
    <div className={cn("flex items-center justify-between", compact ? "mb-4" : "mb-6")}>
        <div className="flex items-center gap-3">
            <span className={cn("w-1.5 rounded-full bg-brand-orange", compact ? "h-6" : "h-7")} />
            <h2 className={cn("font-display font-bold text-brand-blue", compact ? "text-xl md:text-2xl" : "text-2xl md:text-3xl")}>{children}</h2>
        </div>
        {aside}
    </div>
);

const QuickFact = ({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) => (
    <div className="flex items-center gap-3 bg-white border border-slate-100 rounded-2xl p-3.5 shadow-sm">
        <div className="w-9 h-9 rounded-xl bg-brand-orange/10 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-brand-orange" />
        </div>
        <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
            <p className="text-sm font-bold text-brand-blue truncate">{value}</p>
        </div>
    </div>
);

export const TourQuickFacts = ({ tour, className }: { tour: Tour; className?: string }) => {
    const rating = tour.reviews?.rating ?? 0;
    return (
        <div className={cn("grid grid-cols-2 sm:grid-cols-4 gap-3", className)}>
            <QuickFact icon={Clock} label="Duration" value={`${tour.duration.days} Days`} />
            <QuickFact icon={Moon} label="Nights" value={`${tour.duration.nights} Nights`} />
            <QuickFact icon={Star} label="Rating" value={rating > 0 ? `${rating} / 5` : "New"} />
            <QuickFact icon={Tag} label="Type" value={tour.categories?.[0] || "Tour"} />
        </div>
    );
};

export const TourOverview = ({ tour, compact }: { tour: Tour; compact?: boolean }) => {
    const description = tour.overview?.about;
    if (!description) return null;
    return (
        <section>
            <SectionHeading compact={compact}>Overview</SectionHeading>
            <p className={cn("text-muted-foreground leading-relaxed", compact ? "text-base" : "text-lg")}>{description}</p>
        </section>
    );
};

export const TourInclusions = ({ tour, compact }: { tour: Tour; compact?: boolean }) => {
    const items = tour.inclusions ?? [];
    if (items.length === 0) return null;
    return (
        <section>
            <SectionHeading compact={compact}>What's Included</SectionHeading>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map((item, i) => (
                    <li
                        key={i}
                        className={cn(
                            "flex items-center gap-3 rounded-2xl border transition-colors",
                            compact ? "p-3" : "p-4",
                            item.included ? "bg-green-50/50 border-green-100" : "bg-slate-50 border-slate-100"
                        )}
                    >
                        {item.included ? (
                            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-green-500" />
                        ) : (
                            <XCircle className="w-5 h-5 flex-shrink-0 text-slate-300" />
                        )}
                        <span className={cn("font-medium", !item.included && "text-muted-foreground line-through decoration-slate-300")}>
                            {item.title}
                        </span>
                    </li>
                ))}
            </ul>
        </section>
    );
};

export const TourItinerary = ({ tour, compact }: { tour: Tour; compact?: boolean }) => {
    const days = tour.itinerary ?? [];
    if (days.length === 0) return null;
    return (
        <section>
            <SectionHeading
                compact={compact}
                aside={
                    <span className="text-sm font-medium text-muted-foreground bg-secondary/60 px-3 py-1.5 rounded-full">
                        {days.length} days
                    </span>
                }
            >
                Itinerary
            </SectionHeading>
            <Accordion type="single" collapsible defaultValue={`day-${days[0].day}`} className="w-full">
                {days.map((item, idx) => {
                    const isLast = idx === days.length - 1;
                    return (
                        <AccordionItem key={item.day} value={`day-${item.day}`} className="border-none">
                            <div className="relative flex gap-5">
                                {/* Timeline rail + node */}
                                <div className="flex flex-col items-center pt-5">
                                    <div className="relative z-10 w-11 h-11 shrink-0 rounded-full bg-brand-orange text-white flex flex-col items-center justify-center shadow-md shadow-brand-orange/30">
                                        <span className="text-[9px] font-bold uppercase leading-none opacity-80">Day</span>
                                        <span className="text-base font-bold font-display leading-none">{item.day}</span>
                                    </div>
                                    {!isLast && <div className="w-px flex-1 bg-gradient-to-b from-brand-orange/40 to-slate-200 my-1" />}
                                </div>

                                {/* Day content */}
                                <div className={cn("flex-1", !isLast && "pb-2")}>
                                    <AccordionTrigger className="hover:no-underline group/day py-5 [&>svg]:text-muted-foreground">
                                        <div className="text-left">
                                            <span className={cn("block font-bold group-hover/day:text-brand-orange transition-colors", compact ? "text-base" : "text-lg")}>
                                                {item.location}
                                            </span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6 pr-4">
                                        {item.activity}
                                    </AccordionContent>
                                </div>
                            </div>
                        </AccordionItem>
                    );
                })}
            </Accordion>
        </section>
    );
};
