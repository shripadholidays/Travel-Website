import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";

export interface Coupon {
    _id: string;
    code: string;
    discountType: "percent" | "flat";
    discountValue: number;
    minOrderAmount: number;
    maxUses: number | null;
    usedCount: number;
    expiresAt: string | null;
    isActive: boolean;
    description?: string;
}

export interface ValidatedCoupon {
    code: string;
    discountType: "percent" | "flat";
    discountValue: number;
    discount: number;
}

// Admin hooks
export function useAdminCoupons() {
    return useQuery({
        queryKey: ["admin", "coupons"],
        queryFn: () => api.get<{ coupons: Coupon[] }>("/admin/coupons"),
    });
}

export function useCreateCoupon() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: Partial<Coupon>) => api.post<{ coupon: Coupon }>("/admin/coupons", data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "coupons"] }),
    });
}

export function useUpdateCoupon() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: Partial<Coupon> & { id: string }) =>
            api.put<{ coupon: Coupon }>(`/admin/coupons/${id}`, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "coupons"] }),
    });
}

export function useDeleteCoupon() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.delete(`/admin/coupons/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "coupons"] }),
    });
}

// Checkout hook — call this when user tries to apply a coupon code
export function useValidateCoupon() {
    return useMutation({
        mutationFn: ({ code, orderAmount }: { code: string; orderAmount: number }) =>
            api.post<{ coupon: ValidatedCoupon }>("/coupons/validate", { code, orderAmount }),
    });
}
