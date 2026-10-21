// === Flights & Hotels (public shapes returned by /flights, /hotels, /travel-orders) ===
// All prices are USD (site base currency) and already include WandEazy's markup.

export type TravelKind = 'flight' | 'hotel';
export type Cabin = 'economy' | 'premium_economy' | 'business';

export interface Airport {
    code: string;
    city: string;
    name: string;
    country: string;
}

export interface FlightSlice {
    from: string;
    to: string;
    departDate: string;
    departTime: string;
    arriveTime: string;
    arriveDayOffset: number;
    durationMinutes: number;
    stops: number;
    via: string | null;
    flightNumber: string;
}

export interface FlightOffer {
    id: string;
    kind: 'flight';
    airline: { code: string; name: string };
    cabin: Cabin;
    baggageKg: number;
    refundable: boolean;
    fareRules: string;
    adults: number;
    international: boolean;
    slices: FlightSlice[];
    price: number;
    pricePerAdult: number;
    currency: string;
    expiresAt: string;
}

export interface FlightSearchParams {
    from: string;
    to: string;
    departDate: string;
    returnDate?: string;
    adults: number;
    cabin: Cabin;
}

export interface HotelSummary {
    id: string;
    name: string;
    city: string;
    country: string;
    area: string;
    stars: number;
    rating: number;
    lat: number;
    lng: number;
    amenities: string[];
    tag: string;
    image: string;
}

export interface HotelOffer {
    id: string;
    kind: 'hotel';
    hotel: HotelSummary;
    checkIn: string;
    checkOut: string;
    nights: number;
    rooms: number;
    adults: number;
    roomCode: string;
    roomName: string;
    refundable: boolean;
    cancellationPolicy: string;
    price: number;
    pricePerNight: number;
    currency: string;
    expiresAt: string;
}

export interface HotelDetails extends HotelSummary {
    description: string;
    images: string[];
    roomOffers: HotelOffer[];
}

export interface HotelSearchParams {
    place: string;
    checkIn: string;
    checkOut: string;
    rooms: number;
    adults: number;
}

export interface Place {
    name: string;
    country: string;
}

export interface Traveller {
    title: 'Mr' | 'Ms' | 'Mrs' | 'Mx';
    firstName: string;
    lastName: string;
    passportNumber?: string;
    passportExpiry?: string;
    nationality?: string;
}

export type TravelOrderStatus = 'pending' | 'confirmed' | 'cancelled' | 'failed';

export interface LinkedBookingRef {
    _id: string;
    travelDate?: string;
    tour?: { _id: string; title: string; location?: string } | string;
}

export interface TravelOrder {
    _id: string;
    kind: TravelKind;
    status: TravelOrderStatus;
    providerRef?: string;
    offer: FlightOffer | HotelOffer;
    travellers: Traveller[];
    contact: { email: string; phone?: string };
    pricing: { total: number; currency: string };
    linkedBooking?: LinkedBookingRef | string | null;
    createdAt: string;
}

export interface AdminTravelOrder extends Omit<TravelOrder, 'pricing'> {
    provider: string;
    failureReason?: string;
    user: { _id: string; displayName: string; email: string } | null;
    pricing: { supplierAmount: number; markupPct: number; markupAmount: number; total: number; currency: string };
}

export interface CreateTravelOrderPayload {
    kind: TravelKind;
    offerId: string;
    travellers: Traveller[];
    contact: { email: string; phone?: string };
    linkedBooking?: string;
    quotedTotal?: number;
    acceptPriceChange?: boolean;
}

export type CreateTravelOrderResult =
    | { priceChanged: true; newTotal: number }
    | { priceChanged?: undefined; order: TravelOrder; clientSecret?: string };
