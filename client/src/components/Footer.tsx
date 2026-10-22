import { useState, type ComponentType } from 'react';
import { Facebook, Instagram, Twitter, Mail, MapPin, Phone, Send, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Container } from '@/components/ui/container';
import { Logo } from '@/components/ui/Logo';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { usePublicSettings } from '@/hooks/use-settings';
import { useEnabledFeatures } from '@/hooks/use-feature';
import { withFeatureLinks } from '@/lib/feature-links';
import { useSubscribeNewsletter } from '@/hooks/use-contact';

// Address and phone have no stand-ins: a made-up number is worse than none.
const FALLBACK = {
    companyName: 'Wandeazy',
    contactEmail: 'hello@wandeazy.com',
};

export const Footer = () => {
    const { data } = usePublicSettings();
    const settings = data?.settings;
    const travelFeatures = useEnabledFeatures();

    const companyName = settings?.companyName || FALLBACK.companyName;
    const email = settings?.contactEmail || FALLBACK.contactEmail;
    const phone = settings?.contactPhone?.trim();
    const address = settings?.address?.trim();
    const social = settings?.socialLinks;
    // Keep the year current even when the admin text was written in an earlier year
    const year = new Date().getFullYear();
    const copyright = (settings?.footer?.copyrightText || `© ${year} ${companyName}. All rights reserved.`)
        .replace(/©\s*\d{4}/, `© ${year}`);
    const showNewsletter = settings?.footer?.showNewsletter ?? true;

    const exploreLinks = withFeatureLinks((settings?.footerExploreLinks?.length ?? 0) > 0
        ? settings!.footerExploreLinks
        : [
            { label: 'Destinations', path: '/destinations' },
            { label: 'Tours', path: '/tours' },
            { label: 'Collections', path: '/collections' },
            { label: 'Hot Deals', path: '/tours' },
        ], travelFeatures);

    const companyLinks = (settings?.footerCompanyLinks?.length ?? 0) > 0
        ? settings!.footerCompanyLinks
        : [
            { label: 'About Us', path: '/about' },
            { label: 'Contact', path: '/contact' },
            { label: 'Travel Blog', path: '/blog' },
            { label: 'FAQ', path: '/faq' },
            { label: 'Privacy Policy', path: '/privacy' },
        ];

    return (
        <footer className="bg-brand-dark text-white pt-16 pb-8 border-t border-white/10">
            <Container>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
                    {/* Brand */}
                    <div className="space-y-4">
                        <div className="mb-2">
                            <Logo light />
                        </div>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Discover the world's most breathtaking destinations with {companyName}.
                            Your journey to extraordinary experiences begins here.
                        </p>
                        <div className="flex gap-4">
                            {social?.facebook && <SocialIcon Icon={Facebook} href={social.facebook} label="Facebook" />}
                            {social?.instagram && <SocialIcon Icon={Instagram} href={social.instagram} label="Instagram" />}
                            {social?.twitter && <SocialIcon Icon={Twitter} href={social.twitter} label="Twitter" />}
                        </div>
                    </div>

                    {/* Explore Links */}
                    <div>
                        <h4 className="font-display font-bold text-lg mb-6">Explore</h4>
                        <ul className="space-y-3 text-slate-400 text-sm">
                            {exploreLinks.map((link) => (
                                <li key={link.path + link.label}>
                                    <Link to={link.path} className="hover:text-brand-orange transition-colors">{link.label}</Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Company Links */}
                    <div>
                        <h4 className="font-display font-bold text-lg mb-6">Company</h4>
                        <ul className="space-y-3 text-slate-400 text-sm">
                            {companyLinks.map((link) => (
                                <li key={link.path + link.label}>
                                    <Link to={link.path} className="hover:text-brand-orange transition-colors">{link.label}</Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact + newsletter */}
                    <div>
                        <h4 className="font-display font-bold text-lg mb-6">Get in Touch</h4>
                        <ul className="space-y-4 text-slate-400 text-sm mb-6">
                            {address && (
                                <li className="flex items-start gap-3">
                                    <MapPin className="w-5 h-5 text-brand-orange shrink-0" />
                                    <span>{address}</span>
                                </li>
                            )}
                            {phone && (
                                <li className="flex items-center gap-3">
                                    <Phone className="w-5 h-5 text-brand-orange shrink-0" />
                                    <a href={`tel:${phone.replace(/\s/g, '')}`} className="hover:text-brand-orange transition-colors">{phone}</a>
                                </li>
                            )}
                            <li className="flex items-center gap-3">
                                <Mail className="w-5 h-5 text-brand-orange shrink-0" />
                                <a href={`mailto:${email}`} className="hover:text-brand-orange transition-colors">{email}</a>
                            </li>
                        </ul>
                        {showNewsletter && <NewsletterForm />}
                    </div>
                </div>

                <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
                    <p>{copyright}</p>
                    <div className="flex gap-6">
                        <Link to="/terms" className="hover:text-white">Terms</Link>
                        <Link to="/privacy" className="hover:text-white">Privacy</Link>
                        <Link to="/contact" className="hover:text-white">Contact</Link>
                    </div>
                </div>
            </Container>
        </footer>
    );
};

const NewsletterForm = () => {
    const [email, setEmail] = useState('');
    const subscribe = useSubscribeNewsletter();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;
        subscribe.mutate(email.trim(), {
            onSuccess: () => {
                toast.success('Subscribed! Check your inbox for travel inspiration.');
                setEmail('');
            },
            onError: (err: Error) => toast.error(err.message || 'Subscription failed'),
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-2">
            <label htmlFor="newsletter-email" className="text-xs text-slate-500">
                Subscribe to our newsletter
            </label>
            <div className="flex gap-2">
                <Input
                    id="newsletter-email"
                    type="email"
                    required
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                />
                <Button
                    type="submit"
                    variant="brand"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    disabled={subscribe.isPending}
                    aria-label="Subscribe"
                >
                    {subscribe.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Send className="w-4 h-4" />
                    )}
                </Button>
            </div>
        </form>
    );
};

const SocialIcon = ({ Icon, href, label }: { Icon: ComponentType<{ className?: string }>; href: string; label: string }) => (
    <a
        href={href}
        target={href.startsWith('http') ? '_blank' : undefined}
        rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
        aria-label={label}
        className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-brand-orange hover:text-white transition-all duration-300"
    >
        <Icon className="w-5 h-5" />
    </a>
);
