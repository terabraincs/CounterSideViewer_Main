import type { CharacterSpineAnim2DPort } from './characterSpineAnim2DPlayback';
export interface CharacterEffectAnimatorState {
    readonly name: string;
    readonly fullPathHash: number;
    readonly length: number;
    readonly speed: number;
    readonly loop: boolean;
    readonly default: boolean;
    readonly activeTracks: readonly {
        readonly targetPath: string | null;
        readonly keys: readonly {
            time: number;
            value: number;
        }[];
    }[];
}
export interface CharacterEffectAnimatorSource {
    readonly id: string;
    readonly nodePath: string;
    readonly enabled: boolean;
    /** Extracted one-layer states, without transitions, blend children or SMBs. */
    readonly states: readonly CharacterEffectAnimatorState[];
}
export interface CharacterEffectAnimatorContext {
    readonly isActive: (path: string) => boolean;
    readonly setActive: (path: string, active: boolean) => void;
}
/** Original manual Animator port for the verified one-layer BASE/DIE controller.
 * NKCAnim2D owns Play/end/cache decisions. Constant streamed active tracks write
 * through the same lifecycle graph as FXM; no captured pose is replayed.
 */
export class CharacterSpineEffectAnimator implements CharacterSpineAnim2DPort {
    private readonly source: CharacterEffectAnimatorSource;
    private readonly context: CharacterEffectAnimatorContext;
    private current: CharacterEffectAnimatorState;
    private normalizedTime = 0;
    private speed = 1;
    constructor(source: CharacterEffectAnimatorSource, context: CharacterEffectAnimatorContext) {
        if (!source.enabled || source.states.filter(state => state.default).length !== 1
            || new Set(source.states.map(state => state.name)).size !== source.states.length)
            throw new Error('Explicit original single-layer Animator states are required');
        for (const state of source.states) {
            if (!state.name || !(state.length > 0) || state.speed !== 1 || state.loop)
                throw new Error('Unverified original Animator state clock');
            for (const track of state.activeTracks) {
                if (track.targetPath === null || !track.keys.length || track.keys[0].time !== 0
                    || ![0, 1].includes(track.keys[0].value) || track.keys.some(key => key.value !== track.keys[0].value))
                    throw new Error('Only exact bound constant active tracks are verified');
                context.isActive(track.targetPath); // Validate the original node binding.
            }
        }
        this.source = source;
        this.context = context;
        this.current = source.states.find(state => state.default)!;
    }
    playAndEvaluate(name: string, speed: number): void {
        const state = this.source.states.find(state => state.name === name);
        if (!state)
            throw new Error(`Missing original Animator state ${name}`);
        this.assertClock(0, speed);
        this.current = state;
        this.speed = Math.fround(speed);
        this.normalizedTime = 0;
        // Animator.Play(name,-1,0) + Update(.001) evaluates the selected layer at
        // zero. The original constant active binding still fires synchronously.
        this.evaluate();
    }
    update(delta: number, speed: number): void {
        this.assertClock(delta, speed);
        this.speed = Math.fround(speed);
        const f = Math.fround;
        this.normalizedTime = f(this.normalizedTime + f(f(f(delta) * this.speed) / f(this.current.length)));
        this.evaluate();
    }
    private assertClock(delta: number, speed: number): void {
        if (!Number.isFinite(delta) || delta < 0 || !Number.isFinite(speed) || speed <= 0)
            throw new Error('Explicit original forward Animator clock is required');
        if (!this.context.isActive(this.source.nodePath))
            throw new Error('Manual Animator evaluation on an inactive root requires a native fixture');
    }
    private evaluate(): void {
        for (const track of this.current.activeTracks)
            this.context.setActive(track.targetPath!, track.keys[0].value !== 0);
    }
    layerZero() { return { animationName: this.current.name, normalizedTime: this.normalizedTime }; }
    snapshot() {
        return { ...this.layerZero(), fullPathHash: this.current.fullPathHash, length: Math.fround(this.current.length / this.speed),
            speed: this.speed, stateSpeed: this.current.speed, loop: this.current.loop };
    }
}
