import type { CharacterSpineRuntimeDamageEffect as NativeDamageEffect, CharacterSpineRuntimeState as NativeMotionState, CharacterSpineRuntimeEvent as NativeStateEvent } from "./characterSpineEffectData";
import { nativeHitDepthScale } from "./characterSpineEffectHit.ts";
import { CharacterSpineTrackingFloat, nativeTrackingType } from "./characterSpineTracking.ts";
import { nativeSoundEventTimer, processNativeSoundEvents } from "./characterSpineSoundEvents.ts";
import { advanceNativeDamageEffectPhysics, constrainNativeDamageEffectPosition, makeNativeDamageEffectDirection, type NativeDamageMotionState, type NativeDamageMotionTarget, type NativeDamageMotionTemplate } from "./characterSpineDamageEffectPhysics.ts";
type Fields = Readonly<Record<string, unknown>>;
export interface NativeDamageEffectPosition {
    readonly posX: number;
    readonly posZ: number;
    readonly jumpYPos: number;
}
export interface NativeDamageEffectTarget extends NativeDamageEffectPosition {
    readonly uid: number;
    readonly unitSizeX: number;
    /** Required by UseTargetDir; absent combat context must not be invented. */
    readonly unitSizeY?: number;
    readonly isDyingOrDie?: boolean;
    readonly isAirUnit: boolean;
    readonly isBossOrShip: boolean;
    readonly statType66: number;
    readonly penetrateDefence: number;
}
export interface NativeDamageEffectSpawn {
    readonly kind: "spawn";
    readonly damageEffectName: string;
    readonly position: NativeDamageEffectPosition;
    readonly right: boolean;
    readonly target: NativeDamageEffectTarget | null;
    /** Original stored UID can survive a failed target search. */
    readonly targetUid?: number;
    readonly addRotate: number;
    readonly speedFactorX: number;
    readonly speedFactorY: number;
    readonly useZScale: boolean;
    /** Retained for provenance. This DLL's UseDamageEffect does not read this argument. */
    readonly sourceReserveTime: number;
    readonly effectiveReserveTime: 0;
    readonly ownership?: {
        readonly tracked: boolean;
        readonly stateEndStop: boolean;
        readonly followType: number;
        readonly followTime: number;
        readonly followResetTime: number;
        readonly offsetX: number;
        readonly offsetY: number;
        readonly offsetZ: number;
    };
}
const f = Math.fround;
const add = (a: number, b: number) => f(a + b);
const sub = (a: number, b: number) => f(a - b);
const mul = (a: number, b: number) => f(a * b);
const epsilon = f(1e-5);
const near = (a: number, b = 0) => Math.abs(sub(a, b)) < epsilon;
function number(value: unknown, label: string): number {
    if (typeof value !== "number" || !Number.isFinite(f(value)))
        throw new TypeError(`${label} requires a finite float32`);
    return f(value);
}
function flag(value: unknown, label: string): boolean {
    if (typeof value !== "boolean")
        throw new TypeError(`${label} requires an explicit boolean`);
    return value;
}
function text(value: unknown, label: string): string {
    if (typeof value !== "string")
        throw new TypeError(`${label} requires a string`);
    return value;
}
const n = (fields: Fields, key: string, ctor = 0) => number(fields[key] ?? ctor, key);
const b = (fields: Fields, key: string, ctor = false) => flag(fields[key] ?? ctor, key);
const s = (fields: Fields, key: string, ctor = "") => text(fields[key] ?? ctor, key);
/** NKMDamageEffectTemplet.GetMainEffectName selects the visual prefab only.
 * LoadFromLUA appends each inherited m_dicSkinEffect table with Dictionary.Add;
 * StateStart still obtains gameplay duration from the unskinned main name. */
export function getNativeDamageEffectMainEffectName(definition: NativeDamageEffect, skinId: number | null): string {
    const base = s(definition.nativeFields, "m_MainEffectName");
    if (skinId === null)
        return base;
    if (!Number.isInteger(skinId) || skinId < -2147483648 || skinId > 2147483647)
        throw new TypeError("skinId requires an Int32 or null");
    if (skinId < 0)
        return base;
    const names = new Map<number, string>();
    for (const layer of definition.objectFieldLayers.m_dicSkinEffect ?? []) {
        if (!Array.isArray(layer))
            throw new Error("Invalid native damage-effect skin table");
        for (const row of layer) {
            if (!row || typeof row !== "object" || Array.isArray(row))
                throw new Error("Invalid native damage-effect skin row");
            const id = row.m_SkinID === undefined ? -1 : row.m_SkinID;
            const effectName = row.m_MainEffectName === undefined ? "AB_FX_DUMMY" : row.m_MainEffectName;
            if (!Number.isInteger(id) || id < -2147483648 || id > 2147483647 || typeof effectName !== "string")
                throw new TypeError("Native damage-effect skin row requires Int32/String values");
            if (names.has(id))
                throw new Error(`Native Dictionary.Add duplicate damage-effect skinId ${id}`);
            names.set(id, effectName);
        }
    }
    return names.has(skinId) ? names.get(skinId)! : base;
}
function position(value: NativeDamageEffectPosition): NativeDamageEffectPosition {
    return { posX: number(value?.posX, "posX"), posZ: number(value.posZ, "posZ"), jumpYPos: number(value.jumpYPos, "jumpYPos") };
}
function targetCopy(value: NativeDamageEffectTarget | null): NativeDamageEffectTarget | null {
    if (value === null)
        return null;
    const result = { ...position(value), uid: number(value.uid, "target.uid"), unitSizeX: number(value.unitSizeX, "target.unitSizeX"),
        ...(value.unitSizeY === undefined ? {} : { unitSizeY: number(value.unitSizeY, "target.unitSizeY") }),
        ...(value.isDyingOrDie === undefined ? {} : { isDyingOrDie: flag(value.isDyingOrDie, "target.isDyingOrDie") }),
        isAirUnit: flag(value.isAirUnit, "target.isAirUnit"), isBossOrShip: flag(value.isBossOrShip, "target.isBossOrShip"),
        statType66: number(value.statType66, "target.statType66"), penetrateDefence: number(value.penetrateDefence, "target.penetrateDefence") };
    if (!Number.isInteger(result.uid) || result.uid <= 0 || result.unitSizeX < 0 || !Number.isInteger(result.penetrateDefence))
        throw new RangeError("Invalid logical target dimensions/identity");
    return result;
}
function unsupported(name: string): never { throw new Error(`Unimplemented native damage-effect branch: ${name}`); }
/** Original SpeedX/SpeedY/DirSpeed.GetSpeed; each fade starts from the current speed. */
export function nativeDamageEffectEventSpeed(fields: Fields, speedField: "m_SpeedX" | "m_SpeedY" | "m_fDirSpeed", now: number, current: number): number {
    const target = n(fields, speedField), min = n(fields, "m_fEventTimeMin"), max = n(fields, "m_fEventTimeMax");
    if (!b(fields, "m_bFade") || near(min, max))
        return target;
    const amount = f((now - min) / (max - min));
    // Original Mono keeps arithmetic intermediates in double and narrows the local/return.
    return f(current + (target - current) * amount);
}
/** Original per-layer aliases precede NKMEventPosData's modern keys. */
function readNativeDamageEffectEvent(event: NativeStateEvent) {
    let moveBase: unknown = "ME";
    let moveOffset: unknown = "MY_LOOK_DIR";
    let baseType: unknown = "CENTER";
    let useMyZ = true;
    let offsetX = 0;
    let offsetY = 0;
    let offsetZ = 0;
    const fields: Record<string, unknown> = {};
    const layers = event.sourceLayers.length ? event.sourceLayers.map((layer) => layer.fields) : [event.nativeFields];
    for (const layer of layers) {
        Object.assign(fields, layer);
        if (b(layer, "m_bTargetPos"))
            moveBase = "TARGET_UNIT";
        if (b(layer, "m_bShipSkillPos")) {
            moveBase = "SHIP_SKILL_POS";
            useMyZ = false;
        }
        if (b(layer, "m_bUseMapPos"))
            moveBase = "MAP_RATE";
        if (b(fields, "m_bUseSubTarget"))
            moveBase = "SUB_TARGET_UNIT";
        if (layer.m_OffsetX !== undefined)
            offsetX = n(layer, "m_OffsetX");
        if (layer.m_OffsetY !== undefined)
            offsetY = n(layer, "m_OffsetY");
        if (layer.m_OffsetZ !== undefined)
            offsetZ = n(layer, "m_OffsetZ");
        if (layer.m_MoveBase !== undefined)
            moveBase = layer.m_MoveBase;
        if (layer.m_MoveOffset !== undefined)
            moveOffset = layer.m_MoveOffset;
        if (layer.m_MoveBaseType !== undefined)
            baseType = layer.m_MoveBaseType;
        if (layer.m_OffsetJumpYPos !== undefined)
            offsetY = n(layer, "m_OffsetJumpYPos");
        if (layer.m_fOffsetX !== undefined)
            offsetX = n(layer, "m_fOffsetX");
        if (layer.m_fOffsetY !== undefined)
            offsetY = n(layer, "m_fOffsetY");
        if (layer.m_fOffsetZ !== undefined)
            offsetZ = n(layer, "m_fOffsetZ");
        if (layer.m_bUseMyZPos !== undefined)
            useMyZ = b(layer, "m_bUseMyZPos");
    }
    return { fields, moveBase, moveOffset, baseType, useMyZ, offsetX, offsetY, offsetZ };
}
/** Unit ApplyEventDamageEffect; other source position modes fail explicitly. */
export function resolveNativeDamageEffectSpawn(event: NativeStateEvent, context: {
    readonly master: {
        readonly calculated: NativeDamageEffectPosition;
        readonly syncPosZ: number;
        readonly right: boolean;
    };
    readonly target: NativeDamageEffectTarget | null;
    readonly subTarget: NativeDamageEffectTarget | null;
    readonly lastTarget: NativeDamageEffectPosition;
    readonly isPvp: boolean;
    readonly mapMinZ: number;
}): NativeDamageEffectSpawn | {
    readonly kind: "suppressed";
    readonly reason: "requires-target";
} {
    const master = position(context.master.calculated);
    const target = targetCopy(context.target);
    const subTarget = targetCopy(context.subTarget);
    const lastTarget = position(context.lastTarget);
    flag(context.isPvp, "isPvp");
    const { fields, moveBase, moveOffset, baseType, useMyZ, offsetX, offsetY, offsetZ } = readNativeDamageEffectEvent(event);
    if (b(fields, "m_bIgnoreNoTarget") && !target)
        return { kind: "suppressed", reason: "requires-target" };
    if (!["CENTER", 0].includes(baseType as string | number))
        unsupported(`MoveBaseType ${String(baseType)}`);
    if (!["MY_LOOK_DIR", 0].includes(moveOffset as string | number))
        unsupported(`MoveOffset ${String(moveOffset)}`);
    let base: NativeDamageEffectPosition;
    if (moveBase === "ME" || moveBase === 0)
        base = master;
    else if (moveBase === "TARGET_UNIT" || moveBase === 1)
        base = target ?? lastTarget;
    else if (moveBase === "SUB_TARGET_UNIT" || moveBase === 2)
        base = subTarget ?? master;
    else
        unsupported(`MoveBase ${String(moveBase)}`);
    const right = flag(context.master.right, "master.right") !== b(fields, "m_bFlipRight");
    // ApplyEventDamageEffect always scales XY offsets using MASTER sync depth, even UseZScale=false.
    const depth = nativeHitDepthScale(context.master.syncPosZ, context.mapMinZ);
    const scaledX = mul(offsetX, depth);
    const selected = b(fields, "m_bUseSubTarget") && subTarget ? subTarget : target;
    const pvpName = s(fields, "m_DENamePVP");
    const tracked = b(fields, "m_bHold") || b(fields, "m_bStateEndStop");
    return {
        kind: "spawn", damageEffectName: context.isPvp && pvpName.length > 1 ? pvpName : s(fields, "m_DEName"),
        position: { posX: right ? add(base.posX, scaledX) : sub(base.posX, scaledX),
            jumpYPos: add(base.jumpYPos, mul(offsetY, depth)), posZ: add(useMyZ ? number(context.master.syncPosZ, "master.syncPosZ") : base.posZ, offsetZ) },
        right, target: b(fields, "m_bIgnoreTarget") ? null : selected,
        addRotate: n(fields, "m_fAddRotate"), speedFactorX: n(fields, "m_fSpeedFactorX"), speedFactorY: n(fields, "m_fSpeedFactorY"),
        useZScale: b(fields, "m_bUseZScale", true), sourceReserveTime: n(fields, "m_fReserveTime"), effectiveReserveTime: 0,
        ownership: tracked ? { tracked: true, stateEndStop: b(fields, "m_bStateEndStop"),
            followType: nativeTrackingType(fields.m_FollowType ?? "TDT_NORMAL"), followTime: n(fields, "m_FollowTime"),
            followResetTime: n(fields, "m_FollowUpdateTime"), offsetX: scaledX, offsetY: mul(offsetY, depth), offsetZ } : undefined,
    };
}
export interface NativeDamageEffectChildContext {
    readonly parent: NativeDamageEffectPosition & {
        readonly right: boolean;
    };
    readonly target: NativeDamageEffectTarget | null;
    readonly targetUid?: number;
    readonly lastTargetPosition?: NativeDamageEffectPosition;
    readonly isPvp: boolean;
    readonly mapMinZ: number;
}
/** Original DE callers use their own depth, cached target Y/Z and unit master.
 * Both enqueue for the next manager update; only the normal caller tracks Hold. */
export function resolveNativeChildDamageEffectSpawn(event: NativeStateEvent, context: NativeDamageEffectChildContext, death = false): NativeDamageEffectSpawn | {
    readonly kind: "suppressed";
    readonly reason: "requires-target";
} {
    const { fields, moveBase, moveOffset, baseType, useMyZ, offsetX, offsetY, offsetZ } = readNativeDamageEffectEvent(event);
    const target = targetCopy(context.target);
    if (b(fields, "m_bIgnoreNoTarget") && !target)
        return { kind: "suppressed", reason: "requires-target" };
    if (moveOffset !== "MY_LOOK_DIR" && moveOffset !== 0)
        unsupported(`child MoveOffset ${String(moveOffset)}`);
    if (!death && !["NST_INVALID", 0].includes((fields.m_SkillType ?? 0) as string | number))
        unsupported("child explicit skill template override");
    const parent = position(context.parent);
    let base: NativeDamageEffectPosition;
    if (moveBase === "ME" || moveBase === 0)
        base = parent;
    else if (moveBase === "TARGET_UNIT" || moveBase === 1) {
        if (!["CENTER", 0].includes(baseType as string | number))
            unsupported(`child target MoveBaseType ${String(baseType)}`);
        if (!context.lastTargetPosition)
            unsupported("child cached target position context");
        const cached = position(context.lastTargetPosition);
        base = { ...cached, posX: target?.posX ?? cached.posX };
    }
    else
        unsupported(`child MoveBase ${String(moveBase)}`);
    const right = flag(context.parent.right, "parent.right") !== b(fields, "m_bFlipRight");
    const depth = nativeHitDepthScale(parent.posZ, context.mapMinZ);
    const scaledX = mul(offsetX, depth);
    const pvpName = s(fields, "m_DENamePVP");
    const tracked = !death && (b(fields, "m_bHold") || b(fields, "m_bStateEndStop"));
    return {
        kind: "spawn", damageEffectName: flag(context.isPvp, "isPvp") && pvpName.length > 1 ? pvpName : s(fields, "m_DEName"),
        position: { posX: right ? add(base.posX, scaledX) : sub(base.posX, scaledX),
            jumpYPos: add(base.jumpYPos, mul(offsetY, depth)), posZ: add(useMyZ ? parent.posZ : base.posZ, offsetZ) },
        right, target: b(fields, "m_bIgnoreTarget") ? null : target,
        targetUid: b(fields, "m_bIgnoreTarget") ? 0 : context.targetUid ?? target?.uid ?? 0,
        addRotate: n(fields, "m_fAddRotate"), speedFactorX: n(fields, "m_fSpeedFactorX"), speedFactorY: n(fields, "m_fSpeedFactorY"),
        useZScale: b(fields, "m_bUseZScale", true), sourceReserveTime: n(fields, "m_fReserveTime"), effectiveReserveTime: 0,
        ownership: tracked ? { tracked: true, stateEndStop: b(fields, "m_bStateEndStop"),
            followType: nativeTrackingType(fields.m_FollowType ?? "TDT_NORMAL"), followTime: n(fields, "m_FollowTime"),
            followResetTime: n(fields, "m_FollowUpdateTime"), offsetX: scaledX, offsetY: mul(offsetY, depth), offsetZ } : undefined,
    };
}
/** The death caller ignores Hold/StateEndStop/Follow and explicit skill override. */
export function resolveNativeDeathChildSpawn(event: NativeStateEvent, context: NativeDamageEffectChildContext) {
    return resolveNativeChildDamageEffectSpawn(event, context, true);
}
/** NKMGame.CollisionCheck branches called for DEs with fAddRange=0. Y/Z are not tested. */
export function nativeDamageEffectCollision(input: {
    readonly beforeX: number;
    readonly nowX: number;
    readonly effectSize: number;
    readonly right: boolean;
    readonly rangeMin: number;
    readonly rangeMax: number;
    readonly targetX: number;
    readonly targetSizeX: number;
}): boolean {
    let before = number(input.beforeX, "beforeX");
    const now = number(input.nowX, "nowX");
    if (near(before, -1))
        before = now;
    let min = Math.min(before, now);
    let max = Math.max(before, now);
    const rangeMin = number(input.rangeMin, "rangeMin");
    const rangeMax = number(input.rangeMax, "rangeMax");
    const half = number(input.effectSize, "effectSize") * 0.5;
    if (flag(input.right, "right")) {
        if (rangeMax > 0)
            max += half;
        if (rangeMin < 0)
            min -= half;
        min += rangeMin;
        max += rangeMax;
    }
    else {
        if (rangeMax > 0)
            min -= half;
        if (rangeMin < 0)
            max += half;
        min -= rangeMax;
        max -= rangeMin;
    }
    const x = number(input.targetX, "targetX");
    const targetHalf = number(input.targetSizeX, "targetSizeX") * 0.5;
    if (x >= min && x <= max)
        return true;
    const fromMin = min - x;
    const fromMax = x - max;
    return (fromMin >= 0 && fromMin < targetHalf) || (fromMax >= 0 && fromMax < targetHalf);
}
export interface NativeDamageEffectSnapshot {
    readonly stateName: string;
    readonly pendingStateName: string;
    readonly stateTime: number;
    readonly stateTimeBack: number;
    readonly animationTime: number;
    readonly animationTimeBack: number;
    readonly animationPlayCount: number;
    readonly firstFrame: boolean;
    readonly position: NativeDamageEffectPosition;
    readonly beforePosition: NativeDamageEffectPosition;
    readonly right: boolean;
    readonly speedX: number;
    readonly damageCount: number;
    readonly dead: boolean;
}
export interface NativeDamageEffectHit {
    readonly event: NativeStateEvent;
    readonly damageTemplateName: string;
    readonly target: NativeDamageEffectTarget;
    readonly clock: NativeDamageEffectSnapshot;
    readonly attackCount: number;
    readonly hitUnitListCount: number;
}
export interface NativeDamageEffectAttackInstance {
    readonly hit: Set<number>;
    count: number;
}
export type NativeDamageEffectCommand = {
    readonly kind: "main-effect";
    readonly effectName: string;
    readonly scaleFactor: number;
    readonly useZScale: boolean;
    readonly addRotate: number;
    readonly autoDie: false;
    readonly animationName: "";
    readonly reserveTime: 0;
    readonly clock: NativeDamageEffectSnapshot;
} | {
    readonly kind: "state-start";
    readonly animationName: string;
    readonly animationLoop: boolean;
    readonly animationSpeed: number;
    readonly clock: NativeDamageEffectSnapshot;
} | {
    readonly kind: "effect";
    readonly event: NativeStateEvent;
    readonly stateEnd: boolean;
    readonly clock: NativeDamageEffectSnapshot;
} | {
    readonly kind: "death-effect";
    readonly event: NativeStateEvent;
    readonly clock: NativeDamageEffectSnapshot;
} | {
    readonly kind: "sound";
    readonly death: boolean;
    readonly event: NativeStateEvent;
    readonly clock: NativeDamageEffectSnapshot;
} | {
    readonly kind: "death-child" | "child";
    readonly event: NativeStateEvent;
    readonly target: NativeDamageEffectTarget | null;
    readonly targetUid: number;
    readonly lastTargetPosition: NativeDamageEffectPosition;
    readonly clock: NativeDamageEffectSnapshot;
} | {
    readonly kind: "children";
    readonly stateEnd: boolean;
    readonly clock: NativeDamageEffectSnapshot;
} | {
    readonly kind: "hit";
    readonly hit: NativeDamageEffectHit;
    readonly reactionResult: number;
    readonly attackCountAfter: number;
} | {
    readonly kind: "die";
    readonly clock: NativeDamageEffectSnapshot;
};
export interface NativeDamageEffectContext {
    getMainEffectName: (definition: NativeDamageEffect) => string;
    /** NKCDamageEffect.ProcessEventEffect uses m_MasterUnit.GetUnitData().m_SkinID. */
    getMasterSkinId?: () => number;
    /** Original GetAnimTimeMax uses the template's UNSKINNED main name. */
    getAnimationDuration: (mainEffectName: string, animationName: string) => number;
    checkEventCondition: (event: NativeStateEvent, clock: NativeDamageEffectSnapshot) => boolean;
    /** Caller implements team/style/role/target-condition and current combat eligibility. */
    canHitTarget: (event: NativeStateEvent, target: NativeDamageEffectTarget, clock: NativeDamageEffectSnapshot) => boolean;
    damageReact: (hit: NativeDamageEffectHit) => number;
    /** Original default FindTargetData refinds every .1 seconds; viewer may return its fixed logical point. */
    findTarget: (clock: NativeDamageEffectSnapshot, current: NativeDamageEffectTarget | null) => NativeDamageEffectTarget | null;
    /** Original GetTargetUnit lookup precedes StateTimeUpdate and refreshes cached XYZ only on success. */
    getTargetByUid?: (uid: number) => NativeDamageEffectTarget | null;
    /** Original near-unit list, distinct from the assigned homing target. */
    getAttackTargets?: (clock: NativeDamageEffectSnapshot) => readonly NativeDamageEffectTarget[];
    isGamePlaying?: () => boolean;
    isTargetPlaying?: (target: NativeDamageEffectTarget) => boolean;
    /** The original map template's X bounds, required only for LandEdge. */
    getMapBounds?: () => {
        readonly minX: number;
        readonly maxX: number;
    };
}
/**
 * Source-backed DE state runner with original vector/gravity/tracking physics. Checked against
 * Assembly-CSharp.dll EEEDD00E...D45B, NKMDamageEffect.Update/StateUpdate/StateEvent,
 * ProcessEventAttack and NKMGame.CollisionCheck. Unsupported source physics/event
 * families throw before running. Combat reaction and target selection remain explicit.
 */
export class CharacterSpineDamageEffect {
    private readonly definition: NativeDamageEffect;
    private readonly spawn: NativeDamageEffectSpawn;
    private readonly context: NativeDamageEffectContext;
    private readonly hasChildEvents: boolean;
    private state!: NativeMotionState;
    private stateName = "";
    private nextState = "";
    private stateTime = 0;
    private stateBack = 0;
    private animTime = 0;
    private animBack = 0;
    private animCount = 0;
    private duration = 0;
    private first = true;
    private dead = false;
    private started = false;
    private readonly motion: NativeDamageMotionState;
    private get pos(): NativeDamageEffectPosition { return this.motion.position; }
    private set pos(value: NativeDamageEffectPosition) { this.motion.position = { ...value }; }
    private get before(): NativeDamageEffectPosition { return this.motion.beforePosition; }
    private set before(value: NativeDamageEffectPosition) { this.motion.beforePosition = { ...value }; }
    private get right(): boolean { return this.motion.right; }
    private set right(value: boolean) { this.motion.right = value; }
    private get speedX(): number { return this.motion.speedX; }
    private set speedX(value: number) { this.motion.speedX = value; }
    private damageCount = 0;
    private seeTargetRemaining = 0;
    private findTargetRemaining = 0;
    private target: NativeDamageEffectTarget | null;
    private targetUid: number;
    private lastTargetPosition: NativeDamageEffectPosition = { posX: 0, posZ: 0, jumpYPos: 0 };
    private readonly stamps = [new Map<number, boolean>(), new Map<number, boolean>()];
    private readonly attacks = new Map<number, NativeDamageEffectAttackInstance>();
    private readonly followTracks = { posX: new CharacterSpineTrackingFloat(), posZ: new CharacterSpineTrackingFloat(), jumpYPos: new CharacterSpineTrackingFloat() };
    private followRemaining = 0;
    private lastDelta = 0;
    constructor(definition: NativeDamageEffect, spawn: NativeDamageEffectSpawn, context: NativeDamageEffectContext) {
        this.definition = definition;
        this.spawn = spawn;
        this.context = context;
        this.hasChildEvents = Object.values(definition.statesByName).some(state => (state.events.m_listNKMEventDamageEffect?.length ?? 0) > 0);
        for (const key of ["getMainEffectName", "getAnimationDuration", "checkEventCondition", "canHitTarget", "damageReact", "findTarget"] as const) {
            if (typeof context?.[key] !== "function")
                throw new TypeError(`Missing native DE context: ${key}`);
        }
        if (definition.id !== spawn.damageEffectName)
            throw new Error("DE definition must match the exact requested name");
        const fields = definition.nativeFields;
        if (b(fields, "m_bUseTargetBuffScaleFactor"))
            unsupported("m_bUseTargetBuffScaleFactor");
        if (n(fields, "m_fTargetDistDie") !== 0)
            unsupported("m_fTargetDistDie");
        if (b(fields, "m_bLandEdge") && !context.getMapBounds)
            unsupported("LandEdge requires original map bounds");
        for (const key of Object.keys(definition.objectFieldLayers)) {
            if (key === "m_dicSkinEffect")
                continue; // Visual prefab selection is supplied by getMainEffectName.
            if (["m_listNKMDieEventAttack", "m_listNKMDieEventEffect", "m_listNKMDieEventDamageEffect", "m_listNKMDieEventSound"].includes(key) && definition.deathEvents?.[key])
                continue;
            if (/DieEvent|FindTarget|Skin/.test(key))
                unsupported(key);
        }
        for (const [key, events] of Object.entries(definition.deathEvents ?? {}))
            if (!["m_listNKMDieEventAttack", "m_listNKMDieEventEffect", "m_listNKMDieEventDamageEffect", "m_listNKMDieEventSound"].includes(key) && events.length)
                unsupported(key);
        for (const state of Object.values(definition.statesByName)) {
            for (const [list, entries] of Object.entries(state.events)) {
                if (entries.length && !["m_listNKMEventAttack", "m_listNKMEventSpeedX", "m_listNKMEventSpeedY", "m_listNKMEventDirSpeed",
                    "m_listNKMEventTargetDirSpeed", "m_listNKMEventEffect", "m_listNKMEventDamageEffect", "m_listNKMEventSound"].includes(list))
                    unsupported(list);
            }
            for (const key of ["m_TargetDistFarChangeStateDist", "m_TargetDistNearChangeStateDist"])
                if (n(state.nativeFields, key) !== 0)
                    unsupported(key);
        }
        const initial = position(spawn.position);
        const right = flag(spawn.right, "spawn.right");
        this.motion = { position: { ...initial }, beforePosition: { ...initial }, right,
            speedX: 0, speedY: 0, speedZ: 0, addRotate: number(spawn.addRotate, "spawn.addRotate"),
            speedFactorX: number(spawn.speedFactorX, "spawn.speedFactorX"), speedFactorY: number(spawn.speedFactorY, "spawn.speedFactorY"),
            direction: { x: right ? 1 : -1, y: 0, z: 0 }, magnitude: 0, eventDirSpeed: 0, footOnLand: false, lastTargetX: 0,
            targetDirSpeed: new CharacterSpineTrackingFloat(), directionTrackX: new CharacterSpineTrackingFloat(),
            directionTrackY: new CharacterSpineTrackingFloat(), moveTracks: this.followTracks };
        this.motion.directionTrackX.setNowValue(this.motion.direction.x);
        this.motion.targetDirSpeed.setNowValue(n(fields, "m_fTargetDirSpeed"));
        if (b(fields, "m_bLandConnect"))
            this.pos = { ...this.pos, jumpYPos: 0 };
        this.before = { ...this.pos };
        this.right = flag(spawn.right, "spawn.right");
        this.target = targetCopy(spawn.target);
        this.targetUid = number(spawn.targetUid ?? this.target?.uid ?? 0, "target UID");
        if (!Number.isInteger(this.targetUid) || this.targetUid < 0 || this.targetUid > 32767)
            throw new RangeError("Invalid original target UID");
        this.refreshTarget();
        this.motion.lastTargetX = this.lastTargetPosition.posX;
        makeNativeDamageEffectDirection(this.motion, b(fields, "m_bUseTargetDir"), this.motionTarget(), 0);
    }
    get clock(): NativeDamageEffectSnapshot {
        return { stateName: this.stateName, pendingStateName: this.nextState, stateTime: this.stateTime, stateTimeBack: this.stateBack,
            animationTime: this.animTime, animationTimeBack: this.animBack, animationPlayCount: this.animCount, firstFrame: this.first,
            position: { ...this.pos }, beforePosition: { ...this.before }, right: this.right, speedX: this.speedX, damageCount: this.damageCount, dead: this.dead };
    }
    get trackedByUnit(): boolean { return this.spawn.ownership?.tracked === true; }
    get stateEndStop(): boolean { return this.spawn.ownership?.stateEndStop === true; }
    /** NKMDamageEffectManager gates both Update and IsEnd/Close, even for dead DEs. */
    canManagerUpdate(worldStopped: boolean, masterStopped: boolean, hasMaster = true): boolean {
        return !worldStopped || (b(this.definition.nativeFields, "m_CanIgnoreStopTime") && hasMaster && !masterStopped);
    }
    private refreshTarget(): void {
        this.target = this.resolveStoredTarget();
    }
    private resolveStoredTarget(): NativeDamageEffectTarget | null {
        const target = this.targetUid > 0 ? targetCopy(this.context.getTargetByUid ? this.context.getTargetByUid(this.targetUid)
            : this.target?.uid === this.targetUid ? this.target : null) : null;
        if (target)
            this.lastTargetPosition = position(target);
        return target;
    }
    /** Original SetRight/SetFollowPos: called before this DE's manager update. */
    followUnit(master: NativeDamageEffectPosition, right: boolean): void {
        const follow = this.spawn.ownership;
        if (!follow?.tracked || follow.followType === 0 || this.dead)
            return;
        this.right = flag(right, "master facing");
        const base = position(master);
        const target = { posX: this.right ? add(base.posX, follow.offsetX) : sub(base.posX, follow.offsetX),
            posZ: add(base.posZ, follow.offsetZ), jumpYPos: add(base.jumpYPos, follow.offsetY) };
        if (follow.followTime === 0 || follow.followType === 1) {
            this.pos = b(this.definition.nativeFields, "m_bLandConnect") ? { ...target, jumpYPos: 0 } : target;
            this.before = { ...this.pos };
            return;
        }
        // SetFollowPos decrements with the previous DE update's delta, not the actor's new delta.
        this.followRemaining = sub(this.followRemaining, this.lastDelta);
        if (this.followRemaining > 0)
            return;
        for (const key of ["posX", "jumpYPos", "posZ"] as const) {
            const track = this.followTracks[key];
            if (!track.tracking || track.targetValue !== target[key])
                track.setTracking(target[key], follow.followTime, follow.followType);
        }
        this.followRemaining = follow.followResetTime;
    }
    /** StateChangeByUnitState(name,true) reserves a state for the next DE update. */
    changeStateByUnit(stateName: string): void {
        if (!this.definition.statesByName[stateName])
            throw new Error(`Missing exact DE state ${stateName}`);
        this.nextState = stateName;
    }
    /** SetDie(false,true). The original marks death AFTER all four event phases. */
    endByUnit(): NativeDamageEffectCommand[] {
        return this.setDie(true);
    }
    setDie(processDeathEvents: boolean): NativeDamageEffectCommand[] {
        if (this.dead)
            return [];
        flag(processDeathEvents, "processDeathEvents");
        const commands: NativeDamageEffectCommand[] = [];
        if (processDeathEvents)
            for (const event of this.definition.deathEvents?.m_listNKMDieEventAttack ?? []) {
                if (!this.allowed(event))
                    continue;
                // ProcessDieEventAttack calls GetDamageInstAtk(-1).Init() for EACH row.
                const instance: NativeDamageEffectAttackInstance = { hit: new Set(), count: 0 };
                this.attacks.set(-1, instance);
                commands.push(...this.damageCheck(event, instance, true));
            }
        if (processDeathEvents)
            for (const event of this.definition.deathEvents?.m_listNKMDieEventEffect ?? [])
                commands.push({ kind: "death-effect", event, clock: this.clock });
        if (processDeathEvents)
            for (const event of this.definition.deathEvents?.m_listNKMDieEventDamageEffect ?? [])
                if (this.allowed(event))
                    commands.push({ kind: "death-child", event, target: targetCopy(this.target),
                        targetUid: this.targetUid, lastTargetPosition: { ...this.lastTargetPosition }, clock: this.clock });
        if (processDeathEvents)
            for (const event of this.definition.deathEvents?.m_listNKMDieEventSound ?? [])
                commands.push({ kind: "sound", death: true, event, clock: this.clock });
        this.dead = true;
        commands.push({ kind: "die", clock: this.clock });
        return commands;
    }
    /** UseDamageEffect: main prefab creation then immediate DES_BASE StateStart; no StateUpdate yet. */
    start(): NativeDamageEffectCommand[] {
        if (this.started)
            throw new Error("DE already started");
        this.started = true;
        const commands: NativeDamageEffectCommand[] = [{ kind: "main-effect", effectName: text(this.context.getMainEffectName(this.definition), "main effect name"),
                scaleFactor: n(this.definition.nativeFields, "m_fScaleFactor", 1), useZScale: this.spawn.useZScale, addRotate: this.spawn.addRotate,
                autoDie: false, animationName: "", reserveTime: 0, clock: this.clock }];
        this.enterState("DES_BASE", commands);
        return commands;
    }
    /** Exactly one manager update. The first frame uses delta for movement but skips clock advance. */
    advance(delta: number, frame: {
        readonly worldStopped: boolean;
        readonly masterStopped: boolean;
        readonly masterAnimationSpeed: number | null;
    }): NativeDamageEffectCommand[] {
        const dt = number(delta, "delta");
        if (dt < 0)
            throw new RangeError("delta must be nonnegative");
        flag(frame.worldStopped, "worldStopped");
        flag(frame.masterStopped, "masterStopped");
        if (frame.masterAnimationSpeed !== null)
            number(frame.masterAnimationSpeed, "masterAnimationSpeed");
        if (!this.started)
            throw new Error("Call start before DE advance");
        if (this.dead || !this.canManagerUpdate(frame.worldStopped, frame.masterStopped))
            return [];
        this.lastDelta = dt;
        this.refreshTarget();
        const commands: NativeDamageEffectCommand[] = [];
        if (!this.first) {
            this.stateBack = this.stateTime;
            this.stateTime = add(this.stateTime, dt);
            if (this.animTime >= this.duration) {
                if (b(this.state.nativeFields, "m_bAnimLoop")) {
                    this.animTime = this.animBack = 0;
                    this.stamps[1].clear();
                }
                this.animCount = add(this.animCount, 1); // Source increments every end frame even for non-loop clips.
            }
            this.animBack = this.animTime;
            const speed = b(this.definition.nativeFields, "m_UseMasterAnimSpeed") && frame.masterAnimationSpeed !== null
                ? number(frame.masterAnimationSpeed, "masterAnimationSpeed") : n(this.state.nativeFields, "m_fAnimSpeed", 1);
            this.animTime = add(this.animTime, mul(dt, speed));
        }
        if (this.nextState.length > 1) {
            this.processSpeed(true);
            this.processSounds(true, commands);
            this.processEffects(true, commands);
            this.processChildren(true, commands);
            const name = this.nextState;
            this.nextState = "";
            this.enterState(name, commands);
        }
        this.seeTargetRemaining = sub(this.seeTargetRemaining, dt);
        if (this.seeTargetRemaining <= 0) {
            this.seeTargetRemaining = n(this.definition.nativeFields, "m_fSeeTargetTime", 0.5);
            this.seeTarget();
        }
        // ProcessTarget IL0000..007D: nonpositive intervals disable the timer;
        // reset discards overshoot and TargetNoChange retains a nonzero target UID.
        const findInterval = n(this.definition.nativeFields, "m_fFindTargetTime", 0.1);
        if (findInterval > 0) {
            this.findTargetRemaining = sub(this.findTargetRemaining, dt);
            if (this.findTargetRemaining <= 0) {
                this.findTargetRemaining = findInterval;
                if (!this.targetUid || !b(this.definition.nativeFields, "m_bTargetNoChange")) {
                    this.target = targetCopy(this.context.findTarget(this.clock, this.target));
                    if (this.target)
                        this.targetUid = this.target.uid;
                }
            }
        }
        this.processTargetDirSpeed(dt);
        this.processSpeed(false);
        this.processAttacks(commands);
        this.processSounds(false, commands);
        this.processEffects(false, commands);
        this.processChildren(false, commands);
        this.physics(dt);
        for (const stamps of this.stamps)
            for (const time of stamps.keys())
                stamps.set(time, true);
        this.processStateEvent();
        this.dieCheck(commands);
        this.first = false;
        return commands;
    }
    private enterState(name: string, commands: NativeDamageEffectCommand[]): void {
        const state = this.definition.statesByName[name];
        if (!state)
            throw new Error(`Missing exact DE state ${name}`);
        const anim = s(state.nativeFields, "m_AnimName");
        const duration = number(this.context.getAnimationDuration(s(this.definition.nativeFields, "m_MainEffectName"), anim), "source animation duration");
        if (near(duration) || duration < 0)
            throw new Error(`Native DE NoExistAnim: ${this.definition.id}/${anim}`);
        this.state = state;
        this.stateName = name;
        this.first = true;
        this.duration = duration;
        this.stateTime = this.stateBack = this.animTime = this.animBack = this.animCount = 0;
        this.stamps.forEach((stamp) => stamp.clear());
        this.seeTarget();
        commands.push({ kind: "state-start", animationName: anim, animationLoop: b(state.nativeFields, "m_bAnimLoop"), animationSpeed: n(state.nativeFields, "m_fAnimSpeed", 1), clock: this.clock });
    }
    private seeTarget(): void {
        if (!this.target)
            return;
        const old = this.right;
        if (b(this.definition.nativeFields, "m_bSeeTarget", true))
            this.right = this.pos.posX < this.target.posX;
        if (old !== this.right && b(this.definition.nativeFields, "m_bSeeTargetSpeed", true))
            this.speedX = f(-this.speedX);
    }
    private timer(animation: boolean, time: number, oneTime = true): boolean {
        const back = animation ? this.animBack : this.stateBack;
        const now = animation ? this.animTime : this.stateTime;
        return nativeSoundEventTimer(time, back, now, this.first, oneTime, this.stamps[animation ? 1 : 0]);
    }
    private processSounds(end: boolean, commands: NativeDamageEffectCommand[]): void {
        processNativeSoundEvents(this.state.events.m_listNKMEventSound ?? [], {
            stateEnd: end, animationLoop: b(this.state.nativeFields, "m_bAnimLoop"),
            getSkinId: () => {
                if (!this.context.getMasterSkinId)
                    unsupported("sound requires original master skin ID");
                return this.context.getMasterSkinId();
            }, checkCondition: event => this.allowed(event),
            eventTimer: (event, oneTime) => this.timer(b(event.nativeFields, "m_bAnimTime", true), n(event.nativeFields, "m_fEventTime"), oneTime),
        }, event => commands.push({ kind: "sound", death: false, event, clock: this.clock }));
    }
    private window(fields: Fields): boolean {
        const animation = b(fields, "m_bAnimTime", true);
        const min = n(fields, "m_fEventTimeMin");
        const max = n(fields, "m_fEventTimeMax");
        const now = animation ? this.animTime : this.stateTime;
        return (now >= min && now <= max) || this.timer(animation, min);
    }
    private allowed(event: NativeStateEvent): boolean { return flag(this.context.checkEventCondition(event, this.clock), "event condition result"); }
    private processSpeed(end: boolean): void {
        this.processAxisSpeed("m_listNKMEventDirSpeed", "eventDirSpeed", end);
        this.processAxisSpeed("m_listNKMEventSpeedX", "speedX", end);
        this.processAxisSpeed("m_listNKMEventSpeedY", "speedY", end);
    }
    private processTargetDirSpeed(dt: number): void {
        if (!this.state || b(this.state.nativeFields, "m_bNoMove") || b(this.definition.nativeFields, "m_bNoMove"))
            return;
        this.motion.targetDirSpeed.update(dt);
        // This source event has no Condition field; it uses the shared one-time timer.
        for (const event of this.state.events.m_listNKMEventTargetDirSpeed ?? []) {
            const fields = event.nativeFields;
            if (this.timer(b(fields, "m_bAnimTime", true), n(fields, "m_fEventTime")))
                this.motion.targetDirSpeed.setTracking(n(fields, "m_fTargetDirSpeed"), n(fields, "m_fChangeTime"), 1);
        }
    }
    private processAxisSpeed(list: "m_listNKMEventDirSpeed" | "m_listNKMEventSpeedX" | "m_listNKMEventSpeedY", key: "eventDirSpeed" | "speedX" | "speedY", end: boolean): void {
        if (!this.state || b(this.state.nativeFields, "m_bNoMove") || b(this.definition.nativeFields, "m_bNoMove"))
            return;
        const speedField = key === "speedX" ? "m_SpeedX" : key === "speedY" ? "m_SpeedY" : "m_fDirSpeed";
        for (const event of this.state.events[list] ?? []) {
            if (!this.allowed(event))
                continue;
            const fields = event.nativeFields;
            if (!(b(fields, "m_bStateEndTime") && end) && !(this.window(fields) && !b(fields, "m_bStateEndTime")))
                continue;
            const current = this.motion[key];
            const speed = nativeDamageEffectEventSpeed(fields, speedField, b(fields, "m_bAnimTime", true) ? this.animTime : this.stateTime, current);
            this.motion[key] = key === "eventDirSpeed" ? speed : b(fields, "m_bAdd") ? add(current, speed) : b(fields, "m_bMultiply") ? mul(current, speed) : speed;
        }
    }
    private processAttacks(commands: NativeDamageEffectCommand[]): void {
        if (this.damageCount >= n(this.definition.nativeFields, "m_DamageCountMax"))
            return;
        for (const [index, event] of (this.state.events.m_listNKMEventAttack ?? []).entries()) {
            if (!this.allowed(event))
                continue;
            const fields = event.nativeFields;
            const animation = b(fields, "m_bAnimTime", true);
            const min = n(fields, "m_fEventTimeMin");
            if (this.timer(animation, min))
                this.attacks.set(index, { hit: new Set(), count: 0 });
            let active = this.window(fields);
            if (near(min, n(fields, "m_fEventTimeMax")) && this.timer(animation, min))
                active = true;
            if (!active)
                continue;
            const inst = this.attacks.get(index) ?? { hit: new Set<number>(), count: 0 };
            this.attacks.set(index, inst);
            const hits = this.damageCheck(event, inst);
            commands.push(...hits);
            if (hits.length && s(fields, "m_EffectName").length > 1)
                unsupported("DE ProcessAttackHitEffect");
        }
    }
    /** DamageCheck/EffectToUnit selection. The death caller bypasses only the DE hit limit.
     * DamageReact and combat eligibility are provided by the explicit viewer context. */
    damageCheck(event: NativeStateEvent, inst: NativeDamageEffectAttackInstance, ignoreDamageLimit = false): NativeDamageEffectCommand[] {
        const commands: NativeDamageEffectCommand[] = [];
        if (this.dead || this.context.isGamePlaying?.() === false)
            return commands;
        const fields = event.nativeFields;
        const count = n(fields, "m_AttackUnitCount", 1);
        const tryHit = (candidate: NativeDamageEffectTarget) => {
            const target = targetCopy(candidate)!;
            if (this.dead || inst.hit.has(target.uid) || this.context.isTargetPlaying?.(target) === false)
                return;
            if (!target.isBossOrShip && ((target.isAirUnit && !b(fields, "m_bHitAir", true)) || (!target.isAirUnit && !b(fields, "m_bHitLand", true))))
                return;
            if (!flag(this.context.canHitTarget(event, target, this.clock), "target eligibility result"))
                return;
            if (!nativeDamageEffectCollision({ beforeX: this.before.posX, nowX: this.pos.posX, effectSize: n(this.definition.nativeFields, "m_fEffectSize"), right: this.right,
                rangeMin: n(fields, "m_fRangeMin", 100), rangeMax: n(fields, "m_fRangeMax", 100), targetX: target.posX, targetSizeX: target.unitSizeX }))
                return;
            const hit: NativeDamageEffectHit = { event, damageTemplateName: s(fields, "m_DamageTempletName"), target: { ...target }, clock: this.clock, attackCount: inst.count, hitUnitListCount: inst.hit.size };
            const reaction = number(this.context.damageReact(hit), "reaction result");
            if (reaction === 4)
                unsupported("NRT_REVENGE master state/stop reaction");
            if (reaction === 2)
                return;
            inst.hit.add(target.uid);
            inst.count += 1 + Math.trunc(add(target.statType66, f(0.1)));
            this.damageCount += 1 + Math.max(0, target.penetrateDefence);
            commands.push({ kind: "hit", hit, reactionResult: reaction, attackCountAfter: inst.count });
        };
        const selected = this.resolveStoredTarget();
        if (count === 1 && b(fields, "m_AttackTargetUnit", true) && selected && this.context.isTargetPlaying?.(selected) !== false) {
            tryHit(selected);
            return commands;
        }
        if (b(fields, "m_AttackTargetUnit", true)) {
            const current = this.resolveStoredTarget();
            if (current)
                tryHit(current);
        }
        const limited = () => !ignoreDamageLimit && this.damageCount >= n(this.definition.nativeFields, "m_DamageCountMax");
        if (limited())
            return commands;
        const candidates = this.context.getAttackTargets?.(this.clock) ?? (selected ? [selected] : []);
        for (const target of candidates) {
            if (this.dead || limited() || (count === 1 && inst.count >= 1) || (b(fields, "m_AttackUnitCountOnly") && inst.count >= count))
                break;
            tryHit(target);
        }
        return commands;
    }
    private processEffects(end: boolean, commands: NativeDamageEffectCommand[]): void {
        for (const event of this.state.events.m_listNKMEventEffect ?? []) {
            if (!this.allowed(event))
                continue;
            const fields = event.nativeFields;
            const atEnd = b(fields, "m_bStateEndTime");
            const skin = n(fields, "m_SkinID", -1);
            if (skin >= 0) {
                if (!this.context.getMasterSkinId)
                    unsupported("effect requires original master skin ID");
                const masterSkin = number(this.context.getMasterSkinId(), "master skin ID");
                if (!Number.isInteger(masterSkin))
                    throw new Error("Master skin ID must be an integer");
                if (skin !== masterSkin)
                    continue;
            }
            const active = atEnd && end ? true : this.timer(b(fields, "m_bAnimTime", true), n(fields, "m_fEventTime")) && !atEnd;
            if (active)
                commands.push({ kind: "effect", event, stateEnd: end, clock: this.clock });
        }
    }
    private processChildren(end: boolean, commands: NativeDamageEffectCommand[]): void {
        if (!this.hasChildEvents)
            return;
        commands.push({ kind: "children", stateEnd: end, clock: this.clock });
        for (const event of this.state.events.m_listNKMEventDamageEffect ?? []) {
            if (!this.allowed(event))
                continue;
            const fields = event.nativeFields;
            const atEnd = b(fields, "m_bStateEndTime");
            const active = atEnd && end ? true : this.timer(b(fields, "m_bAnimTime", true), n(fields, "m_fEventTime")) && !atEnd;
            if (active && (!b(fields, "m_bIgnoreNoTarget") || this.target))
                commands.push({ kind: "child", event,
                    target: targetCopy(this.target), targetUid: this.targetUid, lastTargetPosition: { ...this.lastTargetPosition }, clock: this.clock });
        }
    }
    private physics(dt: number): void {
        const fields = this.definition.nativeFields;
        const template: NativeDamageMotionTemplate = { useTargetDir: b(fields, "m_bUseTargetDir"), noMove: b(fields, "m_bNoMove"),
            landConnect: b(fields, "m_bLandConnect"), landStruck: b(fields, "m_bLandStruck"), reloadAccel: n(fields, "m_fReloadAccel"),
            gAccel: n(fields, "m_fGAccel"), maxGSpeed: n(fields, "m_fMaxGSpeed", -3000) };
        this.motion.lastTargetX = this.lastTargetPosition.posX;
        advanceNativeDamageEffectPhysics(this.motion, template, b(this.state.nativeFields, "m_bNoMove"), this.motionTarget(), dt);
        let map = null;
        if (b(fields, "m_bLandEdge")) {
            const source = this.context.getMapBounds!();
            map = { minX: number(source.minX, "map.minX"), maxX: number(source.maxX, "map.maxX") };
        }
        constrainNativeDamageEffectPosition(this.motion, b(fields, "m_bLandBind"), map);
    }
    private motionTarget(): NativeDamageMotionTarget | null {
        if (!b(this.definition.nativeFields, "m_bUseTargetDir") || !this.target)
            return null;
        if (this.target.unitSizeY === undefined || this.target.isDyingOrDie === undefined)
            unsupported("UseTargetDir requires target height and dying state");
        return { ...position(this.target), unitSizeY: this.target.unitSizeY, dying: this.target.isDyingOrDie };
    }
    private processStateEvent(): void {
        const fields = this.state.nativeFields;
        const time = n(fields, "m_StateTimeChangeStateTime", -1);
        if (time >= 0 && this.stateTime >= time)
            this.nextState = s(fields, "m_StateTimeChangeState");
        else if (s(fields, "m_AnimEndChangeState").length > 1 && this.animTime >= this.duration)
            this.nextState = s(fields, "m_AnimEndChangeState");
        else if (s(fields, "m_FootOnLandChangeState").length > 1 && this.motion.footOnLand)
            this.nextState = s(fields, "m_FootOnLandChangeState");
        else if (n(fields, "m_DamageCountChangeStateCount") > 0 && this.damageCount >= n(fields, "m_DamageCountChangeStateCount"))
            this.nextState = s(fields, "m_DamageCountChangeState");
        if (this.nextState.length > 1 && !this.definition.statesByName[this.nextState])
            throw new Error(`Missing requested DE state ${this.nextState}`);
    }
    private dieCheck(commands: NativeDamageEffectCommand[]): void {
        const fields = this.state.nativeFields;
        const type = fields.m_NKM_LIFE_TIME_TYPE ?? "NLTT_TIME";
        if (!["NLTT_INFINITY", "NLTT_TIME", "NLTT_ANIM_COUNT", 0, 1, 2].includes(type as string | number))
            unsupported(`life type ${String(type)}`);
        const timed = (type === "NLTT_TIME" || type === 1) && this.stateTime >= n(fields, "m_LifeTime");
        const counted = (type === "NLTT_ANIM_COUNT" || type === 2) && this.animCount >= n(fields, "m_LifeTimeAnimCount");
        const maxHits = b(this.definition.nativeFields, "m_bDamageCountMaxDie") && this.damageCount >= n(this.definition.nativeFields, "m_DamageCountMax");
        if (timed || counted || maxHits)
            commands.push(...this.setDie(true));
    }
}
