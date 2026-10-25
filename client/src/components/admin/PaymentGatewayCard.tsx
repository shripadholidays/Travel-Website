import { useEffect, useState } from "react";
import { CheckCircle2, CircleDashed, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/admin/AdminUI";
import { useUpdateSiteSettings, type PaymentGatewayChoice, type PaymentGatewayStatus } from "@/hooks/use-settings";
import { cn } from "@/lib/utils";

const OPTIONS: { id: PaymentGatewayChoice; label: string; note: string }[] = [
    { id: "auto", label: "Automatic", note: "Razorpay when its keys are set, otherwise Stripe." },
    { id: "razorpay", label: "Razorpay", note: "Cards, UPI, netbanking and wallets. Best for India." },
    { id: "stripe", label: "Stripe", note: "Cards and wallets, international." },
];
const LABEL = { razorpay: "Razorpay", stripe: "Stripe" } as const;

/**
 * Which gateway takes new payments. Keys live on the server (environment variables), so this only
 * shows which gateways are ready. Payments already taken keep using their own gateway for refunds.
 */
export function PaymentGatewayCard({ status }: { status?: PaymentGatewayStatus }) {
    const update = useUpdateSiteSettings();
    const [choice, setChoice] = useState<PaymentGatewayChoice>("auto");

    useEffect(() => {
        if (status) setChoice(status.choice);
    }, [status]);

    const save = async () => {
        try {
            await update.mutateAsync({ payments: { gateway: choice } });
            toast.success("Payment gateway saved. New checkouts use it straight away.");
        } catch (err) {
            toast.error((err as Error).message || "Failed to save");
        }
    };

    const ready = status?.available ?? { razorpay: false, stripe: false };
    const fallback = choice !== "auto" && !ready[choice];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Payments</CardTitle>
                <CardDescription>
                    Choose who takes card payments. A gateway is ready once its keys are set on the server. If the one you choose
                    isn't ready, checkout uses the other so bookings never stop.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
                <div className="flex flex-wrap gap-2" aria-label="Gateway keys">
                    {(["razorpay", "stripe"] as const).map((g) => (
                        <StatusPill key={g} tone={ready[g] ? "green" : "slate"}>
                            {ready[g] ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleDashed className="h-3.5 w-3.5" />}
                            {LABEL[g]}: {ready[g] ? "keys set" : "no keys"}
                        </StatusPill>
                    ))}
                </div>

                <div role="radiogroup" aria-label="Payment gateway" className="grid gap-3 sm:grid-cols-3">
                    {OPTIONS.map((o) => (
                        <button
                            key={o.id}
                            type="button"
                            role="radio"
                            aria-checked={choice === o.id}
                            onClick={() => setChoice(o.id)}
                            className={cn(
                                "flex flex-col items-start justify-start rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange",
                                choice === o.id ? "border-brand-orange bg-brand-orange/[0.04]" : "border-slate-200 hover:border-slate-300",
                            )}
                        >
                            <span className="block font-bold text-brand-blue">{o.label}</span>
                            <span className="mt-1 block text-sm text-muted-foreground">{o.note}</span>
                        </button>
                    ))}
                </div>

                <p className="text-sm text-slate-600">
                    {!status ? "Checking gateways…"
                        : status.active ? <>Checkout is using <span className="font-semibold">{LABEL[status.active]}</span> right now.</>
                        : "No gateway has keys yet, so bookings are confirmed without payment. Set Razorpay or Stripe keys on the server before going live."}
                    {fallback && <span className="block text-amber-700">{LABEL[choice as "razorpay" | "stripe"]} has no keys yet, so checkout will keep using the other gateway.</span>}
                </p>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
                <Button onClick={save} disabled={update.isPending || !status || choice === status.choice} className="ml-auto gap-2 bg-brand-blue">
                    {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save payment gateway
                </Button>
            </CardFooter>
        </Card>
    );
}
