import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Save, Loader2, Plus, Download } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
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
import { JsonCsvImporter } from '@/components/ui/JsonCsvImporter';
import {
    useSiteSettings, useUpdateSiteSettings,
    type HeroSlide, type PromoSlide, type Testimonial, type PlanTripStep,
    type SupportFeature, type ChatMessage, type NavLink, type FooterLink,
} from '@/hooks/use-settings';

// ── Icon choices for steps and features ─────────────────────────────────────
const ICON_OPTIONS = [
    'Map', 'Calendar', 'Settings', 'CheckCircle2', 'Zap', 'Headphones',
    'MessageCircle', 'ShieldCheck', 'Globe2', 'Heart', 'Users', 'Star',
    'Camera', 'Compass', 'Plane', 'Hotel', 'Coffee', 'Award',
];

// ── Colour presets for hero slides ───────────────────────────────────────────
const COLOR_OPTIONS = [
    { label: 'Blue',   value: 'from-blue-500/80' },
    { label: 'Emerald', value: 'from-emerald-600/80' },
    { label: 'Purple', value: 'from-purple-600/80' },
    { label: 'Orange', value: 'from-orange-600/80' },
    { label: 'Green',  value: 'from-green-800/80' },
    { label: 'Rose',   value: 'from-rose-600/80' },
    { label: 'Amber',  value: 'from-amber-600/80' },
    { label: 'Cyan',   value: 'from-cyan-600/80' },
];

// ── Save button ──────────────────────────────────────────────────────────────
function SaveBtn({ onClick, loading }: { onClick: () => void; loading: boolean }) {
    return (
        <Button onClick={onClick} disabled={loading} className="ml-auto gap-2 bg-brand-blue hover:bg-brand-blue/90">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
        </Button>
    );
}

// ────────────────────────────────────────────────────────────────────────────

export const AdminHomepage = () => {
    const { data, isLoading } = useSiteSettings();
    const update = useUpdateSiteSettings();
    const settings = data?.settings;

    // ── Offer Bar ──────────────────────────────────────────────────────────
    const [offerBar, setOfferBar] = useState(settings?.offerBar ?? {
        enabled: true, badgeLabel: 'Sale', text: '', countdownEnd: null,
        gradientFrom: '#f97316', gradientTo: '#e11d48', ctaLink: '', ctaLabel: '',
    });

    // ── Hero Slides ────────────────────────────────────────────────────────
    const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(settings?.heroSlides ?? []);

    // ── Promo Slides ───────────────────────────────────────────────────────
    const [promoSlides, setPromoSlides] = useState<PromoSlide[]>(settings?.promoSlides ?? []);
    const [promoImportOpen, setPromoImportOpen] = useState(false);

    // ── Plan Trip ──────────────────────────────────────────────────────────
    const [planTrip, setPlanTrip] = useState(settings?.planTrip ?? { heading: '', subheading: '', steps: [] as PlanTripStep[] });

    // ── Testimonials ───────────────────────────────────────────────────────
    const [testimonials, setTestimonials] = useState<Testimonial[]>(settings?.testimonials ?? []);
    const [testimonialImportOpen, setTestimonialImportOpen] = useState(false);

    // ── Support Section ────────────────────────────────────────────────────
    const [support, setSupport] = useState(settings?.supportSection ?? {
        heading: '', subheading: '', paragraph: '',
        features: [] as SupportFeature[], chatMessages: [] as ChatMessage[],
    });

    // ── Nav Links ──────────────────────────────────────────────────────────
    const [navLinks, setNavLinks] = useState<NavLink[]>(settings?.navLinks ?? []);

    // ── Footer Links ───────────────────────────────────────────────────────
    const [footerExploreLinks, setFooterExploreLinks] = useState<FooterLink[]>(settings?.footerExploreLinks ?? []);
    const [footerCompanyLinks, setFooterCompanyLinks] = useState<FooterLink[]>(settings?.footerCompanyLinks ?? []);

    // Sync when data loads
    useEffect(() => {
        if (!settings) return;
        setOfferBar(settings.offerBar);
        setHeroSlides(settings.heroSlides);
        setPromoSlides(settings.promoSlides);
        setPlanTrip(settings.planTrip);
        setTestimonials(settings.testimonials);
        setSupport(settings.supportSection);
        setNavLinks(settings.navLinks);
        setFooterExploreLinks(settings.footerExploreLinks);
        setFooterCompanyLinks(settings.footerCompanyLinks);
    }, [settings]);

    const save = async (payload: Parameters<typeof update.mutateAsync>[0], label = 'Saved') => {
        const id = toast.loading('Saving…');
        try {
            await update.mutateAsync(payload);
            toast.success(label, { id });
        } catch {
            toast.error('Failed to save', { id });
        }
    };

    if (isLoading) return (
        <div className="space-y-6">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-96 w-full" />
        </div>
    );

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-display font-bold tracking-tight text-brand-blue">Homepage Content</h2>
                <p className="text-muted-foreground">Manage all homepage sections — slides, offers, testimonials, steps, and more.</p>
            </div>

            <Tabs defaultValue="offer">
                <TabsList className="flex flex-wrap gap-1 h-auto bg-slate-100 p-1 rounded-xl mb-2">
                    {[
                        { value: 'offer', label: 'Offer Bar' },
                        { value: 'hero', label: 'Hero Slides' },
                        { value: 'promo', label: 'Promo Deals' },
                        { value: 'plantrip', label: 'Plan Trip' },
                        { value: 'testimonials', label: 'Testimonials' },
                        { value: 'support', label: 'Support' },
                        { value: 'nav', label: 'Navigation' },
                        { value: 'footer', label: 'Footer Links' },
                    ].map(t => (
                        <TabsTrigger key={t.value} value={t.value} className="rounded-lg text-xs px-3 py-1.5">
                            {t.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {/* ── OFFER BAR ─────────────────────────────────────────────────── */}
                <TabsContent value="offer">
                    <Card>
                        <CardHeader>
                            <CardTitle>Announcement / Offer Bar</CardTitle>
                            <CardDescription>The coloured banner shown at the very top of the page with optional countdown.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="flex items-center justify-between rounded-xl border p-4">
                                <div>
                                    <Label className="text-base">Show Offer Bar</Label>
                                    <p className="text-sm text-muted-foreground">Toggle visibility site-wide.</p>
                                </div>
                                <Switch
                                    checked={offerBar.enabled}
                                    onCheckedChange={(v) => setOfferBar(p => ({ ...p, enabled: v }))}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label>Badge Label</Label>
                                    <Input value={offerBar.badgeLabel} onChange={e => setOfferBar(p => ({ ...p, badgeLabel: e.target.value }))} placeholder="Sale" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Countdown End (optional)</Label>
                                    <Input
                                        type="datetime-local"
                                        value={offerBar.countdownEnd ? new Date(offerBar.countdownEnd).toISOString().slice(0, 16) : ''}
                                        onChange={e => setOfferBar(p => ({ ...p, countdownEnd: e.target.value ? new Date(e.target.value).toISOString() : null }))}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Offer Text</Label>
                                <Input value={offerBar.text} onChange={e => setOfferBar(p => ({ ...p, text: e.target.value }))} placeholder="Winter Sale! Save Up to 40% on Your Next Trip" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label>CTA Label (optional)</Label>
                                    <Input value={offerBar.ctaLabel} onChange={e => setOfferBar(p => ({ ...p, ctaLabel: e.target.value }))} placeholder="Shop Now" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>CTA Link (optional)</Label>
                                    <Input value={offerBar.ctaLink} onChange={e => setOfferBar(p => ({ ...p, ctaLink: e.target.value }))} placeholder="/tours" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label>Gradient From</Label>
                                    <div className="flex gap-2 items-center">
                                        <input type="color" value={offerBar.gradientFrom} onChange={e => setOfferBar(p => ({ ...p, gradientFrom: e.target.value }))} className="w-10 h-10 rounded cursor-pointer border" />
                                        <Input value={offerBar.gradientFrom} onChange={e => setOfferBar(p => ({ ...p, gradientFrom: e.target.value }))} className="font-mono text-sm" />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Gradient To</Label>
                                    <div className="flex gap-2 items-center">
                                        <input type="color" value={offerBar.gradientTo} onChange={e => setOfferBar(p => ({ ...p, gradientTo: e.target.value }))} className="w-10 h-10 rounded cursor-pointer border" />
                                        <Input value={offerBar.gradientTo} onChange={e => setOfferBar(p => ({ ...p, gradientTo: e.target.value }))} className="font-mono text-sm" />
                                    </div>
                                </div>
                            </div>
                            {/* Live preview */}
                            <div className="rounded-xl overflow-hidden border border-slate-200">
                                <div
                                    className="py-2.5 px-4 flex items-center justify-between text-sm font-medium text-white"
                                    style={{ background: `linear-gradient(to right, ${offerBar.gradientFrom}, ${offerBar.gradientTo})` }}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{offerBar.badgeLabel || 'Sale'}</span>
                                        <span>{offerBar.text || 'Your offer text here'}</span>
                                    </div>
                                    {offerBar.ctaLabel && (
                                        <span className="underline cursor-pointer">{offerBar.ctaLabel}</span>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="border-t px-6 py-4">
                            <SaveBtn onClick={() => save({ offerBar }, 'Offer bar saved')} loading={update.isPending} />
                        </CardFooter>
                    </Card>
                </TabsContent>

                {/* ── HERO SLIDES ───────────────────────────────────────────────── */}
                <TabsContent value="hero">
                    <Card>
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div>
                                    <CardTitle>Hero Accordion Slides</CardTitle>
                                    <CardDescription>Full-screen hero with expandable panels. Each slide has title, subtitle, image, gradient, and CTA.</CardDescription>
                                </div>
                                <Badge variant="secondary">{heroSlides.length} slides</Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ListEditor
                                items={heroSlides}
                                onChange={setHeroSlides}
                                addLabel="Add slide"
                                createEmpty={() => ({ title: '', subtitle: '', image: '', color: 'from-blue-500/80', ctaLink: '/destinations', ctaLabel: 'Explore' })}
                                renderItem={(slide, _i, onChange) => (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-xs">Title</Label>
                                                <Input value={slide.title} onChange={e => onChange({ ...slide, title: e.target.value })} placeholder="Paradise Found" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Subtitle</Label>
                                                <Input value={slide.subtitle} onChange={e => onChange({ ...slide, subtitle: e.target.value })} placeholder="Pristine Beaches" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">CTA Label</Label>
                                                <Input value={slide.ctaLabel} onChange={e => onChange({ ...slide, ctaLabel: e.target.value })} placeholder="Explore" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">CTA Link</Label>
                                                <Input value={slide.ctaLink} onChange={e => onChange({ ...slide, ctaLink: e.target.value })} placeholder="/destinations" />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Gradient Color</Label>
                                            <Select value={slide.color} onValueChange={v => onChange({ ...slide, color: v })}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {COLOR_OPTIONS.map(c => (
                                                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <ImagePicker
                                            label="Slide Image"
                                            value={slide.image}
                                            onChange={url => onChange({ ...slide, image: url })}
                                        />
                                    </div>
                                )}
                            />
                        </CardContent>
                        <CardFooter className="border-t px-6 py-4">
                            <SaveBtn onClick={() => save({ heroSlides }, 'Hero slides saved')} loading={update.isPending} />
                        </CardFooter>
                    </Card>
                </TabsContent>

                {/* ── PROMO SLIDES ──────────────────────────────────────────────── */}
                <TabsContent value="promo">
                    <Card>
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div>
                                    <CardTitle>Special Offer Slides</CardTitle>
                                    <CardDescription>Promotional carousel with partner deals, discount badges, and pricing.</CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setPromoImportOpen(true)} className="gap-1.5">
                                        <Download className="w-3.5 h-3.5" /> Import
                                    </Button>
                                    <Badge variant="secondary">{promoSlides.length} slides</Badge>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ListEditor
                                items={promoSlides}
                                onChange={setPromoSlides}
                                addLabel="Add promo slide"
                                createEmpty={() => ({ partner: '', title: '', subtitle: '', image: '', accentColor: 'text-emerald-400', discount: 'Save 20%', fromPrice: 999, searchQuery: '' })}
                                renderItem={(slide, _i, onChange) => (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-xs">Partner Name</Label>
                                                <Input value={slide.partner} onChange={e => onChange({ ...slide, partner: e.target.value })} placeholder="Singapore Tourism" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Discount Badge</Label>
                                                <Input value={slide.discount} onChange={e => onChange({ ...slide, discount: e.target.value })} placeholder="Save 25%" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Title</Label>
                                                <Input value={slide.title} onChange={e => onChange({ ...slide, title: e.target.value })} placeholder="The Garden City Awaits" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">From Price (USD)</Label>
                                                <Input type="number" value={slide.fromPrice} onChange={e => onChange({ ...slide, fromPrice: Number(e.target.value) })} />
                                            </div>
                                            <div className="space-y-1 md:col-span-2">
                                                <Label className="text-xs">Subtitle</Label>
                                                <Input value={slide.subtitle} onChange={e => onChange({ ...slide, subtitle: e.target.value })} placeholder="Experience the magic…" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Search Query (for CTA button)</Label>
                                                <Input value={slide.searchQuery} onChange={e => onChange({ ...slide, searchQuery: e.target.value })} placeholder="Singapore" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Accent Color (Tailwind class)</Label>
                                                <Input value={slide.accentColor} onChange={e => onChange({ ...slide, accentColor: e.target.value })} placeholder="text-emerald-400" />
                                            </div>
                                        </div>
                                        <ImagePicker
                                            label="Slide Image"
                                            value={slide.image}
                                            onChange={url => onChange({ ...slide, image: url })}
                                        />
                                    </div>
                                )}
                            />
                        </CardContent>
                        <CardFooter className="border-t px-6 py-4">
                            <SaveBtn onClick={() => save({ promoSlides }, 'Promo slides saved')} loading={update.isPending} />
                        </CardFooter>
                    </Card>
                    <JsonCsvImporter
                        open={promoImportOpen}
                        onOpenChange={setPromoImportOpen}
                        title="Import Promo Slides"
                        schemaHint='Fields: partner, title, subtitle, image, discount, fromPrice, searchQuery, accentColor'
                        exampleJson={`[\n  {\n    "partner": "Visit Japan",\n    "title": "Cherry Blossom Season",\n    "subtitle": "Experience the magic of spring in Kyoto.",\n    "image": "https://...",\n    "discount": "Save 15%",\n    "fromPrice": 1400,\n    "searchQuery": "Japan",\n    "accentColor": "text-pink-400"\n  }\n]`}
                        onImport={(rows) => {
                            const slides = rows.map(r => ({
                                partner: String(r.partner ?? ''),
                                title: String(r.title ?? ''),
                                subtitle: String(r.subtitle ?? ''),
                                image: String(r.image ?? ''),
                                discount: String(r.discount ?? 'Save 20%'),
                                fromPrice: Number(r.fromPrice ?? 999),
                                searchQuery: String(r.searchQuery ?? ''),
                                accentColor: String(r.accentColor ?? 'text-emerald-400'),
                            }));
                            setPromoSlides(p => [...p, ...slides]);
                            toast.success(`Added ${slides.length} promo slides. Remember to save.`);
                        }}
                    />
                </TabsContent>

                {/* ── PLAN TRIP ─────────────────────────────────────────────────── */}
                <TabsContent value="plantrip">
                    <Card>
                        <CardHeader>
                            <CardTitle>Plan Your Trip Section</CardTitle>
                            <CardDescription>The dark-background step-by-step guide section on the homepage.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label>Section Heading</Label>
                                    <Input value={planTrip.heading} onChange={e => setPlanTrip(p => ({ ...p, heading: e.target.value }))} placeholder="Plan Your Dream Trip" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Sub-label</Label>
                                    <Input value={planTrip.subheading} onChange={e => setPlanTrip(p => ({ ...p, subheading: e.target.value }))} placeholder="Easy as 1-2-3-4" />
                                </div>
                            </div>
                            <div>
                                <Label className="mb-3 block">Steps</Label>
                                <ListEditor
                                    items={planTrip.steps}
                                    onChange={(steps) => setPlanTrip(p => ({ ...p, steps }))}
                                    addLabel="Add step"
                                    maxItems={6}
                                    createEmpty={() => ({ icon: 'Map', title: '', description: '' })}
                                    renderItem={(step, _i, onChange) => (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-xs">Icon</Label>
                                                <Select value={step.icon} onValueChange={v => onChange({ ...step, icon: v })}>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>{ICON_OPTIONS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Title</Label>
                                                <Input value={step.title} onChange={e => onChange({ ...step, title: e.target.value })} placeholder="Pick Destination" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Description</Label>
                                                <Input value={step.description} onChange={e => onChange({ ...step, description: e.target.value })} placeholder="Choose from 100+ locations" />
                                            </div>
                                        </div>
                                    )}
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="border-t px-6 py-4">
                            <SaveBtn onClick={() => save({ planTrip }, 'Plan trip section saved')} loading={update.isPending} />
                        </CardFooter>
                    </Card>
                </TabsContent>

                {/* ── TESTIMONIALS ──────────────────────────────────────────────── */}
                <TabsContent value="testimonials">
                    <Card>
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div>
                                    <CardTitle>Testimonials</CardTitle>
                                    <CardDescription>Customer quotes shown in the "Stories from the Road" masonry grid.</CardDescription>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => setTestimonialImportOpen(true)} className="gap-1.5">
                                    <Download className="w-3.5 h-3.5" /> Import CSV / JSON
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ListEditor
                                items={testimonials}
                                onChange={setTestimonials}
                                addLabel="Add testimonial"
                                createEmpty={() => ({ name: '', role: '', image: '', quote: '', rating: 5, location: '' })}
                                renderItem={(t, _i, onChange) => (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-xs">Name</Label>
                                                <Input value={t.name} onChange={e => onChange({ ...t, name: e.target.value })} placeholder="Sarah Johnson" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Role / Title</Label>
                                                <Input value={t.role} onChange={e => onChange({ ...t, role: e.target.value })} placeholder="Adventure Enthusiast" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Trip Location</Label>
                                                <Input value={t.location} onChange={e => onChange({ ...t, location: e.target.value })} placeholder="Bali, Indonesia" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Rating (1-5)</Label>
                                                <Select value={String(t.rating)} onValueChange={v => onChange({ ...t, rating: Number(v) })}>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>{[5,4,3,2,1].map(r => <SelectItem key={r} value={String(r)}>{r} stars</SelectItem>)}</SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Quote</Label>
                                            <Textarea value={t.quote} onChange={e => onChange({ ...t, quote: e.target.value })} rows={2} placeholder="This trip was absolutely amazing…" />
                                        </div>
                                        <ImagePicker
                                            label="Photo"
                                            value={t.image}
                                            onChange={url => onChange({ ...t, image: url })}
                                        />
                                    </div>
                                )}
                            />
                        </CardContent>
                        <CardFooter className="border-t px-6 py-4">
                            <SaveBtn onClick={() => save({ testimonials }, 'Testimonials saved')} loading={update.isPending} />
                        </CardFooter>
                    </Card>
                    <JsonCsvImporter
                        open={testimonialImportOpen}
                        onOpenChange={setTestimonialImportOpen}
                        title="Import Testimonials"
                        schemaHint="Fields: name, role, image, quote, rating (1-5), location"
                        exampleJson={`[\n  {\n    "name": "Sarah Johnson",\n    "role": "Adventure Enthusiast",\n    "image": "https://...",\n    "quote": "Amazing experience!",\n    "rating": 5,\n    "location": "Bali, Indonesia"\n  }\n]`}
                        onImport={(rows) => {
                            const items = rows.map(r => ({
                                name: String(r.name ?? ''),
                                role: String(r.role ?? ''),
                                image: String(r.image ?? ''),
                                quote: String(r.quote ?? ''),
                                rating: Math.min(5, Math.max(1, Number(r.rating ?? 5))),
                                location: String(r.location ?? ''),
                            }));
                            setTestimonials(p => [...p, ...items]);
                            toast.success(`Added ${items.length} testimonials. Remember to save.`);
                        }}
                    />
                </TabsContent>

                {/* ── SUPPORT SECTION ───────────────────────────────────────────── */}
                <TabsContent value="support">
                    <Card>
                        <CardHeader>
                            <CardTitle>Support / Concierge Section</CardTitle>
                            <CardDescription>The phone mockup + feature cards section. Edit headings, feature cards, and chat preview messages.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label>Sub-label</Label>
                                    <Input value={support.subheading} onChange={e => setSupport(p => ({ ...p, subheading: e.target.value }))} placeholder="Support Beyond Booking" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Main Heading</Label>
                                    <Input value={support.heading} onChange={e => setSupport(p => ({ ...p, heading: e.target.value }))} placeholder="You Travel, We Handle The Rest." />
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <Label>Paragraph</Label>
                                    <Textarea value={support.paragraph} onChange={e => setSupport(p => ({ ...p, paragraph: e.target.value }))} rows={2} />
                                </div>
                            </div>

                            <div>
                                <Label className="mb-3 block font-semibold">Feature Cards</Label>
                                <ListEditor
                                    items={support.features}
                                    onChange={(features) => setSupport(p => ({ ...p, features }))}
                                    addLabel="Add feature"
                                    maxItems={6}
                                    createEmpty={() => ({ icon: 'Zap', title: '', description: '' })}
                                    renderItem={(f, _i, onChange) => (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-xs">Icon</Label>
                                                <Select value={f.icon} onValueChange={v => onChange({ ...f, icon: v })}>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>{ICON_OPTIONS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Title</Label>
                                                <Input value={f.title} onChange={e => onChange({ ...f, title: e.target.value })} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Description</Label>
                                                <Input value={f.description} onChange={e => onChange({ ...f, description: e.target.value })} />
                                            </div>
                                        </div>
                                    )}
                                />
                            </div>

                            <div>
                                <Label className="mb-3 block font-semibold">Chat Preview Messages</Label>
                                <ListEditor
                                    items={support.chatMessages}
                                    onChange={(chatMessages) => setSupport(p => ({ ...p, chatMessages }))}
                                    addLabel="Add message"
                                    maxItems={8}
                                    createEmpty={() => ({ sender: 'assistant' as const, text: '' })}
                                    renderItem={(msg, _i, onChange) => (
                                        <div className="flex gap-3 items-center">
                                            <Select value={msg.sender} onValueChange={v => onChange({ ...msg, sender: v as 'user' | 'assistant' })}>
                                                <SelectTrigger className="w-32 shrink-0"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="assistant">Assistant</SelectItem>
                                                    <SelectItem value="user">User</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Input value={msg.text} onChange={e => onChange({ ...msg, text: e.target.value })} placeholder="Message text…" />
                                        </div>
                                    )}
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="border-t px-6 py-4">
                            <SaveBtn onClick={() => save({ supportSection: support }, 'Support section saved')} loading={update.isPending} />
                        </CardFooter>
                    </Card>
                </TabsContent>

                {/* ── NAVIGATION ────────────────────────────────────────────────── */}
                <TabsContent value="nav">
                    <Card>
                        <CardHeader>
                            <CardTitle>Navigation Links</CardTitle>
                            <CardDescription>The links shown in the desktop header and mobile menu.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ListEditor
                                items={navLinks}
                                onChange={setNavLinks}
                                addLabel="Add nav link"
                                maxItems={8}
                                createEmpty={() => ({ label: '', path: '/', order: navLinks.length })}
                                renderItem={(link, i, onChange) => (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs">Label</Label>
                                            <Input value={link.label} onChange={e => onChange({ ...link, label: e.target.value })} placeholder="Destinations" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Path</Label>
                                            <Input value={link.path} onChange={e => onChange({ ...link, path: e.target.value })} placeholder="/destinations" />
                                        </div>
                                    </div>
                                )}
                            />
                        </CardContent>
                        <CardFooter className="border-t px-6 py-4">
                            <SaveBtn onClick={() => save({ navLinks: navLinks.map((l, i) => ({ ...l, order: i })) }, 'Navigation saved')} loading={update.isPending} />
                        </CardFooter>
                    </Card>
                </TabsContent>

                {/* ── FOOTER LINKS ──────────────────────────────────────────────── */}
                <TabsContent value="footer">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Explore Column</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ListEditor
                                    items={footerExploreLinks}
                                    onChange={setFooterExploreLinks}
                                    addLabel="Add link"
                                    createEmpty={() => ({ label: '', path: '/' })}
                                    renderItem={(link, _i, onChange) => (
                                        <div className="grid grid-cols-2 gap-2">
                                            <Input value={link.label} onChange={e => onChange({ ...link, label: e.target.value })} placeholder="Label" />
                                            <Input value={link.path} onChange={e => onChange({ ...link, path: e.target.value })} placeholder="/path" />
                                        </div>
                                    )}
                                />
                            </CardContent>
                            <CardFooter className="border-t px-6 py-4">
                                <SaveBtn onClick={() => save({ footerExploreLinks }, 'Explore links saved')} loading={update.isPending} />
                            </CardFooter>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Company Column</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ListEditor
                                    items={footerCompanyLinks}
                                    onChange={setFooterCompanyLinks}
                                    addLabel="Add link"
                                    createEmpty={() => ({ label: '', path: '/' })}
                                    renderItem={(link, _i, onChange) => (
                                        <div className="grid grid-cols-2 gap-2">
                                            <Input value={link.label} onChange={e => onChange({ ...link, label: e.target.value })} placeholder="Label" />
                                            <Input value={link.path} onChange={e => onChange({ ...link, path: e.target.value })} placeholder="/path" />
                                        </div>
                                    )}
                                />
                            </CardContent>
                            <CardFooter className="border-t px-6 py-4">
                                <SaveBtn onClick={() => save({ footerCompanyLinks }, 'Company links saved')} loading={update.isPending} />
                            </CardFooter>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};
