import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Map, Calendar, DollarSign, FileText, MessageSquare, Clock, PencilRuler, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useDashboardStats } from "@/hooks/use-admin";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrency } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";
import type { Booking } from "@/types";

export const AdminDashboard = () => {
    const { data: stats, isLoading } = useDashboardStats();
    const { formatUSD } = useCurrency();

    const statCards = [
        // Revenue is earned in US dollars, so it is shown in dollars whatever currency is selected
        { label: "Revenue (USD)", value: stats ? formatUSD(stats.totalRevenue) : "—", icon: DollarSign },
        { label: "Bookings", value: stats?.totalBookings?.toString() ?? "—", icon: Calendar },
        { label: "Live Tours", value: stats?.totalTours?.toString() ?? "—", icon: Map },
        { label: "Registered Users", value: stats?.totalUsers?.toString() ?? "—", icon: Users },
    ];

    const attention = stats?.attention;
    const todo = attention ? [
        { count: attention.pendingArticles, label: attention.pendingArticles === 1 ? "article to review" : "articles to review", to: "/admin/blog", icon: FileText },
        { count: attention.newInquiries, label: attention.newInquiries === 1 ? "new message" : "new messages", to: "/admin/inquiries", icon: MessageSquare },
        { count: attention.pendingBookings, label: attention.pendingBookings === 1 ? "booking awaiting payment" : "bookings awaiting payment", to: "/admin/bookings", icon: Clock },
        { count: attention.draftTours, label: attention.draftTours === 1 ? "tour not live yet" : "tours not live yet", to: "/admin/tours", icon: PencilRuler },
    ].filter((t) => t.count > 0) : [];

    const recentBookings = stats?.recentBookings ?? [];

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-display font-bold tracking-tight text-brand-blue">Dashboard</h2>
                <p className="text-muted-foreground">Overview of your travel platform's performance.</p>
            </div>

            {todo.length > 0 && (
                <Card className="border-brand-orange/20 bg-brand-orange/[0.03]">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Needs your attention</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {todo.map(({ count, label, to, icon: Icon }) => (
                            <Link key={to} to={to} className="flex items-center gap-3 rounded-xl bg-white border border-slate-100 p-4 hover:border-brand-orange/40 hover:shadow-sm transition-all group">
                                <Icon className="w-5 h-5 text-brand-orange shrink-0" />
                                <span className="flex-1 text-sm"><span className="font-bold text-brand-blue text-base mr-1">{count}</span>{label}</span>
                                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-brand-orange transition-colors" />
                            </Link>
                        ))}
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {statCards.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <Card key={stat.label} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-brand-orange/10 flex items-center justify-center shrink-0">
                                    <Icon className="h-6 w-6 text-brand-orange" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                                    {isLoading ? (
                                        <Skeleton className="h-7 w-20 mt-1" />
                                    ) : (
                                        <p className="text-xl xl:text-2xl font-bold font-display text-brand-blue tabular-nums break-words">{stat.value}</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Bookings by Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-[200px] w-full" />
                        ) : (
                            <div className="space-y-4 py-2">
                                {(() => {
                                    const data = stats?.bookingsByStatus ?? [];
                                    const max = Math.max(1, ...data.map((d) => d.count));
                                    const colors: Record<string, string> = {
                                        confirmed: 'bg-green-500', pending: 'bg-yellow-500',
                                        cancelled: 'bg-red-500', completed: 'bg-blue-500',
                                    };
                                    return data.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-16">No booking data yet.</p>
                                    ) : data.map((item) => (
                                        <div key={item._id} className="flex items-center gap-3">
                                            <span className="w-20 text-sm capitalize text-muted-foreground shrink-0">{item._id}</span>
                                            <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={cn("h-full rounded-full transition-all", colors[item._id] || 'bg-brand-orange')}
                                                    style={{ width: `${(item.count / max) * 100}%` }}
                                                />
                                            </div>
                                            <span className="w-8 text-right font-bold text-brand-blue">{item.count}</span>
                                        </div>
                                    ));
                                })()}
                            </div>
                        )}
                    </CardContent>
                </Card>
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Recent Bookings</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <Skeleton key={i} className="h-12 w-full" />
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {recentBookings.slice(0, 5).map((booking: Booking, i: number) => {
                                    const tourName = typeof booking.tour === 'object' ? booking.tour.title : 'Tour';
                                    return (
                                        <div key={booking._id} className="flex items-center">
                                            <span className="relative flex h-9 w-9 shrink-0 overflow-hidden rounded-full mr-4 bg-brand-orange/10 text-brand-orange items-center justify-center text-xs font-bold">
                                                {booking.contactInfo?.firstName?.charAt(0)?.toUpperCase() ?? (i + 1)}
                                            </span>
                                            <div className="space-y-1 flex-1 min-w-0">
                                                <p className="text-sm font-medium leading-none truncate">{tourName}</p>
                                                <p className="text-xs text-muted-foreground">{booking.contactInfo.email}</p>
                                            </div>
                                            <div className="ml-auto font-medium">{formatUSD(booking.totalAmount)}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
