import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { MoreHorizontal, Search, MapPin, Plus, Loader2 } from "lucide-react";
import { ImagePicker } from "@/components/ui/ImagePicker";
import {
    useDestinations, useCreateDestination, useUpdateDestination, useDeleteDestination,
} from "@/hooks/use-destinations";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import type { Destination } from "@/types";

const CONTINENTS = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania', 'Antarctica'];

const slugify = (s: string) =>
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export const AdminDestinations = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Destination | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Destination | null>(null);
    const [continent, setContinent] = useState<string>('Asia');
    const [coverImage, setCoverImage] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [lat, setLat] = useState('');
    const [lng, setLng] = useState('');

    const { data, isLoading } = useDestinations();
    const createDestination = useCreateDestination();
    const updateDestination = useUpdateDestination();
    const deleteDestination = useDeleteDestination();

    const destinations = (data?.destinations ?? []).filter((dest: Destination) =>
        dest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dest.country.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const openCreate = () => {
        setEditing(null);
        setContinent('Asia');
        setCoverImage('');
        setIsActive(true);
        setLat('');
        setLng('');
        setDialogOpen(true);
    };

    const openEdit = (dest: Destination) => {
        setEditing(dest);
        setContinent(dest.continent || 'Asia');
        setCoverImage(dest.coverImage || '');
        setIsActive(dest.isActive !== false);
        setLat(dest.coordinates?.lat != null ? String(dest.coordinates.lat) : '');
        setLng(dest.coordinates?.lng != null ? String(dest.coordinates.lng) : '');
        setDialogOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = new FormData(e.target as HTMLFormElement);
        const name = (form.get("name") as string).trim();
        const country = (form.get("country") as string).trim();
        const description = (form.get("description") as string).trim();

        const payload: Partial<Destination> = {
            name,
            slug: editing?.slug || slugify(name),
            country,
            continent: continent as Destination['continent'],
            description,
            coverImage,
            isActive,
            coordinates: {
                lat: lat ? parseFloat(lat) : 0,
                lng: lng ? parseFloat(lng) : 0,
            },
        };

        const toastId = toast.loading(editing ? "Updating destination..." : "Creating destination...");
        try {
            if (editing) {
                await updateDestination.mutateAsync({ id: editing._id, data: payload });
                toast.success("Destination updated", { id: toastId });
            } else {
                await createDestination.mutateAsync(payload);
                toast.success("Destination created", { id: toastId });
            }
            setDialogOpen(false);
            setEditing(null);
        } catch (err) {
            toast.error((err as Error).message || "Failed to save destination", { id: toastId });
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        const toastId = toast.loading("Deleting destination...");
        try {
            await deleteDestination.mutateAsync(deleteTarget._id);
            toast.success("Destination deleted", { id: toastId });
            setDeleteTarget(null);
        } catch (err) {
            toast.error((err as Error).message || "Failed to delete", { id: toastId });
        }
    };

    const isSubmitting = createDestination.isPending || updateDestination.isPending;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-display font-bold tracking-tight text-brand-blue">Destinations</h2>
                    <p className="text-muted-foreground">Manage travel locations and regions.</p>
                </div>
                <Button className="bg-brand-orange hover:bg-brand-orange/90 gap-2" onClick={openCreate}>
                    <Plus className="w-4 h-4" /> Add Destination
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle>All Destinations</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input type="search" placeholder="Search destinations..." className="pl-9 h-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center space-x-4">
                                    <Skeleton className="h-12 w-12 rounded-md" />
                                    <div className="space-y-2"><Skeleton className="h-4 w-[200px]" /><Skeleton className="h-4 w-[150px]" /></div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Destination</TableHead>
                                    <TableHead>Region</TableHead>
                                    <TableHead>Active Tours</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {destinations.length > 0 ? destinations.map((dest: Destination) => (
                                    <TableRow key={dest._id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-3">
                                                <div className="relative w-12 h-12 rounded-md overflow-hidden bg-secondary">
                                                    <img src={dest.coverImage} alt={dest.name} className="object-cover w-full h-full" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold">{dest.name}</span>
                                                    <span className="text-xs text-muted-foreground">{dest.country}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                                {dest.continent}
                                            </div>
                                        </TableCell>
                                        <TableCell>{dest.tourCount} Tours</TableCell>
                                        <TableCell>
                                            <Badge variant={dest.isActive ? 'default' : 'secondary'}>
                                                {dest.isActive ? 'active' : 'inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => openEdit(dest)}>Edit Details</DropdownMenuItem>
                                                    <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setDeleteTarget(dest)}>Delete</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No destinations found.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Create / Edit dialog */}
            <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Destination' : 'Add Destination'}</DialogTitle>
                        <DialogDescription>
                            {editing ? 'Update this destination\'s details.' : 'Create a new travel destination.'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" name="name" defaultValue={editing?.name} required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="country">Country</Label>
                                <Input id="country" name="country" defaultValue={editing?.country} required />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="continent">Continent</Label>
                                <Select value={continent} onValueChange={setContinent}>
                                    <SelectTrigger id="continent"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {CONTINENTS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <ImagePicker label="Cover Image" value={coverImage} onChange={setCoverImage} />
                        <div className="space-y-1.5">
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" name="description" rows={3} defaultValue={editing?.description} required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Latitude</Label>
                                <Input value={lat} onChange={e => setLat(e.target.value)} placeholder="51.5074" />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Longitude</Label>
                                <Input value={lng} onChange={e => setLng(e.target.value)} placeholder="-0.1278" />
                            </div>
                        </div>
                        <div className="flex items-center justify-between rounded-xl border p-3">
                            <Label>Active (visible on site)</Label>
                            <Switch checked={isActive} onCheckedChange={setIsActive} />
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {editing ? 'Save changes' : 'Create destination'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(o) => !o && setDeleteTarget(null)}
                title="Delete destination?"
                description={`"${deleteTarget?.name}" will be permanently removed. This cannot be undone.`}
                confirmLabel="Delete"
                destructive
                loading={deleteDestination.isPending}
                onConfirm={handleDelete}
            />
        </div>
    );
};
