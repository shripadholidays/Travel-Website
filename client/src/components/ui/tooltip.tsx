import * as React from "react"
import { cn } from "@/lib/utils"

interface TooltipProps {
    content: React.ReactNode
    children: React.ReactNode
    side?: "top" | "bottom"
    className?: string
}

/**
 * Lightweight CSS hover/focus tooltip (no external dependency).
 * For richer positioning needs, prefer a Radix popover.
 */
export const Tooltip = ({ content, children, side = "top", className }: TooltipProps) => (
    <span className="group relative inline-flex">
        {children}
        <span
            role="tooltip"
            className={cn(
                "pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100",
                side === "top" ? "bottom-full mb-2" : "top-full mt-2",
                className
            )}
        >
            {content}
        </span>
    </span>
)
