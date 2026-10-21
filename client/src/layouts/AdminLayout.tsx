import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Map, Calendar, Users, Settings, LogOut,
    FileText, Globe, Menu, X, ExternalLink,
    Home, Layers, MessageSquare, Mail, Star,
    CreditCard, HelpCircle, Info, Tag, Plane } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/ui/Logo';

type NavItem = {
    label: string;
    path: string;
    icon: React.ComponentType<{ className?: string }>;
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
        group: 'Content',
        items: [
            { label: 'Homepage', path: '/admin/homepage', icon: Home },
            { label: 'About Page', path: '/admin/about', icon: Info },
            { label: 'FAQ', path: '/admin/faq', icon: HelpCircle },
        ],
    },
    {
        group: 'Catalog',
        items: [
            { label: 'Tours', path: '/admin/tours', icon: Map },
            { label: 'Destinations', path: '/admin/destinations', icon: Globe },
            { label: 'Collections', path: '/admin/collections', icon: Layers },
        ],
    },
    {
        group: 'Operations',
        items: [
            { label: 'Bookings', path: '/admin/bookings', icon: Calendar },
            { label: 'Payments', path: '/admin/payments', icon: CreditCard },
            { label: 'Travel Orders', path: '/admin/travel-orders', icon: Plane },
            { label: 'Coupons', path: '/admin/coupons', icon: Tag },
            { label: 'Reviews', path: '/admin/reviews', icon: Star },
        ],
    },
    {
        group: 'Community',
        items: [
            { label: 'Users', path: '/admin/users', icon: Users },
            { label: 'Inquiries', path: '/admin/inquiries', icon: MessageSquare },
            { label: 'Subscribers', path: '/admin/subscribers', icon: Mail },
            { label: 'Blog & Articles', path: '/admin/blog', icon: FileText },
        ],
    },
    {
        group: 'System',
        items: [
            { label: 'Settings', path: '/admin/settings', icon: Settings },
        ],
    },
];

export const AdminLayout = () => {
    const location = useLocation();
    const { logout } = useAuth();
    const [mobileOpen, setMobileOpen] = useState(false);

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
                <nav className="space-y-5">
                    {NAV.map(({ group, items }) => (
                        <div key={group}>
                            <p className="mb-1 px-4 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                                {group}
                            </p>
                            <div className="space-y-0.5">
                                {items.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = location.pathname === item.path ||
                                        (item.path !== '/admin/dashboard' && location.pathname.startsWith(item.path));
                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            onClick={() => setMobileOpen(false)}
                                            className={cn(
                                                "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                                                isActive
                                                    ? "bg-brand-orange text-white shadow-md shadow-brand-orange/20"
                                                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                            )}
                                        >
                                            <Icon className="h-4 w-4 shrink-0" />
                                            {item.label}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="space-y-1 pt-4 border-t border-slate-100">
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

    return (
        <div className="min-h-screen bg-slate-50">
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
                    <aside className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl">
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
            </header>

            {/* Main content */}
            <main className="lg:pl-64">
                <div className="p-4 md:p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};
