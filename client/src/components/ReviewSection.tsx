import { useMemo, useState } from 'react';
import { Star, Loader2, MessageSquare, BadgeCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useTourReviews, useCreateReview } from '@/hooks/use-reviews';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

const StarRating = ({
    value,
    onChange,
    readOnly = false,
    size = 'w-5 h-5',
}: {
    value: number;
    onChange?: (v: number) => void;
    readOnly?: boolean;
    size?: string;
}) => {
    const [hover, setHover] = useState(0);
    const shown = hover || value;
    return (
        <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    disabled={readOnly}
                    onClick={() => onChange?.(star)}
                    onMouseEnter={() => !readOnly && setHover(star)}
                    aria-label={`${star} star${star > 1 ? 's' : ''}`}
                    className={cn(!readOnly && 'cursor-pointer hover:scale-110 transition-transform', readOnly && 'cursor-default')}
                >
                    <Star
                        className={cn(size, star <= shown ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300')}
                    />
                </button>
            ))}
        </div>
    );
};

export const ReviewSection = ({ tourId }: { tourId: string }) => {
    const { user } = useAuth();
    const { data, isLoading } = useTourReviews(tourId);
    const createReview = useCreateReview();
    const reviews = data?.reviews ?? [];

    const [rating, setRating] = useState(0);
    const [hoverLabel, setHoverLabel] = useState(0);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    // Average + per-star distribution for the summary panel.
    const summary = useMemo(() => {
        if (reviews.length === 0) return null;
        const total = reviews.reduce((s, r) => s + r.rating, 0);
        const avg = total / reviews.length;
        const dist = [5, 4, 3, 2, 1].map((star) => ({
            star,
            count: reviews.filter((r) => Math.round(r.rating) === star).length,
        }));
        return { avg, dist };
    }, [reviews]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0) {
            toast.error('Please select a rating.');
            return;
        }
        if (content.trim().length < 10) {
            toast.error('Please write at least 10 characters.');
            return;
        }
        createReview.mutate(
            { tourId, data: { rating, title: title.trim() || undefined, content: content.trim() } },
            {
                onSuccess: () => {
                    toast.success('Thanks for your review!');
                    setRating(0);
                    setTitle('');
                    setContent('');
                },
                onError: (err: Error) => toast.error(err.message || 'Failed to submit review.'),
            }
        );
    };

    return (
        <section>
            <div className="flex items-center gap-3 mb-6">
                <span className="w-1.5 h-7 rounded-full bg-brand-orange" />
                <h2 className="text-2xl md:text-3xl font-display font-bold text-brand-blue">Reviews</h2>
                {reviews.length > 0 && (
                    <span className="text-sm font-medium text-muted-foreground bg-secondary/60 px-3 py-1 rounded-full">
                        {reviews.length}
                    </span>
                )}
            </div>

            {/* Rating summary */}
            {summary && (
                <div className="flex flex-col sm:flex-row gap-8 bg-white border border-slate-100 rounded-[1.75rem] p-6 mb-8 shadow-sm">
                    <div className="flex flex-col items-center justify-center text-center sm:border-r sm:pr-8 border-slate-100 shrink-0">
                        <span className="text-5xl font-display font-bold text-brand-blue">{summary.avg.toFixed(1)}</span>
                        <div className="my-2">
                            <StarRating value={Math.round(summary.avg)} readOnly size="w-4 h-4" />
                        </div>
                        <span className="text-xs text-muted-foreground">{reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}</span>
                    </div>
                    <div className="flex-1 space-y-1.5 self-center">
                        {summary.dist.map(({ star, count }) => {
                            const pct = reviews.length ? (count / reviews.length) * 100 : 0;
                            return (
                                <div key={star} className="flex items-center gap-3 text-sm">
                                    <span className="flex items-center gap-1 w-8 text-muted-foreground">
                                        {star}<Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                    </span>
                                    <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                                        <div className="h-full rounded-full bg-yellow-400 transition-all" style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="w-6 text-right text-xs text-muted-foreground">{count}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Review form */}
            {user ? (
                <form onSubmit={handleSubmit} className="bg-white border border-slate-100 rounded-[1.75rem] p-6 md:p-7 mb-8 shadow-sm space-y-5">
                    <h3 className="font-display font-bold text-lg text-brand-blue">Write a review</h3>
                    <div className="space-y-2">
                        <Label>Your rating</Label>
                        <div className="flex items-center gap-3">
                            <div onMouseLeave={() => setHoverLabel(0)}>
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setRating(star)}
                                            onMouseEnter={() => setHoverLabel(star)}
                                            aria-label={`${star} star${star > 1 ? 's' : ''}`}
                                            className="cursor-pointer hover:scale-110 transition-transform"
                                        >
                                            <Star className={cn('w-8 h-8', star <= (hoverLabel || rating) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300')} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <span className="text-sm font-medium text-brand-orange min-w-[70px]">
                                {RATING_LABELS[hoverLabel || rating]}
                            </span>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="review-title">Title <span className="text-muted-foreground font-normal">(optional)</span></Label>
                        <Input
                            id="review-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Summarize your experience"
                            maxLength={100}
                            className="h-11 rounded-xl"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="review-content">Your review</Label>
                        <Textarea
                            id="review-content"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Tell others about your trip — what did you love, what stood out?"
                            rows={4}
                            maxLength={1000}
                            className="rounded-xl resize-none"
                        />
                        <p className="text-xs text-muted-foreground text-right">{content.length}/1000</p>
                    </div>
                    <Button type="submit" variant="brand" size="lg" className="rounded-xl" disabled={createReview.isPending}>
                        {createReview.isPending ? (
                            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting…</>
                        ) : (
                            'Submit Review'
                        )}
                    </Button>
                </form>
            ) : (
                <div className="bg-secondary/40 border border-slate-100 rounded-[1.75rem] p-6 mb-8 text-center">
                    <p className="text-muted-foreground">
                        <Link to="/login" className="text-brand-orange font-semibold hover:underline">Sign in</Link> to share your experience and help other travelers.
                    </p>
                </div>
            )}

            {/* Review list */}
            {isLoading ? (
                <Spinner center />
            ) : reviews.length === 0 ? (
                <div className="text-center py-14 bg-secondary/20 rounded-[1.75rem] border border-slate-100">
                    <div className="w-14 h-14 rounded-full bg-brand-orange/10 flex items-center justify-center mx-auto mb-4">
                        <MessageSquare className="w-7 h-7 text-brand-orange" />
                    </div>
                    <h3 className="font-bold text-lg mb-1">No reviews yet</h3>
                    <p className="text-muted-foreground">Be the first to share your experience on this trip!</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {reviews.map((review) => (
                        <div key={review._id} className="bg-white border border-slate-100 rounded-2xl p-5 md:p-6 shadow-sm">
                            <div className="flex items-start gap-3 mb-3">
                                {review.user?.profilePicture ? (
                                    <img
                                        src={review.user.profilePicture}
                                        alt={review.user.displayName}
                                        className="w-11 h-11 rounded-full object-cover"
                                        referrerPolicy="no-referrer"
                                    />
                                ) : (
                                    <div className="w-11 h-11 rounded-full bg-brand-light flex items-center justify-center font-bold text-brand-orange">
                                        {review.user?.displayName?.charAt(0)?.toUpperCase() ?? '?'}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-bold">{review.user?.displayName ?? 'Traveler'}</p>
                                        {review.isVerifiedBooking && (
                                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                                <BadgeCheck className="w-3.5 h-3.5" /> Verified
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">{format(new Date(review.createdAt), 'MMMM dd, yyyy')}</p>
                                </div>
                                <StarRating value={review.rating} readOnly size="w-4 h-4" />
                            </div>
                            {review.title && <p className="font-bold mb-1">{review.title}</p>}
                            <p className="text-muted-foreground leading-relaxed">{review.content}</p>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
};
