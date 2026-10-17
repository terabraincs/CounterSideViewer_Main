import type { CharacterSpineRuntimeEvent } from './characterSpineEffectData';
export type NativeEffectVector = readonly [
    number,
    number,
    number
];
export interface NativeEffectRootTransform {
    readonly kind: 'game-object';
    readonly localPosition: NativeEffectVector;
    /** Unity localEulerAngles, not a quaternion or a reflected scale. */
    readonly localEulerAngles: NativeEffectVector;
    readonly localScale: NativeEffectVector;
}
export interface NativeEffectBone {
    /** Unit: SkeletonAnimation.TransformPoint(WorldX, WorldY, 0); DE: GetTransform.position. */
    readonly position: NativeEffectVector;
    /** Required only when a tracked effect follows a rotating bone. */
    readonly worldEulerAngles?: NativeEffectVector;
}
export interface NativeEffectActor {
    /** Unit: m_ObjPosX/Z.GetNowValue(); DE: m_DEData.m_PosX/Z. */
    readonly posX: number;
    readonly posZ: number;
    readonly jumpYPos: number;
    readonly right: boolean;
}
export type NativeEffectOwner = {
    readonly variant: 'unit';
    readonly actor: NativeEffectActor;
    readonly skinId: number | null;
    readonly boneGetter: (name: string) => NativeEffectBone | null;
} | {
    readonly variant: 'damage-effect';
    readonly actor: NativeEffectActor;
    /** NKMDamageEffectData.GetMasterSkinID(), not the target's skin. */
    readonly skinId: number | null;
    readonly hasMainEffect: boolean;
    readonly boneGetter: (name: string) => NativeEffectBone | null;
    readonly damageTemplate: {
        readonly useMasterAnimSpeed: boolean;
        readonly canIgnoreStopTime: boolean;
    };
};
export interface NativeEffectSpawnPlan {
    readonly variant: NativeEffectOwner['variant'];
    readonly effectName: string;
    readonly parentType: number;
    readonly basePosition: NativeEffectVector;
    /** Already includes UseEffect's offsetZ-to-Y conversion. */
    readonly offset: NativeEffectVector;
    readonly right: boolean;
    readonly scaleFactor: number;
    readonly addRotate: number;
    readonly useZScale: boolean;
    readonly boneName: string;
    readonly useBoneRotate: boolean;
    readonly cutIn: boolean;
    readonly stopExistingCutIn: boolean;
    readonly tracked: boolean;
    readonly stateEndStop: boolean;
    readonly stateEndStopForce: boolean;
    readonly reserveTime: number;
    readonly animationName: string;
    readonly animationSpeed: number;
    readonly useMasterAnimSpeed: boolean;
    readonly applyStopTime: boolean;
    readonly canIgnoreStopTime: boolean;
    readonly autoDie: true;
    readonly reserveDieTime: -1;
}
export interface NativeEffectTransformWrites {
    readonly right: boolean;
    readonly localPosition?: NativeEffectVector;
    readonly localEulerAngles?: NativeEffectVector;
    /** Unit uses SkeletonAnimation.worldEuler + Bone.WorldRotationX on Z; DE uses transform.eulerAngles. */
    readonly worldEulerAngles?: NativeEffectVector;
}
const f = Math.fround;
const add = (a: number, b: number) => f(a + b);
const sub = (a: number, b: number) => f(a - b);
const mul = (a: number, b: number) => f(a * b);
function number(value: unknown, label: string): number {
    if (typeof value !== 'number' || !Number.isFinite(f(value)))
        throw new TypeError(`${label} requires a finite float32`);
    return f(value);
}
function flag(value: unknown, label: string): boolean {
    if (typeof value !== 'boolean')
        throw new TypeError(`${label} requires an explicit boolean`);
    return value;
}
function text(value: unknown, label: string): string {
    if (typeof value !== 'string')
        throw new TypeError(`${label} requires a string`);
    return value;
}
function vector(value: NativeEffectVector, label: string): NativeEffectVector {
    if (!Array.isArray(value) || value.length !== 3)
        throw new TypeError(`${label} requires a Vector3`);
    return value.map((part, i) => number(part, `${label}[${i}]`)) as unknown as NativeEffectVector;
}
function root(value: NativeEffectRootTransform): void {
    if (value.kind !== 'game-object')
        throw new Error('Unimplemented native effect RectTransform placement');
    vector(value.localPosition, 'localPosition');
    vector(value.localEulerAngles, 'localEulerAngles');
    vector(value.localScale, 'localScale');
}
const parentTypes = ['NEPT_NUM_GAME_BATTLE_EFFECT', 'NEPT_NUF_BEFORE_HUD_EFFECT', 'NEPT_NUF_BEFORE_HUD_CONTROL_EFFECT', 'NEPT_NUF_AFTER_HUD_EFFECT', 'NEPT_NUF_AFTER_UI_EFFECT'];
const eventFields = new Set([
    'm_SkinID', 'm_EffectName', 'm_ParentType', 'm_fScaleFactor', 'm_bUseTriggerTargetRange', 'm_bForceRight', 'm_bFixedPos',
    'm_OffsetX', 'm_OffsetY', 'm_OffsetZ', 'm_bUseOffsetZtoY', 'm_fAddRotate', 'm_bUseZScale', 'm_bLandConnect',
    'm_BoneName', 'm_bUseBoneRotate', 'm_AnimName', 'm_fReserveTime', 'm_bStateEndStop', 'm_bStateEndStopForce',
    'm_bHold', 'm_bCutIn', 'm_UseMasterAnimSpeed', 'm_ApplyStopTime', 'm_fAnimSpeed', 'm_dicSkinEffectName',
    // These are evaluated by the caller's event scheduler/condition evaluator, before ApplyEventEffect.
    'm_Condition', 'm_bAnimTime', 'm_bStateEndTime', 'm_fEventTime',
    // Present in original Yoo Mi Na RA DE effect Lua, but neither NKMEventEffect
    // nor NKMUnitStateEventOneTime.LoadFromLUA reads this key. It has no effect.
    'm_fEventTimeMin',
]);
/** NKMEventEffect.LoadFromLUA replaces the whole skin dictionary on each present table. */
export function getNativeEffectName(event: CharacterSpineRuntimeEvent, skinId: number | null): string {
    let dictionary: unknown;
    for (const layer of event.sourceLayers)
        if (Object.hasOwn(layer.fields, 'm_dicSkinEffectName'))
            dictionary = layer.fields.m_dicSkinEffectName;
    if (dictionary === undefined)
        dictionary = event.nativeFields.m_dicSkinEffectName;
    const base = text(event.nativeFields.m_EffectName ?? '', 'm_EffectName');
    if (skinId === null || dictionary === undefined || dictionary === null)
        return base;
    if (!Number.isInteger(skinId))
        throw new TypeError('skinId requires an Int32 or null');
    if (!Array.isArray(dictionary))
        throw new Error('Unsupported native skin-effect table encoding');
    const names = new Map<number, string>();
    for (const row of dictionary) {
        if (!Array.isArray(row) || !Number.isInteger(row[0]) || typeof row[1] !== 'string')
            throw new Error('Invalid native skin-effect dictionary row');
        if (names.has(row[0]))
            throw new Error(`Native Dictionary.Add duplicate skinId ${row[0]}`);
        names.set(row[0], row[1]);
    }
    return names.has(skinId) ? names.get(skinId)! : base;
}
function actorPosition(actor: NativeEffectActor, land = false): NativeEffectVector {
    const x = number(actor.posX, 'actor.posX'), z = number(actor.posZ, 'actor.posZ');
    return [x, land ? z : add(z, number(actor.jumpYPos, 'actor.jumpYPos')), z];
}
function getBone(owner: NativeEffectOwner, name: string): NativeEffectBone | null {
    if (name.length <= 1 || (owner.variant === 'damage-effect' && !flag(owner.hasMainEffect, 'hasMainEffect')))
        return null;
    const bone = owner.boneGetter(name);
    // Unit's missing-bone branch reuses a shared scratch Vector3, not the actor's position.
    // DE dereferences the missing Transform. Neither is a justified position fallback.
    if (!bone)
        throw new Error(`Native ${owner.variant} bone ${name} is missing (no position fallback)`);
    vector(bone.position, 'bone.position');
    return bone;
}
/** ApplyEventEffect only: the caller must have accepted condition, IsRightSkin and event timing. */
export function resolveNativeEffectSpawn(event: CharacterSpineRuntimeEvent, owner: NativeEffectOwner): NativeEffectSpawnPlan {
    if (!['unit', 'damage-effect'].includes(owner.variant))
        throw new Error('Unknown native effect owner');
    for (const fields of [event.nativeFields, ...event.sourceLayers.map(layer => layer.fields)])
        for (const key of Object.keys(fields))
            if (!eventFields.has(key))
                throw new Error(`Unknown native NKMEventEffect field ${key}`);
    const fields = event.nativeFields;
    // Absent values below are CLI zero-initialization or explicit NKMEventEffect::.ctor assignments.
    const n = (key: string, initial = 0) => number(fields[key] ?? initial, key);
    const b = (key: string, initial = false) => flag(fields[key] ?? initial, key);
    const s = (key: string) => text(fields[key] ?? '', key);
    let offset: NativeEffectVector = [n('m_OffsetX'), n('m_OffsetY'), n('m_OffsetZ')];
    const boneName = s('m_BoneName');
    let basePosition: NativeEffectVector;
    if (b('m_bFixedPos')) {
        basePosition = offset;
        offset = [0, 0, 0];
    }
    else
        basePosition = getBone(owner, boneName)?.position ?? actorPosition(owner.actor, b('m_bLandConnect'));
    if (b('m_bUseOffsetZtoY'))
        offset = [offset[0], add(offset[1], offset[2]), offset[2]];
    const parent = fields.m_ParentType ?? 0;
    const parentType = typeof parent === 'string' ? parentTypes.indexOf(parent) : parent;
    if (typeof parentType !== 'number' || !Number.isInteger(parentType) || parentType < 0 || parentType > 4)
        throw new Error(`Unsupported effect parent ${parent}`);
    const cutIn = b('m_bCutIn');
    const stateEndStop = b('m_bStateEndStop');
    return {
        variant: owner.variant, effectName: getNativeEffectName(event, owner.skinId), parentType,
        basePosition: vector(basePosition, 'basePosition'), offset,
        right: b('m_bForceRight') || flag(owner.actor.right, 'actor.right'),
        scaleFactor: n('m_fScaleFactor', 1), addRotate: n('m_fAddRotate'), useZScale: !cutIn && b('m_bUseZScale', true),
        boneName, useBoneRotate: b('m_bUseBoneRotate'), cutIn, stopExistingCutIn: cutIn && owner.variant === 'unit',
        tracked: b('m_bHold') || stateEndStop, stateEndStop, stateEndStopForce: b('m_bStateEndStopForce'),
        reserveTime: n('m_fReserveTime'), animationName: s('m_AnimName'), animationSpeed: n('m_fAnimSpeed', 1),
        useMasterAnimSpeed: owner.variant === 'unit' ? b('m_UseMasterAnimSpeed') : flag(owner.damageTemplate.useMasterAnimSpeed, 'damageTemplate.useMasterAnimSpeed'),
        canIgnoreStopTime: owner.variant === 'damage-effect' && flag(owner.damageTemplate.canIgnoreStopTime, 'damageTemplate.canIgnoreStopTime'),
        applyStopTime: b('m_ApplyStopTime', true), autoDie: true, reserveDieTime: -1,
    };
}
/** NKCDamageEffect.ProcessDieEventEffect calls UseEffect directly. It does not
 * check the event condition, skin selector or timer; GetEffectName still uses
 * the master's skin dictionary. FixedPos/ForceRight/Hold/AnimSpeed/ApplyStopTime
 * are not read by this caller. Children are not put in the DE's tracked list. */
export function resolveNativeDeathEffectSpawn(event: CharacterSpineRuntimeEvent, owner: Extract<NativeEffectOwner, {
    variant: 'damage-effect';
}>): NativeEffectSpawnPlan {
    const fields = event.nativeFields;
    const n = (key: string, initial = 0) => number(fields[key] ?? initial, key);
    const b = (key: string, initial = false) => flag(fields[key] ?? initial, key);
    const s = (key: string) => text(fields[key] ?? '', key);
    const boneName = s('m_BoneName');
    const basePosition = getBone(owner, boneName)?.position ?? actorPosition(owner.actor, b('m_bLandConnect'));
    const z = n('m_OffsetZ');
    const offset: NativeEffectVector = [n('m_OffsetX'), b('m_bUseOffsetZtoY') ? add(n('m_OffsetY'), z) : n('m_OffsetY'), z];
    const parent = fields.m_ParentType ?? 0;
    const parentType = typeof parent === 'string' ? parentTypes.indexOf(parent) : parent;
    if (typeof parentType !== 'number' || !Number.isInteger(parentType) || parentType < 0 || parentType > 4)
        throw new Error(`Unsupported effect parent ${parent}`);
    const cutIn = b('m_bCutIn');
    return { variant: 'damage-effect', effectName: getNativeEffectName(event, owner.skinId), parentType,
        basePosition: vector(basePosition, 'basePosition'), offset, right: flag(owner.actor.right, 'actor.right'),
        scaleFactor: n('m_fScaleFactor', 1), addRotate: n('m_fAddRotate'), useZScale: !cutIn && b('m_bUseZScale', true),
        boneName, useBoneRotate: b('m_bUseBoneRotate'), cutIn, stopExistingCutIn: false,
        tracked: false, stateEndStop: false, stateEndStopForce: false,
        reserveTime: n('m_fReserveTime'), animationName: s('m_AnimName'), animationSpeed: 1,
        useMasterAnimSpeed: flag(owner.damageTemplate.useMasterAnimSpeed, 'damageTemplate.useMasterAnimSpeed'),
        canIgnoreStopTime: flag(owner.damageTemplate.canIgnoreStopTime, 'damageTemplate.canIgnoreStopTime'),
        applyStopTime: true, autoDie: true, reserveDieTime: -1 };
}
function setPosition(plan: NativeEffectSpawnPlan, base: NativeEffectVector, right: boolean): NativeEffectVector {
    const offsetX = right || plan.useBoneRotate ? plan.offset[0] : -plan.offset[0];
    return [add(base[0], offsetX), add(base[1], plan.offset[1]), add(base[2], plan.offset[2])];
}
function setRight(plan: NativeEffectSpawnPlan, current: NativeEffectRootTransform, original: NativeEffectRootTransform, right: boolean): NativeEffectVector | undefined {
    if (plan.useBoneRotate)
        return undefined;
    return [current.localEulerAngles[0], add(original.localEulerAngles[1], right ? 0 : 180), current.localEulerAngles[2]];
}
/**
 * EffectStart writes AFTER SetActive(true). Caller must activate the prefab first,
 * then apply SetRight, SetParent(parentType,false), these local writes, and PlayAnim.
 * No scale write occurs here: NKCASEffect.Update applies scale separately.
 */
export function startNativeEffectSpawn(plan: NativeEffectSpawnPlan, current: NativeEffectRootTransform, original: NativeEffectRootTransform): NativeEffectTransformWrites {
    root(current);
    root(original);
    let localEulerAngles = setRight(plan, current, original, plan.right);
    if (!plan.cutIn && plan.addRotate !== -1)
        localEulerAngles = [0, (localEulerAngles ?? current.localEulerAngles)[1], plan.addRotate];
    const skipPosition = plan.cutIn || plan.basePosition.every(value => value === -1);
    return { right: plan.right, ...(localEulerAngles ? { localEulerAngles } : {}),
        ...(!skipPosition ? { localPosition: setPosition(plan, plan.basePosition, plan.right) } : {}) };
}
/** ProcessEventEffect(false), for an already-live tracked effect, BEFORE new events. */
export function followNativeEffectSpawn(plan: NativeEffectSpawnPlan, current: NativeEffectRootTransform, original: NativeEffectRootTransform, owner: NativeEffectOwner, currentRight: boolean): NativeEffectTransformWrites {
    root(current);
    root(original);
    if (plan.variant !== owner.variant)
        throw new Error('Native effect owner changed variant');
    flag(currentRight, 'currentRight');
    if (!plan.tracked)
        return { right: currentRight };
    const bone = getBone(owner, plan.boneName);
    if (bone)
        return { right: currentRight, localPosition: setPosition(plan, bone.position, currentRight),
            ...(plan.useBoneRotate ? { worldEulerAngles: vector(bone.worldEulerAngles!, 'bone.worldEulerAngles') } : {}) };
    // Original tracked effects do NOT retain FixedPos, LandConnect or ForceRight.
    const right = flag(owner.actor.right, 'actor.right');
    const localEulerAngles = setRight(plan, current, original, right);
    return { right, localPosition: setPosition(plan, actorPosition(owner.actor), right), ...(localEulerAngles ? { localEulerAngles } : {}) };
}
/** NKCASEffect.Update uses the effect Transform's WORLD Z, with no clamp. Z scale stays current. */
export function scaleNativeEffectSpawn(plan: NativeEffectSpawnPlan, current: NativeEffectRootTransform, original: NativeEffectRootTransform, worldZ: number, mapMinZ: number): NativeEffectVector {
    root(current);
    root(original);
    const depth = plan.useZScale ? sub(f(1.05), mul(sub(number(worldZ, 'worldZ'), number(mapMinZ, 'mapMinZ')), f(.001))) : 1;
    const x = mul(mul(plan.scaleFactor, original.localScale[0]), depth);
    const y = mul(mul(plan.scaleFactor, original.localScale[1]), depth);
    // NKCUtil.SetGameObjectLocalScale(GameObject) treats EACH exact -1 as preserve.
    return [x === -1 ? current.localScale[0] : x, y === -1 ? current.localScale[1] : y, current.localScale[2]];
}
/** Manager reservation consumes its supplied delta; caller applies a full ordinary Update on the start frame. */
export class NativeEffectReservation {
    private remaining: number;
    private active: boolean;
    constructor(reserveTime: number) { this.remaining = number(reserveTime, 'reserveTime'); this.active = this.remaining <= 0; }
    get started(): boolean { return this.active; }
    get remainingTime(): number { return this.remaining; }
    advance(managerDelta: number): boolean {
        const delta = number(managerDelta, 'managerDelta');
        if (delta < 0)
            throw new RangeError('managerDelta cannot be negative');
        if (this.active)
            return false;
        this.remaining = sub(this.remaining, delta);
        if (this.remaining > 0)
            return false;
        this.active = true;
        return true;
    }
}
/** null means GetMasterUnit() returned null, which leaves the event speed unchanged. */
export function getNativeEffectAnimationSpeed(plan: NativeEffectSpawnPlan, masterAnimSpeed: number | null, phase: 'initial-play' | 'update'): number {
    if (phase !== 'initial-play' && phase !== 'update')
        throw new Error('Unknown native effect animation phase');
    // Immediate EffectStart/PlayAnim precedes ApplyEventEffect's SetUseMasterAnimSpeed.
    const useMaster = plan.useMasterAnimSpeed && (phase === 'update' || plan.reserveTime > 0);
    return useMaster && masterAnimSpeed !== null ? mul(plan.animationSpeed, number(masterAnimSpeed, 'masterAnimSpeed')) : plan.animationSpeed;
}
/** null: the original .01 threshold did not trigger UpdateAnimSpeedInternal. NGST_80 keeps prior FXM scale. */
export function updateNativeEffectAnimationSpeed(plan: NativeEffectSpawnPlan, masterAnimSpeed: number | null, previousFinal: number, previousGameSpeedType: number, gameSpeedType: number): {
    final: number;
    fxmExternalTimeScale: number | null;
} | null {
    return updateNativeEffectPlaybackSpeed(getNativeEffectAnimationSpeed(plan, masterAnimSpeed, 'update'), previousFinal, previousGameSpeedType, gameSpeedType);
}
/** Original NKCASEffect.UpdateAnimSpeedInternal switch; NGST_80 makes no FXM/PS write. */
export function nativeEffectGameSpeedMultiplier(gameSpeedType: number): number | null {
    if (!Number.isInteger(gameSpeedType) || gameSpeedType < 0 || gameSpeedType > 5)
        throw new Error('Unknown NKM_GAME_SPEED_TYPE');
    const multiplier = [1.1, 1.5, 1.1, .6, 1.1, null][gameSpeedType];
    return multiplier === null ? null : f(multiplier);
}
export function updateNativeEffectPlaybackSpeed(animationSpeed: number, previousFinal: number, previousGameSpeedType: number, gameSpeedType: number): {
    final: number;
    fxmExternalTimeScale: number | null;
} | null {
    for (const value of [previousGameSpeedType, gameSpeedType])
        if (!Number.isInteger(value) || value < 0 || value > 5)
            throw new Error('Unknown NKM_GAME_SPEED_TYPE');
    const final = number(animationSpeed, 'animationSpeed');
    if (Math.abs(sub(number(previousFinal, 'previousFinal'), final)) <= f(.01) && previousGameSpeedType === gameSpeedType)
        return null;
    const multiplier = nativeEffectGameSpeedMultiplier(gameSpeedType);
    return { final, fxmExternalTimeScale: multiplier === null ? null : mul(multiplier, final) };
}
/** NKCEffectManager.Update's per-effect gate; reservation processing happens before this gate. */
export function isNativeEffectUpdateStopped(plan: NativeEffectSpawnPlan, worldStopTime: number, masterStopTime: boolean | null): boolean {
    const worldStopped = number(worldStopTime, 'worldStopTime') > 0;
    const masterStopped = worldStopped && masterStopTime !== null && flag(masterStopTime, 'masterStopTime');
    return plan.variant === 'unit' ? plan.applyStopTime && masterStopped : worldStopped && !(plan.canIgnoreStopTime && !masterStopped);
}
/** UseEffect's power-saving early return is absent for bDEEffect=true. */
export function isNativeEffectSpawnSuppressed(plan: NativeEffectSpawnPlan, powerSave: boolean): boolean {
    return plan.variant === 'unit' && flag(powerSave, 'powerSave');
}
export function makeNativeUnitEffectBone(position: NativeEffectVector, skeletonWorldEulerAngles: NativeEffectVector, boneWorldRotationX: number): NativeEffectBone {
    const euler = vector(skeletonWorldEulerAngles, 'skeletonWorldEulerAngles');
    return { position: vector(position, 'bone.position'), worldEulerAngles: [euler[0], euler[1], add(euler[2], number(boneWorldRotationX, 'bone.WorldRotationX'))] };
}
