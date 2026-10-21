import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useCurrency } from '@/context/CurrencyContext';
import type { HotelOffer } from '@/types/travel';

/** Price-pill pins on the site's existing Leaflet styling. */
export const HotelMap = ({ offers, linkFor }: { offers: HotelOffer[]; linkFor: (o: HotelOffer) => string }) => {
    const { formatPrice } = useCurrency();
    const navigate = useNavigate();

    const center = useMemo<[number, number]>(() => {
        if (!offers.length) return [20.5937, 78.9629];
        const lat = offers.reduce((s, o) => s + o.hotel.lat, 0) / offers.length;
        const lng = offers.reduce((s, o) => s + o.hotel.lng, 0) / offers.length;
        return [lat, lng];
    }, [offers]);

    return (
        <div className="h-[560px] w-full rounded-[1.5rem] overflow-hidden border border-slate-100">
            <MapContainer key={center.join(',')} center={center} zoom={11} scrollWheelZoom={false} className="h-full w-full z-0">
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {offers.map((o) => (
                    <Marker
                        key={o.id}
                        position={[o.hotel.lat, o.hotel.lng]}
                        title={o.hotel.name}
                        eventHandlers={{ click: () => navigate(linkFor(o)) }}
                        icon={L.divIcon({
                            className: '',
                            html: `<span style="display:inline-block;white-space:nowrap;transform:translate(-50%,-50%);background:#fff;color:#0F172A;font:700 13px Arial,sans-serif;padding:6px 12px;border-radius:999px;box-shadow:0 4px 14px rgba(2,6,23,.18)">${formatPrice(o.pricePerNight)}</span>`,
                        })}
                    />
                ))}
            </MapContainer>
        </div>
    );
};
