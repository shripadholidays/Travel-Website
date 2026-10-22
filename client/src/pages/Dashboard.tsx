import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Map, Heart, Settings, LogOut, ArrowRight, X, Shield, Lock, HelpCircle, Plane, BedDouble } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { PageTitle } from "@/components/PageTitle";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { useUserBookings, useCancelBooking } from "@/hooks/use-bookings";
import { useWishlist, useRemoveFromWishlist } from "@/hooks/use-wishlist";
import { useEnabledFeatures } from "@/hooks/use-feature";
import { useCancelTravelOrder, useMyTravelOrders } from "@/hooks/use-travel";
import { TravelOrderCard } from "@/components/travel/TravelOrderCard";
import type { TravelOrder } from "@/types/travel";
import { useAuth } from "@/context/AuthContext";
import { useTourModal } from "@/hooks/use-tour-modal";
import { useUpdateProfile } from "@/hooks/use-auth";
import { useCurrency } from "@/context/CurrencyContext";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Tour, Booking } from "@/types";

const baseTabs = [
    { id: 'bookings', label: 'My Bookings', icon: Map },
    { id: 'wishlist', label: 'Wishlist', icon: Heart },
    { id: 'settings', label: 'Settings', icon: Settings },
];

const linkedBookingId = (order: TravelOrder) =>
    order.linkedBooking && typeof order.linkedBooking === 'object' ? order.linkedBooking._id : order.linkedBooking ?? null;

export const Dashboard = () => {
    const [activeTab, setActiveTab] = useState('bookings');
    // Flights/Hotels tabs exist only while the admin has those services switched on
    const travelFeatures = useEnabledFeatures();
    const { data: travelData, isLoading: travelLoading } = useMyTravelOrders(travelFeatures.any);
    const cancelTravelOrder = useCancelTravelOrder();
    const [travelCancelTarget, setTravelCancelTarget] = useState<TravelOrder | null>(null);
    const travelOrders = travelFeatures.any ? travelData?.orders ?? [] : [];
    const tabs = [
        baseTabs[0],
        ...(travelFeatures.flights ? [{ id: 'flights', label: 'Flights', icon: Plane }] : []),
        ...(travelFeatures.hotels ? [{ id: 'hotels', label: 'Hotels', icon: BedDouble }] : []),
        ...baseTabs.slice(1),
    ];
    const currentTab = tabs.some((t) => t.id === activeTab) ? activeTab : 'bookings';
    const { user, logout } = useAuth();
    const { formatPrice } = useCurrency();
    const { data: bookingsData, isLoading: bookingsLoading } = useUserBookings();
    const { data: wishlistData, isLoading: wishlistLoading } = useWishlist();
    const updateProfile = useUpdateProfile();
    const cancelBooking = useCancelBooking();
    const removeFromWishlist = useRemoveFromWishlist();

    const bookings = bookingsData?.bookings ?? [];
    const wishlistTours = wishlistData?.wishlist?.tours ?? [];
    const { openTour } = useTourModal();

    const [displayName, setDisplayName] = useState(user?.displayName ?? '');
    const [avatarError, setAvatarError] = useState(false);
    const [ticketBooking, setTicketBooking] = useState<Booking | null>(null);
    const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);

    // Keep the settings field in sync once the user profile loads.
    useEffect(() => {
        if (user?.displayName) setDisplayName(user.displayName);
    }, [user?.displayName]);

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
                toast.success('Booking cancelled.');
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

    const getStatusColor = (status: Booking['status']) => {
        switch (status) {
            case 'confirmed': return 'bg-green-100 text-green-700';
            case 'pending': return 'bg-yellow-100 text-yellow-700';
            case 'cancelled': return 'bg-red-100 text-red-700';
            case 'completed': return 'bg-blue-100 text-blue-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const ticketTour = ticketBooking && typeof ticketBooking.tour === 'object' ? ticketBooking.tour as Tour : null;

    const firstName = (user?.displayName ?? 'Traveler').split(' ')[0];

    return (
        <div className="pt-24 pb-12 bg-secondary/20 min-h-screen">
            <PageTitle title="My Dashboard" noIndex />
            <div className="container mx-auto px-4 max-w-6xl">
                {/* Page header */}
                <div className="mb-8">
                    <h1 className="text-3xl md:text-4xl font-display font-bold text-brand-blue">Welcome back, {firstName} 👋</h1>
                    <p className="text-muted-foreground mt-1">Manage your trips, wishlist, and account settings.</p>
                </div>

                <div className="flex flex-col md:flex-row gap-8">
                    {/* Sidebar */}
                    <aside className="md:w-72 flex-shrink-0 space-y-4">
                        {/* Profile card with gradient header */}
                        <div className="bg-white border border-slate-100 rounded-[1.75rem] overflow-hidden shadow-sm">
                            <div className="h-20 bg-gradient-to-r from-brand-orange to-amber-500" />
                            <div className="px-6 pb-6 -mt-10 text-center">
                                {user?.profilePicture && !avatarError ? (
                                    <img
                                        src={user.profilePicture}
                                        alt={user.displayName}
                                        className="w-20 h-20 rounded-full mx-auto mb-3 object-cover ring-4 ring-white shadow-md"
                                        referrerPolicy="no-referrer"
                                        onError={() => setAvatarError(true)}
                                    />
                                ) : (
                                    <div className="w-20 h-20 bg-brand-light rounded-full mx-auto mb-3 flex items-center justify-center text-2xl font-bold text-brand-orange ring-4 ring-white shadow-md">
                                        {user?.displayName?.charAt(0)?.toUpperCase() ?? '?'}
                                    </div>
                                )}
                                <h3 className="font-bold text-lg text-brand-blue">{user?.displayName ?? 'Traveler'}</h3>
                                <p className="text-sm text-muted-foreground truncate">{user?.email ?? ''}</p>

                                {/* Stat counts */}
                                <div className="grid grid-cols-2 gap-3 mt-5">
                                    <div className="bg-secondary/40 rounded-xl py-2.5">
                                        <p className="text-xl font-bold font-display text-brand-blue">{bookings.length}</p>
                                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Bookings</p>
                                    </div>
                                    <div className="bg-secondary/40 rounded-xl py-2.5">
                                        <p className="text-xl font-bold font-display text-brand-blue">{wishlistTours.length}</p>
                                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Wishlist</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Nav */}
                        <nav className="bg-white border border-slate-100 rounded-[1.75rem] p-3 shadow-sm space-y-1">
                            {tabs.map(tab => {
                                const Icon = tab.icon;
                                const active = currentTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-medium",
                                            active ? "bg-brand-orange text-white shadow-md shadow-brand-orange/20" : "text-slate-600 hover:bg-slate-50"
                                        )}
                                    >
                                        <Icon className="w-5 h-5" />
                                        {tab.label}
                                    </button>
                                );
                            })}
                            <div className="border-t border-slate-100 my-1" />
                            <button
                                onClick={() => logout()}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-500 hover:bg-red-50 font-medium transition-colors"
                            >
                                <LogOut className="w-5 h-5" />
                                Log Out
                            </button>
                        </nav>
                    </aside>

                    {/* Content */}
                    <main className="flex-1 bg-white border border-slate-100 rounded-[1.75rem] p-6 md:p-8 min-h-[500px] shadow-sm">
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
                                    <div className="space-y-4">
                                        {bookings.map((booking) => {
                                            const tour = typeof booking.tour === 'object' ? booking.tour as Tour : null;
                                            const canCancel = booking.status === 'pending' || booking.status === 'confirmed';
                                            return (
                                                <div key={booking._id} className="flex flex-col sm:flex-row gap-4 p-4 border border-slate-100 rounded-2xl hover:shadow-md hover:border-slate-200 transition-all">
                                                    {tour && (
                                                        <img
                                                            src={tour.imageURL}
                                                            alt={tour.title}
                                                            className="w-full sm:w-36 h-28 sm:h-auto object-cover rounded-xl"
                                                        />
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-bold text-lg truncate">{tour ? tour.title : 'Tour'}</h4>
                                                        <p className="text-muted-foreground text-sm mb-3">
                                                            {format(new Date(booking.travelDate), 'MMM dd, yyyy')} &bull; {booking.numberOfTravelers} {booking.numberOfTravelers === 1 ? 'Traveler' : 'Travelers'}
                                                        </p>
                                                        <div className="flex flex-wrap gap-2">
                                                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${getStatusColor(booking.status)}`}>
                                                                {booking.status}
                                                            </span>
                                                            {booking.totalAmount > 0 && (
                                                                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                                                                    {formatPrice(booking.totalAmount)}
                                                                </span>
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
                                                        <Button variant="outline" size="sm" className="rounded-full" onClick={() => setTicketBooking(booking)}>
                                                            View Ticket
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
                                        })}
                                    </div>
                                )}
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
                                                    <img src={tour.imageURL} alt={tour.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-4 text-white">
                                                        <h4 className="font-bold">{tour.title}</h4>
                                                        <p className="text-sm opacity-80">{tour.location}</p>
                                                        <span className="text-xs flex items-center gap-1 mt-1 text-brand-orange opacity-0 group-hover:opacity-100 transition-opacity">
                                                            View tour <ArrowRight className="w-3 h-3" />
                                                        </span>
                                                    </div>
                                                </Link>
                                                <button
                                                    onClick={() => handleRemoveWishlist(tour._id)}
                                                    disabled={removeFromWishlist.isPending}
                                                    aria-label="Remove from wishlist"
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

                        {currentTab === 'settings' && (
                            <div>
                                <h2 className="text-2xl font-bold font-display mb-6 text-brand-blue">Account Settings</h2>

                                {/* Profile header */}
                                <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-2xl bg-secondary/40 mb-8">
                                    {user?.profilePicture && !avatarError ? (
                                        <img src={user.profilePicture} alt={user.displayName} referrerPolicy="no-referrer" className="w-16 h-16 rounded-full object-cover ring-2 ring-white shadow" onError={() => setAvatarError(true)} />
                                    ) : (
                                        <div className="w-16 h-16 rounded-full bg-brand-orange flex items-center justify-center text-white text-xl font-bold">
                                            {user?.displayName?.charAt(0)?.toUpperCase() ?? '?'}
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <p className="font-bold text-lg text-brand-blue">{user?.displayName ?? 'Traveler'}</p>
                                        <p className="text-sm text-muted-foreground">{user?.email}</p>
                                    </div>
                                    <div className="flex flex-col items-start sm:items-end gap-1.5">
                                        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide bg-brand-orange/10 text-brand-orange px-3 py-1 rounded-full capitalize">
                                            <Shield className="w-3.5 h-3.5" /> {user?.role ?? 'user'}
                                        </span>
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
                                        <p className="text-xs text-muted-foreground">Email is managed by your Google account and can't be changed here.</p>
                                    </div>
                                    <div className="pt-1">
                                        <Button type="submit" variant="brand" className="rounded-full px-6" disabled={updateProfile.isPending}>
                                            {updateProfile.isPending ? 'Saving…' : 'Save Changes'}
                                        </Button>
                                    </div>
                                </form>

                                {/* Preferences */}
                                <div className="mt-10 pt-8 border-t border-slate-100 max-w-lg">
                                    <h3 className="font-bold text-brand-blue mb-4">Quick Links</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <Link to="/tours" className="flex items-center gap-3 p-4 rounded-2xl border border-slate-100 hover:border-brand-orange/40 hover:bg-secondary/30 transition-all">
                                            <div className="w-9 h-9 rounded-lg bg-brand-orange/10 flex items-center justify-center"><Map className="w-4 h-4 text-brand-orange" /></div>
                                            <span className="text-sm font-medium">Browse Tours</span>
                                        </Link>
                                        <Link to="/contact" className="flex items-center gap-3 p-4 rounded-2xl border border-slate-100 hover:border-brand-orange/40 hover:bg-secondary/30 transition-all">
                                            <div className="w-9 h-9 rounded-lg bg-brand-orange/10 flex items-center justify-center"><HelpCircle className="w-4 h-4 text-brand-orange" /></div>
                                            <span className="text-sm font-medium">Get Support</span>
                                        </Link>
                                    </div>
                                </div>

                                {/* Danger zone */}
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
                    </main>
                </div>
            </div>

            {/* Ticket details dialog */}
            <Dialog open={!!ticketBooking} onOpenChange={(o) => !o && setTicketBooking(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{ticketTour?.title ?? 'Booking Details'}</DialogTitle>
                        <DialogDescription>
                            Booking reference: <span className="font-mono">{ticketBooking?._id.slice(-8).toUpperCase()}</span>
                        </DialogDescription>
                    </DialogHeader>
                    {ticketBooking && (
                        <div className="space-y-3 text-sm">
                            <Row label="Status">
                                <span className={`text-xs font-bold px-2 py-1 rounded-full capitalize ${getStatusColor(ticketBooking.status)}`}>
                                    {ticketBooking.status}
                                </span>
                            </Row>
                            <Row label="Travel date">{format(new Date(ticketBooking.travelDate), 'EEEE, MMM dd, yyyy')}</Row>
                            <Row label="Travelers">{ticketBooking.numberOfTravelers}</Row>
                            {ticketTour?.location && <Row label="Location">{ticketTour.location}</Row>}
                            {ticketBooking.addons?.length > 0 && (
                                <Row label="Add-ons">{ticketBooking.addons.map((a) => a.name).join(', ')}</Row>
                            )}
                            {ticketBooking.specialRequests && (
                                <Row label="Requests">{ticketBooking.specialRequests}</Row>
                            )}
                            <div className="border-t pt-3 flex justify-between font-bold">
                                <span>Total Paid</span>
                                <span>{formatPrice(ticketBooking.totalAmount)}</span>
                            </div>
                            {ticketTour && (
                                <Button variant="outline" className="w-full mt-2" asChild>
                                    <Link to={`/tour/${ticketTour._id}`}>View Tour</Link>
                                </Button>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

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

            {/* Cancel confirmation */}
            <ConfirmDialog
                open={!!cancelTarget}
                onOpenChange={(o) => !o && setCancelTarget(null)}
                title="Cancel this booking?"
                description="This will cancel your reservation. Refunds are subject to our cancellation policy."
                confirmLabel="Cancel Booking"
                cancelLabel="Keep Booking"
                destructive
                loading={cancelBooking.isPending}
                onConfirm={handleCancelBooking}
            />
        </div>
    );
};

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-right font-medium">{children}</span>
    </div>
);

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
