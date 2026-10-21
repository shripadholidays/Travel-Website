import { describe, expect, it } from 'vitest';
import { addonsCopy, stripTravelMentions, withFeatureLinks } from './feature-links';

const base = [
    { label: 'Destinations', path: '/destinations', order: 0 },
    { label: 'Tours', path: '/tours', order: 1 },
    { label: 'Collections', path: '/collections', order: 2 },
];

describe('withFeatureLinks', () => {
    it('adds nothing when both services are off', () => {
        expect(withFeatureLinks(base, { flights: false, hotels: false })).toEqual(base);
    });

    it('inserts enabled services right after Tours', () => {
        const labels = withFeatureLinks(base, { flights: true, hotels: true }).map((l) => l.label);
        expect(labels).toEqual(['Destinations', 'Tours', 'Flights', 'Hotels', 'Collections']);
    });

    it('appends when there is no Tours link and never duplicates', () => {
        const links = [{ label: 'About', path: '/about' }, { label: 'Book flights', path: '/flights' }];
        const result = withFeatureLinks(links, { flights: true, hotels: true });
        expect(result.map((l) => l.path)).toEqual(['/about', '/flights', '/hotels']);
    });

    it('removes admin-entered links to a switched-off service', () => {
        const links = [...base, { label: 'Stays', path: '/hotels?place=Goa', order: 3 }];
        const result = withFeatureLinks(links, { flights: false, hotels: false });
        expect(result.map((l) => l.path)).toEqual(['/destinations', '/tours', '/collections']);
    });
});

describe('copy helpers', () => {
    it('describes only what is switched on', () => {
        expect(addonsCopy({ flights: true, hotels: true })).toBe('Hotels, flights & activities');
        expect(addonsCopy({ flights: true, hotels: false })).toBe('Flights & activities');
        expect(addonsCopy({ flights: false, hotels: true })).toBe('Hotels & activities');
        expect(addonsCopy({ flights: false, hotels: false })).toBe('Activities & experiences');
    });

    it('rewrites copy that mentions hotels or flights', () => {
        const off = { flights: false, hotels: false };
        expect(stripTravelMentions('Hotels, flights, & activities', off)).toBe('Activities & experiences');
        expect(stripTravelMentions('Choose from 100+ locations', off)).toBe('Choose from 100+ locations');
    });
});
