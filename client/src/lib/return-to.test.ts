import { beforeEach, describe, expect, it } from 'vitest';
import { rememberReturnTo, takeReturnTo } from './return-to';

describe('return-to after sign-in', () => {
    beforeEach(() => sessionStorage.clear());

    it('round-trips the page and booking state once', () => {
        rememberReturnTo({ pathname: '/book', search: '', state: { tourId: 't1', date: '2026-12-01', guests: 3 } });
        expect(takeReturnTo()).toEqual({ pathname: '/book', search: '', state: { tourId: 't1', date: '2026-12-01', guests: 3 } });
        expect(takeReturnTo()).toBeNull();
    });

    it('never returns to auth pages or off-site URLs', () => {
        rememberReturnTo({ pathname: '/login' });
        expect(takeReturnTo()).toBeNull();
        rememberReturnTo({ pathname: '//evil.example.com/x' });
        expect(takeReturnTo()).toBeNull();
        sessionStorage.setItem('wandeazy.returnTo', JSON.stringify({ pathname: 'https://evil.example.com' }));
        expect(takeReturnTo()).toBeNull();
    });
});
