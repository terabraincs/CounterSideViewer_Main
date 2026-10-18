"use client";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, } from "react";
import type { StorylineMainEpisode, StorylineOmenEpisode, } from "@/lib/storyline";
import { STORY_OMEN_EPISODE_15_HIT_TARGET, STORY_OMEN_POPUP_REFERENCE, STORY_OMEN_POPUP_SLOT_HIT_TARGETS, type StoryOmenHitTargetDescriptor, } from "@/lib/storyOmenSceneGeometry";
import type { StoryOmenContinuousSceneSource } from "@/lib/storyOmenNativeRuntime";
import { loadStoryOmenPopupSceneSource } from "@/lib/storyOmenSceneSource";
import { getStoryMouseCancelAction } from "@/lib/storyPlayback";
import { playStoryUiPointerSound } from "@/lib/storyUiAudio";
import StoryOmenNativeSceneCanvas from "./StoryOmenNativeSceneCanvas";
import styles from "./StoryOmenViewer.module.css";
type NativeVisualStatus = "loading" | "rendering" | "ready" | "error";
function getOmenSlotHitTarget(slotName: string): StoryOmenHitTargetDescriptor {
    const hitTarget = (STORY_OMEN_POPUP_SLOT_HIT_TARGETS as Readonly<Record<string, StoryOmenHitTargetDescriptor>>)[slotName];
    if (!hitTarget) {
        throw new Error(`Unknown original Omen slot: ${slotName}`);
    }
    return hitTarget;
}
function getRootRectStyle(hitTarget: StoryOmenHitTargetDescriptor): CSSProperties {
    const [rotationX, rotationY, rotationZ, rotationW] = hitTarget.rootTransform.localRotation;
    if (rotationY !== 0 || rotationZ !== 0) {
        throw new Error(`Unsupported Omen hit-target quaternion: ${hitTarget.path}`);
    }
    const [scaleX, scaleY, scaleZ] = hitTarget.rootTransform.localScale;
    const [pivotX, pivotY] = hitTarget.rootTransform.pivot;
    const angleX = 2 * Math.atan2(rotationX, rotationW);
    return {
        left: hitTarget.left,
        top: hitTarget.top,
        width: hitTarget.width,
        height: hitTarget.height,
        transform: `rotateX(${angleX}rad) scale3d(${scaleX}, ${scaleY}, ${scaleZ})`,
        transformOrigin: `${pivotX * 100}% ${(1 - pivotY) * 100}%`,
    };
}
function getTargetRectStyle(hitTarget: StoryOmenHitTargetDescriptor): CSSProperties {
    return {
        left: hitTarget.targetRectWithinRoot.left,
        top: hitTarget.targetRectWithinRoot.top,
        width: hitTarget.targetRectWithinRoot.width,
        height: hitTarget.targetRectWithinRoot.height,
    };
}
const STORY_OMEN_STATE_BUTTON_EASING = "cubic-bezier(0.3333333333333333, 0, 0.6666666666666666, 1)";
function getStateButtonHitSurfaceStyle(hitTarget: StoryOmenHitTargetDescriptor, isPressed: boolean): CSSProperties {
    const scale = isPressed ? hitTarget.pressScale : 1;
    return {
        transform: `scale3d(${scale}, ${scale}, 1)`,
        transformOrigin: "50% 50%",
        transition: `transform ${hitTarget.trackingSeconds}s ${STORY_OMEN_STATE_BUTTON_EASING}`,
    };
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
export default function StoryOmenViewer({ episodes, episode15, onSelect, onOpenMainstream, onClose, }: {
    episodes: StorylineOmenEpisode[];
    episode15: StorylineMainEpisode | null;
    onSelect: (episode: StorylineOmenEpisode) => void;
    onOpenMainstream: (episode: StorylineMainEpisode) => void;
    onClose: () => void;
}) {
    const viewerRef = useRef<HTMLElement>(null);
    const [pressedTarget, setPressedTarget] = useState<string | null>(null);
    const [viewportMetrics, setViewportMetrics] = useState<{
        width: number;
        height: number;
        scale: number;
    }>({
        width: STORY_OMEN_POPUP_REFERENCE.width,
        height: STORY_OMEN_POPUP_REFERENCE.height,
        scale: 1,
    });
    const [nativeSource, setNativeSource] = useState<StoryOmenContinuousSceneSource | null>(null);
    const [nativeStatus, setNativeStatus] = useState<NativeVisualStatus>("loading");
    const [nativeError, setNativeError] = useState<string | null>(null);
    const releaseEligibilityRef = useRef(new Map<string, boolean>());
    const releasePressedTarget = (target: string) => {
        setPressedTarget((current) => (current === target ? null : current));
    };
    useEffect(() => {
        let disposed = false;
        void loadStoryOmenPopupSceneSource()
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
    useLayoutEffect(() => {
        const viewer = viewerRef.current;
        if (!viewer) {
            return;
        }
        const updateViewportMetrics = () => {
            const rect = viewer.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) {
                return;
            }
            const nextMetrics = {
                width: rect.width,
                height: rect.height,
                scale: Math.min(rect.width / STORY_OMEN_POPUP_REFERENCE.width, rect.height / STORY_OMEN_POPUP_REFERENCE.height),
            };
            setViewportMetrics((current) => current.width === nextMetrics.width &&
                current.height === nextMetrics.height &&
                current.scale === nextMetrics.scale
                ? current
                : nextMetrics);
        };
        updateViewportMetrics();
        const resizeObserver = new ResizeObserver(updateViewportMetrics);
        resizeObserver.observe(viewer);
        return () => resizeObserver.disconnect();
    }, []);
    useEffect(() => {
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
            onClose();
        };
        const handleMouseDown = (event: MouseEvent) => {
            const action = getStoryMouseCancelAction(event.button, isEditableTarget(event.target) ||
                isEditableTarget(document.activeElement));
            if (action === "ignore") {
                return;
            }
            event.preventDefault();
            event.stopImmediatePropagation();
            if (action === "cancel") {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown, true);
        window.addEventListener("mousedown", handleMouseDown, true);
        return () => {
            window.removeEventListener("keydown", handleKeyDown, true);
            window.removeEventListener("mousedown", handleMouseDown, true);
        };
    }, [onClose]);
    const stageStyle: CSSProperties = {
        transform: `translate(-50%, -50%) scale(${viewportMetrics.scale})`,
    };
    return (<section ref={viewerRef} className={styles.viewer} role="dialog" aria-modal="true" aria-label="전조" data-story-chronicle-omen-viewer="STV-CHR-044" data-story-chronicle-omen-fullscreen="STV-CHR-046" data-story-chronicle-omen-prefab="UI_EC_SIDESTORY_OMEN" data-story-chronicle-omen-ui-type="FullScreen" data-story-chronicle-omen-base-rect="UIFrontCommon" data-story-chronicle-omen-underlying-fullscreen="hidden" data-story-chronicle-omen-canvas-scaler="contain-centered" data-story-chronicle-omen-background-aspect="EnvelopeParent" data-story-chronicle-omen-viewport={`${viewportMetrics.width}x${viewportMetrics.height}`} data-story-chronicle-omen-scale={viewportMetrics.scale.toFixed(6)} data-story-chronicle-omen-close="global-back" data-story-chronicle-omen-first-open-event="current-path-excluded" data-story-chronicle-omen-first-open-event-id="100331" data-story-chronicle-omen-first-open-storage="OMEN_CUTSCENE_PLAY_{UserUID}" data-story-mouse3-cancel="STV-RDR-006" data-story-mouse3-cancel-level="omen" data-story-chronicle-omen-renderer="client-evidence-webgl" data-story-chronicle-omen-css-fallback="none" data-story-chronicle-omen-map-motion="contents-intro-0-to-20-then-idle-20" data-story-chronicle-omen-native-status={nativeStatus} data-story-chronicle-omen-native-error={nativeError ?? undefined} data-story-chronicle-omen-pressed-target={pressedTarget ?? "none"}>
      {nativeSource ? (<StoryOmenNativeSceneCanvas source={nativeSource} activationKey="omen-popup" pressedTarget={pressedTarget} motionPolicy="native" canvasLayout="client-fullscreen" className={styles.nativeCanvas} onReady={() => {
                setNativeError(null);
                setNativeStatus("ready");
            }} onError={(message) => {
                setNativeError(message);
                setNativeStatus("error");
            }}/>) : null}

      <div className={styles.stage} style={stageStyle} data-story-chronicle-omen-stage="client-1920x1080">
        <div className={styles.hitLayer}>
          {episodes.map((episode) => {
            const hitTarget = getOmenSlotHitTarget(episode.slotName);
            return (<div key={episode.episodeId} className={styles.slotHitRoot} style={getRootRectStyle(hitTarget)} data-story-chronicle-omen-slot={episode.slotName} data-story-chronicle-omen-episode={episode.episodeId} data-story-chronicle-omen-required-step={episode.requiredStep} data-story-chronicle-omen-slot-transform="source-rect-transform" data-story-chronicle-omen-account-lock="not-simulated">
                <button type="button" tabIndex={-1} className={styles.hitButton} style={getTargetRectStyle(hitTarget)} aria-label={`${episode.areaNameKo} - ${episode.subtitleKo}`} data-story-ui-click-sound="select" data-story-chronicle-omen-hit-target={hitTarget.path} data-story-chronicle-omen-press-scale={hitTarget.pressScale} data-story-chronicle-omen-press-seconds={hitTarget.trackingSeconds} onPointerDown={(event) => {
                    if (event.button >= 0 && event.button <= 2) {
                        releaseEligibilityRef.current.delete(hitTarget.path);
                        event.currentTarget.setPointerCapture(event.pointerId);
                        setPressedTarget(hitTarget.path);
                    }
                }} onPointerUp={(event) => {
                    releaseEligibilityRef.current.set(hitTarget.path, isOmenPointerReleaseOverTarget(event));
                    releasePressedTarget(hitTarget.path);
                }} onPointerCancel={() => {
                    releaseEligibilityRef.current.delete(hitTarget.path);
                    releasePressedTarget(hitTarget.path);
                }} onLostPointerCapture={() => {
                    releasePressedTarget(hitTarget.path);
                }} onClick={(event) => {
                    const isEligible = event.detail > 0 &&
                        releaseEligibilityRef.current.get(hitTarget.path) === true;
                    releaseEligibilityRef.current.delete(hitTarget.path);
                    if (!isEligible) {
                        return;
                    }
                    playStoryUiPointerSound(event);
                    onSelect(episode);
                }} onMouseDown={(event) => {
                    if (event.button === 1) {
                        event.preventDefault();
                    }
                }} onAuxClick={(event) => {
                    if (event.button !== 1 && event.button !== 2) {
                        return;
                    }
                    event.preventDefault();
                    const isEligible = event.detail > 0 &&
                        releaseEligibilityRef.current.get(hitTarget.path) === true;
                    releaseEligibilityRef.current.delete(hitTarget.path);
                    if (!isEligible) {
                        return;
                    }
                    playStoryUiPointerSound(event);
                    onSelect(episode);
                }} onContextMenu={(event) => event.preventDefault()} onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                    }
                }}>
                  <span aria-hidden="true" className={styles.hitSurface} data-story-chronicle-omen-hit-surface="state-button-raycast" style={getStateButtonHitSurfaceStyle(hitTarget, pressedTarget === hitTarget.path)}/>
                </button>
              </div>);
        })}

          {episode15 ? (<button type="button" tabIndex={-1} className={`${styles.hitButton} ${styles.episode15HitTarget}`} style={getRootRectStyle(STORY_OMEN_EPISODE_15_HIT_TARGET)} aria-label={`${episode15.titleKo} - ${episode15.subtitleKo}`} data-story-chronicle-omen-episode15="TAG_COMMON_EPISODE_MAIN_EP15_NORMAL" data-story-chronicle-omen-episode15-shortcut-type="SHORTCUT_MAINSTREAM" data-story-chronicle-omen-episode15-shortcut-param="17" data-story-chronicle-omen-episode15-shortcut-force="true" data-story-chronicle-omen-episode15-destination="operation-mainstream" data-story-chronicle-omen-episode15-route={`/story/reader/?episode=${episode15.episodeId}`} data-story-chronicle-omen-episode15-tag-gate="not-simulated" data-story-ui-click-sound="select" data-story-chronicle-omen-hit-target={STORY_OMEN_EPISODE_15_HIT_TARGET.path} data-story-chronicle-omen-press-scale={STORY_OMEN_EPISODE_15_HIT_TARGET.pressScale} data-story-chronicle-omen-press-seconds={STORY_OMEN_EPISODE_15_HIT_TARGET.trackingSeconds} onPointerDown={(event) => {
                if (event.button >= 0 && event.button <= 2) {
                    releaseEligibilityRef.current.delete(STORY_OMEN_EPISODE_15_HIT_TARGET.path);
                    event.currentTarget.setPointerCapture(event.pointerId);
                    setPressedTarget(STORY_OMEN_EPISODE_15_HIT_TARGET.path);
                }
            }} onPointerUp={(event) => {
                releaseEligibilityRef.current.set(STORY_OMEN_EPISODE_15_HIT_TARGET.path, isOmenPointerReleaseOverTarget(event));
                releasePressedTarget(STORY_OMEN_EPISODE_15_HIT_TARGET.path);
            }} onPointerCancel={() => {
                releaseEligibilityRef.current.delete(STORY_OMEN_EPISODE_15_HIT_TARGET.path);
                releasePressedTarget(STORY_OMEN_EPISODE_15_HIT_TARGET.path);
            }} onLostPointerCapture={() => {
                releasePressedTarget(STORY_OMEN_EPISODE_15_HIT_TARGET.path);
            }} onClick={(event) => {
                const isEligible = event.detail > 0 &&
                    releaseEligibilityRef.current.get(STORY_OMEN_EPISODE_15_HIT_TARGET.path) === true;
                releaseEligibilityRef.current.delete(STORY_OMEN_EPISODE_15_HIT_TARGET.path);
                if (!isEligible) {
                    return;
                }
                playStoryUiPointerSound(event);
                onOpenMainstream(episode15);
            }} onMouseDown={(event) => {
                if (event.button === 1) {
                    event.preventDefault();
                }
            }} onAuxClick={(event) => {
                if (event.button !== 1 && event.button !== 2) {
                    return;
                }
                event.preventDefault();
                const isEligible = event.detail > 0 &&
                    releaseEligibilityRef.current.get(STORY_OMEN_EPISODE_15_HIT_TARGET.path) === true;
                releaseEligibilityRef.current.delete(STORY_OMEN_EPISODE_15_HIT_TARGET.path);
                if (!isEligible) {
                    return;
                }
                playStoryUiPointerSound(event);
                onOpenMainstream(episode15);
            }} onContextMenu={(event) => event.preventDefault()} onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                }
            }}>
              <span aria-hidden="true" className={styles.hitSurface} data-story-chronicle-omen-hit-surface="state-button-raycast" style={getStateButtonHitSurfaceStyle(STORY_OMEN_EPISODE_15_HIT_TARGET, pressedTarget === STORY_OMEN_EPISODE_15_HIT_TARGET.path)}/>
            </button>) : null}
        </div>
      </div>
    </section>);
}
