"use client"

import * as DialogPrimitive from "@radix-ui/react-dialog"
import { AlertTriangle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/**
 * Lightweight confirmation dialog built on @radix-ui/react-dialog.
 * Replaces native window.confirm() for destructive actions.
 *
 * Usage:
 *   <ConfirmDialog
 *     open={open}
 *     onOpenChange={setOpen}
 *     title="Delete tour?"
 *     description="This action cannot be undone."
 *     confirmLabel="Delete"
 *     destructive
 *     loading={isDeleting}
 *     onConfirm={() => mutate()}
 *   />
 */
interface ConfirmDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    description?: string
    confirmLabel?: string
    cancelLabel?: string
    destructive?: boolean
    loading?: boolean
    onConfirm: () => void
}

export const ConfirmDialog = ({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    destructive = false,
    loading = false,
    onConfirm,
}: ConfirmDialogProps) => {
    return (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-[110] bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
                <DialogPrimitive.Content
                    role="alertdialog"
                    onInteractOutside={(e) => loading && e.preventDefault()}
                    className={cn(
                        "fixed left-[50%] top-[50%] z-[110] grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
                    )}
                >
                    <div className="flex gap-4">
                        {destructive && (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                                <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
                            </div>
                        )}
                        <div className="space-y-1.5">
                            <DialogPrimitive.Title className="text-lg font-semibold leading-none tracking-tight">
                                {title}
                            </DialogPrimitive.Title>
                            {description && (
                                <DialogPrimitive.Description className="text-sm text-muted-foreground">
                                    {description}
                                </DialogPrimitive.Description>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <DialogPrimitive.Close asChild>
                            <Button variant="outline" disabled={loading}>
                                {cancelLabel}
                            </Button>
                        </DialogPrimitive.Close>
                        <Button
                            variant={destructive ? "destructive" : "default"}
                            disabled={loading}
                            onClick={onConfirm}
                        >
                            {loading ? "Working…" : confirmLabel}
                        </Button>
                    </div>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    )
}
