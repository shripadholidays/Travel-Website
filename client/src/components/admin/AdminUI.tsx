import type { ReactNode } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/ui/pagination";
import type { Pagination as PageInfo } from "@/types";

/** The title row every admin page starts with. */
export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-brand-blue">{title}</h1>
                {description && <p className="mt-1 text-sm sm:text-base text-muted-foreground max-w-2xl">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
        </div>
    );
}

export type Tone = "green" | "amber" | "slate" | "red" | "blue" | "orange";

const TONES: Record<Tone, string> = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    amber: "bg-amber-50 text-amber-800 ring-amber-600/20",
    slate: "bg-slate-100 text-slate-600 ring-slate-500/20",
    red: "bg-red-50 text-red-700 ring-red-600/20",
    blue: "bg-blue-50 text-blue-700 ring-blue-600/20",
    orange: "bg-orange-50 text-orange-700 ring-orange-600/20",
};

/** A soft status label: same shape and colours on every admin table. */
export function StatusPill({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
    return (
        <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset", TONES[tone], className)}>
            {children}
        </span>
    );
}

export interface TabOption<T extends string> { id: T; label: string; count?: number; tone?: Tone }

/** Filter chips with counts, e.g. All 24 · Live 18 · Drafts 4 · Hidden 2. */
export function StatusTabs<T extends string>({ options, value, onChange, label = "Filter by status" }: {
    options: TabOption<T>[];
    value: T;
    onChange: (value: T) => void;
    label?: string;
}) {
    return (
        <div className="flex gap-2 overflow-x-auto pb-1 -mb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label={label}>
            {options.map((o) => {
                const active = o.id === value;
                return (
                    <button
                        key={o.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => onChange(o.id)}
                        className={cn(
                            "inline-flex shrink-0 items-center gap-2 h-8 px-3 rounded-full text-sm font-medium border transition-colors",
                            active ? "bg-brand-blue text-white border-brand-blue" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300",
                        )}
                    >
                        {o.label}
                        {o.count !== undefined && (
                            <span className={cn(
                                "text-xs rounded-full px-1.5 min-w-5 tabular-nums",
                                active ? "bg-white/20" : o.tone === "orange" && o.count > 0 ? "bg-brand-orange text-white" : "bg-slate-100",
                            )}>{o.count}</span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

/** Search box with a clear button; pair it with useDebounced for server searches. */
export function SearchField({ value, onChange, placeholder = "Search…", className, label }: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    label?: string;
}) {
    return (
        <div className={cn("relative w-full sm:w-64", className)}>
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <input
                type="search"
                aria-label={label ?? placeholder}
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-8 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/30 [&::-webkit-search-cancel-button]:hidden"
            />
            {value && (
                <button type="button" onClick={() => onChange("")} aria-label="Clear search" className="absolute right-2 top-2 rounded p-0.5 text-slate-400 hover:text-slate-700">
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}

/** "Showing 21–40 of 132" plus page buttons. */
export function TableFooter({ pagination, onPageChange, noun = "items" }: { pagination?: PageInfo; onPageChange: (page: number) => void; noun?: string }) {
    if (!pagination || pagination.total === 0) return null;
    const from = (pagination.page - 1) * pagination.limit + 1;
    const to = Math.min(pagination.total, pagination.page * pagination.limit);
    return (
        <div className="flex flex-col items-center gap-3 border-t border-slate-100 pt-4 mt-2 sm:flex-row sm:justify-between">
            <p className="text-sm text-muted-foreground tabular-nums">
                Showing {from}–{to} of {pagination.total} {noun}
            </p>
            <Pagination page={pagination.page} totalPages={pagination.pages} onPageChange={onPageChange} />
        </div>
    );
}

/** A friendly empty table: what is missing and what to do next. */
export function EmptyState({ icon: Icon, title, description, action }: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description?: string;
    action?: ReactNode;
}) {
    return (
        <div className="flex flex-col items-center justify-center text-center py-12 px-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                <Icon className="w-6 h-6 text-slate-400" />
            </div>
            <p className="font-semibold text-brand-blue">{title}</p>
            {description && <p className="mt-1 text-sm text-muted-foreground max-w-sm">{description}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

/** Small "x ago" for tables (exact time in the title tooltip). */
export function timeAgo(date: string | Date) {
    const d = new Date(date);
    const s = Math.round((Date.now() - d.getTime()) / 1000);
    if (s < 60) return "just now";
    const m = Math.round(s / 60);
    if (m < 60) return `${m} min ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h} h ago`;
    const days = Math.round(h / 24);
    if (days < 30) return `${days} d ago`;
    return d.toLocaleDateString();
}
