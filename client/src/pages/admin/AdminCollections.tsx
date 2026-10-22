import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/alert-dialog';
import { Plus, MoreHorizontal, Search, Loader2, Layers } from 'lucide-react';
import { ImagePicker } from '@/components/ui/ImagePicker';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminCollections, useCreateCollection, useUpdateCollection, useDeleteCollection } from '@/hooks/use-collections';
import { useTours } from '@/hooks/use-tours';
import { toast } from 'sonner';
import type { Collection, Tour } from '@/types';

const slugify = (s: string) =>
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

interface FormState {
    name: string;
    description: string;
    coverImage: string;
    isActive: boolean;
    displayOrder: number;
    selectedTours: string[];
}

const EMPTY_FORM: FormState = {
    name: '', description: '', coverImage: '', isActive: true, displayOrder: 0, selectedTours: [],
};

export const AdminCollections = () => {
    const [search, setSearch] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Collection | null>(null);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [deleteTarget, setDeleteTarget] = useState<Collection | null>(null);
    const [tourSearch, setTourSearch] = useState('');

    const { data, isLoading } = useAdminCollections();
    const { data: toursData } = useTours({ limit: 200 });
    const collections = (data?.collections ?? []).filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase())
    );

    const allTours: Tour[] = toursData?.tours ?? [];
    const filteredTours = useMemo(() =>
        allTours.filter(t =>
            t.title.toLowerCase().includes(tourSearch.toLowerCase()) ||
            t.location.toLowerCase().includes(tourSearch.toLowerCase())
        ),
        [allTours, tourSearch]
    );

    const createCollection = useCreateCollection();
    const updateCollection = useUpdateCollection();
    const deleteCollection = useDeleteCollection();

    const openCreate = () => {
        setEditing(null);
        setTourSearch('');
        setForm({ ...EMPTY_FORM, displayOrder: (data?.collections?.length ?? 0) });
        setDialogOpen(true);
    };

    const openEdit = (c: Collection) => {
        setEditing(c);
        setTourSearch('');
        const existingTourIds = (c.tours ?? []).map((t: Tour | string) =>
            typeof t === 'string' ? t : t._id
        );
        setForm({
            name: c.name,
            description: c.description,
            coverImage: c.coverImage,
            isActive: c.isActive,
            displayOrder: c.displayOrder,
            selectedTours: existingTourIds,
        });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) { toast.error('Name is required'); return; }
        const payload: Partial<Collection> = {
            name: form.name,
            slug: editing?.slug || slugify(form.name),
            description: form.description,
            coverImage: form.coverImage,
            isActive: form.isActive,
            displayOrder: form.displayOrder,
            tours: form.selectedTours as unknown as Tour[],
        };
        const toastId = toast.loading(editing ? 'Updating collection…' : 'Creating collection…');
        try {
            if (editing) {
                await updateCollection.mutateAsync({ id: editing._id, data: payload });
                toast.success('Collection updated', { id: toastId });
            } else {
                await createCollection.mutateAsync(payload);
                toast.success('Collection created', { id: toastId });
            }
            setDialogOpen(false);
            setEditing(null);
        } catch (err) {
            toast.error((err as Error).message || 'Failed to save', { id: toastId });
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        const toastId = toast.loading('Deleting collection…');
        try {
            await deleteCollection.mutateAsync(deleteTarget._id);
            toast.success('Deleted', { id: toastId });
            setDeleteTarget(null);
        } catch {
            toast.error('Failed to delete', { id: toastId });
        }
    };

    const isSubmitting = createCollection.isPending || updateCollection.isPending;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-display font-bold tracking-tight text-brand-blue">Collections</h2>
                    <p className="text-muted-foreground">Curated groups of tours shown on the Collections page.</p>
                </div>
                <Button className="bg-brand-orange hover:bg-brand-orange/90 gap-2" onClick={openCreate}>
                    <Plus className="w-4 h-4" /> Add Collection
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle>All Collections</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search" placeholder="Search collections…"
                                className="pl-9 h-9"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex items-center gap-4">
                                    <Skeleton className="h-12 w-12 rounded-md" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-48" />
                                        <Skeleton className="h-3 w-32" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Collection</TableHead>
                                    <TableHead>Slug</TableHead>
                                    <TableHead>Tours</TableHead>
                                    <TableHead>Order</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {collections.length > 0 ? collections.map(c => (
                                    <TableRow key={c._id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-3">
                                                {c.coverImage ? (
                                                    <img src={c.coverImage} alt={c.name} className="w-10 h-10 rounded-md object-cover shrink-0" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center">
                                                        <Layers className="w-5 h-5 text-slate-400" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-semibold">{c.name}</p>
                                                    <p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">{c.description}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs font-mono text-slate-500">{c.slug}</TableCell>
                                        <TableCell>{Array.isArray(c.tours) ? c.tours.length : 0}</TableCell>
                                        <TableCell>{c.displayOrder}</TableCell>
                                        <TableCell>
                                            <Badge variant={c.isActive ? 'success' : 'secondary'}>
                                                {c.isActive ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => openEdit(c)}>Edit</DropdownMenuItem>
                                                    <DropdownMenuItem className="text-red-600" onClick={() => setDeleteTarget(c)}>Delete</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                            No collections found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Create / Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) setEditing(null); }}>
                <DialogContent className="sm:max-w-[560px] max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Collection' : 'Add Collection'}</DialogTitle>
                        <DialogDescription>
                            {editing ? "Update this collection's details and visibility." : 'Create a new curated collection of tours.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2 overflow-y-auto flex-1">
                        <div className="space-y-1.5">
                            <Label>Name *</Label>
                            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Beach Escapes" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Description</Label>
                            <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="Sun, sand, and sea — our best beach packages." />
                        </div>
                        <ImagePicker label="Cover Image" value={form.coverImage} onChange={url => setForm(p => ({ ...p, coverImage: url }))} />
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Display Order</Label>
                                <Input type="number" value={form.displayOrder} onChange={e => setForm(p => ({ ...p, displayOrder: Number(e.target.value) }))} min={0} />
                            </div>
                            <div className="flex items-center justify-between rounded-xl border p-3 mt-5">
                                <Label>Active</Label>
                                <Switch checked={form.isActive} onCheckedChange={v => setForm(p => ({ ...p, isActive: v }))} />
                            </div>
                        </div>

                        {/* Tour assignment */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Tours in this collection</Label>
                                <span className="text-xs text-muted-foreground">{form.selectedTours.length} selected</span>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    placeholder="Search tours…"
                                    className="pl-8 h-8 text-sm"
                                    value={tourSearch}
                                    onChange={e => setTourSearch(e.target.value)}
                                />
                            </div>
                            <div className="h-44 overflow-y-auto rounded-md border">
                                <div className="p-2 space-y-1">
                                    {filteredTours.length === 0 ? (
                                        <p className="text-center text-xs text-muted-foreground py-6">No tours found</p>
                                    ) : filteredTours.map(tour => (
                                        <label
                                            key={tour._id}
                                            className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50 cursor-pointer"
                                        >
                                            <Checkbox
                                                checked={form.selectedTours.includes(tour._id)}
                                                onChange={e => {
                                                    const checked = e.target.checked;
                                                    setForm(p => ({
                                                        ...p,
                                                        selectedTours: checked
                                                            ? [...p.selectedTours, tour._id]
                                                            : p.selectedTours.filter(id => id !== tour._id),
                                                    }));
                                                }}
                                            />
                                            {tour.imageURL && (
                                                <img src={tour.imageURL} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                                            )}
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate">{tour.title}</p>
                                                <p className="text-xs text-muted-foreground truncate">{tour.location}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={isSubmitting} className="bg-brand-orange hover:bg-brand-orange/90">
                            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {editing ? 'Save Changes' : 'Create Collection'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={o => !o && setDeleteTarget(null)}
                title="Delete collection?"
                description={`"${deleteTarget?.name}" will be permanently removed.`}
                confirmLabel="Delete"
                destructive
                loading={deleteCollection.isPending}
                onConfirm={handleDelete}
            />
        </div>
    );
};
