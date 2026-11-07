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
import { MONTHS, PER_LABELS, SEASON_LABELS, seasonOf, type BuilderActivity, type BuilderExtra, type BuilderHotelClass, type BuilderPlace, type BuilderZone, type ExtraPer, type Season, type TripBuilderCatalogue } from "@/lib/trip-builder";
import { SearchField } from "./AdminUI";
import { SortableRows } from "./SortableRows";

// Rows get a browser-only key so they can be dragged and edited; it is dropped before saving
type Keyed<T> = T & { _key: string };
type EditPlace = Keyed<Omit<BuilderPlace, "activities">> & { activities: Keyed<BuilderActivity>[] };
interface Editable extends Omit<TripBuilderCatalogue, "places" | "hotelClasses" | "extras" | "zones"> {
    places: EditPlace[];
    hotelClasses: Keyed<BuilderHotelClass>[];
    extras: Keyed<BuilderExtra>[];
    zones: Keyed<BuilderZone>[];
}

let n = 0;
const key = () => `k${(n++).toString(36)}`;
const withKeys = (b: TripBuilderCatalogue): Editable => ({
    ...b,
    places: b.places.map((p) => ({ ...p, _key: key(), activities: p.activities.map((a) => ({ ...a, _key: key() })) })),
    hotelClasses: b.hotelClasses.map((h) => ({ ...h, _key: key() })),
    extras: b.extras.map((x) => ({ ...x, _key: key() })),
    zones: (b.zones ?? []).map((z) => ({ ...z, _key: key() })),
});
const strip = <T extends { _key: string }>({ _key, ...rest }: T) => rest;
const withoutKeys = (e: Editable): TripBuilderCatalogue => ({
    ...e,
    places: e.places.map((p) => ({ ...strip(p), activities: p.activities.map(strip) })),
    hotelClasses: e.hotelClasses.map(strip),
    extras: e.extras.map(strip),
    zones: e.zones.map(strip),
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
                    <TabsTrigger value="regions">Regions ({edit.zones.length})</TabsTrigger>
                    <TabsTrigger value="hotels">Hotel classes</TabsTrigger>
                    <TabsTrigger value="extras">Extras ({edit.extras.length})</TabsTrigger>
                    <TabsTrigger value="rules">Limits</TabsTrigger>
                </TabsList>
                <TabsContent value="places"><PlacesEditor places={edit.places} zones={edit.zones} currency={edit.currency} onChange={(places) => set({ places })} /></TabsContent>
                <TabsContent value="regions"><ZonesEditor zones={edit.zones} places={edit.places} onChange={(zones) => set({ zones })} /></TabsContent>
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

function PlacesEditor({ places, zones, currency, onChange }: { places: EditPlace[]; zones: Keyed<BuilderZone>[]; currency: string; onChange: (p: EditPlace[]) => void }) {
    const { formatPrice } = useCurrency();
    const [search, setSearch] = useState("");
    const [open, setOpen] = useState<string | null>(null);
    const q = search.trim().toLowerCase();
    const shown = useMemo(() => (q ? places.filter((p) => `${p.name} ${p.region} ${p.country}`.toLowerCase().includes(q)) : places), [places, q]);
    const update = (k: string, changes: Partial<EditPlace>) => onChange(places.map((p) => (p._key === k ? { ...p, ...changes } : p)));
    const add = () => {
        const fresh: EditPlace = {
            _key: key(), id: "", name: "", region: "", country: "India", image: "", nightlyFrom: 3000, nightlyTo: 4000,
            minNights: 1, maxNights: 7, suggestedNights: 2, hidden: false, activities: [], zones: [], peakMonths: [], offMonths: [], closedMonths: [],
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
                    <CardDescription className="text-pretty">Prices are per person, per night, with Economy hotels, breakfast, transfers and sightseeing, for the regular, off and peak seasons. Drag to set the order travellers see.</CardDescription>
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
                                        <div className="grid gap-3 grid-cols-2 sm:grid-cols-6">
                                            <Field label="Regular from"><Input inputMode="numeric" className="tabular-nums" value={p.nightlyFrom} onChange={(e) => update(p._key, { nightlyFrom: Number(num(e.target.value)) })} /></Field>
                                            <Field label="Regular up to"><Input inputMode="numeric" className="tabular-nums" value={p.nightlyTo} onChange={(e) => update(p._key, { nightlyTo: Number(num(e.target.value)) })} /></Field>
                                            <Field label="Off season from"><Input inputMode="numeric" className="tabular-nums" value={p.offFrom ?? ""} placeholder="Same" onChange={(e) => update(p._key, { offFrom: Number(num(e.target.value)) || undefined })} /></Field>
                                            <Field label="Off season up to"><Input inputMode="numeric" className="tabular-nums" value={p.offTo ?? ""} placeholder="Same" onChange={(e) => update(p._key, { offTo: Number(num(e.target.value)) || undefined })} /></Field>
                                            <Field label="Peak from"><Input inputMode="numeric" className="tabular-nums" value={p.peakFrom ?? ""} placeholder="Same" onChange={(e) => update(p._key, { peakFrom: Number(num(e.target.value)) || undefined })} /></Field>
                                            <Field label="Peak up to"><Input inputMode="numeric" className="tabular-nums" value={p.peakTo ?? ""} placeholder="Same" onChange={(e) => update(p._key, { peakTo: Number(num(e.target.value)) || undefined })} /></Field>
                                        </div>
                                        <SeasonPicker place={p} onChange={(changes) => update(p._key, changes)} />
                                        <div>
                                            <p className="text-sm font-medium mb-1">Regions</p>
                                            <p className="text-xs text-muted-foreground mb-2">Places in the same region can be combined freely. Gateway cities (like Delhi) can be in more than one.</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {zones.map((z) => {
                                                    const on = (p.zones ?? []).includes(z.id);
                                                    return (
                                                        <button key={z._key} type="button" aria-pressed={on} disabled={!z.id}
                                                            onClick={() => update(p._key, { zones: on ? (p.zones ?? []).filter((id) => id !== z.id) : [...(p.zones ?? []), z.id] })}
                                                            className={cn("rounded-full px-3 py-1.5 text-xs font-medium transition-colors", on ? "bg-brand-blue text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>
                                                            {z.label || "New region"}
                                                        </button>
                                                    );
                                                })}
                                                {!zones.length && <span className="text-xs text-muted-foreground">Add regions in the Regions tab first.</span>}
                                            </div>
                                        </div>
                                        <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
                                            <Field label="Visa from (per person)"><Input inputMode="numeric" className="tabular-nums" value={p.visaFrom ?? ""} placeholder="None" onChange={(e) => update(p._key, { visaFrom: Number(num(e.target.value)) || undefined })} /></Field>
                                            <Field label="Visa up to"><Input inputMode="numeric" className="tabular-nums" value={p.visaTo ?? ""} placeholder="None" onChange={(e) => update(p._key, { visaTo: Number(num(e.target.value)) || undefined })} /></Field>
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

const CYCLE: Season[] = ["regular", "peak", "off", "closed"];
const SEASON_STYLE: Record<Season, string> = {
    regular: "bg-slate-100 text-slate-700",
    peak: "bg-orange-500 text-white",
    off: "bg-sky-100 text-sky-800",
    closed: "bg-slate-700 text-white",
};

/** Twelve month buttons; each tap moves the month to the next season */
function SeasonPicker({ place, onChange }: { place: EditPlace; onChange: (c: Partial<EditPlace>) => void }) {
    const setMonth = (m: number, season: Season) => {
        const without = (list?: number[]) => (list ?? []).filter((x) => x !== m);
        const next = { peakMonths: without(place.peakMonths), offMonths: without(place.offMonths), closedMonths: without(place.closedMonths) };
        if (season === "peak") next.peakMonths.push(m);
        if (season === "off") next.offMonths.push(m);
        if (season === "closed") next.closedMonths.push(m);
        onChange(next);
    };
    return (
        <div>
            <p className="text-sm font-medium mb-1">Seasons</p>
            <p className="text-xs text-muted-foreground mb-2">Tap a month to change it: regular, peak, off season, closed. Travellers can't send a trip that stays here in a closed month.</p>
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
                {MONTHS.map((label, i) => {
                    const m = i + 1;
                    const season = seasonOf(place, m);
                    return (
                        <button key={label} type="button" onClick={() => setMonth(m, CYCLE[(CYCLE.indexOf(season) + 1) % CYCLE.length])}
                            aria-label={`${label}: ${SEASON_LABELS[season]}`}
                            className={cn("rounded-lg py-2 text-xs font-medium transition-[background-color,scale] active:scale-[0.96]", SEASON_STYLE[season])}>
                            {label}
                        </button>
                    );
                })}
            </div>
            <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-muted-foreground">
                {CYCLE.map((c) => <span key={c} className="inline-flex items-center gap-1"><span className={cn("w-2.5 h-2.5 rounded-sm", SEASON_STYLE[c])} />{SEASON_LABELS[c]}</span>)}
            </div>
            {(place.closedMonths?.length ?? 0) > 0 && (
                <div className="mt-2 max-w-md">
                    <Field label="Why it is closed (shown to travellers)">
                        <Input value={place.seasonNote ?? ""} maxLength={120} onChange={(e) => onChange({ seasonNote: e.target.value })} placeholder="roads are snowbound" />
                    </Field>
                </div>
            )}
        </div>
    );
}

function ZonesEditor({ zones, places, onChange }: { zones: Keyed<BuilderZone>[]; places: EditPlace[]; onChange: (z: Keyed<BuilderZone>[]) => void }) {
    const update = (k: string, changes: Partial<BuilderZone>) => onChange(zones.map((z) => (z._key === k ? { ...z, ...changes } : z)));
    const count = (id: string) => places.filter((p) => (p.zones ?? []).includes(id)).length;
    return (
        <Card>
            <CardHeader>
                <CardTitle>Regions</CardTitle>
                <CardDescription className="text-pretty">
                    Places in one region combine freely. A trip can cover a second region only if it is long enough (see Limits), and the travel between them is added to the budget.
                    "Travel in" is one way, per person, from another region. "Return flight" is from a major Indian city and back, used for the Return flights extra.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <SortableRows
                    items={zones}
                    label={(z) => z.label}
                    onChange={onChange}
                    render={(z, _i, handle) => (
                        <div className="flex items-end gap-2 rounded-2xl bg-white p-2 shadow-[0_0_0_1px_rgba(15,23,42,0.08)]">
                            {handle}
                            <div className="grid flex-1 gap-2 grid-cols-2 sm:grid-cols-6">
                                <div className="col-span-2">
                                    <Field label={`Region (${count(z.id)} places)`}><Input value={z.label} onChange={(e) => update(z._key, { label: e.target.value })} placeholder="South India" /></Field>
                                </div>
                                <Field label="Travel in from"><Input inputMode="numeric" className="tabular-nums" value={z.hopFrom} onChange={(e) => update(z._key, { hopFrom: Number(num(e.target.value)) })} /></Field>
                                <Field label="Travel in up to"><Input inputMode="numeric" className="tabular-nums" value={z.hopTo} onChange={(e) => update(z._key, { hopTo: Number(num(e.target.value)) })} /></Field>
                                <Field label="Return flight from"><Input inputMode="numeric" className="tabular-nums" value={z.fareFrom} onChange={(e) => update(z._key, { fareFrom: Number(num(e.target.value)) })} /></Field>
                                <Field label="Return flight up to"><Input inputMode="numeric" className="tabular-nums" value={z.fareTo} onChange={(e) => update(z._key, { fareTo: Number(num(e.target.value)) })} /></Field>
                            </div>
                            <button type="button" onClick={() => onChange(zones.filter((x) => x._key !== z._key))} aria-label={`Remove ${z.label}`} className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                />
                <Button variant="outline" size="sm" onClick={() => onChange([...zones, { _key: key(), id: "", label: "", hopFrom: 4000, hopTo: 9000, fareFrom: 6000, fareTo: 14000 }])}>
                    <Plus className="w-4 h-4 mr-1.5" aria-hidden /> Add a region
                </Button>
                <p className="text-xs text-muted-foreground">Save a new region before ticking it on places.</p>
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
                <Field label="Most regions in a trip">
                    <Input inputMode="numeric" className="tabular-nums" value={value.maxRegions ?? 2} onChange={(e) => onChange({ maxRegions: Number(num(e.target.value)) })} />
                </Field>
                <Field label="Nights needed for 2+ regions">
                    <Input inputMode="numeric" className="tabular-nums" value={value.multiRegionMinNights ?? 10} onChange={(e) => onChange({ multiRegionMinNights: Number(num(e.target.value)) })} />
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
