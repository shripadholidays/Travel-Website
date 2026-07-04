import * as React from "react"
import { cn } from "@/lib/utils"

export interface CheckboxProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
    label?: React.ReactNode
}

/** Styled native checkbox with an optional inline label. */
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
    ({ className, label, id, ...props }, ref) => {
        const generatedId = React.useId()
        const inputId = id ?? generatedId
        const input = (
            <input
                ref={ref}
                id={inputId}
                type="checkbox"
                className={cn(
                    "h-4 w-4 shrink-0 rounded border-gray-300 text-brand-orange accent-brand-orange focus:ring-2 focus:ring-brand-orange focus:ring-offset-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
                    className
                )}
                {...props}
            />
        )

        if (!label) return input

        return (
            <label
                htmlFor={inputId}
                className="flex items-center gap-3 text-sm cursor-pointer hover:text-brand-orange transition-colors"
            >
                {input}
                <span>{label}</span>
            </label>
        )
    }
)
Checkbox.displayName = "Checkbox"
