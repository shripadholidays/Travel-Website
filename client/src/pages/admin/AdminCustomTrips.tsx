import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Route } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState, PageHeader, SearchField } from '@/components/admin/AdminUI';
import { CustomTripBoard, type TripStatus } from '@/components/admin/CustomTripBoard';
import { CustomTripDetail } from '@/components/admin/CustomTripDetail';
import { TripPriceEditor } from '@/components/admin/TripPriceEditor';
import { useAuth } from '@/context/AuthContext';
import { useDebounced } from '@/hooks/use-debounced';
import { useAdminCustomTrips, useUpdateCustomTrip } from '@/hooks/use-trip-builder';
import { hasPermission } from '@/lib/admin-access';
import type { CustomTrip } from '@/lib/trip-builder';

export const AdminCustomTrips = () => {
    const { user } = useAuth();
    const canHandle = hasPermission(user, 'bookings.manage');
    const canPrice = hasPermission(user, 'catalog.manage');
    const [params, setParams] = useSearchParams();
    const tab = params.get('tab') === 'prices' || !canHandle ? 'prices' : 'board';

    return (
        <div className="space-y-6">
            <PageHeader
                title="Custom Trips"
                description="Trips travellers built themselves in the trip builder. Drag a card to move it along, or open it to send the final price."
            />
            <Tabs value={tab} onValueChange={(v) => setParams(v === 'board' ? {} : { tab: v }, { replace: true })}>
                {canHandle && canPrice && (
                    <TabsList>
                        <TabsTrigger value="board">Trip requests</TabsTrigger>
                        <TabsTrigger value="prices">Builder prices</TabsTrigger>
                    </TabsList>
                )}
                {canHandle && <TabsContent value="board"><Board /></TabsContent>}
                {canPrice && <TabsContent value="prices"><TripPriceEditor /></TabsContent>}
            </Tabs>
        </div>
    );
};

function Board() {
    const [params, setParams] = useSearchParams();
    const [search, setSearch] = useState('');
    const debounced = useDebounced(search, 300);
    const { data, isLoading } = useAdminCustomTrips({ search: debounced });
    const update = useUpdateCustomTrip();
    const [open, setOpen] = useState<{ trip: CustomTrip; askPrice?: boolean } | null>(null);
    const trips = data?.trips ?? [];

    // Links in the team's email alert open the trip straight away
    const linked = params.get('trip');
    useEffect(() => {
        if (!linked || !data) return;
        const trip = data.trips.find((t) => t._id === linked);
        if (trip) setOpen({ trip });
        const next = new URLSearchParams(params);
        next.delete('trip');
        setParams(next, { replace: true });
    }, [linked, data, params, setParams]);

    const move = (trip: CustomTrip, status: TripStatus) => {
        // A trip is only "priced" once it has a price: ask for it first
        if (status === 'quoted' && !trip.quote) {
            setOpen({ trip, askPrice: true });
            return;
        }
        update.mutate(
            { id: trip._id, changes: { status } },
            {
                onSuccess: () => toast.success(status === 'quoted' ? `Price sent to ${trip.email}` : 'Trip moved'),
                onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not move the trip'),
            },
        );
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <SearchField value={search} onChange={setSearch} placeholder="Name, email or place…" className="sm:w-80" />
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="grid gap-3 lg:grid-cols-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-64 rounded-3xl" />)}</div>
                ) : trips.length === 0 && !debounced ? (
                    <EmptyState icon={Route} title="No custom trips yet" description="When travellers send a trip from the trip builder (/build-trip), it lands here." />
                ) : (
                    <CustomTripBoard trips={trips} onMove={move} onOpen={(trip) => setOpen({ trip })} />
                )}
            </CardContent>
            {open && <CustomTripDetail trip={open.trip} askPrice={open.askPrice} onClose={() => setOpen(null)} />}
        </Card>
    );
}
