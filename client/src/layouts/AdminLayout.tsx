import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Map, Calendar, Users, Settings, LogOut,
    FileText, Globe, Menu, X, ExternalLink,
    Home, Layers, MessageSquare, Mail, Star,
    CreditCard, HelpCircle, Info, Tag, Plane, History, Route } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { PageTitle } from '@/components/PageTitle';
import { canOpenAdminPath, hasPermission, roleLabel } from '@/lib/admin-access';
import { useDashboardStats } from '@/hooks/use-admin';
import { Logo } from '@/components/ui/Logo';
import type { DashboardStats } from '@/types';

type NavItem = {
    label: string;
    path: string;
    icon: React.ComponentType<{ className?: string }>;
    /** Work waiting in this section, shown as a count */
    badge?: keyof DashboardStats['attention'];
};

type NavGroup = {
    group: string;
    items: NavItem[];
};

const NAV: NavGroup[] = [
    {
        group: 'Overview',
        items: [
            { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
        ],
    },
    {
        group: 'Catalog',
        items: [
            { label: 'Tours', path: '/admin/tours', icon: Map, badge: 'draftTours' },
            { label: 'Destinations', path: '/admin/destinations', icon: Globe },
            { label: 'Collections', path: '/admin/collections', icon: Layers },
        ],
    },
    {
        group: 'Website content',
        items: [
            { label: 'Homepage', path: '/admin/homepage', icon: Home },
            { label: 'About Page', path: '/admin/about', icon: Info },
            { label: 'FAQ', path: '/admin/faq', icon: HelpCircle },
            { label: 'Blog & Articles', path: '/admin/blog', icon: FileText, badge: 'pendingArticles' },
        ],
    },
    {
        group: 'Sales',
        items: [
            { label: 'Bookings', path: '/admin/bookings', icon: Calendar, badge: 'pendingBookings' },
            { label: 'Custom Trips', path: '/admin/custom-trips', icon: Route, badge: 'newCustomTrips' },
            { label: 'Flight & Hotel Orders', path: '/admin/travel-orders', icon: Plane },
            { label: 'Payments', path: '/admin/payments', icon: CreditCard },
            { label: 'Coupons', path: '/admin/coupons', icon: Tag },
        ],
    },
    {
        group: 'Customers',
        items: [
            { label: 'Inquiries', path: '/admin/inquiries', icon: MessageSquare, badge: 'newInquiries' },
            { label: 'Reviews', path: '/admin/reviews', icon: Star },
            { label: 'Subscribers', path: '/admin/subscribers', icon: Mail },
        ],
    },
    {
        group: 'Team & system',
        items: [
            { label: 'Users & Roles', path: '/admin/users', icon: Users },
            { label: 'Activity Log', path: '/admin/activity', icon: History },
            { label: 'Settings', path: '/admin/settings', icon: Settings },
        ],
    },
];

const ALL_ITEMS = NAV.flatMap((g) => g.items);

export const AdminLayout = () => {
    const location = useLocation();
    const { logout, user } = useAuth();
    const [mobileOpen, setMobileOpen] = useState(false);
    const { data: stats } = useDashboardStats();
    // Each role sees only the sections it works on
    const nav = NAV
        .map((g) => ({ ...g, items: g.items.filter((item) => canOpenAdminPath(user, item.path)) }))
        .filter((g) => g.items.length > 0);

    const sidebarContent = (
        <div className="flex h-full flex-col">
            <div className="flex h-20 items-center justify-between border-b border-slate-200 px-5">
                <div className="flex flex-col">
                    <Logo />
                    <span className="ml-11 -mt-1 w-fit text-[10px] font-bold uppercase tracking-[0.2em] text-brand-orange">
                        Admin Panel
                    </span>
                </div>
                <button
                    className="lg:hidden text-slate-500 hover:text-slate-900"
                    onClick={() => setMobileOpen(false)}
                    aria-label="Close menu"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>

            <div className="flex flex-1 flex-col justify-between py-4 px-3 overflow-y-auto">
                <nav className="space-y-5" aria-label="Admin sections">
                    {nav.map(({ group, items }) => (
                        <div key={group}>
                            <p className="mb-1 px-4 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                                {group}
                            </p>
                            <div className="space-y-0.5">
                                {items.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = location.pathname === item.path ||
                                        (item.path !== '/admin/dashboard' && location.pathname.startsWith(item.path));
                                    const count = item.badge ? stats?.attention?.[item.badge] ?? 0 : 0;
                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            onClick={() => setMobileOpen(false)}
                                            aria-current={isActive ? 'page' : undefined}
                                            className={cn(
                                                "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                                                isActive
                                                    ? "bg-brand-orange text-white shadow-md shadow-brand-orange/20"
                                                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                            )}
                                        >
                                            <Icon className="h-4 w-4 shrink-0" />
                                            <span className="flex-1 truncate">{item.label}</span>
                                            {count > 0 && (
                                                <span
                                                    className={cn(
                                                        "min-w-5 rounded-full px-1.5 text-center text-[11px] font-bold tabular-nums",
                                                        isActive ? "bg-white/25 text-white" : "bg-brand-orange/10 text-brand-orange",
                                                    )}
                                                    aria-label={`${count} waiting`}
                                                >
                                                    {count}
                                                </span>
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="space-y-1 pt-4 mt-4 border-t border-slate-100">
                    {user && (
                        <div className="flex items-center gap-3 px-4 py-2">
                            {user.profilePicture ? (
                                <img src={user.profilePicture} alt="" className="h-8 w-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-blue/10 text-xs font-bold text-brand-blue">
                                    {user.displayName.charAt(0).toUpperCase()}
                                </span>
                            )}
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-800">{user.displayName}</p>
                                <p className="truncate text-xs text-slate-500">{roleLabel(user)}</p>
                            </div>
                        </div>
                    )}
                    <Link
                        to="/"
                        className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                    >
                        <ExternalLink className="h-4 w-4" />
                        View Site
                    </Link>
                    <button
                        onClick={logout}
                        className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );

    // Tab title from the section being worked on ("Bookings · Admin | Wandeazy")
    const path = location.pathname;
    const section = path.startsWith('/admin/tours/')
        ? (path.endsWith('/new') ? 'New Tour' : 'Tour Editor')
        : path.includes('write-article') ? 'Write Article'
            : ALL_ITEMS.find((item) => path.startsWith(item.path))?.label ?? 'Admin';

    return (
        <div className="min-h-screen bg-slate-50">
            <PageTitle title={section === 'Admin' ? 'Admin' : `${section} · Admin`} noIndex />
            {/* Desktop sidebar */}
            <aside className="hidden lg:block fixed left-0 top-0 z-40 h-screen w-64 border-r border-slate-200 bg-white">
                {sidebarContent}
            </aside>

            {/* Mobile drawer */}
            {mobileOpen && (
                <div className="lg:hidden fixed inset-0 z-50">
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setMobileOpen(false)}
                        aria-hidden="true"
                    />
                    <aside className="absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-white shadow-xl">
                        {sidebarContent}
                    </aside>
                </div>
            )}

            {/* Mobile top bar */}
            <header className="lg:hidden sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-4">
                <button
                    onClick={() => setMobileOpen(true)}
                    className="text-slate-600 hover:text-slate-900"
                    aria-label="Open menu"
                >
                    <Menu className="h-6 w-6" />
                </button>
                <div className="flex flex-col">
                    <Logo />
                    <span className="ml-11 -mt-1 w-fit text-[10px] font-bold uppercase tracking-[0.2em] text-brand-orange">
                        Admin Panel
                    </span>
                </div>
                {hasPermission(user, 'dashboard.view') && section !== 'Dashboard' && (
                    <span className="ml-auto truncate text-sm font-semibold text-slate-600">{section}</span>
                )}
            </header>

            {/* Main content */}
            <main className="lg:pl-64">
                <div className="p-4 md:p-8 max-w-[1400px]">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};
