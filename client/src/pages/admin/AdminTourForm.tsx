import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
    Save, Loader2, ArrowLeft, Plus, Star, Eye, CheckCircle2, Circle, AlertCircle, Rocket, MapPin, Copy,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ImagePicker } from '@/components/ui/ImagePicker';
import { ListEditor } from '@/components/ui/ListEditor';
import { StatusPill, timeAgo } from '@/components/admin/AdminUI';
import { useTour, useCreateTour, useUpdateTour, useTourFacets, useDuplicateTour } from '@/hooks/use-tours';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { TOUR_STATUS, type TourStatus } from '@/lib/tour-status';
import { cn } from '@/lib/utils';
import type { Tour } from '@/types';

const STYLE_SUGGESTIONS = [
    'Beach', 'Mountain', 'City', 'Adventure', 'Safari', 'Cultural',
    'Honeymoon', 'Family', 'Solo', 'Budget', 'Luxury', 'Trekking',
];
const COMMON_INCLUSIONS = ['Hotel stays', 'Daily breakfast', 'Airport transfers', 'English-speaking guide', 'Entry tickets', 'International flights', 'Visa fees', 'Travel insurance'];

type Inclusion = { title: string; included: boolean };
type ItineraryDay = { activity: string; location: string };
type GalleryItem = { imageURL: string; altText: string };
type Tab = 'details' | 'photos' | 'itinerary' | 'inclusions' | 'description';

interface FormState {
    title: string;
    location: string;
    price: string;
    days: string;
    nights: string;
    validity: string;
    maxGroupSize: string;
    emi: string;
    imageURL: string;
    gallery: GalleryItem[];
    categories: string[];
    inclusions: Inclusion[];
    itinerary: ItineraryDay[];
    about: string;
    isFeatured: boolean;
    status: TourStatus;
    lat: string;
    lng: string;
}

const inAYear = () => new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10);

const EMPTY: FormState = {
    title: '', location: '', price: '', days: '5', nights: '4', validity: inAYear(), maxGroupSize: '', emi: '',
    imageURL: '', gallery: [], categories: [], inclusions: [], itinerary: [], about: '',
    isFeatured: false, status: 'draft', lat: '', lng: '',
};

function fromTour(t: Tour): FormState {
    // One gallery in the editor: the extra images and the overview photos, without repeats
    const seen = new Set<string>();
    const gallery: GalleryItem[] = [];
    [...(t.overview?.gallery ?? []).map((g) => ({ imageURL: g.imageURL, altText: g.altText ?? '' })), ...(t.images ?? []).map((u) => ({ imageURL: u, altText: '' }))]
        .forEach((g) => { if (g.imageURL && g.imageURL !== t.imageURL && !seen.has(g.imageURL)) { seen.add(g.imageURL); gallery.push(g); } });
    return {
        title: t.title ?? '',
        location: t.location ?? '',
        price: t.price ? String(t.price) : '',
        days: String(t.duration?.days ?? 1),
        nights: String(t.duration?.nights ?? 0),
        validity: t.validity ? t.validity.slice(0, 10) : inAYear(),
        maxGroupSize: t.maxGroupSize ? String(t.maxGroupSize) : '',
        emi: t.emi ?? '',
        imageURL: t.imageURL ?? '',
        gallery,
        categories: t.categories ?? [],
        inclusions: (t.inclusions ?? []).map(({ title, included }) => ({ title, included })),
        itinerary: (t.itinerary ?? []).map(({ activity, location }) => ({ activity, location })),
        about: t.overview?.about ?? '',
        isFeatured: !!t.isFeatured,
        status: t.status ?? 'active',
        lat: t.coordinates?.lat != null ? String(t.coordinates.lat) : '',
        lng: t.coordinates?.lng != null ? String(t.coordinates.lng) : '',
    };
}

function toPayload(f: FormState): Partial<Tour> {
    const gallery = f.gallery.filter((g) => g.imageURL.trim());
    return {
        title: f.title.trim(),
        location: f.location.trim(),
        price: Number(f.price) || 0,
        duration: { days: Number(f.days) || 1, nights: Number(f.nights) || 0 },
        validity: f.validity,
        maxGroupSize: f.maxGroupSize ? Number(f.maxGroupSize) : null,
        emi: f.emi.trim(),
        imageURL: f.imageURL,
        // Kept in step so every page that shows tour photos sees the same set
        images: gallery.map((g) => g.imageURL),
        overview: { about: f.about.trim(), gallery },
        categories: f.categories,
        inclusions: f.inclusions.filter((i) => i.title.trim()),
        itinerary: f.itinerary
            .filter((d) => d.activity.trim() || d.location.trim())
            .map((d, i) => ({ day: i + 1, activity: d.activity.trim(), location: d.location.trim() })),
        isFeatured: f.isFeatured,
        status: f.status,
        coordinates: { lat: f.lat === '' ? null : Number(f.lat), lng: f.lng === '' ? null : Number(f.lng) },
    };
}

type Errors = Partial<Record<keyof FormState, string>>;

const FIELD_TAB: Partial<Record<keyof FormState, Tab>> = {
    title: 'details', location: 'details', price: 'details', days: 'details', nights: 'details', validity: 'details',
    maxGroupSize: 'details', lat: 'details', lng: 'details', imageURL: 'photos', about: 'description',
};

/** Always-needed fields, plus what a live tour needs before it can be published. */
function validate(f: FormState, publishing: boolean): Errors {
    const e: Errors = {};
    if (!f.title.trim()) e.title = 'Give the tour a title.';
    if (!f.location.trim()) e.location = 'Add where the tour takes place.';
    const days = Number(f.days);
    if (!Number.isInteger(days) || days < 1 || days > 90) e.days = 'Use a whole number of days from 1 to 90.';
    const nights = Number(f.nights);
    if (!Number.isInteger(nights) || nights < 0 || nights > days) e.nights = 'Nights must be between 0 and the number of days.';
    if (f.maxGroupSize && !(Number(f.maxGroupSize) >= 1)) e.maxGroupSize = 'Leave empty for no limit, or use 1 or more.';
    if (f.lat !== '' || f.lng !== '') {
        const lat = Number(f.lat), lng = Number(f.lng);
        if (f.lat === '' || Number.isNaN(lat) || lat < -90 || lat > 90) e.lat = 'Latitude is a number from -90 to 90.';
        if (f.lng === '' || Number.isNaN(lng) || lng < -180 || lng > 180) e.lng = 'Longitude is a number from -180 to 180.';
    }
    if (f.price !== '' && !(Number(f.price) >= 0)) e.price = 'Enter the price in US dollars.';
    if (publishing) {
        if (!(Number(f.price) >= 1)) e.price = 'A live tour needs a price per person.';
        if (!f.imageURL) e.imageURL = 'A live tour needs a cover image.';
        if (f.about.trim().length < 40) e.about = 'Write at least a couple of sentences (40+ characters) for travellers.';
        if (!f.validity) e.validity = 'Pick the last date this tour can be booked for.';
        else if (new Date(f.validity) < new Date(new Date().toDateString())) e.validity = 'This date has passed, so nobody could book the tour.';
    }
    return e;
}

function FieldError({ message }: { message?: string }) {
    if (!message) return null;
    return <p className="text-xs font-medium text-red-600" role="alert">{message}</p>;
}

export const AdminTourForm = () => {
    const { id } = useParams<{ id?: string }>();
    const navigate = useNavigate();
    const isEdit = !!id && id !== 'new';

    const { data: tourData, isLoading, isError } = useTour(isEdit ? id! : '');
    const { data: facets } = useTourFacets();
    const createTour = useCreateTour();
    const updateTour = useUpdateTour();
    const duplicateTour = useDuplicateTour();

    const [form, setForm] = useState<FormState>(EMPTY);
    const [saved, setSaved] = useState<string>(JSON.stringify(toPayload(EMPTY)));
    const [tab, setTab] = useState<Tab>('details');
    const [errors, setErrors] = useState<Errors>({});
    const [styleInput, setStyleInput] = useState('');
    const [nightsTouched, setNightsTouched] = useState(false);
    const tour = tourData?.tour;

    useEffect(() => {
        if (!tour) return;
        const next = fromTour(tour);
        setForm(next);
        setSaved(JSON.stringify(toPayload(next)));
        setNightsTouched(true);
    }, [tour]);

    const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm((f) => ({ ...f, [key]: value }));
        if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
    };

    const payload = useMemo(() => toPayload(form), [form]);
    const dirty = JSON.stringify(payload) !== saved;
    const leaveGuard = useUnsavedChanges(dirty);

    // What travellers look for, as a checklist next to the form
    const checklist = [
        { label: 'Title and location', done: !!form.title.trim() && !!form.location.trim(), tab: 'details' as Tab, required: true },
        { label: 'Price per person', done: Number(form.price) >= 1, tab: 'details' as Tab, required: true },
        { label: 'Cover image', done: !!form.imageURL, tab: 'photos' as Tab, required: true },
        { label: 'Description (40+ characters)', done: form.about.trim().length >= 40, tab: 'description' as Tab, required: true },
        { label: 'At least 3 gallery photos', done: form.gallery.filter((g) => g.imageURL).length >= 3, tab: 'photos' as Tab, required: false },
        { label: 'Day-by-day itinerary', done: form.itinerary.some((d) => d.activity.trim()), tab: 'itinerary' as Tab, required: false },
        { label: "What's included", done: form.inclusions.some((i) => i.title.trim()), tab: 'inclusions' as Tab, required: false },
        { label: 'Trip styles', done: form.categories.length > 0, tab: 'details' as Tab, required: false },
    ];
    const ready = checklist.filter((c) => c.required).every((c) => c.done);

    const save = useCallback(async (nextStatus?: TourStatus) => {
        const target = { ...form, status: nextStatus ?? form.status };
        const found = validate(target, target.status === 'active');
        setErrors(found);
        const first = (Object.keys(found) as (keyof FormState)[])[0];
        if (first) {
            setTab(FIELD_TAB[first] ?? 'details');
            toast.error(target.status === 'active' && nextStatus === 'active'
                ? 'Finish the highlighted fields before publishing.'
                : 'Please fix the highlighted fields.');
            return;
        }
        const data = toPayload(target);
        const toastId = toast.loading(isEdit ? 'Saving…' : 'Creating tour…');
        try {
            if (isEdit) {
                await updateTour.mutateAsync({ id: id!, data });
                setForm(target);
                setSaved(JSON.stringify(data));
                toast.success(nextStatus === 'active' && tour?.status !== 'active' ? 'Published. The tour is live on the site.' : 'Changes saved.', { id: toastId });
            } else {
                const res = await createTour.mutateAsync(data);
                setSaved(JSON.stringify(data));
                toast.success(target.status === 'active' ? 'Tour created and live.' : 'Draft saved. Publish it when it is ready.', { id: toastId });
                leaveGuard.allowLeave();
                navigate(`/admin/tours/${res.tour._id}/edit`, { replace: true });
            }
        } catch (err) {
            toast.error((err as Error).message || 'Could not save the tour', { id: toastId, duration: 8000 });
        }
    }, [form, isEdit, id, tour?.status, updateTour, createTour, navigate, leaveGuard]);

    // Ctrl/Cmd + S saves
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                save();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [save]);

    const addStyle = (value: string) => {
        const v = value.trim();
        if (v && !form.categories.some((c) => c.toLowerCase() === v.toLowerCase())) set('categories', [...form.categories, v]);
        setStyleInput('');
    };

    const fillItinerary = () => {
        const days = Math.max(1, Number(form.days) || 1);
        const next = [...form.itinerary];
        while (next.length < days) next.push({ activity: '', location: '' });
        set('itinerary', next.slice(0, Math.max(days, form.itinerary.length)));
    };

    const duplicate = async () => {
        if (!isEdit) return;
        try {
            const res = await duplicateTour.mutateAsync(id!);
            toast.success('Draft copy created.');
            leaveGuard.allowLeave();
            navigate(`/admin/tours/${res.tour._id}/edit`);
        } catch (err) {
            toast.error((err as Error).message || 'Could not duplicate the tour');
        }
    };

    const isSaving = createTour.isPending || updateTour.isPending;
    const tabHasError = (t: Tab) => (Object.keys(errors) as (keyof FormState)[]).some((k) => errors[k] && (FIELD_TAB[k] ?? 'details') === t);
    const styleOptions = [...new Set([...(facets?.categories ?? []).map((c) => c.name), ...STYLE_SUGGESTIONS])]
        .filter((s) => !form.categories.some((c) => c.toLowerCase() === s.toLowerCase()))
        .slice(0, 16);
    const isLive = tour?.status === 'active';
    const editorName = typeof tour?.updatedBy === 'object' ? tour.updatedBy.displayName : null;

    if (isEdit && isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }
    if (isEdit && (isError || !tour)) {
        return (
            <div className="rounded-2xl border bg-white p-10 text-center">
                <p className="font-semibold text-brand-blue">This tour could not be found.</p>
                <p className="text-sm text-muted-foreground mt-1">It may have been deleted.</p>
                <Button asChild variant="outline" className="mt-4"><Link to="/admin/tours">Back to tours</Link></Button>
            </div>
        );
    }

    const primary = (
        isLive || form.status === 'active' && isEdit ? (
            <Button onClick={() => save()} disabled={isSaving || (isEdit && !dirty)} className="gap-2 bg-brand-orange hover:bg-brand-orange/90">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isEdit ? 'Save changes' : 'Create tour'}
            </Button>
        ) : (
            <>
                <Button variant="outline" onClick={() => save(isEdit ? undefined : 'draft')} disabled={isSaving || (isEdit && !dirty)} className="gap-2">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save draft
                </Button>
                <Button onClick={() => save('active')} disabled={isSaving} className="gap-2 bg-brand-orange hover:bg-brand-orange/90">
                    <Rocket className="w-4 h-4" /> Publish
                </Button>
            </>
        )
    );

    return (
        <div className="space-y-6 pb-24 lg:pb-0">
            {leaveGuard.dialog}
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3 min-w-0">
                    <Button variant="ghost" size="icon" asChild className="shrink-0 mt-0.5">
                        <Link to="/admin/tours" aria-label="Back to all tours"><ArrowLeft className="w-5 h-5" /></Link>
                    </Button>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-brand-blue truncate">
                                {isEdit ? form.title || 'Untitled tour' : 'New tour'}
                            </h1>
                            {isEdit && tour && <StatusPill tone={TOUR_STATUS[tour.status ?? 'active'].tone}>{TOUR_STATUS[tour.status ?? 'active'].label}</StatusPill>}
                            {dirty && <span className="text-xs font-medium text-amber-700">Unsaved changes</span>}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {isEdit && tour
                                ? <>Last saved {timeAgo(tour.updatedAt)}{editorName && ` by ${editorName}`}</>
                                : 'Start with the basics and save a draft. Publish once the checklist is complete.'}
                        </p>
                    </div>
                </div>
                <div className="hidden lg:flex items-center gap-2 shrink-0">
                    {isEdit && (
                        <>
                            <Button variant="ghost" size="sm" className="gap-1.5" asChild>
                                <a href={`/tour/${id}`} target="_blank" rel="noopener noreferrer"><Eye className="w-4 h-4" /> {isLive ? 'View' : 'Preview'}</a>
                            </Button>
                            <Button variant="ghost" size="sm" className="gap-1.5" onClick={duplicate} disabled={duplicateTour.isPending}>
                                <Copy className="w-4 h-4" /> Duplicate
                            </Button>
                        </>
                    )}
                    {primary}
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
                {/* min-w-0 stops the tab row from stretching the page wider than a phone */}
                <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="min-w-0">
                    <TabsList className="flex w-full overflow-x-auto justify-start gap-1 h-auto bg-slate-100 p-1 rounded-xl mb-2 [scrollbar-width:none]">
                        {([
                            ['details', 'Details'], ['photos', 'Photos'], ['itinerary', 'Itinerary'],
                            ['inclusions', 'Inclusions'], ['description', 'Description'],
                        ] as [Tab, string][]).map(([value, label]) => (
                            <TabsTrigger key={value} value={value} className="rounded-lg text-sm px-3 py-1.5 gap-1.5 shrink-0">
                                {label}
                                {tabHasError(value) && <span className="h-2 w-2 rounded-full bg-red-500" aria-label="has errors" />}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {/* DETAILS */}
                    <TabsContent value="details">
                        <Card>
                            <CardHeader>
                                <CardTitle>Details</CardTitle>
                                <CardDescription>What travellers see first on the tour card and at the top of the page.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                <div className="space-y-1.5">
                                    <Label htmlFor="title">Title *</Label>
                                    <Input id="title" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Kerala Backwaters & Spice Hills" maxLength={120} aria-invalid={!!errors.title} />
                                    <FieldError message={errors.title} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="location">Location *</Label>
                                    <Input id="location" value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Kochi, India" aria-invalid={!!errors.location} />
                                    <p className="text-xs text-muted-foreground">Write it as "City, Country". The country links the tour to its destination page and the search filters.</p>
                                    <FieldError message={errors.location} />
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="space-y-1.5 col-span-2 md:col-span-1">
                                        <Label htmlFor="price">Price per person (USD) {form.status === 'active' && '*'}</Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-sm text-muted-foreground">$</span>
                                            <Input id="price" inputMode="decimal" className="pl-6 tabular-nums" value={form.price} onChange={(e) => set('price', e.target.value.replace(/[^0-9.]/g, ''))} placeholder="1200" aria-invalid={!!errors.price} />
                                        </div>
                                        <FieldError message={errors.price} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="days">Days *</Label>
                                        <Input id="days" type="number" min={1} max={90} value={form.days} aria-invalid={!!errors.days}
                                            onChange={(e) => { const d = e.target.value; setForm((f) => ({ ...f, days: d, nights: nightsTouched ? f.nights : String(Math.max(0, Number(d) - 1)) })); }} />
                                        <FieldError message={errors.days} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="nights">Nights</Label>
                                        <Input id="nights" type="number" min={0} value={form.nights} aria-invalid={!!errors.nights} onChange={(e) => { setNightsTouched(true); set('nights', e.target.value); }} />
                                        <FieldError message={errors.nights} />
                                    </div>
                                    <div className="space-y-1.5 col-span-2 md:col-span-1">
                                        <Label htmlFor="group">Max group size</Label>
                                        <Input id="group" type="number" min={1} value={form.maxGroupSize} onChange={(e) => set('maxGroupSize', e.target.value)} placeholder="No limit" aria-invalid={!!errors.maxGroupSize} />
                                        <FieldError message={errors.maxGroupSize} />
                                    </div>
                                </div>
                                <p className="-mt-2 text-xs text-muted-foreground">Checkout charges this price in US dollars. Travellers can view converted estimates in their own currency.</p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="validity">Bookable until *</Label>
                                        <Input id="validity" type="date" value={form.validity} onChange={(e) => set('validity', e.target.value)} aria-invalid={!!errors.validity} />
                                        <p className="text-xs text-muted-foreground">Travellers can't pick a travel date after this.</p>
                                        <FieldError message={errors.validity} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="emi">Card highlight</Label>
                                        <Input id="emi" value={form.emi} onChange={(e) => set('emi', e.target.value)} placeholder="Best seller" maxLength={30} />
                                        <p className="text-xs text-muted-foreground">Optional short label on the tour card. Never a price or discount.</p>
                                    </div>
                                </div>

                                {/* Trip styles */}
                                <div className="space-y-2">
                                    <Label htmlFor="style-input">Trip styles</Label>
                                    <p className="text-xs text-muted-foreground -mt-1">Used by the search filters and "Explore by style". Pick from the list or type your own.</p>
                                    {form.categories.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {form.categories.map((c) => (
                                                <Badge key={c} variant="secondary" className="gap-1 pr-1">
                                                    {c}
                                                    <button type="button" onClick={() => set('categories', form.categories.filter((x) => x !== c))} className="ml-0.5 rounded px-1 text-slate-400 hover:text-red-500" aria-label={`Remove ${c}`}>×</button>
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                    <div className="flex gap-2">
                                        <Input id="style-input" value={styleInput} onChange={(e) => setStyleInput(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addStyle(styleInput); } }}
                                            placeholder="Type a style and press Enter" className="max-w-xs" />
                                        <Button type="button" variant="outline" size="sm" className="h-10" onClick={() => addStyle(styleInput)} disabled={!styleInput.trim()}>
                                            <Plus className="w-3.5 h-3.5 mr-1" /> Add
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {styleOptions.map((s) => (
                                            <button key={s} type="button" onClick={() => addStyle(s)}
                                                className="text-xs px-2.5 py-1 rounded-full border border-dashed border-slate-300 text-slate-500 hover:border-brand-orange hover:text-brand-orange transition-colors">
                                                + {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Map pin */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label>Map pin (optional)</Label>
                                        {form.location.trim() && (
                                            <a href={`https://www.google.com/maps/search/${encodeURIComponent(form.location)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-brand-orange hover:underline">
                                                <MapPin className="w-3 h-3" /> Look up coordinates
                                            </a>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <Input aria-label="Latitude" inputMode="decimal" value={form.lat} onChange={(e) => set('lat', e.target.value)} placeholder="Latitude, e.g. 9.9312" aria-invalid={!!errors.lat} />
                                            <FieldError message={errors.lat} />
                                        </div>
                                        <div className="space-y-1">
                                            <Input aria-label="Longitude" inputMode="decimal" value={form.lng} onChange={(e) => set('lng', e.target.value)} placeholder="Longitude, e.g. 76.2673" aria-invalid={!!errors.lng} />
                                            <FieldError message={errors.lng} />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* PHOTOS */}
                    <TabsContent value="photos">
                        <Card>
                            <CardHeader>
                                <CardTitle>Photos</CardTitle>
                                <CardDescription>The cover is shown on tour cards and at the top of the page. Gallery photos open in the full-screen viewer.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-1">
                                    <ImagePicker label={`Cover image${form.status === 'active' ? ' *' : ''}`} value={form.imageURL} onChange={(url) => set('imageURL', url)} />
                                    <FieldError message={errors.imageURL} />
                                </div>
                                <div>
                                    <div className="mb-3 flex items-baseline justify-between">
                                        <Label className="font-semibold">Gallery</Label>
                                        <span className="text-xs text-muted-foreground">{form.gallery.filter((g) => g.imageURL).length} photo(s). 3 or more recommended</span>
                                    </div>
                                    <ListEditor
                                        items={form.gallery}
                                        onChange={(g) => set('gallery', g)}
                                        addLabel="Add photo"
                                        maxItems={20}
                                        createEmpty={() => ({ imageURL: '', altText: '' })}
                                        renderItem={(item, i, onChange) => (
                                            <div className="space-y-3">
                                                <ImagePicker label={`Photo ${i + 1}`} value={item.imageURL} onChange={(url) => onChange({ ...item, imageURL: url })} />
                                                <div className="space-y-1">
                                                    <Label className="text-xs" htmlFor={`alt-${i}`}>Describe the photo (for screen readers)</Label>
                                                    <Input id={`alt-${i}`} value={item.altText} onChange={(e) => onChange({ ...item, altText: e.target.value })} placeholder="Houseboat on the backwaters at sunset" />
                                                </div>
                                            </div>
                                        )}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ITINERARY */}
                    <TabsContent value="itinerary">
                        <Card>
                            <CardHeader>
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <CardTitle>Day by day</CardTitle>
                                        <CardDescription>Days are numbered in the order shown. Use the arrows to reorder.</CardDescription>
                                    </div>
                                    {form.itinerary.length < (Number(form.days) || 0) && (
                                        <Button type="button" variant="outline" size="sm" onClick={fillItinerary}>
                                            Add rows for all {form.days} days
                                        </Button>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <ListEditor
                                    items={form.itinerary}
                                    onChange={(d) => set('itinerary', d)}
                                    addLabel={`Add day ${form.itinerary.length + 1}`}
                                    maxItems={90}
                                    createEmpty={() => ({ activity: '', location: '' })}
                                    renderItem={(day, i, onChange) => (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <span className="inline-flex h-7 shrink-0 items-center rounded-full bg-brand-blue px-2.5 text-xs font-bold text-white">Day {i + 1}</span>
                                                <Input aria-label={`Day ${i + 1} place`} value={day.location} onChange={(e) => onChange({ ...day, location: e.target.value })} placeholder="Where (e.g. Alleppey)" />
                                            </div>
                                            <Textarea aria-label={`Day ${i + 1} plan`} rows={2} value={day.activity} onChange={(e) => onChange({ ...day, activity: e.target.value })} placeholder="What happens (e.g. Board the houseboat, lunch on deck, village walk at dusk)" />
                                        </div>
                                    )}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* INCLUSIONS */}
                    <TabsContent value="inclusions">
                        <Card>
                            <CardHeader>
                                <CardTitle>What's included</CardTitle>
                                <CardDescription>Tick what the price covers; untick to list it as not included so travellers know what to plan for.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex flex-wrap gap-1.5">
                                    {COMMON_INCLUSIONS.filter((c) => !form.inclusions.some((i) => i.title.toLowerCase() === c.toLowerCase())).map((c) => (
                                        <button key={c} type="button" onClick={() => set('inclusions', [...form.inclusions, { title: c, included: !/flights|visa|insurance/i.test(c) }])}
                                            className="text-xs px-2.5 py-1 rounded-full border border-dashed border-slate-300 text-slate-500 hover:border-brand-orange hover:text-brand-orange transition-colors">
                                            + {c}
                                        </button>
                                    ))}
                                </div>
                                <ListEditor
                                    items={form.inclusions}
                                    onChange={(list) => set('inclusions', list)}
                                    addLabel="Add item"
                                    createEmpty={() => ({ title: '', included: true })}
                                    renderItem={(item, i, onChange) => (
                                        <div className="flex items-center gap-3">
                                            <Input aria-label={`Item ${i + 1}`} value={item.title} onChange={(e) => onChange({ ...item, title: e.target.value })} placeholder="Daily breakfast" className="flex-1" />
                                            <label className="flex shrink-0 items-center gap-2 text-sm">
                                                <Switch checked={item.included} onCheckedChange={(v) => onChange({ ...item, included: v })} aria-label={`${item.title || 'Item'} included`} />
                                                <span className={cn('w-20 text-xs font-semibold', item.included ? 'text-emerald-700' : 'text-red-600')}>{item.included ? 'Included' : 'Not included'}</span>
                                            </label>
                                        </div>
                                    )}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* DESCRIPTION */}
                    <TabsContent value="description">
                        <Card>
                            <CardHeader>
                                <CardTitle>About this tour</CardTitle>
                                <CardDescription>The story of the trip: who it suits, the pace, and the moments that make it special.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-1.5">
                                <Label htmlFor="about" className="sr-only">About this tour</Label>
                                <Textarea id="about" value={form.about} onChange={(e) => set('about', e.target.value)} rows={10} maxLength={5000} aria-invalid={!!errors.about}
                                    placeholder="Drift through palm-lined canals on a private houseboat, then climb into the cool tea hills of Munnar…" />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <FieldError message={errors.about} />
                                    <span className="ml-auto tabular-nums">{form.about.trim().length} / 5000</span>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Publishing sidebar */}
                <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
                    <Card>
                        <CardHeader className="pb-3"><CardTitle className="text-base">Publishing</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="status">Status</Label>
                                <Select value={form.status} onValueChange={(v) => set('status', v as TourStatus)}>
                                    <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {(Object.keys(TOUR_STATUS) as TourStatus[]).map((s) => (
                                            <SelectItem key={s} value={s}>{TOUR_STATUS[s].label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">{TOUR_STATUS[form.status].help}.</p>
                            </div>
                            <div className="flex items-center justify-between gap-3 rounded-xl border p-3">
                                <div>
                                    <Label htmlFor="featured" className="flex items-center gap-1.5"><Star className="w-4 h-4 text-amber-500" /> Featured</Label>
                                    <p className="text-xs text-muted-foreground mt-0.5">Shown in Featured Tours on the homepage.</p>
                                </div>
                                <Switch id="featured" checked={form.isFeatured} onCheckedChange={(v) => set('isFeatured', v)} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center justify-between">
                                Listing checklist
                                {ready ? <StatusPill tone="green">Ready</StatusPill> : <StatusPill tone="amber">Not ready</StatusPill>}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-1">
                                {checklist.map((c) => (
                                    <li key={c.label}>
                                        <button type="button" onClick={() => setTab(c.tab)} className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left text-sm hover:bg-slate-50">
                                            {c.done ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                                : c.required ? <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                                                    : <Circle className="w-4 h-4 text-slate-300 shrink-0" />}
                                            <span className={cn(c.done ? 'text-slate-500' : 'text-slate-800')}>{c.label}</span>
                                            {c.required && !c.done && <span className="ml-auto text-[10px] font-bold uppercase text-amber-700">Needed</span>}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            <p className="mt-3 text-xs text-muted-foreground">Items marked "Needed" are required to publish. The rest help travellers decide. Press Ctrl+S to save.</p>
                        </CardContent>
                    </Card>
                </aside>
            </div>

            {/* Phone action bar */}
            <div className="lg:hidden fixed inset-x-0 bottom-0 z-30 flex items-center justify-end gap-2 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
                {isEdit && (
                    <Button variant="ghost" size="icon" asChild>
                        <a href={`/tour/${id}`} target="_blank" rel="noopener noreferrer" aria-label="Preview on site"><Eye className="w-4 h-4" /></a>
                    </Button>
                )}
                {primary}
            </div>
        </div>
    );
};
