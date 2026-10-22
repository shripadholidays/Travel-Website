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
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { MoreHorizontal, Search, PenTool, Calendar } from "lucide-react";
import { useBlogPosts, useDeleteBlogPost } from "@/hooks/use-blog";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import type { BlogPost } from "@/types";

export const AdminBlog = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [deleteTarget, setDeleteTarget] = useState<BlogPost | null>(null);
    const { data, isLoading } = useBlogPosts();
    const deleteBlog = useDeleteBlogPost();

    const posts = (data?.posts ?? []).filter((post: BlogPost) =>
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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-display font-bold tracking-tight text-brand-blue">Blog & Articles</h2>
                    <p className="text-muted-foreground">Manage your travel blog posts and guides.</p>
                </div>
                <Link to="/admin/write-article">
                    <Button className="bg-brand-orange hover:bg-brand-orange/90 gap-2">
                        <PenTool className="w-4 h-4" /> Write New Article
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle>Recent Posts</CardTitle>
                        <div className="flex items-center gap-2">
                            <div className="relative w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input type="search" placeholder="Search articles..." className="pl-9 h-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center space-x-4">
                                    <Skeleton className="h-8 w-full" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[400px]">Title</TableHead>
                                    <TableHead>Author</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {posts.length > 0 ? posts.map((post: BlogPost) => {
                                    const authorName = typeof post.author === 'object' ? post.author.displayName : 'Unknown';
                                    return (
                                        <TableRow key={post._id}>
                                            <TableCell className="font-medium">
                                                <span className="line-clamp-1">{post.title}</span>
                                            </TableCell>
                                            <TableCell>{authorName}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(post.publishedAt || post.createdAt).toLocaleDateString()}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={post.status === "published" ? "success" : "secondary"}>
                                                    {post.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem asChild><Link to={`/write-article?edit=${post.slug}`}>Edit Article</Link></DropdownMenuItem>
                                                        <DropdownMenuItem asChild><Link to={`/blog/${post.slug}`}>Preview</Link></DropdownMenuItem>
                                                        <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setDeleteTarget(post)}>Delete</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    );
                                }) : (
                                    <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No articles found.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

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
