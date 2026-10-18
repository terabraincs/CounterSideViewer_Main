"use client";
import { deploymentUrl } from "@/lib/deployment";
import Image from "@/components/DeploymentImage";
import Link from "@/components/DeploymentLink";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent as ReactDragEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, } from "react";
import type { StorylineSeasonalEpisode } from "@/lib/storyline";
import { createStoryAudio } from "@/lib/storyAudioCache";
import { getStoryClientAudioVolume } from "@/lib/storyAudioVolume";
import { getStoryMouseCancelAction } from "@/lib/storyPlayback";
import { playStoryUiPointerSound } from "@/lib/storyUiAudio";
import { getActiveStoryThemeState, playStoryTheme, } from "@/lib/storyThemeAudio";
import { getStoryUnityScrollRectDragFrame, getStoryUnityScrollRectReleaseFrame, } from "@/lib/storyUnityScrollRect";
import chronicleStyles from "../StorylineMap.module.css";
import StoryHotkeyDisplay from "./StoryHotkeyDisplay";
import { useStoryUnityScrollRectPointer } from "./useStoryUnityScrollRectPointer";
import upsideStyles from "./StoryReader.module.css";
import styles from "./StorySeasonalViewer.module.css";
type RelatedStory = {
    episodeId: number;
    categoryKo: string;
    subtitleKo: string;
};
export type StorySeasonalReturnState = {
    episodeId: number;
    episodeScrollTop: number;
    episodeScrollRubberY: number;
    episodeLoopStartIndex: number;
    episodeLoopActiveSlots: 3 | 4;
    episodeLoopAnchoredY: number;
    returnToken?: string;
    lifecycle: "UnHide";
    createdAt: number;
};
type VerticalDragState = {
    pointerId: number;
    startX: number;
    startY: number;
    startVisualPosition: number;
    lastVisualPosition: number;
    lastTime: number;
    velocity: number;
    dragging: boolean;
};
type SeasonalLoopHotkeyState = {
    startIndex: number;
    activeSlots: number;
    anchoredY: number;
    lastScrollTop: number;
};
type SeasonalCanvasLayout = {
    scale: number;
    logicalWidth: number;
    logicalHeight: number;
};
type SeasonalLoopGeometry = {
    viewportTop: number;
    viewportHeight: number;
    viewportBottom: number;
    contentCenter: number;
    totalContentHeight: number;
    initialActiveSlots: number;
    fullActiveSlots: number;
    poolSize: number;
    initialContentHeight: number;
    fullContentHeight: number;
    initialBound: number;
    fullBound: number;
    initialStartIndex: number;
    maxStartIndex: number;
};
type SeasonalSlotTransition = {
    motion: "OFF_TO_ON" | "ON_TO_OFF";
    run: number;
};
type SeasonalPoolBinding = {
    episodeId: number | null;
    selected: boolean;
};
type SeasonalPoolRebindMode = "unchanged" | "reset-idle" | "preserve-motion";
const REFERENCE_WIDTH = 1920;
const REFERENCE_HEIGHT = 1080;
const CLIENT_ASPECT_SWITCH = Math.fround(1.777);
const BACKGROUND_ASPECT_RATIO = 16 / 9;
const THUMBNAIL_ASPECT_RATIO = 0.93;
const SELECTION_FADE_MS = 150;
const INTRO_DURATION_MS = 416.667;
const ELASTICITY = 0.1;
const DECELERATION_RATE = 0.135;
const WHEEL_MULTIPLIER = 150;
const WHEEL_RUBBER_SCALE = 0.5;
const BROWSER_PIXEL_TICK = 120;
const HOTKEY_DISPLAY_HALF_HEIGHT = 50;
const LOOP_CELL_LINE_SIZE = 150;
const LOOP_SLOT_HEIGHT = 100;
const LOOP_LAYOUT_PADDING = 200;
const LOOP_VIEWPORT_SIZE_DELTA = -601.482178;
const LOOP_VIEWPORT_TOP = 361.741089;
const LOOP_VIEWPORT_BOTTOM_INSET = 239.741089;
const EPISODE_HOTKEY_REFERENCE_TOP = LOOP_VIEWPORT_TOP +
    (REFERENCE_HEIGHT + LOOP_VIEWPORT_SIZE_DELTA) / 2 -
    HOTKEY_DISPLAY_HALF_HEIGHT;
const SEASONAL_INTRO_SFX_URL = "/story/seasonal-ui/FX_UI_SUBSTREAM_INTRO.wav";
const STORY_SEASONAL_RETURN_STORAGE_KEY = "story-seasonal-return-episode";
const playingSeasonalIntroAudio = new Set<HTMLAudioElement>();
const CONFIRM_HOTKEY_CODES = new Set([
    "Enter",
    "NumpadEnter",
    "Space",
    "Numpad5",
]);
function getSeasonalCanvasLayout(viewportWidth: number, viewportHeight: number): SeasonalCanvasLayout {
    const matchHeight = viewportWidth / viewportHeight >= CLIENT_ASPECT_SWITCH;
    const scale = matchHeight
        ? viewportHeight / REFERENCE_HEIGHT
        : viewportWidth / REFERENCE_WIDTH;
    return {
        scale,
        logicalWidth: viewportWidth / scale,
        logicalHeight: viewportHeight / scale,
    };
}
function getSeasonalLoopContentHeight(activeSlots: number) {
    if (activeSlots <= 0) {
        return 0;
    }
    return (LOOP_LAYOUT_PADDING +
        activeSlots * LOOP_SLOT_HEIGHT +
        (activeSlots - 1) * (LOOP_CELL_LINE_SIZE - LOOP_SLOT_HEIGHT));
}
function getSeasonalLoopGeometry(logicalHeight: number, episodeCount: number): SeasonalLoopGeometry {
    const viewportHeight = Math.max(0, logicalHeight + LOOP_VIEWPORT_SIZE_DELTA);
    const viewportBottom = logicalHeight - LOOP_VIEWPORT_BOTTOM_INSET;
    const requestedInitialSlots = Math.max(1, Math.ceil((viewportHeight - LOOP_CELL_LINE_SIZE) / LOOP_CELL_LINE_SIZE));
    const initialActiveSlots = episodeCount > 0 ? Math.min(episodeCount, requestedInitialSlots) : 0;
    const fullActiveSlots = Math.min(episodeCount, initialActiveSlots + (initialActiveSlots < episodeCount ? 1 : 0));
    const initialContentHeight = getSeasonalLoopContentHeight(initialActiveSlots);
    const fullContentHeight = getSeasonalLoopContentHeight(fullActiveSlots);
    return {
        viewportTop: LOOP_VIEWPORT_TOP,
        viewportHeight,
        viewportBottom,
        contentCenter: LOOP_VIEWPORT_TOP + viewportHeight / 2,
        totalContentHeight: getSeasonalLoopContentHeight(episodeCount),
        initialActiveSlots,
        fullActiveSlots,
        poolSize: fullActiveSlots,
        initialContentHeight,
        fullContentHeight,
        initialBound: Math.max(0, (initialContentHeight - viewportHeight) / 2),
        fullBound: Math.max(0, (fullContentHeight - viewportHeight) / 2),
        initialStartIndex: Math.max(0, episodeCount - initialActiveSlots),
        maxStartIndex: Math.max(0, episodeCount - fullActiveSlots),
    };
}
function getEpisodeHotkeyRootTop(viewport: HTMLElement | null, anchoredY: number, geometry: SeasonalLoopGeometry) {
    const baseTop = geometry.contentCenter - HOTKEY_DISPLAY_HALF_HEIGHT;
    if (!viewport) {
        return baseTop;
    }
    const rubberY = Number(viewport.dataset.storySeasonalScrollRubberY ?? "0");
    return baseTop - anchoredY + rubberY;
}
function positiveModulo(value: number, divisor: number) {
    return ((value % divisor) + divisor) % divisor;
}
function getSeasonalTogglePoolIndexes(state: Pick<SeasonalLoopHotkeyState, "startIndex" | "activeSlots">, episodeCount: number, geometry: SeasonalLoopGeometry) {
    const registered: Array<number | null> = Array.from({ length: geometry.poolSize }, () => null);
    if (geometry.poolSize === 0) {
        return registered;
    }
    const firstPoolIndex = positiveModulo(state.startIndex - geometry.initialStartIndex, geometry.poolSize);
    for (let offset = 0; offset < Math.min(state.activeSlots, geometry.poolSize); offset += 1) {
        const episodeIndex = state.startIndex + offset;
        if (episodeIndex >= 0 && episodeIndex < episodeCount) {
            registered[(firstPoolIndex + offset) % geometry.poolSize] = episodeIndex;
        }
    }
    return registered;
}
function getSeasonalToggleCenter(state: Pick<SeasonalLoopHotkeyState, "startIndex" | "activeSlots" | "anchoredY">, episodeIndex: number, rubberY: number, geometry: SeasonalLoopGeometry) {
    const visualIndex = episodeIndex - state.startIndex;
    const firstCenter = geometry.contentCenter -
        ((Math.max(1, state.activeSlots) - 1) * LOOP_CELL_LINE_SIZE) / 2;
    return (firstCenter +
        visualIndex * LOOP_CELL_LINE_SIZE -
        state.anchoredY +
        rubberY);
}
function isSeasonalToggleCenterVisible(state: Pick<SeasonalLoopHotkeyState, "startIndex" | "activeSlots" | "anchoredY">, episodeIndex: number, rubberY: number, geometry: SeasonalLoopGeometry) {
    const center = getSeasonalToggleCenter(state, episodeIndex, rubberY, geometry);
    return center >= geometry.viewportTop && center <= geometry.viewportBottom;
}
function getSeasonalToggleContentTop(state: SeasonalLoopHotkeyState, episodeIndex: number, geometry: SeasonalLoopGeometry) {
    return (state.lastScrollTop +
        getSeasonalToggleCenter(state, episodeIndex, 0, geometry) -
        geometry.viewportTop -
        50);
}
function getSeasonalPoolRebindMode(previousBinding: SeasonalPoolBinding, nextBinding: SeasonalPoolBinding): SeasonalPoolRebindMode {
    if (previousBinding.episodeId === nextBinding.episodeId) {
        return "unchanged";
    }
    // NKCUIOperationSubMainStreamEPSlot.SetSelected only forces an idle state
    // when the physical slot was selected or its newly bound data is selected.
    // A false -> false rebind therefore keeps that pool Animator's transition.
    if (nextBinding.episodeId === null ||
        previousBinding.selected ||
        nextBinding.selected) {
        return "reset-idle";
    }
    return "preserve-motion";
}
function syncSeasonalEpisodeTabStops(viewport: HTMLElement, episodes: StorylineSeasonalEpisode[], selectedEpisodeId: number, state: SeasonalLoopHotkeyState, geometry: SeasonalLoopGeometry) {
    const selectedIndex = episodes.findIndex((episode) => episode.episodeId === selectedEpisodeId);
    const registeredIndexes = getSeasonalTogglePoolIndexes(state, episodes.length, geometry);
    const rubberY = Number(viewport.dataset.storySeasonalScrollRubberY ?? "0");
    const tabStopIndex = registeredIndexes.includes(selectedIndex) &&
        isSeasonalToggleCenterVisible(state, selectedIndex, rubberY, geometry)
        ? selectedIndex
        : -1;
    viewport.dataset.storySeasonalTabStop =
        tabStopIndex >= 0 ? String(tabStopIndex) : "none";
}
function getRubberDelta(overStretching: number, viewSize: number) {
    if (viewSize <= 0 || overStretching === 0) {
        return 0;
    }
    return ((1 - 1 / ((Math.abs(overStretching) * 0.55) / viewSize + 1)) *
        viewSize *
        Math.sign(overStretching));
}
type ClientTmpSlotWeight = "regular" | "bold";
const CLIENT_TMP_HANGUL_ADVANCE = 82.796875 / 90;
const CLIENT_TMP_SPACE_ADVANCE = 20.25 / 90;
function measureClientTmpSlotText(text: string, fontSize: number, rectWidth: number, weight: ClientTmpSlotWeight) {
    if (!/^[\uac00-\ud7a3]+(?: [\uac00-\ud7a3]+)*$/.test(text)) {
        return null;
    }
    const tracking = (weight === "bold" ? -3 : -10) * (fontSize / 100);
    const measure = (value: string) => {
        const characters = Array.from(value);
        const advances = characters.reduce((total, character) => total +
            (character === " "
                ? CLIENT_TMP_SPACE_ADVANCE
                : CLIENT_TMP_HANGUL_ADVANCE) *
                fontSize, 0);
        return advances + Math.max(0, characters.length - 1) * tracking;
    };
    const lines: string[] = [];
    let currentLine = "";
    for (const word of text.split(" ")) {
        const candidate = currentLine ? `${currentLine} ${word}` : word;
        if (measure(candidate) <= rectWidth + 0.0001) {
            currentLine = candidate;
            continue;
        }
        if (currentLine) {
            lines.push(currentLine);
            currentLine = "";
        }
        if (measure(word) <= rectWidth + 0.0001) {
            currentLine = word;
            continue;
        }
        // TMP falls back to character wrapping only when a single Korean word is
        // wider than its RectTransform. None of the ten client titles reach it,
        // but keep the same fallback inside this narrowly scoped renderer.
        for (const character of Array.from(word)) {
            const fragment = `${currentLine}${character}`;
            if (currentLine && measure(fragment) > rectWidth + 0.0001) {
                lines.push(currentLine);
                currentLine = character;
            }
            else {
                currentLine = fragment;
            }
        }
    }
    if (currentLine) {
        lines.push(currentLine);
    }
    const lineWidths = lines.map(measure);
    return {
        lineCount: Math.max(1, lines.length),
        lineWidths,
        overflows: lineWidths.some((width) => width > rectWidth + 0.0001),
    };
}
function quantizeClientTmpFontSize(value: number) {
    return Math.fround(Math.floor(Math.fround(Math.fround(value * 20) + 0.5)) / 20);
}
function SeasonalAutoSizeText({ as, children, clientTmpSlot = false, className, minSize, maxSize, whiteSpace, }: {
    as: "span" | "p" | "h2";
    children: string;
    clientTmpSlot?: false | ClientTmpSlotWeight;
    className?: string;
    minSize: number;
    maxSize: number;
    whiteSpace: "normal" | "nowrap" | "pre-line";
}) {
    const textRef = useRef<HTMLElement | null>(null);
    useLayoutEffect(() => {
        const element = textRef.current;
        if (!element) {
            return;
        }
        let active = true;
        let frame = 0;
        const applyBestFit = () => {
            if (!active || !textRef.current) {
                return;
            }
            const target = textRef.current;
            const content = target.querySelector<HTMLElement>("[data-story-seasonal-auto-size-content]");
            if (!content) {
                return;
            }
            const countRenderedLines = () => {
                const range = document.createRange();
                range.selectNodeContents(content);
                const lineTops = new Set(Array.from(range.getClientRects())
                    .filter((rect) => rect.width > 0.01)
                    .map((rect) => rect.top.toFixed(2)));
                return Math.max(1, lineTops.size);
            };
            const fits = (fontSize: number) => {
                target.style.fontSize = `${fontSize}px`;
                const clientLayout = clientTmpSlot
                    ? measureClientTmpSlotText(children, fontSize, content.clientWidth, clientTmpSlot)
                    : null;
                const verticalFits = clientLayout
                    ? fontSize + (clientLayout.lineCount - 1) * fontSize * 1.2 <=
                        target.clientHeight + 0.0001
                    : content.scrollHeight <= target.clientHeight + 1;
                return ((clientLayout
                    ? !clientLayout.overflows
                    : content.scrollWidth <= content.clientWidth + 0.5) &&
                    verticalFits);
            };
            let best = minSize;
            if (clientTmpSlot) {
                let minimum = Math.fround(minSize);
                let maximum = Math.fround(maxSize);
                let current = Math.fround(maxSize);
                for (let index = 0; index < 100; index += 1) {
                    const currentFits = fits(current);
                    if (!currentFits) {
                        maximum = current;
                        if (current > minSize && index < 99) {
                            const delta = Math.max(Math.fround((current - minimum) / 2), 0.05);
                            current = Math.max(minSize, quantizeClientTmpFontSize(Math.fround(current - delta)));
                            continue;
                        }
                        break;
                    }
                    best = current;
                    const range = Math.fround(maximum - minimum);
                    if (range > 0.051 && current < maxSize && index < 99) {
                        minimum = current;
                        const delta = Math.max(Math.fround((maximum - current) / 2), 0.05);
                        current = Math.min(maxSize, quantizeClientTmpFontSize(Math.fround(current + delta)));
                        continue;
                    }
                    break;
                }
                target.style.fontSize = `${best.toFixed(2)}px`;
                target.dataset.storySeasonalAutoFontSize = best.toFixed(2);
                const finalLayout = measureClientTmpSlotText(children, best, content.clientWidth, clientTmpSlot);
                target.dataset.storySeasonalAutoLineCount = String(finalLayout?.lineCount ?? countRenderedLines());
                return;
            }
            if (fits(maxSize)) {
                best = maxSize;
            }
            else {
                let lower = minSize;
                let upper = maxSize;
                for (let index = 0; index < 12; index += 1) {
                    const candidate = (lower + upper) / 2;
                    if (fits(candidate)) {
                        best = candidate;
                        lower = candidate;
                    }
                    else {
                        upper = candidate;
                    }
                }
            }
            // Do not round a just-fitting value upward across a wrap boundary.
            const safeBest = Math.floor(best * 1000) / 1000;
            target.style.fontSize = `${safeBest.toFixed(3)}px`;
            target.dataset.storySeasonalAutoFontSize = safeBest.toFixed(3);
        };
        frame = window.requestAnimationFrame(applyBestFit);
        void document.fonts?.ready.then(() => applyBestFit());
        return () => {
            active = false;
            window.cancelAnimationFrame(frame);
        };
    }, [children, clientTmpSlot, maxSize, minSize, whiteSpace]);
    const commonProps = {
        className,
        "data-story-seasonal-auto-size": `${minSize}-${maxSize}`,
        "data-story-seasonal-auto-white-space": whiteSpace,
        "data-story-seasonal-auto-client-slot": clientTmpSlot
            ? `TMP-3.0.7:0.05:${clientTmpSlot}`
            : undefined,
        "data-story-seasonal-auto-line-breaking": clientTmpSlot
            ? "modern-hangul-keep-all"
            : undefined,
        style: {
            overflowWrap: "normal",
            textOverflow: "clip",
            whiteSpace,
            wordBreak: clientTmpSlot ? "keep-all" : "normal",
        } as CSSProperties,
    };
    const setRef = (element: HTMLElement | null) => {
        textRef.current = element;
    };
    const content = (<span className={styles.autoSizeContent} data-story-seasonal-auto-size-content>
      {children}
    </span>);
    if (as === "h2") {
        return <h2 ref={setRef} {...commonProps}>{content}</h2>;
    }
    if (as === "p") {
        return <p ref={setRef} {...commonProps}>{content}</p>;
    }
    return <span ref={setRef} {...commonProps}>{content}</span>;
}
function smoothRubber(current: number, currentVelocity: number, deltaTime: number) {
    const omega = 2 / ELASTICITY;
    const x = omega * deltaTime;
    const exponential = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
    const temporary = (currentVelocity + omega * current) * deltaTime;
    return {
        value: (current + temporary) * exponential,
        velocity: (currentVelocity - omega * temporary) * exponential,
    };
}
function useVerticalElasticScroll({ enabled, map067Enabled, initialPosition, initialScrollTop, initialRubberY, initialEndInset = 0, kind, onRubberChange, }: {
    enabled: boolean;
    map067Enabled: boolean;
    initialPosition: "start" | "end";
    initialScrollTop?: number;
    initialRubberY?: number;
    initialEndInset?: number;
    kind: "episodes" | "related";
    onRubberChange?: (rubber: number) => void;
}) {
    const isMap067Target = map067Enabled && kind === "episodes";
    const viewportRef = useRef<HTMLDivElement>(null);
    const dormantMap067ViewportRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<VerticalDragState | null>(null);
    const motionFrameRef = useRef<number | null>(null);
    const rubberRef = useRef(0);
    const rubberVelocityRef = useRef(0);
    const velocityRef = useRef(0);
    const suppressClickRef = useRef(false);
    const suppressClickResetTimerRef = useRef<number | null>(null);
    const setRubber = useCallback((viewport: HTMLElement, rubber: number) => {
        rubberRef.current = rubber;
        viewport.style.setProperty("--story-seasonal-rubber-y", `${rubber}px`);
        viewport.dataset.storySeasonalScrollRubberY = rubber.toFixed(3);
        onRubberChange?.(rubber);
    }, [onRubberChange]);
    const cancelMotion = useCallback(() => {
        if (motionFrameRef.current !== null) {
            window.cancelAnimationFrame(motionFrameRef.current);
            motionFrameRef.current = null;
        }
    }, []);
    const stopMotion = useCallback((viewport: HTMLElement | null = viewportRef.current) => {
        cancelMotion();
        velocityRef.current = 0;
        rubberVelocityRef.current = 0;
        if (viewport) {
            viewport.dataset.storySeasonalScrollMotion = "idle";
            viewport.dataset.storyUnityScrollrectVelocity = "0.000";
            setRubber(viewport, 0);
        }
        else {
            rubberRef.current = 0;
        }
    }, [cancelMotion, setRubber]);
    const startReleaseMotion = useCallback((viewport: HTMLElement, initialVelocity: number) => {
        cancelMotion();
        if (isMap067Target) {
            velocityRef.current = initialVelocity;
            let lastTime = performance.now();
            const update = (currentTime: number) => {
                const deltaTime = Math.max((currentTime - lastTime) / 1000, 0);
                lastTime = currentTime;
                const maxScrollTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
                const frame = getStoryUnityScrollRectReleaseFrame({
                    visualPosition: viewport.scrollTop - rubberRef.current,
                    maximum: maxScrollTop,
                    velocity: velocityRef.current,
                    deltaTime,
                    snapElasticVelocityBelowOne: false,
                });
                velocityRef.current = frame.velocity;
                viewport.dataset.storyUnityScrollrectVelocity = frame.velocity.toFixed(3);
                viewport.scrollTop = frame.scrollPosition;
                viewport.dataset.storySeasonalScrollMotion = frame.motion;
                viewport.dataset.storySeasonalScrollBoundaryFrame =
                    frame.motion === "inertia-boundary" ? "raw" : "none";
                if (frame.motion === "inertia-boundary") {
                    viewport.dataset.storyUnityScrollrectRawBoundaryObserved = "true";
                }
                setRubber(viewport, frame.rubber);
                if (frame.motion === "idle" ||
                    (frame.motion === "elastic" &&
                        Math.abs(frame.rubber) <= 0.01 &&
                        Math.abs(frame.velocity) <= 0.01)) {
                    stopMotion(viewport);
                    return;
                }
                motionFrameRef.current = window.requestAnimationFrame(update);
            };
            motionFrameRef.current = window.requestAnimationFrame(update);
            return;
        }
        let velocity = initialVelocity;
        let lastTime = performance.now();
        rubberVelocityRef.current = -initialVelocity;
        const update = (currentTime: number) => {
            const deltaTime = Math.min(Math.max((currentTime - lastTime) / 1000, 0), 0.05);
            lastTime = currentTime;
            let rubber = rubberRef.current;
            if (Math.abs(rubber) > 0.01) {
                viewport.dataset.storySeasonalScrollMotion = "elastic";
                const smoothed = smoothRubber(rubber, rubberVelocityRef.current, deltaTime);
                rubber = smoothed.value;
                rubberVelocityRef.current = smoothed.velocity;
                setRubber(viewport, rubber);
                if (Math.abs(rubber) <= 0.05 && Math.abs(smoothed.velocity) <= 1) {
                    stopMotion(viewport);
                    return;
                }
            }
            else {
                viewport.dataset.storySeasonalScrollMotion = "inertia";
                velocity *= Math.pow(DECELERATION_RATE, deltaTime);
                if (Math.abs(velocity) < 1) {
                    stopMotion(viewport);
                    return;
                }
                const maxScrollTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
                const desiredScrollTop = viewport.scrollTop + velocity * deltaTime;
                const clampedScrollTop = Math.min(maxScrollTop, Math.max(0, desiredScrollTop));
                viewport.scrollTop = clampedScrollTop;
                if (desiredScrollTop !== clampedScrollTop) {
                    rubber = getRubberDelta(Math.abs(desiredScrollTop - clampedScrollTop), viewport.clientHeight);
                    if (desiredScrollTop > maxScrollTop) {
                        rubber *= -1;
                    }
                    rubberVelocityRef.current = -velocity;
                    velocity = 0;
                    setRubber(viewport, rubber);
                }
            }
            motionFrameRef.current = window.requestAnimationFrame(update);
        };
        motionFrameRef.current = window.requestAnimationFrame(update);
    }, [cancelMotion, isMap067Target, setRubber, stopMotion, velocityRef]);
    const handleWheel = useCallback((event: WheelEvent) => {
        event.preventDefault();
        cancelMotion();
        velocityRef.current = 0;
        rubberVelocityRef.current = 0;
        const viewport = event.currentTarget as HTMLElement;
        const useHorizontalAxis = Math.abs(event.deltaX) > Math.abs(event.deltaY);
        const delta = useHorizontalAxis ? event.deltaX : event.deltaY;
        const unityScrollDelta = event.deltaMode === WheelEvent.DOM_DELTA_PIXEL
            ? delta / BROWSER_PIXEL_TICK
            : delta;
        const currentVisualPosition = viewport.scrollTop - rubberRef.current;
        const desiredScrollTop = currentVisualPosition + unityScrollDelta * WHEEL_MULTIPLIER;
        const maxScrollTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
        const clampedScrollTop = Math.min(maxScrollTop, Math.max(0, desiredScrollTop));
        let rubber = 0;
        if (desiredScrollTop < 0) {
            rubber =
                getRubberDelta(-desiredScrollTop, viewport.clientHeight) *
                    WHEEL_RUBBER_SCALE;
        }
        else if (desiredScrollTop > maxScrollTop) {
            rubber =
                -getRubberDelta(desiredScrollTop - maxScrollTop, viewport.clientHeight) * WHEEL_RUBBER_SCALE;
        }
        viewport.scrollTop = clampedScrollTop;
        viewport.dataset.storySeasonalScrollMotion = "wheel";
        viewport.dataset.storySeasonalScrollWheelAxis = useHorizontalAxis
            ? "horizontal"
            : "vertical";
        viewport.dataset.storySeasonalScrollWheelDelta =
            unityScrollDelta.toFixed(6);
        setRubber(viewport, rubber);
        if (Math.abs(rubber) > 0.01) {
            motionFrameRef.current = window.requestAnimationFrame(() => {
                motionFrameRef.current = null;
                startReleaseMotion(viewport, 0);
            });
        }
    }, [cancelMotion, setRubber, startReleaseMotion]);
    useLayoutEffect(() => {
        const viewport = viewportRef.current;
        if (!enabled || !viewport) {
            return;
        }
        const frame = window.requestAnimationFrame(() => {
            const maxScrollTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
            viewport.scrollTop = Number.isFinite(initialScrollTop)
                ? Math.min(maxScrollTop, Math.max(0, initialScrollTop ?? 0))
                : initialPosition === "end"
                    ? Math.max(0, maxScrollTop - initialEndInset)
                    : 0;
            const restoredRubberY = Number.isFinite(initialRubberY)
                ? Math.min(viewport.clientHeight, Math.max(-viewport.clientHeight, initialRubberY ?? 0))
                : 0;
            if (Math.abs(restoredRubberY) > 0.01) {
                setRubber(viewport, restoredRubberY);
                viewport.dataset.storySeasonalScrollMotion = "elastic";
                startReleaseMotion(viewport, 0);
            }
            else {
                stopMotion(viewport);
            }
        });
        return () => window.cancelAnimationFrame(frame);
    }, [
        enabled,
        initialEndInset,
        initialPosition,
        initialRubberY,
        initialScrollTop,
        setRubber,
        startReleaseMotion,
        stopMotion,
    ]);
    useEffect(() => {
        const viewport = viewportRef.current;
        if (!enabled || !viewport) {
            cancelMotion();
            dragRef.current = null;
            return;
        }
        viewport.addEventListener("wheel", handleWheel, { passive: false });
        return () => viewport.removeEventListener("wheel", handleWheel);
    }, [cancelMotion, enabled, handleWheel]);
    useEffect(() => () => {
        cancelMotion();
        if (suppressClickResetTimerRef.current !== null) {
            window.clearTimeout(suppressClickResetTimerRef.current);
        }
    }, [cancelMotion]);
    const onPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
        if (event.button !== 0 || !event.isPrimary) {
            return;
        }
        stopMotion(event.currentTarget);
        if (suppressClickResetTimerRef.current !== null) {
            window.clearTimeout(suppressClickResetTimerRef.current);
            suppressClickResetTimerRef.current = null;
        }
        suppressClickRef.current = false;
        dragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            startVisualPosition: event.currentTarget.scrollTop - rubberRef.current,
            lastVisualPosition: event.currentTarget.scrollTop - rubberRef.current,
            lastTime: event.timeStamp,
            velocity: 0,
            dragging: false,
        };
    }, [stopMotion]);
    const onPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) {
            return;
        }
        const deltaX = event.clientX - drag.startX;
        const deltaY = event.clientY - drag.startY;
        if (!drag.dragging && Math.hypot(deltaX, deltaY) < 10) {
            return;
        }
        if (!drag.dragging) {
            drag.dragging = true;
            suppressClickRef.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
        }
        event.preventDefault();
        const viewport = event.currentTarget;
        const desiredScrollTop = drag.startVisualPosition - deltaY;
        const maxScrollTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
        const clampedScrollTop = Math.min(maxScrollTop, Math.max(0, desiredScrollTop));
        let rubber = 0;
        if (desiredScrollTop < 0) {
            rubber = getRubberDelta(-desiredScrollTop, viewport.clientHeight);
        }
        else if (desiredScrollTop > maxScrollTop) {
            rubber = -getRubberDelta(desiredScrollTop - maxScrollTop, viewport.clientHeight);
        }
        viewport.scrollTop = clampedScrollTop;
        viewport.dataset.storySeasonalScrollMotion = "dragging";
        setRubber(viewport, rubber);
        const visualPosition = clampedScrollTop - rubber;
        const deltaTime = Math.max((event.timeStamp - drag.lastTime) / 1000, 1 / 240);
        const instantaneousVelocity = (visualPosition - drag.lastVisualPosition) / deltaTime;
        drag.velocity +=
            (instantaneousVelocity - drag.velocity) * Math.min(deltaTime * 10, 1);
        drag.lastVisualPosition = visualPosition;
        drag.lastTime = event.timeStamp;
    }, [setRubber]);
    const finishPointer = useCallback((event: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) {
            return;
        }
        dragRef.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
        if (cancelled) {
            suppressClickRef.current = false;
            stopMotion(event.currentTarget);
        }
        else {
            startReleaseMotion(event.currentTarget, drag.velocity);
            if (drag.dragging) {
                // pointerup 직후 합성 click은 capture에서 막되, 브라우저가 click을
                // 만들지 않은 drag도 다음 정상 클릭까지 stale flag를 남기지 않는다.
                suppressClickResetTimerRef.current = window.setTimeout(() => {
                    suppressClickRef.current = false;
                    suppressClickResetTimerRef.current = null;
                }, 0);
            }
        }
    }, [startReleaseMotion, stopMotion]);
    const getUnityVisualPosition = useCallback((viewport: HTMLDivElement) => viewport.scrollTop - rubberRef.current, []);
    const getUnityVisualUnitsPerScreenPixel = useCallback((viewport: HTMLDivElement) => {
        const renderedHeight = viewport.getBoundingClientRect().height;
        return renderedHeight > 0 && viewport.clientHeight > 0
            ? viewport.clientHeight / renderedHeight
            : 1;
    }, []);
    const applyUnityDragPosition = useCallback((viewport: HTMLDivElement, desiredVisualPosition: number) => {
        const maximum = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
        const frame = getStoryUnityScrollRectDragFrame(desiredVisualPosition, maximum, viewport.clientHeight);
        viewport.scrollTop = frame.scrollPosition;
        viewport.dataset.storySeasonalScrollMotion = "dragging";
        viewport.dataset.storySeasonalScrollPointerScale = (1 / getUnityVisualUnitsPerScreenPixel(viewport)).toFixed(6);
        viewport.dataset.storySeasonalScrollBoundaryFrame = "none";
        setRubber(viewport, frame.rubber);
    }, [getUnityVisualUnitsPerScreenPixel, setRubber]);
    const handleUnityDragStart = useCallback((viewport: HTMLDivElement) => {
        viewport.dataset.storySeasonalScrollMotion = "dragging";
        viewport.dataset.storySeasonalScrollBoundaryFrame = "none";
    }, []);
    const handleUnityDragEnd = useCallback((viewport: HTMLDivElement, velocity: number) => {
        startReleaseMotion(viewport, velocity);
    }, [startReleaseMotion]);
    const unityPointer = useStoryUnityScrollRectPointer({
        enabled: enabled && isMap067Target,
        axis: "vertical",
        viewportRef: isMap067Target ? viewportRef : dormantMap067ViewportRef,
        velocityRef,
        getVisualPosition: getUnityVisualPosition,
        getVisualUnitsPerScreenPixel: getUnityVisualUnitsPerScreenPixel,
        applyDragPosition: applyUnityDragPosition,
        cancelReleaseMotion: cancelMotion,
        onDragStart: handleUnityDragStart,
        onDragEnd: handleUnityDragEnd,
    });
    const legacyPointerProps = {
        onPointerDown,
        onPointerMove,
        onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => finishPointer(event, false),
        onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => finishPointer(event, true),
        onClickCapture: (event: ReactMouseEvent<HTMLDivElement>) => {
            if (!suppressClickRef.current) {
                return;
            }
            suppressClickRef.current = false;
            if (suppressClickResetTimerRef.current !== null) {
                window.clearTimeout(suppressClickResetTimerRef.current);
                suppressClickResetTimerRef.current = null;
            }
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.dataset.storySeasonalScrollClick =
                "drag-suppressed";
        },
        onDragStart: (event: ReactDragEvent<HTMLDivElement>) => event.preventDefault(),
    };
    return {
        viewportRef,
        pointerProps: isMap067Target
            ? unityPointer.pointerProps
            : legacyPointerProps,
        markerProps: {
            ...(isMap067Target ? unityPointer.markerProps : {}),
            "data-story-seasonal-scrollrect": kind,
            "data-story-seasonal-scroll-axis": "vertical",
            "data-story-seasonal-scroll-movement": "Elastic",
            "data-story-seasonal-scroll-elasticity": String(ELASTICITY),
            "data-story-seasonal-scroll-inertia": "true",
            "data-story-seasonal-scroll-deceleration": String(DECELERATION_RATE),
            "data-story-seasonal-scroll-sensitivity": "1",
            "data-story-seasonal-scrollbar": "none",
            "data-story-seasonal-scroll-motion": "idle",
            "data-story-seasonal-scroll-rubber-y": "0.000",
            ...(isMap067Target
                ? {
                    "data-story-seasonal-global-scroll-drag": "STV-MAP-067",
                    "data-story-seasonal-global-scroll-scope": "SafeArea/EP_LIST-only",
                    "data-story-seasonal-global-scroll-related": "excluded",
                    "data-story-seasonal-scroll-boundary-frame": "none",
                    "data-story-seasonal-scroll-pointer-scale": "pending",
                }
                : {}),
        },
    };
}
export default function StorySeasonalViewer({ episodes, initialEpisodeId, initialState, relatedStories, onClose, onOpenReader, }: {
    episodes: StorylineSeasonalEpisode[];
    initialEpisodeId?: number;
    initialState?: StorySeasonalReturnState | null;
    relatedStories: RelatedStory[];
    onClose: (episodeId: number) => void;
    onOpenReader: (returnState: StorySeasonalReturnState) => void;
}) {
    const panelRef = useRef<HTMLDivElement>(null);
    const enterRef = useRef<HTMLAnchorElement>(null);
    const introSoundStartedRef = useRef(false);
    const transitionTimerRef = useRef<number | null>(null);
    const transitionFinishTimerRef = useRef<number | null>(null);
    const poolSlotTransitionTimerRefs = useRef(new Map<number, number>());
    const poolBindingSnapshotRef = useRef<SeasonalPoolBinding[] | null>(null);
    const slotTransitionRunRef = useRef(0);
    const [viewerLayout, setViewerLayout] = useState<SeasonalCanvasLayout>({
        scale: 1,
        logicalWidth: REFERENCE_WIDTH,
        logicalHeight: REFERENCE_HEIGHT,
    });
    const [transitionPhase, setTransitionPhase] = useState<"opening" | "idle" | "out" | "in">("opening");
    const [isRelatedOpen, setIsRelatedOpen] = useState(false);
    const [showHotkeys, setShowHotkeys] = useState(false);
    const [episodeHotkeyRootTop, setEpisodeHotkeyRootTop] = useState(EPISODE_HOTKEY_REFERENCE_TOP);
    const [episodeListRubberY, setEpisodeListRubberY] = useState(initialState?.episodeScrollRubberY ?? 0);
    const [poolSlotTransitions, setPoolSlotTransitions] = useState<Partial<Record<number, SeasonalSlotTransition>>>({});
    const [activeThemeState, setActiveThemeState] = useState(() => getActiveStoryThemeState());
    const defaultEpisode = episodes.find((episode) => episode.episodeId === initialEpisodeId) ??
        episodes.at(-1) ??
        null;
    const [selectedSlotEpisodeId, setSelectedSlotEpisodeId] = useState(defaultEpisode?.episodeId ?? 0);
    const [displayedEpisodeId, setDisplayedEpisodeId] = useState(defaultEpisode?.episodeId ?? 0);
    const selectedEpisode = episodes.find((episode) => episode.episodeId === displayedEpisodeId) ??
        defaultEpisode;
    const relatedStoryById = new Map(relatedStories.map((story) => [story.episodeId, story]));
    const selectedRelatedStories = selectedEpisode
        ? [...new Set(selectedEpisode.connectEpisodeIds)]
            .sort((left, right) => left - right)
            .map((episodeId) => relatedStoryById.get(episodeId))
            .filter((story): story is RelatedStory => Boolean(story))
        : [];
    const episodeLoopGeometry = useMemo(() => getSeasonalLoopGeometry(viewerLayout.logicalHeight, episodes.length), [episodes.length, viewerLayout.logicalHeight]);
    const initialLoopIsFull = initialState?.episodeLoopActiveSlots === 4;
    const initialLoopActiveSlots = initialLoopIsFull
        ? episodeLoopGeometry.fullActiveSlots
        : episodeLoopGeometry.initialActiveSlots;
    const initialLoopStartIndex = initialLoopIsFull
        ? Math.min(episodeLoopGeometry.maxStartIndex, Math.max(0, initialState?.episodeLoopStartIndex ??
            episodeLoopGeometry.maxStartIndex))
        : episodeLoopGeometry.initialStartIndex;
    const episodeLoopHotkeyStateRef = useRef<SeasonalLoopHotkeyState>({
        startIndex: initialLoopStartIndex,
        activeSlots: initialLoopActiveSlots,
        anchoredY: initialState?.episodeLoopAnchoredY ?? 0,
        lastScrollTop: Number.NaN,
    });
    const previousEpisodeLoopGeometryRef = useRef(episodeLoopGeometry);
    const [episodeLoopRenderState, setEpisodeLoopRenderState] = useState<SeasonalLoopHotkeyState>({
        startIndex: initialLoopStartIndex,
        activeSlots: initialLoopActiveSlots,
        anchoredY: initialState?.episodeLoopAnchoredY ?? 0,
        lastScrollTop: initialState?.episodeScrollTop ?? 0,
    });
    const episodePoolIndexes = getSeasonalTogglePoolIndexes(episodeLoopRenderState, episodes.length, episodeLoopGeometry);
    const { viewportRef: episodeListViewportRef, pointerProps: episodeListPointerProps, markerProps: episodeListMarkerProps, } = useVerticalElasticScroll({
        enabled: true,
        map067Enabled: true,
        initialPosition: "end",
        initialScrollTop: initialState?.episodeScrollTop,
        initialRubberY: initialState?.episodeScrollRubberY,
        initialEndInset: episodeLoopGeometry.initialBound,
        kind: "episodes",
        onRubberChange: setEpisodeListRubberY,
    });
    const { viewportRef: relatedViewportRef, pointerProps: relatedPointerProps, markerProps: relatedMarkerProps, } = useVerticalElasticScroll({
        enabled: isRelatedOpen,
        map067Enabled: false,
        initialPosition: "start",
        kind: "related",
    });
    const reconcilePoolSlotBindings = useCallback((registeredIndexes: Array<number | null>, selectedEpisodeId: number) => {
        const nextBindings = registeredIndexes.map((episodeIndex) => {
            const episodeId = episodeIndex === null
                ? null
                : (episodes[episodeIndex]?.episodeId ?? null);
            return {
                episodeId,
                selected: episodeId === selectedEpisodeId,
            };
        });
        const previousBindings = poolBindingSnapshotRef.current;
        poolBindingSnapshotRef.current = nextBindings;
        if (!previousBindings) {
            return [] as Array<{
                poolIndex: number;
                mode: SeasonalPoolRebindMode;
            }>;
        }
        const rebinds: Array<{
            poolIndex: number;
            mode: SeasonalPoolRebindMode;
        }> = [];
        for (let poolIndex = 0; poolIndex < nextBindings.length; poolIndex += 1) {
            const previousBinding = previousBindings[poolIndex];
            const nextBinding = nextBindings[poolIndex];
            if (!previousBinding) {
                continue;
            }
            const mode = getSeasonalPoolRebindMode(previousBinding, nextBinding);
            if (mode !== "unchanged") {
                rebinds.push({ poolIndex, mode });
            }
        }
        const resetPoolIndexes = rebinds
            .filter(({ mode }) => mode === "reset-idle")
            .map(({ poolIndex }) => poolIndex);
        for (const poolIndex of resetPoolIndexes) {
            const timer = poolSlotTransitionTimerRefs.current.get(poolIndex);
            if (timer !== undefined) {
                window.clearTimeout(timer);
                poolSlotTransitionTimerRefs.current.delete(poolIndex);
            }
        }
        if (resetPoolIndexes.length > 0) {
            setPoolSlotTransitions((current) => {
                const next = { ...current };
                let changed = false;
                for (const poolIndex of resetPoolIndexes) {
                    if (next[poolIndex] !== undefined) {
                        delete next[poolIndex];
                        changed = true;
                    }
                }
                return changed ? next : current;
            });
        }
        return rebinds;
    }, [episodes]);
    const selectEpisode = useCallback((episodeId: number) => {
        if (episodeId === selectedSlotEpisodeId || transitionPhase !== "idle") {
            return;
        }
        const nextEpisode = episodes.find((episode) => episode.episodeId === episodeId);
        if (!nextEpisode) {
            return;
        }
        const currentEpisodeIndex = episodes.findIndex((episode) => episode.episodeId === selectedSlotEpisodeId);
        const nextEpisodeIndex = episodes.findIndex((episode) => episode.episodeId === nextEpisode.episodeId);
        const registeredIndexes = getSeasonalTogglePoolIndexes(episodeLoopHotkeyStateRef.current, episodes.length, episodeLoopGeometry);
        const currentPoolIndex = registeredIndexes.indexOf(currentEpisodeIndex);
        const nextPoolIndex = registeredIndexes.indexOf(nextEpisodeIndex);
        if (nextPoolIndex < 0) {
            return;
        }
        // NKCPopupEpisodeViewer.OnEpSlotSelect changes every ToggleGroup slot
        // immediately, then starts the global FadeOut. Each physical pool slot
        // owns its Animator independently; SetData waits at black.
        slotTransitionRunRef.current += 1;
        const transitionRun = slotTransitionRunRef.current;
        const transitionEntries: Array<{
            poolIndex: number;
            motion: SeasonalSlotTransition["motion"];
            duration: number;
        }> = [];
        if (currentPoolIndex >= 0) {
            transitionEntries.push({
                poolIndex: currentPoolIndex,
                motion: "ON_TO_OFF",
                duration: 500,
            });
        }
        transitionEntries.push({
            poolIndex: nextPoolIndex,
            motion: "OFF_TO_ON",
            duration: 333.333,
        });
        setPoolSlotTransitions((current) => {
            const next = { ...current };
            for (const entry of transitionEntries) {
                next[entry.poolIndex] = {
                    motion: entry.motion,
                    run: transitionRun,
                };
            }
            return next;
        });
        for (const entry of transitionEntries) {
            const previousTimer = poolSlotTransitionTimerRefs.current.get(entry.poolIndex);
            if (previousTimer !== undefined) {
                window.clearTimeout(previousTimer);
            }
            const timer = window.setTimeout(() => {
                setPoolSlotTransitions((current) => {
                    if (current[entry.poolIndex]?.run !== transitionRun) {
                        return current;
                    }
                    const next = { ...current };
                    delete next[entry.poolIndex];
                    return next;
                });
                poolSlotTransitionTimerRefs.current.delete(entry.poolIndex);
            }, entry.duration);
            poolSlotTransitionTimerRefs.current.set(entry.poolIndex, timer);
        }
        reconcilePoolSlotBindings(registeredIndexes, nextEpisode.episodeId);
        setSelectedSlotEpisodeId(nextEpisode.episodeId);
        setTransitionPhase("out");
        if (transitionTimerRef.current !== null) {
            window.clearTimeout(transitionTimerRef.current);
        }
        transitionTimerRef.current = window.setTimeout(() => {
            setDisplayedEpisodeId(nextEpisode.episodeId);
            setIsRelatedOpen(false);
            if (nextEpisode.bgmPath) {
                // The client passes force=false: identical tracks keep their time,
                // and an episode without BGM only hides the label.
                playStoryTheme(nextEpisode.bgmPath);
            }
            setActiveThemeState(getActiveStoryThemeState());
            setTransitionPhase("in");
            transitionFinishTimerRef.current = window.setTimeout(() => {
                setTransitionPhase("idle");
                transitionFinishTimerRef.current = null;
            }, SELECTION_FADE_MS);
            transitionTimerRef.current = null;
        }, SELECTION_FADE_MS);
    }, [
        episodes,
        episodeLoopGeometry,
        reconcilePoolSlotBindings,
        selectedSlotEpisodeId,
        transitionPhase,
    ]);
    useLayoutEffect(() => {
        const panel = panelRef.current;
        if (!panel) {
            return;
        }
        const updateScale = () => {
            const rect = panel.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) {
                return;
            }
            const nextLayout = getSeasonalCanvasLayout(rect.width, rect.height);
            setViewerLayout((current) => Math.abs(current.scale - nextLayout.scale) < 0.000001 &&
                Math.abs(current.logicalWidth - nextLayout.logicalWidth) < 0.000001 &&
                Math.abs(current.logicalHeight - nextLayout.logicalHeight) < 0.000001
                ? current
                : nextLayout);
        };
        updateScale();
        const resizeObserver = new ResizeObserver(updateScale);
        resizeObserver.observe(panel);
        return () => resizeObserver.disconnect();
    }, []);
    useLayoutEffect(() => {
        const previousGeometry = previousEpisodeLoopGeometryRef.current;
        if (previousGeometry.viewportHeight === episodeLoopGeometry.viewportHeight &&
            previousGeometry.poolSize === episodeLoopGeometry.poolSize &&
            previousGeometry.initialActiveSlots ===
                episodeLoopGeometry.initialActiveSlots) {
            return;
        }
        const state = episodeLoopHotkeyStateRef.current;
        const wasPreviousInitialState = state.activeSlots === previousGeometry.initialActiveSlots &&
            state.startIndex === previousGeometry.initialStartIndex;
        const alreadyMatchesNextInitialState = state.activeSlots === episodeLoopGeometry.initialActiveSlots &&
            state.startIndex === episodeLoopGeometry.initialStartIndex;
        const useInitialState = wasPreviousInitialState || alreadyMatchesNextInitialState;
        const nextActiveSlots = useInitialState
            ? episodeLoopGeometry.initialActiveSlots
            : episodeLoopGeometry.fullActiveSlots;
        const nextBound = useInitialState
            ? episodeLoopGeometry.initialBound
            : episodeLoopGeometry.fullBound;
        state.startIndex = useInitialState
            ? episodeLoopGeometry.initialStartIndex
            : Math.min(episodeLoopGeometry.maxStartIndex, Math.max(0, state.startIndex));
        state.activeSlots = nextActiveSlots;
        state.anchoredY = Math.min(nextBound, Math.max(-nextBound, state.anchoredY));
        const viewport = episodeListViewportRef.current;
        const maxScrollTop = viewport
            ? Math.max(0, viewport.scrollHeight - viewport.clientHeight)
            : 0;
        const renderScrollTop = Number.isFinite(initialState?.episodeScrollTop)
            ? Math.min(maxScrollTop, Math.max(0, initialState?.episodeScrollTop ?? 0))
            : Math.max(0, maxScrollTop - episodeLoopGeometry.initialBound);
        if (viewport) {
            viewport.scrollTop = renderScrollTop;
        }
        state.lastScrollTop = Number.NaN;
        previousEpisodeLoopGeometryRef.current = episodeLoopGeometry;
        if (previousGeometry.poolSize !== episodeLoopGeometry.poolSize) {
            for (const timer of poolSlotTransitionTimerRefs.current.values()) {
                window.clearTimeout(timer);
            }
            poolSlotTransitionTimerRefs.current.clear();
            poolBindingSnapshotRef.current = null;
            setPoolSlotTransitions({});
        }
        setEpisodeHotkeyRootTop(getEpisodeHotkeyRootTop(episodeListViewportRef.current, state.anchoredY, episodeLoopGeometry));
        setEpisodeLoopRenderState({ ...state, lastScrollTop: renderScrollTop });
    }, [
        episodeListViewportRef,
        episodeLoopGeometry,
        initialState?.episodeScrollTop,
    ]);
    useEffect(() => {
        if (introSoundStartedRef.current) {
            return;
        }
        introSoundStartedRef.current = true;
        const audio = createStoryAudio(SEASONAL_INTRO_SFX_URL);
        audio.volume = getStoryClientAudioVolume("sfx");
        audio.loop = false;
        audio.currentTime = 0;
        playingSeasonalIntroAudio.add(audio);
        const finish = (state: "ended" | "error" | "blocked") => {
            playingSeasonalIntroAudio.delete(audio);
            if (panelRef.current) {
                panelRef.current.dataset.storySeasonalIntroSfxState = state;
            }
        };
        audio.addEventListener("ended", () => finish("ended"), { once: true });
        audio.addEventListener("error", () => finish("error"), { once: true });
        if (panelRef.current) {
            panelRef.current.dataset.storySeasonalIntroSfxState = "starting";
            panelRef.current.dataset.storySeasonalIntroSfxVolume =
                audio.volume.toFixed(9);
        }
        void audio.play().then(() => {
            if (panelRef.current) {
                panelRef.current.dataset.storySeasonalIntroSfxState = "playing";
            }
        }, () => finish("blocked"));
        // NKCComSoundPlayer.StopOnDisable=false: Close/Enter로 뷰어가 사라져도
        // 시작된 인트로 SFX는 멈추지 않고 2.249초 길이를 끝까지 재생한다.
    }, []);
    useEffect(() => {
        panelRef.current?.focus();
        let themeStateFrame: number | null = null;
        const slotTransitionTimers = poolSlotTransitionTimerRefs.current;
        transitionFinishTimerRef.current = window.setTimeout(() => {
            setTransitionPhase("idle");
            transitionFinishTimerRef.current = null;
        }, SELECTION_FADE_MS);
        if (defaultEpisode?.bgmPath) {
            playStoryTheme(defaultEpisode.bgmPath);
            themeStateFrame = window.requestAnimationFrame(() => {
                setActiveThemeState(getActiveStoryThemeState());
            });
        }
        return () => {
            if (transitionTimerRef.current !== null) {
                window.clearTimeout(transitionTimerRef.current);
            }
            if (transitionFinishTimerRef.current !== null) {
                window.clearTimeout(transitionFinishTimerRef.current);
            }
            for (const timer of slotTransitionTimers.values()) {
                window.clearTimeout(timer);
            }
            slotTransitionTimers.clear();
            if (themeStateFrame !== null) {
                window.cancelAnimationFrame(themeStateFrame);
            }
        };
    }, [defaultEpisode?.bgmPath]);
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target;
            if (target instanceof HTMLElement &&
                (target.isContentEditable ||
                    target.matches("input, select, textarea, [role='textbox']"))) {
                return;
            }
            if (event.code === "AltLeft") {
                if (!event.repeat) {
                    setEpisodeHotkeyRootTop(getEpisodeHotkeyRootTop(episodeListViewportRef.current, episodeLoopHotkeyStateRef.current.anchoredY, episodeLoopGeometry));
                }
                setShowHotkeys(true);
                return;
            }
            if (event.key === "Tab") {
                const panel = panelRef.current;
                const focusable = panel
                    ? Array.from(panel.querySelectorAll<HTMLElement>('button:not([disabled]):not([tabindex="-1"]), a[href]:not([tabindex="-1"])'))
                    : [];
                if (focusable.length > 0) {
                    const activeIndex = focusable.indexOf(document.activeElement as HTMLElement);
                    const nextIndex = event.shiftKey
                        ? activeIndex <= 0
                            ? focusable.length - 1
                            : activeIndex - 1
                        : activeIndex < 0 || activeIndex === focusable.length - 1
                            ? 0
                            : activeIndex + 1;
                    event.preventDefault();
                    focusable[nextIndex].focus();
                }
                return;
            }
            if (event.repeat) {
                return;
            }
            if (event.key === "Escape") {
                event.preventDefault();
                if (transitionPhase === "idle") {
                    onClose(selectedSlotEpisodeId);
                }
                return;
            }
            if (CONFIRM_HOTKEY_CODES.has(event.code) &&
                transitionPhase === "idle") {
                event.preventDefault();
                enterRef.current?.click();
                return;
            }
            const isPrevious = event.code === "ArrowUp" ||
                event.code === "KeyW" ||
                event.code === "Numpad8" ||
                event.key === "ArrowUp" ||
                event.key.toLowerCase() === "w";
            const isNext = event.code === "ArrowDown" ||
                event.code === "KeyS" ||
                event.code === "Numpad2" ||
                event.key === "ArrowDown" ||
                event.key.toLowerCase() === "s";
            if (!isPrevious && !isNext) {
                return;
            }
            event.preventDefault();
            const currentEpisodeIndex = episodes.findIndex((episode) => episode.episodeId === selectedSlotEpisodeId);
            const viewport = episodeListViewportRef.current;
            if (currentEpisodeIndex < 0 || episodes.length === 0 || !viewport) {
                return;
            }
            // NKCUIComToggleGroup에는 전체 데이터가 아니라 현재 viewport 높이에
            // 맞춰 LoopScrollRect가 만든 pool Toggle만 생성 순서대로 등록된다. sibling recycle은 이
            // 등록 순서를 바꾸지 않으므로 전체 목록 wrap/자동 스크롤을 하지 않는다.
            const loopState = episodeLoopHotkeyStateRef.current;
            const registeredIndexes = getSeasonalTogglePoolIndexes(loopState, episodes.length, episodeLoopGeometry);
            const currentPoolIndex = registeredIndexes.indexOf(currentEpisodeIndex);
            if (currentPoolIndex < 0) {
                viewport.dataset.storySeasonalToggleMove = "no-selected-pool";
                return;
            }
            const direction = isPrevious ? -1 : 1;
            const candidatePoolIndex = positiveModulo(currentPoolIndex + direction, registeredIndexes.length);
            const candidateEpisodeIndex = registeredIndexes[candidatePoolIndex];
            if (candidateEpisodeIndex === null) {
                viewport.dataset.storySeasonalToggleMove = "inactive-pool";
                return;
            }
            const rubberY = Number(viewport.dataset.storySeasonalScrollRubberY ?? "0");
            if (!isSeasonalToggleCenterVisible(loopState, candidateEpisodeIndex, rubberY, episodeLoopGeometry)) {
                viewport.dataset.storySeasonalToggleMove = "clipped-center";
                return;
            }
            viewport.dataset.storySeasonalToggleMove =
                `selected:${candidateEpisodeIndex}`;
            selectEpisode(episodes[candidateEpisodeIndex].episodeId);
        };
        const handleKeyUp = (event: KeyboardEvent) => {
            if (event.code === "AltLeft") {
                setShowHotkeys(false);
            }
        };
        const isEditableMouseTarget = (target: EventTarget | null) => target instanceof HTMLElement &&
            (target.isContentEditable ||
                target.matches("input, select, textarea, [role='textbox']"));
        const handleMouseDown = (event: MouseEvent) => {
            const target = event.target;
            if (!(target instanceof Element) ||
                !target.closest('[data-story-mouse3-cancel="STV-RDR-006"]')) {
                return;
            }
            const mouseCancelAction = getStoryMouseCancelAction(event.button, isEditableMouseTarget(target) ||
                isEditableMouseTarget(document.activeElement));
            if (mouseCancelAction === "ignore") {
                return;
            }
            event.preventDefault();
            if (mouseCancelAction === "cancel" && transitionPhase === "idle") {
                // STV-RDR-006: the seasonal viewer itself is the client stack top.
                // Related ON is content state, not an additional Back level.
                onClose(selectedSlotEpisodeId);
            }
        };
        const handleBlur = () => setShowHotkeys(false);
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        window.addEventListener("mousedown", handleMouseDown, true);
        window.addEventListener("blur", handleBlur);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
            window.removeEventListener("mousedown", handleMouseDown, true);
            window.removeEventListener("blur", handleBlur);
        };
    }, [
        episodeListViewportRef,
        episodeLoopGeometry,
        episodes,
        onClose,
        selectEpisode,
        selectedSlotEpisodeId,
        transitionPhase,
    ]);
    useEffect(() => {
        const viewport = episodeListViewportRef.current;
        if (!viewport) {
            return;
        }
        const syncVirtualLoopState = () => {
            const state = episodeLoopHotkeyStateRef.current;
            const currentScrollTop = viewport.scrollTop;
            if (!Number.isFinite(state.lastScrollTop)) {
                state.lastScrollTop = currentScrollTop;
            }
            else {
                state.anchoredY += currentScrollTop - state.lastScrollTop;
                state.lastScrollTop = currentScrollTop;
                if (episodeLoopGeometry.fullActiveSlots >
                    episodeLoopGeometry.initialActiveSlots &&
                    state.activeSlots === episodeLoopGeometry.initialActiveSlots &&
                    state.anchoredY < -episodeLoopGeometry.initialBound) {
                    state.startIndex = episodeLoopGeometry.maxStartIndex;
                    state.activeSlots = episodeLoopGeometry.fullActiveSlots;
                    // LoopBackItemToStart는 마지막 inactive pool을 처음 활성화할 때도
                    // preferredHeight 100 + spacing 50의 전체 GetSize를 더한다.
                    state.anchoredY += LOOP_CELL_LINE_SIZE;
                }
                while (state.activeSlots === episodeLoopGeometry.fullActiveSlots &&
                    state.startIndex > 0 &&
                    state.anchoredY < -episodeLoopGeometry.fullBound) {
                    state.startIndex -= 1;
                    state.anchoredY += LOOP_CELL_LINE_SIZE;
                }
                while (state.activeSlots === episodeLoopGeometry.fullActiveSlots &&
                    state.startIndex < episodeLoopGeometry.maxStartIndex &&
                    state.anchoredY > episodeLoopGeometry.fullBound) {
                    state.startIndex += 1;
                    state.anchoredY -= LOOP_CELL_LINE_SIZE;
                }
            }
            const maxScrollTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
            if (currentScrollTop <= 0.001) {
                state.startIndex = 0;
                state.activeSlots = episodeLoopGeometry.fullActiveSlots;
                state.anchoredY = -episodeLoopGeometry.fullBound;
            }
            else if (currentScrollTop >= maxScrollTop - 0.001) {
                state.anchoredY =
                    state.activeSlots === episodeLoopGeometry.initialActiveSlots
                        ? episodeLoopGeometry.initialBound
                        : episodeLoopGeometry.fullBound;
            }
            const registeredIndexes = getSeasonalTogglePoolIndexes(state, episodes.length, episodeLoopGeometry);
            const poolRebinds = reconcilePoolSlotBindings(registeredIndexes, selectedSlotEpisodeId);
            if (poolRebinds.length > 0) {
                viewport.dataset.storySeasonalPoolRebind = poolRebinds
                    .map(({ poolIndex, mode }) => `${poolIndex}:${mode}`)
                    .join(",");
            }
            viewport.dataset.storySeasonalLoopStart = String(state.startIndex);
            viewport.dataset.storySeasonalLoopActive = String(state.activeSlots);
            viewport.dataset.storySeasonalLoopAnchoredY =
                state.anchoredY.toFixed(6);
            viewport.dataset.storySeasonalTogglePool = registeredIndexes
                .map((episodeIndex) => episodeIndex ?? "inactive")
                .join(",");
            setEpisodeLoopRenderState((current) => current.startIndex === state.startIndex &&
                current.activeSlots === state.activeSlots &&
                current.anchoredY === state.anchoredY &&
                current.lastScrollTop === state.lastScrollTop
                ? current
                : { ...state });
            syncSeasonalEpisodeTabStops(viewport, episodes, selectedSlotEpisodeId, state, episodeLoopGeometry);
        };
        viewport.addEventListener("scroll", syncVirtualLoopState, {
            passive: true,
        });
        const frame = window.requestAnimationFrame(syncVirtualLoopState);
        return () => {
            window.cancelAnimationFrame(frame);
            viewport.removeEventListener("scroll", syncVirtualLoopState);
        };
    }, [
        episodeListViewportRef,
        episodeLoopGeometry,
        episodes,
        reconcilePoolSlotBindings,
        selectedSlotEpisodeId,
    ]);
    useEffect(() => {
        const viewport = episodeListViewportRef.current;
        if (!viewport) {
            return;
        }
        syncSeasonalEpisodeTabStops(viewport, episodes, selectedSlotEpisodeId, episodeLoopHotkeyStateRef.current, episodeLoopGeometry);
    }, [
        episodeListRubberY,
        episodeListViewportRef,
        episodeLoopGeometry,
        episodes,
        reconcilePoolSlotBindings,
        selectedSlotEpisodeId,
    ]);
    const backgroundWidth = Math.max(viewerLayout.logicalWidth, viewerLayout.logicalHeight * BACKGROUND_ASPECT_RATIO);
    const backgroundHeight = Math.max(viewerLayout.logicalHeight, viewerLayout.logicalWidth / BACKGROUND_ASPECT_RATIO);
    const backgroundLeft = (viewerLayout.logicalWidth - backgroundWidth) / 2;
    const backgroundTop = (viewerLayout.logicalHeight - backgroundHeight) / 2;
    const stageStyle = {
        "--story-seasonal-logical-width": `${viewerLayout.logicalWidth}px`,
        "--story-seasonal-logical-height": `${viewerLayout.logicalHeight}px`,
        "--story-seasonal-background-width": `${backgroundWidth}px`,
        "--story-seasonal-background-height": `${backgroundHeight}px`,
        "--story-seasonal-thumbnail-envelope-width": `${viewerLayout.logicalHeight * THUMBNAIL_ASPECT_RATIO}px`,
        "--story-seasonal-list-content-height": `${episodeLoopGeometry.totalContentHeight}px`,
        transform: `translate(-50%, -50%) scale(${viewerLayout.scale})`,
    } as CSSProperties;
    if (!selectedEpisode) {
        return null;
    }
    return (<div className={styles.backdrop} data-story-mouse3-cancel="STV-RDR-006" data-story-mouse3-cancel-level={transitionPhase === "idle" ? "seasonal-viewer" : "blocked"}>
      <div ref={panelRef} className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="story-seasonal-viewer-title" tabIndex={-1} data-story-seasonal-viewer="STV-CHR-037" data-story-seasonal-prefab="AB_UI_OPERATION_UI_SUB_03" data-story-seasonal-intro-duration={INTRO_DURATION_MS} data-story-seasonal-selection-fade={SELECTION_FADE_MS} data-story-seasonal-selection-phase={transitionPhase} data-story-seasonal-input-blocked={String(transitionPhase !== "idle")} data-story-seasonal-episode-count={episodes.length} data-story-seasonal-selected-episode={selectedSlotEpisodeId} data-story-seasonal-displayed-episode={selectedEpisode.episodeId} data-story-seasonal-default-episode={defaultEpisode?.episodeId ?? 0} data-story-seasonal-return-rubber-y={initialState?.episodeScrollRubberY?.toFixed(3) ?? "0.000"} data-story-seasonal-hard-rows="excluded" data-story-seasonal-account-state="excluded" data-story-seasonal-loop-render="responsive-recycled-slot-pool" data-story-seasonal-loop-pool-size={episodeLoopGeometry.poolSize} data-story-ui-click-audio="STV-AUD-002:pointer-only" data-story-seasonal-intro-sfx="FX_UI_SUBSTREAM_INTRO" data-story-seasonal-intro-sfx-play-on-enable="true" data-story-seasonal-intro-sfx-loop="false" data-story-seasonal-intro-sfx-stop-on-disable="false" data-story-seasonal-theme-url={activeThemeState?.url ?? ""} data-story-seasonal-theme-time={activeThemeState?.currentTime.toFixed(3) ?? ""}>
        <div className={styles.stage} inert={transitionPhase !== "idle"} data-intro="play" data-story-seasonal-lifecycle={initialState ? "UnHide" : "Open"} data-story-seasonal-canvas-scaler="ScaleWithScreenSize:1920x1080:client-aspect-branch" data-story-seasonal-responsive-layout="STV-CHR-051" data-story-seasonal-canvas-match={viewerLayout.logicalHeight > REFERENCE_HEIGHT ? "width" : "height"} data-story-seasonal-logical-root={`${viewerLayout.logicalWidth.toFixed(6)}x${viewerLayout.logicalHeight.toFixed(6)}`} data-story-seasonal-background-envelope={`${backgroundLeft.toFixed(6)},${backgroundTop.toFixed(6)},${backgroundWidth.toFixed(6)}x${backgroundHeight.toFixed(6)}`} style={stageStyle}>
          <Image src="/story/seasonal-ui/AB_UI_OPERATION_BG_SUB_03.png" alt="" width={1024} height={1080} className={styles.leftBackground} unoptimized/>
          <div className={styles.thumbnailRoot} data-story-seasonal-intro-surface="THUMB Root">
            <Image key={selectedEpisode.detailImageUrl} src={selectedEpisode.detailImageUrl} alt="" width={776} height={1080} className={styles.thumbnail} data-story-seasonal-thumbnail={selectedEpisode.episodeId} unoptimized/>
            <div className={styles.thumbnailGradient} aria-hidden="true"/>
          </div>
          <Image src="/story/seasonal-ui/AB_UI_OPERATION_BG_SUB_03_BOTTOM.png" alt="" width={1024} height={98} className={styles.bottomBackground} unoptimized/>

          <section className={styles.topCopy} data-story-seasonal-intro-surface="SafeArea/Top">
            <Image src="/story/seasonal-ui/AB_UI_OPERATION_SUB_03_TITLE.png" alt="" width={913} height={74} className={styles.titleArtwork} unoptimized/>
            <span className={styles.topLine} data-story-seasonal-source-sprite="AB_UI_OPERATION_GRADIENT_02.png" aria-hidden="true"/>
            <h1 id="story-seasonal-viewer-title" className={styles.srOnly}>
              시즈널 레코드
            </h1>
            <SeasonalAutoSizeText as="p" minSize={12} maxSize={26} whiteSpace="normal">
              과거의 시즈널 에피소드를 다시 볼 수 있는 공간입니다.
            </SeasonalAutoSizeText>
          </section>

          <section className={styles.episodeListShell} data-story-seasonal-intro-surface="SafeArea/EP_LIST" aria-label="시즈널 에피소드">
            <span className={styles.episodeScrollLine} data-story-seasonal-source-sprite="AB_UI_OPERATION_MAINSTREAM_SCROLL_LINE.png" aria-hidden="true"/>
            <div ref={episodeListViewportRef} className={styles.episodeListViewport} {...episodeListMarkerProps} {...episodeListPointerProps}>
              <div className={styles.episodeListContent} data-story-seasonal-scroll-proxy="10x100+9x50+2x100">
                {episodePoolIndexes.map((index, poolIndex) => {
            if (index === null) {
                return null;
            }
            const episode = episodes[index];
            if (!episode) {
                return null;
            }
            const isSelected = episode.episodeId === selectedSlotEpisodeId;
            const isSelectedTabStop = isSelected &&
                isSeasonalToggleCenterVisible(episodeLoopRenderState, index, episodeListRubberY, episodeLoopGeometry);
            const slotTransition = poolSlotTransitions[poolIndex];
            const selectionMotion = slotTransition?.motion ?? "idle";
            return (<button key={`pool-${poolIndex}`} type="button" className={styles.episodeSlot} style={{
                    top: `${getSeasonalToggleContentTop(episodeLoopRenderState, index, episodeLoopGeometry)}px`,
                }} data-story-seasonal-episode-id={episode.episodeId} data-story-seasonal-sort-index={episode.sortIndex} data-story-seasonal-list-index={index} data-story-seasonal-pool-index={poolIndex} data-selected={String(isSelected)} data-selection-motion={selectionMotion} data-selection-motion-run={selectionMotion === "idle"
                    ? undefined
                    : slotTransition?.run} aria-pressed={isSelected} aria-label={episode.subtitleKo} tabIndex={isSelectedTabStop ? 0 : -1} data-story-seasonal-pool-active="true" data-story-seasonal-slot-text-geometry="STV-CHR-053" data-story-seasonal-slot-off-insets="60,0" data-story-seasonal-slot-on-insets="80,0" data-story-seasonal-slot-line-bounds="5,67" data-story-seasonal-slot-spacing="OFF:-10;ON:-3" data-story-ui-click-sound="select" onClick={(event) => {
                    if (isSelected || transitionPhase !== "idle") {
                        return;
                    }
                    playStoryUiPointerSound(event);
                    selectEpisode(episode.episodeId);
                }}>
                      <SeasonalAutoSizeText as="span" clientTmpSlot="regular" className={styles.episodeSlotOff} minSize={12} maxSize={24} whiteSpace="normal">
                        {episode.subtitleKo}
                      </SeasonalAutoSizeText>
                      <span className={styles.episodeSlotOn} aria-hidden="true">
                        <Image src="/story/seasonal-ui/AB_UI_OPERATION_EP_SLOT_ON_DECO.png" alt="" width={62} height={149} className={styles.episodeSlotDeco} unoptimized/>
                        <SeasonalAutoSizeText as="span" clientTmpSlot="bold" className={styles.episodeSlotOnText} minSize={12} maxSize={36} whiteSpace="normal">
                          {episode.subtitleKo}
                        </SeasonalAutoSizeText>
                      </span>
                    </button>);
        })}
              </div>
            </div>
          </section>

          <section className={styles.main} data-story-seasonal-intro-surface="SafeArea/MAIN">
            {selectedEpisode.bgmTitleKo ? (<div className={styles.bgm} data-story-seasonal-bgm={selectedEpisode.bgmName}>
                <span className={styles.bgmIcon} data-story-seasonal-source-sprite="AB_UI_OPERATION_SUB_ICON_BGM.png" aria-hidden="true"/>
                <span>{selectedEpisode.bgmTitleKo}</span>
              </div>) : null}

            <div className={styles.heading}>
              <SeasonalAutoSizeText as="p" minSize={12} maxSize={30} whiteSpace="nowrap">
                {selectedEpisode.titleKo}
              </SeasonalAutoSizeText>
              <SeasonalAutoSizeText as="h2" minSize={30} maxSize={56} whiteSpace="normal">
                {selectedEpisode.subtitleKo}
              </SeasonalAutoSizeText>
            </div>
            <SeasonalAutoSizeText as="p" className={styles.description} minSize={12} maxSize={24} whiteSpace="pre-line">
              {selectedEpisode.descriptionKo}
            </SeasonalAutoSizeText>

            {selectedRelatedStories.length > 0 ? (<div className={styles.related} data-story-seasonal-related-count={selectedRelatedStories.length} data-story-chronicle-related-state={isRelatedOpen ? "ON" : "OFF"}>
                <button type="button" className={chronicleStyles.detailRelatedToggle} aria-expanded={isRelatedOpen} aria-controls={`story-seasonal-related-${selectedEpisode.episodeId}`} data-story-ui-click-sound="select" onClick={(event) => {
                playStoryUiPointerSound(event);
                setIsRelatedOpen((current) => !current);
            }}>
                  <Image src="/story/detail-ui/AB_UI_OPERATION_ICON_CONNECT.png" alt="" width={41} height={16} className={chronicleStyles.detailRelatedIcon} unoptimized/>
                  <span className={chronicleStyles.detailRelatedLabel}>
                    연관 에피소드
                  </span>
                  <span className={chronicleStyles.detailRelatedDeco} aria-hidden="true">
                    <Image src="/story/detail-ui/AB_UI_OPERATION_ICON_ARROW_02.png" alt="" width={24} height={14} className={chronicleStyles.detailRelatedArrow} style={{
                transform: isRelatedOpen
                    ? "scaleY(1)"
                    : "scaleY(-1)",
            }} unoptimized/>
                  </span>
                </button>
                {isRelatedOpen ? (<div id={`story-seasonal-related-${selectedEpisode.episodeId}`} ref={relatedViewportRef} className={`${chronicleStyles.detailRelatedList} ${styles.relatedViewport}`} role="list" style={{ touchAction: "none" }} {...relatedMarkerProps} {...relatedPointerProps}>
                    <div className={styles.relatedContent}>
                      {selectedRelatedStories.map((story) => (<div key={story.episodeId} role="listitem" className={chronicleStyles.detailRelatedItem} data-story-seasonal-related-id={story.episodeId}>
                          <span>{story.categoryKo}</span>
                          <strong>{story.subtitleKo}</strong>
                        </div>))}
                    </div>
                  </div>) : null}
              </div>) : null}

            <Link ref={enterRef} href={`/story/reader/?episode=${selectedEpisode.episodeId}&source=seasonal&seasonal=${selectedEpisode.episodeId}`} className={styles.enter} data-story-seasonal-enter={selectedEpisode.episodeId} data-story-seasonal-enter-hotkey="Confirm" data-story-seasonal-enter-keyboard="Return KeypadEnter Space Keypad5" data-story-seasonal-enter-new-context="blocked-client-parity" data-story-ui-click-sound="select" draggable={false} onContextMenu={(event) => event.preventDefault()} onAuxClick={(event) => {
            event.preventDefault();
        }} onClick={(event) => {
            if (event.button !== 0 ||
                event.altKey ||
                event.ctrlKey ||
                event.metaKey ||
                event.shiftKey) {
                event.preventDefault();
                return;
            }
            if (transitionPhase !== "idle") {
                event.preventDefault();
                return;
            }
            playStoryUiPointerSound(event);
            onOpenReader({
                episodeId: selectedEpisode.episodeId,
                episodeScrollTop: episodeListViewportRef.current?.scrollTop ?? 0,
                episodeScrollRubberY: Number(episodeListViewportRef.current?.dataset
                    .storySeasonalScrollRubberY ?? "0"),
                episodeLoopStartIndex: episodeLoopHotkeyStateRef.current.startIndex,
                episodeLoopActiveSlots: episodeLoopHotkeyStateRef.current.activeSlots ===
                    episodeLoopGeometry.initialActiveSlots
                    ? 3
                    : 4,
                episodeLoopAnchoredY: episodeLoopHotkeyStateRef.current.anchoredY,
                lifecycle: "UnHide",
                createdAt: Date.now(),
            });
        }}>
              <Image src="/story/reader/ui/ab_ui_operation_button_enter.png" alt="" width={510} height={128} unoptimized/>
              <SeasonalAutoSizeText as="span" className={styles.enterText} minSize={12} maxSize={36} whiteSpace="normal">
                진입하기
              </SeasonalAutoSizeText>
            </Link>
          </section>
          {showHotkeys ? (<>
              <StoryHotkeyDisplay className={styles.hotkeyDisplay} text="↑ ↓" trackerId="STV-CHR-037" target="ToggleGroup" style={{ top: episodeHotkeyRootTop }}/>
              <StoryHotkeyDisplay className={styles.enterHotkeyDisplay} text="⏎" trackerId="STV-CHR-037" target="Enter"/>
            </>) : null}
        </div>
        <header className={upsideStyles.operationHeader} inert={transitionPhase !== "idle"} data-story-seasonal-upside-menu="STV-CHR-037" data-story-seasonal-upside-mode="LeftsideWithHamburger" data-story-seasonal-upside-hamburger="current-path-excluded:STV-CHR-041" style={{
            "--operation-header-bg": `url("${deploymentUrl("/story/reader/ui/nkm_ui_upside_menu_bg_gradient.png")}")`,
        } as CSSProperties}>
          <button type="button" className={`${upsideStyles.operationBack} ${styles.upsideAction}`} aria-label="연대기 지도로 돌아가기" data-story-ui-click-sound="back" onClick={(event) => {
            playStoryUiPointerSound(event, "back");
            onClose(selectedSlotEpisodeId);
        }}>
            <Image src="/story/reader/ui/nkm_ui_upside_menu_button_back.png" alt="" width={232} height={70} unoptimized/>
          </button>
          <Link href="/" className={`${upsideStyles.operationHome} ${styles.upsideAction}`} aria-label="홈으로 이동" data-story-ui-click-sound="home" onClick={(event) => {
            const isModifiedActivation = event.button !== 0 ||
                event.altKey ||
                event.ctrlKey ||
                event.metaKey ||
                event.shiftKey;
            if (!isModifiedActivation) {
                playStoryUiPointerSound(event, "home");
            }
            window.sessionStorage.removeItem(STORY_SEASONAL_RETURN_STORAGE_KEY);
        }}>
            <Image src="/story/reader/ui/nkm_ui_upside_menu_button_home.png" alt="" width={102} height={70} unoptimized/>
          </Link>
        </header>
        <div className={styles.selectionFade} data-phase={transitionPhase} data-story-seasonal-selection-fade-surface="NKCUIFadeInOut" aria-hidden="true"/>
      </div>
    </div>);
}
