import { CharacterSpineEffectPrefab, type CharacterSpineEffectPrefabCatalog } from './characterSpineEffectPrefab';
import { CharacterSpineEffectRandom } from './characterSpineEffectRandom';
import { characterEffectSpriteFrame, type CharacterEffectSpriteScene } from './characterSpineEffectPose';
import type { CharacterEffectFrame } from './characterSpineEffectMesh';
import type { NativeHitSpawn } from './characterSpineEffectHit';
import type { CharacterFxmFrame, CharacterFxmVec3, CharacterFxmVec4 } from './characterSpineEffectFxm';
import type { NativeDamageEffectCommand, NativeDamageEffectSnapshot } from './characterSpineDamageEffect';
import { CharacterSpineWorldEffectPlayback } from './characterSpineWorldEffectPlayback';
import { characterSpineWorldParticleFrame } from './characterSpineWorldParticleFrame';
import { NativeEffectReservation, resolveNativeEffectSpawn, startNativeEffectSpawn, followNativeEffectSpawn, scaleNativeEffectSpawn, getNativeEffectAnimationSpeed, updateNativeEffectAnimationSpeed, isNativeEffectUpdateStopped, type NativeEffectSpawnPlan, type NativeEffectOwner, type NativeEffectRootTransform, type NativeEffectTransformWrites } from './characterSpineEffectSpawn';
export interface CharacterEffectNativeAnimationContract {
    readonly animatorId: string;
    readonly states: Readonly<Record<string, {
        readonly layer: number;
        readonly length: number;
        readonly loop: boolean;
    }>>;
    readonly hasEndAnimation: boolean;
    readonly hasBaseLoopAnimation: boolean;
    readonly particleSystemCount: number;
    readonly sourcePointer: string;
}
export type CharacterSpineEffectSceneCatalog = CharacterSpineEffectPrefabCatalog & CharacterEffectSpriteScene & {
    readonly nativeAnimationContracts?: Readonly<Record<string, CharacterEffectNativeAnimationContract>>;
    readonly nativeNoRendererEffects?: Readonly<Record<string, {
        readonly sourcePointer: string;
        readonly allRenderersPermanentlyInactive: true;
    }>>;
    readonly nativeParticleEnvironment?: {
        readonly gravity: {
            readonly x: number;
            readonly y: number;
            readonly z: number;
        };
        readonly maximumParticleDeltaTime: number;
        readonly source: string;
        /** Probe-created orthographic viewer camera; not a claim about the combat camera. */
        readonly viewerWorldToCamera: number[];
    };
};
export interface CharacterEffectSceneOwnerContext {
    readonly ownerKey: string;
    readonly owner: NativeEffectOwner;
    readonly masterAnimationSpeed: number | null;
    readonly mapMinZ: number;
}
type Instance = {
    id: number;
    activationOrder: number;
    prefab: CharacterSpineEffectPrefab | null;
    contract: CharacterEffectNativeAnimationContract | null;
    world: CharacterSpineWorldEffectPlayback | null;
    plan: NativeEffectSpawnPlan;
    reservation: NativeEffectReservation;
    frame: CharacterFxmFrame | null;
    original: NativeEffectRootTransform;
    transform: NativeEffectRootTransform;
    right: boolean;
    ownerKey: string | null;
    owner: NativeEffectOwner | null;
    mapMinZ: number;
    masterAnimationSpeed: number | null;
    animationName: string;
    animatorSpeed: number;
    cachedNormalizedTime: number;
    finalSpeed: number;
    externalTimeScale: number;
    gameSpeedType: number;
    tracked: boolean;
    trackedHit: boolean;
    autoDie: boolean;
    dead: boolean;
    pendingMain: boolean;
};
const f = Math.fround;
const identity: NativeEffectRootTransform = { kind: 'game-object', localPosition: [0, 0, 0], localEulerAngles: [0, 0, 0], localScale: [1, 1, 1] };
function delta(value: number): number {
    if (!Number.isFinite(value) || value < 0)
        throw new Error('Invalid effect scene delta');
    return f(value);
}
/** Source prefab + NKCASEffect lifecycle. No baked frame or guessed clip-duration expiry. */
export class CharacterSpineEffectScene {
    private readonly catalog: CharacterSpineEffectSceneCatalog;
    private readonly random: CharacterSpineEffectRandom;
    private readonly instances: Instance[] = [];
    private readonly damageMains = new Map<number, number>();
    private nextId = 1;
    private nextActivationOrder = 1;
    private readonly nativeGameOpen: boolean;
    private readonly particleContext: {
        gravity: {
            x: number;
            y: number;
            z: number;
        };
        maximumParticleDeltaTime: number;
    } | undefined;
    constructor(catalog: CharacterSpineEffectSceneCatalog, context: {
        seed: number;
        /** Retained API; visual lifetime now uses original Animator state, not this DE timing table. */
        getAnimationDuration: (bundle: string, asset: string, animation: string) => number;
        /** false is the explicit non-battle original Anim2D verification fixture. */
        nativeGameOpen?: boolean;
        particleContext?: {
            gravity: {
                x: number;
                y: number;
                z: number;
            };
            maximumParticleDeltaTime: number;
        };
    }) {
        this.catalog = catalog;
        this.random = new CharacterSpineEffectRandom(context.seed);
        this.nativeGameOpen = context.nativeGameOpen !== false;
        this.particleContext = context.particleContext;
    }
    get liveCount(): number { return this.instances.filter(instance => !instance.dead).length; }
    get liveEffectNames(): readonly string[] {
        return this.instances.filter(instance => this.isLive(instance.id)).map(instance => instance.plan.effectName);
    }
    get trackedHitCount(): number { return this.instances.filter(instance => instance.trackedHit && instance.reservation.started && !instance.dead).length; }
    /** Reserved/pending handles have not entered the live effect manager yet. */
    isLive(handle: number): boolean {
        return this.instances.some(instance => instance.id === handle && instance.reservation.started && !instance.pendingMain && !instance.dead);
    }
    get randomState(): readonly number[] { return this.random.snapshot(); }
    spawnHit(hit: NativeHitSpawn, activationFrameDelta: number): number {
        if (hit.existingBarrierAnimation)
            throw new Error('Existing barrier animation needs its original buff effect handle');
        const owner: NativeEffectOwner = { variant: 'unit', actor: { posX: hit.position.x, posZ: hit.position.z, jumpYPos: 0, right: hit.right }, skinId: null, boneGetter: () => null };
        const plan = resolveNativeEffectSpawn({ nativeFields: { m_EffectName: hit.effectName, m_AnimName: hit.animationName, m_bFixedPos: true,
                m_OffsetX: hit.position.x, m_OffsetY: hit.position.y, m_OffsetZ: hit.position.z,
                m_fReserveTime: hit.reserveTime, m_fAnimSpeed: hit.animationSpeed }, sourceLayers: [] }, owner);
        const instance = this.create(plan, { ownerKey: '', owner, masterAnimationSpeed: null, mapMinZ: hit.mapMinZ }, false);
        instance.ownerKey = null;
        instance.owner = null;
        instance.trackedHit = hit.trackDetailedOnSuccessfulLoad;
        this.instances.push(instance);
        if (instance.reservation.started)
            this.activate(instance, delta(activationFrameDelta));
        return instance.id;
    }
    spawnEffect(plan: NativeEffectSpawnPlan, activationFrameDelta: number, context: CharacterEffectSceneOwnerContext): number {
        const instance = this.create(plan, context, false);
        if (plan.stopExistingCutIn)
            for (const active of this.instances)
                if (active.plan.cutIn)
                    this.stop(active.id, true);
        this.instances.push(instance);
        if (instance.reservation.started)
            this.activate(instance, delta(activationFrameDelta));
        return instance.id;
    }
    /** Before the owner's new events, matching ProcessEventEffect(false). */
    followOwner(ownerKey: string, owner: NativeEffectOwner, masterAnimationSpeed?: number | null): void {
        for (const instance of this.instances)
            if (instance.ownerKey === ownerKey && !instance.dead) {
                if (masterAnimationSpeed !== undefined)
                    instance.masterAnimationSpeed = masterAnimationSpeed;
                if (!instance.tracked)
                    continue;
                if (!instance.reservation.started || instance.pendingMain) {
                    instance.tracked = false;
                    continue;
                }
                instance.owner = owner;
                this.writeTransform(instance, followNativeEffectSpawn(instance.plan, instance.transform, instance.original, owner, instance.right));
            }
    }
    endOwnerState(ownerKey: string): void {
        for (const instance of this.instances)
            if (instance.ownerKey === ownerKey && instance.tracked && instance.reservation.started && !instance.dead && instance.plan.stateEndStop)
                this.stop(instance.id, instance.plan.stateEndStopForce);
    }
    /** Stop(false) does not kill a sprite effect with neither END clip nor particles. */
    stop(handle: number, force: boolean): void {
        const instance = this.instances.find(value => value.id === handle);
        if (!instance || instance.dead)
            return;
        if (instance.contract?.hasEndAnimation)
            throw new Error(`Unsupported original END transition: ${instance.plan.effectName}`);
        instance.world?.stop(force);
        if (force && instance.autoDie) {
            instance.dead = true;
            instance.prefab?.disable();
        }
    }
    spawnDamageEffectMain(id: number, command: Extract<NativeDamageEffectCommand, {
        kind: 'main-effect';
    }>, context: CharacterEffectSceneOwnerContext & {
        readonly lookDir: boolean;
    }, activationFrameDelta: number): number {
        if (this.damageMains.has(id))
            throw new Error(`Duplicate native DE main ${id}`);
        if (context.owner.variant !== 'damage-effect' || context.lookDir !== false)
            throw new Error('DE main requires its original non-LookDir context');
        delta(activationFrameDelta);
        const owner = { ...context.owner, actor: { ...command.clock.position, right: command.clock.right } };
        const plan = resolveNativeEffectSpawn({ nativeFields: { m_EffectName: command.effectName, m_fScaleFactor: command.scaleFactor,
                m_bUseZScale: command.useZScale, m_fAddRotate: command.addRotate }, sourceLayers: [] }, owner);
        const instance = this.create(plan, { ...context, owner }, true);
        instance.autoDie = false;
        this.instances.push(instance);
        this.damageMains.set(id, instance.id);
        return instance.id;
    }
    startDamageEffectState(id: number, command: Extract<NativeDamageEffectCommand, {
        kind: 'state-start';
    }>, activationFrameDelta: number): void {
        const instance = this.main(id);
        instance.plan = { ...instance.plan, animationSpeed: command.animationSpeed };
        instance.animationName = command.animationName;
        if (command.animationLoop)
            throw new Error(`Unsupported native effect loop restart: ${command.animationName}`);
        this.requireAnimation(instance);
        instance.animatorSpeed = getNativeEffectAnimationSpeed(instance.plan, instance.masterAnimationSpeed, 'update');
        if (instance.pendingMain) {
            instance.pendingMain = false;
            this.activate(instance, delta(activationFrameDelta), true);
        }
        else if (instance.prefab && instance.contract && command.animationName.length > 1) {
            instance.frame = instance.prefab.advanceAnimators(f(.001), instance.animatorSpeed, delta(activationFrameDelta), { animatorId: instance.contract.animatorId, layer: instance.contract.states[command.animationName].layer });
            instance.cachedNormalizedTime = this.normalizedTime(instance);
        }
    }
    followDamageEffect(id: number, clock: NativeDamageEffectSnapshot): void {
        const instance = this.main(id), actor = { ...clock.position, right: clock.right };
        const owner = { ...instance.owner!, actor };
        instance.owner = owner;
        this.writeTransform(instance, { right: clock.right, localPosition: [f(actor.posX), f(actor.posZ + actor.jumpYPos), f(actor.posZ)],
            localEulerAngles: [instance.transform.localEulerAngles[0], clock.right ? 0 : 180, instance.transform.localEulerAngles[2]] });
        this.followOwner(instance.ownerKey!, owner);
    }
    /** NKCDamageEffect.Close deletes main; tracked children Stop(false) and become auto-die. */
    dieDamageEffect(id: number): void {
        const instance = this.main(id);
        instance.dead = true;
        instance.prefab?.disable();
        this.damageMains.delete(id);
        for (const child of this.instances)
            if (child.id !== instance.id && child.ownerKey === instance.ownerKey && child.tracked) {
                this.stop(child.id, false);
                child.autoDie = true;
                child.tracked = false;
            }
    }
    advance(frameDelta: number, context: {
        readonly worldStopTime: number;
        readonly masterStopped: boolean | null;
        readonly gameSpeedType: number;
    } = { worldStopTime: 0, masterStopped: null, gameSpeedType: 0 }): void {
        const dt = delta(frameDelta);
        for (const instance of this.instances) {
            if (instance.dead || instance.pendingMain)
                continue;
            if (!instance.reservation.started) {
                if (!instance.reservation.advance(dt))
                    continue;
                this.activate(instance, dt);
            }
            if (isNativeEffectUpdateStopped(instance.plan, context.worldStopTime, context.masterStopped)) {
                // The manager skips NKCASEffect.Update; an unsynchronized player's own
                // MonoBehaviour.Update still receives the caller's Unity frame delta.
                if (instance.world)
                    instance.frame = instance.world.advanceComponents(dt);
                else if (instance.prefab)
                    instance.frame = instance.prefab.advancePlayers(dt, instance.externalTimeScale);
                continue;
            }
            instance.transform = { ...instance.transform, localScale: scaleNativeEffectSpawn(instance.plan, instance.transform, instance.original, instance.transform.localPosition[2], instance.mapMinZ) };
            if (instance.world) {
                this.writeWorldRoot(instance);
                instance.world.advanceManager(dt, getNativeEffectAnimationSpeed(instance.plan, instance.masterAnimationSpeed, 'update'), context.gameSpeedType);
                const state = instance.world.snapshot();
                instance.finalSpeed = state.finalSpeed;
                instance.animatorSpeed = state.animatorSpeed;
                instance.externalTimeScale = state.externalTimeScale;
                instance.gameSpeedType = state.gameSpeedType;
                instance.cachedNormalizedTime = state.cachedNormalizedTime;
                if (state.dead && instance.autoDie) {
                    instance.dead = true;
                    instance.prefab?.disable();
                    continue;
                }
                instance.frame = instance.world.advanceComponents(dt);
                continue;
            }
            const speed = updateNativeEffectAnimationSpeed(instance.plan, instance.masterAnimationSpeed, instance.finalSpeed, instance.gameSpeedType, context.gameSpeedType);
            if (speed) {
                instance.finalSpeed = speed.final;
                instance.animatorSpeed = speed.final;
                instance.gameSpeedType = context.gameSpeedType;
                if (speed.fxmExternalTimeScale !== null)
                    instance.externalTimeScale = speed.fxmExternalTimeScale;
            }
            // NKCAnim2D caches layer-0 BEFORE its manual Animator.Update. DieCheck reads that cached value.
            if (instance.prefab && instance.contract) {
                instance.cachedNormalizedTime = this.normalizedTime(instance);
                if (instance.cachedNormalizedTime < 1 || instance.animationName.length <= 1)
                    instance.frame = instance.prefab.advanceAnimators(dt, instance.animatorSpeed, dt);
            }
            const animationAlive = instance.contract !== null && instance.animationName.length > 1 && instance.cachedNormalizedTime < 1;
            if (!animationAlive && instance.autoDie) {
                instance.dead = true;
                instance.prefab?.disable();
                continue;
            }
            if (instance.prefab)
                instance.frame = instance.prefab.advancePlayers(dt, instance.externalTimeScale);
        }
        for (let index = this.instances.length - 1; index >= 0; index--)
            if (this.instances[index].dead)
                this.instances.splice(index, 1);
    }
    frame(time: number, worldToCamera?: number[]): CharacterEffectFrame {
        const draws: CharacterEffectFrame['draws'] = [];
        let sourceOrder = 0;
        for (const instance of [...this.instances].sort((a, b) => a.activationOrder - b.activationOrder)) {
            if (!instance.frame || !instance.prefab || instance.dead)
                continue;
            const root = instance.frame.nodes[instance.prefab.source.rootPath];
            const frame: CharacterFxmFrame = { ...instance.frame, nodes: { ...instance.frame.nodes, [root.path]: { ...root,
                        localPosition: [...instance.transform.localPosition] as CharacterFxmVec3, localRotation: this.rotation(instance.transform.localEulerAngles),
                        localScale: [...instance.transform.localScale] as CharacterFxmVec3 } } };
            if (instance.world && !worldToCamera)
                throw new Error('World effect frame needs the explicit viewer camera');
            const drawing = instance.world
                ? characterSpineWorldParticleFrame(this.catalog, instance.world.playback, time, worldToCamera!)
                : characterEffectSpriteFrame({ ...this.catalog, nodes: instance.prefab.source.nodes }, frame, time);
            for (const draw of drawing.draws)
                draws.push({ ...draw, path: `${instance.id}:${draw.path}`, sourceRendererOrder: sourceOrder + draw.sourceRendererOrder,
                    sortingGroups: draw.sortingGroups?.map(group => ({ ...group, path: `${instance.id}:${group.path}`, sourceOrder: sourceOrder + group.sourceOrder })) });
            sourceOrder += instance.prefab.source.nodes.length + instance.prefab.source.nodes.reduce((count, node) => count + (node.renderers?.length ?? 0), 0);
        }
        return { time, draws, ...(worldToCamera ? { sortWorldToCamera: worldToCamera } : {}) };
    }
    clear(): void { for (const instance of this.instances)
        instance.prefab?.disable(); this.instances.length = 0; this.damageMains.clear(); }
    private create(plan: NativeEffectSpawnPlan, context: CharacterEffectSceneOwnerContext, pendingMain: boolean): Instance {
        if (plan.parentType !== 0 || plan.cutIn)
            throw new Error(`Unsupported native effect parent/cut-in ${plan.effectName}`);
        if (!Number.isFinite(context.mapMinZ) || (context.masterAnimationSpeed !== null && !Number.isFinite(context.masterAnimationSpeed)))
            throw new Error('Explicit native effect map/master speed required');
        const names = new Set([...this.catalog.prefabs.map(value => value.name), ...Object.keys(this.catalog.nativeNoRendererEffects ?? {})]);
        const matches = [...names].filter(name => name.toUpperCase() === plan.effectName.toUpperCase());
        if (matches.length !== 1)
            throw new Error(`Effect prefab is not available: ${plan.effectName}`);
        const name = matches[0], invisible = this.catalog.nativeNoRendererEffects?.[name];
        if (invisible && !pendingMain)
            throw new Error(`Invisible prefab lifecycle is only audited for DE main: ${name}`);
        if (invisible && (!invisible.sourcePointer || invisible.allRenderersPermanentlyInactive !== true))
            throw new Error('Missing original permanently-inactive-renderer evidence');
        const contract = invisible ? null : this.catalog.nativeAnimationContracts?.[name];
        if (!invisible && (!contract || !contract.sourcePointer || contract.hasEndAnimation || contract.hasBaseLoopAnimation))
            throw new Error(`Unsupported or unaudited native effect animation/particles: ${name}`);
        const hasParticles = !!contract?.particleSystemCount;
        if (hasParticles && (!this.particleContext || !this.nativeGameOpen || pendingMain || plan.animationName !== 'BASE'))
            throw new Error(`World effect requires the original environment and audited fresh BASE lifecycle: ${name}`);
        const world = hasParticles ? new CharacterSpineWorldEffectPlayback(this.catalog, name, {
            random: this.random, ...this.particleContext!, animatorSyncAdjustTimeScale: 1, sourceRootEulerY: 0,
        }) : null;
        const prefab = world?.playback.prefab ?? (invisible ? null : new CharacterSpineEffectPrefab(this.catalog, name, {
            random: this.random, maximumParticleDeltaTime: .03, animatorSyncAdjustTimeScale: 1, sourceRootEulerY: 0,
        }));
        const sourceRoot = prefab?.source.nodes[0];
        if (prefab?.source.evaluators.some(value => value.type !== 'NKC_FXM_SPRITE_PMA' && value.type !== 'NKC_FXM_SPRITE' &&
            (value.fields.UseMultiTargets ? value.targetPaths?.includes(prefab.source.rootPath) : value.targetPath === prefab.source.rootPath)))
            throw new Error(`Unsupported root FXM transform override: ${name}`);
        if (sourceRoot?.localRotation.some((value, index) => Math.abs(value - (index === 3 ? 1 : 0)) > 1e-6))
            throw new Error(`Effect root needs source Euler decomposition: ${name}`);
        const original = sourceRoot ? { ...identity, localPosition: sourceRoot.localPosition, localScale: sourceRoot.localScale } : identity;
        const instance: Instance = { id: this.nextId++, activationOrder: 0, prefab, world, contract: contract ?? null, plan, original, transform: { ...original }, right: plan.right,
            ownerKey: context.ownerKey, owner: context.owner, mapMinZ: f(context.mapMinZ), masterAnimationSpeed: context.masterAnimationSpeed,
            reservation: new NativeEffectReservation(plan.reserveTime), frame: null, animationName: plan.animationName, animatorSpeed: 1, cachedNormalizedTime: 0,
            finalSpeed: 1, externalTimeScale: this.nativeGameOpen ? f(1.1) : 1, gameSpeedType: 0, tracked: plan.tracked, trackedHit: false, autoDie: plan.autoDie, dead: false, pendingMain };
        if (!pendingMain)
            this.requireAnimation(instance);
        return instance;
    }
    private requireAnimation(instance: Instance): void {
        if (!instance.contract || instance.animationName.length <= 1)
            return;
        const state = instance.contract.states[instance.animationName];
        if (!state || state.layer !== 0 || !(state.length > 0))
            throw new Error(`Missing native effect animation: ${instance.plan.effectName}/${instance.animationName}`);
        const animator = instance.prefab!.source.animators.find(value => value.id === instance.contract!.animatorId);
        if (!animator || instance.prefab!.source.animators.length !== 1 || animator.layers.find(value => value.layer === 0)?.length !== state.length
            || Object.values(instance.contract.states).some(value => value.layer === 0 && value !== state))
            throw new Error(`Unsupported multi-state native effect Animator: ${instance.plan.effectName}`);
    }
    private activate(instance: Instance, frameDelta: number, mainState = false): void {
        instance.activationOrder = this.nextActivationOrder++;
        instance.animatorSpeed = getNativeEffectAnimationSpeed(instance.plan, instance.masterAnimationSpeed, mainState ? 'update' : 'initial-play');
        // Original Play evaluates .001 sec: selected BASE stays at zero while other
        // layers advance, before delayed FXM Restart (original Anim2D native oracle).
        if (instance.world)
            instance.frame = instance.world.enable(instance.animatorSpeed);
        else if (instance.prefab)
            instance.frame = instance.prefab.enable(instance.animationName.length > 1 ? f(f(.001) * instance.animatorSpeed) : 0, instance.contract && instance.animationName.length > 1
                ? { animatorId: instance.contract.animatorId, layer: instance.contract.states[instance.animationName].layer } : undefined);
        this.writeTransform(instance, startNativeEffectSpawn(instance.plan, instance.transform, instance.original));
        instance.cachedNormalizedTime = this.normalizedTime(instance);
        void frameDelta;
    }
    private normalizedTime(instance: Instance): number {
        if (!instance.contract || !instance.frame)
            return 0;
        const state = instance.frame.animators[instance.contract.animatorId]?.find(value => value.layer === 0);
        if (!state)
            throw new Error('Missing live source Animator state');
        return state.normalizedTime;
    }
    private writeTransform(instance: Instance, writes: NativeEffectTransformWrites): void {
        // The viewer's supported battle-effect parent has identity TRS; other parents are rejected.
        const euler = writes.worldEulerAngles ?? writes.localEulerAngles ?? instance.transform.localEulerAngles;
        this.rotation(euler);
        instance.transform = { ...instance.transform, localPosition: writes.localPosition ?? instance.transform.localPosition, localEulerAngles: euler };
        instance.right = writes.right;
        instance.prefab?.setSourceRootEulerY(euler[1] === 180 ? 180 : 0);
        this.writeWorldRoot(instance);
    }
    private writeWorldRoot(instance: Instance): void {
        if (!instance.world)
            return;
        const euler = instance.transform.localEulerAngles;
        // Quaternion.Euler IL0009..0013 -> native 598C40: float Deg2Rad,
        // then float half-angle before sinf/cosf. Preserve the original 180-degree residue.
        const rotation: CharacterFxmVec4 = euler[0] === 0 && euler[2] === 0
            ? [0, f(Math.sin(f(f(euler[1] * f(Math.PI / 180)) * .5))), 0, f(Math.cos(f(f(euler[1] * f(Math.PI / 180)) * .5)))]
            : this.rotation(euler);
        instance.world.playback.setRootTransform(instance.transform.localPosition, rotation, instance.transform.localScale);
        instance.frame = instance.world.playback.snapshot();
    }
    private rotation(euler: readonly number[]): CharacterFxmVec4 {
        if (euler[0] !== 0 || (euler[1] !== 0 && euler[1] !== 180))
            throw new Error('Unsupported nonplanar original effect root rotation');
        const half = euler[2] * Math.PI / 360, sine = f(Math.sin(half)), cosine = f(Math.cos(half));
        return euler[1] === 180 ? [sine, cosine, 0, 0] : [0, 0, sine, cosine];
    }
    private main(id: number): Instance {
        const handle = this.damageMains.get(id), instance = this.instances.find(value => value.id === handle);
        if (!instance || instance.dead)
            throw new Error(`Missing native DE main ${id}`);
        return instance;
    }
}
