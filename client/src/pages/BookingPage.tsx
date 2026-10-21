import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Image } from "@/components/ui/image";
import { Spinner } from "@/components/ui/spinner";
import { PageTitle } from "@/components/PageTitle";
import { CheckCircle2, ChevronRight, Loader2, AlertCircle, MapPin, Calendar, Users, Lock, ShieldCheck, Tag, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { format } from "date-fns";
import { useTour } from "@/hooks/use-tours";
import { useCreateBooking } from "@/hooks/use-bookings";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/context/CurrencyContext";
import { useValidateCoupon, type ValidatedCoupon } from "@/hooks/use-coupons";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Elements } from "@stripe/react-stripe-js";
import { StripePaymentForm, stripeAppearance, stripePromise } from "@/components/payment/StripePaymentForm";
import { TripAddons } from "@/components/travel/TripAddons";

const steps = ['Traveller Details', 'Add-ons', 'Review & Pay', 'Success'];

interface Addon {
    name: string;
    price: number;
    description: string;
}

const AVAILABLE_ADDONS: Addon[] = [
    { name: "Airport Transfer", price: 50, description: "Round-trip airport pickup and drop-off" },
    { name: "Travel Insurance", price: 30, description: "Comprehensive coverage for your trip" },
    { name: "Photo Package", price: 100, description: "Professional photographer for the day" },
];

interface ContactInfo {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
}

export const BookingPage = () => {
    const location = useLocation();
    const { user } = useAuth();
    const { formatPrice } = useCurrency();
    const createBooking = useCreateBooking();

    const { tourId, date, guests } = (location.state as { tourId?: string; date?: string; guests?: number }) || {};

    const { data: tourData, isLoading: tourLoading } = useTour(tourId || '');

    const [currentStep, setCurrentStep] = useState(0);
    const [contactInfo, setContactInfo] = useState<ContactInfo>({
        firstName: "",
        lastName: "",
        email: user?.email || "",
        phone: "",
    });
    const [selectedAddons, setSelectedAddons] = useState<Addon[]>([]);
    const [specialRequests, setSpecialRequests] = useState("");
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [bookingId, setBookingId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [couponCode, setCouponCode] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState<ValidatedCoupon | null>(null);
    const [couponError, setCouponError] = useState("");
    const validateCoupon = useValidateCoupon();

    useEffect(() => {
        if (user?.email && !contactInfo.email) {
            setContactInfo(prev => ({ ...prev, email: user.email }));
        }
    }, [user]);

    if (!tourId) {
        return (
            <div className="pt-24 pb-12 bg-background min-h-screen flex flex-col items-center justify-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
                <h2 className="text-2xl font-bold mb-2">No tour selected</h2>
                <p className="text-muted-foreground mb-6">Please select a tour first before booking.</p>
                <Link to="/tours"><Button>Browse Tours</Button></Link>
            </div>
        );
    }

    if (tourLoading) {
        return (
            <div className="pt-24 pb-12 bg-background min-h-screen flex items-center justify-center">
                <Spinner label="Loading…" />
            </div>
        );
    }

    const tour = tourData?.tour;
    if (!tour) {
        return (
            <div className="pt-24 pb-12 bg-background min-h-screen flex flex-col items-center justify-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
                <h2 className="text-2xl font-bold mb-2">Tour not found</h2>
                <p className="text-muted-foreground mb-6">The selected tour could not be found.</p>
                <Link to="/tours"><Button>Browse Tours</Button></Link>
            </div>
        );
    }

    const numberOfGuests = guests || 1;
    const baseAmount = tour.price * numberOfGuests;
    const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);
    const subtotal = baseAmount + addonsTotal;
    const couponDiscount = appliedCoupon?.discount ?? 0;
    const totalAmount = Math.max(0, subtotal - couponDiscount);

    const handleApplyCoupon = async () => {
        const code = couponCode.trim();
        if (!code) return;
        setCouponError("");
        try {
            const result = await validateCoupon.mutateAsync({ code, orderAmount: subtotal });
            setAppliedCoupon(result.coupon);
            toast.success(`Coupon "${result.coupon.code}" applied! You saved ${formatPrice(result.coupon.discount)}.`);
        } catch (err) {
            setCouponError((err as Error).message || "Invalid coupon.");
            setAppliedCoupon(null);
        }
    };

    const handleRemoveCoupon = () => {
        setAppliedCoupon(null);
        setCouponCode("");
        setCouponError("");
    };

    const toggleAddon = (addon: Addon) => {
        setSelectedAddons(prev =>
            prev.find(a => a.name === addon.name)
                ? prev.filter(a => a.name !== addon.name)
                : [...prev, addon]
        );
    };

    const isStep0Valid = contactInfo.firstName.trim() && contactInfo.lastName.trim() && contactInfo.email.trim() && contactInfo.phone.trim();

    const handleCreateBooking = async () => {
        setIsSubmitting(true);
        try {
            const result = await createBooking.mutateAsync({
                tour: tour._id,
                travelDate: date || new Date().toISOString(),
                numberOfTravelers: numberOfGuests,
                contactInfo,
                addons: selectedAddons.map(a => ({ name: a.name, price: a.price })),
                specialRequests: specialRequests || undefined,
            });

            setBookingId(result.booking._id);

            if (result.clientSecret && stripePromise) {
                setClientSecret(result.clientSecret);
            } else {
                // No Stripe configured — go to success directly
                setCurrentStep(3);
                toast.success("Booking confirmed!");
            }
        } catch (err) {
            toast.error((err as Error).message || "Failed to create booking. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePaymentSuccess = () => {
        setCurrentStep(3);
        toast.success("Payment successful! Booking confirmed.");
    };

    const handleNext = () => {
        if (currentStep === 0 && !isStep0Valid) {
            toast.error("Please fill in all traveller details.");
            return;
        }
        if (currentStep === 2) {
            handleCreateBooking();
            return;
        }
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    return (
        <div className="pt-24 pb-16 bg-secondary/20 min-h-screen">
            <PageTitle title="Book Your Trip" noIndex />
            <div className="container mx-auto px-4 max-w-6xl">
                {/* Stepper */}
                <div className="flex items-center justify-between mb-10 relative max-w-3xl mx-auto">
                    <div className="absolute left-0 top-5 w-full h-1 bg-secondary -z-10" />
                    <div
                        className="absolute left-0 top-5 h-1 bg-brand-orange -z-10 transition-all duration-500"
                        style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                    />

                    {steps.map((step, i) => (
                        <div key={i} className="flex flex-col items-center px-1">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-colors ${i <= currentStep ? 'bg-brand-orange border-brand-orange text-white' : 'bg-white border-secondary text-muted-foreground'}`}>
                                {i < currentStep ? <CheckCircle2 className="w-6 h-6" /> : i + 1}
                            </div>
                            <span className={`text-xs sm:text-sm mt-2 font-medium text-center ${i <= currentStep ? 'text-foreground' : 'text-muted-foreground'}`}>{step}</span>
                        </div>
                    ))}
                </div>

                <div className={cn("grid gap-8", currentStep < 3 ? "lg:grid-cols-[1fr_360px]" : "")}>
                {/* Form Content */}
                <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm min-h-[400px]">
                    <AnimatePresence mode="wait">
                        {currentStep === 0 && (
                            <motion.div
                                key="step0"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <h2 className="text-2xl font-bold font-display mb-1 text-brand-blue">Traveller Details</h2>
                                <p className="text-sm text-muted-foreground mb-6">Who should we send the booking confirmation to?</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="firstName">First Name *</Label>
                                        <Input
                                            id="firstName"
                                            className="h-11 rounded-xl"
                                            placeholder="Enter your first name"
                                            value={contactInfo.firstName}
                                            onChange={(e) => setContactInfo({ ...contactInfo, firstName: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="lastName">Last Name *</Label>
                                        <Input
                                            id="lastName"
                                            className="h-11 rounded-xl"
                                            placeholder="Enter your last name"
                                            value={contactInfo.lastName}
                                            onChange={(e) => setContactInfo({ ...contactInfo, lastName: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="email">Email Address *</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            className="h-11 rounded-xl"
                                            placeholder="name@example.com"
                                            value={contactInfo.email}
                                            onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="phone">Phone Number *</Label>
                                        <Input
                                            id="phone"
                                            type="tel"
                                            className="h-11 rounded-xl"
                                            placeholder="+1 (555) 000-0000"
                                            value={contactInfo.phone}
                                            onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="mt-5 space-y-1.5">
                                    <Label htmlFor="requests">Special Requests <span className="text-muted-foreground font-normal">(optional)</span></Label>
                                    <Textarea
                                        id="requests"
                                        rows={3}
                                        className="rounded-xl resize-none"
                                        placeholder="Any dietary requirements, accessibility needs, etc."
                                        value={specialRequests}
                                        onChange={(e) => setSpecialRequests(e.target.value)}
                                    />
                                </div>
                            </motion.div>
                        )}

                        {currentStep === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <h2 className="text-2xl font-bold font-display mb-6">Enhance Your Trip</h2>
                                <div className="space-y-4">
                                    {AVAILABLE_ADDONS.map((addon) => {
                                        const isSelected = selectedAddons.some(a => a.name === addon.name);
                                        return (
                                            <div
                                                key={addon.name}
                                                onClick={() => toggleAddon(addon)}
                                                className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-colors ${isSelected ? 'border-brand-orange bg-brand-orange/5' : 'hover:border-brand-orange'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleAddon(addon)}
                                                        className="w-5 h-5 rounded border-gray-300 text-brand-orange focus:ring-brand-orange"
                                                    />
                                                    <div>
                                                        <span className="font-medium">{addon.name}</span>
                                                        <p className="text-sm text-muted-foreground">{addon.description}</p>
                                                    </div>
                                                </div>
                                                <span className="font-bold text-brand-orange">{formatPrice(addon.price)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}

                        {currentStep === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <h2 className="text-2xl font-bold font-display mb-1 text-brand-blue">Review &amp; Pay</h2>
                                <p className="text-sm text-muted-foreground mb-6">Confirm your details — your price summary is on the right.</p>

                                <div className="bg-slate-50 rounded-2xl p-5 mb-6">
                                    <h3 className="font-bold mb-4">Traveller</h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-muted-foreground block text-xs">Name</span>
                                            <p className="font-medium">{contactInfo.firstName} {contactInfo.lastName}</p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block text-xs">Email</span>
                                            <p className="font-medium truncate">{contactInfo.email}</p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block text-xs">Phone</span>
                                            <p className="font-medium">{contactInfo.phone}</p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block text-xs">Travel date</span>
                                            <p className="font-medium">{date ? format(new Date(date), 'MMM dd, yyyy') : 'Flexible'}</p>
                                        </div>
                                        {specialRequests && (
                                            <div className="col-span-2">
                                                <span className="text-muted-foreground block text-xs">Special requests</span>
                                                <p className="font-medium">{specialRequests}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {clientSecret && stripePromise ? (
                                    <div>
                                        <h3 className="font-bold mb-4 flex items-center gap-2"><Lock className="w-4 h-4 text-brand-orange" /> Payment</h3>
                                        <Elements stripe={stripePromise} options={{ clientSecret, appearance: stripeAppearance }}>
                                            <StripePaymentForm onSuccess={handlePaymentSuccess} isSubmitting={isSubmitting} />
                                        </Elements>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground bg-slate-50 rounded-xl p-4 text-center">
                                        Click <span className="font-semibold text-brand-blue">Confirm &amp; Pay</span> below to complete your booking.
                                    </p>
                                )}
                            </motion.div>
                        )}

                        {currentStep === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-12"
                            >
                                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto mb-6">
                                    <CheckCircle2 className="w-12 h-12" />
                                </div>
                                <h2 className="text-3xl font-bold font-display mb-4">You're Booked!</h2>
                                <p className="text-muted-foreground mb-2 text-lg">Your Wandeazy journey begins now.</p>
                                <p className="text-muted-foreground mb-8">A confirmation email has been sent to {contactInfo.email}.</p>

                                {bookingId && (
                                    <p className="text-sm text-muted-foreground mb-6">
                                        Booking reference: <span className="font-mono font-bold">{bookingId.slice(-8).toUpperCase()}</span>
                                    </p>
                                )}

                                <TripAddons
                                    variant="success"
                                    location={tour?.location}
                                    date={date}
                                    nights={tour?.duration?.nights || 3}
                                    linkedBooking={bookingId}
                                />

                                <div className="flex justify-center gap-4 mt-8">
                                    <Link to="/dashboard">
                                        <Button variant="outline">Go to Dashboard</Button>
                                    </Link>
                                    <Link to="/">
                                        <Button className="bg-brand-blue">Back to Home</Button>
                                    </Link>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {currentStep < 3 && !(currentStep === 2 && clientSecret) && (
                        <div className="flex justify-between mt-8 border-t pt-8">
                            <Button
                                variant="ghost"
                                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                                disabled={currentStep === 0}
                            >
                                Back
                            </Button>
                            <Button
                                onClick={handleNext}
                                disabled={isSubmitting}
                                className="bg-brand-orange hover:bg-brand-orange/90 group"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Processing...
                                    </>
                                ) : currentStep === 2 ? (
                                    'Confirm & Pay'
                                ) : (
                                    <>
                                        Next Step
                                        <ChevronRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </div>

                {/* Order Summary sidebar (hidden on success step) */}
                {currentStep < 3 && (
                    <aside className="lg:sticky lg:top-28 h-fit">
                        <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
                            {/* Tour preview */}
                            <div className="relative h-36">
                                <Image src={tour.imageURL || tour.images?.[0] || ''} alt={tour.title} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                <div className="absolute bottom-3 left-4 right-4 text-white">
                                    <h3 className="font-bold leading-tight line-clamp-2">{tour.title}</h3>
                                    <p className="text-xs text-white/80 flex items-center gap-1 mt-1">
                                        <MapPin className="w-3 h-3" /> {tour.location}
                                    </p>
                                </div>
                            </div>

                            <div className="p-5 space-y-4">
                                {/* Trip facts */}
                                <div className="space-y-2.5 text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="flex items-center gap-2 text-muted-foreground"><Calendar className="w-4 h-4 text-brand-orange" /> Date</span>
                                        <span className="font-medium">
                                            {date ? format(new Date(date), 'MMM dd, yyyy') : 'Flexible'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="flex items-center gap-2 text-muted-foreground"><Users className="w-4 h-4 text-brand-orange" /> Guests</span>
                                        <span className="font-medium">{numberOfGuests} {numberOfGuests === 1 ? 'guest' : 'guests'}</span>
                                    </div>
                                </div>

                                <div className="border-t border-slate-100" />

                                {/* Price breakdown */}
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>{formatPrice(tour.price)} × {numberOfGuests}</span>
                                        <span>{formatPrice(baseAmount)}</span>
                                    </div>
                                    {selectedAddons.map((addon) => (
                                        <div key={addon.name} className="flex justify-between text-muted-foreground">
                                            <span className="truncate pr-2">+ {addon.name}</span>
                                            <span>{formatPrice(addon.price)}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="border-t border-slate-100" />

                                {/* Coupon input */}
                                {appliedCoupon ? (
                                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                                        <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
                                            <Tag className="w-3.5 h-3.5" />
                                            <span>{appliedCoupon.code}</span>
                                            <span className="text-green-600">−{formatPrice(couponDiscount)}</span>
                                        </div>
                                        <button onClick={handleRemoveCoupon} className="text-green-600 hover:text-red-500" aria-label="Remove coupon">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-1.5">
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="Promo code"
                                                value={couponCode}
                                                onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(""); }}
                                                className="h-9 rounded-xl text-sm flex-1"
                                                onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                                            />
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={handleApplyCoupon}
                                                disabled={validateCoupon.isPending || !couponCode.trim()}
                                                className="rounded-xl shrink-0"
                                            >
                                                {validateCoupon.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Apply"}
                                            </Button>
                                        </div>
                                        {couponError && <p className="text-xs text-red-500">{couponError}</p>}
                                    </div>
                                )}

                                <div className="border-t border-slate-100" />

                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-brand-blue">Total</span>
                                    <span className="text-2xl font-bold font-display text-brand-orange">{formatPrice(totalAmount)}</span>
                                </div>

                                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground bg-slate-50 rounded-xl py-2.5">
                                    <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                                    Secure checkout · Free cancellation
                                </div>
                            </div>
                        </div>
                    </aside>
                )}
                </div>
            </div>
        </div>
    );
};
