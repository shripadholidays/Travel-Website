import { useEffect, useMemo, useState } from 'react';
import { TourCard } from '@/components/TourCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Pagination } from '@/components/ui/pagination';
import { SortSelect } from '@/components/SortSelect';
import { PageTitle } from '@/components/PageTitle';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { useTours } from '@/hooks/use-tours';
import { Search, SlidersHorizontal, X, Star, Check } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';

import { Container } from '@/components/ui/container';

const PAGE_SIZE = 9;
const MAX_PRICE = 5000;

// Maps a duration bucket to a min/max day range (backend supports minDays/maxDays).
const DURATION_BUCKETS: Record<string, { min?: number; max?: number }> = {
    '0-3 Days': { min: 0, max: 3 },
    '4-7 Days': { min: 4, max: 7 },
    '8-14 Days': { min: 8, max: 14 },
    '15+ Days': { min: 15 },
};

const RATING_OPTIONS = [4, 3, 2];

export const SearchPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const urlQuery = searchParams.get('q') || '';

    // `inputQuery` is the live text box; `query` is what we actually search on.
    const [inputQuery, setInputQuery] = useState(urlQuery);
    const [query, setQuery] = useState(urlQuery);
    const [maxPrice, setMaxPrice] = useState(MAX_PRICE);
    const [durations, setDurations] = useState<string[]>([]);
    const [minRating, setMinRating] = useState<number | null>(null);
    const [sort, setSort] = useState('recommended');
    const [page, setPage] = useState(1);
    const [showFilters, setShowFilters] = useState(false);

    // The URL is the source of truth for the search term: the navbar search,
    // Back/Forward and shared links all land here.
    useEffect(() => {
        setInputQuery(urlQuery);
        setQuery(urlQuery);
        setPage(1);
    }, [urlQuery]);

    // Keep ?q= in step with the box, leaving other params (e.g. the tour modal) alone.
    const syncUrl = (value: string) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            if (value) next.set('q', value); else next.delete('q');
            return next;
        }, { replace: true, preventScrollReset: true });
    };

    // Debounce the text box so typing doesn't fire a request per keystroke.
    useEffect(() => {
        const id = setTimeout(() => {
            setQuery(inputQuery);
            setPage(1);
            if (inputQuery !== urlQuery) syncUrl(inputQuery);
        }, 400);
        return () => clearTimeout(id);
    }, [inputQuery]); // eslint-disable-line react-hooks/exhaustive-deps

    // Reset to page 1 whenever a filter changes.
    useEffect(() => {
        setPage(1);
    }, [maxPrice, durations, minRating, sort]);

    // Translate selected duration buckets into a single min/max range.
    const dayRange = useMemo(() => {
        if (durations.length === 0) return {};
        const buckets = durations.map((d) => DURATION_BUCKETS[d]).filter(Boolean);
        const min = Math.min(...buckets.map((b) => b.min ?? 0));
        const hasOpenEnded = buckets.some((b) => b.max === undefined);
        const max = hasOpenEnded ? undefined : Math.max(...buckets.map((b) => b.max ?? 0));
        return { minDays: min, maxDays: max };
    }, [durations]);

    const { data, isLoading, isError, refetch } = useTours({
        search: query,
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

    const toggleDuration = (value: string) =>
        setDurations((prev) =>
            prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]
        );

    const activeFilterCount =
        (maxPrice < MAX_PRICE ? 1 : 0) + durations.length + (minRating ? 1 : 0);

    const resetFilters = () => {
        setInputQuery('');
        setQuery('');
        setMaxPrice(MAX_PRICE);
        setDurations([]);
        setMinRating(null);
        setSort('recommended');
        setPage(1);
    };

    const submitSearch = () => {
        setQuery(inputQuery);
        setPage(1);
        syncUrl(inputQuery);
    };

    const filtersPanel = (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-7">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-brand-orange/10 flex items-center justify-center">
                        <SlidersHorizontal className="w-4 h-4 text-brand-orange" />
                    </div>
                    <h3 className="text-lg font-display font-bold text-brand-blue">Filters</h3>
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

            <Accordion type="multiple" defaultValue={['price', 'duration', 'rating']} className="w-full">
                <AccordionItem value="price" className="border-slate-100">
                    <AccordionTrigger className="hover:no-underline text-xs font-bold uppercase tracking-wider text-slate-400">Price Range</AccordionTrigger>
                    <AccordionContent>
                        <div className="pt-1 pb-2">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-sm text-muted-foreground">Up to</span>
                                <span className="text-sm font-bold text-brand-blue bg-brand-light px-3 py-1 rounded-xl">
                                    {maxPrice >= MAX_PRICE ? 'Any price' : `$${maxPrice.toLocaleString()}`}
                                </span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max={MAX_PRICE}
                                step="100"
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                                className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-secondary accent-brand-orange"
                                aria-label="Maximum price"
                            />
                            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                                <span>$0</span>
                                <span>${MAX_PRICE.toLocaleString()}+</span>
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
                                        className={cn(
                                            "w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-300",
                                            active
                                                ? "bg-brand-orange/10 ring-1 ring-brand-orange/30"
                                                : "bg-slate-50 hover:bg-slate-100"
                                        )}
                                    >
                                        <span className="flex items-center gap-0.5">
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
            <PageTitle title="Search Tours" description="Find and book your next adventure from our curated tours." />
            <Container>
                {/* Search Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-display font-bold mb-6">Find your next adventure</h1>
                    <div className="flex gap-3 max-w-2xl">
                        <div className="relative flex-grow">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                            <Input
                                placeholder="Search destinations, tours..."
                                className="pl-11 h-14 rounded-2xl border-slate-200 shadow-sm text-base"
                                value={inputQuery}
                                onChange={(e) => setInputQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && submitSearch()}
                                aria-label="Search tours"
                            />
                        </div>
                        <Button
                            className="h-14 px-8 rounded-2xl"
                            variant="brand"
                            onClick={submitSearch}
                        >
                            Search
                        </Button>
                    </div>
                </div>

                {/* Mobile filter toggle */}
                <div className="lg:hidden mb-4">
                    <Button
                        variant="outline"
                        className="w-full h-11 rounded-xl"
                        onClick={() => setShowFilters((s) => !s)}
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
                    <div
                        className={`w-full lg:w-64 flex-shrink-0 space-y-6 ${showFilters ? 'block' : 'hidden lg:block'}`}
                    >
                        {filtersPanel}
                    </div>

                    {/* Results Grid */}
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-muted-foreground">
                                {isLoading ? 'Searching…' : <>Showing <strong>{totalCount}</strong> {totalCount === 1 ? 'result' : 'results'}</>}
                            </span>
                            <SortSelect onSortChange={setSort} />
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
                            <div className="text-center py-20 text-muted-foreground">
                                <h3 className="text-xl font-bold mb-2">No tours found</h3>
                                <p className="mb-4">Try adjusting your filters or search query.</p>
                                {activeFilterCount > 0 && (
                                    <Button variant="outline" onClick={resetFilters}>
                                        Clear all filters
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </Container>
        </div>
    );
};
