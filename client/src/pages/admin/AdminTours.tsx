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
import { Plus, MoreHorizontal, Search, Star, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { JsonCsvImporter } from "@/components/ui/JsonCsvImporter";
import { useTours, useDeleteTour, useBulkCreateTours } from "@/hooks/use-tours";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import type { Tour } from "@/types";

const STATUS_VARIANT: Record<string, 'success' | 'secondary' | 'outline'> = {
    active: 'success',
    draft: 'outline',
    inactive: 'secondary',
};

const TOUR_SCHEMA_HINT = `title (required), location (required), price (required, number), currency, duration.days (number), duration.nights (number), imageURL, categories (comma-separated), status (active|inactive|draft), isFeatured (true|false)`;

const TOUR_EXAMPLE_JSON = `[
  {
    "title": "Manali Snow Trek",
    "location": "Manali, India",
    "price": 12500,
    "currency": "₹",
    "duration": { "days": 5, "nights": 4 },
    "imageURL": "https://example.com/manali.jpg",
    "categories": ["Adventure", "Snow"],
    "status": "active",
    "isFeatured": true,
    "overview": { "about": "An amazing snow trek in Manali.", "gallery": [] },
    "validity": "2026-12-31"
  }
]`;

export const AdminTours = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [deleteTarget, setDeleteTarget] = useState<Tour | null>(null);
    const [importOpen, setImportOpen] = useState(false);

    const { data, isLoading } = useTours({ search: searchQuery });
    const tours = data?.tours ?? [];
    const deleteTour = useDeleteTour();
    const bulkCreate = useBulkCreateTours();

    const handleBulkImport = async (rows: Record<string, unknown>[]) => {
        const mapped: Partial<Tour>[] = rows.map(r => ({
            title: String(r.title ?? ''),
            location: String(r.location ?? ''),
            price: Number(r.price),
            currency: String(r.currency || '₹'),
            duration: {
                days: Number((r as Record<string, unknown>)['duration.days'] ?? (r.duration as Record<string,unknown>)?.days ?? 1),
                nights: Number((r as Record<string, unknown>)['duration.nights'] ?? (r.duration as Record<string,unknown>)?.nights ?? 0),
            },
            imageURL: String(r.imageURL || ''),
            categories: typeof r.categories === 'string' ? r.categories.split(',').map((s: string) => s.trim()) : (r.categories as string[]) || [],
            status: (r.status as Tour['status']) || 'active',
            isFeatured: r.isFeatured === true || r.isFeatured === 'true',
            overview: (r.overview as Tour['overview']) || { about: '', gallery: [] },
            validity: (r.validity ? new Date(r.validity as string) : new Date(Date.now() + 365 * 86400000)).toISOString(),
        }));
        const toastId = toast.loading(`Importing ${mapped.length} tour(s)…`);
        try {
            const res = await bulkCreate.mutateAsync(mapped);
            toast.success(`Imported ${(res as {tours: Tour[]}).tours?.length ?? mapped.length} tours`, { id: toastId });
            setImportOpen(false);
        } catch (err) {
            toast.error((err as Error).message || 'Bulk import failed', { id: toastId });
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        const toastId = toast.loading("Deleting tour...");
        try {
            await deleteTour.mutateAsync(deleteTarget._id);
            toast.success("Tour deleted", { id: toastId });
            setDeleteTarget(null);
        } catch {
            toast.error("Failed to delete tour", { id: toastId });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-display font-bold tracking-tight text-brand-blue">Tours</h2>
                    <p className="text-muted-foreground">Manage your travel packages and itineraries.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
                        <Upload className="w-4 h-4" /> Import
                    </Button>
                    <Button asChild className="bg-brand-orange hover:bg-brand-orange/90 gap-2">
                        <Link to="/admin/tours/new">
                            <Plus className="w-4 h-4" /> Add New Tour
                        </Link>
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle>All Tours</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search" placeholder="Search tours..."
                                className="pl-9 h-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center space-x-4">
                                    <Skeleton className="h-12 w-12 rounded-md" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-[250px]" />
                                        <Skeleton className="h-4 w-[200px]" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tour Name</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead>Price</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead>Rating</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tours.length > 0 ? tours.map((tour: Tour) => (
                                    <TableRow key={tour._id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={tour.imageURL || tour.images?.[0]}
                                                    alt={tour.title}
                                                    className="w-10 h-10 rounded-md object-cover shrink-0"
                                                />
                                                <div className="min-w-0">
                                                    <span className="truncate max-w-[180px] block">{tour.title}</span>
                                                    {tour.isFeatured && (
                                                        <span className="text-[10px] text-yellow-600 flex items-center gap-0.5">
                                                            <Star className="w-2.5 h-2.5 fill-yellow-500 text-yellow-500" /> Featured
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{tour.location}</TableCell>
                                        <TableCell>{tour.currency || '$'}{tour.price}</TableCell>
                                        <TableCell>{tour.duration.days}D/{tour.duration.nights}N</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <span className="font-bold">{tour.reviews?.rating ?? 0}</span>
                                                <span className="text-muted-foreground text-xs">({tour.reviews?.basedOn ?? 0})</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={STATUS_VARIANT[tour.status ?? 'active'] ?? 'success'}>
                                                {tour.status ?? 'active'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                        <span className="sr-only">Open menu</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem asChild>
                                                        <Link to={`/admin/tours/${tour._id}/edit`}>Edit Tour</Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <Link to={`/tour/${tour._id}`} target="_blank" rel="noopener noreferrer">View Live</Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-red-600 focus:text-red-600"
                                                        onClick={() => setDeleteTarget(tour)}
                                                    >
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                            No tours found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(o) => !o && setDeleteTarget(null)}
                title="Delete tour?"
                description={`"${deleteTarget?.title}" will be permanently removed. This cannot be undone.`}
                confirmLabel="Delete"
                destructive
                loading={deleteTour.isPending}
                onConfirm={handleDelete}
            />

            <JsonCsvImporter
                open={importOpen}
                onOpenChange={setImportOpen}
                title="Import Tours"
                schemaHint={TOUR_SCHEMA_HINT}
                exampleJson={TOUR_EXAMPLE_JSON}
                onImport={handleBulkImport}
            />
        </div>
    );
};
