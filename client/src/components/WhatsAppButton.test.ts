import { describe, it, expect, beforeEach } from 'vitest';
import { buildWhatsAppMessage } from './WhatsAppButton';
import { config } from '@/config';

describe('buildWhatsAppMessage', () => {
    beforeEach(() => { document.title = `Kerala Backwaters | ${config.app.name}`; });

    it('starts with a bold header and the greeting', () => {
        const lines = buildWhatsAppMessage('/').split('\n');
        expect(lines[0]).toBe(`*Trip enquiry: ${config.app.name}*`);
        expect(lines[2]).toBe(config.whatsapp.message);
    });

    it('names the tour and links to it on a tour page', () => {
        const text = buildWhatsAppMessage('/tour/abc');
        expect(text).toContain('*Tour:* Kerala Backwaters');
        expect(text).toContain('*Link:* ');
    });

    it('leaves the page out on general pages but keeps the details to fill in', () => {
        const text = buildWhatsAppMessage('/about');
        expect(text).not.toContain('*Link:*');
        expect(text).toContain('*My details*\nName: \nTravel dates: \nNumber of travellers: \nDeparture city: ');
    });
});
