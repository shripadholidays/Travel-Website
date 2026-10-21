import { Link } from 'react-router-dom';
import { ArrowUpRight, BedDouble, Plane } from 'lucide-react';
import { useEnabledFeatures } from '@/hooks/use-feature';
import { addDaysIso, cityFromLocation, isoDate } from '@/lib/travel';
import { cn } from '@/lib/utils';

interface TripAddonsProps {
    location?: string;
    /** Travel date (any parseable date); defaults to two weeks out. */
    date?: string;
    nights?: number;
    linkedBooking?: string | null;
    variant?: 'tour' | 'success';
}

const toIso = (date?: string) => {
    if (!date) return isoDate(14);
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return isoDate(14);
    const iso = d.toISOString().slice(0, 10);
    return iso < isoDate(0) ? isoDate(14) : iso;
};

/** "Fly there / Stay nearby" — each card exists only while its service is switched on. */
export const TripAddons = ({ location, date, nights = 3, linkedBooking, variant = 'tour' }: TripAddonsProps) => {
    const { flights, hotels } = useEnabledFeatures();
    if (!flights && !hotels) return null;

    const city = cityFromLocation(location);
    const start = toIso(date);
    const end = addDaysIso(start, Math.max(1, nights));
    const link = (path: string, params: Record<string, string>) => {
        const qs = new URLSearchParams(params);
        if (linkedBooking) qs.set('linkedBooking', linkedBooking);
        return `${path}?${qs}`;
    };

    const cards = [
        flights && {
            key: 'flights',
            icon: Plane,
            title: 'Fly there',
            text: city ? `Flights to ${city}` : 'Find flights',
            to: link('/flights', { toQuery: city, depart: start }),
        },
        hotels && {
            key: 'hotels',
            icon: BedDouble,
            title: 'Stay nearby',
            text: city ? `Hotels in ${city}` : 'Find hotels',
            to: link('/hotels', { place: city, in: start, out: end, rooms: '1', adults: '2' }),
        },
    ].filter(Boolean) as { key: string; icon: typeof Plane; title: string; text: string; to: string }[];

    return (
        <div className={cn(variant === 'success' ? 'mt-10 text-left' : 'pt-6 border-t border-slate-100')}>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {variant === 'success' ? 'Complete your trip' : 'Make it a full trip'}
            </p>
            <div className={cn('grid gap-3', variant === 'success' && cards.length > 1 && 'sm:grid-cols-2')}>
                {cards.map(({ key, icon: Icon, title, text, to }) => (
                    <Link
                        key={key}
                        to={to}
                        className="group flex items-center gap-3 rounded-2xl bg-slate-50 p-3.5 hover:bg-brand-orange/10 transition-colors"
                    >
                        <span className="w-11 h-11 shrink-0 rounded-full bg-white text-brand-orange flex items-center justify-center shadow-sm">
                            <Icon className="w-5 h-5" />
                        </span>
                        <span className="flex-1 min-w-0">
                            <span className="block font-bold text-brand-blue">{title}</span>
                            <span className="block text-sm text-muted-foreground truncate">{text}</span>
                        </span>
                        <ArrowUpRight className="w-5 h-5 text-brand-blue transition-transform group-hover:rotate-45 group-hover:text-brand-orange" />
                    </Link>
                ))}
            </div>
        </div>
    );
};
