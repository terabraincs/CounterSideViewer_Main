const f = Math.fround;
export interface CharacterSpineAnim2DPort {
    /** Animator.Play(name,-1,0), followed by Animator.Update(.001). */
    playAndEvaluate(name: string, speed: number): void;
    update(delta: number, speed: number): void;
    layerZero(): {
        animationName: string;
        normalizedTime: number;
    };
}
/** Original NKCAnim2D.Play/Update/IsAnimationEnd control flow for an active
 * Animator without an AnimAutoChange mapping or half-update option. Controller
 * evaluation, state behaviours and FXM callbacks belong to the supplied port. */
export class CharacterSpineAnim2DPlayback {
    private name = '';
    private loop = false;
    private speed = 1;
    private animationEnd = false;
    private cachedTime = 0;
    private started = false;
    private readonly animator: CharacterSpineAnim2DPort;
    constructor(animator: CharacterSpineAnim2DPort) { this.animator = animator; }
    play(name: string, loop: boolean, speed: number): void {
        if (!name)
            throw new Error('Original Animator state name is required');
        this.setPlaySpeed(speed);
        this.name = name;
        this.loop = loop;
        this.animationEnd = false;
        this.animator.playAndEvaluate(name, this.speed);
        // Play IL0098..00A5 caches the state after the immediate .001 evaluation.
        this.cachedTime = f(this.animator.layerZero().normalizedTime);
        this.started = true;
    }
    setPlaySpeed(speed: number): void {
        if (!Number.isFinite(speed) || speed <= 0)
            throw new Error('Zero/reverse Anim2D speed requires original verification');
        this.speed = f(speed);
    }
    update(delta: number): void {
        if (!this.started || !Number.isFinite(delta) || delta < 0)
            throw new Error('Invalid original Anim2D update');
        const state = this.animator.layerZero();
        // Update IL0089..0096 caches BEFORE UpdateAnimator. IsAnimationEnd reads
        // only this cached normalized time, regardless of the clip's loop flag.
        this.cachedTime = f(state.normalizedTime);
        if (state.animationName !== this.name) {
            this.animator.update(f(delta), this.speed);
            return;
        }
        if (this.isAnimationEnd) {
            // IL0108..0136: the first ended update only sets the flag. A later
            // ended update restarts, then sets it again AFTER Play reset it.
            if (this.loop && this.animationEnd)
                this.play(this.name, this.loop, this.speed);
            this.animationEnd = true;
            return;
        }
        this.animator.update(f(delta), this.speed);
    }
    get isAnimationEnd(): boolean { return this.cachedTime >= 1; }
    snapshot() {
        return { animationName: this.name, loop: this.loop, speed: this.speed,
            animationEndFlag: this.animationEnd, cachedNormalizedTime: this.cachedTime };
    }
}
