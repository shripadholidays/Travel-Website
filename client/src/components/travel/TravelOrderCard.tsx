import { BedDouble, Plane } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/context/CurrencyContext';
import { prettyDate } from '@/lib/travel';
import { cn } from '@/lib/utils';
import type { FlightOffer, HotelOffer, TravelOrder } from '@/types/travel';

const STATUS_STYLES: Record<TravelOrder['status'], string> = {
    confirmed: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    cancelled: 'bg-slate-100 text-slate-600',
    failed: 'bg-red-100 text-red-700',
};

export function linkedTripTitle(order: TravelOrder) {
    const lb = order.linkedBooking;
    if (!lb || typeof lb === 'string') return null;
    return typeof lb.tour === 'object' && lb.tour ? lb.tour.title : null;
}

export const TravelOrderCard = ({ order, onCancel, compact }: {
    order: TravelOrder;
    onCancel?: (order: TravelOrder) => void;
    compact?: boolean;
}) => {
    const { formatMoney } = useCurrency();
    const isFlight = order.kind === 'flight';
    const flight = isFlight ? (order.offer as FlightOffer) : null;
    const hotel = !isFlight ? (order.offer as HotelOffer) : null;
    const canCancel = order.status === 'pending' || (order.status === 'confirmed' && order.offer.refundable);
    const trip = linkedTripTitle(order);

    return (
        <div className={cn('flex flex-col sm:flex-row gap-4 border border-slate-100 rounded-2xl hover:shadow-md hover:border-slate-200 transition-all', compact ? 'p-3' : 'p-4')}>
            <span aria-hidden="true" className="w-12 h-12 shrink-0 rounded-full bg-brand-orange/10 text-brand-orange flex items-center justify-center">
                {isFlight ? <Plane className="w-5 h-5" /> : <BedDouble className="w-5 h-5" />}
            </span>
            <div className="flex-1 min-w-0">
                {flight && (
                    <>
                        <h4 className="font-bold text-lg truncate">
                            {flight.slices[0].from} → {flight.slices[0].to}{flight.slices.length > 1 ? ' · Round trip' : ''}
                        </h4>
                        <p className="text-muted-foreground text-sm mb-2">
                            {flight.airline.name} · {prettyDate(flight.slices[0].departDate)} {flight.slices[0].departTime} · {flight.adults} {flight.adults === 1 ? 'adult' : 'adults'}
                        </p>
                    </>
                )}
                {hotel && (
                    <>
                        <h4 className="font-bold text-lg truncate">{hotel.hotel.name}</h4>
                        <p className="text-muted-foreground text-sm mb-2">
                            {hotel.roomName} · {prettyDate(hotel.checkIn)} – {prettyDate(hotel.checkOut)} · {hotel.hotel.city}
                        </p>
                    </>
                )}
                <div className="flex flex-wrap gap-2">
                    <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full capitalize', STATUS_STYLES[order.status])}>{order.status}</span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">{formatMoney(order.pricing.total, order.pricing.currency)}</span>
                    {order.providerRef && <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">{order.providerRef}</span>}
                    {trip && !compact && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-brand-orange/10 text-brand-orange truncate max-w-[220px]">Trip: {trip}</span>}
                </div>
            </div>
            {onCancel && canCancel && (
                <div className="flex sm:flex-col justify-end shrink-0">
                    <Button variant="ghost" size="sm" className="rounded-full text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => onCancel(order)}>
                        Cancel
                    </Button>
                </div>
            )}
        </div>
    );
};
