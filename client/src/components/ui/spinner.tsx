import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface SpinnerProps {
    className?: string
    /** Optional label rendered beneath the spinner. */
    label?: string
    /** Centers the spinner in a padded flex column. */
    center?: boolean
}

/** Consistent loading indicator used across pages and lists. */
export const Spinner = ({ className, label, center }: SpinnerProps) => {
    const spinner = (
        <Loader2
            className={cn("h-6 w-6 animate-spin text-brand-orange", className)}
            aria-hidden="true"
        />
    )

    if (!label && !center) return spinner

    return (
        <div
            role="status"
            aria-live="polite"
            className={cn(
                "flex flex-col items-center justify-center gap-3",
                center && "py-20"
            )}
        >
            {spinner}
            {label && <p className="text-sm text-muted-foreground">{label}</p>}
            <span className="sr-only">{label || "Loading"}</span>
        </div>
    )
}
