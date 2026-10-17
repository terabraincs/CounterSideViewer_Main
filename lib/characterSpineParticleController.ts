import { CharacterSpineEffectRandom } from './characterSpineEffectRandom';
/** Original ParticleSystem API boundary. withChildren is always true in this FXM. */
export interface CharacterParticleSystemControl {
    readonly isStopped: boolean;
    readonly isEmitting: boolean;
    stop(withChildren: true, clear: boolean): void;
    play(withChildren: true): void;
    setUseAutoRandomSeed(value: false): void;
    setPlayOnAwake(value: false): void;
    setRandomSeed(value: number): void;
}
export interface CharacterParticleControllerSource {
    readonly ActionType: number;
    readonly SeedType: number;
    readonly Seed: readonly number[];
}
/** Original NKC_FXM_PARTICLE_SYSTEM_RENDERER player-mode methods.
 * OnExecute only simulates in Unity's editor; in the running client it does
 * nothing. OnReset/OnCompleted are inherited and do not stop the particles.
 */
export class CharacterSpineParticleController {
    private initialized = false;
    constructor(readonly source: CharacterParticleControllerSource, private readonly targets: readonly (CharacterParticleSystemControl | null)[] | null, private readonly random: CharacterSpineEffectRandom) {
        if (!Number.isInteger(source.ActionType) || source.ActionType < 0 || source.ActionType > 3
            || !Number.isInteger(source.SeedType) || source.SeedType < 0 || source.SeedType > 4
            || !Array.isArray(source.Seed) || source.Seed.some(seed => !Number.isInteger(seed) || seed < -2147483648 || seed > 2147483647))
            throw new Error('Invalid original particle controller fields');
    }
    get isInitialized(): boolean { return this.initialized; }
    initialize(): void {
        if (this.targets === null) {
            this.initialized = false;
            return;
        }
        for (const target of this.targets) {
            if (target === null) {
                this.initialized = false;
                return;
            }
            // ParticleSystem.Stop(bool) defaults to StopEmitting, not StopAndClear.
            target.stop(true, false);
            if (target.isStopped) {
                target.setUseAutoRandomSeed(false);
                target.setPlayOnAwake(false);
            }
            this.initialized = true;
        }
    }
    private randomSeed(): number { return this.random.rangeInt(-2147483647, 2147483647); }
    private index(): number {
        // Native GetIndex always samples Random.value, including an empty Seed array.
        return Math.trunc(Math.fround(Math.fround(this.source.Seed.length) * this.random.value()));
    }
    setRandomValue(resample: boolean): void {
        if (!resample || !this.initialized)
            return;
        const sharedSeed = this.randomSeed();
        const sharedIndex = this.index();
        if (this.source.ActionType !== 0 || this.source.SeedType === 0)
            return;
        for (const target of this.targets!) {
            target!.stop(true, true);
            if (!target!.isStopped)
                continue;
            let seed: number;
            if (this.source.SeedType === 1)
                seed = sharedSeed;
            else if (this.source.SeedType === 2)
                seed = this.randomSeed();
            else if (!this.source.Seed.length)
                seed = this.randomSeed();
            else {
                const index = this.source.SeedType === 3 ? sharedIndex : this.index();
                // Native array access throws if Random.value's inclusive endpoint picks Length.
                if (index >= this.source.Seed.length)
                    throw new RangeError('Original particle Seed index is outside the array');
                seed = this.source.Seed[index];
            }
            target!.setRandomSeed(seed >>> 0);
        }
    }
    start(): void {
        if (!this.initialized)
            return;
        for (const target of this.targets!) {
            if (this.source.ActionType === 0)
                target!.play(true);
            else if (this.source.ActionType === 1)
                target!.stop(true, false);
            else if (this.source.ActionType === 2) {
                if (!target!.isEmitting)
                    target!.play(true);
            }
            else if (!target!.isStopped)
                target!.stop(true, false);
        }
    }
}
