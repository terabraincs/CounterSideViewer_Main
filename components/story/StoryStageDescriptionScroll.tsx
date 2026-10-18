"use client";
import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, } from "react";
import { parseStoryStageDescription } from "@/lib/storyStageDescription";
import { getStoryUnityScrollRectDragFrame, getStoryUnityScrollRectReleaseFrame, getStoryUnityScrollRectVerticalWheelDelta, getStoryUnityScrollRectWheelFrame, STORY_UNITY_SCROLL_RECT_ELASTICITY, } from "@/lib/storyUnityScrollRect";
import { useStoryUnityScrollRectPointer } from "./useStoryUnityScrollRectPointer";
import styles from "./StoryReader.module.css";
const STORY_DESCRIPTION_SCROLL_DECELERATION_RATE = 0.135;
const STORY_DESCRIPTION_SCROLL_SENSITIVITY = 1;
const STORY_DESCRIPTION_SCROLL_LINE_SIZE = 32;
const STORY_DESCRIPTION_VIEWPORT_REFERENCE_WIDTH = 440;
type StoryStageDescriptionScrollProps = {
    description: string;
    resetKey: string | number;
};
export default function StoryStageDescriptionScroll({ description, resetKey, }: StoryStageDescriptionScrollProps) {
    const viewportRef = useRef<HTMLDivElement | null>(null);
    const motionFrameRef = useRef<number | null>(null);
    const rubberRef = useRef(0);
    const velocityRef = useRef(0);
    const segments = useMemo(() => parseStoryStageDescription(description), [description]);
    const getMaximum = useCallback((viewport: HTMLDivElement) => Math.max(0, viewport.scrollHeight - viewport.clientHeight), []);
    const setRubber = useCallback((viewport: HTMLDivElement, rubber: number) => {
        const safeRubber = Number.isFinite(rubber) ? rubber : 0;
        rubberRef.current = safeRubber;
        viewport.style.setProperty("--story-stage-description-rubber-y", `${safeRubber}px`);
        viewport.dataset.storyOperationStageDescriptionRubberY =
            safeRubber.toFixed(3);
        viewport.dataset.storyOperationStageDescriptionVisualPosition = (viewport.scrollTop - safeRubber).toFixed(3);
    }, []);
    const cancelMotion = useCallback(() => {
        if (motionFrameRef.current !== null) {
            window.cancelAnimationFrame(motionFrameRef.current);
            motionFrameRef.current = null;
        }
    }, []);
    const stopMotion = useCallback((viewport: HTMLDivElement | null = viewportRef.current) => {
        cancelMotion();
        velocityRef.current = 0;
        if (!viewport) {
            rubberRef.current = 0;
            return;
        }
        setRubber(viewport, 0);
        viewport.dataset.storyOperationStageDescriptionMotion = "idle";
        viewport.dataset.storyUnityScrollrectVelocity = "0.000";
    }, [cancelMotion, setRubber]);
    const getVisualPosition = useCallback((viewport: HTMLDivElement) => viewport.scrollTop - rubberRef.current, []);
    const applyDragPosition = useCallback((viewport: HTMLDivElement, desiredVisualPosition: number) => {
        const frame = getStoryUnityScrollRectDragFrame(desiredVisualPosition, getMaximum(viewport), viewport.clientHeight);
        viewport.scrollTop = frame.scrollPosition;
        setRubber(viewport, frame.rubber);
        viewport.dataset.storyOperationStageDescriptionMotion = "dragging";
        viewport.dataset.storyOperationStageDescriptionRawBoundary = "false";
    }, [getMaximum, setRubber]);
    const startReleaseMotion = useCallback((viewport: HTMLDivElement, initialVelocity: number, { firstElasticity }: {
        firstElasticity?: number;
    } = {}) => {
        cancelMotion();
        velocityRef.current = initialVelocity;
        let lastTime = performance.now();
        const minimumVelocity = Math.max(viewport.getBoundingClientRect().width /
            STORY_DESCRIPTION_VIEWPORT_REFERENCE_WIDTH, Number.EPSILON);
        let pendingFirstElasticity = firstElasticity;
        viewport.dataset.storyUnityScrollrectMinimumVelocity =
            minimumVelocity.toFixed(6);
        const update = (currentTime: number) => {
            if (viewportRef.current !== viewport) {
                motionFrameRef.current = null;
                return;
            }
            const deltaTime = Math.max((currentTime - lastTime) / 1000, 0);
            lastTime = currentTime;
            const frame = getStoryUnityScrollRectReleaseFrame({
                visualPosition: getVisualPosition(viewport),
                maximum: getMaximum(viewport),
                velocity: velocityRef.current,
                deltaTime,
                elasticity: pendingFirstElasticity ?? STORY_UNITY_SCROLL_RECT_ELASTICITY,
                decelerationRate: STORY_DESCRIPTION_SCROLL_DECELERATION_RATE,
                minimumVelocity,
            });
            pendingFirstElasticity = undefined;
            velocityRef.current = frame.velocity;
            viewport.scrollTop = frame.scrollPosition;
            setRubber(viewport, frame.rubber);
            viewport.dataset.storyUnityScrollrectVelocity =
                frame.velocity.toFixed(3);
            viewport.dataset.storyOperationStageDescriptionMotion = frame.motion;
            viewport.dataset.storyOperationStageDescriptionRawBoundary = String(frame.motion === "inertia-boundary");
            if (frame.motion === "inertia-boundary") {
                viewport.dataset.storyUnityScrollrectRawBoundaryObserved = "true";
            }
            if (frame.motion === "idle" ||
                (frame.motion === "elastic" &&
                    Math.abs(frame.rubber) <= 0.05 &&
                    frame.velocity === 0)) {
                stopMotion(viewport);
                return;
            }
            motionFrameRef.current = window.requestAnimationFrame(update);
        };
        motionFrameRef.current = window.requestAnimationFrame(update);
    }, [
        cancelMotion,
        getMaximum,
        getVisualPosition,
        setRubber,
        stopMotion,
    ]);
    const pointer = useStoryUnityScrollRectPointer({
        axis: "vertical",
        viewportRef,
        velocityRef,
        getVisualPosition,
        applyDragPosition,
        cancelReleaseMotion: cancelMotion,
        onDragStart: (viewport) => {
            viewport.dataset.storyOperationStageDescriptionMotion = "dragging";
            viewport.dataset.storyOperationStageDescriptionRawBoundary = "false";
        },
        onDragEnd: (viewport, velocity) => {
            startReleaseMotion(viewport, velocity);
        },
    });
    useLayoutEffect(() => {
        const viewport = viewportRef.current;
        if (!viewport) {
            return;
        }
        cancelMotion();
        velocityRef.current = 0;
        viewport.scrollTop = 0;
        setRubber(viewport, 0);
        viewport.dataset.storyOperationStageDescriptionMaximum =
            getMaximum(viewport).toFixed(3);
        viewport.dataset.storyOperationStageDescriptionMotion = "idle";
        viewport.dataset.storyOperationStageDescriptionRawBoundary = "false";
        viewport.dataset.storyUnityScrollrectRawBoundaryObserved = "false";
        viewport.dataset.storyUnityScrollrectVelocity = "0.000";
    }, [cancelMotion, description, getMaximum, resetKey, setRubber]);
    useEffect(() => {
        const viewport = viewportRef.current;
        if (!viewport) {
            return;
        }
        const handleWheel = (event: WheelEvent) => {
            const wheelDelta = getStoryUnityScrollRectVerticalWheelDelta(event.deltaX, event.deltaY, event.deltaMode, STORY_DESCRIPTION_SCROLL_LINE_SIZE, viewport.clientHeight, STORY_DESCRIPTION_SCROLL_SENSITIVITY);
            if (wheelDelta === 0) {
                return;
            }
            cancelMotion();
            velocityRef.current = 0;
            const frame = getStoryUnityScrollRectWheelFrame(getVisualPosition(viewport) + wheelDelta, getMaximum(viewport));
            viewport.scrollTop = frame.scrollPosition;
            setRubber(viewport, frame.rubber);
            event.preventDefault();
            viewport.dataset.storyOperationStageDescriptionWheelAxis =
                Math.abs(event.deltaX) > Math.abs(event.deltaY) ? "x" : "y";
            viewport.dataset.storyOperationStageDescriptionWheelDelta =
                wheelDelta.toFixed(3);
            viewport.dataset.storyOperationStageDescriptionRawBoundary = String(frame.rubber !== 0);
            if (frame.rubber === 0) {
                viewport.dataset.storyOperationStageDescriptionMotion = "idle";
                viewport.dataset.storyUnityScrollrectVelocity = "0.000";
                return;
            }
            viewport.dataset.storyOperationStageDescriptionMotion =
                "wheel-boundary";
            startReleaseMotion(viewport, 0, {
                firstElasticity: STORY_UNITY_SCROLL_RECT_ELASTICITY * 3,
            });
        };
        viewport.addEventListener("wheel", handleWheel, { passive: false });
        return () => viewport.removeEventListener("wheel", handleWheel);
    }, [
        cancelMotion,
        getMaximum,
        getVisualPosition,
        resetKey,
        setRubber,
        startReleaseMotion,
    ]);
    useEffect(() => () => cancelMotion(), [cancelMotion]);
    return (<div className={styles.stageDescriptionScrollRect} data-story-operation-stage-description-scroll="STV-MAP-074" data-story-operation-stage-description-scroll-rect="460x163.270706">
      <div ref={viewportRef} className={styles.stageDescriptionViewport} data-story-operation-stage-description-viewport="440x163.270004" data-story-operation-stage-description-physics="vertical-elastic-0.1-inertia-0.135-sensitivity-1" {...pointer.markerProps} {...pointer.pointerProps}>
        <div className={styles.stageDescriptionContent}>
          <p className={styles.stageDescriptionText} data-story-operation-stage-description-layout="STV-MAP-071" data-story-operation-stage-description-rich-text="STV-MAP-073">
            {segments.map((segment, index) => segment.color ? (<span key={`${index}-${segment.color}`} style={{ color: segment.color }}>
                  {segment.text}
                </span>) : (<Fragment key={index}>{segment.text}</Fragment>))}
          </p>
        </div>
      </div>
    </div>);
}
