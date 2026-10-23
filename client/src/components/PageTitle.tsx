import { useEffect } from 'react';

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

/** Creates, updates or (when value is undefined) removes a <meta>/<link> tag in <head>. */
function setHeadTag(tag: 'meta' | 'link', key: 'name' | 'property' | 'rel', keyValue: string, attr: 'content' | 'href', value?: string) {
    let el = document.head.querySelector<HTMLElement>(`${tag}[${key}="${keyValue}"]`);
    if (value === undefined) {
        el?.remove();
        return;
    }
    if (!el) {
        el = document.createElement(tag);
        el.setAttribute(key, keyValue);
        document.head.appendChild(el);
    }
    el.setAttribute(attr, value);
}

/**
 * Sets the document title plus SEO / Open Graph / Twitter meta tags.
 * Written as a plain effect: react-helmet-async does not reliably commit
 * under React 19, which left most pages with the default title.
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
    const jsonLdText = jsonLd ? JSON.stringify(jsonLd) : undefined;

    useEffect(() => {
        const canonical = url ?? window.location.href;
        document.title = fullTitle;

        setHeadTag('meta', 'name', 'description', 'content', description);
        setHeadTag('meta', 'name', 'robots', 'content', noIndex ? 'noindex, nofollow' : 'index, follow');
        setHeadTag('link', 'rel', 'canonical', 'href', canonical);

        setHeadTag('meta', 'property', 'og:type', 'content', type);
        setHeadTag('meta', 'property', 'og:site_name', 'content', SITE_NAME);
        setHeadTag('meta', 'property', 'og:title', 'content', fullTitle);
        setHeadTag('meta', 'property', 'og:description', 'content', description);
        setHeadTag('meta', 'property', 'og:url', 'content', canonical);
        setHeadTag('meta', 'property', 'og:image', 'content', image);

        setHeadTag('meta', 'name', 'twitter:card', 'content', image ? 'summary_large_image' : 'summary');
        setHeadTag('meta', 'name', 'twitter:title', 'content', fullTitle);
        setHeadTag('meta', 'name', 'twitter:description', 'content', description);
        setHeadTag('meta', 'name', 'twitter:image', 'content', image);

        // Structured data belongs to this page only
        let script: HTMLScriptElement | null = null;
        if (jsonLdText) {
            script = document.createElement('script');
            script.type = 'application/ld+json';
            script.dataset.pageJsonld = '';
            script.textContent = jsonLdText;
            document.head.appendChild(script);
        }
        return () => script?.remove();
    }, [fullTitle, description, image, url, type, noIndex, jsonLdText]);

    return null;
};
