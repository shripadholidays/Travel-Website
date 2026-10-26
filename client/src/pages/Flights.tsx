import { NoResults } from '@/components/NoResults';
import { useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, PlaneTakeoff, RotateCcw } from 'lucide-react';
import { PageTitle } from '@/components/PageTitle';
import { AccordionHero, type HeroPanel } from '@/components/travel/AccordionHero';
import { Eyebrow } from '@/components/travel/Eyebrow';
import { FlightSearchForm } from '@/components/travel/FlightSearchForm';
import { FlightCard } from '@/components/travel/FlightCard';
import { FlightFilters, EMPTY_FLIGHT_FILTERS, type FlightFilterState } from '@/components/travel/FlightFilters';
import { FlightDetailsDialog } from '@/components/travel/FlightDetailsDialog';
import { PlaneLoader, useRiseIn, useStaggerIn } from '@/components/travel/motion';
import { LinkedTripBanner } from '@/components/travel/LinkedTripBanner';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useFlightSearch } from '@/hooks/use-travel';
import { departureBucket, prettyDate, totalDuration } from '@/lib/travel';
import { cn } from '@/lib/utils';
import type { Cabin, FlightOffer, FlightSearchParams } from '@/types/travel';

const PANELS: HeroPanel[] = [
    { label: 'Weekend trips', title: 'Weekend Trips', color: 'from-blue-500/80', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2073&auto=format&fit=crop' },
    { label: 'Fly anywhere', title: 'Fly Anywhere', color: 'from-blue-600/80', image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=2074&auto=format&fit=crop' },
    { label: 'International', title: 'Go Global', color: 'from-purple-600/80', image: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=2144&auto=format&fit=crop' },
    { label: 'Domestic', title: 'Across India', color: 'from-orange-600/80', image: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?q=80&w=2070&auto=format&fit=crop' },
    { label: 'Long haul', title: 'Long Haul', color: 'from-green-800/80', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2070&auto=format&fit=crop' },
];

type SortKey = 'cheapest' | 'fastest' | 'best';

function paramsFromUrl(sp: URLSearchParams): FlightSearchParams | null {
    const from = sp.get('from');
    const to = sp.get('to');
    const departDate = sp.get('depart');
    if (!from || !to || !departDate) return null;
    return {
        from, to, departDate,
        returnDate: sp.get('return') || undefined,
        adults: Number(sp.get('adults') || 1),
        cabin: (sp.get('cabin') as Cabin) || 'economy',
    };
}

export const FlightsPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const params = useMemo(() => paramsFromUrl(searchParams), [searchParams]);
    const linkedBooking = searchParams.get('linkedBooking') || undefined;
    const { data, isLoading, isError, error, refetch } = useFlightSearch(params);
    const [filters, setFilters] = useState<FlightFilterState>(EMPTY_FLIGHT_FILTERS);
    const [sort, setSort] = useState<SortKey>('cheapest');
    const [selected, setSelected] = useState<FlightOffer | null>(null);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const formRef = useRef<HTMLDivElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);

    const offers = data?.offers ?? [];

    const meta = useMemo(() => {
        const airlines = new Map<string, string>();
        const cheapestByStops: Record<number, number | undefined> = {};
        let min = Infinity;
        let max = 0;
        for (const o of offers) {
            airlines.set(o.airline.code, o.airline.name);
            const stops = o.slices[0].stops;
            cheapestByStops[stops] = Math.min(cheapestByStops[stops] ?? Infinity, o.pricePerAdult);
            min = Math.min(min, o.pricePerAdult);
            max = Math.max(max, o.pricePerAdult);
        }
        return {
            airlines: [...airlines].map(([code, name]) => ({ code, name })),
            cheapestByStops,
            priceRange: [Number.isFinite(min) ? min : 0, max] as [number, number],
        };
    }, [offers]);

    const visible = useMemo(() => {
        const list = offers.filter((o) => {
            const s = o.slices[0];
            if (filters.stops.length && !filters.stops.includes(s.stops)) return false;
            if (filters.buckets.length && !filters.buckets.includes(departureBucket(s.departTime))) return false;
            if (filters.airlines.length && !filters.airlines.includes(o.airline.code)) return false;
            if (filters.maxPrice !== null && o.pricePerAdult > filters.maxPrice) return false;
            return true;
        });
        const [pMin, pMax] = meta.priceRange;
        const durations = list.map(totalDuration);
        const dMin = Math.min(...durations);
        const dMax = Math.max(...durations);
        const norm = (v: number, a: number, b: number) => (b > a ? (v - a) / (b - a) : 0);
        const score = (o: FlightOffer) => norm(o.pricePerAdult, pMin, pMax) * 0.6 + norm(totalDuration(o), dMin, dMax) * 0.4;
        return [...list].sort((a, b) => {
            if (sort === 'fastest') return totalDuration(a) - totalDuration(b);
            if (sort === 'best') return score(a) - score(b);
            return a.pricePerAdult - b.pricePerAdult;
        });
    }, [offers, filters, sort, meta.priceRange]);

    useRiseIn(formRef);
    useStaggerIn(resultsRef, [visible.length, sort, data]);

    const onSearch = (p: FlightSearchParams) => {
        const next = new URLSearchParams({ from: p.from, to: p.to, depart: p.departDate, adults: String(p.adults), cabin: p.cabin });
        if (p.returnDate) next.set('return', p.returnDate);
        if (linkedBooking) next.set('linkedBooking', linkedBooking);
        setFilters(EMPTY_FLIGHT_FILTERS);
        setSearchParams(next);
        setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    };

    const onContinue = (offer: FlightOffer) => {
        const qs = linkedBooking ? `?linkedBooking=${encodeURIComponent(linkedBooking)}` : '';
        navigate(`/checkout/travel/flight/${encodeURIComponent(offer.id)}${qs}`);
    };

    const sortTabs: { id: SortKey; label: string }[] = [
        { id: 'cheapest', label: 'Cheapest' },
        { id: 'fastest', label: 'Fastest' },
        { id: 'best', label: 'Best' },
    ];

    const filterPanel = (
        <FlightFilters value={filters} onChange={setFilters} airlines={meta.airlines} cheapestByStops={meta.cheapestByStops} priceRange={meta.priceRange} />
    );

    return (
        <div className="bg-background min-h-screen">
            <PageTitle title="Flights" description="Search and book flights across India and around the world, linked to your Wandeazy trip." />
            <AccordionHero
                panels={PANELS}
                eyebrow="Flights · India & International"
                description="Every airline in one search. Line your flights up with your Wandeazy tour."
            />

            <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-6 -mt-28">
                <div ref={formRef} className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl shadow-brand-blue/15 p-5 md:p-6">
                    <FlightSearchForm
                        key={searchParams.toString()}
                        initial={params ?? undefined}
                        toQuery={searchParams.get('toQuery') || undefined}
                        onSearch={onSearch}
                    />
                </div>
            </div>

            <section ref={resultsRef} className="max-w-7xl mx-auto px-4 lg:px-6 py-14 scroll-mt-24" aria-label="Flight results">
                {linkedBooking && <LinkedTripBanner bookingId={linkedBooking} kind="flight" />}

                {!params ? (
                    <div className="text-center py-16">
                        <PlaneTakeoff className="w-12 h-12 mx-auto text-brand-orange mb-4" />
                        <h2 className="text-3xl font-display font-bold text-brand-blue">Where to next?</h2>
                        <p className="mt-2 text-muted-foreground">Pick your airports and dates above to see every fare.</p>
                    </div>
                ) : isLoading ? (
                    <PlaneLoader label="Finding the best fares…" />
                ) : isError ? (
                    <div className="text-center py-16">
                        <h2 className="text-2xl font-display font-bold text-brand-blue">Couldn't reach the airlines</h2>
                        <p className="mt-2 text-muted-foreground">{(error as Error)?.message || 'Please try again in a moment.'}</p>
                        <button type="button" onClick={() => refetch()} className="mt-6 h-11 px-6 rounded-full bg-brand-orange text-white font-bold inline-flex items-center gap-2">
                            <RotateCcw className="w-4 h-4" /> Retry
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col lg:flex-row gap-8 items-start">
                        <aside className="hidden lg:block w-72 shrink-0 bg-slate-50 rounded-[2rem] p-6 sticky top-28" aria-label="Filters">
                            {filterPanel}
                        </aside>

                        <div className="flex-1 min-w-0 flex flex-col gap-4">
                            <div className="flex flex-wrap items-end justify-between gap-4 mb-2">
                                <div>
                                    <Eyebrow className="mb-3">{params.from} → {params.to} · {prettyDate(params.departDate)}</Eyebrow>
                                    <h2 aria-live="polite" className="text-4xl font-display font-bold text-brand-blue">
                                        {visible.length} {visible.length === 1 ? 'flight' : 'flights'} found
                                    </h2>
                                    <p className="mt-1 text-muted-foreground">Prices include taxes and fees.</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button type="button" onClick={() => setFiltersOpen(true)} className="lg:hidden h-11 px-4 rounded-full border border-slate-200 font-bold text-sm inline-flex items-center gap-2">
                                        <SlidersHorizontal className="w-4 h-4 text-brand-orange" /> Filters
                                    </button>
                                    <div role="tablist" aria-label="Sort flights" className="flex rounded-full bg-slate-50 border border-slate-100 p-1">
                                        {sortTabs.map((t) => (
                                            <button
                                                key={t.id}
                                                role="tab"
                                                aria-selected={sort === t.id}
                                                onClick={() => setSort(t.id)}
                                                className={cn('h-10 px-4 rounded-full text-sm font-bold transition-colors', sort === t.id ? 'bg-brand-blue text-white' : 'text-brand-blue hover:bg-white')}
                                            >
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {visible.length === 0 ? (
                                <NoResults
                                    title="No flights match"
                                    message="Try clearing a filter or searching nearby dates, or ask our team to find a route for you."
                                    onClear={() => setFilters(EMPTY_FLIGHT_FILTERS)}
                                />

                            ) : (
                                visible.map((offer) => <FlightCard key={offer.id} offer={offer} onSelect={setSelected} />)
                            )}
                        </div>
                    </div>
                )}
            </section>

            <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
                <DialogContent className="rounded-[2rem] max-h-[85vh] overflow-y-auto">
                    <DialogTitle className="sr-only">Filters</DialogTitle>
                    {filterPanel}
                </DialogContent>
            </Dialog>

            <FlightDetailsDialog offer={selected} onClose={() => setSelected(null)} onContinue={onContinue} />
        </div>
    );
};
