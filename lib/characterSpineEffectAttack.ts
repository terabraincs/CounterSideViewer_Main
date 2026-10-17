import type { CharacterSpineRuntimeEvent } from "./characterSpineEffectData";
import type { CharacterEffectClock } from "./characterSpineEffectTimeline";
import { isCharacterEffectTimeInFrame } from "./characterSpineEffectTimeline.ts";
import type { NativeHitContext, NativeHitTarget, NativeHitTemplateFields } from "./characterSpineEffectHit";
import { NativeReattackClock } from "./characterSpineEffectHit.ts";
type Fields = Readonly<Record<string, unknown>>;
const f = Math.fround;
const epsilon = f(1e-5);
function scalar(value: unknown, name: string): number {
    if (typeof value !== "number" || !Number.isFinite(f(value)))
        throw new TypeError(`${name} requires a finite float32`);
    return f(value);
}
function integer(value: unknown, name: string): number {
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || value > 2147483647)
        throw new TypeError(`${name} requires a nonnegative int32`);
    return value;
}
function boolean(value: unknown, name: string): boolean {
    if (typeof value !== "boolean")
        throw new TypeError(`${name} requires an explicit boolean`);
    return value;
}
const n = (fields: Fields, name: string, ctor = 0) => scalar(fields[name] ?? ctor, name);
const b = (fields: Fields, name: string, ctor = false) => boolean(fields[name] ?? ctor, name);
function s(fields: Fields, name: string, ctor = ""): string {
    const value = fields[name] ?? ctor;
    if (typeof value !== "string")
        throw new TypeError(`${name} requires a string`);
    return value;
}
export interface NativeUnitAttackActor {
    readonly posX: number;
    readonly beforeX: number;
    readonly posZ: number;
    readonly jumpYPos: number;
    readonly unitSizeX: number;
    readonly right: boolean;
    readonly addAttackRange: number;
    readonly addAttackUnitCount: number;
}
export interface NativeUnitAttackTarget extends NativeHitTarget {
    readonly uid: number;
    readonly unitSizeX: number;
}
export interface NativeUnitAttackHit {
    readonly event: CharacterSpineRuntimeEvent;
    readonly eventIndex: number;
    readonly damageTemplateName: string;
    readonly templateFields: NativeHitTemplateFields;
    readonly clock: CharacterEffectClock;
    /** Original clone retains attacker snapshot even if the current actor later moves. */
    readonly actor: NativeUnitAttackActor;
    /** Reattacks resolve the live logical defender at their due time. */
    readonly target: NativeUnitAttackTarget;
    readonly damageInst: NativeHitContext["damageInst"];
    readonly repeated: boolean;
}
export type NativeUnitAttackCommand = {
    readonly kind: "hit";
    readonly hit: NativeUnitAttackHit;
    readonly reactionResult: number;
} | {
    readonly kind: "attack-effect";
    readonly event: CharacterSpineRuntimeEvent;
    readonly eventIndex: number;
    readonly clock: CharacterEffectClock;
} | {
    readonly kind: "state-change";
    readonly stateName: string;
    readonly immediate: false;
    readonly clock: CharacterEffectClock;
};
export interface NativeUnitAttackContext {
    isGamePlaying: () => boolean;
    getDamageTemplate: (exactName: string) => NativeHitTemplateFields;
    /** ProcessEventAttack checks m_Condition with null target before calling EventTimer. */
    checkEventCondition: (event: CharacterSpineRuntimeEvent, clock: CharacterEffectClock) => boolean;
    /** HitCheck prefix: interaction, defender m_ConditionTarget(actor), play state and team rules. */
    checkTargetInteraction: (event: CharacterSpineRuntimeEvent, actor: NativeUnitAttackActor, target: NativeUnitAttackTarget) => boolean;
    /** HitCheck after duplicate guard: source style/role/cost/air/land/summon/awaken/boss filters. */
    checkTargetFilters: (event: CharacterSpineRuntimeEvent, target: NativeUnitAttackTarget) => boolean;
    getDefenderStatType66: (target: NativeUnitAttackTarget) => number;
    /** Original DamageReact callback; return NKM_REACT_TYPE. No guessed hit acceptance. */
    damageReact: (hit: NativeUnitAttackHit) => number;
}
function actorCopy(actor: NativeUnitAttackActor): NativeUnitAttackActor {
    return { posX: scalar(actor.posX, "actor.posX"), beforeX: scalar(actor.beforeX, "actor.beforeX"), posZ: scalar(actor.posZ, "actor.posZ"),
        jumpYPos: scalar(actor.jumpYPos, "actor.jumpYPos"), unitSizeX: scalar(actor.unitSizeX, "actor.unitSizeX"), right: boolean(actor.right, "actor.right"),
        addAttackRange: scalar(actor.addAttackRange, "actor.addAttackRange"), addAttackUnitCount: integer(actor.addAttackUnitCount, "actor.addAttackUnitCount") };
}
function targetCopy(target: NativeUnitAttackTarget): NativeUnitAttackTarget {
    return { uid: integer(target.uid, "target.uid"), posX: scalar(target.posX, "target.posX"), posZ: scalar(target.posZ, "target.posZ"),
        jumpYPos: scalar(target.jumpYPos, "target.jumpYPos"), unitSizeX: scalar(target.unitSizeX, "target.unitSizeX"), unitSizeY: scalar(target.unitSizeY, "target.unitSizeY"),
        right: boolean(target.right, "target.right"), isAirUnit: boolean(target.isAirUnit, "target.isAirUnit") };
}
/** NKMGame.CollisionCheck: swept actor X, original forward-only added range, no Y/Z gate. */
export function nativeUnitAttackCollision(actor: NativeUnitAttackActor, target: NativeUnitAttackTarget, fields: Fields): boolean {
    const a = actorCopy(actor);
    const t = targetCopy(target);
    const before = Math.abs(a.beforeX + 1) < epsilon ? a.posX : a.beforeX;
    let low = Math.min(before, a.posX);
    let high = Math.max(before, a.posX);
    const min = n(fields, "m_fRangeMin", 100);
    const max = n(fields, "m_fRangeMax", 100) + a.addAttackRange;
    if (a.right) {
        if (max > 0)
            high += a.unitSizeX * 0.5;
        if (min < 0)
            low -= a.unitSizeX * 0.5;
        low += min;
        high += max;
    }
    else {
        if (max > 0)
            low -= a.unitSizeX * 0.5;
        if (min < 0)
            high += a.unitSizeX * 0.5;
        low -= max;
        high -= min;
    }
    if (t.posX >= low && t.posX <= high)
        return true;
    return (low - t.posX >= 0 && low - t.posX < t.unitSizeX * 0.5)
        || (t.posX - high >= 0 && t.posX - high < t.unitSizeX * 0.5);
}
interface AttackInstance {
    hitIds: Set<number>;
    attackCount: number;
    reAttackCount: number;
    templateFields: NativeHitTemplateFields | null;
    templateName: string;
}
interface QueuedAttack {
    clock: NativeReattackClock;
    hit: NativeUnitAttackHit;
}
/**
 * One actor and one viewer-owned logical target. Process once per source StateUpdate
 * using the existing actor clock, including the initial t0 update. No animation-event
 * substitution, combat RNG, visual effect lifetime or game-clock catch-up is synthesized.
 * Reattacks have their own explicit manager call and survive actor state transitions.
 */
export class CharacterSpineEffectAttack {
    private readonly context: NativeUnitAttackContext;
    private readonly stamps = [new Map<number, boolean>(), new Map<number, boolean>()];
    private readonly instances = new Map<number, AttackInstance>();
    private readonly reattacks: QueuedAttack[] = [];
    private revision: number | null = null;
    constructor(context: NativeUnitAttackContext) {
        this.context = context;
        for (const key of ["isGamePlaying", "getDamageTemplate", "checkEventCondition", "checkTargetInteraction", "checkTargetFilters", "getDefenderStatType66", "damageReact"] as const) {
            if (typeof context?.[key] !== "function")
                throw new TypeError(`Missing native attack context: ${key}`);
        }
    }
    get pendingReattackCount(): number { return this.reattacks.length; }
    /** Explicit viewer disposal/reset; native state transitions must not call this. */
    reset(): void { this.reattacks.length = 0; this.instances.clear(); this.stamps.forEach((stamp) => stamp.clear()); this.revision = null; }
    process(events: readonly CharacterSpineRuntimeEvent[], clock: CharacterEffectClock, actor: NativeUnitAttackActor, target: NativeUnitAttackTarget | null, frame: {
        readonly actorStopped?: boolean;
    } = {}): NativeUnitAttackCommand[] {
        if (clock.phase === "state-end" || frame.actorStopped)
            return []; // Unit.Update skips StateUpdate during source stop time.
        if (this.revision !== clock.stateRevision) {
            this.stamps.forEach((stamp) => stamp.clear());
            this.revision = clock.stateRevision;
            // StateStart clears timestamps, NOT m_listDamageInstAtk; Init occurs at each row's start timer.
        }
        if (clock.animationLoopReset)
            this.stamps[1].clear();
        const a = actorCopy(actor);
        const t = target === null ? null : targetCopy(target);
        const commands: NativeUnitAttackCommand[] = [];
        events.forEach((event, eventIndex) => {
            if (!boolean(this.context.checkEventCondition(event, clock), "event condition"))
                return;
            const fields = event.nativeFields;
            const animation = b(fields, "m_bAnimTime", true);
            const min = n(fields, "m_fEventTimeMin");
            const max = n(fields, "m_fEventTimeMax");
            if (this.timer(animation, min, clock))
                this.instances.set(eventIndex, { hitIds: new Set(), attackCount: 0, reAttackCount: 0, templateFields: null, templateName: "" });
            const now = animation ? clock.animationTime : clock.stateTime;
            let active = (now >= min && now <= max) || this.timer(animation, min, clock);
            if (Math.abs(min - max) < epsilon && this.timer(animation, min, clock))
                active = true;
            if (!active)
                return;
            let instance = this.instances.get(eventIndex);
            if (!instance) {
                instance = { hitIds: new Set(), attackCount: 0, reAttackCount: 0, templateFields: null, templateName: "" };
                this.instances.set(eventIndex, instance);
            }
            if (!instance.templateFields) {
                instance.templateName = s(fields, "m_DamageTempletName");
                instance.templateFields = this.context.getDamageTemplate(instance.templateName);
                if (!instance.templateFields)
                    throw new Error(`Missing exact damage template ${instance.templateName}`);
            }
            if (!boolean(this.context.isGamePlaying(), "game playing"))
                return;
            const attackUnitCount = integer(fields.m_AttackUnitCount ?? 1, "m_AttackUnitCount");
            let hitAny = false;
            // UnitToUnit first tries the selected target, then its sorted near-unit list.
            // This viewer has one logical unit. A failed NO reaction can therefore retry
            // in the same frame; a successful hit is rejected by the next duplicate guard.
            const attempts = b(fields, "m_AttackTargetUnit", true) ? 2 : 1;
            for (let candidate = 0; candidate < attempts; candidate += 1) {
                if ((attackUnitCount === 1 || b(fields, "m_AttackUnitCountOnly")) && instance.attackCount >= attackUnitCount)
                    break;
                if (!t || !boolean(this.context.checkTargetInteraction(event, a, t), "target interaction"))
                    continue;
                if (instance.hitIds.has(t.uid))
                    continue;
                if (!boolean(this.context.checkTargetFilters(event, t), "target filters"))
                    continue;
                if (!nativeUnitAttackCollision(a, t, fields))
                    continue;
                const overflow = attackUnitCount + a.addAttackUnitCount <= instance.attackCount;
                const hit: NativeUnitAttackHit = { event, eventIndex, templateFields: instance.templateFields, damageTemplateName: instance.templateName,
                    clock: { ...clock }, actor: a, target: t, repeated: false,
                    damageInst: { reAttackCount: instance.reAttackCount, attackCount: instance.attackCount, attackUnitCount,
                        attackerAddAttackUnitCount: a.addAttackUnitCount, reAttackCountOver: false, hitUnitListCount: instance.hitIds.size } };
                const reaction = integer(this.context.damageReact(hit), "DamageReact result");
                if (reaction === 2)
                    continue;
                if (reaction === 4)
                    throw new Error("Unimplemented native attack NRT_REVENGE/master state reaction");
                instance.hitIds.add(t.uid);
                instance.attackCount += 1 + Math.trunc(scalar(this.context.getDefenderStatType66(t), "defender stat 66") + f(0.1));
                commands.push({ kind: "hit", hit, reactionResult: reaction });
                hitAny = true;
                const repeat = new NativeReattackClock(instance.templateFields, { initialHitUnitListCount: hit.damageInst.hitUnitListCount, repeatedHitUnitListCount: instance.hitIds.size });
                repeat.initial();
                if (!repeat.state.done) {
                    instance.reAttackCount = 1;
                    this.reattacks.push({ clock: repeat, hit: { ...hit, damageInst: { ...hit.damageInst, attackCount: instance.attackCount,
                                reAttackCount: 1, reAttackCountOver: overflow, hitUnitListCount: instance.hitIds.size } } });
                }
            }
            if (!hitAny)
                return;
            if (s(instance.templateFields, "m_ExtraHitDamageTempletID").length > 0)
                throw new Error("Unimplemented native ProcessExtraHit damage template");
            if (s(fields, "m_EffectName").length > 1)
                commands.push({ kind: "attack-effect", event, eventIndex, clock: { ...clock } });
            const change = s(fields, "m_HitStateChange");
            if (change.length > 1)
                commands.push({ kind: "state-change", stateName: change, immediate: false, clock: { ...clock } });
        });
        for (const stamp of this.stamps)
            for (const time of stamp.keys())
                stamp.set(time, true);
        return commands;
    }
    /** Client calls this after unit updates and before DE updates; world stop skips the entire call. */
    tickReattacks(delta: number, clock: CharacterEffectClock, resolveTarget: (uid: number) => NativeUnitAttackTarget | null, frame: {
        readonly worldStopped?: boolean;
    } = {}): NativeUnitAttackCommand[] {
        if (typeof resolveTarget !== "function")
            throw new TypeError("Missing native reattack target resolver");
        if (frame.worldStopped)
            return [];
        const commands: NativeUnitAttackCommand[] = [];
        for (const queued of this.reattacks) {
            // The original lookup is only performed on a due tick. NativeReattackClock uses an
            // availability flag, so resolve lazily inside DamageReact and treat absent targets as NO callback.
            queued.clock.tick(delta, { targetAvailable: true, damageReact: (repeat) => {
                    const target = resolveTarget(queued.hit.target.uid);
                    if (!target)
                        return 0;
                    const hit: NativeUnitAttackHit = { ...queued.hit, repeated: true, clock: { ...clock }, target: targetCopy(target),
                        damageInst: { ...queued.hit.damageInst, reAttackCount: repeat.reAttackCount, hitUnitListCount: repeat.hitUnitListCount } };
                    const reaction = integer(this.context.damageReact(hit), "repeat DamageReact result");
                    if (reaction === 4)
                        throw new Error("Unimplemented native reattack NRT_REVENGE/master state reaction");
                    if (reaction !== 2)
                        commands.push({ kind: "hit", hit, reactionResult: reaction });
                    return reaction;
                } });
        }
        for (let index = this.reattacks.length - 1; index >= 0; index -= 1)
            if (this.reattacks[index].clock.state.done)
                this.reattacks.splice(index, 1);
        return commands;
    }
    private timer(animation: boolean, time: number, clock: CharacterEffectClock): boolean {
        if (!isCharacterEffectTimeInFrame(time, animation ? clock.animationTimeBack : clock.stateTimeBack, animation ? clock.animationTime : clock.stateTime))
            return false;
        const stamp = this.stamps[animation ? 1 : 0];
        if (!stamp.has(time))
            stamp.set(time, false);
        return !stamp.get(time);
    }
}
