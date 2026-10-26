/**
 * Runs after `vite build` (see package.json) through vite-node, so it shares the app's
 * config, types and lib/seo.ts.
 *
 * The site is a single-page app: without this step every URL would answer with the same
 * empty <div id="root"> and the homepage's title, so crawlers that don't run JavaScript
 * (most AI answer engines, link previews) saw no content at all. For each public page this
 * writes an HTML file with its own title, description, canonical link, social tags,
 * structured data and a plain, readable version of the page's content. React replaces that
 * content as soon as the app starts, so visitors see the normal site.
 *
 * Also writes sitemap.xml, robots.txt, spa.html (the app shell for routes that are not
 * prerendered) and 404.html.
 *
 * Settings: SITE_URL (public address of the site) and API_URL, as for the app.
 * PRERENDER_API_URL overrides where data is read from at build time. If the API cannot
 * be reached, only the static pages are prerendered and the build carries on.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { config } from '@/config';
import { FAQS } from '@/lib/faqs';
import { LEGAL_UPDATED, PRIVACY_SECTIONS, TERMS_SECTIONS } from '@/lib/legal';
import {
    DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL,
    articleDescription, articleJsonLd, articlePath, breadcrumbJsonLd, canonicalUrl, collectionJsonLd,
    collectionPath, destinationDescription, destinationJsonLd, destinationPath, faqJsonLd, fullTitle, graph,
    headTags, itemListJsonLd, jsonLdText, organizationJsonLd, plainText, summarize, tourDescription,
    tourJsonLd, tourPath, tourTitle, websiteJsonLd, type BusinessInfo, type JsonLd, type PageMeta,
} from '@/lib/seo';
import type { BlogPost, Collection, Destination, Tour } from '@/types';

// renderArticle sanitises with the DOM, which Node does not have
const { window: domWindow } = new JSDOM('');
Object.assign(globalThis, { DOMParser: domWindow.DOMParser, Node: domWindow.Node, document: domWindow.document });
const { renderArticle } = await import('@/lib/article-html');

const DIST = path.resolve(process.cwd(), 'dist');
const API = (process.env.PRERENDER_API_URL || config.api.baseUrl).replace(/\/+$/, '');

interface Settings extends BusinessInfo {
    faqs?: { question: string; answer: string; order: number }[];
    aboutPage?: {
        heroHeadline?: string; heroSubtext?: string; storyParagraph1?: string; storyParagraph2?: string;
        values?: { title: string; description: string }[];
    };
    features?: { flights?: boolean; hotels?: boolean };
    navLinks?: { label: string; path: string }[];
}

interface Page extends PageMeta {
    body: string;
    jsonLd?: JsonLd;
    /** Last change, for the sitemap */
    lastmod?: string;
    /** Left out of the sitemap (still prerendered) */
    unlisted?: boolean;
}

// ── Fetching ────────────────────────────────────────────────────────────────

let apiDown = false;
async function api<T>(endpoint: string): Promise<T | null> {
    if (apiDown) return null;
    try {
        const res = await fetch(`${API}${endpoint}`, { signal: AbortSignal.timeout(15_000) });
        if (!res.ok) {
            console.warn(`  prerender: ${endpoint} answered ${res.status}`);
            return null;
        }
        return ((await res.json()) as { data: T }).data;
    } catch (err) {
        apiDown = true;
        console.warn(`  prerender: API not reachable at ${API} (${(err as Error).message}); static pages only`);
        return null;
    }
}

// ── HTML helpers ────────────────────────────────────────────────────────────

const esc = (s: unknown) => String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const link = (href: string, text: string) => `<a href="${esc(href)}">${esc(text)}</a>`;
const list = (items: string[], tag = 'ul') => (items.length ? `<${tag}>${items.map((i) => `<li>${i}</li>`).join('')}</${tag}>` : '');
const para = (text?: string) => (text ? `<p>${esc(text)}</p>` : '');
const section = (heading: string, inner: string) => (inner ? `<section><h2>${esc(heading)}</h2>${inner}</section>` : '');

const money = (amount: number, currency = 'USD') => {
    try {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
    } catch {
        return `${currency} ${amount}`;
    }
};
const days = (t: Tour) => (t.duration?.days ? `${t.duration.days} days / ${t.duration.nights} nights` : '');
const tourLine = (t: Tour) =>
    `${link(tourPath(t), t.title)} — ${esc(t.location)}${days(t) ? `, ${esc(days(t))}` : ''}${t.price > 0 ? `, from ${esc(money(t.price, t.currency))}` : ''}`;

const NAV = [
    { label: 'Destinations', path: '/destinations' },
    { label: 'Tours', path: '/tours' },
    { label: 'Collections', path: '/collections' },
    { label: 'Magazine', path: '/blog' },
];
const FOOTER = [
    { label: 'About Us', path: '/about' },
    { label: 'Contact', path: '/contact' },
    { label: 'FAQ', path: '/faq' },
    { label: 'Privacy Policy', path: '/privacy' },
    { label: 'Terms of Service', path: '/terms' },
];

function shell(body: string, nav: { label: string; path: string }[]) {
    return `<div class="prerender">`
        + `<header><nav aria-label="Main">${link('/', SITE_NAME)} ${nav.map((n) => link(n.path, n.label)).join(' ')}</nav></header>`
        + `<main>${body}</main>`
        + `<footer><nav aria-label="Company">${FOOTER.map((n) => link(n.path, n.label)).join(' ')}</nav>`
        + `<p>© ${new Date().getFullYear()} ${esc(SITE_NAME)}</p></footer></div>`;
}

// Plain, readable layout for the moment before the app takes over
const PRERENDER_CSS = '<style>.prerender{max-width:72rem;margin:0 auto;padding:1.5rem 1rem;font:16px/1.6 system-ui,sans-serif;color:#0f172a}'
    + '.prerender nav{display:flex;flex-wrap:wrap;gap:1rem;margin-bottom:1.5rem}.prerender a{color:#0b1f3a}'
    + '.prerender h1{font-size:2rem;line-height:1.2;margin:1rem 0}.prerender h2{font-size:1.35rem;margin:1.75rem 0 .5rem}'
    + '.prerender img{max-width:100%;height:auto}.prerender footer{margin-top:3rem;font-size:.875rem}</style>';

// ── Head ────────────────────────────────────────────────────────────────────

const SEO_TAG = /\s*<(title>[\s\S]*?<\/title>|meta\s+(name|property)="(description|robots|keywords|author|og:[^"]*|twitter:[^"]*)"[^>]*>|link\s+rel="canonical"[^>]*>|script\s+type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>)/gi;

function headHtml(meta: PageMeta | null, siteLd: JsonLd, pageLd?: JsonLd) {
    const tags = meta
        ? headTags(meta).filter((t) => t.value !== undefined)
            .map((t) => `<${t.tag} ${t.key}="${esc(t.keyValue)}" ${t.attr}="${esc(t.value)}">`)
        : [`<meta name="description" content="${esc(DEFAULT_DESCRIPTION)}">`];
    return [
        `<title>${esc(meta ? fullTitle(meta.title) : `${SITE_NAME} — Curated Tours & Holiday Packages`)}</title>`,
        ...tags,
        `<script type="application/ld+json" data-site-jsonld>${jsonLdText(siteLd)}</script>`,
        ...(pageLd ? [`<script type="application/ld+json" data-prerendered-jsonld>${jsonLdText(pageLd)}</script>`] : []),
        PRERENDER_CSS,
    ].map((l) => `  ${l}`).join('\n');
}

const ROOT = /<div id="root">(?:[\s\S]*?<!--\/root-->)?<\/div>/;

function renderDocument(template: string, head: string, root: string) {
    // Safe to run twice on the same build: earlier output is stripped first
    const clean = template.replace(SEO_TAG, '').replace(/\s*<style>\.prerender[\s\S]*?<\/style>/, '');
    if (!ROOT.test(clean)) throw new Error('dist/index.html has no <div id="root"></div> to fill');
    return clean
        .replace('</head>', () => `${head}\n</head>`)
        .replace(ROOT, () => `<div id="root">${root}<!--/root--></div>`);
}

function fileFor(pagePath: string) {
    return pagePath === '/' ? 'index.html' : `${pagePath.replace(/^\//, '')}.html`;
}

// ── Pages ───────────────────────────────────────────────────────────────────

async function main() {
    const template = await readFile(path.join(DIST, 'index.html'), 'utf8');
    console.log(`Prerendering for ${SITE_URL} with data from ${API}`);

    const settings = (await api<{ settings: Settings }>('/settings'))?.settings ?? {};
    const tours = ((await api<{ tours: Tour[] }>('/tours?limit=1000'))?.tours ?? []).filter((t) => (t.status ?? 'active') === 'active');
    const destinations = ((await api<{ destinations: Destination[] }>('/destinations?limit=1000'))?.destinations ?? []).filter((d) => d.isActive !== false);
    const collections = ((await api<{ collections: Collection[] }>('/collections'))?.collections ?? []).filter((c) => c.isActive !== false);
    const posts = ((await api<{ posts: BlogPost[] }>('/blog?limit=1000'))?.posts ?? []).filter((p) => p.status === 'published');

    const nav = settings.navLinks?.length ? settings.navLinks.filter((n) => n.path.startsWith('/')) : NAV;
    const faqs = settings.faqs?.length
        ? [...settings.faqs].sort((a, b) => a.order - b.order)
        : FAQS.map((f, i) => ({ question: f.q, answer: f.a, order: i }));
    const faqHtml = faqs.map((f) => `<h3>${esc(f.question)}</h3>${para(plainText(f.answer))}`).join('');

    const pages: Page[] = [];

    pages.push({
        path: '/',
        title: 'Curated Tours & Holiday Packages',
        description: 'Browse curated tours and holiday packages to destinations worldwide with Wandeazy. Compare day-by-day itineraries and inclusions, then book online securely.',
        jsonLd: graph(websiteJsonLd()),
        body: `<h1>Wandeazy: curated tours and holiday packages worldwide</h1>`
            + para('Browse curated tours and holiday packages, compare day-by-day itineraries and inclusions, then book online securely.')
            + section('Destinations', list(destinations.map((d) => link(destinationPath(d), d.name))))
            + section('Collections', list(collections.map((c) => link(collectionPath(c), c.name))))
            + section('Featured tours', list(tours.filter((t) => t.isFeatured).concat(tours.filter((t) => !t.isFeatured)).slice(0, 8).map(tourLine)))
            + section('Frequently asked questions', faqHtml),
    });

    pages.push({
        path: '/tours',
        title: 'All Tours & Holiday Packages',
        description: 'Compare every Wandeazy tour by destination, price, duration, travel style and traveller rating, then book online.',
        jsonLd: tours.length ? graph(itemListJsonLd(tours.map((t) => ({ name: t.title, path: tourPath(t) })))) : undefined,
        body: `<h1>Find your next adventure</h1>${list(tours.map(tourLine))}`,
    });

    for (const t of tours) {
        const included = (t.inclusions ?? []).filter((i) => i.included).map((i) => esc(i.title));
        const excluded = (t.inclusions ?? []).filter((i) => !i.included).map((i) => esc(i.title));
        const rating = t.reviews?.basedOn > 0 && t.reviews.rating > 0
            ? para(`Rated ${t.reviews.rating} out of 5 by ${t.reviews.basedOn} traveller${t.reviews.basedOn === 1 ? '' : 's'}.`) : '';
        pages.push({
            path: tourPath(t),
            title: tourTitle(t),
            description: tourDescription(t),
            image: t.imageURL || t.images?.[0],
            imageAlt: t.title,
            lastmod: t.updatedAt,
            jsonLd: graph(tourJsonLd(t), breadcrumbJsonLd([{ name: 'Tours', path: '/tours' }, { name: t.title, path: tourPath(t) }])),
            body: `<p>${link('/tours', 'Tours')} › ${esc(t.title)}</p><h1>${esc(t.title)}</h1>`
                + list([
                    `Destination: ${esc(t.location)}`,
                    ...(days(t) ? [`Duration: ${esc(days(t))}`] : []),
                    ...(t.price > 0 ? [`Price: from ${esc(money(t.price, t.currency))} per person`] : []),
                    ...(t.maxGroupSize ? [`Group size: up to ${t.maxGroupSize}`] : []),
                    ...(t.categories?.length ? [`Travel style: ${esc(t.categories.join(', '))}`] : []),
                ])
                + rating
                + section('Overview', para(plainText(t.overview?.about)))
                + section('Itinerary', list((t.itinerary ?? []).map((d) => `<strong>Day ${d.day}${d.location ? ` — ${esc(d.location)}` : ''}:</strong> ${esc(d.activity)}`), 'ol'))
                + section("What's included", list(included))
                + section('Not included', list(excluded)),
        });
    }

    pages.push({
        path: '/destinations',
        title: 'Travel Destinations Worldwide',
        description: 'Explore Wandeazy travel destinations around the world, each with its highlights, best time to visit and the tours you can book there.',
        jsonLd: destinations.length ? graph(itemListJsonLd(destinations.map((d) => ({ name: d.name, path: destinationPath(d) })))) : undefined,
        body: `<h1>Explore the World</h1>${para('From iconic landmarks to hidden gems, discover the destinations that inspire wanderlust.')}`
            + list(destinations.map((d) => `${link(destinationPath(d), d.name)}${d.continent ? ` — ${esc(d.continent)}` : ''}`)),
    });

    for (const d of destinations) {
        const destTours = (await api<{ tours: Tour[] }>(`/tours?destination=${encodeURIComponent(d.slug)}&limit=12`))?.tours ?? [];
        pages.push({
            path: destinationPath(d),
            title: `${d.name} Tours & Travel Guide`,
            description: destinationDescription(d),
            image: d.coverImage,
            imageAlt: d.name,
            jsonLd: graph(destinationJsonLd(d), breadcrumbJsonLd([{ name: 'Destinations', path: '/destinations' }, { name: d.name, path: destinationPath(d) }])),
            body: `<p>${link('/destinations', 'Destinations')} › ${esc(d.name)}</p><h1>${esc(d.name)}</h1>`
                + para(plainText(d.description))
                + list([
                    ...(d.country && d.country !== d.name ? [`Country: ${esc(d.country)}`] : []),
                    ...(d.continent ? [`Region: ${esc(d.continent)}`] : []),
                    ...(d.bestTimeToVisit ? [`Best time to visit: ${esc(d.bestTimeToVisit)}`] : []),
                ])
                + section('Highlights', (d.highlights ?? []).map((h) => `<h3>${esc(h.title)}</h3>${para(h.text)}`).join(''))
                + section(`Tours in ${d.name}`, list(destTours.filter((t) => (t.status ?? 'active') === 'active').map(tourLine))),
        });
    }

    pages.push({
        path: '/collections',
        title: 'Tour Collections by Travel Style',
        description: 'Hand-picked Wandeazy tour collections grouped by travel style, such as beach getaways, adventure and trekking, culture, luxury and honeymoons.',
        jsonLd: collections.length ? graph(itemListJsonLd(collections.map((c) => ({ name: c.name, path: collectionPath(c) })))) : undefined,
        body: `<h1>Our Collections</h1>${list(collections.map((c) => `${link(collectionPath(c), c.name)}${c.description ? ` — ${esc(summarize(c.description, 140))}` : ''}`))}`,
    });

    for (const listed of collections) {
        const c = (await api<{ collection: Collection }>(`/collections/${encodeURIComponent(listed.slug)}`))?.collection ?? listed;
        const cTours = (c.tours ?? []).filter((t) => typeof t === 'object' && (t.status ?? 'active') === 'active');
        pages.push({
            path: collectionPath(c),
            title: `${c.name} Tours`,
            description: summarize(c.description || `${c.name}: a hand-picked collection of Wandeazy tours.`),
            image: c.coverImage,
            imageAlt: c.name,
            jsonLd: graph(collectionJsonLd({ ...c, tours: cTours }), breadcrumbJsonLd([{ name: 'Collections', path: '/collections' }, { name: c.name, path: collectionPath(c) }])),
            body: `<p>${link('/collections', 'Collections')} › ${esc(c.name)}</p><h1>${esc(c.name)}</h1>${para(plainText(c.description))}${list(cTours.map(tourLine))}`,
        });
    }

    pages.push({
        path: '/blog',
        title: 'Travel Magazine: Guides & Tips',
        description: 'Travel guides, packing lists, budget tips and food ideas from the Wandeazy travel magazine, written to help you plan your next trip.',
        jsonLd: posts.length ? graph(itemListJsonLd(posts.map((p) => ({ name: p.title, path: articlePath(p) })))) : undefined,
        body: `<h1>Travel Magazine</h1>${para('Stories, tips, and guides to inspire your next adventure.')}`
            + list(posts.map((p) => `${link(articlePath(p), p.title)}${p.excerpt ? ` — ${esc(summarize(p.excerpt, 160))}` : ''}`)),
    });

    for (const listed of posts) {
        const p = (await api<{ post: BlogPost }>(`/blog/${encodeURIComponent(listed.slug)}`))?.post ?? listed;
        const author = typeof p.author === 'object' ? p.author?.displayName : undefined;
        const published = p.publishedAt || p.createdAt;
        pages.push({
            path: articlePath(p),
            title: p.title,
            description: articleDescription(p),
            image: p.coverImage,
            imageAlt: p.title,
            type: 'article',
            lastmod: p.updatedAt || published,
            jsonLd: graph(articleJsonLd(p), breadcrumbJsonLd([{ name: 'Travel Magazine', path: '/blog' }, { name: p.title, path: articlePath(p) }])),
            body: `<p>${link('/blog', 'Travel Magazine')} › ${esc(p.title)}</p><article><h1>${esc(p.title)}</h1>`
                + `<p>${author ? `By ${esc(author)} · ` : ''}<time datetime="${esc(published)}">${esc(new Date(published).toDateString())}</time></p>`
                + renderArticle(p.content || '') + `</article>`,
        });
    }

    const about = settings.aboutPage ?? {};
    pages.push({
        path: '/about',
        title: 'About Us',
        description: 'Who Wandeazy is, how we put together our tours and what you can expect when you book a trip with us.',
        body: `<h1>${esc(about.heroHeadline || 'About Wandeazy')}</h1>${para(about.heroSubtext)}`
            + section('Our Story', para(about.storyParagraph1) + para(about.storyParagraph2))
            + section('What we stand for', (about.values ?? []).map((v) => `<h3>${esc(v.title)}</h3>${para(v.description)}`).join('')),
    });

    pages.push({
        path: '/contact',
        title: 'Contact Us',
        description: 'Ask about a booking or plan a custom trip with Wandeazy. Send a message or email us and a travel specialist replies within 24 hours.',
        body: `<h1>How can we help?</h1>${para('Plan a trip, ask about a booking or send us a question. A travel specialist replies within 24 hours.')}`
            + list([
                ...(settings.contactEmail ? [`Email: ${link(`mailto:${settings.contactEmail}`, settings.contactEmail)}`] : []),
                ...(settings.contactPhone ? [`Phone: ${link(`tel:${settings.contactPhone.replace(/\s/g, '')}`, settings.contactPhone)}`] : []),
                ...(settings.address ? [`Address: ${esc(settings.address)}`] : []),
            ]),
    });

    pages.push({
        path: '/faq',
        title: 'Frequently Asked Questions',
        description: 'How to book a Wandeazy tour, free cancellation up to 24 hours before departure, accepted payments, what tour prices include, travel insurance and custom itineraries.',
        jsonLd: graph(faqJsonLd(faqs)),
        body: `<h1>Frequently Asked Questions</h1>${para('Everything you need to know before you travel.')}${faqHtml.replace(/<h3>/g, '<h2>').replace(/<\/h3>/g, '</h2>')}`,
    });

    for (const [p, title, description, sections] of [
        ['/privacy', 'Privacy Policy', 'How Wandeazy collects, uses, shares and protects your personal information when you browse, sign up or book a tour.', PRIVACY_SECTIONS],
        ['/terms', 'Terms of Service', 'The terms for using Wandeazy and booking tours, including payments, cancellations and refunds, and your responsibilities as a traveller.', TERMS_SECTIONS],
    ] as const) {
        pages.push({
            path: p, title, description,
            body: `<h1>${title}</h1>${para(`Last updated: ${LEGAL_UPDATED}`)}${sections.map((s) => section(s.title, para(s.body))).join('')}`,
        });
    }

    if (settings.features?.flights) {
        pages.push({
            path: '/flights', title: 'Flights',
            description: 'Search and book flights across India and around the world, linked to your Wandeazy trip.',
            body: `<h1>Flights</h1>${para('Every airline in one search. Line your flights up with your Wandeazy tour.')}`,
        });
    }
    if (settings.features?.hotels) {
        pages.push({
            path: '/hotels', title: 'Hotels',
            description: 'Hand-picked hotels across India and the world, right next to your Wandeazy tour.',
            body: `<h1>Hotels</h1>${para('From palace havelis to beachfront villas, find a stay right next to your tour.')}`,
        });
    }

    // ── Write ───────────────────────────────────────────────────────────────

    const siteLd = graph(organizationJsonLd(settings));
    for (const page of pages) {
        const file = path.join(DIST, fileFor(page.path));
        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(file, renderDocument(template, headHtml(page, siteLd, page.jsonLd), shell(page.body, nav)));
    }

    // App shell for signed-in pages and anything newer than this build (pages set their own tags once loaded)
    await writeFile(path.join(DIST, 'spa.html'), renderDocument(template, headHtml(null, siteLd), ''));
    await writeFile(path.join(DIST, '404.html'), renderDocument(template, headHtml({ title: 'Page Not Found', path: '/404', noIndex: true }, siteLd), ''));

    const today = new Date().toISOString().slice(0, 10);
    const urls = pages.filter((p) => !p.unlisted && !p.noIndex).map((p) => {
        const lastmod = p.lastmod && !Number.isNaN(Date.parse(p.lastmod)) ? new Date(p.lastmod).toISOString().slice(0, 10) : undefined;
        return `  <url><loc>${esc(canonicalUrl(p.path))}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`;
    });
    await writeFile(path.join(DIST, 'sitemap.xml'),
        `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Generated ${today} -->\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);

    await writeFile(path.join(DIST, 'robots.txt'), [
        '# Public pages are open to all crawlers, including AI search and answer engines.',
        'User-agent: *',
        'Allow: /',
        '# Accounts, checkout and staff areas',
        'Disallow: /admin',
        'Disallow: /dashboard',
        'Disallow: /book',
        'Disallow: /bookings/',
        'Disallow: /checkout/',
        'Disallow: /write-article',
        'Disallow: /login',
        'Disallow: /register',
        'Disallow: /forgot-password',
        'Disallow: /reset-password/',
        'Disallow: /verify-email/',
        '',
        `Sitemap: ${SITE_URL}/sitemap.xml`,
        '',
    ].join('\n'));

    console.log(`  prerendered ${pages.length} pages, ${urls.length} in sitemap.xml${apiDown ? ' (API unreachable: static pages only)' : ''}`);
    if (apiDown && process.env.PRERENDER_REQUIRE_API === 'true') {
        throw new Error('PRERENDER_REQUIRE_API is set but the API could not be reached');
    }
}

await main();
