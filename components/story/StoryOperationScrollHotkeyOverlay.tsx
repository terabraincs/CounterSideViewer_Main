"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, } from "react";
import StoryHotkeyDisplay from "./StoryHotkeyDisplay";
import styles from "./StoryOperationScrollHotkeyOverlay.module.css";
export type StoryOperationScrollHotkeyTarget = "stage" | "acts" | "normal";
export type StoryOperationScrollHotkeyDisplaySnapshot = {
    generation: number;
    target: StoryOperationScrollHotkeyTarget;
    targetPath: string;
    text: "← →" | "↓ ↑";
    left: number;
    top: number;
    scale: number;
};
type StoryOperationScrollHotkeyOpenSnapshot = Omit<StoryOperationScrollHotkeyDisplaySnapshot, "generation">;
type StoryOperationScrollHotkeyOverlayController = {
    display: StoryOperationScrollHotkeyDisplaySnapshot | null;
    isDisplayActive: () => boolean;
    openDisplay: (snapshot: StoryOperationScrollHotkeyOpenSnapshot) => number | null;
    registerLocalRenderer: () => () => void;
};
const StoryOperationScrollHotkeyOverlayContext = createContext<StoryOperationScrollHotkeyOverlayController | null>(null);
function isStoryEditableElement(target: EventTarget | null) {
    return Boolean(target instanceof HTMLElement &&
        (target.isContentEditable ||
            target.matches("input, select, textarea, [role='textbox']")));
}
export function StoryOperationScrollHotkeyDisplayView({ display, host, }: {
    display: StoryOperationScrollHotkeyDisplaySnapshot;
    host: "reader" | "global-ui-overlay";
}) {
    return (<StoryHotkeyDisplay className={styles.display} text={display.text} trackerId="STV-MAP-064" target={display.targetPath} generation={display.generation} lifetime="left-alt-held-after-generation" host={host} style={{
            "--story-operation-scroll-hotkey-target-x": `${display.left}px`,
            "--story-operation-scroll-hotkey-target-y": `${display.top}px`,
            "--story-operation-scroll-hotkey-scale": display.scale,
        } as React.CSSProperties}/>);
}
export default function StoryOperationScrollHotkeyOverlayProvider({ children, }: {
    children: ReactNode;
}) {
    const displayRef = useRef<StoryOperationScrollHotkeyDisplaySnapshot | null>(null);
    const openRunRef = useRef(0);
    const localRendererCountRef = useRef(0);
    const [display, setDisplay] = useState<StoryOperationScrollHotkeyDisplaySnapshot | null>(null);
    const [localRendererCount, setLocalRendererCount] = useState(0);
    const closeDisplay = useCallback(() => {
        displayRef.current = null;
        setDisplay(null);
    }, []);
    const openDisplay = useCallback((snapshot: StoryOperationScrollHotkeyOpenSnapshot) => {
        if (displayRef.current) {
            return null;
        }
        const generation = openRunRef.current + 1;
        const nextDisplay = { ...snapshot, generation };
        openRunRef.current = generation;
        displayRef.current = nextDisplay;
        setDisplay(nextDisplay);
        return generation;
    }, []);
    const isDisplayActive = useCallback(() => Boolean(displayRef.current), []);
    const registerLocalRenderer = useCallback(() => {
        let registered = true;
        localRendererCountRef.current += 1;
        setLocalRendererCount(localRendererCountRef.current);
        return () => {
            if (!registered) {
                return;
            }
            registered = false;
            localRendererCountRef.current = Math.max(0, localRendererCountRef.current - 1);
            setLocalRendererCount(localRendererCountRef.current);
        };
    }, []);
    useEffect(() => {
        // NKCUIComHotkeyDisplay.Update rechecks only LeftAlt hold/editable state;
        // it never closes merely because the source FullScreen stops being topmost.
        const handleKeyUp = (event: KeyboardEvent) => {
            if (event.code === "AltLeft" && displayRef.current) {
                closeDisplay();
            }
        };
        const handleBlur = () => {
            if (displayRef.current) {
                closeDisplay();
            }
        };
        const handleFocusIn = (event: FocusEvent) => {
            if (displayRef.current && isStoryEditableElement(event.target)) {
                closeDisplay();
            }
        };
        // Capture before temporary page-level input blockers can stop propagation
        // during a route handoff fade. The client UIOverlay still observes release
        // even after the source FullScreen has stopped being topmost.
        window.addEventListener("keyup", handleKeyUp, true);
        window.addEventListener("blur", handleBlur);
        window.addEventListener("focusin", handleFocusIn, true);
        return () => {
            window.removeEventListener("keyup", handleKeyUp, true);
            window.removeEventListener("blur", handleBlur);
            window.removeEventListener("focusin", handleFocusIn, true);
        };
    }, [closeDisplay]);
    const controller = useMemo(() => ({
        display,
        isDisplayActive,
        openDisplay,
        registerLocalRenderer,
    }), [display, isDisplayActive, openDisplay, registerLocalRenderer]);
    return (<StoryOperationScrollHotkeyOverlayContext.Provider value={controller}>
      {children}
      {display && localRendererCount === 0 ? (<StoryOperationScrollHotkeyDisplayView display={display} host="global-ui-overlay"/>) : null}
    </StoryOperationScrollHotkeyOverlayContext.Provider>);
}
export function useStoryOperationScrollHotkeyOverlay() {
    const controller = useContext(StoryOperationScrollHotkeyOverlayContext);
    if (!controller) {
        throw new Error("StoryOperationScrollHotkeyOverlayProvider is required for StoryReader.");
    }
    return controller;
}
