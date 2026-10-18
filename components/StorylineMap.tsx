"use client";
import { deploymentUrl } from "@/lib/deployment";
import Image from "@/components/DeploymentImage";
import Link from "@/components/DeploymentLink";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, } from "react";
import { getStoryUnityScrollRectDragFrame, getStoryUnityScrollRectReleaseFrame, getStoryUnityScrollRectRubberDelta, } from "@/lib/storyUnityScrollRect";
import type { StorylineConnection, StorylineLayout, StorylineMainEpisode, StorylineNode, StorylineOmenShortcut, StorylineSeasonalEpisode, } from "@/lib/storyline";
import { getStoryMouseCancelAction } from "@/lib/storyPlayback";
import { playStoryUiPointerSound, preloadStoryCommonUiAudio, STORY_COMMON_UI_SOUND_PATHS, } from "@/lib/storyUiAudio";
import { getActiveStoryThemeState, playStoryTheme, stopStoryTheme, } from "@/lib/storyThemeAudio";
import { STORY_OMEN_NODE_CANVAS_WITHIN_BUTTON, STORY_OMEN_NODE_HIT_TARGET, STORY_OMEN_NODE_RAYCAST_UNION_WITHIN_ROOT, } from "@/lib/storyOmenSceneGeometry";
import type { StoryOmenContinuousSceneSource } from "@/lib/storyOmenNativeRuntime";
import { loadStoryOmenChronicleNodeSceneSource } from "@/lib/storyOmenSceneSource";
import StorySeasonalViewer, { type StorySeasonalReturnState, } from "./story/StorySeasonalViewer";
import StoryChronicleShortcutFocusFx, { preloadStoryChronicleShortcutFocusTextures, } from "./story/StoryChronicleShortcutFocusFx";
import StoryOmenViewer from "./story/StoryOmenViewer";
import StoryOmenNativeSceneCanvas from "./story/StoryOmenNativeSceneCanvas";
import StoryHotkeyDisplay from "./story/StoryHotkeyDisplay";
import { useStoryUnityScrollRectPointer } from "./story/useStoryUnityScrollRectPointer";
import styles from "./StorylineMap.module.css";
import upsideStyles from "./story/StoryReader.module.css";
type MapViewportMetrics = {
    width: number;
    height: number;
    scale: number;
};
type StoryCommonAudioPreloadState = {
    status: "loading" | "ready" | "partial" | "failed";
    total: number;
    failed: number;
};
type OmenNativeVisualStatus = "loading" | "rendering" | "ready" | "error";
type SelectableStory = StorylineNode | StorylineMainEpisode | StorylineSeasonalEpisode;
const STORY_CHRONICLE_REFERENCE_WIDTH = 1920;
const STORY_CHRONICLE_REFERENCE_HEIGHT = 1080;
const STORY_CHRONICLE_FIXED_GRADIENT = {
    left: -109,
    top: -775,
    width: 800,
    height: 2000,
};
const STORY_CHRONICLE_VIGNETTE_SIZE_DELTA = {
    width: 561.162109,
    height: 315.653595,
};
const STORY_CHRONICLE_SHORTCUT_WHEEL_MULTIPLIER = 150;
const STORY_CHRONICLE_SHORTCUT_WHEEL_RUBBER_SCALE = 0.5;
const STORY_CHRONICLE_SHORTCUT_BROWSER_PIXEL_TICK = 120;
const STORY_CHRONICLE_HOTKEY_SPEED = 4000;
const STORY_CHRONICLE_SHORTCUT_FIRST_EPISODE_X = -11;
const STORY_CHRONICLE_SHORTCUT_LAST_EPISODE_X = 19571.98828125;
const STORY_CHRONICLE_SHORTCUT_TWEEN_DURATION_MS = 100;
const STORY_SEASONAL_RETURN_STORAGE_KEY = "story-seasonal-return-episode";
const STORY_SEASONAL_RETURN_HISTORY_KEY = "storySeasonalReturnToken";
const STORY_OPERATION_RETURN_FADE_STORAGE_KEY = "story-operation-node-viewer-return-fade";
const STORY_OPERATION_PARENT_RETURN_FADE_MS = 100;
const STORY_OPERATION_RETURN_FADE_MAX_AGE_MS = 5000;
const STORY_CHRONICLE_GUIDE_SCENE_WIDTH = 1527.849854;
const STORY_CHRONICLE_GUIDE_SCENE_HEIGHT = 828.960022;
const STORY_CHRONICLE_LEFT_HOTKEY_CODES = new Set([
    "ArrowLeft",
    "KeyA",
    "Numpad4",
]);
const STORY_CHRONICLE_RIGHT_HOTKEY_CODES = new Set([
    "ArrowRight",
    "KeyD",
    "Numpad6",
]);
type StoryOperationReturnFadeRequest = {
    trackerId: "STV-MAP-061";
    source: "NKCUIOperationNodeViewer";
    destination: "NKCUIOperationV2";
    createdAt: number;
    fadeOutMs: 200;
    fadeInMs: 100;
} | {
    trackerId: "STV-MAP-062";
    source: "NKCUIEpisodeViewerCC";
    destination: "NKCUIOperationV2";
    createdAt: number;
    fadeOutMs: 0;
    fadeInMs: 100;
};
function parseStoryOperationReturnFadeRequest(rawValue: string | null): StoryOperationReturnFadeRequest | null {
    if (!rawValue) {
        return null;
    }
    try {
        const candidate = JSON.parse(rawValue) as {
            trackerId?: unknown;
            source?: unknown;
            destination?: unknown;
            createdAt?: unknown;
            fadeOutMs?: unknown;
            fadeInMs?: unknown;
        };
        const ageMs = Date.now() - Number(candidate.createdAt);
        const isNodeViewerReturn = candidate.trackerId === "STV-MAP-061" &&
            candidate.source === "NKCUIOperationNodeViewer" &&
            candidate.fadeOutMs === 200;
        const isCounterCaseReturn = candidate.trackerId === "STV-MAP-062" &&
            candidate.source === "NKCUIEpisodeViewerCC" &&
            candidate.fadeOutMs === 0;
        if ((!isNodeViewerReturn && !isCounterCaseReturn) ||
            candidate.destination !== "NKCUIOperationV2" ||
            candidate.fadeInMs !== STORY_OPERATION_PARENT_RETURN_FADE_MS ||
            !Number.isFinite(ageMs) ||
            ageMs < -1000 ||
            ageMs > STORY_OPERATION_RETURN_FADE_MAX_AGE_MS) {
            return null;
        }
        return candidate as StoryOperationReturnFadeRequest;
    }
    catch {
        return null;
    }
}
function parseStorySeasonalReturnState(rawValue: string | null): StorySeasonalReturnState | null {
    if (!rawValue) {
        return null;
    }
    try {
        const candidate = JSON.parse(rawValue) as Partial<StorySeasonalReturnState>;
        const episodeLoopStartIndex = Number(candidate.episodeLoopStartIndex ?? 7);
        const episodeLoopActiveSlots = Number(candidate.episodeLoopActiveSlots ?? 3);
        const episodeLoopAnchoredY = Number(candidate.episodeLoopAnchoredY ?? 0);
        const episodeScrollRubberY = Number(candidate.episodeScrollRubberY ?? 0);
        if (!Number.isInteger(candidate.episodeId) ||
            Number(candidate.episodeId) <= 0 ||
            !Number.isFinite(Number(candidate.episodeScrollTop)) ||
            Number(candidate.episodeScrollTop) < 0 ||
            !Number.isInteger(episodeLoopStartIndex) ||
            episodeLoopStartIndex < 0 ||
            episodeLoopStartIndex > 7 ||
            (episodeLoopActiveSlots !== 3 && episodeLoopActiveSlots !== 4) ||
            !Number.isFinite(episodeLoopAnchoredY) ||
            !Number.isFinite(episodeScrollRubberY) ||
            typeof candidate.returnToken !== "string" ||
            candidate.returnToken.length < 8 ||
            !Number.isFinite(Number(candidate.createdAt))) {
            return null;
        }
        return {
            episodeId: Number(candidate.episodeId),
            episodeScrollTop: Number(candidate.episodeScrollTop),
            episodeScrollRubberY,
            episodeLoopStartIndex,
            episodeLoopActiveSlots: episodeLoopActiveSlots as 3 | 4,
            episodeLoopAnchoredY,
            returnToken: candidate.returnToken,
            lifecycle: "UnHide",
            createdAt: Number(candidate.createdAt),
        };
    }
    catch {
        return null;
    }
}
function clearStorySeasonalReturnHistoryToken() {
    const currentState = window.history.state;
    if (!currentState ||
        typeof currentState !== "object" ||
        !(STORY_SEASONAL_RETURN_HISTORY_KEY in currentState)) {
        return;
    }
    const nextState = { ...currentState } as Record<string, unknown>;
    delete nextState[STORY_SEASONAL_RETURN_HISTORY_KEY];
    window.history.replaceState(nextState, "", window.location.href);
}
function getChronicleHorizontalHotkeyCode(event: KeyboardEvent) {
    if (STORY_CHRONICLE_LEFT_HOTKEY_CODES.has(event.code) ||
        STORY_CHRONICLE_RIGHT_HOTKEY_CODES.has(event.code)) {
        return event.code;
    }
    // Some embedded browser input bridges omit `code`; keep the physical-code
    // path authoritative and only fall back for the non-keypad aliases.
    if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        return event.key === "ArrowLeft" ? "ArrowLeft" : "KeyA";
    }
    if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        return event.key === "ArrowRight" ? "ArrowRight" : "KeyD";
    }
    return null;
}
function getChronicleGuideSceneRect(x: number, y: number, width: number, height: number): CSSProperties {
    return {
        left: `${50 + ((x - width / 2) / STORY_CHRONICLE_GUIDE_SCENE_WIDTH) * 100}%`,
        top: `${50 - ((y + height / 2) / STORY_CHRONICLE_GUIDE_SCENE_HEIGHT) * 100}%`,
        width: `${(width / STORY_CHRONICLE_GUIDE_SCENE_WIDTH) * 100}%`,
        height: `${(height / STORY_CHRONICLE_GUIDE_SCENE_HEIGHT) * 100}%`,
    };
}
const mapAreaDecorationPlacement = {
    left: 786,
    top: 10,
    width: 332,
    height: 1060,
    opacity: 0.980392,
};
function getUnityColor({ r, g, b, a, }: {
    r: number;
    g: number;
    b: number;
    a: number;
}) {
    return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
}
function getLineColor(line: StorylineConnection) {
    return getUnityColor(line.unity.color);
}
function isChronicleEmptyMapPointerTarget(target: EventTarget | null) {
    return !(target instanceof Element &&
        target.closest("button, a, summary, input, select, textarea, [role='button'], [contenteditable='true']"));
}
function isOmenPointerReleaseOverTarget(event: {
    clientX: number;
    clientY: number;
    currentTarget: HTMLElement;
}) {
    const releaseTarget = document.elementFromPoint(event.clientX, event.clientY);
    return (releaseTarget !== null &&
        (releaseTarget === event.currentTarget ||
            event.currentTarget.contains(releaseTarget)));
}
function syncChronicleScrollbar(viewport: HTMLElement, scrollbar: HTMLElement | null, handle: HTMLElement | null, rubber: number) {
    if (!scrollbar || !handle) {
        return;
    }
    const visibleWidth = Math.max(0, viewport.clientWidth - Math.abs(rubber));
    const size = viewport.scrollWidth > 0
        ? Math.min(1, visibleWidth / viewport.scrollWidth)
        : 1;
    const maxScrollLeft = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    const normalized = maxScrollLeft > 0 ? viewport.scrollLeft / maxScrollLeft : 0;
    scrollbar.dataset.storyChronicleScrollbarSize = size.toFixed(6);
    scrollbar.dataset.storyChronicleScrollbarValue = normalized.toFixed(6);
    handle.style.width = `${size * 100}%`;
    handle.style.left = `${normalized * (1 - size) * 100}%`;
}
function getMainEpisodeNumber(name: string) {
    return name.replace("EP_", "EP. ").replace("_", ".");
}
function StoryConnections({ layout, }: {
    layout: StorylineLayout;
}) {
    return (<svg aria-hidden="true" className={styles.connections} data-story-chronicle-lines="STV-CHR-012" width={layout.metadata.canvas.width} height={layout.metadata.canvas.height} viewBox={`0 0 ${layout.metadata.canvas.width} ${layout.metadata.canvas.height}`}>
      {layout.lineRenderers.map((line) => (<polyline key={line.name} points={line.webPoints
                .map((point) => `${point.x},${point.y}`)
                .join(" ")} fill="none" stroke={getLineColor(line)} strokeWidth={line.unity.lineThickness} strokeLinejoin="miter" strokeLinecap="butt"/>))}
    </svg>);
}
function StoryNode({ node, isSelected, shortcutFocusRun, onShortcutFocusComplete, onSelect, }: {
    node: StorylineNode;
    isSelected: boolean;
    shortcutFocusRun: number;
    onShortcutFocusComplete: (episodeId: number, run: number) => void;
    onSelect: (node: StorylineNode) => void;
}) {
    const placement = node.mapButton.webPlacement;
    const isIconNode = node.mapButton.mode === "icon-with-text";
    const isFullCard = node.mapButton.mode === "full-card";
    return (<button id={`story-node-${node.episodeId}`} type="button" className={`${styles.node} ${isIconNode ? styles.iconNode : ""} ${isFullCard ? styles.fullCardNode : ""} ${isSelected ? styles.nodeSelected : ""}`} style={{
            left: node.web.left,
            top: node.web.top,
            width: node.web.width,
            height: node.web.height,
        }} aria-label={`${node.titleKo} - ${node.subtitleKo}`} aria-pressed={isSelected} data-story-chronicle-node-surface="STV-CHR-002" data-story-chronicle-node-static-order="STV-CHR-028" data-story-chronicle-node-input="STV-CHR-011" data-story-ui-click-sound="select" onClick={(event) => {
            playStoryUiPointerSound(event);
            onSelect(node);
        }}>
      {isIconNode ? (<Image src="/story/map-ui/AB_UI_OPERATION_SUB_NODE_BG.png" alt="" width={522} height={182} draggable={false} data-story-chronicle-node-backdrop="STV-CHR-024" data-story-chronicle-node-backdrop-layer="small-bg" className={styles.nodeBackdrop} style={{ width: 522, height: 182 }} unoptimized/>) : null}
      {isFullCard ? (<>
          <Image src="/story/map-ui/AB_UI_OPERATION_SUB_NODE_SHADOW.png" alt="" width={591.562805} height={205.119202} draggable={false} data-story-chronicle-node-backdrop="STV-CHR-024" data-story-chronicle-node-backdrop-layer="large-outer" className={styles.nodeBackdrop} style={{ width: 591.562805, height: 205.119202 }} unoptimized/>
          {(["large-inner-1", "large-inner-2"] as const).map((layer) => (<Image key={layer} src="/story/map-ui/AB_UI_OPERATION_SUB_NODE_SHADOW.png" alt="" width={565.572083} height={183.460098} draggable={false} data-story-chronicle-node-backdrop="STV-CHR-024" data-story-chronicle-node-backdrop-layer={layer} className={styles.nodeBackdrop} style={{
                    left: "calc(50% + 5.8px)",
                    width: 565.572083,
                    height: 183.460098,
                }} unoptimized/>))}
        </>) : null}

      {node.mapButton.visible ? (<Image src={`/story/map-buttons/${node.mapButton.file}`} alt="" width={placement.width} height={placement.height} draggable={false} data-story-chronicle-node-thumbnail="STV-CHR-027" unoptimized style={{
                position: "absolute",
                display: "block",
                left: placement.left,
                top: placement.top,
                width: placement.width,
                height: placement.height,
                objectFit: "fill",
                pointerEvents: "none",
            }}/>) : null}

      <span data-story-chronicle-node-title="STV-CHR-010" className={styles.nodeSourceTitle} style={{ color: getUnityColor(node.sourceVisual.titleColor) }}>
        {node.titleKo}
      </span>
      <span className={styles.nodeSourceSubtitle}>{node.subtitleKo}</span>
      {isIconNode ? (<Image src={node.navigationGroup === "supplement"
                ? "/story/map-ui/AB_UI_OPERATION_ICON_SUB_SUPPLEMENT.png"
                : "/story/map-ui/AB_UI_OPERATION_ICON_SUB_SIDESTORY.png"} alt="" width={node.navigationGroup === "supplement" ? 43 : 52} height={node.navigationGroup === "supplement" ? 38 : 32} draggable={false} data-story-chronicle-node-category="STV-CHR-025" data-story-chronicle-node-category-kind={node.navigationGroup} className={styles.nodeCategoryBadge} style={node.navigationGroup === "supplement"
                ? { left: 398.5, top: -79.6, width: 43, height: 38 }
                : { left: 388.9, top: -76.6, width: 52, height: 32 }} unoptimized/>) : null}
      {shortcutFocusRun > 0 ? (<span key={shortcutFocusRun} aria-hidden="true" className={styles.nodeShortcutFocus} data-story-chronicle-shortcut-focus="STV-CHR-036" data-story-chronicle-shortcut-focus-run={shortcutFocusRun}>
          <StoryChronicleShortcutFocusFx activationKey={shortcutFocusRun} variant={isFullCard ? "large" : "small"} className={styles.nodeShortcutFocusCanvas} onComplete={(completedRun) => {
                onShortcutFocusComplete(node.episodeId, completedRun);
            }}/>
        </span>) : null}
    </button>);
}
function MainStoryNode({ episode, isSelected, onSelect, }: {
    episode: StorylineMainEpisode;
    isSelected: boolean;
    onSelect: (episode: StorylineMainEpisode) => void;
}) {
    return (<button id={`main-episode-${episode.episodeId}`} type="button" className={styles.mainEpisode} style={{
            left: episode.web.left,
            top: episode.web.top,
            width: episode.web.width,
            height: episode.web.height,
        }} aria-label={`${episode.titleKo} - ${episode.subtitleKo}`} aria-pressed={isSelected} data-story-chronicle-mainstream-marker="source" data-story-chronicle-mainstream-input="web-supplement" onClick={() => onSelect(episode)}>
      <span className={styles.mainEpisodeMainstreamText}>메인스트림</span>
      <strong className={styles.mainEpisodeEpisodeText}>
        {episode.titleKo || getMainEpisodeNumber(episode.name)}
      </strong>
    </button>);
}
function OmenShortcutNode({ shortcut, onOpen, }: {
    shortcut: StorylineOmenShortcut;
    onOpen: () => void;
}) {
    const [pressedTarget, setPressedTarget] = useState<string | null>(null);
    const releaseEligibleRef = useRef<boolean | null>(null);
    const [nativeSource, setNativeSource] = useState<StoryOmenContinuousSceneSource | null>(null);
    const [nativeStatus, setNativeStatus] = useState<OmenNativeVisualStatus>("loading");
    const [nativeError, setNativeError] = useState<string | null>(null);
    useEffect(() => {
        let disposed = false;
        void loadStoryOmenChronicleNodeSceneSource()
            .then((source) => {
            if (disposed) {
                return;
            }
            setNativeSource(source);
            setNativeStatus("rendering");
        })
            .catch((error: unknown) => {
            if (disposed) {
                return;
            }
            setNativeError(error instanceof Error ? error.message : String(error));
            setNativeStatus("error");
        });
        return () => {
            disposed = true;
        };
    }, []);
    const isPressed = pressedTarget === STORY_OMEN_NODE_HIT_TARGET.path;
    return (<span className={styles.omenShortcut} style={{
            left: shortcut.web.left,
            top: shortcut.web.top,
            width: shortcut.web.width,
            height: shortcut.web.height,
        }} data-story-chronicle-omen-node="STV-CHR-044" data-story-chronicle-omen-shortcut-type={shortcut.shortcut.type} data-story-chronicle-omen-shortcut-prefab={shortcut.shortcut.prefab} data-story-chronicle-omen-visibility="always" data-story-chronicle-omen-corrupted-slot="separate" data-story-chronicle-omen-renderer="client-evidence-webgl" data-story-chronicle-omen-css-fallback="none" data-story-chronicle-omen-native-status={nativeStatus} data-story-chronicle-omen-native-error={nativeError ?? undefined} data-story-chronicle-omen-press-scale={STORY_OMEN_NODE_HIT_TARGET.pressScale} data-story-chronicle-omen-press-seconds={STORY_OMEN_NODE_HIT_TARGET.trackingSeconds} data-story-chronicle-omen-pressed-target={pressedTarget ?? "none"}>
      <button type="button" tabIndex={-1} className={styles.omenShortcutHitButton} aria-label="전조" data-story-ui-click-sound="select" data-story-chronicle-omen-hit-target={STORY_OMEN_NODE_HIT_TARGET.path} data-story-chronicle-omen-hit-surface="active-raycast-union" style={{
            left: STORY_OMEN_NODE_RAYCAST_UNION_WITHIN_ROOT.left,
            top: STORY_OMEN_NODE_RAYCAST_UNION_WITHIN_ROOT.top,
            width: STORY_OMEN_NODE_RAYCAST_UNION_WITHIN_ROOT.width,
            height: STORY_OMEN_NODE_RAYCAST_UNION_WITHIN_ROOT.height,
            transform: `scale3d(${isPressed ? STORY_OMEN_NODE_HIT_TARGET.pressScale : 1}, ${isPressed ? STORY_OMEN_NODE_HIT_TARGET.pressScale : 1}, 1)`,
            transformOrigin: `${STORY_OMEN_NODE_RAYCAST_UNION_WITHIN_ROOT.transformOrigin.x}px ${STORY_OMEN_NODE_RAYCAST_UNION_WITHIN_ROOT.transformOrigin.y}px`,
            transition: `transform ${STORY_OMEN_NODE_HIT_TARGET.trackingSeconds}s cubic-bezier(0.3333333333333333, 0, 0.6666666666666666, 1)`,
        }} onPointerDown={(event) => {
            if (event.button >= 0 && event.button <= 2) {
                releaseEligibleRef.current = null;
                event.currentTarget.setPointerCapture(event.pointerId);
                setPressedTarget(STORY_OMEN_NODE_HIT_TARGET.path);
            }
        }} onPointerUp={(event) => {
            releaseEligibleRef.current = isOmenPointerReleaseOverTarget(event);
            setPressedTarget(null);
        }} onPointerCancel={() => {
            releaseEligibleRef.current = null;
            setPressedTarget(null);
        }} onLostPointerCapture={() => {
            setPressedTarget(null);
        }} onMouseDown={(event) => {
            if (event.button === 1) {
                event.preventDefault();
            }
        }} onClick={(event) => {
            const isEligible = event.detail > 0 && releaseEligibleRef.current === true;
            releaseEligibleRef.current = null;
            if (!isEligible) {
                return;
            }
            playStoryUiPointerSound(event);
            onOpen();
        }} onAuxClick={(event) => {
            if (event.button !== 1 && event.button !== 2) {
                return;
            }
            event.preventDefault();
            const isEligible = event.detail > 0 && releaseEligibleRef.current === true;
            releaseEligibleRef.current = null;
            if (!isEligible) {
                return;
            }
            playStoryUiPointerSound(event);
            onOpen();
        }} onContextMenu={(event) => event.preventDefault()} onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
            }
        }}/>
      {nativeSource ? (<span className={styles.omenShortcutNativeSurface} style={{
                left: STORY_OMEN_NODE_CANVAS_WITHIN_BUTTON.left,
                top: STORY_OMEN_NODE_CANVAS_WITHIN_BUTTON.top,
                width: STORY_OMEN_NODE_CANVAS_WITHIN_BUTTON.width,
                height: STORY_OMEN_NODE_CANVAS_WITHIN_BUTTON.height,
            }}>
          <StoryOmenNativeSceneCanvas source={nativeSource} activationKey={STORY_OMEN_NODE_HIT_TARGET.path} pressedTarget={pressedTarget} motionPolicy="native" className={styles.omenShortcutNativeCanvas} onReady={() => {
                setNativeError(null);
                setNativeStatus("ready");
            }} onError={(message) => {
                setNativeError(message);
                setNativeStatus("error");
            }}/>
        </span>) : null}
    </span>);
}
function ChronicleSafeAreaNavigation({ layout, mapScale, onShortcutSelect, onListOpenChange, onOpenSeasonal, }: {
    layout: StorylineLayout;
    mapScale: number;
    onShortcutSelect: (node: StorylineNode) => void;
    onListOpenChange: (isOpen: boolean) => void;
    onOpenSeasonal: () => void;
}) {
    const [openList, setOpenList] = useState<StorylineNode["navigationGroup"] | null>(null);
    const [isListAscending, setIsListAscending] = useState(true);
    const listScrollRef = useRef<HTMLDivElement>(null);
    const listMotionFrameRef = useRef<number | null>(null);
    const listRubberRef = useRef(0);
    const listVelocityRef = useRef(0);
    const listNodes = openList
        ? layout.nodes
            .filter((node) => node.navigationGroup === openList)
            .sort(isListAscending
            ? (left, right) => left.sortIndex - right.sortIndex ||
                left.episodeId - right.episodeId
            : (left, right) => right.sortIndex - left.sortIndex ||
                right.episodeId - left.episodeId)
        : [];
    const listId = "story-chronicle-navigation-list";
    const listTitleId = `${listId}-title`;
    const listCategoryName = openList === "side" ? "외전" : "서플리먼트";
    const scaledRect = (left: number, top: number, width: number, height: number): CSSProperties => ({
        left: left * mapScale,
        top: top * mapScale,
        width: width * mapScale,
        height: height * mapScale,
    });
    const setShortcutListRubber = useCallback((viewport: HTMLElement, rubber: number) => {
        listRubberRef.current = rubber;
        viewport.style.setProperty("--story-chronicle-shortcut-rubber-y", `${rubber}px`);
        viewport.dataset.storyChronicleShortcutRubberY = rubber.toFixed(3);
    }, []);
    const cancelShortcutListMotion = useCallback(() => {
        if (listMotionFrameRef.current !== null) {
            window.cancelAnimationFrame(listMotionFrameRef.current);
            listMotionFrameRef.current = null;
        }
    }, []);
    const stopShortcutListMotion = useCallback((viewport: HTMLElement | null = listScrollRef.current) => {
        cancelShortcutListMotion();
        listVelocityRef.current = 0;
        if (viewport) {
            viewport.dataset.storyChronicleShortcutMotion = "idle";
            viewport.dataset.storyChronicleShortcutRawBoundary = "false";
            viewport.dataset.storyUnityScrollrectVelocity = "0.000";
            setShortcutListRubber(viewport, 0);
        }
        else {
            listRubberRef.current = 0;
        }
    }, [cancelShortcutListMotion, setShortcutListRubber]);
    const startShortcutListReleaseMotion = useCallback((viewport: HTMLElement, initialVelocity: number) => {
        cancelShortcutListMotion();
        listVelocityRef.current = initialVelocity;
        let lastTime = performance.now();
        const update = (currentTime: number) => {
            const deltaTime = Math.max((currentTime - lastTime) / 1000, 0);
            lastTime = currentTime;
            const frame = getStoryUnityScrollRectReleaseFrame({
                visualPosition: viewport.scrollTop - listRubberRef.current,
                maximum: viewport.scrollHeight - viewport.clientHeight,
                velocity: listVelocityRef.current,
                deltaTime,
                snapElasticVelocityBelowOne: false,
            });
            listVelocityRef.current = frame.velocity;
            viewport.dataset.storyUnityScrollrectVelocity = frame.velocity.toFixed(3);
            viewport.scrollTop = frame.scrollPosition;
            viewport.dataset.storyChronicleShortcutMotion = frame.motion;
            viewport.dataset.storyChronicleShortcutRawBoundary = String(frame.motion === "inertia-boundary");
            if (frame.motion === "inertia-boundary") {
                viewport.dataset.storyUnityScrollrectRawBoundaryObserved = "true";
            }
            setShortcutListRubber(viewport, frame.rubber);
            if (frame.motion === "idle" ||
                (frame.motion === "elastic" &&
                    Math.abs(frame.rubber) <= 0.01 &&
                    Math.abs(frame.velocity) <= 0.01)) {
                stopShortcutListMotion(viewport);
                return;
            }
            listMotionFrameRef.current = window.requestAnimationFrame(update);
        };
        listMotionFrameRef.current = window.requestAnimationFrame(update);
    }, [
        cancelShortcutListMotion,
        setShortcutListRubber,
        stopShortcutListMotion,
    ]);
    const getShortcutListPointerVisualPosition = useCallback((viewport: HTMLDivElement) => viewport.scrollTop - listRubberRef.current, []);
    const getShortcutListVisualUnitsPerScreenPixel = useCallback(() => 1 / Math.max(mapScale, Number.EPSILON), [mapScale]);
    const applyShortcutListDragPosition = useCallback((viewport: HTMLDivElement, desiredVisualPosition: number) => {
        const frame = getStoryUnityScrollRectDragFrame(desiredVisualPosition, viewport.scrollHeight - viewport.clientHeight, viewport.clientHeight);
        viewport.scrollTop = frame.scrollPosition;
        viewport.dataset.storyChronicleShortcutMotion = "dragging";
        viewport.dataset.storyChronicleShortcutRawBoundary = "false";
        setShortcutListRubber(viewport, frame.rubber);
    }, [setShortcutListRubber]);
    const handleShortcutListDragEnd = useCallback((viewport: HTMLDivElement, velocity: number) => {
        listVelocityRef.current = velocity;
        startShortcutListReleaseMotion(viewport, velocity);
    }, [startShortcutListReleaseMotion]);
    const handleShortcutListDragStart = useCallback((viewport: HTMLDivElement) => {
        viewport.dataset.storyChronicleShortcutMotion = "dragging";
        viewport.dataset.storyChronicleShortcutRawBoundary = "false";
    }, []);
    const { cancelPointerTracking: cancelShortcutListPointerTracking, markerProps: shortcutListUnityMarkerProps, pointerProps: shortcutListPointerProps, } = useStoryUnityScrollRectPointer({
        enabled: openList !== null,
        axis: "vertical",
        viewportRef: listScrollRef,
        velocityRef: listVelocityRef,
        getVisualPosition: getShortcutListPointerVisualPosition,
        getVisualUnitsPerScreenPixel: getShortcutListVisualUnitsPerScreenPixel,
        applyDragPosition: applyShortcutListDragPosition,
        cancelReleaseMotion: cancelShortcutListMotion,
        onDragStart: handleShortcutListDragStart,
        onDragEnd: handleShortcutListDragEnd,
    });
    const closeShortcutList = useCallback(() => {
        cancelShortcutListPointerTracking();
        stopShortcutListMotion();
        setOpenList(null);
        onListOpenChange(false);
    }, [
        cancelShortcutListPointerTracking,
        onListOpenChange,
        stopShortcutListMotion,
    ]);
    const handleShortcutListWheel = useCallback((event: WheelEvent) => {
        event.preventDefault();
        cancelShortcutListMotion();
        listVelocityRef.current = 0;
        const viewport = event.currentTarget as HTMLElement;
        const useHorizontalAxis = Math.abs(event.deltaX) > Math.abs(event.deltaY);
        const delta = useHorizontalAxis ? event.deltaX : event.deltaY;
        const unityScrollDelta = event.deltaMode === WheelEvent.DOM_DELTA_PIXEL
            ? delta / STORY_CHRONICLE_SHORTCUT_BROWSER_PIXEL_TICK
            : delta;
        const currentVisualPosition = viewport.scrollTop - listRubberRef.current;
        const desiredScrollTop = currentVisualPosition +
            unityScrollDelta * STORY_CHRONICLE_SHORTCUT_WHEEL_MULTIPLIER;
        const maxScrollTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
        const clampedScrollTop = Math.min(maxScrollTop, Math.max(0, desiredScrollTop));
        let rubber = 0;
        if (desiredScrollTop < 0) {
            rubber =
                getStoryUnityScrollRectRubberDelta(-desiredScrollTop, viewport.clientHeight) * STORY_CHRONICLE_SHORTCUT_WHEEL_RUBBER_SCALE;
        }
        else if (desiredScrollTop > maxScrollTop) {
            rubber =
                -getStoryUnityScrollRectRubberDelta(desiredScrollTop - maxScrollTop, viewport.clientHeight) * STORY_CHRONICLE_SHORTCUT_WHEEL_RUBBER_SCALE;
        }
        viewport.scrollTop = clampedScrollTop;
        viewport.dataset.storyChronicleShortcutMotion = "wheel";
        viewport.dataset.storyChronicleShortcutWheelAxis = useHorizontalAxis
            ? "horizontal"
            : "vertical";
        viewport.dataset.storyChronicleShortcutWheelDelta =
            unityScrollDelta.toFixed(6);
        setShortcutListRubber(viewport, rubber);
    }, [cancelShortcutListMotion, setShortcutListRubber]);
    useEffect(() => {
        const viewport = listScrollRef.current;
        if (!openList || !viewport) {
            cancelShortcutListMotion();
            listRubberRef.current = 0;
            listVelocityRef.current = 0;
            return;
        }
        viewport.scrollTop = 0;
        stopShortcutListMotion(viewport);
        viewport.addEventListener("wheel", handleShortcutListWheel, {
            passive: false,
        });
        return () => viewport.removeEventListener("wheel", handleShortcutListWheel);
    }, [
        cancelShortcutListMotion,
        handleShortcutListWheel,
        openList,
        stopShortcutListMotion,
    ]);
    useEffect(() => {
        if (!openList) {
            return;
        }
        const isEditableTarget = (target: EventTarget | null) => target instanceof HTMLElement &&
            (target.isContentEditable ||
                target.matches("input, select, textarea, [role='textbox']"));
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape") {
                return;
            }
            event.preventDefault();
            event.stopImmediatePropagation();
            if (event.repeat ||
                isEditableTarget(event.target) ||
                isEditableTarget(document.activeElement)) {
                return;
            }
            // STV-CHR-043: the shortcut list is the client stack's topmost Popup.
            // A fresh Cancel closes only that Popup and leaves the map state intact.
            closeShortcutList();
        };
        const handleMouseDown = (event: MouseEvent) => {
            const mouseCancelAction = getStoryMouseCancelAction(event.button, isEditableTarget(event.target) ||
                isEditableTarget(document.activeElement));
            if (mouseCancelAction === "ignore") {
                return;
            }
            event.preventDefault();
            event.stopImmediatePropagation();
            if (mouseCancelAction === "cancel") {
                // Mouse3 is a global hotkey: pointer position inside the map does not
                // narrow delivery once this Popup owns the top of the client stack.
                closeShortcutList();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("mousedown", handleMouseDown, true);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("mousedown", handleMouseDown, true);
        };
    }, [closeShortcutList, openList]);
    useEffect(() => () => {
        cancelShortcutListPointerTracking();
        cancelShortcutListMotion();
    }, [cancelShortcutListMotion, cancelShortcutListPointerTracking]);
    const toggleList = (group: StorylineNode["navigationGroup"]) => {
        cancelShortcutListPointerTracking();
        stopShortcutListMotion();
        // STV-CHR-049: an already-open client Popup only swaps SetData, so its
        // current sort Toggle survives side/supplement category changes.
        const nextList = openList === group ? null : group;
        if (openList === null && nextList !== null) {
            setIsListAscending(true);
        }
        setOpenList(nextList);
        onListOpenChange(nextList !== null);
    };
    return (<div className={styles.safeAreaNavigation} data-story-chronicle-safearea-navigation="STV-CHR-019" data-story-chronicle-safearea-progress="excluded">
      <button type="button" className={styles.safeAreaListButton} style={scaledRect(81.200058, 199, 340, 70)} data-story-chronicle-navigation-action="side" data-story-ui-click-sound="select" aria-expanded={openList === "side"} aria-controls={listId} onClick={(event) => {
            playStoryUiPointerSound(event);
            toggleList("side");
        }}>
        <span className={styles.safeAreaListArtwork} style={{ transform: `scale(${mapScale})` }}>
          <span className={styles.safeAreaListLabel}>외전</span>
          <Image src="/story/map-ui/AB_UI_OPERATION_ICON_SUB_SIDESTORY.png" alt="" width={52} height={32} className={styles.safeAreaListIcon} unoptimized/>
        </span>
      </button>
      <button type="button" className={styles.safeAreaListButton} style={scaledRect(81.200058, 283.700012, 340, 70)} data-story-chronicle-navigation-action="supplement" data-story-ui-click-sound="select" aria-expanded={openList === "supplement"} aria-controls={listId} onClick={(event) => {
            playStoryUiPointerSound(event);
            toggleList("supplement");
        }}>
        <span className={styles.safeAreaListArtwork} style={{ transform: `scale(${mapScale})` }}>
          <span className={styles.safeAreaListLabel}>서플리먼트</span>
          <Image src="/story/map-ui/AB_UI_OPERATION_ICON_SUB_SUPPLEMENT.png" alt="" width={43} height={38} className={styles.safeAreaListIcon} unoptimized/>
        </span>
      </button>

      <button type="button" className={styles.safeAreaShortcut} style={{
            right: 46 * mapScale,
            bottom: 293 * mapScale,
            width: 409 * mapScale,
            height: 80 * mapScale,
        }} data-story-chronicle-navigation-action="seasonal" data-story-chronicle-navigation-label="STV-CHR-050" data-story-ui-click-sound="select" data-story-chronicle-navigation-episode={layout.navigation.seasonalEpisodeId} aria-label="시즈널 레코드 열기" onClick={(event) => {
            playStoryUiPointerSound(event);
            stopShortcutListMotion();
            setOpenList(null);
            onListOpenChange(false);
            onOpenSeasonal();
        }}>
        <span className={styles.safeAreaShortcutArtwork} style={{ transform: `scale(${mapScale})` }}>
          <Image src="/story/map-ui/AB_UI_OPERATION_SUB_BUTTON.png" alt="" width={446} height={189} className={styles.safeAreaShortcutBackground} unoptimized/>
          <Image src="/story/map-ui/AB_UI_OPERATION_ICON_SEASONAL_RECORD.png" alt="" width={35} height={31} className={styles.safeAreaShortcutIcon} unoptimized/>
          <span className={styles.safeAreaShortcutLabel}>시즈널 레코드</span>
        </span>
      </button>
      <Link href={`/story/reader/?episode=${layout.navigation.counterCaseEpisodeId}`} className={styles.safeAreaShortcut} style={{
            right: 46 * mapScale,
            bottom: 190.200012 * mapScale,
            width: 409 * mapScale,
            height: 80 * mapScale,
        }} data-story-chronicle-navigation-action="countercase" data-story-ui-click-sound="select" data-story-chronicle-navigation-episode={layout.navigation.counterCaseEpisodeId} aria-label="카운터 케이스로 이동" onClick={(event) => {
            const isModifiedActivation = event.button !== 0 ||
                event.altKey ||
                event.ctrlKey ||
                event.metaKey ||
                event.shiftKey;
            if (!isModifiedActivation) {
                playStoryUiPointerSound(event);
            }
        }}>
        <span className={styles.safeAreaShortcutArtwork} style={{ transform: `scale(${mapScale})` }}>
          <Image src="/story/map-ui/AB_UI_OPERATION_SUB_BUTTON.png" alt="" width={446} height={189} className={styles.safeAreaShortcutBackground} unoptimized/>
          <Image src="/story/map-ui/AB_UI_OPERATION_ICON_COUNTER_CASE.png" alt="" width={34} height={26} className={styles.safeAreaShortcutIcon} unoptimized/>
          <span className={styles.safeAreaShortcutLabel}>카운터 케이스</span>
        </span>
      </Link>

      {openList ? (<section id={listId} className={styles.safeAreaEpisodeList} style={{
                right: 0,
                top: 0,
                height: `${100 / mapScale}%`,
                "--story-chronicle-shortcut-scale": mapScale,
            } as CSSProperties} role="dialog" data-story-chronicle-navigation-list={openList} data-story-chronicle-navigation-count={listNodes.length} data-story-chronicle-shortcut-shell="STV-CHR-032" data-story-chronicle-shortcut-prefab="AB_UI_POPUP_OPERATION_SUB_SHORTCUT" data-story-chronicle-shortcut-intro="STV-CHR-054" data-story-chronicle-shortcut-intro-clip="AB_UI_OPERATION_UI_SUB_SHORTCUT_INTRO" data-story-chronicle-shortcut-intro-duration-ms="500" data-story-chronicle-shortcut-intro-x="460,0" data-story-chronicle-shortcut-intro-alpha="0,1" data-story-chronicle-shortcut-intro-curve="3u^2-2u^3" data-story-chronicle-shortcut-intro-lifetime="fresh-open-only" aria-labelledby={listTitleId}>
          <span aria-hidden="true" data-story-chronicle-shortcut-background="STV-CHR-054" data-story-chronicle-shortcut-background-slice="4,4,4,4" className={styles.safeAreaEpisodeListBackground}/>
          <header className={styles.safeAreaEpisodeListTop}>
            <strong id={listTitleId} className={styles.safeAreaEpisodeListTitle}>
              {listCategoryName} 바로가기
            </strong>
            <span className={styles.safeAreaEpisodeListSubtitle}>
              에피소드 선택 시 해당 위치로 이동합니다.
            </span>
            <button type="button" className={styles.safeAreaEpisodeListClose} aria-label="목록 닫기" data-story-ui-click-sound="select" onClick={(event) => {
                playStoryUiPointerSound(event);
                closeShortcutList();
            }}>
              <Image src="/story/map-ui/shortcut-shell/AB_UI_OPERATION_ICON_X.png" alt="" width={110} height={110} aria-hidden="true" className={styles.safeAreaEpisodeListCloseIcon} unoptimized/>
            </button>
          </header>
          <button type="button" className={styles.safeAreaEpisodeListSort} aria-label={`정렬: ${isListAscending ? "오름차순" : "내림차순"}`} aria-pressed={isListAscending} data-story-chronicle-shortcut-sort="STV-CHR-034" data-story-chronicle-shortcut-sort-order={isListAscending ? "ascending" : "descending"} data-story-ui-click-sound="select" onClick={(event) => {
                playStoryUiPointerSound(event);
                setIsListAscending((current) => !current);
                if (listScrollRef.current) {
                    stopShortcutListMotion(listScrollRef.current);
                    listScrollRef.current.scrollTop = 0;
                }
            }}>
            <span aria-hidden="true" data-story-chronicle-shortcut-sort-background="STV-CHR-048" data-story-chronicle-shortcut-sort-slice="3,3,3,3" className={styles.safeAreaEpisodeListSortBackground}/>
            <span className={styles.safeAreaEpisodeListSortLabel}>
              {isListAscending ? "오름차순" : "내림차순"}
            </span>
          </button>
          <div ref={listScrollRef} className={styles.safeAreaEpisodeListScroll} data-story-chronicle-shortcut-scrollrect="LIST_ScrollRect" data-story-chronicle-shortcut-scroll-physics="STV-CHR-035" data-story-chronicle-shortcut-scroll-axis="vertical" data-story-chronicle-shortcut-scroll-movement="Elastic" data-story-chronicle-shortcut-scroll-elasticity="0.1" data-story-chronicle-shortcut-scroll-inertia="true" data-story-chronicle-shortcut-scroll-deceleration="0.135" data-story-chronicle-shortcut-scroll-sensitivity="1" data-story-chronicle-shortcut-wheel-multiplier="150" data-story-chronicle-shortcut-wheel-rubber-scale="0.5" data-story-chronicle-shortcut-browser-pixel-tick="120" data-story-chronicle-shortcut-motion="idle" data-story-chronicle-shortcut-rubber-y="0.000" data-story-chronicle-shortcut-raw-boundary="false" {...shortcutListUnityMarkerProps} {...shortcutListPointerProps}>
            <div className={styles.safeAreaEpisodeListScrollContent} data-story-chronicle-shortcut-scroll-content="STV-CHR-035">
              {listNodes.map((node) => (<button key={node.episodeId} type="button" className={styles.safeAreaEpisodeListSlot} data-story-chronicle-navigation-item={node.episodeId} data-story-chronicle-shortcut-slot="STV-CHR-033" data-story-chronicle-shortcut-slot-prefab="AB_UI_POPUP_OPERATION_SUB_SHORTCUT_SLOT" data-story-chronicle-shortcut-slot-bg="AB_UI_OPERATION_DOT" data-story-chronicle-shortcut-selection="STV-CHR-036" data-story-ui-click-sound="select" data-story-chronicle-shortcut-thumbnail={node.shortcutThumbnail?.sprite ?? "hidden"} onClick={(event) => {
                    playStoryUiPointerSound(event);
                    stopShortcutListMotion();
                    onShortcutSelect(node);
                }}>
                  <span className={styles.safeAreaEpisodeListSlotTitle}>
                    {node.titleKo}
                  </span>
                  <strong className={styles.safeAreaEpisodeListSlotName}>
                    {node.subtitleKo}
                  </strong>
                  {node.shortcutThumbnail ? (<Image src={node.shortcutThumbnail.url} alt="" width={70} height={70} aria-hidden="true" className={styles.safeAreaEpisodeListSlotThumbnail} data-story-chronicle-shortcut-thumbnail-image={node.shortcutThumbnail.sprite} unoptimized/>) : null}
                </button>))}
            </div>
          </div>
          <span className={styles.safeAreaEpisodeListScrollbar} data-story-chronicle-shortcut-scrollbar="STV-CHR-034" data-story-chronicle-shortcut-scrollbar-connected="false" data-story-chronicle-shortcut-scrollbar-size="1" aria-hidden="true">
            <Image src="/story/map-ui/shortcut-controls/AB_UI_OPERATION_SCROLL_HORIZONTAL.png" alt="" width={10} height={3} className={styles.safeAreaEpisodeListScrollbarTrack} unoptimized/>
            <Image src="/story/map-ui/shortcut-controls/AB_UI_OPERATION_SCROLL_HORIZONTAL.png" alt="" width={10} height={3} className={styles.safeAreaEpisodeListScrollbarHandle} unoptimized/>
          </span>
        </section>) : null}
    </div>);
}
function StoryChronicleGuide({ scale, onClose, }: {
    scale: number;
    onClose: () => void;
}) {
    const closeRef = useRef<HTMLButtonElement>(null);
    const [page, setPage] = useState(0);
    useEffect(() => {
        closeRef.current?.focus();
    }, []);
    const selectPage = (nextPage: number) => {
        setPage(Math.max(0, Math.min(1, nextPage)));
    };
    return (<div className={styles.detailGuideBackdrop} data-story-chronicle-guide="STV-CHR-031" data-story-chronicle-guide-article="ARTICLE_OPERATION_SIDE_STORY" data-story-chronicle-guide-id="GUIDE_OPERATION_SIDE_STORY">
      <div className={styles.detailGuideCanvas} style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>
        <aside className={styles.detailGuideRail} aria-label="가이드 목록">
          <div className={styles.detailGuideRailTab}>가이드</div>
          <div className={styles.detailGuideRailCategory}>작전</div>
          <div className={styles.detailGuideRailSelection} data-story-chronicle-guide-title="서브스트림">
            서브스트림
          </div>
        </aside>

        <div className={styles.detailGuideScene} role="dialog" aria-modal="true" aria-labelledby="story-chronicle-guide-title" data-story-chronicle-guide-page={page + 1} data-story-chronicle-guide-scene={page === 0
            ? "TUTORIAL_PF_OPERATION_SIDE_STORY_1"
            : "TUTORIAL_PF_OPERATION_SIDE_STORY_2"}>
          <Image key={page} src={`/story/detail-ui/guide/side_story_${page + 1}.png`} alt="" fill sizes="100vw" className={styles.detailGuideSceneImage} unoptimized/>
          {page === 0 ? (<>
              <h3 id="story-chronicle-guide-title" className={styles.detailGuideSceneTitle}>
                서브스트림
              </h3>
              <p className={styles.detailGuideSceneSubtitle}>
                <span>
                  서브스트림은 <mark>외전</mark>과 <mark>서플리먼트</mark>로
                  구성되어 있습니다.
                </span>
              </p>
              <p className={styles.detailGuideSceneDescription}>
                <span>
                  특정 캐릭터의 드라마에 대한 내용을 다루고 있습니다.
                  <br />
                  [외 전]에 편성된 작전들은 <mark>이벤트 전투</mark> 위주로
                  구성됩니다.
                </span>
              </p>
            </>) : (<>
              <h3 id="story-chronicle-guide-title" className={styles.detailGuideSceneTitle}>
                이벤트 전투
              </h3>
              <strong className={styles.detailGuideBattleTitle} style={getChronicleGuideSceneRect(-433, -118, 376.400208, 55.117493)}>
                NPC 슬롯
              </strong>
              <span className={styles.detailGuideBattleNote} style={getChronicleGuideSceneRect(-433, -198.549988, 376.400208, 105.980896)}>
                고정으로 제공되는 유닛
              </span>
              <strong className={styles.detailGuideBattleTitle} style={getChronicleGuideSceneRect(0, -118, 376.400208, 55.117493)}>
                게스트 슬롯
              </strong>
              <span className={styles.detailGuideBattleNote} style={getChronicleGuideSceneRect(0, -198.549988, 376.400208, 105.984726)}>
                제공되는 유닛이지만 보유중인
                <br />
                동일한 유닛으로 교체 가능
              </span>
              <strong className={styles.detailGuideBattleTitle} style={getChronicleGuideSceneRect(436, -118, 376.400208, 55.117493)}>
                카운터 · 솔져 · 메카닉 슬롯
              </strong>
              <span className={styles.detailGuideBattleNote} style={getChronicleGuideSceneRect(436, -198.549988, 376.400208, 105.984726)}>
                특정 계열의
                <br />
                유닛으로 필수 구성
              </span>
              <span className={styles.detailGuideUnitName} style={getChronicleGuideSceneRect(-397.660309, -23.5, 151.838196, 34.620998)}>
                오르카
              </span>
              <span className={styles.detailGuideUnitName} style={getChronicleGuideSceneRect(35.658798, -23.5, 152.286301, 34.620998)}>
                에디 피셔
              </span>
              <span className={styles.detailGuideUnitName} style={getChronicleGuideSceneRect(470.686096, -23.5, 149.731506, 34.620998)}>
                소총병
              </span>
              <span className={`${styles.detailGuideUnitName} ${styles.detailGuideUnitRole}`} style={getChronicleGuideSceneRect(431.200012, 242.199997, 153.725281, 34.620972)}>
                솔저
              </span>
              <p className={styles.detailGuideSceneDescription}>
                <span>
                  특정 유닛들로 구성된 소대를 사용하여 진행되는 전투입니다.
                  <br />
                  이벤트 전투 상황에 따라, <mark>제공되는 유닛을 사용</mark>
                  하거나 <mark>요구되는 유닛을 필수로 구성</mark>해야 합니다.
                </span>
              </p>
            </>)}
        </div>

        <button type="button" className={`${styles.detailGuideArrow} ${styles.detailGuideArrowLeft}`} aria-label="이전 가이드" disabled={page === 0} data-story-ui-click-sound="select" onClick={(event) => {
            playStoryUiPointerSound(event);
            selectPage(page - 1);
        }}>
          <Image src="/story/detail-ui/guide/popup_arrow.png" alt="" width={46} height={104} unoptimized/>
        </button>
        <button type="button" className={`${styles.detailGuideArrow} ${styles.detailGuideArrowRight}`} aria-label="다음 가이드" disabled={page === 1} data-story-ui-click-sound="select" onClick={(event) => {
            playStoryUiPointerSound(event);
            selectPage(page + 1);
        }}>
          <Image src="/story/detail-ui/guide/popup_arrow.png" alt="" width={46} height={104} unoptimized/>
        </button>
        <div className={styles.detailGuideDots} aria-label={`${page + 1} / 2`}>
          {[0, 1].map((dot) => (<button key={dot} type="button" aria-label={`${dot + 1}번 가이드`} aria-current={dot === page ? "page" : undefined} data-active={dot === page} onClick={() => selectPage(dot)}/>))}
        </div>
        <button ref={closeRef} type="button" className={styles.detailGuideClose} aria-label="가이드 닫기" data-story-ui-click-sound="select" onClick={(event) => {
            playStoryUiPointerSound(event);
            onClose();
        }}>
          <Image src="/story/detail-ui/guide/popup_close.png" alt="" width={110} height={110} unoptimized/>
        </button>
      </div>
    </div>);
}
function StoryDetail({ node, relatedNodes, onClose, onOpenReader, }: {
    node: SelectableStory;
    relatedNodes: SelectableStory[];
    onClose: () => void;
    onOpenReader: () => void;
}) {
    const panelRef = useRef<HTMLDivElement>(null);
    const [detailScale, setDetailScale] = useState(1);
    const [isRelatedOpen, setIsRelatedOpen] = useState(false);
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        const panel = panelRef.current;
        const updateScale = () => {
            if (!panel) {
                return;
            }
            const rect = panel.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) {
                return;
            }
            setDetailScale(Math.min(rect.width / STORY_CHRONICLE_REFERENCE_WIDTH, rect.height / STORY_CHRONICLE_REFERENCE_HEIGHT));
        };
        document.body.style.overflow = "hidden";
        panel?.focus();
        updateScale();
        const resizeObserver = new ResizeObserver(updateScale);
        if (panel) {
            resizeObserver.observe(panel);
        }
        return () => {
            resizeObserver.disconnect();
            document.body.style.overflow = previousOverflow;
        };
    }, []);
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (isGuideOpen) {
                if (event.key === "Escape") {
                    event.preventDefault();
                    setIsGuideOpen(false);
                }
                return;
            }
            if (event.key === "F1") {
                // STV-CHR-031: Information(9) calls OnInformationButton directly, so
                // the hotkey opens the guide without the StateButton click sound.
                event.preventDefault();
                setIsGuideOpen(true);
                return;
            }
            if (event.key === "Escape") {
                // STV-CHR-018: Escape follows the same popup-only close lifetime as
                // the Back button; page unmount and episode switches still stop it.
                event.preventDefault();
                onClose();
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
            if (mouseCancelAction !== "cancel") {
                return;
            }
            // STV-RDR-006: the Guide popup is above the Chronicle detail viewer.
            // A fresh Mouse3 edge closes exactly one of those client stack levels.
            if (isGuideOpen) {
                setIsGuideOpen(false);
                return;
            }
            onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("mousedown", handleMouseDown, true);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("mousedown", handleMouseDown, true);
        };
    }, [isGuideOpen, onClose]);
    return (<div className={styles.detailBackdrop} data-story-mouse3-cancel="STV-RDR-006" data-story-mouse3-cancel-level={isGuideOpen ? "guide" : "detail"}>
      <div ref={panelRef} className={styles.detailPanel} data-story-chronicle-detail-surface="STV-CHR-003" data-story-chronicle-detail-intro="STV-CHR-023" data-story-chronicle-detail-intro-episode={node.episodeId} data-story-chronicle-detail-intro-duration="1000" role="dialog" aria-modal="true" aria-labelledby="story-detail-title" tabIndex={-1}>
        <div className={styles.detailArtwork}>
          {node.detailImageUrl ? (<div key={node.detailImageUrl} className={styles.detailArtworkFrame} data-story-chronicle-detail-artwork-aspect="STV-CHR-047" data-story-chronicle-detail-artwork-fit="EnvelopeParent-16:9" data-story-chronicle-detail-artwork-final-scale="0.8">
              <Image src={node.detailImageUrl} alt={`${node.subtitleKo} 상세 배경`} fill sizes="100vw" className={styles.detailArtworkImage} unoptimized/>
            </div>) : null}
        </div>
        {/* STV-CHR-014: source Vignette children precede the additive Glow sibling. */}
        <div aria-hidden="true" data-story-chronicle-detail-composite="STV-CHR-014" data-story-detail-scale={detailScale.toFixed(6)} className={styles.detailComposite}>
          <div data-story-detail-layer="vignette-base" className={styles.detailVignetteBase}>
            <Image src="/story/detail-ui/AB_UI_OPERATION_BG_SUB_VIGNETTE_02.png" alt="" fill sizes="100vw" className={styles.detailCompositeImage} unoptimized/>
          </div>
          <div data-story-detail-layer="vignette-inner" className={styles.detailVignetteInner} style={{
            inset: `${(-338.282715 / 2) * detailScale}px ${(-727.346191 / 2) * detailScale}px`,
        }}/>
          <div data-story-detail-layer="gradient-bottom" className={styles.detailGradient} style={{
            top: `${827.943634 * detailScale}px`,
            right: `${(-892.713379 / 2) * detailScale}px`,
            bottom: `${-95.356049 * detailScale}px`,
            left: `${(-892.713379 / 2) * detailScale}px`,
            borderWidth: `${184 * detailScale}px ${3 * detailScale}px ${3 * detailScale}px`,
            opacity: 0.945098,
        }}/>
          <div data-story-detail-layer="gradient-top" className={`${styles.detailGradient} ${styles.detailGradientFlipped}`} style={{
            top: `${-141.682373 * detailScale}px`,
            right: `${(-892.713379 / 2) * detailScale}px`,
            bottom: `${858.712646 * detailScale}px`,
            left: `${(-892.713379 / 2) * detailScale}px`,
            borderWidth: `${184 * detailScale}px ${3 * detailScale}px ${3 * detailScale}px`,
        }}/>
          <div data-story-detail-layer="glow" data-story-detail-blend="MAT_NKC_ADD" className={styles.detailGlow} style={{
            bottom: `${-440.136658 * detailScale}px`,
            width: `${2913.357422 * detailScale}px`,
            height: `${746.219971 * detailScale}px`,
        }}>
            <Image src="/story/detail-ui/AB_UI_OPERATION_ADDITIVE.png" alt="" fill sizes="100vw" className={styles.detailGlowImage} unoptimized/>
          </div>
        </div>

        <header className={upsideStyles.operationHeader} data-story-chronicle-upside-menu="STV-CHR-015" data-story-chronicle-upside-mode="LeftsideWithHamburger" style={{
            "--operation-header-bg": `url("${deploymentUrl("/story/reader/ui/nkm_ui_upside_menu_bg_gradient.png")}")`,
        } as CSSProperties}>
          <button type="button" className={upsideStyles.operationBack} data-story-chronicle-upside-input="back" data-story-ui-click-sound="back" aria-label="연대기 지도로 돌아가기" title="연대기 지도로 돌아가기" onClick={(event) => {
            playStoryUiPointerSound(event, "back");
            onClose();
        }}>
            <Image src="/story/reader/ui/nkm_ui_upside_menu_button_back.png" alt="" width={232} height={70} unoptimized/>
          </button>
          <Link href="/" className={upsideStyles.operationHome} data-story-chronicle-upside-input="home" data-story-ui-click-sound="home" aria-label="홈으로 이동" title="홈" onClick={(event) => {
            const isModifiedActivation = event.button !== 0 ||
                event.altKey ||
                event.ctrlKey ||
                event.metaKey ||
                event.shiftKey;
            if (!isModifiedActivation) {
                playStoryUiPointerSound(event, "home");
            }
        }}>
            <Image src="/story/reader/ui/nkm_ui_upside_menu_button_home.png" alt="" width={102} height={70} unoptimized/>
          </Link>
          <button type="button" className={styles.detailGuideButton} data-story-chronicle-guide-input="button" data-story-ui-click-sound="select" aria-label="서브스트림 가이드 열기" title="가이드 (F1)" onClick={(event) => {
            playStoryUiPointerSound(event);
            setIsGuideOpen(true);
        }}>
            <Image src="/story/detail-ui/guide/upside_info.png" alt="" width={50} height={50} unoptimized/>
          </button>
        </header>

        <div className={styles.detailSafeArea} data-story-chronicle-detail-safearea="STV-CHR-021" data-story-detail-safearea-scale={detailScale.toFixed(6)} style={{
            transform: `translate(-50%, -50%) scale(${detailScale})`,
        }}>
          {node.bgmTitleKo ? (<div className={styles.detailBgm} data-story-detail-rect="bgm">
            <Image src="/story/detail-ui/AB_UI_OPERATION_SUB_ICON_BGM.png" alt="" width={22} height={24} className={styles.detailBgmIcon} unoptimized/>
            <span>{node.bgmTitleKo}</span>
            </div>) : null}

          {relatedNodes.length > 0 ? (<div className={styles.detailRelated} data-story-detail-rect="related" data-story-chronicle-related-audit="STV-CHR-004" data-story-chronicle-related-surface="STV-CHR-017" data-story-chronicle-related-state={isRelatedOpen ? "ON" : "OFF"}>
            <button type="button" className={styles.detailRelatedToggle} data-story-chronicle-related-toggle="STV-CHR-017" data-story-chronicle-related-keyboard="Enter Space" data-story-ui-click-sound="select" aria-expanded={isRelatedOpen} aria-controls={`story-related-list-${node.episodeId}`} onClick={(event) => {
                playStoryUiPointerSound(event);
                setIsRelatedOpen((current) => !current);
            }}>
              <Image src="/story/detail-ui/AB_UI_OPERATION_ICON_CONNECT.png" alt="" width={41} height={16} className={styles.detailRelatedIcon} unoptimized/>
              <span className={styles.detailRelatedLabel}>연관 에피소드</span>
              <span className={styles.detailRelatedDeco} aria-hidden="true">
                <Image src="/story/detail-ui/AB_UI_OPERATION_ICON_ARROW_02.png" alt="" width={24} height={14} className={styles.detailRelatedArrow} unoptimized/>
              </span>
            </button>
            {isRelatedOpen ? (<div id={`story-related-list-${node.episodeId}`} role="list" data-story-chronicle-related-list="STV-CHR-016" data-story-chronicle-related-source={node.episodeId} data-story-chronicle-related-scroll="STV-CHR-017" data-story-chronicle-related-read-only="true" data-story-chronicle-related-scroll-input="intentionally-unreachable:STV-CHR-039" data-story-chronicle-related-candidate-scope="direct-plus-seasonal:STV-CHR-042" className={styles.detailRelatedList}>
                {relatedNodes.map((relatedNode) => (<div key={relatedNode.episodeId} role="listitem" data-story-chronicle-related-id={relatedNode.episodeId} className={styles.detailRelatedItem}>
                    <span>{relatedNode.categoryKo}</span>
                    <strong>{relatedNode.subtitleKo}</strong>
                  </div>))}
              </div>) : null}
            </div>) : null}

          <div className={styles.detailContent}>
            <div className={styles.detailHeading} data-story-detail-rect="left">
              <p className={styles.detailTitle} data-story-detail-text="title">
                {node.titleKo}
              </p>
              <h2 id="story-detail-title" className={styles.detailSubtitle} data-story-detail-text="subtitle">
                {node.subtitleKo}
              </h2>
            </div>

            <div className={styles.detailBottom} data-story-detail-rect="description">
              <p className={styles.detailDescription} data-story-detail-text="description">
                {node.descriptionKo}
              </p>
            </div>

            <Link href={`/story/reader/?episode=${node.episodeId}`} className={styles.detailAction} data-story-detail-rect="enter" data-story-chronicle-detail-enter="STV-CHR-022" data-story-chronicle-detail-enter-keyboard="Enter" data-story-ui-click-sound="select" onClick={(event) => {
            const isModifiedActivation = event.button !== 0 ||
                event.altKey ||
                event.ctrlKey ||
                event.metaKey ||
                event.shiftKey;
            if (!isModifiedActivation) {
                playStoryUiPointerSound(event);
            }
            onOpenReader();
        }}>
              <Image src="/story/reader/ui/ab_ui_operation_button_enter.png" alt="" width={510} height={128} className={styles.detailActionArtwork} unoptimized/>
              <span>진입하기</span>
            </Link>
          </div>
        </div>
        {isGuideOpen ? (<StoryChronicleGuide scale={detailScale} onClose={() => setIsGuideOpen(false)}/>) : null}
      </div>
    </div>);
}
export default function StorylineMap({ layout, }: {
    layout: StorylineLayout;
}) {
    const router = useRouter();
    const viewportRef = useRef<HTMLDivElement>(null);
    const mapShellRef = useRef<HTMLDivElement>(null);
    const mapScrollbarRef = useRef<HTMLDivElement>(null);
    const mapScrollbarHandleRef = useRef<HTMLDivElement>(null);
    const preserveThemeOnUnmountRef = useRef(false);
    const themeCleanupTimerRef = useRef<number | null>(null);
    const chronicleMotionFrameRef = useRef<number | null>(null);
    const chronicleHotkeyFrameRef = useRef<number | null>(null);
    const chronicleHotkeyCodesRef = useRef(new Set<string>());
    const chronicleRubberRef = useRef(0);
    const chronicleVelocityRef = useRef(0);
    const shortcutFocusRunRef = useRef(0);
    const seasonalReturnConsumptionRef = useRef<{
        requestedState: StorySeasonalReturnState | null;
        historyReturnToken: string;
    } | null>(null);
    const seasonalReturnConsumedRef = useRef(false);
    const operationReturnFadeRequestRef = useRef<StoryOperationReturnFadeRequest | null | undefined>(undefined);
    const operationReturnFadeElementRef = useRef<HTMLDivElement>(null);
    const operationReturnFadeActiveRef = useRef(false);
    const operationReturnFadeTimerRef = useRef<number | null>(null);
    const operationReturnFadeHistoryReleasePendingRef = useRef(new Set<number>());
    const storyMouseCancelHistoryReleasePendingRef = useRef(new Set<number>());
    const [isDragging, setIsDragging] = useState(false);
    const [isNavigationListOpen, setIsNavigationListOpen] = useState(false);
    const [showChronicleScrollHotkeys, setShowChronicleScrollHotkeys] = useState(false);
    const [chronicleScrollHotkeyOpenRun, setChronicleScrollHotkeyOpenRun] = useState(0);
    const [seasonalViewerEpisodeId, setSeasonalViewerEpisodeId] = useState<number | null>(null);
    const [seasonalViewerLastEpisodeId, setSeasonalViewerLastEpisodeId] = useState<number | null>(null);
    const [seasonalViewerReturnState, setSeasonalViewerReturnState] = useState<StorySeasonalReturnState | null>(null);
    const [isOmenViewerOpen, setIsOmenViewerOpen] = useState(false);
    const [selectedNode, setSelectedNode] = useState<SelectableStory | null>(null);
    const [shortcutFocusRuns, setShortcutFocusRuns] = useState<Record<number, number>>({});
    const [mapViewportMetrics, setMapViewportMetrics] = useState<MapViewportMetrics>({
        width: 0,
        height: 0,
        scale: 1,
    });
    const [commonAudioPreloadState, setCommonAudioPreloadState] = useState<StoryCommonAudioPreloadState>({
        status: "loading",
        total: STORY_COMMON_UI_SOUND_PATHS.length,
        failed: 0,
    });
    const mapScale = mapViewportMetrics.scale;
    const isChronicleMapTopmost = !selectedNode &&
        !isNavigationListOpen &&
        seasonalViewerEpisodeId === null &&
        !isOmenViewerOpen;
    useEffect(() => {
        let active = true;
        preloadStoryChronicleShortcutFocusTextures();
        // STV-AUD-003: start the exact four-source preload in the background. The
        // retained cache intentionally survives this component's route unmount.
        void preloadStoryCommonUiAudio()
            .then((report) => {
            if (!active) {
                return;
            }
            setCommonAudioPreloadState({
                status: report.failed === 0
                    ? "ready"
                    : report.failed === report.total
                        ? "failed"
                        : "partial",
                total: report.total,
                failed: report.failed,
            });
        })
            .catch(() => {
            if (!active) {
                return;
            }
            setCommonAudioPreloadState({
                status: "failed",
                total: STORY_COMMON_UI_SOUND_PATHS.length,
                failed: STORY_COMMON_UI_SOUND_PATHS.length,
            });
        });
        return () => {
            active = false;
        };
    }, []);
    const setChronicleRubber = useCallback((viewport: HTMLElement, rubber: number) => {
        chronicleRubberRef.current = rubber;
        viewport.style.setProperty("--story-chronicle-rubber-x", `${rubber}px`);
        viewport.dataset.storyChronicleRubberX = rubber.toFixed(3);
        syncChronicleScrollbar(viewport, mapScrollbarRef.current, mapScrollbarHandleRef.current, rubber);
    }, []);
    const cancelChronicleMotion = useCallback(() => {
        if (chronicleMotionFrameRef.current !== null) {
            window.cancelAnimationFrame(chronicleMotionFrameRef.current);
            chronicleMotionFrameRef.current = null;
        }
    }, []);
    const stopChronicleMotion = useCallback((viewport: HTMLElement | null = viewportRef.current) => {
        cancelChronicleMotion();
        chronicleVelocityRef.current = 0;
        if (viewport) {
            viewport.dataset.storyChronicleMotion = "idle";
            viewport.dataset.storyChronicleRawBoundary = "false";
            viewport.dataset.storyUnityScrollrectVelocity = "0.000";
            setChronicleRubber(viewport, 0);
        }
        else {
            chronicleRubberRef.current = 0;
        }
    }, [cancelChronicleMotion, setChronicleRubber]);
    const startChronicleReleaseMotion = useCallback((viewport: HTMLElement, initialVelocity: number) => {
        cancelChronicleMotion();
        chronicleVelocityRef.current = initialVelocity;
        let lastTime = performance.now();
        const update = (currentTime: number) => {
            const deltaTime = Math.max((currentTime - lastTime) / 1000, 0);
            lastTime = currentTime;
            const frame = getStoryUnityScrollRectReleaseFrame({
                visualPosition: viewport.scrollLeft - chronicleRubberRef.current,
                maximum: viewport.scrollWidth - viewport.clientWidth,
                velocity: chronicleVelocityRef.current,
                deltaTime,
                minimumVelocity: Math.max(mapScale, Number.EPSILON),
            });
            chronicleVelocityRef.current = frame.velocity;
            viewport.dataset.storyUnityScrollrectVelocity = frame.velocity.toFixed(3);
            viewport.scrollLeft = frame.scrollPosition;
            viewport.dataset.storyChronicleMotion = frame.motion;
            viewport.dataset.storyChronicleRawBoundary = String(frame.motion === "inertia-boundary");
            if (frame.motion === "inertia-boundary") {
                viewport.dataset.storyUnityScrollrectRawBoundaryObserved = "true";
            }
            setChronicleRubber(viewport, frame.rubber);
            if (frame.motion === "idle" ||
                (frame.motion === "elastic" &&
                    Math.abs(frame.rubber) <= 0.05 &&
                    Math.abs(frame.velocity) <= mapScale)) {
                stopChronicleMotion(viewport);
                return;
            }
            chronicleMotionFrameRef.current = window.requestAnimationFrame(update);
        };
        chronicleMotionFrameRef.current = window.requestAnimationFrame(update);
    }, [cancelChronicleMotion, mapScale, setChronicleRubber, stopChronicleMotion]);
    const getChroniclePointerVisualPosition = useCallback((viewport: HTMLDivElement) => viewport.scrollLeft - chronicleRubberRef.current, []);
    const applyChronicleDragPosition = useCallback((viewport: HTMLDivElement, desiredVisualPosition: number) => {
        const frame = getStoryUnityScrollRectDragFrame(desiredVisualPosition, viewport.scrollWidth - viewport.clientWidth, viewport.clientWidth);
        viewport.scrollLeft = frame.scrollPosition;
        viewport.dataset.storyChronicleMotion = "drag";
        viewport.dataset.storyChronicleRawBoundary = "false";
        setChronicleRubber(viewport, frame.rubber);
    }, [setChronicleRubber]);
    const handleChronicleDragStart = useCallback((viewport: HTMLDivElement) => {
        viewport.dataset.storyChronicleMotion = "drag";
        viewport.dataset.storyChronicleRawBoundary = "false";
        setIsDragging(true);
    }, []);
    const handleChronicleDragEnd = useCallback((viewport: HTMLDivElement, velocity: number) => {
        setIsDragging(false);
        startChronicleReleaseMotion(viewport, velocity);
    }, [startChronicleReleaseMotion]);
    const { cancelPointerTracking: cancelChroniclePointerTracking, markerProps: chronicleUnityMarkerProps, pointerProps: chroniclePointerProps, } = useStoryUnityScrollRectPointer({
        enabled: isChronicleMapTopmost,
        axis: "horizontal",
        viewportRef,
        velocityRef: chronicleVelocityRef,
        getVisualPosition: getChroniclePointerVisualPosition,
        applyDragPosition: applyChronicleDragPosition,
        cancelReleaseMotion: cancelChronicleMotion,
        allowPointerStart: isChronicleEmptyMapPointerTarget,
        onDragStart: handleChronicleDragStart,
        onDragEnd: handleChronicleDragEnd,
    });
    const selectStoryNode = (node: SelectableStory) => {
        preserveThemeOnUnmountRef.current = false;
        stopStoryTheme();
        setSelectedNode(node);
        if (!node.bgmPath) {
            return;
        }
        playStoryTheme(node.bgmPath);
    };
    const clearShortcutFocusRun = useCallback((episodeId: number, completedRun: number) => {
        setShortcutFocusRuns((current) => {
            if (current[episodeId] !== completedRun)
                return current;
            const next = { ...current };
            delete next[episodeId];
            return next;
        });
    }, []);
    const focusStoryNodeFromShortcut = (node: StorylineNode) => {
        const viewport = viewportRef.current;
        if (!viewport) {
            return;
        }
        shortcutFocusRunRef.current += 1;
        const focusRun = shortcutFocusRunRef.current;
        setShortcutFocusRuns((current) => ({
            ...current,
            [node.episodeId]: focusRun,
        }));
        cancelChroniclePointerTracking();
        stopChronicleMotion(viewport);
        chronicleHotkeyCodesRef.current.clear();
        setIsDragging(false);
        const sourceRange = STORY_CHRONICLE_SHORTCUT_LAST_EPISODE_X -
            STORY_CHRONICLE_SHORTCUT_FIRST_EPISODE_X;
        const normalizedTarget = Math.min(1, Math.max(0, (node.unity.anchoredPosition.x -
            STORY_CHRONICLE_SHORTCUT_FIRST_EPISODE_X) /
            sourceRange));
        const maxScrollLeft = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
        const startScrollLeft = viewport.scrollLeft;
        const targetScrollLeft = normalizedTarget * maxScrollLeft;
        const startTime = performance.now();
        viewport.dataset.storyChronicleShortcutFocusRoute = "STV-CHR-036";
        viewport.dataset.storyChronicleShortcutFocusEpisode = String(node.episodeId);
        viewport.dataset.storyChronicleShortcutFocusRun = String(focusRun);
        viewport.dataset.storyChronicleShortcutFocusNormalized =
            normalizedTarget.toFixed(9);
        viewport.dataset.storyChronicleShortcutFocusTarget =
            targetScrollLeft.toFixed(3);
        viewport.dataset.storyChronicleShortcutFocusDuration = String(STORY_CHRONICLE_SHORTCUT_TWEEN_DURATION_MS);
        viewport.dataset.storyChronicleMotion = "shortcut";
        const update = (currentTime: number) => {
            const progress = Math.min(1, Math.max(0, (currentTime - startTime) /
                STORY_CHRONICLE_SHORTCUT_TWEEN_DURATION_MS));
            // DOTween's source default ease is value 6 (OutQuad).
            const easedProgress = 1 - (1 - progress) * (1 - progress);
            viewport.scrollLeft =
                startScrollLeft +
                    (targetScrollLeft - startScrollLeft) * easedProgress;
            if (progress < 1) {
                chronicleMotionFrameRef.current = window.requestAnimationFrame(update);
                return;
            }
            viewport.scrollLeft = targetScrollLeft;
            viewport.dataset.storyChronicleMotion = "idle";
            chronicleMotionFrameRef.current = null;
        };
        chronicleMotionFrameRef.current = window.requestAnimationFrame(update);
    };
    const closeStoryDetail = () => {
        // STV-CHR-018: the original popup only hides itself, so Back keeps the
        // currently playing episode theme alive until the story page is left or
        // another episode is selected.
        preserveThemeOnUnmountRef.current = false;
        setSelectedNode(null);
    };
    const openStoryReader = () => {
        preserveThemeOnUnmountRef.current = true;
    };
    const chronicleSelectableStories: Array<StorylineNode | StorylineMainEpisode> = [
        ...layout.nodes,
        ...layout.mainEpisodes,
    ];
    const seasonalRelatedStories: SelectableStory[] = [
        ...chronicleSelectableStories,
        ...layout.seasonalEpisodes,
        ...layout.omenEpisodes,
    ];
    const selectableStoryByEpisodeId = new Map(seasonalRelatedStories.map((story) => [story.episodeId, story]));
    const relatedNodes = selectedNode
        ? [...new Set(selectedNode.connectEpisodeIds)]
            .sort((left, right) => left - right)
            .map((episodeId) => selectableStoryByEpisodeId.get(episodeId))
            .filter((candidate): candidate is SelectableStory => Boolean(candidate))
        : [];
    const contentWidth = Math.max(layout.metadata.canvas.width, ...layout.nodes.map((node) => node.web.left + node.web.width), ...layout.mainEpisodes.map((episode) => episode.web.left + episode.web.width), ...layout.lineRenderers.flatMap((line) => line.webPoints.map((point) => point.x)));
    const screenBackground = layout.screenLayers.background;
    const screenVignette = layout.screenLayers.vignette;
    const mapAreaDecoration = layout.screenLayers.mapAreaDecoration;
    useLayoutEffect(() => {
        const viewport = viewportRef.current;
        if (!viewport) {
            return;
        }
        const updateScale = () => {
            const width = viewport.clientWidth;
            const height = viewport.clientHeight;
            const scale = Math.min(width / STORY_CHRONICLE_REFERENCE_WIDTH, height / STORY_CHRONICLE_REFERENCE_HEIGHT);
            if (width <= 0 || height <= 0 || !Number.isFinite(scale)) {
                return;
            }
            setMapViewportMetrics((current) => current.width === width &&
                current.height === height &&
                current.scale === scale
                ? current
                : { width, height, scale });
        };
        updateScale();
        const resizeObserver = new ResizeObserver(updateScale);
        resizeObserver.observe(viewport);
        return () => resizeObserver.disconnect();
    }, [layout.metadata.canvas.height, layout.metadata.canvas.width]);
    useLayoutEffect(() => {
        if (operationReturnFadeRequestRef.current === undefined) {
            operationReturnFadeRequestRef.current =
                parseStoryOperationReturnFadeRequest(window.sessionStorage.getItem(STORY_OPERATION_RETURN_FADE_STORAGE_KEY));
            window.sessionStorage.removeItem(STORY_OPERATION_RETURN_FADE_STORAGE_KEY);
        }
        const pendingReturnFade = operationReturnFadeRequestRef.current;
        const shell = mapShellRef.current;
        const overlay = operationReturnFadeElementRef.current;
        if (!pendingReturnFade || !shell || !overlay) {
            return;
        }
        // Mutate the dedicated fade surface during layout instead of deferring a
        // React state update. This covers the first visible OperationV2 frame and
        // starts the .1 timer only after the blocking overlay itself is active.
        operationReturnFadeActiveRef.current = true;
        operationReturnFadeHistoryReleasePendingRef.current.add(3);
        operationReturnFadeHistoryReleasePendingRef.current.add(4);
        shell.dataset.storyOperationReturnFadeActive = "true";
        overlay.dataset.storyOperationReturnFade = pendingReturnFade.trackerId;
        overlay.dataset.storyOperationReturnFadePhase = "in";
        overlay.dataset.storyOperationReturnFadeMs = String(pendingReturnFade.fadeInMs);
        overlay.classList.add(styles.operationReturnFadeActive);
        operationReturnFadeTimerRef.current = window.setTimeout(() => {
            operationReturnFadeActiveRef.current = false;
            shell.dataset.storyOperationReturnFadeActive = "false";
            delete overlay.dataset.storyOperationReturnFade;
            delete overlay.dataset.storyOperationReturnFadePhase;
            delete overlay.dataset.storyOperationReturnFadeMs;
            overlay.classList.remove(styles.operationReturnFadeActive);
            operationReturnFadeTimerRef.current = null;
        }, pendingReturnFade.fadeInMs);
        return () => {
            if (operationReturnFadeTimerRef.current !== null) {
                window.clearTimeout(operationReturnFadeTimerRef.current);
                operationReturnFadeTimerRef.current = null;
            }
            operationReturnFadeActiveRef.current = false;
            shell.dataset.storyOperationReturnFadeActive = "false";
            delete overlay.dataset.storyOperationReturnFade;
            delete overlay.dataset.storyOperationReturnFadePhase;
            delete overlay.dataset.storyOperationReturnFadeMs;
            overlay.classList.remove(styles.operationReturnFadeActive);
        };
    }, []);
    useLayoutEffect(() => {
        const pendingHistoryReleaseButtons = storyMouseCancelHistoryReleasePendingRef.current;
        const suppressStoryMouseCancelHistoryTail = (event: MouseEvent) => {
            if (getStoryMouseCancelAction(event.button, false) === "ignore") {
                return;
            }
            if (event.type === "mousedown") {
                const target = event.target;
                const isScopedTarget = target instanceof Element &&
                    Boolean(target.closest('[data-story-mouse3-cancel="STV-RDR-006"], [data-story-chronicle-shortcut-cancel="STV-CHR-043"]'));
                if (!isScopedTarget) {
                    pendingHistoryReleaseButtons.delete(event.button);
                    return;
                }
                // The detail/seasonal/shortcut child owns the one-step Cancel callback.
                // This parent survives child unmount and owns only the history tail.
                event.preventDefault();
                pendingHistoryReleaseButtons.add(event.button);
                return;
            }
            if (!pendingHistoryReleaseButtons.has(event.button)) {
                return;
            }
            event.preventDefault();
            if (event.type === "auxclick") {
                pendingHistoryReleaseButtons.delete(event.button);
            }
        };
        const clearStoryMouseCancelHistoryTail = () => {
            pendingHistoryReleaseButtons.clear();
        };
        window.addEventListener("mousedown", suppressStoryMouseCancelHistoryTail, true);
        window.addEventListener("mouseup", suppressStoryMouseCancelHistoryTail, true);
        window.addEventListener("auxclick", suppressStoryMouseCancelHistoryTail, true);
        window.addEventListener("blur", clearStoryMouseCancelHistoryTail);
        return () => {
            window.removeEventListener("mousedown", suppressStoryMouseCancelHistoryTail, true);
            window.removeEventListener("mouseup", suppressStoryMouseCancelHistoryTail, true);
            window.removeEventListener("auxclick", suppressStoryMouseCancelHistoryTail, true);
            window.removeEventListener("blur", clearStoryMouseCancelHistoryTail);
            pendingHistoryReleaseButtons.clear();
        };
    }, []);
    useLayoutEffect(() => {
        const pendingHistoryReleaseButtons = operationReturnFadeHistoryReleasePendingRef.current;
        const blockOperationReturnFadeKey = (event: KeyboardEvent) => {
            if (!operationReturnFadeActiveRef.current) {
                return;
            }
            // NKCUIManager ignores Back/hotkey input while the global fade is not
            // finished. Capture before the map, restored seasonal viewer, or popup
            // listeners so the first OperationV2 frame cannot move or close anything.
            event.preventDefault();
            event.stopImmediatePropagation();
        };
        const blockOperationReturnFadeHistoryMouse = (event: MouseEvent) => {
            if (event.button !== 3 && event.button !== 4) {
                return;
            }
            // STV-MAP-061/STV-MAP-062: a direct route can unmount the Reader
            // between XBUTTON mousedown and mouseup/auxclick. Keep the browser's
            // native history action suppressed on the parent global-fade surface,
            // where the client ignores all hotkeys until FadeIn has finished.
            if (event.type === "mousedown" && !operationReturnFadeActiveRef.current) {
                pendingHistoryReleaseButtons.delete(event.button);
                return;
            }
            if (!operationReturnFadeActiveRef.current &&
                !pendingHistoryReleaseButtons.has(event.button)) {
                return;
            }
            event.preventDefault();
            event.stopImmediatePropagation();
            if (event.type === "mousedown") {
                pendingHistoryReleaseButtons.add(event.button);
            }
            else if (event.type === "auxclick") {
                pendingHistoryReleaseButtons.delete(event.button);
            }
        };
        window.addEventListener("keydown", blockOperationReturnFadeKey, true);
        window.addEventListener("keyup", blockOperationReturnFadeKey, true);
        window.addEventListener("mousedown", blockOperationReturnFadeHistoryMouse, true);
        window.addEventListener("mouseup", blockOperationReturnFadeHistoryMouse, true);
        window.addEventListener("auxclick", blockOperationReturnFadeHistoryMouse, true);
        return () => {
            window.removeEventListener("keydown", blockOperationReturnFadeKey, true);
            window.removeEventListener("keyup", blockOperationReturnFadeKey, true);
            window.removeEventListener("mousedown", blockOperationReturnFadeHistoryMouse, true);
            window.removeEventListener("mouseup", blockOperationReturnFadeHistoryMouse, true);
            window.removeEventListener("auxclick", blockOperationReturnFadeHistoryMouse, true);
            pendingHistoryReleaseButtons.clear();
        };
    }, []);
    useLayoutEffect(() => {
        if (seasonalReturnConsumedRef.current) {
            return;
        }
        let active = true;
        seasonalReturnConsumptionRef.current ??= {
            requestedState: parseStorySeasonalReturnState(window.sessionStorage.getItem(STORY_SEASONAL_RETURN_STORAGE_KEY)),
            historyReturnToken: typeof window.history.state?.[STORY_SEASONAL_RETURN_HISTORY_KEY] ===
                "string"
                ? window.history.state[STORY_SEASONAL_RETURN_HISTORY_KEY]
                : "",
        };
        const pendingReturn = seasonalReturnConsumptionRef.current;
        // Strict Effects의 첫 cleanup 뒤에도 읽은 token을 ref에 보존한다. 실제로
        // 살아 있는 setup의 microtask만 storage를 소비하고 다음 paint 전에 UnHide한다.
        window.queueMicrotask(() => {
            if (!active || seasonalReturnConsumedRef.current) {
                return;
            }
            seasonalReturnConsumedRef.current = true;
            window.sessionStorage.removeItem(STORY_SEASONAL_RETURN_STORAGE_KEY);
            clearStorySeasonalReturnHistoryToken();
            const requestedSeasonalState = pendingReturn.requestedState;
            if (requestedSeasonalState &&
                requestedSeasonalState.returnToken ===
                    pendingReturn.historyReturnToken &&
                layout.seasonalEpisodes.some((episode) => episode.episodeId === requestedSeasonalState.episodeId)) {
                setSeasonalViewerReturnState(requestedSeasonalState);
                setSeasonalViewerLastEpisodeId(requestedSeasonalState.episodeId);
                setSeasonalViewerEpisodeId(requestedSeasonalState.episodeId);
            }
        });
        return () => {
            active = false;
        };
    }, [layout.seasonalEpisodes]);
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (operationReturnFadeActiveRef.current) {
                event.preventDefault();
                return;
            }
            const target = event.target;
            if (target instanceof HTMLElement &&
                (target.isContentEditable ||
                    target.matches("input, select, textarea, [role='textbox']"))) {
                return;
            }
            if (event.code === "AltLeft" &&
                isChronicleMapTopmost &&
                !event.repeat) {
                setShowChronicleScrollHotkeys(true);
                setChronicleScrollHotkeyOpenRun((current) => current + 1);
            }
        };
        const handleKeyUp = (event: KeyboardEvent) => {
            if (event.code === "AltLeft") {
                setShowChronicleScrollHotkeys(false);
            }
        };
        const handleBlur = () => setShowChronicleScrollHotkeys(false);
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        window.addEventListener("blur", handleBlur);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
            window.removeEventListener("blur", handleBlur);
        };
    }, [isChronicleMapTopmost]);
    useEffect(() => {
        if (!isChronicleMapTopmost) {
            return;
        }
        const pressedCodes = chronicleHotkeyCodesRef.current;
        let lastTime = performance.now();
        const getDirection = () => {
            // The source component checks Right before Left when both are held.
            if ([...STORY_CHRONICLE_RIGHT_HOTKEY_CODES].some((code) => pressedCodes.has(code))) {
                return 1;
            }
            if ([...STORY_CHRONICLE_LEFT_HOTKEY_CODES].some((code) => pressedCodes.has(code))) {
                return -1;
            }
            return 0;
        };
        const finishHotkeyScroll = () => {
            if (chronicleHotkeyFrameRef.current !== null) {
                window.cancelAnimationFrame(chronicleHotkeyFrameRef.current);
                chronicleHotkeyFrameRef.current = null;
            }
            const viewport = viewportRef.current;
            if (!viewport) {
                return;
            }
            viewport.dataset.storyChronicleHotkeyDirection = "idle";
            if (Math.abs(chronicleRubberRef.current) > 0.01) {
                startChronicleReleaseMotion(viewport, 0);
            }
            else {
                stopChronicleMotion(viewport);
            }
        };
        const applyHotkeyScroll = (viewport: HTMLElement, direction: number, deltaTime: number) => {
            const maxScrollLeft = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
            const currentVisualPosition = viewport.scrollLeft - chronicleRubberRef.current;
            const desiredScrollLeft = currentVisualPosition +
                direction * STORY_CHRONICLE_HOTKEY_SPEED * deltaTime;
            const clampedScrollLeft = Math.min(maxScrollLeft, Math.max(0, desiredScrollLeft));
            let rubber = 0;
            if (desiredScrollLeft < 0) {
                rubber = getStoryUnityScrollRectRubberDelta(-desiredScrollLeft, viewport.clientWidth);
            }
            else if (desiredScrollLeft > maxScrollLeft) {
                rubber = -getStoryUnityScrollRectRubberDelta(desiredScrollLeft - maxScrollLeft, viewport.clientWidth);
            }
            viewport.scrollLeft = clampedScrollLeft;
            viewport.dataset.storyChronicleMotion = "hotkey";
            viewport.dataset.storyChronicleHotkeyDirection =
                direction > 0 ? "right" : "left";
            setChronicleRubber(viewport, rubber);
        };
        const updateHotkeyScroll = (currentTime: number) => {
            const viewport = viewportRef.current;
            const direction = getDirection();
            if (!viewport || direction === 0) {
                finishHotkeyScroll();
                return;
            }
            const deltaTime = Math.min(Math.max((currentTime - lastTime) / 1000, 0), 0.05);
            lastTime = currentTime;
            applyHotkeyScroll(viewport, direction, deltaTime);
            chronicleHotkeyFrameRef.current = window.requestAnimationFrame(updateHotkeyScroll);
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target;
            if (target instanceof HTMLElement &&
                (target.isContentEditable ||
                    target.matches("input, select, textarea, [role='textbox']"))) {
                return;
            }
            const hotkeyCode = getChronicleHorizontalHotkeyCode(event);
            if (!hotkeyCode) {
                return;
            }
            event.preventDefault();
            pressedCodes.add(hotkeyCode);
            if (chronicleHotkeyFrameRef.current !== null) {
                return;
            }
            const viewport = viewportRef.current;
            if (!viewport) {
                return;
            }
            cancelChronicleMotion();
            chronicleVelocityRef.current = 0;
            applyHotkeyScroll(viewport, getDirection(), 1 / 60);
            lastTime = performance.now() + 1000 / 60;
            chronicleHotkeyFrameRef.current = window.requestAnimationFrame(updateHotkeyScroll);
        };
        const handleKeyUp = (event: KeyboardEvent) => {
            const hotkeyCode = getChronicleHorizontalHotkeyCode(event);
            if (!hotkeyCode || !pressedCodes.delete(hotkeyCode)) {
                return;
            }
            event.preventDefault();
        };
        const handleBlur = () => {
            pressedCodes.clear();
            finishHotkeyScroll();
        };
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        window.addEventListener("blur", handleBlur);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
            window.removeEventListener("blur", handleBlur);
            pressedCodes.clear();
            finishHotkeyScroll();
        };
    }, [
        cancelChronicleMotion,
        isChronicleMapTopmost,
        setChronicleRubber,
        startChronicleReleaseMotion,
        stopChronicleMotion,
    ]);
    useEffect(() => {
        if (themeCleanupTimerRef.current !== null) {
            window.clearTimeout(themeCleanupTimerRef.current);
            themeCleanupTimerRef.current = null;
        }
        return () => {
            if (!preserveThemeOnUnmountRef.current) {
                // STV-CHR-018: defer the page-lifetime cleanup by one task so React's
                // development remount does not stop a theme inherited from Reader.
                themeCleanupTimerRef.current = window.setTimeout(() => {
                    stopStoryTheme();
                }, 0);
            }
        };
    }, []);
    useEffect(() => {
        const viewport = viewportRef.current;
        if (!viewport || seasonalViewerEpisodeId !== null) {
            return;
        }
        const handleWheel = (event: WheelEvent) => {
            if (event.ctrlKey) {
                return;
            }
            const wheelDelta = Math.abs(event.deltaY) >= Math.abs(event.deltaX)
                ? event.deltaY
                : event.deltaX;
            if (wheelDelta === 0) {
                return;
            }
            // The wheel mapping is a web supplement; cancel an active pointer fling
            // before applying its direct horizontal delta.
            if (chronicleMotionFrameRef.current !== null) {
                window.cancelAnimationFrame(chronicleMotionFrameRef.current);
                chronicleMotionFrameRef.current = null;
            }
            chronicleRubberRef.current = 0;
            chronicleVelocityRef.current = 0;
            viewport.dataset.storyChronicleMotion = "idle";
            viewport.dataset.storyChronicleRubberX = "0.000";
            viewport.style.setProperty("--story-chronicle-rubber-x", "0px");
            syncChronicleScrollbar(viewport, mapScrollbarRef.current, mapScrollbarHandleRef.current, 0);
            const deltaMultiplier = event.deltaMode === WheelEvent.DOM_DELTA_LINE
                ? 16
                : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
                    ? viewport.clientWidth
                    : 1;
            const maxScrollLeft = viewport.scrollWidth - viewport.clientWidth;
            const nextScrollLeft = Math.min(maxScrollLeft, Math.max(0, viewport.scrollLeft + wheelDelta * deltaMultiplier));
            if (nextScrollLeft === viewport.scrollLeft) {
                return;
            }
            event.preventDefault();
            viewport.scrollLeft = nextScrollLeft;
        };
        viewport.addEventListener("wheel", handleWheel, { passive: false });
        return () => viewport.removeEventListener("wheel", handleWheel);
    }, [seasonalViewerEpisodeId]);
    useLayoutEffect(() => {
        const viewport = viewportRef.current;
        const scrollbar = mapScrollbarRef.current;
        const handle = mapScrollbarHandleRef.current;
        if (!viewport || !scrollbar || !handle) {
            return;
        }
        const updateScrollbar = () => syncChronicleScrollbar(viewport, scrollbar, handle, chronicleRubberRef.current);
        updateScrollbar();
        viewport.addEventListener("scroll", updateScrollbar, { passive: true });
        const resizeObserver = new ResizeObserver(updateScrollbar);
        resizeObserver.observe(viewport);
        return () => {
            viewport.removeEventListener("scroll", updateScrollbar);
            resizeObserver.disconnect();
        };
    }, [contentWidth, mapScale]);
    useEffect(() => () => {
        if (chronicleMotionFrameRef.current !== null) {
            window.cancelAnimationFrame(chronicleMotionFrameRef.current);
        }
    }, []);
    const activeThemeState = getActiveStoryThemeState();
    const isChronicleScrollHotkeyVisible = showChronicleScrollHotkeys;
    useLayoutEffect(() => {
        if (!isChronicleScrollHotkeyVisible) {
            return;
        }
        const viewport = viewportRef.current;
        const mapSurface = viewport?.parentElement;
        const mapShell = mapSurface?.parentElement;
        const display = mapShell?.querySelector<HTMLElement>('[data-story-hotkey-display="STV-CHR-038"]');
        if (!viewport || !mapSurface || !mapShell || !display) {
            return;
        }
        const shellRect = mapShell.getBoundingClientRect();
        const targetRect = mapSurface.getBoundingClientRect();
        display.style.setProperty("--story-chronicle-hotkey-target-x", `${targetRect.left + targetRect.width / 2 - shellRect.left - mapShell.clientLeft}px`);
        display.style.setProperty("--story-chronicle-hotkey-target-y", `${targetRect.top + targetRect.height / 2 - shellRect.top - mapShell.clientTop}px`);
        const displayRect = display.getBoundingClientRect();
        viewport.dataset.storyChronicleScrollHotkeyLastRect = [
            displayRect.left,
            displayRect.top,
            displayRect.width,
            displayRect.height,
        ]
            .map((value) => value.toFixed(3))
            .join(",");
        viewport.dataset.storyChronicleScrollHotkeyLastCenterOffset = [
            displayRect.left + displayRect.width / 2 -
                (targetRect.left + targetRect.width / 2),
            displayRect.top + displayRect.height / 2 -
                (targetRect.top + targetRect.height / 2),
        ]
            .map((value) => value.toFixed(3))
            .join(",");
    }, [isChronicleScrollHotkeyVisible, mapScale]);
    return (<div ref={mapShellRef} className={styles.mapShell} data-story-chronicle-lifecycle-audit="STV-CHR-005" data-story-ui-click-audio="STV-AUD-002:pointer-only" data-story-chronicle-common-audio-preload="STV-AUD-003" data-story-chronicle-common-audio-preload-status={commonAudioPreloadState.status} data-story-chronicle-common-audio-preload-total={commonAudioPreloadState.total} data-story-chronicle-common-audio-preload-failed={commonAudioPreloadState.failed} data-story-chronicle-node-levels="intentionally-hidden" data-story-chronicle-theme-lifetime="STV-CHR-018" data-story-chronicle-theme-url={activeThemeState?.url ?? ""} data-story-chronicle-theme-time={activeThemeState?.currentTime.toFixed(3) ?? ""} data-story-chronicle-theme-paused={activeThemeState ? String(activeThemeState.paused) : ""} data-story-chronicle-shortcut-cancel={isNavigationListOpen ? "STV-CHR-043" : undefined} data-story-operation-return-fade-active={"false"}>
      {/* STV-CHR-006: the source map starts at SUB_NODE_ScrollRect without a web-only toolbar. */}
      <div className={styles.mapViewport} data-story-chronicle-map-surface="STV-CHR-001" data-story-chronicle-map-entry-fade="none" data-story-chronicle-map-account-state="excluded">
        <Image src={`/story/map-ui/${screenBackground.file}`} alt="" fill sizes="100vw" className={styles.screenBackground} style={{
            inset: screenBackground.web.inset,
            objectFit: screenBackground.web.objectFit,
        }} unoptimized/>

        <div ref={viewportRef} data-story-chronicle-canvas-scale="STV-CHR-007" data-story-chronicle-scroll-physics="STV-CHR-013" data-story-chronicle-scroll-hotkey="STV-CHR-029" data-story-chronicle-scroll-hotkey-display="STV-CHR-038" data-story-chronicle-scroll-hotkey-help={isChronicleScrollHotkeyVisible ? "visible" : "hidden"} data-story-chronicle-scroll-hotkey-open-run={chronicleScrollHotkeyOpenRun} data-story-chronicle-scroll-hotkey-generation={isChronicleMapTopmost ? "map-topmost" : "blocked"} data-story-chronicle-scroll-hotkey-lifetime="left-alt-held-after-generation" data-story-chronicle-shortcut-focus-route="STV-CHR-036" data-story-chronicle-hotkey-speed={STORY_CHRONICLE_HOTKEY_SPEED} data-story-chronicle-hotkey-direction="idle" data-story-chronicle-motion="idle" data-story-chronicle-rubber-x="0.000" data-story-chronicle-scale={mapScale.toFixed(6)} data-story-chronicle-viewport={`${mapViewportMetrics.width}x${mapViewportMetrics.height}`} className={`${styles.viewport} ${isDragging ? styles.viewportDragging : ""}`} data-story-chronicle-raw-boundary="false" {...chronicleUnityMarkerProps} {...chroniclePointerProps}>
          <div className={styles.canvasStage} style={{
            width: contentWidth * mapScale,
            height: layout.metadata.canvas.height * mapScale,
        }}>
            <div className={styles.canvas} style={{
            width: layout.metadata.canvas.width,
            height: layout.metadata.canvas.height,
            transform: `scale(${mapScale})`,
        }}>
              <Image src={`/story/map-ui/${mapAreaDecoration.file}`} alt="" width={mapAreaDecoration.imageSize.width} height={mapAreaDecoration.imageSize.height} draggable={false} className={styles.mapAreaDecoration} style={{
            left: mapAreaDecorationPlacement.left,
            top: mapAreaDecorationPlacement.top,
            width: mapAreaDecorationPlacement.width,
            height: mapAreaDecorationPlacement.height,
            opacity: mapAreaDecorationPlacement.opacity,
        }} unoptimized/>

              <StoryConnections layout={layout}/>

              {layout.mainEpisodes.map((episode) => (<MainStoryNode key={episode.name} episode={episode} isSelected={selectedNode?.episodeId === episode.episodeId} onSelect={selectStoryNode}/>))}

              {layout.nodes.map((node) => (<StoryNode key={node.episodeId} node={node} isSelected={selectedNode?.episodeId === node.episodeId} shortcutFocusRun={shortcutFocusRuns[node.episodeId] ?? 0} onShortcutFocusComplete={clearShortcutFocusRun} onSelect={(selected) => {
                // STV-AUD-002: StoryNode owns pointer audio; this callback
                // is also reused by non-pointer selection paths.
                selectStoryNode(selected);
            }}/>))}

              <OmenShortcutNode shortcut={layout.omenShortcut} onOpen={() => {
            stopChronicleMotion();
            chronicleHotkeyCodesRef.current.clear();
            setSelectedNode(null);
            setIsNavigationListOpen(false);
            setIsOmenViewerOpen(true);
        }}/>
            </div>
          </div>
        </div>

        <div ref={mapScrollbarRef} aria-hidden="true" data-story-chronicle-scrollbar="STV-CHR-009" data-story-chronicle-scrollbar-size="0.000000" data-story-chronicle-scrollbar-value="0.000000" className={styles.mapScrollbar} style={{
            top: `calc(50% + ${359 * mapScale}px)`,
            width: 500 * mapScale,
            height: 3 * mapScale,
        }}>
          <div ref={mapScrollbarHandleRef} className={styles.mapScrollbarHandle}/>
        </div>

        <Image src="/story/map-ui/AB_UI_OPERATION_GRADIENT_01.png" alt="" width={20} height={20} aria-hidden="true" draggable={false} data-story-chronicle-fixed-gradient="STV-CHR-008" className={styles.screenFixedGradient} style={{
            left: STORY_CHRONICLE_FIXED_GRADIENT.left * mapScale,
            top: STORY_CHRONICLE_FIXED_GRADIENT.top * mapScale,
            width: STORY_CHRONICLE_FIXED_GRADIENT.width * mapScale,
            height: STORY_CHRONICLE_FIXED_GRADIENT.height * mapScale,
        }} unoptimized/>

        <div aria-hidden="true" data-story-chronicle-vignette-overscan="STV-CHR-008" className={styles.screenVignette} style={{
            backgroundImage: `url("${deploymentUrl(`/story/map-ui/${screenVignette.file}`)}")`,
            opacity: screenVignette.unity.tint.a,
            left: (-STORY_CHRONICLE_VIGNETTE_SIZE_DELTA.width / 2) *
                mapScale,
            right: (-STORY_CHRONICLE_VIGNETTE_SIZE_DELTA.width / 2) *
                mapScale,
            top: (-STORY_CHRONICLE_VIGNETTE_SIZE_DELTA.height / 2) *
                mapScale,
            bottom: (-STORY_CHRONICLE_VIGNETTE_SIZE_DELTA.height / 2) *
                mapScale,
        }}/>

        <ChronicleSafeAreaNavigation layout={layout} mapScale={mapScale} onShortcutSelect={focusStoryNodeFromShortcut} onListOpenChange={(isOpen) => {
            setIsNavigationListOpen(isOpen);
        }} onOpenSeasonal={() => {
            window.sessionStorage.removeItem(STORY_SEASONAL_RETURN_STORAGE_KEY);
            clearStorySeasonalReturnHistoryToken();
            stopChronicleMotion();
            chronicleHotkeyCodesRef.current.clear();
            setSelectedNode(null);
            setIsNavigationListOpen(false);
            setSeasonalViewerReturnState(null);
            setSeasonalViewerEpisodeId(seasonalViewerLastEpisodeId ?? 0);
        }}/>
      </div>

      {selectedNode ? (<StoryDetail key={selectedNode.episodeId} node={selectedNode} relatedNodes={relatedNodes} onClose={closeStoryDetail} onOpenReader={openStoryReader}/>) : null}
      {seasonalViewerEpisodeId !== null ? (<StorySeasonalViewer key={seasonalViewerEpisodeId || "default"} episodes={layout.seasonalEpisodes} initialEpisodeId={seasonalViewerEpisodeId || undefined} initialState={seasonalViewerReturnState} relatedStories={seasonalRelatedStories} onClose={(episodeId) => {
                window.sessionStorage.removeItem(STORY_SEASONAL_RETURN_STORAGE_KEY);
                clearStorySeasonalReturnHistoryToken();
                if (layout.seasonalEpisodes.some((episode) => episode.episodeId === episodeId)) {
                    setSeasonalViewerLastEpisodeId(episodeId);
                }
                setSeasonalViewerReturnState(null);
                setSeasonalViewerEpisodeId(null);
                window.requestAnimationFrame(() => {
                    document
                        .querySelector<HTMLButtonElement>('[data-story-chronicle-navigation-action="seasonal"]')
                        ?.focus();
                });
            }} onOpenReader={(returnState) => {
                const returnToken = window.crypto.randomUUID?.() ??
                    `${Date.now()}-${Math.random().toString(36).slice(2)}`;
                const tokenizedReturnState = { ...returnState, returnToken };
                window.history.replaceState({
                    ...window.history.state,
                    [STORY_SEASONAL_RETURN_HISTORY_KEY]: returnToken,
                }, "", window.location.href);
                setSeasonalViewerReturnState(tokenizedReturnState);
                window.sessionStorage.setItem(STORY_SEASONAL_RETURN_STORAGE_KEY, JSON.stringify(tokenizedReturnState));
                openStoryReader();
            }}/>) : null}
      {isOmenViewerOpen && !selectedNode ? (<StoryOmenViewer episodes={layout.omenEpisodes} episode15={layout.mainEpisodes.find((episode) => episode.name === "EP_15") ??
                null} onSelect={selectStoryNode} onOpenMainstream={(episode) => {
                setIsOmenViewerOpen(false);
                router.push(`/story/reader/?episode=${episode.episodeId}`);
            }} onClose={() => {
                setIsOmenViewerOpen(false);
                window.requestAnimationFrame(() => {
                    document
                        .querySelector<HTMLButtonElement>('[data-story-chronicle-omen-node="STV-CHR-044"] [data-story-chronicle-omen-hit-target]')
                        ?.focus();
                });
            }}/>) : null}
      {isChronicleScrollHotkeyVisible ? (<StoryHotkeyDisplay className={styles.mapHotkeyDisplay} text="← →" trackerId="STV-CHR-038" target="SUB_NODE_ScrollRect/Viewport" style={{
                "--story-chronicle-hotkey-scale": mapScale,
            } as CSSProperties}/>) : null}
      <div ref={operationReturnFadeElementRef} className={styles.operationReturnFade} aria-hidden="true"/>
    </div>);
}
