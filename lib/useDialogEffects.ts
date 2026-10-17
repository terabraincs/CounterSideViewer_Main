"use client";
import { useEffect, type Dispatch, type SetStateAction } from "react";
function lockBodyScroll() {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
}
export function useBodyScrollLock(isOpen: boolean) {
    useEffect(() => {
        if (isOpen)
            return lockBodyScroll();
    }, [isOpen]);
}
/** Shared lifecycle for collection previews opened by selecting an item. */
export function useSelectionDialog<T>(selection: T | null, setSelection: Dispatch<SetStateAction<T | null>>) {
    useEffect(() => {
        if (!selection)
            return;
        const unlockBodyScroll = lockBodyScroll();
        function closeOnEscape(event: KeyboardEvent) {
            if (event.key === "Escape")
                setSelection(null);
        }
        window.addEventListener("keydown", closeOnEscape);
        return () => {
            unlockBodyScroll();
            window.removeEventListener("keydown", closeOnEscape);
        };
    }, [selection, setSelection]);
}
