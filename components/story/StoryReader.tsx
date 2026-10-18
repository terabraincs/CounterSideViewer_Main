"use client";
import { deploymentUrl } from "@/lib/deployment";
import Image from "@/components/DeploymentImage";
import Link from "@/components/DeploymentLink";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, } from "react";
import { createSoundAssetUrl } from "@/lib/staticAssets";
import { createStoryAudio, preloadStoryAudioUrls, } from "@/lib/storyAudioCache";
import { getStoryClientAudioVolume } from "@/lib/storyAudioVolume";
import { resolveStoryOperationBackground } from "@/lib/storyOperationBackground";
import { isStoryEventClb002HandEpisode } from "@/lib/storyEventClb002Hand";
import { playStoryUiPointerSound } from "@/lib/storyUiAudio";
import { getActiveStoryThemeState, hasActiveStoryTheme, playStoryTheme, stopStoryTheme, } from "@/lib/storyThemeAudio";
import { addStoryLoopFxInstance, advanceStoryTypewriter, applyStoryReservedMusic, applyStoryCommand, appendStoryLogText, createInitialStoryVisualState, createStoryTypewriterRuntimeState, doesStoryActorCrashOverrideMovement, doesStoryCharacterMovementRunByCommand, findStoryMarkIndex, finishStoryCommandActor, finishStoryPreviousBackgroundFade, finishStoryCommandVisualState, finishStoryTitleTypewriter, finishStoryTypewriter, formatStoryLogText, formatStorySelectionLog, getStoryAutoWaitDuration, getStoryActorCrashStopDelayMs, getStoryCharacterFinishRemainingMs, getStoryCharacterFinishTiming, getStoryCommandPauseDurations, getStoryClickAction, getStoryCommandAudioPaths, getStoryCommandLogText, getStoryCommandDialogueBoxType, isStorySpineEventAnimationActive, isStoryTitleTypewriterRunning, getStoryControlVisibility, getStoryDialogueNextMemory, getStoryFxmEligiblePlayerDelays, getStoryGameObjectRootLayout, getStoryChoices, getStoryLogCanvasScale, getStoryLogHotkeyScrollFrame, getStoryLogInertiaScrollFrame, getStoryLogNormalizedPosition, getStoryLogPointerDragFrame, getStoryLogWheelScrollFrame, getStoryLogWheelAction, getLastStoryMusicPath, getStoryNaturalEndTransientFx, getStoryMovieSurfaceClickAction, getStoryMovieSkipConfirmHotkeyCode, getStoryMouseCancelAction, getStoryNextIndicatorVariant, getStoryTextVisibility, getStoryTimerRemainingMs, getStoryStartedTypewriterStepDurationMs, getStoryTypewriterStepDurationMs, getStoryUnityEaseCss, getStoryWheelAction, getVisibleTextLength, parseCharacterPosition, resolveStoryTextVariables, shouldFadePreviousStoryTitle, shouldPlayStoryTitleTypingSound, shouldShowStoryNextIndicator, skipsStoryCommandBody, smoothStoryLogScrollRubber, startStoryTypewriter, shouldWaitForStoryVoice, STORY_MOVIE_PREPARE_WAIT_LIMIT_MS, STORY_MOVIE_SKIP_DESCRIPTION, STORY_MOVIE_SKIP_TITLE, STORY_SEPIA_COLOR_MATRIX, STORY_TITLE_TYPING_SOUND_PATH, takeStoryLoopFxInstances, type ActorSlot, type StoryBackgroundManagerMemory, type StoryBackgroundTransformSnapshot, type StoryActorColorSnapshot, type StoryChoice, type StoryFxControl, type StoryFxEvent, type StoryFxmParticleCustomCurve, type StoryFxmTransformEvaluator, type StoryGameObjectEffect, type StoryScene, type StoryVisualState, } from "@/lib/storyPlayback";
import { getStoryUnityScrollRectDragFrame, getStoryUnityScrollRectReleaseFrame, getStoryUnityScrollRectRubberDelta, getStoryUnityScrollRectWheelAxisDelta, getStoryUnityScrollRectWheelFrame, STORY_UNITY_SCROLL_RECT_ELASTICITY, } from "@/lib/storyUnityScrollRect";
import StorySpineActor, { getStorySpineBonePosition, preloadStorySpineAsset, preloadStorySpineRuntime, type StorySpineAsset, type StorySpineTintTransition, } from "./StorySpineActor";
import StoryStageDescriptionScroll from "./StoryStageDescriptionScroll";
import { StoryOperationScrollHotkeyDisplayView, type StoryOperationScrollHotkeyTarget, useStoryOperationScrollHotkeyOverlay, } from "./StoryOperationScrollHotkeyOverlay";
import StoryHotkeyDisplay from "./StoryHotkeyDisplay";
import StoryCircuitBoardEffect from "./StoryCircuitBoardEffect";
import StoryChainEffect from "./StoryChainEffect";
import StoryIceMaterialEffect from "./StoryIceMaterialEffect";
import StoryEventClb002HandOverlay from "./StoryEventClb002HandOverlay";
import StoryMainstream134011Aura from "./StoryMainstream134011Aura";
import StorySlashTraceEffect from "./StorySlashTraceEffect";
import { StoryWaveAuraEffect } from "./StoryWaveAuraEffect";
import StoryWaveDistortionEffect from "./StoryWaveDistortionEffect";
import StoryWaveRenderStageMeshEffect from "./StoryWaveRenderStageMeshEffect";
import { useStoryUnityScrollRectPointer } from "./useStoryUnityScrollRectPointer";
import styles from "./StoryReader.module.css";
const STORY_AUTO_PREFERENCE_KEY = "NKM_LOCAL_SAVE_CUTSCEN_AUTO";
const LEGACY_STORY_AUTO_PREFERENCE_KEY = "counterside-story-auto";
const STORY_SEASONAL_RETURN_STORAGE_KEY = "story-seasonal-return-episode";
const STORY_OPERATION_RETURN_FADE_STORAGE_KEY = "story-operation-node-viewer-return-fade";
const STORY_OPERATION_ENTRY_FADE_MS = 300;
const STORY_OPERATION_EXIT_FADE_MS = 200;
const STORY_OPERATION_PARENT_RETURN_FADE_MS = 100;
const STORY_COUNTERCASE_ENTRY_FADE_MS = 100;
const STORY_OPERATION_STAGE_HOTKEY_SPEED = 4000;
const STORY_COUNTERCASE_SCROLL_HOTKEY_SPEED = 4000;
const STORY_CUTSCENE_LOG_SCROLL_HOTKEY_SPEED = 4000;
const STORY_CUTSCENE_LOG_SCROLL_ELASTICITY = 0.1;
const STORY_CUTSCENE_LOG_SCROLL_MAXIMUM_DELTA_TIME = 1;
const STORY_CUTSCENE_LOG_SCROLL_DECELERATION_RATE = 0.135;
const STORY_CUTSCENE_LOG_SCROLL_DRAG_THRESHOLD = 50;
const STORY_CUTSCENE_LOG_SCROLL_WHEEL_MULTIPLIER = 150;
const STORY_CUTSCENE_LOG_SCROLL_WHEEL_RUBBER_SCALE = 0.5;
const STORY_CUTSCENE_LOG_SCROLL_WHEEL_PIXEL_TICK = 120;
const STORY_COUNTERCASE_SCROLL_ELASTICITY = 0.1;
const STORY_COUNTERCASE_SCROLL_DECELERATION_RATE = 0.135;
const STORY_COUNTERCASE_SCROLL_DRAG_THRESHOLD = 50;
const STORY_COUNTERCASE_SCROLL_LOOP_WHEEL_MULTIPLIER = 150;
const STORY_COUNTERCASE_SCROLL_NORMAL_WHEEL_MULTIPLIER = 1;
const STORY_COUNTERCASE_SCROLL_LOOP_WHEEL_RUBBER_SCALE = 0.5;
const STORY_COUNTERCASE_SCROLL_WHEEL_PIXEL_TICK = 120;
const STORY_OPERATION_STAGE_LEFT_HOTKEY_CODES = new Set([
    "ArrowLeft",
    "KeyA",
    "Numpad4",
]);
const STORY_OPERATION_STAGE_RIGHT_HOTKEY_CODES = new Set([
    "ArrowRight",
    "KeyD",
    "Numpad6",
]);
const STORY_OPERATION_ACT_PREVIOUS_HOTKEY_CODES = new Set([
    "ArrowUp",
    "KeyW",
    "Numpad8",
]);
const STORY_OPERATION_ACT_NEXT_HOTKEY_CODES = new Set([
    "ArrowDown",
    "KeyS",
    "Numpad2",
]);
const STORY_CUTSCENE_LOG_HOTKEY_CODES = new Set([
    "ArrowUp",
    "KeyW",
    "Numpad8",
]);
const STORY_CUTSCENE_LOG_SCROLL_DOWN_HOTKEY_CODES = new Set([
    "ArrowDown",
    "KeyS",
    "Numpad2",
]);
const STORY_CUTSCENE_HOTKEY_DISPLAY_TARGETS = {
    "player-log": {
        text: "↑",
        path: "NKM_UI_CUTSCEN_PLAYER/NKM_UI_CUTSCEN_PLAYER_AUTO_SKIP/NKM_UI_CUTSCEN_PLAYER_TALK_LOG",
    },
    "log-scroll": {
        text: "↓ ↑",
        path: "NKM_UI_CUTSCEN_PLAYER/NKM_UI_CUTSCEN_PLAYER_LOG_VIEWER/NKM_UI_CUTSCEN_PLAYER_LOG_VIEWER_SCROLL",
    },
    "movie-skip-confirm": {
        text: "⏎",
        path: "NKM_UI_POPUP_BOX/NKM_UI_POPUP_OK_BOX_PANEL/NKM_UI_POPUP_BOX_Contents/NKM_UI_POPUP_OK_CANCEL_ROOT/NKM_UI_POPUP_OK_CANCEL_BOX_OK",
    },
} as const;
const STORY_OPERATION_SCROLL_HOTKEY_TARGETS = {
    stage: {
        text: "← →",
        path: "AB_UI_OPERATION_MAIN/OPERATION_LIST_ScrollRect/Viewport",
    },
    acts: {
        text: "↓ ↑",
        path: "NKM_EPISODE_CC_Panel/NKM_UI_COUNTER_CASE_UNIT_LIST_BG/NKM_UI_COUNTER_CASE_UNIT_LIST_Panel/NKM_UI_COUNTER_CASE_UNIT_LIST_ScrollView/NKM_UI_COUNTER_CASE_UNIT_LIST_Viewport",
    },
    normal: {
        text: "↓ ↑",
        path: "NKM_UI_COUNTER_CASE_NORMAL/NKM_UI_COUNTER_CASE_NORMAL_BG/NKM_UI_COUNTER_CASE_NORMAL_LIST_Panel/NKM_UI_COUNTER_CASE_NORMAL_LIST_ScrollView/NKM_UI_COUNTER_CASE_NORMAL_LIST_Viewport",
    },
} as const;
function getStoryOperationStageHorizontalHotkeyCode(event: KeyboardEvent) {
    if (STORY_OPERATION_STAGE_LEFT_HOTKEY_CODES.has(event.code) ||
        STORY_OPERATION_STAGE_RIGHT_HOTKEY_CODES.has(event.code)) {
        return event.code;
    }
    // Physical codes keep keypad aliases distinct. The key fallback is only
    // for embedded browser bridges that omit code for the arrow/letter keys.
    if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        return event.key === "ArrowLeft" ? "ArrowLeft" : "KeyA";
    }
    if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        return event.key === "ArrowRight" ? "ArrowRight" : "KeyD";
    }
    return null;
}
function getStoryOperationActHotkeyDirection(event: KeyboardEvent) {
    if (STORY_OPERATION_ACT_PREVIOUS_HOTKEY_CODES.has(event.code)) {
        return -1;
    }
    if (STORY_OPERATION_ACT_NEXT_HOTKEY_CODES.has(event.code)) {
        return 1;
    }
    // Physical codes preserve the keypad aliases. The key fallback is only for
    // embedded browser bridges that omit or cannot identify KeyboardEvent.code.
    if (event.code && event.code !== "Unidentified") {
        return 0;
    }
    if (event.key === "ArrowUp" || event.key.toLowerCase() === "w") {
        return -1;
    }
    if (event.key === "ArrowDown" || event.key.toLowerCase() === "s") {
        return 1;
    }
    return 0;
}
function getStoryCutsceneLogHotkeyCode(event: KeyboardEvent) {
    if (STORY_CUTSCENE_LOG_HOTKEY_CODES.has(event.code)) {
        return event.code;
    }
    // Physical codes keep Numpad8 distinct from Digit8. The key fallback is
    // only for embedded browser bridges that omit or cannot identify code.
    if (event.code && event.code !== "Unidentified") {
        return null;
    }
    if (event.key === "ArrowUp" || event.key.toLowerCase() === "w") {
        return event.key === "ArrowUp" ? "ArrowUp" : "KeyW";
    }
    return null;
}
function getStoryCutsceneLogScrollHotkeyCode(event: KeyboardEvent) {
    if (STORY_CUTSCENE_LOG_HOTKEY_CODES.has(event.code) ||
        STORY_CUTSCENE_LOG_SCROLL_DOWN_HOTKEY_CODES.has(event.code)) {
        return event.code;
    }
    // Keep keypad aliases physical. key is only a fallback for browser bridges
    // that omit or cannot identify KeyboardEvent.code.
    if (event.code && event.code !== "Unidentified") {
        return null;
    }
    if (event.key === "ArrowUp" || event.key.toLowerCase() === "w") {
        return event.key === "ArrowUp" ? "ArrowUp" : "KeyW";
    }
    if (event.key === "ArrowDown" || event.key.toLowerCase() === "s") {
        return event.key === "ArrowDown" ? "ArrowDown" : "KeyS";
    }
    return null;
}
function getStoryCounterCaseVerticalHotkeyCode(event: KeyboardEvent) {
    if (STORY_OPERATION_ACT_PREVIOUS_HOTKEY_CODES.has(event.code) ||
        STORY_OPERATION_ACT_NEXT_HOTKEY_CODES.has(event.code)) {
        return event.code;
    }
    // Physical codes preserve the keypad aliases. The key fallback is only for
    // embedded browser bridges that omit or cannot identify KeyboardEvent.code.
    if (event.code && event.code !== "Unidentified") {
        return null;
    }
    if (event.key === "ArrowUp" || event.key.toLowerCase() === "w") {
        return event.key === "ArrowUp" ? "ArrowUp" : "KeyW";
    }
    if (event.key === "ArrowDown" || event.key.toLowerCase() === "s") {
        return event.key === "ArrowDown" ? "ArrowDown" : "KeyS";
    }
    return null;
}
function preserveStorySeasonalReturnState(episodeId: number) {
    const storedValue = window.sessionStorage.getItem(STORY_SEASONAL_RETURN_STORAGE_KEY);
    if (storedValue) {
        try {
            const storedState = JSON.parse(storedValue) as {
                episodeId?: number;
                returnToken?: string;
            };
            if (storedState.episodeId === episodeId) {
                return (typeof storedState.returnToken === "string" &&
                    storedState.returnToken.length >= 8);
            }
        }
        catch {
            if (Number(storedValue) === episodeId) {
                return false;
            }
        }
    }
    window.sessionStorage.setItem(STORY_SEASONAL_RETURN_STORAGE_KEY, JSON.stringify({
        episodeId,
        episodeScrollTop: 0,
        episodeScrollRubberY: 0,
        episodeLoopStartIndex: 7,
        episodeLoopActiveSlots: 3,
        episodeLoopAnchoredY: 0,
        lifecycle: "UnHide",
        createdAt: Date.now(),
    }));
    return false;
}
function queueStoryOperationNodeViewerReturnFade() {
    window.sessionStorage.setItem(STORY_OPERATION_RETURN_FADE_STORAGE_KEY, JSON.stringify({
        trackerId: "STV-MAP-061",
        source: "NKCUIOperationNodeViewer",
        destination: "NKCUIOperationV2",
        createdAt: Date.now(),
        fadeOutMs: STORY_OPERATION_EXIT_FADE_MS,
        fadeInMs: STORY_OPERATION_PARENT_RETURN_FADE_MS,
    }));
}
function queueStoryCounterCaseReturnFade() {
    window.sessionStorage.setItem(STORY_OPERATION_RETURN_FADE_STORAGE_KEY, JSON.stringify({
        trackerId: "STV-MAP-062",
        source: "NKCUIEpisodeViewerCC",
        destination: "NKCUIOperationV2",
        createdAt: Date.now(),
        fadeOutMs: 0,
        fadeInMs: STORY_OPERATION_PARENT_RETURN_FADE_MS,
    }));
}
type StoryFxmImageCacheEntry = {
    image: HTMLImageElement;
    loaded: Promise<void>;
};
const storyFxmImageCache = new Map<string, StoryFxmImageCacheEntry>();
let storyFontLoadPromise: Promise<void> | null = null;
const timedWaveBackgroundNames = new Set([
    "AB_UI_NKM_UI_CUTSCEN_FX_BREAK",
    "AB_UI_NKM_UI_CUTSCEN_FX_CHAIN",
    "AB_UI_NKM_UI_CUTSCEN_FX_CIRCUIT_BOARD",
    "AB_UI_NKM_UI_CUTSCEN_FX_WAVE",
    "AB_UI_NKM_UI_CUTSCEN_FX_WAVE2",
    "AB_UI_NKM_UI_CUTSCEN_FX_WAVE_BLUE",
    "AB_UI_NKM_UI_CUTSCEN_FX_WAVE_RED",
]);
const fullSafeAreaGameObjectNames = new Set([
    "AB_UI_NKM_UI_CUTSCEN_FX_SCREEN_FILM",
]);
// STV-GO-001: ProcessGameObjectBG의 1920×1080 cover 표면은 원본 루트에
// AspectRatioFitter가 있는 70종에만 적용한다. SCREEN_FILM은 루트가 전체
// 안전영역이고 BG 자식만 16:9이므로 이 공통 표면에 포함하지 않는다.
function usesGameObjectCoverSurface(gameObject: boolean, gameObjectName: string) {
    return (gameObject &&
        (!gameObjectName || !fullSafeAreaGameObjectNames.has(gameObjectName)));
}
function preloadStoryFont() {
    if (typeof document === "undefined" || !document.fonts) {
        return Promise.resolve();
    }
    if (!storyFontLoadPromise) {
        // Unity 프리팹은 MainFont를 가진 상태로 컷신 UI를 활성화한다. 웹도
        // 16MB 원본 폰트가 준비되기 전에 첫 대사·타이틀을 fallback 글꼴로
        // 잠깐 표시하지 않도록 장면 에셋과 함께 미리 읽고 표시 전에 기다린다.
        storyFontLoadPromise = Promise.all([
            document.fonts.load('400 45px "CounterSide Story"', "가나다라마바사"),
            document.fonts.load('700 40px "CounterSide Story"', "please WAIT"),
        ]).then(() => undefined);
    }
    return storyFontLoadPromise;
}
function getStoryFxmImage(asset: string) {
    const cached = storyFxmImageCache.get(asset);
    if (cached) {
        return cached;
    }
    const image = new window.Image();
    image.decoding = "async";
    const loaded = new Promise<void>((resolve) => {
        let settled = false;
        const finish = () => {
            if (!settled) {
                settled = true;
                resolve();
            }
        };
        image.addEventListener("load", finish, { once: true });
        image.addEventListener("error", finish, { once: true });
        image.src = deploymentUrl(asset);
        if (image.complete) {
            queueMicrotask(finish);
        }
    });
    const entry = { image, loaded };
    storyFxmImageCache.set(asset, entry);
    return entry;
}
async function preloadStorySceneImages(scene: StoryScene) {
    const assets = new Set<string>();
    scene.commands.forEach((command) => {
        if (command.backgroundUrl) {
            assets.add(command.backgroundUrl);
        }
        if (command.imageUrl) {
            assets.add(command.imageUrl);
        }
        command.gameObjectEffect?.assets.forEach((asset) => assets.add(asset));
    });
    await Promise.all(Array.from(assets, (asset) => getStoryFxmImage(asset).loaded));
}
async function preloadStorySceneAudio(scene: StoryScene) {
    const paths = new Set<string>();
    scene.commands.forEach((command) => {
        getStoryCommandAudioPaths(command).forEach((path) => {
            if (path) {
                paths.add(getSoundUrl(path));
            }
        });
    });
    return preloadStoryAudioUrls(paths);
}
async function preloadStoryTimedWaveSpines(scene: StoryScene) {
    const spines = new Map<string, StorySpineAsset>();
    scene.commands.forEach((command) => {
        if (!timedWaveBackgroundNames.has(command.backgroundName ?? "") ||
            !command.backgroundSpine) {
            return;
        }
        spines.set(command.backgroundSpine.id, command.backgroundSpine);
    });
    await Promise.all([...spines.values()].map(preloadStorySpineAsset));
}
async function preloadStorySceneCharacterSpines(scene: StoryScene, characters: Record<string, StoryCharacter>) {
    const spines = new Map<string, StorySpineAsset>();
    const addSpine = (asset?: StorySpineAsset | null) => {
        if (asset) {
            spines.set(asset.id, asset);
        }
    };
    scene.commands.forEach((command) => {
        const character = command.characterId
            ? characters[command.characterId]
            : undefined;
        if (!character) {
            return;
        }
        addSpine(character.spine);
        addSpine(character.backgroundSpine?.asset);
        addSpine(character.spineEventEffect?.renderStageSpine?.asset);
        addSpine(character.exceptionalVfxEffect?.renderStageSpine?.asset);
    });
    await Promise.all([
        preloadStorySpineRuntime(),
        ...[...spines.values()].map(preloadStorySpineAsset),
    ]);
}
function readStoryAutoPreference() {
    if (typeof window === "undefined") {
        return false;
    }
    try {
        const saved = window.localStorage.getItem(STORY_AUTO_PREFERENCE_KEY);
        if (saved !== null) {
            return saved === "1";
        }
        return window.localStorage.getItem(LEGACY_STORY_AUTO_PREFERENCE_KEY) === "1";
    }
    catch {
        return false;
    }
}
function writeStoryAutoPreference(enabled: boolean) {
    try {
        window.localStorage.setItem(STORY_AUTO_PREFERENCE_KEY, enabled ? "1" : "0");
    }
    catch {
        // 저장소 사용이 막힌 브라우저에서도 현재 컷신의 AUTO는 동작한다.
    }
}
type StorySceneSummary = {
    id: string;
    title: string;
    commandCount: number;
    url: string;
    label?: string;
    position?: string;
};
type StoryStage = {
    id: number;
    strId: string;
    act: number;
    index: number;
    uiNumber: number;
    title: string;
    description: string;
    characterId: string;
    characterSpine: StorySpineAsset | null;
    characterSpinePrefabId?: string;
    characterSpineResolution?: string;
    characterSkinName?: string;
    characterAnimation?: string;
    characterAnimationLoop?: boolean;
    nodeKind: "story" | "battle";
    layout: StoryStageLayout | null;
    cutscenes: StorySceneSummary[];
};
type StoryStageLayout = {
    slot: number;
    kind: "story" | "battle";
    x: number;
    y: number;
    width: number;
    height: number;
    visualWidth: number;
    visualHeight: number;
    connectors: StoryStageConnector[];
};
type StoryStageConnector = {
    name: string;
    left: number;
    top: number;
    width: number;
    height: number;
    angle: number;
    originX: number;
    originY: number;
};
type StoryStageMap = {
    width: number;
    height: number;
    backgroundName?: string;
    backgroundUrl?: string;
    visualBackground?: StoryStageVisualBackground;
};
type StoryStageVisualBackground = {
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    layers: StoryStageVisualLayer[];
};
type StoryStageVisualLayer = {
    name: string;
    spriteName: string;
    spriteUrl: string;
    imageType: "simple" | "sliced";
    border?: {
        left: number;
        bottom: number;
        right: number;
        top: number;
    };
    x: number;
    y: number;
    width: number;
    height: number;
    scaleX: number;
    scaleY: number;
    color: [
        number,
        number,
        number,
        number
    ];
};
type StoryCounterCaseAct = {
    act: number;
    unitId: number;
    unitStrId: string;
    name: string;
    nickname: string;
    faceCardName: string;
    faceCardUrl: string;
    stageIds: number[];
};
type StoryEpisode = {
    id: number;
    strId: string;
    category: string;
    title: string;
    name: string;
    description: string;
    maxMedals: number;
    actCount: number;
    stageViewerPrefab: string;
    backgroundName: string;
    backgroundUrl: string;
    bgmName: string;
    bgmPath: string;
    counterCaseActs?: StoryCounterCaseAct[];
    stageMaps: Record<string, StoryStageMap>;
    stages: StoryStage[];
};
type StoryEpisodeIndex = Omit<StoryEpisode, "counterCaseActs" | "stageMaps" | "stages"> & {
    dataUrl: string;
};
type StoryCharacter = {
    id: string;
    name: string;
    nameMarkup: string;
    prefab: string;
    templateResolved: boolean;
    background: boolean;
    skinOption: number;
    skinName: string;
    prefabSkinName: string;
    prefabAnimation: string;
    prefabLoop: boolean;
    spine: StorySpineAsset | null;
    spineEventEffect: StoryGameObjectEffect | null;
    exceptionalVfxEffect: StoryGameObjectEffect | null;
    backgroundSpine: {
        asset: StorySpineAsset;
        prefabSkinName: string;
        prefabAnimation: string;
        prefabLoop: boolean;
        exceptional: boolean;
    } | null;
};
type StoryIndex = {
    version: number;
    generatedAt: string;
    stats: {
        scenes: number;
        linkedScenes: number;
        unlinkedScenes: number;
        episodes: number;
        stages: number;
        characters: number;
        spineCharacters: number;
        backgrounds: number;
    };
    ui: Record<string, string>;
    coverageUrl: string;
    episodes: StoryEpisodeIndex[];
};
type StoryEpisodePayload = {
    version: number;
    generatedAt: string;
    episode: StoryEpisode;
};
type StoryCharactersPayload = {
    version: number;
    generatedAt: string;
    characters: Record<string, StoryCharacter>;
};
type StoryLogEntry = {
    key: number;
    text: string;
    voicePath: string;
};
type StoryLogScrollPointerState = {
    pointerId: number;
    startX: number;
    startY: number;
    startVisualPosition: number;
    dragging: boolean;
    scrollRectDragging: boolean;
};
type StoryCounterCaseScrollDragState = {
    scroll: HTMLElement;
    pointerId: number;
    startX: number;
    startY: number;
    startVisualPosition: number;
    lastVisualPosition: number;
    lastTime: number;
    velocity: number;
    dragging: boolean;
    scrollRectDragging: boolean;
};
type StoryCounterCaseScrollSurfaceState = {
    visualPosition: number;
    loopDragging: boolean;
};
type StoryCutsceneHotkeyDisplaySurface = keyof typeof STORY_CUTSCENE_HOTKEY_DISPLAY_TARGETS;
type StoryCutsceneHotkeyDisplaySnapshot = {
    generation: number;
    surface: StoryCutsceneHotkeyDisplaySurface;
    text: (typeof STORY_CUTSCENE_HOTKEY_DISPLAY_TARGETS)[StoryCutsceneHotkeyDisplaySurface]["text"];
    targetPath: string;
    left: number;
    top: number;
    scale: number;
};
type ClosingStoryTitle = {
    processId: string;
    titleText: string;
    subtitleText: string;
    durationMs: number;
};
type ReaderMode = "episode" | "theater";
const HOLOGRAM_CHARACTER_COLOR = [0.1058, 0.6, 1, 1] as const;
function scaleReferencePixels(value: number) {
    if (!value) {
        return "0px";
    }
    const absolute = Math.abs(value);
    const responsiveLength = `min(${absolute / 19.2}vw, ${absolute / 10.8}vh)`;
    return value < 0 ? `calc(-1 * ${responsiveLength})` : responsiveLength;
}
function readTransformMatrix(transform: string) {
    if (!transform || transform === "none") {
        return { x: 0, y: 0, scaleX: 1, scaleY: 1 };
    }
    const values = transform
        .slice(transform.indexOf("(") + 1, transform.lastIndexOf(")"))
        .split(",")
        .map((value) => Number(value.trim()));
    if (transform.startsWith("matrix3d(") && values.length === 16) {
        return {
            x: values[12],
            y: values[13],
            scaleX: Math.hypot(values[0], values[1]),
            scaleY: Math.hypot(values[4], values[5]),
        };
    }
    if (transform.startsWith("matrix(") && values.length === 6) {
        return {
            x: values[4],
            y: values[5],
            scaleX: Math.hypot(values[0], values[1]),
            scaleY: Math.hypot(values[2], values[3]),
        };
    }
    return { x: 0, y: 0, scaleX: 1, scaleY: 1 };
}
function readCssColor(value: string, opacity: number) {
    const channels = value.match(/[\d.]+/gu)?.map(Number) ?? [];
    if (channels.length < 3) {
        return [1, 1, 1, opacity];
    }
    return [
        channels[0] / 255,
        channels[1] / 255,
        channels[2] / 255,
        Math.min(Math.max((channels[3] ?? 1) * opacity, 0), 1),
    ];
}
function toStorySpineTint(value: number[]): readonly [
    number,
    number,
    number,
    number
] {
    return [
        Number(value[0] ?? 1),
        Number(value[1] ?? 1),
        Number(value[2] ?? 1),
        Number(value[3] ?? 1),
    ];
}
function readStorySpineTint(graphic: HTMLDivElement) {
    const value = graphic.querySelector<HTMLElement>("[data-spine-tint]")
        ?.dataset.spineTint;
    const channels = value?.split(",").map(Number) ?? [];
    return channels.length >= 4 && channels.every(Number.isFinite)
        ? channels.slice(0, 4)
        : null;
}
function readBackgroundTransform(position: HTMLDivElement | null, scale: HTMLDivElement | null, graphic: HTMLDivElement | null, color: HTMLElement | null): StoryBackgroundTransformSnapshot | undefined {
    if (!position ||
        !scale ||
        !graphic ||
        !color ||
        typeof window === "undefined") {
        return undefined;
    }
    const referenceScale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    if (!(referenceScale > 0)) {
        return undefined;
    }
    const positionMatrix = readTransformMatrix(window.getComputedStyle(position).transform);
    const scaleMatrix = readTransformMatrix(window.getComputedStyle(scale).transform);
    const graphicStyle = window.getComputedStyle(graphic);
    const colorStyle = window.getComputedStyle(color);
    const opacity = Math.min(Math.max(Number(graphicStyle.opacity) || 0, 0), 1);
    return {
        offsetX: positionMatrix.x / referenceScale,
        offsetY: -positionMatrix.y / referenceScale,
        scaleX: scaleMatrix.scaleX,
        scaleY: scaleMatrix.scaleY,
        tint: readStorySpineTint(graphic) ??
            readCssColor(colorStyle.backgroundColor, opacity),
    };
}
function readActorBrightness(filter: string) {
    const value = Number(filter.match(/brightness\(([-+\d.eE]+)\)/u)?.[1]);
    return Number.isFinite(value) ? Math.max(value, 0) : 1;
}
function getActorColorSnapshots(root: HTMLElement | null) {
    const snapshots = new Map<string, StoryActorColorSnapshot>();
    const animations = typeof document !== "undefined" &&
        typeof document.getAnimations === "function"
        ? document.getAnimations()
        : [];
    for (const actor of root?.querySelectorAll<HTMLElement>('[data-spine-view-key][data-active="true"]') ?? []) {
        const colorLayer = actor.querySelector<HTMLElement>("[data-story-actor-color-layer]");
        const tracking = animations.some((animation) => animation.effect instanceof KeyframeEffect &&
            animation.effect.target === colorLayer &&
            (animation.playState === "running" || animation.playState === "paused"));
        const viewKey = actor.dataset.spineViewKey;
        if (colorLayer && viewKey) {
            snapshots.set(viewKey, {
                multiplier: readActorBrightness(window.getComputedStyle(colorLayer).filter),
                tracking,
            });
        }
    }
    return snapshots;
}
type CrashTrackingState = {
    elapsed: number;
    now: {
        x: number;
        y: number;
    };
    segment: {
        elapsed: number;
        start: {
            x: number;
            y: number;
        };
        target: {
            x: number;
            y: number;
        } | null;
    };
};
function createCrashTrackingState(): CrashTrackingState {
    return {
        elapsed: 0,
        now: { x: 0, y: 0 },
        segment: { elapsed: 0, start: { x: 0, y: 0 }, target: null },
    };
}
// NKCUICutScenPlayer의 배경 매니저 하나와 NKCCutUnit 세 슬롯은 컷신과
// CharacterView가 바뀌어도 같은 추적기 인스턴스를 계속 사용한다.
const storyCrashTrackingStates = new Map<string, CrashTrackingState>();
function getCrashTrackingState(key: string) {
    const existing = storyCrashTrackingStates.get(key);
    if (existing) {
        return existing;
    }
    const created = createCrashTrackingState();
    storyCrashTrackingStates.set(key, created);
    return created;
}
function getActorSlotReferencePosition(slot: ActorSlot) {
    if (slot === "left") {
        return { x: -516.799560546875, y: 317.60546875 };
    }
    if (slot === "right") {
        return { x: 509.200439453125, y: 317.60546875 };
    }
    return { x: -0.0045166015625, y: 317.60546875 };
}
function CrashJitter({ className, strength, durationMs = 0, revision = "", paused = false, finished = false, originX = 0, originY = 0, mode = "background", trackingKey = "", children, }: {
    className: string;
    strength: number;
    durationMs?: number;
    revision?: string | number;
    paused?: boolean;
    finished?: boolean;
    originX?: number;
    originY?: number;
    mode?: "background" | "actor";
    trackingKey?: string;
    children: React.ReactNode;
}) {
    const targetRef = useRef<HTMLDivElement>(null);
    const localTrackingStateRef = useRef<CrashTrackingState>(createCrashTrackingState());
    const configRef = useRef("");
    useEffect(() => {
        const target = targetRef.current;
        const config = `${revision}:${strength}:${durationMs}`;
        if (!target) {
            return;
        }
        const crashState = trackingKey
            ? getCrashTrackingState(trackingKey)
            : localTrackingStateRef.current;
        if (configRef.current !== config) {
            configRef.current = config;
            crashState.elapsed = 0;
            // 배경 SetCrash는 먼저 StopCrash를 호출해 현재 25ms 추적을 끝내지만,
            // NKCCutUnit.SetUnit은 actor의 진행 중 추적을 그대로 둔다.
            if (mode === "background") {
                crashState.segment = {
                    elapsed: 0,
                    start: { ...crashState.now },
                    target: null,
                };
            }
            target.style.transform = "translate(0, 0)";
        }
        if (strength <= 0 || finished) {
            crashState.elapsed = 0;
            if (mode === "background") {
                crashState.segment = {
                    elapsed: 0,
                    start: { ...crashState.now },
                    target: null,
                };
            }
            target.style.transform = "translate(0, 0)";
            return;
        }
        if (paused) {
            return;
        }
        const limit = strength / 2;
        const segmentDurationMs = 25;
        let animationFrame = 0;
        let previousTime = performance.now();
        const update = (now: number) => {
            const delta = Math.max(now - previousTime, 0);
            previousTime = now;
            crashState.elapsed += delta;
            if (durationMs > 0 && crashState.elapsed >= durationMs) {
                crashState.elapsed = 0;
                crashState.segment = {
                    elapsed: 0,
                    start: { ...crashState.now },
                    target: null,
                };
                target.style.transform = "translate(0, 0)";
                return;
            }
            const segment = crashState.segment;
            if (!segment.target || segment.elapsed >= segmentDurationMs) {
                segment.elapsed = 0;
                segment.start = { ...crashState.now };
                segment.target = {
                    x: originX - limit + Math.random() * strength,
                    y: originY - limit + Math.random() * strength,
                };
            }
            segment.elapsed += delta;
            // NKCUICutScenBGMgr는 0.025초짜리 NKMTrackingVector2(TDT_NORMAL)를
            // 반복한다. 목표 좌표를 25ms마다 순간 이동시키지 않고 프레임 사이를
            // 선형 보간해야 원본의 잔떨림 속도와 궤적이 일치한다.
            const progress = Math.min(segment.elapsed / segmentDurationMs, 1);
            const offsetX = segment.start.x + (segment.target.x - segment.start.x) * progress;
            const offsetY = segment.start.y + (segment.target.y - segment.start.y) * progress;
            crashState.now = { x: offsetX, y: offsetY };
            // tracker는 절대 anchoredPosition을 저장한다. CrashJitter는 이미 원점에
            // 배치된 자식이므로 현재 명령 원점을 빼서 같은 절대 좌표를 만든다.
            target.style.transform = `translate(${scaleReferencePixels(offsetX - originX)}, ${scaleReferencePixels(-(offsetY - originY))})`;
            animationFrame = window.requestAnimationFrame(update);
        };
        animationFrame = window.requestAnimationFrame(update);
        return () => {
            window.cancelAnimationFrame(animationFrame);
        };
    }, [durationMs, finished, mode, originX, originY, paused, revision, strength, trackingKey]);
    return (<div ref={targetRef} className={className} data-story-canvas="scale-with-screen">
      {children}
    </div>);
}
type LooseShakeEase = "inBounce" | "outElastic" | "inOutBounce" | "inOutBack" | "outCirc";
const LOOSE_SHAKE_EASES: LooseShakeEase[] = [
    "inBounce",
    "outElastic",
    "inOutBounce",
    "inOutBack",
    "outCirc",
];
function easeOutBounce(progress: number) {
    const bounce = 7.5625;
    const section = 2.75;
    if (progress < 1 / section) {
        return bounce * progress * progress;
    }
    if (progress < 2 / section) {
        const shifted = progress - 1.5 / section;
        return bounce * shifted * shifted + 0.75;
    }
    if (progress < 2.5 / section) {
        const shifted = progress - 2.25 / section;
        return bounce * shifted * shifted + 0.9375;
    }
    const shifted = progress - 2.625 / section;
    return bounce * shifted * shifted + 0.984375;
}
function applyLooseShakeEase(progress: number, ease: LooseShakeEase) {
    if (ease === "inBounce") {
        return 1 - easeOutBounce(1 - progress);
    }
    if (ease === "outElastic") {
        if (progress === 0 || progress === 1) {
            return progress;
        }
        return (Math.pow(2, -10 * progress) *
            Math.sin(((progress * 10 - 0.75) * (2 * Math.PI)) / 3) +
            1);
    }
    if (ease === "inOutBounce") {
        return progress < 0.5
            ? (1 - easeOutBounce(1 - 2 * progress)) / 2
            : (1 + easeOutBounce(2 * progress - 1)) / 2;
    }
    if (ease === "inOutBack") {
        const overshoot = 1.70158 * 1.525;
        return progress < 0.5
            ? (Math.pow(2 * progress, 2) *
                ((overshoot + 1) * 2 * progress - overshoot)) /
                2
            : (Math.pow(2 * progress - 2, 2) *
                ((overshoot + 1) * (progress * 2 - 2) + overshoot) +
                2) /
                2;
    }
    return Math.sqrt(1 - Math.pow(progress - 1, 2));
}
function LooseShakeViewport({ className, enabled, revision, children, }: {
    className: string;
    enabled: boolean;
    revision: number;
    children: React.ReactNode;
}) {
    const targetRef = useRef<HTMLDivElement>(null);
    const currentOffsetRef = useRef({ x: 0, y: 0 });
    useEffect(() => {
        const target = targetRef.current;
        if (!target) {
            return;
        }
        if (!enabled) {
            return;
        }
        let animationFrame = 0;
        let startedAt = performance.now();
        let startX = currentOffsetRef.current.x;
        let startY = currentOffsetRef.current.y;
        let endX = -30 + Math.random() * 60;
        let endY = -30 + Math.random() * 60;
        let ease = LOOSE_SHAKE_EASES[Math.floor(Math.random() * LOOSE_SHAKE_EASES.length)];
        const animate = (now: number) => {
            const progress = Math.min((now - startedAt) / 2000, 1);
            const eased = applyLooseShakeEase(progress, ease);
            const offsetX = startX + (endX - startX) * eased;
            const offsetY = startY + (endY - startY) * eased;
            currentOffsetRef.current = { x: offsetX, y: offsetY };
            target.style.transform = `translate(${scaleReferencePixels(offsetX)}, ${scaleReferencePixels(-offsetY)})`;
            if (progress >= 1) {
                startX = endX;
                startY = endY;
                endX = -30 + Math.random() * 60;
                endY = -30 + Math.random() * 60;
                ease =
                    LOOSE_SHAKE_EASES[Math.floor(Math.random() * LOOSE_SHAKE_EASES.length)];
                startedAt = now;
            }
            animationFrame = window.requestAnimationFrame(animate);
        };
        animationFrame = window.requestAnimationFrame(animate);
        return () => {
            window.cancelAnimationFrame(animationFrame);
        };
    }, [enabled, revision]);
    return (<div ref={targetRef} className={className} data-loose-shake-enabled={enabled} data-loose-shake-revision={revision} data-loose-shake-scope="background-unit">
      {children}
    </div>);
}
function unityColorToCss(color: number[]) {
    const [red = 1, green = 1, blue = 1, alpha = 0] = color;
    const channel = (value: number) => Math.round(Math.min(Math.max(Number(value) || 0, 0), 1) * 255);
    return `rgb(${channel(red)} ${channel(green)} ${channel(blue)} / ${Math.min(Math.max(Number(alpha) || 0, 0), 1)})`;
}
function unityColorToOpaqueCss(color: number[]) {
    return unityColorToCss([color[0] ?? 1, color[1] ?? 1, color[2] ?? 1, 1]);
}
function unityColorAlpha(color: number[]) {
    return Math.min(Math.max(Number(color[3] ?? 1) || 0, 0), 1);
}
function FireAmbientEffect({ effect, processId, }: {
    effect: StoryGameObjectEffect;
    processId: string;
}) {
    const texture = effect.assets[0];
    if (!texture || !effect.layers?.length) {
        return null;
    }
    return (<div className={styles.fireAmbientEffect} data-story-fxm-player-duration={effect.duration} data-story-fire-layer-count={effect.layers.length} data-story-fire-unsupported-parts={effect.unsupportedParts?.length ?? 0} aria-hidden="true">
      {effect.layers.map((layer) => (<span key={layer.index} className={styles.fireAmbientLayer} data-story-passive-animation="true" data-story-fire-layer={layer.index} data-story-fire-frame-period={layer.framePeriod} style={{
                width: scaleReferencePixels(layer.width),
                height: scaleReferencePixels(layer.height),
                transform: `translate(-50%, -50%) translate(${scaleReferencePixels(layer.x)}, ${scaleReferencePixels(-layer.y)})`,
                opacity: layer.rgbMultiplier,
                backgroundImage: `url("${deploymentUrl(`${texture}`)}")`,
                backgroundSize: `${layer.columns * 100}% ${layer.rows * 100}%`,
                "--story-fire-frame-period": `${layer.framePeriod}s`,
            } as React.CSSProperties}/>))}
      {effect.particleLayers?.length ? (<GunshotSpriteFxmEffect effect={effect} processId={processId} paused={false} className={styles.fireParticleFxmEffect}/>) : null}
    </div>);
}
function CharacterExceptionalFxmEffect({ effect, processId, paused, spineInstanceId, className, }: {
    effect: StoryGameObjectEffect;
    processId: string;
    paused: boolean;
    spineInstanceId: string;
    className: string;
}) {
    const renderStageSpine = effect.renderStageSpine;
    const renderStageSpineInstanceId = `${spineInstanceId}:render-stage`;
    const renderStageMesh = effect.renderStageMesh;
    const hasFxmLayers = Boolean(effect.spriteLayers?.length || effect.particleLayers?.length);
    return (<div className={`${className} ${styles.actorExceptionalComposite}`} data-story-character-exceptional-kind={effect.kind} data-story-render-stage-spine={renderStageSpine?.asset.id ?? ""} data-story-character-exceptional-unsupported={effect.unsupportedParts?.length ?? 0}>
      {renderStageSpine ? (<div className={styles.actorExceptionalRenderStageSpine}>
          <StorySpineActor asset={renderStageSpine.asset} face={renderStageSpine.animation} commandFace={renderStageSpine.animation} loop={renderStageSpine.loop} instanceId={renderStageSpineInstanceId} trackedBoneNames={effect.renderStageTrackedSpineBones ?? []} prefabAnimation={renderStageSpine.animation} prefabAnimationOnly prefabAnimationLoop={renderStageSpine.loop} tintColor={renderStageSpine.tint} paused={paused} label=""/>
        </div>) : null}
      {renderStageMesh && effect.spriteLayers?.length ? (<GunshotSpriteFxmEffect effect={{ ...effect, particleLayers: [] }} processId={processId} paused={paused} spineInstanceId={renderStageSpineInstanceId} className={styles.actorExceptionalRenderStageGlow}/>) : null}
      {renderStageMesh ? (<StoryWaveRenderStageMeshEffect effect={renderStageMesh} processId={processId} paused={paused} spineInstanceId={renderStageSpineInstanceId} className={styles.actorExceptionalRenderStageMesh}/>) : null}
      {hasFxmLayers ? (<GunshotSpriteFxmEffect effect={renderStageMesh ? { ...effect, spriteLayers: [] } : effect} processId={processId} paused={paused} spineInstanceId={renderStageSpine ? renderStageSpineInstanceId : spineInstanceId} className={styles.actorExceptionalFxmLayers}/>) : null}
    </div>);
}
function Mainstream134011RenderStage({ effect, animation, side, processId, paused, }: {
    effect: StoryGameObjectEffect;
    animation: string;
    side: "back" | "front";
    processId: string;
    paused: boolean;
}) {
    const variantName = animation.trim().toUpperCase() === "BASE2"
        ? "BASE2"
        : "BASE";
    const cameraPath = side === "back" ? "/CAM_BACK/" : "/CAM_FRONT/";
    const { particleEffect, spriteEffect, auraPaths } = useMemo(() => {
        const variant = effect.animationVariants?.[variantName];
        const activePaths = new Set(variant?.particlePaths ?? []);
        const activeSpritePaths = new Set(variant?.spritePaths ?? []);
        const activeAuraPaths = (variant?.auraPaths ?? []).filter((path) => path.includes(cameraPath));
        const particleLayers = (effect.particleLayers ?? []).filter((layer) => activePaths.has(layer.path) && layer.path.includes(cameraPath));
        const spriteLayers = (effect.spriteLayers ?? []).filter((layer) => activeSpritePaths.has(layer.path) && layer.path.includes(cameraPath));
        return {
            particleEffect: particleLayers.length
                ? { ...effect, spriteLayers: [], particleLayers }
                : null,
            spriteEffect: spriteLayers.length
                ? {
                    ...effect,
                    duration: effect.transientSpriteDuration ?? 1,
                    loop: false,
                    spriteLayers,
                    particleLayers: [],
                }
                : null,
            auraPaths: activeAuraPaths,
        };
    }, [cameraPath, effect, variantName]);
    if (!particleEffect && !spriteEffect && auraPaths.length === 0) {
        return null;
    }
    return (<>
      {side === "back" && effect.mainstream134011Aura && auraPaths.length ? (<StoryMainstream134011Aura effect={effect} activePaths={auraPaths} side={side} processId={`${processId}:${variantName}:${side}:aura`} paused={paused} className={styles.mainstream134011BackAura}/>) : null}
      {particleEffect ? (<GunshotSpriteFxmEffect effect={particleEffect} processId={`${processId}:${variantName}:${side}:particles`} paused={paused} className={side === "back"
                ? styles.mainstream134011BackEffect
                : styles.mainstream134011FrontEffect}/>) : null}
      {spriteEffect ? (<GunshotSpriteFxmEffect effect={spriteEffect} processId={`${processId}:${variantName}:${side}:sprites`} paused={paused} className={styles.mainstream134011FrontEffect}/>) : null}
      {side === "front" && effect.mainstream134011Aura && auraPaths.length ? (<StoryMainstream134011Aura effect={effect} activePaths={auraPaths} side={side} processId={`${processId}:${variantName}:${side}:aura`} paused={paused} className={styles.mainstream134011FrontAura}/>) : null}
    </>);
}
function BloodSpreadEffect({ effect, processId, slot = "current", }: {
    effect: StoryGameObjectEffect;
    processId: string;
    slot?: "current" | "previous";
}) {
    const effectRef = useRef<HTMLDivElement | null>(null);
    useLayoutEffect(() => {
        const target = effectRef.current;
        if (!target) {
            return;
        }
        const values = new Uint32Array(3);
        window.crypto.getRandomValues(values);
        values.forEach((value, index) => {
            target.style.setProperty(`--story-blood-rotation-${index}`, `${(value / 4294967296) * 360}deg`);
        });
    }, [processId]);
    const [splatOne, splatTwo, splatThree, vignette] = effect.assets;
    return (<div ref={effectRef} className={styles.bloodSpreadEffect} data-story-game-object-effect-slot={slot} data-story-fxm-player-duration={effect.duration} data-story-fxm-trigger-delay={effect.triggerDelay ?? 0} style={{
            "--story-blood-trigger-delay": `${effect.triggerDelay ?? 0}s`,
        } as React.CSSProperties} aria-hidden="true">
      <span className={styles.bloodWhiteFlash} data-story-passive-animation="true"/>
      {[splatOne, splatTwo, splatThree].map((asset, index) => asset ? (<span key={asset} className={styles.bloodSplat} data-effect-part={index} data-story-passive-animation="true" style={{
                "--story-blood-mask": `url("${deploymentUrl(`${asset}`)}")`,
            } as React.CSSProperties}/>) : null)}
      {vignette ? (<span className={styles.bloodVignetteGradient} data-story-passive-animation="true">
          <i className={styles.bloodVignetteMask} data-story-passive-animation="true" style={{
                "--story-blood-mask": `url("${deploymentUrl(`${vignette}`)}")`,
            } as React.CSSProperties}/>
        </span>) : null}
      <span className={styles.bloodInvertFlicker} data-effect-flicker="0" data-story-passive-animation="true"/>
      <span className={styles.bloodInvertFlicker} data-effect-flicker="1" data-story-passive-animation="true"/>
    </div>);
}
type FxmScalarKey = {
    time: number;
    value: number;
    inSlope?: number | "Infinity" | "-Infinity";
    outSlope?: number | "Infinity" | "-Infinity";
};
type FxmColorKey = {
    time: number;
    value: [
        number,
        number,
        number
    ];
};
const SLASH_CLANK_GLOW_COLORS: FxmColorKey[] = [
    { time: 0.0644846265, value: [0, 0.3826260567, 1] },
    { time: 1, value: [0.0012380751, 0, 0.2549019754] },
];
const SLASH_CLANK_GLOW_ALPHA: FxmScalarKey[] = [
    { time: 0, value: 0 },
    { time: 0.0294193942, value: 1 },
    { time: 0.0938887617, value: 1 },
    { time: 1, value: 0 },
];
const SLASH_CLANK_LENS_COLORS: FxmColorKey[] = [
    { time: 0, value: [1, 1, 1] },
    { time: 1, value: [1, 1, 1] },
];
const SLASH_CLANK_LENS_ALPHA: FxmScalarKey[] = [
    { time: 0, value: 1 },
    { time: 0.2547493706, value: 0.1960784346 },
    { time: 1, value: 0 },
];
const SLASH_CLANK_FLICKER_COLORS: FxmColorKey[] = [
    { time: 0.0180972, value: [1, 1, 1] },
    { time: 0.0644846265, value: [0, 0.6626718044, 1] },
    { time: 0.0905012589, value: [0.7960784435, 0.8190218806, 1] },
];
const SLASH_CLANK_FLICKER_ALPHA: FxmScalarKey[] = [
    { time: 0, value: 0 },
    { time: 0.0497749294, value: 1 },
    { time: 0.0667429618, value: 0.7725490332 },
    { time: 0.1334859236, value: 0.2823529541 },
    { time: 1, value: 0 },
];
const SLASH_CLANK_SLASH_ALPHA: FxmScalarKey[] = [
    { time: 0, value: 1 },
    { time: 0.6210421912, value: 1 },
    { time: 1, value: 0 },
];
function sampleFxmScalar(keys: FxmScalarKey[], time: number) {
    if (time <= keys[0].time) {
        return keys[0].value;
    }
    for (let index = 1; index < keys.length; index += 1) {
        const right = keys[index];
        if (time <= right.time) {
            const left = keys[index - 1];
            const duration = right.time - left.time;
            const progress = duration > 0 ? (time - left.time) / duration : 1;
            return left.value + (right.value - left.value) * progress;
        }
    }
    return keys.at(-1)?.value ?? 0;
}
function sampleFxmColor(keys: FxmColorKey[], time: number) {
    if (time <= keys[0].time) {
        return keys[0].value;
    }
    for (let index = 1; index < keys.length; index += 1) {
        const right = keys[index];
        if (time <= right.time) {
            const left = keys[index - 1];
            const duration = right.time - left.time;
            const progress = duration > 0 ? (time - left.time) / duration : 1;
            return left.value.map((value, channel) => value + (right.value[channel] - value) * progress) as [
                number,
                number,
                number
            ];
        }
    }
    return keys.at(-1)?.value ?? [1, 1, 1];
}
function sampleFxmCurve(keys: FxmScalarKey[], time: number) {
    if (time <= keys[0].time) {
        return keys[0].value;
    }
    for (let index = 1; index < keys.length; index += 1) {
        const right = keys[index];
        if (time <= right.time) {
            const left = keys[index - 1];
            const duration = right.time - left.time;
            if (duration <= 0) {
                return right.value;
            }
            // Unity AnimationCurve는 무한 탄젠트를 계단형 키로 취급한다.
            const leftSlope = Number(left.outSlope ?? 0);
            const rightSlope = Number(right.inSlope ?? 0);
            if (!Number.isFinite(leftSlope) || !Number.isFinite(rightSlope)) {
                return time < right.time ? left.value : right.value;
            }
            const progress = (time - left.time) / duration;
            const progressSquared = progress * progress;
            const progressCubed = progressSquared * progress;
            const leftTangent = leftSlope * duration;
            const rightTangent = rightSlope * duration;
            return ((2 * progressCubed - 3 * progressSquared + 1) * left.value +
                (progressCubed - 2 * progressSquared + progress) * leftTangent +
                (-2 * progressCubed + 3 * progressSquared) * right.value +
                (progressCubed - progressSquared) * rightTangent);
        }
    }
    return keys.at(-1)?.value ?? 0;
}
function SlashClankEffect({ effect, processId, paused, }: {
    effect: StoryGameObjectEffect;
    processId: string;
    paused: boolean;
}) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const pausedRef = useRef(paused);
    useEffect(() => {
        pausedRef.current = paused;
    }, [paused]);
    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !context) {
            return;
        }
        const images = effect.assets.map((asset) => {
            const image = new window.Image();
            image.decoding = "async";
            image.src = deploymentUrl(asset);
            return image;
        });
        const scratchByImage = new WeakMap<HTMLImageElement, HTMLCanvasElement>();
        let disposed = false;
        let ready = false;
        let animationFrame = 0;
        let elapsed = 0;
        let previousTime = performance.now();
        Promise.all(images.map((image) => new Promise<void>((resolve) => {
            if (image.complete && image.naturalWidth > 0) {
                resolve();
                return;
            }
            image.addEventListener("load", () => resolve(), { once: true });
            image.addEventListener("error", () => resolve(), { once: true });
        }))).then(() => {
            ready = !disposed;
        });
        const drawAdditiveSprite = ({ image, centerX, centerY, width, height, color, alpha, flipX = false, flipY = false, }: {
            image: HTMLImageElement | undefined;
            centerX: number;
            centerY: number;
            width: number;
            height: number;
            color: [
                number,
                number,
                number
            ];
            alpha: number;
            flipX?: boolean;
            flipY?: boolean;
        }) => {
            if (!image?.naturalWidth || alpha <= 0) {
                return;
            }
            let scratch = scratchByImage.get(image);
            if (!scratch) {
                scratch = document.createElement("canvas");
                scratch.width = image.naturalWidth;
                scratch.height = image.naturalHeight;
                scratchByImage.set(image, scratch);
            }
            const scratchContext = scratch.getContext("2d");
            if (!scratchContext) {
                return;
            }
            scratchContext.clearRect(0, 0, scratch.width, scratch.height);
            scratchContext.globalAlpha = 1;
            scratchContext.globalCompositeOperation = "source-over";
            scratchContext.drawImage(image, 0, 0);
            scratchContext.globalCompositeOperation = "multiply";
            scratchContext.fillStyle = `rgb(${color
                .map((channel) => Math.round(Math.min(Math.max(channel, 0), 1) * 255))
                .join(" ")})`;
            scratchContext.fillRect(0, 0, scratch.width, scratch.height);
            scratchContext.globalCompositeOperation = "destination-in";
            scratchContext.drawImage(image, 0, 0);
            context.save();
            context.globalCompositeOperation = "lighter";
            context.globalAlpha = Math.min(Math.max(alpha, 0), 1);
            context.translate(centerX, centerY);
            context.scale(flipX ? -1 : 1, flipY ? -1 : 1);
            context.drawImage(scratch, -width / 2, -height / 2, width, height);
            context.restore();
        };
        const drawGradientSprite = ({ image, time, startTime, duration, intensity, colorKeys, alphaKeys, ...layout }: {
            image: HTMLImageElement | undefined;
            time: number;
            startTime: number;
            duration: number;
            intensity: number;
            colorKeys: FxmColorKey[];
            alphaKeys: FxmScalarKey[];
            centerX: number;
            centerY: number;
            width: number;
            height: number;
            flipX?: boolean;
            flipY?: boolean;
        }) => {
            if (time < startTime || time > startTime + duration) {
                return;
            }
            const progress = Math.min(Math.max((time - startTime) / duration, 0), 1);
            const color = sampleFxmColor(colorKeys, progress).map((channel) => channel * intensity) as [
                number,
                number,
                number
            ];
            const alpha = sampleFxmScalar(alphaKeys, progress) * intensity;
            drawAdditiveSprite({ image, color, alpha, ...layout });
        };
        const render = (time: number) => {
            const delta = Math.max(time - previousTime, 0) / 1000;
            previousTime = time;
            if (!pausedRef.current) {
                elapsed += delta;
            }
            context.clearRect(0, 0, canvas.width, canvas.height);
            const effectTime = elapsed - (effect.triggerDelay ?? 0);
            if (ready && effectTime >= 0) {
                const drawSet = ({ startTime, glowDuration, lensDuration, flickerStartTime, lensX, lensY, lineScaleX, lineScaleY, glowFlipX, glowFlipY, flashFlipX, }: {
                    startTime: number;
                    glowDuration: number;
                    lensDuration: number;
                    flickerStartTime: number;
                    lensX: number;
                    lensY: number;
                    lineScaleX: number;
                    lineScaleY: number;
                    glowFlipX: boolean;
                    glowFlipY: boolean;
                    flashFlipX: boolean;
                }) => {
                    drawGradientSprite({
                        image: images[0],
                        time: effectTime,
                        startTime,
                        duration: glowDuration,
                        intensity: 0.8,
                        colorKeys: SLASH_CLANK_GLOW_COLORS,
                        alphaKeys: SLASH_CLANK_GLOW_ALPHA,
                        centerX: 1007,
                        centerY: 805,
                        width: 128 * 16.9322490692,
                        height: 128 * 14.1884040833,
                        flipX: glowFlipX,
                        flipY: glowFlipY,
                    });
                    drawGradientSprite({
                        image: images[1],
                        time: effectTime,
                        startTime,
                        duration: lensDuration,
                        intensity: 1,
                        colorKeys: SLASH_CLANK_LENS_COLORS,
                        alphaKeys: SLASH_CLANK_LENS_ALPHA,
                        centerX: lensX,
                        centerY: lensY,
                        width: 512 * 5.3915920258,
                        height: 32 * 6.0239520073,
                        flipX: true,
                    });
                    drawGradientSprite({
                        image: images[2],
                        time: effectTime,
                        startTime,
                        duration: lensDuration,
                        intensity: 1,
                        colorKeys: SLASH_CLANK_LENS_COLORS,
                        alphaKeys: SLASH_CLANK_LENS_ALPHA,
                        centerX: lensX,
                        centerY: lensY,
                        width: 512 * 4.7287797928,
                        height: 512 * 4.7287797928,
                        flipX: flashFlipX,
                    });
                    drawGradientSprite({
                        image: images[3],
                        time: effectTime,
                        startTime,
                        duration: lensDuration,
                        intensity: 1,
                        colorKeys: SLASH_CLANK_LENS_COLORS,
                        alphaKeys: SLASH_CLANK_LENS_ALPHA,
                        centerX: lensX,
                        centerY: lensY,
                        width: 512 * lineScaleX,
                        height: 64 * lineScaleY,
                        flipX: true,
                    });
                    drawGradientSprite({
                        image: images[4],
                        time: effectTime,
                        startTime: flickerStartTime,
                        duration: 0.3,
                        intensity: 0.3,
                        colorKeys: SLASH_CLANK_FLICKER_COLORS,
                        alphaKeys: SLASH_CLANK_FLICKER_ALPHA,
                        centerX: 960,
                        centerY: 540,
                        width: 2048,
                        height: 1216,
                    });
                };
                drawSet({
                    startTime: 0.03,
                    glowDuration: 1.8,
                    lensDuration: 0.33,
                    flickerStartTime: 0.03,
                    lensX: 546,
                    lensY: 608,
                    lineScaleX: 3.2764079571,
                    lineScaleY: 3.6606860161,
                    glowFlipX: false,
                    glowFlipY: false,
                    flashFlipX: false,
                });
                drawSet({
                    startTime: 0.4,
                    glowDuration: 2,
                    lensDuration: 0.4,
                    flickerStartTime: 0.43,
                    lensX: 1354,
                    lensY: 366,
                    lineScaleX: 4.9579858779,
                    lineScaleY: 4.9579858779,
                    glowFlipX: true,
                    glowFlipY: true,
                    flashFlipX: true,
                });
                if (effectTime <= 1) {
                    const frameValue = effectTime <= 0.6120262146
                        ? effectTime * 14.7052526474
                        : 9;
                    const frameIndex = Math.min(Math.max(Math.trunc(frameValue), 0), 8);
                    drawAdditiveSprite({
                        image: images[5 + frameIndex],
                        centerX: 960,
                        centerY: 540,
                        width: 1024 * 1.9199999571,
                        height: 512 * 2.1600000858,
                        color: [0.5, 0.5, 0.5],
                        alpha: sampleFxmScalar(SLASH_CLANK_SLASH_ALPHA, Math.min(Math.max(effectTime, 0), 1)) * 0.5,
                    });
                }
            }
            if (!disposed && elapsed < effect.duration + (effect.triggerDelay ?? 0)) {
                animationFrame = window.requestAnimationFrame(render);
            }
        };
        animationFrame = window.requestAnimationFrame(render);
        return () => {
            disposed = true;
            window.cancelAnimationFrame(animationFrame);
            context.clearRect(0, 0, canvas.width, canvas.height);
        };
    }, [effect, processId]);
    return (<canvas ref={canvasRef} className={styles.slashClankEffect} width={1920} height={1080} data-story-fxm-player-duration={effect.duration} data-story-fxm-trigger-delay={effect.triggerDelay ?? 0} data-story-fxm-sprite-count={11} data-story-fxm-material="CMN_FX_SPRITE_PA" aria-hidden="true"/>);
}
type FxmMatrix = [
    number,
    number,
    number,
    number,
    number,
    number
];
function multiplyFxmMatrix(left: FxmMatrix, right: FxmMatrix): FxmMatrix {
    return [
        left[0] * right[0] + left[2] * right[1],
        left[1] * right[0] + left[3] * right[1],
        left[0] * right[2] + left[2] * right[3],
        left[1] * right[2] + left[3] * right[3],
        left[0] * right[4] + left[2] * right[5] + left[4],
        left[1] * right[4] + left[3] * right[5] + left[5],
    ];
}
function createFxmNodeMatrix({ x, y, scaleX, scaleY, rotation, }: {
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
    rotation: number;
}): FxmMatrix {
    const radians = (rotation * Math.PI) / 180;
    const cosine = Math.cos(radians);
    const sine = Math.sin(radians);
    return [
        cosine * scaleX,
        sine * scaleX,
        -sine * scaleY,
        cosine * scaleY,
        x,
        y,
    ];
}
function integrateFxmCurve(keys: FxmScalarKey[], endTime: number) {
    const clampedEnd = Math.min(Math.max(endTime, 0), 1);
    if (!keys.length || clampedEnd <= 0) {
        return 0;
    }
    // NKC_FXM_ROTATE와 NKC_FXM_SHAKER는 매 프레임 곡선값을 deltaTime으로
    // 적분한다. 고정 구간 Simpson 적분으로 브라우저 프레임률과 분리한다.
    const steps = 64;
    const width = clampedEnd / steps;
    let total = sampleFxmCurve(keys, 0) + sampleFxmCurve(keys, clampedEnd);
    for (let index = 1; index < steps; index += 1) {
        total += sampleFxmCurve(keys, index * width) * (index % 2 ? 4 : 2);
    }
    return (total * width) / 3;
}
function fxmNoiseHash(x: number, y: number) {
    let value = Math.imul(x, 0x1f123bb5) ^ Math.imul(y, 0x5f356495);
    value = Math.imul(value ^ (value >>> 15), 0x2c1b3c6d);
    value = Math.imul(value ^ (value >>> 12), 0x297a2d39);
    return ((value ^ (value >>> 15)) >>> 0) / 4294967296;
}
function fxmPerlinNoise(x: number, y: number) {
    const left = Math.floor(x);
    const bottom = Math.floor(y);
    const localX = x - left;
    const localY = y - bottom;
    const fade = (value: number) => value * value * value * (value * (value * 6 - 15) + 10);
    const interpolate = (from: number, to: number, amount: number) => from + (to - from) * amount;
    const gradient = (gridX: number, gridY: number, dx: number, dy: number) => {
        const angle = fxmNoiseHash(gridX, gridY) * Math.PI * 2;
        return Math.cos(angle) * dx + Math.sin(angle) * dy;
    };
    const lower = interpolate(gradient(left, bottom, localX, localY), gradient(left + 1, bottom, localX - 1, localY), fade(localX));
    const upper = interpolate(gradient(left, bottom + 1, localX, localY - 1), gradient(left + 1, bottom + 1, localX - 1, localY - 1), fade(localX));
    return Math.min(Math.max(interpolate(lower, upper, fade(localY)) * 0.7071 + 0.5, 0), 1);
}
function sampleFxmTransformEvaluator(evaluator: StoryFxmTransformEvaluator, playerTime: number, randomFactor: [
    number,
    number,
    number
]) {
    if (playerTime < evaluator.startTime) {
        return null;
    }
    const progress = evaluator.duration > 0
        ? Math.min(Math.max((playerTime - evaluator.startTime) / evaluator.duration, 0), 1)
        : 1;
    const factorX = evaluator.random ? randomFactor[0] : evaluator.factorX;
    const factorY = evaluator.random ? randomFactor[1] : evaluator.factorY;
    const factorZ = evaluator.random ? randomFactor[2] : evaluator.factorZ;
    if (evaluator.kind === "position") {
        const valueX = sampleFxmCurve(evaluator.curveX, progress) * factorX;
        return {
            positionX: valueX,
            positionY: evaluator.separateAxes
                ? sampleFxmCurve(evaluator.curveY, progress) * factorY
                : valueX,
            scaleX: null,
            scaleY: null,
            rotation: null,
        };
    }
    if (evaluator.kind === "scale") {
        const valueX = sampleFxmCurve(evaluator.curveX, progress) * factorX;
        return {
            positionX: null,
            positionY: null,
            scaleX: valueX,
            scaleY: evaluator.separateAxes
                ? sampleFxmCurve(evaluator.curveY, progress) * factorY
                : valueX,
            rotation: null,
        };
    }
    if (evaluator.continuous) {
        const curve = evaluator.separateAxes ? evaluator.curveZ : evaluator.curveX;
        const factor = evaluator.separateAxes ? evaluator.factorZ : evaluator.factorX;
        const integral = integrateFxmCurve(curve, progress) * evaluator.duration;
        return {
            positionX: null,
            positionY: null,
            scaleX: null,
            scaleY: null,
            rotation: integral * factor * (evaluator.speed ?? 0),
            additiveRotation: true,
        };
    }
    return {
        positionX: null,
        positionY: null,
        scaleX: null,
        scaleY: null,
        rotation: evaluator.separateAxes
            ? sampleFxmCurve(evaluator.curveZ, progress) * factorZ
            : sampleFxmCurve(evaluator.curveX, progress) * factorX,
        additiveRotation: false,
    };
}
function storyParticleRandom(seed: number, particleIndex: number, channel: number) {
    let value = (seed ^ Math.imul(particleIndex + 0x6d2b79f5, 0x1b873593) ^
        Math.imul(channel + 1, 0x85ebca6b)) >>> 0;
    value = Math.imul(value ^ (value >>> 16), 0x7feb352d) >>> 0;
    value = Math.imul(value ^ (value >>> 15), 0x846ca68b) >>> 0;
    return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}
function storyStringHash(value: string) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}
function getStoryFxmRandomVariant(effect: StoryGameObjectEffect, group: string | undefined, elapsed: number, processId: string) {
    if (!group) {
        return undefined;
    }
    const weights = effect.randomVariants?.[group]?.weights;
    if (!weights?.length) {
        return undefined;
    }
    const cycle = effect.loop && effect.duration > 0
        ? Math.floor(elapsed / effect.duration)
        : 0;
    const random = storyParticleRandom(storyStringHash(`${processId}:${group}`), cycle, 41);
    const total = weights.reduce((sum, weight) => sum + Math.max(weight, 0), 0);
    let cursor = random * total;
    for (let index = 0; index < weights.length; index += 1) {
        cursor -= Math.max(weights[index], 0);
        if (cursor <= 0) {
            return index;
        }
    }
    return weights.length - 1;
}
function sampleStoryParticleRange(value: number | {
    min: number;
    max: number;
}, random: number) {
    if (typeof value === "number") {
        return value;
    }
    return value.min + (value.max - value.min) * random;
}
function sampleStoryParticleCustomCurve(value: StoryFxmParticleCustomCurve | undefined, progress: number, random: number, fallback: number) {
    if (!value) {
        return fallback;
    }
    const minimum = value.minCurve?.length
        ? sampleFxmCurve(value.minCurve, progress) * (value.minMultiplier ?? 1)
        : (value.min ?? fallback);
    const maximum = value.maxCurve?.length
        ? sampleFxmCurve(value.maxCurve, progress) * (value.maxMultiplier ?? 1)
        : (value.max ?? minimum);
    return minimum + (maximum - minimum) * random;
}
function integrateStoryParticleCustomCurve(value: StoryFxmParticleCustomCurve | undefined, progress: number, random: number) {
    if (!value || progress <= 0) {
        return 0;
    }
    const steps = 32;
    const width = progress / steps;
    let total = sampleStoryParticleCustomCurve(value, 0, random, 0) +
        sampleStoryParticleCustomCurve(value, progress, random, 0);
    for (let index = 1; index < steps; index += 1) {
        total += sampleStoryParticleCustomCurve(value, index * width, random, 0) * (index % 2 ? 4 : 2);
    }
    return (total * width) / 3;
}
function GunshotSpriteFxmEffect({ effect, processId, paused, spineInstanceId = "", className = styles.gunshotSpriteFxmEffect, }: {
    effect: StoryGameObjectEffect;
    processId: string;
    paused: boolean;
    spineInstanceId?: string;
    className?: string;
}) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const pausedRef = useRef(paused);
    useEffect(() => {
        pausedRef.current = paused;
    }, [paused]);
    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        const layers = effect.spriteLayers ?? [];
        const particleLayers = effect.particleLayers ?? [];
        if (!canvas || !context || (layers.length === 0 && particleLayers.length === 0)) {
            return;
        }
        const imageEntries = effect.assets.map(getStoryFxmImage);
        const images = imageEntries.map((entry) => entry.image);
        const scratchByImage = new WeakMap<HTMLImageElement, HTMLCanvasElement>();
        const randomFactors = new Map<string, [
            number,
            number,
            number
        ]>();
        const shakerRandom = new Map<string, [
            number,
            number,
            number,
            number,
            number,
            number
        ]>();
        const distanceEmissionStates = new Map<number, {
            occurrence: number;
            previousX: number;
            previousY: number;
            initialized: boolean;
            mileage: number;
            nextIndex: number;
            births: Array<{
                particleIndex: number;
                birthTime: number;
                emitterX: number;
                emitterY: number;
            }>;
        }>();
        const randomValues = new Uint32Array(layers.reduce((count, layer) => count + layer.transformChain.reduce((nodeCount, node) => nodeCount + (node.evaluators ?? (node.evaluator ? [node.evaluator] : []))
            .filter((evaluator) => evaluator.random).length, 0) * 3, 0));
        window.crypto.getRandomValues(randomValues);
        let randomIndex = 0;
        layers.forEach((layer) => {
            layer.transformChain.forEach((node, nodeIndex) => {
                const evaluators = node.evaluators ?? (node.evaluator ? [node.evaluator] : []);
                evaluators.forEach((evaluator, evaluatorIndex) => {
                    if (!evaluator.random) {
                        return;
                    }
                    const random = () => randomValues[randomIndex++] / 4294967296;
                    const key = node.evaluators
                        ? `${layer.id}:${nodeIndex}:${evaluatorIndex}`
                        : `${layer.id}:${nodeIndex}`;
                    randomFactors.set(key, [
                        evaluator.minX + (evaluator.maxX - evaluator.minX) * random(),
                        evaluator.minY + (evaluator.maxY - evaluator.minY) * random(),
                        evaluator.minZ + (evaluator.maxZ - evaluator.minZ) * random(),
                    ]);
                });
                const shakers = node.shakers ?? (node.shaker ? [node.shaker] : []);
                shakers.forEach((shaker) => {
                    if (shakerRandom.has(shaker.id)) {
                        return;
                    }
                    const values = new Uint32Array(6);
                    window.crypto.getRandomValues(values);
                    shakerRandom.set(shaker.id, Array.from(values, (value) => value / 4294967296 * 20 - 10) as [
                        number,
                        number,
                        number,
                        number,
                        number,
                        number
                    ]);
                });
            });
        });
        let disposed = false;
        let ready = false;
        let animationFrame = 0;
        let elapsed = 0;
        let previousTime = performance.now();
        Promise.all(imageEntries.map((entry) => entry.loaded)).then(() => {
            ready = !disposed;
            canvas.dataset.storyFxmAssetsReady = String(ready);
            canvas.dataset.storyFxmLoadedAssets = String(images.filter((image) => image.naturalWidth > 0).length);
        });
        const getTintedImage = (image: HTMLImageElement, color: [
            number,
            number,
            number
        ], mode: "multiply" | "pma-additive" = "multiply") => {
            let scratch = scratchByImage.get(image);
            if (!scratch) {
                scratch = document.createElement("canvas");
                scratch.width = image.naturalWidth;
                scratch.height = image.naturalHeight;
                scratchByImage.set(image, scratch);
            }
            const scratchContext = scratch.getContext("2d");
            if (!scratchContext) {
                return image;
            }
            scratchContext.clearRect(0, 0, scratch.width, scratch.height);
            scratchContext.globalAlpha = 1;
            scratchContext.globalCompositeOperation = "source-over";
            scratchContext.drawImage(image, 0, 0);
            scratchContext.fillStyle = `rgb(${color
                .map((channel) => Math.round(Math.min(Math.max(channel, 0), 1) * 255))
                .join(" ")})`;
            if (mode === "pma-additive") {
                scratchContext.globalCompositeOperation = "source-in";
                scratchContext.fillRect(0, 0, scratch.width, scratch.height);
            }
            else {
                scratchContext.globalCompositeOperation = "multiply";
                scratchContext.fillRect(0, 0, scratch.width, scratch.height);
                scratchContext.globalCompositeOperation = "destination-in";
                scratchContext.drawImage(image, 0, 0);
            }
            return scratch;
        };
        const render = (time: number) => {
            const delta = Math.max(time - previousTime, 0) / 1000;
            previousTime = time;
            if (!pausedRef.current) {
                elapsed += delta;
            }
            context.clearRect(0, 0, canvas.width, canvas.height);
            let drawnLayerCount = 0;
            let activeLayerCount = 0;
            let imageReadyLayerCount = 0;
            let positiveAlphaLayerCount = 0;
            let drawnParticleCount = 0;
            if (ready) {
                layers.forEach((layer) => {
                    if (layer.randomVariant !== undefined &&
                        getStoryFxmRandomVariant(effect, layer.randomGroup, elapsed, processId) !== layer.randomVariant) {
                        return;
                    }
                    const effectTime = effect.loop && effect.duration > 0
                        ? elapsed % effect.duration
                        : elapsed;
                    let playerTime: number;
                    if (layer.playerRepeatPeriod && layer.playerRepeatPeriod > 0) {
                        const initialDelay = layer.playerDelay ?? 0;
                        if (elapsed < initialDelay) {
                            return;
                        }
                        playerTime = (elapsed - initialDelay) % layer.playerRepeatPeriod;
                    }
                    else {
                        const playerDelays = layer.playerDelays ?? [layer.playerDelay];
                        const eligiblePlayerDelays = getStoryFxmEligiblePlayerDelays(playerDelays, Boolean(effect.loop), elapsed, effect.duration);
                        const playerDelay = [...eligiblePlayerDelays]
                            .reverse()
                            .find((delay) => delay <= effectTime);
                        if (playerDelay === undefined) {
                            return;
                        }
                        playerTime = effectTime - playerDelay;
                    }
                    if (playerTime < layer.startTime ||
                        playerTime > layer.startTime + layer.duration) {
                        return;
                    }
                    activeLayerCount += 1;
                    const progress = layer.duration > 0
                        ? Math.min(Math.max((playerTime - layer.startTime) / layer.duration, 0), 1)
                        : 1;
                    const frameValue = layer.frameCurve.length
                        ? sampleFxmCurve(layer.frameCurve, progress)
                        : 0;
                    const frameIndex = Math.min(Math.max(Math.trunc(frameValue), 0), layer.frameAssets.length - 1);
                    const image = images[layer.frameAssets[frameIndex]];
                    if (!image?.naturalWidth) {
                        return;
                    }
                    imageReadyLayerCount += 1;
                    const gradientColor = sampleFxmColor(layer.gradient.colors, progress);
                    const gradientAlpha = sampleFxmScalar(layer.gradient.alphas, progress);
                    const alphaCurve = layer.useAlphaCurve && layer.alphaCurve.length
                        ? sampleFxmCurve(layer.alphaCurve, progress)
                        : 1;
                    const blendCurve = layer.useBlendCurve && layer.blendCurve.length
                        ? sampleFxmCurve(layer.blendCurve, progress)
                        : 1;
                    let color: [
                        number,
                        number,
                        number
                    ];
                    let alpha: number;
                    let pmaRgbMultiplier = 0;
                    if (layer.material === "pma") {
                        pmaRgbMultiplier =
                            gradientAlpha * alphaCurve * layer.alphaMultiplier * layer.colorBoost;
                        alpha =
                            gradientAlpha * alphaCurve * layer.alphaMultiplier *
                                layer.blendFactor * blendCurve;
                        const baseColorRatio = alpha > 0
                            ? Math.min(pmaRgbMultiplier / alpha, 1)
                            : 0;
                        color = gradientColor.map((channel) => channel * baseColorRatio) as [
                            number,
                            number,
                            number
                        ];
                    }
                    else {
                        color = gradientColor.map((channel) => channel * layer.intensity) as [
                            number,
                            number,
                            number
                        ];
                        alpha = gradientAlpha * layer.intensity * alphaCurve;
                    }
                    if (alpha <= 0 && pmaRgbMultiplier <= 0) {
                        return;
                    }
                    positiveAlphaLayerCount += 1;
                    let matrix: FxmMatrix = [1, 0, 0, 1, 0, 0];
                    layer.transformChain.forEach((node, nodeIndex) => {
                        const evaluators = node.evaluators ?? (node.evaluator ? [node.evaluator] : []);
                        const sampleProperty = (kind: "position" | "scale" | "rotation") => {
                            const matching = evaluators
                                .map((evaluator, evaluatorIndex) => ({ evaluator, evaluatorIndex }))
                                .filter(({ evaluator }) => evaluator.kind === kind);
                            const active = matching.filter(({ evaluator }) => playerTime >= evaluator.startTime &&
                                playerTime <= evaluator.startTime + evaluator.duration);
                            const completed = matching
                                .filter(({ evaluator }) => playerTime > evaluator.startTime + evaluator.duration)
                                .sort((left, right) => left.evaluator.startTime + left.evaluator.duration -
                                (right.evaluator.startTime + right.evaluator.duration) ||
                                left.evaluatorIndex - right.evaluatorIndex);
                            return active.at(-1) ?? completed.at(-1) ?? null;
                        };
                        const sampleEntry = (entry: {
                            evaluator: StoryFxmTransformEvaluator;
                            evaluatorIndex: number;
                        } | null) => {
                            if (!entry) {
                                return null;
                            }
                            const { evaluator, evaluatorIndex } = entry;
                            const key = node.evaluators
                                ? `${layer.id}:${nodeIndex}:${evaluatorIndex}`
                                : `${layer.id}:${nodeIndex}`;
                            const repeatedRandomFactor = evaluator.random &&
                                layer.playerRepeatPeriod &&
                                layer.playerRepeatPeriod > 0
                                ? (() => {
                                    const occurrence = Math.floor(Math.max(elapsed - (layer.playerDelay ?? 0), 0) /
                                        layer.playerRepeatPeriod);
                                    const seed = storyStringHash(`${processId}:${key}`);
                                    return [
                                        evaluator.minX + (evaluator.maxX - evaluator.minX) *
                                            storyParticleRandom(seed, occurrence, 0),
                                        evaluator.minY + (evaluator.maxY - evaluator.minY) *
                                            storyParticleRandom(seed, occurrence, 1),
                                        evaluator.minZ + (evaluator.maxZ - evaluator.minZ) *
                                            storyParticleRandom(seed, occurrence, 2),
                                    ] as [
                                        number,
                                        number,
                                        number
                                    ];
                                })()
                                : null;
                            return sampleFxmTransformEvaluator(evaluator, playerTime, repeatedRandomFactor ?? randomFactors.get(key) ?? [
                                evaluator.factorX,
                                evaluator.factorY,
                                evaluator.factorZ,
                            ]);
                        };
                        const sampledScale = sampleEntry(sampleProperty("scale"));
                        const sampledRotation = sampleEntry(sampleProperty("rotation"));
                        const sampledPosition = sampleEntry(sampleProperty("position"));
                        const shakers = node.shakers ?? (node.shaker ? [node.shaker] : []);
                        const shaker = shakers
                            .filter((candidate) => {
                            const localTime = playerTime - candidate.startTime;
                            return localTime > 0 && localTime <= candidate.duration;
                        })
                            .sort((left, right) => left.startTime - right.startTime)
                            .at(-1);
                        const completedShaker = shakers
                            .filter((candidate) => playerTime > candidate.startTime + candidate.duration)
                            .sort((left, right) => left.startTime - right.startTime)
                            .at(-1);
                        let shakenPosition: {
                            x: number;
                            y: number;
                        } | null = null;
                        if (shaker) {
                            const localTime = playerTime - shaker.startTime;
                            const progress = shaker.duration > 0
                                ? Math.min(Math.max(localTime / shaker.duration, 0), 1)
                                : 1;
                            const noiseScroll = 2 * shaker.frequency * shaker.duration *
                                integrateFxmCurve(shaker.frequencyCurve, progress);
                            const power = shaker.magnitude * sampleFxmCurve(shaker.curve, progress);
                            const random = shakerRandom.get(shaker.id) ?? [0, 0, 0, 0, 0, 0];
                            const offsetX = random[4];
                            const offsetY = random[5];
                            const noiseX = fxmPerlinNoise(noiseScroll + random[0] + offsetX, random[0] + random[1] + offsetY);
                            const noiseY = fxmPerlinNoise(noiseScroll + random[2] + offsetX, random[2] + random[3] + offsetY);
                            shakenPosition = {
                                x: shaker.positionOrigin[0] + (-power + 2 * power * noiseX),
                                y: shaker.positionOrigin[1] + (-power + 2 * power * noiseY),
                            };
                        }
                        else if (completedShaker) {
                            shakenPosition = {
                                x: completedShaker.positionOrigin[0],
                                y: completedShaker.positionOrigin[1],
                            };
                        }
                        const bonePosition = node.spineBone
                            ? getStorySpineBonePosition(spineInstanceId, node.spineBone)
                            : null;
                        const baseRotation = node.spineBoneRotation && bonePosition
                            ? bonePosition.rotation
                            : node.rotation;
                        matrix = multiplyFxmMatrix(matrix, createFxmNodeMatrix({
                            x: node.spineBone
                                ? bonePosition?.x ?? node.x
                                : sampledPosition?.positionX ?? shakenPosition?.x ?? node.x,
                            y: node.spineBone
                                ? bonePosition?.y ?? node.y
                                : sampledPosition?.positionY ?? shakenPosition?.y ?? node.y,
                            scaleX: sampledScale?.scaleX ?? node.scaleX,
                            scaleY: sampledScale?.scaleY ?? node.scaleY,
                            rotation: sampledRotation?.rotation == null
                                ? baseRotation
                                : sampledRotation.additiveRotation
                                    ? baseRotation + sampledRotation.rotation
                                    : sampledRotation.rotation,
                        }));
                    });
                    context.save();
                    context.setTransform(matrix[0], -matrix[1], -matrix[2], matrix[3], canvas.width / 2 + matrix[4], canvas.height / 2 - matrix[5]);
                    context.scale(layer.flipX ? -1 : 1, layer.flipY ? -1 : 1);
                    context.globalCompositeOperation = "source-over";
                    context.globalAlpha = Math.min(Math.max(alpha, 0), 1);
                    context.drawImage(getTintedImage(image, color), -layer.pivotX * layer.width, -(1 - layer.pivotY) * layer.height, layer.width, layer.height);
                    drawnLayerCount += 1;
                    if (layer.material === "pma" && pmaRgbMultiplier > alpha) {
                        // NKC_FXM_SPRITE_PMA는 One / OneMinusSrcAlpha를 사용하므로
                        // RGB가 알파보다 밝을 수 있다. source-over로 목적지 감쇠를
                        // 먼저 적용하고 남은 RGB만 가산해야 PMA 출력식을 보존한다.
                        context.globalCompositeOperation = "lighter";
                        context.globalAlpha = Math.min(Math.max(pmaRgbMultiplier - alpha, 0), 1);
                        context.drawImage(getTintedImage(image, gradientColor), -layer.pivotX * layer.width, -(1 - layer.pivotY) * layer.height, layer.width, layer.height);
                    }
                    context.restore();
                });
                particleLayers.forEach((layer) => {
                    if (layer.randomVariant !== undefined &&
                        getStoryFxmRandomVariant(effect, layer.randomGroup, elapsed, processId) !== layer.randomVariant) {
                        return;
                    }
                    const image = images[layer.assetIndex];
                    if (!image?.naturalWidth ||
                        (!layer.burst && !layer.bursts?.length && layer.rateOverTime <= 0)) {
                        return;
                    }
                    const animationTime = effect.loop && effect.duration > 0
                        ? elapsed % effect.duration
                        : elapsed;
                    const playerDelays = layer.playerDelays ?? [layer.playerDelay ?? 0];
                    const eligiblePlayerDelays = getStoryFxmEligiblePlayerDelays(playerDelays, Boolean(effect.loop), elapsed, effect.duration);
                    const playerDelay = [...eligiblePlayerDelays]
                        .reverse()
                        .find((delay) => delay <= animationTime);
                    if (playerDelay === undefined) {
                        return;
                    }
                    const layerElapsed = animationTime - playerDelay;
                    if (layerElapsed < 0) {
                        return;
                    }
                    const continuousLoop = layer.simulationMode === "continuous-loop";
                    const effectTime = layer.loop && layer.duration > 0 && !continuousLoop
                        ? layerElapsed % layer.duration
                        : Math.min(layerElapsed, layer.duration);
                    const simulationTime = continuousLoop
                        ? elapsed + (layer.prewarm ? layer.duration : 0)
                        : effectTime + (layer.prewarm ? layer.duration : 0);
                    const births: Array<{
                        particleIndex: number;
                        birthTime: number;
                        emitterX?: number;
                        emitterY?: number;
                    }> = [];
                    if (layer.distanceEmission) {
                        const cycleStart = effect.loop && effect.duration > 0
                            ? Math.floor(elapsed / effect.duration) * effect.duration
                            : 0;
                        const occurrence = cycleStart + playerDelay;
                        let state = distanceEmissionStates.get(layer.id);
                        if (!state || state.occurrence !== occurrence) {
                            state = {
                                occurrence,
                                previousX: 0,
                                previousY: 0,
                                initialized: false,
                                mileage: 0,
                                nextIndex: 0,
                                births: [],
                            };
                            distanceEmissionStates.set(layer.id, state);
                        }
                        const emitterPosition = getStorySpineBonePosition(spineInstanceId, layer.distanceEmission.boneName);
                        if (emitterPosition &&
                            layerElapsed >= 0 &&
                            layerElapsed <= layer.distanceEmission.duration) {
                            if (state.initialized) {
                                const distance = Math.hypot(emitterPosition.x - state.previousX, emitterPosition.y - state.previousY);
                                state.mileage += distance *
                                    layer.distanceEmission.rateOverDistance;
                                if (state.mileage > 1) {
                                    const positions = [{
                                            x: emitterPosition.x,
                                            y: emitterPosition.y,
                                        }];
                                    const distancePerParticle = 1 / layer.distanceEmission.rateOverDistance;
                                    const step = Math.ceil(state.mileage / distancePerParticle);
                                    for (let index = 1; index < step; index += 1) {
                                        const ratio = index / step;
                                        positions.push({
                                            x: emitterPosition.x +
                                                (state.previousX - emitterPosition.x) * ratio,
                                            y: emitterPosition.y +
                                                (state.previousY - emitterPosition.y) * ratio,
                                        });
                                    }
                                    positions.forEach((position) => {
                                        state!.births.push({
                                            particleIndex: state!.nextIndex,
                                            birthTime: simulationTime,
                                            emitterX: position.x,
                                            emitterY: position.y,
                                        });
                                        state!.nextIndex += 1;
                                    });
                                    state.mileage = 0;
                                }
                            }
                            state.previousX = emitterPosition.x;
                            state.previousY = emitterPosition.y;
                            state.initialized = true;
                        }
                        state.births = state.births.filter((birth) => simulationTime - birth.birthTime <= layer.lifetime.max);
                        births.push(...state.births);
                    }
                    else if (continuousLoop) {
                        const firstIndex = Math.max(Math.ceil((simulationTime - layer.lifetime.max) * layer.rateOverTime), 0);
                        const lastIndex = Math.floor(simulationTime * layer.rateOverTime);
                        for (let particleIndex = firstIndex; particleIndex <= lastIndex; particleIndex += 1) {
                            births.push({
                                particleIndex,
                                birthTime: particleIndex / layer.rateOverTime,
                            });
                        }
                        (layer.bursts ?? []).forEach((burst, burstIndex) => {
                            const firstLoop = Math.max(Math.floor((simulationTime - layer.lifetime.max) / layer.duration), 0);
                            const lastLoop = Math.floor(simulationTime / layer.duration);
                            for (let loopIndex = firstLoop; loopIndex <= lastLoop; loopIndex += 1) {
                                for (let repeatIndex = 0; repeatIndex < burst.cycleCount; repeatIndex += 1) {
                                    const birthTime = loopIndex * layer.duration + burst.time +
                                        repeatIndex * burst.repeatInterval;
                                    if (birthTime < 0 ||
                                        (layer.emissionEndTime !== undefined &&
                                            birthTime > layer.emissionEndTime) ||
                                        birthTime > simulationTime ||
                                        simulationTime - birthTime > layer.lifetime.max) {
                                        continue;
                                    }
                                    const burstSeed = 1000000 + loopIndex * 10000 +
                                        burstIndex * 1000 + repeatIndex * 100;
                                    if (storyParticleRandom(layer.randomSeed, burstSeed, 15) >
                                        burst.probability) {
                                        continue;
                                    }
                                    const count = Math.floor(burst.min + (burst.max - burst.min) *
                                        storyParticleRandom(layer.randomSeed, burstSeed, 16));
                                    for (let index = 0; index < count; index += 1) {
                                        births.push({
                                            particleIndex: burstSeed + index,
                                            birthTime,
                                        });
                                    }
                                }
                            }
                        });
                        births.sort((left, right) => left.birthTime - right.birthTime);
                        if (births.length > (layer.maxParticles ?? births.length)) {
                            births.splice(0, births.length - (layer.maxParticles ?? births.length));
                        }
                    }
                    else {
                        (layer.bursts ?? []).forEach((burst, burstIndex) => {
                            for (let repeatIndex = 0; repeatIndex < burst.cycleCount; repeatIndex += 1) {
                                const birthTime = burst.time + repeatIndex * burst.repeatInterval;
                                if ((layer.emissionEndTime !== undefined &&
                                    birthTime > layer.emissionEndTime) ||
                                    birthTime > simulationTime ||
                                    simulationTime - birthTime > layer.lifetime.max) {
                                    continue;
                                }
                                const burstSeed = 1000000 + burstIndex * 10000 +
                                    repeatIndex * 100;
                                if (storyParticleRandom(layer.randomSeed, burstSeed, 15) >
                                    burst.probability) {
                                    continue;
                                }
                                const requestedCount = Math.floor(burst.min + (burst.max - burst.min) *
                                    storyParticleRandom(layer.randomSeed, burstSeed, 16));
                                const count = Math.max(requestedCount, 0);
                                for (let index = 0; index < count; index += 1) {
                                    births.push({
                                        particleIndex: burstSeed + index,
                                        birthTime,
                                    });
                                }
                            }
                        });
                        if (!layer.bursts?.length && layer.burst &&
                            simulationTime >= layer.burst.time) {
                            const requestedCount = Math.floor(layer.burst.min +
                                (layer.burst.max - layer.burst.min) *
                                    storyParticleRandom(layer.randomSeed, 0, 10));
                            const count = Math.min(Math.max(requestedCount, 0), layer.maxParticles ?? requestedCount);
                            for (let particleIndex = 0; particleIndex < count; particleIndex += 1) {
                                births.push({ particleIndex, birthTime: layer.burst.time });
                            }
                        }
                        if (layer.rateOverTime > 0) {
                            const emissionTime = Math.min(simulationTime, layer.emissionDuration ?? layer.duration);
                            const firstIndex = Math.max(Math.floor((simulationTime - layer.lifetime.max) * layer.rateOverTime), 0);
                            const lastIndex = Math.floor(emissionTime * layer.rateOverTime);
                            for (let particleIndex = firstIndex; particleIndex <= lastIndex; particleIndex += 1) {
                                births.push({
                                    particleIndex,
                                    birthTime: particleIndex / layer.rateOverTime,
                                });
                            }
                        }
                        births.sort((left, right) => left.birthTime - right.birthTime);
                        if (births.length > (layer.maxParticles ?? births.length)) {
                            births.splice(0, births.length - (layer.maxParticles ?? births.length));
                        }
                    }
                    let matrix: FxmMatrix = [1, 0, 0, 1, 0, 0];
                    layer.transformChain.forEach((node) => {
                        const bonePosition = node.spineBone
                            ? getStorySpineBonePosition(spineInstanceId, node.spineBone)
                            : null;
                        matrix = multiplyFxmMatrix(matrix, createFxmNodeMatrix({
                            ...node,
                            x: bonePosition?.x ?? node.x,
                            y: bonePosition?.y ?? node.y,
                            rotation: node.spineBoneRotation && bonePosition
                                ? bonePosition.rotation
                                : node.rotation,
                        }));
                    });
                    births.forEach(({ particleIndex, birthTime, emitterX, emitterY }) => {
                        const particleAssetIndices = layer.assetIndices?.length
                            ? layer.assetIndices
                            : [layer.assetIndex];
                        const particleAssetIndex = particleAssetIndices[Math.min(Math.floor(storyParticleRandom(layer.randomSeed, particleIndex, 25) *
                            particleAssetIndices.length), particleAssetIndices.length - 1)];
                        const particleImage = images[particleAssetIndex];
                        if (!particleImage?.naturalWidth) {
                            return;
                        }
                        const lifetime = layer.lifetime.min +
                            (layer.lifetime.max - layer.lifetime.min) *
                                storyParticleRandom(layer.randomSeed, particleIndex, 0);
                        const age = simulationTime - birthTime;
                        if (age < 0 || age > lifetime) {
                            return;
                        }
                        const progress = lifetime > 0 ? age / lifetime : 1;
                        const startColorRandom = storyParticleRandom(layer.randomSeed, particleIndex, 1);
                        const startColorMax = sampleFxmColor(layer.startColor.colors, startColorRandom);
                        const startColorMin = layer.startColorMin
                            ? sampleFxmColor(layer.startColorMin.colors, startColorRandom)
                            : startColorMax;
                        const startColor = startColorMin.map((value, index) => value + (startColorMax[index] - value) * startColorRandom) as [
                            number,
                            number,
                            number
                        ];
                        const lifetimeColorMax = sampleFxmColor(layer.colorOverLifetime.colors, progress);
                        const lifetimeColorRandom = storyParticleRandom(layer.randomSeed, particleIndex, 33);
                        const lifetimeColorMin = layer.colorOverLifetimeMin
                            ? sampleFxmColor(layer.colorOverLifetimeMin.colors, progress)
                            : lifetimeColorMax;
                        const lifetimeColor = lifetimeColorMin.map((value, index) => value + (lifetimeColorMax[index] - value) * lifetimeColorRandom) as [
                            number,
                            number,
                            number
                        ];
                        const lifetimeAlphaMax = sampleFxmScalar(layer.colorOverLifetime.alphas, progress);
                        const lifetimeAlphaMin = layer.colorOverLifetimeMin
                            ? sampleFxmScalar(layer.colorOverLifetimeMin.alphas, progress)
                            : lifetimeAlphaMax;
                        const alpha = (lifetimeAlphaMin +
                            (lifetimeAlphaMax - lifetimeAlphaMin) * lifetimeColorRandom) * sampleFxmScalar(layer.startColor.alphas, storyParticleRandom(layer.randomSeed, particleIndex, 2));
                        if (alpha <= 0) {
                            return;
                        }
                        const color = startColor.map((channel, index) => channel * lifetimeColor[index]) as [
                            number,
                            number,
                            number
                        ];
                        const radialDirection = layer.shape.type === "circle"
                            ? storyParticleRandom(layer.randomSeed, particleIndex, 3) * Math.PI * 2
                            : 0;
                        const radialFactor = layer.shape.type === "circle"
                            ? Math.sqrt((1 - layer.shape.radiusThickness) ** 2 +
                                (1 - (1 - layer.shape.radiusThickness) ** 2) *
                                    storyParticleRandom(layer.randomSeed, particleIndex, 4))
                            : 1;
                        const baseX = layer.shape.type === "rectangle"
                            ? (layer.shape.offsetX ?? 0) + (storyParticleRandom(layer.randomSeed, particleIndex, 3) - 0.5) * layer.shape.width
                            : layer.shape.type === "circle"
                                ? Math.cos(radialDirection) * layer.shape.radius * radialFactor *
                                    (layer.shape.scaleX ?? 1)
                                : (storyParticleRandom(layer.randomSeed, particleIndex, 3) * 2 - 1) * layer.shape.halfLength;
                        const baseY = layer.shape.type === "rectangle"
                            ? (layer.shape.offsetY ?? 0) + (storyParticleRandom(layer.randomSeed, particleIndex, 4) - 0.5) * layer.shape.height
                            : layer.shape.type === "circle"
                                ? Math.sin(radialDirection) * layer.shape.radius * radialFactor *
                                    (layer.shape.scaleY ?? 1)
                                : 0;
                        const directionX = layer.shape.type === "rectangle"
                            ? (layer.shape.directionX ?? 1)
                            : layer.shape.type === "circle"
                                ? Math.cos(radialDirection)
                                : 0;
                        const directionY = layer.shape.type === "rectangle"
                            ? (layer.shape.directionY ?? 0)
                            : layer.shape.type === "circle"
                                ? Math.sin(radialDirection)
                                : 1;
                        const speed = layer.speed
                            ? layer.speed.min + (layer.speed.max - layer.speed.min) *
                                storyParticleRandom(layer.randomSeed, particleIndex, 9)
                            : 0;
                        const velocityModuleX = layer.velocity?.enabled
                            && !layer.velocity.curveX
                            ? sampleStoryParticleRange(layer.velocity.x, storyParticleRandom(layer.randomSeed, particleIndex, 26))
                            : 0;
                        const velocityModuleY = layer.velocity?.enabled
                            && !layer.velocity.curveY
                            ? sampleStoryParticleRange(layer.velocity.y, storyParticleRandom(layer.randomSeed, particleIndex, 27))
                            : 0;
                        const damping = layer.noise.damping ? 1 - progress : 1;
                        const phaseX = storyParticleRandom(layer.randomSeed, particleIndex, 5) * Math.PI * 2;
                        const phaseY = storyParticleRandom(layer.randomSeed, particleIndex, 6) * Math.PI * 2;
                        const noisePhase = age * (layer.noise.scrollSpeed ?? layer.noise.frequency) * Math.PI * 2;
                        const noiseStrengthX = sampleStoryParticleRange(layer.noise.strengthX ?? layer.noise.strength, storyParticleRandom(layer.randomSeed, particleIndex, 17)) * (layer.noise.positionAmount ?? 1);
                        const noiseStrengthY = sampleStoryParticleRange(layer.noise.strengthY ?? layer.noise.strength, storyParticleRandom(layer.randomSeed, particleIndex, 18)) * (layer.noise.positionAmount ?? 1);
                        const forceX = layer.force
                            ? sampleStoryParticleRange(layer.force.x, storyParticleRandom(layer.randomSeed, particleIndex, 19))
                            : 0;
                        const forceY = layer.force
                            ? sampleStoryParticleRange(layer.force.y, storyParticleRandom(layer.randomSeed, particleIndex, 20))
                            : 0;
                        const gravityModifier = layer.gravity
                            ? sampleStoryParticleRange(layer.gravity, storyParticleRandom(layer.randomSeed, particleIndex, 21))
                            : 0;
                        const accelerationX = forceX;
                        const accelerationY = forceY - 9.81 * gravityModifier;
                        const initialVelocityX = directionX * speed + velocityModuleX;
                        const initialVelocityY = directionY * speed + velocityModuleY;
                        let velocityX = initialVelocityX + accelerationX * age;
                        let velocityY = initialVelocityY + accelerationY * age;
                        let movementX = initialVelocityX * age +
                            accelerationX * age * age * 0.5;
                        let movementY = initialVelocityY * age +
                            accelerationY * age * age * 0.5;
                        if (layer.velocity?.enabled && layer.velocity.curveX) {
                            const random = storyParticleRandom(layer.randomSeed, particleIndex, 26);
                            velocityX += sampleStoryParticleCustomCurve(layer.velocity.curveX, progress, random, 0);
                            movementX += lifetime * integrateStoryParticleCustomCurve(layer.velocity.curveX, progress, random);
                        }
                        if (layer.velocity?.enabled && layer.velocity.curveY) {
                            const random = storyParticleRandom(layer.randomSeed, particleIndex, 27);
                            velocityY += sampleStoryParticleCustomCurve(layer.velocity.curveY, progress, random, 0);
                            movementY += lifetime * integrateStoryParticleCustomCurve(layer.velocity.curveY, progress, random);
                        }
                        if (layer.limitVelocity?.enabled) {
                            // Unity applies this module to velocity every simulation step. Keep
                            // the deterministic renderer stateless by replaying those steps up
                            // to the requested particle age instead of clamping only the final
                            // direction vector.
                            const simulationSteps = Math.max(1, Math.ceil(age * 60));
                            const stepTime = age / simulationSteps;
                            const limitRandom = storyParticleRandom(layer.randomSeed, particleIndex, 22);
                            const dampen = Math.min(Math.max(layer.limitVelocity.dampen, 0), 1);
                            velocityX = initialVelocityX;
                            velocityY = initialVelocityY;
                            movementX = 0;
                            movementY = 0;
                            for (let step = 0; step < simulationSteps; step += 1) {
                                velocityX += accelerationX * stepTime;
                                velocityY += accelerationY * stepTime;
                                const stepProgress = Math.min(((step + 1) * stepTime) / lifetime, 1);
                                const minimumLimit = sampleFxmCurve(layer.limitVelocity.minCurve, stepProgress) * layer.limitVelocity.multiplier;
                                const maximumLimit = sampleFxmCurve(layer.limitVelocity.maxCurve, stepProgress) * layer.limitVelocity.multiplier;
                                const speedLimit = Math.max(minimumLimit + (maximumLimit - minimumLimit) * limitRandom, 0);
                                const velocityMagnitude = Math.hypot(velocityX, velocityY);
                                if (velocityMagnitude > speedLimit && velocityMagnitude > 0) {
                                    const limitedX = velocityX * speedLimit / velocityMagnitude;
                                    const limitedY = velocityY * speedLimit / velocityMagnitude;
                                    velocityX += (limitedX - velocityX) * dampen;
                                    velocityY += (limitedY - velocityY) * dampen;
                                }
                                movementX += velocityX * stepTime;
                                movementY += velocityY * stepTime;
                            }
                        }
                        const x = (emitterX ?? 0) + baseX + movementX +
                            Math.sin(noisePhase + phaseX) * noiseStrengthX * damping;
                        const y = (emitterY ?? 0) + baseY + movementY +
                            Math.sin(noisePhase + phaseY) * noiseStrengthY * damping;
                        const baseSize = layer.size.min +
                            (layer.size.max - layer.size.min) *
                                storyParticleRandom(layer.randomSeed, particleIndex, 7);
                        const sizeMultiplier = layer.sizeOverLifetime?.length
                            ? sampleFxmCurve(layer.sizeOverLifetime, progress)
                            : 1;
                        const useSize3D = layer.size3D && layer.size3D.enabled !== false;
                        const width = (useSize3D
                            ? sampleStoryParticleRange(layer.size3D!.z, storyParticleRandom(layer.randomSeed, particleIndex, 23))
                            : baseSize) * sizeMultiplier;
                        const height = (useSize3D
                            ? sampleStoryParticleRange(layer.size3D!.y, storyParticleRandom(layer.randomSeed, particleIndex, 24))
                            : baseSize) * sizeMultiplier;
                        if (layer.collision?.type === "circle-kill") {
                            const startX = (emitterX ?? 0) + baseX;
                            const startY = (emitterY ?? 0) + baseY;
                            const segmentX = x - startX;
                            const segmentY = y - startY;
                            const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;
                            const relativeStartX = startX - layer.collision.x;
                            const relativeStartY = startY - layer.collision.y;
                            const closestTime = segmentLengthSquared > 0
                                ? Math.min(Math.max(-(relativeStartX * segmentX +
                                    relativeStartY * segmentY) / segmentLengthSquared, 0), 1)
                                : 0;
                            const closestX = relativeStartX + segmentX * closestTime;
                            const closestY = relativeStartY + segmentY * closestTime;
                            const collisionRadius = layer.collision.radius +
                                Math.max(Math.abs(width), Math.abs(height)) * 0.5 *
                                    layer.collision.particleRadiusScale;
                            if (Math.hypot(closestX, closestY) <= collisionRadius) {
                                return;
                            }
                        }
                        const frameCount = layer.textureSheet.columns * layer.textureSheet.rows;
                        const frameOverTime = layer.textureSheet.frameOverTimeCurve
                            ? sampleFxmCurve(layer.textureSheet.frameOverTimeCurve, progress)
                            : layer.textureSheet.frameOverTimeRange
                                ? sampleStoryParticleRange(layer.textureSheet.frameOverTimeRange, storyParticleRandom(layer.randomSeed, particleIndex, 30))
                                : (layer.textureSheet.frameOverTime ?? 0);
                        const normalizedFrame = (layer.textureSheet.startFrameMin +
                            (layer.textureSheet.startFrameMax - layer.textureSheet.startFrameMin) *
                                storyParticleRandom(layer.randomSeed, particleIndex, 8) +
                            frameOverTime * progress *
                                (layer.textureSheet.cycles ?? 1)) % 1;
                        const frame = Math.min(Math.max(Math.floor(normalizedFrame * frameCount), 0), frameCount - 1);
                        const sourceWidth = particleImage.naturalWidth /
                            layer.textureSheet.columns;
                        const sourceHeight = particleImage.naturalHeight /
                            layer.textureSheet.rows;
                        const sourceX = (frame % layer.textureSheet.columns) * sourceWidth;
                        const sourceRow = Math.floor(frame / layer.textureSheet.columns);
                        const sourceY = (layer.textureSheet.rows - 1 - sourceRow) * sourceHeight;
                        context.save();
                        context.setTransform(matrix[0], -matrix[1], -matrix[2], matrix[3], canvas.width / 2 + matrix[4], canvas.height / 2 - matrix[5]);
                        context.translate(x, -y);
                        if (layer.renderMode === "velocity-mesh") {
                            context.rotate(Math.PI / 2 - Math.atan2(velocityY, velocityX));
                        }
                        else {
                            const startRotation = layer.startRotation
                                ? sampleStoryParticleRange(layer.startRotation, storyParticleRandom(layer.randomSeed, particleIndex, 28))
                                : 0;
                            const rotationRandom = storyParticleRandom(layer.randomSeed, particleIndex, 29);
                            const rotationSpeed = layer.rotationOverLifetime?.enabled
                                ? sampleStoryParticleRange(layer.rotationOverLifetime.value, rotationRandom)
                                : 0;
                            const rotationCurveAngle = layer.rotationOverLifetime?.curve
                                ? lifetime * integrateStoryParticleCustomCurve(layer.rotationOverLifetime.curve, progress, rotationRandom)
                                : 0;
                            context.rotate(-(startRotation + rotationSpeed * age + rotationCurveAngle));
                        }
                        const pmaCustomAdditive = layer.material === "nkc-ptc-pma-custom-additive";
                        const additive = layer.material === "additive";
                        const uiPmaCustom = layer.material === "ui-pma-custom";
                        const materialTint = layer.materialTint ?? [1, 1, 1, 1];
                        const tintedColor = color.map((channel, index) => channel * materialTint[index]) as [
                            number,
                            number,
                            number
                        ];
                        const tintedParticle = getTintedImage(particleImage, tintedColor, pmaCustomAdditive ? "pma-additive" : "multiply");
                        const drawParticle = () => {
                            context.drawImage(tintedParticle, sourceX, sourceY, sourceWidth, sourceHeight, -width / 2, -height / 2, width, height);
                        };
                        if (uiPmaCustom) {
                            const customX = Math.max(sampleStoryParticleCustomCurve(layer.customDataCurveX, progress, storyParticleRandom(layer.randomSeed, particleIndex, 31), layer.customData?.[0] ?? 1), 0);
                            const customY = Math.max(layer.customDataCurveY
                                ? sampleStoryParticleCustomCurve(layer.customDataCurveY, progress, storyParticleRandom(layer.randomSeed, particleIndex, 32), layer.customData?.[1] ?? 1)
                                : layer.customDataAlphaOverLifetime?.length
                                    ? sampleFxmCurve(layer.customDataAlphaOverLifetime, progress)
                                    : (layer.customData?.[1] ?? 1), 0);
                            const totalBrightness = Math.max(alpha * customX, 0);
                            const sourceAlpha = Math.min(totalBrightness * customY * materialTint[3], 1);
                            if (sourceAlpha > 0) {
                                context.globalCompositeOperation = "source-over";
                                context.globalAlpha = sourceAlpha;
                                drawParticle();
                            }
                            let additiveBrightness = Math.max(totalBrightness - sourceAlpha, 0);
                            context.globalCompositeOperation = "lighter";
                            while (additiveBrightness > 0) {
                                context.globalAlpha = Math.min(additiveBrightness, 1);
                                drawParticle();
                                additiveBrightness -= 1;
                            }
                        }
                        else {
                            context.globalCompositeOperation = pmaCustomAdditive
                                || additive
                                ? "lighter"
                                : "source-over";
                            let remainingBrightness = pmaCustomAdditive
                                ? Math.max(layer.customData?.[0] ?? 1, 0)
                                : 1;
                            do {
                                context.globalAlpha = Math.min(Math.max(alpha * Math.min(remainingBrightness, 1), 0), 1);
                                drawParticle();
                                remainingBrightness -= 1;
                            } while (remainingBrightness > 0);
                        }
                        context.restore();
                        drawnParticleCount += 1;
                    });
                });
            }
            canvas.dataset.storyFxmDrawnLayers = String(drawnLayerCount);
            canvas.dataset.storyFxmElapsed = elapsed.toFixed(3);
            canvas.dataset.storyFxmActiveLayers = String(activeLayerCount);
            canvas.dataset.storyFxmImageReadyLayers = String(imageReadyLayerCount);
            canvas.dataset.storyFxmPositiveAlphaLayers = String(positiveAlphaLayerCount);
            canvas.dataset.storyFxmDrawnParticles = String(drawnParticleCount);
            if (!disposed && (effect.loop || elapsed < effect.duration)) {
                animationFrame = window.requestAnimationFrame(render);
            }
        };
        animationFrame = window.requestAnimationFrame(render);
        return () => {
            disposed = true;
            window.cancelAnimationFrame(animationFrame);
            context.clearRect(0, 0, canvas.width, canvas.height);
        };
    }, [effect, processId, spineInstanceId]);
    return (<canvas ref={canvasRef} className={className} width={1920} height={1080} data-story-fxm-player-duration={effect.duration} data-story-fxm-player-loop={effect.loop ?? false} data-story-fxm-sprite-count={effect.spriteLayers?.length ?? 0} data-story-fxm-particle-layer-count={effect.particleLayers?.length ?? 0} data-story-fxm-unsupported-parts={effect.unsupportedParts?.length ?? 0} data-story-fxm-assets-ready="pending" data-story-fxm-loaded-assets="0" data-story-fxm-drawn-layers="0" data-story-fxm-elapsed="0" data-story-fxm-active-layers="0" data-story-fxm-image-ready-layers="0" data-story-fxm-positive-alpha-layers="0" data-story-fxm-drawn-particles="0" aria-hidden="true"/>);
}
function WaveRenderStageFxmEffect({ effect, processId, paused, }: {
    effect: StoryGameObjectEffect;
    processId: string;
    paused: boolean;
}) {
    const nonMeshSortingOrder = Math.max(-2147483648, ...(effect.spriteLayers ?? []).map((layer) => layer.sortingOrder), ...(effect.particleLayers ?? []).map((layer) => layer.sortingOrder));
    const hasForegroundMesh = Boolean(effect.waveShockwave?.layers.some((layer) => layer.sortingOrder > nonMeshSortingOrder));
    return (<>
      {effect.waveShockwave ? (<StoryWaveRenderStageMeshEffect effect={effect.waveShockwave} processId={processId} paused={paused} className={styles.waveRenderStageMeshFxmEffect} maximumSortingOrder={nonMeshSortingOrder}/>) : null}
      <GunshotSpriteFxmEffect effect={effect} processId={processId} paused={paused} className={styles.rewindSpriteFxmEffect}/>
      {effect.waveShockwave && hasForegroundMesh ? (<StoryWaveRenderStageMeshEffect effect={effect.waveShockwave} processId={processId} paused={paused} className={styles.waveRenderStageMeshFxmEffect} minimumSortingOrderExclusive={nonMeshSortingOrder}/>) : null}
    </>);
}
type InkGroup = {
    x: number;
    y: number;
    rotation: number;
    startTime: number;
    slash?: boolean;
};
type InkSpriteLayer = {
    assetIndex: number;
    group: number;
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
    pixelsToUnits: number;
    startTime: number;
    duration: number;
    color: "black" | "white";
    colorBoost: number;
    flipX?: boolean;
    fixedRotation?: number;
};
const INK_SPLAT_SCALE: FxmScalarKey[] = [
    {
        time: 0,
        value: 0.4468176961,
        inSlope: 0.0282329731,
        outSlope: 0.0282329731,
    },
    {
        time: 0.0455782264,
        value: 0.9576079845,
        inSlope: 0.0781168565,
        outSlope: 0.0781168565,
    },
    { time: 1, value: 1, inSlope: 0, outSlope: 0 },
];
const INK_SLASH_SCALE_X: FxmScalarKey[] = [
    {
        time: 0,
        value: 0.4468176961,
        inSlope: 1.6053363085,
        outSlope: 1.6053363085,
    },
    { time: 0.077091828, value: 1, inSlope: 0, outSlope: 0 },
    { time: 0.9982299805, value: 1, inSlope: 0, outSlope: 0 },
];
const INK_SLASH_SCALE_Y: FxmScalarKey[] = [
    { time: 0, value: 0.4474182129, inSlope: 0, outSlope: 4.2361688614 },
    {
        time: 0.0935191363,
        value: 0.8435810804,
        inSlope: 3.6573810577,
        outSlope: 2.8060398102,
    },
    {
        time: 0.1861760467,
        value: 0.9654476047,
        inSlope: 1.3152447939,
        outSlope: 0.0425506085,
    },
    { time: 0.9982066154, value: 1, inSlope: 0.0425506085, outSlope: 0 },
];
const INK_2_SLASH_SCALE_Y: FxmScalarKey[] = [
    { time: 0, value: 0.4474182129, inSlope: 0, outSlope: 0 },
    {
        time: 0.0684110373,
        value: 0.7188068628,
        inSlope: 1.9585067034,
        outSlope: 1.9585067034,
    },
    {
        time: 0.3386202753,
        value: 0.929795444,
        inSlope: 0.1428797245,
        outSlope: 0.1428797245,
    },
    { time: 1, value: 1, inSlope: 0, outSlope: 0 },
];
const INK_BACKGROUND_ALPHA: FxmScalarKey[] = [
    {
        time: 0.5053939819,
        value: 1,
        inSlope: -0.0374411158,
        outSlope: -0.0374411158,
    },
    {
        time: 0.9982299805,
        value: 0,
        inSlope: -4.3832831383,
        outSlope: -4.3832831383,
    },
];
const INK_SPLAT_ALPHA: FxmScalarKey[] = [
    { time: 0, value: 1, inSlope: 0, outSlope: 0 },
    { time: 0.38738662, value: 1, inSlope: 0, outSlope: 0 },
    { time: 1, value: 0, inSlope: 0, outSlope: 0 },
];
const INK_VIGNETTE_ALPHA: FxmScalarKey[] = [
    { time: 0.225154072, value: 0.3708207011, inSlope: 0, outSlope: 0 },
    { time: 0.4583186209, value: 0, inSlope: 0, outSlope: 0 },
    { time: 0.7065332532, value: 0.3556169271, inSlope: 0, outSlope: 0 },
    { time: 1, value: 0, inSlope: 0, outSlope: 0 },
];
const INK_FLICKER_COLORS: FxmColorKey[] = [
    { time: 0.0180972, value: [0, 0, 0] },
    { time: 0.0407263294, value: [1, 0, 0] },
    { time: 0.059952697, value: [0.4056603909, 0, 0] },
];
const INK_FLICKER_ALPHA: FxmScalarKey[] = [
    { time: 0, value: 0 },
    { time: 0.0395971618, value: 0.8156862855 },
    { time: 0.0588235294, value: 0.670588254 },
    { time: 0.1334859236, value: 0.2823529541 },
    { time: 1, value: 0 },
];
function quaternionZToDegrees(z: number, w: number) {
    return (2 * Math.atan2(z, w) * 180) / Math.PI;
}
const INK_GROUPS: InkGroup[] = [
    {
        x: -5.3099999428,
        y: -0.150000006,
        rotation: quaternionZToDegrees(0.535500288, 0.8445351124),
        startTime: 0.25,
    },
    { x: 2.2699999809, y: -0.3400000036, rotation: 0, startTime: 0.15 },
    { x: 6.8499999046, y: -0.6000000238, rotation: 0, startTime: 0.2 },
    {
        x: 22.9500007629,
        y: 3.9300000668,
        rotation: quaternionZToDegrees(0.0928261802, 0.9956823587),
        startTime: 0.06,
        slash: true,
    },
];
const INK_LAYERS: InkSpriteLayer[] = [
    { assetIndex: 1, group: 0, x: -0.340000391, y: -1.6299995184, scaleX: 2.6671233177, scaleY: 2.6671233177, pixelsToUnits: 100, startTime: 0.25, duration: 2, color: "black", colorBoost: 0.5 },
    { assetIndex: 1, group: 0, x: -0.769999981, y: -2.5, scaleX: 1.2516644001, scaleY: 1.2516644001, pixelsToUnits: 100, startTime: 0.25, duration: 2.2, color: "black", colorBoost: 0.5 },
    { assetIndex: 2, group: 2, x: 0, y: 0, scaleX: 3.10410285, scaleY: 3.10410285, pixelsToUnits: 100, startTime: 0.2, duration: 2, color: "black", colorBoost: 0.5 },
    { assetIndex: 1, group: 0, x: -3.5, y: 1.9900000095, scaleX: 2.3386096954, scaleY: 2.3386096954, pixelsToUnits: 100, startTime: 0.25, duration: 2, color: "black", colorBoost: 0.5 },
    { assetIndex: 3, group: 1, x: 0, y: 0, scaleX: 3.1133034229, scaleY: 3.1133034229, pixelsToUnits: 100, startTime: 0.15, duration: 2, color: "black", colorBoost: 0.5 },
    { assetIndex: 2, group: 2, x: 1.6699999571, y: 1.7200000286, scaleX: 2.2380650043, scaleY: 2.2380650043, pixelsToUnits: 100, startTime: 0.2, duration: 2.2, color: "black", colorBoost: 0.5 },
    { assetIndex: 3, group: 1, x: -3.5399999619, y: -0.3899999857, scaleX: 2.036210537, scaleY: 2.036210537, pixelsToUnits: 100, startTime: 0.15, duration: 2, color: "black", colorBoost: 0.5 },
    { assetIndex: 5, group: 3, x: -9.9799995422, y: 0, scaleX: 1.7565840483, scaleY: 1.0582170486, pixelsToUnits: 50, startTime: 0, duration: 2.5, color: "black", colorBoost: 0.5, flipX: true, fixedRotation: 180 },
];
const INK_2_GROUPS: InkGroup[] = [
    {
        x: -3.75,
        y: -0.6800000072,
        rotation: quaternionZToDegrees(0.6522837877, 0.7579749227),
        startTime: 0.25,
    },
    { x: 6.8499999046, y: -0.6000000238, rotation: 0, startTime: 0.2 },
    {
        x: 5.2563314438,
        y: 1.8903053999,
        rotation: quaternionZToDegrees(-0.3830948174, 0.9237090349),
        startTime: 0.15,
    },
    {
        x: -1.2999999523,
        y: -3.2599999905,
        rotation: quaternionZToDegrees(-0.6390663385, 0.769151628),
        startTime: 0.1,
    },
    {
        x: 22.9300003052,
        y: 4.0199999809,
        rotation: quaternionZToDegrees(0.0928261802, 0.9956823587),
        startTime: 0.06,
        slash: true,
    },
];
const INK_2_LAYERS: InkSpriteLayer[] = [
    { assetIndex: 1, group: 3, x: 0, y: 0, scaleX: 2.8766467571, scaleY: 2.8766467571, pixelsToUnits: 100, startTime: 0.1, duration: 2, color: "black", colorBoost: 1 },
    { assetIndex: 1, group: 0, x: 0, y: 0, scaleX: 2.8589215279, scaleY: 2.8589215279, pixelsToUnits: 100, startTime: 0.25, duration: 2, color: "white", colorBoost: 0.844 },
    { assetIndex: 2, group: 1, x: 0, y: 0, scaleX: 2.1686532497, scaleY: 2.1686532497, pixelsToUnits: 100, startTime: 0.2, duration: 2, color: "white", colorBoost: 1 },
    { assetIndex: 1, group: 0, x: -1.3300013542, y: 4.0100016594, scaleX: 1.8920627832, scaleY: 1.8920627832, pixelsToUnits: 100, startTime: 0.25, duration: 2, color: "white", colorBoost: 0.844, flipX: true },
    { assetIndex: 3, group: 2, x: 0, y: 0, scaleX: 1.421440959, scaleY: 1.421440959, pixelsToUnits: 100, startTime: 0.15, duration: 2, color: "white", colorBoost: 1 },
    { assetIndex: 2, group: 1, x: -4.2300000191, y: 1.0599999428, scaleX: 1.9228364229, scaleY: 1.9228364229, pixelsToUnits: 100, startTime: 0.2, duration: 2, color: "white", colorBoost: 1 },
    { assetIndex: 3, group: 2, x: -1.8400000334, y: -4.9099998474, scaleX: 1.9927943945, scaleY: 1.9927943945, pixelsToUnits: 100, startTime: 0.15, duration: 2, color: "white", colorBoost: 1 },
    { assetIndex: 5, group: 4, x: -11.1000003815, y: 0, scaleX: 1.3128181696, scaleY: 1.0781646967, pixelsToUnits: 50, startTime: 0, duration: 2.5, color: "white", colorBoost: 1, flipX: true, fixedRotation: 180 },
];
function InkEffect({ effect, processId, paused, }: {
    effect: StoryGameObjectEffect;
    processId: string;
    paused: boolean;
}) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const pausedRef = useRef(paused);
    useEffect(() => {
        pausedRef.current = paused;
    }, [paused]);
    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !context) {
            return;
        }
        const variantTwo = effect.kind === "ink-2";
        const groups = variantTwo ? INK_2_GROUPS : INK_GROUPS;
        const layers = variantTwo ? INK_2_LAYERS : INK_LAYERS;
        const images = effect.assets.map((asset) => {
            const image = new window.Image();
            image.decoding = "async";
            image.src = deploymentUrl(asset);
            return image;
        });
        const randomValues = new Uint32Array(layers.length);
        window.crypto.getRandomValues(randomValues);
        const randomRotations = Array.from(randomValues, (value) => (value / 4294967296) * 360);
        const tintCache = new Map<string, HTMLCanvasElement>();
        let disposed = false;
        let ready = false;
        let animationFrame = 0;
        let elapsed = 0;
        let previousTime = performance.now();
        Promise.all(images.map((image) => new Promise<void>((resolve) => {
            if (image.complete && image.naturalWidth > 0) {
                resolve();
                return;
            }
            image.addEventListener("load", () => resolve(), { once: true });
            image.addEventListener("error", () => resolve(), { once: true });
        }))).then(() => {
            ready = !disposed;
        });
        const getTintedImage = (image: HTMLImageElement, red: number, green: number, blue: number) => {
            const key = `${image.src}:${red}:${green}:${blue}`;
            const cached = tintCache.get(key);
            if (cached) {
                return cached;
            }
            const tinted = document.createElement("canvas");
            tinted.width = image.naturalWidth;
            tinted.height = image.naturalHeight;
            const tintedContext = tinted.getContext("2d");
            if (!tintedContext) {
                return tinted;
            }
            tintedContext.drawImage(image, 0, 0);
            tintedContext.globalCompositeOperation = "source-in";
            tintedContext.fillStyle = `rgb(${red} ${green} ${blue})`;
            tintedContext.fillRect(0, 0, tinted.width, tinted.height);
            tintCache.set(key, tinted);
            return tinted;
        };
        const drawLayer = (layer: InkSpriteLayer, layerIndex: number, effectTime: number) => {
            const image = images[layer.assetIndex];
            if (!image?.naturalWidth ||
                effectTime < layer.startTime ||
                effectTime > layer.startTime + layer.duration) {
                return;
            }
            const group = groups[layer.group];
            const groupProgress = Math.min(Math.max((effectTime - group.startTime) / 2.5, 0), 1);
            const groupScaleX = group.slash
                ? sampleFxmCurve(INK_SLASH_SCALE_X, groupProgress) * 2
                : sampleFxmCurve(INK_SPLAT_SCALE, groupProgress);
            const groupScaleY = group.slash
                ? sampleFxmCurve(variantTwo ? INK_2_SLASH_SCALE_Y : INK_SLASH_SCALE_Y, groupProgress)
                : groupScaleX;
            const groupRadians = (group.rotation * Math.PI) / 180;
            const childX = layer.x * groupScaleX;
            const childY = layer.y * groupScaleY;
            const worldX = group.x +
                childX * Math.cos(groupRadians) -
                childY * Math.sin(groupRadians);
            const worldY = group.y +
                childX * Math.sin(groupRadians) +
                childY * Math.cos(groupRadians);
            const progress = Math.min(Math.max((effectTime - layer.startTime) / layer.duration, 0), 1);
            const alpha = sampleFxmCurve(INK_SPLAT_ALPHA, progress);
            const channel = layer.color === "white" ? Math.round(layer.colorBoost * 255) : 0;
            const tinted = getTintedImage(image, channel, channel, channel);
            const unitScale = 100 / layer.pixelsToUnits;
            context.save();
            context.globalCompositeOperation = "source-over";
            context.globalAlpha = Math.min(Math.max(alpha, 0), 1);
            context.translate(960 + worldX * 100, 540 - worldY * 100);
            context.rotate((-group.rotation -
                (layer.fixedRotation ?? randomRotations[layerIndex])) *
                (Math.PI / 180));
            context.scale(layer.flipX ? -1 : 1, 1);
            context.drawImage(tinted, (-image.naturalWidth * unitScale * layer.scaleX * groupScaleX) / 2, (-image.naturalHeight * unitScale * layer.scaleY * groupScaleY) / 2, image.naturalWidth * unitScale * layer.scaleX * groupScaleX, image.naturalHeight * unitScale * layer.scaleY * groupScaleY);
            context.restore();
        };
        const render = (time: number) => {
            const delta = Math.max(time - previousTime, 0) / 1000;
            previousTime = time;
            if (!pausedRef.current) {
                elapsed += delta;
            }
            context.clearRect(0, 0, canvas.width, canvas.height);
            const effectTime = elapsed - (effect.triggerDelay ?? 0);
            if (ready && effectTime >= 0 && effectTime <= 3) {
                const backgroundProgress = Math.min(Math.max(effectTime / 3, 0), 1);
                const backgroundAlpha = sampleFxmCurve(INK_BACKGROUND_ALPHA, backgroundProgress);
                context.globalCompositeOperation = "source-over";
                context.globalAlpha = Math.min(Math.max(backgroundAlpha, 0), 1);
                context.fillStyle = variantTwo ? "#000" : "#fff";
                context.fillRect(0, 0, canvas.width, canvas.height);
                context.globalAlpha = 1 - backgroundProgress;
                context.fillStyle = "rgb(128 128 128)";
                context.fillRect(0, 0, canvas.width, canvas.height);
                layers.forEach((layer, index) => drawLayer(layer, index, effectTime));
                const vignette = images[4];
                if (vignette?.naturalWidth && effectTime <= 2.5) {
                    const progress = Math.min(Math.max(effectTime / 2.5, 0), 1);
                    const alpha = (0.5098039508 * (1 - progress)) *
                        sampleFxmCurve(INK_VIGNETTE_ALPHA, progress);
                    const tinted = getTintedImage(vignette, 0, 0, 0);
                    context.globalAlpha = Math.min(Math.max(alpha, 0), 1);
                    context.drawImage(tinted, 960 - (1024 * 2.9118616581) / 2, 540 - (512 * 3.2530117035) / 2, 1024 * 2.9118616581, 512 * 3.2530117035);
                }
                [0.03, 0.13].forEach((startTime) => {
                    if (effectTime < startTime || effectTime > startTime + 0.3) {
                        return;
                    }
                    const progress = (effectTime - startTime) / 0.3;
                    const color = sampleFxmColor(INK_FLICKER_COLORS, progress);
                    const alpha = sampleFxmScalar(INK_FLICKER_ALPHA, progress) * 0.8;
                    context.globalAlpha = Math.min(Math.max(alpha, 0), 1);
                    context.fillStyle = `rgb(${color
                        .map((channel) => Math.round(channel * 0.8 * 255))
                        .join(" ")})`;
                    context.fillRect(0, 0, canvas.width, canvas.height);
                });
            }
            context.globalAlpha = 1;
            if (!disposed && elapsed < 3 + (effect.triggerDelay ?? 0)) {
                animationFrame = window.requestAnimationFrame(render);
            }
        };
        animationFrame = window.requestAnimationFrame(render);
        return () => {
            disposed = true;
            window.cancelAnimationFrame(animationFrame);
            context.clearRect(0, 0, canvas.width, canvas.height);
        };
    }, [effect, processId]);
    return (<canvas ref={canvasRef} className={styles.inkEffect} width={1920} height={1080} data-story-fxm-player-duration={effect.duration} data-story-fxm-sprite-count={13} data-story-fxm-material="CMN_FX_SPRITE_PM" data-story-fxm-variant={effect.kind} aria-hidden="true"/>);
}
const SCREEN_FILM_DARK_ALPHA: FxmScalarKey[] = [
    { time: 0, value: 1, inSlope: Infinity, outSlope: Infinity },
    { time: 0.0037492292, value: 0.8581906557, inSlope: -0.3224977255, outSlope: -0.3224977255 },
    { time: 0.0085668778, value: 1, inSlope: Infinity, outSlope: Infinity },
    { time: 0.0109063387, value: 0.8215161562, inSlope: -0.7099102736, outSlope: -0.7099102736 },
    { time: 0.0172804128, value: 1, inSlope: Infinity, outSlope: Infinity },
    { time: 0.0280378163, value: 0.5770169497, inSlope: 11.1410446167, outSlope: 11.1410446167 },
    { time: 0.039919205, value: 1, inSlope: Infinity, outSlope: Infinity },
    { time: 0.043203067, value: 0.8581906557, inSlope: 11.2570371628, outSlope: 11.2570371628 },
    { time: 0.046934776, value: 1, inSlope: Infinity, outSlope: 0.0037336652 },
    { time: 0.0527817383, value: 0.8581906557, inSlope: Infinity, outSlope: -0.617798686 },
    { time: 0.0594790503, value: 0.9941897392, inSlope: Infinity, outSlope: -1.0854707956 },
    { time: 0.0812592208, value: 1, inSlope: Infinity, outSlope: Infinity },
    { time: 0.0920006186, value: 0.8581906557, inSlope: Infinity, outSlope: Infinity },
    { time: 0.0936072618, value: 0.4841061831, inSlope: Infinity, outSlope: -1.4587572813 },
    { time: 0.1001498923, value: 1, inSlope: Infinity, outSlope: Infinity },
    { time: 0.1207609922, value: 0.8581906557, inSlope: Infinity, outSlope: Infinity },
    { time: 0.1446154267, value: 0.8581906557, inSlope: 0, outSlope: 0 },
];
const SCREEN_FILM_DARK_ROTATION: FxmScalarKey[] = [
    { time: 0.0689670444, value: 1, inSlope: Infinity, outSlope: Infinity },
    { time: 0.1372637153, value: 0, inSlope: Infinity, outSlope: Infinity },
    { time: 0.1866165102, value: 1, inSlope: Infinity, outSlope: Infinity },
    { time: 0.262283653, value: 0, inSlope: Infinity, outSlope: Infinity },
    { time: 0.3107537031, value: 1, inSlope: Infinity, outSlope: Infinity },
    { time: 0.4136922956, value: 0, inSlope: Infinity, outSlope: Infinity },
    { time: 0.465546607, value: 1, inSlope: Infinity, outSlope: Infinity },
    { time: 0.7185722589, value: 0, inSlope: Infinity, outSlope: Infinity },
    { time: 0.7704348564, value: 1, inSlope: Infinity, outSlope: Infinity },
    { time: 0.8616377115, value: 0, inSlope: Infinity, outSlope: Infinity },
    { time: 0.9063047171, value: 1, inSlope: Infinity, outSlope: Infinity },
    { time: 1, value: 1, inSlope: Infinity, outSlope: Infinity },
];
const SCREEN_FILM_LIGHT_ALPHA: FxmScalarKey[] = [
    { time: 0, value: 1, inSlope: 0, outSlope: 0 },
    { time: 0.1582958549, value: 0.8924205303, inSlope: 0, outSlope: 0 },
    { time: 0.4923077226, value: 1, inSlope: 0, outSlope: 0 },
];
const SCREEN_FILM_STRIP_ALPHA: FxmScalarKey[] = [
    { time: 0, value: 1, inSlope: 0, outSlope: 0 },
    { time: 0.4923095703, value: 0.82396245, inSlope: 0, outSlope: 0 },
    { time: 1, value: 1, inSlope: 0, outSlope: 0 },
];
const SCREEN_FILM_DOWN_X: FxmScalarKey[] = [
    { time: 0, value: -0.4987792969, inSlope: 0, outSlope: 1 },
    { time: 1, value: 0.5012207031, inSlope: 1, outSlope: 0 },
];
const SCREEN_FILM_UP_X: FxmScalarKey[] = [
    { time: 0, value: -0.4718933105, inSlope: 0, outSlope: 0.9926769137 },
    { time: 1, value: 0.5207836032, inSlope: 0.9926769137, outSlope: 0 },
];
const SCREEN_FILM_DOWN_TILES = [
    27.2079963684,
    8.623998642,
    -10.0880031586,
    -28.8319969177,
];
const SCREEN_FILM_UP_TILES = [
    27.2079963684,
    8.6240005493,
    -10.0880012512,
    -28.8700008392,
];
function ScreenFilmEffect({ effect, processId, paused, }: {
    effect: StoryGameObjectEffect;
    processId: string;
    paused: boolean;
}) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const pausedRef = useRef(paused);
    useEffect(() => {
        pausedRef.current = paused;
    }, [paused]);
    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !context) {
            return;
        }
        const images = effect.assets.map((asset) => {
            const image = new window.Image();
            image.decoding = "async";
            image.src = deploymentUrl(asset);
            return image;
        });
        const randomValue = new Uint32Array(1);
        window.crypto.getRandomValues(randomValue);
        const darkRotation = (randomValue[0] / 4294967296) * 360;
        const tintCache = new Map<string, HTMLCanvasElement>();
        let disposed = false;
        let ready = false;
        let animationFrame = 0;
        let elapsed = 0;
        let previousTime = performance.now();
        Promise.all(images.map((image) => new Promise<void>((resolve) => {
            if (image.complete && image.naturalWidth > 0) {
                resolve();
                return;
            }
            image.addEventListener("load", () => resolve(), { once: true });
            image.addEventListener("error", () => resolve(), { once: true });
        }))).then(() => {
            ready = !disposed && images.every((image) => image.naturalWidth > 0);
        });
        const getTintedImage = (image: HTMLImageElement, red: number, green: number, blue: number) => {
            const key = `${image.src}:${red}:${green}:${blue}`;
            const cached = tintCache.get(key);
            if (cached) {
                return cached;
            }
            const tinted = document.createElement("canvas");
            tinted.width = image.naturalWidth;
            tinted.height = image.naturalHeight;
            const tintedContext = tinted.getContext("2d");
            if (!tintedContext) {
                return tinted;
            }
            tintedContext.drawImage(image, 0, 0);
            tintedContext.globalCompositeOperation = "source-in";
            tintedContext.fillStyle = `rgb(${red} ${green} ${blue})`;
            tintedContext.fillRect(0, 0, tinted.width, tinted.height);
            tintCache.set(key, tinted);
            return tinted;
        };
        const drawImage = ({ image, x, y, width, height, red, green, blue, alpha, rotation = 0, additive = false, }: {
            image: HTMLImageElement;
            x: number;
            y: number;
            width: number;
            height: number;
            red: number;
            green: number;
            blue: number;
            alpha: number;
            rotation?: number;
            additive?: boolean;
        }) => {
            if (!image.naturalWidth || !image.naturalHeight || alpha <= 0) {
                return;
            }
            context.save();
            context.globalCompositeOperation = additive ? "lighter" : "source-over";
            context.globalAlpha = Math.min(Math.max(alpha, 0), 1);
            context.translate(x, y);
            context.rotate((-rotation * Math.PI) / 180);
            context.drawImage(getTintedImage(image, red, green, blue), -width / 2, -height / 2, width, height);
            context.restore();
        };
        const render = (time: number) => {
            const delta = Math.max(time - previousTime, 0) / 1000;
            previousTime = time;
            if (!pausedRef.current) {
                elapsed += delta;
            }
            const viewportWidth = Math.max(canvas.clientWidth, 1);
            const viewportHeight = Math.max(canvas.clientHeight, 1);
            const pixelRatio = Math.max(window.devicePixelRatio || 1, 1);
            const renderWidth = Math.max(Math.round(viewportWidth * pixelRatio), 1);
            const renderHeight = Math.max(Math.round(viewportHeight * pixelRatio), 1);
            if (canvas.width !== renderWidth || canvas.height !== renderHeight) {
                canvas.width = renderWidth;
                canvas.height = renderHeight;
            }
            context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
            context.clearRect(0, 0, viewportWidth, viewportHeight);
            // STV-GO-002: SCREEN_FILM 루트는 전체 안전영역이지만 자식 좌표에는
            // ProcessGameObjectBG의 m_OrgGOScale이 균일하게 누적된다.
            const rootLayout = getStoryGameObjectRootLayout(viewportWidth, viewportHeight);
            const centerX = viewportWidth / 2;
            const centerY = viewportHeight / 2;
            const rootTop = centerY - (viewportHeight * rootLayout.rootScale) / 2;
            const rootBottom = centerY + (viewportHeight * rootLayout.rootScale) / 2;
            const scale = rootLayout.compositeScale;
            canvas.dataset.storyScreenFilmRootScale =
                rootLayout.rootScale.toFixed(8);
            canvas.dataset.storyScreenFilmCompositeScale = scale.toFixed(8);
            canvas.dataset.storyScreenFilmReferenceSize =
                `${rootLayout.referenceWidth.toFixed(4)}x${rootLayout.referenceHeight.toFixed(4)}`;
            if (ready) {
                const duration = Math.max(effect.duration, 0.001);
                const progress = (elapsed % duration) / duration;
                // BG 자식 순서: CMN_WHITE -> NK_FILM_01 -> NK_FILM_02.
                drawImage({
                    image: images[3],
                    x: centerX,
                    y: centerY,
                    width: 3164.3603515625 * scale,
                    height: 2531.6911621094 * scale,
                    red: 67,
                    green: 67,
                    blue: 67,
                    alpha: 1,
                });
                drawImage({
                    image: images[0],
                    x: centerX,
                    y: centerY,
                    width: 3353.5217285156 * scale,
                    height: 3354.3010253906 * scale,
                    red: 190,
                    green: 187,
                    blue: 168,
                    alpha: sampleFxmCurve(SCREEN_FILM_DARK_ALPHA, progress),
                    rotation: sampleFxmCurve(SCREEN_FILM_DARK_ROTATION, progress) * darkRotation,
                    additive: true,
                });
                drawImage({
                    image: images[1],
                    x: centerX,
                    y: centerY,
                    width: 3210.4064941406 * scale,
                    height: 1675.7517089844 * scale,
                    red: 255,
                    green: 255,
                    blue: 255,
                    alpha: sampleFxmCurve(SCREEN_FILM_LIGHT_ALPHA, progress) *
                        0.3039999902 *
                        0.5,
                    additive: true,
                });
                const stripAlpha = sampleFxmCurve(SCREEN_FILM_STRIP_ALPHA, progress);
                const stripWidth = 18.783493042 * 55 * scale;
                const stripHeight = 9.5042552948 * 55 * scale;
                const drawStrip = (centerY: number, positions: number[], movementX: number) => {
                    positions.forEach((position) => {
                        drawImage({
                            image: images[2],
                            x: centerX + (movementX + position * 55) * scale,
                            y: centerY,
                            width: stripWidth,
                            height: stripHeight,
                            red: 220,
                            green: 220,
                            blue: 220,
                            alpha: stripAlpha,
                        });
                    });
                };
                // Unity 캔버스의 FILM_UP 뒤에 FILM_DOWN이 그려진다.
                drawStrip(rootTop - 118.8012084961 * scale, SCREEN_FILM_UP_TILES, sampleFxmCurve(SCREEN_FILM_UP_X, progress) * 20 * 55);
                drawStrip(rootBottom + 117.4907226563 * scale, SCREEN_FILM_DOWN_TILES, sampleFxmCurve(SCREEN_FILM_DOWN_X, progress) * -20 * 55);
            }
            context.globalAlpha = 1;
            context.globalCompositeOperation = "source-over";
            if (!disposed) {
                animationFrame = window.requestAnimationFrame(render);
            }
        };
        animationFrame = window.requestAnimationFrame(render);
        return () => {
            disposed = true;
            window.cancelAnimationFrame(animationFrame);
            context.setTransform(1, 0, 0, 1, 0, 0);
            context.clearRect(0, 0, canvas.width, canvas.height);
        };
    }, [effect, processId]);
    return (<canvas ref={canvasRef} className={styles.screenFilmEffect} width={1920} height={1080} data-story-fxm-player-duration={effect.duration} data-story-fxm-player-loop="true" data-story-fxm-ui-image-count={11} data-story-fxm-material="CMN_FX_SPRITE_UI_PM" data-story-fxm-variant={effect.kind} data-story-screen-film-layout="full-safe-root" aria-hidden="true"/>);
}
type UnityTextStyle = {
    color?: string;
    fontSize?: string;
    fontStyle?: "italic";
    fontWeight?: number;
};
function renderUnityText(value: string, visibleCharacters = Number.POSITIVE_INFINITY) {
    value = resolveStoryTextVariables(value);
    const tokens = value.split(/(<\/?(?:color|size|b|i)(?:=[^>]+)?>)/giu);
    const styleStack: UnityTextStyle[] = [];
    let style: UnityTextStyle = {};
    let remaining = visibleCharacters;
    const output: React.ReactNode[] = [];
    for (const [index, token] of tokens.entries()) {
        const tag = token.match(/^<(\/?)(color|size|b|i)(?:=([^>]+))?>$/iu);
        if (tag) {
            if (tag[1]) {
                style = styleStack.pop() ?? {};
            }
            else {
                styleStack.push({ ...style });
                if (tag[2].toLocaleLowerCase("en-US") === "color") {
                    const color = tag[3]?.replace(/^["']|["']$/gu, "").trim();
                    if (/^#[0-9a-f]{3,8}$/iu.test(color ?? "")) {
                        style = { ...style, color };
                    }
                }
                else if (tag[2].toLocaleLowerCase("en-US") === "size") {
                    const size = Number(tag[3]);
                    if (Number.isFinite(size)) {
                        style = {
                            ...style,
                            fontSize: `${Math.min(Math.max(size, 8), 96) / 36}em`,
                        };
                    }
                }
                else if (tag[2].toLocaleLowerCase("en-US") === "b") {
                    style = { ...style, fontWeight: 700 };
                }
                else if (tag[2].toLocaleLowerCase("en-US") === "i") {
                    style = { ...style, fontStyle: "italic" };
                }
            }
            continue;
        }
        if (remaining <= 0) {
            break;
        }
        const characters = Array.from(token);
        const visible = characters.slice(0, remaining).join("");
        remaining -= characters.length;
        if (visible) {
            output.push(<span key={`${index}-${output.length}`} style={style}>
          {visible}
        </span>);
        }
    }
    return output;
}
function createFxEvent(name: string | undefined, path: string | undefined, control: StoryFxControl | undefined): StoryFxEvent | null {
    if (!name) {
        return null;
    }
    return {
        name,
        path: path ?? "",
        action: control === "NCSC_STOP" ? "stop" : "play",
        loop: control === "NCSC_LOOP_PLAY",
    };
}
function getSoundUrl(relativePath: string) {
    return relativePath
        ? createSoundAssetUrl(...relativePath.split("/").filter(Boolean))
        : "";
}
function UiSprite({ src, alt, width, height, }: {
    src: string;
    alt: string;
    width: number;
    height: number;
}) {
    return src ? (<Image src={src} alt={alt} width={width} height={height} unoptimized/>) : (<span>{alt}</span>);
}
function StoryStageActVisualBackground({ act, stageMap, }: {
    act: number;
    stageMap: StoryStageMap;
}) {
    const visualBackground = stageMap.visualBackground;
    if (!visualBackground) {
        return null;
    }
    return (<div className={styles.stageActVisualClip} data-story-operation-event-act-visual="STV-MAP-077" data-story-operation-event-act-visual-act={act} data-story-operation-event-act-visual-count={visualBackground.layers.length} data-story-operation-event-act-visual-order={visualBackground.layers
            .map((layer) => layer.name)
            .join(",")} aria-hidden="true">
      <div className={styles.stageActVisualBackground} data-story-operation-event-act-visual-background={visualBackground.name} style={{
            left: `${((stageMap.width / 2 + visualBackground.x) / stageMap.width) * 100}%`,
            top: `${((stageMap.height / 2 - visualBackground.y) / stageMap.height) * 100}%`,
            width: `${(visualBackground.width / stageMap.width) * 100}%`,
            height: `${(visualBackground.height / stageMap.height) * 100}%`,
        } as React.CSSProperties}>
        {visualBackground.layers.map((layer, layerIndex) => {
            const [red, green, blue, alpha] = layer.color;
            const isWhite = red === 1 && green === 1 && blue === 1 && alpha === 1;
            const useTintMask = layer.imageType === "simple" && !isWhite;
            const border = layer.border ?? {
                left: 0,
                bottom: 0,
                right: 0,
                top: 0,
            };
            return (<i key={`${layer.name}-${layerIndex}`} className={styles.stageActVisualLayer} data-story-operation-event-act-visual-layer={layer.name} data-story-operation-event-act-visual-sprite={layer.spriteName} data-image-type={layer.imageType} data-tint-mask={useTintMask ? "true" : "false"} data-sliced-tint={layer.imageType === "sliced" && !isWhite ? "true" : "false"} style={{
                    left: `${((visualBackground.width / 2 + layer.x) / visualBackground.width) * 100}%`,
                    top: `${((visualBackground.height / 2 - layer.y) / visualBackground.height) * 100}%`,
                    width: `${(layer.width / visualBackground.width) * 100}%`,
                    height: `${(layer.height / visualBackground.height) * 100}%`,
                    "--story-stage-act-visual-sprite": `url("${deploymentUrl(`${layer.spriteUrl}`)}")`,
                    "--story-stage-act-visual-scale-x": layer.scaleX,
                    "--story-stage-act-visual-scale-y": layer.scaleY,
                    "--story-stage-act-visual-tint": `rgb(${red * 100}% ${green * 100}% ${blue * 100}% / ${alpha})`,
                    "--story-stage-act-visual-brightness": red,
                    "--story-stage-act-visual-opacity": alpha,
                    "--story-stage-act-visual-border-top": `${(border.top / stageMap.height) * 100}cqh`,
                    "--story-stage-act-visual-border-right": `${(border.right / stageMap.height) * 100}cqh`,
                    "--story-stage-act-visual-border-bottom": `${(border.bottom / stageMap.height) * 100}cqh`,
                    "--story-stage-act-visual-border-left": `${(border.left / stageMap.height) * 100}cqh`,
                    "--story-stage-act-visual-border-slice": `${border.top} ${border.right} ${border.bottom} ${border.left} fill`,
                } as React.CSSProperties}/>);
        })}
      </div>
    </div>);
}
function StoryEpisodeDrawer({ episodes, selectedEpisodeId, onClose, onChoose, }: {
    episodes: StoryEpisodeIndex[];
    selectedEpisodeId: number;
    onClose: () => void;
    onChoose: (episodeId: number) => void;
}) {
    return (<div className={styles.episodeDrawerBackdrop} role="dialog" aria-modal="true" data-story-episode-drawer>
      <aside className={styles.episodeDrawer}>
        <header>
          <div>
            <span>OPERATION</span>
            <strong>EPISODE LIST</strong>
          </div>
          <button type="button" onClick={onClose}>
            ×
          </button>
        </header>
        <div className={styles.episodeDrawerList}>
          {episodes.map((episode) => (<button key={episode.id} type="button" data-active={episode.id === selectedEpisodeId} onClick={() => onChoose(episode.id)}>
              <small>{episode.category.replace("EC_", "")}</small>
              <strong>{episode.title}</strong>
              <span>{episode.name}</span>
            </button>))}
        </div>
      </aside>
    </div>);
}
function CounterCaseBestFitText({ as, text, minDesignSize, maxDesignSize, }: {
    as: "small" | "strong";
    text: string;
    minDesignSize: number;
    maxDesignSize: number;
}) {
    const textRef = useRef<HTMLElement | null>(null);
    useLayoutEffect(() => {
        const element = textRef.current;
        if (!element) {
            return;
        }
        let animationFrame = 0;
        let disposed = false;
        const fitText = () => {
            if (disposed || element.clientWidth <= 0) {
                return;
            }
            element.style.removeProperty("font-size");
            const responsiveMaxSize = Number.parseFloat(getComputedStyle(element).fontSize);
            if (!Number.isFinite(responsiveMaxSize) || responsiveMaxSize <= 0) {
                return;
            }
            const viewportScale = responsiveMaxSize / maxDesignSize;
            let fittedDesignSize = minDesignSize;
            for (let candidate = maxDesignSize; candidate >= minDesignSize; candidate -= 1) {
                element.style.fontSize = `${candidate * viewportScale}px`;
                if (element.scrollWidth <= element.clientWidth + 0.5) {
                    fittedDesignSize = candidate;
                    break;
                }
            }
            element.dataset.storyCountercaseBestFitSize = String(fittedDesignSize);
        };
        const scheduleFit = () => {
            cancelAnimationFrame(animationFrame);
            animationFrame = requestAnimationFrame(fitText);
        };
        // STV-MAP-019: Unity legacy Text searches integer font sizes from max to min.
        fitText();
        const resizeObserver = new ResizeObserver(scheduleFit);
        resizeObserver.observe(element.parentElement ?? element);
        window.addEventListener("resize", scheduleFit);
        void document.fonts.ready.then(scheduleFit);
        return () => {
            disposed = true;
            cancelAnimationFrame(animationFrame);
            resizeObserver.disconnect();
            window.removeEventListener("resize", scheduleFit);
        };
    }, [maxDesignSize, minDesignSize, text]);
    const commonProps = {
        "data-story-countercase-best-fit": `${minDesignSize}-${maxDesignSize}`,
    };
    return as === "small" ? (<small ref={textRef} {...commonProps}>
      {text}
    </small>) : (<strong ref={textRef} {...commonProps}>
      {text}
    </strong>);
}
function StageInfoBestFitTitle({ text }: {
    text: string;
}) {
    const titleRef = useRef<HTMLHeadingElement | null>(null);
    useLayoutEffect(() => {
        const element = titleRef.current;
        if (!element) {
            return;
        }
        let animationFrame = 0;
        let disposed = false;
        const fitText = () => {
            if (disposed || element.clientWidth <= 0) {
                return;
            }
            element.style.removeProperty("font-size");
            const responsiveMaxSize = Number.parseFloat(getComputedStyle(element).fontSize);
            if (!Number.isFinite(responsiveMaxSize) || responsiveMaxSize <= 0) {
                return;
            }
            const viewportScale = responsiveMaxSize / 40;
            let fittedDesignSize = 18;
            for (let candidate = 40; candidate >= 18; candidate -= 1) {
                element.style.fontSize = `${candidate * viewportScale}px`;
                if (element.scrollWidth <= element.clientWidth + 0.5) {
                    fittedDesignSize = candidate;
                    break;
                }
            }
            element.dataset.storyStageInfoBestFitSize = String(fittedDesignSize);
        };
        const scheduleFit = () => {
            cancelAnimationFrame(animationFrame);
            animationFrame = requestAnimationFrame(fitText);
        };
        // STV-MAP-039: 원본 ACT_TITLE TMP의 18~40 integer autosize 범위다.
        fitText();
        const resizeObserver = new ResizeObserver(scheduleFit);
        resizeObserver.observe(element);
        window.addEventListener("resize", scheduleFit);
        void document.fonts.ready.then(scheduleFit);
        return () => {
            disposed = true;
            cancelAnimationFrame(animationFrame);
            resizeObserver.disconnect();
            window.removeEventListener("resize", scheduleFit);
        };
    }, [text]);
    return (<h3 ref={titleRef} data-story-stage-info-best-fit="18-40" data-story-operation-stage-info-spacing="STV-MAP-069">
      {text}
    </h3>);
}
function StoryWaitBox({ ui }: {
    ui: Record<string, string>;
}) {
    const cog = ui.cog;
    const arrow = ui.NKM_UI_WAIT_arrow;
    const ring = ui.NKM_UI_WAIT_ring;
    return (<div className={styles.storyWaitBox} data-story-wait-box="true" data-story-wait-box-type="1" role="status" aria-label="please WAIT" style={{
            "--story-wait-box": ui.NKM_UI_WAIT_box
                ? `url("${deploymentUrl(`${ui.NKM_UI_WAIT_box}`)}")` : "none",
        } as React.CSSProperties}>
      <div className={styles.storyWaitCogs} aria-hidden="true">
        {[1, 2, 3].map((index) => (<span key={index} data-cog={index}>
            {cog ? <Image src={cog} alt="" fill unoptimized/> : null}
          </span>))}
      </div>
      <div className={styles.storyWaitAnimation} aria-hidden="true">
        <i className={styles.storyWaitBoxFill}/>
        <strong className={styles.storyWaitText}>please{"\n"}WAIT</strong>
        {ring ? (<Image src={ring} alt="" width={400} height={400} unoptimized className={styles.storyWaitRing}/>) : null}
        {(["left", "right"] as const).flatMap((side) => [1, 2, 3].map((index) => (<span key={`${side}-${index}`} className={styles.storyWaitArrow} data-side={side} data-step={index}>
              {arrow ? (<Image src={arrow} alt="" width={10} height={17} unoptimized/>) : null}
            </span>)))}
      </div>
    </div>);
}
function getStageDisplayNumber(stage: StoryStage) {
    if (!Number.isFinite(stage.uiNumber) || stage.uiNumber <= 0) {
        return "";
    }
    return stage.nodeKind === "story"
        ? `#${stage.uiNumber}`
        : `${stage.act}-${stage.uiNumber}`;
}
function getStageRouteRubberDelta(overStretching: number, viewSize: number) {
    return getStoryUnityScrollRectRubberDelta(overStretching, viewSize);
}
function getCounterCaseScrollRubberDelta(overStretching: number, viewSize: number) {
    if (viewSize <= 0 || overStretching === 0) {
        return 0;
    }
    return ((1 - 1 / ((Math.abs(overStretching) * 0.55) / viewSize + 1)) *
        viewSize *
        Math.sign(overStretching));
}
function smoothCounterCaseScrollRubber(current: number, currentVelocity: number, deltaTime: number, smoothTime: number) {
    // STV-MAP-058: Mathf.SmoothDamp uses .1 for pointer/hotkey release. The
    // standard ScrollRect uses elasticity * 3 for the first wheel LateUpdate.
    const safeSmoothTime = Math.max(0.0001, smoothTime);
    const omega = 2 / safeSmoothTime;
    const x = omega * deltaTime;
    const exponential = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
    const temporary = (currentVelocity + omega * current) * deltaTime;
    let velocity = (currentVelocity - omega * temporary) * exponential;
    let value = (current + temporary) * exponential;
    // Mathf.SmoothDamp clamps a step that would pass its original target. This
    // matters when wheel/hotkey input changes an already returning boundary.
    if ((-current > 0) === (value > 0)) {
        value = 0;
        velocity = 0;
    }
    return {
        value,
        velocity,
    };
}
function getCounterCaseScrollCanvasScale(scroll: HTMLElement) {
    const root = scroll.closest<HTMLElement>("[data-story-countercase-view]");
    const referenceWidth = root?.clientWidth ?? window.innerWidth;
    const referenceHeight = root?.clientHeight ?? window.innerHeight;
    const scale = Math.min(1, referenceWidth / 1920, referenceHeight / 1080);
    return Number.isFinite(scale) && scale > 0 ? scale : 1;
}
function getStoryLogScrollCanvasScale(scroll: HTMLElement) {
    const root = scroll.closest<HTMLElement>("main");
    const referenceWidth = root?.clientWidth ?? window.innerWidth;
    const referenceHeight = root?.clientHeight ?? window.innerHeight;
    return getStoryLogCanvasScale(referenceWidth, referenceHeight);
}
function getStoryLogScrollMaximum(scroll: HTMLElement) {
    const content = scroll.querySelector<HTMLElement>("[data-story-cutscene-log-scroll-hotkey-content]");
    return Math.max(0, (content?.scrollHeight ?? scroll.scrollHeight) - scroll.clientHeight);
}
function getCounterCaseScrollMaximum(scroll: HTMLElement) {
    const content = scroll.querySelector<HTMLElement>("[data-story-countercase-scroll-physics-content]");
    // A translated child contributes to the viewport's CSS overflow. Unity
    // content bounds do not grow with rubber. The standard record Content also
    // has decorative slot children that overflow their 232.6px layout boxes, so
    // STV-MAP-066 reads that Content's layout box rather than its visual overflow.
    const contentHeight = scroll.dataset.storyCountercaseScrollPhysicsTarget === "normal"
        ? (content?.getBoundingClientRect().height ?? scroll.scrollHeight)
        : (content?.scrollHeight ?? scroll.scrollHeight);
    return Math.max(0, contentHeight - scroll.clientHeight);
}
function animateStageRouteNormalizedScroll(route: HTMLElement, targetScrollLeft: number, motionFrameRef: {
    current: number | null;
}) {
    const startScrollLeft = route.scrollLeft;
    let startedAt: number | null = null;
    const update = (currentTime: number) => {
        startedAt ??= currentTime;
        const progress = Math.min((currentTime - startedAt) / 200, 1);
        // DOTween Ease 15 is OutQuint.
        const easedProgress = 1 - Math.pow(1 - progress, 5);
        route.scrollLeft =
            startScrollLeft + (targetScrollLeft - startScrollLeft) * easedProgress;
        if (progress < 1) {
            motionFrameRef.current = window.requestAnimationFrame(update);
        }
        else {
            motionFrameRef.current = null;
        }
    };
    motionFrameRef.current = window.requestAnimationFrame(update);
}
export default function StoryReader() {
    const router = useRouter();
    const { display: operationScrollHotkeyDisplay, isDisplayActive: isOperationScrollHotkeyDisplayActive, openDisplay: openOperationScrollHotkeyDisplay, registerLocalRenderer: registerOperationScrollHotkeyLocalRenderer, } = useStoryOperationScrollHotkeyOverlay();
    useLayoutEffect(() => registerOperationScrollHotkeyLocalRenderer(), [registerOperationScrollHotkeyLocalRenderer]);
    const theaterRef = useRef<HTMLElement | null>(null);
    const backgroundPositionRef = useRef<HTMLDivElement | null>(null);
    const backgroundScaleRef = useRef<HTMLDivElement | null>(null);
    const backgroundGraphicRef = useRef<HTMLDivElement | null>(null);
    const fadeLayerRef = useRef<HTMLDivElement | null>(null);
    const backgroundColorRef = useRef<HTMLElement | null>(null);
    const ownsThemeAudioRef = useRef(false);
    const preserveThemeOnUnmountRef = useRef(false);
    const operationEntryFadeActiveRef = useRef(false);
    const operationEntryFadeTimerRef = useRef<number | null>(null);
    const counterCaseEntryFadeActiveRef = useRef(false);
    const counterCaseEntryFadeTimerRef = useRef<number | null>(null);
    const operationExitFadeActiveRef = useRef(false);
    const voiceRef = useRef<HTMLAudioElement | null>(null);
    const activeVoicesRef = useRef(new Set<HTMLAudioElement>());
    const startedVoiceProcessIdRef = useRef("");
    const movieRef = useRef<HTMLVideoElement | null>(null);
    const stageRouteRef = useRef<HTMLElement | null>(null);
    const stageRouteMotionFrameRef = useRef<number | null>(null);
    const stageRouteRubberRef = useRef(0);
    const stageRouteVelocityRef = useRef(0);
    const stageRouteHotkeyCodesRef = useRef(new Set<string>());
    const stageRouteHotkeyFrameRef = useRef<number | null>(null);
    const stageRouteHotkeyReleaseFrameRef = useRef<number | null>(null);
    const counterCaseViewerRef = useRef<HTMLElement | null>(null);
    const counterCaseNormalListRef = useRef<HTMLDivElement | null>(null);
    const operationScrollHotkeyTargetElementRef = useRef<HTMLElement | null>(null);
    const operationScrollHotkeyContextRef = useRef({
        isStageTopmost: false,
        isCounterCaseTopmost: false,
        counterCaseTarget: "acts" as "acts" | "normal",
    });
    const counterCaseScrollHotkeyCodesRef = useRef(new Set<string>());
    const counterCaseScrollHotkeyFrameRef = useRef<number | null>(null);
    const counterCaseScrollDragRef = useRef<StoryCounterCaseScrollDragState | null>(null);
    const counterCaseScrollSuppressClickRef = useRef(false);
    const counterCaseScrollSuppressClickResetTimerRef = useRef<number | null>(null);
    const counterCaseScrollMotionFrameRef = useRef<number | null>(null);
    const counterCaseScrollMotionElementRef = useRef<HTMLElement | null>(null);
    const counterCaseScrollDragVelocityFrameRef = useRef<number | null>(null);
    const counterCaseScrollRubberRef = useRef(0);
    const counterCaseScrollRubberVelocityRef = useRef(0);
    const counterCaseScrollVelocityRef = useRef(0);
    const counterCaseScrollNextSmoothTimeRef = useRef(STORY_COUNTERCASE_SCROLL_ELASTICITY);
    const counterCaseLoopWheelDraggingRef = useRef(false);
    const counterCaseScrollSurfaceStatesRef = useRef<Record<"acts" | "normal", StoryCounterCaseScrollSurfaceState>>({
        acts: { visualPosition: 0, loopDragging: false },
        normal: { visualPosition: 0, loopDragging: false },
    });
    const counterCaseScrollPreSnapshotTargetRef = useRef<"acts" | "normal" | null>(null);
    const snapshotCounterCaseScrollSurface = useCallback((target: "acts" | "normal", beforeTransition = false) => {
        const scroll = target === "acts"
            ? counterCaseViewerRef.current
            : counterCaseNormalListRef.current;
        if (!scroll) {
            return;
        }
        const rubber = Number.parseFloat(scroll.dataset.storyCountercaseScrollRubberY ?? "0");
        counterCaseScrollSurfaceStatesRef.current[target] = {
            visualPosition: scroll.scrollTop - (Number.isFinite(rubber) ? rubber : 0),
            loopDragging: target === "acts" &&
                (counterCaseLoopWheelDraggingRef.current ||
                    Boolean(counterCaseScrollDragRef.current?.scroll === scroll &&
                        counterCaseScrollDragRef.current.scrollRectDragging)),
        };
        if (beforeTransition) {
            counterCaseScrollPreSnapshotTargetRef.current = target;
        }
    }, []);
    const loopFxRef = useRef(new Map<string, Set<HTMLAudioElement>>());
    const transientFxRef = useRef(new Set<HTMLAudioElement>());
    const reservedFxRef = useRef<StoryFxEvent | null>(null);
    const episodeCacheRef = useRef(new Map<number, StoryEpisode>());
    const charactersPromiseRef = useRef<Promise<Record<string, StoryCharacter>> | null>(null);
    const processedCommandRef = useRef("");
    const commandStartedAtRef = useRef(0);
    const commandWallStartedAtRef = useRef(0);
    const popupPausedAtRef = useRef(0);
    const logVisibilitySnapshotRef = useRef({ title: false, talk: false });
    const autoWaitRef = useRef({ processId: "", durationMs: 0 });
    const waitClockRef = useRef({ processId: "", elapsedMs: 0 });
    const dialogueTypingClockRef = useRef({ stepId: "", elapsedMs: 0 });
    const dialogueTypewriterRef = useRef({
        normal: createStoryTypewriterRuntimeState("tmp"),
        center: createStoryTypewriterRuntimeState("legacy"),
    });
    const titleTypingClockRef = useRef({ stepId: "", elapsedMs: 0 });
    const subtitleTypingClockRef = useRef({ stepId: "", elapsedMs: 0 });
    const actorCrashClockRef = useRef({ processId: "", elapsedMs: 0 });
    const centerFadeOutClockRef = useRef({ processId: "", elapsedMs: 0 });
    const appliedBgmRevisionRef = useRef(0);
    const dialogueNextMemoryRef = useRef({
        normalActive: true,
        centerActive: true,
        normalGoalText: "",
        centerGoalText: "",
        normalSpeakerNameTempFlag: false,
    });
    const backgroundManagerMemoryRef = useRef<StoryBackgroundManagerMemory>({
        retainedImageBackgroundName: "",
        retainedImageBackgroundUrl: "",
        backgroundFadeOutTint: [1, 1, 1, 1],
        backgroundFadeOutTimeMs: 0,
        backgroundFadeOutEase: "linear",
    });
    const visualStateRef = useRef<StoryVisualState>(createInitialStoryVisualState());
    const [manifest, setManifest] = useState<StoryIndex | null>(null);
    const [manifestError, setManifestError] = useState("");
    const [episodeError, setEpisodeError] = useState("");
    const [characters, setCharacters] = useState<Record<string, StoryCharacter>>({});
    const [selectedEpisode, setSelectedEpisode] = useState<StoryEpisode | null>(null);
    const [selectedEpisodeId, setSelectedEpisodeId] = useState(0);
    const [seasonalReturnEpisodeId, setSeasonalReturnEpisodeId] = useState(0);
    const [selectedAct, setSelectedAct] = useState(0);
    const [operationActHotkeySelectionRevision, setOperationActHotkeySelectionRevision] = useState(0);
    const [selectedCounterCaseAct, setSelectedCounterCaseAct] = useState(0);
    const [selectedStageId, setSelectedStageId] = useState(0);
    const [selectedScene, setSelectedScene] = useState<StorySceneSummary | null>(null);
    const [scene, setScene] = useState<StoryScene | null>(null);
    const [sceneAudioPreloadReport, setSceneAudioPreloadReport] = useState({
        failed: 0,
        total: 0,
    });
    const [theaterSessionRevision, setTheaterSessionRevision] = useState(0);
    const [sceneError, setSceneError] = useState("");
    const [commandIndex, setCommandIndex] = useState(0);
    const [visualState, setVisualState] = useState<StoryVisualState>(createInitialStoryVisualState);
    const [choices, setChoices] = useState<StoryChoice[]>([]);
    const [storyLog, setStoryLog] = useState<StoryLogEntry[]>([]);
    const [storyLogSnapshot, setStoryLogSnapshot] = useState<StoryLogEntry[]>([]);
    const [displayedCharacters, setDisplayedCharacters] = useState(0);
    const [dialogueTypingProcessId, setDialogueTypingProcessId] = useState("");
    const [dialogueTypingRevision, setDialogueTypingRevision] = useState(0);
    const [displayedTitleCharacters, setDisplayedTitleCharacters] = useState(0);
    const [displayedSubtitleCharacters, setDisplayedSubtitleCharacters] = useState(0);
    const [finishedTitleTypingProcessId, setFinishedTitleTypingProcessId] = useState("");
    const [mode, setMode] = useState<ReaderMode>("episode");
    const [isAuto, setIsAuto] = useState(false);
    const [activeVoiceCount, setActiveVoiceCount] = useState(0);
    const [activeTransientFxCount, setActiveTransientFxCount] = useState(0);
    const [lastNaturalEndFxName, setLastNaturalEndFxName] = useState("");
    const [isLogOpen, setIsLogOpen] = useState(false);
    const logListRef = useRef<HTMLDivElement | null>(null);
    const cutsceneLogButtonRef = useRef<HTMLButtonElement | null>(null);
    const movieSkipConfirmButtonRef = useRef<HTMLButtonElement | null>(null);
    const cutsceneHotkeyAltHeldRef = useRef(false);
    const cutsceneHotkeyGenerationRef = useRef(0);
    const cutsceneHotkeyTargetElementRef = useRef<HTMLElement | null>(null);
    const cutsceneHotkeySnapshotRef = useRef<StoryCutsceneHotkeyDisplaySnapshot | null>(null);
    const [cutsceneHotkeyDisplay, setCutsceneHotkeyDisplay] = useState<StoryCutsceneHotkeyDisplaySnapshot | null>(null);
    const storyLogScrollHotkeyCodesRef = useRef(new Set<string>());
    const storyLogScrollHotkeyFrameRef = useRef<number | null>(null);
    const storyLogScrollRubberRef = useRef(0);
    const storyLogScrollRubberVelocityRef = useRef(0);
    const storyLogScrollVelocityRef = useRef(0);
    const storyLogScrollPointerRef = useRef<StoryLogScrollPointerState | null>(null);
    const storyLogScrollComponentDraggingRef = useRef(false);
    const storyLogScrollSuppressClickRef = useRef(false);
    const storyLogScrollSuppressClickResetTimerRef = useRef<number | null>(null);
    const [logRestoredVisibility, setLogRestoredVisibility] = useState<{
        title: boolean;
        talk: boolean;
        commandIndex: number;
    } | null>(null);
    const [isEpisodeListOpen, setIsEpisodeListOpen] = useState(false);
    const [isStageInfoOpen, setIsStageInfoOpen] = useState(false);
    const [isOperationEntryFadeActive, setIsOperationEntryFadeActive] = useState(false);
    const [isCounterCaseEntryFadeActive, setIsCounterCaseEntryFadeActive] = useState(false);
    const [isOperationExitFadeActive, setIsOperationExitFadeActive] = useState(false);
    const [isSkipOpen, setIsSkipOpen] = useState(false);
    const [isUiHidden, setIsUiHidden] = useState(false);
    const [audioUnlocked, setAudioUnlocked] = useState(false);
    const [endedVoiceProcessId, setEndedVoiceProcessId] = useState("");
    const [logReplayVoiceProcessId, setLogReplayVoiceProcessId] = useState("");
    const [finishedVisualProcessId, setFinishedVisualProcessId] = useState("");
    const [preparedMovieProcessId, setPreparedMovieProcessId] = useState("");
    const [centerFadeReadyProcessId, setCenterFadeReadyProcessId] = useState("");
    const [centerFadeOutProcessId, setCenterFadeOutProcessId] = useState("");
    const [stoppedActorCrashProcessId, setStoppedActorCrashProcessId] = useState("");
    const [stoppedActorBounceProcessId, setStoppedActorBounceProcessId] = useState("");
    const [finishedActorProcessId, setFinishedActorProcessId] = useState("");
    const [forcedWaitClickProcessId, setForcedWaitClickProcessId] = useState("");
    const [isFastSkipHeld, setIsFastSkipHeld] = useState(false);
    const [closingTitle, setClosingTitle] = useState<ClosingStoryTitle | null>(null);
    const [episodePlaybackBgmPath, setEpisodePlaybackBgmPath] = useState<string | null>(null);
    useEffect(() => {
        const clearSeasonalReturn = () => {
            window.sessionStorage.removeItem(STORY_SEASONAL_RETURN_STORAGE_KEY);
        };
        const isChronicleReturnPath = (pathname: string) => pathname.replace(/\/+$/u, "") === "/story";
        const handlePopState = () => {
            if (isChronicleReturnPath(window.location.pathname)) {
                preserveThemeOnUnmountRef.current = true;
                return;
            }
            clearSeasonalReturn();
        };
        const handleDocumentClick = (event: MouseEvent) => {
            const target = event.target;
            const anchor = target instanceof Element
                ? target.closest<HTMLAnchorElement>("a[href]")
                : null;
            if (!anchor) {
                return;
            }
            const destination = new URL(anchor.href, window.location.href);
            if (destination.origin !== window.location.origin ||
                !isChronicleReturnPath(destination.pathname)) {
                clearSeasonalReturn();
            }
        };
        // Seasonal은 NodeViewer Back에서만 숨겨 둔 동일 인스턴스를 UnHide한다.
        // full-document/BFCache Back에서도 storage를 보존하고, 원래 /story/ history
        // entry의 token 일치 여부는 StorylineMap이 검사한다. 명시적 다른 링크와
        // 비-연대기 history 이탈만 여기서 조기에 폐기한다.
        window.addEventListener("popstate", handlePopState);
        document.addEventListener("click", handleDocumentClick, true);
        return () => {
            window.removeEventListener("popstate", handlePopState);
            document.removeEventListener("click", handleDocumentClick, true);
        };
    }, []);
    const resetStorySessionTransientState = useCallback(() => {
        autoWaitRef.current = { processId: "", durationMs: 0 };
        waitClockRef.current = { processId: "", elapsedMs: 0 };
        dialogueTypingClockRef.current = { stepId: "", elapsedMs: 0 };
        titleTypingClockRef.current = { stepId: "", elapsedMs: 0 };
        subtitleTypingClockRef.current = { stepId: "", elapsedMs: 0 };
        actorCrashClockRef.current = { processId: "", elapsedMs: 0 };
        centerFadeOutClockRef.current = { processId: "", elapsedMs: 0 };
        logVisibilitySnapshotRef.current = { title: false, talk: false };
        setForcedWaitClickProcessId("");
        setIsFastSkipHeld(false);
        setLogRestoredVisibility(null);
        setLogReplayVoiceProcessId("");
        setDialogueTypingProcessId("");
    }, []);
    const acts = useMemo(() => [...new Set(selectedEpisode?.stages.map((stage) => stage.act) ?? [])], [selectedEpisode]);
    const operationBackground = useMemo(() => resolveStoryOperationBackground(selectedEpisode, acts, selectedAct), [acts, selectedAct, selectedEpisode]);
    const operationEntryEpisodeId = selectedEpisode?.id ?? 0;
    const isCounterCaseEpisode = operationEntryEpisodeId === 50;
    const setOperationEntryFadeForEpisode = useCallback((episodeId: number) => {
        if (operationEntryFadeTimerRef.current !== null) {
            window.clearTimeout(operationEntryFadeTimerRef.current);
            operationEntryFadeTimerRef.current = null;
        }
        const shouldFade = episodeId > 0 && episodeId !== 50;
        operationEntryFadeActiveRef.current = shouldFade;
        setIsOperationEntryFadeActive(shouldFade);
        if (!shouldFade) {
            return;
        }
        // STV-MAP-054/STV-MAP-061: Open() starts a blocking .3 FadeIn. Key this
        // to a new NodeViewer episode, not theater mode, so cutscene return does
        // not replay a NodeViewer Open transition that the client never started.
        operationEntryFadeTimerRef.current = window.setTimeout(() => {
            operationEntryFadeActiveRef.current = false;
            setIsOperationEntryFadeActive(false);
            operationEntryFadeTimerRef.current = null;
        }, STORY_OPERATION_ENTRY_FADE_MS);
    }, []);
    const setCounterCaseEntryFadeForEpisode = useCallback((episodeId: number) => {
        if (counterCaseEntryFadeTimerRef.current !== null) {
            window.clearTimeout(counterCaseEntryFadeTimerRef.current);
            counterCaseEntryFadeTimerRef.current = null;
        }
        const shouldFade = episodeId === 50;
        counterCaseEntryFadeActiveRef.current = shouldFade;
        setIsCounterCaseEntryFadeActive(shouldFade);
        if (!shouldFade) {
            return;
        }
        // STV-MAP-013/STV-MAP-062: EpisodeViewerCC.Open starts the same global
        // black .1 FadeIn that makes UIManager ignore Back until it finishes.
        counterCaseEntryFadeTimerRef.current = window.setTimeout(() => {
            counterCaseEntryFadeActiveRef.current = false;
            setIsCounterCaseEntryFadeActive(false);
            counterCaseEntryFadeTimerRef.current = null;
        }, STORY_COUNTERCASE_ENTRY_FADE_MS);
    }, []);
    useEffect(() => () => {
        if (operationEntryFadeTimerRef.current !== null) {
            window.clearTimeout(operationEntryFadeTimerRef.current);
            operationEntryFadeTimerRef.current = null;
        }
        operationEntryFadeActiveRef.current = false;
        if (counterCaseEntryFadeTimerRef.current !== null) {
            window.clearTimeout(counterCaseEntryFadeTimerRef.current);
            counterCaseEntryFadeTimerRef.current = null;
        }
        counterCaseEntryFadeActiveRef.current = false;
    }, []);
    const completeOperationViewerExit = useCallback(() => {
        queueStoryOperationNodeViewerReturnFade();
        preserveThemeOnUnmountRef.current = true;
        if (seasonalReturnEpisodeId > 0) {
            const hasHistoryReturn = preserveStorySeasonalReturnState(seasonalReturnEpisodeId);
            if (hasHistoryReturn && window.history.length > 1) {
                window.history.back();
                return;
            }
        }
        router.push("/story/");
    }, [router, seasonalReturnEpisodeId]);
    const requestOperationViewerBack = useCallback(() => {
        if (mode !== "episode" ||
            !selectedEpisode ||
            isCounterCaseEpisode ||
            operationEntryFadeActiveRef.current ||
            operationExitFadeActiveRef.current) {
            return false;
        }
        if (isEpisodeListOpen) {
            setIsEpisodeListOpen(false);
            return true;
        }
        if (isStageInfoOpen) {
            setIsStageInfoOpen(false);
            setSelectedStageId(0);
            return true;
        }
        operationExitFadeActiveRef.current = true;
        setIsOperationExitFadeActive(true);
        return true;
    }, [
        isCounterCaseEpisode,
        isEpisodeListOpen,
        isStageInfoOpen,
        mode,
        selectedEpisode,
    ]);
    const requestCounterCaseViewerBack = useCallback(() => {
        if (mode !== "episode" ||
            !selectedEpisode ||
            !isCounterCaseEpisode ||
            counterCaseEntryFadeActiveRef.current) {
            return false;
        }
        if (isEpisodeListOpen) {
            setIsEpisodeListOpen(false);
            return true;
        }
        if (selectedCounterCaseAct > 0) {
            snapshotCounterCaseScrollSurface("normal", true);
            setSelectedCounterCaseAct(0);
            return true;
        }
        // STV-MAP-062: the Counter Case root closes directly after clearing its
        // reserved episode. There is no outgoing fade; only the underlying
        // OperationV2's serialized .1 second FadeIn runs after the route handoff.
        queueStoryCounterCaseReturnFade();
        router.push("/story/");
        return true;
    }, [
        isCounterCaseEpisode,
        isEpisodeListOpen,
        mode,
        router,
        selectedCounterCaseAct,
        selectedEpisode,
        snapshotCounterCaseScrollSurface,
    ]);
    useEffect(() => {
        if (!isOperationExitFadeActive) {
            return;
        }
        const timer = window.setTimeout(completeOperationViewerExit, STORY_OPERATION_EXIT_FADE_MS);
        return () => window.clearTimeout(timer);
    }, [completeOperationViewerExit, isOperationExitFadeActive]);
    const isOperationStageRouteHotkeyTopmost = Boolean(selectedEpisode &&
        mode === "episode" &&
        !isCounterCaseEpisode &&
        !isEpisodeListOpen &&
        !isOperationEntryFadeActive &&
        !isOperationExitFadeActive);
    const counterCaseActs = selectedEpisode?.counterCaseActs ?? [];
    const activeCounterCaseAct = counterCaseActs.find((counterCaseAct) => counterCaseAct.act === selectedCounterCaseAct) ?? null;
    const retainedCounterCaseAct = activeCounterCaseAct ??
        counterCaseActs.find((counterCaseAct) => counterCaseAct.act === selectedAct) ??
        null;
    const isCounterCaseScrollHotkeyTopmost = Boolean(selectedEpisode &&
        mode === "episode" &&
        isCounterCaseEpisode &&
        !isEpisodeListOpen);
    useLayoutEffect(() => {
        operationScrollHotkeyContextRef.current = {
            isStageTopmost: isOperationStageRouteHotkeyTopmost,
            // The global fade GraphicRaycaster is above this FullScreen root while
            // the dedicated 0.1-second Counter Case entry transition is active.
            isCounterCaseTopmost: isCounterCaseScrollHotkeyTopmost && !isCounterCaseEntryFadeActive,
            counterCaseTarget: activeCounterCaseAct ? "normal" : "acts",
        };
    }, [
        activeCounterCaseAct,
        isCounterCaseEntryFadeActive,
        isCounterCaseScrollHotkeyTopmost,
        isOperationStageRouteHotkeyTopmost,
    ]);
    const actStages = useMemo(() => selectedEpisode?.stages.filter((stage) => stage.act === selectedAct) ?? [], [selectedAct, selectedEpisode]);
    const plottedStages = useMemo(() => actStages.flatMap((stage) => stage.layout ? [{ stage, layout: stage.layout }] : []), [actStages]);
    const isEventClb002HandEpisode = isStoryEventClb002HandEpisode(selectedEpisode);
    const isEventClb002RootVerticalLayout = isEventClb002HandEpisode &&
        selectedAct >= 1 &&
        selectedAct <= 3;
    const activeStageMap = useMemo<StoryStageMap>(() => {
        const source = selectedEpisode?.stageMaps?.[String(selectedAct)];
        const height = source?.height && source.height > 0 ? source.height : 1080;
        if (source?.width && source.width > 0) {
            return { ...source, width: source.width, height };
        }
        // 일부 활성 ACT 프리팹은 RectTransform이 가로 스트레치라 sizeDelta.x가 0이다.
        // 같은 프리팹들의 실제 여백값(마지막 노드 뒤 약 940px)을 사용해 콘텐츠 폭을 복원한다.
        const visualRight = plottedStages.reduce((right, { layout }) => Math.max(right, layout.x + layout.visualWidth / 2), 0);
        const inferredWidth = Math.ceil((visualRight + 940) / 10) * 10;
        return {
            width: Math.max(1920, inferredWidth),
            height,
        };
    }, [plottedStages, selectedAct, selectedEpisode]);
    const selectedStage = useMemo(() => selectedEpisode?.stages.find((stage) => stage.id === selectedStageId), [selectedEpisode, selectedStageId]);
    const currentCommand = scene?.commands[commandIndex] ?? null;
    // CloseInternal은 컷신 플레이어와 CharacterView를 장면마다 완전히 내린다.
    // 동일 장면을 다시 열어도 이전 Canvas의 MOVE 재생시간을 참조하지 않도록
    // Spine 공유 키 역시 재생 세션 단위로 분리한다.
    const spinePlaybackSessionId = `${scene?.id ?? "unloaded"}:${theaterSessionRevision}`;
    const backgroundEffectProcessId = `${spinePlaybackSessionId}:background-effect:${visualState.backgroundEffectRevision}`;
    const previousBackgroundEffectProcessId = `${spinePlaybackSessionId}:previous-background-effect:${visualState.previousBackgroundEffectRevision}`;
    // NKCUICutScenPlayer는 m_MovieName만으로 영상 명령을 판정하고, 리소스가
    // 없으면 VideoPlayMessageCallback의 실패 경로로 다음 컷을 적용한다.
    const isMovieCommand = Boolean(currentCommand?.movieName);
    const currentProcessId = scene && currentCommand ? `${scene.id}:${commandIndex}` : "";
    const effectiveWaitClick = Boolean(currentCommand?.waitClick ||
        (currentProcessId && forcedWaitClickProcessId === currentProcessId));
    const currentCommandSkipsBody = currentCommand
        ? skipsStoryCommandBody(currentCommand)
        : false;
    const currentVoicePath = currentCommandSkipsBody
        ? ""
        : currentCommand?.voicePath ?? "";
    const currentVoiceProcessId = scene && currentVoicePath
        ? `${scene.id}:${commandIndex}:${currentVoicePath}`
        : "";
    // 로그 음성 재생도 PlayVoice를 통해 m_VoiceUID를 교체한다. 따라서 현재
    // 명령에 원래 음성이 없어도 AUTO의 IsCutFinished는 재생 종료를 기다린다.
    const blockingVoicePath = logReplayVoiceProcessId || currentVoicePath;
    const blockingVoiceProcessId = logReplayVoiceProcessId || currentVoiceProcessId;
    const voicePlaybackEnded = !blockingVoiceProcessId ||
        endedVoiceProcessId === blockingVoiceProcessId;
    const restoredLogVisibility = logRestoredVisibility?.commandIndex === commandIndex
        ? logRestoredVisibility
        : null;
    // LOG를 연 동안 현재 명령이 무대의 마지막 유닛을 닫으면 TalkBox.Close는
    // GameObject만 끄고 글자와 화자명은 보존한다. LOG 닫기 콜백이 이전의
    // 활성값 true를 현재 매니저에 적용하면 그 숨은 내용도 다시 보여야 한다.
    const restoredClosedTalkActive = Boolean(!visualState.dialogueBoxOpen && restoredLogVisibility?.talk);
    const effectiveDialogueBoxOpen = visualState.dialogueBoxOpen || restoredClosedTalkActive;
    const currentSpeaker = visualState.speakerId
        ? characters[visualState.speakerId]
        : null;
    const visibleDialogueLength = getVisibleTextLength(visualState.dialogueText);
    const centerTypingBlocked = visualState.dialogueCentered &&
        visualState.dialogueFadeIn &&
        Number(currentCommand?.talkTime ?? 0) > 0 &&
        centerFadeReadyProcessId !== currentProcessId &&
        finishedVisualProcessId !== currentProcessId;
    const isTyping = dialogueTypingProcessId === currentProcessId;
    const dialogueNextActive = visualState.dialogueBoxType === "center"
        ? visualState.dialogueNextCenterActive
        : visualState.dialogueNextNormalActive;
    const showNextIndicator = shouldShowStoryNextIndicator(effectiveDialogueBoxOpen, dialogueNextActive, isTyping);
    const nextIndicatorVariant = getStoryNextIndicatorVariant(visualState.dialogueBoxType);
    const titleTypewriterManuallyFinished = finishedTitleTypingProcessId === currentProcessId;
    const isTitleTyping = isStoryTitleTypewriterRunning({
        titleCharacters: displayedTitleCharacters,
        subtitleCharacters: displayedSubtitleCharacters,
    }, getVisibleTextLength(visualState.titleText), getVisibleTextLength(visualState.subtitleText), titleTypewriterManuallyFinished);
    const controlVisibility = getStoryControlVisibility(currentCommand, isUiHidden, isLogOpen);
    const storyTextVisible = getStoryTextVisibility(isUiHidden, isLogOpen);
    const hasStoryTitle = Boolean(closingTitle || visualState.titleText || visualState.subtitleText);
    const hasStoryTalk = Boolean(effectiveDialogueBoxOpen || sceneError);
    const storyTitleEnabled = hasStoryTitle && (restoredLogVisibility?.title ?? true);
    const storyTalkEnabled = hasStoryTalk && (restoredLogVisibility?.talk ?? true);
    const storyTitleVisible = storyTextVisible && storyTitleEnabled;
    const storyTalkVisible = storyTextVisible && storyTalkEnabled;
    const closeStoryCutsceneHotkeyDisplay = useCallback(() => {
        cutsceneHotkeySnapshotRef.current = null;
        setCutsceneHotkeyDisplay(null);
    }, []);
    useEffect(() => {
        // STV-RDR-005: ShowHotkey is a fresh LeftAlt edge. The common
        // NKCUIComHotkeyDisplay object snapshots its target center when created,
        // then only watches the held key/editable state until it is returned.
        const isEditableTarget = (target: EventTarget | null) => target instanceof HTMLElement &&
            (target.isContentEditable ||
                target.matches("input, select, textarea, [role='textbox']"));
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.code !== "AltLeft" || event.repeat) {
                return;
            }
            if (cutsceneHotkeyAltHeldRef.current) {
                return;
            }
            cutsceneHotkeyAltHeldRef.current = true;
            if (mode !== "theater" ||
                cutsceneHotkeySnapshotRef.current ||
                event.shiftKey ||
                event.ctrlKey ||
                event.metaKey ||
                isEditableTarget(event.target) ||
                isEditableTarget(document.activeElement)) {
                return;
            }
            let surface: StoryCutsceneHotkeyDisplaySurface | null = null;
            let targetElement: HTMLElement | null = null;
            if (isSkipOpen && isMovieCommand) {
                surface = "movie-skip-confirm";
                targetElement = movieSkipConfirmButtonRef.current;
            }
            else if (isLogOpen) {
                surface = "log-scroll";
                targetElement = logListRef.current;
            }
            else if (audioUnlocked &&
                scene &&
                currentCommand &&
                controlVisibility.log) {
                // The button's functional Up hotkey is raycast-gated (RDR-001), but
                // NKCUIComButton's ShowHotkey branch is not. Do not spread the
                // Fade/FlashBang click counterexample into this display-only path.
                surface = "player-log";
                targetElement = cutsceneLogButtonRef.current;
            }
            if (!surface ||
                !targetElement ||
                targetElement.getClientRects().length === 0) {
                return;
            }
            const targetRect = targetElement.getBoundingClientRect();
            const theaterRect = theaterRef.current?.getBoundingClientRect();
            if (targetRect.width <= 0 ||
                targetRect.height <= 0 ||
                !theaterRect ||
                theaterRect.width <= 0 ||
                theaterRect.height <= 0) {
                return;
            }
            const rawScale = Math.min(theaterRect.width / 1920, theaterRect.height / 1080);
            if (!Number.isFinite(rawScale) || rawScale <= 0) {
                return;
            }
            const descriptor = STORY_CUTSCENE_HOTKEY_DISPLAY_TARGETS[surface];
            const generation = cutsceneHotkeyGenerationRef.current + 1;
            const snapshot: StoryCutsceneHotkeyDisplaySnapshot = {
                generation,
                surface,
                text: descriptor.text,
                targetPath: descriptor.path,
                left: targetRect.left + targetRect.width / 2,
                top: targetRect.top + targetRect.height / 2,
                scale: rawScale,
            };
            cutsceneHotkeyGenerationRef.current = generation;
            cutsceneHotkeyTargetElementRef.current = targetElement;
            cutsceneHotkeySnapshotRef.current = snapshot;
            setCutsceneHotkeyDisplay(snapshot);
            targetElement.dataset.storyCutsceneHotkeyLastGeneration =
                String(generation);
            targetElement.dataset.storyCutsceneHotkeyLastSurface = surface;
            targetElement.dataset.storyCutsceneHotkeyLastText = descriptor.text;
            targetElement.dataset.storyCutsceneHotkeyLastTargetPath = descriptor.path;
            targetElement.dataset.storyCutsceneHotkeyLastTargetRect = [
                targetRect.left,
                targetRect.top,
                targetRect.width,
                targetRect.height,
            ]
                .map((value) => value.toFixed(3))
                .join(",");
            targetElement.dataset.storyCutsceneHotkeyLastScale = rawScale.toFixed(6);
            targetElement.dataset.storyCutsceneHotkeyLastRendered = "false";
            delete targetElement.dataset.storyCutsceneHotkeyLastRect;
            delete targetElement.dataset.storyCutsceneHotkeyLastCenterOffset;
        };
        const handleKeyUp = (event: KeyboardEvent) => {
            if (event.code !== "AltLeft") {
                return;
            }
            cutsceneHotkeyAltHeldRef.current = false;
            if (cutsceneHotkeySnapshotRef.current) {
                closeStoryCutsceneHotkeyDisplay();
            }
        };
        const handleBlur = () => {
            cutsceneHotkeyAltHeldRef.current = false;
            if (cutsceneHotkeySnapshotRef.current) {
                closeStoryCutsceneHotkeyDisplay();
            }
        };
        const handleFocusIn = (event: FocusEvent) => {
            if (cutsceneHotkeySnapshotRef.current &&
                isEditableTarget(event.target)) {
                closeStoryCutsceneHotkeyDisplay();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp, true);
        window.addEventListener("blur", handleBlur);
        window.addEventListener("focusin", handleFocusIn, true);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp, true);
            window.removeEventListener("blur", handleBlur);
            window.removeEventListener("focusin", handleFocusIn, true);
        };
    }, [
        audioUnlocked,
        closeStoryCutsceneHotkeyDisplay,
        controlVisibility.log,
        currentCommand,
        isLogOpen,
        isMovieCommand,
        isSkipOpen,
        mode,
        scene,
    ]);
    useLayoutEffect(() => {
        if (!cutsceneHotkeyDisplay) {
            return;
        }
        const target = cutsceneHotkeyTargetElementRef.current;
        const display = document.querySelector<HTMLElement>('[data-story-hotkey-display="STV-RDR-005"]');
        if (!target || !display) {
            return;
        }
        const targetRect = target.getBoundingClientRect();
        const displayRect = display.getBoundingClientRect();
        target.dataset.storyCutsceneHotkeyLastRendered = "true";
        target.dataset.storyCutsceneHotkeyLastRect = [
            displayRect.left,
            displayRect.top,
            displayRect.width,
            displayRect.height,
        ]
            .map((value) => value.toFixed(3))
            .join(",");
        target.dataset.storyCutsceneHotkeyLastCenterOffset = [
            displayRect.left + displayRect.width / 2 -
                (targetRect.left + targetRect.width / 2),
            displayRect.top + displayRect.height / 2 -
                (targetRect.top + targetRect.height / 2),
        ]
            .map((value) => value.toFixed(3))
            .join(",");
    }, [cutsceneHotkeyDisplay]);
    useEffect(() => {
        // 클라이언트는 장면을 닫아도 두 대사 매니저의 m_goTalkNext 자식,
        // m_goalTalk 누적 문자열, JapanNeeds m_bTempFlag를 초기화하지 않는다.
        // 타자 출력 중에는 Open이 실제 자식을 꺼 둔 상태이므로 최종 waitClick이
        // 아닌 화면 상태를 기억한다.
        dialogueNextMemoryRef.current = getStoryDialogueNextMemory(visualState, isTyping);
    }, [isTyping, visualState]);
    const updateLoopFxDiagnostics = useCallback(() => {
        const theater = theaterRef.current;
        if (!theater) {
            return;
        }
        theater.dataset.loopFxInstanceCount = String([...loopFxRef.current.values()].reduce((total, instances) => total + instances.size, 0));
        theater.dataset.loopFxNames = [...loopFxRef.current.entries()]
            .map(([name, instances]) => `${name}:${instances.size}`)
            .join(",");
    }, []);
    const stopLoopEffects = useCallback(() => {
        for (const instances of loopFxRef.current.values()) {
            for (const audio of instances) {
                audio.pause();
            }
        }
        loopFxRef.current.clear();
        reservedFxRef.current = null;
        updateLoopFxDiagnostics();
    }, [updateLoopFxDiagnostics]);
    const playFxEvent = useCallback((event: StoryFxEvent | null) => {
        if (!event) {
            return;
        }
        if (event.action === "stop") {
            for (const audio of takeStoryLoopFxInstances(loopFxRef.current, event.name)) {
                audio.pause();
            }
            updateLoopFxDiagnostics();
            return;
        }
        if (!event.path) {
            return;
        }
        if (event.loop) {
            const audio = createStoryAudio(getSoundUrl(event.path));
            audio.loop = true;
            // STV-AUD-001: command local volume 1과 client effect group 0.6을 분리한다.
            audio.volume = getStoryClientAudioVolume("sfx");
            addStoryLoopFxInstance(loopFxRef.current, event.name, audio);
            updateLoopFxDiagnostics();
            void audio.play().catch(() => {
                const instances = loopFxRef.current.get(event.name);
                instances?.delete(audio);
                if (instances?.size === 0) {
                    loopFxRef.current.delete(event.name);
                }
                updateLoopFxDiagnostics();
            });
            return;
        }
        const audio = createStoryAudio(getSoundUrl(event.path));
        audio.volume = getStoryClientAudioVolume("sfx");
        transientFxRef.current.add(audio);
        setActiveTransientFxCount(transientFxRef.current.size);
        const removeTransientFx = () => {
            transientFxRef.current.delete(audio);
            setActiveTransientFxCount(transientFxRef.current.size);
        };
        audio.addEventListener("ended", removeTransientFx, { once: true });
        void audio.play().catch(removeTransientFx);
    }, [updateLoopFxDiagnostics]);
    const playReservedSoundAndMusic = useCallback(() => {
        playFxEvent(reservedFxRef.current);
        reservedFxRef.current = null;
        const previous = visualStateRef.current;
        const next = applyStoryReservedMusic(previous);
        if (next !== previous) {
            visualStateRef.current = next;
            setVisualState(next);
        }
    }, [playFxEvent]);
    const playTitleTypingSound = useCallback(() => {
        playFxEvent({
            name: "TYPING",
            path: STORY_TITLE_TYPING_SOUND_PATH,
            action: "play",
            loop: false,
        });
    }, [playFxEvent]);
    const playBgm = useCallback((path: string, volume = 1, startTime?: number, restart = false) => {
        if (!path) {
            ownsThemeAudioRef.current = false;
            stopStoryTheme();
            return;
        }
        const url = getSoundUrl(path);
        // STV-CHR-018: entering NodeViewer with the popup theme already playing
        // reuses that global SoundManager track. The viewer must not claim and
        // stop an inherited instance when it closes back to the chronicle map.
        if (!hasActiveStoryTheme(url) || restart) {
            ownsThemeAudioRef.current = true;
        }
        playStoryTheme(url, volume, startTime, restart);
    }, []);
    const stopTrackedVoice = useCallback(() => {
        const trackedVoice = voiceRef.current;
        if (!trackedVoice) {
            return;
        }
        trackedVoice.pause();
        activeVoicesRef.current.delete(trackedVoice);
        voiceRef.current = null;
        setActiveVoiceCount(activeVoicesRef.current.size);
    }, []);
    const playVoice = useCallback((path: string, processId = "", stopCurrentVoice = false) => {
        if (!path) {
            return;
        }
        if (stopCurrentVoice) {
            stopTrackedVoice();
        }
        const audio = createStoryAudio(getSoundUrl(path));
        audio.volume = 1;
        activeVoicesRef.current.add(audio);
        voiceRef.current = audio;
        setActiveVoiceCount(activeVoicesRef.current.size);
        let finished = false;
        const finish = () => {
            if (finished) {
                return;
            }
            finished = true;
            activeVoicesRef.current.delete(audio);
            setActiveVoiceCount(activeVoicesRef.current.size);
            if (voiceRef.current === audio && processId) {
                setEndedVoiceProcessId(processId);
            }
        };
        audio.addEventListener("ended", finish, { once: true });
        audio.addEventListener("error", finish, { once: true });
        void audio.play().catch(finish);
    }, [stopTrackedVoice]);
    const stopAllVoices = useCallback(() => {
        for (const audio of activeVoicesRef.current) {
            audio.pause();
        }
        activeVoicesRef.current.clear();
        voiceRef.current = null;
        startedVoiceProcessIdRef.current = "";
        setActiveVoiceCount(0);
    }, []);
    const unlockAudio = useCallback(() => {
        setAudioUnlocked(true);
        const bgmPath = mode === "theater"
            ? visualState.bgmPath
            : episodePlaybackBgmPath ?? selectedEpisode?.bgmPath;
        if (bgmPath) {
            playBgm(bgmPath, visualState.bgmVolume);
        }
        if (mode === "theater" && currentVoicePath && currentVoiceProcessId) {
            startedVoiceProcessIdRef.current = currentVoiceProcessId;
            setEndedVoiceProcessId("");
            playVoice(currentVoicePath, currentVoiceProcessId);
        }
    }, [
        currentVoicePath,
        currentVoiceProcessId,
        episodePlaybackBgmPath,
        mode,
        playBgm,
        playVoice,
        selectedEpisode,
        visualState.bgmPath,
        visualState.bgmVolume,
    ]);
    const chooseScene = useCallback((summary: StorySceneSummary) => {
        // Play()는 캐시된 토글 상태가 아니라 매 장면 시작 시점의
        // NKM_LOCAL_SAVE_CUTSCEN_AUTO PlayerPrefs 값을 다시 읽는다.
        const sceneAutoPreference = readStoryAutoPreference();
        setSelectedScene(summary);
        setScene(null);
        setSceneAudioPreloadReport({ failed: 0, total: 0 });
        setTheaterSessionRevision((revision) => revision + 1);
        stopAllVoices();
        resetStorySessionTransientState();
        setSceneError("");
        setCommandIndex(0);
        processedCommandRef.current = "";
        commandStartedAtRef.current = 0;
        commandWallStartedAtRef.current = 0;
        popupPausedAtRef.current = 0;
        appliedBgmRevisionRef.current = 0;
        const initialState = {
            ...createInitialStoryVisualState(dialogueNextMemoryRef.current, backgroundManagerMemoryRef.current),
            bgmName: selectedEpisode?.bgmName ?? "",
            bgmPath: episodePlaybackBgmPath ??
                selectedEpisode?.bgmPath ??
                "",
        };
        visualStateRef.current = initialState;
        setVisualState(initialState);
        setChoices([]);
        setStoryLog([]);
        setDisplayedCharacters(0);
        setDisplayedTitleCharacters(0);
        setDisplayedSubtitleCharacters(0);
        setFinishedTitleTypingProcessId("");
        setEndedVoiceProcessId("");
        setFinishedVisualProcessId("");
        setCenterFadeReadyProcessId("");
        setCenterFadeOutProcessId("");
        setPreparedMovieProcessId("");
        setStoppedActorCrashProcessId("");
        setStoppedActorBounceProcessId("");
        setFinishedActorProcessId("");
        setClosingTitle(null);
        setIsLogOpen(false);
        setIsSkipOpen(false);
        setIsUiHidden(false);
        // 원본 Play()는 매 장면 시작에 PlayerPrefs 값을 읽고, 키가 없으면
        // false를 저장한다. 이전 웹 키에서 읽은 값도 여기서 원본 키로 옮긴다.
        writeStoryAutoPreference(sceneAutoPreference);
        setIsAuto(sceneAutoPreference);
    }, [
        episodePlaybackBgmPath,
        resetStorySessionTransientState,
        selectedEpisode,
        stopAllVoices,
    ]);
    const loadCharacters = useCallback(() => {
        if (!manifest) {
            return Promise.reject(new Error("스토리 인덱스가 준비되지 않았습니다."));
        }
        if (charactersPromiseRef.current) {
            return charactersPromiseRef.current;
        }
        const request = fetch(deploymentUrl("/story/reader/data/characters.json"), {
            cache: process.env.NODE_ENV === "development" ? "no-store" : "force-cache",
        })
            .then((response) => {
            if (!response.ok) {
                throw new Error(`캐릭터 목록 요청 실패: HTTP ${response.status}`);
            }
            return response.json() as Promise<StoryCharactersPayload>;
        })
            .then((data) => {
            if (data.version !== manifest.version ||
                data.generatedAt !== manifest.generatedAt) {
                throw new Error("스토리 캐릭터 데이터 버전이 일치하지 않습니다.");
            }
            setCharacters(data.characters);
            return data.characters;
        })
            .catch((error: unknown) => {
            charactersPromiseRef.current = null;
            throw error;
        });
        charactersPromiseRef.current = request;
        return request;
    }, [manifest]);
    useEffect(() => {
        const controller = new AbortController();
        // 원본 컷신 번들처럼 장면을 고르기 전부터 MainFont 준비를 시작한다.
        // 장면 로더에서도 같은 Promise를 기다려 최초 theater 프레임을 보장한다.
        void preloadStoryFont();
        void fetch(deploymentUrl("/story/reader/data/index.json"), {
            cache: process.env.NODE_ENV === "development" ? "no-store" : "force-cache",
            signal: controller.signal,
        })
            .then((response) => {
            if (!response.ok) {
                throw new Error(`스토리 목록 요청 실패: HTTP ${response.status}`);
            }
            return response.json() as Promise<StoryIndex>;
        })
            .then((data) => {
            const searchParameters = new URLSearchParams(window.location.search);
            const requestedEpisode = Number(searchParameters.get("episode") ?? 0);
            const requestedSeasonalReturn = Number(searchParameters.get("seasonal") ?? 0);
            setSeasonalReturnEpisodeId(searchParameters.get("source") === "seasonal" &&
                requestedSeasonalReturn === requestedEpisode
                ? requestedSeasonalReturn
                : 0);
            const episode = data.episodes.find((candidate) => candidate.id === requestedEpisode) ??
                data.episodes[0];
            if (!episode) {
                throw new Error("표시할 스토리 에피소드가 없습니다.");
            }
            episodeCacheRef.current.clear();
            charactersPromiseRef.current = null;
            setCharacters({});
            setManifest(data);
            setSelectedEpisodeId(episode?.id ?? 0);
        })
            .catch((error: unknown) => {
            if (!(error instanceof DOMException && error.name === "AbortError")) {
                setManifestError(error instanceof Error ? error.message : "스토리 목록을 읽지 못했습니다.");
            }
        });
        return () => controller.abort();
    }, []);
    useEffect(() => {
        if (!manifest) {
            return;
        }
        [
            manifest.ui.cog,
            manifest.ui.NKM_UI_WAIT_arrow,
            manifest.ui.NKM_UI_WAIT_box,
            manifest.ui.NKM_UI_WAIT_ring,
        ].forEach((asset) => {
            if (asset) {
                getStoryFxmImage(asset);
            }
        });
    }, [manifest]);
    useEffect(() => {
        if (!manifest || selectedEpisodeId <= 0) {
            return;
        }
        const controller = new AbortController();
        const applyEpisode = (episode: StoryEpisode) => {
            const firstStage = episode.stages[0];
            setOperationEntryFadeForEpisode(episode.id);
            setCounterCaseEntryFadeForEpisode(episode.id);
            setEpisodePlaybackBgmPath(null);
            setSelectedEpisode(episode);
            setSelectedAct(firstStage?.act ?? 0);
            setSelectedCounterCaseAct(0);
            setSelectedStageId(0);
            if (episode.bgmPath &&
                hasActiveStoryTheme(getSoundUrl(episode.bgmPath))) {
                setAudioUnlocked(true);
            }
        };
        const loadEpisode = async () => {
            await Promise.resolve();
            const summary = manifest.episodes.find((episode) => episode.id === selectedEpisodeId);
            if (!summary) {
                throw new Error("선택한 에피소드 정보를 찾을 수 없습니다.");
            }
            setEpisodeError("");
            const cachedEpisode = episodeCacheRef.current.get(selectedEpisodeId);
            if (cachedEpisode) {
                applyEpisode(cachedEpisode);
                return;
            }
            setOperationEntryFadeForEpisode(0);
            setCounterCaseEntryFadeForEpisode(0);
            setSelectedEpisode(null);
            const response = await fetch(deploymentUrl(summary.dataUrl), {
                cache: process.env.NODE_ENV === "development" ? "no-store" : "force-cache",
                signal: controller.signal,
            });
            if (!response.ok) {
                throw new Error(`에피소드 요청 실패: HTTP ${response.status}`);
            }
            const data = (await response.json()) as StoryEpisodePayload;
            if (data.version !== manifest.version ||
                data.generatedAt !== manifest.generatedAt ||
                data.episode.id !== selectedEpisodeId) {
                throw new Error("스토리 에피소드 데이터 버전이 일치하지 않습니다.");
            }
            episodeCacheRef.current.set(selectedEpisodeId, data.episode);
            applyEpisode(data.episode);
        };
        void loadEpisode()
            .catch((error: unknown) => {
            if (!(error instanceof DOMException && error.name === "AbortError")) {
                setEpisodeError(error instanceof Error
                    ? error.message
                    : "에피소드 정보를 읽지 못했습니다.");
            }
        });
        return () => controller.abort();
    }, [
        manifest,
        selectedEpisodeId,
        setCounterCaseEntryFadeForEpisode,
        setOperationEntryFadeForEpisode,
    ]);
    useEffect(() => {
        if (!selectedScene) {
            return;
        }
        const controller = new AbortController();
        void fetch(deploymentUrl(selectedScene.url), {
            cache: process.env.NODE_ENV === "development" ? "no-store" : "force-cache",
            signal: controller.signal,
        })
            .then((response) => {
            if (!response.ok) {
                throw new Error(`컷신 요청 실패: HTTP ${response.status}`);
            }
            return response.json() as Promise<StoryScene>;
        })
            .then(async (data) => {
            const loadedCharacters = await loadCharacters();
            const [, , audioPreloadReport] = await Promise.all([
                preloadStoryFont(),
                preloadStorySceneImages(data),
                preloadStorySceneAudio(data),
                preloadStoryTimedWaveSpines(data),
                preloadStorySceneCharacterSpines(data, loadedCharacters),
            ]);
            if (controller.signal.aborted) {
                return;
            }
            setSceneAudioPreloadReport(audioPreloadReport);
            setScene(data);
            setCommandIndex(0);
            processedCommandRef.current = "";
            commandStartedAtRef.current = 0;
            commandWallStartedAtRef.current = 0;
            popupPausedAtRef.current = 0;
            centerFadeOutClockRef.current = { processId: "", elapsedMs: 0 };
            const initialState = {
                ...createInitialStoryVisualState(dialogueNextMemoryRef.current, backgroundManagerMemoryRef.current),
                bgmName: selectedEpisode?.bgmName ?? "",
                bgmPath: episodePlaybackBgmPath ??
                    selectedEpisode?.bgmPath ??
                    "",
            };
            appliedBgmRevisionRef.current = 0;
            visualStateRef.current = initialState;
            setVisualState(initialState);
            setChoices([]);
            setStoryLog([]);
            setDisplayedCharacters(0);
            setDisplayedTitleCharacters(0);
            setDisplayedSubtitleCharacters(0);
            setFinishedTitleTypingProcessId("");
            setEndedVoiceProcessId("");
            setFinishedVisualProcessId("");
            setCenterFadeReadyProcessId("");
            setCenterFadeOutProcessId("");
            setPreparedMovieProcessId("");
            setStoppedActorCrashProcessId("");
            setStoppedActorBounceProcessId("");
            setFinishedActorProcessId("");
            setClosingTitle(null);
            if (isCounterCaseEpisode && selectedCounterCaseAct > 0) {
                snapshotCounterCaseScrollSurface("normal", true);
            }
            setMode("theater");
        })
            .catch((error: unknown) => {
            if (!(error instanceof DOMException && error.name === "AbortError")) {
                setSelectedScene(null);
                setSceneError(error instanceof Error ? error.message : "컷신을 읽지 못했습니다.");
            }
        });
        return () => controller.abort();
    }, [
        episodePlaybackBgmPath,
        isCounterCaseEpisode,
        loadCharacters,
        selectedCounterCaseAct,
        selectedEpisode?.bgmName,
        selectedEpisode?.bgmPath,
        selectedScene,
        snapshotCounterCaseScrollSurface,
    ]);
    const leaveTheater = useCallback((naturalEndFx: StoryFxEvent | null = null) => {
        const closingVisualState = visualStateRef.current;
        backgroundManagerMemoryRef.current = {
            retainedImageBackgroundName: closingVisualState.retainedImageBackgroundName,
            retainedImageBackgroundUrl: closingVisualState.retainedImageBackgroundUrl,
            backgroundFadeOutTint: closingVisualState.backgroundFadeOutTint,
            backgroundFadeOutTimeMs: closingVisualState.backgroundFadeOutTimeMs,
            backgroundFadeOutEase: closingVisualState.backgroundFadeOutEase,
        };
        if (scene) {
            const finalBgmPath = getLastStoryMusicPath(scene.commands, commandIndex, visualStateRef.current.pendingBgmPath);
            setEpisodePlaybackBgmPath(finalBgmPath || visualStateRef.current.bgmPath);
            if (finalBgmPath) {
                playBgm(finalBgmPath, 1);
            }
        }
        stopAllVoices();
        movieRef.current?.pause();
        stopLoopEffects();
        resetStorySessionTransientState();
        playFxEvent(naturalEndFx);
        setLastNaturalEndFxName(naturalEndFx?.name ?? "");
        setMode("episode");
        setScene(null);
        setSelectedScene(null);
        setCommandIndex(0);
        processedCommandRef.current = "";
        commandStartedAtRef.current = 0;
        commandWallStartedAtRef.current = 0;
        popupPausedAtRef.current = 0;
        const initialState = createInitialStoryVisualState(dialogueNextMemoryRef.current);
        visualStateRef.current = initialState;
        setVisualState(initialState);
        setChoices([]);
        setStoryLog([]);
        setDisplayedCharacters(0);
        setDisplayedTitleCharacters(0);
        setDisplayedSubtitleCharacters(0);
        setFinishedTitleTypingProcessId("");
        setEndedVoiceProcessId("");
        setFinishedVisualProcessId("");
        setCenterFadeReadyProcessId("");
        setCenterFadeOutProcessId("");
        setPreparedMovieProcessId("");
        setStoppedActorCrashProcessId("");
        setStoppedActorBounceProcessId("");
        setFinishedActorProcessId("");
        setClosingTitle(null);
        appliedBgmRevisionRef.current = 0;
        setIsAuto(false);
        setIsLogOpen(false);
        setIsSkipOpen(false);
        setIsUiHidden(false);
    }, [
        commandIndex,
        playBgm,
        playFxEvent,
        resetStorySessionTransientState,
        scene,
        stopLoopEffects,
        stopAllVoices,
    ]);
    const cancelMovieSkip = useCallback(() => {
        setIsSkipOpen(false);
    }, []);
    const confirmMovieSkip = useCallback(() => {
        leaveTheater();
    }, [leaveTheater]);
    const goToCommand = useCallback((nextIndex: number) => {
        if (!scene) {
            return;
        }
        if (nextIndex >= scene.commands.length) {
            leaveTheater(getStoryNaturalEndTransientFx(reservedFxRef.current));
            return;
        }
        setCommandIndex(Math.max(nextIndex, 0));
    }, [leaveTheater, scene]);
    const goNext = useCallback((forceWaitClick = false) => {
        if (!scene || !currentCommand) {
            return;
        }
        if (forceWaitClick) {
            // 클라이언트의 Ctrl Skip 핫키는 현재 컷 상태의 m_bWaitClick을
            // true로 바꾼 뒤 일반 화면 클릭 경로를 호출한다.
            setForcedWaitClickProcessId(currentProcessId);
        }
        if (isUiHidden) {
            setIsUiHidden(false);
            return;
        }
        if (choices.length) {
            return;
        }
        const movieClickAction = getStoryMovieSurfaceClickAction(currentCommand, Boolean(currentCommand.movieName && !movieRef.current?.ended), forceWaitClick || forcedWaitClickProcessId === currentProcessId);
        if (centerFadeOutProcessId === currentProcessId) {
            return;
        }
        const cutFinished = finishedVisualProcessId === currentProcessId &&
            !isTyping &&
            !isTitleTyping;
        const clickAction = movieClickAction === "finish"
            ? movieClickAction
            : movieClickAction === "advance"
                ? currentCommand.talkText ||
                    currentCommand.titleText ||
                    currentCommand.subtitleText
                    ? "ignore"
                    : "finish-and-advance"
                : getStoryClickAction(currentCommand, cutFinished, forceWaitClick || forcedWaitClickProcessId === currentProcessId);
        if (clickAction === "ignore") {
            return;
        }
        if (clickAction === "finish" || clickAction === "finish-and-advance") {
            const fadeOpacity = fadeLayerRef.current
                ? Number(window.getComputedStyle(fadeLayerRef.current).opacity)
                : undefined;
            for (const animation of theaterRef.current?.getAnimations({
                subtree: true,
            }) ?? []) {
                const target = animation.effect instanceof KeyframeEffect
                    ? animation.effect.target
                    : null;
                if (target instanceof Element) {
                    if (target.hasAttribute("data-story-preserve-on-player-click")) {
                        continue;
                    }
                    const passiveAnimation = target.hasAttribute("data-story-passive-animation");
                    const finishesOnPlayerClick = target.hasAttribute("data-story-finish-on-player-click");
                    if (passiveAnimation && !finishesOnPlayerClick) {
                        continue;
                    }
                    const backgroundGraphic = target.closest('[data-story-background-graphic="true"]');
                    if ((backgroundGraphic && target !== backgroundGraphic) ||
                        target.closest('[data-story-game-object-overlay-effects="true"]')) {
                        // BGMgr.Finish는 배경 색/알파 Tween과 Transform 추적만 끝낸다.
                        // GameObject 자식의 Animator·FXM·Particle 재생은 건드리지 않는다.
                        continue;
                    }
                }
                try {
                    animation.finish();
                }
                catch {
                    // Spine 스캔라인처럼 무한 반복하는 장식 애니메이션은 끝낼 수 없다.
                }
            }
            const typewriterKey = visualState.dialogueBoxType === "center" ? "center" : "normal";
            const finishedTypewriter = finishStoryTypewriter(dialogueTypewriterRef.current[typewriterKey]);
            const finishedTitleTypewriter = finishStoryTitleTypewriter({
                titleCharacters: displayedTitleCharacters,
                subtitleCharacters: displayedSubtitleCharacters,
            }, getVisibleTextLength(visualState.titleText), getVisibleTextLength(visualState.subtitleText));
            dialogueTypewriterRef.current[typewriterKey] = finishedTypewriter;
            setDisplayedCharacters(finishedTypewriter.displayedCharacters);
            setDialogueTypingProcessId("");
            setDisplayedTitleCharacters(finishedTitleTypewriter.titleCharacters);
            setDisplayedSubtitleCharacters(finishedTitleTypewriter.subtitleCharacters);
            setFinishedTitleTypingProcessId(currentProcessId);
            setCenterFadeReadyProcessId(currentProcessId);
            setStoppedActorBounceProcessId(currentProcessId);
            const finishedActorState = {
                ...finishStoryCommandVisualState(visualStateRef.current, { fadeOpacity }),
                dialogueText: finishedTypewriter.targetText,
            };
            visualStateRef.current = finishedActorState;
            setVisualState(finishedActorState);
            setFinishedActorProcessId(currentProcessId);
            setFinishedVisualProcessId(currentProcessId);
            if (clickAction === "finish") {
                return;
            }
        }
        if (movieClickAction === "advance") {
            movieRef.current?.pause();
        }
        if (clickAction === "advance" &&
            visualState.dialogueCentered &&
            visualState.dialogueFadeOut &&
            visualState.dialogueFadeTimeMs > 0) {
            centerFadeOutClockRef.current = {
                processId: currentProcessId,
                elapsedMs: 0,
            };
            setDisplayedCharacters(0);
            dialogueTypewriterRef.current.center = {
                ...dialogueTypewriterRef.current.center,
                displayedCharacters: 0,
                targetTextCharacters: 0,
                targetText: "",
            };
            setCenterFadeOutProcessId(currentProcessId);
            return;
        }
        goToCommand(commandIndex + 1);
    }, [
        centerFadeOutProcessId,
        choices.length,
        commandIndex,
        currentCommand,
        currentProcessId,
        finishedVisualProcessId,
        forcedWaitClickProcessId,
        displayedSubtitleCharacters,
        displayedTitleCharacters,
        goToCommand,
        isTyping,
        isTitleTyping,
        isUiHidden,
        scene,
        visualState.subtitleText,
        visualState.dialogueCentered,
        visualState.dialogueFadeOut,
        visualState.dialogueFadeTimeMs,
        visualState.dialogueBoxType,
        visualState.titleText,
    ]);
    const chooseStoryChoice = useCallback((choice: StoryChoice) => {
        if (!scene) {
            return;
        }
        const markIndex = findStoryMarkIndex(scene.commands, choice.actionKey);
        setStoryLog((entries) => [
            ...entries,
            {
                key: scene.commands[choice.commandIndex]?.key ??
                    choice.commandIndex,
                text: formatStorySelectionLog(choice.text),
                voicePath: "",
            },
        ]);
        setChoices([]);
        // JumpToMark가 실패하면 m_NextCutIndex는 SELECT 시작 위치에 그대로
        // 남고 ApplyNextCut이 같은 선택지를 다시 연다.
        goToCommand(markIndex >= 0 ? markIndex : choice.selectionStartIndex);
    }, [goToCommand, scene]);
    const disableStoryAuto = useCallback(() => {
        // NKCUIComToggle.Select(false, false, false)는 OnValueChangedAuto까지
        // 호출하므로 눈 버튼과 LOG 모두 저장된 AUTO 설정도 함께 끈다.
        setIsAuto(false);
        writeStoryAutoPreference(false);
    }, []);
    const openStoryLog = useCallback(() => {
        if (!controlVisibility.log) {
            return;
        }
        // NKCUICutScenLogViewer.OpenUI는 플레이어의 로그를 자체 m_lstData에
        // AddRange해 연 시점의 목록만 표시한다. LOG 뒤에서 자동 진행된 명령은
        // 닫았다가 다시 열기 전까지 현재 뷰어 목록에 추가되지 않는다.
        setStoryLogSnapshot([...storyLog]);
        // 실제 클라이언트는 LOG를 열 때 타이틀/대사 오브젝트의 활성 상태를
        // 저장하고, 닫을 때 현재 컷신 상태가 아니라 그 값을 그대로 복원한다.
        logVisibilitySnapshotRef.current = {
            title: storyTitleVisible,
            talk: storyTalkVisible,
        };
        setLogRestoredVisibility(null);
        disableStoryAuto();
        setIsLogOpen(true);
    }, [
        controlVisibility.log,
        disableStoryAuto,
        storyLog,
        storyTalkVisible,
        storyTitleVisible,
    ]);
    const closeStoryLog = useCallback(() => {
        setIsLogOpen(false);
        setLogRestoredVisibility({
            ...logVisibilitySnapshotRef.current,
            commandIndex,
        });
    }, [commandIndex]);
    const finishFlash = useCallback((revision: number) => {
        if (!visualStateRef.current.flash ||
            visualStateRef.current.flashRevision !== revision) {
            return;
        }
        const next = {
            ...visualStateRef.current,
            flash: false,
            flashTimeMs: 0,
        };
        visualStateRef.current = next;
        setVisualState(next);
    }, []);
    useLayoutEffect(() => {
        if (!isLogOpen) {
            return;
        }
        const logList = logListRef.current;
        if (logList) {
            // NKCUICutScenLogViewer.OpenUI는 마지막 로그 슬롯으로 바로 이동한다.
            logList.scrollTop = logList.scrollHeight;
            logList.dataset.storyCutsceneLogScrollTop =
                logList.scrollTop.toFixed(3);
        }
    }, [isLogOpen]);
    useEffect(() => {
        // STV-RDR-002 + STV-RDR-007: one opened-LOG controller owns Unity's
        // Update (held hotkey) and LoopScrollRect LateUpdate (pointer, wheel,
        // velocity, inertia, and spring). Separate RAF writers would race on the
        // same Content anchored position and rubber offset.
        const pressedCodes = storyLogScrollHotkeyCodesRef.current;
        const scroll = logListRef.current;
        let canvasScale = scroll ? getStoryLogScrollCanvasScale(scroll) : 1;
        let lastFrameTime = performance.now();
        let previousVisualPosition = scroll
            ? scroll.scrollTop - storyLogScrollRubberRef.current
            : 0;
        const isEditableTarget = (target: EventTarget | null) => target instanceof HTMLElement &&
            (target.isContentEditable ||
                target.matches("input, textarea, [role='textbox']"));
        const getDirection = (): -1 | 0 | 1 => {
            if (isEditableTarget(document.activeElement)) {
                return 0;
            }
            // NKCUIComLoopScrollHotkey.Update checks Up before Down.
            if ([...STORY_CUTSCENE_LOG_HOTKEY_CODES].some((code) => pressedCodes.has(code))) {
                return -1;
            }
            if ([...STORY_CUTSCENE_LOG_SCROLL_DOWN_HOTKEY_CODES].some((code) => pressedCodes.has(code))) {
                return 1;
            }
            return 0;
        };
        const setRubber = (rubber: number) => {
            const safeRubber = Number.isFinite(rubber) ? rubber : 0;
            storyLogScrollRubberRef.current = safeRubber;
            if (!scroll) {
                return;
            }
            scroll.style.setProperty("--story-cutscene-log-scroll-rubber-y", `${safeRubber}px`);
            scroll.dataset.storyCutsceneLogScrollRubberY =
                safeRubber.toFixed(3);
        };
        const setVelocity = (velocity: number) => {
            const safeVelocity = Number.isFinite(velocity) ? velocity : 0;
            storyLogScrollVelocityRef.current = safeVelocity;
            if (scroll) {
                scroll.dataset.storyCutsceneLogScrollVelocity =
                    safeVelocity.toFixed(3);
            }
        };
        const updateScrollEvidence = () => {
            if (!scroll) {
                return;
            }
            scroll.dataset.storyCutsceneLogScrollTop =
                scroll.scrollTop.toFixed(3);
            scroll.dataset.storyCutsceneLogScrollMaximum =
                getStoryLogScrollMaximum(scroll).toFixed(3);
            scroll.dataset.storyCutsceneLogScrollComponentDragging =
                storyLogScrollComponentDraggingRef.current ? "true" : "false";
        };
        const applyHotkeyMovePosition = (direction: -1 | 1, deltaTime: number) => {
            if (!scroll) {
                return;
            }
            // LoopScrollRect.MovePosition clears sticky wheel/pointer m_Dragging.
            storyLogScrollComponentDraggingRef.current = false;
            const pointer = storyLogScrollPointerRef.current;
            if (pointer?.dragging) {
                pointer.scrollRectDragging = false;
            }
            const maximumScrollTop = getStoryLogScrollMaximum(scroll);
            const frame = getStoryLogHotkeyScrollFrame(scroll.scrollTop, storyLogScrollRubberRef.current, maximumScrollTop, direction, STORY_CUTSCENE_LOG_SCROLL_HOTKEY_SPEED, canvasScale, deltaTime);
            scroll.scrollTop = frame.scrollTop;
            setRubber(frame.rubber);
            scroll.dataset.storyCutsceneLogScrollHotkeyDirection =
                direction < 0 ? "up" : "down";
        };
        const applyLateUpdate = (unscaledDeltaTime: number, hotkeyDirection: -1 | 0 | 1) => {
            if (!scroll) {
                return;
            }
            let motionOverride = "";
            if (!storyLogScrollComponentDraggingRef.current) {
                if (storyLogScrollRubberRef.current !== 0) {
                    const smoothed = smoothStoryLogScrollRubber(storyLogScrollRubberRef.current, storyLogScrollRubberVelocityRef.current, unscaledDeltaTime, STORY_CUTSCENE_LOG_SCROLL_ELASTICITY);
                    storyLogScrollRubberVelocityRef.current = smoothed.velocity;
                    setVelocity(-smoothed.velocity);
                    setRubber(smoothed.value);
                    if (Math.abs(smoothed.value) <= 0.05 &&
                        Math.abs(smoothed.velocity) <= canvasScale) {
                        storyLogScrollRubberVelocityRef.current = 0;
                        setVelocity(0);
                        setRubber(0);
                    }
                }
                else if (storyLogScrollVelocityRef.current !== 0) {
                    const inertia = getStoryLogInertiaScrollFrame(scroll.scrollTop, storyLogScrollVelocityRef.current, getStoryLogScrollMaximum(scroll), unscaledDeltaTime, STORY_CUTSCENE_LOG_SCROLL_DECELERATION_RATE, canvasScale);
                    setVelocity(inertia.velocity);
                    scroll.scrollTop = inertia.scrollTop;
                    if (inertia.rubber !== 0) {
                        // The first inertia boundary frame is raw; SmoothDamp begins on
                        // the following LateUpdate, matching Elastic LoopScrollRect.
                        setRubber(inertia.rubber);
                        storyLogScrollRubberVelocityRef.current = -inertia.velocity;
                        motionOverride = "inertia-boundary";
                    }
                }
            }
            const visualPosition = scroll.scrollTop - storyLogScrollRubberRef.current;
            if (storyLogScrollComponentDraggingRef.current &&
                unscaledDeltaTime > 0) {
                const instantaneousVelocity = (visualPosition - previousVisualPosition) /
                    Math.max(unscaledDeltaTime, 1 / 240);
                const velocity = storyLogScrollVelocityRef.current +
                    (instantaneousVelocity - storyLogScrollVelocityRef.current) *
                        Math.min(unscaledDeltaTime * 10, 1);
                setVelocity(velocity);
                storyLogScrollRubberVelocityRef.current = -velocity;
            }
            previousVisualPosition =
                scroll.scrollTop - storyLogScrollRubberRef.current;
            const pointer = storyLogScrollPointerRef.current;
            if (motionOverride) {
                scroll.dataset.storyCutsceneLogScrollMotion = motionOverride;
            }
            else if (storyLogScrollComponentDraggingRef.current) {
                scroll.dataset.storyCutsceneLogScrollMotion =
                    pointer?.dragging && pointer.scrollRectDragging
                        ? "drag"
                        : "wheel-dragging";
            }
            else if (storyLogScrollRubberRef.current !== 0) {
                scroll.dataset.storyCutsceneLogScrollMotion = "spring";
            }
            else if (hotkeyDirection !== 0) {
                scroll.dataset.storyCutsceneLogScrollMotion = "hotkey";
            }
            else if (storyLogScrollVelocityRef.current !== 0) {
                scroll.dataset.storyCutsceneLogScrollMotion = "inertia";
            }
            else if (pointer && !pointer.dragging) {
                scroll.dataset.storyCutsceneLogScrollMotion = "pointer-pending";
            }
            else {
                scroll.dataset.storyCutsceneLogScrollMotion = "idle";
            }
            updateScrollEvidence();
        };
        const updateStoryLogScrollFrame = (currentTime: number) => {
            if (!isLogOpen || !scroll || !scroll.isConnected) {
                storyLogScrollHotkeyFrameRef.current = null;
                return;
            }
            const unscaledDeltaTime = Math.max((currentTime - lastFrameTime) / 1000, 0);
            const deltaTime = Math.min(unscaledDeltaTime, STORY_CUTSCENE_LOG_SCROLL_MAXIMUM_DELTA_TIME);
            lastFrameTime = currentTime;
            const direction = getDirection();
            if (direction !== 0) {
                applyHotkeyMovePosition(direction, deltaTime);
            }
            else {
                scroll.dataset.storyCutsceneLogScrollHotkeyDirection = "idle";
            }
            // Unity Update runs the held-key MovePosition before the same frame's
            // LoopScrollRect.LateUpdate.
            applyLateUpdate(unscaledDeltaTime, direction);
            storyLogScrollHotkeyFrameRef.current =
                window.requestAnimationFrame(updateStoryLogScrollFrame);
        };
        const beginStoryLogScrollFrame = () => {
            if (!isLogOpen ||
                !scroll ||
                storyLogScrollHotkeyFrameRef.current !== null) {
                return;
            }
            canvasScale = getStoryLogScrollCanvasScale(scroll);
            scroll.dataset.storyCutsceneLogScrollHotkeyCanvasScale =
                canvasScale.toFixed(6);
            scroll.dataset.storyCutsceneLogScrollCanvasScale =
                canvasScale.toFixed(6);
            lastFrameTime = performance.now();
            previousVisualPosition =
                scroll.scrollTop - storyLogScrollRubberRef.current;
            storyLogScrollHotkeyFrameRef.current =
                window.requestAnimationFrame(updateStoryLogScrollFrame);
        };
        const handleStoryLogScrollKeyDown = (event: KeyboardEvent) => {
            const hotkeyCode = getStoryCutsceneLogScrollHotkeyCode(event);
            if (!hotkeyCode) {
                return;
            }
            // Preserve raw Input.GetKey state across editable focus and LOG mount.
            pressedCodes.add(hotkeyCode);
            if (isEditableTarget(event.target) ||
                isEditableTarget(document.activeElement) ||
                !isLogOpen) {
                return;
            }
            event.preventDefault();
            beginStoryLogScrollFrame();
        };
        const handleStoryLogScrollKeyUp = (event: KeyboardEvent) => {
            const hotkeyCode = getStoryCutsceneLogScrollHotkeyCode(event);
            if (!hotkeyCode || !pressedCodes.delete(hotkeyCode)) {
                return;
            }
            if (isLogOpen) {
                event.preventDefault();
            }
        };
        const handleStoryLogScrollBlur = () => {
            pressedCodes.clear();
        };
        const scheduleSuppressClickReset = () => {
            if (storyLogScrollSuppressClickResetTimerRef.current !== null) {
                window.clearTimeout(storyLogScrollSuppressClickResetTimerRef.current);
            }
            storyLogScrollSuppressClickResetTimerRef.current = window.setTimeout(() => {
                storyLogScrollSuppressClickRef.current = false;
                storyLogScrollSuppressClickResetTimerRef.current = null;
            }, 0);
        };
        const handlePointerDown = (event: PointerEvent) => {
            if (!scroll || event.button !== 0 || !event.isPrimary) {
                return;
            }
            if (storyLogScrollSuppressClickResetTimerRef.current !== null) {
                window.clearTimeout(storyLogScrollSuppressClickResetTimerRef.current);
                storyLogScrollSuppressClickResetTimerRef.current = null;
            }
            storyLogScrollSuppressClickRef.current = false;
            // OnInitializePotentialDrag resets shared velocity but does not clear a
            // sticky wheel m_Dragging flag or stop an existing boundary spring.
            setVelocity(0);
            storyLogScrollRubberVelocityRef.current = 0;
            storyLogScrollPointerRef.current = {
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                startVisualPosition: scroll.scrollTop - storyLogScrollRubberRef.current,
                dragging: false,
                scrollRectDragging: false,
            };
            scroll.dataset.storyCutsceneLogScrollPointer = "pending";
        };
        const handlePointerMove = (event: PointerEvent) => {
            const pointer = storyLogScrollPointerRef.current;
            if (!scroll ||
                !pointer ||
                pointer.pointerId !== event.pointerId) {
                return;
            }
            const deltaX = event.clientX - pointer.startX;
            let deltaY = event.clientY - pointer.startY;
            if (!pointer.dragging &&
                Math.hypot(deltaX, deltaY) <
                    STORY_CUTSCENE_LOG_SCROLL_DRAG_THRESHOLD) {
                return;
            }
            if (!pointer.dragging) {
                pointer.dragging = true;
                pointer.scrollRectDragging = true;
                storyLogScrollComponentDraggingRef.current = true;
                storyLogScrollSuppressClickRef.current = true;
                try {
                    if (!scroll.hasPointerCapture(event.pointerId)) {
                        scroll.setPointerCapture(event.pointerId);
                    }
                }
                catch {
                    // Window capture listeners continue the drag when pointer capture is
                    // unavailable or the cursor crossed the viewport before threshold.
                }
                // EventSystem consumes the first 50 screen pixels. OnBeginDrag stores
                // the threshold-crossing cursor/content as its new zero-delta baseline.
                const visualPosition = scroll.scrollTop - storyLogScrollRubberRef.current;
                pointer.startX = event.clientX;
                pointer.startY = event.clientY;
                pointer.startVisualPosition = visualPosition;
                previousVisualPosition = visualPosition;
                deltaY = 0;
                scroll.dataset.storyCutsceneLogScrollPointer = "dragging";
            }
            event.preventDefault();
            const frame = getStoryLogPointerDragFrame(pointer.startVisualPosition, deltaY, getStoryLogScrollMaximum(scroll), scroll.clientHeight);
            scroll.scrollTop = frame.scrollTop;
            setRubber(frame.rubber);
            scroll.dataset.storyCutsceneLogScrollMotion = "drag";
            updateScrollEvidence();
        };
        const finishPointer = (event: PointerEvent, cancelled: boolean) => {
            const pointer = storyLogScrollPointerRef.current;
            if (!scroll ||
                !pointer ||
                pointer.pointerId !== event.pointerId) {
                return;
            }
            if (scroll.hasPointerCapture(event.pointerId)) {
                try {
                    scroll.releasePointerCapture(event.pointerId);
                }
                catch {
                    // The UA may already have released capture before pointercancel.
                }
            }
            storyLogScrollPointerRef.current = null;
            scroll.dataset.storyCutsceneLogScrollPointer = "idle";
            if (!pointer.dragging) {
                return;
            }
            if (!cancelled) {
                event.preventDefault();
            }
            // OnEndDrag always clears m_Dragging. Pointer/hotkey release never calls
            // the LOG wheel-only close delegate.
            pointer.scrollRectDragging = false;
            storyLogScrollComponentDraggingRef.current = false;
            storyLogScrollSuppressClickRef.current = true;
            scheduleSuppressClickReset();
            updateScrollEvidence();
        };
        const handlePointerUp = (event: PointerEvent) => {
            finishPointer(event, false);
        };
        const handlePointerCancel = (event: PointerEvent) => {
            finishPointer(event, true);
        };
        const handleClickCapture = (event: MouseEvent) => {
            if (!storyLogScrollSuppressClickRef.current) {
                return;
            }
            storyLogScrollSuppressClickRef.current = false;
            if (storyLogScrollSuppressClickResetTimerRef.current !== null) {
                window.clearTimeout(storyLogScrollSuppressClickResetTimerRef.current);
                storyLogScrollSuppressClickResetTimerRef.current = null;
            }
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
        };
        const handleWheel = (event: WheelEvent) => {
            if (!scroll) {
                return;
            }
            const usesHorizontalDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY);
            const dominantPixelDelta = usesHorizontalDelta
                ? event.deltaX
                : event.deltaY;
            if (!Number.isFinite(dominantPixelDelta) || dominantPixelDelta === 0) {
                return;
            }
            event.preventDefault();
            canvasScale = getStoryLogScrollCanvasScale(scroll);
            const maximumScrollTop = getStoryLogScrollMaximum(scroll);
            const contentHeight = maximumScrollTop + scroll.clientHeight;
            const totalCount = scroll.querySelector<HTMLElement>("[data-story-cutscene-log-scroll-physics-content]")?.childElementCount ?? 0;
            const normalizedPositionBefore = getStoryLogNormalizedPosition(scroll.scrollTop - storyLogScrollRubberRef.current, contentHeight, scroll.clientHeight, totalCount);
            const frame = getStoryLogWheelScrollFrame(scroll.scrollTop, storyLogScrollRubberRef.current, maximumScrollTop, scroll.clientHeight, event.deltaX, event.deltaY, event.deltaMode === WheelEvent.DOM_DELTA_PIXEL, canvasScale, STORY_CUTSCENE_LOG_SCROLL_WHEEL_PIXEL_TICK, STORY_CUTSCENE_LOG_SCROLL_WHEEL_MULTIPLIER, STORY_CUTSCENE_LOG_SCROLL_WHEEL_RUBBER_SCALE);
            scroll.scrollTop = frame.scrollTop;
            setRubber(frame.rubber);
            storyLogScrollComponentDraggingRef.current = true;
            const pointer = storyLogScrollPointerRef.current;
            if (pointer?.dragging) {
                pointer.scrollRectDragging = true;
            }
            scroll.dataset.storyCutsceneLogScrollWheelAxis = frame.axis;
            scroll.dataset.storyCutsceneLogScrollWheelDelta =
                frame.wheelDelta.toFixed(3);
            scroll.dataset.storyCutsceneLogScrollCanvasScale =
                canvasScale.toFixed(6);
            updateScrollEvidence();
            const normalizedPositionAfter = getStoryLogNormalizedPosition(frame.visualPosition, contentHeight, scroll.clientHeight, totalCount);
            // The delegate receives the original PointerEventData. A dominant X
            // substitution moves this vertical list but cannot satisfy raw Y<0.
            if (getStoryLogWheelAction(event.deltaY, normalizedPositionBefore, normalizedPositionAfter) === "close") {
                storyLogScrollComponentDraggingRef.current = false;
                closeStoryLog();
            }
        };
        window.addEventListener("keydown", handleStoryLogScrollKeyDown);
        window.addEventListener("keyup", handleStoryLogScrollKeyUp);
        window.addEventListener("blur", handleStoryLogScrollBlur);
        if (scroll) {
            scroll.addEventListener("pointerdown", handlePointerDown, true);
            scroll.addEventListener("wheel", handleWheel, { passive: false });
            scroll.addEventListener("click", handleClickCapture, true);
            window.addEventListener("pointermove", handlePointerMove, {
                capture: true,
                passive: false,
            });
            window.addEventListener("pointerup", handlePointerUp, true);
            window.addEventListener("pointercancel", handlePointerCancel, true);
            beginStoryLogScrollFrame();
        }
        return () => {
            window.removeEventListener("keydown", handleStoryLogScrollKeyDown);
            window.removeEventListener("keyup", handleStoryLogScrollKeyUp);
            window.removeEventListener("blur", handleStoryLogScrollBlur);
            if (scroll) {
                scroll.removeEventListener("pointerdown", handlePointerDown, true);
                scroll.removeEventListener("wheel", handleWheel);
                scroll.removeEventListener("click", handleClickCapture, true);
                window.removeEventListener("pointermove", handlePointerMove, true);
                window.removeEventListener("pointerup", handlePointerUp, true);
                window.removeEventListener("pointercancel", handlePointerCancel, true);
            }
            if (storyLogScrollHotkeyFrameRef.current !== null) {
                window.cancelAnimationFrame(storyLogScrollHotkeyFrameRef.current);
                storyLogScrollHotkeyFrameRef.current = null;
            }
            const pointer = storyLogScrollPointerRef.current;
            if (scroll && pointer && scroll.hasPointerCapture(pointer.pointerId)) {
                try {
                    scroll.releasePointerCapture(pointer.pointerId);
                }
                catch {
                    // The node can detach before React runs this cleanup.
                }
            }
            if (storyLogScrollSuppressClickResetTimerRef.current !== null) {
                window.clearTimeout(storyLogScrollSuppressClickResetTimerRef.current);
                storyLogScrollSuppressClickResetTimerRef.current = null;
            }
            storyLogScrollPointerRef.current = null;
            storyLogScrollComponentDraggingRef.current = false;
            storyLogScrollSuppressClickRef.current = false;
            storyLogScrollRubberVelocityRef.current = 0;
            storyLogScrollVelocityRef.current = 0;
            setRubber(0);
        };
    }, [closeStoryLog, isLogOpen]);
    const handleTheaterWheel = useCallback((event: React.WheelEvent<HTMLElement>) => {
        if (isLogOpen || isSkipOpen) {
            return;
        }
        const action = getStoryWheelAction(event.deltaY, controlVisibility.log);
        if (action === "none") {
            return;
        }
        event.preventDefault();
        if (action === "log") {
            openStoryLog();
            return;
        }
        goNext();
    }, [
        controlVisibility.log,
        goNext,
        isLogOpen,
        isSkipOpen,
        openStoryLog,
    ]);
    useEffect(() => {
        if (mode !== "theater" || !scene || !currentCommand || !audioUnlocked) {
            return;
        }
        const processId = `${scene.id}:${commandIndex}`;
        if (processedCommandRef.current === processId) {
            return;
        }
        processedCommandRef.current = processId;
        // NKCUICutState.InitPerCut()은 새 명령 본문이나 SELECT/JUMP 액션을
        // 처리하기 전에 직전 명령의 m_VoiceUID를 정지한다. 효과음과 BGM은
        // 별도 관리자 상태이므로 여기서는 현재 추적 중인 음성 하나만 끊는다.
        setLogReplayVoiceProcessId("");
        stopTrackedVoice();
        commandStartedAtRef.current = performance.now();
        commandWallStartedAtRef.current = commandStartedAtRef.current;
        waitClockRef.current = { processId, elapsedMs: 0 };
        actorCrashClockRef.current = { processId, elapsedMs: 0 };
        setStoppedActorCrashProcessId("");
        setStoppedActorBounceProcessId("");
        setFinishedActorProcessId("");
        autoWaitRef.current = {
            processId,
            durationMs: getStoryAutoWaitDuration(currentCommand, isAuto) * 1000,
        };
        const selection = currentCommand.action === "SELECT"
            ? getStoryChoices(scene.commands, commandIndex)
            : [];
        const previous = visualStateRef.current;
        if (previous.titleText || previous.subtitleText) {
            if (shouldFadePreviousStoryTitle(previous, currentCommand)) {
                setClosingTitle({
                    processId,
                    titleText: previous.titleText,
                    subtitleText: previous.subtitleText,
                    durationMs: previous.titleFadeOutTimeMs,
                });
            }
            else {
                setClosingTitle(null);
            }
        }
        setCenterFadeOutProcessId("");
        centerFadeOutClockRef.current = { processId: "", elapsedMs: 0 };
        playReservedSoundAndMusic();
        if (!skipsStoryCommandBody(currentCommand)) {
            reservedFxRef.current = createFxEvent(currentCommand.endFxName, currentCommand.endFxPath, currentCommand.endFxControl);
            playFxEvent(createFxEvent(currentCommand.fxName, currentCommand.fxPath, currentCommand.fxControl));
        }
        const next = applyStoryCommand(previous, currentCommand, readBackgroundTransform(backgroundPositionRef.current, backgroundScaleRef.current, backgroundGraphicRef.current, backgroundColorRef.current), (characterId) => characters[characterId]?.templateResolved
            ? characters[characterId].prefab
            : undefined, getActorColorSnapshots(theaterRef.current));
        visualStateRef.current = next;
        setVisualState(next);
        setCenterFadeReadyProcessId(next.dialogueFadeIn && Number(currentCommand.talkTime ?? 0) > 0
            ? ""
            : processId);
        setChoices(selection);
        setDisplayedTitleCharacters(0);
        setDisplayedSubtitleCharacters(0);
        setFinishedTitleTypingProcessId("");
        if (currentCommand.talkText && !skipsStoryCommandBody(currentCommand)) {
            const typewriterKey = getStoryCommandDialogueBoxType(currentCommand) === "center"
                ? "center"
                : "normal";
            const typewriterState = startStoryTypewriter(dialogueTypewriterRef.current[typewriterKey], getVisibleTextLength(next.dialogueText), Number(currentCommand.talkTime), currentCommand.talkAppend, next.dialogueText);
            dialogueTypewriterRef.current[typewriterKey] = typewriterState;
            setDisplayedCharacters(typewriterState.displayedCharacters);
            setDialogueTypingProcessId(typewriterState.typing ? processId : "");
        }
        else {
            const typewriterKey = next.dialogueBoxType === "center" ? "center" : "normal";
            dialogueTypewriterRef.current[typewriterKey] = {
                ...dialogueTypewriterRef.current[typewriterKey],
                displayedCharacters: getVisibleTextLength(next.dialogueText),
                targetTextCharacters: getVisibleTextLength(next.dialogueText),
                targetText: next.dialogueText,
                typing: false,
            };
            setDisplayedCharacters(getVisibleTextLength(next.dialogueText));
            setDialogueTypingProcessId("");
        }
        const logText = getStoryCommandLogText(currentCommand);
        if (logText) {
            setStoryLog((entries) => {
                if (currentCommand.talkAppend && entries.length) {
                    const nextEntries = [...entries];
                    const previousEntry = nextEntries[nextEntries.length - 1];
                    nextEntries[nextEntries.length - 1] = {
                        ...previousEntry,
                        text: appendStoryLogText(previousEntry.text, logText),
                        voicePath: currentCommand.voicePath || previousEntry.voicePath,
                    };
                    return nextEntries;
                }
                return [
                    ...entries,
                    {
                        key: currentCommand.key,
                        text: formatStoryLogText(currentCommand.characterId
                            ? characters[currentCommand.characterId]?.nameMarkup ||
                                characters[currentCommand.characterId]?.name ||
                                ""
                            : "", logText, Boolean(currentCommand.characterId)),
                        voicePath: currentCommand.voicePath ?? "",
                    },
                ];
            });
        }
    }, [
        audioUnlocked,
        characters,
        commandIndex,
        currentCommand,
        isAuto,
        mode,
        playFxEvent,
        playReservedSoundAndMusic,
        scene,
        stopTrackedVoice,
    ]);
    useEffect(() => {
        if (mode !== "theater" ||
            !scene ||
            !currentCommand ||
            currentCommandSkipsBody ||
            !effectiveWaitClick ||
            isAuto ||
            isSkipOpen ||
            isUiHidden ||
            isTyping ||
            isTitleTyping ||
            finishedVisualProcessId !== currentProcessId ||
            processedCommandRef.current !== currentProcessId) {
            return;
        }
        // Update()의 수동 waitClick 분기는 IsCutFinished가 참이 되는 즉시
        // 예약 음향을 적용하고, 사용자의 다음 클릭은 그 뒤에 기다린다.
        playReservedSoundAndMusic();
    }, [
        currentCommand,
        currentCommandSkipsBody,
        currentProcessId,
        effectiveWaitClick,
        finishedVisualProcessId,
        isAuto,
        isSkipOpen,
        isTitleTyping,
        isTyping,
        isUiHidden,
        mode,
        playReservedSoundAndMusic,
        scene,
    ]);
    useEffect(() => {
        const requestTheaterCancel = () => {
            // NKCUIManager.OnBackButton consumes Cancel while the shared fade is
            // actively running. FlashBang and a finished covered FadeOut are not
            // m_bFading and must still reach the current topmost UI.
            if (visualState.fadeActive) {
                return;
            }
            if (isSkipOpen) {
                if (isMovieCommand) {
                    cancelMovieSkip();
                }
                return;
            }
            if (isLogOpen) {
                closeStoryLog();
                return;
            }
            leaveTheater();
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            // Global Cancel is dispatched from Input.GetKeyDown, not the held-key
            // path. One physical Escape press must therefore close only the current
            // topmost Popup/viewer even if the browser emits repeat keydown events.
            if (event.key === "Escape" && event.repeat) {
                event.preventDefault();
                return;
            }
            if (mode === "theater" && event.code === "ControlLeft") {
                event.preventDefault();
                setIsFastSkipHeld(true);
            }
            if (mode !== "theater") {
                if (isOperationEntryFadeActive ||
                    isCounterCaseEntryFadeActive ||
                    isOperationExitFadeActive) {
                    event.preventDefault();
                    return;
                }
                const actHotkeyDirection = getStoryOperationActHotkeyDirection(event);
                const target = event.target;
                const isEditableTarget = target instanceof HTMLElement &&
                    (target.isContentEditable ||
                        target.matches("input, select, textarea, [role='textbox']"));
                // STV-MAP-046/STV-MAP-056: NKCUIOperationNodeViewer.OnHotkey routes
                // the three Up/Down aliases to MoveTab(-1/+1). StageInfo is a child
                // MonoBehaviour, so the same event changes ACT and closes that detail;
                // only a real Popup above the viewer blocks it. Unity uses GetKeyDown,
                // and even a single-ACT list reselects its sole modulo result.
                if (mode === "episode" &&
                    !isCounterCaseEpisode &&
                    !isEpisodeListOpen &&
                    !event.repeat &&
                    !event.shiftKey &&
                    !event.ctrlKey &&
                    !isEditableTarget &&
                    acts.length > 0 &&
                    actHotkeyDirection !== 0) {
                    const currentActIndex = acts.indexOf(selectedAct);
                    if (currentActIndex < 0) {
                        return;
                    }
                    event.preventDefault();
                    const nextActIndex = (currentActIndex + actHotkeyDirection + acts.length) % acts.length;
                    setSelectedAct(acts[nextActIndex]);
                    setOperationActHotkeySelectionRevision((revision) => revision + 1);
                    setSelectedStageId(0);
                    setIsStageInfoOpen(false);
                    return;
                }
                // STV-MAP-051: the hamburger menu is a Popup, so its Back closes before
                // the viewer below receives stage-info or Counter Case Back handling.
                if (event.key === "Escape" && isEpisodeListOpen) {
                    event.preventDefault();
                    setIsEpisodeListOpen(false);
                }
                else if (event.key === "Escape" &&
                    selectedEpisode &&
                    !isCounterCaseEpisode) {
                    event.preventDefault();
                    requestOperationViewerBack();
                }
                else if (event.key === "Escape" &&
                    selectedEpisode &&
                    isCounterCaseEpisode) {
                    event.preventDefault();
                    requestCounterCaseViewerBack();
                }
                return;
            }
            const eventTarget = event.target;
            const activeElement = document.activeElement;
            const isEditableHotkeyTarget = (eventTarget instanceof HTMLElement &&
                (eventTarget.isContentEditable ||
                    eventTarget.matches("input, select, textarea, [role='textbox']"))) ||
                (activeElement instanceof HTMLElement &&
                    (activeElement.isContentEditable ||
                        activeElement.matches("input, select, textarea, [role='textbox']")));
            if (isSkipOpen) {
                const movieSkipConfirmHotkeyCode = getStoryMovieSkipConfirmHotkeyCode(event.code, event.key);
                // STV-RDR-003: OKCancel Popup이 최상단인 영상 SKIP에서만 Confirm을
                // OK listener로 직접 보낸다. SubHotKey.All이므로 modifier는 막지 않는다.
                if (isMovieCommand &&
                    movieSkipConfirmHotkeyCode &&
                    !event.repeat &&
                    !isEditableHotkeyTarget) {
                    event.preventDefault();
                    confirmMovieSkip();
                }
                else if (event.key === "Escape" &&
                    !event.repeat &&
                    !isEditableHotkeyTarget) {
                    event.preventDefault();
                    requestTheaterCancel();
                }
                return;
            }
            if (isLogOpen) {
                if (event.key === "Escape" && !isEditableHotkeyTarget) {
                    event.preventDefault();
                    requestTheaterCancel();
                }
                return;
            }
            const cutsceneLogHotkeyCode = getStoryCutsceneLogHotkeyCode(event);
            // STV-RDR-001: the client's active LOG NKCUIComButton owns Up. Its
            // Update path consumes a fresh input edge and invokes PointerClick
            // directly, bypassing OnPointerClick and its click sound. The shared
            // Fade/FlashBang raycast surface can still cover the button center.
            if (cutsceneLogHotkeyCode &&
                audioUnlocked &&
                scene &&
                currentCommand &&
                controlVisibility.log &&
                !visualState.fadeActive &&
                !visualState.fadeCovered &&
                visualState.fadeOpacity <= 0 &&
                !visualState.flash &&
                !event.repeat &&
                !event.shiftKey &&
                !event.ctrlKey &&
                !event.metaKey &&
                !isEditableHotkeyTarget) {
                event.preventDefault();
                openStoryLog();
                return;
            }
            const isCutsceneConfirmHotkey = event.key === " " ||
                event.key === "Enter" ||
                event.code === "Numpad5";
            if (isCutsceneConfirmHotkey &&
                !event.repeat &&
                !isEditableHotkeyTarget) {
                // STV-RDR-004: NKCInputManager의 네 Confirm 별칭을 Player의 기존
                // OnHotkey -> OnClickedPlayer 경로에만 연결한다. SubHotKey.All이라
                // modifier는 허용하고, 물리 Numpad5만 추가해 Digit5는 제외한다.
                event.preventDefault();
                goNext();
            }
            else if (event.key === "Escape" && !isEditableHotkeyTarget) {
                event.preventDefault();
                requestTheaterCancel();
            }
        };
        const isEditableMouseTarget = (target: EventTarget | null) => target instanceof HTMLElement &&
            (target.isContentEditable ||
                target.matches("input, select, textarea, [role='textbox']"));
        const isOperationBrowserHistoryMouseButton = (event: MouseEvent) => (event.button === 3 || event.button === 4) &&
            mode === "episode" &&
            Boolean(selectedEpisode) &&
            !isCounterCaseEpisode;
        const isCounterCaseBrowserHistoryMouseButton = (event: MouseEvent) => (event.button === 3 || event.button === 4) &&
            mode === "episode" &&
            Boolean(selectedEpisode) &&
            isCounterCaseEpisode;
        const isCutsceneBrowserHistoryMouseButton = (event: MouseEvent) => (event.button === 3 || event.button === 4) && mode === "theater";
        const isStoryViewerBrowserHistoryMouseButton = (event: MouseEvent) => isOperationBrowserHistoryMouseButton(event) ||
            isCounterCaseBrowserHistoryMouseButton(event) ||
            isCutsceneBrowserHistoryMouseButton(event);
        const handleMouseDown = (event: MouseEvent) => {
            if (!isStoryViewerBrowserHistoryMouseButton(event)) {
                return;
            }
            // STV-RDR-006: Mouse3 shares the same global Cancel stack as Escape.
            // Mouse4 and editable Mouse3 only lose the browser history side effect.
            event.preventDefault();
            const mouseCancelAction = getStoryMouseCancelAction(event.button, isEditableMouseTarget(event.target) ||
                isEditableMouseTarget(document.activeElement));
            if (mouseCancelAction !== "cancel") {
                return;
            }
            if (mode === "episode" && !isCounterCaseEpisode) {
                requestOperationViewerBack();
                return;
            }
            if (mode === "episode" && isCounterCaseEpisode) {
                requestCounterCaseViewerBack();
                return;
            }
            requestTheaterCancel();
        };
        const suppressOperationBrowserHistoryMouseDefault = (event: MouseEvent) => {
            if (isStoryViewerBrowserHistoryMouseButton(event)) {
                event.preventDefault();
            }
        };
        const handleKeyUp = (event: KeyboardEvent) => {
            if (event.code === "ControlLeft") {
                setIsFastSkipHeld(false);
            }
        };
        const handleBlur = () => setIsFastSkipHeld(false);
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        window.addEventListener("blur", handleBlur);
        window.addEventListener("mousedown", handleMouseDown, true);
        window.addEventListener("mouseup", suppressOperationBrowserHistoryMouseDefault, true);
        window.addEventListener("auxclick", suppressOperationBrowserHistoryMouseDefault, true);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
            window.removeEventListener("blur", handleBlur);
            window.removeEventListener("mousedown", handleMouseDown, true);
            window.removeEventListener("mouseup", suppressOperationBrowserHistoryMouseDefault, true);
            window.removeEventListener("auxclick", suppressOperationBrowserHistoryMouseDefault, true);
        };
    }, [
        acts,
        audioUnlocked,
        cancelMovieSkip,
        confirmMovieSkip,
        controlVisibility.log,
        currentCommand,
        goNext,
        closeStoryLog,
        isCounterCaseEpisode,
        isCounterCaseEntryFadeActive,
        isEpisodeListOpen,
        isLogOpen,
        isMovieCommand,
        isOperationEntryFadeActive,
        isOperationExitFadeActive,
        isSkipOpen,
        isStageInfoOpen,
        leaveTheater,
        mode,
        openStoryLog,
        requestCounterCaseViewerBack,
        requestOperationViewerBack,
        scene,
        selectedAct,
        selectedCounterCaseAct,
        selectedEpisode,
        visualState.fadeActive,
        visualState.fadeCovered,
        visualState.fadeOpacity,
        visualState.flash,
    ]);
    useEffect(() => {
        if (mode !== "theater" || !isFastSkipHeld || isLogOpen) {
            return;
        }
        let animationFrame = 0;
        const fastSkip = () => {
            goNext(true);
            animationFrame = window.requestAnimationFrame(fastSkip);
        };
        animationFrame = window.requestAnimationFrame(fastSkip);
        return () => window.cancelAnimationFrame(animationFrame);
    }, [goNext, isFastSkipHeld, isLogOpen, mode]);
    useEffect(() => {
        const paused = isUiHidden;
        if (paused && !popupPausedAtRef.current) {
            popupPausedAtRef.current = performance.now();
            return;
        }
        if (!paused && popupPausedAtRef.current) {
            if (commandStartedAtRef.current) {
                commandStartedAtRef.current +=
                    performance.now() - popupPausedAtRef.current;
            }
            popupPausedAtRef.current = 0;
        }
    }, [isUiHidden]);
    useEffect(() => {
        const animations = theaterRef.current?.getAnimations({ subtree: true }) ?? [];
        for (const animation of animations) {
            const target = animation.effect instanceof KeyframeEffect
                ? animation.effect.target
                : null;
            // SetPause가 건드리지 않는 전역 Fade/DOTween 계열은 UI가 숨겨져도
            // 클라이언트처럼 계속 진행한다.
            if (target instanceof Element &&
                target.hasAttribute("data-story-passive-animation")) {
                continue;
            }
            if (isUiHidden) {
                animation.pause();
            }
            else {
                animation.play();
            }
        }
    }, [isUiHidden]);
    useEffect(() => {
        if (mode !== "theater" ||
            isUiHidden ||
            visualState.previousBackgroundTintTimeMs <= 0 ||
            (!visualState.previousBackgroundUrl &&
                !visualState.previousBackgroundSpine &&
                !visualState.previousGameObjectEffect)) {
            return;
        }
        const now = performance.now();
        const elapsedMs = Math.max(now - commandStartedAtRef.current, 0);
        const remainingMs = getStoryTimerRemainingMs(visualState.previousBackgroundTintTimeMs, elapsedMs);
        const timer = window.setTimeout(() => {
            if (processedCommandRef.current !== currentProcessId) {
                return;
            }
            const next = finishStoryPreviousBackgroundFade(visualStateRef.current);
            visualStateRef.current = next;
            setVisualState(next);
        }, remainingMs);
        return () => window.clearTimeout(timer);
    }, [
        currentProcessId,
        isUiHidden,
        mode,
        visualState.previousBackgroundSpine,
        visualState.previousBackgroundTintTimeMs,
        visualState.previousBackgroundUrl,
        visualState.previousGameObjectEffect,
    ]);
    useEffect(() => {
        if (mode !== "theater" ||
            !scene ||
            !currentCommand ||
            !audioUnlocked ||
            isSkipOpen ||
            isUiHidden ||
            choices.length ||
            isTyping ||
            isTitleTyping ||
            finishedVisualProcessId !== currentProcessId) {
            return;
        }
        if (shouldWaitForStoryVoice(isAuto, blockingVoicePath, voicePlaybackEnded)) {
            return;
        }
        const autoWaitDurationMs = autoWaitRef.current.processId === currentProcessId
            ? autoWaitRef.current.durationMs
            : 0;
        const stopDelayMs = getStoryActorCrashStopDelayMs(currentCommand, isAuto, autoWaitDurationMs);
        if (stopDelayMs === null) {
            return;
        }
        if (actorCrashClockRef.current.processId !== currentProcessId) {
            actorCrashClockRef.current = {
                processId: currentProcessId,
                elapsedMs: 0,
            };
        }
        const startedAt = performance.now();
        const timer = window.setTimeout(() => {
            actorCrashClockRef.current = { processId: "", elapsedMs: 0 };
            setStoppedActorCrashProcessId(currentProcessId);
        }, getStoryTimerRemainingMs(stopDelayMs, actorCrashClockRef.current.elapsedMs));
        return () => {
            window.clearTimeout(timer);
            if (actorCrashClockRef.current.processId === currentProcessId) {
                actorCrashClockRef.current.elapsedMs += Math.max(performance.now() - startedAt, 0);
            }
        };
    }, [
        audioUnlocked,
        choices.length,
        currentCommand,
        currentProcessId,
        blockingVoicePath,
        finishedVisualProcessId,
        isAuto,
        isSkipOpen,
        isTitleTyping,
        isTyping,
        isUiHidden,
        mode,
        scene,
        voicePlaybackEnded,
    ]);
    useEffect(() => {
        if (mode !== "theater" ||
            !scene ||
            !currentCommand ||
            !audioUnlocked ||
            currentCommandSkipsBody ||
            finishedActorProcessId === currentProcessId ||
            processedCommandRef.current !== currentProcessId) {
            return;
        }
        const targetSlot = parseCharacterPosition(currentCommand.position)?.targetSlot;
        const targetActor = targetSlot
            ? visualState.actors.find((actor) => actor.slot === targetSlot)
            : undefined;
        const characterFadeRuns = Boolean(targetActor && (targetActor.fadeIn || targetActor.fadeOut));
        const characterMovementRuns = Boolean(targetActor?.moving && targetActor.movementMs > 0);
        const characterBounceRuns = Boolean(targetActor &&
            targetActor.bounceCount > 0 &&
            targetActor.bounceTimeMs > 0);
        const characterScaleRuns = Boolean(targetActor && targetActor.scaleTransitionMs > 0);
        const timing = getStoryCharacterFinishTiming(currentCommand, characterFadeRuns, characterMovementRuns, characterBounceRuns, characterScaleRuns);
        if (!timing.active) {
            return;
        }
        const now = performance.now();
        const currentPauseElapsed = isUiHidden && popupPausedAtRef.current
            ? now - popupPausedAtRef.current
            : 0;
        const pausableElapsedMs = Math.max(now - commandStartedAtRef.current - currentPauseElapsed, 0);
        const passiveElapsedMs = Math.max(now - commandWallStartedAtRef.current, 0);
        const remainingMs = getStoryCharacterFinishRemainingMs(timing, pausableElapsedMs, passiveElapsedMs, isUiHidden);
        if (remainingMs === null) {
            return;
        }
        const timer = window.setTimeout(() => {
            if (processedCommandRef.current !== currentProcessId) {
                return;
            }
            const next = finishStoryCommandActor(visualStateRef.current, currentCommand);
            visualStateRef.current = next;
            setVisualState(next);
            setStoppedActorCrashProcessId(currentProcessId);
            setStoppedActorBounceProcessId(currentProcessId);
            setFinishedActorProcessId(currentProcessId);
        }, remainingMs);
        return () => window.clearTimeout(timer);
    }, [
        audioUnlocked,
        currentCommand,
        currentCommandSkipsBody,
        currentProcessId,
        finishedActorProcessId,
        isUiHidden,
        mode,
        scene,
        visualState.actors,
    ]);
    useEffect(() => {
        if (mode !== "theater" ||
            !scene ||
            !currentCommand ||
            !audioUnlocked ||
            isSkipOpen ||
            isUiHidden ||
            currentCommand.movieUrl) {
            return;
        }
        const processId = `${scene.id}:${commandIndex}`;
        if (processedCommandRef.current !== processId) {
            return;
        }
        const pauseDurations = getStoryCommandPauseDurations(currentCommand, visualState.dialogueFadeIn, visualState.actors.some((actor) => actor.fadeIn || actor.fadeOut), currentCommand.clear
            ? doesStoryCharacterMovementRunByCommand(currentCommand)
            : visualState.actors.some((actor) => actor.moving), visualState.backgroundTintTimeMs > 0);
        const pausableDurationMs = Math.max(pauseDurations.pausable, visualState.imageTransitionMs / 1000, visualState.dialogueOpeningTimeMs / 1000, visualState.previousBackgroundTintTimeMs / 1000) * 1000;
        const passiveDurationMs = pauseDurations.passive * 1000;
        const now = performance.now();
        const pausableElapsed = Math.max(now - commandStartedAtRef.current, 0);
        const passiveElapsed = Math.max(now - commandWallStartedAtRef.current, 0);
        const remainingDurationMs = Math.max(pausableDurationMs - pausableElapsed, passiveDurationMs - passiveElapsed, 0);
        const timer = window.setTimeout(() => setFinishedVisualProcessId(processId), remainingDurationMs);
        return () => window.clearTimeout(timer);
    }, [
        audioUnlocked,
        commandIndex,
        currentCommand,
        isSkipOpen,
        isUiHidden,
        mode,
        scene,
        visualState.backgroundTintTimeMs,
        visualState.dialogueFadeIn,
        visualState.dialogueOpeningTimeMs,
        visualState.actors,
        visualState.imageTransitionMs,
        visualState.previousBackgroundTintTimeMs,
    ]);
    useEffect(() => {
        if (mode !== "theater" ||
            !scene ||
            !currentCommand?.talkText ||
            !visualState.dialogueFadeIn ||
            visualState.dialogueCenterFadePrimed) {
            return;
        }
        const processId = `${scene.id}:${commandIndex}`;
        if (processedCommandRef.current !== processId) {
            return;
        }
        const fadeDelayMs = 100 + Math.max(Number(currentCommand.talkCenterFadeTime ?? 0), 0) * 1000;
        const elapsed = Math.max(performance.now() - commandStartedAtRef.current, 0);
        const timer = window.setTimeout(() => {
            setCenterFadeReadyProcessId(processId);
            if (processedCommandRef.current === processId) {
                const primedState = {
                    ...visualStateRef.current,
                    dialogueCenterFadePrimed: true,
                };
                visualStateRef.current = primedState;
                setVisualState(primedState);
            }
        }, Math.max(fadeDelayMs - elapsed, 0));
        return () => window.clearTimeout(timer);
    }, [
        commandIndex,
        currentCommand,
        mode,
        scene,
        visualState.dialogueCenterFadePrimed,
        visualState.dialogueFadeIn,
    ]);
    useEffect(() => {
        if (mode !== "theater" ||
            !scene ||
            !currentCommand ||
            centerFadeOutProcessId !== currentProcessId) {
            return;
        }
        if (centerFadeOutClockRef.current.processId !== currentProcessId) {
            centerFadeOutClockRef.current = {
                processId: currentProcessId,
                elapsedMs: 0,
            };
        }
        const startedAt = performance.now();
        const remainingMs = Math.max(visualState.dialogueFadeTimeMs -
            centerFadeOutClockRef.current.elapsedMs, 0);
        const timer = window.setTimeout(() => {
            centerFadeOutClockRef.current = { processId: "", elapsedMs: 0 };
            setCenterFadeOutProcessId("");
            goToCommand(commandIndex + 1);
        }, remainingMs);
        return () => {
            window.clearTimeout(timer);
            if (centerFadeOutClockRef.current.processId === currentProcessId) {
                centerFadeOutClockRef.current.elapsedMs += Math.max(performance.now() - startedAt, 0);
            }
        };
    }, [
        centerFadeOutProcessId,
        commandIndex,
        currentCommand,
        currentProcessId,
        goToCommand,
        mode,
        scene,
        visualState.dialogueFadeTimeMs,
    ]);
    useEffect(() => {
        if (!closingTitle) {
            return;
        }
        const timer = window.setTimeout(() => setClosingTitle((current) => current?.processId === closingTitle.processId ? null : current), closingTitle.durationMs);
        return () => window.clearTimeout(timer);
    }, [closingTitle]);
    useEffect(() => {
        if (mode !== "theater" ||
            !scene ||
            !currentCommand ||
            !audioUnlocked ||
            isSkipOpen ||
            isUiHidden ||
            choices.length ||
            isTyping ||
            isTitleTyping) {
            return;
        }
        const processId = `${scene.id}:${commandIndex}`;
        if (currentCommand.action === "JUMP") {
            const markIndex = findStoryMarkIndex(scene.commands, currentCommand.actionKey);
            const timer = window.setTimeout(() => goToCommand(markIndex >= 0 ? markIndex : commandIndex + 1), 0);
            return () => window.clearTimeout(timer);
        }
        if (currentCommand.movieUrl) {
            return;
        }
        if (finishedVisualProcessId !== processId) {
            return;
        }
        if (effectiveWaitClick && !isAuto) {
            return;
        }
        if (shouldWaitForStoryVoice(isAuto, blockingVoicePath, voicePlaybackEnded)) {
            return;
        }
        if (waitClockRef.current.processId !== processId) {
            waitClockRef.current = { processId, elapsedMs: 0 };
        }
        const waitDurationMs = Math.max(Number(currentCommand.waitTime ?? 0), 0) * 1000 +
            (autoWaitRef.current.processId === processId
                ? autoWaitRef.current.durationMs
                : 0);
        const startedAt = performance.now();
        const remainingDelay = Math.max(waitDurationMs - waitClockRef.current.elapsedMs, 0);
        const timer = window.setTimeout(() => goToCommand(commandIndex + 1), remainingDelay);
        return () => {
            window.clearTimeout(timer);
            if (waitClockRef.current.processId === processId) {
                waitClockRef.current.elapsedMs += Math.max(performance.now() - startedAt, 0);
            }
        };
    }, [
        choices.length,
        commandIndex,
        currentCommand,
        effectiveWaitClick,
        audioUnlocked,
        goToCommand,
        isAuto,
        isSkipOpen,
        isUiHidden,
        isTyping,
        isTitleTyping,
        mode,
        scene,
        finishedVisualProcessId,
        blockingVoicePath,
        voicePlaybackEnded,
    ]);
    useEffect(() => {
        if (mode !== "theater" ||
            !audioUnlocked ||
            isLogOpen ||
            isSkipOpen ||
            isUiHidden ||
            !currentCommand?.talkText ||
            Number(currentCommand.talkTime) <= 0 ||
            !isTyping ||
            centerTypingBlocked ||
            choices.length) {
            return;
        }
        const delay = getStoryTypewriterStepDurationMs(Number(currentCommand.talkTime) * 1000);
        const stepId = `${currentProcessId}:dialogue:${displayedCharacters}`;
        if (dialogueTypingClockRef.current.stepId !== stepId) {
            dialogueTypingClockRef.current = { stepId, elapsedMs: 0 };
        }
        const startedAt = performance.now();
        const timer = window.setTimeout(() => {
            dialogueTypingClockRef.current = { stepId: "", elapsedMs: 0 };
            const typewriterKey = visualState.dialogueBoxType === "center" ? "center" : "normal";
            const typewriterState = advanceStoryTypewriter(dialogueTypewriterRef.current[typewriterKey], visibleDialogueLength);
            dialogueTypewriterRef.current[typewriterKey] = typewriterState;
            setDisplayedCharacters(typewriterState.displayedCharacters);
            setDialogueTypingRevision((revision) => revision + 1);
            if (!typewriterState.typing) {
                setDialogueTypingProcessId("");
            }
        }, getStoryTimerRemainingMs(delay, dialogueTypingClockRef.current.elapsedMs));
        return () => {
            window.clearTimeout(timer);
            if (dialogueTypingClockRef.current.stepId === stepId) {
                dialogueTypingClockRef.current.elapsedMs += Math.max(performance.now() - startedAt, 0);
            }
        };
    }, [
        choices.length,
        audioUnlocked,
        currentCommand,
        centerTypingBlocked,
        currentProcessId,
        displayedCharacters,
        dialogueTypingRevision,
        isTyping,
        isLogOpen,
        isSkipOpen,
        isUiHidden,
        mode,
        visibleDialogueLength,
        visualState.dialogueBoxType,
    ]);
    useEffect(() => {
        if (mode !== "theater" ||
            !audioUnlocked ||
            isLogOpen ||
            isSkipOpen ||
            isUiHidden ||
            titleTypewriterManuallyFinished ||
            !visualState.titleText ||
            displayedSubtitleCharacters <
                getVisibleTextLength(visualState.subtitleText) ||
            displayedTitleCharacters >= getVisibleTextLength(visualState.titleText)) {
            return;
        }
        const stepId = `${currentProcessId}:title:${displayedTitleCharacters}`;
        if (titleTypingClockRef.current.stepId !== stepId) {
            titleTypingClockRef.current = { stepId, elapsedMs: 0 };
        }
        const startedAt = performance.now();
        const timer = window.setTimeout(() => {
            titleTypingClockRef.current = { stepId: "", elapsedMs: 0 };
            if (shouldPlayStoryTitleTypingSound(visualState.titleText, displayedTitleCharacters)) {
                playTitleTypingSound();
            }
            setDisplayedTitleCharacters((current) => current + 1);
        }, getStoryTimerRemainingMs(getStoryStartedTypewriterStepDurationMs(visualState.titleTalkTimeMs), titleTypingClockRef.current.elapsedMs));
        return () => {
            window.clearTimeout(timer);
            if (titleTypingClockRef.current.stepId === stepId) {
                titleTypingClockRef.current.elapsedMs += Math.max(performance.now() - startedAt, 0);
            }
        };
    }, [
        audioUnlocked,
        displayedSubtitleCharacters,
        displayedTitleCharacters,
        currentProcessId,
        isLogOpen,
        isSkipOpen,
        isUiHidden,
        mode,
        playTitleTypingSound,
        titleTypewriterManuallyFinished,
        visualState.subtitleText,
        visualState.titleTalkTimeMs,
        visualState.titleText,
    ]);
    useEffect(() => {
        if (mode !== "theater" ||
            !audioUnlocked ||
            isLogOpen ||
            isSkipOpen ||
            isUiHidden ||
            titleTypewriterManuallyFinished ||
            !visualState.subtitleText ||
            displayedSubtitleCharacters >=
                getVisibleTextLength(visualState.subtitleText)) {
            return;
        }
        const stepId = `${currentProcessId}:subtitle:${displayedSubtitleCharacters}`;
        if (subtitleTypingClockRef.current.stepId !== stepId) {
            subtitleTypingClockRef.current = { stepId, elapsedMs: 0 };
        }
        const startedAt = performance.now();
        const timer = window.setTimeout(() => {
            subtitleTypingClockRef.current = { stepId: "", elapsedMs: 0 };
            if (shouldPlayStoryTitleTypingSound(visualState.subtitleText, displayedSubtitleCharacters)) {
                playTitleTypingSound();
            }
            setDisplayedSubtitleCharacters((current) => current + 1);
        }, getStoryTimerRemainingMs(getStoryStartedTypewriterStepDurationMs(visualState.subtitleTalkTimeMs), subtitleTypingClockRef.current.elapsedMs));
        return () => {
            window.clearTimeout(timer);
            if (subtitleTypingClockRef.current.stepId === stepId) {
                subtitleTypingClockRef.current.elapsedMs += Math.max(performance.now() - startedAt, 0);
            }
        };
    }, [
        audioUnlocked,
        currentProcessId,
        displayedSubtitleCharacters,
        isLogOpen,
        isSkipOpen,
        isUiHidden,
        mode,
        playTitleTypingSound,
        titleTypewriterManuallyFinished,
        visualState.subtitleTalkTimeMs,
        visualState.subtitleText,
    ]);
    useEffect(() => {
        if (!audioUnlocked) {
            return;
        }
        const path = mode === "theater"
            ? visualState.bgmPath
            : episodePlaybackBgmPath ?? selectedEpisode?.bgmPath;
        const shouldRestart = mode === "theater" &&
            visualState.bgmRestart &&
            visualState.bgmRevision !== appliedBgmRevisionRef.current;
        playBgm(path ?? "", mode === "theater" ? visualState.bgmVolume : 1, mode === "theater" ? visualState.bgmStartTime : undefined, shouldRestart);
        appliedBgmRevisionRef.current = visualState.bgmRevision;
    }, [
        audioUnlocked,
        episodePlaybackBgmPath,
        mode,
        playBgm,
        selectedEpisode?.bgmPath,
        visualState.bgmPath,
        visualState.bgmRestart,
        visualState.bgmRevision,
        visualState.bgmStartTime,
        visualState.bgmVolume,
    ]);
    useEffect(() => () => {
        if (ownsThemeAudioRef.current &&
            !preserveThemeOnUnmountRef.current) {
            stopStoryTheme();
        }
    }, []);
    useEffect(() => {
        if (!audioUnlocked || mode !== "theater") {
            return;
        }
        if (!currentVoicePath || !currentVoiceProcessId) {
            startedVoiceProcessIdRef.current = "";
            return;
        }
        if (startedVoiceProcessIdRef.current === currentVoiceProcessId) {
            return;
        }
        startedVoiceProcessIdRef.current = currentVoiceProcessId;
        setEndedVoiceProcessId("");
        playVoice(currentVoicePath, currentVoiceProcessId);
    }, [
        audioUnlocked,
        currentVoicePath,
        currentVoiceProcessId,
        mode,
        playVoice,
    ]);
    useEffect(() => {
        if (mode !== "theater") {
            return;
        }
        const moviePaused = isUiHidden || (isSkipOpen && isMovieCommand);
        if (moviePaused) {
            movieRef.current?.pause();
            return;
        }
        if (audioUnlocked) {
            void movieRef.current?.play().catch(() => undefined);
        }
    }, [audioUnlocked, isMovieCommand, isSkipOpen, isUiHidden, mode]);
    useEffect(() => {
        if (mode !== "theater" ||
            !currentCommand?.movieName ||
            currentCommand.movieUrl ||
            processedCommandRef.current !== currentProcessId) {
            return;
        }
        // NKCUIComVideoPlayer.Play가 이름에 해당하는 리소스를 열지 못하면
        // VideoPlayMessageCallback의 실패 분기가 즉시 ApplyNextCut을 호출한다.
        // 파일이 없는 PV에서도 waitClick 상태로 멈추지 않고 같은 결과를 낸다.
        const timer = window.setTimeout(() => {
            goToCommand(commandIndex + 1);
        }, 0);
        return () => window.clearTimeout(timer);
    }, [
        commandIndex,
        currentCommand?.movieName,
        currentCommand?.movieUrl,
        currentProcessId,
        goToCommand,
        mode,
    ]);
    useEffect(() => {
        if (mode !== "theater" ||
            !currentCommand?.movieUrl ||
            preparedMovieProcessId === currentProcessId) {
            return;
        }
        // 컷신 영상은 클라이언트에서 forcePlay=true로 재생한다.
        // NKCUIComVideoPlayer.VideoPlayProcess와 같은 15초 준비 제한을 두어
        // 브라우저가 오류 이벤트조차 내지 않는 경우에도 장면을 계속 진행한다.
        const timer = window.setTimeout(() => {
            movieRef.current?.pause();
            goToCommand(commandIndex + 1);
        }, STORY_MOVIE_PREPARE_WAIT_LIMIT_MS);
        return () => window.clearTimeout(timer);
    }, [
        commandIndex,
        currentCommand?.movieUrl,
        currentProcessId,
        goToCommand,
        mode,
        preparedMovieProcessId,
    ]);
    useEffect(() => () => stopLoopEffects(), [stopLoopEffects]);
    useEffect(() => () => stopAllVoices(), [stopAllVoices]);
    const setStageRouteRubber = useCallback((route: HTMLElement, rubber: number) => {
        const safeRubber = Number.isFinite(rubber) ? rubber : 0;
        stageRouteRubberRef.current = safeRubber;
        route.style.setProperty("--story-stage-rubber-x", `${safeRubber}px`);
        route.dataset.storyOperationStageRubberX = safeRubber.toFixed(3);
    }, []);
    const cancelStageRouteMotion = useCallback(() => {
        if (stageRouteMotionFrameRef.current !== null) {
            window.cancelAnimationFrame(stageRouteMotionFrameRef.current);
            stageRouteMotionFrameRef.current = null;
        }
    }, []);
    const stopStageRouteMotion = useCallback((route: HTMLElement | null = stageRouteRef.current) => {
        cancelStageRouteMotion();
        stageRouteVelocityRef.current = 0;
        if (route) {
            setStageRouteRubber(route, 0);
            route.dataset.storyOperationStageMotion = "idle";
            route.dataset.storyOperationStageRawBoundary = "false";
            route.dataset.storyUnityScrollrectVelocity = "0.000";
        }
        else {
            stageRouteRubberRef.current = 0;
        }
    }, [cancelStageRouteMotion, setStageRouteRubber]);
    const getStageRouteVisualPosition = useCallback((route: HTMLElement) => route.scrollLeft - stageRouteRubberRef.current, []);
    const getStageRouteCanvasScale = useCallback((route: HTMLElement) => {
        const canvas = route.querySelector<HTMLElement>('[data-story-operation-stage-canvas-scale="STV-MAP-042"]');
        const referenceHeight = Number.parseFloat(canvas?.style.getPropertyValue("--stage-map-reference-height") ?? "");
        const renderedHeight = canvas?.getBoundingClientRect().height ?? 0;
        const scale = renderedHeight / referenceHeight;
        return Number.isFinite(scale) && scale > 0 ? scale : 1;
    }, []);
    const applyStageRouteDragPosition = useCallback((route: HTMLElement, desiredVisualPosition: number) => {
        const frame = getStoryUnityScrollRectDragFrame(desiredVisualPosition, route.scrollWidth - route.clientWidth, route.clientWidth);
        route.scrollLeft = frame.scrollPosition;
        setStageRouteRubber(route, frame.rubber);
        route.dataset.storyOperationStageMotion = "dragging";
        route.dataset.storyOperationStageRawBoundary = "false";
    }, [setStageRouteRubber]);
    const startStageRouteReleaseMotion = useCallback((route: HTMLElement, initialVelocity: number, { firstElasticity }: {
        firstElasticity?: number;
    } = {}) => {
        cancelStageRouteMotion();
        stageRouteVelocityRef.current = initialVelocity;
        let lastTime = performance.now();
        const minimumVelocity = getStageRouteCanvasScale(route);
        let pendingFirstElasticity = firstElasticity;
        const update = (currentTime: number) => {
            const deltaTime = Math.max((currentTime - lastTime) / 1000, 0);
            lastTime = currentTime;
            const frame = getStoryUnityScrollRectReleaseFrame({
                visualPosition: getStageRouteVisualPosition(route),
                maximum: route.scrollWidth - route.clientWidth,
                velocity: stageRouteVelocityRef.current,
                deltaTime,
                elasticity: pendingFirstElasticity,
                minimumVelocity,
            });
            pendingFirstElasticity = undefined;
            stageRouteVelocityRef.current = frame.velocity;
            route.dataset.storyUnityScrollrectVelocity = frame.velocity.toFixed(3);
            route.scrollLeft = frame.scrollPosition;
            setStageRouteRubber(route, frame.rubber);
            route.dataset.storyOperationStageMotion = frame.motion;
            route.dataset.storyOperationStageRawBoundary = String(frame.motion === "inertia-boundary");
            if (frame.motion === "inertia-boundary") {
                route.dataset.storyUnityScrollrectRawBoundaryObserved = "true";
            }
            if (frame.motion === "idle" ||
                (frame.motion === "elastic" &&
                    Math.abs(frame.rubber) <= 0.05 &&
                    frame.velocity === 0)) {
                stopStageRouteMotion(route);
                return;
            }
            stageRouteMotionFrameRef.current = window.requestAnimationFrame(update);
        };
        stageRouteMotionFrameRef.current = window.requestAnimationFrame(update);
    }, [
        cancelStageRouteMotion,
        getStageRouteCanvasScale,
        getStageRouteVisualPosition,
        setStageRouteRubber,
        stopStageRouteMotion,
    ]);
    const finishStageRoutePointer = useCallback(({ initialTarget, finalTarget, startX, startY, endX, endY, cancelled, }: {
        initialTarget: EventTarget | null;
        finalTarget: EventTarget | null;
        startX: number;
        startY: number;
        endX: number;
        endY: number;
        cancelled: boolean;
    }) => {
        const startsOnControl = initialTarget instanceof Element &&
            Boolean(initialTarget.closest("button, a, input"));
        const endsOnControl = finalTarget instanceof Element &&
            Boolean(finalTarget.closest("button, a, input"));
        if (cancelled ||
            startsOnControl ||
            endsOnControl ||
            Math.hypot(endX - startX, endY - startY) >= 100) {
            return;
        }
        setSelectedStageId(0);
        setIsStageInfoOpen(false);
    }, []);
    const beginStageRouteDrag = useCallback((route: HTMLElement) => {
        route.dataset.storyOperationStageMotion = "dragging";
        route.dataset.storyOperationStageRawBoundary = "false";
    }, []);
    const endStageRouteDrag = useCallback((route: HTMLElement, velocity: number) => {
        startStageRouteReleaseMotion(route, velocity);
    }, [startStageRouteReleaseMotion]);
    const stageRoutePointer = useStoryUnityScrollRectPointer({
        enabled: mode === "episode",
        axis: "horizontal",
        viewportRef: stageRouteRef,
        velocityRef: stageRouteVelocityRef,
        getVisualPosition: getStageRouteVisualPosition,
        applyDragPosition: applyStageRouteDragPosition,
        cancelReleaseMotion: cancelStageRouteMotion,
        onDragStart: beginStageRouteDrag,
        onDragEnd: endStageRouteDrag,
        onPointerFinish: finishStageRoutePointer,
    });
    const setCounterCaseScrollRubber = useCallback((scroll: HTMLElement, rubber: number) => {
        const safeRubber = Number.isFinite(rubber) ? rubber : 0;
        counterCaseScrollRubberRef.current = safeRubber;
        scroll.style.setProperty("--story-countercase-scroll-rubber-y", `${safeRubber}px`);
        scroll.dataset.storyCountercaseScrollRubberY = safeRubber.toFixed(3);
    }, []);
    const cancelCounterCaseScrollMotion = useCallback(() => {
        if (counterCaseScrollMotionFrameRef.current !== null) {
            window.cancelAnimationFrame(counterCaseScrollMotionFrameRef.current);
            counterCaseScrollMotionFrameRef.current = null;
        }
        const previousScroll = counterCaseScrollMotionElementRef.current;
        counterCaseScrollMotionElementRef.current = null;
        if (previousScroll) {
            previousScroll.dataset.storyCountercaseScrollMotion =
                counterCaseLoopWheelDraggingRef.current ? "wheel-dragging" : "idle";
        }
    }, []);
    const syncCounterCaseInactiveScrollDrag = useCallback((scroll: HTMLElement, currentTime = performance.now()) => {
        const drag = counterCaseScrollDragRef.current;
        if (!drag ||
            drag.scroll !== scroll ||
            !drag.dragging ||
            drag.scrollRectDragging) {
            return;
        }
        drag.lastVisualPosition =
            scroll.scrollTop - counterCaseScrollRubberRef.current;
        drag.lastTime = currentTime;
        drag.velocity = counterCaseScrollVelocityRef.current;
    }, []);
    const stopCounterCaseScrollMotion = useCallback((scroll: HTMLElement | null) => {
        cancelCounterCaseScrollMotion();
        counterCaseScrollVelocityRef.current = 0;
        counterCaseScrollRubberVelocityRef.current = 0;
        counterCaseScrollNextSmoothTimeRef.current =
            STORY_COUNTERCASE_SCROLL_ELASTICITY;
        counterCaseLoopWheelDraggingRef.current = false;
        if (scroll) {
            setCounterCaseScrollRubber(scroll, 0);
            scroll.dataset.storyCountercaseScrollMotion = "idle";
            scroll.dataset.storyCountercaseScrollVelocity = "0.000";
            syncCounterCaseInactiveScrollDrag(scroll);
        }
        else {
            counterCaseScrollRubberRef.current = 0;
        }
    }, [
        cancelCounterCaseScrollMotion,
        setCounterCaseScrollRubber,
        syncCounterCaseInactiveScrollDrag,
    ]);
    const startCounterCaseLoopWheelVelocityTracking = useCallback((scroll: HTMLElement, previousVisualPosition: number) => {
        cancelCounterCaseScrollMotion();
        counterCaseLoopWheelDraggingRef.current = true;
        counterCaseScrollMotionElementRef.current = scroll;
        let lastVisualPosition = previousVisualPosition;
        let lastTime = performance.now();
        const update = (currentTime: number) => {
            if (counterCaseScrollMotionElementRef.current !== scroll ||
                !counterCaseLoopWheelDraggingRef.current) {
                return;
            }
            const deltaTime = Math.min(Math.max((currentTime - lastTime) / 1000, 1 / 240), 0.05);
            lastTime = currentTime;
            const visualPosition = scroll.scrollTop - counterCaseScrollRubberRef.current;
            const instantaneousVelocity = (visualPosition - lastVisualPosition) / deltaTime;
            const velocity = counterCaseScrollVelocityRef.current +
                (instantaneousVelocity - counterCaseScrollVelocityRef.current) *
                    Math.min(deltaTime * 10, 1);
            counterCaseScrollVelocityRef.current = velocity;
            counterCaseScrollRubberVelocityRef.current = -velocity;
            lastVisualPosition = visualPosition;
            scroll.dataset.storyCountercaseScrollVelocity = velocity.toFixed(3);
            scroll.dataset.storyCountercaseScrollMotion = "wheel-dragging";
            counterCaseScrollMotionFrameRef.current =
                window.requestAnimationFrame(update);
        };
        scroll.dataset.storyCountercaseScrollMotion = "wheel-dragging";
        counterCaseScrollMotionFrameRef.current =
            window.requestAnimationFrame(update);
    }, [cancelCounterCaseScrollMotion]);
    const cancelCounterCaseScrollDragVelocityTracking = useCallback(() => {
        if (counterCaseScrollDragVelocityFrameRef.current !== null) {
            window.cancelAnimationFrame(counterCaseScrollDragVelocityFrameRef.current);
            counterCaseScrollDragVelocityFrameRef.current = null;
        }
    }, []);
    const startCounterCaseScrollDragVelocityTracking = useCallback((scroll: HTMLElement, preserveBaseline = false, baselineTime = performance.now()) => {
        cancelCounterCaseScrollDragVelocityTracking();
        const drag = counterCaseScrollDragRef.current;
        if (!drag || drag.scroll !== scroll || !drag.dragging) {
            return;
        }
        if (!preserveBaseline) {
            drag.lastVisualPosition =
                scroll.scrollTop - counterCaseScrollRubberRef.current;
            drag.lastTime = baselineTime;
        }
        const update = (currentTime: number) => {
            const activeDrag = counterCaseScrollDragRef.current;
            if (!activeDrag ||
                activeDrag !== drag ||
                activeDrag.scroll !== scroll ||
                !activeDrag.dragging ||
                !activeDrag.scrollRectDragging) {
                counterCaseScrollDragVelocityFrameRef.current = null;
                return;
            }
            const deltaTime = Math.min(Math.max((currentTime - activeDrag.lastTime) / 1000, 1 / 240), 0.05);
            const visualPosition = scroll.scrollTop - counterCaseScrollRubberRef.current;
            const instantaneousVelocity = (visualPosition - activeDrag.lastVisualPosition) / deltaTime;
            activeDrag.velocity +=
                (instantaneousVelocity - activeDrag.velocity) *
                    Math.min(deltaTime * 10, 1);
            activeDrag.lastVisualPosition = visualPosition;
            activeDrag.lastTime = currentTime;
            counterCaseScrollVelocityRef.current = activeDrag.velocity;
            counterCaseScrollRubberVelocityRef.current = -activeDrag.velocity;
            scroll.dataset.storyCountercaseScrollVelocity =
                activeDrag.velocity.toFixed(3);
            counterCaseScrollDragVelocityFrameRef.current =
                window.requestAnimationFrame(update);
        };
        counterCaseScrollDragVelocityFrameRef.current =
            window.requestAnimationFrame(update);
    }, [cancelCounterCaseScrollDragVelocityTracking]);
    const startCounterCaseScrollReleaseMotion = useCallback((scroll: HTMLElement, initialVelocity: number, firstSmoothTime = STORY_COUNTERCASE_SCROLL_ELASTICITY) => {
        cancelCounterCaseScrollMotion();
        counterCaseLoopWheelDraggingRef.current = false;
        counterCaseScrollMotionElementRef.current = scroll;
        counterCaseScrollVelocityRef.current = Number.isFinite(initialVelocity)
            ? initialVelocity
            : 0;
        counterCaseScrollRubberVelocityRef.current =
            -counterCaseScrollVelocityRef.current;
        counterCaseScrollNextSmoothTimeRef.current = firstSmoothTime;
        let lastTime = performance.now();
        const update = (currentTime: number) => {
            if (counterCaseScrollMotionElementRef.current !== scroll) {
                return;
            }
            const deltaTime = Math.min(Math.max((currentTime - lastTime) / 1000, 0), 0.05);
            lastTime = currentTime;
            const canvasScale = getCounterCaseScrollCanvasScale(scroll);
            let rubber = counterCaseScrollRubberRef.current;
            if (rubber !== 0) {
                const smoothTime = counterCaseScrollNextSmoothTimeRef.current;
                counterCaseScrollNextSmoothTimeRef.current =
                    STORY_COUNTERCASE_SCROLL_ELASTICITY;
                const smoothed = smoothCounterCaseScrollRubber(rubber, counterCaseScrollRubberVelocityRef.current, deltaTime, smoothTime);
                rubber = smoothed.value;
                let smoothedVelocity = smoothed.velocity;
                const isLoop = scroll.dataset.storyCountercaseScrollPhysicsTarget === "acts";
                if (!isLoop && Math.abs(smoothedVelocity) < canvasScale) {
                    // Unity ScrollRect snaps each SmoothDamp velocity axis below one
                    // local unit/s. LoopScrollRect deliberately keeps its longer tail.
                    smoothedVelocity = 0;
                }
                counterCaseScrollRubberVelocityRef.current = smoothedVelocity;
                counterCaseScrollVelocityRef.current = -smoothedVelocity;
                scroll.dataset.storyCountercaseScrollVelocity =
                    (-smoothedVelocity).toFixed(3);
                setCounterCaseScrollRubber(scroll, rubber);
                scroll.dataset.storyCountercaseScrollMotion = "spring";
                if (Math.abs(rubber) <= 0.05 &&
                    Math.abs(smoothedVelocity) <= canvasScale) {
                    stopCounterCaseScrollMotion(scroll);
                    return;
                }
            }
            else {
                const velocity = counterCaseScrollVelocityRef.current *
                    Math.pow(STORY_COUNTERCASE_SCROLL_DECELERATION_RATE, deltaTime);
                counterCaseScrollVelocityRef.current = velocity;
                counterCaseScrollRubberVelocityRef.current = -velocity;
                scroll.dataset.storyCountercaseScrollVelocity = velocity.toFixed(3);
                if (Math.abs(velocity) < canvasScale) {
                    stopCounterCaseScrollMotion(scroll);
                    return;
                }
                const maximumScrollTop = getCounterCaseScrollMaximum(scroll);
                const desiredScrollTop = scroll.scrollTop + velocity * deltaTime;
                const clampedScrollTop = Math.min(maximumScrollTop, Math.max(0, desiredScrollTop));
                scroll.scrollTop = clampedScrollTop;
                scroll.dataset.storyCountercaseScrollMotion = "inertia";
                if (desiredScrollTop !== clampedScrollTop) {
                    // LateUpdate crossed the boundary from an in-bounds frame. Unity
                    // first writes this raw position; the next frame sees the offset
                    // and enters SmoothDamp.
                    rubber = clampedScrollTop - desiredScrollTop;
                    setCounterCaseScrollRubber(scroll, rubber);
                    counterCaseScrollRubberVelocityRef.current = -velocity;
                }
            }
            syncCounterCaseInactiveScrollDrag(scroll, currentTime);
            counterCaseScrollMotionFrameRef.current =
                window.requestAnimationFrame(update);
        };
        if (counterCaseScrollRubberRef.current === 0 &&
            Math.abs(counterCaseScrollVelocityRef.current) <
                getCounterCaseScrollCanvasScale(scroll)) {
            stopCounterCaseScrollMotion(scroll);
            return;
        }
        scroll.dataset.storyCountercaseScrollMotion =
            counterCaseScrollRubberRef.current !== 0
                ? "spring"
                : "inertia";
        counterCaseScrollMotionFrameRef.current =
            window.requestAnimationFrame(update);
    }, [
        cancelCounterCaseScrollMotion,
        setCounterCaseScrollRubber,
        stopCounterCaseScrollMotion,
        syncCounterCaseInactiveScrollDrag,
    ]);
    const scheduleCounterCaseScrollClickReset = useCallback(() => {
        if (counterCaseScrollSuppressClickResetTimerRef.current !== null) {
            window.clearTimeout(counterCaseScrollSuppressClickResetTimerRef.current);
        }
        counterCaseScrollSuppressClickResetTimerRef.current = window.setTimeout(() => {
            counterCaseScrollSuppressClickRef.current = false;
            counterCaseScrollSuppressClickResetTimerRef.current = null;
        }, 0);
    }, []);
    const handleCounterCaseScrollPointerDown = useCallback((event: React.PointerEvent<HTMLElement>) => {
        if (event.button !== 0 || !event.isPrimary) {
            return;
        }
        if (counterCaseScrollSuppressClickResetTimerRef.current !== null) {
            window.clearTimeout(counterCaseScrollSuppressClickResetTimerRef.current);
            counterCaseScrollSuppressClickResetTimerRef.current = null;
        }
        counterCaseScrollSuppressClickRef.current = false;
        const scroll = event.currentTarget;
        const isLoopWheelDragging = counterCaseLoopWheelDraggingRef.current &&
            counterCaseScrollMotionElementRef.current === scroll;
        const shouldContinueSpring = counterCaseScrollRubberRef.current !== 0 &&
            !isLoopWheelDragging;
        if (!isLoopWheelDragging) {
            cancelCounterCaseScrollMotion();
        }
        counterCaseScrollVelocityRef.current = 0;
        counterCaseScrollRubberVelocityRef.current = 0;
        if (shouldContinueSpring) {
            // InitializePotentialDrag only zeroes the shared velocity. A boundary
            // SmoothDamp keeps running until OnBeginDrag actually starts.
            startCounterCaseScrollReleaseMotion(scroll, 0, counterCaseScrollNextSmoothTimeRef.current);
        }
        const visualPosition = scroll.scrollTop - counterCaseScrollRubberRef.current;
        counterCaseScrollDragRef.current = {
            scroll,
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            startVisualPosition: visualPosition,
            lastVisualPosition: visualPosition,
            lastTime: event.timeStamp,
            velocity: 0,
            dragging: false,
            scrollRectDragging: false,
        };
        scroll.dataset.storyCountercaseScrollMotion = "pointer-pending";
    }, [cancelCounterCaseScrollMotion, startCounterCaseScrollReleaseMotion]);
    const updateCounterCaseScrollPointer = useCallback((scroll: HTMLElement, pointerId: number, clientX: number, clientY: number, timeStamp: number, preventDefault: () => void) => {
        const drag = counterCaseScrollDragRef.current;
        if (!drag ||
            drag.scroll !== scroll ||
            drag.pointerId !== pointerId) {
            return;
        }
        const deltaX = clientX - drag.startX;
        let deltaY = clientY - drag.startY;
        if (!drag.dragging &&
            Math.hypot(deltaX, deltaY) <
                STORY_COUNTERCASE_SCROLL_DRAG_THRESHOLD) {
            return;
        }
        if (!drag.dragging) {
            drag.dragging = true;
            drag.scrollRectDragging = true;
            counterCaseLoopWheelDraggingRef.current = false;
            cancelCounterCaseScrollMotion();
            counterCaseScrollSuppressClickRef.current = true;
            if (!scroll.hasPointerCapture(pointerId)) {
                try {
                    scroll.setPointerCapture(pointerId);
                }
                catch {
                    // A window-level listener keeps tracking if capture is unavailable.
                }
            }
            // EventSystem invokes OnBeginDrag at the threshold-crossing cursor and
            // ScrollRect captures both pointer/content starts there. Its same-frame
            // OnDrag delta is therefore zero; the first 50 screen pixels are not a
            // content jump or a source of release velocity.
            const visualPosition = scroll.scrollTop - counterCaseScrollRubberRef.current;
            drag.startX = clientX;
            drag.startY = clientY;
            drag.startVisualPosition = visualPosition;
            drag.lastVisualPosition = visualPosition;
            drag.lastTime = timeStamp;
            drag.velocity = counterCaseScrollVelocityRef.current;
            deltaY = 0;
            startCounterCaseScrollDragVelocityTracking(scroll, false, timeStamp);
        }
        preventDefault();
        const desiredScrollTop = drag.startVisualPosition - deltaY;
        const maximumScrollTop = getCounterCaseScrollMaximum(scroll);
        const clampedScrollTop = Math.min(maximumScrollTop, Math.max(0, desiredScrollTop));
        let rubber = 0;
        if (desiredScrollTop < 0) {
            rubber = getCounterCaseScrollRubberDelta(-desiredScrollTop, scroll.clientHeight);
        }
        else if (desiredScrollTop > maximumScrollTop) {
            rubber = -getCounterCaseScrollRubberDelta(desiredScrollTop - maximumScrollTop, scroll.clientHeight);
        }
        scroll.scrollTop = clampedScrollTop;
        setCounterCaseScrollRubber(scroll, rubber);
        scroll.dataset.storyCountercaseScrollMotion = "drag";
        if (!drag.scrollRectDragging &&
            counterCaseScrollMotionFrameRef.current === null) {
            // LoopScrollRect.MovePosition can clear m_Dragging while the pointer
            // gesture remains alive. Later OnDrag calls still write Content, and
            // the next LateUpdate must resume spring/prev-position maintenance.
            startCounterCaseScrollReleaseMotion(scroll, counterCaseScrollVelocityRef.current);
        }
    }, [
        cancelCounterCaseScrollMotion,
        setCounterCaseScrollRubber,
        startCounterCaseScrollDragVelocityTracking,
        startCounterCaseScrollReleaseMotion,
    ]);
    const completeCounterCaseScrollPointer = useCallback((scroll: HTMLElement, pointerId: number, preventDefault: () => void) => {
        const drag = counterCaseScrollDragRef.current;
        if (!drag ||
            drag.scroll !== scroll ||
            drag.pointerId !== pointerId) {
            return;
        }
        if (scroll.hasPointerCapture(pointerId)) {
            scroll.releasePointerCapture(pointerId);
        }
        cancelCounterCaseScrollDragVelocityTracking();
        counterCaseScrollDragRef.current = null;
        if (drag.dragging) {
            preventDefault();
            counterCaseLoopWheelDraggingRef.current = false;
            const hasCurrentMotion = counterCaseScrollMotionElementRef.current === scroll &&
                counterCaseScrollMotionFrameRef.current !== null;
            if (drag.scrollRectDragging) {
                startCounterCaseScrollReleaseMotion(scroll, drag.velocity);
            }
            else if (!hasCurrentMotion &&
                counterCaseScrollRubberRef.current !== 0) {
                startCounterCaseScrollReleaseMotion(scroll, counterCaseScrollVelocityRef.current);
            }
            else if (!hasCurrentMotion) {
                scroll.dataset.storyCountercaseScrollMotion = "idle";
            }
            scheduleCounterCaseScrollClickReset();
            return;
        }
        const hasCurrentMotion = counterCaseScrollMotionElementRef.current === scroll &&
            counterCaseScrollMotionFrameRef.current !== null;
        if (!hasCurrentMotion &&
            !counterCaseLoopWheelDraggingRef.current &&
            counterCaseScrollRubberRef.current !== 0) {
            startCounterCaseScrollReleaseMotion(scroll, counterCaseScrollVelocityRef.current);
        }
        else if (!hasCurrentMotion) {
            scroll.dataset.storyCountercaseScrollMotion =
                counterCaseLoopWheelDraggingRef.current ? "wheel-dragging" : "idle";
        }
    }, [
        cancelCounterCaseScrollDragVelocityTracking,
        scheduleCounterCaseScrollClickReset,
        startCounterCaseScrollReleaseMotion,
    ]);
    const cancelCounterCaseScrollPointer = useCallback((scroll: HTMLElement, pointerId: number) => {
        const drag = counterCaseScrollDragRef.current;
        if (!drag ||
            drag.scroll !== scroll ||
            drag.pointerId !== pointerId) {
            return;
        }
        cancelCounterCaseScrollDragVelocityTracking();
        counterCaseScrollDragRef.current = null;
        if (drag.dragging) {
            counterCaseLoopWheelDraggingRef.current = false;
            counterCaseScrollSuppressClickRef.current = true;
            const hasCurrentMotion = counterCaseScrollMotionElementRef.current === scroll &&
                counterCaseScrollMotionFrameRef.current !== null;
            if (drag.scrollRectDragging) {
                startCounterCaseScrollReleaseMotion(scroll, drag.velocity);
            }
            else if (!hasCurrentMotion &&
                counterCaseScrollRubberRef.current !== 0) {
                startCounterCaseScrollReleaseMotion(scroll, counterCaseScrollVelocityRef.current);
            }
            else if (!hasCurrentMotion) {
                scroll.dataset.storyCountercaseScrollMotion = "idle";
            }
            scheduleCounterCaseScrollClickReset();
            return;
        }
        const hasCurrentMotion = counterCaseScrollMotionElementRef.current === scroll &&
            counterCaseScrollMotionFrameRef.current !== null;
        if (!hasCurrentMotion &&
            !counterCaseLoopWheelDraggingRef.current &&
            counterCaseScrollRubberRef.current !== 0) {
            startCounterCaseScrollReleaseMotion(scroll, counterCaseScrollVelocityRef.current);
        }
        else if (!hasCurrentMotion) {
            scroll.dataset.storyCountercaseScrollMotion =
                counterCaseLoopWheelDraggingRef.current ? "wheel-dragging" : "idle";
        }
    }, [
        cancelCounterCaseScrollDragVelocityTracking,
        scheduleCounterCaseScrollClickReset,
        startCounterCaseScrollReleaseMotion,
    ]);
    useEffect(() => {
        const handleWindowPointerMove = (event: PointerEvent) => {
            const drag = counterCaseScrollDragRef.current;
            if (!drag || drag.pointerId !== event.pointerId) {
                return;
            }
            updateCounterCaseScrollPointer(drag.scroll, event.pointerId, event.clientX, event.clientY, event.timeStamp, () => event.preventDefault());
        };
        const handleWindowPointerUp = (event: PointerEvent) => {
            const drag = counterCaseScrollDragRef.current;
            if (!drag || drag.pointerId !== event.pointerId) {
                return;
            }
            completeCounterCaseScrollPointer(drag.scroll, event.pointerId, () => event.preventDefault());
        };
        const handleWindowPointerCancel = (event: PointerEvent) => {
            const drag = counterCaseScrollDragRef.current;
            if (!drag || drag.pointerId !== event.pointerId) {
                return;
            }
            cancelCounterCaseScrollPointer(drag.scroll, event.pointerId);
        };
        window.addEventListener("pointermove", handleWindowPointerMove, {
            capture: true,
            passive: false,
        });
        window.addEventListener("pointerup", handleWindowPointerUp, true);
        window.addEventListener("pointercancel", handleWindowPointerCancel, true);
        return () => {
            window.removeEventListener("pointermove", handleWindowPointerMove, true);
            window.removeEventListener("pointerup", handleWindowPointerUp, true);
            window.removeEventListener("pointercancel", handleWindowPointerCancel, true);
            const drag = counterCaseScrollDragRef.current;
            if (drag?.scroll.hasPointerCapture(drag.pointerId)) {
                drag.scroll.releasePointerCapture(drag.pointerId);
            }
            cancelCounterCaseScrollDragVelocityTracking();
            counterCaseScrollDragRef.current = null;
        };
    }, [
        cancelCounterCaseScrollPointer,
        cancelCounterCaseScrollDragVelocityTracking,
        completeCounterCaseScrollPointer,
        updateCounterCaseScrollPointer,
    ]);
    const suppressCounterCaseScrollClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
        if (!counterCaseScrollSuppressClickRef.current) {
            return;
        }
        counterCaseScrollSuppressClickRef.current = false;
        if (counterCaseScrollSuppressClickResetTimerRef.current !== null) {
            window.clearTimeout(counterCaseScrollSuppressClickResetTimerRef.current);
            counterCaseScrollSuppressClickResetTimerRef.current = null;
        }
        event.preventDefault();
        event.stopPropagation();
    }, []);
    const handleCounterCaseScrollWheel = useCallback((scroll: HTMLElement, event: WheelEvent) => {
        const useHorizontalDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY);
        const dominantPixelDelta = useHorizontalDelta
            ? event.deltaX
            : event.deltaY;
        if (!Number.isFinite(dominantPixelDelta) || dominantPixelDelta === 0) {
            return;
        }
        event.preventDefault();
        const isLoop = scroll.dataset.storyCountercaseScrollPhysicsTarget === "acts";
        const canvasScale = getCounterCaseScrollCanvasScale(scroll);
        const wheelMultiplier = isLoop
            ? STORY_COUNTERCASE_SCROLL_LOOP_WHEEL_MULTIPLIER
            : STORY_COUNTERCASE_SCROLL_NORMAL_WHEEL_MULTIPLIER;
        const wheelDelta = (dominantPixelDelta /
            STORY_COUNTERCASE_SCROLL_WHEEL_PIXEL_TICK) *
            wheelMultiplier *
            canvasScale;
        const maximumScrollTop = getCounterCaseScrollMaximum(scroll);
        const currentVisualPosition = scroll.scrollTop - counterCaseScrollRubberRef.current;
        const desiredScrollTop = currentVisualPosition + wheelDelta;
        const clampedScrollTop = Math.min(maximumScrollTop, Math.max(0, desiredScrollTop));
        let rubber = 0;
        scroll.dataset.storyCountercaseScrollWheelAxis = useHorizontalDelta
            ? "horizontal-dominant"
            : "vertical-dominant";
        scroll.dataset.storyCountercaseScrollWheelDelta =
            wheelDelta.toFixed(3);
        scroll.dataset.storyCountercaseScrollCanvasScale =
            canvasScale.toFixed(6);
        if (isLoop) {
            // LoopScrollRect.OnScroll leaves m_Dragging true. CounterCase has no
            // dOnScrollEvent subscriber to release it, so wheel-only rubber stays;
            // LateUpdate still lerps the shared content velocity every frame.
            const isTrackingLoopWheel = counterCaseLoopWheelDraggingRef.current &&
                counterCaseScrollMotionElementRef.current === scroll &&
                counterCaseScrollMotionFrameRef.current !== null;
            if (desiredScrollTop < 0) {
                rubber =
                    getCounterCaseScrollRubberDelta(-desiredScrollTop, scroll.clientHeight) * STORY_COUNTERCASE_SCROLL_LOOP_WHEEL_RUBBER_SCALE;
            }
            else if (desiredScrollTop > maximumScrollTop) {
                rubber =
                    -getCounterCaseScrollRubberDelta(desiredScrollTop - maximumScrollTop, scroll.clientHeight) * STORY_COUNTERCASE_SCROLL_LOOP_WHEEL_RUBBER_SCALE;
            }
            scroll.scrollTop = clampedScrollTop;
            setCounterCaseScrollRubber(scroll, rubber);
            const pointerDrag = counterCaseScrollDragRef.current;
            if (pointerDrag?.scroll === scroll && pointerDrag.dragging) {
                // OnScroll and OnDrag share LoopScrollRect.m_Velocity. The pointer
                // LateUpdate tracker samples this wheel displacement on its next rAF.
                // MovePosition may have cleared the component drag and started a
                // release writer, so hand its latest shared velocity/baseline back
                // to the single pointer LateUpdate writer before reactivating it.
                const needsDragTracker = counterCaseScrollDragVelocityFrameRef.current === null;
                if (needsDragTracker) {
                    cancelCounterCaseScrollMotion();
                    pointerDrag.velocity = counterCaseScrollVelocityRef.current;
                }
                counterCaseLoopWheelDraggingRef.current = true;
                pointerDrag.scrollRectDragging = true;
                scroll.dataset.storyCountercaseScrollMotion = "drag";
                if (needsDragTracker) {
                    startCounterCaseScrollDragVelocityTracking(scroll, true);
                }
                return;
            }
            scroll.dataset.storyCountercaseScrollMotion = "wheel-dragging";
            if (!isTrackingLoopWheel) {
                startCounterCaseLoopWheelVelocityTracking(scroll, currentVisualPosition);
            }
            return;
        }
        // Unity ScrollRect.OnScroll applies the raw out-of-bounds position. Its
        // next LateUpdate uses elasticity * 3 once, then returns to .1.
        counterCaseLoopWheelDraggingRef.current = false;
        rubber = clampedScrollTop - desiredScrollTop;
        scroll.scrollTop = clampedScrollTop;
        setCounterCaseScrollRubber(scroll, rubber);
        const pointerDrag = counterCaseScrollDragRef.current;
        if (pointerDrag?.scroll === scroll &&
            pointerDrag.dragging) {
            // ScrollRect skips its spring/inertia branch while m_Dragging. The
            // same LateUpdate tracker folds wheel displacement into m_Velocity.
            scroll.dataset.storyCountercaseScrollMotion = "drag";
            return;
        }
        if (rubber !== 0) {
            counterCaseScrollNextSmoothTimeRef.current =
                STORY_COUNTERCASE_SCROLL_ELASTICITY * 3;
            if (counterCaseScrollMotionFrameRef.current === null) {
                startCounterCaseScrollReleaseMotion(scroll, counterCaseScrollVelocityRef.current, STORY_COUNTERCASE_SCROLL_ELASTICITY * 3);
            }
        }
        else if (counterCaseScrollMotionFrameRef.current === null) {
            scroll.dataset.storyCountercaseScrollMotion = "idle";
        }
    }, [
        cancelCounterCaseScrollMotion,
        setCounterCaseScrollRubber,
        startCounterCaseLoopWheelVelocityTracking,
        startCounterCaseScrollDragVelocityTracking,
        startCounterCaseScrollReleaseMotion,
    ]);
    useLayoutEffect(() => {
        if (mode !== "episode" || !isCounterCaseEpisode) {
            return;
        }
        const target = activeCounterCaseAct ? "normal" : "acts";
        const scroll = activeCounterCaseAct
            ? counterCaseNormalListRef.current
            : counterCaseViewerRef.current;
        if (!scroll) {
            return;
        }
        // NKCUIBase Hide/UnHide deactivates these two cached FullScreen roots.
        // Their raw Content position survives, while OnDisable clears velocity;
        // LoopScrollRect alone retains its sticky m_Dragging flag.
        cancelCounterCaseScrollDragVelocityTracking();
        cancelCounterCaseScrollMotion();
        const surfaceStates = counterCaseScrollSurfaceStatesRef.current;
        const savedState = surfaceStates[target];
        const maximumScrollTop = getCounterCaseScrollMaximum(scroll);
        const clampedScrollTop = Math.min(maximumScrollTop, Math.max(0, savedState.visualPosition));
        const restoredRubber = clampedScrollTop - savedState.visualPosition;
        scroll.scrollTop = clampedScrollTop;
        setCounterCaseScrollRubber(scroll, restoredRubber);
        counterCaseScrollVelocityRef.current = 0;
        counterCaseScrollRubberVelocityRef.current = 0;
        counterCaseScrollNextSmoothTimeRef.current =
            STORY_COUNTERCASE_SCROLL_ELASTICITY;
        counterCaseLoopWheelDraggingRef.current =
            target === "acts" && savedState.loopDragging;
        scroll.dataset.storyCountercaseScrollVelocity = "0.000";
        if (counterCaseLoopWheelDraggingRef.current) {
            startCounterCaseLoopWheelVelocityTracking(scroll, savedState.visualPosition);
        }
        else if (restoredRubber !== 0) {
            startCounterCaseScrollReleaseMotion(scroll, 0);
        }
        else {
            scroll.dataset.storyCountercaseScrollMotion = "idle";
        }
        const handleWheel = (event: WheelEvent) => {
            handleCounterCaseScrollWheel(scroll, event);
        };
        scroll.addEventListener("wheel", handleWheel, { passive: false });
        return () => {
            scroll.removeEventListener("wheel", handleWheel);
            if (counterCaseScrollPreSnapshotTargetRef.current === target) {
                counterCaseScrollPreSnapshotTargetRef.current = null;
            }
            else {
                const rubber = Number.parseFloat(scroll.dataset.storyCountercaseScrollRubberY ?? "0");
                surfaceStates[target] = {
                    visualPosition: scroll.scrollTop - (Number.isFinite(rubber) ? rubber : 0),
                    loopDragging: target === "acts" &&
                        (counterCaseLoopWheelDraggingRef.current ||
                            Boolean(counterCaseScrollDragRef.current?.scroll === scroll &&
                                counterCaseScrollDragRef.current.scrollRectDragging)),
                };
            }
            cancelCounterCaseScrollDragVelocityTracking();
            cancelCounterCaseScrollMotion();
            counterCaseScrollVelocityRef.current = 0;
            counterCaseScrollRubberVelocityRef.current = 0;
            counterCaseScrollNextSmoothTimeRef.current =
                STORY_COUNTERCASE_SCROLL_ELASTICITY;
            counterCaseLoopWheelDraggingRef.current = false;
            counterCaseScrollDragRef.current = null;
            counterCaseScrollSuppressClickRef.current = false;
            if (counterCaseScrollSuppressClickResetTimerRef.current !== null) {
                window.clearTimeout(counterCaseScrollSuppressClickResetTimerRef.current);
                counterCaseScrollSuppressClickResetTimerRef.current = null;
            }
        };
    }, [
        activeCounterCaseAct,
        cancelCounterCaseScrollDragVelocityTracking,
        cancelCounterCaseScrollMotion,
        handleCounterCaseScrollWheel,
        isCounterCaseEpisode,
        mode,
        setCounterCaseScrollRubber,
        startCounterCaseLoopWheelVelocityTracking,
        startCounterCaseScrollReleaseMotion,
    ]);
    useEffect(() => {
        if (!isOperationStageRouteHotkeyTopmost) {
            return;
        }
        // STV-MAP-055: NKCUIComScrollRectHotkey belongs to the normal operation
        // route itself. StageInfo is a child MonoBehaviour of the same viewer, so
        // it does not block these keys; only a real Popup above the viewer does.
        const pressedCodes = stageRouteHotkeyCodesRef.current;
        let lastTime = performance.now();
        let canvasScale = 1;
        const getDirection = () => {
            // The client checks Right before Left when both directions are held.
            if ([...STORY_OPERATION_STAGE_RIGHT_HOTKEY_CODES].some((code) => pressedCodes.has(code))) {
                return 1;
            }
            if ([...STORY_OPERATION_STAGE_LEFT_HOTKEY_CODES].some((code) => pressedCodes.has(code))) {
                return -1;
            }
            return 0;
        };
        const finishHotkeyScroll = () => {
            if (stageRouteHotkeyFrameRef.current !== null) {
                window.cancelAnimationFrame(stageRouteHotkeyFrameRef.current);
                stageRouteHotkeyFrameRef.current = null;
            }
            if (stageRouteHotkeyReleaseFrameRef.current !== null) {
                window.cancelAnimationFrame(stageRouteHotkeyReleaseFrameRef.current);
                stageRouteHotkeyReleaseFrameRef.current = null;
            }
            const route = stageRouteRef.current;
            if (!route) {
                return;
            }
            route.dataset.storyOperationStageHotkeyDirection = "idle";
            if (Math.abs(stageRouteRubberRef.current) <= 0.01) {
                return;
            }
            const releaseRubberAfterExistingMotion = () => {
                if (stageRouteRef.current !== route ||
                    Math.abs(stageRouteRubberRef.current) <= 0.01) {
                    stageRouteHotkeyReleaseFrameRef.current = null;
                    return;
                }
                if (stageRouteMotionFrameRef.current !== null) {
                    stageRouteHotkeyReleaseFrameRef.current =
                        window.requestAnimationFrame(releaseRubberAfterExistingMotion);
                    return;
                }
                stageRouteHotkeyReleaseFrameRef.current = null;
                startStageRouteReleaseMotion(route, 0);
            };
            releaseRubberAfterExistingMotion();
        };
        const applyHotkeyScroll = (route: HTMLElement, direction: number, deltaTime: number) => {
            const maxScrollLeft = Math.max(0, route.scrollWidth - route.clientWidth);
            const currentVisualPosition = route.scrollLeft - stageRouteRubberRef.current;
            const desiredScrollLeft = currentVisualPosition +
                direction *
                    STORY_OPERATION_STAGE_HOTKEY_SPEED *
                    canvasScale *
                    deltaTime;
            const clampedScrollLeft = Math.min(maxScrollLeft, Math.max(0, desiredScrollLeft));
            let rubber = 0;
            if (desiredScrollLeft < 0) {
                rubber = getStageRouteRubberDelta(-desiredScrollLeft, route.clientWidth);
            }
            else if (desiredScrollLeft > maxScrollLeft) {
                rubber = -getStageRouteRubberDelta(desiredScrollLeft - maxScrollLeft, route.clientWidth);
            }
            route.scrollLeft = clampedScrollLeft;
            setStageRouteRubber(route, rubber);
            route.dataset.storyOperationStageHotkeyDirection =
                direction > 0 ? "right" : "left";
        };
        const measureStageCanvasScale = (route: HTMLElement) => {
            const canvas = route.querySelector<HTMLElement>('[data-story-operation-stage-canvas-scale="STV-MAP-042"]');
            const referenceHeight = Number.parseFloat(canvas?.style.getPropertyValue("--stage-map-reference-height") ?? "");
            const renderedHeight = canvas?.getBoundingClientRect().height ?? 0;
            const nextScale = renderedHeight / referenceHeight;
            canvasScale =
                Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1;
            route.dataset.storyOperationStageHotkeyCanvasScale =
                canvasScale.toFixed(6);
        };
        const updateHotkeyScroll = (currentTime: number) => {
            const route = stageRouteRef.current;
            const direction = getDirection();
            if (!route || direction === 0) {
                finishHotkeyScroll();
                return;
            }
            const deltaTime = Math.min(Math.max((currentTime - lastTime) / 1000, 0), 0.05);
            lastTime = currentTime;
            applyHotkeyScroll(route, direction, deltaTime);
            stageRouteHotkeyFrameRef.current = window.requestAnimationFrame(updateHotkeyScroll);
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target;
            if (target instanceof HTMLElement &&
                (target.isContentEditable ||
                    target.matches("input, select, textarea, [role='textbox']"))) {
                return;
            }
            const hotkeyCode = getStoryOperationStageHorizontalHotkeyCode(event);
            if (!hotkeyCode) {
                return;
            }
            event.preventDefault();
            pressedCodes.add(hotkeyCode);
            const route = stageRouteRef.current;
            if (!route) {
                return;
            }
            if (stageRouteHotkeyReleaseFrameRef.current !== null) {
                window.cancelAnimationFrame(stageRouteHotkeyReleaseFrameRef.current);
                stageRouteHotkeyReleaseFrameRef.current = null;
            }
            measureStageCanvasScale(route);
            if (stageRouteHotkeyFrameRef.current !== null) {
                return;
            }
            applyHotkeyScroll(route, getDirection(), 1 / 60);
            lastTime = performance.now() + 1000 / 60;
            stageRouteHotkeyFrameRef.current = window.requestAnimationFrame(updateHotkeyScroll);
        };
        const handleKeyUp = (event: KeyboardEvent) => {
            const hotkeyCode = getStoryOperationStageHorizontalHotkeyCode(event);
            if (!hotkeyCode || !pressedCodes.delete(hotkeyCode)) {
                return;
            }
            event.preventDefault();
            if (getDirection() === 0) {
                finishHotkeyScroll();
            }
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
        isOperationStageRouteHotkeyTopmost,
        setStageRouteRubber,
        startStageRouteReleaseMotion,
    ]);
    useEffect(() => {
        // STV-MAP-057: the employee viewer and the selected employee's record
        // viewer are separate FullScreen roots. SetScrollHotKey is attached to
        // exactly one vertical ScrollRect in the current topmost root. Keep the
        // physical key set alive while another FullScreen/Popup is topmost so the
        // client's per-frame Input.GetKey polling resumes a held key immediately.
        const pressedCodes = counterCaseScrollHotkeyCodesRef.current;
        const getActiveScroll = () => activeCounterCaseAct
            ? counterCaseNormalListRef.current
            : counterCaseViewerRef.current;
        let lastTime = performance.now();
        let canvasScale = 1;
        const getDirection = () => {
            // Both client components check Up before Down when both are held.
            if ([...STORY_OPERATION_ACT_PREVIOUS_HOTKEY_CODES].some((code) => pressedCodes.has(code))) {
                return -1;
            }
            if ([...STORY_OPERATION_ACT_NEXT_HOTKEY_CODES].some((code) => pressedCodes.has(code))) {
                return 1;
            }
            return 0;
        };
        const finishHotkeyScroll = () => {
            if (counterCaseScrollHotkeyFrameRef.current !== null) {
                window.cancelAnimationFrame(counterCaseScrollHotkeyFrameRef.current);
                counterCaseScrollHotkeyFrameRef.current = null;
            }
            const scroll = getActiveScroll();
            if (scroll) {
                scroll.dataset.storyCountercaseScrollHotkeyDirection = "idle";
            }
        };
        const measureCanvasScale = (scroll: HTMLElement) => {
            canvasScale = getCounterCaseScrollCanvasScale(scroll);
            scroll.dataset.storyCountercaseScrollHotkeyCanvasScale =
                canvasScale.toFixed(6);
        };
        const applyHotkeyScroll = (scroll: HTMLElement, direction: number, deltaTime: number, forceRestartRelease = false) => {
            const maximumScrollTop = getCounterCaseScrollMaximum(scroll);
            const currentVisualPosition = scroll.scrollTop - counterCaseScrollRubberRef.current;
            const desiredScrollTop = currentVisualPosition +
                direction *
                    STORY_COUNTERCASE_SCROLL_HOTKEY_SPEED *
                    canvasScale *
                    deltaTime;
            const clampedScrollTop = Math.min(maximumScrollTop, Math.max(0, desiredScrollTop));
            // STV-MAP-058: both MovePosition implementations first clear the Loop
            // dragging flag, apply the raw delta, then let LateUpdate spring to bounds.
            const releasesLoopWheel = counterCaseLoopWheelDraggingRef.current &&
                counterCaseScrollMotionElementRef.current === scroll;
            const pointerDrag = counterCaseScrollDragRef.current;
            const isActivePointerDrag = pointerDrag?.scroll === scroll && pointerDrag.dragging;
            const isLoop = scroll.dataset.storyCountercaseScrollPhysicsTarget === "acts";
            const isStandardPointerDrag = isActivePointerDrag && !isLoop;
            counterCaseLoopWheelDraggingRef.current = false;
            scroll.scrollTop = clampedScrollTop;
            setCounterCaseScrollRubber(scroll, clampedScrollTop - desiredScrollTop);
            counterCaseScrollNextSmoothTimeRef.current =
                STORY_COUNTERCASE_SCROLL_ELASTICITY;
            if (isActivePointerDrag && isLoop && pointerDrag) {
                // LoopScrollRect.MovePosition clears its component m_Dragging flag.
                // Keep the gesture only for click suppression until PointerUp.
                pointerDrag.scrollRectDragging = false;
                cancelCounterCaseScrollDragVelocityTracking();
            }
            if (!isStandardPointerDrag &&
                (forceRestartRelease ||
                    releasesLoopWheel ||
                    counterCaseScrollMotionFrameRef.current === null)) {
                startCounterCaseScrollReleaseMotion(scroll, counterCaseScrollVelocityRef.current);
            }
            scroll.dataset.storyCountercaseScrollHotkeyDirection =
                direction < 0 ? "up" : "down";
        };
        const updateHotkeyScroll = (currentTime: number) => {
            const scroll = getActiveScroll();
            const direction = getDirection();
            if (!scroll || direction === 0) {
                finishHotkeyScroll();
                return;
            }
            const deltaTime = Math.min(Math.max((currentTime - lastTime) / 1000, 0), 0.05);
            lastTime = currentTime;
            counterCaseScrollHotkeyFrameRef.current = window.requestAnimationFrame(updateHotkeyScroll);
            // Keep the next Update ahead of any release LateUpdate first created
            // when this held-key frame reaches an Elastic boundary.
            applyHotkeyScroll(scroll, direction, deltaTime);
        };
        const beginHotkeyScroll = () => {
            if (!isCounterCaseScrollHotkeyTopmost) {
                return;
            }
            const scroll = getActiveScroll();
            const direction = getDirection();
            if (!scroll ||
                direction === 0 ||
                counterCaseScrollHotkeyFrameRef.current !== null) {
                return;
            }
            measureCanvasScale(scroll);
            const pointerDrag = counterCaseScrollDragRef.current;
            const reordersStandardPointerLateUpdate = pointerDrag?.scroll === scroll &&
                pointerDrag.dragging &&
                pointerDrag.scrollRectDragging &&
                scroll.dataset.storyCountercaseScrollPhysicsTarget === "normal";
            if (reordersStandardPointerLateUpdate) {
                cancelCounterCaseScrollDragVelocityTracking();
            }
            lastTime = performance.now() + 1000 / 60;
            counterCaseScrollHotkeyFrameRef.current = window.requestAnimationFrame(updateHotkeyScroll);
            // NKCUICom*ScrollHotkey.Update runs before ScrollRect.LateUpdate. Reserve
            // the next hotkey frame first, then restart release/pointer LateUpdate
            // behind it without resetting the last shared-velocity baseline.
            applyHotkeyScroll(scroll, direction, 1 / 60, true);
            if (reordersStandardPointerLateUpdate) {
                startCounterCaseScrollDragVelocityTracking(scroll, true);
            }
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target;
            if (target instanceof HTMLElement &&
                (target.isContentEditable ||
                    target.matches("input, textarea, [role='textbox']"))) {
                return;
            }
            const hotkeyCode = getStoryCounterCaseVerticalHotkeyCode(event);
            if (!hotkeyCode) {
                return;
            }
            pressedCodes.add(hotkeyCode);
            if (!isCounterCaseScrollHotkeyTopmost) {
                return;
            }
            event.preventDefault();
            beginHotkeyScroll();
        };
        const handleKeyUp = (event: KeyboardEvent) => {
            const hotkeyCode = getStoryCounterCaseVerticalHotkeyCode(event);
            if (!hotkeyCode || !pressedCodes.delete(hotkeyCode)) {
                return;
            }
            if (!isCounterCaseScrollHotkeyTopmost) {
                return;
            }
            event.preventDefault();
            if (getDirection() === 0) {
                finishHotkeyScroll();
            }
        };
        const handleBlur = () => {
            pressedCodes.clear();
            finishHotkeyScroll();
        };
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        window.addEventListener("blur", handleBlur);
        beginHotkeyScroll();
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
            window.removeEventListener("blur", handleBlur);
            finishHotkeyScroll();
        };
    }, [
        activeCounterCaseAct,
        cancelCounterCaseScrollDragVelocityTracking,
        isCounterCaseScrollHotkeyTopmost,
        setCounterCaseScrollRubber,
        startCounterCaseScrollDragVelocityTracking,
        startCounterCaseScrollReleaseMotion,
    ]);
    useEffect(() => {
        const route = stageRouteRef.current;
        if (route) {
            if (stageRouteMotionFrameRef.current !== null) {
                window.cancelAnimationFrame(stageRouteMotionFrameRef.current);
                stageRouteMotionFrameRef.current = null;
            }
            stageRouteVelocityRef.current = 0;
            setStageRouteRubber(route, 0);
            route.dataset.storyOperationStageMotion = "idle";
            route.dataset.storyOperationStageRawBoundary = "false";
            route.scrollLeft = 0;
        }
    }, [
        operationActHotkeySelectionRevision,
        setStageRouteRubber,
        selectedAct,
        selectedEpisodeId,
    ]);
    useEffect(() => {
        // STV-MAP-064: both client scroll-hotkey components generate the common
        // UIOverlay help only on the LeftAlt ShowHotkey edge. Once generated, the
        // display itself checks only whether LeftAlt remains held, so later
        // FullScreen/Popup transitions must not rebind or close this snapshot.
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.code !== "AltLeft" ||
                event.repeat ||
                event.shiftKey ||
                event.ctrlKey ||
                event.metaKey ||
                isOperationScrollHotkeyDisplayActive()) {
                return;
            }
            const eventTarget = event.target;
            const activeElement = document.activeElement;
            if ((eventTarget instanceof HTMLElement &&
                (eventTarget.isContentEditable ||
                    eventTarget.matches("input, select, textarea, [role='textbox']"))) ||
                (activeElement instanceof HTMLElement &&
                    (activeElement.isContentEditable ||
                        activeElement.matches("input, select, textarea, [role='textbox']"))) ||
                operationEntryFadeActiveRef.current ||
                operationExitFadeActiveRef.current ||
                counterCaseEntryFadeActiveRef.current) {
                return;
            }
            const context = operationScrollHotkeyContextRef.current;
            let target: StoryOperationScrollHotkeyTarget | null = null;
            let targetElement: HTMLElement | null = null;
            if (context.isStageTopmost) {
                target = "stage";
                targetElement = stageRouteRef.current;
            }
            else if (context.isCounterCaseTopmost) {
                target = context.counterCaseTarget;
                targetElement =
                    target === "normal"
                        ? counterCaseNormalListRef.current
                        : counterCaseViewerRef.current;
            }
            if (!target || !targetElement || targetElement.getClientRects().length === 0) {
                return;
            }
            const targetRect = targetElement.getBoundingClientRect();
            if (targetRect.width <= 0 || targetRect.height <= 0) {
                return;
            }
            const root = targetElement.closest<HTMLElement>("main");
            const referenceWidth = root?.clientWidth ?? window.innerWidth;
            const referenceHeight = root?.clientHeight ?? window.innerHeight;
            const rawScale = Math.min(1, referenceWidth / 1920, referenceHeight / 1080);
            const scale = Number.isFinite(rawScale) && rawScale > 0 ? rawScale : 1;
            const descriptor = STORY_OPERATION_SCROLL_HOTKEY_TARGETS[target];
            const left = targetRect.left + targetRect.width / 2;
            const top = targetRect.top + targetRect.height / 2;
            const generation = openOperationScrollHotkeyDisplay({
                target,
                targetPath: descriptor.path,
                text: descriptor.text,
                left,
                top,
                scale,
            });
            if (generation === null) {
                return;
            }
            operationScrollHotkeyTargetElementRef.current = targetElement;
            targetElement.dataset.storyOperationScrollHotkeyLastGeneration =
                String(generation);
            targetElement.dataset.storyOperationScrollHotkeyLastText = descriptor.text;
            targetElement.dataset.storyOperationScrollHotkeyLastTarget = target;
            targetElement.dataset.storyOperationScrollHotkeyLastTargetPath =
                descriptor.path;
            targetElement.dataset.storyOperationScrollHotkeyLastTargetRect = [
                targetRect.left,
                targetRect.top,
                targetRect.width,
                targetRect.height,
            ]
                .map((value) => value.toFixed(3))
                .join(",");
            targetElement.dataset.storyOperationScrollHotkeyLastScale =
                scale.toFixed(6);
            targetElement.dataset.storyOperationScrollHotkeyLastRendered = "false";
            delete targetElement.dataset.storyOperationScrollHotkeyLastRect;
            delete targetElement.dataset.storyOperationScrollHotkeyLastCenterOffset;
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [
        isOperationScrollHotkeyDisplayActive,
        openOperationScrollHotkeyDisplay,
    ]);
    useLayoutEffect(() => {
        if (!operationScrollHotkeyDisplay) {
            return;
        }
        const target = operationScrollHotkeyTargetElementRef.current;
        const display = document.querySelector<HTMLElement>('[data-story-hotkey-display="STV-MAP-064"]');
        if (!target || !display) {
            return;
        }
        const displayRect = display.getBoundingClientRect();
        target.dataset.storyOperationScrollHotkeyLastRect = [
            displayRect.left,
            displayRect.top,
            displayRect.width,
            displayRect.height,
        ]
            .map((value) => value.toFixed(3))
            .join(",");
        target.dataset.storyOperationScrollHotkeyLastCenterOffset = [
            displayRect.left + displayRect.width / 2 - operationScrollHotkeyDisplay.left,
            displayRect.top + displayRect.height / 2 - operationScrollHotkeyDisplay.top,
        ]
            .map((value) => value.toFixed(3))
            .join(",");
        target.dataset.storyOperationScrollHotkeyLastRendered = "true";
    }, [operationScrollHotkeyDisplay]);
    useEffect(() => () => {
        if (stageRouteMotionFrameRef.current !== null) {
            window.cancelAnimationFrame(stageRouteMotionFrameRef.current);
        }
    }, []);
    useEffect(() => {
        const route = stageRouteRef.current;
        if (!route || mode !== "episode") {
            return;
        }
        const handleWheel = (event: WheelEvent) => {
            const axisDelta = getStoryUnityScrollRectWheelAxisDelta(event.deltaX, event.deltaY);
            if (axisDelta === 0) {
                return;
            }
            cancelStageRouteMotion();
            stageRouteVelocityRef.current = 0;
            const maxScrollLeft = route.scrollWidth - route.clientWidth;
            const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE
                ? 32
                : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
                    ? route.clientWidth
                    : 1;
            const desiredVisualPosition = getStageRouteVisualPosition(route) + axisDelta * unit;
            const frame = getStoryUnityScrollRectWheelFrame(desiredVisualPosition, maxScrollLeft);
            route.scrollLeft = frame.scrollPosition;
            setStageRouteRubber(route, frame.rubber);
            event.preventDefault();
            route.dataset.storyOperationStageWheelAxis =
                Math.abs(event.deltaY) > Math.abs(event.deltaX) ? "y" : "x";
            route.dataset.storyOperationStageWheelDelta = axisDelta.toFixed(3);
            route.dataset.storyOperationStageRawBoundary = String(frame.rubber !== 0);
            if (frame.rubber === 0) {
                route.dataset.storyOperationStageMotion = "idle";
                route.dataset.storyUnityScrollrectVelocity = "0.000";
                return;
            }
            route.dataset.storyOperationStageMotion = "wheel-boundary";
            startStageRouteReleaseMotion(route, 0, {
                firstElasticity: STORY_UNITY_SCROLL_RECT_ELASTICITY * 3,
            });
        };
        route.addEventListener("wheel", handleWheel, { passive: false });
        return () => route.removeEventListener("wheel", handleWheel);
    }, [
        cancelStageRouteMotion,
        getStageRouteVisualPosition,
        mode,
        selectedEpisode,
        setStageRouteRubber,
        startStageRouteReleaseMotion,
    ]);
    function chooseEpisode(episodeId: number) {
        if (isCounterCaseEpisode) {
            snapshotCounterCaseScrollSurface(activeCounterCaseAct ? "normal" : "acts", true);
        }
        setSelectedEpisode(null);
        setSelectedEpisodeId(episodeId);
        setEpisodeError("");
        setSelectedCounterCaseAct(0);
        setSelectedStageId(0);
        setIsEpisodeListOpen(false);
        setIsStageInfoOpen(false);
        setSeasonalReturnEpisodeId(0);
        window.sessionStorage.removeItem(STORY_SEASONAL_RETURN_STORAGE_KEY);
        window.history.replaceState(null, "", `/story/reader/?episode=${episodeId}`);
    }
    function chooseAct(act: number) {
        setSelectedAct(act);
        setSelectedStageId(0);
        setIsStageInfoOpen(false);
    }
    function enterScene(summary: StorySceneSummary) {
        unlockAudio();
        setLastNaturalEndFxName("");
        chooseScene(summary);
        void loadCharacters().catch(() => undefined);
    }
    const operationScrollHotkeyOverlay = operationScrollHotkeyDisplay ? (<StoryOperationScrollHotkeyDisplayView display={operationScrollHotkeyDisplay} host="reader"/>) : null;
    const cutsceneHotkeyOverlay = cutsceneHotkeyDisplay ? (<div className={styles.cutsceneHotkeyOverlay} data-story-cutscene-hotkey-display="STV-RDR-005" data-story-cutscene-hotkey-surface={cutsceneHotkeyDisplay.surface} data-story-cutscene-hotkey-generation={cutsceneHotkeyDisplay.generation} data-story-cutscene-hotkey-lifetime="left-alt-held-after-generation">
      <StoryHotkeyDisplay className={styles.cutsceneHotkeyDisplay} text={cutsceneHotkeyDisplay.text} trackerId="STV-RDR-005" target={cutsceneHotkeyDisplay.targetPath} generation={cutsceneHotkeyDisplay.generation} lifetime="left-alt-held-after-generation" host="reader-ui-overlay" style={{
            "--story-cutscene-hotkey-target-x": `${cutsceneHotkeyDisplay.left}px`,
            "--story-cutscene-hotkey-target-y": `${cutsceneHotkeyDisplay.top}px`,
            "--story-cutscene-hotkey-scale": cutsceneHotkeyDisplay.scale,
        } as React.CSSProperties}/>
    </div>) : null;
    if (!manifest || !selectedEpisode) {
        return (<main className={styles.loadingScreen}>
        <span>COUNTERSIDE</span>
        <strong>
          {manifestError || episodeError || "STORY DATA LOADING"}
        </strong>
        {operationScrollHotkeyOverlay}
        {cutsceneHotkeyOverlay}
      </main>);
    }
    const ui = manifest.ui ?? {};
    const activeThemeState = getActiveStoryThemeState();
    if (mode === "episode" && isCounterCaseEpisode) {
        return (<main className={`${styles.operationScreen} ${styles.counterCaseScreen}`} data-story-ui-click-audio="STV-AUD-002:pointer-only" data-story-mouse3-cancel="STV-RDR-006" data-story-mouse3-cancel-level={isEpisodeListOpen
                ? "hamburger-popup"
                : activeCounterCaseAct
                    ? "countercase-detail"
                    : "countercase-root"} data-story-countercase-entry-fade="STV-MAP-013" data-story-countercase-entry-fade-active={isCounterCaseEntryFadeActive ? "true" : "false"} data-story-countercase-entry-fade-ms={STORY_COUNTERCASE_ENTRY_FADE_MS} data-story-countercase-view={activeCounterCaseAct ? "normal" : "acts"} data-story-countercase-act={activeCounterCaseAct?.act ?? 0} style={{
                "--countercase-bg": ui.AB_UI_NKM_UI_COUNTER_CASE_BG
                    ? `url("${deploymentUrl(`${ui.AB_UI_NKM_UI_COUNTER_CASE_BG}`)}")` : "none",
                "--countercase-bg-deco": ui.AB_UI_NKM_UI_COUNTER_CASE_BG_DECO
                    ? `url("${deploymentUrl(`${ui.AB_UI_NKM_UI_COUNTER_CASE_BG_DECO}`)}")` : "none",
                "--countercase-bg-text-1": ui.AB_UI_NKM_UI_COUNTER_CASE_BG_DECO_TEXT_01
                    ? `url("${deploymentUrl(`${ui.AB_UI_NKM_UI_COUNTER_CASE_BG_DECO_TEXT_01}`)}")` : "none",
                "--countercase-bg-text-2": ui.AB_UI_NKM_UI_COUNTER_CASE_BG_DECO_TEXT_02
                    ? `url("${deploymentUrl(`${ui.AB_UI_NKM_UI_COUNTER_CASE_BG_DECO_TEXT_02}`)}")` : "none",
                "--countercase-gradient": ui.AB_UI_NKM_UI_COUNTER_CASE_GRADIENT
                    ? `url("${deploymentUrl(`${ui.AB_UI_NKM_UI_COUNTER_CASE_GRADIENT}`)}")` : "none",
                "--countercase-gradient-2": ui.AB_UI_NKM_UI_COUNTER_CASE_GRADIENT2
                    ? `url("${deploymentUrl(`${ui.AB_UI_NKM_UI_COUNTER_CASE_GRADIENT2}`)}")` : "none",
                "--countercase-unit-slot": ui.AB_UI_NKM_UI_COUNTER_CASE_UNIT_SLOT_BG
                    ? `url("${deploymentUrl(`${ui.AB_UI_NKM_UI_COUNTER_CASE_UNIT_SLOT_BG}`)}")` : "none",
                "--countercase-unit-clip": ui.AB_UI_NKM_UI_COUNTER_CASE_UNIT_SLOT_CLIP
                    ? `url("${deploymentUrl(`${ui.AB_UI_NKM_UI_COUNTER_CASE_UNIT_SLOT_CLIP}`)}")` : "none",
                "--countercase-normal-slot": ui.AB_UI_NKM_UI_COUNTER_CASE_NORMAL_LIST_SLOT_BG
                    ? `url("${deploymentUrl(`${ui.AB_UI_NKM_UI_COUNTER_CASE_NORMAL_LIST_SLOT_BG}`)}")` : "none",
                "--countercase-normal-light": ui.AB_UI_NKM_UI_COUNTER_CASE_NORMAL_LIST_SLOT_LIGHT
                    ? `url("${deploymentUrl(`${ui.AB_UI_NKM_UI_COUNTER_CASE_NORMAL_LIST_SLOT_LIGHT}`)}")` : "none",
                "--countercase-normal-button": ui.NKM_UI_POPUP_BUTTON_01
                    ? `url("${deploymentUrl(`${ui.NKM_UI_POPUP_BUTTON_01}`)}")` : "none",
                "--operation-header-bg": ui.NKM_UI_UPSIDE_MENU_BG_GRADIENT
                    ? `url("${deploymentUrl(`${ui.NKM_UI_UPSIDE_MENU_BG_GRADIENT}`)}")` : "none",
            } as React.CSSProperties}>
        <div className={styles.counterCaseBackdrop} aria-hidden="true"/>
        <header className={styles.operationHeader} data-story-operation-upside-input="STV-MAP-048" data-story-countercase-upside-menu="STV-MAP-049">
          {/* STV-MAP-007: the Normal UI closes back to the still-open Counter Case viewer. */}
          {activeCounterCaseAct ? (<button type="button" className={styles.operationBack} aria-label="사원 목록으로 돌아가기" data-story-countercase-back="STV-MAP-062" data-story-countercase-back-level="detail" data-story-ui-click-sound="back" onClick={(event) => {
                    playStoryUiPointerSound(event, "back");
                    requestCounterCaseViewerBack();
                }}>
              <UiSprite src={ui.NKM_UI_UPSIDE_MENU_BUTTON_BACK} alt="" width={232} height={70}/>
            </button>) : (<Link href="/story/" className={styles.operationBack} data-story-countercase-back="STV-MAP-062" data-story-countercase-back-level="root" onClick={(event) => {
                    const isModifiedActivation = event.button !== 0 ||
                        event.altKey ||
                        event.ctrlKey ||
                        event.metaKey ||
                        event.shiftKey;
                    if (isModifiedActivation) {
                        return;
                    }
                    event.preventDefault();
                    playStoryUiPointerSound(event, "back");
                    requestCounterCaseViewerBack();
                }} data-story-ui-click-sound="back">
              <UiSprite src={ui.NKM_UI_UPSIDE_MENU_BUTTON_BACK} alt="연대기로 돌아가기" width={232} height={70}/>
            </Link>)}
          <Link href="/" className={styles.operationHome} aria-label="홈으로 이동" data-story-ui-click-sound="home" onClick={(event) => {
                const isModifiedActivation = event.button !== 0 ||
                    event.altKey ||
                    event.ctrlKey ||
                    event.metaKey ||
                    event.shiftKey;
                if (!isModifiedActivation) {
                    playStoryUiPointerSound(event, "home");
                }
            }}>
            <UiSprite src={ui.NKM_UI_UPSIDE_MENU_BUTTON_HOME} alt="" width={102} height={70}/>
          </Link>
          <button type="button" className={styles.episodeListButton} data-story-ui-click-sound="select" onClick={(event) => {
                playStoryUiPointerSound(event);
                setIsEpisodeListOpen(true);
            }} aria-label="에피소드 선택" data-story-countercase-hamburger="STV-MAP-049" data-story-operation-hamburger-input="STV-MAP-050">
            <UiSprite src={ui.NKM_UI_UPSIDE_MENU_ICON_HAMBURGER_MENU} alt="" width={50} height={50}/>
          </button>
        </header>

        <>
          <section ref={counterCaseViewerRef} className={styles.counterCaseViewer} hidden={Boolean(activeCounterCaseAct)} aria-label="카운터케이스 사원 목록" data-story-countercase-scroll-hotkey="STV-MAP-057" data-story-countercase-scroll-hotkey-target="acts" data-story-operation-scroll-hotkey-display="STV-MAP-064" data-story-operation-scroll-hotkey-target="acts" data-story-operation-scroll-hotkey-target-path={STORY_OPERATION_SCROLL_HOTKEY_TARGETS.acts.path} data-story-countercase-scroll-hotkey-speed={STORY_COUNTERCASE_SCROLL_HOTKEY_SPEED} data-story-countercase-scroll-hotkey-direction="idle" data-story-countercase-scroll-physics="STV-MAP-058" data-story-countercase-scroll-physics-target="acts" data-story-countercase-scroll-component="LoopVerticalScrollRect" data-story-countercase-scroll-axis="vertical" data-story-countercase-scroll-movement="elastic" data-story-countercase-scroll-elasticity={STORY_COUNTERCASE_SCROLL_ELASTICITY} data-story-countercase-scroll-inertia="true" data-story-countercase-scroll-deceleration={STORY_COUNTERCASE_SCROLL_DECELERATION_RATE} data-story-countercase-scroll-sensitivity="1" data-story-countercase-scroll-scrollbar="none" data-story-countercase-scroll-wheel-multiplier={STORY_COUNTERCASE_SCROLL_LOOP_WHEEL_MULTIPLIER} data-story-countercase-scroll-wheel-boundary="rubber-delta-half-sticky" data-story-countercase-scroll-drag-threshold={STORY_COUNTERCASE_SCROLL_DRAG_THRESHOLD} data-story-countercase-scroll-motion="idle" data-story-countercase-scroll-rubber-y="0.000" onPointerDown={handleCounterCaseScrollPointerDown} onClickCapture={suppressCounterCaseScrollClick} onDragStart={(event) => {
                event.preventDefault();
            }}>
            <div className={styles.counterCaseActGrid} data-story-countercase-scroll-physics-content="STV-MAP-058">
              {counterCaseActs.map((counterCaseAct) => (<button key={counterCaseAct.act} type="button" className={styles.counterCaseActSlot} data-story-countercase-unit-id={counterCaseAct.unitId} data-story-ui-click-sound="select" onClick={(event) => {
                    playStoryUiPointerSound(event);
                    snapshotCounterCaseScrollSurface("acts", true);
                    setSelectedCounterCaseAct(counterCaseAct.act);
                    setSelectedAct(counterCaseAct.act);
                }}>
                  <i className={styles.counterCaseActSlotBackground} aria-hidden="true"/>
                  {counterCaseAct.faceCardUrl ? (<Image src={counterCaseAct.faceCardUrl} alt="" fill unoptimized className={styles.counterCaseUnitFace}/>) : null}
                  <i className={styles.counterCaseUnitClip} aria-hidden="true"/>
                  <span className={styles.counterCaseUnitCopy}>
                    {counterCaseAct.nickname ? (<CounterCaseBestFitText as="small" text={counterCaseAct.nickname} minDesignSize={2} maxDesignSize={26}/>) : null}
                    <CounterCaseBestFitText as="strong" text={counterCaseAct.name} minDesignSize={3} maxDesignSize={40}/>
                  </span>
                </button>))}
            </div>
          </section>
          {retainedCounterCaseAct ? (<section className={styles.counterCaseNormal} aria-label={`${retainedCounterCaseAct.name} 카운터케이스`} hidden={!activeCounterCaseAct}>
            <aside className={styles.counterCaseSelectedUnit} data-story-countercase-selected-unit>
              {/* STV-MAP-005: the client nests the 350×500 act slot inside the 420×588.4 unit container. */}
              <div className={styles.counterCaseSelectedSlot} data-story-countercase-selected-slot>
                <i className={styles.counterCaseActSlotBackground} aria-hidden="true"/>
                {retainedCounterCaseAct.faceCardUrl ? (<Image src={retainedCounterCaseAct.faceCardUrl} alt="" fill priority unoptimized className={styles.counterCaseUnitFace}/>) : null}
                <i className={styles.counterCaseUnitClip} aria-hidden="true"/>
                <span className={styles.counterCaseUnitCopy}>
                  {retainedCounterCaseAct.nickname ? (<CounterCaseBestFitText as="small" text={retainedCounterCaseAct.nickname} minDesignSize={2} maxDesignSize={26}/>) : null}
                  <CounterCaseBestFitText as="strong" text={retainedCounterCaseAct.name} minDesignSize={3} maxDesignSize={40}/>
                </span>
              </div>
            </aside>

            <div ref={counterCaseNormalListRef} className={styles.counterCaseNormalList} aria-label="카운터케이스 기록" data-story-countercase-scroll-hotkey="STV-MAP-057" data-story-countercase-scroll-hotkey-target="normal" data-story-operation-scroll-hotkey-display="STV-MAP-064" data-story-operation-scroll-hotkey-target="normal" data-story-operation-scroll-hotkey-target-path={STORY_OPERATION_SCROLL_HOTKEY_TARGETS.normal.path} data-story-countercase-scroll-hotkey-speed={STORY_COUNTERCASE_SCROLL_HOTKEY_SPEED} data-story-countercase-scroll-hotkey-direction="idle" data-story-countercase-scroll-physics="STV-MAP-058" data-story-countercase-scroll-physics-target="normal" data-story-countercase-scroll-component="ScrollRect" data-story-countercase-scroll-axis="vertical" data-story-countercase-scroll-movement="elastic" data-story-countercase-scroll-elasticity={STORY_COUNTERCASE_SCROLL_ELASTICITY} data-story-countercase-scroll-inertia="true" data-story-countercase-scroll-deceleration={STORY_COUNTERCASE_SCROLL_DECELERATION_RATE} data-story-countercase-scroll-sensitivity="1" data-story-countercase-scroll-scrollbar="none" data-story-countercase-scroll-wheel-multiplier={STORY_COUNTERCASE_SCROLL_NORMAL_WHEEL_MULTIPLIER} data-story-countercase-scroll-wheel-boundary="raw-linear-smoothdamp-3x" data-story-countercase-scroll-drag-threshold={STORY_COUNTERCASE_SCROLL_DRAG_THRESHOLD} data-story-countercase-scroll-motion="idle" data-story-countercase-scroll-rubber-y="0.000" onPointerDown={handleCounterCaseScrollPointerDown} onClickCapture={suppressCounterCaseScrollClick} onDragStart={(event) => {
                    event.preventDefault();
                }}>
              <div className={styles.counterCaseNormalListContent} data-story-countercase-scroll-physics-content="STV-MAP-058" data-story-countercase-record-list-layout="STV-MAP-066">
                {actStages.map((stage, stageIndex) => (<article key={stage.id} className={styles.counterCaseNormalSlot} data-story-countercase-stage={stage.id} data-story-countercase-stage-index={stageIndex} style={{
                        "--countercase-stage-index": stageIndex,
                    } as React.CSSProperties}>
                    <i className={styles.counterCaseStageGradation} aria-hidden="true"/>
                    <i className={styles.counterCaseStageGradation2} aria-hidden="true"/>
                    <i className={styles.counterCaseStageLight} aria-hidden="true"/>
                    <i className={styles.counterCaseStageLight2} aria-hidden="true"/>
                    <span className={styles.counterCaseStageNumber}>{stage.uiNumber}</span>
                    <div className={styles.counterCaseStageCopy}>
                      <h2>{stage.title}</h2>
                      <p>{stage.description}</p>
                    </div>
                    <div className={styles.counterCaseStageActions}>
                      {stage.cutscenes.map((cutscene) => (<button key={`${cutscene.id}-${cutscene.position}`} type="button" data-testid={`story-cutscene-${cutscene.id}-${cutscene.position}`} data-story-ui-click-sound="select" onClick={(event) => {
                            playStoryUiPointerSound(event);
                            enterScene(cutscene);
                        }}>
                          <strong>조사 개시</strong>
                        </button>))}
                    </div>
                  </article>))}
              </div>
            </div>
          </section>) : null}
        </>
        {isEpisodeListOpen ? (<StoryEpisodeDrawer episodes={manifest.episodes} selectedEpisodeId={selectedEpisodeId} onClose={() => setIsEpisodeListOpen(false)} onChoose={chooseEpisode}/>) : null}
        {operationScrollHotkeyOverlay}
        {cutsceneHotkeyOverlay}
      </main>);
    }
    if (mode === "episode") {
        return (<main className={styles.operationScreen} data-story-ui-click-audio="STV-AUD-002:pointer-only" data-story-mouse3-cancel="STV-RDR-006" data-story-mouse3-cancel-level={isEpisodeListOpen
                ? "hamburger-popup"
                : isStageInfoOpen
                    ? "operation-detail"
                    : "operation-root"} data-story-operation-entry-fade="STV-MAP-054" data-story-operation-entry-fade-active={isOperationEntryFadeActive ? "true" : "false"} data-story-operation-entry-fade-ms={STORY_OPERATION_ENTRY_FADE_MS} data-story-operation-exit-fade={isOperationExitFadeActive ? "STV-MAP-061" : undefined} data-story-operation-exit-phase={isOperationExitFadeActive ? "out" : "idle"} data-story-operation-exit-fade-out-ms={STORY_OPERATION_EXIT_FADE_MS} data-story-operation-return-fade-in-ms={STORY_OPERATION_PARENT_RETURN_FADE_MS} data-story-chronicle-theme-lifetime="STV-CHR-018" data-story-seasonal-return-episode={seasonalReturnEpisodeId || undefined} data-story-seasonal-return-policy="back-only" data-story-chronicle-theme-url={activeThemeState?.url ?? ""} data-story-chronicle-theme-time={activeThemeState?.currentTime.toFixed(3) ?? ""} data-story-chronicle-theme-paused={activeThemeState ? String(activeThemeState.paused) : ""} data-story-last-natural-end-fx={lastNaturalEndFxName} data-story-active-transient-fx-count={activeTransientFxCount} data-story-episode-playback-bgm-path={episodePlaybackBgmPath ?? selectedEpisode?.bgmPath ?? ""}>
        <svg className={styles.operationColorFilters} aria-hidden="true" focusable="false">
          <defs>
            <filter id="story-operation-stage-button-tint" colorInterpolationFilters="sRGB">
              <feComponentTransfer>
                <feFuncR type="linear" slope={29 / 255}/>
                <feFuncG type="linear" slope={69 / 255}/>
                <feFuncB type="linear" slope={137 / 255}/>
              </feComponentTransfer>
            </filter>
          </defs>
        </svg>
        {operationBackground?.url ? (<div className={styles.operationBackgroundSurface} data-story-operation-background-surface="STV-MAP-028" data-story-operation-seasonal-act-background={selectedEpisode?.category === "EC_SEASONAL"
                    ? "STV-MAP-075"
                    : undefined} data-story-operation-event-act-background={selectedEpisode?.category === "EC_EVENT" &&
                    selectedEpisode.id === 256
                    ? "STV-MAP-076"
                    : undefined} data-story-operation-background-act={operationBackground.act} data-story-operation-background-name={operationBackground.name}>
            <Image key={operationBackground.url} src={operationBackground.url} alt="" fill priority unoptimized className={styles.operationBackground}/>
          </div>) : null}

        <header className={styles.operationHeader} data-story-operation-header-background="STV-MAP-031" data-story-operation-upside-input="STV-MAP-048" style={{
                "--operation-header-bg": ui.NKM_UI_UPSIDE_MENU_BG_GRADIENT
                    ? `url("${deploymentUrl(`${ui.NKM_UI_UPSIDE_MENU_BG_GRADIENT}`)}")` : "none",
            } as React.CSSProperties}>
          <Link href="/story/" className={styles.operationBack} data-story-operation-seasonal-return={seasonalReturnEpisodeId > 0
                ? seasonalReturnEpisodeId
                : undefined} data-story-operation-seasonal-new-context={seasonalReturnEpisodeId > 0
                ? "blocked-client-parity"
                : undefined} draggable={seasonalReturnEpisodeId > 0 ? false : undefined} onContextMenu={(event) => {
                if (seasonalReturnEpisodeId > 0) {
                    event.preventDefault();
                }
            }} onAuxClick={(event) => {
                if (seasonalReturnEpisodeId > 0 || event.button === 3) {
                    event.preventDefault();
                }
            }} onClick={(event) => {
                const isModifiedActivation = event.button !== 0 ||
                    event.altKey ||
                    event.ctrlKey ||
                    event.metaKey ||
                    event.shiftKey;
                if (isModifiedActivation) {
                    if (seasonalReturnEpisodeId > 0) {
                        event.preventDefault();
                    }
                    return;
                }
                event.preventDefault();
                playStoryUiPointerSound(event, "back");
                requestOperationViewerBack();
            }} data-story-ui-click-sound="back">
            <UiSprite src={ui.NKM_UI_UPSIDE_MENU_BUTTON_BACK} alt="연대기로 돌아가기" width={232} height={70}/>
          </Link>
          <Link href="/" className={styles.operationHome} aria-label="홈으로 이동" data-story-ui-click-sound="home" onClick={(event) => {
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
            <UiSprite src={ui.NKM_UI_UPSIDE_MENU_BUTTON_HOME} alt="" width={102} height={70}/>
          </Link>
          <button type="button" className={styles.episodeListButton} data-story-ui-click-sound="select" onClick={(event) => {
                playStoryUiPointerSound(event);
                setIsEpisodeListOpen(true);
            }} aria-label="에피소드 선택" data-story-operation-hamburger="STV-MAP-032" data-story-operation-hamburger-input="STV-MAP-050">
            <UiSprite src={ui.NKM_UI_UPSIDE_MENU_ICON_HAMBURGER_MENU} alt="" width={50} height={50}/>
          </button>
        </header>

        <section className={styles.episodeIdentity} data-story-operation-identity="STV-MAP-030">
          <h1>{selectedEpisode?.title}</h1>
          <h2>{selectedEpisode?.name}</h2>
        </section>

        <div className={styles.actBottom} data-story-operation-act-bottom="STV-MAP-033 STV-MAP-065" data-story-operation-act-bottom-retained="true" style={{
                "--operation-act-bar-bg": ui.AB_UI_OPERATION_GRADIENT_03
                    ? `url("${deploymentUrl(`${ui.AB_UI_OPERATION_GRADIENT_03}`)}")` : "none",
                "--operation-act-slot-off": ui.AB_UI_OPERATION_DOT
                    ? `url("${deploymentUrl(`${ui.AB_UI_OPERATION_DOT}`)}")` : "none",
                "--operation-act-slot-on": ui.AB_UI_OPERATION_BUTTON_ACT_ON
                    ? `url("${deploymentUrl(`${ui.AB_UI_OPERATION_BUTTON_ACT_ON}`)}")` : "none",
            } as React.CSSProperties}>
          <div aria-hidden="true" className={styles.actBottomBackground} data-story-operation-act-bottom-gradient="STV-MAP-065"/>
          <nav className={styles.actNavigation} aria-label="ACT 선택" data-story-operation-act-bar="STV-MAP-033" data-story-operation-act-hotkey="STV-MAP-046 STV-MAP-056" data-story-operation-act-slot-visibility="STV-MAP-065" data-story-operation-act-slot-count={acts.length}>
            {/* STV-MAP-065: InitUI prepares the LoopScrollRect pool before SetData.
                OnSelectedActSlot then calls SetIndexPosition(0), whose RefreshCells
                leaves one selected but callback-inert ACT 1 slot for a single ACT. */}
            {acts.map((act) => (<button key={act} type="button" aria-disabled={acts.length === 1 ? "true" : undefined} data-active={selectedAct === act} data-story-operation-act-input="STV-MAP-052" data-story-operation-act-active-click="STV-MAP-053" data-story-operation-single-act-inert={acts.length === 1 ? "STV-MAP-065" : undefined} data-story-ui-click-sound="select" onClick={(event) => {
                    // STV-MAP-053/STV-MAP-065: the non-switch-off ToggleGroup
                    // consumes the selected ACT without sound or a value callback.
                    if (selectedAct === act) {
                        return;
                    }
                    playStoryUiPointerSound(event);
                    chooseAct(act);
                }}>
                <strong>ACT {act || 0}</strong>
              </button>))}
          </nav>
        </div>

        <section ref={stageRouteRef} className={styles.stageRoute} aria-label="스토리 스테이지" data-story-operation-stage-empty-click="STV-MAP-043" data-story-operation-stage-drag="STV-MAP-044" data-story-operation-stage-inertia="STV-MAP-045" data-story-operation-stage-scroll-target="STV-MAP-047" data-story-operation-stage-scroll-hotkey="STV-MAP-055" data-story-operation-stage-wheel="STV-MAP-068" data-story-operation-scroll-hotkey-display="STV-MAP-064" data-story-operation-scroll-hotkey-target="stage" data-story-operation-scroll-hotkey-target-path={STORY_OPERATION_SCROLL_HOTKEY_TARGETS.stage.path} data-story-operation-stage-hotkey-speed={STORY_OPERATION_STAGE_HOTKEY_SPEED} data-story-operation-stage-hotkey-direction="idle" {...stageRoutePointer.markerProps} {...stageRoutePointer.pointerProps} style={{
                "--story-stage-battle-node": ui.AB_UI_OPERATION_NODE_BG
                    ? `url("${deploymentUrl(`${ui.AB_UI_OPERATION_NODE_BG}`)}")` : "none",
                "--story-stage-story-node": ui.AB_UI_OPERATION_NODE_BG_02
                    ? `url("${deploymentUrl(`${ui.AB_UI_OPERATION_NODE_BG_02}`)}")` : "none",
                "--story-stage-line": ui.AB_UI_OPERATION_NODE_LINE
                    ? `url("${deploymentUrl(`${ui.AB_UI_OPERATION_NODE_LINE}`)}")` : "none",
            } as React.CSSProperties}>
          <div className={styles.stageMapCanvas} data-story-operation-stage-map="STV-MAP-036" data-story-operation-stage-node-visual="STV-MAP-041" data-story-operation-stage-selection="STV-MAP-035" data-story-operation-stage-canvas-scale="STV-MAP-042" data-story-operation-event-v2-vertical-layout={isEventClb002RootVerticalLayout ? "STV-MAP-079" : undefined} style={{
                aspectRatio: `${activeStageMap.width} / ${activeStageMap.height}`,
                "--stage-map-reference-height": `${activeStageMap.height}px`,
                "--stage-map-width-scaled-height": `${(activeStageMap.height / 1920) * 100}vw`,
                "--stage-map-height-scaled-height": `${(activeStageMap.height / 1080) * 100}dvh`,
                "--story-stage-act-offset-y": isEventClb002RootVerticalLayout
                    ? `${(125 / activeStageMap.height) * 100}%`
                    : "0%",
                "--story-stage-selection": ui.AB_UI_OPERATION_NODE_SELECT
                    ? `url("${deploymentUrl(`${ui.AB_UI_OPERATION_NODE_SELECT}`)}")` : "none",
                "--story-stage-selection-fx": ui.AB_UI_OPERATION_NODE_SELECT_02
                    ? `url("${deploymentUrl(`${ui.AB_UI_OPERATION_NODE_SELECT_02}`)}")` : "none",
            } as React.CSSProperties}>
            <div className={styles.stageMapVisual}>
              <StoryStageActVisualBackground act={selectedAct} stageMap={activeStageMap}/>

              {plottedStages.flatMap(({ stage, layout }) => (layout.connectors ?? []).map((connector, connectorIndex) => (<i key={`line-${stage.id}-${connector.name}-${connectorIndex}`} className={styles.stageConnector} aria-hidden="true" style={{
                    left: `${(connector.left / activeStageMap.width) * 100}%`,
                    top: `${(connector.top / activeStageMap.height) * 100}%`,
                    width: `${(connector.width / activeStageMap.width) * 100}%`,
                    height: `${(connector.height / activeStageMap.height) * 100}%`,
                    transformOrigin: `${connector.originX * 100}% ${connector.originY * 100}%`,
                    transform: `rotate(${connector.angle}deg)`,
                } as React.CSSProperties}/>)))}

              {plottedStages.map(({ stage, layout }) => {
                const stageNumber = getStageDisplayNumber(stage);
                return (<button key={stage.id} type="button" className={styles.stageNode} data-active={selectedStageId === stage.id} data-kind={layout.kind} data-story={stage.cutscenes.length > 0} disabled={stage.cutscenes.length === 0} aria-label={[stageNumber, stage.title].filter(Boolean).join(" ")} data-story-ui-click-sound="select" style={{
                        left: `${(layout.x / activeStageMap.width) * 100}%`,
                        top: `${(layout.y / activeStageMap.height) * 100}%`,
                        width: `${(layout.width / activeStageMap.width) * 100}%`,
                        height: `${(layout.height / activeStageMap.height) * 100}%`,
                        "--stage-node-visual-width": `${(layout.visualWidth / layout.width) * 100}%`,
                        "--stage-node-visual-height": `${(layout.visualHeight / layout.height) * 100}%`,
                    } as React.CSSProperties} onClick={(event) => {
                        playStoryUiPointerSound(event);
                        const route = stageRouteRef.current;
                        if (route && plottedStages.length > 1) {
                            // STV-MAP-047: all included operation viewers use
                            // normalized positions. GetTargetPos takes the
                            // selected original slot center between the minimum
                            // and maximum node centers; SetScrollToIndex then
                            // moves there for 0.2s with Ease 15 (OutQuint).
                            const nodeCenters = plottedStages.map(({ layout: plottedLayout }) => plottedLayout.x);
                            const minimumCenter = Math.min(...nodeCenters);
                            const maximumCenter = Math.max(...nodeCenters);
                            if (maximumCenter > minimumCenter) {
                                if (stageRouteMotionFrameRef.current !== null) {
                                    window.cancelAnimationFrame(stageRouteMotionFrameRef.current);
                                    stageRouteMotionFrameRef.current = null;
                                }
                                stageRouteVelocityRef.current = 0;
                                setStageRouteRubber(route, 0);
                                const normalizedTarget = Math.min(1, Math.max(0, (layout.x - minimumCenter) /
                                    (maximumCenter - minimumCenter)));
                                const maximumScrollLeft = Math.max(0, route.scrollWidth - route.clientWidth);
                                const targetScrollLeft = normalizedTarget * maximumScrollLeft;
                                animateStageRouteNormalizedScroll(route, targetScrollLeft, stageRouteMotionFrameRef);
                            }
                        }
                        setSelectedStageId(stage.id);
                        setIsStageInfoOpen(true);
                    }}>
                    {stageNumber ? (<span className={styles.stageNumber}>{stageNumber}</span>) : null}
                    <i className={styles.stageNodeSelectionFx} aria-hidden="true"/>
                  </button>);
            })}
            </div>
          </div>
        </section>

        {isEventClb002RootVerticalLayout ? (
            // OnSelectedActSlot disables and re-enables the entire V2 root.
            // keepAnimatorStateOnDisable=false therefore restarts INTRO per ACT.
            <StoryEventClb002HandOverlay act={selectedAct}/>) : null}

        {isStageInfoOpen && selectedStage ? (<aside className={styles.stageInformation} aria-live="polite" aria-label={`${selectedStage.title} 스테이지 정보`} data-story-operation-stage-info-scale="STV-MAP-034" data-story-operation-stage-info-background="STV-MAP-037" data-story-operation-stage-info-intro="STV-MAP-072" data-story-operation-stage-info-kind={selectedStage.nodeKind} style={{
                    "--story-main-info-bg": ui.AB_UI_OPERATION_MAIN_INFO_BG
                        ? `url("${deploymentUrl(`${ui.AB_UI_OPERATION_MAIN_INFO_BG}`)}")` : "none",
                    "--story-main-info-gradient": ui.AB_UI_OPERATION_GRADIENT_01
                        ? `url("${deploymentUrl(`${ui.AB_UI_OPERATION_GRADIENT_01}`)}")` : "none",
                    "--story-stage-button-bg": ui.AB_UI_OPERATION_DOT_4PX
                        ? `url("${deploymentUrl(`${ui.AB_UI_OPERATION_DOT_4PX}`)}")` : "none",
                    "--story-stage-button-icon": ui.AB_UI_OPERATION_ICON_PLAY
                        ? `url("${deploymentUrl(`${ui.AB_UI_OPERATION_ICON_PLAY}`)}")` : "none",
                } as React.CSSProperties}>
            {selectedStage.nodeKind === "story" &&
                    selectedStage.characterSpine ? (<div className={styles.stageCharacter} data-story-operation-stage-info-spine="STV-MAP-038" data-story-operation-stage-character-spine="STV-MAP-059" data-story-operation-stage-character-spine-prefab={selectedStage.characterSpinePrefabId ??
                        selectedStage.characterId} data-story-operation-stage-character-spine-resolution={selectedStage.characterSpineResolution ?? "exact"}>
                {selectedStage.characterSpine.renderUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- 원본 binary APNG의 프레임·색을 변환 없이 재생한다.
                    <img src={deploymentUrl(selectedStage.characterSpine.renderUrl)} alt={selectedStage.characterSpinePrefabId ||
                            selectedStage.characterId ||
                            selectedStage.title} draggable={false} data-spine-asset-id={selectedStage.characterSpine.id} data-spine-animation={selectedStage.characterAnimation ?? "IDLE"} data-spine-animation-loop={String(selectedStage.characterAnimationLoop ?? true)} data-spine-skin={selectedStage.characterSkinName ?? ""} data-spine-binary-url={selectedStage.characterSpine.binaryUrl ?? ""} data-spine-render-sha256={selectedStage.characterSpine.renderSha256 ?? ""}/>) : (<StorySpineActor asset={selectedStage.characterSpine} face={selectedStage.characterAnimation ?? "IDLE"} loop={selectedStage.characterAnimationLoop ?? true} skinName={selectedStage.characterSkinName ?? ""} layoutCoordinateSpace={selectedStage.nodeKind === "story"
                            ? "story-stage-mask"
                            : "cutscene-canvas"} label={selectedStage.characterId || selectedStage.title}/>)}
              </div>) : null}

            {selectedStage.nodeKind === "story" ? (<i className={styles.stageCharacterGradient} data-gradient="lower" aria-hidden="true"/>) : null}

            <div className={styles.stageCopy} data-story-operation-stage-info-text="STV-MAP-039">
              {getStageDisplayNumber(selectedStage) ? (<span>{getStageDisplayNumber(selectedStage)}</span>) : null}
              <StageInfoBestFitTitle text={selectedStage.title}/>
              {selectedStage.description &&
                    selectedStage.nodeKind === "story" ? (<StoryStageDescriptionScroll description={selectedStage.description} resetKey={selectedStage.id}/>) : selectedStage.description ? (<p data-story-operation-stage-description-layout="battle-approximation-STV-MAP-060">
                  {selectedStage.description}
                </p>) : null}
            </div>

            <div className={styles.stageActions}>
              {selectedStage.cutscenes.map((cutscene) => (<button key={`${cutscene.id}-${cutscene.position}`} type="button" data-testid={`story-cutscene-${cutscene.id}-${cutscene.position}`} data-story-operation-stage-info-enter="STV-MAP-040" data-story-ui-click-sound="select" onClick={(event) => {
                        playStoryUiPointerSound(event);
                        enterScene(cutscene);
                    }}>
                  <strong data-story-stage-info-button-best-fit="2-36">
                    스토리 보기
                  </strong>
                  <i aria-hidden="true"/>
                </button>))}
            </div>

            {selectedStage.nodeKind === "story" ? (<i className={styles.stageCharacterGradient} data-gradient="upper" aria-hidden="true"/>) : null}
          </aside>) : null}

        {isEpisodeListOpen ? (<StoryEpisodeDrawer episodes={manifest.episodes} selectedEpisodeId={selectedEpisodeId} onClose={() => setIsEpisodeListOpen(false)} onChoose={chooseEpisode}/>) : null}
        {operationScrollHotkeyOverlay}
        {cutsceneHotkeyOverlay}

        {sceneError ? (<p className={styles.sceneLoadError} role="alert">
            {sceneError}
          </p>) : null}

        {selectedScene && !scene ? <StoryWaitBox ui={ui}/> : null}
      </main>);
    }
    const showDialogue = Boolean(effectiveDialogueBoxOpen || choices.length || sceneError);
    const titleMain = visualState.titleText;
    const titleSub = visualState.subtitleText;
    const activeActorSlots = new Set(visualState.actors.map((actor) => actor.slot));
    const renderedActors = [
        // 비활성 CharacterView는 클라이언트의 세 NKCCutUnit 슬롯처럼 DOM에
        // 남겨 두되 화면 뒤에 둔다. 다시 SetUnit이 호출되면 아래 활성 목록의
        // 마지막으로 이동하므로 Spine 인스턴스를 유지한 채 SetAsLastSibling과
        // 같은 형제 순서를 얻는다.
        ...(["left", "center", "right"] as const).flatMap((slot) => {
            const actor = visualState.actorViewCache[slot];
            return actor && !activeActorSlots.has(slot)
                ? [{ actor, active: false }]
                : [];
        }),
        // applyActorCommand는 SetUnit 대상 슬롯을 매번 배열 끝으로 옮긴다.
        // 고정 좌→중→우 순서로 다시 정렬하지 않아 가장 최근 대상이 앞에 온다.
        ...visualState.actors.map((actor) => ({ actor, active: true })),
    ];
    const hasCurrentBackgroundLayer = Boolean(visualState.backgroundUrl ||
        visualState.backgroundSpine ||
        visualState.gameObjectEffect?.kind === "memory-ui-image-fxm" ||
        visualState.gameObjectEffect?.kind === "rewind-sprite-fxm" ||
        visualState.gameObjectEffect?.kind === "wave-render-stage-fxm" ||
        visualState.gameObjectEffect?.kind === "camera-sprite-fxm" ||
        visualState.gameObjectEffect?.kind === "circuit-board-render-texture" ||
        visualState.gameObjectEffect?.kind === "ice-material-fxm");
    const currentGameObjectUsesCoverSurface = usesGameObjectCoverSurface(visualState.backgroundGameObject, visualState.backgroundGameObjectName);
    const previousGameObjectUsesCoverSurface = usesGameObjectCoverSurface(visualState.previousBackgroundGameObject, visualState.previousGameObjectEffect?.kind === "screen-film"
        ? "AB_UI_NKM_UI_CUTSCEN_FX_SCREEN_FILM"
        : "");
    const currentBackgroundSpineTint = visualState.backgroundSpine
        ? {
            start: toStorySpineTint(visualState.backgroundTintStart),
            end: toStorySpineTint(visualState.backgroundTintEnd),
            durationMs: visualState.backgroundTintTimeMs,
            ease: visualState.backgroundTintEase,
        } satisfies StorySpineTintTransition
        : null;
    const previousBackgroundSpineTint = visualState.previousBackgroundSpine
        ? {
            start: toStorySpineTint(visualState.previousBackgroundTintStart),
            end: toStorySpineTint(visualState.previousBackgroundTintEnd),
            durationMs: visualState.previousBackgroundTintTimeMs,
            ease: visualState.previousBackgroundTintEase,
        } satisfies StorySpineTintTransition
        : null;
    return (<main ref={theaterRef} className={styles.theater} data-story-ui-click-audio="STV-AUD-002:pointer-only" data-story-mouse3-cancel="STV-RDR-006" data-story-mouse3-cancel-level={isSkipOpen ? "movie-popup" : isLogOpen ? "log" : "player"} data-story-cutscene-log-hotkey="STV-RDR-001" data-story-cutscene-confirm-hotkey="STV-RDR-004" data-story-cutscene-hotkey-help="STV-RDR-005" data-story-cutscene-hotkey-help-trigger="AltLeft" data-story-cutscene-hotkey-legacy-player-targets="disabled-by-client-init" data-story-cutscene-confirm-hotkeys="Space Return KeypadEnter Keypad5" data-story-cutscene-log-hotkey-active={audioUnlocked &&
            Boolean(scene && currentCommand) &&
            controlVisibility.log &&
            !visualState.fadeActive &&
            !visualState.fadeCovered &&
            visualState.fadeOpacity <= 0 &&
            !visualState.flash &&
            !isSkipOpen &&
            !isLogOpen} data-shake={visualState.shake} data-shake-revision={visualState.shakeRevision} data-filter={visualState.backgroundFilter} data-paused={isUiHidden} data-command-index={commandIndex} data-dialogue-box-open={visualState.dialogueBoxOpen} data-dialogue-box-type={visualState.dialogueBoxType} data-story-actor-count={visualState.actors.length} data-story-active-voice-count={activeVoiceCount} data-story-blocking-voice-process-id={blockingVoiceProcessId} data-story-ended-voice-process-id={endedVoiceProcessId} data-story-active-transient-fx-count={activeTransientFxCount} data-story-audio-preload-count={sceneAudioPreloadReport.total} data-story-audio-preload-failed={sceneAudioPreloadReport.failed} data-story-bgm-path={visualState.bgmPath} data-story-pending-bgm-path={visualState.pendingBgmPath} data-story-displayed-dialogue-characters={displayedCharacters} data-cut-finished={finishedVisualProcessId === currentProcessId} data-effective-wait-click={effectiveWaitClick} data-fast-skip-held={isFastSkipHeld} onWheel={handleTheaterWheel} onClick={(event) => {
            if (audioUnlocked &&
                !isLogOpen &&
                !isSkipOpen &&
                !(event.target as HTMLElement).closest("button, input, a")) {
                goNext();
            }
        }}>
      <svg className={styles.cutsceneColorFilters} aria-hidden="true" focusable="false">
        <defs>
          <filter id="story-sepia-tone" x="-100%" y="-100%" width="300%" height="300%" colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values={STORY_SEPIA_COLOR_MATRIX}/>
          </filter>
        </defs>
      </svg>
      <div className={styles.cutsceneViewport}>
        <LooseShakeViewport className={styles.looseShakeWorld} enabled={visualState.shake} revision={visualState.shakeRevision}>
        <div className={styles.backgroundManager} data-story-layer="background-manager">
      {visualState.previousBackgroundUrl ||
            visualState.previousBackgroundSpine ? (<div key={`previous-${visualState.previousBackgroundUrl || visualState.previousBackgroundSpine?.id}-${commandIndex}`} className={`${styles.backgroundPosition} ${styles.previousBackground}`} data-story-layer="previous-background" data-story-offset-x={visualState.previousBackgroundOffsetX} data-story-offset-y={visualState.previousBackgroundOffsetY} style={{
                transform: `translate(${scaleReferencePixels(visualState.previousBackgroundOffsetX)}, ${scaleReferencePixels(-visualState.previousBackgroundOffsetY)})`,
            }}>
          <div className={styles.backgroundScale} data-story-layer="previous-background-scale" data-story-scale-x={visualState.previousBackgroundScaleX} data-story-scale-y={visualState.previousBackgroundScaleY} style={{
                transform: `scale(${visualState.previousBackgroundScaleX}, ${visualState.previousBackgroundScaleY})`,
            }}>
            <div className={`${styles.backgroundGraphic} ${styles.backgroundTintGraphic}${previousGameObjectUsesCoverSurface ? ` ${styles.gameObjectCoverSurface}` : ""}`} data-story-background-graphic="true" data-story-game-object-aspect={previousGameObjectUsesCoverSurface ? "cover-16-9" : undefined} data-story-layer="previous-background-tint" data-story-tint-start={visualState.previousBackgroundTintStart.join(",")} data-story-tint-end={visualState.previousBackgroundTintEnd.join(",")} style={{
                "--story-bg-opacity-start": unityColorAlpha(visualState.previousBackgroundSpine
                    ? [1, 1, 1, 1]
                    : visualState.previousBackgroundTintStart),
                "--story-bg-opacity-end": unityColorAlpha(visualState.previousBackgroundSpine
                    ? [1, 1, 1, 1]
                    : visualState.previousBackgroundTintEnd),
                "--story-bg-tint-start": unityColorToOpaqueCss(visualState.previousBackgroundSpine
                    ? [1, 1, 1, 1]
                    : visualState.previousBackgroundTintStart),
                "--story-bg-tint-end": unityColorToOpaqueCss(visualState.previousBackgroundSpine
                    ? [1, 1, 1, 1]
                    : visualState.previousBackgroundTintEnd),
                "--story-bg-tint-time": `${visualState.previousBackgroundSpine ? 0 : visualState.previousBackgroundTintTimeMs}ms`,
                "--story-bg-tint-ease": getStoryUnityEaseCss(visualState.previousBackgroundTintEase, visualState.previousBackgroundTintTimeMs),
            } as React.CSSProperties}>
              {visualState.previousBackgroundSpine ? (<div className={styles.backgroundSpine}>
                  <StorySpineActor asset={visualState.previousBackgroundSpine} face={visualState.previousBackgroundSpineAnimation} loop={visualState.previousBackgroundSpineLoop} fitMode="background" tintTransition={previousBackgroundSpineTint} paused={isUiHidden} label=""/>
                </div>) : (<Image src={visualState.previousBackgroundUrl} alt="" fill priority unoptimized className={styles.backgroundImage}/>)}
              {!visualState.previousBackgroundSpine ? (<i className={styles.backgroundColor} aria-hidden="true"/>) : null}
            </div>
          </div>
        </div>) : null}

      {hasCurrentBackgroundLayer ? (<div key="current-background" ref={backgroundPositionRef} className={styles.backgroundPosition} data-story-layer="current-background" data-story-offset-x={visualState.backgroundOffsetX} data-story-offset-y={visualState.backgroundOffsetY} data-story-preserve-on-player-click={visualState.backgroundAnimationNoWait || undefined} style={{
                transform: `translate(${scaleReferencePixels(visualState.backgroundOffsetX)}, ${scaleReferencePixels(-visualState.backgroundOffsetY)})`,
                transitionDuration: `${visualState.backgroundPositionTransitionMs}ms`,
                transitionTimingFunction: getStoryUnityEaseCss(visualState.backgroundPositionEase, visualState.backgroundPositionTransitionMs),
            }}>
          <div ref={backgroundScaleRef} className={styles.backgroundScale} data-story-layer="current-background-scale" data-story-scale-x={visualState.backgroundScaleX} data-story-scale-y={visualState.backgroundScaleY} data-story-preserve-on-player-click={visualState.backgroundAnimationNoWait || undefined} style={{
                transform: `scale(${visualState.backgroundScaleX}, ${visualState.backgroundScaleY})`,
                transitionDuration: `${visualState.backgroundTransitionMs}ms`,
                transitionTimingFunction: getStoryUnityEaseCss(visualState.backgroundScaleEase, visualState.backgroundTransitionMs),
            }}>
            <CrashJitter className={styles.backgroundCrash} strength={visualState.backgroundCrashStrength} durationMs={visualState.backgroundCrashTimeMs} revision={currentProcessId} paused={isUiHidden} finished={finishedVisualProcessId === currentProcessId} originX={visualState.backgroundOffsetX} originY={visualState.backgroundOffsetY} trackingKey="background">
              <div className={`${styles.backgroundGraphic}${currentGameObjectUsesCoverSurface ? ` ${styles.gameObjectCoverSurface}` : ""}`} data-story-background-graphic="true" data-story-game-object-aspect={currentGameObjectUsesCoverSurface
                ? "cover-16-9"
                : visualState.backgroundGameObject
                    ? "safe-area"
                    : undefined}>
                {visualState.gameObjectEffect?.kind ===
                "mainstream-134011-render-stage" ? (<Mainstream134011RenderStage effect={visualState.gameObjectEffect} animation={visualState.backgroundSpineAnimation} side="back" processId={backgroundEffectProcessId} paused={false}/>) : null}
                {/* NKCUICutScenBGMgr.Open은 GameObject 전체가 아니라
                GetComponentInChildren<SkeletonGraphic>()로 얻은 Graphic에만
                DOColor를 건다. 자식 FXM·Sprite는 같은 위치/Crash 변환만
                공유하고 배경 색상 Tween의 영향을 받지 않는다. */}
                <div key={`background-tint-${commandIndex}`} ref={backgroundGraphicRef} className={styles.backgroundTintGraphic} data-story-background-tint-graphic="true" style={{
                "--story-bg-opacity-start": unityColorAlpha(visualState.backgroundSpine
                    ? [1, 1, 1, 1]
                    : visualState.backgroundTintStart),
                "--story-bg-opacity-end": unityColorAlpha(visualState.backgroundSpine
                    ? [1, 1, 1, 1]
                    : visualState.backgroundTintEnd),
                "--story-bg-tint-start": unityColorToOpaqueCss(visualState.backgroundSpine
                    ? [1, 1, 1, 1]
                    : visualState.backgroundTintStart),
                "--story-bg-tint-end": unityColorToOpaqueCss(visualState.backgroundSpine
                    ? [1, 1, 1, 1]
                    : visualState.backgroundTintEnd),
                "--story-bg-tint-time": `${visualState.backgroundSpine ? 0 : visualState.backgroundTintTimeMs}ms`,
                "--story-bg-tint-ease": getStoryUnityEaseCss(visualState.backgroundTintEase, visualState.backgroundTintTimeMs),
            } as React.CSSProperties}>
                  {visualState.backgroundSpine ? (<div className={styles.backgroundSpine}>
                      <StorySpineActor asset={visualState.backgroundSpine} face={visualState.backgroundSpineAnimation} loop={visualState.backgroundSpineLoop} fitMode="background" tintTransition={currentBackgroundSpineTint} paused={isUiHidden} label=""/>
                    </div>) : visualState.backgroundUrl ? (<Image src={visualState.backgroundUrl} alt="" fill priority unoptimized className={styles.backgroundImage}/>) : null}
                  {!visualState.backgroundSpine ? (<i ref={backgroundColorRef} className={styles.backgroundColor} aria-hidden="true"/>) : (<i ref={backgroundColorRef} hidden aria-hidden="true"/>)}
                </div>
                {visualState.gameObjectEffect?.kind ===
                "slash-trace-material-fxm" ? (<StorySlashTraceEffect key={`game-object-${backgroundEffectProcessId}`} effect={visualState.gameObjectEffect} processId={backgroundEffectProcessId} paused={false} className={styles.slashTraceMaterialFxmEffect}/>) : null}
                {visualState.gameObjectEffect?.kind === "fire-ambient" ? (<FireAmbientEffect effect={visualState.gameObjectEffect} processId={backgroundEffectProcessId}/>) : null}
                {visualState.gameObjectEffect?.kind ===
                "mainstream-134011-render-stage" ? (<Mainstream134011RenderStage effect={visualState.gameObjectEffect} animation={visualState.backgroundSpineAnimation} side="front" processId={backgroundEffectProcessId} paused={false}/>) : null}
                {visualState.gameObjectEffect?.kind === "wave-sprite-fxm" ? (<>
                    <GunshotSpriteFxmEffect key={`game-object-${backgroundEffectProcessId}`} effect={visualState.gameObjectEffect} processId={backgroundEffectProcessId} paused={false} className={styles.waveSpriteFxmEffect}/>
                    {visualState.gameObjectEffect.waveAura ? (<StoryWaveAuraEffect key={`game-object-wave-aura-${backgroundEffectProcessId}`} effect={visualState.gameObjectEffect.waveAura} processId={backgroundEffectProcessId} paused={false} className={styles.waveAuraFxmEffect}/>) : null}
                    {visualState.gameObjectEffect.waveDistortion ? (<StoryWaveDistortionEffect key={`game-object-wave-distortion-${backgroundEffectProcessId}`} effect={visualState.gameObjectEffect.waveDistortion} processId={backgroundEffectProcessId} paused={false} className={styles.waveDistortionFxmEffect}/>) : null}
                  </>) : null}
                {visualState.gameObjectEffect?.kind === "memory-ui-image-fxm" ? (<GunshotSpriteFxmEffect key={`game-object-${backgroundEffectProcessId}`} effect={visualState.gameObjectEffect} processId={backgroundEffectProcessId} paused={false} className={styles.memoryUiImageFxmEffect}/>) : null}
                {visualState.gameObjectEffect?.kind === "break-ui-image-fxm" ? (<GunshotSpriteFxmEffect key={`game-object-${backgroundEffectProcessId}`} effect={visualState.gameObjectEffect} processId={backgroundEffectProcessId} paused={false} className={styles.breakUiImageFxmEffect}/>) : null}
                {visualState.gameObjectEffect?.kind === "rewind-sprite-fxm" ? (<GunshotSpriteFxmEffect key={`game-object-${backgroundEffectProcessId}`} effect={visualState.gameObjectEffect} processId={backgroundEffectProcessId} paused={false} className={styles.rewindSpriteFxmEffect}/>) : null}
                {visualState.gameObjectEffect?.kind === "wave-render-stage-fxm" ? (<WaveRenderStageFxmEffect key={`game-object-wave-render-${backgroundEffectProcessId}`} effect={visualState.gameObjectEffect} processId={backgroundEffectProcessId} paused={false}/>) : null}
                {visualState.gameObjectEffect?.kind === "camera-sprite-fxm" ? (<GunshotSpriteFxmEffect key={`game-object-${backgroundEffectProcessId}`} effect={visualState.gameObjectEffect} processId={backgroundEffectProcessId} paused={false} className={styles.cameraSpriteFxmEffect}/>) : null}
                {visualState.gameObjectEffect?.kind ===
                "circuit-board-render-texture" ? (<>
                    <StoryCircuitBoardEffect key={`circuit-board-${backgroundEffectProcessId}`} effect={visualState.gameObjectEffect} processId={backgroundEffectProcessId} paused={false} className={styles.circuitBoardRenderTexture}/>
                    <GunshotSpriteFxmEffect key={`circuit-board-sprites-${backgroundEffectProcessId}`} effect={visualState.gameObjectEffect} processId={backgroundEffectProcessId} paused={false} className={styles.circuitBoardSpriteFxmEffect}/>
                  </>) : null}
                {visualState.gameObjectEffect?.kind === "chain-ui-mesh-fxm" ? (<StoryChainEffect key={`chain-${backgroundEffectProcessId}`} effect={visualState.gameObjectEffect} processId={backgroundEffectProcessId} paused={false} className={styles.chainUiMeshFxmEffect}/>) : null}
                {visualState.gameObjectEffect?.kind === "ice-material-fxm" ? (<StoryIceMaterialEffect key={`game-object-${backgroundEffectProcessId}`} effect={visualState.gameObjectEffect} processId={backgroundEffectProcessId} paused={false} className={styles.iceMaterialFxmEffect}/>) : null}
              </div>
            </CrashJitter>
          </div>
        </div>) : visualState.previousBackgroundUrl ||
            visualState.previousBackgroundSpine ? null : (<div className={styles.backgroundFallback} data-game-object={visualState.backgroundGameObject}/>)}

      <div className={styles.gameObjectOverlayEffects} data-story-game-object-overlay-effects="true">
        {visualState.previousGameObjectEffect?.kind === "blood-spread" ? (<BloodSpreadEffect key={`previous-game-object-${previousBackgroundEffectProcessId}`} effect={visualState.previousGameObjectEffect} processId={previousBackgroundEffectProcessId} slot="previous"/>) : null}
        {visualState.gameObjectEffect?.kind === "blood-spread" ? (<BloodSpreadEffect key={`game-object-${backgroundEffectProcessId}`} effect={visualState.gameObjectEffect} processId={backgroundEffectProcessId} slot="current"/>) : null}
        {visualState.gameObjectEffect?.kind === "slash-clank" ? (<SlashClankEffect key={`game-object-${backgroundEffectProcessId}`} effect={visualState.gameObjectEffect} processId={backgroundEffectProcessId} paused={false}/>) : null}
        {visualState.gameObjectEffect?.kind === "gunshot-sprite-fxm" ? (<GunshotSpriteFxmEffect key={`game-object-${backgroundEffectProcessId}`} effect={visualState.gameObjectEffect} processId={backgroundEffectProcessId} paused={false}/>) : null}
        {visualState.gameObjectEffect?.kind === "ink" ||
            visualState.gameObjectEffect?.kind === "ink-2" ? (<InkEffect key={`game-object-${backgroundEffectProcessId}`} effect={visualState.gameObjectEffect} processId={backgroundEffectProcessId} paused={false}/>) : null}
        {visualState.gameObjectEffect?.kind === "screen-film" ? (<ScreenFilmEffect key={`game-object-${backgroundEffectProcessId}`} effect={visualState.gameObjectEffect} processId={backgroundEffectProcessId} paused={false}/>) : null}
      </div>
        </div>

      <div className={styles.actorStage}>
        {renderedActors.map(({ actor, active }) => {
            const character = characters[actor.characterId];
            const crashStopped = stoppedActorCrashProcessId === currentProcessId;
            const crashOverridesMovement = doesStoryActorCrashOverrideMovement(actor, crashStopped);
            if (!character?.spine) {
                return null;
            }
            return (<div key={`${actor.slot}-${actor.spineViewKey}`} className={styles.actor} data-slot={actor.slot} data-character-id={actor.characterId} data-character-view-key={actor.characterViewKey} data-spine-view-key={actor.spineViewKey} data-active={active} data-fade-in={actor.fadeIn} data-fade-out={actor.fadeOut} data-hidden={!active || actor.hidden} data-moving={actor.moving} data-crash-overrides-movement={crashOverridesMovement} data-scaling={actor.scaleTransitionMs > 0} data-scale-phase={actor.scaleRevision % 2} data-dark={actor.dark} data-whitening={actor.whitening} data-color-tracking={actor.colorTransitionMs > 0 && !actor.whitening} data-color-phase={actor.colorTransitionRevision % 2} data-hologram={actor.hologram} data-hologram-mask={actor.hologramMaskActive} data-hologram-animating={actor.hologramMaskActive && actor.hologramTransitionMs > 0} data-hologram-phase={actor.hologramRevision % 2} data-pinup={actor.pinup} data-pinup-mask={actor.pinupMaskActive} data-pinup-animating={actor.pinupMaskActive && actor.pinupTransitionMs > 0} style={{
                    "--story-actor-scale-x": actor.scaleX * (actor.flip ? -1 : 1),
                    "--story-actor-scale-y": actor.scaleY,
                    "--story-actor-scale-from-x": actor.scaleFromX,
                    "--story-actor-scale-from-y": actor.scaleFromY,
                    "--story-actor-offset-x": scaleReferencePixels(actor.offsetX),
                    "--story-actor-offset-y": scaleReferencePixels(-actor.offsetY),
                    "--story-actor-from-x": scaleReferencePixels(actor.moveFromX),
                    "--story-actor-from-y": scaleReferencePixels(-actor.moveFromY),
                    "--story-actor-movement-time": `${actor.movementMs}ms`,
                    "--story-actor-scale-time": `${actor.scaleTransitionMs}ms`,
                    "--story-actor-opacity": actor.darkAlpha,
                    "--story-actor-color-time": `${actor.colorTransitionMs}ms`,
                    "--story-actor-color-from": actor.colorFromMultiplier,
                    "--story-actor-color-to": actor.colorToMultiplier,
                    "--story-pinup-from-width": scaleReferencePixels(actor.pinupFromWidth),
                    "--story-pinup-to-width": scaleReferencePixels(actor.pinupToWidth),
                    "--story-pinup-time": `${actor.pinupTransitionMs}ms`,
                    "--story-pinup-ease": getStoryUnityEaseCss("InOutQuart", actor.pinupTransitionMs),
                    "--story-hologram-from-width": scaleReferencePixels(actor.hologramFromWidth),
                    "--story-hologram-to-width": scaleReferencePixels(actor.hologramToWidth),
                    "--story-hologram-time": `${actor.hologramTransitionMs}ms`,
                    "--story-actor-bounce-time": `${actor.bounceTimeMs * 2}ms`,
                    "--story-actor-bounce-count": actor.bounceCount,
                } as React.CSSProperties}>
              <div className={styles.actorFade}>
                <div className={styles.actorColor} data-story-preserve-on-player-click="true" data-story-actor-color-layer="true">
                  {actor.hologram ? (<div key={`hologram-effect-${actor.hologramRevision}`} className={styles.hologramEffect} data-opening={actor.hologramTransitionMs > 0} data-story-passive-animation="true" aria-hidden="true" style={{
                        "--story-hologram-texture": ui.AB_FX_UI_HOLOGRAMFX
                            ? `url("${deploymentUrl(`${ui.AB_FX_UI_HOLOGRAMFX}`)}")` : "none",
                    } as React.CSSProperties}>
                      <i className={styles.hologramTexture}/>
                      <i className={styles.hologramScanline} data-line="1" data-story-passive-animation="true"/>
                      <i className={styles.hologramScanline} data-line="2" data-story-passive-animation="true"/>
                      {Array.from({ length: 6 }, (_, index) => (<i key={index} className={styles.hologramGlitch} data-glitch={index + 1} data-story-passive-animation="true"/>))}
                    </div>) : null}
                  <div className={styles.actorBounce} data-bouncing={actor.bounceCount > 0 &&
                    actor.bounceTimeMs > 0 &&
                    stoppedActorBounceProcessId !== currentProcessId} data-story-passive-animation="true">
                    <CrashJitter className={styles.actorCrash} strength={actor.crashStrength} revision={currentProcessId} paused={!active || isUiHidden} finished={crashStopped} originX={getActorSlotReferencePosition(actor.slot).x + actor.offsetX} originY={getActorSlotReferencePosition(actor.slot).y + actor.offsetY} mode="actor" trackingKey={`actor-${actor.slot}`}>
                      <div className={styles.actorHologramMask} data-story-passive-animation="true">
                        <div className={styles.actorPinupMask} data-story-passive-animation="true">
                          <i className={styles.actorPinupBackground} aria-hidden="true"/>
                          <div className={styles.actorScale}>
                            <div className={styles.actorSpineStack}>
                              {character.backgroundSpine &&
                    (!character.backgroundSpine.exceptional ||
                        character.background) ? (<div className={styles.actorSpineBackground} data-story-character-background-spine="true" data-story-character-background-exceptional={character.backgroundSpine.exceptional}>
                                  <StorySpineActor asset={character.backgroundSpine.asset} face="" loop={character.backgroundSpine.prefabLoop} instanceId={`${spinePlaybackSessionId}:${actor.spineViewKey}:background`} trackTimeTransferFrom={actor.spineTrackTimeSourceKey
                        ? `${spinePlaybackSessionId}:${actor.spineTrackTimeSourceKey}:background`
                        : ""} skinName={character.skinName} skinOption={character.skinOption} prefabSkinName={character.backgroundSpine.prefabSkinName} prefabAnimation={character.backgroundSpine.prefabAnimation} prefabAnimationOnly prefabAnimationLoop={character.backgroundSpine.prefabLoop} backgroundEnabled={character.background} tintColor={actor.hologram
                        ? HOLOGRAM_CHARACTER_COLOR
                        : null} paused={!active} label=""/>
                                </div>) : null}
                              {character.exceptionalVfxEffect &&
                    character.exceptionalVfxEffect.characterLayer !== "front" &&
                    (!character.exceptionalVfxEffect.backgroundOnly ||
                        character.background) ? (<CharacterExceptionalFxmEffect key={`${actor.spineViewKey}:exceptional-vfx`} effect={character.exceptionalVfxEffect} processId={`${currentProcessId}:${actor.spineViewKey}:exceptional-vfx`} paused={!active} spineInstanceId={`${spinePlaybackSessionId}:${actor.spineViewKey}`} className={styles.actorSpineExceptionalBackEffect}/>) : null}
                              <div className={styles.actorSpineMain}>
                                <StorySpineActor asset={character.spine} face={actor.face} commandFace={actor.commandFace} loop={actor.faceLoop} animationRevision={actor.faceRevision} instanceId={`${spinePlaybackSessionId}:${actor.spineViewKey}`} trackedBoneNames={[
                    ...(character.spineEventEffect?.trackedSpineBones ?? []),
                    ...(character.exceptionalVfxEffect?.trackedSpineBones ?? []),
                ]} trackTimeTransferFrom={actor.spineTrackTimeSourceKey
                    ? `${spinePlaybackSessionId}:${actor.spineTrackTimeSourceKey}`
                    : ""} skinName={character.skinName} skinOption={character.skinOption} prefabSkinName={character.prefabSkinName} prefabAnimation={character.prefabAnimation} prefabAnimationLoop={character.prefabLoop} backgroundEnabled={character.background} tintColor={actor.hologram
                    ? HOLOGRAM_CHARACTER_COLOR
                    : null} paused={!active} label={character.name}/>
                              </div>
                              {character.exceptionalVfxEffect &&
                    character.exceptionalVfxEffect.characterLayer === "front" &&
                    (!character.exceptionalVfxEffect.backgroundOnly ||
                        character.background) ? (<CharacterExceptionalFxmEffect key={`${actor.spineViewKey}:exceptional-vfx-front`} effect={character.exceptionalVfxEffect} processId={`${currentProcessId}:${actor.spineViewKey}:exceptional-vfx-front`} paused={!active} spineInstanceId={`${spinePlaybackSessionId}:${actor.spineViewKey}`} className={styles.actorSpineExceptionalFrontEffect}/>) : null}
                              {character.spineEventEffect &&
                    isStorySpineEventAnimationActive(character.spineEventEffect, actor.face) ? (<GunshotSpriteFxmEffect key={`${actor.spineViewKey}:${actor.faceRevision}:spine-event`} effect={{
                        ...character.spineEventEffect,
                        loop: actor.faceLoop,
                    }} processId={`${currentProcessId}:${actor.spineViewKey}:${actor.faceRevision}`} paused={!active} spineInstanceId={`${spinePlaybackSessionId}:${actor.spineViewKey}`} className={styles.actorSpineEventEffect}/>) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CrashJitter>
                  </div>
                </div>
              </div>
            </div>);
        })}
      </div>

        </LooseShakeViewport>

      {visualState.imageUrl ? (<div key={visualState.imageName} className={styles.cutsceneImageLayer} data-story-layer="cutscene-image" data-story-image-name={visualState.imageName} data-story-image-transition-ms={visualState.imageTransitionMs} style={{
                transform: `translate(-50%, -50%) translate(${scaleReferencePixels(visualState.imageOffsetX)}, ${scaleReferencePixels(-visualState.imageOffsetY)}) scale(${visualState.imageScale})`,
                "--story-image-fade-time": `${visualState.imageTransitionMs}ms`,
            } as React.CSSProperties}>
          <Image src={visualState.imageUrl} alt="" fill unoptimized className={styles.cutsceneImage}/>
        </div>) : null}

      {visualState.movieUrl ? (<video key={`${currentProcessId}:${visualState.movieUrl}`} ref={movieRef} src={deploymentUrl(visualState.movieUrl)} className={styles.cutsceneMovie} autoPlay playsInline onCanPlay={() => setPreparedMovieProcessId(currentProcessId)} onPlaying={() => setPreparedMovieProcessId(currentProcessId)} onEnded={() => goToCommand(commandIndex + 1)} onError={() => goToCommand(commandIndex + 1)}/>) : null}

      {visualState.fadeActive || visualState.fadeCovered || visualState.fadeOpacity > 0 ? (<div key={`fade-${currentCommand?.key ?? 0}-${commandIndex}`} ref={fadeLayerRef} className={styles.fadeLayer} data-story-layer="global-fade" data-story-passive-animation="true" data-active={visualState.fadeActive} data-covered={visualState.fadeCovered} data-fade-in={visualState.fadeIn} data-white={visualState.fadeWhite} style={{
                "--story-fade-time": `${visualState.fadeTimeMs || 900}ms`,
                "--story-fade-opacity": visualState.fadeOpacity,
            } as React.CSSProperties}/>) : null}
      {visualState.flash ? (<div key={`flash-${visualState.flashRevision}`} className={styles.flashLayer} data-story-passive-animation="true" data-story-finish-on-player-click="true" onAnimationEnd={() => finishFlash(visualState.flashRevision)} style={{
                "--story-flash-time": `${visualState.flashTimeMs}ms`,
            } as React.CSSProperties}/>) : null}

      {<>
          <header className={styles.cutsceneTopMenu}>
            {controlVisibility.log || controlVisibility.pause ? (<>
                {controlVisibility.log ? (<button ref={cutsceneLogButtonRef} type="button" className={styles.logButton} data-story-cutscene-log-hotkey-target="log-button" data-story-cutscene-hotkey-display-target="player-log" data-story-ui-click-sound="select" onClick={(event) => {
                        playStoryUiPointerSound(event);
                        openStoryLog();
                    }}>
                    <UiSprite src={ui.NKM_UI_CUTSCEN_BUTTON_LOG} alt="LOG" width={155} height={69}/>
                  </button>) : null}
                {controlVisibility.pause ? (<button type="button" className={styles.hideUiButton} aria-label="UI 숨기기" data-story-ui-click-sound="select" onClick={(event) => {
                        playStoryUiPointerSound(event);
                        disableStoryAuto();
                        setIsUiHidden(true);
                    }}>
                    <UiSprite src={ui.NKM_UI_CUTSCEN_HIDE_OFF} alt="UI 숨기기" width={82} height={60}/>
                  </button>) : null}
              </>) : null}
            <div className={styles.cutsceneControls}>
              {controlVisibility.auto ? (<button type="button" className={styles.autoButton} data-active={isAuto} data-story-ui-click-sound="select" onClick={(event) => {
                    playStoryUiPointerSound(event);
                    setIsAuto((current) => {
                        const next = !current;
                        writeStoryAutoPreference(next);
                        return next;
                    });
                }}>
                  <UiSprite src={isAuto
                    ? ui.NKM_UI_CUTSCEN_BUTTON_AUTO
                    : ui.NKM_UI_CUTSCEN_BUTTON_AUTO_OFF} alt="AUTO" width={165} height={68}/>
                  {isAuto && ui.NKM_UI_ADDITIVE_LIGHT ? (<span className={styles.autoButtonLight} aria-hidden="true" style={{
                        "--story-auto-light": `url("${deploymentUrl(`${ui.NKM_UI_ADDITIVE_LIGHT}`)}")`,
                    } as React.CSSProperties}/>) : null}
                </button>) : null}
              {controlVisibility.skip ? (<button type="button" className={styles.skipButton} data-story-ui-click-sound="select" onClick={(event) => {
                    playStoryUiPointerSound(event);
                    if (isMovieCommand) {
                        movieRef.current?.pause();
                        setIsSkipOpen(true);
                    }
                    else {
                        leaveTheater();
                    }
                }}>
                  <UiSprite src={ui.NKM_UI_CUTSCEN_BUTTON_SKIP} alt="SKIP" width={162} height={68}/>
                </button>) : null}
            </div>
            {controlVisibility.restore ? (<button type="button" className={styles.restoreUiButton} aria-label="UI 표시" data-story-ui-click-sound="select" onClick={(event) => {
                    playStoryUiPointerSound(event);
                    setIsUiHidden(false);
                }}>
                <UiSprite src={ui.NKM_UI_CUTSCEN_HIDE_ON} alt="UI 표시" width={82} height={60}/>
              </button>) : null}
          </header>

          {storyTitleEnabled && closingTitle ? (<section key={`closing-title-${closingTitle.processId}`} className={styles.centerCaption} data-story-layer="title-manager" data-closing="true" data-story-text-hidden={!storyTitleVisible} data-story-passive-animation="true" style={{
                    "--story-title-fade-duration": `${closingTitle.durationMs / 2}ms`,
                    "--story-title-fade-delay": `${closingTitle.durationMs / 2}ms`,
                } as React.CSSProperties}>
              {closingTitle.subtitleText ? (<span data-story-layer="title-subtitle">
                  {renderUnityText(closingTitle.subtitleText)}
                </span>) : null}
              {closingTitle.titleText ? (<p data-story-layer="title-main">
                  {renderUnityText(closingTitle.titleText)}
                </p>) : null}
            </section>) : null}

          {storyTitleEnabled && (titleMain || titleSub) ? (<section key={`title-${commandIndex}`} className={styles.centerCaption} data-story-layer="title-manager" data-story-text-hidden={!storyTitleVisible}>
              {titleSub ? (<span data-story-layer="title-subtitle">
                  {renderUnityText(titleSub, displayedSubtitleCharacters)}
                </span>) : null}
              {titleMain ? (<p data-story-layer="title-main">
                  {renderUnityText(titleMain, displayedTitleCharacters)}
                </p>) : null}
            </section>) : null}

          {storyTalkEnabled &&
                visualState.dialogueBoxType === "center" ? (<section key={`center-talk-${commandIndex}`} className={styles.centerDialogue} data-story-log-animation-paused={isLogOpen || undefined} data-story-text-hidden={!storyTalkVisible} data-fade-in={visualState.dialogueFadeIn} data-fade-out={centerFadeOutProcessId === currentProcessId} style={{
                    "--story-center-fade-time": `${visualState.dialogueFadeTimeMs}ms`,
                    "--story-center-background-alpha": visualState.dialogueCenterFadePrimed
                        ? 0.7
                        : 160 / 255,
                } as React.CSSProperties}>
              <i className={styles.centerDialogueBackground} data-story-passive-animation="true" aria-hidden="true"/>
              <span className={styles.centerDialogueText}>
                {renderUnityText(visualState.dialogueText, restoredClosedTalkActive
                    ? visibleDialogueLength
                    : displayedCharacters)}
              </span>
              {showNextIndicator ? (<Image src={ui.NKM_UI_CUTSCEN_NEXT_ICON} alt="" width={45} height={45} unoptimized className={`${styles.nextIndicator} ${styles.nextIndicatorCenter}`}/>) : null}
            </section>) : storyTalkEnabled && showDialogue ? (<section className={styles.dialoguePanel} data-story-log-animation-paused={isLogOpen || undefined} data-story-text-hidden={!storyTalkVisible} data-opening={visualState.dialogueOpening} style={{
                    "--story-dialogue-open-time": `${visualState.dialogueOpeningTimeMs}ms`,
                } as React.CSSProperties}>
              {sceneError ? (<p className={styles.loadingText}>{sceneError}</p>) : !scene ? (<p className={styles.loadingText}>컷신을 읽는 중입니다.</p>) : currentCommand ? (<>
                  {currentSpeaker?.nameMarkup || currentSpeaker?.name ? (<strong className={styles.speakerName} data-story-speaker-temp-space={visualState.speakerNameHasTempSpace}>
                      {renderUnityText(currentSpeaker.nameMarkup || currentSpeaker.name)}
                      {visualState.speakerNameHasTempSpace ? " " : null}
                    </strong>) : null}
                  <p className={styles.dialogueText}>
                    {renderUnityText(visualState.dialogueText, restoredClosedTalkActive
                        ? visibleDialogueLength
                        : displayedCharacters)}
                  </p>
                  {showNextIndicator ? (<Image src={nextIndicatorVariant === "japan-needs"
                            ? ui.NKM_UI_CUTSCEN_NEXT_ICON_2
                            : ui.NKM_UI_CUTSCEN_NEXT_ICON} alt="" width={63} height={34} unoptimized className={`${styles.nextIndicator} ${styles.nextIndicatorDialogue}`}/>) : null}
                </>) : null}
            </section>) : null}

          {choices.length ? (<div className={styles.choiceList} role="group" aria-label="선택지">
              {choices.map((choice) => (<button key={`${choice.commandIndex}-${choice.actionKey}`} type="button" data-story-ui-click-sound="select" onClick={(event) => {
                        playStoryUiPointerSound(event);
                        chooseStoryChoice(choice);
                    }}>
                  <span className={styles.choiceText}>
                    {renderUnityText(choice.text)}
                  </span>
                </button>))}
            </div>) : null}
        </>}

      {!audioUnlocked ? (<button type="button" className={styles.storyStart} onClick={unlockAudio}>
          <span>STORY MODE</span>
          <strong>화면을 눌러 스토리 시작</strong>
          <small>배경음과 효과음이 함께 재생됩니다</small>
        </button>) : null}

      {isSkipOpen && isMovieCommand ? (<div className={styles.confirmBackdrop} role="dialog" aria-modal="true" data-story-movie-skip-confirm="STV-RDR-003" data-story-movie-skip-confirm-hotkeys="Space Return KeypadEnter Keypad5" data-story-movie-skip-confirm-callback="direct" data-story-movie-skip-backdrop="cancel-and-resume" onClick={cancelMovieSkip} style={{
                "--story-popup-box": ui.NKM_UI_POPUP_BOX
                    ? `url("${deploymentUrl(`${ui.NKM_UI_POPUP_BOX}`)}")` : "none",
                "--story-popup-cancel": ui.NKM_UI_POPUP_BLUEBUTTON
                    ? `url("${deploymentUrl(`${ui.NKM_UI_POPUP_BLUEBUTTON}`)}")` : "none",
                "--story-popup-confirm": ui.NKM_UI_POPUP_BUTTON_01
                    ? `url("${deploymentUrl(`${ui.NKM_UI_POPUP_BUTTON_01}`)}")` : "none",
            } as React.CSSProperties}>
          <div className={styles.confirmPanel} data-story-movie-skip-panel="stop-backdrop-propagation" onClick={(event) => event.stopPropagation()}>
            <strong>{STORY_MOVIE_SKIP_TITLE}</strong>
            <p>{STORY_MOVIE_SKIP_DESCRIPTION}</p>
            <div className={styles.confirmActions}>
              <button type="button" data-story-movie-skip-cancel-target="cancel-button" data-story-ui-click-sound="select" onClick={(event) => {
                playStoryUiPointerSound(event);
                cancelMovieSkip();
            }}>
                취 소
              </button>
              <button ref={movieSkipConfirmButtonRef} type="button" data-story-movie-skip-confirm-target="ok-button" data-story-cutscene-hotkey-display-target="movie-skip-confirm" data-story-ui-click-sound="select" onClick={(event) => {
                playStoryUiPointerSound(event);
                confirmMovieSkip();
            }}>
                확 인
              </button>
            </div>
          </div>
        </div>) : null}

      {isLogOpen ? (<div className={styles.logBackdrop} role="dialog" aria-modal="true">
          <section className={styles.logPanel} data-story-log-snapshot-count={storyLogSnapshot.length} data-story-log-live-count={storyLog.length} style={{
                "--story-log-popup-box": ui.NKM_UI_POPUP_BOX
                    ? `url("${deploymentUrl(`${ui.NKM_UI_POPUP_BOX}`)}")` : "none",
                "--story-log-gradient": ui.NKM_UI_POPUP_BG_GRADIENT
                    ? `url("${deploymentUrl(`${ui.NKM_UI_POPUP_BG_GRADIENT}`)}")` : "none",
            } as React.CSSProperties}>
            <button type="button" className={styles.logCloseButton} aria-label="로그 닫기" data-story-ui-click-sound="select" onClick={(event) => {
                playStoryUiPointerSound(event);
                closeStoryLog();
            }}>
              {ui.NKM_UI_CUTSCEN_BACK ? (<Image src={ui.NKM_UI_CUTSCEN_BACK} alt="" width={232} height={70} unoptimized/>) : (<span>←</span>)}
            </button>
            <div className={styles.logStageTitle}>
              <span>{selectedEpisode?.title ?? ""}</span>
              <strong>
                {selectedStage
                ? `${selectedStage.act}-${selectedStage.uiNumber} ${selectedStage.title}`
                : ""}
              </strong>
            </div>
            <div ref={logListRef} data-story-cutscene-hotkey-display-target="log-scroll" data-story-cutscene-log-scroll-hotkey="STV-RDR-002" data-story-cutscene-log-scroll-physics="STV-RDR-007" data-story-cutscene-log-scroll-hotkey-speed={STORY_CUTSCENE_LOG_SCROLL_HOTKEY_SPEED} data-story-cutscene-log-scroll-drag-threshold={STORY_CUTSCENE_LOG_SCROLL_DRAG_THRESHOLD} data-story-cutscene-log-scroll-deceleration={STORY_CUTSCENE_LOG_SCROLL_DECELERATION_RATE} data-story-cutscene-log-scroll-wheel-multiplier={STORY_CUTSCENE_LOG_SCROLL_WHEEL_MULTIPLIER} data-story-cutscene-log-scroll-wheel-rubber-scale={STORY_CUTSCENE_LOG_SCROLL_WHEEL_RUBBER_SCALE} data-story-cutscene-log-scroll-hotkey-direction="idle" data-story-cutscene-log-scroll-component="LoopVerticalScrollRect" data-story-cutscene-log-scroll-axis="vertical" data-story-cutscene-log-scroll-movement="elastic" data-story-cutscene-log-scroll-rubber-y="0.000" data-story-cutscene-log-scroll-rubber-velocity="0.000" data-story-cutscene-log-scroll-velocity="0.000" data-story-cutscene-log-scroll-top="0.000" data-story-cutscene-log-scroll-motion="idle" data-story-cutscene-log-scroll-pointer="idle" data-story-cutscene-log-scroll-component-dragging="false" data-story-cutscene-log-scroll-close="wheel-only" className={styles.logList}>
              <div data-story-cutscene-log-scroll-hotkey-content="STV-RDR-002" data-story-cutscene-log-scroll-physics-content="STV-RDR-007" className={styles.logContent}>
                {storyLogSnapshot.map((entry, index) => {
                if (!entry.text) {
                    return null;
                }
                return (<div key={`${entry.key}-${index}`}>
                      {entry.voicePath ? (<button type="button" className={styles.logVoiceButton} aria-label="음성 다시 듣기" data-story-ui-click-sound="select" onClick={(event) => {
                            playStoryUiPointerSound(event);
                            const replayProcessId = `${currentProcessId}:log:${entry.key}:${index}`;
                            setEndedVoiceProcessId("");
                            setLogReplayVoiceProcessId(replayProcessId);
                            playVoice(entry.voicePath, replayProcessId, true);
                        }}>
                          {ui.NKM_UI_CUTSCEN_BUTTON_AUTO_VOICE ? (<Image src={ui.NKM_UI_CUTSCEN_BUTTON_AUTO_VOICE} alt="" width={50} height={50} draggable={false} unoptimized/>) : (<span>▶</span>)}
                        </button>) : null}
                      <span>{renderUnityText(entry.text)}</span>
                    </div>);
            })}
              </div>
            </div>
          </section>
        </div>) : null}
      </div>
      {operationScrollHotkeyOverlay}
      {cutsceneHotkeyOverlay}
    </main>);
}
