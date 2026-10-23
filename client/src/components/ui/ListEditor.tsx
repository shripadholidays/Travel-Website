import { ChevronUp, ChevronDown, Trash2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface ListEditorProps<T> {
    items: T[];
    onChange: (items: T[]) => void;
    renderItem: (item: T, index: number, onChange: (updated: T) => void) => React.ReactNode;
    createEmpty: () => T;
    addLabel?: string;
    maxItems?: number;
    className?: string;
}

export function ListEditor<T>({
    items,
    onChange,
    renderItem,
    createEmpty,
    addLabel = 'Add item',
    maxItems,
    className,
}: ListEditorProps<T>) {
    const move = (from: number, to: number) => {
        const next = [...items];
        const [el] = next.splice(from, 1);
        next.splice(to, 0, el);
        onChange(next);
    };

    const remove = (index: number) => {
        onChange(items.filter((_, i) => i !== index));
    };

    const updateAt = (index: number, updated: T) => {
        const next = [...items];
        next[index] = updated;
        onChange(next);
    };

    const add = () => onChange([...items, createEmpty()]);

    return (
        <div className={cn('space-y-3', className)}>
            {items.map((item, i) => (
                <div key={i} className="flex gap-2 items-start group">
                    {/* Reorder buttons */}
                    <div className="flex flex-col gap-0.5 pt-1 shrink-0">
                        <button
                            type="button"
                            disabled={i === 0}
                            onClick={() => move(i, i - 1)}
                            aria-label={`Move item ${i + 1} up`}
                            className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 disabled:opacity-20 hover:bg-slate-100"
                        >
                            <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                            type="button"
                            disabled={i === items.length - 1}
                            onClick={() => move(i, i + 1)}
                            aria-label={`Move item ${i + 1} down`}
                            className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 disabled:opacity-20 hover:bg-slate-100"
                        >
                            <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Item content */}
                    <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
                        {renderItem(item, i, (updated) => updateAt(i, updated))}
                    </div>

                    {/* Delete */}
                    <button
                        type="button"
                        onClick={() => remove(i)}
                        aria-label={`Remove item ${i + 1}`}
                        className="mt-1 shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ))}

            {(!maxItems || items.length < maxItems) && (
                <Button type="button" variant="outline" size="sm" onClick={add} className="gap-1.5 border-dashed w-full">
                    <Plus className="w-3.5 h-3.5" />
                    {addLabel}
                </Button>
            )}
        </div>
    );
}
