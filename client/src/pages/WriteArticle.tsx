import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, Loader2, ImageIcon, Calendar, Eye, Type, Tag as TagIcon, Lock, Star, ShoppingBag, Clock } from "lucide-react";
import { Image } from "@/components/ui/image";
import { Spinner } from "@/components/ui/spinner";
import { PageTitle } from "@/components/PageTitle";
import { toast } from "sonner";
import { useBlogPost, useCreateBlogPost, useUpdateBlogPost } from "@/hooks/use-blog";
import { useWriteEligibility } from "@/hooks/use-write-eligibility";
import { cn } from "@/lib/utils";

import { Container } from "@/components/ui/container";
import { hasPermission } from "@/lib/admin-access";

export const WriteArticle = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editSlug = searchParams.get("edit") || "";
    const isEdit = !!editSlug;

    const { data: existing, isLoading: loadingExisting } = useBlogPost(editSlug);
    const createPost = useCreateBlogPost();
    const updatePost = useUpdateBlogPost();
    const { data: eligibility, isLoading: eligibilityLoading } = useWriteEligibility();

    const [title, setTitle] = useState("");
    const [excerpt, setExcerpt] = useState("");
    const [content, setContent] = useState("");
    const [coverImage, setCoverImage] = useState("");
    const [tags, setTags] = useState("");

    useEffect(() => {
        const post = existing?.post;
        if (isEdit && post) {
            setTitle(post.title);
            setExcerpt(post.excerpt);
            setContent(post.content);
            setCoverImage(post.coverImage);
            setTags((post.tags ?? []).join(", "));
        }
    }, [existing, isEdit]);

    const isSubmitting = createPost.isPending || updatePost.isPending;
    const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
    const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    // Editors publish straight away; everyone else's articles go to an editor first
    const isEditor = hasPermission(user, "articles.review");
    const post = existing?.post;
    const editingOthers = isEdit && !!post && post.author?._id !== user?._id && !isEditor;

    const save = async (status: "draft" | "pending" | "published") => {
        if (!title.trim() || !content.trim() || !coverImage.trim()) {
            toast.error("Please fill in the title, cover image, and content.");
            return;
        }
        if (excerpt.trim().length < 20) {
            toast.error("Please write a short summary (at least 20 characters).");
            return;
        }

        const payload = {
            title: title.trim(),
            excerpt: excerpt.trim(),
            content: content.trim(),
            coverImage: coverImage.trim(),
            tags: tagList,
            status,
        };

        try {
            const res = isEdit && post
                ? await updatePost.mutateAsync({ id: post._id, data: payload })
                : await createPost.mutateAsync(payload);
            if (status === "published") {
                toast.success(isEdit ? "Article updated." : "Article published.");
                navigate(`/blog/${res.post.slug}`);
            } else if (status === "pending") {
                toast.success("Submitted for review. We'll email you as soon as it's published.");
                navigate("/dashboard?tab=articles");
            } else {
                toast.success("Draft saved. You can finish it from your dashboard.");
                navigate("/dashboard?tab=articles");
            }
        } catch (err) {
            toast.error((err as Error).message || "Failed to save article.");
        }
    };

    const handlePublish = (e: React.FormEvent) => {
        e.preventDefault();
        save(isEditor ? "published" : "pending");
    };

    if (eligibilityLoading) {
        return (
            <div className="min-h-screen bg-secondary/20 pt-24 flex items-center justify-center">
                <Spinner label="Checking eligibility…" />
            </div>
        );
    }

    // Show gate for non-eligible users (admins/moderators bypass)
    if (eligibility && !eligibility.eligible && eligibility.reason !== "privileged") {
        const { reviewCount = 0, completedBookings = 0, accountAgeDays = 0, requirements } = eligibility;
        const ageOk = accountAgeDays >= requirements.accountAgeDays;
        const engagementOk = (reviewCount ?? 0) >= requirements.reviews || (completedBookings ?? 0) >= 1;
        const reviewProgress = Math.min(100, ((reviewCount ?? 0) / requirements.reviews) * 100);
        const ageProgress = Math.min(100, (accountAgeDays / requirements.accountAgeDays) * 100);

        return (
            <div className="min-h-screen bg-secondary/20 pt-24 pb-16">
                <PageTitle title="Write Article" noIndex />
                <Container className="max-w-2xl">
                    <Link to="/blog" className="inline-flex items-center text-muted-foreground hover:text-brand-orange mb-6 text-sm transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Blog
                    </Link>
                    <div className="bg-white border border-slate-100 rounded-[2rem] p-8 md:p-12 shadow-sm text-center">
                        <div className="w-16 h-16 bg-brand-orange/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Lock className="w-8 h-8 text-brand-orange" />
                        </div>
                        <h1 className="text-3xl font-display font-bold text-brand-blue mb-3">Unlock Article Writing</h1>
                        <p className="text-muted-foreground mb-10 max-w-md mx-auto">
                            Contribute to the Wandeazy community by sharing your travel stories. Complete the requirements below to unlock the writer feature.
                        </p>

                        <div className="space-y-5 text-left max-w-sm mx-auto mb-10">
                            {/* Account age requirement */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm font-medium">
                                    <span className="flex items-center gap-2">
                                        <Clock className={cn("w-4 h-4", ageOk ? "text-green-500" : "text-brand-orange")} />
                                        Account age
                                    </span>
                                    <span className={cn("font-bold", ageOk ? "text-green-600" : "text-slate-600")}>
                                        {Math.floor(accountAgeDays)} / {requirements.accountAgeDays} days
                                    </span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                    <div
                                        className={cn("h-full rounded-full transition-all", ageOk ? "bg-green-500" : "bg-brand-orange")}
                                        style={{ width: `${ageProgress}%` }}
                                    />
                                </div>
                                {ageOk && <p className="text-xs text-green-600 font-medium">✓ Requirement met</p>}
                            </div>

                            {/* Engagement divider */}
                            <p className="text-xs text-center text-muted-foreground font-semibold uppercase tracking-wider">
                                + one of the following
                            </p>

                            {/* Reviews requirement */}
                            <div className={cn("space-y-2 p-4 rounded-2xl border-2 transition-colors", engagementOk && (reviewCount ?? 0) >= requirements.reviews ? "border-green-200 bg-green-50/50" : "border-slate-100")}>
                                <div className="flex items-center justify-between text-sm font-medium">
                                    <span className="flex items-center gap-2">
                                        <Star className={cn("w-4 h-4", (reviewCount ?? 0) >= requirements.reviews ? "text-green-500" : "text-brand-orange")} />
                                        Write reviews
                                    </span>
                                    <span className={cn("font-bold", (reviewCount ?? 0) >= requirements.reviews ? "text-green-600" : "text-slate-600")}>
                                        {reviewCount ?? 0} / {requirements.reviews}
                                    </span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                    <div
                                        className={cn("h-full rounded-full transition-all", (reviewCount ?? 0) >= requirements.reviews ? "bg-green-500" : "bg-brand-orange")}
                                        style={{ width: `${reviewProgress}%` }}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">Leave honest reviews on tours you've explored.</p>
                            </div>

                            {/* OR divider */}
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-px bg-slate-200" />
                                <span className="text-xs text-muted-foreground font-bold">OR</span>
                                <div className="flex-1 h-px bg-slate-200" />
                            </div>

                            {/* Booking requirement */}
                            <div className={cn("space-y-2 p-4 rounded-2xl border-2 transition-colors", (completedBookings ?? 0) >= 1 ? "border-green-200 bg-green-50/50" : "border-slate-100")}>
                                <div className="flex items-center justify-between text-sm font-medium">
                                    <span className="flex items-center gap-2">
                                        <ShoppingBag className={cn("w-4 h-4", (completedBookings ?? 0) >= 1 ? "text-green-500" : "text-brand-orange")} />
                                        Complete a booking
                                    </span>
                                    <span className={cn("font-bold", (completedBookings ?? 0) >= 1 ? "text-green-600" : "text-slate-600")}>
                                        {(completedBookings ?? 0) >= 1 ? "Done!" : "0 / 1"}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground">Book and complete any tour through Wandeazy.</p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Button variant="brand" className="rounded-xl px-8" asChild>
                                <Link to="/tours">Browse Tours</Link>
                            </Button>
                            <Button variant="outline" className="rounded-xl px-8" asChild>
                                <Link to="/dashboard">Go to Dashboard</Link>
                            </Button>
                        </div>
                    </div>
                </Container>
            </div>
        );
    }

    if (isEdit && loadingExisting) {
        return (
            <div className="min-h-screen bg-secondary/20 pt-24 flex items-center justify-center">
                <Spinner label="Loading article…" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-secondary/20 pt-24 pb-16">
            <PageTitle title={isEdit ? "Edit Article" : "Write Article"} noIndex />
            <Container className="max-w-6xl">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
                    <div>
                        <Link to="/blog" className="inline-flex items-center text-muted-foreground hover:text-brand-orange mb-3 text-sm transition-colors">
                            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Blog
                        </Link>
                        <h1 className="text-3xl md:text-4xl font-display font-bold text-brand-blue">
                            {isEdit ? "Edit Article" : "Write New Article"}
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            {isEditor
                                ? (isEdit ? "Update the article and publish your changes." : "Share your travel experiences with the world.")
                                : "Share your travel experiences. An editor reads every article before it goes live."}
                            {user && <> Writing as <span className="font-medium text-brand-blue">{user.displayName}</span>.</>}
                        </p>
                    </div>
                </div>

                {editingOthers && (
                    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                        This article belongs to another writer, so you can't edit it.
                    </div>
                )}
                {post?.status === "rejected" && post.reviewNote && (
                    <div className="mb-6 rounded-2xl border border-brand-orange/30 bg-brand-orange/5 p-5">
                        <p className="text-sm font-bold text-brand-orange mb-1">Notes from the editor</p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{post.reviewNote}</p>
                        <p className="text-xs text-muted-foreground mt-2">Make your changes and submit again.</p>
                    </div>
                )}
                {!isEditor && post?.status === "published" && (
                    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-muted-foreground">
                        This article is live. Your changes will be checked by an editor before they replace it.
                    </div>
                )}

                <form onSubmit={handlePublish} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {/* Editor */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white border border-slate-100 rounded-[1.75rem] p-6 md:p-8 shadow-sm space-y-6">
                            <div className="space-y-1.5">
                                <Label htmlFor="title" className="flex items-center gap-2"><Type className="w-4 h-4 text-brand-orange" /> Article Title</Label>
                                <Input
                                    id="title"
                                    placeholder="e.g., The Ultimate Guide to Tokyo"
                                    className="text-lg font-bold h-14 rounded-xl"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="coverImage" className="flex items-center gap-2"><ImageIcon className="w-4 h-4 text-brand-orange" /> Cover Image URL</Label>
                                <Input
                                    id="coverImage"
                                    type="url"
                                    placeholder="https://images.unsplash.com/..."
                                    className="h-11 rounded-xl"
                                    value={coverImage}
                                    onChange={(e) => setCoverImage(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="excerpt">Short Description <span className="text-muted-foreground font-normal">(excerpt)</span></Label>
                                <Textarea
                                    id="excerpt"
                                    rows={2}
                                    className="rounded-xl resize-none"
                                    placeholder="A brief summary that appears in article previews…"
                                    value={excerpt}
                                    onChange={(e) => setExcerpt(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="tags" className="flex items-center gap-2"><TagIcon className="w-4 h-4 text-brand-orange" /> Tags <span className="text-muted-foreground font-normal">(comma separated)</span></Label>
                                <Input
                                    id="tags"
                                    placeholder="Travel, Food, Adventure"
                                    className="h-11 rounded-xl"
                                    value={tags}
                                    onChange={(e) => setTags(e.target.value)}
                                />
                                {tagList.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {tagList.map((t) => (
                                            <span key={t} className="text-xs font-medium bg-brand-light text-brand-blue px-2.5 py-1 rounded-full">{t}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Content editor */}
                        <div className="bg-white border border-slate-100 rounded-[1.75rem] p-6 md:p-8 shadow-sm space-y-3">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="content">Content</Label>
                                <span className="text-xs text-muted-foreground">{wordCount} words · {readingTime} min read</span>
                            </div>
                            <Textarea
                                id="content"
                                className="min-h-[420px] font-serif leading-relaxed text-lg rounded-xl"
                                placeholder="Start writing your story here…"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                required
                            />
                            <p className="text-xs text-muted-foreground">Markdown works: <code>## Heading</code>, <code>**bold**</code>, <code>*italic*</code>, <code>- list item</code>, <code>[link](https://…)</code>. Leave a blank line between paragraphs.</p>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3">
                            <Button type="button" variant="ghost" className="rounded-full px-6" onClick={() => navigate(-1)}>Cancel</Button>
                            {!isEditor && post?.status !== "published" && (
                                <Button type="button" variant="outline" className="rounded-full px-6" disabled={isSubmitting} onClick={() => save("draft")}>
                                    Save draft
                                </Button>
                            )}
                            <Button type="submit" variant="brand" className="rounded-full px-8" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving…</>
                                ) : isEditor ? (
                                    isEdit ? "Save & Publish" : "Publish Article"
                                ) : (
                                    "Submit for Review"
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Live preview sidebar */}
                    <aside className="lg:sticky lg:top-28 space-y-4">
                        <div className="flex items-center gap-2 text-sm font-bold text-brand-blue px-1">
                            <Eye className="w-4 h-4 text-brand-orange" /> Live Preview
                        </div>
                        <div className="bg-white border border-slate-100 rounded-[1.75rem] overflow-hidden shadow-sm">
                            <div className="relative aspect-[16/10] bg-secondary/40">
                                {coverImage ? (
                                    <Image src={coverImage} alt="Cover preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                                        <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                                        <span className="text-xs">Cover image preview</span>
                                    </div>
                                )}
                                {tagList[0] && (
                                    <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-md text-brand-blue text-xs font-bold px-3 py-1 rounded-full">
                                        {tagList[0]}
                                    </span>
                                )}
                            </div>
                            <div className="p-5">
                                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Today</span>
                                    <span>·</span>
                                    <span>{readingTime} min read</span>
                                </div>
                                <h3 className="text-xl font-display font-bold leading-tight mb-2 line-clamp-2">
                                    {title || "Your article title appears here"}
                                </h3>
                                <p className="text-sm text-muted-foreground line-clamp-3">
                                    {excerpt || "Your short description will preview here to entice readers."}
                                </p>
                                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                                    {user?.profilePicture ? (
                                        <img src={user.profilePicture} alt={user.displayName} referrerPolicy="no-referrer" className="w-7 h-7 rounded-full object-cover" />
                                    ) : (
                                        <div className="w-7 h-7 rounded-full bg-brand-orange flex items-center justify-center text-white text-xs font-bold">
                                            {user?.displayName?.charAt(0)?.toUpperCase() ?? "?"}
                                        </div>
                                    )}
                                    <span className="text-sm font-medium">{user?.displayName ?? "You"}</span>
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground px-1">This is how your article card will appear in the Magazine.</p>
                    </aside>
                </form>
            </Container>
        </div>
    );
};
