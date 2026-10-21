import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BedDouble, Compass, Plane, Search } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEnabledFeatures } from '@/hooks/use-feature';
import { FlightSearchForm } from '@/components/travel/FlightSearchForm';
import { HotelSearchForm } from '@/components/travel/HotelSearchForm';
import { FieldShell, fieldInputClass } from '@/components/travel/Combobox';
import { prefersReducedMotion } from '@/lib/travel';
import { cn } from '@/lib/utils';

gsap.registerPlugin(useGSAP, ScrollTrigger);

type Tab = 'tours' | 'flights' | 'hotels';

/** Home search card under the hero. Only rendered when at least one booking service is on. */
export const TravelSearchTabs = () => {
    const { flights, hotels } = useEnabledFeatures();
    const navigate = useNavigate();
    const [tab, setTab] = useState<Tab>('tours');
    const [q, setQ] = useState('');
    const ref = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        if (prefersReducedMotion() || !ref.current) return;
        gsap.from(ref.current, {
            y: 48,
            autoAlpha: 0,
            duration: 0.8,
            ease: 'power3.out',
            clearProps: 'all',
            scrollTrigger: { trigger: ref.current, start: 'top 95%', once: true },
        });
    }, { scope: ref });

    const tabs = [
        { id: 'tours' as const, label: 'Tours', icon: Compass, on: true },
        { id: 'flights' as const, label: 'Flights', icon: Plane, on: flights },
        { id: 'hotels' as const, label: 'Hotels', icon: BedDouble, on: hotels },
    ].filter((t) => t.on);

    const active = tabs.some((t) => t.id === tab) ? tab : 'tours';

    return (
        <section aria-label="Search trips, flights and hotels" className="relative z-20 max-w-7xl mx-auto px-4 lg:px-6 pt-12">
            <div ref={ref} className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl shadow-brand-blue/15 p-5 md:p-6">
                <div role="tablist" aria-label="What are you booking?" className="flex gap-2 mb-5">
                    {tabs.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            role="tab"
                            id={`search-tab-${id}`}
                            aria-selected={active === id}
                            aria-controls={`search-panel-${id}`}
                            onClick={() => setTab(id)}
                            className={cn(
                                'h-11 px-5 rounded-full text-sm font-bold inline-flex items-center gap-2 transition-colors',
                                active === id ? 'bg-brand-blue text-white' : 'border border-slate-200 text-brand-blue hover:bg-slate-50',
                            )}
                        >
                            <Icon className={cn('w-4 h-4', active === id ? 'text-brand-orange' : '')} />{label}
                        </button>
                    ))}
                </div>

                <div role="tabpanel" id={`search-panel-${active}`} aria-labelledby={`search-tab-${active}`}>
                    {active === 'tours' && (
                        <form
                            className="grid gap-2.5 md:grid-cols-[1fr_auto]"
                            onSubmit={(e) => {
                                e.preventDefault();
                                navigate(q.trim() ? `/tours?q=${encodeURIComponent(q.trim())}` : '/tours');
                            }}
                        >
                            <FieldShell label="Destination or tour" htmlFor="home-tour-q">
                                <input id="home-tour-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Try Bali, Kerala or Swiss Alps" className={cn(fieldInputClass, 'placeholder:text-slate-400 placeholder:font-medium')} />
                            </FieldShell>
                            <button type="submit" className="min-h-16 px-8 rounded-full bg-brand-orange text-white font-bold hover:bg-brand-orange/90 shadow-lg shadow-brand-orange/30 inline-flex items-center justify-center gap-2">
                                <Search className="w-4 h-4" /> Find tours
                            </button>
                        </form>
                    )}
                    {active === 'flights' && (
                        <FlightSearchForm
                            compact
                            onSearch={(p) => {
                                const qs = new URLSearchParams({ from: p.from, to: p.to, depart: p.departDate, adults: String(p.adults), cabin: p.cabin });
                                if (p.returnDate) qs.set('return', p.returnDate);
                                navigate(`/flights?${qs}`);
                            }}
                        />
                    )}
                    {active === 'hotels' && (
                        <HotelSearchForm
                            compact
                            onSearch={(p) => navigate(`/hotels?${new URLSearchParams({ place: p.place, in: p.checkIn, out: p.checkOut, rooms: String(p.rooms), adults: String(p.adults) })}`)}
                        />
                    )}
                </div>
            </div>
        </section>
    );
};
