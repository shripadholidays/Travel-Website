import { cn } from '@/lib/utils';

/** Orange rule + spaced capitals, as used by "SPECIAL OFFERS" on the home page. */
export const Eyebrow = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <p className={cn('flex items-center gap-3 text-brand-orange text-sm font-bold uppercase tracking-[0.2em]', className)}>
        <span aria-hidden="true" className="h-0.5 w-10 bg-brand-orange" />
        {children}
    </p>
);
