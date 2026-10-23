import { describe, expect, it } from 'vitest';
import { markdownToHtml, renderArticle, sanitizeArticleHtml } from './article-html';

describe('article html', () => {
    it('removes scripts, event handlers and javascript: links', () => {
        const html = sanitizeArticleHtml(
            '<p onclick="steal()">Hi<script>alert(1)</script></p><a href="javascript:alert(1)">x</a><img src="x" onerror="alert(1)"><iframe src="https://evil"></iframe>'
        );
        expect(html).toBe('<p>Hi</p>x');
    });

    it('keeps safe formatting and opens outside links safely', () => {
        const html = sanitizeArticleHtml('<h1>T</h1><p><strong>b</strong> <a href="https://a.com">a</a></p><img src="https://i.com/x.jpg" alt="x">');
        expect(html).toContain('<h2>T</h2>');
        expect(html).toContain('<strong>b</strong>');
        expect(html).toContain('rel="noopener noreferrer nofollow"');
        expect(html).toContain('<img src="https://i.com/x.jpg" alt="x" loading="lazy">');
    });

    it('turns markdown into headings, lists and paragraphs', () => {
        const html = markdownToHtml('## Packing\n\n- socks\n- **shoes**\n\nPlain *text* with [link](https://a.com)');
        expect(html).toContain('<h3>Packing</h3>');
        expect(html).toContain('<ul><li>socks</li><li><strong>shoes</strong></li></ul>');
        expect(html).toContain('<em>text</em>');
        expect(html).toContain('<a href="https://a.com">link</a>');
    });

    it('never lets markdown smuggle in html', () => {
        expect(renderArticle('Hello <img src=x onerror=alert(1)>')).not.toContain('onerror');
        expect(renderArticle('[x](javascript:alert(1))')).not.toContain('javascript:');
    });
});
