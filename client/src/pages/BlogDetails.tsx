import { useParams, Link } from "react-router-dom";
import { useBlogPost, useBlogPosts } from "@/hooks/use-blog";
import { Image } from "@/components/ui/image";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { PageTitle } from "@/components/PageTitle";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Calendar, Clock, Share2, Facebook, Twitter, Linkedin, Link2 } from "lucide-react";
import { format } from "date-fns";

export const BlogDetails = () => {
    const { slug } = useParams();
    const { data, isLoading } = useBlogPost(slug!);
    const { data: allPosts } = useBlogPosts();
    const blog = data?.post;

    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    const shareText = blog?.title ?? "";

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            toast.success("Link copied to clipboard!");
        } catch {
            toast.error("Couldn't copy link.");
        }
    };

    if (isLoading) {
        return (
            <div className="bg-background min-h-screen flex items-center justify-center">
                <Spinner label="Loading article…" />
            </div>
        );
    }

    if (!blog) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
                <PageTitle title="Article Not Found" noIndex />
                <h2 className="text-3xl font-display font-bold mb-4">Article not found</h2>
                <p className="text-muted-foreground mb-8">This article may have been moved or removed.</p>
                <Button variant="brand" asChild><Link to="/blog">Back to Magazine</Link></Button>
            </div>
        );
    }

    const author = typeof blog.author === "object" ? blog.author : null;
    const authorName = author?.displayName ?? "Wandeazy";
    const dateStr = format(new Date(blog.publishedAt || blog.createdAt), "MMMM dd, yyyy");
    const wordCount = blog.content ? blog.content.replace(/<[^>]+>/g, " ").trim().split(/\s+/).length : 0;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    const twUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
    const liUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;

    const related = (allPosts?.posts ?? []).filter((p) => p.slug !== blog.slug).slice(0, 3);

    // Render content as HTML when it contains tags, otherwise preserve paragraph breaks for plain/markdown text.
    const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(blog.content || "");

    return (
        <div className="bg-background min-h-screen pb-24">
            <PageTitle
                title={blog.title}
                description={blog.excerpt}
                image={blog.coverImage}
                type="article"
                jsonLd={{
                    '@context': 'https://schema.org',
                    '@type': 'Article',
                    headline: blog.title,
                    description: blog.excerpt,
                    image: blog.coverImage,
                    datePublished: blog.publishedAt || blog.createdAt,
                    author: { '@type': 'Person', name: authorName },
                    publisher: {
                        '@type': 'Organization',
                        name: 'Wandeazy',
                        logo: { '@type': 'ImageObject', url: 'https://wandeazy.com/favicon.svg' },
                    },
                }}
            />

            {/* Immersive hero */}
            <div className="relative h-[60vh] min-h-[440px] w-full overflow-hidden">
                <Image src={blog.coverImage} alt={blog.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/40" />

                <div className="absolute inset-0 flex flex-col">
                    <div className="container mx-auto px-4 max-w-4xl pt-28">
                        <Link to="/blog" className="inline-flex items-center text-white/80 hover:text-white text-sm font-medium transition-colors">
                            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Magazine
                        </Link>
                    </div>
                    <div className="mt-auto pb-10">
                        <div className="container mx-auto px-4 max-w-4xl">
                            {blog.tags?.[0] && (
                                <span className="inline-block bg-brand-orange text-white text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
                                    {blog.tags[0]}
                                </span>
                            )}
                            <h1 className="text-3xl md:text-5xl font-display font-bold text-white leading-tight mb-5 max-w-3xl drop-shadow-lg">
                                {blog.title}
                            </h1>
                            <div className="flex items-center gap-4 text-white/90">
                                {author?.profilePicture ? (
                                    <img src={author.profilePicture} alt={authorName} referrerPolicy="no-referrer" className="w-11 h-11 rounded-full object-cover ring-2 ring-white/40" />
                                ) : (
                                    <div className="w-11 h-11 rounded-full bg-brand-orange flex items-center justify-center text-white font-bold ring-2 ring-white/40">
                                        {authorName.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div className="text-sm">
                                    <p className="font-bold">{authorName}</p>
                                    <p className="text-white/70 flex items-center gap-2">
                                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {dateStr}</span>
                                        <span>·</span>
                                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {readingTime} min read</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Body with sticky share rail */}
            <div className="container mx-auto px-4 max-w-4xl">
                <div className="relative lg:grid lg:grid-cols-[auto_1fr] lg:gap-10 pt-12">
                    {/* Share rail */}
                    <aside className="hidden lg:block">
                        <div className="sticky top-28 flex flex-col gap-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Share</span>
                            <ShareBtn href={fbUrl} label="Facebook" className="hover:bg-blue-50 hover:text-blue-600"><Facebook className="w-4 h-4" /></ShareBtn>
                            <ShareBtn href={twUrl} label="Twitter" className="hover:bg-sky-50 hover:text-sky-500"><Twitter className="w-4 h-4" /></ShareBtn>
                            <ShareBtn href={liUrl} label="LinkedIn" className="hover:bg-indigo-50 hover:text-indigo-600"><Linkedin className="w-4 h-4" /></ShareBtn>
                            <button onClick={handleCopyLink} aria-label="Copy link" className="w-11 h-11 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors">
                                <Link2 className="w-4 h-4" />
                            </button>
                        </div>
                    </aside>

                    {/* Article */}
                    <article className="min-w-0">
                        <p className="text-xl text-muted-foreground font-light leading-relaxed mb-8 pb-8 border-b border-slate-100">
                            {blog.excerpt}
                        </p>

                        <div className="prose prose-lg max-w-none prose-headings:font-display prose-headings:text-brand-blue prose-a:text-brand-orange prose-img:rounded-2xl">
                            {looksLikeHtml ? (
                                <div dangerouslySetInnerHTML={{ __html: blog.content }} />
                            ) : (
                                blog.content.split(/\n\s*\n/).map((para, i) => (
                                    <p key={i} className="whitespace-pre-line">{para}</p>
                                ))
                            )}
                        </div>

                        {/* Tags */}
                        {blog.tags && blog.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-10 pt-8 border-t border-slate-100">
                                {blog.tags.map((tag) => (
                                    <Link
                                        key={tag}
                                        to={`/blog`}
                                        className="text-sm font-medium bg-secondary/60 text-brand-blue px-3 py-1.5 rounded-full hover:bg-brand-light transition-colors"
                                    >
                                        #{tag}
                                    </Link>
                                ))}
                            </div>
                        )}

                        {/* Author bio */}
                        <div className="flex items-center gap-4 mt-8 p-6 bg-secondary/30 rounded-[1.75rem]">
                            {author?.profilePicture ? (
                                <img src={author.profilePicture} alt={authorName} referrerPolicy="no-referrer" className="w-14 h-14 rounded-full object-cover" />
                            ) : (
                                <div className="w-14 h-14 rounded-full bg-brand-orange flex items-center justify-center text-white text-xl font-bold">
                                    {authorName.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div>
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">Written by</p>
                                <p className="font-bold text-lg text-brand-blue">{authorName}</p>
                                <p className="text-sm text-muted-foreground">Sharing stories to inspire your next journey.</p>
                            </div>
                        </div>

                        {/* Mobile share */}
                        <div className="flex lg:hidden items-center gap-2 mt-8">
                            <span className="text-sm font-medium text-muted-foreground mr-1">Share:</span>
                            <ShareBtn href={fbUrl} label="Facebook" className="hover:bg-blue-50 hover:text-blue-600"><Facebook className="w-4 h-4" /></ShareBtn>
                            <ShareBtn href={twUrl} label="Twitter" className="hover:bg-sky-50 hover:text-sky-500"><Twitter className="w-4 h-4" /></ShareBtn>
                            <ShareBtn href={liUrl} label="LinkedIn" className="hover:bg-indigo-50 hover:text-indigo-600"><Linkedin className="w-4 h-4" /></ShareBtn>
                            <button onClick={handleCopyLink} aria-label="Share" className="w-11 h-11 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50">
                                <Share2 className="w-4 h-4" />
                            </button>
                        </div>
                    </article>
                </div>

                {/* Related articles */}
                {related.length > 0 && (
                    <section className="mt-20 pt-12 border-t border-slate-100">
                        <div className="flex items-center gap-3 mb-8">
                            <span className="w-1.5 h-7 rounded-full bg-brand-orange" />
                            <h2 className="text-2xl md:text-3xl font-display font-bold text-brand-blue">More from the Magazine</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {related.map((post) => (
                                <Link key={post._id} to={`/blog/${post.slug}`} className="group flex flex-col gap-3">
                                    <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-secondary/20">
                                        <Image src={post.coverImage} alt={post.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                        {post.tags?.[0] && (
                                            <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-bold text-brand-blue">
                                                {post.tags[0]}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="font-display font-bold text-lg leading-tight group-hover:text-brand-orange transition-colors line-clamp-2">
                                        {post.title}
                                    </h3>
                                    <span className="text-sm font-medium text-brand-orange inline-flex items-center gap-1">
                                        Read article <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};

const ShareBtn = ({ href, label, className, children }: { href: string; label: string; className?: string; children: React.ReactNode }) => (
    <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Share on ${label}`}
        className={`w-11 h-11 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 transition-colors ${className}`}
    >
        {children}
    </a>
);
