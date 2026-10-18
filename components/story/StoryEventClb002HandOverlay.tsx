"use client";
import { useLayoutEffect, useRef } from "react";
import { getStoryEventClb002HandFrame, STORY_EVENT_CLB002_HAND_HEIGHT_MATCH_ASPECT, STORY_EVENT_CLB002_HAND_MARKER, STORY_EVENT_CLB002_HAND_RECTS, } from "@/lib/storyEventClb002Hand";
import styles from "./StoryEventClb002HandOverlay.module.css";
function setRectPosition(element: HTMLDivElement, rect: {
    anchorX: number;
    anchorY: number;
    x: number;
    y: number;
    width: number;
    height: number;
    pivotX: number;
    pivotY: number;
}, parentWidth: number, parentHeight: number, x = rect.x, width = rect.width) {
    element.style.left = `${rect.anchorX * parentWidth + x - rect.pivotX * width}px`;
    element.style.top = `${(1 - rect.anchorY) * parentHeight -
        rect.y -
        (1 - rect.pivotY) * rect.height}px`;
    element.style.width = `${width}px`;
    element.style.height = `${rect.height}px`;
    element.style.transformOrigin = `${rect.pivotX * 100}% ${(1 - rect.pivotY) * 100}%`;
}
function setRotation(element: HTMLDivElement, rotation: number) {
    // RectTransform uses a Y-up canvas while CSS's positive Z rotation is
    // clockwise in the Y-down viewport.
    element.style.transform = `rotate(${-rotation}deg)`;
}
export default function StoryEventClb002HandOverlay({ act, }: {
    act: number;
}) {
    const overlayRef = useRef<HTMLDivElement | null>(null);
    const shadowAnchorRef = useRef<HTMLDivElement | null>(null);
    const shadowScalerRef = useRef<HTMLDivElement | null>(null);
    const shadowRef = useRef<HTMLDivElement | null>(null);
    const imgAnchorRef = useRef<HTMLDivElement | null>(null);
    const imgScalerRef = useRef<HTMLDivElement | null>(null);
    const imgRef = useRef<HTMLDivElement | null>(null);
    const img2Ref = useRef<HTMLDivElement | null>(null);
    const img3Ref = useRef<HTMLDivElement | null>(null);
    const img4Ref = useRef<HTMLDivElement | null>(null);
    const img5Ref = useRef<HTMLDivElement | null>(null);
    const chessRef = useRef<HTMLDivElement | null>(null);
    const img6Ref = useRef<HTMLDivElement | null>(null);
    useLayoutEffect(() => {
        const overlay = overlayRef.current;
        const shadowAnchor = shadowAnchorRef.current;
        const shadowScaler = shadowScalerRef.current;
        const shadow = shadowRef.current;
        const imgAnchor = imgAnchorRef.current;
        const imgScaler = imgScalerRef.current;
        const img = imgRef.current;
        const img2 = img2Ref.current;
        const img3 = img3Ref.current;
        const img4 = img4Ref.current;
        const img5 = img5Ref.current;
        const chess = chessRef.current;
        const img6 = img6Ref.current;
        if (!overlay ||
            !shadowAnchor ||
            !shadowScaler ||
            !shadow ||
            !imgAnchor ||
            !imgScaler ||
            !img ||
            !img2 ||
            !img3 ||
            !img4 ||
            !img5 ||
            !chess ||
            !img6) {
            return;
        }
        const startedAt = performance.now();
        let animationFrame = 0;
        let previousViewportWidth = -1;
        let previousViewportHeight = -1;
        overlay.dataset.storyOperationEventHandStartedAt = startedAt.toFixed(3);
        overlay.dataset.storyOperationEventHandAct = String(act);
        const applyCanvasScale = () => {
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            if (viewportWidth === previousViewportWidth &&
                viewportHeight === previousViewportHeight) {
                return;
            }
            previousViewportWidth = viewportWidth;
            previousViewportHeight = viewportHeight;
            const scale = viewportWidth / viewportHeight >=
                STORY_EVENT_CLB002_HAND_HEIGHT_MATCH_ASPECT
                ? viewportHeight / 1080
                : viewportWidth / 1920;
            shadowScaler.style.transform = `scale(${scale})`;
            imgScaler.style.transform = `scale(${scale})`;
            overlay.dataset.storyOperationEventHandCanvasScale = scale.toFixed(9);
        };
        const applyFrame = (now: number) => {
            applyCanvasScale();
            const elapsed = (now - startedAt) / 1000;
            const frame = getStoryEventClb002HandFrame(elapsed);
            const imgWidth = frame.imgWidth;
            const imgHeight = frame.imgHeight;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const relativeY = Math.fround(0.2);
            const constrain = (dimension: number, relative: number, offset: number) => Math.fround(Math.fround(Math.fround(dimension) * Math.fround(relative)) +
                Math.fround(offset));
            const imgPivotX = constrain(viewportWidth, 1, frame.constraintOffsetX);
            const imgPivotY = constrain(viewportHeight, relativeY, -17.3799991607666);
            const shadowPivotX = constrain(viewportWidth, 1, -125.0999984741211);
            const shadowPivotY = constrain(viewportHeight, relativeY, -221.60000610351562);
            overlay.dataset.storyOperationEventHandState = frame.state;
            overlay.dataset.storyOperationEventHandStateTime =
                frame.stateTime.toFixed(6);
            overlay.dataset.storyOperationEventHandCycle = String(frame.cycle);
            overlay.dataset.storyOperationEventHandElapsed = elapsed.toFixed(6);
            overlay.dataset.storyOperationEventHandImgAlpha =
                frame.imgAlpha.toFixed(6);
            overlay.dataset.storyOperationEventHandShadowAlpha =
                frame.shadowAlpha.toFixed(6);
            overlay.dataset.storyOperationEventHandConstraintOffsetX =
                frame.constraintOffsetX.toFixed(6);
            overlay.dataset.storyOperationEventHandImgPivot =
                `${imgPivotX.toFixed(6)},${(viewportHeight - imgPivotY).toFixed(6)}`;
            overlay.dataset.storyOperationEventHandShadowPivot =
                `${shadowPivotX.toFixed(6)},${(viewportHeight - shadowPivotY).toFixed(6)}`;
            imgAnchor.style.left = `${imgPivotX}px`;
            imgAnchor.style.top = `${viewportHeight - imgPivotY}px`;
            shadowAnchor.style.left = `${shadowPivotX}px`;
            shadowAnchor.style.top = `${viewportHeight - shadowPivotY}px`;
            shadow.style.left = `${-STORY_EVENT_CLB002_HAND_RECTS.shadow.pivotX *
                STORY_EVENT_CLB002_HAND_RECTS.shadow.width}px`;
            shadow.style.top = `${-(1 - STORY_EVENT_CLB002_HAND_RECTS.shadow.pivotY) *
                STORY_EVENT_CLB002_HAND_RECTS.shadow.height}px`;
            shadow.style.transformOrigin = `${STORY_EVENT_CLB002_HAND_RECTS.shadow.pivotX * 100}% ${(1 - STORY_EVENT_CLB002_HAND_RECTS.shadow.pivotY) * 100}%`;
            shadow.style.opacity = String(frame.shadowAlpha);
            setRotation(shadow, STORY_EVENT_CLB002_HAND_RECTS.shadow.rotation);
            img.style.left = `${-STORY_EVENT_CLB002_HAND_RECTS.img.pivotX * imgWidth}px`;
            img.style.top = `${-(1 - STORY_EVENT_CLB002_HAND_RECTS.img.pivotY) * imgHeight}px`;
            img.style.width = `${imgWidth}px`;
            img.style.height = `${imgHeight}px`;
            img.style.opacity = String(frame.imgAlpha);
            setRectPosition(img2, STORY_EVENT_CLB002_HAND_RECTS.img2, imgWidth, imgHeight);
            setRotation(img2, frame.img2Rotation);
            setRectPosition(img3, STORY_EVENT_CLB002_HAND_RECTS.img3, imgWidth, imgHeight);
            setRotation(img3, frame.img3Rotation);
            setRectPosition(img4, STORY_EVENT_CLB002_HAND_RECTS.img4, STORY_EVENT_CLB002_HAND_RECTS.img3.width, STORY_EVENT_CLB002_HAND_RECTS.img3.height);
            setRotation(img4, frame.img4Rotation);
            setRectPosition(img5, STORY_EVENT_CLB002_HAND_RECTS.img5, STORY_EVENT_CLB002_HAND_RECTS.img4.width, STORY_EVENT_CLB002_HAND_RECTS.img4.height);
            setRotation(img5, frame.img5Rotation);
            setRectPosition(chess, STORY_EVENT_CLB002_HAND_RECTS.chess, imgWidth, imgHeight);
            setRotation(chess, frame.chessRotation);
            setRectPosition(img6, STORY_EVENT_CLB002_HAND_RECTS.img6, imgWidth, imgHeight, frame.img6X, frame.img6Width);
            setRotation(img6, frame.img6Rotation);
            overlay.style.visibility = "visible";
            animationFrame = window.requestAnimationFrame(applyFrame);
        };
        animationFrame = window.requestAnimationFrame(applyFrame);
        return () => window.cancelAnimationFrame(animationFrame);
    }, [act]);
    return (<div ref={overlayRef} className={styles.overlay} data-story-operation-event-hand={STORY_EVENT_CLB002_HAND_MARKER} data-story-operation-event-hand-prefab="UI_EVENT_CLB_002_R/HAND" data-story-operation-event-hand-controller="UI_EVENT_CLB_002_HAND_ANI_AC" data-story-operation-event-hand-transition="INTRO>IDLE" data-story-operation-event-hand-screen-constraint="IMG,Shadow" data-story-operation-event-hand-image-order="Shadow,IMG,IMG2,IMG3,IMG4,IMG5,Chess,IMG6" data-story-operation-event-hand-act-lifetime="restart" aria-hidden="true">
      <svg className={styles.shadowFilter} aria-hidden="true">
        <defs>
          <filter id="story-event-clb002-shadow-tint" x="-100%" y="-100%" width="300%" height="300%" colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values={`
                0 0 0 0 ${19 / 255}
                0 0 0 0 ${4 / 255}
                0 0 0 0 ${4 / 255}
                0 0 0 ${222 / 255} 0
              `}/>
          </filter>
        </defs>
      </svg>
      <div ref={shadowAnchorRef} className={`${styles.constraintAnchor} ${styles.shadowAnchor}`} data-story-operation-event-hand-constraint="Shadow">
        <div ref={shadowScalerRef} className={styles.geometryScaler}>
          <div ref={shadowRef} className={`${styles.image} ${styles.shadow}`} data-story-operation-event-hand-layer="Shadow"/>
        </div>
      </div>
      <div ref={imgAnchorRef} className={`${styles.constraintAnchor} ${styles.imgAnchor}`} data-story-operation-event-hand-constraint="IMG">
        <div ref={imgScalerRef} className={styles.geometryScaler}>
          <div ref={imgRef} className={`${styles.image} ${styles.img}`} data-story-operation-event-hand-layer="IMG">
            <div ref={img2Ref} className={`${styles.image} ${styles.img2}`} data-story-operation-event-hand-layer="IMG2"/>
            <div ref={img3Ref} className={`${styles.image} ${styles.img3}`} data-story-operation-event-hand-layer="IMG3">
              <div ref={img4Ref} className={`${styles.image} ${styles.img4}`} data-story-operation-event-hand-layer="IMG4">
                <div ref={img5Ref} className={`${styles.image} ${styles.img5}`} data-story-operation-event-hand-layer="IMG5"/>
              </div>
            </div>
            <div ref={chessRef} className={`${styles.image} ${styles.chess}`} data-story-operation-event-hand-layer="Chess"/>
            <div ref={img6Ref} className={`${styles.image} ${styles.img6}`} data-story-operation-event-hand-layer="IMG6"/>
          </div>
        </div>
      </div>
    </div>);
}
