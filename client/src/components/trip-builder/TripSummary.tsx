import { useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Check, ChevronDown, Info, Minus, Plus, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCurrency } from "@/context/CurrencyContext";
import { resolveIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { PER_LABELS, type BuilderExtra, type TripBuilderCatalogue, type TripDraft, type TripEstimate } from "@/lib/trip-builder";
import { StepHeading, useAnimatedNumber, type DragData, type DropData } from "./shared";

/** The estimated budget, what it is made of, and the send button */
export function BudgetCard({ catalogue, estimate, draft, onSend }: { catalogue: TripBuilderCatalogue; estimate: TripEstimate; draft: TripDraft; onSend: () => void }) {
    const { formatPrice } = useCurrency();
    const [open, setOpen] = useState(false);
    const low = useAnimatedNumber(estimate.low);
    const high = useAnimatedNumber(estimate.high);
    const money = (n: number) => formatPrice(n, catalogue.currency);
    const empty = estimate.nights === 0;
    const perPerson = estimate.people > 0 ? [estimate.low / estimate.people, estimate.high / estimate.people].map((n) => Math.round(n / 100) * 100) : [0, 0];

    return (
        <section aria-labelledby="price-heading" className="rounded-3xl bg-brand-blue text-white p-6 shadow-lg">
            <h2 id="price-heading" className="text-sm font-semibold text-white/80">Your estimated budget</h2>
            {empty ? (
                <p className="mt-2 text-xl font-semibold text-pretty">Add a place to see your budget</p>
            ) : (
                <>
                    <p className="mt-2 text-3xl leading-tight font-bold tabular-nums" aria-live="polite">
                        {money(low)} <span className="text-white/60 font-medium">–</span> {money(high)}
                    </p>
                    <p className="text-base text-white/85 mt-2 tabular-nums">
                        {estimate.nights} nights · {estimate.days} days · {draft.adults} adult{draft.adults === 1 ? "" : "s"}
                        {draft.children ? ` · ${draft.children} child${draft.children === 1 ? "" : "ren"}` : ""}
                    </p>
                    <p className="text-sm text-white/70 mt-1 tabular-nums">About {money(perPerson[0])} – {money(perPerson[1])} a person</p>
                    <p className="text-sm text-white/85 mt-4 flex items-start gap-2 text-pretty rounded-xl bg-white/10 px-3 py-2.5">
                        <CalendarIcon className="size-4 shrink-0 mt-0.5" aria-hidden />
                        {estimate.seasonal
                            ? "Priced for your dates, using each place's peak or off-season rates."
                            : "Priced at regular-season rates. Pick a start date to see peak or off-season prices."}
                    </p>
                    <button
                        type="button"
                        onClick={() => setOpen((o) => !o)}
                        aria-expanded={open}
                        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-white hover:text-white/80"
                    >
                        What's in this budget <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
                    </button>
                    {open && (
                        <ul className="mt-3 space-y-2.5 text-sm border-t border-white/15 pt-3">
                            {estimate.lines.map((l, i) => (
                                <li key={`${l.label}-${i}`} className="flex justify-between gap-4">
                                    <span className="text-white/85 min-w-0 text-pretty">{l.label}</span>
                                    <span className="tabular-nums whitespace-nowrap">{money(l.low)} – {money(l.high)}</span>
                                </li>
                            ))}
                            <li className="text-white/70 pt-1 text-pretty">Stays include hotel ({estimate.hotelLabel}), breakfast, transfers and sightseeing.</li>
                        </ul>
                    )}
                </>
            )}
            <Button variant="brand" className="w-full mt-5 h-12 rounded-xl text-base" onClick={onSend} disabled={empty}>
                <Send className="size-4 mr-2" aria-hidden /> Send my trip
            </Button>
            <p className="mt-3 text-xs leading-relaxed text-white/70 flex gap-2 text-pretty">
                <Info className="size-4 shrink-0" aria-hidden />
                An estimate, not a bill. It depends on availability, current market prices and the season at each place.
                Our team sends your final price within 24 hours. You pay nothing now.
            </p>
        </section>
    );
}

interface DetailsProps {
    catalogue: TripBuilderCatalogue;
    draft: TripDraft;
    update: (changes: Partial<TripDraft>) => void;
    toggleExtra: (id: string) => void;
    extraDragging: boolean;
}

/** Step 4: who's going, when, which hotels and extras */
export function TripDetails({ catalogue, draft, update, toggleExtra, extraDragging }: DetailsProps) {
    const [calendarOpen, setCalendarOpen] = useState(false);
    const startDate = draft.startDate ? new Date(draft.startDate) : undefined;

    return (
        <section aria-labelledby="details-heading">
            <StepHeading id="details-heading" step={4} title="Travellers, dates and hotels" hint="These change your budget straight away." />
            <div className="grid gap-5 md:grid-cols-2">
                <div className="rounded-3xl bg-white p-5 ring-1 ring-slate-900/5 shadow-sm space-y-4">
                    <h3 className="text-base font-semibold text-slate-900">Who's going</h3>
                    <Stepper label="Adults" hint="12 years and up" value={draft.adults} min={1} max={30} onChange={(adults) => update({ adults })} />
                    <Stepper label="Children" hint={`2–11 years, ${Math.round(catalogue.childShare * 100)}% of the adult price`} value={draft.children} min={0} max={30} onChange={(children) => update({ children })} />
                    <div>
                        <p className="text-base font-semibold text-slate-900 mb-2">When</p>
                        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                            <PopoverTrigger asChild>
                                <Button type="button" variant="outline" className={cn("w-full h-12 justify-start rounded-xl font-normal text-base", !startDate && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 size-4 text-brand-orange" aria-hidden />
                                    {startDate ? `Starting ${format(startDate, "EEE, d MMM yyyy")}` : "My dates are flexible"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={startDate}
                                    onSelect={(d) => { update({ startDate: d ? format(d, "yyyy-MM-dd") : null }); setCalendarOpen(false); }}
                                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                    initialFocus
                                />
                                {startDate && (
                                    <div className="border-t p-2">
                                        <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => { update({ startDate: null }); setCalendarOpen(false); }}>
                                            My dates are flexible
                                        </Button>
                                    </div>
                                )}
                            </PopoverContent>
                        </Popover>
                        <p className="text-sm text-muted-foreground mt-2 text-pretty">Pick a date to see season prices for each place.</p>
                    </div>
                </div>
                <HotelPicker catalogue={catalogue} value={draft.hotelClass} onChange={(hotelClass) => update({ hotelClass })} />
            </div>
            <ExtrasPicker catalogue={catalogue} chosen={draft.extras} toggle={toggleExtra} dragging={extraDragging} />
        </section>
    );
}

function Stepper({ label, hint, value, min, max, onChange }: { label: string; hint: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
    const btn = "size-10 rounded-full flex items-center justify-center ring-1 ring-slate-900/15 text-slate-700 hover:bg-slate-50 disabled:opacity-30 transition-[background-color,scale] active:scale-[0.96]";
    return (
        <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
                <p className="text-base font-medium text-slate-900">{label}</p>
                <p className="text-sm text-muted-foreground text-pretty">{hint}</p>
            </div>
            <div className="flex items-center gap-1.5" role="group" aria-label={label}>
                <button type="button" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={`Fewer ${label.toLowerCase()}`} className={btn}>
                    <Minus className="size-4" />
                </button>
                <span className="w-9 text-center text-lg font-semibold tabular-nums" aria-live="polite">{value}</span>
                <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`More ${label.toLowerCase()}`} className={btn}>
                    <Plus className="size-4" />
                </button>
            </div>
        </div>
    );
}

function HotelPicker({ catalogue, value, onChange }: { catalogue: TripBuilderCatalogue; value: string; onChange: (key: string) => void }) {
    const { formatPrice } = useCurrency();
    return (
        <div className="rounded-3xl bg-white p-5 ring-1 ring-slate-900/5 shadow-sm">
            <h3 id="hotel-heading" className="text-base font-semibold text-slate-900">Hotels</h3>
            <p className="text-sm text-muted-foreground mb-3">Price per person, per night, on top of the stay.</p>
            <div role="radiogroup" aria-labelledby="hotel-heading" className="grid grid-cols-2 gap-2.5">
                {catalogue.hotelClasses.map((h) => {
                    const on = h.key === value;
                    return (
                        <button
                            key={h.key}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            onClick={() => onChange(h.key)}
                            className={cn(
                                "relative rounded-2xl px-4 py-3 text-left transition-[box-shadow,background-color,scale] active:scale-[0.96]",
                                on ? "bg-orange-50 ring-2 ring-brand-orange" : "bg-white ring-1 ring-slate-900/10 hover:ring-slate-900/25",
                            )}
                        >
                            {on && <Check className="absolute top-3 right-3 size-4 text-brand-orange" aria-hidden />}
                            <span className="block text-base font-semibold text-slate-900">{h.label}</span>
                            <span className="block text-sm text-slate-600 tabular-nums mt-0.5">
                                {h.extraTo === 0 ? "Included" : `+${formatPrice(h.extraFrom, catalogue.currency)}–${formatPrice(h.extraTo, catalogue.currency)}`}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function ExtrasPicker({ catalogue, chosen, toggle, dragging }: { catalogue: TripBuilderCatalogue; chosen: string[]; toggle: (id: string) => void; dragging: boolean }) {
    const drop: DropData = { type: "extras" };
    const { setNodeRef, isOver } = useDroppable({ id: "extras", data: drop });
    if (!catalogue.extras.length) return null;

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "mt-5 rounded-3xl bg-white p-5 ring-1 shadow-sm transition-[box-shadow,background-color]",
                isOver ? "ring-2 ring-brand-orange bg-orange-50/60" : dragging ? "ring-brand-orange/50" : "ring-slate-900/5",
            )}
        >
            <h3 className="text-base font-semibold text-slate-900">Extras</h3>
            <p className="text-sm text-muted-foreground mb-4">Tap to add or remove.</p>
            <ul className="grid gap-2.5 sm:grid-cols-2">
                {catalogue.extras.map((x) => <ExtraRow key={x.id} extra={x} currency={catalogue.currency} on={chosen.includes(x.id)} onToggle={() => toggle(x.id)} />)}
            </ul>
        </div>
    );
}

function ExtraRow({ extra, currency, on, onToggle }: { extra: BuilderExtra; currency: string; on: boolean; onToggle: () => void }) {
    const { formatPrice } = useCurrency();
    const data: DragData = { type: "extra", extraId: extra.id };
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `extra:${extra.id}`, data, disabled: on });
    const Icon = resolveIcon(extra.icon);
    return (
        <li>
            <button
                ref={setNodeRef}
                {...listeners}
                {...attributes}
                type="button"
                onClick={onToggle}
                aria-pressed={on}
                aria-label={on ? `Remove ${extra.label}` : `Add ${extra.label}`}
                className={cn(
                    "w-full h-full flex items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition-[box-shadow,background-color,scale] active:scale-[0.98] touch-manipulation select-none",
                    on ? "bg-orange-50 ring-2 ring-brand-orange" : "bg-white ring-1 ring-slate-900/10 hover:ring-brand-orange/60",
                    isDragging && "opacity-40",
                )}
            >
                <span className={cn("size-10 rounded-xl flex items-center justify-center shrink-0", on ? "bg-brand-orange text-white" : "bg-slate-100 text-slate-700")}>
                    <Icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-base font-medium text-slate-900 text-pretty leading-snug">{extra.label}</span>
                    <span className="block text-sm text-slate-600 tabular-nums mt-0.5">
                        {formatPrice(extra.priceFrom, currency)}–{formatPrice(extra.priceTo, currency)} {PER_LABELS[extra.per]}
                    </span>
                </span>
                {on ? <X className="size-4 text-brand-orange shrink-0" aria-hidden /> : <Plus className="size-4 text-brand-orange shrink-0" aria-hidden />}
            </button>
        </li>
    );
}
