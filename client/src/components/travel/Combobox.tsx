import { useEffect, useId, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ComboOption {
    value: string;
    label: string;
    sublabel?: string;
    badge?: string;
}

interface ComboboxProps {
    label: string;
    placeholder: string;
    /** Text shown when the field is not being edited (the current selection). */
    displayValue: string;
    query: string;
    onQueryChange: (q: string) => void;
    options: ComboOption[];
    loading?: boolean;
    onSelect: (option: ComboOption) => void;
    className?: string;
}

/** Accessible autocomplete (ARIA 1.2 combobox): type, ↑/↓ to move, Enter to pick, Esc to close. */
export const Combobox = ({
    label, placeholder, displayValue, query, onQueryChange, options, loading, onSelect, className,
}: ComboboxProps) => {
    const id = useId();
    const listId = `${id}-list`;
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(false);
    const [active, setActive] = useState(0);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => setActive(0), [options]);

    useEffect(() => {
        const onDown = (e: MouseEvent) => {
            if (!wrapperRef.current?.contains(e.target as Node)) {
                setOpen(false);
                setEditing(false);
            }
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, []);

    const pick = (option: ComboOption) => {
        onSelect(option);
        setOpen(false);
        setEditing(false);
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setActive((i) => Math.min(i + 1, options.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
        } else if (e.key === 'Enter' && open && options[active]) {
            e.preventDefault();
            pick(options[active]);
        } else if (e.key === 'Escape') {
            setOpen(false);
            setEditing(false);
        }
    };

    const showList = open && editing && (loading || options.length > 0 || query.length > 0);

    return (
        <div ref={wrapperRef} className={cn('relative', className)}>
            <label htmlFor={id} className="block rounded-[1.25rem] bg-slate-50 px-4 py-3 focus-within:ring-2 focus-within:ring-brand-orange/40 transition-shadow">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
                <input
                    id={id}
                    role="combobox"
                    aria-expanded={showList}
                    aria-controls={listId}
                    aria-autocomplete="list"
                    aria-activedescendant={showList && options[active] ? `${listId}-${active}` : undefined}
                    autoComplete="off"
                    placeholder={placeholder}
                    value={editing ? query : displayValue}
                    onFocus={(e) => {
                        setEditing(true);
                        setOpen(true);
                        onQueryChange('');
                        e.currentTarget.select();
                    }}
                    onChange={(e) => {
                        onQueryChange(e.target.value);
                        setOpen(true);
                    }}
                    onKeyDown={onKeyDown}
                    className="mt-1 w-full bg-transparent text-[15px] font-bold text-brand-blue placeholder:text-slate-400 placeholder:font-medium outline-none truncate"
                />
            </label>
            {showList && (
                <ul
                    id={listId}
                    role="listbox"
                    aria-label={label}
                    className="absolute z-30 mt-2 w-full min-w-[260px] max-h-72 overflow-auto rounded-2xl border border-slate-100 bg-white p-1.5 shadow-2xl shadow-brand-blue/10"
                >
                    {loading && (
                        <li className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" /> Searching…
                        </li>
                    )}
                    {!loading && options.length === 0 && (
                        <li className="px-3 py-3 text-sm text-muted-foreground">No matches</li>
                    )}
                    {options.map((option, i) => (
                        <li
                            key={option.value}
                            id={`${listId}-${i}`}
                            role="option"
                            aria-selected={i === active}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => pick(option)}
                            onMouseEnter={() => setActive(i)}
                            className={cn(
                                'flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer',
                                i === active ? 'bg-brand-orange/10' : 'hover:bg-slate-50',
                            )}
                        >
                            {option.badge && (
                                <span className="w-12 shrink-0 text-center font-display font-bold text-brand-orange text-lg">{option.badge}</span>
                            )}
                            <span className="min-w-0">
                                <span className="block text-sm font-bold text-brand-blue truncate">{option.label}</span>
                                {option.sublabel && <span className="block text-xs text-muted-foreground truncate">{option.sublabel}</span>}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

/** Labelled field shell matching the combobox (dates, selects). */
export const FieldShell = ({ label, htmlFor, children, className }: {
    label: string; htmlFor: string; children: React.ReactNode; className?: string;
}) => (
    <label htmlFor={htmlFor} className={cn('block rounded-[1.25rem] bg-slate-50 px-4 py-3 focus-within:ring-2 focus-within:ring-brand-orange/40 transition-shadow', className)}>
        <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
        {children}
    </label>
);

export const fieldInputClass = 'mt-1 w-full bg-transparent text-[15px] font-bold text-brand-blue outline-none';
