import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useAuth } from "@/context/AuthContext";

export interface WriteEligibility {
    eligible: boolean;
    reviewCount: number | null;
    completedBookings: number | null;
    accountAgeDays: number;
    requirements: { reviews: number; accountAgeDays: number };
    reason?: "privileged";
}

export function useWriteEligibility() {
    const { user } = useAuth();
    return useQuery({
        queryKey: ["write-eligibility", user?._id],
        queryFn: () => api.get<{ eligible: boolean } & WriteEligibility>("/users/write-eligibility"),
        enabled: !!user,
        staleTime: 5 * 60_000,
    });
}
