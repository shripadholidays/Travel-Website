import { useMemo } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, MapPin, Star, Users } from 'lucide-react';
import { PageTitle } from '@/components/PageTitle';
import { Image } from '@/components/ui/image';
import { Spinner } from '@/components/ui/spinner';
import { Eyebrow } from '@/components/travel/Eyebrow';
import { useHotel } from '@/hooks/use-travel';
import { useCurrency } from '@/context/CurrencyContext';
import { addDaysIso, isoDate, prettyDate } from '@/lib/travel';
import type { HotelOffer } from '@/types/travel';

export const HotelDetailsPage = () => {
    const { id } = useParams();
    const [sp] = useSearchParams();
    const navigate = useNavigate();
    const { formatPrice } = useCurrency();
    const linkedBooking = sp.get('linkedBooking') || undefined;
    const stay = useMemo(() => {
        const checkIn = sp.get('in') || isoDate(14);
        return {
            checkIn,
            checkOut: sp.get('out') || addDaysIso(checkIn, 3),
            rooms: Number(sp.get('rooms') || 1),
            adults: Number(sp.get('adults') || 2),
        };
    }, [sp]);
    const { data, isLoading, isError, error } = useHotel(id, stay);
    const hotel = data?.hotel;

    const choose = (offer: HotelOffer) => {
        const qs = linkedBooking ? `?linkedBooking=${encodeURIComponent(linkedBooking)}` : '';
        navigate(`/checkout/travel/hotel/${encodeURIComponent(offer.id)}${qs}`);
    };

    if (isLoading) return <div className="min-h-screen pt-32"><Spinner center label="Loading hotel…" /></div>;
    if (isError || !hotel) {
        return (
            <div className="min-h-screen pt-40 text-center px-4">
                <h1 className="text-3xl font-display font-bold text-brand-blue">We couldn't load this hotel</h1>
                <p className="mt-2 text-muted-foreground">{(error as Error)?.message || 'Please try another stay.'}</p>
                <Link to="/hotels" className="mt-6 inline-block font-bold text-brand-orange hover:underline">Back to hotels</Link>
            </div>
        );
    }

    const backQs = new URLSearchParams({ place: hotel.city, in: stay.checkIn, out: stay.checkOut, rooms: String(stay.rooms), adults: String(stay.adults) });
    if (linkedBooking) backQs.set('linkedBooking', linkedBooking);

    return (
        <div className="bg-background min-h-screen pt-24 pb-20">
            {/* Live supplier rates, not pages of our own: kept out of search */}
            <PageTitle title={hotel.name} description={hotel.description} noIndex />
            <div className="max-w-7xl mx-auto px-4 lg:px-6">
                <Link to={`/hotels?${backQs}`} className="inline-flex items-center gap-2 text-sm font-bold text-brand-blue hover:text-brand-orange mb-6">
                    <ArrowLeft className="w-4 h-4" /> All stays in {hotel.city}
                </Link>

                <div className="grid lg:grid-cols-3 gap-3 h-auto lg:h-[440px]">
                    <Image src={hotel.images[0]} alt={hotel.name} className="lg:col-span-2 h-72 lg:h-full rounded-[2rem]" />
                    <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
                        {hotel.images.slice(1, 3).map((src, i) => (
                            <Image key={src} src={src} alt={`${hotel.name} photo ${i + 2}`} className="h-40 lg:h-full rounded-[2rem]" />
                        ))}
                    </div>
                </div>

                <div className="mt-10 grid lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-2">
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-brand-orange">
                            <MapPin className="w-4 h-4" /> {hotel.area}, {hotel.city}, {hotel.country}
                        </div>
                        <h1 className="mt-2 text-4xl md:text-5xl font-display font-bold text-brand-blue">{hotel.name}</h1>
                        <div className="mt-3 flex items-center gap-3 text-sm">
                            <span className="text-yellow-500" aria-label={`${hotel.stars} star hotel`}>{'★'.repeat(hotel.stars)}</span>
                            <span className="flex items-center gap-1 rounded-full bg-brand-blue/90 text-white text-xs font-bold px-2.5 py-1">
                                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />{hotel.rating.toFixed(1)}
                            </span>
                        </div>
                        <p className="mt-6 text-lg text-slate-600 leading-relaxed">{hotel.description}</p>
                        <div className="mt-6 flex flex-wrap gap-2">
                            {hotel.amenities.map((a) => (
                                <span key={a} className="rounded-full bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 flex items-center gap-1.5">
                                    <Check className="w-4 h-4 text-brand-orange" />{a}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="rounded-[2rem] bg-slate-50 p-6 h-fit">
                        <Eyebrow className="mb-4 text-xs">Your stay</Eyebrow>
                        <dl className="space-y-3 text-sm">
                            <div className="flex justify-between"><dt className="text-muted-foreground">Check-in</dt><dd className="font-bold">{prettyDate(stay.checkIn)}</dd></div>
                            <div className="flex justify-between"><dt className="text-muted-foreground">Check-out</dt><dd className="font-bold">{prettyDate(stay.checkOut)}</dd></div>
                            <div className="flex justify-between"><dt className="text-muted-foreground">Guests</dt><dd className="font-bold">{stay.rooms} {stay.rooms === 1 ? 'room' : 'rooms'} · {stay.adults} guests</dd></div>
                        </dl>
                    </div>
                </div>

                <section className="mt-14" aria-labelledby="rooms-heading">
                    <Eyebrow className="mb-3">Choose your room</Eyebrow>
                    <h2 id="rooms-heading" className="text-4xl font-display font-bold text-brand-blue mb-6">Available rooms</h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        {hotel.roomOffers.map((room) => (
                            <article key={room.id} className="travel-card bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 flex flex-col gap-4">
                                <div>
                                    <h3 className="text-2xl font-display font-bold text-brand-blue">{room.roomName}</h3>
                                    <p className="mt-1 text-sm text-muted-foreground flex items-center gap-1.5"><Users className="w-4 h-4" />Sleeps {room.adults} · {room.nights} nights</p>
                                </div>
                                <span className={room.refundable
                                    ? 'w-fit rounded-full bg-green-50 text-green-700 text-xs font-bold px-3 py-1.5'
                                    : 'w-fit rounded-full bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1.5'}>
                                    {room.refundable ? 'Free cancellation' : 'Non-refundable'}
                                </span>
                                <p className="text-sm text-slate-600">{room.cancellationPolicy}</p>
                                <div className="mt-auto pt-4 border-t border-slate-100 flex items-end justify-between gap-3">
                                    <div>
                                        <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Total</p>
                                        <p className="text-[26px] leading-none font-display font-bold text-brand-blue tabular-nums">{formatPrice(room.price)}</p>
                                        <p className="text-xs text-muted-foreground">{formatPrice(room.pricePerNight)} / night</p>
                                    </div>
                                    <button type="button" onClick={() => choose(room)} className="h-12 px-6 rounded-full bg-brand-orange text-white font-bold hover:bg-brand-orange/90 shadow-lg shadow-brand-orange/20 transition-colors">
                                        Choose room
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};
