// Article bodies are written by travellers, so whatever they contain is turned
// into a small, safe subset of HTML before it reaches the page.

const ALLOWED_TAGS = new Set([
    'p', 'br', 'hr', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's',
    'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'code', 'pre', 'figure', 'figcaption',
]);
// Removed with everything inside them (their text is never content)
const DROP_WITH_CONTENT = new Set(['script', 'style', 'iframe', 'object', 'embed', 'noscript', 'template', 'svg', 'math', 'form', 'textarea', 'select', 'button']);
// Headings above h2 would compete with the article title
const RENAME: Record<string, string> = { h1: 'h2', h5: 'h4', h6: 'h4', div: 'p', section: 'p', article: 'p' };

const safeUrl = (value: string | null, { images = false } = {}) => {
    if (!value) return null;
    const url = value.trim();
    if (/^https?:\/\//i.test(url)) return url;
    if (!images && (/^mailto:/i.test(url) || /^\/(?!\/)/.test(url) || url.startsWith('#'))) return url;
    return null;
};

function cleanNode(node: Node, doc: Document): Node[] {
    if (node.nodeType === Node.TEXT_NODE) return [doc.createTextNode(node.textContent ?? '')];
    if (node.nodeType !== Node.ELEMENT_NODE) return [];

    const el = node as Element;
    let tag = el.tagName.toLowerCase();
    if (DROP_WITH_CONTENT.has(tag)) return [];
    tag = RENAME[tag] ?? tag;

    const children = Array.from(el.childNodes).flatMap((child) => cleanNode(child, doc));
    // Unknown tags (span, font, table…) are unwrapped: their text stays, the tag goes
    if (!ALLOWED_TAGS.has(tag)) return children;

    const out = doc.createElement(tag);
    if (tag === 'a') {
        const href = safeUrl(el.getAttribute('href'));
        if (!href) return children;
        out.setAttribute('href', href);
        if (/^https?:/i.test(href)) {
            out.setAttribute('target', '_blank');
            out.setAttribute('rel', 'noopener noreferrer nofollow');
        }
    }
    if (tag === 'img') {
        const src = safeUrl(el.getAttribute('src'), { images: true });
        if (!src) return [];
        out.setAttribute('src', src);
        out.setAttribute('alt', el.getAttribute('alt') ?? '');
        out.setAttribute('loading', 'lazy');
    }
    children.forEach((child) => out.appendChild(child));
    return [out];
}

/** Keeps only safe formatting tags and http(s) links/images; drops scripts, styles and event handlers. */
export function sanitizeArticleHtml(html: string): string {
    if (typeof DOMParser === 'undefined') return '';
    const parsed = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
    const out = document.implementation.createHTMLDocument('');
    const wrapper = out.createElement('div');
    Array.from(parsed.body.childNodes).flatMap((n) => cleanNode(n, out)).forEach((n) => wrapper.appendChild(n));
    return wrapper.innerHTML;
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function inlineMarkdown(text: string): string {
    return escapeHtml(text)
        .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img alt="$1" src="$2">')
        .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
        .replace(/(^|[^_\w])_([^_\n]+)_/g, '$1<em>$2</em>');
}

/** The Markdown the editor supports: headings, lists, quotes, bold, italic, links, images. */
export function markdownToHtml(markdown: string): string {
    const blocks = markdown.replace(/\r\n/g, '\n').split(/\n\s*\n/);
    return blocks.map((block) => {
        const lines = block.split('\n').filter((l) => l.trim());
        if (!lines.length) return '';
        const heading = lines[0].match(/^(#{1,4})\s+(.*)$/);
        if (heading && lines.length === 1) {
            const level = Math.min(4, Math.max(2, heading[1].length + 1));
            return `<h${level}>${inlineMarkdown(heading[2])}</h${level}>`;
        }
        if (lines.every((l) => /^\s*[-*+]\s+/.test(l))) {
            return `<ul>${lines.map((l) => `<li>${inlineMarkdown(l.replace(/^\s*[-*+]\s+/, ''))}</li>`).join('')}</ul>`;
        }
        if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) {
            return `<ol>${lines.map((l) => `<li>${inlineMarkdown(l.replace(/^\s*\d+[.)]\s+/, ''))}</li>`).join('')}</ol>`;
        }
        if (lines.every((l) => /^\s*>/.test(l))) {
            return `<blockquote><p>${lines.map((l) => inlineMarkdown(l.replace(/^\s*>\s?/, ''))).join('<br>')}</p></blockquote>`;
        }
        if (lines.length === 1 && /^(-{3,}|\*{3,})$/.test(lines[0].trim())) return '<hr>';
        return `<p>${lines.map(inlineMarkdown).join('<br>')}</p>`;
    }).join('\n');
}

/** Safe HTML for an article body written as HTML or Markdown. */
export function renderArticle(content: string): string {
    const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(content || '');
    return sanitizeArticleHtml(looksLikeHtml ? content : markdownToHtml(content || ''));
}
