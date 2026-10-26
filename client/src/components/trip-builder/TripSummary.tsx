import { useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { format } from "date-fns";
import { Calendar as CalendarIcon, ChevronDown, Info, Minus, Plus, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCurrency } from "@/context/CurrencyContext";
import { resolveIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { PER_LABELS, type BuilderExtra, type TripBuilderCatalogue, type TripDraft, type TripEstimate } from "@/lib/trip-builder";
import { useAnimatedNumber, type DragData, type DropData } from "./shared";

interface Props {
    catalogue: TripBuilderCatalogue;
    draft: TripDraft;
    estimate: TripEstimate;
    update: (changes: Partial<TripDraft>) => void;
    toggleExtra: (id: string) => void;
    onSend: () => void;
    extraDragging: boolean;
}

/** Who's going, when, which hotels and extras, and what it will roughly cost */
export function TripSummary({ catalogue, draft, estimate, update, toggleExtra, onSend, extraDragging }: Props) {
    const [calendarOpen, setCalendarOpen] = useState(false);
    const startDate = draft.startDate ? new Date(draft.startDate) : undefined;

    return (
        <div className="space-y-5">
            <PriceCard catalogue={catalogue} estimate={estimate} draft={draft} onSend={onSend} />

            <section aria-labelledby="who-heading" className="space-y-3">
                <h2 id="who-heading" className="font-semibold text-slate-900">Who's going</h2>
                <Stepper label="Adults" hint="12 years and up" value={draft.adults} min={1} max={30} onChange={(adults) => update({ adults })} />
                <Stepper label="Children" hint={`2–11 years, ${Math.round(catalogue.childShare * 100)}% of the adult price`} value={draft.children} min={0} max={30} onChange={(children) => update({ children })} />
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                        <Button type="button" variant="outline" className={cn("w-full h-11 justify-start rounded-xl font-normal", !startDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4 text-brand-orange" aria-hidden />
                            {startDate ? `Starting ${format(startDate, "EEE, d MMM yyyy")}` : "Start date: flexible"}
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
            </section>

            <HotelPicker catalogue={catalogue} value={draft.hotelClass} onChange={(hotelClass) => update({ hotelClass })} />

            <ExtrasPicker catalogue={catalogue} chosen={draft.extras} toggle={toggleExtra} dragging={extraDragging} />
        </div>
    );
}

function PriceCard({ catalogue, estimate, draft, onSend }: { catalogue: TripBuilderCatalogue; estimate: TripEstimate; draft: TripDraft; onSend: () => void }) {
    const { formatPrice } = useCurrency();
    const [open, setOpen] = useState(false);
    const low = useAnimatedNumber(estimate.low);
    const high = useAnimatedNumber(estimate.high);
    const money = (n: number) => formatPrice(n, catalogue.currency);
    const empty = estimate.nights === 0;
    const perPerson = estimate.people > 0 ? [estimate.low / estimate.people, estimate.high / estimate.people].map((n) => Math.round(n / 100) * 100) : [0, 0];

    return (
        <section aria-labelledby="price-heading" className="rounded-3xl bg-brand-blue text-white p-5 shadow-[0_12px_32px_-12px_rgba(15,23,42,0.5)]">
            <h2 id="price-heading" className="text-xs font-medium uppercase tracking-wider text-white/70">Estimated price</h2>
            {empty ? (
                <p className="mt-2 text-lg font-semibold text-pretty">Add a place to see your price</p>
            ) : (
                <>
                    <p className="mt-1.5 text-[1.65rem] leading-tight font-bold tabular-nums" aria-live="polite">
                        {money(low)} <span className="text-white/60 font-medium">–</span> {money(high)}
                    </p>
                    <p className="text-sm text-white/75 mt-1 tabular-nums">
                        {estimate.nights} nights · {estimate.days} days · {draft.adults} adult{draft.adults === 1 ? "" : "s"}
                        {draft.children ? ` · ${draft.children} child${draft.children === 1 ? "" : "ren"}` : ""}
                    </p>
                    <p className="text-xs text-white/60 mt-0.5 tabular-nums">About {money(perPerson[0])} – {money(perPerson[1])} a person</p>
                    <button
                        type="button"
                        onClick={() => setOpen((o) => !o)}
                        aria-expanded={open}
                        className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-white/80 hover:text-white"
                    >
                        What's in this price <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", open && "rotate-180")} aria-hidden />
                    </button>
                    {open && (
                        <ul className="mt-2 space-y-1.5 text-xs">
                            {estimate.lines.map((l) => (
                                <li key={l.label} className="flex justify-between gap-3">
                                    <span className="text-white/75 min-w-0">{l.label}</span>
                                    <span className="tabular-nums whitespace-nowrap">{money(l.low)} – {money(l.high)}</span>
                                </li>
                            ))}
                            <li className="text-white/60 pt-1">Stays include hotel ({estimate.hotelLabel}), transfers and sightseeing.</li>
                        </ul>
                    )}
                </>
            )}
            <Button variant="brand" className="w-full mt-4 h-11 rounded-xl" onClick={onSend} disabled={empty}>
                <Send className="w-4 h-4 mr-2" aria-hidden /> Send my trip
            </Button>
            <p className="mt-2.5 text-[11px] text-white/60 flex gap-1.5 text-pretty">
                <Info className="w-3.5 h-3.5 shrink-0 mt-px" aria-hidden />
                A price range, not a bill. Our team sends your final price within 24 hours. You pay nothing now.
            </p>
        </section>
    );
}

function Stepper({ label, hint, value, min, max, onChange }: { label: string; hint: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900">{label}</p>
                <p className="text-xs text-muted-foreground">{hint}</p>
            </div>
            <div className="flex items-center gap-1" role="group" aria-label={label}>
                <button type="button" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={`Fewer ${label.toLowerCase()}`}
                    className="w-9 h-9 rounded-full flex items-center justify-center shadow-[0_0_0_1px_rgba(15,23,42,0.12)] text-slate-700 hover:bg-slate-50 disabled:opacity-30 transition-[background-color,scale] active:scale-[0.96]">
                    <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center font-semibold tabular-nums" aria-live="polite">{value}</span>
                <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`More ${label.toLowerCase()}`}
                    className="w-9 h-9 rounded-full flex items-center justify-center shadow-[0_0_0_1px_rgba(15,23,42,0.12)] text-slate-700 hover:bg-slate-50 disabled:opacity-30 transition-[background-color,scale] active:scale-[0.96]">
                    <Plus className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

function HotelPicker({ catalogue, value, onChange }: { catalogue: TripBuilderCatalogue; value: string; onChange: (key: string) => void }) {
    const { formatPrice } = useCurrency();
    return (
        <section aria-labelledby="hotel-heading">
            <h2 id="hotel-heading" className="font-semibold text-slate-900 mb-3">Hotels</h2>
            <div role="radiogroup" aria-labelledby="hotel-heading" className="grid grid-cols-2 gap-2">
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
                                "rounded-2xl px-3 py-2.5 text-left transition-[box-shadow,background-color,scale] active:scale-[0.96]",
                                on ? "bg-orange-50 shadow-[0_0_0_2px_#F97316]" : "bg-white shadow-[0_0_0_1px_rgba(15,23,42,0.1)] hover:shadow-[0_0_0_1px_rgba(15,23,42,0.25)]",
                            )}
                        >
                            <span className="block text-sm font-semibold text-slate-900">{h.label}</span>
                            <span className="block text-[11px] text-slate-600 tabular-nums">
                                {h.extraTo === 0 ? "Included" : `+${formatPrice(h.extraFrom, catalogue.currency)}–${formatPrice(h.extraTo, catalogue.currency)}/night`}
                            </span>
                        </button>
                    );
                })}
            </div>
        </section>
    );
}

function ExtrasPicker({ catalogue, chosen, toggle, dragging }: { catalogue: TripBuilderCatalogue; chosen: string[]; toggle: (id: string) => void; dragging: boolean }) {
    const drop: DropData = { type: "extras" };
    const { setNodeRef, isOver } = useDroppable({ id: "extras", data: drop });
    const picked = chosen.map((id) => catalogue.extras.find((x) => x.id === id)).filter(Boolean) as BuilderExtra[];
    const left = catalogue.extras.filter((x) => !chosen.includes(x.id));
    if (!catalogue.extras.length) return null;

    return (
        <section aria-labelledby="extras-heading">
            <h2 id="extras-heading" className="font-semibold text-slate-900 mb-1">Extras</h2>
            <p className="text-xs text-muted-foreground mb-3">Drag into the box, or tap to add</p>
            <div
                ref={setNodeRef}
                className={cn(
                    "rounded-2xl border-2 border-dashed p-2 min-h-[3.25rem] flex flex-wrap gap-1.5 transition-colors mb-3",
                    isOver ? "border-brand-orange bg-orange-50/70" : dragging ? "border-brand-orange/50 bg-orange-50/30" : "border-slate-200",
                )}
            >
                {picked.length === 0 && <span className="text-xs text-muted-foreground self-center px-1.5">No extras yet</span>}
                {picked.map((x) => {
                    const Icon = resolveIcon(x.icon);
                    return (
                        <span key={x.id} className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue text-white pl-2.5 pr-1 py-1 text-xs font-medium">
                            <Icon className="w-3.5 h-3.5" aria-hidden /> {x.label}
                            <button type="button" onClick={() => toggle(x.id)} aria-label={`Remove ${x.label}`} className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-white/20">
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    );
                })}
            </div>
            <ul className="space-y-1.5">
                {left.map((x) => <ExtraRow key={x.id} extra={x} currency={catalogue.currency} onAdd={() => toggle(x.id)} />)}
            </ul>
        </section>
    );
}

function ExtraRow({ extra, currency, onAdd }: { extra: BuilderExtra; currency: string; onAdd: () => void }) {
    const { formatPrice } = useCurrency();
    const data: DragData = { type: "extra", extraId: extra.id };
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `extra:${extra.id}`, data });
    const Icon = resolveIcon(extra.icon);
    return (
        <li>
            <button
                ref={setNodeRef}
                {...listeners}
                {...attributes}
                type="button"
                onClick={onAdd}
                aria-label={`Add ${extra.label}`}
                className={cn(
                    "w-full flex items-center gap-3 rounded-xl bg-white px-2.5 py-2 text-left shadow-[0_0_0_1px_rgba(15,23,42,0.08)] hover:shadow-[0_0_0_1px_rgba(249,115,22,0.6)] transition-[box-shadow,scale] active:scale-[0.96] cursor-grab touch-manipulation select-none",
                    isDragging && "opacity-40",
                )}
            >
                <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0"><Icon className="w-4 h-4" aria-hidden /></span>
                <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-900 truncate">{extra.label}</span>
                    <span className="block text-[11px] text-slate-500 tabular-nums">
                        {formatPrice(extra.priceFrom, currency)}–{formatPrice(extra.priceTo, currency)} {PER_LABELS[extra.per]}
                    </span>
                </span>
                <Plus className="w-4 h-4 text-brand-orange shrink-0" aria-hidden />
            </button>
        </li>
    );
}
