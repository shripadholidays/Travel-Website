import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
    Map, Heart, Settings, LogOut, ArrowRight, X, Shield, Lock, HelpCircle, Plane, BedDouble,
    PenTool, MailWarning, LayoutDashboard, Loader2, FileText, Route,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { PageTitle } from "@/components/PageTitle";
import { useUserBookings, useCancelBooking } from "@/hooks/use-bookings";
import { useWishlist, useRemoveFromWishlist } from "@/hooks/use-wishlist";
import { useEnabledFeatures } from "@/hooks/use-feature";
import { useCancelTravelOrder, useMyTravelOrders } from "@/hooks/use-travel";
import { useMyBlogPosts, useDeleteBlogPost } from "@/hooks/use-blog";
import { useWriteEligibility } from "@/hooks/use-write-eligibility";
import { TravelOrderCard } from "@/components/travel/TravelOrderCard";
import { MyCustomTrips } from "@/components/trip-builder/MyCustomTrips";
import type { TravelOrder } from "@/types/travel";
import { useAuth } from "@/context/AuthContext";
import { useTourModal } from "@/hooks/use-tour-modal";
import { useUpdateProfile } from "@/hooks/use-auth";
import { api } from "@/services/api";
import { bookingReference, cancellationWindow } from "@/lib/bookings";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Tour, Booking, BlogPost } from "@/types";
import { adminHome, isStaff as isStaffUser, roleLabel } from '@/lib/admin-access';

const linkedBookingId = (order: TravelOrder) =>
    order.linkedBooking && typeof order.linkedBooking === 'object' ? order.linkedBooking._id : order.linkedBooking ?? null;

const BOOKING_STATUS: Record<Booking['status'], { label: string; className: string }> = {
    confirmed: { label: 'Confirmed', className: 'bg-green-100 text-green-700' },
    pending: { label: 'Awaiting payment', className: 'bg-yellow-100 text-yellow-700' },
    cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
    completed: { label: 'Completed', className: 'bg-blue-100 text-blue-700' },
};

const ARTICLE_STATUS: Record<BlogPost['status'], { label: string; className: string }> = {
    draft: { label: 'Draft', className: 'bg-slate-100 text-slate-600' },
    pending: { label: 'Waiting for review', className: 'bg-yellow-100 text-yellow-700' },
    published: { label: 'Published', className: 'bg-green-100 text-green-700' },
    rejected: { label: 'Changes requested', className: 'bg-brand-orange/10 text-brand-orange' },
};

export const Dashboard = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { user, logout } = useAuth();
    const isStaff = isStaffUser(user);

    // Flights/Hotels tabs exist only while the admin has those services switched on
    const travelFeatures = useEnabledFeatures();
    const { data: travelData, isLoading: travelLoading } = useMyTravelOrders(travelFeatures.any);
    const cancelTravelOrder = useCancelTravelOrder();
    const [travelCancelTarget, setTravelCancelTarget] = useState<TravelOrder | null>(null);
    const travelOrders = travelFeatures.any ? travelData?.orders ?? [] : [];

    const tabs = [
        { id: 'bookings', label: 'My Bookings', icon: Map },
        { id: 'trips', label: 'Trips I Built', icon: Route },
        ...(travelFeatures.flights ? [{ id: 'flights', label: 'Flights', icon: Plane }] : []),
        ...(travelFeatures.hotels ? [{ id: 'hotels', label: 'Hotels', icon: BedDouble }] : []),
        { id: 'wishlist', label: 'Wishlist', icon: Heart },
        { id: 'articles', label: 'My Articles', icon: PenTool },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];
    // The open tab lives in the URL, so links like /dashboard?tab=articles land in the right place
    const requested = searchParams.get('tab') || 'bookings';
    const currentTab = tabs.some((t) => t.id === requested) ? requested : 'bookings';
    const selectTab = (id: string) => setSearchParams(id === 'bookings' ? {} : { tab: id }, { replace: true });

    const { data: bookingsData, isLoading: bookingsLoading } = useUserBookings();
    const { data: wishlistData, isLoading: wishlistLoading } = useWishlist();
    const { data: articlesData, isLoading: articlesLoading } = useMyBlogPosts(currentTab === 'articles');
    const { data: eligibility } = useWriteEligibility();
    const updateProfile = useUpdateProfile();
    const cancelBooking = useCancelBooking();
    const removeFromWishlist = useRemoveFromWishlist();
    const deleteArticle = useDeleteBlogPost();

    const bookings = bookingsData?.bookings ?? [];
    const now = Date.now();
    const upcoming = bookings
        .filter((b) => (b.status === 'confirmed' || b.status === 'pending') && new Date(b.travelDate).getTime() >= now - 864e5)
        .sort((a, b) => new Date(a.travelDate).getTime() - new Date(b.travelDate).getTime());
    const past = bookings.filter((b) => !upcoming.includes(b));
    const wishlistTours = wishlistData?.wishlist?.tours ?? [];
    const articles = articlesData?.posts ?? [];
    const { openTour } = useTourModal();

    const [displayName, setDisplayName] = useState(user?.displayName ?? '');
    const [avatarError, setAvatarError] = useState(false);
    const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
    const [deleteArticleTarget, setDeleteArticleTarget] = useState<BlogPost | null>(null);
    const [resending, setResending] = useState(false);

    // Keep the settings field in sync once the user profile loads.
    useEffect(() => {
        if (user?.displayName) setDisplayName(user.displayName);
    }, [user?.displayName]);

    const needsVerification = !!user && user.authProvider !== 'google' && user.isEmailVerified === false;

    const resendVerification = async () => {
        setResending(true);
        try {
            const res = await api.post<{ sent?: boolean; alreadyVerified?: boolean }>('/auth/resend-verification');
            toast.success(res.alreadyVerified ? 'Your email is already verified.' : `We've sent a new link to ${user?.email}.`);
        } catch (err) {
            toast.error((err as Error).message || 'Could not send the email. Please try again.');
        } finally {
            setResending(false);
        }
    };

    const handleSaveSettings = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = displayName.trim();
        if (trimmed.length < 2) {
            toast.error('Display name must be at least 2 characters.');
            return;
        }
        if (trimmed === user?.displayName) {
            toast.info('No changes to save.');
            return;
        }
        updateProfile.mutate(
            { displayName: trimmed },
            {
                onSuccess: () => toast.success('Profile updated.'),
                onError: (err: Error) => toast.error(err.message || 'Failed to update profile.'),
            }
        );
    };

    const handleCancelBooking = () => {
        if (!cancelTarget) return;
        cancelBooking.mutate(cancelTarget._id, {
            onSuccess: () => {
                toast.success(cancelTarget.status === 'confirmed' && cancelTarget.totalAmount > 0
                    ? 'Booking cancelled. Your payment is refunded to your card within 5–10 days.'
                    : 'Booking cancelled.');
                setCancelTarget(null);
            },
            onError: (err: Error) => toast.error(err.message || 'Failed to cancel booking.'),
        });
    };

    const handleRemoveWishlist = (tourId: string) => {
        removeFromWishlist.mutate(tourId, {
            onSuccess: () => toast.success('Removed from wishlist.'),
            onError: (err: Error) => toast.error(err.message || 'Failed to remove.'),
        });
    };

    const handleDeleteArticle = () => {
        if (!deleteArticleTarget) return;
        deleteArticle.mutate(deleteArticleTarget._id, {
            onSuccess: () => {
                toast.success('Article deleted.');
                setDeleteArticleTarget(null);
            },
            onError: (err: Error) => toast.error(err.message || 'Failed to delete article.'),
        });
    };

    const firstName = (user?.displayName ?? 'Traveller').split(' ')[0];

    const renderBooking = (booking: Booking) => {
        const tour = typeof booking.tour === 'object' ? booking.tour as Tour : null;
        const status = BOOKING_STATUS[booking.status];
        const { open: canCancel } = cancellationWindow(booking);
        return (
            <div key={booking._id} className="flex flex-col sm:flex-row gap-4 p-4 border border-slate-100 rounded-2xl hover:shadow-md hover:border-slate-200 transition-all">
                {tour?.imageURL && (
                    <img src={tour.imageURL} alt="" className="w-full sm:w-36 h-28 sm:h-auto object-cover rounded-xl" />
                )}
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg truncate">{tour ? tour.title : 'Tour'}</h3>
                    <p className="text-muted-foreground text-sm mb-3">
                        {format(new Date(booking.travelDate), 'EEE, d MMM yyyy')} &bull; {booking.numberOfTravelers} {booking.numberOfTravelers === 1 ? 'traveller' : 'travellers'}
                        <span className="hidden sm:inline"> &bull; Ref <span className="font-mono">{bookingReference(booking._id)}</span></span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${status.className}`}>{status.label}</span>
                        {booking.totalAmount > 0 && (
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 tabular-nums">
                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: booking.currency || 'USD' }).format(booking.totalAmount)}
                            </span>
                        )}
                        {booking.status === 'cancelled' && (booking.refundedAmount ?? 0) > 0 && (
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">Refunded</span>
                        )}
                    </div>
                    {travelOrders.some((o) => linkedBookingId(o) === booking._id) && (
                        <div className="mt-4 space-y-2">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Linked to this trip</p>
                            {travelOrders.filter((o) => linkedBookingId(o) === booking._id).map((o) => (
                                <TravelOrderCard key={o._id} order={o} compact />
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex sm:flex-col justify-end gap-2 shrink-0">
                    <Button variant="outline" size="sm" className="rounded-full" asChild>
                        <Link to={`/bookings/${booking._id}`}>View booking</Link>
                    </Button>
                    {canCancel && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-full text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setCancelTarget(booking)}
                        >
                            Cancel
                        </Button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="pt-24 pb-12 bg-secondary/20 min-h-screen">
            <PageTitle title="My Dashboard" noIndex />
            <div className="container mx-auto px-4 max-w-6xl">
                {/* Page header */}
                <div className="mb-6">
                    <h1 className="text-3xl md:text-4xl font-display font-bold text-brand-blue">Welcome back, {firstName}</h1>
                    <p className="text-muted-foreground mt-1">Your trips, saved tours, articles and account in one place.</p>
                </div>

                {needsVerification && (
                    <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4" role="status">
                        <MailWarning className="w-5 h-5 text-amber-600 shrink-0" />
                        <p className="flex-1 text-sm text-amber-900">
                            Please confirm your email address. We sent a link to <span className="font-semibold">{user?.email}</span> when you signed up.
                        </p>
                        <Button size="sm" variant="outline" className="rounded-full bg-white" onClick={resendVerification} disabled={resending}>
                            {resending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Send a new link
                        </Button>
                    </div>
                )}

                {isStaff && (
                    <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-brand-blue/10 bg-white p-4 shadow-sm">
                        <LayoutDashboard className="w-5 h-5 text-brand-blue shrink-0" />
                        <p className="flex-1 text-sm text-slate-700">
                            You're signed in as staff ({roleLabel(user)}). Your admin work is in the admin area.
                        </p>
                        <Button size="sm" variant="brand" className="rounded-full" asChild>
                            <Link to={adminHome(user)}>Open admin <ArrowRight className="w-4 h-4 ml-1" /></Link>
                        </Button>
                    </div>
                )}

                <div className="flex flex-col md:flex-row gap-8">
                    {/* Sidebar */}
                    <aside className="md:w-72 flex-shrink-0 space-y-4">
                        {/* Profile card with gradient header */}
                        <div className="bg-white border border-slate-100 rounded-[1.75rem] overflow-hidden shadow-sm hidden md:block">
                            <div className="h-20 bg-gradient-to-r from-brand-orange to-amber-500" />
                            <div className="px-6 pb-6 -mt-10 text-center">
                                {user?.profilePicture && !avatarError ? (
                                    <img
                                        src={user.profilePicture}
                                        alt=""
                                        className="w-20 h-20 rounded-full mx-auto mb-3 object-cover ring-4 ring-white shadow-md"
                                        referrerPolicy="no-referrer"
                                        onError={() => setAvatarError(true)}
                                    />
                                ) : (
                                    <div className="w-20 h-20 bg-brand-light rounded-full mx-auto mb-3 flex items-center justify-center text-2xl font-bold text-brand-orange ring-4 ring-white shadow-md">
                                        {user?.displayName?.charAt(0)?.toUpperCase() ?? '?'}
                                    </div>
                                )}
                                <p className="font-bold text-lg text-brand-blue">{user?.displayName ?? 'Traveller'}</p>
                                <p className="text-sm text-muted-foreground truncate">{user?.email ?? ''}</p>

                                <div className="grid grid-cols-2 gap-3 mt-5">
                                    <button type="button" onClick={() => selectTab('bookings')} className="bg-secondary/40 rounded-xl py-2.5 hover:bg-secondary/70 transition-colors">
                                        <p className="text-xl font-bold font-display text-brand-blue">{upcoming.length}</p>
                                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Upcoming</p>
                                    </button>
                                    <button type="button" onClick={() => selectTab('wishlist')} className="bg-secondary/40 rounded-xl py-2.5 hover:bg-secondary/70 transition-colors">
                                        <p className="text-xl font-bold font-display text-brand-blue">{wishlistTours.length}</p>
                                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Saved</p>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Nav: a scrollable row on phones, a list beside the content from md up */}
                        <nav aria-label="Dashboard sections" className="bg-white border border-slate-100 rounded-[1.75rem] p-2 md:p-3 shadow-sm flex md:block gap-1 overflow-x-auto md:space-y-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            {tabs.map(tab => {
                                const Icon = tab.icon;
                                const active = currentTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => selectTab(tab.id)}
                                        aria-current={active ? 'page' : undefined}
                                        className={cn(
                                            "shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-2xl transition-all font-medium whitespace-nowrap text-sm md:text-base",
                                            active ? "bg-brand-orange text-white shadow-md shadow-brand-orange/20" : "text-slate-600 hover:bg-slate-50"
                                        )}
                                    >
                                        <Icon className="w-4 h-4 md:w-5 md:h-5" />
                                        {tab.label}
                                    </button>
                                );
                            })}
                            <div className="hidden md:block border-t border-slate-100 my-1" />
                            <button
                                onClick={() => logout()}
                                className="hidden md:flex w-full items-center gap-3 px-4 py-3 rounded-2xl text-red-500 hover:bg-red-50 font-medium transition-colors"
                            >
                                <LogOut className="w-5 h-5" />
                                Log Out
                            </button>
                        </nav>
                    </aside>

                    {/* Content */}
                    <section className="flex-1 min-w-0 bg-white border border-slate-100 rounded-[1.75rem] p-5 md:p-8 min-h-[500px] shadow-sm">
                        {currentTab === 'bookings' && (
                            <div>
                                <h2 className="text-2xl font-bold font-display mb-6 text-brand-blue">My Bookings</h2>
                                {bookingsLoading ? (
                                    <Spinner center />
                                ) : bookings.length === 0 ? (
                                    <EmptyState
                                        icon={Map}
                                        title="No bookings yet"
                                        text="When you book a trip, it'll show up here. Start exploring our curated tours!"
                                        ctaLabel="Browse Tours"
                                        ctaTo="/tours"
                                    />
                                ) : (
                                    <div className="space-y-10">
                                        <div className="space-y-4">
                                            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Upcoming</h3>
                                            {upcoming.length > 0 ? upcoming.map(renderBooking) : (
                                                <p className="text-sm text-muted-foreground">
                                                    No upcoming trips. <Link to="/tours" className="text-brand-orange font-medium hover:underline">Find your next one</Link>.
                                                </p>
                                            )}
                                        </div>
                                        {past.length > 0 && (
                                            <div className="space-y-4">
                                                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Past & cancelled</h3>
                                                {past.map(renderBooking)}
                                            </div>
                                        )}
                                        <p className="text-xs text-muted-foreground">
                                            Free cancellation up to 24 hours before departure; card payments are refunded automatically.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {currentTab === 'trips' && (
                            <div>
                                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                                    <h2 className="text-2xl font-bold font-display text-brand-blue">Trips I Built</h2>
                                    <Button variant="outline" size="sm" asChild><Link to="/build-trip"><Route className="w-4 h-4 mr-1.5" /> Build a new trip</Link></Button>
                                </div>
                                <MyCustomTrips />
                            </div>
                        )}

                        {(currentTab === 'flights' || currentTab === 'hotels') && (
                            <div>
                                <h2 className="text-2xl font-bold font-display mb-6 text-brand-blue">
                                    {currentTab === 'flights' ? 'My Flights' : 'My Hotels'}
                                </h2>
                                {travelLoading ? (
                                    <Spinner center />
                                ) : travelOrders.filter((o) => o.kind === (currentTab === 'flights' ? 'flight' : 'hotel')).length === 0 ? (
                                    <EmptyState
                                        icon={currentTab === 'flights' ? Plane : BedDouble}
                                        title={currentTab === 'flights' ? 'No flights yet' : 'No hotel stays yet'}
                                        text={currentTab === 'flights' ? 'Book flights that line up with your tours.' : 'Find a stay right next to your tour.'}
                                        ctaLabel={currentTab === 'flights' ? 'Search flights' : 'Search hotels'}
                                        ctaTo={currentTab === 'flights' ? '/flights' : '/hotels'}
                                    />
                                ) : (
                                    <div className="space-y-4">
                                        {travelOrders
                                            .filter((o) => o.kind === (currentTab === 'flights' ? 'flight' : 'hotel'))
                                            .map((o) => <TravelOrderCard key={o._id} order={o} onCancel={setTravelCancelTarget} />)}
                                    </div>
                                )}
                            </div>
                        )}

                        {currentTab === 'wishlist' && (
                            <div>
                                <h2 className="text-2xl font-bold font-display mb-6 text-brand-blue">My Wishlist</h2>
                                {wishlistLoading ? (
                                    <Spinner center />
                                ) : wishlistTours.length === 0 ? (
                                    <EmptyState
                                        icon={Heart}
                                        title="Your wishlist is empty"
                                        text="Tap the heart on any tour to save it here for later."
                                        ctaLabel="Discover Tours"
                                        ctaTo="/tours"
                                    />
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {wishlistTours.map((tour) => (
                                            <div key={tour._id} className="relative group overflow-hidden rounded-2xl border border-slate-100 aspect-[4/3]">
                                                <Link
                                                    to={`/tour/${tour._id}`}
                                                    onClick={(e) => {
                                                        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                                                        e.preventDefault();
                                                        openTour(tour);
                                                    }}
                                                >
                                                    <img src={tour.imageURL} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-4 text-white">
                                                        <h3 className="font-bold">{tour.title}</h3>
                                                        <p className="text-sm opacity-80">{tour.location}</p>
                                                        <span className="text-xs flex items-center gap-1 mt-1 text-brand-orange opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                                                            View tour <ArrowRight className="w-3 h-3" />
                                                        </span>
                                                    </div>
                                                </Link>
                                                <button
                                                    onClick={() => handleRemoveWishlist(tour._id)}
                                                    disabled={removeFromWishlist.isPending}
                                                    aria-label={`Remove ${tour.title} from wishlist`}
                                                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 text-red-500 flex items-center justify-center hover:bg-white shadow-md"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {currentTab === 'articles' && (
                            <div>
                                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                                    <h2 className="text-2xl font-bold font-display text-brand-blue">My Articles</h2>
                                    {(eligibility?.eligible || isStaff) && (
                                        <Button variant="brand" size="sm" className="rounded-full" asChild>
                                            <Link to="/write-article"><PenTool className="w-4 h-4 mr-1.5" /> Write an article</Link>
                                        </Button>
                                    )}
                                </div>
                                {articlesLoading ? (
                                    <Spinner center />
                                ) : articles.length === 0 ? (
                                    eligibility?.eligible || isStaff ? (
                                        <EmptyState
                                            icon={FileText}
                                            title="Share a travel story"
                                            text="Write about a trip you loved. An editor reads every article before it goes live, and we'll email you when it's published."
                                            ctaLabel="Write your first article"
                                            ctaTo="/write-article"
                                        />
                                    ) : (
                                        <EmptyState
                                            icon={Lock}
                                            title="Writing unlocks soon"
                                            text={`Accounts can write articles after ${eligibility?.requirements.accountAgeDays ?? 30} days, with ${eligibility?.requirements.reviews ?? 5} reviews or one completed trip.`}
                                            ctaLabel="See what's needed"
                                            ctaTo="/write-article"
                                        />
                                    )
                                ) : (
                                    <div className="space-y-3">
                                        {articles.map((post) => {
                                            const status = ARTICLE_STATUS[post.status];
                                            return (
                                                <div key={post._id} className="flex flex-col sm:flex-row gap-4 p-4 border border-slate-100 rounded-2xl">
                                                    {post.coverImage && <img src={post.coverImage} alt="" className="w-full sm:w-28 h-24 sm:h-20 object-cover rounded-xl" />}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${status.className}`}>{status.label}</span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {post.status === 'published' && post.publishedAt
                                                                    ? `Published ${format(new Date(post.publishedAt), 'd MMM yyyy')}`
                                                                    : `Updated ${format(new Date(post.updatedAt || post.createdAt), 'd MMM yyyy')}`}
                                                            </span>
                                                        </div>
                                                        <h3 className="font-bold truncate">{post.title}</h3>
                                                        {post.status === 'rejected' && post.reviewNote && (
                                                            <p className="mt-2 text-sm text-slate-700 bg-brand-orange/5 border border-brand-orange/20 rounded-xl p-3">
                                                                <span className="font-semibold">Editor's note:</span> {post.reviewNote}
                                                            </p>
                                                        )}
                                                        {post.status === 'pending' && (
                                                            <p className="mt-1 text-sm text-muted-foreground">An editor will review it soon. We'll email you when it's live.</p>
                                                        )}
                                                    </div>
                                                    <div className="flex sm:flex-col justify-end gap-2 shrink-0">
                                                        <Button variant="outline" size="sm" className="rounded-full" asChild>
                                                            <Link to={`/blog/${post.slug}`}>{post.status === 'published' ? 'Read' : 'Preview'}</Link>
                                                        </Button>
                                                        <Button variant="ghost" size="sm" className="rounded-full" asChild>
                                                            <Link to={`/write-article?edit=${post.slug}`}>{post.status === 'rejected' ? 'Edit & resubmit' : 'Edit'}</Link>
                                                        </Button>
                                                        {post.status !== 'published' && (
                                                            <Button variant="ghost" size="sm" className="rounded-full text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteArticleTarget(post)}>
                                                                Delete
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {currentTab === 'settings' && (
                            <div>
                                <h2 className="text-2xl font-bold font-display mb-6 text-brand-blue">Account Settings</h2>

                                {/* Profile header */}
                                <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-2xl bg-secondary/40 mb-8">
                                    {user?.profilePicture && !avatarError ? (
                                        <img src={user.profilePicture} alt="" referrerPolicy="no-referrer" className="w-16 h-16 rounded-full object-cover ring-2 ring-white shadow" onError={() => setAvatarError(true)} />
                                    ) : (
                                        <div className="w-16 h-16 rounded-full bg-brand-orange flex items-center justify-center text-white text-xl font-bold">
                                            {user?.displayName?.charAt(0)?.toUpperCase() ?? '?'}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-lg text-brand-blue">{user?.displayName ?? 'Traveller'}</p>
                                        <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                                    </div>
                                    <div className="flex flex-col items-start sm:items-end gap-1.5">
                                        {isStaff && (
                                            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide bg-brand-orange/10 text-brand-orange px-3 py-1 rounded-full capitalize">
                                                <Shield className="w-3.5 h-3.5" /> {user?.role}
                                            </span>
                                        )}
                                        {user?.createdAt && (
                                            <span className="text-xs text-muted-foreground">Member since {format(new Date(user.createdAt), 'MMM yyyy')}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Editable fields */}
                                <form className="space-y-5 max-w-lg" onSubmit={handleSaveSettings}>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="displayName">Display Name</Label>
                                        <Input
                                            id="displayName"
                                            type="text"
                                            autoComplete="name"
                                            className="h-11 rounded-xl"
                                            value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value)}
                                        />
                                        <p className="text-xs text-muted-foreground">This is how your name appears on reviews and articles.</p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="email" className="flex items-center gap-1.5">Email <Lock className="w-3 h-3 text-muted-foreground" /></Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            className="h-11 rounded-xl bg-slate-50"
                                            value={user?.email ?? ''}
                                            disabled
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            {user?.authProvider === 'google'
                                                ? "Managed by your Google account, so it can't be changed here."
                                                : <>To use a different email, <Link to="/contact?topic=other" className="text-brand-orange hover:underline">contact us</Link>.</>}
                                        </p>
                                    </div>
                                    <div className="pt-1">
                                        <Button type="submit" variant="brand" className="rounded-full px-6" disabled={updateProfile.isPending}>
                                            {updateProfile.isPending ? 'Saving…' : 'Save Changes'}
                                        </Button>
                                    </div>
                                </form>

                                {user?.authProvider !== 'google' && (
                                    <div className="mt-10 pt-8 border-t border-slate-100 max-w-lg">
                                        <h3 className="font-bold text-brand-blue mb-1">Password</h3>
                                        <p className="text-sm text-muted-foreground mb-3">We'll email you a secure link to choose a new password.</p>
                                        <Button variant="outline" className="rounded-full" asChild>
                                            <Link to="/forgot-password">Change password</Link>
                                        </Button>
                                    </div>
                                )}

                                <div className="mt-10 pt-8 border-t border-slate-100 max-w-lg">
                                    <h3 className="font-bold text-brand-blue mb-4">Quick Links</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <Link to="/tours" className="flex items-center gap-3 p-4 rounded-2xl border border-slate-100 hover:border-brand-orange/40 hover:bg-secondary/30 transition-all">
                                            <div className="w-9 h-9 rounded-lg bg-brand-orange/10 flex items-center justify-center"><Map className="w-4 h-4 text-brand-orange" /></div>
                                            <span className="text-sm font-medium">Browse Tours</span>
                                        </Link>
                                        <Link to="/contact?topic=booking" className="flex items-center gap-3 p-4 rounded-2xl border border-slate-100 hover:border-brand-orange/40 hover:bg-secondary/30 transition-all">
                                            <div className="w-9 h-9 rounded-lg bg-brand-orange/10 flex items-center justify-center"><HelpCircle className="w-4 h-4 text-brand-orange" /></div>
                                            <span className="text-sm font-medium">Get Support</span>
                                        </Link>
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-slate-100 max-w-lg">
                                    <button
                                        onClick={() => logout()}
                                        className="flex items-center gap-2 text-sm font-medium text-red-500 hover:text-red-600 transition-colors"
                                    >
                                        <LogOut className="w-4 h-4" /> Sign out of your account
                                    </button>
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </div>

            <ConfirmDialog
                open={!!travelCancelTarget}
                onOpenChange={(o) => !o && setTravelCancelTarget(null)}
                title={travelCancelTarget?.kind === 'hotel' ? 'Cancel this stay?' : 'Cancel this flight?'}
                description="We'll cancel with the supplier and refund your payment."
                confirmLabel="Cancel booking"
                cancelLabel="Keep it"
                destructive
                loading={cancelTravelOrder.isPending}
                onConfirm={() => {
                    if (!travelCancelTarget) return;
                    cancelTravelOrder.mutate(travelCancelTarget._id, {
                        onSuccess: () => {
                            toast.success('Booking cancelled.');
                            setTravelCancelTarget(null);
                        },
                        onError: (err: Error) => toast.error(err.message || 'Failed to cancel booking.'),
                    });
                }}
            />

            <ConfirmDialog
                open={!!cancelTarget}
                onOpenChange={(o) => !o && setCancelTarget(null)}
                title="Cancel this booking?"
                description={cancelTarget?.status === 'confirmed' && cancelTarget.totalAmount > 0
                    ? `You'll get ${new Intl.NumberFormat('en-US', { style: 'currency', currency: cancelTarget.currency || 'USD' }).format(cancelTarget.totalAmount)} back on your card. This can't be undone.`
                    : "Your reservation will be cancelled. This can't be undone."}
                confirmLabel="Cancel Booking"
                cancelLabel="Keep Booking"
                destructive
                loading={cancelBooking.isPending}
                onConfirm={handleCancelBooking}
            />

            <ConfirmDialog
                open={!!deleteArticleTarget}
                onOpenChange={(o) => !o && setDeleteArticleTarget(null)}
                title="Delete this article?"
                description={`"${deleteArticleTarget?.title}" will be removed for good.`}
                confirmLabel="Delete"
                destructive
                loading={deleteArticle.isPending}
                onConfirm={handleDeleteArticle}
            />
        </div>
    );
};

const EmptyState = ({ icon: Icon, title, text, ctaLabel, ctaTo }: { icon: typeof Map; title: string; text: string; ctaLabel: string; ctaTo: string }) => (
    <div className="text-center py-16 px-6 bg-gradient-to-br from-secondary/40 to-secondary/10 rounded-[1.75rem] border border-slate-100">
        <div className="w-16 h-16 rounded-full bg-brand-orange/10 flex items-center justify-center mx-auto mb-5">
            <Icon className="w-8 h-8 text-brand-orange" />
        </div>
        <h3 className="text-xl font-display font-bold mb-2">{title}</h3>
        <p className="text-muted-foreground max-w-sm mx-auto mb-6">{text}</p>
        <Button variant="brand" asChild><Link to={ctaTo}>{ctaLabel}</Link></Button>
    </div>
);
