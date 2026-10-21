import { Link } from 'react-router-dom';
import { ArrowUpRight, MapPin, Star } from 'lucide-react';
import { Image } from '@/components/ui/image';
import { useCurrency } from '@/context/CurrencyContext';
import type { HotelOffer } from '@/types/travel';

/** Mirrors TourCard: 2rem card, inset rounded photo, white chips, navy rating pill. */
export const HotelCard = ({ offer, to }: { offer: HotelOffer; to: string }) => {
    const { formatPrice } = useCurrency();
    const { hotel } = offer;

    return (
        <Link to={to} className="travel-card group block h-full">
            <article className="relative h-full flex flex-col bg-white rounded-[2rem] overflow-hidden border border-slate-100 shadow-sm transition-[transform,box-shadow] duration-500 ease-out hover:shadow-2xl hover:shadow-brand-blue/10 hover:-translate-y-1.5">
                <div className="relative h-[230px] w-full p-3 pb-0">
                    <div className="w-full h-full rounded-[1.5rem] overflow-hidden relative">
                        <Image src={hotel.image} alt={hotel.name} className="w-full h-full transition-transform duration-700 ease-out group-hover:scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/20" />
                        <span className="absolute top-4 left-4 rounded-full bg-brand-orange text-white text-[11px] font-bold px-3 py-1.5">{hotel.tag}</span>
                        <span className="absolute bottom-4 left-4 rounded-full bg-white/95 backdrop-blur-md text-brand-blue text-xs font-bold px-3 py-1.5 shadow-md">
                            {offer.nights} {offer.nights === 1 ? 'night' : 'nights'}
                        </span>
                        <span className="absolute bottom-4 right-4 flex items-center gap-1 rounded-full bg-brand-blue/90 backdrop-blur-md text-white text-xs font-bold px-2.5 py-1.5 shadow-md">
                            <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />{hotel.rating.toFixed(1)}
                        </span>
                    </div>
                </div>
                <div className="p-6 pt-5 flex flex-col flex-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-orange mb-2.5">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{hotel.area}, {hotel.city}</span>
                    </div>
                    <h3 className="text-xl font-display font-bold leading-tight mb-1 group-hover:text-brand-orange transition-colors line-clamp-2">{hotel.name}</h3>
                    <p className="text-sm text-yellow-500 mb-3" aria-label={`${hotel.stars} star hotel`}>{'★'.repeat(hotel.stars)}</p>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                        {hotel.amenities.slice(0, 3).map((a) => (
                            <span key={a} className="rounded-full bg-slate-50 px-3 py-1 text-xs text-slate-600">{a}</span>
                        ))}
                    </div>
                    {offer.refundable && <p className="text-sm font-bold text-green-700">Free cancellation available</p>}
                    <div className="mt-auto flex items-end justify-between pt-5 border-t border-slate-100">
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Per night</span>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-[26px] leading-none font-bold font-display text-brand-blue tabular-nums">{formatPrice(offer.pricePerNight)}</span>
                                <span className="text-xs text-muted-foreground font-medium">{formatPrice(offer.price)} total</span>
                            </div>
                        </div>
                        <span aria-hidden="true" className="w-11 h-11 rounded-full bg-slate-50 flex items-center justify-center text-brand-blue group-hover:bg-brand-orange group-hover:text-white transition-all duration-300 shrink-0">
                            <ArrowUpRight className="w-5 h-5 transition-transform group-hover:rotate-45" />
                        </span>
                    </div>
                </div>
            </article>
        </Link>
    );
};
