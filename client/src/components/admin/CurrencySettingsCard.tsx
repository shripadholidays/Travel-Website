import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, RefreshCw, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/services/api";
import { useUpdateSiteSettings, type CurrencyCode, type CurrencySettings } from "@/hooks/use-settings";
import { CURRENCY_OPTIONS } from "@/lib/tour-status";
import { timeAgo } from "@/components/admin/AdminUI";

const CODES = CURRENCY_OPTIONS.map((c) => c.code) as CurrencyCode[];

/** Base currency, which currencies travellers can pick, and the exchange rates used everywhere. */
export function CurrencySettingsCard({ value }: { value?: Partial<CurrencySettings> }) {
    const update = useUpdateSiteSettings();
    const qc = useQueryClient();
    const [base, setBase] = useState<CurrencyCode>("INR");
    const [enabled, setEnabled] = useState<CurrencyCode[]>(CODES);
    const [rates, setRates] = useState<Record<string, string>>({});
    const [saved, setSaved] = useState("");

    useEffect(() => {
        if (!value) return;
        const next = {
            base: (value.base ?? "INR") as CurrencyCode,
            enabled: (value.enabled?.length ? value.enabled : CODES) as CurrencyCode[],
            rates: Object.fromEntries(CODES.map((c) => [c, String(value.rates?.[c] ?? "")])),
        };
        setBase(next.base);
        setEnabled(next.enabled);
        setRates(next.rates);
        setSaved(JSON.stringify(next));
    }, [value]);

    const dirty = !!saved && JSON.stringify({ base, enabled, rates }) !== saved;

    const refresh = useMutation({
        mutationFn: () => api.post<{ currency: CurrencySettings }>("/admin/settings/currency/refresh"),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["admin", "settings"] });
            qc.invalidateQueries({ queryKey: ["settings", "public"] });
            toast.success("Exchange rates updated to today's market rates.");
        },
        onError: (err) => toast.error((err as Error).message || "Could not fetch rates"),
    });

    const toggle = (code: CurrencyCode, on: boolean) =>
        setEnabled((list) => (on ? [...new Set([...list, code])] : list.filter((c) => c !== code)));

    const save = async () => {
        if (!enabled.includes(base)) { toast.error("Keep the base currency switched on."); return; }
        const parsed: Record<string, number> = {};
        for (const c of CODES) {
            const n = Number(rates[c]);
            if (!(n > 0)) { toast.error(`Enter a rate above 0 for ${c}.`); return; }
            parsed[c] = n;
        }
        try {
            await update.mutateAsync({ currency: { base, enabled, rates: { ...parsed, USD: 1 } as Record<CurrencyCode, number> } });
            qc.invalidateQueries({ queryKey: ["settings", "public"] });
            toast.success("Currency settings saved. Prices across the site use the new rates.");
        } catch (err) {
            toast.error((err as Error).message || "Failed to save");
        }
    };

    const updatedAt = value?.ratesUpdatedAt ?? value?.updatedAt;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Currencies</CardTitle>
                <CardDescription>
                    Each tour is priced in its own currency. Travellers pick the currency they see prices in and are charged in it,
                    converted with the rates below. Revenue reports use the base currency.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="max-w-xs space-y-1.5">
                    <Label htmlFor="base-currency">Base currency</Label>
                    <Select value={base} onValueChange={(v) => { setBase(v as CurrencyCode); toggle(v as CurrencyCode, true); }}>
                        <SelectTrigger id="base-currency"><SelectValue /></SelectTrigger>
                        <SelectContent>{CURRENCY_OPTIONS.map((c) => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Shown to new visitors, used for new tours and coupons, and for revenue totals.</p>
                </div>

                <div>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium">Rates and availability</p>
                        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => refresh.mutate()} disabled={refresh.isPending}>
                            {refresh.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Fetch today's rates
                        </Button>
                    </div>
                    <div className="divide-y divide-slate-100 rounded-xl border">
                        {CURRENCY_OPTIONS.map(({ code, label }) => (
                            <div key={code} className="flex flex-wrap items-center gap-3 px-4 py-3">
                                <span className="min-w-[180px] flex-1 text-sm font-medium">{label}</span>
                                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Switch checked={enabled.includes(code)} disabled={code === base} onCheckedChange={(on) => toggle(code, on)} aria-label={`Let travellers pay in ${code}`} />
                                    {code === base ? "Base" : enabled.includes(code) ? "On" : "Off"}
                                </label>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">1 USD =</span>
                                    <Input
                                        aria-label={`${code} per US dollar`}
                                        inputMode="decimal"
                                        className="h-9 w-28 tabular-nums"
                                        value={code === "USD" ? "1" : rates[code] ?? ""}
                                        disabled={code === "USD"}
                                        onChange={(e) => setRates((r) => ({ ...r, [code]: e.target.value.replace(/[^0-9.]/g, "") }))}
                                    />
                                    <span className="w-8 text-xs text-muted-foreground">{code}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                        {updatedAt ? <>Rates last updated {timeAgo(updatedAt)}.</> : "Rates have not been updated yet; the defaults are in use."}{" "}
                        Bookings keep the rate they were made at, so changing rates never alters past charges.
                    </p>
                </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
                <Button onClick={save} disabled={update.isPending || !dirty} className="ml-auto gap-2 bg-brand-blue">
                    {update.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save currencies
                </Button>
            </CardFooter>
        </Card>
    );
}
