import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Upload, FileJson, FileText, AlertCircle, CheckCircle2, X } from 'lucide-react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from './dialog';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface JsonCsvImporterProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onImport: (rows: Record<string, unknown>[]) => void;
    /** Human-readable description of expected columns */
    schemaHint?: string;
    /** Example JSON shown in the textarea placeholder */
    exampleJson?: string;
    title?: string;
}

type ParseResult = { ok: true; rows: Record<string, unknown>[] } | { ok: false; error: string };

function parseRaw(raw: string): ParseResult {
    const trimmed = raw.trim();
    if (!trimmed) return { ok: false, error: 'Nothing to parse — paste some JSON or CSV content.' };

    // Try JSON first
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
            const parsed = JSON.parse(trimmed);
            const rows = Array.isArray(parsed) ? parsed : [parsed];
            if (rows.length === 0) return { ok: false, error: 'JSON array is empty.' };
            return { ok: true, rows };
        } catch (e) {
            return { ok: false, error: `Invalid JSON: ${(e as Error).message}` };
        }
    }

    // Try CSV
    const result = Papa.parse<Record<string, unknown>>(trimmed, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
    });
    if (result.errors.length > 0 && result.data.length === 0) {
        return { ok: false, error: `CSV parse error: ${result.errors[0].message}` };
    }
    if (result.data.length === 0) return { ok: false, error: 'CSV parsed but no rows found.' };
    return { ok: true, rows: result.data };
}

export function JsonCsvImporter({
    open, onOpenChange, onImport,
    schemaHint, exampleJson, title = 'Import Data',
}: JsonCsvImporterProps) {
    const [raw, setRaw] = useState('');
    const [result, setResult] = useState<ParseResult | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const isDragging = useRef(false);

    const parse = (text: string) => {
        setRaw(text);
        if (text.trim()) setResult(parseRaw(text));
        else setResult(null);
    };

    const handleFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => parse(e.target?.result as string);
        reader.readAsText(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        isDragging.current = false;
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    const handleConfirm = () => {
        if (!result?.ok) return;
        onImport(result.rows);
        setRaw('');
        setResult(null);
        onOpenChange(false);
    };

    const reset = () => { setRaw(''); setResult(null); };

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileJson className="w-5 h-5 text-brand-orange" />
                        {title}
                    </DialogTitle>
                    <DialogDescription>
                        Paste JSON or CSV content, or drag-and-drop a file. JSON arrays and CSV with headers are both supported.
                    </DialogDescription>
                </DialogHeader>

                {schemaHint && (
                    <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-500 font-mono border border-slate-100">
                        {schemaHint}
                    </div>
                )}

                {/* Drop zone / textarea */}
                <div
                    className={cn(
                        'relative rounded-xl border-2 border-dashed transition-colors',
                        'border-slate-200 hover:border-brand-orange/40'
                    )}
                    onDragOver={(e) => { e.preventDefault(); }}
                    onDrop={handleDrop}
                >
                    <textarea
                        value={raw}
                        onChange={(e) => parse(e.target.value)}
                        placeholder={exampleJson || '[\n  { "name": "Example", "value": "..." }\n]'}
                        className="w-full h-52 p-4 font-mono text-xs bg-transparent resize-none focus:outline-none text-slate-700 placeholder:text-slate-300"
                    />
                    {raw && (
                        <button
                            type="button"
                            onClick={reset}
                            className="absolute top-2 right-2 text-slate-300 hover:text-slate-500"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* File upload button */}
                <div className="flex items-center gap-3">
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".json,.csv,.txt"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileRef.current?.click()}
                        className="gap-1.5"
                    >
                        <Upload className="w-3.5 h-3.5" />
                        Load from file
                    </Button>
                    <span className="text-xs text-slate-400">.json or .csv accepted</span>
                </div>

                {/* Result feedback */}
                {result && (
                    <div className={cn(
                        'flex items-start gap-2 rounded-xl p-3 text-sm',
                        result.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                    )}>
                        {result.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                        <span>
                            {result.ok
                                ? `Ready to import ${result.rows.length} row${result.rows.length !== 1 ? 's' : ''}.`
                                : result.error}
                        </span>
                    </div>
                )}

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancel</Button>
                    <Button
                        type="button"
                        disabled={!result?.ok}
                        onClick={handleConfirm}
                        className="bg-brand-orange hover:bg-brand-orange/90 text-white gap-1.5"
                    >
                        <FileText className="w-4 h-4" />
                        Import {result?.ok ? `${result.rows.length} items` : ''}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
