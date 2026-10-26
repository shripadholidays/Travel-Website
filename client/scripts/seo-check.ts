/**
 * Checks the built site (dist/, after `npm run build`) for search problems:
 *   npm run seo:check
 * Every prerendered page needs one title, a description, one H1, a canonical link to
 * itself, parseable structured data and working internal links; titles and descriptions
 * must not repeat; the sitemap must list exactly the indexable pages. Exits 1 on any failure.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const DIST = path.resolve(process.cwd(), 'dist');
// Routes the app serves from spa.html (vercel.json rewrites / nginx.conf)
const APP_ROUTES = /^\/(tour|destinations|collections|blog|hotels|reset-password|verify-email|bookings|checkout|admin)\/|^\/(flights|hotels|login|register|forgot-password|dashboard|book|write-article|admin)$/;

async function htmlFiles(dir: string): Promise<string[]> {
    const out: string[] = [];
    for (const e of await readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory() && e.name !== 'assets') out.push(...await htmlFiles(full));
        else if (e.name.endsWith('.html')) out.push(full);
    }
    return out;
}

const all = (html: string, re: RegExp) => [...html.matchAll(re)].map((m) => m[1]);
const one = (html: string, re: RegExp) => html.match(re)?.[1];

const problems: string[] = [];
const fail = (page: string, msg: string) => problems.push(`${page}: ${msg}`);

const files = await htmlFiles(DIST);
const pagePaths = new Set(files.map((f) => {
    const rel = path.relative(DIST, f).replace(/\\/g, '/').replace(/\.html$/, '');
    return rel === 'index' ? '/' : `/${rel}`;
}));
const sitemap = await readFile(path.join(DIST, 'sitemap.xml'), 'utf8');
const sitemapUrls = new Set(all(sitemap, /<loc>([^<]+)<\/loc>/g));
const robots = await readFile(path.join(DIST, 'robots.txt'), 'utf8');
const origin = one(robots, /Sitemap: (https?:\/\/[^/\s]+)/) ?? '';
if (!origin) problems.push('robots.txt: no Sitemap line');

const seenTitles = new Map<string, string>();
const seenDescriptions = new Map<string, string>();
let indexable = 0;

for (const file of files) {
    const page = path.relative(DIST, file).replace(/\\/g, '/');
    if (page === 'spa.html' || page === '404.html') continue;
    const html = await readFile(file, 'utf8');
    const pagePath = page === 'index.html' ? '/' : `/${page.replace(/\.html$/, '')}`;

    const titles = all(html, /<title>([^<]*)<\/title>/g);
    if (titles.length !== 1) fail(page, `${titles.length} <title> tags`);
    const title = titles[0] ?? '';
    if (seenTitles.has(title)) fail(page, `same title as ${seenTitles.get(title)}`);
    seenTitles.set(title, page);

    const descs = all(html, /<meta name="description" content="([^"]*)"/g);
    if (descs.length !== 1 || descs[0].length < 50) fail(page, `description missing, repeated or too short`);
    else {
        if (seenDescriptions.has(descs[0])) fail(page, `same description as ${seenDescriptions.get(descs[0])}`);
        seenDescriptions.set(descs[0], page);
    }

    const noindex = /<meta name="robots" content="noindex/.test(html);
    const canonical = all(html, /<link rel="canonical" href="([^"]*)"/g);
    if (!noindex) {
        indexable += 1;
        const expected = `${origin}${pagePath === '/' ? '/' : pagePath}`;
        if (canonical.length !== 1 || canonical[0] !== expected) fail(page, `canonical ${canonical.join(', ') || 'missing'} (expected ${expected})`);
        if (!sitemapUrls.has(expected)) fail(page, 'indexable but not in sitemap.xml');
        if (!one(html, /<meta property="og:image" content="([^"]+)"/)) fail(page, 'no og:image');
    }

    const root = one(html, /<div id="root">([\s\S]*?)<!--\/root-->/) ?? '';
    const h1s = all(root, /<h1[^>]*>([\s\S]*?)<\/h1>/g);
    if (h1s.length !== 1) fail(page, `${h1s.length} <h1> in the prerendered content`);
    if (root.replace(/<[^>]+>/g, ' ').trim().length < 80) fail(page, 'almost no readable content');

    for (const ld of all(html, /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
        try {
            const data = JSON.parse(ld);
            if (data['@context'] !== 'https://schema.org') fail(page, 'JSON-LD without schema.org context');
            if (/"(undefined|null|NaN)"|:null[,}]/.test(ld)) fail(page, 'JSON-LD contains empty values');
        } catch {
            fail(page, 'JSON-LD does not parse');
        }
    }

    for (const href of new Set(all(root, /<a href="(\/[^"#?]*)"/g))) {
        const target = href.length > 1 ? href.replace(/\/$/, '') : href;
        if (!pagePaths.has(target) && !APP_ROUTES.test(target)) fail(page, `link to ${href} leads to a 404`);
    }
}

for (const url of sitemapUrls) {
    const p = url.slice(origin.length) || '/';
    if (!pagePaths.has(p)) fail('sitemap.xml', `${url} has no page`);
}

console.log(`Checked ${files.length - 2} pages (${indexable} indexable, ${sitemapUrls.size} in sitemap) for ${origin}`);
if (problems.length) {
    console.error(problems.map((p) => `  ✗ ${p}`).join('\n'));
    process.exit(1);
}
console.log('  ✓ no problems found');
