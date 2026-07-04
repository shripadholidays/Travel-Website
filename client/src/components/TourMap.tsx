import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';

// Fix Leaflet default marker icon paths under bundlers.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapProps {
    /** Explicit coordinates take priority over `location`. */
    lat?: number;
    lng?: number;
    /** Place name to geocode when no coordinates are supplied. */
    location?: string;
    label?: string;
    zoom?: number;
    className?: string;
}

// Recenters the map when coordinates resolve after the initial render.
const Recenter = ({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) => {
    const map = useMap();
    useEffect(() => {
        map.setView([lat, lng], zoom);
    }, [lat, lng, zoom, map]);
    return null;
};

export const TourMap = ({
    lat,
    lng,
    location,
    label,
    zoom = 11,
    className = 'h-96 w-full',
}: MapProps) => {
    // Consistent framed card around the map (matches the site's card language).
    const frame = 'overflow-hidden rounded-[1.5rem] border border-slate-100 shadow-sm';
    const hasExplicit = typeof lat === 'number' && typeof lng === 'number';
    const [coords, setCoords] = useState<[number, number] | null>(
        hasExplicit ? [lat!, lng!] : null
    );
    const [loading, setLoading] = useState(!hasExplicit && !!location);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (hasExplicit || !location) return;
        const controller = new AbortController();
        let active = true;
        setLoading(true);
        setFailed(false);

        fetch(
            `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(location)}`,
            { headers: { Accept: 'application/json' }, signal: controller.signal }
        )
            .then((r) => (r.ok ? r.json() : Promise.reject()))
            .then((results: { lat: string; lon: string }[]) => {
                if (!active) return;
                if (results?.length) {
                    setCoords([parseFloat(results[0].lat), parseFloat(results[0].lon)]);
                } else {
                    setFailed(true);
                }
            })
            .catch((err) => {
                if (err?.name !== 'AbortError' && active) setFailed(true);
            })
            .finally(() => active && setLoading(false));

        return () => {
            active = false;
            controller.abort();
        };
    }, [location, hasExplicit]);

    if (loading) {
        return (
            <div className={`${className} ${frame} flex items-center justify-center bg-secondary/40`}>
                <Loader2 className="w-6 h-6 animate-spin text-brand-orange" />
            </div>
        );
    }

    if (failed || !coords) {
        return (
            <div className={`${className} ${frame} flex flex-col items-center justify-center bg-secondary/40 text-muted-foreground gap-2`}>
                <MapPin className="w-8 h-8 text-brand-orange" />
                <span className="text-sm">{label || location || 'Location'}</span>
            </div>
        );
    }

    return (
        <div className={`${className} ${frame}`}>
            <MapContainer center={coords} zoom={zoom} scrollWheelZoom={false} className="h-full w-full z-0">
                <Recenter lat={coords[0]} lng={coords[1]} zoom={zoom} />
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={coords}>
                    <Popup>{label || location || 'Tour Location'}</Popup>
                </Marker>
            </MapContainer>
        </div>
    );
};
