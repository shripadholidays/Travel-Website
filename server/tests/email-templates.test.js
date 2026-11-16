const { compose } = require('../src/services/email-service');

describe('email templates', () => {
    const mail = compose({
        preview: 'Preview line',
        heading: 'Your booking is confirmed',
        greeting: 'Hi Asha,',
        lines: ['Thanks <b>for</b> booking.'],
        details: [['Reference', 'ABCD1234'], ['Empty', ''], ['Travellers', 2]],
        button: { label: 'View your booking', url: 'https://planyourtours.com/bookings/1' },
        reason: 'You booked a trip with us.',
    });

    it('sends a plain-text copy with the same content (keeps mail out of Promotions)', () => {
        expect(mail.text).toContain('Your booking is confirmed');
        expect(mail.text).toContain('Reference: ABCD1234');
        expect(mail.text).toContain('View your booking: https://planyourtours.com/bookings/1');
        expect(mail.text).not.toContain('Empty:');
    });

    it('has no images, tracking pixels or more than one button link', () => {
        expect(mail.html).not.toMatch(/<img/i);
        expect(mail.html.match(/href="https:\/\/planyourtours\.com\/bookings\/1"/g)).toHaveLength(2); // button + written-out link
    });

    it('escapes customer text', () => {
        expect(mail.html).toContain('Thanks &lt;b&gt;for&lt;/b&gt; booking.');
    });

    it('team alerts skip the customer sign-off', () => {
        const alert = compose({ heading: 'New inquiry', reason: 'Team alert.', team: true });
        expect(alert.text).not.toContain('Warm regards');
        expect(alert.text).not.toContain('Just reply');
    });
});
