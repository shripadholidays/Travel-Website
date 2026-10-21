import { useEffect, useRef, useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { toast } from 'sonner';
import { Combobox, FieldShell, fieldInputClass } from '@/components/travel/Combobox';
import { spin } from '@/components/travel/motion';
import { useAirports } from '@/hooks/use-travel';
import { useDebounced } from '@/hooks/use-debounced';
import { CABIN_LABELS, addDaysIso, isoDate } from '@/lib/travel';
import { cn } from '@/lib/utils';
import type { Airport, Cabin, FlightSearchParams } from '@/types/travel';

interface FlightSearchFormProps {
    initial?: Partial<FlightSearchParams>;
    /** City name to resolve into the destination airport (from tour links). */
    toQuery?: string;
    onSearch: (params: FlightSearchParams) => void;
    compact?: boolean;
}

const airportLabel = (a: Airport | null) => (a ? `${a.code} · ${a.city}` : '');

function AirportField({ label, value, onChange, resolveCode, resolveQuery }: {
    label: string;
    value: Airport | null;
    onChange: (a: Airport) => void;
    resolveCode?: string;
    resolveQuery?: string;
}) {
    const [query, setQuery] = useState('');
    const debounced = useDebounced(query);
    const { data, isFetching } = useAirports(debounced);

    // Resolve an airport code (from the URL) or a city (from a tour) into a full airport once.
    const seed = !value ? (resolveCode || resolveQuery || '') : '';
    const { data: seedData } = useAirports(seed);
    useEffect(() => {
        if (value || !seedData?.airports?.length) return;
        const match = seedData.airports.find((a) => a.code === resolveCode?.toUpperCase()) ?? seedData.airports[0];
        if (match) onChange(match);
    }, [seedData, value, resolveCode, onChange]);

    return (
        <Combobox
            label={label}
            placeholder="City or airport"
            displayValue={airportLabel(value)}
            query={query}
            onQueryChange={setQuery}
            loading={isFetching && debounced.length > 0}
            options={(debounced ? data?.airports ?? [] : []).map((a) => ({
                value: a.code, label: a.city, sublabel: a.name, badge: a.code,
            }))}
            onSelect={(o) => {
                const airport = data?.airports.find((a) => a.code === o.value);
                if (airport) onChange(airport);
            }}
        />
    );
}

export const FlightSearchForm = ({ initial, toQuery, onSearch, compact }: FlightSearchFormProps) => {
    const [roundTrip, setRoundTrip] = useState(Boolean(initial?.returnDate) || !initial?.departDate);
    const [from, setFrom] = useState<Airport | null>(null);
    const [to, setTo] = useState<Airport | null>(null);
    const [departDate, setDepartDate] = useState(initial?.departDate || isoDate(14));
    const [returnDate, setReturnDate] = useState(initial?.returnDate || addDaysIso(initial?.departDate || isoDate(14), 7));
    const [adults, setAdults] = useState(initial?.adults || 1);
    const [cabin, setCabin] = useState<Cabin>(initial?.cabin || 'economy');
    const swapRef = useRef<HTMLButtonElement>(null);
    const today = isoDate(0);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!from || !to) return toast.error('Choose where you are flying from and to.');
        if (from.code === to.code) return toast.error('Origin and destination must be different.');
        if (roundTrip && returnDate < departDate) return toast.error('Return date must be after departure.');
        onSearch({
            from: from.code, to: to.code, departDate, returnDate: roundTrip ? returnDate : undefined, adults, cabin,
        });
    };

    const pill = (active: boolean) => cn(
        'h-11 px-5 rounded-full text-sm font-bold transition-colors',
        active ? 'bg-brand-blue text-white' : 'border border-slate-200 text-brand-blue hover:bg-slate-50',
    );

    return (
        <form onSubmit={submit} aria-label="Search flights" className="flex flex-col gap-4">
            <div className="flex gap-2" role="group" aria-label="Trip type">
                <button type="button" className={pill(roundTrip)} aria-pressed={roundTrip} onClick={() => setRoundTrip(true)}>Round trip</button>
                <button type="button" className={pill(!roundTrip)} aria-pressed={!roundTrip} onClick={() => setRoundTrip(false)}>One way</button>
            </div>
            <div className={cn('grid gap-2.5 items-stretch', compact ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-6' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_auto_1fr_1fr_1fr_1fr_auto]')}>
                <AirportField label="From" value={from} onChange={setFrom} resolveCode={initial?.from} />
                <button
                    ref={swapRef}
                    type="button"
                    aria-label="Swap origin and destination"
                    onClick={() => {
                        spin(swapRef.current);
                        setFrom(to);
                        setTo(from);
                    }}
                    className={cn('self-center justify-self-center w-11 h-11 rounded-full border border-slate-200 bg-white flex items-center justify-center text-brand-blue hover:bg-brand-orange hover:text-white hover:border-brand-orange transition-colors', compact && 'hidden')}
                >
                    <ArrowLeftRight className="w-4 h-4" />
                </button>
                <AirportField label="To" value={to} onChange={setTo} resolveCode={initial?.to} resolveQuery={toQuery} />
                <FieldShell label="Depart" htmlFor="flight-depart">
                    <input id="flight-depart" type="date" min={today} value={departDate} onChange={(e) => setDepartDate(e.target.value)} className={fieldInputClass} required />
                </FieldShell>
                <FieldShell label="Return" htmlFor="flight-return" className={cn(!roundTrip && 'opacity-50')}>
                    <input id="flight-return" type="date" min={departDate} value={returnDate} disabled={!roundTrip} onChange={(e) => setReturnDate(e.target.value)} className={fieldInputClass} />
                </FieldShell>
                <FieldShell label="Travellers" htmlFor="flight-pax">
                    <div className="flex gap-2">
                        <select id="flight-pax" value={adults} onChange={(e) => setAdults(Number(e.target.value))} className={cn(fieldInputClass, 'w-auto')} aria-label="Adults">
                            {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n} {n === 1 ? 'adult' : 'adults'}</option>)}
                        </select>
                        <select value={cabin} onChange={(e) => setCabin(e.target.value as Cabin)} className={cn(fieldInputClass, 'w-auto')} aria-label="Cabin class">
                            {Object.entries(CABIN_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                    </div>
                </FieldShell>
                <button type="submit" className="min-h-16 px-8 rounded-full bg-brand-orange text-white font-bold hover:bg-brand-orange/90 shadow-lg shadow-brand-orange/30 transition-colors">
                    Search flights
                </button>
            </div>
        </form>
    );
};
