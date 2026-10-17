"use client";
import { deploymentUrl } from "@/lib/deployment";
import { useEffect, useRef, useState, type RefObject } from "react";
import type { Application, Graphics, Renderer } from "pixi.js";
import type { Spine } from "@pixi-spine/runtime-3.7";
import { CharacterSpineEffectMotion } from "@/lib/characterSpineEffectMotion";
import { CharacterSpineEffectScene, type CharacterSpineEffectSceneCatalog } from "@/lib/characterSpineEffectScene";
import { createCharacterSpineEffectMeshRenderer } from "@/lib/characterSpineEffectMesh";
import { characterSpineActorTransform } from "@/lib/characterSpineActorTransform";
import { resolveNativeEffectSpawn, resolveNativeDeathEffectSpawn, type NativeEffectOwner } from "@/lib/characterSpineEffectSpawn";
import { resolveCharacterSpineSkinContract, type CharacterSpineSkinContractCatalog } from "@/lib/characterSpineSkinContract";
type MotionData = ConstructorParameters<typeof CharacterSpineEffectMotion>[0];
type AnimationDurations = Record<string, Record<string, Record<string, number>>>;
type Input = {
    unitStrId?: string;
    skinId?: number;
    modelBundle?: string;
    modelId: string;
    actionId: string;
    actionRevision: number;
    appRef: RefObject<Application | null>;
    spineRef: RefObject<Spine | null>;
    playing: boolean;
    speed: number;
    background: string;
};
function drawBackground(graphics: Graphics, width: number, height: number, background: string) {
    graphics.clear();
    const color = background === "light" ? 0xd9dde4 : background === "green" ? 0x00b140 : background === "dark" ? 0x08090d : 0x171c26;
    graphics.beginFill(color).drawRect(0, 0, width, height).endFill();
    if (background === "grid") {
        graphics.beginFill(0x212735);
        for (let y = 0; y < height; y += 12)
            for (let x = (y / 12) % 2 ? 12 : 0; x < width; x += 24)
                graphics.drawRect(x, y, 12, 12);
        graphics.endFill();
    }
}
export function useCharacterSpineEffects(input: Input) {
    const [enabled, setEnabled] = useState(true);
    const [loaded, setLoaded] = useState<{
        key: string;
        data: MotionData;
    } | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [status, setStatus] = useState("");
    const latest = useRef({ ...input, enabled });
    useEffect(() => { latest.current = { ...input, enabled }; });
    const actionActive = Boolean(input.actionId);
    const skinId = input.skinId ?? 0;
    const dataKey = JSON.stringify([input.unitStrId, input.modelId, skinId, input.modelBundle]);
    const data = loaded?.key === dataKey ? loaded.data : null;
    useEffect(() => {
        const abort = new AbortController();
        setLoaded(null);
        setStatus("");
        setLoadError(false);
        if (!input.unitStrId || !input.modelId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        async function json<T>(url: string): Promise<T> {
            const response = await fetch(url, { signal: abort.signal });
            if (!response.ok)
                throw new Error(`Action resource HTTP ${response.status}: ${url}`);
            return response.json() as Promise<T>;
        }
        void Promise.all([
            json<MotionData>(deploymentUrl(`/spine/effects/units/${encodeURIComponent(input.unitStrId)}.json`)),
            skinId ? json<CharacterSpineSkinContractCatalog>(deploymentUrl("/spine/effects/skin-contracts.json")) : null,
        ]).then(([unitData, skinContracts]) => {
            // The visual prefab/mix changes; the unit's gameplay animation timing does not.
            const value = skinContracts ? { ...unitData,
                spineContract: resolveCharacterSpineSkinContract(skinContracts, skinId, input.modelBundle) } : unitData;
            if (!abort.signal.aborted)
                setLoaded({ key: dataKey, data: value });
        }).catch(error => {
            if (!abort.signal.aborted) {
                console.info("[Character actions]", error);
                setLoadError(true);
                setStatus("전투 동작에 필요한 원본 자료를 불러오지 못했습니다.");
            }
        }).finally(() => { if (!abort.signal.aborted)
            setLoading(false); });
        return () => abort.abort();
    }, [input.unitStrId, input.modelId, input.modelBundle, skinId, dataKey]);
    useEffect(() => {
        const app = input.appRef.current;
        const spine = input.spineRef.current;
        if (!input.unitStrId || !input.modelId || !app || !spine || !data || !actionActive)
            return;
        const motionData = data;
        const abort = new AbortController();
        let cleanup: (() => void) | undefined;
        setStatus("이펙트를 불러오는 중입니다.");
        async function json<T>(url: string): Promise<T> {
            const response = await fetch(url, { signal: abort.signal });
            if (!response.ok)
                throw new Error(`Effect asset HTTP ${response.status}: ${url}`);
            return response.json() as Promise<T>;
        }
        void (async () => {
            const [catalog, durations, pixi] = await Promise.all([
                json<CharacterSpineEffectSceneCatalog>(deploymentUrl("/spine/effects/prefabs/scene.json")),
                json<AnimationDurations>(deploymentUrl("/spine/effects/animation-durations.json")),
                import("pixi.js"),
            ]);
            if (abort.signal.aborted)
                return;
            const contract = motionData.spineContract;
            if (!contract?.sourcePointer)
                throw new Error("Missing original SkeletonDataAsset playback contract");
            const actorTransform = characterSpineActorTransform(motionData);
            for (let index = 0; index < contract.fromAnimation.length; index++) {
                // SkeletonDataAsset.FillStateData skips an empty name on either side.
                if (!contract.fromAnimation[index] || !contract.toAnimation[index])
                    continue;
                if (!spine!.spineData.findAnimation(contract.fromAnimation[index]) || !spine!.spineData.findAnimation(contract.toAnimation[index])) {
                    throw new Error("Original animation mix refers to a missing Spine clip");
                }
            }
            const renderer = app!.renderer as Renderer;
            const meshes = await createCharacterSpineEffectMeshRenderer(renderer.gl, catalog, new URL(deploymentUrl("/spine/effects/prefabs/"), window.location.href).href, abort.signal);
            if (abort.signal.aborted) {
                meshes.dispose();
                return;
            }
            renderer.reset();
            const animationData = spine!.state.data;
            const originalDefaultMix = animationData.defaultMix;
            const originalMixes = animationData.animationToMixTime;
            animationData.defaultMix = contract.defaultMix;
            animationData.animationToMixTime = {};
            for (let index = 0; index < contract.fromAnimation.length; index++) {
                if (!contract.fromAnimation[index] || !contract.toAnimation[index])
                    continue;
                animationData.setMix(contract.fromAnimation[index], contract.toAnimation[index], contract.duration[index]);
            }
            const getAnimationDuration = (bundle: string, asset: string, animation: string) => {
                const value = durations[bundle.toLowerCase()]?.[asset]?.[animation];
                if (value === undefined)
                    throw new Error(`Missing original animation duration: ${bundle}/${asset}/${animation}`);
                return value;
            };
            const scene = new CharacterSpineEffectScene(catalog, { seed: 12345, getAnimationDuration,
                particleContext: catalog.nativeParticleEnvironment });
            let hasUnsupported = false;
            const diagnostics = new Set<string>();
            const diagnose = (message: string) => {
                if (abort.signal.aborted)
                    return;
                if (!diagnostics.has(message)) {
                    diagnostics.add(message);
                    console.info("[Character effects]", message);
                }
                if (!hasUnsupported) {
                    hasUnsupported = true;
                    setStatus("일부 효과는 아직 표시할 수 없습니다.");
                }
            };
            const actor = { posX: 0, beforeX: 0, posZ: 0, jumpYPos: 0, right: true,
                unitSizeX: Number(motionData.unit.nativeFields.m_UnitSizeX ?? 0), addAttackRange: 0, addAttackUnitCount: 0 };
            const unitOwner: NativeEffectOwner = { variant: "unit", actor, skinId,
                // Bone-bound effects require the original Unity transform contract.
                boneGetter: () => null };
            const motion = new CharacterSpineEffectMotion(motionData, {
                actor,
                // This is the viewer's invisible point, with no defender size or model.
                target: { uid: 1, posX: 240, posZ: 0, jumpYPos: 120, unitSizeX: 0, unitSizeY: 0, right: false, isAirUnit: false },
                skinId, getAnimationDuration, hitSeed: 12345, mapMinZ: 0,
                // This isolated viewer assigns UID2 to its stationary actor; UID1 is
                // the invisible target point. Camera/canvas scaling is not sound space.
                getUnitSoundContext: () => ({ gameUnitUid: 2, positionX: actor.posX }),
                repeatMotion: true, onDiagnostic: diagnose,
                getTrackedHitEffectCount: () => scene.trackedHitCount,
            });
            let elapsed = 0;
            const background = new pixi.Graphics();
            // The native PMA/additive shader must blend with the background in this
            // framebuffer, including colors whose alpha is zero but RGB is nonzero.
            app!.stage.addChildAt(background, 0);
            class EffectLayer extends pixi.Container {
                protected _render(pixiRenderer: Renderer) {
                    if (abort.signal.aborted || spine!.destroyed || input.spineRef.current !== spine
                        || !latest.current.enabled || spine!.alpha === 0)
                        return;
                    pixiRenderer.batch.flush();
                    const width = app!.screen.width, height = app!.screen.height;
                    const transform = spine!.worldTransform;
                    const { scaleX, scaleY, offsetX, offsetY } = actorTransform;
                    const originX = transform.tx - transform.a * offsetX / scaleX + transform.c * offsetY / scaleY;
                    const originY = transform.ty - transform.b * offsetX / scaleX + transform.d * offsetY / scaleY;
                    const projection = new Float32Array([
                        2 * transform.a / width / scaleX, -2 * transform.b / height / scaleX, 0, 0,
                        -2 * transform.c / width / scaleY, 2 * transform.d / height / scaleY, 0, 0,
                        0, 0, 0, 0,
                        2 * originX / width - 1, 1 - 2 * originY / height, 0, 1,
                    ]);
                    try {
                        meshes.draw(scene.frame(elapsed, catalog.nativeParticleEnvironment?.viewerWorldToCamera), projection);
                    }
                    catch (error) {
                        diagnose(String(error));
                    }
                    // External WebGL programs/buffers/blending invalidate Pixi's state cache.
                    // RenderTextureSystem.reset uploads projection uniforms before this
                    // Pixi build reaches ShaderSystem.reset. Invalidate the old shader
                    // first so that upload cannot target the external effect program.
                    pixiRenderer.shader.reset();
                    pixiRenderer.reset();
                }
            }
            const layer = new EffectLayer();
            app!.stage.addChild(layer);
            const canvas = app!.view as HTMLCanvasElement;
            let previousBackground = "";
            let previousState = "";
            let previousRevision = -1;
            let displayedRevision = -1;
            let displayedPlayCount = 0;
            const originalLoops = new WeakMap<object, boolean>();
            const effectHandles = new Map<number, number>();
            const damageOwners = new Map<number, NativeEffectOwner>();
            const loadedDamageMains = new Set<number>();
            let managed = false;
            const process = (commands: ReturnType<CharacterSpineEffectMotion["advance"]>, delta: number) => {
                for (const command of commands) {
                    try {
                        if (command.kind === "hit")
                            scene.spawnHit(command.spawn, delta);
                        else if (command.kind === "reset") {
                            scene.clear();
                            effectHandles.clear();
                            damageOwners.clear();
                            loadedDamageMains.clear();
                        }
                        else if (command.kind === "effect-event") {
                            const ownerKey = command.source === "unit" ? "unit" : `de:${command.damageEffectId}`;
                            const owner = command.source === "unit" ? { ...unitOwner, actor: command.actor }
                                : damageOwners.get(command.damageEffectId!);
                            if (!owner)
                                throw new Error(`Missing exact effect owner ${ownerKey}`);
                            const currentOwner = command.damageEffectClock
                                ? { ...owner, actor: { ...command.damageEffectClock.position, right: command.damageEffectClock.right } } : owner;
                            if (command.action === "spawn") {
                                const plan = resolveNativeEffectSpawn(command.event, currentOwner);
                                const handle = scene.spawnEffect(plan, delta, { ownerKey, owner: currentOwner,
                                    masterAnimationSpeed: motion.animationSpeed, mapMinZ: 0 });
                                effectHandles.set(command.instanceId, handle);
                                motion.trackEffect(command.instanceId);
                            }
                            else if (command.action === "follow") {
                                scene.followOwner(ownerKey, currentOwner, motion.animationSpeed);
                            }
                            else {
                                const handle = effectHandles.get(command.instanceId);
                                if (handle !== undefined)
                                    scene.stop(handle, command.force === true);
                            }
                        }
                        else if (command.kind === "damage-effect") {
                            const event = command.command;
                            const ownerKey = `de:${command.id}`;
                            if (event.kind === "main-effect") {
                                const definition = motionData.damageEffects[command.definitionName];
                                if (!definition)
                                    throw new Error(`Missing exact DE definition ${command.definitionName}`);
                                const owner: NativeEffectOwner = { variant: "damage-effect", skinId,
                                    actor: { ...event.clock.position, right: event.clock.right }, hasMainEffect: false, boneGetter: () => null,
                                    damageTemplate: { useMasterAnimSpeed: definition.nativeFields.m_UseMasterAnimSpeed === true,
                                        canIgnoreStopTime: definition.nativeFields.m_CanIgnoreStopTime === true } };
                                damageOwners.set(command.id, owner);
                                scene.spawnDamageEffectMain(command.id, event, { ownerKey, owner,
                                    masterAnimationSpeed: motion.animationSpeed, mapMinZ: 0, lookDir: definition.nativeFields.m_bLookDir === true }, delta);
                                loadedDamageMains.add(command.id);
                                damageOwners.set(command.id, { ...owner, hasMainEffect: true });
                            }
                            else if (event.kind === "state-start") {
                                scene.endOwnerState(ownerKey);
                                if (loadedDamageMains.has(command.id))
                                    scene.startDamageEffectState(command.id, event, delta);
                            }
                            else if (event.kind === "update") {
                                const owner = damageOwners.get(command.id);
                                if (owner) {
                                    const currentOwner = { ...owner, actor: { ...event.clock.position, right: event.clock.right } };
                                    damageOwners.set(command.id, currentOwner);
                                    scene.followOwner(ownerKey, currentOwner, motion.animationSpeed);
                                }
                                if (loadedDamageMains.has(command.id))
                                    scene.followDamageEffect(command.id, event.clock);
                            }
                            else if (event.kind === "death-effect") {
                                const owner = damageOwners.get(command.id);
                                if (owner?.variant !== "damage-effect")
                                    throw new Error(`Missing original dying DE owner ${command.id}`);
                                const currentOwner = { ...owner, actor: { ...event.clock.position, right: event.clock.right } };
                                const plan = resolveNativeDeathEffectSpawn(event.event, currentOwner);
                                scene.spawnEffect(plan, delta, { ownerKey, owner: currentOwner,
                                    masterAnimationSpeed: motion.animationSpeed, mapMinZ: 0 });
                            }
                            else if (event.kind === "die") {
                                if (loadedDamageMains.has(command.id))
                                    scene.dieDamageEffect(command.id);
                                else
                                    scene.endOwnerState(ownerKey);
                                damageOwners.delete(command.id);
                                loadedDamageMains.delete(command.id);
                            }
                        }
                    }
                    catch (error) {
                        if (command.kind === "effect-event" && command.action === "spawn")
                            motion.forgetEffect(command.instanceId);
                        diagnose(String(error));
                    }
                }
            };
            const tick = () => {
                // Model disposal happens before React runs this hook's effect cleanup.
                // The old Pixi ticker must not touch its destroyed Spine in that gap.
                if (abort.signal.aborted || spine!.destroyed || !spine!.state || input.spineRef.current !== spine)
                    return;
                const controls = latest.current;
                const backgroundKey = `${controls.background}:${app!.screen.width}:${app!.screen.height}`;
                if (backgroundKey !== previousBackground) {
                    drawBackground(background, app!.screen.width, app!.screen.height, controls.background);
                    previousBackground = backgroundKey;
                }
                if (spine!.alpha === 0)
                    return;
                const currentTrack = spine!.state.getCurrent(0);
                let changedMotion = false;
                const state = motionData.actions?.find(action => action.id === controls.actionId)?.stateName ?? "";
                if (!state) {
                    if (managed) {
                        process(motion.stop(), 0);
                        scene.clear();
                    }
                    managed = false;
                    previousState = "";
                    spine!.autoUpdate = true;
                    if (currentTrack && originalLoops.has(currentTrack))
                        currentTrack.loop = originalLoops.get(currentTrack)!;
                    spine!.state.timeScale = controls.playing ? controls.speed : 0;
                    return;
                }
                if (state !== previousState || controls.actionRevision !== previousRevision) {
                    if (managed)
                        process(motion.stop(), 0);
                    scene.clear();
                    hasUnsupported = false;
                    setStatus("");
                    try {
                        process(motion.start(state), Math.fround(1 / 60));
                    }
                    catch (error) {
                        diagnose(String(error));
                        return;
                    }
                    previousState = state;
                    managed = true;
                    previousRevision = controls.actionRevision;
                    changedMotion = true;
                }
                spine!.autoUpdate = false;
                spine!.state.timeScale = 0;
                if (currentTrack) {
                    if (!originalLoops.has(currentTrack))
                        originalLoops.set(currentTrack, currentTrack.loop);
                    currentTrack.loop = false;
                }
                const delta = controls.playing ? Math.fround(app!.ticker.deltaMS / 1000 * controls.speed) : 0;
                if (controls.playing) {
                    elapsed += delta;
                    try {
                        scene.advance(delta);
                        for (const [id, handle] of effectHandles)
                            if (!scene.isLive(handle)) {
                                motion.forgetEffect(id);
                                effectHandles.delete(id);
                            }
                        process(motion.advance(delta), delta);
                        scene.followOwner("unit", unitOwner, motion.animationSpeed);
                    }
                    catch (error) {
                        diagnose(String(error));
                    }
                }
                let displayedTrack = currentTrack;
                const stateChanged = displayedRevision !== motion.clock.stateRevision;
                const loopAdvanced = !stateChanged && motion.clock.animationPlayCount > displayedPlayCount
                    && motionData.statesByName[motion.stateName]?.nativeFields.m_bAnimLoop === true;
                if (motion.animationName && (changedMotion || stateChanged || loopAdvanced || !currentTrack)) {
                    // NKCAnimSpine.Play IL00C6..0156: reset setup pose, SetAnimation(false),
                    // apply the original per-pair mix, then evaluate .001 sec at play speed.
                    spine!.skeleton.setToSetupPose();
                    displayedTrack = spine!.state.setAnimation(0, motion.animationName, false);
                    originalLoops.set(displayedTrack, true);
                    displayedTrack.trackTime = loopAdvanced ? 0 : Number(motionData.statesByName[motion.stateName]?.nativeFields.m_fAnimStartTime ?? 0);
                    spine!.state.timeScale = motion.animationSpeed;
                    spine!.update(.001);
                }
                // NKCAnimSpine.Update checks the actual Spine track's end before UpdateSpine.
                // The presentation clock and NKMUnit's event clock are separate in the client.
                if (displayedTrack && controls.playing && displayedTrack.trackTime < displayedTrack.animationEnd) {
                    spine!.state.timeScale = motion.animationSpeed;
                    spine!.update(delta);
                }
                spine!.state.timeScale = 0;
                displayedRevision = motion.clock.stateRevision;
                displayedPlayCount = motion.clock.animationPlayCount;
                canvas.dataset.spineMotionState = motion.stateName;
                canvas.dataset.spineMotionSkinId = String(skinId);
                canvas.dataset.spineEffectNames = JSON.stringify(scene.liveEffectNames);
            };
            app!.ticker.add(tick, undefined, pixi.UPDATE_PRIORITY.HIGH);
            setStatus("");
            cleanup = () => {
                app!.ticker?.remove(tick);
                delete canvas.dataset.spineMotionState;
                delete canvas.dataset.spineMotionSkinId;
                delete canvas.dataset.spineEffectNames;
                scene.clear();
                meshes.dispose();
                animationData.defaultMix = originalDefaultMix;
                animationData.animationToMixTime = originalMixes;
                app!.stage?.removeChild(layer, background);
                if (!layer.destroyed)
                    layer.destroy();
                if (!background.destroyed)
                    background.destroy();
                if (!spine!.destroyed && spine!.state) {
                    const track = spine!.state.getCurrent(0);
                    if (track && originalLoops.has(track))
                        track.loop = originalLoops.get(track)!;
                    spine!.autoUpdate = true;
                    spine!.state.timeScale = latest.current.playing ? latest.current.speed : 0;
                }
            };
        })().catch((error: unknown) => {
            if (abort.signal.aborted)
                return;
            console.info("[Character effects]", error);
            setStatus("이펙트를 불러오지 못했습니다.");
        });
        return () => { abort.abort(); cleanup?.(); };
    }, [input.unitStrId, input.modelId, input.appRef, input.spineRef, data, actionActive, skinId]);
    let fitRight = 400;
    if (data?.spineContract?.prefabScale) {
        try {
            const transform = characterSpineActorTransform(data);
            fitRight = (400 - transform.offsetX) / transform.scaleX;
        }
        catch { /* Runtime reports the unsupported original transform on selection. */ }
    }
    return { enabled, setEnabled, status, actions: data?.actions ?? [], loading, loadError, fitRight };
}
