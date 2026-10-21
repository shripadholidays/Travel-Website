import { useState } from 'react';
import { toast } from 'sonner';
import { Combobox, FieldShell, fieldInputClass } from '@/components/travel/Combobox';
import { usePlaces } from '@/hooks/use-travel';
import { useDebounced } from '@/hooks/use-debounced';
import { addDaysIso, isoDate } from '@/lib/travel';
import { cn } from '@/lib/utils';
import type { HotelSearchParams } from '@/types/travel';

interface Props {
    initial?: Partial<HotelSearchParams>;
    onSearch: (params: HotelSearchParams) => void;
    compact?: boolean;
}

export const HotelSearchForm = ({ initial, onSearch, compact }: Props) => {
    const [place, setPlace] = useState(initial?.place || '');
    const [query, setQuery] = useState('');
    const debounced = useDebounced(query);
    const { data, isFetching } = usePlaces(debounced);
    const [checkIn, setCheckIn] = useState(initial?.checkIn || isoDate(14));
    const [checkOut, setCheckOut] = useState(initial?.checkOut || addDaysIso(initial?.checkIn || isoDate(14), 3));
    const [rooms, setRooms] = useState(initial?.rooms || 1);
    const [adults, setAdults] = useState(initial?.adults || 2);
    const today = isoDate(0);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!place) return toast.error('Choose a city or hotel.');
        if (checkOut <= checkIn) return toast.error('Check-out must be after check-in.');
        onSearch({ place, checkIn, checkOut, rooms, adults });
    };

    return (
        <form onSubmit={submit} aria-label="Search hotels" className={cn('grid gap-2.5 items-stretch grid-cols-1 md:grid-cols-2', compact ? 'lg:grid-cols-5' : 'lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]')}>
            <Combobox
                label="City or hotel"
                placeholder="Where are you staying?"
                displayValue={place}
                query={query}
                onQueryChange={setQuery}
                loading={isFetching}
                options={(data?.places ?? []).map((p) => ({ value: p.name, label: p.name, sublabel: p.country }))}
                onSelect={(o) => setPlace(o.value)}
            />
            <FieldShell label="Check-in" htmlFor="hotel-in">
                <input
                    id="hotel-in"
                    type="date"
                    min={today}
                    value={checkIn}
                    onChange={(e) => {
                        setCheckIn(e.target.value);
                        if (checkOut <= e.target.value) setCheckOut(addDaysIso(e.target.value, 1));
                    }}
                    className={fieldInputClass}
                    required
                />
            </FieldShell>
            <FieldShell label="Check-out" htmlFor="hotel-out">
                <input id="hotel-out" type="date" min={addDaysIso(checkIn, 1)} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className={fieldInputClass} required />
            </FieldShell>
            <FieldShell label="Rooms & guests" htmlFor="hotel-rooms">
                <div className="flex gap-2">
                    <select id="hotel-rooms" value={rooms} onChange={(e) => setRooms(Number(e.target.value))} className={cn(fieldInputClass, 'w-auto')} aria-label="Rooms">
                        {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} {n === 1 ? 'room' : 'rooms'}</option>)}
                    </select>
                    <select value={adults} onChange={(e) => setAdults(Number(e.target.value))} className={cn(fieldInputClass, 'w-auto')} aria-label="Guests">
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n} {n === 1 ? 'guest' : 'guests'}</option>)}
                    </select>
                </div>
            </FieldShell>
            <button type="submit" className="min-h-16 px-8 rounded-full bg-brand-orange text-white font-bold hover:bg-brand-orange/90 shadow-lg shadow-brand-orange/30 transition-colors">
                Search hotels
            </button>
        </form>
    );
};
