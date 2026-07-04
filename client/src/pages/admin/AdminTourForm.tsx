import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
    Save, Loader2, ArrowLeft, Plus, Trash2, Star,
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
import { Checkbox } from '@/components/ui/checkbox';
import { ImagePicker } from '@/components/ui/ImagePicker';
import { ListEditor } from '@/components/ui/ListEditor';
import { useTour, useCreateTour, useUpdateTour } from '@/hooks/use-tours';
import type { Tour } from '@/types';

const CURRENCIES = ['USD', 'INR', 'EUR', 'GBP'];
const CATEGORY_SUGGESTIONS = [
    'Beach', 'Mountain', 'City', 'Adventure', 'Safari', 'Cultural',
    'Honeymoon', 'Family', 'Solo', 'Budget', 'Luxury', 'Trekking',
];

type Inclusion = { title: string; included: boolean };
type ItineraryDay = { day: number; activity: string; location: string };
type GalleryItem = { imageURL: string; altText: string };

function buildDefaultTour(): Partial<Tour> {
    return {
        title: '', location: '', price: 0, currency: 'USD',
        duration: { days: 1, nights: 0 },
        validity: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        imageURL: '', images: [], categories: [],
        inclusions: [], itinerary: [],
        overview: { about: '', gallery: [] },
        emi: '',
        isFeatured: false, status: 'active',
        coordinates: { lat: null, lng: null },
    };
}

export const AdminTourForm = () => {
    const { id } = useParams<{ id?: string }>();
    const navigate = useNavigate();
    const isEdit = !!id && id !== 'new';

    const { data: tourData, isLoading } = useTour(isEdit ? id! : '');
    const createTour = useCreateTour();
    const updateTour = useUpdateTour();

    const [title, setTitle] = useState('');
    const [location, setLocation] = useState('');
    const [price, setPrice] = useState(0);
    const [currency, setCurrency] = useState('USD');
    const [days, setDays] = useState(1);
    const [nights, setNights] = useState(0);
    const [validity, setValidity] = useState('');
    const [emi, setEmi] = useState('');
    const [imageURL, setImageURL] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [categoryInput, setCategoryInput] = useState('');
    const [inclusions, setInclusions] = useState<Inclusion[]>([]);
    const [itinerary, setItinerary] = useState<ItineraryDay[]>([]);
    const [overviewAbout, setOverviewAbout] = useState('');
    const [gallery, setGallery] = useState<GalleryItem[]>([]);
    const [isFeatured, setIsFeatured] = useState(false);
    const [status, setStatus] = useState<'active' | 'inactive' | 'draft'>('active');
    const [lat, setLat] = useState<string>('');
    const [lng, setLng] = useState<string>('');

    useEffect(() => {
        if (!tourData?.tour) return;
        const t = tourData.tour;
        setTitle(t.title || '');
        setLocation(t.location || '');
        setPrice(t.price || 0);
        setCurrency(t.currency || 'USD');
        setDays(t.duration?.days || 1);
        setNights(t.duration?.nights || 0);
        setValidity(t.validity ? t.validity.split('T')[0] : '');
        setEmi(t.emi || '');
        setImageURL(t.imageURL || '');
        setImages(t.images || []);
        setCategories(t.categories || []);
        setInclusions(t.inclusions || []);
        setItinerary(t.itinerary || []);
        setOverviewAbout(t.overview?.about || '');
        setGallery((t.overview?.gallery || []).map(g => ({ imageURL: g.imageURL, altText: g.altText || '' })));
        setIsFeatured(t.isFeatured || false);
        setStatus(t.status || 'active');
        setLat(t.coordinates?.lat != null ? String(t.coordinates.lat) : '');
        setLng(t.coordinates?.lng != null ? String(t.coordinates.lng) : '');
    }, [tourData]);

    const addCategory = (cat: string) => {
        const c = cat.trim();
        if (c && !categories.includes(c)) {
            setCategories(p => [...p, c]);
        }
        setCategoryInput('');
    };

    const removeCategory = (cat: string) => setCategories(p => p.filter(c => c !== cat));

    const buildPayload = (): Partial<Tour> => ({
        title, location, price, currency,
        duration: { days, nights },
        validity,
        emi,
        imageURL,
        images,
        categories,
        inclusions,
        itinerary: itinerary.map((d, i) => ({ ...d, day: i + 1 })),
        overview: { about: overviewAbout, gallery: gallery.map(g => ({ imageURL: g.imageURL, altText: g.altText })) },
        isFeatured,
        status,
        coordinates: {
            lat: lat ? parseFloat(lat) : null,
            lng: lng ? parseFloat(lng) : null,
        },
    });

    const handleSave = async () => {
        if (!title.trim() || !location.trim()) {
            toast.error('Title and location are required');
            return;
        }
        const toastId = toast.loading(isEdit ? 'Updating tour…' : 'Creating tour…');
        try {
            if (isEdit) {
                await updateTour.mutateAsync({ id: id!, data: buildPayload() });
                toast.success('Tour updated', { id: toastId });
            } else {
                const res = await createTour.mutateAsync(buildPayload());
                toast.success('Tour created', { id: toastId });
                navigate(`/admin/tours/${(res as any).tour?._id}/edit`, { replace: true });
            }
        } catch {
            toast.error('Failed to save', { id: toastId });
        }
    };

    const isSaving = createTour.isPending || updateTour.isPending;

    if (isLoading && isEdit) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/admin/tours')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h2 className="text-3xl font-display font-bold tracking-tight text-brand-blue">
                            {isEdit ? 'Edit Tour' : 'New Tour'}
                        </h2>
                        <p className="text-muted-foreground">
                            {isEdit ? title || 'Untitled tour' : 'Fill in all the details for your new travel package'}
                        </p>
                    </div>
                </div>
                <Button onClick={handleSave} disabled={isSaving} className="gap-2 bg-brand-orange hover:bg-brand-orange/90">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Tour
                </Button>
            </div>

            <Tabs defaultValue="basic">
                <TabsList className="flex flex-wrap gap-1 h-auto bg-slate-100 p-1 rounded-xl mb-2">
                    {['basic', 'media', 'itinerary', 'inclusions', 'overview', 'settings'].map(t => (
                        <TabsTrigger key={t} value={t} className="rounded-lg text-xs px-3 py-1.5 capitalize">
                            {t === 'basic' ? 'Basic Info' : t}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {/* BASIC INFO */}
                <TabsContent value="basic">
                    <Card>
                        <CardHeader>
                            <CardTitle>Basic Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5 md:col-span-2">
                                    <Label>Title *</Label>
                                    <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Amazing Bali Adventure" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Location *</Label>
                                    <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Bali, Indonesia" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Status</Label>
                                    <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="draft">Draft</SelectItem>
                                            <SelectItem value="inactive">Inactive</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Price</Label>
                                    <Input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} min={0} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Currency</Label>
                                    <Select value={currency} onValueChange={setCurrency}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Days</Label>
                                    <Input type="number" value={days} onChange={e => { const d = Number(e.target.value); setDays(d); setNights(Math.max(0, d - 1)); }} min={1} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Nights</Label>
                                    <Input type="number" value={nights} onChange={e => setNights(Number(e.target.value))} min={0} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Validity (last available date)</Label>
                                    <Input type="date" value={validity} onChange={e => setValidity(e.target.value)} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>EMI Option (optional)</Label>
                                    <Input value={emi} onChange={e => setEmi(e.target.value)} placeholder="Starting ₹2,500/month" />
                                </div>
                            </div>

                            {/* Categories */}
                            <div className="space-y-2">
                                <Label>Categories / Tags</Label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {categories.map(c => (
                                        <Badge key={c} variant="secondary" className="gap-1 pr-1">
                                            {c}
                                            <button type="button" onClick={() => removeCategory(c)} className="text-slate-400 hover:text-red-500 ml-0.5">×</button>
                                        </Badge>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <Input
                                        value={categoryInput}
                                        onChange={e => setCategoryInput(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCategory(categoryInput); }}}
                                        placeholder="Type and press Enter…"
                                        className="max-w-xs"
                                    />
                                    <Button type="button" variant="outline" size="sm" onClick={() => addCategory(categoryInput)}>
                                        <Plus className="w-3.5 h-3.5 mr-1" /> Add
                                    </Button>
                                </div>
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {CATEGORY_SUGGESTIONS.filter(s => !categories.includes(s)).map(s => (
                                        <button key={s} type="button" onClick={() => addCategory(s)}
                                            className="text-xs px-2.5 py-1 rounded-full border border-dashed border-slate-300 text-slate-500 hover:border-brand-orange hover:text-brand-orange transition-colors">
                                            + {s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Coordinates */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label>Latitude (for map pin)</Label>
                                    <Input value={lat} onChange={e => setLat(e.target.value)} placeholder="-8.3405" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Longitude</Label>
                                    <Input value={lng} onChange={e => setLng(e.target.value)} placeholder="115.0920" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* MEDIA */}
                <TabsContent value="media">
                    <Card>
                        <CardHeader>
                            <CardTitle>Cover & Gallery Images</CardTitle>
                            <CardDescription>The main cover image appears in tour cards. Additional images appear in the gallery.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <ImagePicker label="Cover Image *" value={imageURL} onChange={setImageURL} />

                            <div>
                                <Label className="mb-3 block font-semibold">Additional Images</Label>
                                <div className="space-y-3">
                                    {images.map((img, i) => (
                                        <div key={i} className="flex gap-2 items-start">
                                            <div className="flex-1">
                                                <ImagePicker value={img} onChange={url => {
                                                    const next = [...images]; next[i] = url; setImages(next);
                                                }} />
                                            </div>
                                            <Button type="button" variant="ghost" size="icon" className="mt-1 text-slate-300 hover:text-red-500"
                                                onClick={() => setImages(p => p.filter((_, j) => j !== i))}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button type="button" variant="outline" size="sm" onClick={() => setImages(p => [...p, ''])} className="border-dashed gap-1.5">
                                        <Plus className="w-3.5 h-3.5" /> Add image
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ITINERARY */}
                <TabsContent value="itinerary">
                    <Card>
                        <CardHeader>
                            <CardTitle>Day-by-Day Itinerary</CardTitle>
                            <CardDescription>Add each day's activities. Order them as shown to guests.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ListEditor
                                items={itinerary}
                                onChange={setItinerary}
                                addLabel="Add day"
                                createEmpty={() => ({ day: itinerary.length + 1, activity: '', location: '' })}
                                renderItem={(day, i, onChange) => (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs">Day</Label>
                                            <Input type="number" value={day.day} onChange={e => onChange({ ...day, day: Number(e.target.value) })} min={1} />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Location</Label>
                                            <Input value={day.location} onChange={e => onChange({ ...day, location: e.target.value })} placeholder="Ubud, Bali" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Activity</Label>
                                            <Input value={day.activity} onChange={e => onChange({ ...day, activity: e.target.value })} placeholder="Rice terrace walk, temple visit" />
                                        </div>
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
                            <CardTitle>Inclusions & Exclusions</CardTitle>
                            <CardDescription>Toggle each item as included (green check) or not included (red cross).</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ListEditor
                                items={inclusions}
                                onChange={setInclusions}
                                addLabel="Add inclusion"
                                createEmpty={() => ({ title: '', included: true })}
                                renderItem={(item, _i, onChange) => (
                                    <div className="flex items-center gap-3">
                                        <Checkbox
                                            checked={item.included}
                                            onCheckedChange={checked => onChange({ ...item, included: !!checked })}
                                            className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                        />
                                        <Input
                                            value={item.title}
                                            onChange={e => onChange({ ...item, title: e.target.value })}
                                            placeholder="Accommodation, Flights, Meals, etc."
                                            className="flex-1"
                                        />
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${item.included ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                                            {item.included ? 'Included' : 'Excluded'}
                                        </span>
                                    </div>
                                )}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* OVERVIEW */}
                <TabsContent value="overview">
                    <Card>
                        <CardHeader>
                            <CardTitle>Overview / About</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-1.5">
                                <Label>About This Tour</Label>
                                <Textarea value={overviewAbout} onChange={e => setOverviewAbout(e.target.value)} rows={6} placeholder="Describe what travelers can expect on this tour…" />
                            </div>

                            <div>
                                <Label className="mb-3 block font-semibold">Overview Gallery</Label>
                                <ListEditor
                                    items={gallery}
                                    onChange={setGallery}
                                    addLabel="Add gallery photo"
                                    createEmpty={() => ({ imageURL: '', altText: '' })}
                                    renderItem={(item, _i, onChange) => (
                                        <div className="space-y-3">
                                            <ImagePicker value={item.imageURL} onChange={url => onChange({ ...item, imageURL: url })} />
                                            <div className="space-y-1">
                                                <Label className="text-xs">Alt Text (accessibility)</Label>
                                                <Input value={item.altText} onChange={e => onChange({ ...item, altText: e.target.value })} placeholder="Scenic view of rice terraces" />
                                            </div>
                                        </div>
                                    )}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* SETTINGS */}
                <TabsContent value="settings">
                    <Card>
                        <CardHeader>
                            <CardTitle>Tour Settings</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between rounded-xl border p-4">
                                <div>
                                    <Label className="text-base flex items-center gap-2">
                                        <Star className="w-4 h-4 text-yellow-500" /> Featured Tour
                                    </Label>
                                    <p className="text-sm text-muted-foreground">Show this tour in the Featured Tours section on the homepage.</p>
                                </div>
                                <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
                            </div>

                            <div className="space-y-1.5">
                                <Label>Status</Label>
                                <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                                    <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active — visible to all</SelectItem>
                                        <SelectItem value="draft">Draft — admin-only preview</SelectItem>
                                        <SelectItem value="inactive">Inactive — hidden</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end mt-4">
                        <Button onClick={handleSave} disabled={isSaving} className="gap-2 bg-brand-orange hover:bg-brand-orange/90 px-8">
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Tour
                        </Button>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};
