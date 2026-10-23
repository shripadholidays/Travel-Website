import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Users, Map, Calendar, DollarSign, FileText, MessageSquare, Clock, PencilRuler, ArrowRight, Plus, Images, ListOrdered, CalendarX, CheckCircle2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, StatusPill } from "@/components/admin/AdminUI";
import { useDashboardStats } from "@/hooks/use-admin";
import { useAuth } from "@/context/AuthContext";
import { hasPermission, roleLabel } from "@/lib/admin-access";
import { cn } from "@/lib/utils";
import type { Booking } from "@/types";

import { money } from "@/lib/tour-status";

export const AdminDashboard = () => {
    const { data: stats, isLoading } = useDashboardStats();
    const { user } = useAuth();
    const can = (p: Parameters<typeof hasPermission>[1]) => hasPermission(user, p);

    // Only the numbers this role works with
    const statCards = [
        can("finance.view") && { label: `Revenue (${stats?.revenueCurrency ?? "base currency"})`, value: stats?.totalRevenue !== undefined ? money(stats.totalRevenue, stats.revenueCurrency) : "—", icon: DollarSign, to: "/admin/payments" },
        can("bookings.manage") && { label: "Bookings", value: stats?.totalBookings?.toString() ?? "—", icon: Calendar, to: "/admin/bookings" },
        { label: "Live tours", value: stats?.totalTours?.toString() ?? "—", icon: Map, to: can("catalog.manage") ? "/admin/tours?status=active" : undefined },
        stats?.totalUsers !== undefined && { label: "Registered users", value: stats.totalUsers.toString(), icon: Users, to: can("users.manage") ? "/admin/users" : undefined },
        stats?.totalReviews !== undefined && { label: "Reviews", value: stats.totalReviews.toString(), icon: MessageSquare, to: "/admin/reviews" },
    ].filter(Boolean).slice(0, 4) as { label: string; value: string; icon: typeof Map; to?: string }[];

    const a = stats?.attention ?? {};
    const todo = [
        { count: a.pendingArticles, label: a.pendingArticles === 1 ? "article to review" : "articles to review", to: "/admin/blog", icon: FileText },
        { count: a.newInquiries, label: a.newInquiries === 1 ? "new message" : "new messages", to: "/admin/inquiries?status=new", icon: MessageSquare },
        { count: a.pendingBookings, label: a.pendingBookings === 1 ? "booking awaiting payment" : "bookings awaiting payment", to: "/admin/bookings?status=pending", icon: Clock },
        { count: a.draftTours, label: a.draftTours === 1 ? "tour not live yet" : "tours not live yet", to: "/admin/tours?status=draft", icon: PencilRuler },
    ].filter((t) => (t.count ?? 0) > 0);

    const health = stats?.catalogHealth;
    const healthItems = health ? [
        { count: health.noGallery, label: "live tours have no gallery photos", icon: Images },
        { count: health.noItinerary, label: "live tours have no itinerary", icon: ListOrdered },
        { count: health.expiringSoon, label: "live tours stop being bookable within 30 days", icon: CalendarX },
    ].filter((h) => h.count > 0) : [];

    const recentBookings = stats?.recentBookings ?? [];
    const firstName = user?.displayName?.split(" ")[0];

    return (
        <div className="space-y-8">
            <PageHeader
                title={firstName ? `Welcome back, ${firstName}` : "Dashboard"}
                description={<>Signed in as <span className="font-medium text-slate-700">{roleLabel(user)}</span>. Here's what needs doing.</>}
                actions={can("catalog.manage") && (
                    <Button asChild className="bg-brand-orange hover:bg-brand-orange/90 gap-2"><Link to="/admin/tours/new"><Plus className="w-4 h-4" /> Add tour</Link></Button>
                )}
            />

            <Card className={cn(todo.length > 0 ? "border-brand-orange/20 bg-brand-orange/[0.03]" : "")}>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Needs your attention</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</div>
                    ) : todo.length === 0 ? (
                        <p className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> All caught up. Nothing is waiting for you.</p>
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {todo.map(({ count, label, to, icon: Icon }) => (
                                <Link key={to} to={to} className="flex items-center gap-3 rounded-xl bg-white border border-slate-100 p-4 hover:border-brand-orange/40 hover:shadow-sm transition-all group">
                                    <Icon className="w-5 h-5 text-brand-orange shrink-0" />
                                    <span className="flex-1 text-sm"><span className="font-bold text-brand-blue text-base mr-1 tabular-nums">{count}</span>{label}</span>
                                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-brand-orange transition-colors" />
                                </Link>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {statCards.map((stat) => {
                    const Icon = stat.icon;
                    const body = (
                        <CardContent className="p-4 sm:p-6 flex items-center gap-3 sm:gap-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-brand-orange/10 flex items-center justify-center shrink-0">
                                <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-brand-orange" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
                                {isLoading ? <Skeleton className="h-7 w-20 mt-1" /> : (
                                    <p className="text-lg sm:text-2xl font-bold font-display text-brand-blue tabular-nums break-words">{stat.value}</p>
                                )}
                            </div>
                        </CardContent>
                    );
                    return (
                        <Card key={stat.label} className="hover:shadow-md transition-shadow">
                            {stat.to ? <Link to={stat.to} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange">{body}</Link> : body}
                        </Card>
                    );
                })}
            </div>

            {healthItems.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Catalog health</CardTitle>
                        <p className="text-sm text-muted-foreground">Live listings missing what travellers look for. Open Tours and sort by "Recently edited" to work through them.</p>
                    </CardHeader>
                    <CardContent className="grid gap-3 sm:grid-cols-3">
                        {healthItems.map(({ count, label, icon: Icon }) => (
                            <Link key={label} to="/admin/tours?status=active" className="flex items-center gap-3 rounded-xl border border-slate-100 p-4 hover:border-brand-orange/40 transition-colors">
                                <Icon className="w-5 h-5 text-amber-600 shrink-0" />
                                <span className="text-sm"><span className="font-bold text-brand-blue mr-1 tabular-nums">{count}</span>{label}</span>
                            </Link>
                        ))}
                    </CardContent>
                </Card>
            )}

            {can("bookings.manage") && (
                <div className="grid gap-4 lg:grid-cols-7">
                    <Card className="lg:col-span-4">
                        <CardHeader><CardTitle>Bookings by status</CardTitle></CardHeader>
                        <CardContent>
                            {isLoading ? <Skeleton className="h-[200px] w-full" /> : (() => {
                                const data = stats?.bookingsByStatus ?? [];
                                const max = Math.max(1, ...data.map((d) => d.count));
                                const colors: Record<string, string> = { confirmed: "bg-emerald-500", pending: "bg-amber-500", cancelled: "bg-slate-400", completed: "bg-blue-500" };
                                return data.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-16">No bookings yet.</p>
                                ) : (
                                    <div className="space-y-4 py-2">
                                        {data.map((item) => (
                                            <Link key={item._id} to={`/admin/bookings?status=${item._id}`} className="flex items-center gap-3 group">
                                                <span className="w-24 text-sm capitalize text-muted-foreground shrink-0 group-hover:text-brand-blue">{item._id}</span>
                                                <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className={cn("h-full rounded-full", colors[item._id] || "bg-brand-orange")} style={{ width: `${(item.count / max) * 100}%` }} />
                                                </div>
                                                <span className="w-8 text-right font-bold text-brand-blue tabular-nums">{item.count}</span>
                                            </Link>
                                        ))}
                                    </div>
                                );
                            })()}
                        </CardContent>
                    </Card>
                    <Card className="lg:col-span-3">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <CardTitle>Recent bookings</CardTitle>
                            <Link to="/admin/bookings" className="text-sm font-medium text-brand-orange hover:underline">View all</Link>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                            ) : recentBookings.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-10">No bookings yet.</p>
                            ) : (
                                <div className="space-y-4">
                                    {recentBookings.slice(0, 5).map((booking: Booking) => {
                                        const tourName = typeof booking.tour === "object" && booking.tour ? booking.tour.title : "Tour removed";
                                        return (
                                            <div key={booking._id} className="flex items-center gap-3">
                                                <span className="flex h-9 w-9 shrink-0 rounded-full bg-brand-orange/10 text-brand-orange items-center justify-center text-xs font-bold">
                                                    {booking.contactInfo?.firstName?.charAt(0)?.toUpperCase() ?? "?"}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{tourName}</p>
                                                    <p className="text-xs text-muted-foreground truncate">{booking.contactInfo.firstName} {booking.contactInfo.lastName}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-medium tabular-nums">{money(booking.totalAmount, booking.currency)}</p>
                                                    <StatusPill tone={booking.status === "confirmed" ? "green" : booking.status === "pending" ? "amber" : booking.status === "completed" ? "blue" : "slate"} className="capitalize">{booking.status}</StatusPill>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};
