import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Map, Calendar, DollarSign } from "lucide-react";
import { useDashboardStats } from "@/hooks/use-admin";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrency } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";
import type { Booking } from "@/types";

export const AdminDashboard = () => {
    const { data: stats, isLoading } = useDashboardStats();
    const { formatPrice } = useCurrency();

    const statCards = [
        { label: "Total Revenue", value: stats ? formatPrice(stats.totalRevenue) : "—", icon: DollarSign },
        { label: "Bookings", value: stats?.totalBookings?.toString() ?? "—", icon: Calendar },
        { label: "Active Tours", value: stats?.totalTours?.toString() ?? "—", icon: Map },
        { label: "Active Users", value: stats?.totalUsers?.toString() ?? "—", icon: Users },
    ];

    const recentBookings = stats?.recentBookings ?? [];

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-display font-bold tracking-tight text-brand-blue">Dashboard</h2>
                <p className="text-muted-foreground">Overview of your travel platform's performance.</p>
            </div>

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
                                        <p className="text-2xl font-bold font-display text-brand-blue truncate">{stat.value}</p>
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
                                            <div className="ml-auto font-medium">{formatPrice(booking.totalAmount)}</div>
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
