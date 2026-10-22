import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X, ChevronDown, PenLine, LayoutDashboard, Ticket, LogOut, ShieldCheck } from 'lucide-react';
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

export const Navbar = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showOffer, setShowOffer] = useState(true);
    const { currency, setCurrency } = useCurrency();
    const { user, logout, isAdmin } = useAuth();
    const location = useLocation();
    const { data: settingsData } = usePublicSettings();
    const settingsNavLinks = settingsData?.settings?.navLinks;
    const showOfferBar = settingsData?.settings?.offerBar?.enabled !== false;
    const travelFeatures = useEnabledFeatures();

    // Flights/Hotels links follow the admin switches (inserted after Tours, removed when off)
    const sortedSettingsLinks = (settingsNavLinks?.length ?? 0) > 0
        ? [...settingsNavLinks!].sort((a, b) => a.order - b.order)
        : null;
    const desktopNavItems = withFeatureLinks(sortedSettingsLinks ?? [
        { label: 'Destinations', path: '/destinations', order: 0 },
        { label: 'Tours', path: '/tours', order: 1 },
        { label: 'Collections', path: '/collections', order: 2 },
        { label: 'Magazine', path: '/blog', order: 3 },
        { label: 'About', path: '/about', order: 4 },
    ], travelFeatures);
    const mobileNavItems = withFeatureLinks(sortedSettingsLinks ?? [
        { label: 'Destinations', path: '/destinations', order: 0 },
        { label: 'Tours', path: '/tours', order: 1 },
        { label: 'Collections', path: '/collections', order: 2 },
        { label: 'Magazine', path: '/blog', order: 3 },
        { label: 'About', path: '/about', order: 4 },
        { label: 'Contact', path: '/contact', order: 5 },
    ], travelFeatures);

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

            <nav className={cn(navClasses, "relative")}>
                <div className={containerClasses}>
                    <div className="flex items-center gap-4 xl:gap-8">
                        <Logo light={!isScrolled && isTransparentHeader} className="scale-90 md:scale-100" />

                        {/* Desktop Menu */}
                        <div className={cn(
                            "hidden lg:flex items-center gap-0.5 xl:gap-1 rounded-full p-1 transition-all duration-300",
                            isOverlay
                                ? "bg-white/10 backdrop-blur-md border border-white/25 shadow-lg shadow-black/10"
                                : "bg-transparent border border-transparent"
                        )}>
                            {desktopNavItems.map((item) => {
                                const active = location.pathname === item.path;
                                return (
                                    <Link
                                        key={item.label}
                                        to={item.path}
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

                    {/* Right Actions */}
                    <div className={cn(
                        "hidden lg:flex items-center gap-1.5 xl:gap-2 shrink-0",
                        isOverlay && "[&_button]:[text-shadow:0_1px_2px_rgba(0,0,0,0.35)]"
                    )}>
                        {/* Search */}
                        <div className={cn("transition-colors", textColor)}>
                            <SearchDialog />
                        </div>

                        {/* Currency */}
                        <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                            <SelectTrigger className={cn("w-auto gap-1 bg-transparent border-none h-9 rounded-full text-xs font-bold focus:ring-0 px-3", textColor, hoverBg)}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent align="end">
                                <SelectItem value="USD">USD ($)</SelectItem>
                                <SelectItem value="INR">INR (₹)</SelectItem>
                                <SelectItem value="EUR">EUR (€)</SelectItem>
                                <SelectItem value="GBP">GBP (£)</SelectItem>
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
                                                "flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full border transition-all focus:outline-none",
                                                isOverlay ? "border-white/30 bg-white/10 backdrop-blur-md hover:bg-white/20" : "border-slate-200 bg-white hover:bg-slate-50"
                                            )}
                                        >
                                            {user.profilePicture ? (
                                                <img src={user.profilePicture} alt={user.displayName} referrerPolicy="no-referrer" className="w-7 h-7 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-7 h-7 bg-brand-orange rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                                    {user.displayName.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <ChevronDown className={cn("w-3.5 h-3.5", textColor)} />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        align="end"
                                        sideOffset={10}
                                        className="w-64 p-2 rounded-2xl border border-white/40 bg-white/80 backdrop-blur-2xl shadow-2xl shadow-brand-blue/10"
                                    >
                                        <DropdownMenuLabel className="flex items-center gap-3 px-2 py-2.5">
                                            {user.profilePicture ? (
                                                <img src={user.profilePicture} alt={user.displayName} referrerPolicy="no-referrer" className="w-10 h-10 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-10 h-10 bg-brand-orange rounded-full flex items-center justify-center text-white font-bold">
                                                    {user.displayName.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <p className="font-bold truncate text-brand-blue">{user.displayName}</p>
                                                <p className="text-xs font-normal text-muted-foreground truncate">{user.email}</p>
                                            </div>
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator className="bg-slate-200/60" />
                                        <DropdownMenuItem asChild className="rounded-xl py-2.5 cursor-pointer focus:bg-brand-light/60">
                                            <Link to="/dashboard"><LayoutDashboard className="w-4 h-4 mr-2.5 text-brand-orange" /> Dashboard</Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild className="rounded-xl py-2.5 cursor-pointer focus:bg-brand-light/60">
                                            <Link to="/dashboard"><Ticket className="w-4 h-4 mr-2.5 text-brand-orange" /> My Bookings</Link>
                                        </DropdownMenuItem>
                                        {isAdmin && (
                                            <DropdownMenuItem asChild className="rounded-xl py-2.5 cursor-pointer focus:bg-brand-light/60">
                                                <Link to="/admin/dashboard"><ShieldCheck className="w-4 h-4 mr-2.5 text-brand-orange" /> Admin Panel</Link>
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
                        className={cn(
                            "lg:hidden p-2 rounded-full transition-colors",
                            isOverlay ? "hover:bg-white/15" : "hover:bg-slate-100"
                        )}
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? <X className={textColor} /> : <Menu className={textColor} />}
                    </button>
                </div>

                {/* Mobile Menu */}
                <AnimatePresence>
                    {isMobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                            className="absolute top-20 left-4 right-4 bg-white/95 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden border border-white/20"
                        >
                            <div className="p-5 flex flex-col gap-1">
                                {/* User header */}
                                {user && (
                                    <Link
                                        to="/dashboard"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="flex items-center gap-3 p-3 mb-2 rounded-2xl bg-brand-light/40"
                                    >
                                        {user.profilePicture ? (
                                            <img src={user.profilePicture} alt={user.displayName} referrerPolicy="no-referrer" className="w-11 h-11 rounded-full object-cover" />
                                        ) : (
                                            <div className="w-11 h-11 bg-brand-orange rounded-full flex items-center justify-center text-white font-bold">
                                                {user.displayName.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <p className="font-bold text-brand-blue truncate">{user.displayName}</p>
                                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                        </div>
                                    </Link>
                                )}

                                {mobileNavItems.map((item) => {
                                    const active = location.pathname === item.path;
                                    return (
                                        <Link
                                            key={item.label}
                                            to={item.path}
                                            className={cn(
                                                "text-base font-bold p-3.5 rounded-2xl transition-colors",
                                                active ? "bg-brand-orange/10 text-brand-orange" : "text-brand-blue hover:bg-brand-light/50"
                                            )}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                        >
                                            {item.label}
                                        </Link>
                                    );
                                })}

                                <div className="border-t border-slate-100 my-2" />

                                <div className="flex flex-col gap-3">
                                    {user ? (
                                        <>
                                            <Link to="/write-article" onClick={() => setIsMobileMenuOpen(false)}>
                                                <Button className="w-full gap-2" variant="outline"><PenLine className="w-4 h-4" /> Write an Article</Button>
                                            </Link>
                                            {isAdmin && (
                                                <Link to="/admin/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                                                    <Button className="w-full gap-2" variant="outline"><ShieldCheck className="w-4 h-4" /> Admin Panel</Button>
                                                </Link>
                                            )}
                                            <Button variant="ghost" className="w-full gap-2 text-red-600 hover:text-red-600 hover:bg-red-50" onClick={() => { logout(); setIsMobileMenuOpen(false); }}>
                                                <LogOut className="w-4 h-4" /> Log out
                                            </Button>
                                        </>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-3">
                                            <Link to="/login" onClick={() => { rememberReturnTo(location); setIsMobileMenuOpen(false); }}>
                                                <Button variant="outline" className="w-full">Log In</Button>
                                            </Link>
                                            <Link to="/register" onClick={() => { rememberReturnTo(location); setIsMobileMenuOpen(false); }}>
                                                <Button className="w-full bg-brand-orange hover:bg-brand-orange/90">Sign Up</Button>
                                            </Link>
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
