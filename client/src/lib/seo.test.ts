import { describe, expect, it } from 'vitest';
import type { BlogPost, Tour } from '@/types';
import {
    SITE_URL, articleJsonLd, canonicalUrl, headTags, jsonLdText, organizationJsonLd, summarize, tourDescription, tourJsonLd, tourTitle,
} from './seo';

const tour = (overrides: Partial<Tour> = {}): Tour => ({
    _id: 't1', title: 'Discover Tokyo', location: 'Tokyo, Japan', price: 1000, currency: 'USD',
    duration: { days: 6, nights: 5 }, validity: '2099-12-31T00:00:00.000Z', inclusions: [], itinerary: [],
    imageURL: 'https://img.example/tokyo.jpg', images: [], categories: ['City'],
    overview: { about: 'Neon streets and quiet temples.', gallery: [] },
    reviews: { rating: 0, basedOn: 0, individualReviews: [] },
    status: 'active', createdAt: '', updatedAt: '',
    ...overrides,
});

const tags = (meta: Parameters<typeof headTags>[0]) =>
    Object.fromEntries(headTags(meta).map((t) => [t.keyValue, t.value]));

describe('canonicalUrl', () => {
    it('drops the query, hash and trailing slash', () => {
        expect(canonicalUrl('/tour/t1/?utm_source=x#top')).toBe(`${SITE_URL}/tour/t1`);
        expect(canonicalUrl('/')).toBe(`${SITE_URL}/`);
    });
});

describe('headTags', () => {
    it('gives indexable pages a canonical link and a share image', () => {
        const t = tags({ title: 'FAQ', path: '/faq' });
        expect(t.canonical).toBe(`${SITE_URL}/faq`);
        expect(t['og:url']).toBe(`${SITE_URL}/faq`);
        expect(t['og:image']).toBe(`${SITE_URL}/og-image.png`);
        expect(t.robots).toMatch(/^index/);
    });

    it('keeps noindex pages out of search with no canonical', () => {
        const t = tags({ title: 'Login', path: '/login', noIndex: true });
        expect(t.robots).toBe('noindex, follow');
        expect(t.canonical).toBeUndefined();
    });
});

describe('summarize', () => {
    it('cuts at a word boundary and strips markup', () => {
        const text = summarize(`<p>${'word '.repeat(60)}</p>`, 50);
        expect(text.length).toBeLessThanOrEqual(50);
        expect(text).toMatch(/word…$/);
        expect(text).not.toContain('<');
    });
});

describe('tour structured data', () => {
    it('has no rating without traveller reviews', () => {
        expect(tourJsonLd(tour())).not.toHaveProperty('aggregateRating');
        expect(tourJsonLd(tour({ reviews: { rating: 4.5, basedOn: 3, individualReviews: [] } })).aggregateRating)
            .toMatchObject({ ratingValue: 4.5, reviewCount: 3 });
    });

    it('marks hidden or expired tours as not bookable', () => {
        const offer = (t: Tour) => (tourJsonLd(t).offers as { availability: string }).availability;
        expect(offer(tour())).toBe('https://schema.org/InStock');
        expect(offer(tour({ status: 'draft' }))).toBe('https://schema.org/Discontinued');
        expect(offer(tour({ validity: '2000-01-01T00:00:00.000Z' }))).toBe('https://schema.org/Discontinued');
    });

    it('builds a title even when the duration is missing', () => {
        expect(tourTitle(tour())).toBe('Discover Tokyo: 6-Day Tokyo Tour');
        expect(tourTitle(tour({ duration: undefined as unknown as Tour['duration'] }))).toBe('Discover Tokyo');
        expect(() => tourJsonLd(tour({ duration: undefined as unknown as Tour['duration'], overview: undefined as unknown as Tour['overview'] }))).not.toThrow();
    });

    it('describes a tour with a short overview by its facts', () => {
        expect(tourDescription(tour())).toBe('6-day tour in Tokyo, Japan: Discover Tokyo. Neon streets and quiet temples.');
    });
});

describe('organization structured data', () => {
    it('lists only social profiles that are actually set', () => {
        expect(organizationJsonLd({ socialLinks: { facebook: '', instagram: '' } })).not.toHaveProperty('sameAs');
        expect(organizationJsonLd({ socialLinks: { instagram: 'https://instagram.com/real' } }).sameAs).toEqual(['https://instagram.com/real']);
    });
});

describe('article structured data', () => {
    it('credits the site, not a made-up person, when there is no author', () => {
        const post = { _id: 'p', title: 'Packing', slug: 'packing', content: '', excerpt: 'Tips', coverImage: '', tags: [], status: 'published', createdAt: '2026-01-01' } as unknown as BlogPost;
        expect(articleJsonLd(post).author).toEqual({ '@id': `${SITE_URL}/#organization` });
    });
});

describe('jsonLdText', () => {
    it('cannot close the script tag it sits in', () => {
        expect(jsonLdText({ name: '</script><script>alert(1)</script>' })).not.toContain('</script>');
    });
});
