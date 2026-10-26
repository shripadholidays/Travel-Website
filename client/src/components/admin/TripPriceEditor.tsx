import { useEffect, useMemo, useState } from "react";
import { ChevronDown, EyeOff, Loader2, Plus, Save, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrency } from "@/context/CurrencyContext";
import { useAdminTripBuilder, useSaveTripBuilder } from "@/hooks/use-trip-builder";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { ICON_NAMES, resolveIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { PER_LABELS, type BuilderActivity, type BuilderExtra, type BuilderHotelClass, type BuilderPlace, type ExtraPer, type TripBuilderCatalogue } from "@/lib/trip-builder";
import { SearchField } from "./AdminUI";
import { SortableRows } from "./SortableRows";

// Rows get a browser-only key so they can be dragged and edited; it is dropped before saving
type Keyed<T> = T & { _key: string };
type EditPlace = Keyed<Omit<BuilderPlace, "activities">> & { activities: Keyed<BuilderActivity>[] };
interface Editable extends Omit<TripBuilderCatalogue, "places" | "hotelClasses" | "extras"> {
    places: EditPlace[];
    hotelClasses: Keyed<BuilderHotelClass>[];
    extras: Keyed<BuilderExtra>[];
}

let n = 0;
const key = () => `k${(n++).toString(36)}`;
const withKeys = (b: TripBuilderCatalogue): Editable => ({
    ...b,
    places: b.places.map((p) => ({ ...p, _key: key(), activities: p.activities.map((a) => ({ ...a, _key: key() })) })),
    hotelClasses: b.hotelClasses.map((h) => ({ ...h, _key: key() })),
    extras: b.extras.map((x) => ({ ...x, _key: key() })),
});
const strip = <T extends { _key: string }>({ _key, ...rest }: T) => rest;
const withoutKeys = (e: Editable): TripBuilderCatalogue => ({
    ...e,
    places: e.places.map((p) => ({ ...strip(p), activities: p.activities.map(strip) })),
    hotelClasses: e.hotelClasses.map(strip),
    extras: e.extras.map(strip),
});

const num = (v: string) => v.replace(/[^0-9]/g, "");

/** The trip builder's price list: places and their nightly prices, hotel classes, extras and limits */
export function TripPriceEditor() {
    const { data, isLoading } = useAdminTripBuilder();
    const save = useSaveTripBuilder();
    const [edit, setEdit] = useState<Editable | null>(null);
    const [saved, setSaved] = useState("");

    useEffect(() => {
        if (data?.builder) {
            const e = withKeys(data.builder);
            setEdit(e);
            setSaved(JSON.stringify(withoutKeys(e)));
        }
    }, [data]);

    const dirty = !!edit && JSON.stringify(withoutKeys(edit)) !== saved;
    useUnsavedChanges(dirty);

    if (isLoading || !edit) return <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}</div>;

    const set = (changes: Partial<Editable>) => setEdit((e) => (e ? { ...e, ...changes } : e));
    const submit = async () => {
        try {
            await save.mutateAsync(withoutKeys(edit));
            toast.success("Trip builder prices saved. Travellers see them straight away.");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not save");
        }
    };

    return (
        <div className="space-y-4 pb-20">
            {data?.isStartingList && (
                <p className="rounded-2xl bg-blue-50 text-blue-800 text-sm px-4 py-3 text-pretty">
                    These are the starting prices, worked out from your packages: each place's price per night comes from the packages that visit it.
                    Change anything and save to make it yours.
                </p>
            )}
            <Tabs defaultValue="places">
                <TabsList className="flex-wrap h-auto">
                    <TabsTrigger value="places">Places ({edit.places.length})</TabsTrigger>
                    <TabsTrigger value="hotels">Hotel classes</TabsTrigger>
                    <TabsTrigger value="extras">Extras ({edit.extras.length})</TabsTrigger>
                    <TabsTrigger value="rules">Limits</TabsTrigger>
                </TabsList>
                <TabsContent value="places"><PlacesEditor places={edit.places} currency={edit.currency} onChange={(places) => set({ places })} /></TabsContent>
                <TabsContent value="hotels"><HotelsEditor hotels={edit.hotelClasses} onChange={(hotelClasses) => set({ hotelClasses })} /></TabsContent>
                <TabsContent value="extras"><ExtrasEditor extras={edit.extras} onChange={(extras) => set({ extras })} /></TabsContent>
                <TabsContent value="rules"><RulesEditor value={edit} onChange={set} /></TabsContent>
            </Tabs>

            {/* Save bar */}
            <div className={cn(
                "fixed bottom-4 right-4 left-4 lg:left-auto z-30 flex items-center justify-end gap-2 rounded-2xl bg-white/95 backdrop-blur p-2 pl-4 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.3),0_0_0_1px_rgba(15,23,42,0.06)] transition-[opacity,translate] duration-200",
                dirty ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none",
            )} aria-hidden={!dirty}>
                <span className="text-sm text-slate-600 mr-auto lg:mr-2">You have unsaved changes</span>
                <Button variant="ghost" size="sm" onClick={() => { const e = withKeys(JSON.parse(saved)); setEdit(e); }} tabIndex={dirty ? 0 : -1}>
                    <Undo2 className="w-4 h-4 mr-1.5" aria-hidden /> Undo
                </Button>
                <Button variant="brand" size="sm" onClick={submit} disabled={save.isPending} tabIndex={dirty ? 0 : -1}>
                    {save.isPending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" aria-hidden /> : <Save className="w-4 h-4 mr-1.5" aria-hidden />} Save prices
                </Button>
            </div>
        </div>
    );
}

function PlacesEditor({ places, currency, onChange }: { places: EditPlace[]; currency: string; onChange: (p: EditPlace[]) => void }) {
    const { formatPrice } = useCurrency();
    const [search, setSearch] = useState("");
    const [open, setOpen] = useState<string | null>(null);
    const q = search.trim().toLowerCase();
    const shown = useMemo(() => (q ? places.filter((p) => `${p.name} ${p.region} ${p.country}`.toLowerCase().includes(q)) : places), [places, q]);
    const update = (k: string, changes: Partial<EditPlace>) => onChange(places.map((p) => (p._key === k ? { ...p, ...changes } : p)));
    const add = () => {
        const fresh: EditPlace = {
            _key: key(), id: "", name: "", region: "", country: "India", image: "", nightlyFrom: 3000, nightlyTo: 4000,
            minNights: 1, maxNights: 7, suggestedNights: 2, hidden: false, activities: [],
        };
        onChange([fresh, ...places]);
        setOpen(fresh._key);
        setSearch("");
    };

    return (
        <Card>
            <CardHeader className="gap-3 sm:flex-row sm:items-end sm:justify-between space-y-0">
                <div>
                    <CardTitle>Places</CardTitle>
                    <CardDescription className="text-pretty">Prices are per person, per night, with Economy hotels, transfers and sightseeing. Drag to set the order travellers see.</CardDescription>
                </div>
                <div className="flex gap-2">
                    <SearchField value={search} onChange={setSearch} placeholder="Find a place…" className="sm:w-56" />
                    <Button onClick={add} className="shrink-0"><Plus className="w-4 h-4 mr-1.5" aria-hidden /> Add place</Button>
                </div>
            </CardHeader>
            <CardContent>
                {q && <p className="text-xs text-muted-foreground mb-2">Clear the search to drag places into a new order.</p>}
                <SortableRows
                    items={shown}
                    disabled={!!q}
                    label={(p) => p.name}
                    onChange={(rows) => onChange(rows)}
                    render={(p, _i, handle) => {
                        const isOpen = open === p._key;
                        return (
                            <div className={cn("rounded-2xl bg-white shadow-[0_0_0_1px_rgba(15,23,42,0.08)]", p.hidden && "bg-slate-50")}>
                                <div className="flex items-center gap-2 p-2">
                                    {handle}
                                    {p.image ? <img src={p.image.replace(/w=\d+/, "w=120")} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" /> : <span className="w-10 h-10 rounded-lg bg-slate-100 shrink-0" />}
                                    <button type="button" onClick={() => setOpen(isOpen ? null : p._key)} aria-expanded={isOpen} className="min-w-0 flex-1 text-left">
                                        <span className={cn("block text-sm font-medium truncate", p.hidden && "text-slate-500")}>{p.name || "New place"}</span>
                                        <span className="block text-xs text-muted-foreground truncate tabular-nums">
                                            {p.country === "India" ? p.region : p.country} · {formatPrice(p.nightlyFrom, currency)}–{formatPrice(p.nightlyTo, currency)}/night · {p.activities.length} ideas
                                        </span>
                                    </button>
                                    {p.hidden && <span className="hidden sm:inline-flex items-center gap-1 text-xs text-slate-500"><EyeOff className="w-3.5 h-3.5" aria-hidden /> Hidden</span>}
                                    <button type="button" onClick={() => setOpen(isOpen ? null : p._key)} aria-label={isOpen ? `Close ${p.name}` : `Edit ${p.name}`} className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100">
                                        <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
                                    </button>
                                </div>
                                {isOpen && (
                                    <div className="border-t border-slate-100 p-4 space-y-4">
                                        <div className="grid gap-3 sm:grid-cols-3">
                                            <Field label="Name"><Input value={p.name} onChange={(e) => update(p._key, { name: e.target.value })} placeholder="Shimla" /></Field>
                                            <Field label="Region / state"><Input value={p.region} onChange={(e) => update(p._key, { region: e.target.value })} placeholder="Himachal Pradesh" /></Field>
                                            <Field label="Country"><Input value={p.country} onChange={(e) => update(p._key, { country: e.target.value })} /></Field>
                                        </div>
                                        <Field label="Photo address (URL)"><Input value={p.image} onChange={(e) => update(p._key, { image: e.target.value })} placeholder="https://…" /></Field>
                                        <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
                                            <Field label="Per night from"><Input inputMode="numeric" className="tabular-nums" value={p.nightlyFrom} onChange={(e) => update(p._key, { nightlyFrom: Number(num(e.target.value)) })} /></Field>
                                            <Field label="Per night up to"><Input inputMode="numeric" className="tabular-nums" value={p.nightlyTo} onChange={(e) => update(p._key, { nightlyTo: Number(num(e.target.value)) })} /></Field>
                                            <Field label="Fewest nights"><Input inputMode="numeric" className="tabular-nums" value={p.minNights} onChange={(e) => update(p._key, { minNights: Number(num(e.target.value)) })} /></Field>
                                            <Field label="Most nights"><Input inputMode="numeric" className="tabular-nums" value={p.maxNights} onChange={(e) => update(p._key, { maxNights: Number(num(e.target.value)) })} /></Field>
                                            <Field label="Starts with"><Input inputMode="numeric" className="tabular-nums" value={p.suggestedNights} onChange={(e) => update(p._key, { suggestedNights: Number(num(e.target.value)) })} /></Field>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium mb-2">Ideas travellers can drag into their days</p>
                                            <SortableRows
                                                items={p.activities}
                                                label={(a) => a.title}
                                                onChange={(activities) => update(p._key, { activities })}
                                                render={(a, _j, grip) => (
                                                    <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-2">
                                                        {grip}
                                                        <div className="grid flex-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                                                            <Input aria-label="Idea" value={a.title} onChange={(e) => update(p._key, { activities: p.activities.map((x) => (x._key === a._key ? { ...x, title: e.target.value } : x)) })} placeholder="Solang Valley" />
                                                            <Input aria-label="Details" value={a.note ?? ""} onChange={(e) => update(p._key, { activities: p.activities.map((x) => (x._key === a._key ? { ...x, note: e.target.value } : x)) })} placeholder="Cable car, paragliding, snow" />
                                                        </div>
                                                        <button type="button" onClick={() => update(p._key, { activities: p.activities.filter((x) => x._key !== a._key) })} aria-label={`Remove ${a.title}`} className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            />
                                            {p.activities.length < 12 && (
                                                <Button variant="outline" size="sm" className="mt-2" onClick={() => update(p._key, { activities: [...p.activities, { _key: key(), title: "", note: "" }] })}>
                                                    <Plus className="w-4 h-4 mr-1.5" aria-hidden /> Add an idea
                                                </Button>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                                            <label className="flex items-center gap-2 text-sm">
                                                <Switch checked={!!p.hidden} onCheckedChange={(hidden) => update(p._key, { hidden })} />
                                                Hide from travellers
                                            </label>
                                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => onChange(places.filter((x) => x._key !== p._key))}>
                                                <Trash2 className="w-4 h-4 mr-1.5" aria-hidden /> Delete place
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    }}
                />
            </CardContent>
        </Card>
    );
}

function HotelsEditor({ hotels, onChange }: { hotels: Keyed<BuilderHotelClass>[]; onChange: (h: Keyed<BuilderHotelClass>[]) => void }) {
    const update = (k: string, changes: Partial<BuilderHotelClass>) => onChange(hotels.map((h) => (h._key === k ? { ...h, ...changes } : h)));
    return (
        <Card>
            <CardHeader>
                <CardTitle>Hotel classes</CardTitle>
                <CardDescription className="text-pretty">The extra per person, per night on top of a place's price. Use 0 for the class already in the price. The second one is picked to start with.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <SortableRows
                    items={hotels}
                    label={(h) => h.label}
                    onChange={onChange}
                    render={(h, _i, handle) => (
                        <div className="flex items-end gap-2 rounded-2xl bg-white p-2 shadow-[0_0_0_1px_rgba(15,23,42,0.08)]">
                            {handle}
                            <div className="grid flex-1 gap-2 grid-cols-3">
                                <Field label="Class"><Input value={h.label} onChange={(e) => update(h._key, { label: e.target.value })} placeholder="Deluxe" /></Field>
                                <Field label="Extra from"><Input inputMode="numeric" className="tabular-nums" value={h.extraFrom} onChange={(e) => update(h._key, { extraFrom: Number(num(e.target.value)) })} /></Field>
                                <Field label="Extra up to"><Input inputMode="numeric" className="tabular-nums" value={h.extraTo} onChange={(e) => update(h._key, { extraTo: Number(num(e.target.value)) })} /></Field>
                            </div>
                            <button type="button" onClick={() => onChange(hotels.filter((x) => x._key !== h._key))} aria-label={`Remove ${h.label}`} className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                />
                <Button variant="outline" size="sm" onClick={() => onChange([...hotels, { _key: key(), key: "", label: "", extraFrom: 0, extraTo: 0 }])}>
                    <Plus className="w-4 h-4 mr-1.5" aria-hidden /> Add a hotel class
                </Button>
            </CardContent>
        </Card>
    );
}

const PER_OPTIONS = Object.entries(PER_LABELS) as [ExtraPer, string][];
const EXTRA_ICONS = ICON_NAMES;

function ExtrasEditor({ extras, onChange }: { extras: Keyed<BuilderExtra>[]; onChange: (x: Keyed<BuilderExtra>[]) => void }) {
    const update = (k: string, changes: Partial<BuilderExtra>) => onChange(extras.map((x) => (x._key === k ? { ...x, ...changes } : x)));
    return (
        <Card>
            <CardHeader>
                <CardTitle>Extras</CardTitle>
                <CardDescription>Things travellers can add to any trip, like a private cab or meals.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <SortableRows
                    items={extras}
                    label={(x) => x.label}
                    onChange={onChange}
                    render={(x, _i, handle) => {
                        const Icon = resolveIcon(x.icon);
                        return (
                            <div className="flex items-start gap-2 rounded-2xl bg-white p-2 shadow-[0_0_0_1px_rgba(15,23,42,0.08)]">
                                {handle}
                                <div className="grid flex-1 gap-2 sm:grid-cols-6">
                                    <div className="sm:col-span-3"><Field label="Name"><Input value={x.label} onChange={(e) => update(x._key, { label: e.target.value })} /></Field></div>
                                    <div className="sm:col-span-3"><Field label="Short description"><Input value={x.description} onChange={(e) => update(x._key, { description: e.target.value })} /></Field></div>
                                    <div className="sm:col-span-2">
                                        <Field label="Icon">
                                            <Select value={x.icon} onValueChange={(icon) => update(x._key, { icon })}>
                                                <SelectTrigger aria-label="Icon"><span className="flex items-center gap-2"><Icon className="w-4 h-4" aria-hidden /><SelectValue /></span></SelectTrigger>
                                                <SelectContent>{EXTRA_ICONS.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </Field>
                                    </div>
                                    <Field label="Price from"><Input inputMode="numeric" className="tabular-nums" value={x.priceFrom} onChange={(e) => update(x._key, { priceFrom: Number(num(e.target.value)) })} /></Field>
                                    <Field label="Price up to"><Input inputMode="numeric" className="tabular-nums" value={x.priceTo} onChange={(e) => update(x._key, { priceTo: Number(num(e.target.value)) })} /></Field>
                                    <div className="sm:col-span-2">
                                        <Field label="Charged">
                                            <Select value={x.per} onValueChange={(per) => update(x._key, { per: per as ExtraPer })}>
                                                <SelectTrigger aria-label="Charged"><SelectValue /></SelectTrigger>
                                                <SelectContent>{PER_OPTIONS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </Field>
                                    </div>
                                </div>
                                <button type="button" onClick={() => onChange(extras.filter((e) => e._key !== x._key))} aria-label={`Remove ${x.label}`} className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        );
                    }}
                />
                <Button variant="outline" size="sm" onClick={() => onChange([...extras, { _key: key(), id: "", label: "", description: "", icon: "Sparkles", priceFrom: 0, priceTo: 0, per: "person" }])}>
                    <Plus className="w-4 h-4 mr-1.5" aria-hidden /> Add an extra
                </Button>
            </CardContent>
        </Card>
    );
}

function RulesEditor({ value, onChange }: { value: Editable; onChange: (c: Partial<Editable>) => void }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Limits</CardTitle>
                <CardDescription>How big a trip can be, and how children are priced.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3 max-w-2xl">
                <Field label="Children pay (% of adult price)">
                    <Input inputMode="numeric" className="tabular-nums" value={Math.round(value.childShare * 100)} onChange={(e) => onChange({ childShare: Math.min(100, Number(num(e.target.value))) / 100 })} />
                </Field>
                <Field label="Most places in a trip">
                    <Input inputMode="numeric" className="tabular-nums" value={value.maxStops} onChange={(e) => onChange({ maxStops: Number(num(e.target.value)) })} />
                </Field>
                <Field label="Longest trip (nights)">
                    <Input inputMode="numeric" className="tabular-nums" value={value.maxNights} onChange={(e) => onChange({ maxNights: Number(num(e.target.value)) })} />
                </Field>
                <p className="sm:col-span-3 text-sm text-muted-foreground">
                    All prices here are in {value.currency}. Travellers see them in the currency they pick on the site.
                </p>
            </CardContent>
        </Card>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1 min-w-0">
            <Label className="text-xs">{label}</Label>
            {children}
        </div>
    );
}
