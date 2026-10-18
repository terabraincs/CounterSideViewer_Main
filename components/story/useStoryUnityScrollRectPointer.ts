"use client";
import { useCallback, useEffect, useRef, type DragEvent as ReactDragEvent, type MouseEvent as ReactMouseEvent, type MutableRefObject, type PointerEvent as ReactPointerEvent, type RefObject, } from "react";
import { STORY_UNITY_SCROLL_RECT_DRAG_THRESHOLD, STORY_UNITY_SCROLL_RECT_VELOCITY_LERP, } from "@/lib/storyUnityScrollRect";
type StoryUnityPointerState<T extends HTMLElement> = {
    viewport: T;
    pointerId: number;
    startX: number;
    startY: number;
    beginX: number;
    beginY: number;
    startVisualPosition: number;
    visualUnitsPerScreenPixel: number;
    initialTarget: EventTarget | null;
    dragging: boolean;
};
export type StoryUnityPointerFinish<T extends HTMLElement> = {
    viewport: T;
    initialTarget: EventTarget | null;
    finalTarget: EventTarget | null;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    dragged: boolean;
    cancelled: boolean;
};
export function useStoryUnityScrollRectPointer<T extends HTMLElement>({ enabled = true, axis, viewportRef, velocityRef, getVisualPosition, getVisualUnitsPerScreenPixel, applyDragPosition, cancelReleaseMotion, allowPointerStart, onDragStart, onDragEnd, onPointerFinish, }: {
    enabled?: boolean;
    axis: "horizontal" | "vertical";
    viewportRef: RefObject<T | null>;
    velocityRef: MutableRefObject<number>;
    getVisualPosition: (viewport: T) => number;
    getVisualUnitsPerScreenPixel?: (viewport: T) => number;
    applyDragPosition: (viewport: T, desiredVisualPosition: number) => void;
    cancelReleaseMotion: () => void;
    allowPointerStart?: (target: EventTarget | null) => boolean;
    onDragStart?: (viewport: T) => void;
    onDragEnd: (viewport: T, velocity: number, cancelled: boolean) => void;
    onPointerFinish?: (finish: StoryUnityPointerFinish<T>) => void;
}) {
    const pointerRef = useRef<StoryUnityPointerState<T> | null>(null);
    const velocityFrameRef = useRef<number | null>(null);
    const previousVisualPositionRef = useRef(0);
    const previousVelocityTimeRef = useRef(0);
    const suppressClickRef = useRef(false);
    const suppressClickResetTimerRef = useRef<number | null>(null);
    const setPointerPhase = useCallback((viewport: T, phase: "idle" | "pending" | "dragging") => {
        viewport.dataset.storyUnityScrollrectPointerPhase = phase;
        viewport.dataset.storyUnityScrollrectVelocity =
            velocityRef.current.toFixed(3);
    }, [velocityRef]);
    const cancelVelocityTracking = useCallback(() => {
        if (velocityFrameRef.current !== null) {
            window.cancelAnimationFrame(velocityFrameRef.current);
            velocityFrameRef.current = null;
        }
    }, []);
    const sampleVelocity = useCallback((viewport: T, currentTime: number) => {
        const deltaTime = Math.max((currentTime - previousVelocityTimeRef.current) / 1000, 0);
        if (deltaTime <= 0) {
            return;
        }
        const visualPosition = getVisualPosition(viewport);
        const instantaneousVelocity = (visualPosition - previousVisualPositionRef.current) / deltaTime;
        velocityRef.current +=
            (instantaneousVelocity - velocityRef.current) *
                Math.min(deltaTime * STORY_UNITY_SCROLL_RECT_VELOCITY_LERP, 1);
        previousVisualPositionRef.current = visualPosition;
        previousVelocityTimeRef.current = currentTime;
        viewport.dataset.storyUnityScrollrectVelocity =
            velocityRef.current.toFixed(3);
    }, [getVisualPosition, velocityRef]);
    const startVelocityTracking = useCallback((viewport: T) => {
        cancelVelocityTracking();
        previousVisualPositionRef.current = getVisualPosition(viewport);
        previousVelocityTimeRef.current = performance.now();
        const update = (currentTime: number) => {
            const pointer = pointerRef.current;
            if (!pointer ||
                !pointer.dragging ||
                pointer.viewport !== viewport) {
                velocityFrameRef.current = null;
                return;
            }
            sampleVelocity(viewport, currentTime);
            velocityFrameRef.current = window.requestAnimationFrame(update);
        };
        velocityFrameRef.current = window.requestAnimationFrame(update);
    }, [cancelVelocityTracking, getVisualPosition, sampleVelocity]);
    const clearSuppressClickTimer = useCallback(() => {
        if (suppressClickResetTimerRef.current !== null) {
            window.clearTimeout(suppressClickResetTimerRef.current);
            suppressClickResetTimerRef.current = null;
        }
    }, []);
    const cancelPointerTracking = useCallback(() => {
        const pointer = pointerRef.current;
        const viewport = pointer?.viewport ?? viewportRef.current;
        pointerRef.current = null;
        cancelVelocityTracking();
        clearSuppressClickTimer();
        suppressClickRef.current = false;
        if (pointer) {
            if (pointer.viewport.hasPointerCapture(pointer.pointerId)) {
                try {
                    pointer.viewport.releasePointerCapture(pointer.pointerId);
                }
                catch {
                    // The browser may already have released capture during teardown.
                }
            }
        }
        if (viewport) {
            setPointerPhase(viewport, "idle");
        }
    }, [
        cancelVelocityTracking,
        clearSuppressClickTimer,
        setPointerPhase,
        viewportRef,
    ]);
    const onPointerDown = useCallback((event: ReactPointerEvent<T>) => {
        if (!enabled || event.button !== 0 || !event.isPrimary) {
            return;
        }
        if (allowPointerStart && !allowPointerStart(event.target)) {
            return;
        }
        clearSuppressClickTimer();
        suppressClickRef.current = false;
        velocityRef.current = 0;
        const viewport = event.currentTarget;
        delete viewport.dataset.storyUnityScrollrectClick;
        viewport.dataset.storyUnityScrollrectRawBoundaryObserved = "false";
        viewport.dataset.storyUnityScrollrectLastPointer = "pending";
        delete viewport.dataset.storyUnityScrollrectLastBeginDistance;
        delete viewport.dataset.storyUnityScrollrectLastPointerDistance;
        pointerRef.current = {
            viewport,
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            beginX: event.clientX,
            beginY: event.clientY,
            startVisualPosition: getVisualPosition(viewport),
            visualUnitsPerScreenPixel: 1,
            initialTarget: event.target,
            dragging: false,
        };
        setPointerPhase(viewport, "pending");
    }, [
        allowPointerStart,
        clearSuppressClickTimer,
        enabled,
        getVisualPosition,
        setPointerPhase,
        velocityRef,
    ]);
    useEffect(() => {
        if (!enabled) {
            cancelPointerTracking();
            return;
        }
        const handlePointerMove = (event: PointerEvent) => {
            const pointer = pointerRef.current;
            if (!pointer || pointer.pointerId !== event.pointerId) {
                return;
            }
            if (!pointer.dragging) {
                const distance = Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY);
                if (distance < STORY_UNITY_SCROLL_RECT_DRAG_THRESHOLD) {
                    return;
                }
                // PointerInputModule executes OnBeginDrag at this cursor, then OnDrag
                // in the same event. The first 50px therefore becomes the zero-delta
                // baseline instead of moving Content.
                pointer.dragging = true;
                pointer.beginX = event.clientX;
                pointer.beginY = event.clientY;
                pointer.startVisualPosition = getVisualPosition(pointer.viewport);
                const visualUnitsPerScreenPixel = getVisualUnitsPerScreenPixel?.(pointer.viewport) ?? 1;
                pointer.visualUnitsPerScreenPixel =
                    Number.isFinite(visualUnitsPerScreenPixel) &&
                        visualUnitsPerScreenPixel > 0
                        ? visualUnitsPerScreenPixel
                        : 1;
                pointer.viewport.dataset.storyUnityScrollrectVisualUnitsPerScreenPixel =
                    pointer.visualUnitsPerScreenPixel.toFixed(6);
                pointer.viewport.dataset.storyUnityScrollrectLastBeginDistance =
                    distance.toFixed(3);
                suppressClickRef.current = true;
                cancelReleaseMotion();
                onDragStart?.(pointer.viewport);
                if (!pointer.viewport.hasPointerCapture(pointer.pointerId)) {
                    try {
                        pointer.viewport.setPointerCapture(pointer.pointerId);
                    }
                    catch {
                        // Window capture listeners still preserve the client lifecycle.
                    }
                }
                startVelocityTracking(pointer.viewport);
                setPointerPhase(pointer.viewport, "dragging");
                event.preventDefault();
                return;
            }
            event.preventDefault();
            const axisDelta = axis === "vertical"
                ? event.clientY - pointer.beginY
                : event.clientX - pointer.beginX;
            applyDragPosition(pointer.viewport, pointer.startVisualPosition -
                axisDelta * pointer.visualUnitsPerScreenPixel);
        };
        const finishPointer = (event: PointerEvent, cancelled: boolean) => {
            const pointer = pointerRef.current;
            if (!pointer || pointer.pointerId !== event.pointerId) {
                return;
            }
            pointerRef.current = null;
            cancelVelocityTracking();
            if (pointer.viewport.hasPointerCapture(pointer.pointerId)) {
                try {
                    pointer.viewport.releasePointerCapture(pointer.pointerId);
                }
                catch {
                    // The pointer may have been released outside the viewport already.
                }
            }
            setPointerPhase(pointer.viewport, "idle");
            pointer.viewport.dataset.storyUnityScrollrectLastPointer =
                pointer.dragging ? "dragged" : "click";
            pointer.viewport.dataset.storyUnityScrollrectLastPointerDistance =
                Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY).toFixed(3);
            onPointerFinish?.({
                viewport: pointer.viewport,
                initialTarget: pointer.initialTarget,
                finalTarget: event.target,
                startX: pointer.startX,
                startY: pointer.startY,
                endX: event.clientX,
                endY: event.clientY,
                dragged: pointer.dragging,
                cancelled,
            });
            if (pointer.dragging) {
                onDragEnd(pointer.viewport, velocityRef.current, cancelled);
                clearSuppressClickTimer();
                suppressClickResetTimerRef.current = window.setTimeout(() => {
                    suppressClickRef.current = false;
                    suppressClickResetTimerRef.current = null;
                }, 0);
            }
        };
        const handlePointerUp = (event: PointerEvent) => finishPointer(event, false);
        const handlePointerCancel = (event: PointerEvent) => finishPointer(event, true);
        window.addEventListener("pointermove", handlePointerMove, {
            capture: true,
            passive: false,
        });
        window.addEventListener("pointerup", handlePointerUp, true);
        window.addEventListener("pointercancel", handlePointerCancel, true);
        return () => {
            window.removeEventListener("pointermove", handlePointerMove, true);
            window.removeEventListener("pointerup", handlePointerUp, true);
            window.removeEventListener("pointercancel", handlePointerCancel, true);
        };
    }, [
        applyDragPosition,
        axis,
        cancelPointerTracking,
        cancelReleaseMotion,
        cancelVelocityTracking,
        clearSuppressClickTimer,
        enabled,
        getVisualPosition,
        getVisualUnitsPerScreenPixel,
        onDragEnd,
        onDragStart,
        onPointerFinish,
        setPointerPhase,
        startVelocityTracking,
        velocityRef,
    ]);
    useEffect(() => {
        if (!enabled) {
            return;
        }
        const viewport = viewportRef.current;
        if (!viewport) {
            return;
        }
        viewport.dataset.storyUnityScrollrectPointerPhase = "idle";
        viewport.dataset.storyUnityScrollrectVelocity =
            velocityRef.current.toFixed(3);
        viewport.dataset.storyUnityScrollrectVisualUnitsPerScreenPixel =
            "1.000000";
        viewport.dataset.storyUnityScrollrectRawBoundaryObserved = "false";
        viewport.dataset.storyUnityScrollrectLastPointer = "idle";
    }, [enabled, velocityRef, viewportRef]);
    useEffect(() => () => {
        cancelPointerTracking();
    }, [cancelPointerTracking]);
    const onClickCapture = useCallback((event: ReactMouseEvent<T>) => {
        if (!suppressClickRef.current) {
            return;
        }
        suppressClickRef.current = false;
        clearSuppressClickTimer();
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.dataset.storyUnityScrollrectClick =
            "drag-suppressed";
    }, [clearSuppressClickTimer]);
    return {
        cancelPointerTracking,
        pointerProps: {
            onPointerDown,
            onClickCapture,
            onDragStart: (event: ReactDragEvent<T>) => event.preventDefault(),
        },
        markerProps: {
            "data-story-unity-scrollrect-pointer": "STV-MAP-067",
            "data-story-unity-scrollrect-axis": axis,
            "data-story-unity-scrollrect-drag-threshold": STORY_UNITY_SCROLL_RECT_DRAG_THRESHOLD,
            "data-story-unity-scrollrect-threshold-frame": "consumed",
            "data-story-unity-scrollrect-late-update": "shared-velocity-raw-boundary-smooth-target-clamp",
        },
    };
}
