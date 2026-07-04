import { Helmet } from 'react-helmet-async';

interface PageTitleProps {
    title: string;
    description?: string;
    image?: string;
    /** Override the canonical/OG url; defaults to the current location. */
    url?: string;
    type?: 'website' | 'article';
    noIndex?: boolean;
    /** Optional schema.org JSON-LD structured data for rich results. */
    jsonLd?: Record<string, unknown>;
}

const SITE_NAME = 'Wandeazy';
const DEFAULT_DESCRIPTION =
    'Discover and book premium travel experiences to the world\'s most breathtaking destinations with Wandeazy.';

/**
 * Sets the document title plus SEO / Open Graph / Twitter meta tags.
 * Backed by react-helmet-async (provider lives in main.tsx).
 */
export const PageTitle = ({
    title,
    description = DEFAULT_DESCRIPTION,
    image,
    url,
    type = 'website',
    noIndex = false,
    jsonLd,
}: PageTitleProps) => {
    const fullTitle = `${title} | ${SITE_NAME}`;
    const canonical = url ?? (typeof window !== 'undefined' ? window.location.href : undefined);

    return (
        <Helmet>
            <title>{fullTitle}</title>
            <meta name="description" content={description} />
            <meta name="robots" content={noIndex ? 'noindex, nofollow' : 'index, follow'} />
            {canonical && <link rel="canonical" href={canonical} />}

            {/* Open Graph */}
            <meta property="og:type" content={type} />
            <meta property="og:site_name" content={SITE_NAME} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description} />
            {canonical && <meta property="og:url" content={canonical} />}
            {image && <meta property="og:image" content={image} />}

            {/* Twitter */}
            <meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={description} />
            {image && <meta name="twitter:image" content={image} />}

            {/* Structured data */}
            {jsonLd && (
                <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
            )}
        </Helmet>
    );
};
