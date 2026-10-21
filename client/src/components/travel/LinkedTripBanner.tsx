import { Link } from 'react-router-dom';
import { useBooking } from '@/hooks/use-bookings';
import type { Tour } from '@/types';

/** Dark promo-style strip reminding the traveller which tour this booking will be attached to. */
export const LinkedTripBanner = ({ bookingId, kind }: { bookingId: string; kind: 'flight' | 'hotel' }) => {
    const { data } = useBooking(bookingId);
    const tour = data?.booking?.tour && typeof data.booking.tour === 'object' ? (data.booking.tour as Tour) : null;
    if (!tour) return null;

    return (
        <div className="mb-8 rounded-[2rem] bg-brand-dark text-white px-6 py-5 flex flex-wrap items-center gap-4">
            <span className="rounded-full bg-brand-orange px-3 py-1.5 text-xs font-bold">Linked trip</span>
            <div className="flex-1 min-w-0">
                <p className="font-bold truncate">{tour.title}</p>
                <p className="text-sm text-slate-400">
                    {kind === 'flight' ? 'Flights' : 'Stays'} you book here appear under this trip in your dashboard.
                </p>
            </div>
            <Link to="/dashboard" className="text-sm font-bold text-brand-orange hover:underline">View trip</Link>
        </div>
    );
};
