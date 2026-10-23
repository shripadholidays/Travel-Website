import { useState, useRef, useEffect } from 'react';
import { Upload, Link, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUploadFile } from '@/hooks/use-upload';
import { toast } from 'sonner';

interface ImagePickerProps {
    value: string;
    onChange: (url: string) => void;
    label?: string;
    className?: string;
}

export function ImagePicker({ value, onChange, label = 'Image', className }: ImagePickerProps) {
    const [tab, setTab] = useState<'url' | 'upload'>('url');
    const [urlInput, setUrlInput] = useState(value || '');
    const fileRef = useRef<HTMLInputElement>(null);
    const upload = useUploadFile();

    // Follow the saved value (a tour loading, or a list item moving into this slot)
    useEffect(() => setUrlInput(value || ''), [value]);

    const handleUrlApply = () => {
        const url = urlInput.trim();
        if (url && !/^(https?:\/\/|\/)/i.test(url)) {
            toast.error('Use a full image address starting with https://');
            return;
        }
        if (url !== value) onChange(url);
    };

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            toast.error('That image is over 10 MB. Please use a smaller one.');
            e.target.value = '';
            return;
        }
        try {
            const result = await upload.mutateAsync(file);
            onChange(result.url);
            setUrlInput(result.url);
            toast.success('Image uploaded');
        } catch (err) {
            toast.error((err as Error).message || 'Upload failed');
        }
        e.target.value = '';
    };

    const handleClear = () => {
        onChange('');
        setUrlInput('');
    };

    return (
        <div className={cn('space-y-2', className)}>
            {label && <p className="text-sm font-medium text-slate-700">{label}</p>}

            {/* Tab switcher */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
                {(['url', 'upload'] as const).map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => setTab(t)}
                        className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                            tab === t ? 'bg-white shadow text-brand-blue' : 'text-slate-500 hover:text-slate-700'
                        )}
                    >
                        {t === 'url' ? <Link className="w-3 h-3" /> : <Upload className="w-3 h-3" />}
                        {t === 'url' ? 'URL' : 'Upload'}
                    </button>
                ))}
            </div>

            {/* URL tab */}
            {tab === 'url' && (
                <div className="flex gap-2">
                    <input
                        type="url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        onBlur={handleUrlApply}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleUrlApply(); } }}
                        aria-label={label ? `${label} address` : 'Image address'}
                        placeholder="https://example.com/image.jpg"
                        className="flex-1 h-9 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30"
                    />
                    {value && (
                        <button type="button" onClick={handleClear} aria-label="Remove image" className="text-slate-400 hover:text-red-500 transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            )}

            {/* Upload tab */}
            {tab === 'upload' && (
                <div>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                    <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={upload.isPending}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-slate-200 text-sm text-slate-500 hover:border-brand-orange hover:text-brand-orange transition-colors w-full justify-center"
                    >
                        {upload.isPending ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
                        ) : (
                            <><Upload className="w-4 h-4" /> Click to upload image (max 10MB)</>
                        )}
                    </button>
                </div>
            )}

            {/* Preview */}
            {value && (
                <div className="relative w-full h-36 rounded-xl overflow-hidden border border-slate-100 bg-slate-50">
                    <img src={value} alt="Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <button
                        type="button"
                        onClick={handleClear}
                        aria-label="Remove image"
                        className="absolute top-2 right-2 w-6 h-6 bg-black/50 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-colors"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            )}

            {!value && (
                <div className="w-full h-20 rounded-xl border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-slate-300" />
                </div>
            )}
        </div>
    );
}
