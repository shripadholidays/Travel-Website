import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { config } from '@/config';

// ── Sub-types ─────────────────────────────────────────────────────────────────

export interface HeroSlide {
    _id?: string;
    title: string;
    subtitle: string;
    image: string;
    color: string;
    ctaLink: string;
    ctaLabel: string;
}

export interface PromoSlide {
    _id?: string;
    partner: string;
    title: string;
    subtitle: string;
    image: string;
    accentColor: string;
    discount: string;
    fromPrice: number;
    searchQuery: string;
}

export interface Testimonial {
    _id?: string;
    name: string;
    role: string;
    image: string;
    quote: string;
    rating: number;
    location: string;
}

export interface FAQ {
    _id?: string;
    question: string;
    answer: string;
    order: number;
}

export interface PlanTripStep {
    _id?: string;
    icon: string;
    title: string;
    description: string;
    link?: string;
}

export interface SupportFeature {
    _id?: string;
    icon: string;
    title: string;
    description: string;
}

export interface ChatMessage {
    _id?: string;
    sender: 'user' | 'assistant';
    text: string;
}

export interface AboutStat {
    _id?: string;
    value: string;
    label: string;
}

export interface AboutValue {
    _id?: string;
    icon: string;
    title: string;
    description: string;
}

export interface NavLink {
    _id?: string;
    label: string;
    path: string;
    order: number;
}

export interface FooterLink {
    _id?: string;
    label: string;
    path: string;
}

// ── Main settings type ────────────────────────────────────────────────────────

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED';
export interface CurrencySettings {
    base: CurrencyCode;
    enabled: CurrencyCode[];
    supported?: CurrencyCode[];
    rates: Record<CurrencyCode, number>;
    updatedAt?: string | null;
    ratesUpdatedAt?: string | null;
}

export interface SiteSettings {
    _id: string;
    companyName: string;
    contactEmail: string;
    contactPhone: string;
    address: string;
    socialLinks: { facebook: string; instagram: string; twitter: string };
    footer: { showQuickLinks: boolean; showNewsletter: boolean; copyrightText: string };
    footerExploreLinks: FooterLink[];
    footerCompanyLinks: FooterLink[];
    navLinks: NavLink[];
    offerBar: {
        enabled: boolean;
        badgeLabel: string;
        text: string;
        countdownEnd: string | null;
        gradientFrom: string;
        gradientTo: string;
        ctaLink: string;
        ctaLabel: string;
    };
    heroSlides: HeroSlide[];
    promoSlides: PromoSlide[];
    planTrip: {
        heading: string;
        subheading: string;
        steps: PlanTripStep[];
    };
    testimonials: Testimonial[];
    supportSection: {
        heading: string;
        subheading: string;
        paragraph: string;
        features: SupportFeature[];
        chatMessages: ChatMessage[];
    };
    faqs: FAQ[];
    aboutPage: {
        heroImage: string;
        heroHeadline: string;
        heroSubtext: string;
        storyParagraph1: string;
        storyParagraph2: string;
        stats: AboutStat[];
        values: AboutValue[];
        ctaHeading: string;
        ctaSubtext: string;
        ctaBtn1Label: string;
        ctaBtn1Link: string;
        ctaBtn2Label: string;
        ctaBtn2Link: string;
    };
    contentSections: { sectionId: string; name: string; description: string; isVisible: boolean }[];
    /** Admin-only switches: when off, that service does not exist on the public site. */
    features: { flights: boolean; hotels: boolean };
    travelMarkup: { flightPct: number; hotelPct: number };
    /** Currencies travellers can pick, the base currency and rates (units per 1 USD) */
    currency?: CurrencySettings;
}

export type TravelFeature = keyof SiteSettings['features'];

export type PublicSettings = Omit<SiteSettings, '_id' | 'travelMarkup'>;

// ── Hooks ─────────────────────────────────────────────────────────────────────

/** Public, read-only settings — used across the marketing site. No auth needed. */
export function usePublicSettings() {
    return useQuery({
        queryKey: ['settings', 'public'],
        queryFn: () => api.get<{ settings: PublicSettings }>('/settings'),
        staleTime: config.query.staleTimeMs,
    });
}

export function useSiteSettings() {
    return useQuery({
        queryKey: ['admin', 'settings'],
        queryFn: () => api.get<{ settings: SiteSettings }>('/admin/settings'),
    });
}

export function useUpdateSiteSettings() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: Partial<SiteSettings>) =>
            api.put<{ settings: SiteSettings }>('/admin/settings', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
            queryClient.invalidateQueries({ queryKey: ['settings', 'public'] });
        },
    });
}

export function useToggleSection() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ sectionId, isVisible }: { sectionId: string; isVisible: boolean }) =>
            api.patch<{ settings: SiteSettings }>(`/admin/settings/sections/${sectionId}`, { isVisible }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] }),
    });
}

export interface Highlights {
    stats: { tours: number; destinations: number; travellers: number; reviews: number; rating: number };
    reviews: {
        _id: string;
        name: string;
        image: string;
        rating: number;
        title: string;
        quote: string;
        tourId: string;
        tourTitle: string;
        location: string;
        verified: boolean;
    }[];
}

/** Live numbers and real traveller reviews (About page, homepage testimonials). */
export function useHighlights() {
    return useQuery({
        queryKey: ['settings', 'highlights'],
        queryFn: () => api.get<Highlights>('/settings/highlights'),
        staleTime: config.query.staleTimeMs,
    });
}

/** About-page stats from real data, leaving out anything still at zero. */
export function liveStats(stats?: Highlights['stats']): AboutStat[] {
    if (!stats) return [];
    const plural = (n: number, word: string) => `${word}${n === 1 ? '' : 's'}`;
    return [
        stats.travellers > 0 && { value: stats.travellers.toLocaleString(), label: `${plural(stats.travellers, 'Traveller')} hosted` },
        stats.tours > 0 && { value: String(stats.tours), label: plural(stats.tours, 'Curated tour') },
        stats.destinations > 0 && { value: String(stats.destinations), label: plural(stats.destinations, 'Destination') },
        stats.reviews > 0 && { value: `${stats.rating}/5`, label: `From ${stats.reviews} ${plural(stats.reviews, 'review')}` },
    ].filter(Boolean) as AboutStat[];
}
