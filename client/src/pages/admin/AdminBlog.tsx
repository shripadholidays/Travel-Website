import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MoreHorizontal, Search, PenTool, Calendar, Check, Undo2 } from "lucide-react";
import { useBlogPosts, useDeleteBlogPost, useUpdateBlogPost } from "@/hooks/use-blog";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { BlogPost } from "@/types";

type StatusFilter = "all" | BlogPost["status"];

const FILTERS: { id: StatusFilter; label: string }[] = [
    { id: "pending", label: "Waiting for review" },
    { id: "published", label: "Published" },
    { id: "rejected", label: "Sent back" },
    { id: "draft", label: "Drafts" },
    { id: "all", label: "All" },
];

const STATUS_LABEL: Record<BlogPost["status"], string> = {
    pending: "Waiting for review",
    published: "Published",
    rejected: "Sent back",
    draft: "Draft",
};

const STATUS_VARIANT: Record<BlogPost["status"], "success" | "secondary" | "warning" | "destructive"> = {
    published: "success",
    pending: "warning",
    rejected: "destructive",
    draft: "secondary",
};

export const AdminBlog = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [deleteTarget, setDeleteTarget] = useState<BlogPost | null>(null);
    const [rejectTarget, setRejectTarget] = useState<BlogPost | null>(null);
    const [rejectNote, setRejectNote] = useState("");
    const { data, isLoading } = useBlogPosts({ limit: 200 });
    const allPosts = data?.posts ?? [];
    const pendingCount = allPosts.filter((p) => p.status === "pending").length;
    // Open on the review queue when something is waiting
    const [filter, setFilter] = useState<StatusFilter | null>(null);
    const activeFilter: StatusFilter = filter ?? (pendingCount > 0 ? "pending" : "all");
    const deleteBlog = useDeleteBlogPost();
    const updatePost = useUpdateBlogPost();

    const posts = allPosts.filter((post) =>
        (activeFilter === "all" || post.status === activeFilter) &&
        post.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleDelete = async () => {
        if (!deleteTarget) return;
        const toastId = toast.loading("Deleting article...");
        try {
            await deleteBlog.mutateAsync(deleteTarget._id);
            toast.success("Article deleted successfully", { id: toastId });
            setDeleteTarget(null);
        } catch {
            toast.error("Failed to delete article", { id: toastId });
        }
    };

    const setStatus = async (post: BlogPost, status: BlogPost["status"], reviewNote?: string) => {
        const toastId = toast.loading(status === "published" ? "Publishing…" : "Saving…");
        try {
            await updatePost.mutateAsync({ id: post._id, data: { status, ...(reviewNote !== undefined && { reviewNote }) } });
            toast.success(
                status === "published" ? `"${post.title}" is live. The writer has been emailed.`
                    : status === "rejected" ? "Sent back to the writer with your notes."
                        : "Article updated.",
                { id: toastId },
            );
            return true;
        } catch (err) {
            toast.error((err as Error).message || "Failed to update article", { id: toastId });
            return false;
        }
    };

    const submitReject = async () => {
        if (!rejectTarget) return;
        if (rejectNote.trim().length < 5) {
            toast.error("Tell the writer what to change.");
            return;
        }
        if (await setStatus(rejectTarget, "rejected", rejectNote.trim())) {
            setRejectTarget(null);
            setRejectNote("");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-display font-bold tracking-tight text-brand-blue">Blog & Articles</h2>
                    <p className="text-muted-foreground">Review articles from travellers and manage your own.</p>
                </div>
                <Button asChild className="bg-brand-orange hover:bg-brand-orange/90 gap-2">
                    <Link to="/admin/write-article"><PenTool className="w-4 h-4" /> Write New Article</Link>
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-3 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <CardTitle>Articles</CardTitle>
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input type="search" aria-label="Search articles" placeholder="Search articles..." className="pl-9 h-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
                        {FILTERS.map((f) => {
                            const count = f.id === "all" ? allPosts.length : allPosts.filter((p) => p.status === f.id).length;
                            return (
                                <button
                                    key={f.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={activeFilter === f.id}
                                    onClick={() => setFilter(f.id)}
                                    className={cn(
                                        "inline-flex items-center gap-2 h-8 px-3 rounded-full text-sm font-medium border transition-colors",
                                        activeFilter === f.id ? "bg-brand-blue text-white border-brand-blue" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300",
                                    )}
                                >
                                    {f.label}
                                    <span className={cn(
                                        "text-xs rounded-full px-1.5 min-w-5",
                                        f.id === "pending" && count > 0 ? "bg-brand-orange text-white" : activeFilter === f.id ? "bg-white/20" : "bg-slate-100",
                                    )}>{count}</span>
                                </button>
                            );
                        })}
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[380px]">Title</TableHead>
                                    <TableHead>Author</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {posts.length > 0 ? posts.map((post) => {
                                    const authorName = typeof post.author === 'object' ? post.author.displayName : 'Unknown';
                                    return (
                                        <TableRow key={post._id}>
                                            <TableCell className="font-medium">
                                                <Link to={`/blog/${post.slug}`} className="line-clamp-1 hover:text-brand-orange">{post.title}</Link>
                                                {post.status === "rejected" && post.reviewNote && (
                                                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">Note: {post.reviewNote}</p>
                                                )}
                                            </TableCell>
                                            <TableCell>{authorName}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(post.publishedAt || post.updatedAt || post.createdAt).toLocaleDateString()}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={STATUS_VARIANT[post.status]}>{STATUS_LABEL[post.status]}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {post.status === "pending" && (
                                                        <>
                                                            <Button size="sm" variant="outline" className="h-8 gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50" onClick={() => setStatus(post, "published")}>
                                                                <Check className="w-3.5 h-3.5" /> Publish
                                                            </Button>
                                                            <Button size="sm" variant="ghost" className="h-8 gap-1" onClick={() => { setRejectTarget(post); setRejectNote(""); }}>
                                                                <Undo2 className="w-3.5 h-3.5" /> Send back
                                                            </Button>
                                                        </>
                                                    )}
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${post.title}`}><MoreHorizontal className="w-4 h-4" /></Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem asChild><Link to={`/blog/${post.slug}`}>Read</Link></DropdownMenuItem>
                                                            <DropdownMenuItem asChild><Link to={`/admin/write-article?edit=${post.slug}`}>Edit</Link></DropdownMenuItem>
                                                            {post.status === "published" && (
                                                                <DropdownMenuItem onClick={() => setStatus(post, "draft")}>Unpublish</DropdownMenuItem>
                                                            )}
                                                            {post.status !== "published" && post.status !== "pending" && (
                                                                <DropdownMenuItem onClick={() => setStatus(post, "published")}>Publish</DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setDeleteTarget(post)}>Delete</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                }) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                            {activeFilter === "pending" ? "Nothing waiting for review." : "No articles found."}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Send back for changes</DialogTitle>
                        <DialogDescription>
                            The writer gets your notes by email and in their dashboard, and can resubmit "{rejectTarget?.title}".
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-1.5">
                        <Label htmlFor="reject-note">What should change?</Label>
                        <Textarea
                            id="reject-note"
                            rows={5}
                            value={rejectNote}
                            onChange={(e) => setRejectNote(e.target.value)}
                            placeholder="e.g. Please add a photo you took yourself and a few practical tips on getting around."
                            maxLength={1000}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setRejectTarget(null)}>Cancel</Button>
                        <Button variant="brand" onClick={submitReject} disabled={updatePost.isPending}>Send to writer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(o) => !o && setDeleteTarget(null)}
                title="Delete article?"
                description={`"${deleteTarget?.title}" will be permanently removed. This cannot be undone.`}
                confirmLabel="Delete"
                destructive
                loading={deleteBlog.isPending}
                onConfirm={handleDelete}
            />
        </div>
    );
};
