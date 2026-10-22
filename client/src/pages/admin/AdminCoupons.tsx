import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { Plus, Trash2, Tag, Edit2, Check, X } from "lucide-react";
import { useAdminCoupons, useCreateCoupon, useUpdateCoupon, useDeleteCoupon, type Coupon } from "@/hooks/use-coupons";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const emptyForm = (): Partial<Coupon> => ({
    code: "",
    discountType: "percent",
    discountValue: 10,
    minOrderAmount: 0,
    maxUses: null,
    expiresAt: null,
    isActive: true,
    description: "",
});

export const AdminCoupons = () => {
    const { data, isLoading } = useAdminCoupons();
    const createCoupon = useCreateCoupon();
    const updateCoupon = useUpdateCoupon();
    const deleteCoupon = useDeleteCoupon();

    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<Partial<Coupon>>(emptyForm());

    const coupons = data?.coupons ?? [];

    const handleField = (key: keyof Coupon, value: unknown) =>
        setForm((prev) => ({ ...prev, [key]: value }));

    const handleSubmit = async () => {
        if (!form.code || !form.discountType || form.discountValue == null) {
            toast.error("Code, discount type, and discount value are required.");
            return;
        }
        try {
            if (editingId) {
                await updateCoupon.mutateAsync({ id: editingId, ...form });
                toast.success("Coupon updated.");
            } else {
                await createCoupon.mutateAsync(form);
                toast.success("Coupon created.");
            }
            setShowForm(false);
            setEditingId(null);
            setForm(emptyForm());
        } catch (err) {
            toast.error((err as Error).message || "Failed to save coupon.");
        }
    };

    const handleEdit = (coupon: Coupon) => {
        setForm(coupon);
        setEditingId(coupon._id);
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this coupon?")) return;
        try {
            await deleteCoupon.mutateAsync(id);
            toast.success("Coupon deleted.");
        } catch (err) {
            toast.error((err as Error).message);
        }
    };

    if (isLoading) return <div className="flex items-center justify-center p-12"><Spinner /></div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold font-display">Coupons</h1>
                    <p className="text-muted-foreground text-sm">Create and manage promo codes for the booking flow.</p>
                </div>
                <Button onClick={() => { setForm(emptyForm()); setEditingId(null); setShowForm(true); }} className="gap-2">
                    <Plus className="w-4 h-4" /> New Coupon
                </Button>
            </div>

            {showForm && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                    <h2 className="font-bold text-lg">{editingId ? "Edit Coupon" : "New Coupon"}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <Label>Code</Label>
                            <Input
                                placeholder="SUMMER20"
                                value={form.code ?? ""}
                                onChange={(e) => handleField("code", e.target.value.toUpperCase())}
                                className="rounded-xl"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Discount type</Label>
                            <select
                                value={form.discountType}
                                onChange={(e) => handleField("discountType", e.target.value)}
                                className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm"
                            >
                                <option value="percent">Percent (%)</option>
                                <option value="flat">Flat ($)</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Discount value</Label>
                            <Input
                                type="number"
                                min="0"
                                value={form.discountValue ?? 0}
                                onChange={(e) => handleField("discountValue", Number(e.target.value))}
                                className="rounded-xl"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Min order amount ($)</Label>
                            <Input
                                type="number"
                                min="0"
                                value={form.minOrderAmount ?? 0}
                                onChange={(e) => handleField("minOrderAmount", Number(e.target.value))}
                                className="rounded-xl"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Max uses (blank = unlimited)</Label>
                            <Input
                                type="number"
                                min="1"
                                placeholder="Unlimited"
                                value={form.maxUses ?? ""}
                                onChange={(e) => handleField("maxUses", e.target.value ? Number(e.target.value) : null)}
                                className="rounded-xl"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Expires at (blank = no expiry)</Label>
                            <Input
                                type="date"
                                value={form.expiresAt ? new Date(form.expiresAt).toISOString().slice(0, 10) : ""}
                                onChange={(e) => handleField("expiresAt", e.target.value || null)}
                                className="rounded-xl"
                            />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                            <Label>Description (optional)</Label>
                            <Input
                                placeholder="Internal note…"
                                value={form.description ?? ""}
                                onChange={(e) => handleField("description", e.target.value)}
                                className="rounded-xl"
                            />
                        </div>
                        <div className="flex items-center gap-3 pt-6">
                            <input
                                type="checkbox"
                                id="isActive"
                                checked={form.isActive !== false}
                                onChange={(e) => handleField("isActive", e.target.checked)}
                                className="w-4 h-4 rounded text-brand-orange"
                            />
                            <Label htmlFor="isActive">Active</Label>
                        </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <Button onClick={handleSubmit} disabled={createCoupon.isPending || updateCoupon.isPending} className="gap-2">
                            <Check className="w-4 h-4" /> {editingId ? "Update" : "Create"}
                        </Button>
                        <Button variant="ghost" onClick={() => { setShowForm(false); setEditingId(null); }}>
                            <X className="w-4 h-4 mr-1" /> Cancel
                        </Button>
                    </div>
                </div>
            )}

            {coupons.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                    <Tag className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p>No coupons yet. Create one to get started.</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                {["Code", "Discount", "Min Order", "Uses", "Expires", "Status", ""].map((h) => (
                                    <th key={h} className="px-4 py-3 text-left font-semibold text-muted-foreground">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {coupons.map((c) => (
                                <tr key={c._id} className="bg-white hover:bg-slate-50/60 transition-colors">
                                    <td className="px-4 py-3 font-mono font-bold">{c.code}</td>
                                    <td className="px-4 py-3">
                                        {c.discountType === "percent" ? `${c.discountValue}%` : `$${c.discountValue}`}
                                    </td>
                                    <td className="px-4 py-3">${c.minOrderAmount}</td>
                                    <td className="px-4 py-3">{c.usedCount} / {c.maxUses ?? "∞"}</td>
                                    <td className="px-4 py-3">{c.expiresAt ? format(new Date(c.expiresAt), "MMM d, yyyy") : "—"}</td>
                                    <td className="px-4 py-3">
                                        <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", c.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500")}>
                                            {c.isActive ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-1 justify-end">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={() => handleEdit(c)}>
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-red-500 hover:text-red-600" onClick={() => handleDelete(c._id)}>
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
