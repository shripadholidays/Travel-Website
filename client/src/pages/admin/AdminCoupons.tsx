import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Trash2, Tag, Pencil, Loader2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, PageHeader, StatusPill, type Tone } from "@/components/admin/AdminUI";
import { useAdminCoupons, useCreateCoupon, useUpdateCoupon, useDeleteCoupon, type Coupon } from "@/hooks/use-coupons";
import { useCurrency } from "@/context/CurrencyContext";
import { CURRENCY_OPTIONS, money } from "@/lib/tour-status";

type Form = { code: string; discountType: "percent" | "flat"; discountValue: string; currency: Coupon["currency"]; minOrderAmount: string; maxUses: string; expiresAt: string; isActive: boolean; description: string };

const EMPTY: Form = { code: "", discountType: "percent", discountValue: "10", currency: "INR", minOrderAmount: "", maxUses: "", expiresAt: "", isActive: true, description: "" };

const toForm = (c: Coupon): Form => ({
    code: c.code,
    discountType: c.discountType,
    discountValue: String(c.discountValue),
    currency: c.currency ?? "USD",
    minOrderAmount: c.minOrderAmount ? String(c.minOrderAmount) : "",
    maxUses: c.maxUses ? String(c.maxUses) : "",
    expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : "",
    isActive: c.isActive,
    description: c.description ?? "",
});

function couponState(c: Coupon): { label: string; tone: Tone } {
    if (!c.isActive) return { label: "Off", tone: "slate" };
    if (c.expiresAt && new Date(c.expiresAt) < new Date()) return { label: "Expired", tone: "red" };
    if (c.maxUses !== null && c.usedCount >= c.maxUses) return { label: "Used up", tone: "amber" };
    return { label: "Active", tone: "green" };
}

function check(f: Form): string | null {
    if (!/^[A-Z0-9_-]{3,30}$/.test(f.code)) return "Use 3–30 letters, numbers, dashes or underscores for the code.";
    const v = Number(f.discountValue);
    if (!(v > 0)) return "The discount must be more than 0.";
    if (f.discountType === "percent" && v > 100) return "A percentage discount can be at most 100%.";
    if (f.maxUses && !(Number(f.maxUses) >= 1)) return "Max uses must be 1 or more, or empty for unlimited.";
    return null;
}

export const AdminCoupons = () => {
    const { data, isLoading } = useAdminCoupons();
    const createCoupon = useCreateCoupon();
    const updateCoupon = useUpdateCoupon();
    const deleteCoupon = useDeleteCoupon();

    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Coupon | null>(null);
    const [form, setForm] = useState<Form>(EMPTY);
    const [error, setError] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);

    const coupons = data?.coupons ?? [];
    const { base } = useCurrency();
    const set = <K extends keyof Form>(k: K, v: Form[K]) => { setForm((f) => ({ ...f, [k]: v })); setError(null); };

    // New coupons start in the site's base currency
    const openNew = () => { setEditing(null); setForm({ ...EMPTY, currency: base as Coupon["currency"] }); setError(null); setOpen(true); };
    const openEdit = (c: Coupon) => { setEditing(c); setForm(toForm(c)); setError(null); setOpen(true); };

    const submit = async () => {
        const problem = check(form);
        if (problem) { setError(problem); return; }
        const payload: Partial<Coupon> = {
            code: form.code,
            discountType: form.discountType,
            discountValue: Number(form.discountValue),
            currency: form.currency,
            minOrderAmount: Number(form.minOrderAmount) || 0,
            maxUses: form.maxUses ? Number(form.maxUses) : null,
            expiresAt: form.expiresAt || null,
            isActive: form.isActive,
            description: form.description.trim(),
        };
        try {
            if (editing) await updateCoupon.mutateAsync({ id: editing._id, ...payload });
            else await createCoupon.mutateAsync(payload);
            toast.success(editing ? "Coupon updated." : `Coupon ${form.code} created.`);
            setOpen(false);
        } catch (err) {
            setError((err as Error).message || "Failed to save the coupon.");
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteCoupon.mutateAsync(deleteTarget._id);
            toast.success(`Coupon ${deleteTarget.code} deleted.`);
        } catch (err) {
            toast.error((err as Error).message || "Failed to delete the coupon.");
        }
        setDeleteTarget(null);
    };

    const saving = createCoupon.isPending || updateCoupon.isPending;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Coupons"
                description="Promo codes travellers enter at checkout. Percentage discounts work in every currency; fixed amounts and minimum orders are set in the coupon's currency and converted at checkout."
                actions={<Button onClick={openNew} className="gap-2 bg-brand-orange hover:bg-brand-orange/90"><Plus className="w-4 h-4" /> New coupon</Button>}
            />

            <Card>
                <CardContent className="pt-6">
                    {isLoading ? (
                        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                    ) : coupons.length === 0 ? (
                        <EmptyState icon={Tag} title="No coupons yet" description="Create a code for a sale, a partner or a returning traveller." action={<Button onClick={openNew} variant="outline" className="gap-2"><Plus className="w-4 h-4" /> New coupon</Button>} />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Discount</TableHead>
                                    <TableHead className="hidden md:table-cell">Minimum order</TableHead>
                                    <TableHead className="hidden sm:table-cell">Used</TableHead>
                                    <TableHead className="hidden md:table-cell">Expires</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {coupons.map((c) => {
                                    const st = couponState(c);
                                    return (
                                        <TableRow key={c._id}>
                                            <TableCell>
                                                <button type="button" className="inline-flex items-center gap-1.5 font-mono font-bold hover:text-brand-orange" title="Copy code"
                                                    onClick={() => { navigator.clipboard?.writeText(c.code); toast.success(`${c.code} copied`); }}>
                                                    {c.code} <Copy className="w-3 h-3 text-slate-400" />
                                                </button>
                                                {c.description && <p className="text-xs text-muted-foreground line-clamp-1 max-w-[220px]">{c.description}</p>}
                                            </TableCell>
                                            <TableCell className="tabular-nums font-medium">{c.discountType === "percent" ? `${c.discountValue}% off` : `${money(c.discountValue, c.currency ?? "USD")} off`}</TableCell>
                                            <TableCell className="hidden md:table-cell tabular-nums">{c.minOrderAmount ? money(c.minOrderAmount, c.currency ?? "USD") : "None"}</TableCell>
                                            <TableCell className="hidden sm:table-cell tabular-nums">{c.usedCount} / {c.maxUses ?? "∞"}</TableCell>
                                            <TableCell className="hidden md:table-cell whitespace-nowrap">{c.expiresAt ? format(new Date(c.expiresAt), "d MMM yyyy") : "Never"}</TableCell>
                                            <TableCell><StatusPill tone={st.tone}>{st.label}</StatusPill></TableCell>
                                            <TableCell>
                                                <div className="flex gap-1 justify-end">
                                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(c)} aria-label={`Edit ${c.code}`}><Pencil className="w-3.5 h-3.5" /></Button>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => setDeleteTarget(c)} aria-label={`Delete ${c.code}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editing ? `Edit ${editing.code}` : "New coupon"}</DialogTitle>
                        <DialogDescription>{editing ? `Used ${editing.usedCount} time(s) so far.` : "Travellers type the code at checkout."}</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 space-y-1.5">
                            <Label htmlFor="code">Code</Label>
                            <Input id="code" className="font-mono uppercase" placeholder="SUMMER20" value={form.code} maxLength={30}
                                onChange={(e) => set("code", e.target.value.toUpperCase().replace(/\s+/g, ""))} />
                        </div>
                        <div className="col-span-2 space-y-1.5">
                            <Label htmlFor="coupon-currency">Coupon currency</Label>
                            <Select value={form.currency} onValueChange={(v) => set("currency", v as Form["currency"])}>
                                <SelectTrigger id="coupon-currency"><SelectValue /></SelectTrigger>
                                <SelectContent>{CURRENCY_OPTIONS.map((c) => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}</SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">Used for a fixed amount off and the minimum order. A traveller paying in another currency gets the converted amount.</p>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="type">Discount type</Label>
                            <Select value={form.discountType} onValueChange={(v) => set("discountType", v as Form["discountType"])}>
                                <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="percent">Percentage (%)</SelectItem>
                                    <SelectItem value="flat">Fixed amount</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="value">{form.discountType === "percent" ? "Percent off" : `Amount off (${form.currency})`}</Label>
                            <Input id="value" inputMode="decimal" value={form.discountValue} onChange={(e) => set("discountValue", e.target.value.replace(/[^0-9.]/g, ""))} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="min">Minimum order ({form.currency})</Label>
                            <Input id="min" inputMode="decimal" placeholder="None" value={form.minOrderAmount} onChange={(e) => set("minOrderAmount", e.target.value.replace(/[^0-9.]/g, ""))} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="uses">Max uses</Label>
                            <Input id="uses" inputMode="numeric" placeholder="Unlimited" value={form.maxUses} onChange={(e) => set("maxUses", e.target.value.replace(/[^0-9]/g, ""))} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="expires">Expires on</Label>
                            <Input id="expires" type="date" value={form.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} />
                        </div>
                        <div className="flex items-end">
                            <label className="flex h-10 items-center gap-3 text-sm font-medium">
                                <Switch checked={form.isActive} onCheckedChange={(v) => set("isActive", v)} /> {form.isActive ? "On" : "Off"}
                            </label>
                        </div>
                        <div className="col-span-2 space-y-1.5">
                            <Label htmlFor="note">Internal note</Label>
                            <Input id="note" placeholder="e.g. Instagram campaign, March" value={form.description} onChange={(e) => set("description", e.target.value)} />
                        </div>
                    </div>
                    {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button onClick={submit} disabled={saving} className="gap-1.5 bg-brand-orange hover:bg-brand-orange/90">
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />} {editing ? "Save changes" : "Create coupon"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(o) => !o && setDeleteTarget(null)}
                title={`Delete ${deleteTarget?.code}?`}
                description="Travellers can no longer use this code. Bookings that already used it keep their discount. To pause it instead, switch it off."
                confirmLabel="Delete"
                destructive
                loading={deleteCoupon.isPending}
                onConfirm={handleDelete}
            />
        </div>
    );
};
