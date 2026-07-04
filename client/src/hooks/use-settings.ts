import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

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
}

export type PublicSettings = Omit<SiteSettings, '_id'>;

// ── Hooks ─────────────────────────────────────────────────────────────────────

/** Public, read-only settings — used across the marketing site. No auth needed. */
export function usePublicSettings() {
    return useQuery({
        queryKey: ['settings', 'public'],
        queryFn: () => api.get<{ settings: PublicSettings }>('/settings'),
        staleTime: 5 * 60 * 1000,
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
