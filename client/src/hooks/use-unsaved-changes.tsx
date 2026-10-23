import { useCallback, useEffect, useRef } from "react";
import { useBlocker } from "react-router-dom";
import { ConfirmDialog } from "@/components/ui/alert-dialog";

/**
 * Warns before leaving a form with unsaved edits: the browser's own prompt on reload/close,
 * and a dialog when navigating inside the app. Render `dialog` anywhere on the page, and call
 * `allowLeave()` right before navigating away on purpose (e.g. after saving a new item).
 */
export function useUnsavedChanges(dirty: boolean, message = "Your changes have not been saved and will be lost.") {
    const allowed = useRef(false);
    const dirtyRef = useRef(dirty);
    dirtyRef.current = dirty;

    useEffect(() => {
        if (!dirty) return;
        const onBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", onBeforeUnload);
        return () => window.removeEventListener("beforeunload", onBeforeUnload);
    }, [dirty]);

    // Same-page query changes (tabs, filters) are not leaving
    const blocker = useBlocker(({ currentLocation, nextLocation }) => {
        if (allowed.current) {
            allowed.current = false;
            return false;
        }
        return dirtyRef.current && currentLocation.pathname !== nextLocation.pathname;
    });

    const allowLeave = useCallback(() => { allowed.current = true; }, []);

    const dialog = (
        <ConfirmDialog
            open={blocker.state === "blocked"}
            onOpenChange={(open) => !open && blocker.state === "blocked" && blocker.reset()}
            title="Leave without saving?"
            description={message}
            confirmLabel="Leave page"
            cancelLabel="Keep editing"
            destructive
            onConfirm={() => blocker.state === "blocked" && blocker.proceed()}
        />
    );

    return { dialog, allowLeave };
}
