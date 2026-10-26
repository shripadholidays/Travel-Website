import { useBlogPosts } from "@/hooks/use-blog";
import { Image } from "@/components/ui/image";
import { Calendar, User, ArrowRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { PageTitle } from "@/components/PageTitle";
import { articlePath, graph, itemListJsonLd } from "@/lib/seo";
import { format } from "date-fns";

import { Link } from "react-router-dom";

import { Container } from "@/components/ui/container";

export const BlogPage = () => {
    const { data, isLoading, isError, refetch } = useBlogPosts();
    const blogs = data?.posts ?? [];

    if (isLoading) {
        return (
            <div className="pt-24 pb-12 bg-background min-h-screen flex items-center justify-center">
                <Spinner label="Loading articles..." />
            </div>
        );
    }

    return (
        <div className="pt-24 pb-12 bg-background min-h-screen">
            <PageTitle
                title="Travel Magazine: Guides & Tips"
                description="Travel guides, packing lists, budget tips and food ideas from the Wandeazy travel magazine, written to help you plan your next trip."
                jsonLd={blogs.length > 0 ? graph(itemListJsonLd(blogs.map((b) => ({ name: b.title, path: articlePath(b) })))) : undefined}
            />
            <Container>
                <h1 className="text-4xl md:text-6xl font-display font-bold text-center mb-6">Travel Magazine</h1>
                <p className="text-lg text-muted-foreground text-center max-w-2xl mx-auto mb-16">
                    Stories, tips, and guides to inspire your next adventure.
                </p>

                {isError ? (
                    <div className="text-center py-20">
                        <h3 className="text-xl font-bold mb-2">Couldn't load articles</h3>
                        <p className="text-muted-foreground mb-4">Please try again in a moment.</p>
                        <Button variant="brand" onClick={() => refetch()}>Retry</Button>
                    </div>
                ) : blogs.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground">
                        <BookOpen className="w-12 h-12 mx-auto mb-4 text-brand-orange" />
                        <h3 className="text-xl font-bold mb-2">No articles yet</h3>
                        <p>Check back soon for travel stories and guides.</p>
                    </div>
                ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {blogs.map((blog) => (
                        <Link
                            key={blog._id}
                            to={`/blog/${blog.slug}`}
                            className="group flex flex-col gap-4"
                        >
                            <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-secondary/20">
                                <Image
                                    src={blog.coverImage}
                                    alt={blog.title}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-brand-blue">
                                    {blog.tags?.[0] ?? "Travel Tips"}
                                </div>
                            </div>

                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {format(new Date(blog.publishedAt || blog.createdAt), 'MMM dd, yyyy')}
                                </span>
                                <span className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {typeof blog.author === 'object' ? blog.author.displayName : blog.author}
                                </span>
                            </div>

                            <h3 className="text-2xl font-bold font-display leading-tight group-hover:text-brand-orange transition-colors line-clamp-2">
                                {blog.title}
                            </h3>

                            <p className="text-muted-foreground line-clamp-2">
                                {blog.excerpt}
                            </p>

                            <span className="px-0 w-fit mt-auto inline-flex items-center text-brand-orange font-medium text-sm group-hover:gap-1.5 gap-1 transition-all">
                                Read Article <ArrowRight className="w-4 h-4" />
                            </span>
                        </Link>
                    ))}
                </div>
                )}
            </Container>
        </div>
    )
}
