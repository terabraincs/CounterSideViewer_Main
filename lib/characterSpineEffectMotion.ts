import type { NativeObject } from "./characterSpineEffects";
import type { CharacterSpineAction } from "./characterSpineActions";
import type { CharacterSpineRuntimeDamageEffect, CharacterSpineRuntimeEvent, CharacterSpineRuntimeState } from "./characterSpineEffectData";
import type { CompiledEffectCondition, EffectConditionContext } from "./characterSpineEffectConditions";
import { compileCharacterSpineEffectCondition, evaluateCharacterSpineEffectCondition } from "./characterSpineEffectConditions.ts";
import { CharacterSpineEffectTimeline, type CharacterEffectClock } from "./characterSpineEffectTimeline.ts";
import { CharacterSpineEffectAttack, type NativeUnitAttackActor, type NativeUnitAttackTarget, type NativeUnitAttackCommand, type NativeUnitAttackContext } from "./characterSpineEffectAttack.ts";
import { CharacterSpineDamageEffect, getNativeDamageEffectMainEffectName, resolveNativeDamageEffectSpawn, resolveNativeChildDamageEffectSpawn, type NativeDamageEffectSpawn, type NativeDamageEffectCommand, type NativeDamageEffectSnapshot, type NativeDamageEffectTarget } from "./characterSpineDamageEffect.ts";
import { CharacterSpineHitRandom } from "./characterSpineEffectRandom";
import { CharacterSpineDamageEffectQueue } from "./characterSpineDamageEffectQueue.ts";
import { NativeReattackClock, resolveNativeHitEffect, type NativeHitContext, type NativeHitSpawn, type NativeHitTemplateFields } from "./characterSpineEffectHit.ts";
import { nativeSoundEventTimer, processNativeSoundEvents } from "./characterSpineSoundEvents.ts";
import { readNativeSoundEvent, resolveNativeAppliedSound, resolveNativeDeathSound, type NativeSoundPlaybackPlan } from "./characterSpineSound.ts";
export interface CharacterMotionEvent extends CharacterSpineRuntimeEvent {
    readonly condition?: CompiledEffectCondition;
    readonly objectFieldLayers?: Readonly<Record<string, readonly unknown[]>>;
    readonly skinEffectNames?: Readonly<Record<string, string>> | null;
}
export interface CharacterMotionState extends CharacterSpineRuntimeState {
    readonly name: string;
    readonly animationName: string | null;
    readonly events: Readonly<Record<string, readonly CharacterMotionEvent[]>>;
}
export interface CharacterSpineMotionData {
    readonly actions?: readonly CharacterSpineAction[];
    readonly spineContract?: {
        readonly defaultMix: number;
        readonly fromAnimation: readonly string[];
        readonly toAnimation: readonly string[];
        readonly duration: readonly number[];
        readonly skeletonScale: number;
        readonly skeletonObjectScale: readonly number[];
        readonly skeletonObjectPosition: readonly number[];
        readonly skeletonObjectRotation: readonly number[];
        readonly prefabScale: readonly number[];
        readonly prefabRotation: readonly number[];
        readonly sourcePointer: string;
    };
    readonly unitStrId: string;
    readonly animationAssetName: string;
    readonly animationBundleName: string;
    readonly unit: {
        readonly nativeFields: NativeObject;
    };
    readonly viewerContext: Pick<EffectConditionContext, "skillLevels" | "isLeader" | "isPve" | "isPvp" | "isAir">;
    readonly statesByName: Readonly<Record<string, CharacterMotionState>>;
    readonly clipStates: Readonly<Record<string, readonly string[]>>;
    readonly damageEffects: Readonly<Record<string, CharacterSpineRuntimeDamageEffect>>;
    readonly damageTemplates: Readonly<Record<string, {
        readonly nativeFields: NativeObject;
    }>>;
}
export interface CharacterSpineMotionOptions {
    readonly actor: NativeUnitAttackActor;
    readonly target: NativeUnitAttackTarget | null;
    readonly skinId: number;
    readonly hitSeed: number;
    readonly mapMinZ: number;
    /** Explicit viewer unit identity and original sprite world X, before camera projection. */
    readonly getUnitSoundContext: () => {
        readonly gameUnitUid: number;
        readonly positionX: number;
    };
    readonly getAnimationDuration: (bundle: string, asset: string, animation: string) => number;
    readonly onDiagnostic: (message: string) => void;
    readonly repeatMotion?: boolean;
    /** Explicit equipment/buff-free viewer defaults are zero, not guessed native final stats. */
    readonly attackSpeedStat?: number;
    readonly runSpeedStat?: number;
    readonly getTrackedHitEffectCount?: () => number;
    readonly viewSkillCutIn?: boolean;
    readonly hitVisualContext?: () => Pick<NativeHitContext, "powerSave" | "barrier" | "useHitEffect">;
    readonly attackContext?: Partial<NativeUnitAttackContext>;
    /** External game stop state, when a caller implements the full source stop scheduler. */
    readonly getStopState?: () => {
        readonly actorStopped: boolean;
        readonly worldStopped: boolean;
    };
}
export type CharacterSpineMotionCommand = {
    readonly kind: "hit";
    readonly spawn: NativeHitSpawn;
} | ({
    readonly kind: "effect-event";
    readonly action: "spawn" | "follow" | "stop";
    readonly instanceId: number;
    readonly event: CharacterMotionEvent;
    readonly clock: CharacterEffectClock;
    readonly actor: NativeUnitAttackActor;
    readonly force?: boolean;
} & ({
    readonly source: "unit";
    readonly damageEffectId?: never;
    readonly damageEffectClock?: never;
    readonly definitionName?: never;
} | {
    readonly source: "damage-effect";
    readonly damageEffectId: number;
    readonly damageEffectClock: NativeDamageEffectSnapshot;
    readonly definitionName: string;
})) | {
    readonly kind: "damage-effect";
    readonly id: number;
    readonly definitionName: string;
    readonly command: NativeDamageEffectCommand | {
        readonly kind: "update";
        readonly clock: NativeDamageEffectSnapshot;
    };
} | {
    readonly kind: "sound";
    readonly owner: NativeMotionSoundOwner;
    readonly plan: NativeSoundPlaybackPlan;
} | {
    readonly kind: "sound-stop";
    readonly owner: NativeMotionSoundOwner;
} | {
    readonly kind: "reset";
};
export type NativeMotionSoundOwner = {
    readonly source: "unit";
} | {
    readonly source: "damage-effect";
    readonly id: number;
};
const f = Math.fround;
const nearZero = (value: number) => Math.abs(value) < f(1e-5);
const num = (fields: Readonly<Record<string, unknown>>, name: string, ctor = 0) => {
    const value = fields[name] ?? ctor;
    if (typeof value !== "number" || !Number.isFinite(f(value)))
        throw new Error(`Invalid native ${name}`);
    return f(value);
};
const flag = (fields: Readonly<Record<string, unknown>>, name: string, ctor = false) => {
    const value = fields[name] ?? ctor;
    if (typeof value !== "boolean")
        throw new Error(`Invalid native ${name}`);
    return value;
};
const name = (fields: Readonly<Record<string, unknown>>, key: string, ctor = "") => {
    const value = fields[key] ?? ctor;
    if (typeof value !== "string")
        throw new Error(`Invalid native ${key}`);
    return value;
};
const reactionTypes: Record<string, number> = { NRT_INVALID: 0, NRT_INVINCIBLE: 1, NRT_NO: 2, NRT_NO_ACTION: 3, NRT_REVENGE: 4,
    NRT_DAMAGE_CATCH: 5, NRT_DAMAGE_A: 6, NRT_DAMAGE_B: 7, NRT_DAMAGE_DOWN: 8, NRT_DAMAGE_UP: 9, NRT_DAMAGE_FLY: 10 };
type PendingDE = {
    id: number;
    definitionName: string;
    runtime: CharacterSpineDamageEffect;
};
type PendingDERepeat = {
    runtime: NativeReattackClock;
    fields: NativeHitTemplateFields;
    inst: NativeHitContext["damageInst"];
    reaction: number;
};
type EffectSpawnCommand = Extract<CharacterSpineMotionCommand, {
    kind: "effect-event";
}>;
/** Source motion events for a stationary, equipment/buff-free viewer actor and explicit logical point. */
export class CharacterSpineEffectMotion {
    private readonly data: CharacterSpineMotionData;
    private readonly options: CharacterSpineMotionOptions;
    private readonly time: CharacterSpineEffectTimeline;
    private readonly attack: CharacterSpineEffectAttack;
    private readonly random: CharacterSpineHitRandom;
    private readonly diagnostics = new Set<string>();
    private readonly stamps = [new Map<number, boolean>(), new Map<number, boolean>()];
    private readonly damageEffects = new CharacterSpineDamageEffectQueue<PendingDE>();
    /** NKMUnit.m_linklistDamageEffect preserves AddLast order independently of manager slots. */
    private readonly unitDamageEffects = new Map<number, PendingDE>();
    private readonly childDamageEffects = new Map<number, Map<number, PendingDE>>();
    private readonly deRepeats: PendingDERepeat[] = [];
    private readonly pendingFx = new Map<number, EffectSpawnCommand>();
    private readonly liveFx = new Map<number, EffectSpawnCommand>();
    private readonly trackedSoundOwners = new Set<string>();
    private nextId = 1;
    private currentState: CharacterMotionState | null = null;
    private currentStateName = "";
    private currentAnimationName = "";
    private duration = 0;
    private speed = 1;
    private originalSpeed = 1;
    private running = false;
    private simpleHitFrame = false;
    private pendingState = "";
    private entryState = "";
    private pendingPriority = -1;
    constructor(data: CharacterSpineMotionData, options: CharacterSpineMotionOptions) {
        this.data = data;
        this.options = options;
        this.random = new CharacterSpineHitRandom(options.hitSeed);
        this.time = new CharacterSpineEffectTimeline([], { checkEventCondition: () => true, getSkinId: () => options.skinId,
            viewSkillCutIn: () => options.viewSkillCutIn === true, isEffectLive: (id) => this.liveFx.has(id) });
        this.attack = new CharacterSpineEffectAttack({ isGamePlaying: () => true, getDamageTemplate: (key) => this.template(key),
            checkEventCondition: (event) => this.condition(event), checkTargetInteraction: (event) => this.targetCondition(event),
            checkTargetFilters: (event, target) => this.targetFilters(event, target), getDefenderStatType66: () => 0,
            damageReact: (hit) => this.reaction(hit.templateFields), ...options.attackContext });
    }
    get clock(): CharacterEffectClock { return this.time.clock; }
    get stateName(): string { return this.currentStateName; }
    get animationName(): string { return this.currentAnimationName; }
    get animationSpeed(): number { return this.speed; }
    get animationDuration(): number { return this.duration; }
    start(stateName: string): CharacterSpineMotionCommand[] {
        this.diagnostics.clear();
        this.entryState = stateName;
        return this.enterState(stateName);
    }
    private enterState(stateName: string): CharacterSpineMotionCommand[] {
        const commands: CharacterSpineMotionCommand[] = [];
        if (this.running)
            this.endState(commands);
        const state = this.data.statesByName[stateName];
        if (!state) {
            this.report(`Missing exact source state ${stateName}`);
            this.running = false;
            return commands;
        }
        this.currentState = state;
        this.currentStateName = stateName;
        this.currentAnimationName = state.animationName ?? name(state.nativeFields, "m_AnimName");
        try {
            this.duration = this.options.getAnimationDuration(this.data.animationBundleName, this.data.animationAssetName, this.currentAnimationName);
        }
        catch (error) {
            this.report(error instanceof Error ? error.message : String(error));
            this.running = false;
            return commands;
        }
        if (!Number.isFinite(this.duration) || nearZero(this.duration) || this.duration < 0) {
            this.report(`Missing source animation duration ${this.data.animationAssetName}/${this.currentAnimationName}`);
            this.running = false;
            return commands;
        }
        this.duration = f(this.duration);
        this.stopOwnerSound({ source: "unit" }, commands);
        this.pendingState = "";
        this.pendingPriority = -1;
        this.stamps.forEach((stamp) => stamp.clear());
        this.running = true;
        // FindZeroFrameAnimSpeedEvent picks FIRST exact time==0 row whose condition passes.
        const zero = (state.events.m_listNKMEventAnimSpeed ?? []).find((event) => num(event.nativeFields, "m_fEventTime") === 0 && this.condition(event));
        this.changeSpeed(zero ? num(zero.nativeFields, "m_fAnimSpeed", 1) : num(state.nativeFields, "m_fAnimSpeed", 1));
        this.time.restart({ m_fAnimStartTime: num(state.nativeFields, "m_fAnimStartTime") });
        this.checkFamilies(state);
        this.actorEvents(commands, false);
        return commands;
    }
    /** Caller first advances its EffectManager; this method runs actor -> repeats -> DE manager. */
    advance(delta: number): CharacterSpineMotionCommand[] {
        const dt = f(delta);
        if (!Number.isFinite(dt) || dt < 0)
            throw new RangeError("Motion delta must be nonnegative float32");
        if (!this.running || !this.currentState)
            return [];
        const commands: CharacterSpineMotionCommand[] = [];
        const stops = this.options.getStopState?.() ?? { actorStopped: false, worldStopped: false };
        if (!stops.actorStopped) {
            const idle = this.currentStateName !== this.entryState && this.currentState.nativeFields.m_NKM_UNIT_STATE_TYPE === "NUST_ASTAND";
            if (this.pendingState || (this.options.repeatMotion && (idle || (!flag(this.currentState.nativeFields, "m_bAnimLoop") && this.clock.animationTime >= this.duration)))) {
                commands.push(...this.enterState(this.pendingState || this.entryState));
            }
            else {
                if (this.clock.animationTime >= this.duration && flag(this.currentState.nativeFields, "m_bAnimLoop"))
                    this.changeSpeed(0);
                this.time.advance(dt, this.speed, this.duration, flag(this.currentState.nativeFields, "m_bAnimLoop"));
                if (this.clock.animationLoopReset)
                    this.stamps[1].clear();
                this.actorEvents(commands, false);
                this.stateTransitions();
            }
        }
        this.attackCommands(this.attack.tickReattacks(dt, this.clock, () => this.options.target, stops), commands);
        if (!stops.worldStopped)
            this.tickDERepeats(dt, commands);
        this.damageEffects.update((effect) => {
            this.safe(() => this.deCommands(effect, effect.runtime.advance(dt, { worldStopped: stops.worldStopped, masterStopped: stops.actorStopped, masterAnimationSpeed: this.speed }), commands));
            commands.push({ kind: "damage-effect", id: effect.id, definitionName: effect.definitionName, command: { kind: "update", clock: effect.runtime.clock } });
            if (effect.runtime.clock.dead)
                this.childDamageEffects.delete(effect.id);
        }, (effect) => effect.runtime.clock.dead, (effect) => effect.runtime.canManagerUpdate(stops.worldStopped, stops.actorStopped));
        return commands;
    }
    /** Viewer reset: all owned presentation instances are cleared, not a fabricated game death. */
    stop(): CharacterSpineMotionCommand[] {
        this.running = false;
        this.time.end();
        this.attack.reset();
        this.damageEffects.clear();
        this.unitDamageEffects.clear();
        this.childDamageEffects.clear();
        this.deRepeats.length = 0;
        this.liveFx.clear();
        this.pendingFx.clear();
        this.trackedSoundOwners.clear();
        return [{ kind: "reset" }];
    }
    /** Renderer calls only after native-equivalent effect creation succeeds. */
    trackEffect(instanceId: number): void {
        const spawn = this.pendingFx.get(instanceId);
        if (!spawn)
            return;
        this.pendingFx.delete(instanceId);
        if (flag(spawn.event.nativeFields, "m_bHold") || flag(spawn.event.nativeFields, "m_bStateEndStop"))
            this.liveFx.set(instanceId, spawn);
    }
    forgetEffect(instanceId: number): void { this.liveFx.delete(instanceId); this.pendingFx.delete(instanceId); }
    private actorEvents(commands: CharacterSpineMotionCommand[], end: boolean): void {
        const state = this.currentState!;
        if (!end)
            this.safe(() => this.attackCommands(this.attack.process(state.events.m_listNKMEventAttack ?? [], this.clock, this.options.actor, this.options.target), commands));
        // Source ProcessStateEvents: Attack -> Sound -> Effect -> DamageEffect -> AnimSpeed.
        processNativeSoundEvents(state.events.m_listNKMEventSound ?? [], {
            stateEnd: end, animationLoop: flag(state.nativeFields, "m_bAnimLoop"),
            getSkinId: () => this.options.skinId, checkCondition: event => this.condition(event),
            eventTimer: (event, oneTime) => this.timer(event, oneTime),
        }, (_, sound) => this.safe(() => {
            const context = this.options.getUnitSoundContext();
            this.emitSound(resolveNativeAppliedSound(sound, { owner: "unit", ...context,
                skinId: this.options.skinId, random: this.random }), { source: "unit" }, commands);
        }));
        for (const effect of this.liveFx.values()) {
            if (effect.source !== "unit")
                continue;
            if (end && flag(effect.event.nativeFields, "m_bStateEndStop"))
                commands.push({ ...effect, action: "stop", force: flag(effect.event.nativeFields, "m_bStateEndStopForce"), clock: this.clock });
            else if (!end)
                commands.push({ ...effect, action: "follow", clock: this.clock, actor: { ...this.options.actor } });
        }
        for (const event of state.events.m_listNKMEventEffect ?? []) {
            if (!this.condition(event) || (flag(event.nativeFields, "m_bCutIn") && !this.options.viewSkillCutIn))
                continue;
            const skin = num(event.nativeFields, "m_SkinID", -1);
            if (skin >= 0 && skin !== this.options.skinId)
                continue;
            if (this.eventDue(event, end))
                this.emitEffect(event, commands);
        }
        // Original ProcessEventDamageEffect processes the owned list before creating new DEs.
        for (const effect of this.unitDamageEffects.values()) {
            if (!end && !this.damageEffects.has(effect)) {
                this.unitDamageEffects.delete(effect.id);
                continue;
            }
            if (end && effect.runtime.stateEndStop)
                this.deCommands(effect, effect.runtime.endByUnit(), commands);
            else if (!end)
                effect.runtime.followUnit(this.options.actor, this.options.actor.right);
        }
        for (const event of state.events.m_listNKMEventDamageEffect ?? [])
            if (this.condition(event) && this.eventDue(event, end))
                this.safe(() => this.spawnDE(event, commands));
        for (const event of state.events.m_listNKMEventDEStateChange ?? []) {
            if (!this.condition(event) || !this.eventDue(event, end))
                continue;
            for (const effect of this.unitDamageEffects.values()) {
                if (!effect.runtime.trackedByUnit || effect.runtime.clock.dead || (flag(event.nativeFields, "m_bStateEndTime") && effect.runtime.stateEndStop))
                    continue;
                const definition = this.data.damageEffects[effect.definitionName];
                if (name(definition.nativeFields, "m_DamageEffectID", definition.id) !== name(event.nativeFields, "m_DamageEffectID"))
                    continue;
                this.safe(() => effect.runtime.changeStateByUnit(name(event.nativeFields, "m_ChangeState")));
            }
        }
        if (!end)
            for (const event of state.events.m_listNKMEventAnimSpeed ?? [])
                if (this.condition(event) && this.timer(event))
                    this.changeSpeed(num(event.nativeFields, "m_fAnimSpeed", 1));
        for (const event of state.events.m_listNKMEventChangeState ?? []) {
            if (!this.condition(event) || !this.eventDue(event, end))
                continue;
            if (num(event.nativeFields, "m_TargetUnitID") > 0) {
                this.report("ChangeState targets another original unit");
                continue;
            }
            if (flag(event.nativeFields, "m_CheckCooltime")) {
                this.report("ChangeState requires original cooldown context");
                continue;
            }
            this.queueState(name(event.nativeFields, "m_ChangeState"));
        }
        for (const stamp of this.stamps)
            for (const time of stamp.keys())
                stamp.set(time, true);
    }
    private endState(commands: CharacterSpineMotionCommand[]): void { this.actorEvents(commands, true); this.time.end(); }
    private emitEffect(event: CharacterMotionEvent, commands: CharacterSpineMotionCommand[], owner?: {
        readonly id: number;
        readonly definitionName: string;
        readonly clock: NativeDamageEffectSnapshot;
    }): void {
        const origin = owner
            ? { source: "damage-effect" as const, damageEffectId: owner.id, definitionName: owner.definitionName, damageEffectClock: owner.clock }
            : { source: "unit" as const };
        const command: EffectSpawnCommand = { kind: "effect-event", ...origin, action: "spawn", instanceId: this.nextId++, event, clock: this.clock,
            actor: { ...this.options.actor } };
        this.pendingFx.set(command.instanceId, command);
        commands.push(command);
    }
    private attackCommands(input: readonly NativeUnitAttackCommand[], output: CharacterSpineMotionCommand[]): void {
        for (const command of input) {
            if (command.kind === "hit")
                this.hitPlan(command.hit.templateFields, command.hit.damageInst, command.reactionResult, output);
            else if (command.kind === "state-change")
                this.queueState(command.stateName);
            else
                this.report(`Unimplemented unit ProcessAttackHitEffect ${name(command.event.nativeFields, "m_EffectName")}`);
        }
    }
    private spawnDE(event: CharacterMotionEvent, commands: CharacterSpineMotionCommand[]): void {
        const a = this.options.actor;
        const target = this.deTarget();
        const spawn = resolveNativeDamageEffectSpawn(event, { master: { calculated: a, syncPosZ: a.posZ, right: a.right }, target, subTarget: null,
            lastTarget: target ?? a, isPvp: this.data.viewerContext.isPvp, mapMinZ: this.options.mapMinZ });
        if (spawn.kind !== "spawn")
            return;
        this.createDE(spawn, commands, false);
    }
    private createDE(spawn: NativeDamageEffectSpawn, commands: CharacterSpineMotionCommand[], nextFrame: boolean, parentId?: number): void {
        const definition = this.data.damageEffects[spawn.damageEffectName];
        if (!definition)
            throw new Error(`Missing exact source DE ${spawn.damageEffectName}`);
        const runtime = new CharacterSpineDamageEffect(definition, spawn, {
            getMainEffectName: (value) => getNativeDamageEffectMainEffectName(value, this.options.skinId),
            getMasterSkinId: () => this.options.skinId,
            getAnimationDuration: (main, animation) => this.options.getAnimationDuration(main, main, animation),
            checkEventCondition: (entry) => this.condition(entry, true), canHitTarget: (entry) => this.targetFilters(entry, this.options.target!) && this.targetCondition(entry),
            damageReact: (hit) => this.reaction(this.template(hit.damageTemplateName)), findTarget: (_, current) => current,
            getTargetByUid: (uid) => { const target = this.deTarget(); return target?.uid === uid ? target : null; },
            getAttackTargets: () => { const target = this.deTarget(); return target ? [target] : []; },
        });
        const initial = runtime.start();
        const effect = { id: this.nextId++, definitionName: spawn.damageEffectName, runtime };
        this.damageEffects.add(effect, nextFrame);
        if (!nextFrame && runtime.trackedByUnit)
            this.unitDamageEffects.set(effect.id, effect);
        if (parentId !== undefined && runtime.trackedByUnit) {
            let owned = this.childDamageEffects.get(parentId);
            if (!owned) {
                owned = new Map();
                this.childDamageEffects.set(parentId, owned);
            }
            owned.set(effect.id, effect);
        }
        this.deCommands(effect, initial, commands);
    }
    private deCommands(owner: Pick<PendingDE, "id" | "definitionName">, input: readonly NativeDamageEffectCommand[], output: CharacterSpineMotionCommand[]): void {
        for (const command of input) {
            if (command.kind === "sound")
                this.safe(() => {
                    const event = readNativeSoundEvent(command.event);
                    const plan = command.death ? resolveNativeDeathSound(event, {
                        checkCondition: () => this.condition(command.event, true), masterSkinId: this.options.skinId,
                        positionX: command.clock.position.posX, random: this.random,
                    }) : resolveNativeAppliedSound(event, { owner: "damage-effect", skinId: this.options.skinId,
                        positionX: command.clock.position.posX, random: this.random });
                    this.emitSound(plan, { source: "damage-effect", id: owner.id }, output);
                });
            else if (command.kind === "state-start") {
                this.stopOwnerSound({ source: "damage-effect", id: owner.id }, output);
                output.push({ kind: "damage-effect", ...owner, command });
            }
            else if (command.kind === "effect")
                this.emitEffect(command.event, output, { ...owner, clock: command.clock });
            else if (command.kind === "children") {
                const children = this.childDamageEffects.get(owner.id);
                if (!children)
                    continue;
                for (const child of children.values()) {
                    if (!command.stateEnd && !this.damageEffects.has(child)) {
                        children.delete(child.id);
                        continue;
                    }
                    if (command.stateEnd && child.runtime.stateEndStop)
                        this.deCommands(child, child.runtime.endByUnit(), output);
                    else if (!command.stateEnd)
                        child.runtime.followUnit(command.clock.position, command.clock.right);
                }
            }
            else if (command.kind === "death-child" || command.kind === "child")
                this.safe(() => {
                    const spawn = resolveNativeChildDamageEffectSpawn(command.event, {
                        parent: { ...command.clock.position, right: command.clock.right }, target: command.target,
                        targetUid: command.targetUid, lastTargetPosition: command.lastTargetPosition,
                        isPvp: this.data.viewerContext.isPvp, mapMinZ: this.options.mapMinZ,
                    }, command.kind === "death-child");
                    if (spawn.kind === "spawn")
                        this.createDE(spawn, output, true, command.kind === "child" ? owner.id : undefined);
                });
            else if (command.kind === "hit") {
                const fields = this.template(command.hit.damageTemplateName);
                const inst: NativeHitContext["damageInst"] = { reAttackCount: 0, attackCount: command.hit.attackCount,
                    attackUnitCount: num(command.hit.event.nativeFields, "m_AttackUnitCount", 1), attackerAddAttackUnitCount: this.options.actor.addAttackUnitCount,
                    reAttackCountOver: false, hitUnitListCount: command.hit.hitUnitListCount };
                this.hitPlan(fields, inst, command.reactionResult, output);
                const repeat = new NativeReattackClock(fields, { initialHitUnitListCount: inst.hitUnitListCount, repeatedHitUnitListCount: inst.hitUnitListCount + 1 });
                repeat.initial();
                if (!repeat.state.done)
                    this.deRepeats.push({ runtime: repeat, fields, reaction: command.reactionResult, inst: { ...inst,
                            attackCount: command.attackCountAfter, hitUnitListCount: inst.hitUnitListCount + 1,
                            reAttackCountOver: (inst.attackUnitCount ?? 0) + this.options.actor.addAttackUnitCount <= inst.attackCount } });
            }
            else
                output.push({ kind: "damage-effect", ...owner, command });
        }
    }
    private tickDERepeats(delta: number, output: CharacterSpineMotionCommand[]): void {
        for (const entry of this.deRepeats)
            entry.runtime.tick(delta, { targetAvailable: this.options.target !== null, damageReact: (repeat) => {
                    this.hitPlan(entry.fields, { ...entry.inst, reAttackCount: repeat.reAttackCount, hitUnitListCount: repeat.hitUnitListCount }, entry.reaction, output);
                    return entry.reaction;
                } });
        for (let index = this.deRepeats.length - 1; index >= 0; index -= 1)
            if (this.deRepeats[index].runtime.state.done)
                this.deRepeats.splice(index, 1);
    }
    private soundOwnerKey(owner: NativeMotionSoundOwner): string { return owner.source === "unit" ? "unit" : `de:${owner.id}`; }
    private emitSound(plan: NativeSoundPlaybackPlan | null, owner: NativeMotionSoundOwner, commands: CharacterSpineMotionCommand[]): void {
        if (!plan)
            return;
        commands.push({ kind: "sound", owner, plan });
        // The presentation layer keeps actual returned UIDs, including UID0. This
        // flag only suppresses no-op stop commands before an owner has any handles.
        if (plan.trackUid)
            this.trackedSoundOwners.add(this.soundOwnerKey(owner));
    }
    private stopOwnerSound(owner: NativeMotionSoundOwner, commands: CharacterSpineMotionCommand[]): void {
        if (this.trackedSoundOwners.delete(this.soundOwnerKey(owner)))
            commands.push({ kind: "sound-stop", owner });
    }
    private hitPlan(fields: NativeHitTemplateFields, inst: NativeHitContext["damageInst"], reaction: number, output: CharacterSpineMotionCommand[]): void {
        if (!this.options.target)
            return;
        if (!this.options.getTrackedHitEffectCount) {
            this.report("Live detailed hit-effect count is required for native hit rendering");
            return;
        }
        const visual = this.options.hitVisualContext?.() ?? { powerSave: false, barrier: null, useHitEffect: true };
        const result = resolveNativeHitEffect({ templateFields: fields, target: this.options.target, mapMinZ: this.options.mapMinZ,
            randomRange: (min, max) => this.random.range(min, max), context: { hitConfirmed: true, reactionResult: reaction, damageInst: inst,
                ...visual, simpleHitEffectFrame: this.simpleHitFrame, trackedHitEffectCountAfterPrune: this.options.getTrackedHitEffectCount() } });
        this.simpleHitFrame = result.nextSimpleHitEffectFrame;
        if (result.kind === "spawn")
            output.push({ kind: "hit", spawn: result });
    }
    private deTarget(): NativeDamageEffectTarget | null {
        const target = this.options.target;
        return target ? { ...target, isDyingOrDie: false, isBossOrShip: false, statType66: 0, penetrateDefence: 0 } : null;
    }
    private template(key: string): NativeObject {
        const template = this.data.damageTemplates[key];
        if (!template)
            throw new Error(`Missing exact source DT ${key}`);
        return template.nativeFields;
    }
    private reaction(fields: NativeHitTemplateFields): number {
        // NKMDamageTemplet ctor IL000C-000D initializes NRT_NO_ACTION(3).
        const source = fields.m_ReActType ?? "NRT_NO_ACTION";
        const result = typeof source === "number" ? source : reactionTypes[String(source)];
        if (result === undefined)
            throw new Error(`Unknown source reaction ${String(source)}`);
        return result;
    }
    private condition(event: CharacterMotionEvent, damageEffect = false): boolean {
        const base = this.data.viewerContext;
        const context: EffectConditionContext = { ...base, hasMaster: damageEffect, master: damageEffect ? base : null, target: null, buffs: [] };
        const result = evaluateCharacterSpineEffectCondition(event.condition ?? compileCharacterSpineEffectCondition(event.sourceLayers), context);
        for (const item of result.diagnostics)
            this.report(`${item.field}: ${item.message}`);
        return result.passes;
    }
    private targetCondition(event: CharacterSpineRuntimeEvent): boolean {
        const compiled = compileCharacterSpineEffectCondition(event.sourceLayers, "m_ConditionTarget");
        // A point has no skill/leader/buff profile. Empty target predicates need none.
        if (Object.keys(compiled.legacy).length || compiled.v2 !== null) {
            this.report("Logical target condition requires an explicit target combat profile");
            return false;
        }
        const fields = event.nativeFields;
        const type = fields.m_NKM_DAMAGE_TARGET_TYPE ?? "NDTT_ENEMY";
        if (!["NDTT_ENEMY", "NDTT_ALL", 0, 1].includes(type as string | number)) {
            this.report(`Logical enemy target does not implement ${String(type)}`);
            return false;
        }
        return true;
    }
    private targetFilters(event: CharacterSpineRuntimeEvent, target: NativeUnitAttackTarget): boolean {
        const fields = event.nativeFields;
        for (const layer of event.sourceLayers)
            for (const key of Object.keys(layer.fields)) {
                if (/^m_list(Allow|Ignore)(Style|Role)$/.test(key)) {
                    this.report(`Logical target requires explicit ${key}`);
                    return false;
                }
            }
        if (num(fields, "m_TargetCostLess", -1) !== -1 || num(fields, "m_TargetCostOver", -1) !== -1) {
            this.report("Logical target requires an explicit respawn cost");
            return false;
        }
        // Viewer point is explicitly a normal nonsummon, nonboss enemy. Its air flag comes from caller.
        if (flag(fields, "m_bHitSummonOnly") || !flag(fields, "m_bHitNormalUnit", true))
            return false;
        return target.isAirUnit ? flag(fields, "m_bHitAir", true) : flag(fields, "m_bHitLand", true);
    }
    private timer(event: CharacterSpineRuntimeEvent, oneTime = true): boolean {
        const animation = flag(event.nativeFields, "m_bAnimTime", true);
        const time = num(event.nativeFields, "m_fEventTime");
        const clock = this.clock;
        const previous = animation ? clock.animationTimeBack : clock.stateTimeBack, current = animation ? clock.animationTime : clock.stateTime;
        return nativeSoundEventTimer(time, previous, current, nearZero(current), oneTime, this.stamps[animation ? 1 : 0]);
    }
    private eventDue(event: CharacterSpineRuntimeEvent, end: boolean): boolean {
        const atEnd = flag(event.nativeFields, "m_bStateEndTime");
        return atEnd && end ? true : this.timer(event) && !atEnd;
    }
    private changeSpeed(requested: number): void {
        if (requested > 0)
            this.originalSpeed = requested;
        if (flag(this.currentState!.nativeFields, "m_bAnimSpeedFix")) {
            this.report("Fixed animation speed requires the native actor initial speed context");
            return;
        }
        let speed = this.originalSpeed;
        const state = this.currentState!.nativeFields;
        const type = state.m_NKM_UNIT_STATE_TYPE;
        if (["NUST_ATTACK", "NUST_SKILL", 5, 6].includes(type as string | number)) {
            if (!flag(state, "m_bNotUseAttackSpeedStat"))
                speed = f(speed + speed * f(this.options.attackSpeedStat ?? 0));
        }
        else if (flag(state, "m_bRun"))
            speed = f(speed + speed * f(this.options.runSpeedStat ?? 0));
        this.speed = speed;
    }
    private checkFamilies(state: CharacterMotionState): void {
        const handled = new Set(["m_listNKMEventAttack", "m_listNKMEventEffect", "m_listNKMEventDamageEffect", "m_listNKMEventDEStateChange", "m_listNKMEventAnimSpeed", "m_listNKMEventSound", "m_listNKMEventChangeState"]);
        for (const [list, values] of Object.entries(state.events))
            if (values.length && !handled.has(list))
                this.report(`${this.stateName}: unimplemented source ${list}`);
    }
    /** NKMUnit.StateEvent IL030E..05C8, after StateUpdate. StateChange reserves
     * the next update; it does not relabel or restart the viewer's selected action. */
    private stateTransitions(): void {
        const fields = this.currentState!.nativeFields;
        for (const [key, time] of [
            ["m_AnimTimeChangeState", this.clock.animationTime],
            ["m_AnimTimeRateChangeState", f(this.clock.animationTime / this.duration)],
            ["m_StateTimeChangeState", this.clock.stateTime],
        ] as const) {
            const threshold = num(fields, `${key}Time`, -1);
            if (threshold >= 0 && time >= threshold) {
                this.queueState(name(fields, key));
                return;
            }
        }
        const target = this.options.target;
        if (target) {
            const distance = f(Math.abs(f(target.posX - this.options.actor.posX)) - f(f(target.unitSizeX * 0.5) + f(this.options.actor.unitSizeX * 0.5)));
            for (const [key, passes] of [
                ["m_TargetDistOverChangeState", distance > num(fields, "m_TargetDistOverChangeStateDist")],
                ["m_TargetDistLessChangeState", distance < num(fields, "m_TargetDistLessChangeStateDist")],
            ] as const)
                if (name(fields, key).length > 1 && passes) {
                    this.queueState(name(fields, key));
                    return;
                }
        }
        const end = name(fields, "m_AnimEndChangeState");
        if (end.length > 1 && !flag(fields, "m_bAnimLoop") && num(fields, "m_AnimEndChangeStatePlayCount", 1) <= this.clock.animationPlayCount) {
            this.queueState(end);
            return;
        }
        // Original loop branch is evaluated on the frame which increments count,
        // before the animation clock resets on the following update.
        if (target && flag(fields, "m_bAnimLoop") && this.clock.animationTime >= this.duration) {
            const key = target.isAirUnit ? "m_AirTargetLoopChangeState" : "m_LandTargetLoopChangeState";
            if (name(fields, key))
                this.queueState(name(fields, key));
        }
    }
    private queueState(stateName: string): void {
        if (!stateName)
            return;
        const state = this.data.statesByName[stateName];
        if (!state) {
            this.report(`Missing exact source state ${stateName}`);
            return;
        }
        // NKMUnit.GetStateChangePriority: initial invincibility outranks armor;
        // equal priorities overwrite the earlier reservation.
        const invincible = flag(state.nativeFields, "m_bInvincibleState") ||
            (state.events.m_listNKMEventInvincible ?? []).some(event => num(event.nativeFields, "m_fEventTimeMin") <= 0) ||
            (state.events.m_listNKMEventInvincibleGlobal ?? []).some(event => num(event.nativeFields, "m_fEventTime") <= 0);
        const armor = state.nativeFields.m_SuperArmorLevel ?? "NSAL_INVALID";
        const levels: Record<string, number> = { NSAL_INVALID: 0, NSAL_NO: 1, NSAL_SKILL: 2, NSAL_HYPER: 3, NSAL_SUPER: 4 };
        const level = typeof armor === "number" ? armor : levels[String(armor)];
        if (level === undefined) {
            this.report(`Unknown original armor priority ${String(armor)}`);
            return;
        }
        const priority = invincible ? 9 : level === 0 ? 0 : level * 2 - 1;
        if (priority < this.pendingPriority)
            return;
        this.pendingState = stateName;
        this.pendingPriority = priority;
    }
    private safe(run: () => void): void { try {
        run();
    }
    catch (error) {
        this.report(error instanceof Error ? error.message : String(error));
    } }
    private report(message: string): void { if (!this.diagnostics.has(message)) {
        this.diagnostics.add(message);
        this.options.onDiagnostic(message);
    } }
}
