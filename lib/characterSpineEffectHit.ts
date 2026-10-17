/** Normalized NKMDamageTemplet.nativeFields, including its verified constructor defaults. */
export type NativeHitTemplateFields = Readonly<Record<string, unknown>>;
export type NativeHitVector = Readonly<{
    x: number;
    y: number;
    z: number;
}>;
/** Viewer-owned logical defender. No monster/model or bone is required by HitEffect. */
export interface NativeHitTarget {
    readonly posX: number;
    readonly posZ: number;
    readonly jumpYPos: number;
    readonly unitSizeY: number;
    readonly right: boolean;
    readonly isAirUnit: boolean;
}
export interface NativeHitContext {
    /** Collision success is a caller decision, not inferred from an animation event. */
    readonly hitConfirmed: boolean;
    readonly reactionResult: number;
    readonly powerSave: boolean;
    readonly damageInst: {
        readonly reAttackCount: number;
        readonly attackCount: number;
        /** null means the damage instance has no NKMEventAttack. */
        readonly attackUnitCount: number | null;
        readonly attackerAddAttackUnitCount: number;
        readonly reAttackCountOver: boolean;
        readonly hitUnitListCount: number;
    };
    readonly barrier: null | {
        readonly hp: number;
        readonly damageEffectName: string;
        readonly buffId: number;
        readonly hasExistingBuffEffect: boolean;
    };
    /** null represents the original client's absent game-option object. */
    readonly useHitEffect: boolean | null;
    readonly simpleHitEffectFrame: boolean;
    /** Count after the original IsLiveEffect pruning, not an estimated draw count. */
    readonly trackedHitEffectCountAfterPrune: number;
}
/** Caller must provide NKMRandom.Range (System.Random), independently of Unity FXM RNG. */
export type NativeHitRandomRange = (minimum: number, maximum: number) => number;
export interface NativeHitSpawn {
    readonly kind: "spawn";
    readonly branch: "ground" | "air" | "attack-count-over" | "barrier" | "simple";
    readonly effectName: string;
    readonly bundleName: string;
    readonly animationName: string;
    readonly position: NativeHitVector;
    readonly right: boolean;
    readonly addRotate: 0;
    readonly rootRotationYAddition: 0 | 180;
    readonly scaleFactor: 1;
    readonly useZScale: true;
    readonly mapMinZ: number;
    readonly reserveTime: number;
    readonly animationSpeed: 1;
    readonly autoDie: true;
    readonly boneName: "";
    readonly parentType: "NEPT_NUM_GAME_BATTLE_EFFECT";
    readonly masterUnitGameUID: 0;
    /** Add to the client's tracked list only if loading succeeds. Barrier effects are untracked. */
    readonly trackDetailedOnSuccessfulLoad: boolean;
    readonly nextSimpleHitEffectFrame: boolean;
    readonly existingBarrierAnimation: null | {
        readonly buffId: number;
        readonly animationName: "DAMAGED";
        readonly loop: false;
        readonly speed: 1;
    };
}
export type NativeHitResult = NativeHitSpawn | {
    readonly kind: "suppressed";
    readonly reason: "unconfirmed-hit" | "power-save" | "no-reaction";
    readonly nextSimpleHitEffectFrame: boolean;
};
const f32 = Math.fround;
const add = (a: number, b: number) => f32(a + b);
const sub = (a: number, b: number) => f32(a - b);
const mul = (a: number, b: number) => f32(a * b);
const RANDOM_EQUAL_EPSILON = f32(1e-5);
function float(value: unknown, name: string): number {
    if (typeof value !== "number" || !Number.isFinite(f32(value))) {
        throw new TypeError(`${name} must be an explicit finite float32`);
    }
    return f32(value);
}
function integer(value: unknown, name: string, minimum = 0): number {
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum || value > 2147483647) {
        throw new TypeError(`${name} must be an explicit int32 >= ${minimum}`);
    }
    return value;
}
function boolean(value: unknown, name: string): boolean {
    if (typeof value !== "boolean")
        throw new TypeError(`${name} must be an explicit boolean`);
    return value;
}
function string(value: unknown, name: string): string {
    if (typeof value !== "string")
        throw new TypeError(`${name} must be an explicit string`);
    return value;
}
function validateContext(context: NativeHitContext): void {
    boolean(context?.hitConfirmed, "hitConfirmed");
    integer(context.reactionResult, "reactionResult");
    boolean(context.powerSave, "powerSave");
    const inst = context.damageInst;
    integer(inst?.reAttackCount, "damageInst.reAttackCount");
    integer(inst.attackCount, "damageInst.attackCount");
    if (inst.attackUnitCount !== null)
        integer(inst.attackUnitCount, "damageInst.attackUnitCount");
    integer(inst.attackerAddAttackUnitCount, "damageInst.attackerAddAttackUnitCount");
    boolean(inst.reAttackCountOver, "damageInst.reAttackCountOver");
    integer(inst.hitUnitListCount, "damageInst.hitUnitListCount");
    if (context.barrier !== null) {
        float(context.barrier?.hp, "barrier.hp");
        string(context.barrier.damageEffectName, "barrier.damageEffectName");
        integer(context.barrier.buffId, "barrier.buffId", -32768);
        boolean(context.barrier.hasExistingBuffEffect, "barrier.hasExistingBuffEffect");
    }
    if (context.useHitEffect !== null)
        boolean(context.useHitEffect, "useHitEffect");
    boolean(context.simpleHitEffectFrame, "simpleHitEffectFrame");
    integer(context.trackedHitEffectCountAfterPrune, "trackedHitEffectCountAfterPrune");
}
/** NKCGameClient.HitEffect uses exactly two min/max draws, with no Z draw. */
function sampleRange(minimum: number, maximum: number, randomRange: NativeHitRandomRange): number {
    if (Math.abs(sub(minimum, maximum)) < RANDOM_EQUAL_EPSILON)
        return maximum;
    const result = float(randomRange(minimum, maximum), "randomRange result");
    if (result < minimum || result > maximum)
        throw new RangeError("randomRange result is outside its native interval");
    return result;
}
export function nativeHitReserveTime(hitUnitListCount: number): number {
    return mul(f32(0.05), f32(integer(hitUnitListCount, "hitUnitListCount")));
}
/** NKMGame.GetZScaleFactor. Supply actual world Z; a parent transform is not assumed. */
export function nativeHitDepthScale(effectWorldZ: number, mapMinZ: number): number {
    return sub(f32(1.05), mul(sub(float(effectWorldZ, "effectWorldZ"), float(mapMinZ, "mapMinZ")), f32(0.001)));
}
/**
 * Checked visual slice of NKCUnitClient.DamageReact + NKCGameClient.HitEffect.
 * Source Assembly-CSharp.dll EEEDD00E...D45B, HitEffect IL0007-0344.
 * This requests the exact source name (even an empty name); asset lookup must report a
 * missing asset without substituting another prefab. It does not simulate damage/audio.
 */
export function resolveNativeHitEffect(input: {
    readonly templateFields: NativeHitTemplateFields;
    readonly target: NativeHitTarget;
    readonly context: NativeHitContext;
    readonly mapMinZ: number;
    readonly randomRange: NativeHitRandomRange;
}): NativeHitResult {
    const { templateFields: fields, target, context, randomRange } = input;
    if (!fields || typeof fields !== "object")
        throw new TypeError("Missing normalized damage template fields");
    if (typeof randomRange !== "function")
        throw new TypeError("Missing native randomRange callback");
    validateContext(context);
    const mapMinZ = float(input.mapMinZ, "mapMinZ");
    const posX = float(target?.posX, "target.posX");
    const posZ = float(target.posZ, "target.posZ");
    const jumpYPos = float(target.jumpYPos, "target.jumpYPos");
    const unitSizeY = float(target.unitSizeY, "target.unitSizeY");
    const right = boolean(target.right, "target.right");
    const isAir = boolean(target.isAirUnit, "target.isAirUnit");
    const reason = !context.hitConfirmed ? "unconfirmed-hit" : context.powerSave ? "power-save"
        : context.reactionResult === 2 ? "no-reaction" : null;
    if (reason)
        return { kind: "suppressed", reason, nextSimpleHitEffectFrame: context.simpleHitEffectFrame };
    const inst = context.damageInst;
    const overflow = inst.reAttackCount === 0
        ? inst.attackUnitCount !== null && inst.attackUnitCount + inst.attackerAddAttackUnitCount <= inst.attackCount
        : inst.reAttackCountOver;
    const airName = isAir ? string(fields.m_HitEffectAir, "m_HitEffectAir") : "";
    const air = isAir && airName.length > 1;
    let branch: NativeHitSpawn["branch"] = overflow ? "attack-count-over" : air ? "air" : "ground";
    let effectName = overflow ? "AB_fx_hit_b_blue_small" : air ? airName : string(fields.m_HitEffect, "m_HitEffect");
    const animationName = overflow ? "BASE" : string(fields[air ? "m_HitEffectAirAnimName" : "m_HitEffectAnimName"], "hit effect animation");
    const range = overflow ? 50 : float(fields[air ? "m_fHitEffectAirRange" : "m_fHitEffectRange"], "hit effect range");
    if (range < 0)
        throw new RangeError("Native hit effect range is negative");
    const offsetZ = overflow ? 0 : float(fields[air ? "m_fHitEffectAirOffsetZ" : "m_fHitEffectOffsetZ"], "hit effect offset Z");
    const land = !overflow && !air && boolean(fields.m_bHitEffectLand, "m_bHitEffectLand");
    const z = add(posZ, offsetZ);
    const centerY = add(add(z, jumpYPos), mul(unitSizeY, f32(0.5)));
    let minY = sub(centerY, range);
    let maxY = add(centerY, range);
    let nextSimpleHitEffectFrame = context.simpleHitEffectFrame;
    let trackDetailedOnSuccessfulLoad = false;
    let existingBarrierAnimation: NativeHitSpawn["existingBarrierAnimation"] = null;
    const barrier = context.barrier;
    if (barrier && float(barrier.hp, "barrier.hp") > 0 && barrier.damageEffectName.length > 1) {
        // The native barrier return precedes both the land override and simple-hit tracking.
        branch = "barrier";
        effectName = barrier.damageEffectName;
        if (barrier.hasExistingBuffEffect)
            existingBarrierAnimation = { buffId: barrier.buffId, animationName: "DAMAGED", loop: false, speed: 1 };
    }
    else {
        if (land)
            minY = maxY = z;
        const crowdedSimpleFrame = context.simpleHitEffectFrame && context.trackedHitEffectCountAfterPrune > 2;
        nextSimpleHitEffectFrame = !crowdedSimpleFrame;
        trackDetailedOnSuccessfulLoad = context.useHitEffect !== false && !crowdedSimpleFrame;
        if (!trackDetailedOnSuccessfulLoad) {
            branch = "simple";
            effectName = "AB_FX_HIT_SIMPLE";
        }
    }
    return {
        kind: "spawn", branch, effectName, bundleName: effectName, animationName,
        position: { x: sampleRange(sub(posX, range), add(posX, range), randomRange), y: sampleRange(minY, maxY, randomRange), z },
        right, addRotate: 0, rootRotationYAddition: right ? 0 : 180, scaleFactor: 1, useZScale: true, mapMinZ,
        reserveTime: nativeHitReserveTime(inst.hitUnitListCount), animationSpeed: 1, autoDie: true,
        boneName: "", parentType: "NEPT_NUM_GAME_BATTLE_EFFECT", masterUnitGameUID: 0,
        trackDetailedOnSuccessfulLoad, nextSimpleHitEffectFrame, existingBarrierAnimation,
    };
}
/** NKCASEffect.SetRight / SetRotate(0) / Update. effectWorldZ is explicit for transformed parents. */
export function applyNativeHitRootTransform(spawn: NativeHitSpawn, sourceRoot: {
    readonly localEulerY: number;
    readonly localScale: NativeHitVector;
    readonly currentLocalScale: NativeHitVector;
}, effectWorldZ: number): {
    rotation: NativeHitVector;
    scale: NativeHitVector;
    depthScale: number;
} {
    const depthScale = nativeHitDepthScale(effectWorldZ, spawn.mapMinZ);
    const x = mul(mul(spawn.scaleFactor, float(sourceRoot.localScale.x, "source root scale X")), depthScale);
    const y = mul(mul(spawn.scaleFactor, float(sourceRoot.localScale.y, "source root scale Y")), depthScale);
    const current = sourceRoot.currentLocalScale;
    return {
        rotation: { x: 0, y: add(float(sourceRoot.localEulerY, "source root Euler Y"), spawn.rootRotationYAddition), z: spawn.addRotate },
        scale: {
            // NKCUtil.SetGameObjectLocalScale(GameObject) treats exactly -1 as retain-current.
            x: x === -1 ? float(current.x, "current root scale X") : x,
            y: y === -1 ? float(current.y, "current root scale Y") : y,
            z: float(current.z, "current root scale Z"),
        },
        depthScale,
    };
}
export interface NativeReattackHit {
    readonly hitOrdinal: number;
    /** Initial DamageReact sees 0; the queued clone starts at 1 and increments before repeat. */
    readonly reAttackCount: number;
    readonly hitUnitListCount: number;
    readonly reserveTime: number;
}
/**
 * One queued NKMGame.ProcessReAttack instance, not a catch-up timeline. Call initial()
 * only for a successful HitCheck, then tick once per native game frame. Hit-list counts
 * are explicit because the client only appends the defender on its own HitCheck branch.
 * Effect-manager reservation is a separate clock; do not add it to the re-attack gap.
 */
export class NativeReattackClock {
    private readonly total: number;
    private readonly gap: number;
    private readonly initialListCount: number;
    private readonly repeatedListCount: number;
    private started = false;
    private done = false;
    private count = 0;
    private remaining = 0;
    constructor(fields: NativeHitTemplateFields, counts: {
        readonly initialHitUnitListCount: number;
        readonly repeatedHitUnitListCount: number;
    }) {
        this.total = integer(fields?.m_ReAttackCount, "m_ReAttackCount");
        this.gap = float(fields.m_fReAttackGap, "m_fReAttackGap");
        this.initialListCount = integer(counts?.initialHitUnitListCount, "initialHitUnitListCount");
        this.repeatedListCount = integer(counts.repeatedHitUnitListCount, "repeatedHitUnitListCount");
    }
    get state() {
        return { started: this.started, done: this.done, reAttackCount: this.count, remainingGap: this.remaining };
    }
    initial(): NativeReattackHit {
        if (this.started)
            throw new Error("Initial hit already emitted; create a clock for each new HitCheck");
        this.started = true;
        this.count = 1;
        this.remaining = this.gap;
        this.done = this.total <= 1;
        return { hitOrdinal: 1, reAttackCount: 0, hitUnitListCount: this.initialListCount, reserveTime: nativeHitReserveTime(this.initialListCount) };
    }
    tick(delta: number, context: {
        readonly targetAvailable: boolean;
        /** Execute the defender callback only when due; return its actual NKM_REACT_TYPE. */
        readonly damageReact: (hit: NativeReattackHit) => number;
    }): NativeReattackHit | null {
        const dt = float(delta, "game delta");
        if (dt < 0)
            throw new RangeError("game delta must be nonnegative");
        boolean(context?.targetAvailable, "targetAvailable");
        if (typeof context.damageReact !== "function")
            throw new TypeError("Missing damageReact callback");
        if (!this.started)
            throw new Error("Call initial() for the successful HitCheck before ticking re-attacks");
        // A nonpositive source gap never enters ProcessReAttack's body, even with count > 1.
        if (this.done || this.remaining <= 0)
            return null;
        this.remaining = sub(this.remaining, dt);
        if (this.remaining > 0)
            return null;
        this.count += 1;
        this.remaining = this.gap; // Source discards overshoot; there is no while/catch-up loop.
        this.done = this.count >= this.total;
        if (!context.targetAvailable)
            return null;
        const hit: NativeReattackHit = {
            hitOrdinal: this.count, reAttackCount: this.count, hitUnitListCount: this.repeatedListCount,
            reserveTime: nativeHitReserveTime(this.repeatedListCount),
        };
        const reaction = integer(context.damageReact(hit), "damageReact result");
        if (reaction === 2)
            this.done = true;
        return hit;
    }
}
