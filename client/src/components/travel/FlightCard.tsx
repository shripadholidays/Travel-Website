import { Plane } from 'lucide-react';
import { useCurrency } from '@/context/CurrencyContext';
import { formatDuration } from '@/lib/travel';
import type { FlightOffer, FlightSlice } from '@/types/travel';

export const SliceRow = ({ slice }: { slice: FlightSlice }) => (
    <div className="flex items-center gap-4 min-w-0">
        <div className="flex flex-col">
            <span className="text-2xl font-display font-bold leading-none tabular-nums">{slice.departTime}</span>
            <span className="mt-1 text-[11px] font-bold tracking-wider text-muted-foreground">{slice.from}</span>
        </div>
        <div className="flex-1 flex flex-col items-center gap-1.5 min-w-[90px]">
            <span className="text-xs text-muted-foreground">{formatDuration(slice.durationMinutes)}</span>
            <div aria-hidden="true" className="w-full flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-brand-orange" />
                <span className="flex-1 border-t-2 border-dashed border-slate-300" />
                <Plane className="w-4 h-4 text-brand-orange rotate-45" />
                <span className="flex-1 border-t-2 border-dashed border-slate-300" />
                <span className="w-2 h-2 rounded-full bg-brand-blue" />
            </div>
            <span className={slice.stops ? 'text-xs font-bold text-amber-700' : 'text-xs font-bold text-green-700'}>
                {slice.stops ? `1 stop · ${slice.via}` : 'Non-stop'}
            </span>
        </div>
        <div className="flex flex-col items-end">
            <span className="text-2xl font-display font-bold leading-none tabular-nums">
                {slice.arriveTime}
                {slice.arriveDayOffset > 0 && <sup className="ml-0.5 text-[10px] text-brand-orange">+{slice.arriveDayOffset}</sup>}
            </span>
            <span className="mt-1 text-[11px] font-bold tracking-wider text-muted-foreground">{slice.to}</span>
        </div>
    </div>
);

export const AirlineBadge = ({ offer }: { offer: FlightOffer }) => (
    <div className="flex items-center gap-3 min-w-0">
        <span aria-hidden="true" className="w-12 h-12 shrink-0 rounded-full bg-slate-50 flex items-center justify-center font-extrabold text-sm text-brand-blue">
            {offer.airline.code}
        </span>
        <div className="min-w-0">
            <p className="font-bold text-[15px] truncate">{offer.airline.name}</p>
            <p className="text-xs text-muted-foreground truncate">{offer.slices[0].flightNumber}</p>
        </div>
    </div>
);

export const FlightCard = ({ offer, onSelect }: { offer: FlightOffer; onSelect: (o: FlightOffer) => void }) => {
    const { formatPrice } = useCurrency();
    return (
        <article className="travel-card bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-brand-blue/10 hover:-translate-y-0.5 transition-[transform,box-shadow] duration-300 p-5 md:p-6 flex flex-col lg:flex-row lg:items-center gap-5">
            <div className="lg:w-44 shrink-0"><AirlineBadge offer={offer} /></div>
            <div className="flex-1 flex flex-col gap-3 min-w-0">
                {offer.slices.map((slice) => <SliceRow key={`${slice.from}-${slice.departDate}`} slice={slice} />)}
            </div>
            <div className="flex items-center justify-between gap-4 lg:pl-6 lg:border-l border-slate-100 pt-4 lg:pt-0 border-t lg:border-t-0">
                <div className="flex flex-col lg:items-end">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Per adult</span>
                    <span className="text-[26px] leading-none font-display font-bold text-brand-blue tabular-nums">{formatPrice(offer.pricePerAdult)}</span>
                    <span className="text-xs text-muted-foreground">{offer.baggageKg} kg bag{offer.refundable ? ' · Refundable' : ''}</span>
                </div>
                <button
                    type="button"
                    onClick={() => onSelect(offer)}
                    className="h-12 px-6 rounded-full bg-brand-orange text-white font-bold hover:bg-brand-orange/90 shadow-lg shadow-brand-orange/20 transition-colors"
                >
                    Select
                </button>
            </div>
        </article>
    );
};
