/** Original NKMEventEffect keys; unhandled payload stays with the source event. */
export interface SourceEffectEvent {
    readonly m_Condition?: unknown;
    readonly m_bAnimTime?: boolean;
    readonly m_fEventTime?: number;
    readonly m_bStateEndTime?: boolean;
    readonly m_SkinID?: number;
    readonly m_bCutIn?: boolean;
    readonly m_EffectName?: string;
    readonly m_bHold?: boolean;
    readonly m_bStateEndStop?: boolean;
    readonly m_bStateEndStopForce?: boolean;
    readonly m_BoneName?: string;
    readonly m_AnimName?: string;
    readonly m_fReserveTime?: number;
    readonly m_fAnimSpeed?: number;
    readonly m_UseMasterAnimSpeed?: boolean;
    readonly m_ApplyStopTime?: boolean;
    readonly [sourceKey: string]: unknown;
}
export interface CharacterEffectClock {
    readonly stateTimeBack: number;
    readonly stateTime: number;
    readonly animationTimeBack: number;
    readonly animationTime: number;
    readonly animationPlayCount: number;
    readonly animationLoopReset: boolean;
    readonly stateRevision: number;
    readonly phase: "update" | "state-end";
}
/** These decisions require caller-owned game/renderer context; none defaults to true. */
export interface CharacterEffectTimelineContext {
    checkEventCondition: (condition: unknown, event: SourceEffectEvent, clock: CharacterEffectClock) => boolean;
    viewSkillCutIn: () => boolean;
    getSkinId: () => number;
    isEffectLive: (instanceId: number) => boolean;
}
interface EffectCommandBase {
    readonly instanceId: number;
    readonly event: SourceEffectEvent;
    readonly eventIndex: number;
    readonly clock: CharacterEffectClock;
}
export interface CharacterEffectSpawn extends EffectCommandBase {
    readonly kind: "spawn";
}
export type CharacterEffectCommand = CharacterEffectSpawn | (EffectCommandBase & {
    readonly kind: "follow";
}) | (EffectCommandBase & {
    readonly kind: "stop";
    readonly force: boolean;
});
export const CHARACTER_EFFECT_ZERO_EPSILON = Math.fround(1e-5);
/** NKMUnit.EventTimer IL0000–0022; FloatExt.IsNearlyZero uses strict abs(x) < epsilon. */
export function isCharacterEffectTimeInFrame(eventTime: number, back: number, now: number): boolean {
    const time = Math.fround(eventTime);
    const previous = Math.fround(back);
    const current = Math.fround(now);
    return (time > previous && time <= current)
        || (Math.abs(time) < CHARACTER_EFFECT_ZERO_EPSILON
            && Math.abs(current) < CHARACTER_EFFECT_ZERO_EPSILON);
}
function sourceFloat(value: number, name: string, nonnegative = false): number {
    const result = Math.fround(value);
    if (!Number.isFinite(result) || (nonnegative && result < 0)) {
        throw new RangeError(`${name} must be a finite${nonnegative ? " nonnegative" : ""} float32`);
    }
    return result;
}
/**
 * The checked effect-event slice of NKMUnit.Update/StateStart/StateEnd, not a battle simulator.
 * Each advance is ONE source frame: StateTimeUpdate → AnimTimeUpdate → ProcessEventEffect
 * → timestamp FramePass. Caller supplies the final actor speed, including any source stat/
 * ChangeAnimSpeed(0) result. State transitions, rollback, target conditions, effect reservation,
 * particle/animation lifetime, and effect clocks belong to their source-aware callers.
 *
 * Source: Assembly-CSharp.dll EEEDD00E…45B; NKMUnit.EventTimer, AnimTimeUpdate,
 * StateUpdate IL044C–04A4; NKCUnitClient.ProcessEventEffect/ApplyEventEffect.
 */
export class CharacterSpineEffectTimeline {
    private readonly events: readonly SourceEffectEvent[];
    private readonly context: CharacterEffectTimelineContext;
    private readonly animationStamps = new Map<number, boolean>();
    private readonly stateStamps = new Map<number, boolean>();
    private readonly tracked = new Map<number, CharacterEffectSpawn>();
    private stateTimeBack = 0;
    private stateTime = 0;
    private animationTimeBack = 0;
    private animationTime = 0;
    private animationPlayCount = 0;
    private animationLoopReset = false;
    private stateRevision = 0;
    private nextInstanceId = 1;
    private running = false;
    constructor(events: readonly SourceEffectEvent[], context: CharacterEffectTimelineContext) {
        for (const key of ["checkEventCondition", "viewSkillCutIn", "getSkinId", "isEffectLive"] as const) {
            if (typeof context?.[key] !== "function")
                throw new TypeError(`Missing effect context: ${key}`);
        }
        for (const event of events) {
            sourceFloat(event.m_fEventTime ?? 0, "m_fEventTime");
        }
        this.events = [...events];
        this.context = context;
    }
    get clock(): CharacterEffectClock {
        return this.snapshot("update");
    }
    /** StateStart plus its initial StateUpdate at zero state time; no rollback is synthesized. */
    restart(source: {
        readonly m_fAnimStartTime?: number;
    } = {}): CharacterEffectCommand[] {
        const start = sourceFloat(source.m_fAnimStartTime ?? 0, "m_fAnimStartTime");
        const commands = this.running ? this.end() : [];
        this.stateRevision += 1;
        this.stateTimeBack = this.stateTime = 0;
        this.animationTimeBack = Math.max(0, start);
        this.animationTime = start;
        this.animationPlayCount = 0;
        this.animationLoopReset = false;
        this.animationStamps.clear();
        this.stateStamps.clear();
        this.running = true;
        commands.push(...this.process(false));
        this.passFrame();
        return commands;
    }
    advance(delta: number, actorAnimSpeed: number, clipDuration: number, sourceLoopFlag: boolean, frame: {
        readonly actorStopped?: boolean;
    } = {}): CharacterEffectCommand[] {
        const dt = sourceFloat(delta, "delta", true);
        const speed = sourceFloat(actorAnimSpeed, "actorAnimSpeed", true);
        const duration = sourceFloat(clipDuration, "clipDuration", true);
        // NKMUnit.Update IL0108–010E bypasses clocks AND StateUpdate when IsStopTime is true.
        if (!this.running || frame.actorStopped)
            return [];
        this.stateTimeBack = this.stateTime;
        this.stateTime = Math.fround(this.stateTime + dt);
        this.animationLoopReset = this.animationTime >= duration && sourceLoopFlag;
        if (this.animationLoopReset) {
            // AnimTimeUpdate resets at the NEXT frame, discarding overshoot; never modulo/catch-up.
            this.animationTime = this.animationTimeBack = 0;
            this.animationStamps.clear();
        }
        this.animationTimeBack = this.animationTime;
        this.animationTime = Math.fround(this.animationTime + Math.fround(dt * speed));
        if (this.animationTime >= duration) {
            this.animationPlayCount = sourceLoopFlag ? this.animationPlayCount + 1 : 1;
        }
        const commands = this.process(false);
        this.passFrame();
        return commands;
    }
    /** StateEnd does not mean natural effect death. It stops tracked flagged effects first. */
    end(): CharacterEffectCommand[] {
        if (!this.running)
            return [];
        const commands = this.process(true);
        this.running = false;
        return commands;
    }
    /** Call only after UseEffect-equivalent creation succeeds; failed loads are never tracked. */
    trackEffect(spawn: CharacterEffectSpawn): void {
        if (spawn.event.m_bHold || spawn.event.m_bStateEndStop) {
            this.tracked.set(spawn.instanceId, spawn);
        }
    }
    /** The renderer owns actual death (END animation/particles/force stop), not clip duration. */
    forgetEffect(instanceId: number): void {
        this.tracked.delete(instanceId);
    }
    private snapshot(phase: CharacterEffectClock["phase"]): CharacterEffectClock {
        return Object.freeze({
            stateTimeBack: this.stateTimeBack,
            stateTime: this.stateTime,
            animationTimeBack: this.animationTimeBack,
            animationTime: this.animationTime,
            animationPlayCount: this.animationPlayCount,
            animationLoopReset: this.animationLoopReset,
            stateRevision: this.stateRevision,
            phase,
        });
    }
    private eventTimer(event: SourceEffectEvent): boolean {
        const animation = event.m_bAnimTime ?? true;
        const time = Math.fround(event.m_fEventTime ?? 0);
        const stamps = animation ? this.animationStamps : this.stateStamps;
        if (!isCharacterEffectTimeInFrame(time, animation ? this.animationTimeBack : this.stateTimeBack, animation ? this.animationTime : this.stateTime))
            return false;
        // The dictionary is keyed by TIME, not event identity. All equal-time rows share this frame.
        if (!stamps.has(time))
            stamps.set(time, false);
        return !stamps.get(time);
    }
    private process(stateEnd: boolean): CharacterEffectCommand[] {
        const commands: CharacterEffectCommand[] = [];
        const clock = this.snapshot(stateEnd ? "state-end" : "update");
        for (const [instanceId, effect] of this.tracked) {
            if (!this.context.isEffectLive(instanceId)) {
                if (!stateEnd)
                    this.tracked.delete(instanceId);
                continue;
            }
            if (stateEnd) {
                if (effect.event.m_bStateEndStop)
                    commands.push({
                        ...effect, kind: "stop", force: effect.event.m_bStateEndStopForce ?? false, clock,
                    });
            }
            else {
                // Original m_llEffect follows both Hold and StateEndStop entries, including after Stop(false).
                commands.push({ ...effect, kind: "follow", clock });
            }
        }
        // Preserve original list order, including equal times; the source does not sort by event time.
        this.events.forEach((event, eventIndex) => {
            if (event.m_bCutIn && !this.context.viewSkillCutIn())
                return;
            if (!this.context.checkEventCondition(event.m_Condition, event, clock))
                return;
            const skinId = event.m_SkinID ?? -1;
            if (skinId >= 0 && skinId !== this.context.getSkinId())
                return;
            const atEnd = event.m_bStateEndTime ?? false;
            // Native calls EventTimer even for end-only rows during normal frames (timestamp side effect).
            const eligible = atEnd && stateEnd ? true : this.eventTimer(event) && !atEnd;
            if (eligible)
                commands.push({
                    kind: "spawn", instanceId: this.nextInstanceId++, event, eventIndex, clock,
                });
        });
        return commands;
    }
    private passFrame(): void {
        for (const time of this.animationStamps.keys())
            this.animationStamps.set(time, true);
        for (const time of this.stateStamps.keys())
            this.stateStamps.set(time, true);
    }
}
