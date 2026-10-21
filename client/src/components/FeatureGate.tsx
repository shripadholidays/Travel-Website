import type { ReactNode } from 'react';
import type { TravelFeature } from '@/hooks/use-settings';
import { useEnabledFeatures, useFeatureState } from '@/hooks/use-feature';
import { NotFound } from '@/pages/NotFound';
import { Spinner } from '@/components/ui/spinner';

type GateProps =
    | { feature: TravelFeature; any?: never; children: ReactNode; fallback?: ReactNode }
    | { any: true; feature?: never; children: ReactNode; fallback?: ReactNode };

/** Renders children only when the service (or any service) is switched on. */
export const FeatureGate = (props: GateProps) => {
    const enabled = useEnabledFeatures();
    const on = props.any ? enabled.any : enabled[props.feature];
    return <>{on ? props.children : (props.fallback ?? null)}</>;
};

/** Route wrapper: a switched-off service renders the normal 404 page, so it looks like it never existed. */
export const FeatureRoute = ({ feature, children }: { feature: TravelFeature; children: ReactNode }) => {
    const { enabled, loading } = useFeatureState(feature);
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Spinner label="Loading…" />
            </div>
        );
    }
    return enabled ? <>{children}</> : <NotFound />;
};
