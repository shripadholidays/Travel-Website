import { useEffect, useState } from 'react';
import { BedDouble, Loader2, Plane, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useUpdateSiteSettings, type SiteSettings } from '@/hooks/use-settings';

const SERVICES = [
    { key: 'flights' as const, markupKey: 'flightPct' as const, label: 'Flights', icon: Plane, note: 'India & international · mock provider (sandbox-ready)' },
    { key: 'hotels' as const, markupKey: 'hotelPct' as const, label: 'Hotels', icon: BedDouble, note: 'India & worldwide · mock provider (sandbox-ready)' },
];

/** Admin-only switches. Off = the service disappears from the public site entirely. */
export const BookingServicesCard = ({ settings }: { settings: SiteSettings | undefined }) => {
    const updateSettings = useUpdateSiteSettings();
    const [features, setFeatures] = useState({ flights: false, hotels: false });
    const [markup, setMarkup] = useState({ flightPct: 5, hotelPct: 8 });

    useEffect(() => {
        if (!settings) return;
        setFeatures({ flights: !!settings.features?.flights, hotels: !!settings.features?.hotels });
        setMarkup({ flightPct: settings.travelMarkup?.flightPct ?? 5, hotelPct: settings.travelMarkup?.hotelPct ?? 8 });
    }, [settings]);

    const save = async () => {
        const toastId = toast.loading('Saving booking services...');
        try {
            await updateSettings.mutateAsync({ features, travelMarkup: markup });
            toast.success('Booking services saved', { id: toastId });
        } catch {
            toast.error('Failed to save', { id: toastId });
        }
    };

    return (
        <Card className="md:col-span-2">
            <CardHeader>
                <CardTitle>Booking services</CardTitle>
                <CardDescription>
                    When a service is off it disappears from the public website completely: menus, pages, home search,
                    tour pages and traveller dashboards. Orders always stay visible here in Travel Orders.
                </CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-slate-100">
                {SERVICES.map(({ key, markupKey, label, icon: Icon, note }) => (
                    <div key={key} className="flex flex-wrap items-center gap-4 py-4 first:pt-0">
                        <span aria-hidden="true" className="w-11 h-11 rounded-full bg-brand-orange/10 text-brand-orange flex items-center justify-center">
                            <Icon className="w-5 h-5" />
                        </span>
                        <div className="flex-1 min-w-[180px]">
                            <p className="font-bold">{label}</p>
                            <p className="text-sm text-muted-foreground">{note}</p>
                        </div>
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
                            Markup %
                            <Input
                                type="number"
                                min={0}
                                max={50}
                                step={0.5}
                                value={markup[markupKey]}
                                onChange={(e) => setMarkup((m) => ({ ...m, [markupKey]: Number(e.target.value) }))}
                                className="w-20 text-right tabular-nums"
                            />
                        </label>
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={features[key]}
                                onCheckedChange={(on: boolean) => setFeatures((f) => ({ ...f, [key]: on }))}
                                aria-label={`${label} ${features[key] ? 'on' : 'off'}`}
                            />
                            <span className={features[key] ? 'w-8 text-sm font-bold text-brand-orange' : 'w-8 text-sm font-bold text-muted-foreground'}>
                                {features[key] ? 'On' : 'Off'}
                            </span>
                        </div>
                    </div>
                ))}
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
                <Button onClick={save} disabled={updateSettings.isPending} className="ml-auto gap-2 bg-brand-blue">
                    {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save booking services
                </Button>
            </CardFooter>
        </Card>
    );
};
