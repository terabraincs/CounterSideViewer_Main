import { CharacterSpineEffectPrefab, type CharacterSpineEffectPrefabCatalog, type CharacterSpineEffectPrefabContext } from './characterSpineEffectPrefab';
import { CharacterSpineParticleController, type CharacterParticleSystemControl, type CharacterParticleControllerSource } from './characterSpineParticleController';
import { CharacterSpineWorldParticles, type CharacterWorldParticleSource, type CharacterWorldParticleRenderer } from './characterSpineWorldParticles';
import { characterEffectWorldMatrix } from './characterSpineEffectPose';
import type { CharacterFxmFrame, CharacterFxmVec3, CharacterFxmVec4 } from './characterSpineEffectFxm';
type Vector = {
    x: number;
    y: number;
    z: number;
};
/** Fresh non-looping END controller branch. Pooling/reuse and descendant
 * ParticleSystems still need their own native traces. */
class WorldParticleControl implements CharacterParticleSystemControl {
    kernel: CharacterSpineWorldParticles | null = null;
    randomSeed: number;
    constructor(readonly source: CharacterWorldParticleSource, private readonly gravity: Vector) { this.randomSeed = source.randomSeed; }
    get isStopped() { return !this.kernel || this.kernel.stopped; }
    get isEmitting() { return this.kernel?.emitting ?? false; }
    stop(withChildren: true, clear: boolean) {
        if (!withChildren)
            throw new Error('Original END controller always includes children');
        if (clear)
            this.kernel = null;
        else
            this.kernel?.stopEmitting();
    }
    play(withChildren: true) {
        if (!withChildren)
            throw new Error('Original END controller always includes children');
        if (this.kernel && !this.kernel.stopped)
            return;
        if (this.kernel)
            throw new Error('Completed World ParticleSystem reuse requires native verification');
        this.kernel = new CharacterSpineWorldParticles(this.source, this.randomSeed, this.gravity);
    }
    setUseAutoRandomSeed(value: false) { if (value !== false)
        throw new Error('Original END uses explicit particle seeds'); }
    setPlayOnAwake(value: false) { if (value !== false)
        throw new Error('Original END is started by FXM'); }
    setRandomSeed(value: number) {
        if (this.kernel || !Number.isInteger(value) || value < 0 || value > 0xffffffff)
            throw new Error('Invalid stopped World particle seed assignment');
        this.randomSeed = value;
    }
}
/** Source FXM/Animator -> ParticleSystem control -> live World matrices ->
 * numerical/mesh kernel. Only audited per-prefab contracts or explicit
 * verification catalogs are accepted; no captured poses are inputs. */
export class CharacterSpineWorldParticlePlayback {
    readonly prefab: CharacterSpineEffectPrefab;
    private readonly ports = new Map<string, WorldParticleControl>();
    private readonly renderers = new Map<string, CharacterWorldParticleRenderer>();
    private frame: CharacterFxmFrame;
    private readonly allowLeftFacing: boolean;
    private rootTransform: {
        localPosition: CharacterFxmVec3;
        localRotation: CharacterFxmVec4;
        localScale: CharacterFxmVec3;
    } | null = null;
    constructor(catalog: CharacterSpineEffectPrefabCatalog, name: string, private readonly context: Omit<CharacterSpineEffectPrefabContext, 'particleControllers'> & {
        gravity: Vector;
    }) {
        if (!catalog.particleControlOnly && catalog.worldParticleContracts?.[name]?.branch !== 'fresh-base-world-v1')
            throw new Error('World particle playback requires an audited original prefab contract');
        this.allowLeftFacing = !!catalog.particleControlOnly || catalog.worldParticleContracts?.[name]?.leftFacingVerified === true;
        const inPrefab = (path: string) => path === name || path.startsWith(`${name}/`);
        for (const component of catalog.otherComponents.filter(row => inPrefab(row.nodePath) && row.type === 'ParticleSystem')) {
            if (this.ports.has(component.nodePath))
                throw new Error('Multiple particle systems on one source node');
            this.ports.set(component.nodePath, new WorldParticleControl(component.fields as unknown as CharacterWorldParticleSource, context.gravity));
            const renderers = catalog.otherComponents.filter(row => row.nodePath === component.nodePath && row.type === 'ParticleSystemRenderer');
            if (renderers.length !== 1)
                throw new Error('Original World particle renderer binding is required');
            this.renderers.set(component.nodePath, renderers[0].fields as unknown as CharacterWorldParticleRenderer);
        }
        for (const path of this.ports.keys())
            if ([...this.ports.keys()].some(child => child.startsWith(`${path}/`)))
                throw new Error('Descendant particle control ordering requires native verification');
        const controllers = new Map<string, CharacterSpineParticleController>();
        for (const evaluator of catalog.evaluators.filter(row => inPrefab(row.nodePath) && row.type === 'NKC_FXM_PARTICLE_SYSTEM_RENDERER')) {
            if (evaluator.fields.ActionType !== 0 || evaluator.fields.SeedType !== 1 || !evaluator.targetPaths?.length)
                throw new Error('Unverified World particle controller playback branch');
            controllers.set(evaluator.id, new CharacterSpineParticleController(evaluator.fields as unknown as CharacterParticleControllerSource, evaluator.targetPaths.map(path => {
                const port = path && this.ports.get(path);
                if (!port)
                    throw new Error(`Missing original World particle target ${path}`);
                return port;
            }), context.random));
        }
        this.prefab = new CharacterSpineEffectPrefab(catalog, name, { ...context, particleControllers: controllers });
        this.frame = this.prefab.snapshot();
    }
    enable(activationDelta: number, playedLayer?: {
        animatorId: string;
        layer: number;
    }) {
        this.frame = this.withRoot(this.prefab.enable(activationDelta, playedLayer));
        return this.frame;
    }
    /** EffectStart/owner follow writes before the natural particle phase. Existing
     * World particles retain their positions; only subsequent emission uses it. */
    setRootTransform(position: readonly number[], rotation: readonly number[], scale: readonly number[]) {
        const left = this.allowLeftFacing && rotation[0] === 0 && rotation[1] === 1 && rotation[2] === 0
            && rotation[3] === Math.fround(Math.cos(Math.fround(Math.PI / 2)));
        if (position.length !== 3 || rotation.length !== 4 || scale.length !== 3
            || ![...position, ...rotation, ...scale].every(Number.isFinite)
            || position[2] !== 0 || (!left && rotation.some((value, index) => value !== (index === 3 ? 1 : 0)))
            || !(scale[0] > 0) || scale[0] !== scale[1] || scale[2] !== 1)
            throw new Error('Unverified World effect root placement/rotation/scale');
        this.rootTransform = { localPosition: position.map(Math.fround) as CharacterFxmVec3,
            localRotation: rotation.map(Math.fround) as CharacterFxmVec4, localScale: scale.map(Math.fround) as CharacterFxmVec3 };
        this.frame = this.withRoot(this.prefab.snapshot());
    }
    private withRoot(frame: CharacterFxmFrame): CharacterFxmFrame {
        if (!this.rootTransform)
            return frame;
        const root = this.prefab.source.rootPath;
        return { ...frame, nodes: { ...frame.nodes, [root]: { ...frame.nodes[root], ...this.rootTransform } } };
    }
    advance(delta: number) {
        this.validatePhase(delta, 1, 1);
        this.frame = this.prefab.advance(delta);
        return this.advanceParticles(delta);
    }
    /** Natural Unity particle phase after the separate original manager/FXM
     * updates. NKCASEffect writes sourceSpeed * gameScale * finalSpeed. */
    advanceParticles(delta: number, gameTimeScale = 1, animationSpeed = 1) {
        this.validatePhase(delta, gameTimeScale, animationSpeed);
        this.clearInactiveParticles();
        const matrix = characterEffectWorldMatrix(this.frame);
        for (const [path, port] of this.ports) {
            if (!this.frame.nodes[path].activeInHierarchy) {
                continue;
            }
            port.kernel?.advanceFrame(delta, matrix(path), Math.fround(Math.fround(port.source.simulationSpeed * Math.fround(gameTimeScale)) * Math.fround(animationSpeed)), this.context.maximumParticleDeltaTime);
        }
        return this.frame;
    }
    validatePhase(delta: number, gameTimeScale = 1, animationSpeed = 1) {
        if (Math.fround(delta) > 1)
            throw new Error('World frame exceeds the verified original maximumDeltaTime');
        if (![delta, gameTimeScale, animationSpeed].every(value => Number.isFinite(value) && value >= 0))
            throw new Error('Invalid source World particle phase input');
    }
    snapshot() { return this.frame; }
    /** Animator active tracks invoke Unity's ParticleSystem OnDisable during
     * Animator.Update, before NKCASEffect.DieCheck and the ordinary PS phase. */
    clearInactiveParticles() {
        this.frame = this.withRoot(this.prefab.snapshot());
        for (const [path, port] of this.ports)
            if (!this.frame.nodes[path].activeInHierarchy)
                port.kernel?.clearOnDisable();
    }
    stopEmitting() { for (const port of this.ports.values())
        port.stop(true, false); }
    /** NKCASEffect.DieCheck IL00FD..0163 also checks particleCount when emission is disabled. */
    get particlesAlive() {
        return [...this.ports.values()].some(port => (port.isEmitting && port.source.EmissionModule.enabled) || !!port.kernel?.snapshot().length);
    }
    particleStates(worldToCamera?: readonly number[]) {
        const matrix = characterEffectWorldMatrix(this.frame);
        return [...this.ports].map(([path, port]) => {
            const world = matrix(path);
            if ([1, 4, 6, 9].some(index => world[index] !== 0))
                throw new Error('Unverified World particle matrix decomposition');
            return { path, randomSeed: port.randomSeed, isStopped: port.isStopped, isEmitting: port.isEmitting,
                time: port.kernel?.time ?? 0, particles: port.kernel?.snapshot() ?? [], world,
                // Native inverse world rotation * world matrix (677F10 -> 44C1D0).
                // In the audited 0/180-degree uniform-scale branch its diagonal is positive.
                mesh: port.kernel?.mesh(this.renderers.get(path)!, [Math.abs(world[0]), world[5], Math.abs(world[10])], worldToCamera) ?? null };
        });
    }
}
