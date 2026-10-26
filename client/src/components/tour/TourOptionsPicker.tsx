import { BedDouble, Clock } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";
import type { PackageChoice, Tour } from "@/types";

/** Trip length and hotel class for a package that offers them (renders nothing otherwise). */
export const TourOptionsPicker = ({ tour, choice, onChange, compact }: {
    tour: Tour;
    choice: PackageChoice;
    onChange: (choice: PackageChoice) => void;
    compact?: boolean;
}) => {
    const { formatPrice } = useCurrency();
    const durations = tour.packageOptions?.durations ?? [];
    const hotels = tour.packageOptions?.hotelClasses ?? [];
    if (!durations.length && !hotels.length) return null;

    return (
        <div className={compact ? "space-y-5" : "space-y-6"}>
            {durations.length > 1 && (
                <div className="space-y-3">
                    <p id={`len-${tour._id}`} className="text-sm font-bold flex items-center gap-2 text-brand-blue">
                        <Clock className="w-4 h-4 text-brand-orange" /> Trip length
                    </p>
                    <div role="radiogroup" aria-labelledby={`len-${tour._id}`} className="grid grid-cols-2 gap-2">
                        {durations.map((d, idx) => {
                            const selected = choice.duration === idx;
                            return (
                                <button
                                    key={d.label}
                                    type="button"
                                    role="radio"
                                    aria-checked={selected}
                                    onClick={() => onChange({ ...choice, duration: idx })}
                                    className={cn(
                                        "rounded-2xl border px-3 py-2.5 text-left transition-[color,background-color,border-color,scale] duration-150 active:scale-[0.96]",
                                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange",
                                        selected ? "border-brand-orange bg-brand-light/50 shadow-sm" : "border-slate-200 bg-slate-50 hover:border-slate-300"
                                    )}
                                >
                                    <span className="block font-bold text-brand-blue tabular-nums">{d.nights}N / {d.days}D</span>
                                    <span className="block text-xs text-muted-foreground tabular-nums">{formatPrice(d.price, tour.currency)}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {hotels.length > 0 && (
                <div className="space-y-3">
                    <p id={`hotel-${tour._id}`} className="text-sm font-bold flex items-center gap-2 text-brand-blue">
                        <BedDouble className="w-4 h-4 text-brand-orange" /> Hotel class
                    </p>
                    <div role="radiogroup" aria-labelledby={`hotel-${tour._id}`} className="space-y-2">
                        {hotels.map((h) => {
                            const selected = choice.hotelClass === h.key;
                            return (
                                <button
                                    key={h.key}
                                    type="button"
                                    role="radio"
                                    aria-checked={selected}
                                    onClick={() => onChange({ ...choice, hotelClass: h.key })}
                                    className={cn(
                                        "w-full flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-[color,background-color,border-color] duration-150",
                                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange",
                                        selected ? "border-brand-orange bg-brand-light/50 shadow-sm" : "border-slate-200 bg-slate-50 hover:border-slate-300"
                                    )}
                                >
                                    <span
                                        aria-hidden="true"
                                        className={cn("grid place-items-center w-4 h-4 shrink-0 rounded-full border-2", selected ? "border-brand-orange" : "border-slate-300")}
                                    >
                                        {selected && <span className="w-1.5 h-1.5 rounded-full bg-brand-orange" />}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block font-semibold text-sm text-brand-blue">{h.label}</span>
                                        {h.hotel && <span className="block text-xs text-muted-foreground truncate" title={h.features || h.hotel}>{h.hotel}</span>}
                                    </span>
                                    <span className="shrink-0 text-xs font-semibold tabular-nums text-brand-blue">
                                        {h.extraPerPerson > 0 ? `+${formatPrice(h.extraPerPerson, tour.currency)}` : "Included"}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
