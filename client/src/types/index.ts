// === Shared API Types ===

export type StaffRole = 'moderator' | 'support' | 'editor' | 'manager' | 'admin';

export type Permission =
    | 'dashboard.view' | 'catalog.manage' | 'content.manage' | 'bookings.manage' | 'finance.view'
    | 'marketing.manage' | 'community.manage' | 'articles.review' | 'users.manage' | 'settings.manage' | 'activity.view';

export interface User {
    _id: string;
    googleId: string;
    displayName: string;
    email: string;
    profilePicture?: string;
    role: StaffRole | 'user';
    /** e.g. "Catalog editor" */
    roleLabel?: string;
    /** What this person may do in the admin area (sent by the server) */
    permissions?: Permission[];
    isSuspended?: boolean;
    /** Admin user list only */
    bookingCount?: number;
    isEmailVerified?: boolean;
    authProvider?: 'local' | 'google';
    createdAt: string;
    updatedAt: string;
}

/** One way a package can be booked: its length (with its own price and day plan) */
export interface TripLength {
    label: string;
    days: number;
    nights: number;
    price: number;
    itinerary: { day: number; activity: string; location: string }[];
}

/** A hotel class a package can be booked with, adding a fixed amount per person */
export interface HotelClass {
    key: string;
    label: string;
    hotel: string;
    features: string;
    extraPerPerson: number;
}

export interface PackageOptions {
    durations: TripLength[];
    hotelClasses: HotelClass[];
}

/** What the traveller picked on a tour with package options (index into durations, hotel class key) */
export interface PackageChoice {
    duration?: number;
    hotelClass?: string;
}

export interface Tour {
    _id: string;
    title: string;
    location: string;
    price: number;
    currency: string;
    duration: {
        days: number;
        nights: number;
    };
    validity: string;
    inclusions: { title: string; included: boolean }[];
    itinerary: { day: number; activity: string; location: string }[];
    imageURL: string;
    images: string[];
    categories: string[];
    emi?: string;
    overview: {
        about: string;
        gallery: { imageURL: string; altText?: string }[];
    };
    reviews: {
        rating: number;
        basedOn: number;
        individualReviews: {
            avatarURL?: string;
            author: string;
            rating: number;
            review: string;
            reviewedOn: string;
        }[];
    };
    maxGroupSize?: number | null;
    isFeatured?: boolean;
    status?: 'active' | 'inactive' | 'draft';
    coordinates?: { lat: number | null; lng: number | null };
    /** Trip lengths and hotel classes to pick from; price, duration and itinerary describe the cheapest */
    packageOptions?: PackageOptions | null;
    /** e.g. "March–June, Sep–Nov" */
    bestTime?: string;
    /** Admin views only */
    updatedBy?: { _id: string; displayName: string } | string;
    createdAt: string;
    updatedAt: string;
}

export interface Booking {
    _id: string;
    user: User | string;
    tour: Tour | string;
    travelDate: string;
    numberOfTravelers: number;
    contactInfo: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
    };
    addons: { name: string; price: number }[];
    /** The trip length and hotel class booked, when the tour offers them */
    packageChoice?: { duration?: string; days?: number; nights?: number; hotelClass?: string; hotelLabel?: string; hotel?: string } | null;
    /** Before any coupon; totalAmount is what was charged */
    subtotalAmount?: number;
    coupon?: { code: string; discount: number };
    totalAmount: number;
    currency: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    paymentId?: string | { _id: string; status: string; amount: number };
    specialRequests?: string;
    cancelledAt?: string;
    refundedAmount?: number;
    /** How the price was converted at checkout */
    unitPrice?: number;
    tourCurrency?: string;
    exchangeRate?: number;
    baseCurrency?: string;
    baseAmount?: number;
    createdAt: string;
    updatedAt: string;
}

export interface Review {
    _id: string;
    tour: string | { _id: string; title: string };
    user: Pick<User, '_id' | 'displayName' | 'profilePicture'> & { email?: string };
    rating: number;
    title?: string;
    content: string;
    isVerifiedBooking: boolean;
    createdAt: string;
}

export interface Destination {
    _id: string;
    name: string;
    slug: string;
    country: string;
    continent: string;
    description: string;
    coverImage: string;
    images: string[];
    highlights?: { title: string; text: string }[];
    bestTimeToVisit?: string;
    coordinates?: { lat: number; lng: number };
    tourCount: number;
    rating: number;
    isActive: boolean;
    createdAt: string;
}

export interface Collection {
    _id: string;
    name: string;
    slug: string;
    description: string;
    coverImage: string;
    tours: Tour[];
    isActive: boolean;
    displayOrder: number;
}

export interface BlogPost {
    _id: string;
    title: string;
    slug: string;
    content: string;
    excerpt: string;
    author: Pick<User, '_id' | 'displayName' | 'profilePicture'>;
    coverImage: string;
    tags: string[];
    status: 'draft' | 'pending' | 'published' | 'rejected';
    /** The editor's note when an article is sent back for changes */
    reviewNote?: string;
    publishedAt?: string;
    updatedAt?: string;
    createdAt: string;
}

export interface Wishlist {
    _id: string;
    user: string;
    tours: Tour[];
}

// API Response types
export interface ApiResponse<T> {
    status: 'success' | 'fail' | 'error';
    message: string;
    data: T;
    errors?: { field: string; message: string }[];
}

export interface Pagination {
    total: number;
    page: number;
    limit: number;
    pages: number;
}

/**
 * A paginated API response. The collection lives under a named key
 * (e.g. `tours`, `bookings`) which is typed as a real array.
 */
export type PaginatedData<T, K extends string = 'tours'> = {
    pagination: Pagination;
} & {
    [P in K]: T[];
};

/** What the dashboard shows depends on the role, so most parts are optional */
export interface DashboardStats {
    totalUsers?: number;
    totalBookings?: number;
    totalTours: number;
    totalReviews?: number;
    totalRevenue?: number;
    /** The base currency revenue is reported in */
    revenueCurrency?: string;
    attention: { pendingArticles?: number; newInquiries?: number; pendingBookings?: number; draftTours?: number };
    catalogHealth?: { noGallery: number; noItinerary: number; expiringSoon: number };
    recentBookings?: Booking[];
    bookingsByStatus?: { _id: string; count: number }[];
}
