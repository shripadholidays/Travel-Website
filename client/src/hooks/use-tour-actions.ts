import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useWishlist, useAddToWishlist, useRemoveFromWishlist } from '@/hooks/use-wishlist';
import { rememberReturnTo } from '@/lib/return-to';
import type { PackageChoice, Tour } from '@/types';
import { defaultChoice } from '@/lib/package-options';

/** Wishlist toggle + share for one tour (card, modal and details page). */
export function useTourActions(tour?: Pick<Tour, '_id' | 'title'>) {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { data: wishlistData } = useWishlist();
    const addToWishlist = useAddToWishlist();
    const removeFromWishlist = useRemoveFromWishlist();
    const isWishlisted = !!tour && !!wishlistData?.wishlist?.tours?.some((t) => t._id === tour._id);

    const toggleWishlist = () => {
        if (!user) {
            toast.error('Please sign in to save tours.');
            rememberReturnTo(location);
            navigate('/login');
            return;
        }
        if (!tour) return;
        if (isWishlisted) {
            removeFromWishlist.mutate(tour._id, { onSuccess: () => toast.success('Removed from wishlist.') });
        } else {
            addToWishlist.mutate(tour._id, { onSuccess: () => toast.success('Added to wishlist!') });
        }
    };

    // Always share the canonical tour page, even from the modal.
    const share = async () => {
        if (!tour) return;
        const url = `${window.location.origin}/tour/${tour._id}`;
        try {
            if (navigator.share) {
                await navigator.share({ title: tour.title ?? 'Wandeazy Tour', text: tour.title, url });
            } else {
                await navigator.clipboard.writeText(url);
                toast.success('Link copied to clipboard!');
            }
        } catch {
            // user cancelled the share sheet — no-op
        }
    };

    return {
        isWishlisted,
        toggleWishlist,
        wishlistPending: addToWishlist.isPending || removeFromWishlist.isPending,
        share,
    };
}

/** Date, guests, trip length and hotel class, and the router state the /book page expects. */
export function useTourBooking(tour?: Pick<Tour, '_id' | 'packageOptions'> | null) {
    const [date, setDate] = useState<Date>();
    const [guests, setGuests] = useState(2);
    // Starts on the cheapest choice (the price shown on cards) until the traveller picks
    const [picked, setChoice] = useState<PackageChoice | null>(null);
    const choice = picked ?? defaultChoice(tour);
    const bookState = { tourId: tour?._id, date: date ? format(date, 'yyyy-MM-dd') : '', guests, choice };
    return { date, setDate, guests, setGuests, choice, setChoice, bookState };
}

export type TourBooking = ReturnType<typeof useTourBooking>;
export type TourActions = ReturnType<typeof useTourActions>;
