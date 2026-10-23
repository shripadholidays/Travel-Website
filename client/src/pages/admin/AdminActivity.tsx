import { useSearchParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { History, Plus, Pencil, Trash2, Upload, ToggleRight } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, PageHeader, StatusPill, TableFooter, timeAgo, type Tone } from "@/components/admin/AdminUI";
import { useActivity, type ActivityEntry } from "@/hooks/use-admin";
import { ROLE_LABELS } from "@/lib/admin-access";

const ACTION: Record<ActivityEntry["action"], { verb: string; icon: typeof Plus; tone: Tone }> = {
    create: { verb: "created", icon: Plus, tone: "green" },
    update: { verb: "edited", icon: Pencil, tone: "blue" },
    delete: { verb: "deleted", icon: Trash2, tone: "red" },
    import: { verb: "imported", icon: Upload, tone: "green" },
    status: { verb: "changed", icon: ToggleRight, tone: "amber" },
};

// Where an entry's item can be opened, when it still exists
function linkFor(e: ActivityEntry) {
    if (e.action === "delete" || !e.resourceId) return null;
    if (e.resource === "tour") return `/admin/tours/${e.resourceId}/edit`;
    if (e.resource === "booking") return `/bookings/${e.resourceId}`;
    return null;
}

export const AdminActivity = () => {
    const [params, setParams] = useSearchParams();
    const resource = params.get("resource") ?? "all";
    const page = Number(params.get("page") || 1);
    const { data, isLoading } = useActivity({ resource, page });
    const entries = data?.entries ?? [];

    const setParam = (key: string, value: string) => {
        const next = new URLSearchParams(params);
        if (value && value !== "all" && !(key === "page" && value === "1")) next.set(key, value); else next.delete(key);
        if (key !== "page") next.delete("page");
        setParams(next, { replace: true });
    };

    // Group by day so a busy log stays readable
    const groups = entries.reduce<{ day: string; items: ActivityEntry[] }[]>((acc, e) => {
        const day = format(new Date(e.createdAt), "EEEE d MMMM yyyy");
        const last = acc[acc.length - 1];
        if (last?.day === day) last.items.push(e); else acc.push({ day, items: [e] });
        return acc;
    }, []);

    return (
        <div className="space-y-6">
            <PageHeader title="Activity Log" description="Every change your team makes in the admin area: who did it, what changed, and when." />
            <Card>
                <CardHeader className="pb-3">
                    <Select value={resource} onValueChange={(v) => setParam("resource", v)}>
                        <SelectTrigger className="h-9 w-full sm:w-56 capitalize" aria-label="Filter by type"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Everything</SelectItem>
                            {(data?.resources ?? []).map((r) => <SelectItem key={r} value={r} className="capitalize">{r}s</SelectItem>)}
                        </SelectContent>
                    </Select>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-3">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                    ) : entries.length === 0 ? (
                        <EmptyState icon={History} title="Nothing recorded yet" description="Changes to tours, bookings, coupons, users and settings will show up here." />
                    ) : (
                        <div className="space-y-6">
                            {groups.map((g) => (
                                <section key={g.day}>
                                    <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">{g.day}</h2>
                                    <ol className="divide-y divide-slate-100 rounded-xl border border-slate-100">
                                        {g.items.map((e) => {
                                            const a = ACTION[e.action] ?? ACTION.update;
                                            const Icon = a.icon;
                                            const to = linkFor(e);
                                            const what = e.label || e.resourceId?.slice(-8) || "";
                                            return (
                                                <li key={e._id} className="flex items-start gap-3 px-4 py-3">
                                                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100"><Icon className="h-3.5 w-3.5 text-slate-500" /></span>
                                                    <div className="min-w-0 flex-1 text-sm">
                                                        <p className="text-slate-700">
                                                            <span className="font-semibold text-slate-900">{e.actorName ?? "Someone"}</span>{" "}
                                                            {a.verb} {e.resource}{" "}
                                                            {to ? <Link to={to} className="font-medium text-brand-blue hover:text-brand-orange">{what}</Link> : <span className="font-medium">{what}</span>}
                                                        </p>
                                                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                            {e.detail && <StatusPill tone={a.tone}>{e.detail}</StatusPill>}
                                                            {e.actorRole && <span>{ROLE_LABELS[e.actorRole] ?? e.actorRole}</span>}
                                                        </div>
                                                    </div>
                                                    <time className="shrink-0 text-xs text-muted-foreground" dateTime={e.createdAt} title={new Date(e.createdAt).toLocaleString()}>{timeAgo(e.createdAt)}</time>
                                                </li>
                                            );
                                        })}
                                    </ol>
                                </section>
                            ))}
                            <TableFooter pagination={data?.pagination} onPageChange={(p) => setParam("page", String(p))} noun="changes" />
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
