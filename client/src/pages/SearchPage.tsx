import { useEffect, useMemo, useState } from 'react';
import { TourCard } from '@/components/TourCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Pagination } from '@/components/ui/pagination';
import { SortSelect } from '@/components/SortSelect';
import { PageTitle } from '@/components/PageTitle';
import { NoResults } from '@/components/NoResults';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { useTours, useTourFacets } from '@/hooks/use-tours';
import { Search, SlidersHorizontal, X, Star, Check, MapPin } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';

import { Container } from '@/components/ui/container';
import { useCurrency } from '@/context/CurrencyContext';

const PAGE_SIZE = 9;
// The price slider works in US dollars (the server compares each tour's USD price);
// labels are shown in the traveller's currency
const MAX_PRICE = 5000;

// Maps a duration bucket to a min/max day range (backend supports minDays/maxDays).
const DURATION_BUCKETS: Record<string, { min?: number; max?: number }> = {
    '0-3 Days': { min: 0, max: 3 },
    '4-7 Days': { min: 4, max: 7 },
    '8-14 Days': { min: 8, max: 14 },
    '15+ Days': { min: 15 },
};

const RATING_OPTIONS = [4, 3, 2];

// URL params that are filters (as opposed to the search term, sort, page or an open tour)
const FILTER_PARAMS = ['max', 'days', 'rating', 'category', 'place'] as const;

export const SearchPage = () => {
    const { formatPrice } = useCurrency();
    const [searchParams, setSearchParams] = useSearchParams();

    // Every filter lives in the URL, so Back/Forward, refresh and shared links keep them.
    const query = searchParams.get('q') || '';
    const maxPrice = Math.min(MAX_PRICE, Number(searchParams.get('max')) || MAX_PRICE);
    const durations = (searchParams.get('days') || '').split(',').filter((d) => d in DURATION_BUCKETS);
    const ratingParam = Number(searchParams.get('rating'));
    const minRating = RATING_OPTIONS.includes(ratingParam) ? ratingParam : null;
    const categories = (searchParams.get('category') || '').split(',').filter(Boolean);
    const place = searchParams.get('place') || '';
    const sort = searchParams.get('sort') || 'recommended';
    const page = Math.max(1, Number(searchParams.get('page')) || 1);

    // `inputQuery` is the live text box; the URL's ?q= is what we search on.
    const [inputQuery, setInputQuery] = useState(query);
    const [showFilters, setShowFilters] = useState(false);
    const { data: facets } = useTourFacets();

    // The navbar search and Back/Forward change ?q= from outside the box
    useEffect(() => {
        setInputQuery(query);
    }, [query]);

    /** Change some params in place, leaving the rest (e.g. an open tour) alone; filter changes go back to page 1. */
    const setParams = (changes: Record<string, string | null>, keepPage = false) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            for (const [key, value] of Object.entries(changes)) {
                if (value) next.set(key, value); else next.delete(key);
            }
            if (!keepPage) next.delete('page');
            return next;
        }, { replace: true, preventScrollReset: true });
    };

    const syncUrl = (value: string) => setParams({ q: value.trim() || null });
    const setMaxPrice = (value: number) => setParams({ max: value < MAX_PRICE ? String(value) : null });
    const setMinRating = (value: number | null) => setParams({ rating: value ? String(value) : null });
    const setSort = (value: string) => setParams({ sort: value === 'recommended' ? null : value });
    const setPlace = (value: string) => setParams({ place: value || null });
    const setPage = (value: number) => {
        setParams({ page: value > 1 ? String(value) : null }, true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const toggleCategory = (value: string) => {
        const next = categories.includes(value) ? categories.filter((c) => c !== value) : [...categories, value];
        setParams({ category: next.join(',') || null });
    };
    const toggleDuration = (value: string) => {
        const next = durations.includes(value) ? durations.filter((d) => d !== value) : [...durations, value];
        setParams({ days: next.join(',') || null });
    };

    // Debounce the text box so typing doesn't fire a request per keystroke.
    useEffect(() => {
        const id = setTimeout(() => {
            if (inputQuery.trim() !== query) syncUrl(inputQuery);
        }, 400);
        return () => clearTimeout(id);
    }, [inputQuery]); // eslint-disable-line react-hooks/exhaustive-deps

    // Translate selected duration buckets into a single min/max range.
    const dayRange = useMemo(() => {
        if (durations.length === 0) return {};
        const buckets = durations.map((d) => DURATION_BUCKETS[d]).filter(Boolean);
        const min = Math.min(...buckets.map((b) => b.min ?? 0));
        const hasOpenEnded = buckets.some((b) => b.max === undefined);
        const max = hasOpenEnded ? undefined : Math.max(...buckets.map((b) => b.max ?? 0));
        return { minDays: min, maxDays: max };
    }, [durations.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

    const { data, isLoading, isError, refetch } = useTours({
        search: query,
        category: categories.join(',') || undefined,
        place: place || undefined,
        sort: sort === 'recommended' ? '' : sort,
        maxPrice: maxPrice < MAX_PRICE ? maxPrice : undefined,
        minRating: minRating ?? undefined,
        page,
        limit: PAGE_SIZE,
        ...dayRange,
    });

    const tours = data?.tours ?? [];
    const pagination = data?.pagination;
    const totalCount = pagination?.total ?? tours.length;
    const totalPages = pagination?.pages ?? 1;

    const activeFilterCount =
        (maxPrice < MAX_PRICE ? 1 : 0) + durations.length + (minRating ? 1 : 0) + categories.length + (place ? 1 : 0);

    // Clears the filters but keeps the search term
    const resetFilters = () => setParams(Object.fromEntries(FILTER_PARAMS.map((p) => [p, null])));

    const clearEverything = () => {
        setInputQuery('');
        setParams({ q: null, sort: null, ...Object.fromEntries(FILTER_PARAMS.map((p) => [p, null])) });
    };

    const submitSearch = () => syncUrl(inputQuery);

    const filtersPanel = (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-7">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-brand-orange/10 flex items-center justify-center">
                        <SlidersHorizontal className="w-4 h-4 text-brand-orange" />
                    </div>
                    <h2 className="text-lg font-display font-bold text-brand-blue">Filters</h2>
                    {activeFilterCount > 0 && (
                        <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-bold rounded-full bg-brand-orange text-white">
                            {activeFilterCount}
                        </span>
                    )}
                </div>
                {activeFilterCount > 0 && (
                    <button
                        onClick={resetFilters}
                        className="text-sm font-medium text-brand-orange hover:underline"
                    >
                        Clear all
                    </button>
                )}
            </div>

            <Accordion type="multiple" defaultValue={['place', 'category', 'price', 'duration', 'rating']} className="w-full">
                {(facets?.places.length ?? 0) > 0 && (
                    <AccordionItem value="place" className="border-slate-100">
                        <AccordionTrigger className="hover:no-underline text-xs font-bold uppercase tracking-wider text-slate-400">Destination</AccordionTrigger>
                        <AccordionContent>
                            <div className="relative pt-1 pb-2">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-orange pointer-events-none" />
                                <select
                                    value={place}
                                    onChange={(e) => setPlace(e.target.value)}
                                    aria-label="Destination"
                                    className="w-full h-11 pl-9 pr-3 rounded-2xl bg-slate-50 text-sm text-slate-700 border-0 focus:outline-none focus:ring-2 focus:ring-brand-orange/40 cursor-pointer"
                                >
                                    <option value="">Anywhere</option>
                                    {facets!.places.map((p) => (
                                        <option key={p.name} value={p.name}>{p.name} ({p.count})</option>
                                    ))}
                                </select>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                )}

                {(facets?.categories.length ?? 0) > 0 && (
                    <AccordionItem value="category" className="border-slate-100">
                        <AccordionTrigger className="hover:no-underline text-xs font-bold uppercase tracking-wider text-slate-400">Trip Style</AccordionTrigger>
                        <AccordionContent>
                            <div className="flex flex-wrap gap-2 pt-1 pb-2">
                                {facets!.categories.map((c) => {
                                    const active = categories.includes(c.name);
                                    return (
                                        <button
                                            key={c.name}
                                            type="button"
                                            onClick={() => toggleCategory(c.name)}
                                            aria-pressed={active}
                                            className={cn(
                                                "inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                                                active ? "bg-brand-orange text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                                            )}
                                        >
                                            {active && <Check className="w-3.5 h-3.5" />}
                                            {c.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                )}

                <AccordionItem value="price" className="border-slate-100">
                    <AccordionTrigger className="hover:no-underline text-xs font-bold uppercase tracking-wider text-slate-400">Price Range</AccordionTrigger>
                    <AccordionContent>
                        <div className="pt-1 pb-2">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-sm text-muted-foreground">Up to</span>
                                <span className="text-sm font-bold text-brand-blue bg-brand-light px-3 py-1 rounded-xl">
                                    {maxPrice >= MAX_PRICE ? 'Any price' : formatPrice(maxPrice)}
                                </span>
                            </div>
                            <PriceSlider value={maxPrice} onCommit={setMaxPrice} />
                            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                                <span>{formatPrice(0)}</span>
                                <span>{formatPrice(MAX_PRICE)}+</span>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="duration" className="border-slate-100">
                    <AccordionTrigger className="hover:no-underline text-xs font-bold uppercase tracking-wider text-slate-400">Duration</AccordionTrigger>
                    <AccordionContent>
                        <div className="grid grid-cols-2 gap-2.5 pt-1 pb-2">
                            {Object.keys(DURATION_BUCKETS).map((d) => {
                                const active = durations.includes(d);
                                return (
                                    <button
                                        key={d}
                                        type="button"
                                        onClick={() => toggleDuration(d)}
                                        aria-pressed={active}
                                        className={cn(
                                            "flex items-center justify-center gap-1.5 px-3 py-3 rounded-2xl text-sm font-medium transition-all duration-300",
                                            active
                                                ? "bg-brand-orange text-white shadow-md shadow-brand-orange/20"
                                                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                                        )}
                                    >
                                        {active && <Check className="w-3.5 h-3.5" />}
                                        {d}
                                    </button>
                                );
                            })}
                        </div>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="rating" className="border-b-0">
                    <AccordionTrigger className="hover:no-underline text-xs font-bold uppercase tracking-wider text-slate-400">Rating</AccordionTrigger>
                    <AccordionContent>
                        <div className="space-y-2 pt-1 pb-1">
                            {RATING_OPTIONS.map((r) => {
                                const active = minRating === r;
                                return (
                                    <button
                                        key={r}
                                        type="button"
                                        onClick={() => setMinRating(active ? null : r)}
                                        aria-pressed={active}
                                        aria-label={`${r} stars and up`}
                                        className={cn(
                                            "w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-300",
                                            active
                                                ? "bg-brand-orange/10 ring-1 ring-brand-orange/30"
                                                : "bg-slate-50 hover:bg-slate-100"
                                        )}
                                    >
                                        <span className="flex items-center gap-0.5" aria-hidden>
                                            {[1, 2, 3, 4, 5].map((s) => (
                                                <Star
                                                    key={s}
                                                    className={cn(
                                                        "w-4 h-4",
                                                        s <= r ? "text-yellow-400 fill-yellow-400" : "text-slate-300"
                                                    )}
                                                />
                                            ))}
                                        </span>
                                        <span className={cn("text-xs font-semibold", active ? "text-brand-orange" : "text-muted-foreground")}>
                                            {r}.0 & up
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );

    return (
        <div className="pt-24 pb-12 bg-background min-h-screen">
            <PageTitle
                title={query ? `Tours matching “${query}”` : 'All Tours & Holiday Packages'}
                description="Compare every Wandeazy tour by destination, price, duration, travel style and traveller rating, then book online."
                // Filters and sorting all canonicalise to /tours; typed searches stay out of the index
                path="/tours"
                noIndex={!!query}
            />
            <Container>
                {/* Search Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-display font-bold mb-6">Find your next adventure</h1>
                    <form
                        className="flex gap-3 max-w-2xl"
                        role="search"
                        onSubmit={(e) => { e.preventDefault(); submitSearch(); }}
                    >
                        <div className="relative flex-grow">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                            <Input
                                type="search"
                                placeholder="Search destinations, tours..."
                                className="pl-11 h-14 rounded-2xl border-slate-200 shadow-sm text-base"
                                value={inputQuery}
                                onChange={(e) => setInputQuery(e.target.value)}
                                aria-label="Search tours"
                            />
                        </div>
                        <Button type="submit" className="h-14 px-5 sm:px-8 rounded-2xl" variant="brand">
                            Search
                        </Button>
                    </form>
                </div>

                {/* Mobile filter toggle */}
                <div className="lg:hidden mb-4">
                    <Button
                        variant="outline"
                        className="w-full h-11 rounded-xl"
                        onClick={() => setShowFilters((s) => !s)}
                        aria-expanded={showFilters}
                    >
                        {showFilters ? <X className="w-4 h-4 mr-2" /> : <SlidersHorizontal className="w-4 h-4 mr-2" />}
                        {showFilters ? 'Hide Filters' : 'Filters'}
                        {activeFilterCount > 0 && (
                            <span className="ml-2 bg-brand-orange text-white text-xs rounded-full px-2 py-0.5">
                                {activeFilterCount}
                            </span>
                        )}
                    </Button>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Filters Sidebar */}
                    <aside
                        aria-label="Filters"
                        className={`w-full lg:w-64 flex-shrink-0 space-y-6 ${showFilters ? 'block' : 'hidden lg:block'}`}
                    >
                        {filtersPanel}
                    </aside>

                    {/* Results Grid */}
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center gap-3 mb-6">
                            <span className="text-muted-foreground" aria-live="polite">
                                {isLoading ? 'Searching…' : <>Showing <strong>{totalCount}</strong> {totalCount === 1 ? 'result' : 'results'}</>}
                            </span>
                            <SortSelect value={sort} onSortChange={setSort} />
                        </div>

                        {isLoading ? (
                            <Spinner center label="Loading tours..." />
                        ) : isError ? (
                            <div className="text-center py-20">
                                <h3 className="text-xl font-bold mb-2">Something went wrong</h3>
                                <p className="text-muted-foreground mb-4">
                                    We couldn't load tours right now.
                                </p>
                                <Button variant="brand" onClick={() => refetch()}>Try again</Button>
                            </div>
                        ) : tours.length > 0 ? (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {tours.map((tour) => (
                                        <TourCard key={tour._id} tour={tour} />
                                    ))}
                                </div>
                                <Pagination
                                    page={page}
                                    totalPages={totalPages}
                                    onPageChange={setPage}
                                    className="mt-10"
                                />
                            </>
                        ) : (
                            <NoResults
                                title={query ? `No tours for “${query}” yet` : 'No tours match these filters'}
                                message={activeFilterCount > 0
                                    ? 'Try removing a filter, or tell us what you have in mind and we will plan it for you.'
                                    : "We don't run a tour there yet, but our travel team can put one together for you."}
                                query={query || place}
                                onClear={activeFilterCount > 0 ? resetFilters : query ? clearEverything : undefined}
                                clearLabel={activeFilterCount > 0 ? 'Clear filters' : 'Show all tours'}
                                suggestTours
                            />
                        )}
                    </div>
                </div>
            </Container>
        </div>
    );
};

/** Moves freely while dragging and only updates the URL (and the search) on release. */
const PriceSlider = ({ value, onCommit }: { value: number; onCommit: (v: number) => void }) => {
    const { formatPrice } = useCurrency();
    const [draft, setDraft] = useState(value);
    useEffect(() => setDraft(value), [value]);
    return (
        <input
            type="range"
            min="0"
            max={MAX_PRICE}
            step="100"
            value={draft}
            onChange={(e) => setDraft(parseInt(e.target.value))}
            onPointerUp={() => onCommit(draft)}
            onKeyUp={() => onCommit(draft)}
            onBlur={() => draft !== value && onCommit(draft)}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-secondary accent-brand-orange"
            aria-label="Maximum price"
            aria-valuetext={draft >= MAX_PRICE ? 'Any price' : `Up to ${formatPrice(draft)}`}
        />
    );
};
