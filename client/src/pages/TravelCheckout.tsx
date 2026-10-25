import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, CheckCircle2, Loader2, MapPin, ShieldCheck, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { PageTitle } from '@/components/PageTitle';
import { FeatureRoute } from '@/components/FeatureGate';
import { Spinner } from '@/components/ui/spinner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NotFound } from '@/pages/NotFound';
import { Eyebrow } from '@/components/travel/Eyebrow';
import { SliceRow, AirlineBadge } from '@/components/travel/FlightCard';
import { TravellerFields } from '@/components/travel/TravellerFields';
import { AnimatedPrice } from '@/components/travel/motion';
import { CheckoutPayment } from '@/components/payment/CheckoutPayment';
import type { PaymentCheckout, PaymentResult } from '@/lib/checkout';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';
import { useConfirmTravelOrder, useCreateTravelOrder, useFlightOffer, useHotelOffer } from '@/hooks/use-travel';
import { CABIN_LABELS, prettyDate } from '@/lib/travel';
import { cn } from '@/lib/utils';
import type { FlightOffer, HotelOffer, TravelKind, TravelOrder, Traveller } from '@/types/travel';

const STEPS = ['Travellers', 'Review', 'Pay', 'Confirmed'];
const emptyTraveller = (): Traveller => ({ title: 'Mr', firstName: '', lastName: '' });

export const TravelCheckoutRoute = () => {
    const { kind } = useParams();
    if (kind !== 'flight' && kind !== 'hotel') return <NotFound />;
    return (
        <FeatureRoute feature={kind === 'flight' ? 'flights' : 'hotels'}>
            <TravelCheckout kind={kind} />
        </FeatureRoute>
    );
};

const Stepper = ({ step }: { step: number }) => (
    <ol aria-label="Checkout steps" className="flex flex-wrap items-center gap-3">
        {STEPS.map((label, i) => (
            <li key={label} aria-current={i === step ? 'step' : undefined} className="flex items-center gap-3">
                <span className={cn(
                    'flex items-center gap-2.5 text-sm font-bold',
                    i < step && 'text-brand-blue',
                    i === step && 'text-brand-orange',
                    i > step && 'text-muted-foreground',
                )}>
                    <span className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center',
                        i < step && 'bg-brand-blue text-white',
                        i === step && 'bg-brand-orange text-white shadow-lg shadow-brand-orange/30',
                        i > step && 'bg-slate-50 border border-slate-200',
                    )}>
                        {i < step ? <Check className="w-4 h-4" /> : i + 1}
                    </span>
                    {label}
                </span>
                {i < STEPS.length - 1 && <span aria-hidden="true" className={cn('w-10 h-0.5', i < step ? 'bg-brand-blue' : 'bg-slate-200')} />}
            </li>
        ))}
    </ol>
);

function FlightSummary({ offer }: { offer: FlightOffer }) {
    return (
        <div className="flex flex-col gap-4">
            <AirlineBadge offer={offer} />
            {offer.slices.map((slice, i) => (
                <div key={i} className="rounded-3xl bg-slate-50 p-5">
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {i === 0 ? 'Outbound' : 'Return'} · {prettyDate(slice.departDate)}
                    </p>
                    <SliceRow slice={slice} />
                </div>
            ))}
            <div className="flex flex-wrap gap-2 text-[13px] font-bold">
                <span className="rounded-full bg-slate-50 px-3.5 py-1.5">{CABIN_LABELS[offer.cabin]}</span>
                <span className="rounded-full bg-slate-50 px-3.5 py-1.5">{offer.baggageKg} kg + 7 kg cabin</span>
                <span className={cn('rounded-full px-3.5 py-1.5', offer.refundable ? 'bg-green-50 text-green-700' : 'bg-slate-50')}>
                    {offer.refundable ? 'Refundable' : 'Non-refundable'}
                </span>
            </div>
        </div>
    );
}

function HotelSummary({ offer }: { offer: HotelOffer }) {
    return (
        <div className="flex gap-4">
            <img src={offer.hotel.image} alt={offer.hotel.name} className="w-28 h-28 rounded-3xl object-cover shrink-0" />
            <div className="min-w-0">
                <p className="flex items-center gap-1 text-xs font-semibold text-brand-orange"><MapPin className="w-3.5 h-3.5" />{offer.hotel.area}, {offer.hotel.city}</p>
                <p className="text-xl font-display font-bold text-brand-blue">{offer.hotel.name}</p>
                <p className="text-sm font-bold mt-1">{offer.roomName} · {offer.rooms} {offer.rooms === 1 ? 'room' : 'rooms'}</p>
                <p className="text-sm text-muted-foreground">{prettyDate(offer.checkIn)} – {prettyDate(offer.checkOut)} · {offer.nights} nights</p>
                <p className={cn('text-sm font-bold mt-1', offer.refundable ? 'text-green-700' : 'text-slate-600')}>{offer.cancellationPolicy}</p>
            </div>
        </div>
    );
}

const TravelCheckout = ({ kind }: { kind: TravelKind }) => {
    const { offerId } = useParams();
    const [sp] = useSearchParams();
    const linkedBooking = sp.get('linkedBooking') || undefined;
    const { user } = useAuth();
    const { formatPrice, formatMoney, convert, currency } = useCurrency();
    // Offers are quoted in US dollars; the card is charged in the traveller's currency (same rounding as the server)
    const charged = (usdAmount: number) => formatMoney(Math.round(convert(usdAmount, 'USD', currency) * 100) / 100, currency);
    const flightQuery = useFlightOffer(offerId, kind === 'flight');
    const hotelQuery = useHotelOffer(offerId, kind === 'hotel');
    const query = kind === 'flight' ? flightQuery : hotelQuery;
    const offer = (kind === 'flight' ? flightQuery.data?.offer : hotelQuery.data?.offer) as FlightOffer | HotelOffer | undefined;

    const createOrder = useCreateTravelOrder();
    const confirmOrder = useConfirmTravelOrder();
    const [step, setStep] = useState(0);
    const [travellers, setTravellers] = useState<Traveller[]>([]);
    const [contact, setContact] = useState({ email: user?.email ?? '', phone: '' });
    const [price, setPrice] = useState<number | null>(null);
    const [newPrice, setNewPrice] = useState<number | null>(null);
    const [checkout, setCheckout] = useState<PaymentCheckout | null>(null);
    const [order, setOrder] = useState<TravelOrder | null>(null);

    useEffect(() => {
        if (!offer || travellers.length) return;
        setTravellers(Array.from({ length: offer.kind === 'flight' ? offer.adults : 1 }, emptyTraveller));
        setPrice(offer.price);
    }, [offer, travellers.length]);

    const needsPassport = offer?.kind === 'flight' && offer.international;

    const travellersValid = travellers.length > 0
        && travellers.every((t) => t.firstName.trim() && t.lastName.trim()
            && (!needsPassport || (t.passportNumber && t.passportExpiry && t.nationality)))
        && /\S+@\S+\.\S+/.test(contact.email);

    const placeOrder = async (acceptPriceChange = false) => {
        if (!offer || price === null) return;
        try {
            const result = await createOrder.mutateAsync({
                kind, offerId: offer.id, travellers, contact, linkedBooking, quotedTotal: price, acceptPriceChange, currency,
            });
            if (result.priceChanged) {
                setNewPrice(result.newTotal);
                return;
            }
            setNewPrice(null);
            setOrder(result.order);
            if (result.checkout) {
                setCheckout(result.checkout);
                setStep(2);
            } else {
                setStep(3);
            }
        } catch (err) {
            toast.error((err as Error).message || 'We could not create this booking.');
        }
    };

    const onPaid = async (paid: PaymentResult) => {
        if (!order) return;
        try {
            const result = await confirmOrder.mutateAsync({ id: order._id, paid });
            setOrder(result.order);
            setStep(3);
        } catch (err) {
            toast.error((err as Error).message || 'Payment received, but confirmation failed. We will email you shortly.');
        }
    };

    if (query.isLoading) return <div className="min-h-screen pt-32"><Spinner center label="Checking the latest price…" /></div>;

    if (query.isError || !offer) {
        const status = (query.error as { status?: number } | null)?.status;
        return (
            <div className="min-h-screen pt-40 px-4 text-center">
                <h1 className="text-3xl font-display font-bold text-brand-blue">{status === 410 ? 'This price has expired' : 'We could not load this offer'}</h1>
                <p className="mt-2 text-muted-foreground">Prices refresh often. Search again to see the latest options.</p>
                <Link to={kind === 'flight' ? '/flights' : '/hotels'} className="mt-6 inline-flex h-11 items-center px-6 rounded-full bg-brand-orange text-white font-bold">
                    Search again
                </Link>
            </div>
        );
    }

    const displayPrice = newPrice ?? price ?? offer.price;

    return (
        <div className="bg-background min-h-screen pt-28 pb-20">
            <PageTitle title="Checkout" noIndex />
            <div className="max-w-7xl mx-auto px-4 lg:px-6 flex flex-col gap-7">
                <div>
                    <Eyebrow className="mb-3">Secure checkout</Eyebrow>
                    <h1 className="text-4xl md:text-5xl font-display font-bold text-brand-blue">
                        {step === 3 ? 'All booked' : kind === 'flight' ? 'Book your flight' : 'Book your stay'}
                    </h1>
                </div>
                <Stepper step={step} />

                {newPrice !== null && (
                    <div role="alert" className="rounded-3xl border border-orange-200 bg-orange-50 px-6 py-4 flex flex-wrap items-center gap-4">
                        <div className="flex-1 min-w-[220px]">
                            <p className="font-bold">The price was updated by the {kind === 'flight' ? 'airline' : 'hotel'}</p>
                            <p className="text-sm text-orange-900">
                                It was {formatPrice(price ?? offer.price)} when you searched and is now <strong className="tabular-nums">{formatPrice(newPrice)}</strong>.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => { setPrice(newPrice); placeOrder(true); }}
                            disabled={createOrder.isPending}
                            className="h-11 px-5 rounded-full bg-brand-orange text-white font-bold shadow-lg shadow-brand-orange/20 disabled:opacity-60"
                        >
                            Accept new price
                        </button>
                        <Link to={kind === 'flight' ? '/flights' : '/hotels'} className="text-sm font-bold text-orange-800 hover:underline">Back to results</Link>
                    </div>
                )}

                <div className="flex flex-col lg:flex-row gap-6 items-start">
                    <div className="flex-1 min-w-0 w-full">
                        <AnimatePresence mode="wait">
                            <motion.div key={step} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                                {step === 0 && (
                                    <section className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 md:p-7 flex flex-col gap-4" aria-label="Traveller details">
                                        <h2 className="text-2xl font-display font-bold text-brand-blue">{kind === 'flight' ? 'Who is flying?' : 'Lead guest'}</h2>
                                        {needsPassport && <p className="text-sm text-muted-foreground">Names must match passports exactly.</p>}
                                        {travellers.map((t, i) => (
                                            <TravellerFields
                                                key={i}
                                                index={i}
                                                value={t}
                                                needsPassport={!!needsPassport}
                                                heading={kind === 'flight' ? `Adult ${i + 1}` : 'Guest checking in'}
                                                onChange={(next) => setTravellers((all) => all.map((x, j) => (j === i ? next : x)))}
                                            />
                                        ))}
                                        <div className="grid sm:grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="contact-email">Email for {kind === 'flight' ? 'e-tickets' : 'the voucher'}</Label>
                                                <Input id="contact-email" type="email" autoComplete="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} required />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="contact-phone">Phone (optional)</Label>
                                                <Input id="contact-phone" type="tel" autoComplete="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
                                            </div>
                                        </div>
                                    </section>
                                )}

                                {step === 1 && (
                                    <section className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 md:p-7 flex flex-col gap-5" aria-label="Review">
                                        <h2 className="text-2xl font-display font-bold text-brand-blue">Review</h2>
                                        {offer.kind === 'flight' ? <FlightSummary offer={offer} /> : <HotelSummary offer={offer} />}
                                        <div className="border-t border-slate-100 pt-4">
                                            <div className="flex justify-between items-center mb-3">
                                                <h3 className="font-bold">{kind === 'flight' ? 'Travellers' : 'Guest'}</h3>
                                                <button type="button" onClick={() => setStep(0)} className="text-sm font-bold text-brand-orange hover:underline">Edit</button>
                                            </div>
                                            <ul className="grid sm:grid-cols-2 gap-2 text-sm">
                                                {travellers.map((t, i) => <li key={i} className="rounded-2xl bg-slate-50 px-4 py-3 font-bold">{t.title} {t.firstName} {t.lastName}</li>)}
                                            </ul>
                                            <p className="mt-3 text-sm text-muted-foreground">Confirmation goes to {contact.email}</p>
                                        </div>
                                    </section>
                                )}

                                {step === 2 && checkout && (
                                    <section className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 md:p-7" aria-label="Payment">
                                        <h2 className="text-2xl font-display font-bold text-brand-blue mb-5">Payment</h2>
                                        <CheckoutPayment
                                            checkout={checkout}
                                            onPaid={onPaid}
                                            isSubmitting={confirmOrder.isPending}
                                            label={`Pay ${formatMoney(checkout.amount / 100, checkout.currency)}`}
                                        />
                                    </section>
                                )}

                                {step === 3 && order && (
                                    <section className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 md:p-10 text-center" aria-label="Confirmation">
                                        {order.status === 'confirmed' ? (
                                            <>
                                                <div className="w-20 h-20 mx-auto rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-5"><CheckCircle2 className="w-10 h-10" /></div>
                                                <h2 className="text-3xl font-display font-bold text-brand-blue">You're booked!</h2>
                                                <p className="mt-2 text-muted-foreground">Confirmation sent to {order.contact.email}.</p>
                                                <p className="mt-4 text-sm">Booking reference <span className="font-mono font-bold text-lg text-brand-blue">{order.providerRef}</span></p>
                                            </>
                                        ) : order.status === 'pending' ? (
                                            <>
                                                <div className="w-20 h-20 mx-auto rounded-full bg-orange-50 text-brand-orange flex items-center justify-center mb-5"><Loader2 className="w-10 h-10 animate-spin" /></div>
                                                <h2 className="text-3xl font-display font-bold text-brand-blue">Awaiting payment</h2>
                                                <p className="mt-2 text-muted-foreground">We'll confirm with the {kind === 'flight' ? 'airline' : 'hotel'} as soon as your payment clears.</p>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-20 h-20 mx-auto rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-5"><XCircle className="w-10 h-10" /></div>
                                                <h2 className="text-3xl font-display font-bold text-brand-blue">We couldn't confirm this booking</h2>
                                                <p className="mt-2 text-muted-foreground">The {kind === 'flight' ? 'airline' : 'hotel'} declined it. Any payment is refunded automatically.</p>
                                            </>
                                        )}
                                        <div className="mt-8 flex flex-wrap justify-center gap-3">
                                            <Link to="/dashboard" className="h-11 inline-flex items-center px-6 rounded-full border border-slate-200 font-bold">Go to dashboard</Link>
                                            <Link to={kind === 'flight' ? '/hotels' : '/flights'} className="h-11 inline-flex items-center px-6 rounded-full bg-brand-blue text-white font-bold">
                                                {kind === 'flight' ? 'Find a hotel' : 'Find flights'}
                                            </Link>
                                        </div>
                                    </section>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {step < 3 && (
                        <aside aria-label="Price summary" className="w-full lg:w-[380px] shrink-0 rounded-[2rem] bg-brand-dark text-white p-7 flex flex-col gap-4 shadow-2xl shadow-brand-blue/30 lg:sticky lg:top-28">
                            <h2 className="text-2xl font-display font-bold">Price summary</h2>
                            {offer.kind === 'flight' ? (
                                <div className="flex justify-between text-sm text-slate-300"><span>{offer.adults} × {formatPrice(offer.pricePerAdult)}</span><span>Taxes included</span></div>
                            ) : (
                                <div className="flex justify-between text-sm text-slate-300"><span>{offer.nights} nights × {formatPrice(offer.pricePerNight)}</span><span>Taxes included</span></div>
                            )}
                            <div className="border-t border-white/10 pt-4 flex justify-between items-baseline">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Total</span>
                                <AnimatedPrice value={displayPrice} className="text-4xl font-display font-bold text-brand-orange tabular-nums" />
                            </div>
                            <p className="text-xs text-slate-300 text-right -mt-2">You pay {charged(displayPrice)} in {currency}.</p>
                            {step === 0 && (
                                <button
                                    type="button"
                                    onClick={() => (travellersValid ? setStep(1) : toast.error('Please complete every traveller and a valid email.'))}
                                    className="h-14 rounded-full bg-brand-orange font-bold hover:bg-brand-orange/90 transition-colors"
                                >
                                    Continue to review
                                </button>
                            )}
                            {step === 1 && (
                                <button
                                    type="button"
                                    onClick={() => placeOrder(false)}
                                    disabled={createOrder.isPending}
                                    className="h-14 rounded-full bg-brand-orange font-bold hover:bg-brand-orange/90 transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
                                >
                                    {createOrder.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Continue to payment
                                </button>
                            )}
                            <p className="flex items-center gap-2 text-xs text-slate-400"><ShieldCheck className="w-4 h-4 text-brand-orange" />Secure payment. Price re-checked before you pay.</p>
                        </aside>
                    )}
                </div>
            </div>
        </div>
    );
};
