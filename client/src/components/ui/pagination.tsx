import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface PaginationProps {
    page: number
    totalPages: number
    onPageChange: (page: number) => void
    className?: string
}

/** Builds a compact page list with ellipses, e.g. 1 … 4 5 [6] 7 8 … 20 */
function buildRange(page: number, total: number): (number | "…")[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

    const pages: (number | "…")[] = [1]
    const start = Math.max(2, page - 1)
    const end = Math.min(total - 1, page + 1)

    if (start > 2) pages.push("…")
    for (let i = start; i <= end; i++) pages.push(i)
    if (end < total - 1) pages.push("…")
    pages.push(total)

    return pages
}

export const Pagination = ({ page, totalPages, onPageChange, className }: PaginationProps) => {
    if (totalPages <= 1) return null
    const range = buildRange(page, totalPages)

    return (
        <nav
            aria-label="Pagination"
            className={cn("flex items-center justify-center gap-1", className)}
        >
            <Button
                variant="outline"
                size="icon"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                aria-label="Previous page"
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>

            {range.map((p, i) =>
                p === "…" ? (
                    <span key={`gap-${i}`} className="px-2 text-muted-foreground select-none">
                        …
                    </span>
                ) : (
                    <Button
                        key={p}
                        variant={p === page ? "brand" : "outline"}
                        size="icon"
                        onClick={() => onPageChange(p)}
                        aria-current={p === page ? "page" : undefined}
                    >
                        {p}
                    </Button>
                )
            )}

            <Button
                variant="outline"
                size="icon"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                aria-label="Next page"
            >
                <ChevronRight className="h-4 w-4" />
            </Button>
        </nav>
    )
}
