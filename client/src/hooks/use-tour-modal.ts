import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Tour } from '@/types';

export const TOUR_PARAM = 'tour';

type TourModalState = { tourModal?: boolean; preview?: Tour };

/**
 * The tour quick view lives in the URL (`?tour=<id>`) on whatever page opened it,
 * so Back closes it, refresh keeps it and the link can be shared.
 */
export function useTourModal() {
    const location = useLocation();
    const navigate = useNavigate();
    const params = new URLSearchParams(location.search);
    const tourId = params.get(TOUR_PARAM);
    const state = (location.state ?? {}) as TourModalState;

    const openTour = useCallback((tour: Tour) => {
        const next = new URLSearchParams(location.search);
        const alreadyOpen = next.has(TOUR_PARAM);
        next.set(TOUR_PARAM, tour._id);
        navigate(
            { pathname: location.pathname, search: `?${next}` },
            // The card's data renders the hero instantly while the full tour loads.
            { state: { tourModal: true, preview: tour }, replace: alreadyOpen, preventScrollReset: true },
        );
    }, [location.pathname, location.search, navigate]);

    const closeTour = useCallback(() => {
        // Opened in-app: step back so the history has no leftover entry.
        if (state.tourModal) {
            navigate(-1);
            return;
        }
        // Landed here from a shared link: drop the param in place.
        const next = new URLSearchParams(location.search);
        next.delete(TOUR_PARAM);
        const qs = next.toString();
        navigate({ pathname: location.pathname, search: qs ? `?${qs}` : '' }, { replace: true, preventScrollReset: true });
    }, [state.tourModal, location.pathname, location.search, navigate]);

    return { tourId, preview: state.preview, openTour, closeTour };
}
