import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useWishlist, useAddToWishlist, useRemoveFromWishlist } from '@/hooks/use-wishlist';
import { rememberReturnTo } from '@/lib/return-to';
import type { Tour } from '@/types';

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

/** Date + guest selection, and the router state the /book page expects. */
export function useTourBooking(tourId?: string) {
    const [date, setDate] = useState<Date>();
    const [guests, setGuests] = useState(2);
    const bookState = { tourId, date: date ? format(date, 'yyyy-MM-dd') : '', guests };
    return { date, setDate, guests, setGuests, bookState };
}

export type TourBooking = ReturnType<typeof useTourBooking>;
export type TourActions = ReturnType<typeof useTourActions>;
