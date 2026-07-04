import { useState } from "react";
import { cn } from "@/lib/utils";
import { ImageOff } from "lucide-react";

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    fallback?: string;
}

export const Image = ({ className, src, alt, fallback, ...props }: ImageProps) => {
    const [error, setError] = useState(false);
    const [loaded, setLoaded] = useState(false);

    return (
        <div className={cn("relative overflow-hidden bg-secondary/20", className)}>
            {!loaded && !error && (
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
                        loaded ? "opacity-100" : "opacity-0"
                    )}
                    loading="lazy"
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
