import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Heart, Minus, Plus, Share2, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TripAddons } from "@/components/travel/TripAddons";
import { useCurrency } from "@/context/CurrencyContext";
import type { TourActions, TourBooking } from "@/hooks/use-tour-actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Tour } from "@/types";
import { withChoice } from "@/lib/package-options";
import { TourOptionsPicker } from "@/components/tour/TourOptionsPicker";

/** Price, date, guests and Book Now — the sidebar of the details page and the modal. */
export const TourBookingPanel = ({ tour, booking, actions, compact, className }: {
    tour: Tour;
    booking: TourBooking;
    actions: TourActions;
    compact?: boolean;
    className?: string;
}) => {
    const { formatPrice } = useCurrency();
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const dateTriggerRef = useRef<HTMLButtonElement>(null);
    const { date, setDate, guests, setGuests, choice, setChoice, bookState } = booking;
    // The price of the trip length and hotel class picked (the tour's own price when it has none)
    const shown = withChoice(tour, choice);
    const totalPrice = shown.price * guests;

    return (
        <div className={cn("bg-white border border-slate-100 rounded-[2rem] shadow-2xl shadow-brand-blue/5", compact ? "p-6 space-y-5" : "p-8 space-y-6", className)}>
            <div className={cn("flex items-center justify-between border-b border-slate-100", compact ? "pb-5" : "pb-6")}>
                <div>
                    <span className="text-sm font-medium text-muted-foreground">Price per person</span>
                    <div className="text-3xl font-bold font-display text-brand-blue tabular-nums">{formatPrice(shown.price, tour.currency)}</div>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={actions.share}
                        aria-label="Share tour"
                        className="rounded-full hover:bg-brand-light hover:text-brand-orange active:scale-95 transition-all"
                    >
                        <Share2 className="w-5 h-5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={actions.toggleWishlist}
                        aria-label={actions.isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                        aria-pressed={actions.isWishlisted}
                        disabled={actions.wishlistPending}
                        className="rounded-full hover:bg-brand-light hover:text-red-500 active:scale-95 transition-all"
                    >
                        <Heart className={cn("w-5 h-5", actions.isWishlisted && "fill-red-500 text-red-500")} />
                    </Button>
                </div>
            </div>

            <div className={compact ? "space-y-5" : "space-y-6"}>
                <TourOptionsPicker tour={tour} choice={choice} onChange={setChoice} compact={compact} />

                {/* Date Selection */}
                <div className="space-y-3">
                    <label className="text-sm font-bold flex items-center gap-2 text-brand-blue"><CalendarIcon className="w-4 h-4 text-brand-orange" /> Select Date</label>
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                ref={dateTriggerRef}
                                variant="outline"
                                className={cn(
                                    "w-full justify-start text-left font-medium bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700 rounded-2xl",
                                    compact ? "h-12 text-base" : "h-14 text-lg",
                                    !date && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date ? format(date, "PPP") : <span>When do you want to travel?</span>}
                            </Button>
                        </PopoverTrigger>
                        {/* Above the modal's z-[100] layer */}
                        <PopoverContent className="w-auto p-0 z-[110]" align="start">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={(d) => {
                                    setDate(d);
                                    setIsCalendarOpen(false);
                                }}
                                initialFocus
                                disabled={(day) => day < new Date()}
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Guest Counter */}
                <div className="space-y-3">
                    <label className="text-sm font-bold flex items-center gap-2 text-brand-blue"><Users className="w-4 h-4 text-brand-orange" /> Guests</label>
                    <div className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-2xl">
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Fewer guests"
                            className="h-10 w-10 rounded-xl hover:bg-white hover:shadow-sm disabled:opacity-50"
                            onClick={() => setGuests(Math.max(1, guests - 1))}
                            disabled={guests <= 1}
                        >
                            <Minus className="w-4 h-4" />
                        </Button>
                        <span className="text-xl font-bold w-12 text-center tabular-nums" aria-live="polite">{guests}</span>
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label="More guests"
                            className="h-10 w-10 rounded-xl hover:bg-white hover:shadow-sm"
                            onClick={() => setGuests(guests + 1)}
                        >
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Total Price Section */}
                <div className="bg-brand-light/30 p-4 rounded-2xl border border-brand-light/60 space-y-2">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{formatPrice(shown.price, tour.currency)} × {guests} {guests === 1 ? 'guest' : 'guests'}</span>
                        <span className="tabular-nums">{formatPrice(totalPrice, tour.currency)}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-brand-light/60">
                        <span className="font-bold text-brand-blue">Total</span>
                        <span className="text-2xl font-bold font-display text-brand-orange tabular-nums">{formatPrice(totalPrice, tour.currency)}</span>
                    </div>
                </div>
            </div>

            <Button asChild className={cn("w-full font-bold bg-brand-orange hover:bg-brand-orange/90 shadow-lg shadow-brand-orange/20 rounded-2xl group relative overflow-hidden text-white", compact ? "h-12 text-base" : "h-14 text-lg")}>
                <Link
                    to="/book"
                    state={bookState}
                    onClick={(e) => {
                        // A booking needs a date: ask for it here rather than at checkout.
                        if (!date) {
                            e.preventDefault();
                            toast.error("Pick your travel date first.");
                            // Focus and click the date field itself (after this click finishes), so the picker
                            // opens the same way it does for a person — inside the modal's focus trap.
                            const trigger = dateTriggerRef.current;
                            trigger?.scrollIntoView({ block: 'center' });
                            requestAnimationFrame(() => { trigger?.focus(); trigger?.click(); });
                        }
                    }}
                >
                    <span className="relative z-10">Book Now</span>
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                </Link>
            </Button>

            <div className="space-y-2 pt-1">
                <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                    <span>Free cancellation up to 24h before</span>
                </p>
                <p className="text-center text-xs text-muted-foreground">
                    You won't be charged yet
                </p>
            </div>

            <TripAddons
                location={tour.location}
                date={bookState.date || undefined}
                nights={shown.duration?.nights || 3}
            />
        </div>
    );
};
