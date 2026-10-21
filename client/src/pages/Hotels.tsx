import { lazy, Suspense, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BedDouble, RotateCcw } from 'lucide-react';
import { PageTitle } from '@/components/PageTitle';
import { AccordionHero, type HeroPanel } from '@/components/travel/AccordionHero';
import { Eyebrow } from '@/components/travel/Eyebrow';
import { HotelSearchForm } from '@/components/travel/HotelSearchForm';
import { HotelCard } from '@/components/travel/HotelCard';
import { LinkedTripBanner } from '@/components/travel/LinkedTripBanner';
import { useRiseIn, useStaggerIn } from '@/components/travel/motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useHotelSearch } from '@/hooks/use-travel';
import { hotelLink, prettyDate } from '@/lib/travel';
import { cn } from '@/lib/utils';
import type { HotelSearchParams } from '@/types/travel';

const HotelMap = lazy(() => import('@/components/travel/HotelMap').then((m) => ({ default: m.HotelMap })));

const PANELS: HeroPanel[] = [
    { label: 'Beach resorts', title: 'Beach Resorts', color: 'from-blue-500/80', image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=2070&auto=format&fit=crop' },
    { label: 'Heritage stays', title: 'Heritage Stays', color: 'from-orange-600/80', image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070&auto=format&fit=crop' },
    { label: 'Hill stations', title: 'Hill Stations', color: 'from-emerald-600/80', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2070&auto=format&fit=crop' },
    { label: 'City hotels', title: 'City Hotels', color: 'from-purple-600/80', image: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=2144&auto=format&fit=crop' },
    { label: 'Jungle lodges', title: 'Jungle Lodges', color: 'from-green-800/80', image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=2070&auto=format&fit=crop' },
];

type QuickFilter = 'stars4' | 'refundable' | 'breakfast';

function paramsFromUrl(sp: URLSearchParams): HotelSearchParams | null {
    const place = sp.get('place');
    const checkIn = sp.get('in');
    const checkOut = sp.get('out');
    if (!place || !checkIn || !checkOut) return null;
    return { place, checkIn, checkOut, rooms: Number(sp.get('rooms') || 1), adults: Number(sp.get('adults') || 2) };
}

export const HotelsPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const params = useMemo(() => paramsFromUrl(searchParams), [searchParams]);
    const linkedBooking = searchParams.get('linkedBooking') || undefined;
    const { data, isLoading, isError, error, refetch } = useHotelSearch(params);
    const [view, setView] = useState<'list' | 'map'>('list');
    const [quick, setQuick] = useState<QuickFilter[]>([]);
    const formRef = useRef<HTMLDivElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);

    const visible = useMemo(() => (data?.offers ?? [])
        .filter((o) => !quick.includes('stars4') || o.hotel.stars >= 4)
        .filter((o) => !quick.includes('refundable') || o.refundable)
        .filter((o) => !quick.includes('breakfast') || o.hotel.amenities.some((a) => /breakfast/i.test(a)))
        .sort((a, b) => a.pricePerNight - b.pricePerNight), [data, quick]);

    useRiseIn(formRef);
    useStaggerIn(resultsRef, [visible.length, view, data]);

    const onSearch = (p: HotelSearchParams) => {
        const next = new URLSearchParams({ place: p.place, in: p.checkIn, out: p.checkOut, rooms: String(p.rooms), adults: String(p.adults) });
        if (linkedBooking) next.set('linkedBooking', linkedBooking);
        setSearchParams(next);
        setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    };

    const chip = (id: QuickFilter, label: string) => {
        const on = quick.includes(id);
        return (
            <button
                key={id}
                type="button"
                aria-pressed={on}
                onClick={() => setQuick((q) => (on ? q.filter((x) => x !== id) : [...q, id]))}
                className={cn('h-11 px-4 rounded-full text-sm font-bold transition-colors', on ? 'bg-brand-blue text-white' : 'border border-slate-200 text-brand-blue hover:bg-slate-50')}
            >
                {label}
            </button>
        );
    };

    return (
        <div className="bg-background min-h-screen">
            <PageTitle title="Hotels" description="Hand-picked hotels across India and the world, right next to your WandEazy tour." />
            <AccordionHero
                panels={PANELS}
                eyebrow="Hotels · India & Worldwide"
                description="From palace havelis to beachfront villas, find a stay right next to your tour."
            />

            <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-6 -mt-28">
                <div ref={formRef} className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl shadow-brand-blue/15 p-5 md:p-6">
                    <HotelSearchForm key={searchParams.toString()} initial={params ?? undefined} onSearch={onSearch} />
                </div>
            </div>

            <section ref={resultsRef} className="max-w-7xl mx-auto px-4 lg:px-6 py-14 scroll-mt-24" aria-label="Hotel results">
                {linkedBooking && <LinkedTripBanner bookingId={linkedBooking} kind="hotel" />}

                {!params ? (
                    <div className="text-center py-16">
                        <BedDouble className="w-12 h-12 mx-auto text-brand-orange mb-4" />
                        <h2 className="text-3xl font-display font-bold text-brand-blue">Where are you staying?</h2>
                        <p className="mt-2 text-muted-foreground">Try Goa, Jaipur, Udaipur, Dubai or Bali.</p>
                    </div>
                ) : isLoading ? (
                    <div role="status" aria-label="Loading hotels" className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-[440px] rounded-[2rem]" />)}
                    </div>
                ) : isError ? (
                    <div className="text-center py-16">
                        <h2 className="text-2xl font-display font-bold text-brand-blue">Couldn't reach the hotels</h2>
                        <p className="mt-2 text-muted-foreground">{(error as Error)?.message || 'Please try again in a moment.'}</p>
                        <button type="button" onClick={() => refetch()} className="mt-6 h-11 px-6 rounded-full bg-brand-orange text-white font-bold inline-flex items-center gap-2">
                            <RotateCcw className="w-4 h-4" /> Retry
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
                            <div>
                                <Eyebrow className="mb-3">{params.place} · {prettyDate(params.checkIn)} – {prettyDate(params.checkOut)}</Eyebrow>
                                <h2 aria-live="polite" className="text-4xl font-display font-bold text-brand-blue">
                                    {visible.length} {visible.length === 1 ? 'stay' : 'stays'} found
                                </h2>
                                <p className="mt-1 text-muted-foreground">Hand-picked hotels near your plans.</p>
                            </div>
                            <div className="flex flex-wrap gap-2 items-center">
                                {chip('stars4', '4★ & up')}
                                {chip('refundable', 'Free cancellation')}
                                {chip('breakfast', 'Breakfast')}
                                <div role="tablist" aria-label="View" className="flex rounded-full bg-slate-50 border border-slate-100 p-1">
                                    {(['list', 'map'] as const).map((v) => (
                                        <button
                                            key={v}
                                            role="tab"
                                            aria-selected={view === v}
                                            onClick={() => setView(v)}
                                            className={cn('h-9 px-4 rounded-full text-sm font-bold capitalize transition-colors', view === v ? 'bg-brand-orange text-white' : 'text-brand-blue hover:bg-white')}
                                        >
                                            {v}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {visible.length === 0 ? (
                            <div className="rounded-[2rem] bg-slate-50 p-10 text-center">
                                <h3 className="text-2xl font-display font-bold text-brand-blue">No stays match</h3>
                                <p className="mt-2 text-muted-foreground">Try another city, different dates or fewer filters.</p>
                            </div>
                        ) : view === 'map' ? (
                            <Suspense fallback={<Spinner center />}>
                                <HotelMap offers={visible} linkFor={(o) => hotelLink(o, linkedBooking)} />
                            </Suspense>
                        ) : (
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {visible.map((o) => <HotelCard key={o.id} offer={o} to={hotelLink(o, linkedBooking)} />)}
                            </div>
                        )}
                    </>
                )}
            </section>
        </div>
    );
};
