import { useState, useEffect } from 'react';
import { X, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/container';
import { usePublicSettings } from '@/hooks/use-settings';

interface TimeLeft { days: number; hours: number; minutes: number; seconds: number }

function computeTimeLeft(end: string | null): TimeLeft {
    if (!end) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    const diff = Math.max(0, Math.floor((new Date(end).getTime() - Date.now()) / 1000));
    return {
        days: Math.floor(diff / 86400),
        hours: Math.floor((diff % 86400) / 3600),
        minutes: Math.floor((diff % 3600) / 60),
        seconds: diff % 60,
    };
}

interface OfferBarProps {
    onClose: () => void;
}

export const OfferBar = ({ onClose }: OfferBarProps) => {
    const { data } = usePublicSettings();
    const offerBar = data?.settings?.offerBar;

    const [timeLeft, setTimeLeft] = useState<TimeLeft>(computeTimeLeft(offerBar?.countdownEnd ?? null));

    useEffect(() => {
        if (!offerBar?.countdownEnd) return;
        const timer = setInterval(() => {
            setTimeLeft(computeTimeLeft(offerBar.countdownEnd));
        }, 1000);
        return () => clearInterval(timer);
    }, [offerBar?.countdownEnd]);

    // When settings load, recalculate
    useEffect(() => {
        setTimeLeft(computeTimeLeft(offerBar?.countdownEnd ?? null));
    }, [offerBar?.countdownEnd]);

    const hasCountdown = !!offerBar?.countdownEnd;
    const countdownExpired = hasCountdown && Object.values(timeLeft).every(v => v === 0);
    const showCountdown = hasCountdown && !countdownExpired;

    const bg = (offerBar?.gradientFrom && offerBar?.gradientTo)
        ? { background: `linear-gradient(to right, ${offerBar.gradientFrom}, ${offerBar.gradientTo})` }
        : undefined;

    return (
        <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={bg ? undefined : 'bg-gradient-to-r from-orange-500 to-rose-600'}
            style={bg}
        >
            <div className="text-white relative z-[60]">
                <Container className="py-2.5 md:py-3">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4 text-sm font-medium">

                        <div className="flex items-center gap-2 text-center md:text-left">
                            {offerBar?.badgeLabel && (
                                <span className="bg-white/20 p-1 px-2 rounded text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
                                    {offerBar.badgeLabel}
                                </span>
                            )}
                            <span>{offerBar?.text || 'Special offer — limited time only!'}</span>
                            {offerBar?.ctaLabel && offerBar?.ctaLink && (
                                <Link to={offerBar.ctaLink} className="underline font-bold ml-1">
                                    {offerBar.ctaLabel}
                                </Link>
                            )}
                        </div>

                        <div className="flex items-center gap-4 md:gap-6">
                            {showCountdown && (
                                <div className="flex items-center gap-3 bg-black/10 px-3 py-1 rounded-full backdrop-blur-sm">
                                    <Clock className="w-3.5 h-3.5 opacity-80" />
                                    <div className="flex gap-2 text-xs font-mono font-bold tracking-wide">
                                        <span>{timeLeft.days}d</span>
                                        <span className="opacity-50">:</span>
                                        <span>{String(timeLeft.hours).padStart(2, '0')}h</span>
                                        <span className="opacity-50">:</span>
                                        <span>{String(timeLeft.minutes).padStart(2, '0')}m</span>
                                        <span className="opacity-50">:</span>
                                        <span>{String(timeLeft.seconds).padStart(2, '0')}s</span>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={onClose}
                                className="hover:bg-white/20 p-1 rounded-full transition-colors"
                                aria-label="Close offer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </Container>
            </div>
        </motion.div>
    );
};
