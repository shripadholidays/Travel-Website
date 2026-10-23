import * as React from "react"
import { cn } from "@/lib/utils"

interface TabsContextValue {
    value: string
    setValue: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

function useTabs() {
    const ctx = React.useContext(TabsContext)
    if (!ctx) throw new Error("Tabs components must be used within <Tabs>")
    return ctx
}

interface TabsProps {
    value?: string
    defaultValue?: string
    onValueChange?: (value: string) => void
    className?: string
    children: React.ReactNode
}

/** Minimal, accessible controlled/uncontrolled tabs (no external dependency). */
export const Tabs = ({ value, defaultValue, onValueChange, className, children }: TabsProps) => {
    const [internal, setInternal] = React.useState(defaultValue ?? "")
    const current = value ?? internal

    const setValue = React.useCallback(
        (next: string) => {
            if (value === undefined) setInternal(next)
            onValueChange?.(next)
        },
        [value, onValueChange]
    )

    return (
        <TabsContext.Provider value={{ value: current, setValue }}>
            <div className={className}>{children}</div>
        </TabsContext.Provider>
    )
}

export const TabsList = ({ className, children }: { className?: string; children: React.ReactNode }) => (
    <div role="tablist" className={cn("inline-flex items-center gap-1 rounded-xl bg-muted p-1", className)}>
        {children}
    </div>
)

export const TabsTrigger = ({
    value,
    className,
    children,
}: {
    value: string
    className?: string
    children: React.ReactNode
}) => {
    const { value: active, setValue } = useTabs()
    const selected = active === value
    return (
        <button
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => setValue(value)}
            className={cn(
                "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange",
                selected
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                className
            )}
        >
            {children}
        </button>
    )
}

export const TabsContent = ({
    value,
    className,
    children,
}: {
    value: string
    className?: string
    children: React.ReactNode
}) => {
    const { value: active } = useTabs()
    if (active !== value) return null
    return (
        <div role="tabpanel" className={cn("mt-4 focus-visible:outline-none", className)}>
            {children}
        </div>
    )
}
