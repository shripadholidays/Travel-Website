import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { MoreHorizontal, MapPin, Plus, Loader2, Globe, Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { ImagePicker } from "@/components/ui/ImagePicker";
import { ListEditor } from "@/components/ui/ListEditor";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, PageHeader, SearchField, StatusPill, StatusTabs } from "@/components/admin/AdminUI";
import { useAdminDestinations, useCreateDestination, useUpdateDestination, useDeleteDestination } from "@/hooks/use-destinations";
import type { Destination } from "@/types";

const CONTINENTS = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania', 'Antarctica'];

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

type Form = {
    name: string; country: string; continent: string; description: string; bestTimeToVisit: string;
    coverImage: string; gallery: string[]; highlights: { title: string; text: string }[];
    isActive: boolean; lat: string; lng: string;
};
const EMPTY: Form = { name: '', country: '', continent: 'Asia', description: '', bestTimeToVisit: '', coverImage: '', gallery: [], highlights: [], isActive: true, lat: '', lng: '' };

const toForm = (d: Destination): Form => ({
    name: d.name, country: d.country, continent: d.continent || 'Asia', description: d.description ?? '',
    bestTimeToVisit: d.bestTimeToVisit ?? '', coverImage: d.coverImage ?? '', gallery: d.images ?? [],
    highlights: (d.highlights ?? []).map((h) => ({ title: h.title, text: h.text ?? '' })),
    isActive: d.isActive !== false,
    lat: d.coordinates?.lat != null ? String(d.coordinates.lat) : '',
    lng: d.coordinates?.lng != null ? String(d.coordinates.lng) : '',
});

function check(f: Form): Partial<Record<keyof Form, string>> {
    const e: Partial<Record<keyof Form, string>> = {};
    if (!f.name.trim()) e.name = 'Add a name.';
    if (!f.country.trim()) e.country = 'Add the country.';
    if (!f.coverImage) e.coverImage = 'Add a cover image.';
    if (f.description.trim().length < 20) e.description = 'Write a short description (20+ characters).';
    if (f.lat !== '' || f.lng !== '') {
        if (f.lat === '' || Number.isNaN(Number(f.lat)) || Math.abs(Number(f.lat)) > 90) e.lat = 'Latitude is -90 to 90.';
        if (f.lng === '' || Number.isNaN(Number(f.lng)) || Math.abs(Number(f.lng)) > 180) e.lng = 'Longitude is -180 to 180.';
    }
    return e;
}

const Err = ({ m }: { m?: string }) => (m ? <p className="text-xs font-medium text-red-600" role="alert">{m}</p> : null);

export const AdminDestinations = () => {
    const [search, setSearch] = useState("");
    const [show, setShow] = useState<"all" | "live" | "hidden">("all");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Destination | null>(null);
    const [form, setForm] = useState<Form>(EMPTY);
    const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
    const [deleteTarget, setDeleteTarget] = useState<Destination | null>(null);

    const { data, isLoading } = useAdminDestinations();
    const createDestination = useCreateDestination();
    const updateDestination = useUpdateDestination();
    const deleteDestination = useDeleteDestination();

    const all = data?.destinations ?? [];
    const q = search.toLowerCase();
    const destinations = all.filter((d) =>
        (show === "all" || (show === "live" ? d.isActive : !d.isActive)) &&
        (!q || d.name.toLowerCase().includes(q) || d.country.toLowerCase().includes(q)),
    );

    const set = <K extends keyof Form>(k: K, v: Form[K]) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };
    const openCreate = () => { setEditing(null); setForm(EMPTY); setErrors({}); setDialogOpen(true); };
    const openEdit = (d: Destination) => { setEditing(d); setForm(toForm(d)); setErrors({}); setDialogOpen(true); };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const found = check(form);
        setErrors(found);
        if (Object.keys(found).length) return;
        const payload = {
            name: form.name.trim(),
            slug: editing?.slug || slugify(form.name),
            country: form.country.trim(),
            continent: form.continent,
            description: form.description.trim(),
            bestTimeToVisit: form.bestTimeToVisit.trim(),
            highlights: form.highlights.filter((h) => h.title.trim()).map((h) => ({ title: h.title.trim(), text: h.text.trim() })),
            images: form.gallery.filter(Boolean),
            coverImage: form.coverImage,
            isActive: form.isActive,
            // Blank means "no map pin" (the server removes it)
            coordinates: { lat: form.lat === '' ? '' : Number(form.lat), lng: form.lng === '' ? '' : Number(form.lng) },
        } as unknown as Partial<Destination>;
        try {
            if (editing) await updateDestination.mutateAsync({ id: editing._id, data: payload });
            else await createDestination.mutateAsync(payload);
            toast.success(editing ? "Destination updated" : `${form.name} added`);
            setDialogOpen(false);
        } catch (err) {
            toast.error((err as Error).message || "Failed to save the destination");
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteDestination.mutateAsync(deleteTarget._id);
            toast.success("Destination deleted. Its tours are not affected.");
        } catch (err) {
            toast.error((err as Error).message || "Failed to delete");
        }
        setDeleteTarget(null);
    };

    const isSubmitting = createDestination.isPending || updateDestination.isPending;
    const liveCount = all.filter((d) => d.isActive).length;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Destinations"
                description="Places travellers can browse. Tours appear on a destination's page automatically when their location or title names it."
                actions={<Button className="bg-brand-orange hover:bg-brand-orange/90 gap-2" onClick={openCreate}><Plus className="w-4 h-4" /> Add destination</Button>}
            />

            <Card>
                <CardHeader className="pb-3 space-y-4">
                    <StatusTabs value={show} onChange={setShow} options={[
                        { id: "all", label: "All", count: all.length },
                        { id: "live", label: "Live", count: liveCount },
                        { id: "hidden", label: "Hidden", count: all.length - liveCount },
                    ]} />
                    <SearchField value={search} onChange={setSearch} placeholder="Name or country…" />
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                    ) : destinations.length === 0 ? (
                        <EmptyState icon={Globe} title={all.length ? "No destinations match" : "No destinations yet"} description={all.length ? "Try another search." : "Add the countries and regions your tours visit."} />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Destination</TableHead>
                                    <TableHead className="hidden md:table-cell">Region</TableHead>
                                    <TableHead>Live tours</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {destinations.map((dest) => (
                                    <TableRow key={dest._id}>
                                        <TableCell>
                                            <button type="button" onClick={() => openEdit(dest)} className="flex items-center gap-3 text-left min-w-0">
                                                <div className="w-11 h-11 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                                                    {dest.coverImage && <img src={dest.coverImage} alt="" className="object-cover w-full h-full" />}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold hover:text-brand-orange truncate">{dest.name}</p>
                                                    <p className="text-xs text-muted-foreground truncate">{dest.country}</p>
                                                </div>
                                            </button>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            <span className="inline-flex items-center gap-1.5 text-muted-foreground"><MapPin className="w-3.5 h-3.5" />{dest.continent}</span>
                                        </TableCell>
                                        <TableCell className="tabular-nums">
                                            {dest.tourCount > 0 ? dest.tourCount : <span className="text-xs text-amber-700">None yet</span>}
                                        </TableCell>
                                        <TableCell><StatusPill tone={dest.isActive ? "green" : "slate"}>{dest.isActive ? "Live" : "Hidden"}</StatusPill></TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${dest.name}`}><MoreHorizontal className="w-4 h-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => openEdit(dest)}><Pencil className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                                                    <DropdownMenuItem asChild><a href={`/destinations/${dest.slug}`} target="_blank" rel="noopener noreferrer"><Eye className="w-4 h-4 mr-2" /> {dest.isActive ? "View on site" : "Preview"}</a></DropdownMenuItem>
                                                    <DropdownMenuItem asChild><Link to={`/admin/tours?q=${encodeURIComponent(dest.name)}`}><MapPin className="w-4 h-4 mr-2" /> See its tours</Link></DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setDeleteTarget(dest)}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Create / Edit */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>{editing ? `Edit ${editing.name}` : 'Add destination'}</DialogTitle>
                        <DialogDescription>
                            {editing ? <>Web address: <span className="font-mono">/destinations/{editing.slug}</span></> : 'Name it the way travellers search for it, e.g. "Bali" or "Japan".'}
                        </DialogDescription>
                    </DialogHeader>
                    <form id="destination-form" onSubmit={handleSave} className="space-y-4 overflow-y-auto flex-1 pr-1 -mr-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="d-name">Name *</Label>
                                <Input id="d-name" value={form.name} onChange={(e) => set('name', e.target.value)} aria-invalid={!!errors.name} />
                                <Err m={errors.name} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="d-country">Country *</Label>
                                <Input id="d-country" value={form.country} onChange={(e) => set('country', e.target.value)} aria-invalid={!!errors.country} />
                                <Err m={errors.country} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="d-continent">Continent</Label>
                                <Select value={form.continent} onValueChange={(v) => set('continent', v)}>
                                    <SelectTrigger id="d-continent"><SelectValue /></SelectTrigger>
                                    <SelectContent>{CONTINENTS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="d-best">Best time to visit</Label>
                                <Input id="d-best" value={form.bestTimeToVisit} onChange={(e) => set('bestTimeToVisit', e.target.value)} placeholder="March to May" maxLength={120} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <ImagePicker label="Cover image *" value={form.coverImage} onChange={(url) => set('coverImage', url)} />
                            <Err m={errors.coverImage} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="d-desc">Description *</Label>
                            <Textarea id="d-desc" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} aria-invalid={!!errors.description} />
                            <Err m={errors.description} />
                        </div>
                        <div className="space-y-2">
                            <Label>Why visit</Label>
                            <p className="text-xs text-muted-foreground -mt-1">Short reasons shown as cards. Leave empty to show the trip styles of this destination's tours.</p>
                            <ListEditor
                                items={form.highlights}
                                onChange={(h) => set('highlights', h)}
                                addLabel="Add reason"
                                maxItems={6}
                                createEmpty={() => ({ title: '', text: '' })}
                                renderItem={(h, i, onChange) => (
                                    <div className="grid gap-2 sm:grid-cols-[1fr_2fr]">
                                        <Input aria-label={`Reason ${i + 1} title`} value={h.title} maxLength={80} onChange={(e) => onChange({ ...h, title: e.target.value })} placeholder="Cherry blossoms" />
                                        <Input aria-label={`Reason ${i + 1} detail`} value={h.text} maxLength={300} onChange={(e) => onChange({ ...h, text: e.target.value })} placeholder="Parks turn pink every April" />
                                    </div>
                                )}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Gallery</Label>
                            <ListEditor
                                items={form.gallery}
                                onChange={(g) => set('gallery', g)}
                                addLabel="Add photo"
                                maxItems={12}
                                createEmpty={() => ''}
                                renderItem={(url, i, onChange) => <ImagePicker label={`Photo ${i + 1}`} value={url} onChange={onChange} />}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label htmlFor="d-lat">Latitude</Label>
                                <Input id="d-lat" inputMode="decimal" value={form.lat} onChange={(e) => set('lat', e.target.value)} placeholder="Optional" />
                                <Err m={errors.lat} />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="d-lng">Longitude</Label>
                                <Input id="d-lng" inputMode="decimal" value={form.lng} onChange={(e) => set('lng', e.target.value)} placeholder="Optional" />
                                <Err m={errors.lng} />
                            </div>
                        </div>
                        <div className="flex items-center justify-between rounded-xl border p-3">
                            <div>
                                <Label htmlFor="d-active">Live on the site</Label>
                                <p className="text-xs text-muted-foreground">Hidden destinations can still be previewed by staff.</p>
                            </div>
                            <Switch id="d-active" checked={form.isActive} onCheckedChange={(v) => set('isActive', v)} />
                        </div>
                    </form>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" form="destination-form" disabled={isSubmitting} className="bg-brand-orange hover:bg-brand-orange/90">
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editing ? 'Save changes' : 'Add destination'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(o) => !o && setDeleteTarget(null)}
                title={`Delete ${deleteTarget?.name}?`}
                description="The destination page is removed. Its tours stay on the site. To take it off the site for now, switch it to hidden instead."
                confirmLabel="Delete"
                destructive
                loading={deleteDestination.isPending}
                onConfirm={handleDelete}
            />
        </div>
    );
};
