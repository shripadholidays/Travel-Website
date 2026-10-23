import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Image } from "@/components/ui/image";
import { cn } from "@/lib/utils";
import type { Tour } from "@/types";

/** Every distinct photo of a tour: cover, extra images and the overview gallery. */
export function tourPhotos(tour: Tour): { src: string; alt: string }[] {
    const seen = new Set<string>();
    const photos: { src: string; alt: string }[] = [];
    const add = (src: string | undefined, alt?: string) => {
        if (!src || seen.has(src)) return;
        seen.add(src);
        photos.push({ src, alt: alt || tour.title });
    };
    add(tour.imageURL);
    tour.images?.forEach((src) => add(src));
    tour.overview?.gallery?.forEach((g) => add(g.imageURL, g.altText));
    return photos;
}

/** A photo grid with a full-screen viewer; hidden when the tour has a single photo (the hero shows it). */
export const TourGallery = ({ tour, compact }: { tour: Tour; compact?: boolean }) => {
    const photos = tourPhotos(tour);
    const [open, setOpen] = useState<number | null>(null);

    const step = useCallback((delta: number) => {
        setOpen((i) => (i === null ? i : (i + delta + photos.length) % photos.length));
    }, [photos.length]);

    useEffect(() => {
        if (open === null) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight") step(1);
            if (e.key === "ArrowLeft") step(-1);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, step]);

    if (photos.length < 2) return null;
    const shown = photos.slice(0, 5);

    return (
        <section>
            <div className={cn("flex items-center justify-between", compact ? "mb-4" : "mb-6")}>
                <div className="flex items-center gap-3">
                    <span className={cn("w-1.5 rounded-full bg-brand-orange", compact ? "h-6" : "h-7")} />
                    <h2 className={cn("font-display font-bold text-brand-blue", compact ? "text-xl md:text-2xl" : "text-2xl md:text-3xl")}>Photos</h2>
                </div>
                <button type="button" onClick={() => setOpen(0)} className="text-sm font-medium text-brand-orange hover:underline inline-flex items-center gap-1.5">
                    <Images className="w-4 h-4" /> See all {photos.length}
                </button>
            </div>

            <div className={cn("grid gap-3", shown.length >= 3 ? "grid-cols-2 md:grid-cols-4 md:grid-rows-2" : "grid-cols-2")}>
                {shown.map((photo, i) => (
                    <button
                        key={photo.src}
                        type="button"
                        onClick={() => setOpen(i)}
                        aria-label={`Open photo ${i + 1} of ${photos.length}`}
                        className={cn(
                            "relative overflow-hidden rounded-2xl group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange",
                            shown.length >= 3 && i === 0 ? "col-span-2 row-span-2 h-64 md:h-full min-h-[16rem]" : "h-32 md:h-40",
                        )}
                    >
                        <Image src={photo.src} alt={photo.alt} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        {i === shown.length - 1 && photos.length > shown.length && (
                            <span className="absolute inset-0 bg-black/50 text-white font-bold flex items-center justify-center">+{photos.length - shown.length}</span>
                        )}
                    </button>
                ))}
            </div>

            <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
                <DialogContent className="max-w-5xl w-[calc(100vw-2rem)] p-0 bg-black border-0 overflow-hidden rounded-2xl z-[120] [&>button]:hidden">
                    <DialogTitle className="sr-only">{tour.title} photos</DialogTitle>
                    {open !== null && (
                        <div className="relative">
                            <img src={photos[open].src} alt={photos[open].alt} className="w-full max-h-[80vh] object-contain bg-black" />
                            <button type="button" onClick={() => setOpen(null)} aria-label="Close photos" className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80">
                                <X className="w-5 h-5" />
                            </button>
                            <button type="button" onClick={() => step(-1)} aria-label="Previous photo" className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80">
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                            <button type="button" onClick={() => step(1)} aria-label="Next photo" className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80">
                                <ChevronRight className="w-6 h-6" />
                            </button>
                            <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-white/80 bg-black/60 rounded-full px-3 py-1 tabular-nums">
                                {open + 1} / {photos.length}
                            </p>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </section>
    );
};
