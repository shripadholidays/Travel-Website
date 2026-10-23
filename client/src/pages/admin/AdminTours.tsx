import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
    Plus, MoreHorizontal, Star, Upload, Map, Eye, Copy, Pencil, Trash2, EyeOff, FilePen, Rocket, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { TourImportDialog } from "@/components/admin/TourImportDialog";
import { EmptyState, PageHeader, SearchField, StatusPill, StatusTabs, TableFooter, timeAgo } from "@/components/admin/AdminUI";
import {
    useAdminTours, useDeleteTour, useDuplicateTour, useBulkTourAction, useUpdateTour, type BulkTourAction,
} from "@/hooks/use-tours";
import { useDebounced } from "@/hooks/use-debounced";
import { TOUR_STATUS, usd, type TourStatus } from "@/lib/tour-status";
import type { Tour } from "@/types";

const SORTS = [
    { id: "updated", label: "Recently edited" },
    { id: "newest", label: "Newest first" },
    { id: "title", label: "Title A–Z" },
    { id: "price_low", label: "Price: low to high" },
    { id: "price_high", label: "Price: high to low" },
    { id: "rating", label: "Highest rated" },
];

const BULK_LABELS: Record<BulkTourAction, string> = {
    active: "Published",
    draft: "Moved to drafts",
    inactive: "Hidden",
    feature: "Featured",
    unfeature: "Removed from featured",
    delete: "Deleted",
};

export const AdminTours = () => {
    const navigate = useNavigate();
    // Filters live in the URL, so a refresh or the back button keeps your place
    const [params, setParams] = useSearchParams();
    const status = (params.get("status") as TourStatus | "all" | null) ?? "all";
    const sort = params.get("sort") ?? "updated";
    const page = Number(params.get("page") || 1);
    const [search, setSearch] = useState(params.get("q") ?? "");
    const debouncedSearch = useDebounced(search, 300);

    const setParam = (key: string, value: string | null) => {
        const next = new URLSearchParams(params);
        if (value && value !== "all" && !(key === "sort" && value === "updated") && !(key === "page" && value === "1")) next.set(key, value);
        else next.delete(key);
        if (key !== "page") next.delete("page");
        setParams(next, { replace: true });
    };

    const { data, isLoading, isFetching } = useAdminTours({ search: debouncedSearch, status, sort, page, limit: 20 });
    const tours = data?.tours ?? [];
    const counts = data?.statusCounts ?? {};
    const total = (counts.active ?? 0) + (counts.draft ?? 0) + (counts.inactive ?? 0);

    const [selected, setSelected] = useState<string[]>([]);
    const [deleteTarget, setDeleteTarget] = useState<Tour | null>(null);
    const [bulkDelete, setBulkDelete] = useState(false);
    const [importOpen, setImportOpen] = useState(false);

    const deleteTour = useDeleteTour();
    const duplicateTour = useDuplicateTour();
    const bulk = useBulkTourAction();
    const updateTour = useUpdateTour();

    const pageIds = tours.map((t) => t._id);
    const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
    const toggleAll = () => setSelected(allOnPage ? selected.filter((id) => !pageIds.includes(id)) : [...new Set([...selected, ...pageIds])]);
    const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

    const runBulk = async (action: BulkTourAction) => {
        const toastId = toast.loading("Updating tours…");
        try {
            const res = await bulk.mutateAsync({ ids: selected, action });
            const done = `${BULK_LABELS[action]}: ${res.affected} tour${res.affected === 1 ? "" : "s"}.`;
            if (res.incomplete?.length) {
                // Publishing skips tours that are missing what a live listing needs
                toast.warning(`${done} ${res.incomplete.length} still need details before they can go live: ${res.incomplete.map((t) => t.title).join(", ")}.`, { id: toastId, duration: 10000 });
            } else if (res.skipped) {
                toast.warning(`${done} ${res.skipped} with bookings were kept. Hide them instead.`, { id: toastId, duration: 8000 });
            } else {
                toast.success(done, { id: toastId });
            }
            setSelected([]);
            setBulkDelete(false);
        } catch (err) {
            toast.error((err as Error).message || "Bulk action failed", { id: toastId });
        }
    };

    const setStatus = async (tour: Tour, next: TourStatus) => {
        const toastId = toast.loading("Saving…");
        try {
            await updateTour.mutateAsync({ id: tour._id, data: { status: next } });
            toast.success(`"${tour.title}" is now ${TOUR_STATUS[next].label.toLowerCase()}.`, { id: toastId });
        } catch (err) {
            toast.error((err as Error).message || "Could not change the status", { id: toastId });
        }
    };

    const toggleFeatured = async (tour: Tour) => {
        try {
            await updateTour.mutateAsync({ id: tour._id, data: { isFeatured: !tour.isFeatured } });
            toast.success(tour.isFeatured ? "Removed from the homepage's featured tours." : "Featured on the homepage.");
        } catch (err) {
            toast.error((err as Error).message || "Could not update the tour");
        }
    };

    const duplicate = async (tour: Tour) => {
        const toastId = toast.loading("Making a copy…");
        try {
            const res = await duplicateTour.mutateAsync(tour._id);
            toast.success("Draft copy created. Edit it before publishing.", { id: toastId });
            navigate(`/admin/tours/${res.tour._id}/edit`);
        } catch (err) {
            toast.error((err as Error).message || "Could not duplicate the tour", { id: toastId });
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        const toastId = toast.loading("Deleting tour…");
        try {
            await deleteTour.mutateAsync(deleteTarget._id);
            toast.success("Tour deleted", { id: toastId });
            setSelected((s) => s.filter((id) => id !== deleteTarget._id));
            setDeleteTarget(null);
        } catch (err) {
            // e.g. "has 3 bookings, so it can't be deleted. Set its status to Hidden…"
            toast.error((err as Error).message || "Failed to delete tour", { id: toastId, duration: 8000 });
            setDeleteTarget(null);
        }
    };

    const filtering = !!debouncedSearch || status !== "all";

    return (
        <div className="space-y-6">
            <PageHeader
                title="Tours"
                description="Every travel package on the site. Drafts and hidden tours are only visible to staff."
                actions={<>
                    <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
                        <Upload className="w-4 h-4" /> Import
                    </Button>
                    <Button asChild className="bg-brand-orange hover:bg-brand-orange/90 gap-2">
                        <Link to="/admin/tours/new"><Plus className="w-4 h-4" /> Add tour</Link>
                    </Button>
                </>}
            />

            <Card>
                <CardHeader className="pb-3 space-y-4">
                    <StatusTabs
                        value={status}
                        onChange={(v) => { setParam("status", v); setSelected([]); }}
                        options={[
                            { id: "all", label: "All", count: total },
                            { id: "active", label: "Live", count: counts.active ?? 0 },
                            { id: "draft", label: "Drafts", count: counts.draft ?? 0, tone: "orange" },
                            { id: "inactive", label: "Hidden", count: counts.inactive ?? 0 },
                        ]}
                    />
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <SearchField
                            value={search}
                            onChange={(v) => { setSearch(v); setParam("q", v); }}
                            placeholder="Search title, place or style…"
                            className="sm:w-80"
                        />
                        <Select value={sort} onValueChange={(v) => setParam("sort", v)}>
                            <SelectTrigger className="h-9 sm:w-52" aria-label="Sort tours"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {SORTS.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        {isFetching && !isLoading && <span className="text-xs text-muted-foreground">Updating…</span>}
                    </div>

                    {selected.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-brand-blue/15 bg-brand-blue/[0.04] px-3 py-2" role="region" aria-label="Bulk actions">
                            <span className="text-sm font-semibold text-brand-blue mr-1">{selected.length} selected</span>
                            <Button size="sm" variant="outline" className="h-8 gap-1.5" disabled={bulk.isPending} onClick={() => runBulk("active")}><Rocket className="w-3.5 h-3.5" /> Publish</Button>
                            <Button size="sm" variant="outline" className="h-8 gap-1.5" disabled={bulk.isPending} onClick={() => runBulk("draft")}><FilePen className="w-3.5 h-3.5" /> Move to drafts</Button>
                            <Button size="sm" variant="outline" className="h-8 gap-1.5" disabled={bulk.isPending} onClick={() => runBulk("inactive")}><EyeOff className="w-3.5 h-3.5" /> Hide</Button>
                            <Button size="sm" variant="outline" className="h-8 gap-1.5" disabled={bulk.isPending} onClick={() => runBulk("feature")}><Star className="w-3.5 h-3.5" /> Feature</Button>
                            <Button size="sm" variant="outline" className="h-8" disabled={bulk.isPending} onClick={() => runBulk("unfeature")}>Unfeature</Button>
                            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50" disabled={bulk.isPending} onClick={() => setBulkDelete(true)}><Trash2 className="w-3.5 h-3.5" /> Delete</Button>
                            <Button size="sm" variant="ghost" className="h-8 gap-1 ml-auto" onClick={() => setSelected([])}><X className="w-3.5 h-3.5" /> Clear</Button>
                        </div>
                    )}
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <Skeleton className="h-12 w-12 rounded-md" />
                                    <div className="space-y-2 flex-1"><Skeleton className="h-4 w-2/5" /><Skeleton className="h-3 w-1/4" /></div>
                                </div>
                            ))}
                        </div>
                    ) : tours.length === 0 ? (
                        filtering ? (
                            <EmptyState icon={Map} title="No tours match" description="Try another search or status." action={
                                <Button variant="outline" onClick={() => { setSearch(""); setParams(new URLSearchParams(), { replace: true }); }}>Clear filters</Button>
                            } />
                        ) : (
                            <EmptyState icon={Map} title="No tours yet" description="Add your first package, or import a list from a spreadsheet." action={
                                <Button asChild className="bg-brand-orange hover:bg-brand-orange/90 gap-2"><Link to="/admin/tours/new"><Plus className="w-4 h-4" /> Add tour</Link></Button>
                            } />
                        )
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-10">
                                            <Checkbox checked={allOnPage} onChange={toggleAll} aria-label="Select all tours on this page" />
                                        </TableHead>
                                        <TableHead>Tour</TableHead>
                                        <TableHead className="hidden md:table-cell">Price / person</TableHead>
                                        <TableHead className="hidden lg:table-cell">Duration</TableHead>
                                        <TableHead className="hidden xl:table-cell">Rating</TableHead>
                                        <TableHead className="hidden sm:table-cell">Status</TableHead>
                                        <TableHead className="hidden lg:table-cell">Last edited</TableHead>
                                        <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tours.map((tour) => {
                                        const st = TOUR_STATUS[tour.status ?? "active"];
                                        const editor = typeof tour.updatedBy === "object" ? tour.updatedBy.displayName : null;
                                        return (
                                            <TableRow key={tour._id} data-state={selected.includes(tour._id) ? "selected" : undefined}>
                                                <TableCell>
                                                    <Checkbox checked={selected.includes(tour._id)} onChange={() => toggle(tour._id)} aria-label={`Select ${tour.title}`} />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        {tour.imageURL || tour.images?.[0] ? (
                                                            <img src={tour.imageURL || tour.images?.[0]} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0 bg-slate-100" />
                                                        ) : (
                                                            <div className="w-11 h-11 rounded-lg bg-slate-100 flex items-center justify-center shrink-0"><Map className="w-4 h-4 text-slate-400" /></div>
                                                        )}
                                                        <div className="min-w-0">
                                                            <Link to={`/admin/tours/${tour._id}/edit`} className="font-semibold text-slate-800 hover:text-brand-orange line-clamp-1">
                                                                {tour.title}
                                                            </Link>
                                                            <p className="text-xs text-muted-foreground truncate">
                                                                {tour.location}
                                                                <span className="md:hidden"> · {usd(tour.price)}</span>
                                                            </p>
                                                            <StatusPill tone={st.tone} className="sm:hidden mt-1 mr-1">{st.label}</StatusPill>
                                                            {tour.isFeatured && (
                                                                <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-amber-700">
                                                                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> Featured
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="hidden md:table-cell tabular-nums font-medium">{usd(tour.price)}</TableCell>
                                                <TableCell className="hidden lg:table-cell whitespace-nowrap text-muted-foreground">
                                                    {tour.duration.days} days · {tour.duration.nights} nights
                                                </TableCell>
                                                <TableCell className="hidden xl:table-cell">
                                                    {tour.reviews?.basedOn ? (
                                                        <span className="inline-flex items-center gap-1 tabular-nums">
                                                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                                            <span className="font-semibold">{tour.reviews.rating.toFixed(1)}</span>
                                                            <span className="text-xs text-muted-foreground">({tour.reviews.basedOn})</span>
                                                        </span>
                                                    ) : <span className="text-xs text-muted-foreground">No reviews</span>}
                                                </TableCell>
                                                <TableCell className="hidden sm:table-cell">
                                                    <StatusPill tone={st.tone}><span title={st.help}>{st.label}</span></StatusPill>
                                                </TableCell>
                                                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground whitespace-nowrap" title={new Date(tour.updatedAt).toLocaleString()}>
                                                    {timeAgo(tour.updatedAt)}
                                                    {editor && <span className="block text-xs">by {editor}</span>}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${tour.title}`}>
                                                                <MoreHorizontal className="w-4 h-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-52">
                                                            <DropdownMenuItem asChild>
                                                                <Link to={`/admin/tours/${tour._id}/edit`}><Pencil className="w-4 h-4 mr-2" /> Edit</Link>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem asChild>
                                                                <a href={`/tour/${tour._id}`} target="_blank" rel="noopener noreferrer">
                                                                    <Eye className="w-4 h-4 mr-2" /> {tour.status === "active" ? "View on site" : "Preview"}
                                                                </a>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => duplicate(tour)}><Copy className="w-4 h-4 mr-2" /> Duplicate as draft</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => toggleFeatured(tour)}>
                                                                <Star className="w-4 h-4 mr-2" /> {tour.isFeatured ? "Remove from featured" : "Feature on homepage"}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            {tour.status !== "active" && <DropdownMenuItem onClick={() => setStatus(tour, "active")}><Rocket className="w-4 h-4 mr-2" /> Publish</DropdownMenuItem>}
                                                            {tour.status !== "draft" && <DropdownMenuItem onClick={() => setStatus(tour, "draft")}><FilePen className="w-4 h-4 mr-2" /> Move to drafts</DropdownMenuItem>}
                                                            {tour.status !== "inactive" && <DropdownMenuItem onClick={() => setStatus(tour, "inactive")}><EyeOff className="w-4 h-4 mr-2" /> Hide from site</DropdownMenuItem>}
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setDeleteTarget(tour)}>
                                                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                            <TableFooter pagination={data?.pagination} onPageChange={(p) => setParam("page", String(p))} noun="tours" />
                        </>
                    )}
                </CardContent>
            </Card>

            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(o) => !o && setDeleteTarget(null)}
                title="Delete tour?"
                description={`"${deleteTarget?.title}" will be permanently removed and taken out of any collections. Tours with bookings can't be deleted; hide them instead.`}
                confirmLabel="Delete"
                destructive
                loading={deleteTour.isPending}
                onConfirm={handleDelete}
            />
            <ConfirmDialog
                open={bulkDelete}
                onOpenChange={setBulkDelete}
                title={`Delete ${selected.length} tour${selected.length === 1 ? "" : "s"}?`}
                description="They will be permanently removed. Any that have bookings are kept; hide those instead."
                confirmLabel="Delete"
                destructive
                loading={bulk.isPending}
                onConfirm={() => runBulk("delete")}
            />

            <TourImportDialog open={importOpen} onOpenChange={setImportOpen} />
        </div>
    );
};
