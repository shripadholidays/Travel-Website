import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { fullTitle, headTags, jsonLdText, type HeadTag, type JsonLd } from '@/lib/seo';

interface PageTitleProps {
    title: string;
    description?: string;
    image?: string;
    imageAlt?: string;
    /** Path to canonicalise to; defaults to the current path (query string dropped). */
    path?: string;
    type?: 'website' | 'article';
    noIndex?: boolean;
    /** Optional schema.org JSON-LD structured data for this page. */
    jsonLd?: JsonLd;
}

/** Creates, updates or (when value is undefined) removes a <meta>/<link> tag in <head>. */
function setHeadTag({ tag, key, keyValue, attr, value }: HeadTag) {
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
 * The same tags are written into the HTML at build time by scripts/prerender.ts.
 */
export const PageTitle = ({
    title,
    description,
    image,
    imageAlt,
    path,
    type = 'website',
    noIndex = false,
    jsonLd,
}: PageTitleProps) => {
    const { pathname } = useLocation();
    const pagePath = path ?? pathname;
    const ldText = jsonLd ? jsonLdText(jsonLd) : undefined;

    useEffect(() => {
        document.title = fullTitle(title);
        headTags({ title, description, path: pagePath, image, imageAlt, type, noIndex }).forEach(setHeadTag);

        // The prerendered page's structured data is replaced by the live page's own
        document.head.querySelectorAll('script[data-prerendered-jsonld]').forEach((el) => el.remove());
        let script: HTMLScriptElement | null = null;
        if (ldText) {
            script = document.createElement('script');
            script.type = 'application/ld+json';
            script.dataset.pageJsonld = '';
            script.textContent = ldText;
            document.head.appendChild(script);
        }
        return () => script?.remove();
    }, [title, description, pagePath, image, imageAlt, type, noIndex, ldText]);

    return null;
};
