/**
 * Search metadata and schema.org structured data, shared by the live app (PageTitle)
 * and the build-time prerender (scripts/prerender.ts) so both always say the same thing.
 */
import { config } from '@/config';
import type { BlogPost, Collection, Destination, Tour } from '@/types';

export const SITE_NAME = config.app.name;
export const SITE_URL = config.site.url;
export const DEFAULT_DESCRIPTION =
    'Browse and book curated tours to destinations worldwide with Wandeazy: day-by-day itineraries, clear inclusions and secure online booking.';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;
export const LOGO_URL = `${SITE_URL}/logo-512.png`;
export const ORG_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

export type JsonLd = Record<string, unknown>;

/** Absolute URL on the public site for a path such as "/tours". */
export function absoluteUrl(path = '/'): string {
    if (/^https?:\/\//i.test(path)) return path;
    return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/** The one URL search engines should index for a path: no query, no hash, no trailing slash. */
export function canonicalUrl(pathname: string): string {
    const path = pathname.split(/[?#]/)[0].replace(/\/+$/, '');
    return path ? absoluteUrl(path) : `${SITE_URL}/`;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ' };

/** Text content of an HTML or Markdown string, on one line. */
export function plainText(input = ''): string {
    return input
        .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (_, e: string) => ENTITIES[e])
        .replace(/[#*_`>[\]]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/** Shortens text to about `max` characters at a word boundary, for meta descriptions. */
export function summarize(input = '', max = 158): string {
    const text = plainText(input);
    if (text.length <= max) return text;
    const cut = text.slice(0, max - 1);
    const lastSpace = cut.lastIndexOf(' ');
    return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:–—-]+$/, '')}…`;
}

export interface PageMeta {
    title: string;
    description?: string;
    /** Path of this page on the site, e.g. "/tour/123" */
    path: string;
    image?: string;
    imageAlt?: string;
    type?: 'website' | 'article';
    noIndex?: boolean;
}

export interface HeadTag {
    tag: 'meta' | 'link';
    key: 'name' | 'property' | 'rel';
    keyValue: string;
    attr: 'content' | 'href';
    /** undefined = the tag must not be present */
    value?: string;
}

export function fullTitle(title: string): string {
    return title === SITE_NAME || title.endsWith(`| ${SITE_NAME}`) ? title : `${title} | ${SITE_NAME}`;
}

/** Every <meta>/<link> tag a page owns. Pages that must stay out of search get no canonical. */
export function headTags(meta: PageMeta): HeadTag[] {
    const title = fullTitle(meta.title);
    const description = summarize(meta.description || DEFAULT_DESCRIPTION, 160);
    const canonical = meta.noIndex ? undefined : canonicalUrl(meta.path);
    const image = meta.image ? absoluteUrl(meta.image) : DEFAULT_OG_IMAGE;
    const imageAlt = meta.image ? meta.imageAlt || meta.title : `${SITE_NAME} — curated tours and travel`;
    const tag = (t: HeadTag['tag'], key: HeadTag['key'], keyValue: string, value?: string): HeadTag =>
        ({ tag: t, key, keyValue, attr: t === 'link' ? 'href' : 'content', value });

    return [
        tag('meta', 'name', 'description', description),
        tag('meta', 'name', 'robots', meta.noIndex ? 'noindex, follow' : 'index, follow, max-image-preview:large'),
        tag('link', 'rel', 'canonical', canonical),
        tag('meta', 'property', 'og:type', meta.type ?? 'website'),
        tag('meta', 'property', 'og:site_name', SITE_NAME),
        tag('meta', 'property', 'og:locale', 'en_US'),
        tag('meta', 'property', 'og:title', title),
        tag('meta', 'property', 'og:description', description),
        tag('meta', 'property', 'og:url', canonical),
        tag('meta', 'property', 'og:image', image),
        tag('meta', 'property', 'og:image:alt', imageAlt),
        tag('meta', 'name', 'twitter:card', 'summary_large_image'),
        tag('meta', 'name', 'twitter:title', title),
        tag('meta', 'name', 'twitter:description', description),
        tag('meta', 'name', 'twitter:image', image),
    ];
}

/** JSON for an inline <script type="application/ld+json">, safe against "</script>" in content. */
export function jsonLdText(data: JsonLd): string {
    // < and the JS line separators written as escapes, so the JSON can sit inside <script>
    return JSON.stringify(data).replace(/[<\u2028\u2029]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

/** Several schema.org nodes as one document. */
export function graph(...nodes: (JsonLd | null | undefined | false)[]): JsonLd {
    return { '@context': 'https://schema.org', '@graph': nodes.filter(Boolean) };
}

export interface BusinessInfo {
    companyName?: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
    socialLinks?: Partial<Record<string, string>>;
}

/** The business itself. Only details the site actually publishes go in, never placeholders. */
export function organizationJsonLd(info: BusinessInfo = {}): JsonLd {
    const sameAs = Object.values(info.socialLinks ?? {}).filter((u): u is string => !!u && /^https?:\/\//.test(u));
    const legalName = info.companyName && info.companyName !== SITE_NAME ? info.companyName : undefined;
    return {
        '@type': 'TravelAgency',
        '@id': ORG_ID,
        name: SITE_NAME,
        ...(legalName && { alternateName: legalName }),
        url: `${SITE_URL}/`,
        logo: { '@type': 'ImageObject', url: LOGO_URL, width: 512, height: 512 },
        image: DEFAULT_OG_IMAGE,
        description: DEFAULT_DESCRIPTION,
        ...(info.contactEmail && { email: info.contactEmail }),
        ...(info.contactPhone && { telephone: info.contactPhone }),
        ...(info.address && { address: info.address }),
        ...(sameAs.length > 0 && { sameAs }),
    };
}

export function websiteJsonLd(): JsonLd {
    return {
        '@type': 'WebSite',
        '@id': WEBSITE_ID,
        name: SITE_NAME,
        url: `${SITE_URL}/`,
        inLanguage: 'en',
        publisher: { '@id': ORG_ID },
        potentialAction: {
            '@type': 'SearchAction',
            target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/tours?q={search_term_string}` },
            'query-input': 'required name=search_term_string',
        },
    };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]): JsonLd {
    return {
        '@type': 'BreadcrumbList',
        itemListElement: [{ name: 'Home', path: '/' }, ...items].map((item, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: item.name,
            item: canonicalUrl(item.path),
        })),
    };
}

export function itemListJsonLd(items: { name: string; path: string }[]): JsonLd {
    return {
        '@type': 'ItemList',
        numberOfItems: items.length,
        itemListElement: items.map((item, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: item.name,
            url: canonicalUrl(item.path),
        })),
    };
}

export const tourPath = (tour: Pick<Tour, '_id'>) => `/tour/${tour._id}`;
export const destinationPath = (d: Pick<Destination, 'slug'>) => `/destinations/${d.slug}`;
export const collectionPath = (c: Pick<Collection, 'slug'>) => `/collections/${c.slug}`;
export const articlePath = (p: Pick<BlogPost, 'slug'>) => `/blog/${p.slug}`;

const isPublished = (tour: Pick<Tour, 'status'>) => (tour.status ?? 'active') === 'active';

/** "Discover Tokyo: 6-Day Tokyo Tour", or just the title when the duration or place is missing */
export function tourTitle(tour: Tour): string {
    const days = tour.duration?.days;
    const place = tour.location?.split(',')[0].trim();
    return days && place ? `${tour.title}: ${days}-Day ${place} Tour` : tour.title;
}

export function tourDescription(tour: Tour): string {
    const about = plainText(tour.overview?.about);
    // A real overview says it best; a missing or one-line one gets the facts in front
    if (about.length >= 100) return summarize(about);
    const days = tour.duration?.days;
    const where = tour.location ? ` in ${tour.location}` : '';
    const lead = days ? `${days}-day tour${where}: ${tour.title}.` : `${tour.title}${tour.location ? `, ${tour.location}` : ''}.`;
    return summarize(`${lead} ${about}`);
}

/** A bookable tour package. Ratings only appear when real traveller reviews exist. */
export function tourJsonLd(tour: Tour): JsonLd {
    const url = canonicalUrl(tourPath(tour));
    const images = [tour.imageURL, ...(tour.images ?? [])].filter(Boolean);
    const rating = tour.reviews?.rating ?? 0;
    const reviewCount = tour.reviews?.basedOn ?? 0;
    const validUntil = tour.validity ? new Date(tour.validity) : null;
    const bookable = isPublished(tour) && (!validUntil || validUntil.getTime() > Date.now());
    return {
        '@type': 'Product',
        '@id': `${url}#tour`,
        name: tour.title,
        description: plainText(tour.overview?.about) || tourDescription(tour),
        url,
        ...(images.length > 0 && { image: [...new Set(images)] }),
        category: tour.categories?.length ? tour.categories.join(', ') : 'Tour package',
        brand: { '@type': 'Brand', name: SITE_NAME },
        additionalProperty: [
            { '@type': 'PropertyValue', name: 'Destination', value: tour.location },
            ...(tour.duration?.days ? [{ '@type': 'PropertyValue', name: 'Duration', value: `${tour.duration.days} days, ${tour.duration.nights} nights` }] : []),
        ],
        ...(tour.price > 0 && {
            offers: {
                '@type': 'Offer',
                url,
                price: tour.price,
                priceCurrency: tour.currency || 'USD',
                availability: bookable ? 'https://schema.org/InStock' : 'https://schema.org/Discontinued',
                ...(validUntil && !Number.isNaN(validUntil.getTime()) && { priceValidUntil: validUntil.toISOString().slice(0, 10) }),
                seller: { '@id': ORG_ID },
            },
        }),
        ...(rating > 0 && reviewCount > 0 && {
            aggregateRating: { '@type': 'AggregateRating', ratingValue: rating, reviewCount, bestRating: 5, worstRating: 1 },
        }),
    };
}

export function destinationDescription(d: Destination): string {
    return summarize(d.description || `Tours and travel ideas for ${d.name}${d.country && d.country !== d.name ? `, ${d.country}` : ''}.`);
}

export function destinationJsonLd(d: Destination): JsonLd {
    const url = canonicalUrl(destinationPath(d));
    const images = [d.coverImage, ...(d.images ?? [])].filter(Boolean);
    return {
        '@type': 'TouristDestination',
        '@id': `${url}#place`,
        name: d.name,
        description: plainText(d.description),
        url,
        ...(images.length > 0 && { image: [...new Set(images)] }),
        ...(d.country && d.country !== d.name && { containedInPlace: { '@type': 'Country', name: d.country } }),
        ...(d.coordinates?.lat != null && d.coordinates?.lng != null && {
            geo: { '@type': 'GeoCoordinates', latitude: d.coordinates.lat, longitude: d.coordinates.lng },
        }),
    };
}

export function collectionJsonLd(c: Collection): JsonLd {
    const url = canonicalUrl(collectionPath(c));
    return {
        '@type': 'CollectionPage',
        '@id': url,
        url,
        name: c.name,
        description: plainText(c.description),
        isPartOf: { '@id': WEBSITE_ID },
        ...(c.coverImage && { primaryImageOfPage: { '@type': 'ImageObject', url: absoluteUrl(c.coverImage) } }),
        mainEntity: itemListJsonLd((c.tours ?? []).filter(isPublished).map((t) => ({ name: t.title, path: tourPath(t) }))),
    };
}

export function articleDescription(post: BlogPost): string {
    return summarize(post.excerpt || post.content || post.title);
}

export function articleJsonLd(post: BlogPost): JsonLd {
    const url = canonicalUrl(articlePath(post));
    const authorName = typeof post.author === 'object' ? post.author?.displayName : undefined;
    const published = post.publishedAt || post.createdAt;
    return {
        '@type': 'BlogPosting',
        '@id': `${url}#article`,
        mainEntityOfPage: url,
        headline: post.title.length > 110 ? summarize(post.title, 110) : post.title,
        description: articleDescription(post),
        ...(post.coverImage && { image: absoluteUrl(post.coverImage) }),
        datePublished: published,
        dateModified: post.updatedAt || published,
        ...(post.tags?.length && { keywords: post.tags.join(', ') }),
        inLanguage: 'en',
        author: authorName ? { '@type': 'Person', name: authorName } : { '@id': ORG_ID },
        publisher: { '@id': ORG_ID },
    };
}

export function faqJsonLd(items: { question: string; answer: string }[]): JsonLd {
    return {
        '@type': 'FAQPage',
        mainEntity: items.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: { '@type': 'Answer', text: plainText(item.answer) },
        })),
    };
}
