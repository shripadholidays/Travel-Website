import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme, type ThemeChoice } from '@/lib/theme';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const OPTIONS: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'Match device', icon: Monitor },
];

/** Round icon button with a small Light / Dark / Match device menu (header, admin bar). */
export function ThemeToggle({ className }: { className?: string }) {
    const { theme, resolvedTheme, setTheme } = useTheme();
    const Icon = resolvedTheme === 'dark' ? Moon : Sun;
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    aria-label={`Colour theme: ${OPTIONS.find((o) => o.value === theme)?.label}`}
                    className={cn(
                        'inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange',
                        className,
                    )}
                >
                    <Icon className="h-[18px] w-[18px]" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="w-44 rounded-xl p-1.5">
                {OPTIONS.map(({ value, label, icon: OptIcon }) => (
                    <DropdownMenuItem
                        key={value}
                        onClick={() => setTheme(value)}
                        className="cursor-pointer gap-2.5 rounded-lg py-2"
                    >
                        <OptIcon className="h-4 w-4 text-brand-orange" />
                        <span className="flex-1">{label}</span>
                        {theme === value && <Check className="h-4 w-4 text-muted-foreground" />}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

/** Three-way segmented control for menus and settings pages (phone menu, dashboard settings). */
export function ThemeSegmented({ className }: { className?: string }) {
    const { theme, setTheme } = useTheme();
    return (
        <div role="radiogroup" aria-label="Colour theme" className={cn('inline-flex rounded-full bg-slate-100 p-1', className)}>
            {OPTIONS.map(({ value, label, icon: OptIcon }) => {
                const active = theme === value;
                return (
                    <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        aria-label={label}
                        title={label}
                        onClick={() => setTheme(value)}
                        className={cn(
                            'inline-flex h-8 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange',
                            active ? 'bg-white text-brand-blue shadow-sm' : 'text-slate-500 hover:text-brand-blue',
                        )}
                    >
                        <OptIcon className="h-3.5 w-3.5" />
                        <span className="hidden min-[380px]:inline">{value === 'system' ? 'Auto' : label}</span>
                    </button>
                );
            })}
        </div>
    );
}
