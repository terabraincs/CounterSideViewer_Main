"use client";
import { deploymentUrl } from "@/lib/deployment";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode, } from "react";
import NextImage from "@/components/DeploymentImage";
import { getSpineAnimationLabel, getSpineSkinLabel } from "@/lib/spineDisplayNames";
import SpineNameSelect from "./SpineNameSelect";
import SearchInput from "./SearchInput";
import { useCharacterSpineEffects } from "./useCharacterSpineEffects";
import type { CharacterSkillPlaybackRequest } from "./CharacterSkillPlayback";
import styles from "./SpineViewer.module.css";
type SpineCategory = {
    id: string;
    label: string;
    count: number;
};
export type SpineModel = {
    id: string;
    kind: "spine" | "image";
    category: string;
    categories?: string[];
    name: string;
    displayName?: string;
    bundle: string;
    variant: string;
    relativeDirectory: string;
    jsonUrl: string;
    atlasUrl: string;
    textureUrl: string;
    bytes: {
        json: number;
        atlas: number;
        texture: number;
    };
};
export type SpineBackgroundLayer = {
    model: SpineModel;
    // Original prefab background-to-character transform, in Spine pixels (Y down).
    transform: {
        a: number;
        b: number;
        c: number;
        d: number;
        tx: number;
        ty: number;
    };
    animation?: string;
    skin?: string;
    loop?: boolean;
};
type SpineManifest = {
    version: number;
    spineVersion: string;
    count: number;
    categories: SpineCategory[];
    models: SpineModel[];
};
type RuntimeModules = {
    pixi: typeof import("pixi.js");
    spineBase: typeof import("@pixi-spine/base");
    spineRuntime: typeof import("@pixi-spine/runtime-3.7");
};
type PixiApplication = import("pixi.js").Application;
type PixiBaseTexture = import("pixi.js").BaseTexture;
type SpineDisplay = import("@pixi-spine/runtime-3.7").Spine;
type SpineAtlas = import("@pixi-spine/base").TextureAtlas;
type JsonObject = Record<string, unknown>;
const MIN_ZOOM = 0.02;
const MAX_ZOOM = 8;
const AUTO_FIT_DELAY_MS = 400;
const employeeAssetCategoryIds = [
    "card",
    "illustration",
    "combat",
    "sd",
] as const;
const operatorAssetCategoryIds = [
    "operator_card",
    "operator_illustration",
] as const;
const backgroundOptions = [
    { id: "grid", label: "격자" },
    { id: "dark", label: "어두운색" },
    { id: "light", label: "밝은색" },
    { id: "green", label: "그린스크린" },
] as const;
type BackgroundId = (typeof backgroundOptions)[number]["id"];
export type SpineInitialState = {
    animation?: string;
    skin?: string;
    flipX?: boolean;
    flipY?: boolean;
    background?: BackgroundId;
};
function formatBytes(bytes: number) {
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    if (bytes < 1048576) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / 1048576).toFixed(1)} MB`;
}
function getModelBytes(model: SpineModel) {
    return model.bytes.json + model.bytes.atlas + model.bytes.texture;
}
function getModelDisplayName(model: SpineModel) {
    return model.displayName ?? model.name;
}
function getModelCategoryIds(model: SpineModel) {
    return model.categories?.length ? model.categories : [model.category];
}
function findDefaultAnimation(animationNames: string[]) {
    const priorities = ["IDLE", "ASTAND", "STAND", "LOOP", "INTRO"];
    for (const priority of priorities) {
        const exact = animationNames.find((name) => name.toUpperCase() === priority);
        if (exact) {
            return exact;
        }
    }
    return (animationNames.find((name) => /idle|stand|loop/i.test(name)) ??
        animationNames[0] ??
        "");
}
function isJsonObject(value: unknown): value is JsonObject {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function jsonObjectValues(value: unknown) {
    return isJsonObject(value) ? Object.values(value) : [];
}
function normalizeTimeline(value: unknown) {
    if (!Array.isArray(value)) {
        return;
    }
    for (const frame of value) {
        if (isJsonObject(frame) && !("time" in frame)) {
            frame.time = 0;
        }
    }
}
function normalizeSpineTimelineTimes(skeletonJson: unknown) {
    if (!isJsonObject(skeletonJson)) {
        return;
    }
    const animations = skeletonJson.animations;
    if (!isJsonObject(animations)) {
        return;
    }
    for (const animationValue of Object.values(animations)) {
        if (!isJsonObject(animationValue)) {
            continue;
        }
        for (const sectionName of ["slots", "bones"] as const) {
            for (const target of jsonObjectValues(animationValue[sectionName])) {
                for (const timeline of jsonObjectValues(target)) {
                    normalizeTimeline(timeline);
                }
            }
        }
        for (const sectionName of ["ik", "transform"] as const) {
            for (const timeline of jsonObjectValues(animationValue[sectionName])) {
                normalizeTimeline(timeline);
            }
        }
        for (const constraint of jsonObjectValues(animationValue.paths)) {
            for (const timeline of jsonObjectValues(constraint)) {
                normalizeTimeline(timeline);
            }
        }
        for (const skin of jsonObjectValues(animationValue.deform)) {
            for (const slot of jsonObjectValues(skin)) {
                for (const timeline of jsonObjectValues(slot)) {
                    normalizeTimeline(timeline);
                }
            }
        }
        normalizeTimeline(animationValue.drawOrder);
        normalizeTimeline(animationValue.draworder);
        normalizeTimeline(animationValue.events);
    }
}
function loadImage(url: string, signal: AbortSignal) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        function abort() {
            image.src = "";
            reject(new DOMException("요청이 취소되었습니다.", "AbortError"));
        }
        image.onload = () => {
            signal.removeEventListener("abort", abort);
            resolve(image);
        };
        image.onerror = () => {
            signal.removeEventListener("abort", abort);
            reject(new Error(`텍스처를 불러오지 못했습니다: ${url}`));
        };
        signal.addEventListener("abort", abort, { once: true });
        image.crossOrigin = "anonymous";
        image.decoding = "async";
        image.src = deploymentUrl(url);
    });
}
function ZoomPercentageControl({ zoom, disabled, onChange, }: {
    zoom: number;
    disabled: boolean;
    onChange: (nextZoom: number) => void;
}) {
    const [draft, setDraft] = useState<string | null>(null);
    const cancelEditRef = useRef(false);
    function finishEditing(value: string) {
        if (!cancelEditRef.current && value.trim()) {
            const percent = Number(value);
            if (Number.isFinite(percent) && percent > 0) {
                onChange(percent / 100);
            }
        }
        cancelEditRef.current = false;
        setDraft(null);
    }
    if (draft !== null) {
        return (<label className={styles.zoomInput} data-testid="spine-zoom-value">
        <input type="number" inputMode="decimal" min={MIN_ZOOM * 100} max={MAX_ZOOM * 100} step="any" aria-label="확대 배율 입력" value={draft} autoFocus onFocus={(event) => event.currentTarget.select()} onChange={(event) => setDraft(event.target.value)} onBlur={(event) => finishEditing(event.currentTarget.value)} onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === "Escape") {
                    event.preventDefault();
                    cancelEditRef.current = event.key === "Escape";
                    event.currentTarget.blur();
                }
            }}/>
        <span aria-hidden="true">%</span>
      </label>);
    }
    return (<button type="button" className={styles.zoomValue} aria-label="현재 확대 배율" title="확대 배율 직접 입력" disabled={disabled} data-testid="spine-zoom-value" onClick={() => setDraft(String(Math.round(zoom * 100)))}>
      {Math.round(zoom * 100)}%
    </button>);
}
export default function SpineViewer({ embeddedModel, backgroundLayers, modelControls, modelSelector, characterUnitStrId, characterSkinId = 0, costumeSelection, initialState, actionRequest, onActionRequestHandled, compact = false, ariaLabel, onError, }: {
    embeddedModel?: SpineModel;
    backgroundLayers?: readonly SpineBackgroundLayer[];
    modelControls?: ReactNode;
    modelSelector?: ReactNode;
    characterUnitStrId?: string;
    characterSkinId?: number;
    costumeSelection?: {
        value: string;
        options: {
            value: string;
            label: string;
            originalName?: string | null;
            disabled?: boolean;
        }[];
        onChange: (value: string) => void;
    };
    initialState?: SpineInitialState;
    actionRequest?: CharacterSkillPlaybackRequest | null;
    onActionRequestHandled?: (revision: number) => void;
    compact?: boolean;
    ariaLabel?: string;
    onError?: () => void;
} = {}) {
    const isEmbedded = embeddedModel !== undefined;
    const canvasHostRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const runtimeRef = useRef<RuntimeModules | null>(null);
    const appRef = useRef<PixiApplication | null>(null);
    const spineRef = useRef<SpineDisplay | null>(null);
    const atlasRef = useRef<SpineAtlas | null>(null);
    const baseTextureRef = useRef<PixiBaseTexture | null>(null);
    const backgroundCleanupRef = useRef<(() => void) | null>(null);
    const backgroundClockSpineRef = useRef<SpineDisplay | null>(null);
    const backgroundEnabledRef = useRef(true);
    const loadSequenceRef = useRef(0);
    const lastActionRequestRef = useRef<CharacterSkillPlaybackRequest | null>(null);
    const dragRef = useRef({ active: false, x: 0, y: 0 });
    const speedRef = useRef(1);
    const playingRef = useRef(true);
    const [manifest, setManifest] = useState<SpineManifest | null>(null);
    const [manifestError, setManifestError] = useState("");
    const [query, setQuery] = useState("");
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [selectedModelId, setSelectedModelId] = useState("");
    const [loadedModelId, setLoadedModelId] = useState("");
    const [rendererReady, setRendererReady] = useState(false);
    const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "error">("idle");
    const [loadMessage, setLoadMessage] = useState(isEmbedded ? "모델을 준비하는 중입니다." : "왼쪽 목록에서 모델을 선택하세요.");
    const [animations, setAnimations] = useState<string[]>([]);
    const [skins, setSkins] = useState<string[]>([]);
    const [selectedAnimation, setSelectedAnimation] = useState("");
    const [selectedAction, setSelectedAction] = useState("");
    const [actionRevision, setActionRevision] = useState(0);
    const [selectedSkin, setSelectedSkin] = useState("");
    const [isPlaying, setIsPlaying] = useState(true);
    const [speed, setSpeed] = useState(1);
    const [zoom, setZoom] = useState(1);
    const [background, setBackground] = useState<BackgroundId>(initialState?.background ?? "grid");
    const [backgroundEnabled, setBackgroundEnabled] = useState(true);
    const [backgroundLoadState, setBackgroundLoadState] = useState<"idle" | "loading" | "ready" | "error">("idle");
    const effects = useCharacterSpineEffects({ unitStrId: characterUnitStrId,
        skinId: characterSkinId, modelBundle: embeddedModel?.bundle,
        modelId: embeddedModel && embeddedModel.id !== loadedModelId ? "" : loadedModelId,
        actionId: selectedAction, actionRevision, appRef, spineRef,
        playing: isPlaying, speed, background });
    const effectFitRightRef = useRef(effects.fitRight);
    useEffect(() => { effectFitRightRef.current = effects.fitRight; }, [effects.fitRight]);
    const deferredQuery = useDeferredValue(query.trim().toLowerCase());
    useEffect(() => {
        if (loadState === "error") {
            onError?.();
        }
    }, [loadState, onError]);
    const selectedModel = useMemo(() => {
        return (embeddedModel ??
            manifest?.models.find((model) => model.id === selectedModelId) ?? null);
    }, [embeddedModel, manifest, selectedModelId]);
    const selectedCategorySet = useMemo(() => new Set(selectedCategoryIds), [selectedCategoryIds]);
    const filteredModels = useMemo(() => {
        if (!manifest) {
            return [];
        }
        return manifest.models.filter((model) => {
            if (selectedCategorySet.size > 0 &&
                !getModelCategoryIds(model).some((category) => selectedCategorySet.has(category))) {
                return false;
            }
            if (!deferredQuery) {
                return true;
            }
            const searchTarget = [
                model.displayName,
                model.name,
                model.bundle,
                model.variant,
                model.relativeDirectory,
                ...getModelCategoryIds(model),
            ]
                .join(" ")
                .toLowerCase();
            return searchTarget.includes(deferredQuery);
        });
    }, [deferredQuery, manifest, selectedCategorySet]);
    const disposeCurrentModel = useCallback(() => {
        backgroundCleanupRef.current?.();
        const app = appRef.current;
        const spine = spineRef.current;
        if (spine && app) {
            app.stage.removeChild(spine);
            spine.destroy({ children: true });
        }
        spineRef.current = null;
        if (atlasRef.current) {
            atlasRef.current.dispose();
            atlasRef.current = null;
            baseTextureRef.current = null;
        }
        else if (baseTextureRef.current) {
            baseTextureRef.current.destroy();
            baseTextureRef.current = null;
        }
    }, []);
    const fitModel = useCallback(() => {
        const app = appRef.current;
        const spine = spineRef.current;
        if (!app || !spine) {
            return;
        }
        spine.scale.set(1);
        spine.position.set(0, 0);
        spine.update(0);
        const bounds = spine.getLocalBounds();
        const availableWidth = Math.max(app.screen.width * 0.84, 1);
        const availableHeight = Math.max(app.screen.height * 0.84, 1);
        const left = bounds.x;
        // Fit the invisible hit point in original world units, through the source
        // actor prefab scale. This margin is a viewer layout control.
        const right = characterUnitStrId ? Math.max(bounds.right, effectFitRightRef.current) : bounds.right;
        const width = Math.max(right - left, 1);
        const height = Math.max(bounds.height, 1);
        const nextZoom = Math.min(Math.max(Math.min(availableWidth / width, availableHeight / height), MIN_ZOOM), MAX_ZOOM);
        spine.scale.set(nextZoom);
        spine.position.set(app.screen.width / 2 - (left + width / 2) * nextZoom, app.screen.height / 2 - (bounds.y + bounds.height / 2) * nextZoom);
        setZoom(nextZoom);
    }, [characterUnitStrId]);
    const zoomAroundPoint = useCallback((nextZoom: number, clientX?: number, clientY?: number) => {
        const spine = spineRef.current;
        const stage = stageRef.current;
        if (!spine || !stage) {
            return;
        }
        const clampedZoom = Math.min(Math.max(nextZoom, MIN_ZOOM), MAX_ZOOM);
        const rect = stage.getBoundingClientRect();
        const pointX = clientX === undefined ? rect.width / 2 : clientX - rect.left;
        const pointY = clientY === undefined ? rect.height / 2 : clientY - rect.top;
        const currentZoom = spine.scale.x || 1;
        const localX = (pointX - spine.position.x) / currentZoom;
        const localY = (pointY - spine.position.y) / currentZoom;
        spine.scale.set(clampedZoom);
        spine.position.set(pointX - localX * clampedZoom, pointY - localY * clampedZoom);
        setZoom(clampedZoom);
    }, []);
    useEffect(() => {
        const stage = stageRef.current;
        if (!stage)
            return;
        function handleWheel(event: WheelEvent) {
            const spine = spineRef.current;
            if (!spine)
                return;
            event.preventDefault();
            if (event.deltaY === 0)
                return;
            const factor = event.deltaY > 0 ? 0.9 : 1.1;
            zoomAroundPoint(spine.scale.x * factor, event.clientX, event.clientY);
        }
        // React's passive wheel listener cannot cancel the page's native scroll.
        stage.addEventListener("wheel", handleWheel, { passive: false });
        return () => stage.removeEventListener("wheel", handleWheel);
    }, [zoomAroundPoint]);
    const finishInitialFit = useCallback(() => {
        const spine = spineRef.current;
        if (!spine) {
            return;
        }
        fitModel();
        if (playingRef.current) {
            const animationName = spine.state.getCurrent(0)?.animation.name;
            if (animationName) {
                spine.state.clearTrack(0);
                spine.skeleton.setToSetupPose();
                spine.state.setAnimation(0, animationName, true);
                spine.update(0);
            }
        }
        spine.state.timeScale = playingRef.current ? speedRef.current : 0;
        spine.alpha = 1;
    }, [fitModel]);
    useEffect(() => {
        if (!loadedModelId) {
            return;
        }
        let fitFrame = 0;
        const fitTimer = window.setTimeout(() => {
            fitFrame = requestAnimationFrame(finishInitialFit);
        }, AUTO_FIT_DELAY_MS);
        return () => {
            window.clearTimeout(fitTimer);
            cancelAnimationFrame(fitFrame);
        };
    }, [finishInitialFit, loadedModelId]);
    useEffect(() => {
        if (isEmbedded) {
            return;
        }
        const controller = new AbortController();
        void fetch(deploymentUrl("/spine/manifest.json"), {
            cache: process.env.NODE_ENV === "development" ? "no-store" : "force-cache",
            signal: controller.signal,
        })
            .then((response) => {
            if (!response.ok) {
                throw new Error(`manifest 요청 실패: HTTP ${response.status}`);
            }
            return response.json() as Promise<SpineManifest>;
        })
            .then((data) => {
            setManifest(data);
        })
            .catch((error: unknown) => {
            if (error instanceof DOMException && error.name === "AbortError") {
                return;
            }
            setManifestError(error instanceof Error ? error.message : "manifest를 읽지 못했습니다.");
        });
        return () => controller.abort();
    }, [isEmbedded]);
    useEffect(() => {
        const canvasHost = canvasHostRef.current;
        if (!canvasHost) {
            return;
        }
        let cancelled = false;
        let createdApp: PixiApplication | null = null;
        void Promise.all([
            import("pixi.js"),
            import("@pixi-spine/base"),
            import("@pixi-spine/runtime-3.7"),
        ])
            .then(([pixi, spineBase, spineRuntime]) => {
            if (cancelled) {
                return;
            }
            runtimeRef.current = { pixi, spineBase, spineRuntime };
            pixi.settings.MIPMAP_TEXTURES = pixi.MIPMAP_MODES.ON;
            const app = new pixi.Application({
                resizeTo: canvasHost,
                backgroundAlpha: 0,
                antialias: true,
                autoDensity: true,
                resolution: Math.min(window.devicePixelRatio || 1, 2),
            });
            createdApp = app;
            appRef.current = app;
            canvasHost.replaceChildren(app.view as HTMLCanvasElement);
            setRendererReady(true);
        })
            .catch(() => {
            if (cancelled) {
                return;
            }
            runtimeRef.current = null;
            appRef.current = null;
            createdApp?.destroy(true, { children: true });
            createdApp = null;
            setLoadState("error");
            setLoadMessage("모델 표시 기능을 시작하지 못했습니다. 페이지를 새로고침하거나 브라우저의 하드웨어 가속(WebGL) 설정을 확인해 주세요.");
        });
        return () => {
            cancelled = true;
            loadSequenceRef.current += 1;
            disposeCurrentModel();
            setRendererReady(false);
            runtimeRef.current = null;
            appRef.current = null;
            createdApp?.destroy(true, { children: true });
        };
    }, [disposeCurrentModel]);
    useEffect(() => {
        const app = appRef.current;
        if (!app || !rendererReady) {
            return;
        }
        const renderer = app.renderer;
        const handleResize = () => {
            if (spineRef.current) {
                fitModel();
            }
        };
        renderer.on("resize", handleResize);
        return () => {
            renderer.off("resize", handleResize);
        };
    }, [fitModel, rendererReady]);
    useEffect(() => {
        if (!selectedModel || !rendererReady) {
            return;
        }
        const runtime = runtimeRef.current;
        const app = appRef.current;
        if (!runtime || !app) {
            return;
        }
        const controller = new AbortController();
        const sequence = loadSequenceRef.current + 1;
        loadSequenceRef.current = sequence;
        disposeCurrentModel();
        setLoadedModelId("");
        setAnimations([]);
        setSkins([]);
        setSelectedAnimation("");
        setSelectedAction("");
        setSelectedSkin("");
        setLoadState("loading");
        const modelDisplayName = isEmbedded
            ? selectedModel.displayName ?? "모델"
            : getModelDisplayName(selectedModel);
        setLoadMessage(`${modelDisplayName} 데이터를 불러오는 중입니다.`);
        void (async () => {
            let localBaseTexture: PixiBaseTexture | null = null;
            let localAtlas: SpineAtlas | null = null;
            try {
                if (selectedModel.kind === "image") {
                    const image = await loadImage(selectedModel.textureUrl, controller.signal);
                    if (controller.signal.aborted ||
                        sequence !== loadSequenceRef.current) {
                        return;
                    }
                    setZoom(1);
                    setLoadedModelId(selectedModel.id);
                    setLoadState("ready");
                    setLoadMessage(isEmbedded
                        ? `${modelDisplayName} 미리보기`
                        : `${modelDisplayName} · PNG ${image.naturalWidth} × ${image.naturalHeight}`);
                    return;
                }
                const [jsonResponse, atlasResponse, image] = await Promise.all([
                    fetch(deploymentUrl(selectedModel.jsonUrl), { signal: controller.signal }),
                    fetch(deploymentUrl(selectedModel.atlasUrl), { signal: controller.signal }),
                    loadImage(selectedModel.textureUrl, controller.signal),
                ]);
                if (!jsonResponse.ok || !atlasResponse.ok) {
                    throw new Error(`자산 요청 실패: JSON ${jsonResponse.status}, Atlas ${atlasResponse.status}`);
                }
                const [jsonText, atlasText] = await Promise.all([
                    jsonResponse.text(),
                    atlasResponse.text(),
                ]);
                if (controller.signal.aborted || sequence !== loadSequenceRef.current) {
                    return;
                }
                localBaseTexture = new runtime.pixi.BaseTexture(image, {
                    scaleMode: runtime.pixi.SCALE_MODES.LINEAR,
                    mipmap: runtime.pixi.MIPMAP_MODES.ON,
                    alphaMode: runtime.pixi.ALPHA_MODES.PMA,
                });
                localAtlas = await new Promise<SpineAtlas>((resolve, reject) => {
                    try {
                        new runtime.spineBase.TextureAtlas(atlasText, (_pagePath, callback) => callback(localBaseTexture!), resolve);
                    }
                    catch (error) {
                        reject(error);
                    }
                });
                const attachmentLoader = new runtime.spineRuntime.AtlasAttachmentLoader(localAtlas);
                const parser = new runtime.spineRuntime.SkeletonJson(attachmentLoader);
                parser.scale = 1;
                const skeletonJson: unknown = JSON.parse(jsonText);
                normalizeSpineTimelineTimes(skeletonJson);
                const skeletonData = parser.readSkeletonData(skeletonJson);
                const spine = new runtime.spineRuntime.Spine(skeletonData);
                const animationNames = skeletonData.animations.map((animation) => animation.name);
                const skinNames = skeletonData.skins.map((skin) => skin.name);
                const defaultAnimation = initialState?.animation === ""
                    ? ""
                    : initialState?.animation && animationNames.includes(initialState.animation)
                        ? initialState.animation
                        : findDefaultAnimation(animationNames);
                const defaultSkin = initialState?.skin && skinNames.includes(initialState.skin)
                    ? initialState.skin
                    : skinNames.includes("default") ? "default" : skinNames[0] ?? "";
                if (controller.signal.aborted || sequence !== loadSequenceRef.current) {
                    spine.destroy({ children: true });
                    localAtlas.dispose();
                    return;
                }
                spine.stateData.defaultMix = 0.15;
                spine.autoUpdate = true;
                spine.state.timeScale = 1;
                spine.alpha = 0;
                spine.skeleton.scaleX = initialState?.flipX ? -1 : 1;
                spine.skeleton.scaleY = initialState?.flipY ? -1 : 1;
                if (defaultSkin) {
                    spine.skeleton.setSkinByName(defaultSkin);
                    spine.skeleton.setSlotsToSetupPose();
                }
                if (defaultAnimation) {
                    spine.state.setAnimation(0, defaultAnimation, true);
                }
                app.stage.addChild(spine);
                spineRef.current = spine;
                atlasRef.current = localAtlas;
                baseTextureRef.current = localBaseTexture;
                setAnimations(animationNames);
                setSkins(skinNames);
                setSelectedAnimation(defaultAnimation);
                setSelectedSkin(defaultSkin);
                setLoadedModelId(selectedModel.id);
                setLoadState("ready");
                setLoadMessage(`${modelDisplayName} · 애니메이션 ${animationNames.length}개 · 스킨 ${skinNames.length}개`);
            }
            catch (error) {
                if (controller.signal.aborted || sequence !== loadSequenceRef.current) {
                    localAtlas?.dispose();
                    if (!localAtlas) {
                        localBaseTexture?.destroy();
                    }
                    return;
                }
                localAtlas?.dispose();
                if (!localAtlas) {
                    localBaseTexture?.destroy();
                }
                setLoadState("error");
                setLoadMessage(!isEmbedded && error instanceof Error
                    ? error.message
                    : "모델을 불러오지 못했습니다. 페이지를 새로고침해 주세요.");
            }
        })();
        return () => controller.abort();
    }, [disposeCurrentModel, fitModel, initialState, isEmbedded, rendererReady, selectedModel]);
    useEffect(() => {
        backgroundEnabledRef.current = backgroundEnabled;
    }, [backgroundEnabled]);
    useEffect(() => {
        const runtime = runtimeRef.current;
        const app = appRef.current;
        const primary = spineRef.current;
        if (!backgroundLayers?.length || loadState !== "ready"
            || loadedModelId !== selectedModel?.id || !runtime || !app || !primary) {
            setBackgroundLoadState("idle");
            return;
        }
        const controller = new AbortController();
        const layerRoot = new runtime.pixi.Container();
        const resources: {
            spine: SpineDisplay;
            atlas: SpineAtlas;
            initialized: boolean;
        }[] = [];
        const previousAutoUpdate = primary.autoUpdate;
        primary.autoUpdate = false;
        backgroundClockSpineRef.current = primary;
        let disposed = false;
        setBackgroundLoadState("loading");
        layerRoot.visible = false;
        app.stage.addChildAt(layerRoot, app.stage.getChildIndex(primary));
        function syncBackground(deltaFrames?: number) {
            if (disposed || primary!.destroyed || spineRef.current !== primary)
                return;
            // Use one uncapped clock for both skeletons. Mixing Spine's Date.now()
            // clock with Pixi's capped deltaMS would drift after a frame hitch/tab hide.
            const deltaSeconds = deltaFrames === undefined ? 0 : Math.max(0, app!.ticker.elapsedMS) / 1000;
            primary!.state.timeScale = playingRef.current ? speedRef.current : 0;
            primary!.update(deltaSeconds);
            primary!.transform.updateLocalTransform();
            layerRoot.transform.setFromMatrix(primary!.localTransform);
            layerRoot.alpha = primary!.alpha;
            layerRoot.visible = backgroundEnabledRef.current && primary!.alpha > 0;
            for (const resource of resources) {
                let initializedNow = false;
                if (!resource.initialized && primary!.alpha > 0) {
                    // Both SkeletonGraphics begin together in the original prefab. A
                    // slower background download must not restart its clip at zero.
                    const track = resource.spine.state.getCurrent(0);
                    if (track)
                        track.trackTime = primary!.state.getCurrent(0)?.trackTime ?? 0;
                    resource.initialized = true;
                    initializedNow = true;
                }
                resource.spine.state.timeScale = primary!.alpha > 0 && playingRef.current ? speedRef.current : 0;
                // Advance hidden layers as well, so toggling visibility does not reset
                // or offset their animation relative to the illustration.
                resource.spine.update(initializedNow ? 0 : deltaSeconds);
            }
        }
        app.ticker.add(syncBackground, undefined, runtime.pixi.UPDATE_PRIORITY.HIGH);
        function cleanup() {
            if (disposed)
                return;
            disposed = true;
            controller.abort();
            app!.ticker.remove(syncBackground);
            if (backgroundClockSpineRef.current === primary) {
                backgroundClockSpineRef.current = null;
                if (!primary!.destroyed && spineRef.current === primary) {
                    // Spine resets its private wall clock when visibility is restored.
                    // This synchronous reset prevents replaying time advanced manually.
                    const visible = primary!.visible;
                    primary!.visible = false;
                    primary!.visible = visible;
                    primary!.autoUpdate = previousAutoUpdate;
                }
            }
            layerRoot.removeFromParent();
            layerRoot.destroy({ children: true });
            for (const resource of resources)
                resource.atlas.dispose();
            if (backgroundCleanupRef.current === cleanup)
                backgroundCleanupRef.current = null;
        }
        backgroundCleanupRef.current = cleanup;
        async function loadLayer(layer: SpineBackgroundLayer) {
            let baseTexture: PixiBaseTexture | null = null;
            let atlas: SpineAtlas | null = null;
            let spine: SpineDisplay | null = null;
            let transferred = false;
            try {
                const [jsonResponse, atlasResponse, image] = await Promise.all([
                    fetch(deploymentUrl(layer.model.jsonUrl), { signal: controller.signal }),
                    fetch(deploymentUrl(layer.model.atlasUrl), { signal: controller.signal }),
                    loadImage(layer.model.textureUrl, controller.signal),
                ]);
                if (!jsonResponse.ok || !atlasResponse.ok) {
                    throw new Error(`Standing background HTTP ${jsonResponse.status}/${atlasResponse.status}`);
                }
                const [skeletonJson, atlasText] = await Promise.all([jsonResponse.json(), atlasResponse.text()]);
                if (controller.signal.aborted)
                    return;
                baseTexture = new runtime!.pixi.BaseTexture(image, {
                    scaleMode: runtime!.pixi.SCALE_MODES.LINEAR,
                    mipmap: runtime!.pixi.MIPMAP_MODES.ON,
                    alphaMode: runtime!.pixi.ALPHA_MODES.PMA,
                });
                atlas = await new Promise<SpineAtlas>((resolve, reject) => {
                    try {
                        new runtime!.spineBase.TextureAtlas(atlasText, (_path, callback) => callback(baseTexture!), resolve);
                    }
                    catch (error) {
                        reject(error);
                    }
                });
                if (controller.signal.aborted)
                    return;
                normalizeSpineTimelineTimes(skeletonJson);
                const parser = new runtime!.spineRuntime.SkeletonJson(new runtime!.spineRuntime.AtlasAttachmentLoader(atlas));
                parser.scale = 1;
                spine = new runtime!.spineRuntime.Spine(parser.readSkeletonData(skeletonJson));
                if (layer.skin)
                    spine.skeleton.setSkinByName(layer.skin);
                spine.skeleton.setSlotsToSetupPose();
                if (layer.animation)
                    spine.state.setAnimation(0, layer.animation, layer.loop ?? true);
                spine.state.timeScale = 0;
                spine.autoUpdate = false;
                const transform = layer.transform;
                spine.transform.setFromMatrix(new runtime!.pixi.Matrix(transform.a, transform.b, transform.c, transform.d, transform.tx, transform.ty));
                spine.update(0);
                layerRoot.addChild(spine);
                resources.push({ spine, atlas, initialized: false });
                transferred = true;
            }
            finally {
                if (!transferred) {
                    spine?.destroy({ children: true });
                    if (atlas)
                        atlas.dispose();
                    else
                        baseTexture?.destroy();
                }
            }
        }
        // Preserve the original prefab sibling order even when downloads finish
        // in a different order. Backgrounds stay outside foreground fit bounds.
        void (async () => {
            for (const layer of backgroundLayers) {
                await loadLayer(layer);
                if (controller.signal.aborted)
                    return;
            }
            syncBackground();
            setBackgroundLoadState("ready");
        })().catch((error: unknown) => {
            if (controller.signal.aborted)
                return;
            console.info("[Standing background]", error);
            cleanup();
            setBackgroundLoadState("error");
        });
        return cleanup;
    }, [backgroundLayers, loadState, loadedModelId, selectedModel?.id]);
    useEffect(() => {
        speedRef.current = speed;
        playingRef.current = isPlaying;
        if (spineRef.current) {
            spineRef.current.state.timeScale = isPlaying ? speed : 0;
        }
    }, [isPlaying, speed]);
    function cancelPendingActionRequest() {
        if (!actionRequest)
            return;
        lastActionRequestRef.current = actionRequest;
        onActionRequestHandled?.(actionRequest.revision);
    }
    function changeAnimation(animationName: string) {
        cancelPendingActionRequest();
        setSelectedAction("");
        setSelectedAnimation(animationName);
        if (spineRef.current && animationName) {
            // A battle action can still be loading and have no cleanup callback yet.
            spineRef.current.autoUpdate = backgroundClockSpineRef.current !== spineRef.current;
            spineRef.current.state.timeScale = speed;
            spineRef.current.state.setAnimation(0, animationName, true);
            setIsPlaying(true);
        }
    }
    const changeAction = useCallback((actionId: string) => {
        if (spineRef.current) {
            spineRef.current.state.clearTracks();
            spineRef.current.autoUpdate = false;
        }
        setSelectedAnimation("");
        setSelectedAction(actionId);
        setActionRevision(revision => revision + 1);
        setIsPlaying(true);
    }, []);
    useEffect(() => {
        if (!actionRequest || actionRequest === lastActionRequestRef.current
            || !characterUnitStrId || loadState !== "ready"
            || !loadedModelId || loadedModelId !== embeddedModel?.id
            || !effects.actions.some(action => action.id === actionRequest.actionId))
            return;
        let frame = 0;
        const playWhenFitted = () => {
            if (lastActionRequestRef.current === actionRequest)
                return;
            const spine = spineRef.current;
            // Initial auto-fit resets the default track. Start the requested action
            // after that work, including a cold load or a switch from SD/cut-in.
            if (!spine || spine.alpha === 0) {
                frame = requestAnimationFrame(playWhenFitted);
                return;
            }
            lastActionRequestRef.current = actionRequest;
            changeAction(actionRequest.actionId);
            onActionRequestHandled?.(actionRequest.revision);
        };
        playWhenFitted();
        return () => cancelAnimationFrame(frame);
    }, [actionRequest, characterUnitStrId, loadState, loadedModelId, embeddedModel?.id,
        effects.actions, changeAction, onActionRequestHandled]);
    function changeSkin(skinName: string) {
        setSelectedSkin(skinName);
        if (spineRef.current && skinName) {
            spineRef.current.skeleton.setSkinByName(skinName);
            spineRef.current.skeleton.setSlotsToSetupPose();
        }
    }
    function changeSkinSelection(value: string) {
        if (costumeSelection && value.startsWith("costume:")) {
            const costume = value.slice("costume:".length);
            if (costume === costumeSelection.value) {
                changeSkin(baseSkeletonSkin);
            }
            else {
                costumeSelection.onChange(costume);
            }
            return;
        }
        changeSkin(costumeSelection ? value.slice("skeleton:".length) : value);
    }
    function showSetupPose() {
        cancelPendingActionRequest();
        setSelectedAnimation("");
        setSelectedAction("");
        const spine = spineRef.current;
        if (!spine) {
            return;
        }
        spine.state.clearTracks();
        spine.skeleton.setToSetupPose();
        spine.skeleton.updateWorldTransform();
        setIsPlaying(false);
    }
    function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
        if (!spineRef.current) {
            return;
        }
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = { active: true, x: event.clientX, y: event.clientY };
    }
    function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
        const spine = spineRef.current;
        if (!spine || !dragRef.current.active) {
            return;
        }
        const deltaX = event.clientX - dragRef.current.x;
        const deltaY = event.clientY - dragRef.current.y;
        dragRef.current = { active: true, x: event.clientX, y: event.clientY };
        spine.position.set(spine.position.x + deltaX, spine.position.y + deltaY);
    }
    function stopDragging() {
        dragRef.current.active = false;
    }
    async function toggleFullscreen() {
        const stage = stageRef.current;
        if (!stage) {
            return;
        }
        if (document.fullscreenElement) {
            await document.exitFullscreen();
            return;
        }
        await stage.requestFullscreen();
    }
    const controlsDisabled = loadState !== "ready" || selectedModel?.kind === "image";
    const baseSkeletonSkin = initialState?.skin && skins.includes(initialState.skin)
        ? initialState.skin : skins.includes("default") ? "default" : skins[0] ?? "";
    const skinOptions = costumeSelection ? [
        ...costumeSelection.options.map((option) => ({ ...option, value: `costume:${option.value}` })),
        ...skins.filter((skin) => skin !== baseSkeletonSkin).map((skin) => ({
            value: `skeleton:${skin}`, label: getSpineSkinLabel(skin), originalName: skin,
        })),
    ] : skins.map((skin) => ({ value: skin, label: getSpineSkinLabel(skin) }));
    const skinValue = costumeSelection
        ? selectedSkin && selectedSkin !== baseSkeletonSkin
            ? `skeleton:${selectedSkin}` : `costume:${costumeSelection.value}`
        : selectedSkin;
    const selectedCategories = manifest?.categories.filter((item) => selectedCategorySet.has(item.id)) ??
        [];
    const selectedCategoryCount = selectedCategorySet.size === 0
        ? (manifest?.count ?? 0)
        : (manifest?.models.filter((model) => getModelCategoryIds(model).some((category) => selectedCategorySet.has(category))).length ?? 0);
    const activeFilterLabel = selectedCategories.length === 0
        ? `전체 ${manifest?.count.toLocaleString("ko-KR") ?? 0}`
        : selectedCategories.length === 1
            ? `${selectedCategories[0].label} ${selectedCategoryCount.toLocaleString("ko-KR")}`
            : `${selectedCategories[0].label} 외 ${selectedCategories.length - 1}개 ${selectedCategoryCount.toLocaleString("ko-KR")}`;
    const selectedCategoryLabel = selectedModel
        ? getModelCategoryIds(selectedModel)
            .map((category) => manifest?.categories.find((item) => item.id === category)?.label ??
            category)
            .join(" · ")
        : undefined;
    const employeeAssetCategories = manifest?.categories.filter((item) => employeeAssetCategoryIds.includes(item.id as (typeof employeeAssetCategoryIds)[number])) ?? [];
    const operatorAssetCategories = manifest?.categories.filter((item) => operatorAssetCategoryIds.includes(item.id as (typeof operatorAssetCategoryIds)[number])) ?? [];
    const otherCategories = manifest?.categories.filter((item) => !employeeAssetCategoryIds.includes(item.id as (typeof employeeAssetCategoryIds)[number]) &&
        !operatorAssetCategoryIds.includes(item.id as (typeof operatorAssetCategoryIds)[number])) ?? [];
    function toggleCategory(nextCategory: string) {
        setSelectedCategoryIds((current) => current.includes(nextCategory)
            ? current.filter((item) => item !== nextCategory)
            : [...current, nextCategory]);
    }
    function resetCategories() {
        setSelectedCategoryIds([]);
    }
    return (<div className={`${styles.viewerLayout}${isEmbedded ? ` ${styles.embeddedLayout}` : ""}${compact ? ` ${styles.compactLayout}` : ""}`} data-spine-embedded={isEmbedded ? "true" : undefined} data-spine-model-id={loadedModelId || undefined} data-spine-load-state={loadState} data-spine-animation={selectedAnimation || undefined} data-spine-action={selectedAction || undefined} data-spine-action-revision={actionRevision} data-spine-skin={selectedSkin || undefined} data-spine-flip-x={initialState?.flipX ?? false} data-spine-flip-y={initialState?.flipY ?? false} data-spine-background-enabled={backgroundLayers?.length ? backgroundEnabled : undefined} data-spine-background-state={backgroundLayers?.length ? backgroundLoadState : undefined} data-spine-background-models={backgroundLayers?.map(layer => layer.model.id).join(",") || undefined}>
      {!isEmbedded ? (<aside className={styles.browserPanel} aria-label="게임 자산 목록">
        <div className={styles.browserHeader}>
          <div>
            <strong>{manifest?.count.toLocaleString("ko-KR") ?? "-"}</strong>
            <span>ASSETS</span>
          </div>
          <small>Spine {manifest?.spineVersion ?? "3.7"} · PNG</small>
        </div>

        <label className={styles.searchBox}>
          <span>자산 검색</span>
          <SearchInput value={query} onChange={(event) => setQuery(event.target.value)} ariaLabel="자산 검색" placeholder="파일명 또는 폴더명" testId="spine-search"/>
        </label>

        <div className={styles.filterSection}>
          <button type="button" className={styles.filterToggle} data-open={filtersOpen} aria-haspopup="dialog" onClick={() => setFiltersOpen(true)}>
            <span className={styles.filterToggleLabel}>필터</span>
            <span className={styles.filterToggleSelection}>
              {activeFilterLabel}
            </span>
          </button>

          {filtersOpen ? (<div className={styles.filterModalBackdrop} role="dialog" aria-modal="true" aria-labelledby="spine-filter-title">
              <div className={styles.filterDialog}>
                <div className={styles.filterDialogHeader}>
                  <h2 id="spine-filter-title">필터</h2>
                  <button type="button" onClick={() => setFiltersOpen(false)}>
                    닫기
                  </button>
                </div>

                <div className={styles.filterDialogBody}>
                  <p className={styles.filterHint}>
                    여러 분류를 함께 선택할 수 있습니다.
                  </p>
                  <button type="button" className={styles.allCategoryButton} data-active={selectedCategoryIds.length === 0} aria-pressed={selectedCategoryIds.length === 0} onClick={resetCategories}>
                    전체 자산 <span>{manifest?.count ?? 0}</span>
                  </button>

                  <section className={styles.filterGroup}>
                    <h3>
                      <span />
                      사원 자산
                    </h3>
                    <div className={styles.categoryList} aria-label="사원 자산 분류">
                      {employeeAssetCategories.map((item) => (<button key={item.id} type="button" data-active={selectedCategorySet.has(item.id)} aria-pressed={selectedCategorySet.has(item.id)} onClick={() => toggleCategory(item.id)}>
                          {item.label} <span>{item.count}</span>
                        </button>))}
                    </div>
                  </section>

                  <section className={styles.filterGroup}>
                    <h3>
                      <span />
                      오퍼레이터 자산
                    </h3>
                    <div className={styles.categoryList} aria-label="오퍼레이터 자산 분류">
                      {operatorAssetCategories.map((item) => (<button key={item.id} type="button" data-active={selectedCategorySet.has(item.id)} aria-pressed={selectedCategorySet.has(item.id)} onClick={() => toggleCategory(item.id)}>
                          {item.label} <span>{item.count}</span>
                        </button>))}
                    </div>
                  </section>

                  {otherCategories.length > 0 ? (<section className={styles.filterGroup}>
                      <h3>
                        <span />
                        기타 자산
                      </h3>
                      <div className={styles.categoryList} aria-label="기타 자산 분류">
                        {otherCategories.map((item) => (<button key={item.id} type="button" data-active={selectedCategorySet.has(item.id)} aria-pressed={selectedCategorySet.has(item.id)} onClick={() => toggleCategory(item.id)}>
                            {item.label} <span>{item.count}</span>
                          </button>))}
                      </div>
                    </section>) : null}
                </div>

                <div className={styles.filterDialogFooter}>
                  <button type="button" onClick={resetCategories}>
                    초기화
                  </button>
                  <button type="button" onClick={() => setFiltersOpen(false)}>
                    확인
                  </button>
                </div>
              </div>
            </div>) : null}
        </div>

        <div className={styles.resultSummary}>
          <span>검색 결과</span>
          <strong>{filteredModels.length.toLocaleString("ko-KR")}개</strong>
        </div>

        <div className={styles.modelList}>
          {manifestError ? (<p className={styles.listMessage}>{manifestError}</p>) : null}
          {!manifest && !manifestError ? (<p className={styles.listMessage}>자산 목록을 읽는 중입니다.</p>) : null}
          {manifest && filteredModels.length === 0 ? (<p className={styles.listMessage}>검색 결과가 없습니다.</p>) : null}
          {filteredModels.map((model) => (<button key={model.id} type="button" className={styles.modelButton} data-active={selectedModelId === model.id} onClick={() => setSelectedModelId(model.id)} data-testid="spine-model-item">
              <span className={styles.modelType}>
                {getModelCategoryIds(model)
                    .map((category) => manifest?.categories.find((item) => item.id === category)
                    ?.label ?? category)
                    .join(" · ")}
              </span>
              <strong>{getModelDisplayName(model)}</strong>
              <small>{model.relativeDirectory}</small>
              <span className={styles.modelSize}>
                {formatBytes(getModelBytes(model))}
              </span>
            </button>))}
        </div>
      </aside>) : null}

      <section className={styles.viewerPanel} aria-label={ariaLabel ?? (isEmbedded ? "사원 모델 미리보기 화면" : "게임 자산 미리보기 화면")}>
        <div className={styles.stageToolbar}>
          <div className={styles.modelSelection}>
            {modelControls}
            <div className={styles.modelTitle}>
              {!isEmbedded ? (<span>{selectedCategoryLabel ?? "MODEL PREVIEW"}</span>) : null}
              <strong>
                {isEmbedded
            ? selectedModel?.displayName?.replace(/ · (?:인게임|SD|스탠딩|컷인)(?: \([^)]+\))?$/u, "") ?? "모델 미리보기"
            : selectedModel
                ? getModelDisplayName(selectedModel)
                : "모델을 선택하세요"}
              </strong>
            </div>
          </div>
          <div className={styles.toolbarButtons}>
            {characterUnitStrId ? (<button type="button" aria-pressed={effects.enabled} data-active={effects.enabled} data-testid="spine-effects-toggle" disabled={controlsDisabled || !selectedAction} onClick={() => effects.setEnabled(!effects.enabled)}>
                이펙트 {effects.enabled ? "ON" : "OFF"}
              </button>) : null}
            {backgroundLayers?.length ? (<button type="button" aria-pressed={backgroundEnabled} data-active={backgroundEnabled} data-testid="spine-background-toggle" disabled={controlsDisabled || backgroundLoadState !== "ready"} onClick={() => setBackgroundEnabled(!backgroundEnabled)}>
                배경 {backgroundEnabled ? "ON" : "OFF"}
              </button>) : null}
            <button type="button" disabled={controlsDisabled} onClick={() => zoomAroundPoint(zoom / 1.15)} aria-label="축소">
              −
            </button>
            <ZoomPercentageControl key={loadedModelId} zoom={zoom} disabled={controlsDisabled} onChange={zoomAroundPoint}/>
            <button type="button" disabled={controlsDisabled} onClick={() => zoomAroundPoint(zoom * 1.15)} aria-label="확대">
              +
            </button>
            <button type="button" disabled={controlsDisabled} onClick={fitModel}>
              화면 맞춤
            </button>
            <button type="button" onClick={toggleFullscreen}>
              전체 화면
            </button>
          </div>
        </div>

        <div ref={stageRef} className={styles.stage} data-background={background} data-testid="spine-stage" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={stopDragging} onPointerCancel={stopDragging} onPointerLeave={stopDragging}>
          <div ref={canvasHostRef} className={styles.canvasHost}/>

          {selectedModel?.kind === "image" && loadState === "ready" ? (<NextImage src={selectedModel.textureUrl} alt={`${getModelDisplayName(selectedModel)} 카드 일러스트`} fill sizes="(max-width: 820px) 100vw, 70vw" className={styles.staticImagePreview} loading="eager"/>) : null}

          {loadState !== "ready" ? (<div className={styles.stageMessage} data-state={loadState}>
              {loadState === "loading" ? <span className={styles.spinner}/> : null}
              <strong>
                {loadState === "error"
                ? "모델 로딩 실패"
                : isEmbedded
                    ? "모델 미리보기"
                    : "SPINE VIEWER"}
              </strong>
              <p>{loadMessage}</p>
            </div>) : null}

          <div className={styles.stageHint}>
            {selectedModel?.kind === "image"
            ? "정적 PNG 미리보기"
            : "드래그 이동 · 휠 확대/축소"}
          </div>
        </div>

        {!isEmbedded ? (<div className={styles.statusBar} data-state={loadState}>
            <span data-testid="spine-status">{loadMessage}</span>
            {selectedModel ? (<small>
                {selectedModel.kind === "image"
                    ? `PNG ${formatBytes(selectedModel.bytes.texture)}`
                    : `JSON ${formatBytes(selectedModel.bytes.json)} · PNG ${formatBytes(selectedModel.bytes.texture)}`}
              </small>) : null}
          </div>) : null}

        <div className={styles.controlGrid} data-has-action={Boolean(characterUnitStrId)} data-has-model={Boolean(modelSelector)} data-has-costumes={Boolean(costumeSelection && costumeSelection.options.length > 1)}>
          <div className={styles.playbackButtons}>
            <button type="button" className={styles.playbackToggle} aria-label={isPlaying ? "일시정지" : "재생"} title={isPlaying ? "일시정지" : "재생"} disabled={controlsDisabled} onClick={() => setIsPlaying((current) => !current)} data-testid="spine-play-toggle">
              <NextImage src={isPlaying ? deploymentUrl("/ui/AB_UI_COLLECTION_ICON_PAUSE.png") : deploymentUrl("/ui/AB_UI_COLLECTION_ICON_PLAY.png")} alt="" width={isPlaying ? 22 : 20} height={22}/>
            </button>
            <button type="button" disabled={controlsDisabled} onClick={showSetupPose}>
              기본 포즈
            </button>
          </div>

          <SpineNameSelect key={`${loadedModelId}:animations`} label="애니메이션" fitContent value={selectedAnimation} onChange={changeAnimation} disabled={controlsDisabled} testId="spine-animation-select" emptyLabel={animations.length ? "선택 안 함" : "없음"} options={animations.map((animation) => ({
            value: animation,
            label: getSpineAnimationLabel(animation, selectedModel?.category),
        }))}/>

          {characterUnitStrId ? (<SpineNameSelect label="전투 동작" fitContent value={selectedAction} options={effects.actions.map(action => ({ value: action.id, label: action.label, originalName: action.stateName }))} onChange={(value) => { cancelPendingActionRequest(); changeAction(value); }} disabled={controlsDisabled || effects.loading} emptyLabel={effects.loading ? "불러오는 중" : effects.actions.length ? "선택 안 함" : "없음"} testId="spine-action-select"/>) : null}

          <SpineNameSelect key={`${loadedModelId}:skins`} label="스킨" className={styles.skinSelector} fitContent={Boolean(costumeSelection && costumeSelection.options.length > 1)} value={skinValue} onChange={changeSkinSelection} disabled={!costumeSelection && controlsDisabled} testId="spine-skin-select" options={skinOptions}/>

          {modelSelector}

          <label>
            <span>재생 속도</span>
            <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))} disabled={controlsDisabled}>
              <option value={0.25}>0.25x</option>
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={1.5}>1.5x</option>
              <option value={2}>2x</option>
            </select>
          </label>

          <label>
            <span>배경</span>
            <select value={background} onChange={(event) => setBackground(event.target.value as BackgroundId)}>
              {backgroundOptions.map((option) => (<option key={option.id} value={option.id}>
                  {option.label}
                </option>))}
            </select>
          </label>
        </div>

        {characterUnitStrId && effects.status && (selectedAction || effects.loading || effects.loadError) ? (<p className={styles.effectStatus} role="status" data-testid="spine-effects-status">
            {effects.status}
          </p>) : null}
        {backgroundLayers?.length && (backgroundLoadState === "loading" || backgroundLoadState === "error") ? (<p className={styles.effectStatus} role="status" data-testid="spine-background-status">
            {backgroundLoadState === "loading" ? "스탠딩 배경을 불러오는 중입니다." : "스탠딩 배경을 불러오지 못했습니다."}
          </p>) : null}

        {!isEmbedded && loadedModelId && selectedModel ? (<details className={styles.pathDetails}>
            <summary>현재 파일 경로</summary>
            <dl>
              {selectedModel.kind === "spine" ? (<>
                  <div>
                    <dt>JSON</dt>
                    <dd>{selectedModel.jsonUrl}</dd>
                  </div>
                  <div>
                    <dt>Atlas</dt>
                    <dd>{selectedModel.atlasUrl}</dd>
                  </div>
                </>) : null}
              <div>
                <dt>PNG</dt>
                <dd>{selectedModel.textureUrl}</dd>
              </div>
            </dl>
          </details>) : null}
      </section>
    </div>);
}
