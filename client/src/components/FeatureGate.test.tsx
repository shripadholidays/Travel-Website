import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { FeatureGate, FeatureRoute } from './FeatureGate';

const settingsState: { data?: unknown; isLoading: boolean } = { isLoading: false };

vi.mock('@/hooks/use-settings', () => ({
    usePublicSettings: () => settingsState,
}));

function setFeatures(features: { flights: boolean; hotels: boolean } | null, isLoading = false) {
    settingsState.isLoading = isLoading;
    settingsState.data = features ? { settings: { features } } : undefined;
}

const wrap = (ui: React.ReactNode) => render(
    <HelmetProvider><MemoryRouter>{ui}</MemoryRouter></HelmetProvider>,
);

describe('FeatureGate', () => {
    beforeEach(() => setFeatures({ flights: false, hotels: false }));

    it('renders nothing when the service is off', () => {
        wrap(<FeatureGate feature="flights"><p>Flights link</p></FeatureGate>);
        expect(screen.queryByText('Flights link')).toBeNull();
    });

    it('renders children when the service is on', () => {
        setFeatures({ flights: true, hotels: false });
        wrap(<FeatureGate feature="flights"><p>Flights link</p></FeatureGate>);
        expect(screen.getByText('Flights link')).toBeInTheDocument();
    });

    it('stays hidden while settings load', () => {
        setFeatures(null, true);
        wrap(<FeatureGate any><p>Search tabs</p></FeatureGate>);
        expect(screen.queryByText('Search tabs')).toBeNull();
    });

    it('supports "any" service', () => {
        setFeatures({ flights: false, hotels: true });
        wrap(<FeatureGate any><p>Search tabs</p></FeatureGate>);
        expect(screen.getByText('Search tabs')).toBeInTheDocument();
    });
});

describe('FeatureRoute', () => {
    it('shows the normal 404 page when off', () => {
        setFeatures({ flights: false, hotels: false });
        wrap(<FeatureRoute feature="hotels"><p>Hotels page</p></FeatureRoute>);
        expect(screen.queryByText('Hotels page')).toBeNull();
        expect(screen.getByText('404')).toBeInTheDocument();
    });

    it('renders the page when on', () => {
        setFeatures({ flights: false, hotels: true });
        wrap(<FeatureRoute feature="hotels"><p>Hotels page</p></FeatureRoute>);
        expect(screen.getByText('Hotels page')).toBeInTheDocument();
    });
});
