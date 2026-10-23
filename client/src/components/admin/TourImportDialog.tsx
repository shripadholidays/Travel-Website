import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { parseRaw } from "@/components/ui/JsonCsvImporter";
import { useBulkCreateTours } from "@/hooks/use-tours";
import { usd } from "@/lib/tour-status";
import type { Tour } from "@/types";

const TEMPLATE = [
    "title,location,price,days,nights,imageURL,categories,status,isFeatured,about,validity,maxGroupSize,images",
    '"Manali Snow Trek","Manali, India",450,5,4,https://images.unsplash.com/photo-1626621341517-bbf3d9990a23,"Adventure, Mountain",draft,false,"Five days of snow trails above Manali.",2027-12-31,12,',
].join("\n");

const text = (v: unknown) => (v === undefined || v === null ? "" : String(v).trim());
const list = (v: unknown) => (Array.isArray(v) ? v.map(text) : text(v).split(/[|,]/).map((s) => s.trim())).filter(Boolean);

/** One spreadsheet / JSON row → the tour fields the API expects. Column names are forgiving. */
export function rowToTour(r: Record<string, unknown>): Partial<Tour> {
    const get = (...keys: string[]) => keys.map((k) => r[k]).find((v) => v !== undefined && v !== null && v !== "");
    const duration = (r.duration as Record<string, unknown>) || {};
    const overview = (r.overview as Record<string, unknown>) || {};
    const days = Number(get("duration.days", "days") ?? duration.days ?? 1);
    const status = text(get("status")).toLowerCase();
    const validity = get("validity") ? new Date(text(get("validity"))) : null;
    return {
        title: text(get("title", "name")),
        location: text(get("location", "place")),
        price: Number(text(get("price")).replace(/[^0-9.]/g, "")),
        duration: { days, nights: Number(get("duration.nights", "nights") ?? duration.nights ?? Math.max(0, days - 1)) },
        imageURL: text(get("imageURL", "image", "cover")),
        images: list(get("images")),
        categories: list(get("categories", "tags", "styles")),
        // Imported tours start as drafts unless the file says otherwise, so nothing goes live by accident
        status: (["active", "draft", "inactive"].includes(status) ? status : status === "live" ? "active" : status === "hidden" ? "inactive" : "draft") as Tour["status"],
        isFeatured: get("isFeatured", "featured") === true || text(get("isFeatured", "featured")).toLowerCase() === "true",
        overview: { about: text(get("overview.about", "about", "description") ?? overview.about), gallery: [] },
        // An unreadable date is left out (the server then uses one year from today)
        ...(validity && !Number.isNaN(validity.getTime()) ? { validity: validity.toISOString() } : {}),
        ...(get("maxGroupSize") ? { maxGroupSize: Number(get("maxGroupSize")) } : {}),
    };
}

type Report = { created: number; failed: { row: number; title: string; error: string }[] };

export function TourImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const [raw, setRaw] = useState("");
    const [report, setReport] = useState<Report | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const bulkCreate = useBulkCreateTours();

    const parsed = raw.trim() ? parseRaw(raw) : null;
    const rows = parsed?.ok ? parsed.rows.map(rowToTour) : [];

    const reset = () => { setRaw(""); setReport(null); };
    const close = (o: boolean) => { if (!o) reset(); onOpenChange(o); };

    const readFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => { setRaw(String(e.target?.result ?? "")); setReport(null); };
        reader.readAsText(file);
    };

    const downloadTemplate = () => {
        const url = URL.createObjectURL(new Blob([TEMPLATE], { type: "text/csv;charset=utf-8" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = "wandeazy-tours-template.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    const runImport = async () => {
        try {
            const res = await bulkCreate.mutateAsync(rows);
            setReport({ created: res.created, failed: res.failed });
            if (res.failed.length === 0) toast.success(`Imported ${res.created} tour${res.created === 1 ? "" : "s"}.`);
        } catch (err) {
            toast.error((err as Error).message || "Import failed");
        }
    };

    return (
        <Dialog open={open} onOpenChange={close}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-brand-orange" /> Import tours</DialogTitle>
                    <DialogDescription>
                        Upload a CSV from a spreadsheet, or paste CSV or JSON. Prices are in US dollars per person.
                        Rows without a status are imported as drafts so you can check them before they go live.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                    {report ? (
                        <div className="space-y-3">
                            <div className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
                                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>Imported {report.created} tour{report.created === 1 ? "" : "s"}.{report.failed.length > 0 && " The rows below were skipped."}</span>
                            </div>
                            {report.failed.length > 0 && (
                                <div className="rounded-xl border border-red-100">
                                    <p className="flex items-center gap-2 border-b border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                                        <AlertCircle className="w-4 h-4" /> {report.failed.length} row{report.failed.length === 1 ? "" : "s"} need fixing
                                    </p>
                                    <ul className="divide-y divide-slate-100 text-sm">
                                        {report.failed.map((f) => (
                                            <li key={f.row} className="px-3 py-2">
                                                <span className="font-medium">Row {f.row}: {f.title}</span>
                                                <span className="block text-red-600">{f.error}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-wrap items-center gap-2">
                                <input ref={fileRef} type="file" accept=".csv,.json,.txt" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); e.target.value = ""; }} />
                                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => fileRef.current?.click()}>
                                    <Upload className="w-3.5 h-3.5" /> Choose file
                                </Button>
                                <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={downloadTemplate}>
                                    <Download className="w-3.5 h-3.5" /> Download template
                                </Button>
                                <span className="text-xs text-muted-foreground">Columns: title, location, price, days, nights, imageURL, categories, status, about…</span>
                            </div>
                            <textarea
                                value={raw}
                                onChange={(e) => setRaw(e.target.value)}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) readFile(f); }}
                                aria-label="CSV or JSON to import"
                                placeholder={"Paste rows here, or drop a .csv file\n\n" + TEMPLATE}
                                className="w-full h-40 rounded-xl border-2 border-dashed border-slate-200 p-3 font-mono text-xs focus:outline-none focus:border-brand-orange/40"
                            />
                            {parsed && !parsed.ok && (
                                <p className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-600"><AlertCircle className="w-4 h-4" /> {parsed.error}</p>
                            )}
                            {rows.length > 0 && (
                                <div className="rounded-xl border border-slate-200 overflow-hidden">
                                    <p className="bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                                        {rows.length} row{rows.length === 1 ? "" : "s"} ready{rows.length > 8 && " (first 8 shown)"}
                                    </p>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="text-left text-xs text-muted-foreground">
                                                <tr><th className="px-3 py-1.5">Title</th><th className="px-3 py-1.5">Location</th><th className="px-3 py-1.5">Price</th><th className="px-3 py-1.5">Days</th><th className="px-3 py-1.5">Status</th><th className="px-3 py-1.5">Check</th></tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {rows.slice(0, 8).map((t, i) => {
                                                    const missing = [!t.title && "title", !t.location && "location", !(Number(t.price) > 0) && "price", !t.imageURL && "image", !t.overview?.about && "about"].filter(Boolean);
                                                    return (
                                                        <tr key={i}>
                                                            <td className="px-3 py-1.5 font-medium">{t.title || "—"}</td>
                                                            <td className="px-3 py-1.5">{t.location || "—"}</td>
                                                            <td className="px-3 py-1.5 tabular-nums">{Number(t.price) > 0 ? usd(Number(t.price)) : "—"}</td>
                                                            <td className="px-3 py-1.5 tabular-nums">{t.duration?.days}</td>
                                                            <td className="px-3 py-1.5">{t.status === "active" ? "Live" : t.status === "inactive" ? "Hidden" : "Draft"}</td>
                                                            <td className="px-3 py-1.5 text-xs">
                                                                {missing.length ? <span className="text-red-600">Missing {missing.join(", ")}</span> : <span className="text-emerald-700">OK</span>}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <DialogFooter>
                    {report ? (
                        <>
                            <Button variant="outline" onClick={reset}>Import more</Button>
                            <Button onClick={() => close(false)} className="bg-brand-orange hover:bg-brand-orange/90">Done</Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => close(false)}>Cancel</Button>
                            <Button disabled={rows.length === 0 || bulkCreate.isPending} onClick={runImport} className="bg-brand-orange hover:bg-brand-orange/90 gap-1.5">
                                {bulkCreate.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                Import {rows.length > 0 ? `${rows.length} tour${rows.length === 1 ? "" : "s"}` : ""}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
