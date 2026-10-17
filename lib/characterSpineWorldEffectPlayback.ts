import { CharacterSpineWorldParticlePlayback } from './characterSpineWorldParticlePlayback';
import { nativeEffectGameSpeedMultiplier, updateNativeEffectPlaybackSpeed } from './characterSpineEffectSpawn';
import type { CharacterSpineEffectSceneCatalog } from './characterSpineEffectScene';
import { CharacterSpineAnim2DPlayback } from './characterSpineAnim2DPlayback';
const f = Math.fround;
type Context = ConstructorParameters<typeof CharacterSpineWorldParticlePlayback>[2];
/** Audited fresh BASE World-particle branch of NKCASEffect in scene 3/state 9.
 * Manager Update and ordinary FXM/particle phases remain separate: the owning
 * scene decides pool removal after the original death flag. No capture inputs. */
export class CharacterSpineWorldEffectPlayback {
    readonly playback: CharacterSpineWorldParticlePlayback;
    private readonly animatorId: string;
    private readonly animation: CharacterSpineAnim2DPlayback;
    private started = false;
    private dead = false;
    private cachedNormalizedTime = 0;
    private updates = 0;
    private animatorSpeed = 1;
    private finalSpeed = 1;
    private gameSpeedType = 0;
    // Open IL003D..008C / 0124..0135, before PlayAnim or first Update.
    private externalTimeScale = f(1.1);
    private particleGameScale = f(1.1);
    private particleAnimationSpeed = 1;
    constructor(catalog: CharacterSpineEffectSceneCatalog, name: string, context: Context) {
        const contract = catalog.nativeAnimationContracts?.[name];
        const published = catalog.worldParticleContracts?.[name];
        if (published && (published.branch !== 'fresh-base-world-v1' || published.sourcePointer !== contract?.sourcePointer))
            throw new Error(`World particle contract does not match the original Animator: ${name}`);
        const base = contract?.states.BASE;
        const animators = catalog.animators.filter(row => row.nodePath === name || row.nodePath.startsWith(`${name}/`));
        const systems = catalog.otherComponents.filter(row => row.type === 'ParticleSystem' && (row.nodePath === name || row.nodePath.startsWith(`${name}/`)));
        if (!contract?.sourcePointer || !base || base.layer !== 0 || base.loop || !(base.length > 0)
            || contract.hasEndAnimation || contract.hasBaseLoopAnimation || contract.particleSystemCount <= 0
            || animators.length !== 1 || animators[0].id !== contract.animatorId
            || animators[0].layers.find(row => row.layer === 0)?.length !== base.length
            || systems.length !== contract.particleSystemCount || systems.some(row => row.fields.simulationSpeed !== 1)
            || Object.entries(contract.states).some(([name, state]) => name !== 'BASE' && state.layer === 0))
            throw new Error(`Unaudited World effect manager animation: ${name}`);
        this.animatorId = contract.animatorId;
        this.playback = new CharacterSpineWorldParticlePlayback(catalog, name, context);
        this.animation = new CharacterSpineAnim2DPlayback({
            playAndEvaluate: (state, speed) => {
                if (state !== 'BASE' || this.started)
                    throw new Error('World Animator state replay requires its source controller renderer');
                this.playback.enable(f(f(.001) * speed), { animatorId: this.animatorId, layer: 0 });
            },
            update: (delta, speed) => { this.playback.prefab.advanceAnimators(delta, speed, delta); },
            layerZero: () => {
                const state = this.playback.prefab.snapshot().animators[this.animatorId]?.find(row => row.layer === 0);
                if (!state)
                    throw new Error('Missing original World effect layer zero');
                return { animationName: 'BASE', normalizedTime: state.normalizedTime };
            },
        });
    }
    enable(animationSpeed = 1) {
        this.validateSpeed(animationSpeed);
        if (this.started)
            throw new Error('World effect pooling/replay requires native verification');
        this.animatorSpeed = f(animationSpeed);
        this.animation.play('BASE', false, this.animatorSpeed);
        this.started = true;
        return this.playback.snapshot();
    }
    advanceManager(delta: number, animationSpeed: number, gameSpeedType: number) {
        this.validateDelta(delta);
        this.validateSpeed(animationSpeed);
        nativeEffectGameSpeedMultiplier(gameSpeedType);
        if (!this.started)
            throw new Error('World effect must be opened and played before Update');
        if (this.dead)
            return;
        const speed = updateNativeEffectPlaybackSpeed(animationSpeed, this.finalSpeed, this.gameSpeedType, gameSpeedType);
        if (speed) {
            this.finalSpeed = speed.final;
            this.animatorSpeed = speed.final;
            this.gameSpeedType = gameSpeedType;
            const multiplier = nativeEffectGameSpeedMultiplier(gameSpeedType);
            if (multiplier !== null) {
                this.externalTimeScale = speed.fxmExternalTimeScale!;
                // Keep source speed and manager factors separate. This audited branch
                // requires source simulationSpeed=1; other source speeds need traces.
                this.particleGameScale = multiplier;
                this.particleAnimationSpeed = speed.final;
            }
        }
        this.animation.setPlaySpeed(this.animatorSpeed);
        this.animation.update(delta);
        this.cachedNormalizedTime = this.animation.snapshot().cachedNormalizedTime;
        this.playback.clearInactiveParticles();
        this.dead = this.dieCheck;
        this.updates++;
    }
    /** Can run while the manager is stopped; cached animation and manager fields
     * stay unchanged. The caller must remove a dead pooled instance separately. */
    advanceComponents(delta: number) {
        this.validateDelta(delta);
        if (!this.started)
            throw new Error('World effect must be activated before component updates');
        this.playback.prefab.advancePlayers(delta, this.externalTimeScale);
        return this.playback.advanceParticles(delta, this.particleGameScale, this.particleAnimationSpeed);
    }
    get dieCheck() { return this.cachedNormalizedTime >= 1 && !this.playback.particlesAlive; }
    /** NKCASEffect.Stop always stops future emission; force sets m_bDie even
     * while particles remain. The owning manager handles removal separately. */
    stop(force: boolean) {
        this.playback.stopEmitting();
        if (force)
            this.dead = true;
    }
    snapshot() {
        return { dead: this.dead, cachedNormalizedTime: this.cachedNormalizedTime, updates: this.updates,
            animatorSpeed: this.animatorSpeed, finalSpeed: this.finalSpeed, gameSpeedType: this.gameSpeedType,
            externalTimeScale: this.externalTimeScale, particleGameScale: this.particleGameScale,
            particleAnimationSpeed: this.particleAnimationSpeed };
    }
    private validateDelta(delta: number) {
        if (!Number.isFinite(delta) || delta < 0)
            throw new Error('Invalid original effect frame delta');
        this.playback.validatePhase(delta);
    }
    private validateSpeed(speed: number) {
        if (!Number.isFinite(speed) || speed <= 0)
            throw new Error('World effect zero/reverse animation speed requires native verification');
    }
}
