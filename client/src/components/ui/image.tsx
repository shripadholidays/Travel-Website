import { useState } from "react";
import { cn } from "@/lib/utils";
import { ImageOff } from "lucide-react";

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    fallback?: string;
    /** The page's main (above-the-fold) image: fetched first and shown without the fade-in. */
    priority?: boolean;
}

export const Image = ({ className, src, alt, fallback, priority = false, ...props }: ImageProps) => {
    const [error, setError] = useState(false);
    const [loaded, setLoaded] = useState(false);

    return (
        <div className={cn("relative overflow-hidden bg-secondary/20", className)}>
            {!loaded && !error && !priority && (
                <div className="absolute inset-0 animate-pulse bg-secondary/50" />
            )}
            {!error ? (
                <img
                    src={src}
                    alt={alt}
                    onLoad={() => setLoaded(true)}
                    onError={() => setError(true)}
                    className={cn(
                        "w-full h-full object-cover transition-opacity duration-500",
                        loaded || priority ? "opacity-100" : "opacity-0"
                    )}
                    loading={priority ? "eager" : "lazy"}
                    fetchPriority={priority ? "high" : undefined}
                    decoding={priority ? "sync" : "async"}
                    {...props}
                />
            ) : (
                <div className="flex flex-col items-center justify-center w-full h-full text-muted-foreground p-4">
                    <ImageOff className="w-8 h-8 mb-2 opacity-50" />
                    <span className="text-xs">Image not found</span>
                </div>
            )}
        </div>
    );
};
