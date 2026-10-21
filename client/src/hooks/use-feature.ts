import { usePublicSettings, type TravelFeature } from '@/hooks/use-settings';

/** Flights/hotels switch state. Everything defaults to off until settings say otherwise. */
export function useFeatureState(feature: TravelFeature) {
    const { data, isLoading } = usePublicSettings();
    return { enabled: data?.settings?.features?.[feature] === true, loading: isLoading };
}

/** `false` while loading, so switched-off services never flash into view. */
export function useFeature(feature: TravelFeature) {
    return useFeatureState(feature).enabled;
}

export function useEnabledFeatures() {
    const { data, isLoading } = usePublicSettings();
    const flights = data?.settings?.features?.flights === true;
    const hotels = data?.settings?.features?.hotels === true;
    return { flights, hotels, any: flights || hotels, loading: isLoading };
}
