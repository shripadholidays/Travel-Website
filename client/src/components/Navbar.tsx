import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X, ChevronDown, PenLine, LayoutDashboard, Heart, LogOut, ShieldCheck, Settings, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '@/components/ui/Logo';
import { useCurrency, type Currency } from '@/context/CurrencyContext';
import { useAuth } from '@/context/AuthContext';
import { SearchDialog } from '@/components/SearchDialog';
import { usePublicSettings } from '@/hooks/use-settings';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { OfferBar } from '@/components/ui/OfferBar';
import { useEnabledFeatures } from '@/hooks/use-feature';
import { withFeatureLinks } from '@/lib/feature-links';
import { rememberReturnTo } from '@/lib/return-to';
import { adminHome, hasPermission, isStaff } from '@/lib/admin-access';

const DEFAULT_NAV = [
    { label: 'Destinations', path: '/destinations', order: 0 },
    { label: 'Tours', path: '/tours', order: 1 },
    { label: 'Collections', path: '/collections', order: 2 },
    { label: 'Magazine', path: '/blog', order: 3 },
    { label: 'About', path: '/about', order: 4 },
];

// Detail pages light up their section: a tour belongs to Tours, an article to Magazine…
const SECTION_ALIASES: Record<string, string[]> = {
    '/tours': ['/tour/', '/book'],
    '/blog': ['/write-article'],
};

function isActivePath(pathname: string, path: string) {
    if (path === '/') return pathname === '/';
    const base = path.split('?')[0];
    return pathname === base
        || pathname.startsWith(`${base}/`)
        // Aliases ending in "/" cover a whole section; others are exact pages ("/book", not "/bookings")
        || (SECTION_ALIASES[base] ?? []).some((alias) => (alias.endsWith('/') ? pathname.startsWith(alias) : pathname === alias));
}

const CURRENCIES: { value: Currency; label: string }[] = [
    { value: 'USD', label: 'USD ($)' },
    { value: 'INR', label: 'INR (₹)' },
    { value: 'EUR', label: 'EUR (€)' },
    { value: 'GBP', label: 'GBP (£)' },
];

export const Navbar = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showOffer, setShowOffer] = useState(true);
    const { currency, setCurrency } = useCurrency();
    const { user, logout } = useAuth();
    const location = useLocation();
    const { data: settingsData } = usePublicSettings();
    const settingsNavLinks = settingsData?.settings?.navLinks;
    // Only once settings have loaded, and only with something to say (no flash, no stand-in text)
    const offerBar = settingsData?.settings?.offerBar;
    const showOfferBar = offerBar?.enabled === true && !!offerBar.text?.trim();
    const travelFeatures = useEnabledFeatures();

    // Flights/Hotels links follow the admin switches (inserted after Tours, removed when off)
    const sortedSettingsLinks = (settingsNavLinks?.length ?? 0) > 0
        ? [...settingsNavLinks!].sort((a, b) => a.order - b.order)
        : null;
    const desktopNavItems = withFeatureLinks(sortedSettingsLinks ?? DEFAULT_NAV, travelFeatures);
    // The phone menu always offers Contact, even when the admin's menu leaves it out
    const mobileNavItems = desktopNavItems.some((i) => i.path.startsWith('/contact'))
        ? desktopNavItems
        : [...desktopNavItems, { label: 'Contact', path: '/contact', order: 99 }];

    const isHome = location.pathname === '/';
    // Flights & Hotels open with a photo hero, so they get the transparent header like Home
    const isTravelHero = (location.pathname === '/flights' && travelFeatures.flights)
        || (location.pathname === '/hotels' && travelFeatures.hotels);
    const isDetailsPage = location.pathname.startsWith('/destinations/') || location.pathname.startsWith('/tour/') || isTravelHero;
    const isTransparentHeader = isHome || isDetailsPage;

    // Standard Pages (Sticky Header, Solid Background)
    const isStandardPage = !isTransparentHeader;

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close the phone menu on navigation and with Escape
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname, location.search]);
    useEffect(() => {
        if (!isMobileMenuOpen) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setIsMobileMenuOpen(false);
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isMobileMenuOpen]);

    // Navbar Styling
    const navClasses = cn(
        'w-full transition-all duration-300 ease-in-out',
        isScrolled || isStandardPage
            ? 'py-3 bg-white/90 backdrop-blur-md shadow-sm border-b border-brand-light'
            : 'py-4 lg:py-5 bg-transparent'
    );

    const containerClasses = cn(
        'mx-auto flex items-center justify-between w-full max-w-7xl px-4 lg:px-6',
    );

    const textColor = isScrolled || isStandardPage ? "text-brand-blue" : "text-white";
    const hoverBg = isScrolled || isStandardPage ? "hover:bg-brand-light/50" : "hover:bg-white/10";

    // Whether we're rendering white-on-image (transparent, not yet scrolled).
    const isOverlay = isTransparentHeader && !isScrolled;

    const accountLinks = [
        { to: '/dashboard', label: 'My trips', icon: LayoutDashboard },
        { to: '/dashboard?tab=wishlist', label: 'Wishlist', icon: Heart },
        { to: '/dashboard?tab=articles', label: 'My articles', icon: FileText },
        { to: '/dashboard?tab=settings', label: 'Settings', icon: Settings },
    ];
    const adminLink = isStaff(user) ? adminHome(user) : null;
    // Moderators only review articles, so name the link after what they do there
    const adminLabel = hasPermission(user, 'dashboard.view') ? 'Admin Panel' : 'Review articles';

    return (
        <div className={cn(
            "top-0 left-0 right-0 z-50 flex flex-col transition-all duration-300",
            isStandardPage ? "sticky bg-white/80 backdrop-blur-md" : "fixed"
        )}>
            {/* Scrim: guarantees legibility of white nav content over any hero image */}
            {isOverlay && (
                <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/55 via-black/25 to-transparent" />
            )}

            <AnimatePresence>
                {showOffer && showOfferBar && <OfferBar onClose={() => setShowOffer(false)} />}
            </AnimatePresence>

            <nav aria-label="Main" className={cn(navClasses, "relative")}>
                <div className={containerClasses}>
                    <div className="flex items-center gap-4 xl:gap-8 min-w-0">
                        <Logo light={!isScrolled && isTransparentHeader} className="scale-90 md:scale-100" />

                        {/* Desktop Menu */}
                        <div className={cn(
                            "hidden lg:flex items-center gap-0.5 xl:gap-1 rounded-full p-1 transition-all duration-300",
                            isOverlay
                                ? "bg-white/10 backdrop-blur-md border border-white/25 shadow-lg shadow-black/10"
                                : "bg-transparent border border-transparent"
                        )}>
                            {desktopNavItems.map((item) => {
                                const active = isActivePath(location.pathname, item.path);
                                return (
                                    <Link
                                        key={item.label}
                                        to={item.path}
                                        aria-current={active ? 'page' : undefined}
                                        className={cn(
                                            "px-2.5 xl:px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap",
                                            isOverlay
                                                ? cn("text-white hover:bg-white/20 [text-shadow:0_1px_3px_rgba(0,0,0,0.4)]", active && "bg-white/25")
                                                : cn("text-brand-blue hover:bg-black/5", active && "bg-brand-orange/10 text-brand-orange")
                                        )}
                                    >
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 xl:gap-2 shrink-0">
                        {/* Search: one instance for every screen size (it owns the "/" shortcut) */}
                        <div className={cn("transition-colors", textColor, isOverlay && "[&_button]:[text-shadow:0_1px_2px_rgba(0,0,0,0.35)]")}>
                            <SearchDialog />
                        </div>

                        {/* Right Actions */}
                        <div className={cn(
                            "hidden lg:flex items-center gap-1.5 xl:gap-2",
                            isOverlay && "[&_button]:[text-shadow:0_1px_2px_rgba(0,0,0,0.35)]"
                        )}>
                            {/* Currency */}
                            <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                                <SelectTrigger aria-label="Currency" className={cn("w-auto gap-1 bg-transparent border-none h-9 rounded-full text-xs font-bold focus:ring-0 px-3", textColor, hoverBg)}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent align="end">
                                    {CURRENCIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                                </SelectContent>
                            </Select>

                            <div className={cn("h-5 w-px mx-1", isOverlay ? "bg-white/25" : "bg-slate-200")} />

                            {user ? (
                                <div className="flex items-center gap-2">
                                    {/* Write */}
                                    <Button
                                        asChild
                                        size="sm"
                                        className={cn(
                                            "h-9 rounded-full px-2.5 xl:px-4 gap-1.5 text-sm font-medium border bg-transparent shadow-none transition-colors",
                                            isOverlay
                                                ? "text-white border-white/30 hover:bg-white/15"
                                                : "text-brand-blue border-slate-200 hover:bg-slate-100"
                                        )}
                                    >
                                        <Link to="/write-article" aria-label="Write an article">
                                            <PenLine className="w-4 h-4" /> <span className="hidden xl:inline">Write</span>
                                        </Link>
                                    </Button>

                                    {/* Avatar dropdown */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button
                                                aria-label="Account menu"
                                                className={cn(
                                                    "flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange",
                                                    isOverlay ? "border-white/30 bg-white/10 backdrop-blur-md hover:bg-white/20" : "border-slate-200 bg-white hover:bg-slate-50"
                                                )}
                                            >
                                                <Avatar name={user.displayName} picture={user.profilePicture} size="sm" />
                                                <ChevronDown className={cn("w-3.5 h-3.5", textColor)} />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                            align="end"
                                            sideOffset={10}
                                            className="w-64 p-2 rounded-2xl border border-white/40 bg-white/80 backdrop-blur-2xl shadow-2xl shadow-brand-blue/10"
                                        >
                                            <DropdownMenuLabel className="flex items-center gap-3 px-2 py-2.5">
                                                <Avatar name={user.displayName} picture={user.profilePicture} size="md" />
                                                <div className="min-w-0">
                                                    <p className="font-bold truncate text-brand-blue">{user.displayName}</p>
                                                    <p className="text-xs font-normal text-muted-foreground truncate">{user.email}</p>
                                                </div>
                                            </DropdownMenuLabel>
                                            <DropdownMenuSeparator className="bg-slate-200/60" />
                                            {accountLinks.map(({ to, label, icon: Icon }) => (
                                                <DropdownMenuItem key={to} asChild className="rounded-xl py-2.5 cursor-pointer focus:bg-brand-light/60">
                                                    <Link to={to}><Icon className="w-4 h-4 mr-2.5 text-brand-orange" /> {label}</Link>
                                                </DropdownMenuItem>
                                            ))}
                                            {adminLink && (
                                                <DropdownMenuItem asChild className="rounded-xl py-2.5 cursor-pointer focus:bg-brand-light/60">
                                                    <Link to={adminLink}><ShieldCheck className="w-4 h-4 mr-2.5 text-brand-orange" /> {adminLabel}</Link>
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuSeparator className="bg-slate-200/60" />
                                            <DropdownMenuItem onClick={() => logout()} className="rounded-xl py-2.5 text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer">
                                                <LogOut className="w-4 h-4 mr-2.5" /> Log out
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Button
                                        asChild
                                        size="sm"
                                        className={cn(
                                            "h-9 rounded-full px-4 xl:px-5 font-medium border bg-transparent shadow-none transition-colors",
                                            isOverlay
                                                ? "text-white border-white/30 hover:bg-white/15"
                                                : "text-brand-blue border-slate-200 hover:bg-slate-100"
                                        )}
                                    >
                                        <Link to="/login" onClick={() => rememberReturnTo(location)}>Log in</Link>
                                    </Button>
                                    <Button asChild size="sm" className="h-9 bg-brand-orange text-white hover:bg-brand-orange/90 rounded-full px-4 xl:px-5 shadow-lg shadow-brand-orange/20">
                                        <Link to="/register" onClick={() => rememberReturnTo(location)}>Sign Up</Link>
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Mobile Toggle */}
                        <button
                            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
                            aria-expanded={isMobileMenuOpen}
                            aria-controls="mobile-menu"
                            className={cn(
                                "lg:hidden p-2 rounded-full transition-colors",
                                isOverlay ? "hover:bg-white/15" : "hover:bg-slate-100"
                            )}
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            {isMobileMenuOpen ? <X className={textColor} /> : <Menu className={textColor} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                <AnimatePresence>
                    {isMobileMenuOpen && (
                        <motion.div
                            id="mobile-menu"
                            initial={{ opacity: 0, y: -20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                            className="absolute top-full mt-2 left-4 right-4 max-h-[calc(100dvh-6rem)] overflow-y-auto bg-white/95 backdrop-blur-xl shadow-2xl rounded-3xl border border-white/20 lg:hidden"
                        >
                            <div className="p-5 flex flex-col gap-1">
                                {/* User header */}
                                {user && (
                                    <div className="flex items-center gap-3 p-3 mb-2 rounded-2xl bg-brand-light/40">
                                        <Avatar name={user.displayName} picture={user.profilePicture} size="lg" />
                                        <div className="min-w-0">
                                            <p className="font-bold text-brand-blue truncate">{user.displayName}</p>
                                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                        </div>
                                    </div>
                                )}

                                {mobileNavItems.map((item) => {
                                    const active = isActivePath(location.pathname, item.path);
                                    return (
                                        <Link
                                            key={item.label}
                                            to={item.path}
                                            aria-current={active ? 'page' : undefined}
                                            className={cn(
                                                "text-base font-bold p-3.5 rounded-2xl transition-colors",
                                                active ? "bg-brand-orange/10 text-brand-orange" : "text-brand-blue hover:bg-brand-light/50"
                                            )}
                                        >
                                            {item.label}
                                        </Link>
                                    );
                                })}

                                <div className="border-t border-slate-100 my-2" />

                                {/* Currency on phones too */}
                                <div className="flex items-center justify-between px-3.5 py-2">
                                    <span className="text-sm font-medium text-slate-600">Currency</span>
                                    <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                                        <SelectTrigger aria-label="Currency" className="w-32 h-9 rounded-full text-sm font-bold">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent align="end" className="z-[70]">
                                            {CURRENCIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="border-t border-slate-100 my-2" />

                                <div className="flex flex-col gap-1">
                                    {user ? (
                                        <>
                                            {accountLinks.map(({ to, label, icon: Icon }) => (
                                                <Link key={to} to={to} className="flex items-center gap-3 p-3 rounded-2xl text-brand-blue font-medium hover:bg-brand-light/50">
                                                    <Icon className="w-4 h-4 text-brand-orange" /> {label}
                                                </Link>
                                            ))}
                                            <Link to="/write-article" className="flex items-center gap-3 p-3 rounded-2xl text-brand-blue font-medium hover:bg-brand-light/50">
                                                <PenLine className="w-4 h-4 text-brand-orange" /> Write an article
                                            </Link>
                                            {adminLink && (
                                                <Link to={adminLink} className="flex items-center gap-3 p-3 rounded-2xl text-brand-blue font-medium hover:bg-brand-light/50">
                                                    <ShieldCheck className="w-4 h-4 text-brand-orange" /> {adminLabel}
                                                </Link>
                                            )}
                                            <Button variant="ghost" className="mt-2 w-full gap-2 text-red-600 hover:text-red-600 hover:bg-red-50" onClick={() => { logout(); setIsMobileMenuOpen(false); }}>
                                                <LogOut className="w-4 h-4" /> Log out
                                            </Button>
                                        </>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-3">
                                            <Button variant="outline" className="w-full" asChild>
                                                <Link to="/login" onClick={() => rememberReturnTo(location)}>Log In</Link>
                                            </Button>
                                            <Button className="w-full bg-brand-orange hover:bg-brand-orange/90" asChild>
                                                <Link to="/register" onClick={() => rememberReturnTo(location)}>Sign Up</Link>
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>
        </div>
    );
};

const AVATAR_SIZES = { sm: 'w-7 h-7 text-xs', md: 'w-10 h-10', lg: 'w-11 h-11' };

const Avatar = ({ name, picture, size }: { name: string; picture?: string; size: keyof typeof AVATAR_SIZES }) => {
    const [failed, setFailed] = useState(false);
    if (picture && !failed) {
        return <img src={picture} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} className={cn(AVATAR_SIZES[size], "rounded-full object-cover")} />;
    }
    return (
        <div className={cn(AVATAR_SIZES[size], "bg-brand-orange rounded-full flex items-center justify-center text-white font-bold shadow-sm")}>
            {name.charAt(0).toUpperCase()}
        </div>
    );
};
