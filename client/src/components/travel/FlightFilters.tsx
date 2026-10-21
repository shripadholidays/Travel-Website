import { Checkbox } from '@/components/ui/checkbox';
import { useCurrency } from '@/context/CurrencyContext';
import type { DepartureBucket } from '@/lib/travel';
import { cn } from '@/lib/utils';

export interface FlightFilterState {
    stops: number[];
    buckets: DepartureBucket[];
    airlines: string[];
    maxPrice: number | null;
}

export const EMPTY_FLIGHT_FILTERS: FlightFilterState = { stops: [], buckets: [], airlines: [], maxPrice: null };

const BUCKETS: { id: DepartureBucket; label: string; hint: string }[] = [
    { id: 'morning', label: 'Morning', hint: '5am–12pm' },
    { id: 'afternoon', label: 'Afternoon', hint: '12–5pm' },
    { id: 'evening', label: 'Evening', hint: '5–9pm' },
    { id: 'night', label: 'Night', hint: '9pm–5am' },
];

const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

interface Props {
    value: FlightFilterState;
    onChange: (v: FlightFilterState) => void;
    airlines: { code: string; name: string }[];
    cheapestByStops: Record<number, number | undefined>;
    priceRange: [number, number];
}

export const FlightFilters = ({ value, onChange, airlines, cheapestByStops, priceRange }: Props) => {
    const { formatPrice } = useCurrency();
    const [min, max] = priceRange;
    const current = value.maxPrice ?? max;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-display font-bold text-brand-blue">Filters</h2>
                <button type="button" onClick={() => onChange(EMPTY_FLIGHT_FILTERS)} className="text-sm font-bold text-brand-orange hover:underline">Reset</button>
            </div>

            <fieldset className="flex flex-col gap-3">
                <legend className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Stops</legend>
                {[0, 1].map((s) => (
                    <div key={s} className="flex items-center justify-between text-sm">
                        <Checkbox
                            checked={value.stops.includes(s)}
                            onChange={() => onChange({ ...value, stops: toggle(value.stops, s) })}
                            label={s === 0 ? 'Non-stop' : '1 stop'}
                        />
                        {cheapestByStops[s] !== undefined && <span className="text-muted-foreground tabular-nums">{formatPrice(cheapestByStops[s]!)}</span>}
                    </div>
                ))}
            </fieldset>

            <fieldset>
                <legend className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Departure</legend>
                <div className="grid grid-cols-2 gap-2">
                    {BUCKETS.map((b) => {
                        const on = value.buckets.includes(b.id);
                        return (
                            <button
                                key={b.id}
                                type="button"
                                aria-pressed={on}
                                onClick={() => onChange({ ...value, buckets: toggle(value.buckets, b.id) })}
                                className={cn(
                                    'min-h-11 rounded-full px-3 text-[13px] font-bold transition-colors',
                                    on ? 'bg-brand-orange text-white' : 'bg-white border border-slate-200 text-brand-blue hover:border-brand-orange',
                                )}
                                title={b.hint}
                            >
                                {b.label}
                            </button>
                        );
                    })}
                </div>
            </fieldset>

            {airlines.length > 0 && (
                <fieldset className="flex flex-col gap-3">
                    <legend className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Airlines</legend>
                    {airlines.map((a) => (
                        <Checkbox
                            key={a.code}
                            className="text-sm"
                            checked={value.airlines.includes(a.code)}
                            onChange={() => onChange({ ...value, airlines: toggle(value.airlines, a.code) })}
                            label={a.name}
                        />
                    ))}
                </fieldset>
            )}

            {max > min && (
                <label className="flex flex-col gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Max price · {formatPrice(current)}</span>
                    <input
                        type="range"
                        min={Math.floor(min)}
                        max={Math.ceil(max)}
                        value={Math.ceil(current)}
                        onChange={(e) => onChange({ ...value, maxPrice: Number(e.target.value) })}
                        className="accent-brand-orange"
                    />
                </label>
            )}
        </div>
    );
};
