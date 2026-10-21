import { Briefcase, RefreshCcw, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCurrency } from '@/context/CurrencyContext';
import { AirlineBadge, SliceRow } from '@/components/travel/FlightCard';
import { CABIN_LABELS, prettyDate } from '@/lib/travel';
import type { FlightOffer } from '@/types/travel';

interface Props {
    offer: FlightOffer | null;
    onClose: () => void;
    onContinue: (offer: FlightOffer) => void;
}

export const FlightDetailsDialog = ({ offer, onClose, onContinue }: Props) => {
    const { formatPrice } = useCurrency();
    return (
        <Dialog open={!!offer} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-2xl rounded-[2rem] p-0 overflow-hidden">
                {offer && (
                    <>
                        <DialogHeader className="p-6 pb-0 text-left">
                            <DialogTitle className="text-3xl font-display font-bold text-brand-blue">Your flight</DialogTitle>
                            <DialogDescription>{CABIN_LABELS[offer.cabin]} · {offer.adults} {offer.adults === 1 ? 'adult' : 'adults'}</DialogDescription>
                        </DialogHeader>
                        <div className="p-6 flex flex-col gap-5 max-h-[60vh] overflow-y-auto">
                            <AirlineBadge offer={offer} />
                            {offer.slices.map((slice, i) => (
                                <div key={i} className="rounded-3xl bg-slate-50 p-5">
                                    <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                        {i === 0 ? 'Outbound' : 'Return'} · {prettyDate(slice.departDate)} · {slice.flightNumber}
                                    </p>
                                    <SliceRow slice={slice} />
                                </div>
                            ))}
                            <ul className="grid sm:grid-cols-2 gap-3 text-sm">
                                <li className="flex items-start gap-2"><Briefcase className="w-4 h-4 mt-0.5 text-brand-orange" />{offer.baggageKg} kg check-in + 7 kg cabin</li>
                                <li className="flex items-start gap-2"><RefreshCcw className="w-4 h-4 mt-0.5 text-brand-orange" />{offer.refundable ? 'Refundable fare' : 'Non-refundable fare'}</li>
                                <li className="flex items-start gap-2 sm:col-span-2"><Info className="w-4 h-4 mt-0.5 text-brand-orange" />{offer.fareRules}</li>
                            </ul>
                        </div>
                        <div className="p-6 bg-brand-dark text-white flex items-center justify-between gap-4">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Total for {offer.adults} {offer.adults === 1 ? 'adult' : 'adults'}</p>
                                <p className="text-3xl font-display font-bold text-brand-orange tabular-nums">{formatPrice(offer.price)}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => onContinue(offer)}
                                className="h-12 px-7 rounded-full bg-brand-orange font-bold hover:bg-brand-orange/90 transition-colors"
                            >
                                Continue
                            </button>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
};
