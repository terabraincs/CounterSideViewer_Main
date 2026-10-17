import { SwordTrainingParticleRandom as Random, swordParticleLimitRandom, type SwordNativeParticle } from './swordTrainingClientParticles';
import type { CafeStregaCircleParticlesV2 } from './cafeStregaCircleParticlesV2';
import { characterParticleSpeedModifier, characterParticleGradient as gradient, characterParticleReciprocal, characterParticleCircleDirection, characterParticleNormalize, characterParticleMinMaxCurve as curve, characterParticleRenderGradient } from './characterSpineParticleMath';
type Vector = {
    x: number;
    y: number;
    z: number;
};
export type CharacterWorldParticleSource = ConstructorParameters<typeof CafeStregaCircleParticlesV2>[0]['source'] & {
    moveWithTransform: number;
    scalingMode: number;
    VelocityModule: {
        inWorldSpace: boolean;
    };
    InitialModule: {
        randomizeRotationDirection: number;
    };
    ShapeModule: {
        enabled: boolean;
        radius: {
            spread: number;
        };
        arc: {
            spread: number;
        };
        randomDirectionAmount: number;
        sphericalDirectionAmount: number;
        randomPositionAmount: number;
        alignToDirection: boolean;
    };
    EmissionModule: {
        rateOverDistance: CharacterWorldParticleSource['EmissionModule']['rateOverTime'];
    };
    CustomDataModule: {
        mode0: number;
        mode1: number;
        vectorComponentCount0: number;
    };
    UVModule: {
        mode: number;
        timeMode: number;
        flipU: number;
        flipV: number;
    };
};
export type CharacterWorldParticleRenderer = {
    m_RenderMode: number;
    m_SortMode: number;
    m_RenderAlignment: number;
    m_AllowRoll: boolean;
    m_Pivot: Vector;
    m_Flip: Vector;
    m_UseCustomVertexStreams: boolean;
    m_VertexStreams: number[];
    m_MinParticleSize: number;
    m_MaxParticleSize: number;
    m_ApplyActiveColorSpace: boolean;
};
export type CharacterWorldParticle = SwordNativeParticle & {
    rotation: number;
    gravity: number;
    inverseLifetime: number;
    agePercent: number;
};
const f = Math.fround;
const axes = ['x', 'y', 'z'] as const;
const byte = (v: number) => Math.trunc(f(f(Math.max(0, Math.min(1, v)) * 255) + .5));
const salted = (seed: number, salt: number) => new Random((seed + salt) >>> 0);
/** Original World/Circle branch, using native four-lane Circle/initial module math. */
export class CharacterSpineWorldParticles {
    private readonly initial: Random[];
    private readonly shape: Random[];
    private particles: CharacterWorldParticle[] = [];
    private playbackTime = 0;
    private emissionStopped = false;
    private pendingFrameTime = 0;
    private readonly nextCycles: number[];
    constructor(readonly source: CharacterWorldParticleSource, readonly seed: number, private readonly gravity: Vector) {
        const s = source;
        const supportedModules = new Set(['InitialModule', 'ShapeModule', 'EmissionModule', 'SizeModule', 'ColorModule',
            'UVModule', 'VelocityModule', 'ClampVelocityModule', 'CustomDataModule']);
        for (const [name, module] of Object.entries(s))
            if (name.endsWith('Module') && module && typeof module === 'object'
                && 'enabled' in module && module.enabled && !supportedModules.has(name))
                throw new Error(`Unverified World particle module ${name}`);
        if (s.moveWithTransform !== 1 || s.scalingMode !== 0 || s.looping || s.prewarm
            || !s.ShapeModule.enabled || s.ShapeModule.type !== 10 || s.ShapeModule.radius.mode || s.ShapeModule.arc.mode
            || s.ShapeModule.radius.spread || s.ShapeModule.arc.spread || s.ShapeModule.randomDirectionAmount
            || s.ShapeModule.sphericalDirectionAmount || s.ShapeModule.randomPositionAmount || s.ShapeModule.alignToDirection
            || s.ShapeModule.radiusThickness < 0 || s.ShapeModule.radiusThickness > 1
            || axes.some(axis => s.ShapeModule.m_Rotation[axis]) || s.InitialModule.size3D || s.InitialModule.rotation3D
            || s.InitialModule.randomizeRotationDirection || ![0, 3].includes(s.InitialModule.gravityModifier.minMaxState)
            || s.InitialModule.gravitySource || s.NoiseModule.enabled || s.ForceModule.enabled || s.RotationModule.enabled
            || s.ClampVelocityModule.separateAxis || s.ClampVelocityModule.drag.scalar || s.SizeModule.separateAxes
            || s.CustomDataModule.mode0 !== 1 || s.CustomDataModule.mode1 !== 0 || s.CustomDataModule.vectorComponentCount0 !== 2
            || s.EmissionModule.rateOverTime.minMaxState !== 0 || s.EmissionModule.rateOverTime.scalar
            || s.EmissionModule.rateOverDistance.minMaxState !== 0 || s.EmissionModule.rateOverDistance.scalar
            || s.EmissionModule.m_Bursts.some(b => b.probability !== 1 || b.countCurve.minMaxState !== 0))
            throw new Error('World particle source exceeds the measured Circle module branch');
        this.initial = [0, 1, 2, 3].map(lane => new Random(seed, lane));
        this.shape = [0, 1, 2, 3].map(lane => new Random(seed, lane));
        this.nextCycles = s.EmissionModule.m_Bursts.map(() => 0);
    }
    snapshot(): readonly CharacterWorldParticle[] { return this.particles; }
    get time(): number { return this.playbackTime; }
    get emitting(): boolean { return !this.emissionStopped && this.playbackTime < this.source.lengthInSec; }
    get stopped(): boolean { return !this.emitting && !this.particles.length; }
    /** Original Stop(true, StopEmitting) preserves particles and the time cursor;
     * natural simulation stops only when the remaining packed particles expire. */
    stopEmitting(): void { this.emissionStopped = true; }
    /** Original GameObject deactivation clears live particles immediately but
     * preserves the public time cursor and random lanes (native 1 Hz END trace).
     * Reactivation/reuse is a separate guarded lifecycle. */
    clearOnDisable(): void { this.particles = []; this.emissionStopped = true; }
    randomState() { return { initial: this.initial.map(r => r.snapshot()), shape: this.shape.map(r => r.snapshot()) }; }
    /** GetCurrentSize3D/GetCurrentColor API branch, whose input is the public
     * Particle lifetime pair rather than the internal percentage-age array. */
    currentAppearance(p: CharacterWorldParticle) {
        const age = p.startLifetime ? Math.max(0, f(f(p.startLifetime - p.remainingLifetime) / p.startLifetime)) : 0;
        return this.appearanceAt(p, age);
    }
    renderAppearance(p: CharacterWorldParticle) {
        const age = Math.max(0, f(p.agePercent * f(.01))), s = this.source;
        const size = this.appearanceAt(p, age).size;
        const color = { ...p.startColor };
        if (!s.ColorModule.enabled)
            return { size, color };
        const factor = characterParticleRenderGradient(s.ColorModule.gradient.maxGradient, age);
        // Native SIMD Color32 product: ((a*b+128) + ((a*b+128)>>8))>>8.
        for (const key of ['r', 'g', 'b', 'a'] as const) {
            const product = color[key] * factor[key] + 128;
            color[key] = (product + (product >> 8)) >> 8;
        }
        return { size, color };
    }
    /** Original World-aligned unrotated billboards; source emitter facing does
     * not rotate the billboard. The explicit orthographic camera determines sorting. */
    mesh(renderer: CharacterWorldParticleRenderer, lossyScale: readonly number[], worldToCamera?: readonly number[]) {
        const uv = this.source.UVModule;
        if (renderer.m_RenderMode !== 0 || renderer.m_SortMode !== 1 || renderer.m_RenderAlignment !== 1
            || renderer.m_AllowRoll || axes.some(axis => renderer.m_Pivot[axis] || renderer.m_Flip[axis])
            || renderer.m_ApplyActiveColorSpace || renderer.m_MinParticleSize !== 0 || renderer.m_MaxParticleSize !== 10
            || !renderer.m_UseCustomVertexStreams || JSON.stringify(renderer.m_VertexStreams) !== '[0,3,4,32]'
            || lossyScale.length !== 3 || !(lossyScale[0] > 0) || lossyScale[0] !== lossyScale[1] || lossyScale[2] !== 1
            || this.particles.some(p => p.rotation !== 0 || (!worldToCamera && p.position.z !== 0))
            || !uv.enabled || uv.mode !== 0 || uv.timeMode !== 0 || uv.animationType !== 0 || uv.flipU || uv.flipV
            || uv.frameOverTime.minMaxState !== 0 || uv.frameOverTime.scalar !== 0 || uv.startFrame.minMaxState !== 0
            || uv.cycles !== 1 || ![1, 2].includes(uv.tilesX) || uv.tilesY !== 2)
            throw new Error('Unverified World particle billboard/UV branch');
        const positions: Vector[] = [], colors: CharacterWorldParticle['startColor'][] = [];
        const uv0: {
            x: number;
            y: number;
            z: number;
            w: number;
        }[] = [], triangles: number[] = [];
        const tile = Math.floor(f(uv.startFrame.scalar * uv.tilesX * uv.tilesY));
        const left = f((tile % uv.tilesX) / uv.tilesX), right = f(left + f(1 / uv.tilesX));
        const top = f(1 - f(Math.floor(tile / uv.tilesX) / uv.tilesY)), bottom = f(top - f(1 / uv.tilesY));
        // Native D65569..D65683: orthographic camera-space depth + near plane,
        // capped at -1e-6; D74920 compares the raw uint32 key then uint32 index,
        // both descending. Preserve float rounding before converting the key bits.
        if (worldToCamera && (worldToCamera.length !== 16 || worldToCamera[2] !== 0 || worldToCamera[6] !== 0 || worldToCamera[10] !== -1
            || worldToCamera[14] !== -1000))
            throw new Error('Unverified particle sort camera orientation');
        const words = new DataView(new ArrayBuffer(4));
        const key = (index: number) => {
            const z = this.particles[index].position.z;
            // CharacterEffectProbe's verified viewer camera has nearClipPlane=.1.
            // Camera data +E4 -> render job +13C (3FBB36/D6A8BE), added before the particle.
            words.setFloat32(0, Math.min(f(f(z * worldToCamera![10]) + f(f(worldToCamera![14]) + f(.1))), f(-1e-6)), true);
            return words.getUint32(0, true);
        };
        const order = this.particles.map((_p, index) => index);
        if (worldToCamera)
            order.sort((a, b) => key(b) - key(a) || b - a);
        else
            order.reverse();
        for (const index of order) {
            const p = this.particles[index], appearance = this.renderAppearance(p);
            const half = f(f(appearance.size * lossyScale[0]) * .5), start = positions.length;
            for (const [sx, sy] of [[-1, 1], [1, 1], [1, -1], [-1, -1]]) {
                positions.push({ x: f(p.position.x + sx * half), y: f(p.position.y + sy * half), z: p.position.z });
                colors.push(appearance.color);
            }
            for (const [x, y] of [[left, top], [right, top], [right, bottom], [left, bottom]])
                uv0.push({ x, y, z: p.custom1!.x, w: p.custom1!.y });
            triangles.push(start, start + 1, start + 2, start, start + 2, start + 3);
        }
        return { positions, colors, uv0, triangles };
    }
    private appearanceAt(p: CharacterWorldParticle, age: number) {
        const s = this.source;
        if (s.SizeModule.enabled && s.SizeModule.curve.minMaxState !== 1
            || s.ColorModule.enabled && s.ColorModule.gradient.minMaxState !== 1)
            throw new Error('Unverified World particle appearance branch');
        const size = f(p.startSize3D.x * (s.SizeModule.enabled ? Math.max(0, curve(s.SizeModule.curve, age)) : 1));
        const color = { ...p.startColor };
        if (s.ColorModule.enabled) {
            const factor = gradient(s.ColorModule.gradient.maxGradient, age);
            // Original D1FC3C..D1FCA6 multiplies Color32 using (factor + 1)/256.
            for (const key of ['r', 'g', 'b', 'a'] as const)
                color[key] = p.startColor[key] * (byte(factor[key]) + 1) >> 8;
        }
        return { size, color };
    }
    private direction(v: Vector, m: ArrayLike<number>): Vector {
        // Original native velocity job transforms local XYZ through the current matrix.
        return { x: f(f(v.x * m[0]) + f(f(v.y * m[4]) + f(v.z * m[8]))),
            y: f(f(v.x * m[1]) + f(f(v.y * m[5]) + f(v.z * m[9]))),
            z: f(f(v.x * m[2]) + f(f(v.y * m[6]) + f(v.z * m[10]))) };
    }
    advance(delta: number, localToWorld: ArrayLike<number>, simulationSpeed = this.source.simulationSpeed): void {
        this.validateStep(delta, localToWorld, simulationSpeed);
        this.advanceSimulation(f(f(delta) * f(simulationSpeed)), localToWorld);
    }
    /** Natural Unity PlayerLoop, D8CD30..D8CD55 / D7C07E..D7C098:
     * split the scaled simulation time by ceil(total / maximumParticleDeltaTime).
     * D8D368..D8D6B4 consumes a float32 accumulator down to 1e-6, retaining
     * smaller remainders. Fixed-step/prewarm and >5-second catch-up are excluded. */
    advanceFrame(delta: number, localToWorld: ArrayLike<number>, simulationSpeed: number, maximumParticleDeltaTime: number): void {
        this.validateStep(delta, localToWorld, simulationSpeed);
        if (!(maximumParticleDeltaTime > 0) || !Number.isFinite(maximumParticleDeltaTime))
            throw new Error('Invalid original maximum particle step');
        const total = f(f(delta) * f(simulationSpeed)), maximum = f(maximumParticleDeltaTime);
        const step = total > maximum ? f(total / Math.ceil(f(total / maximum))) : total;
        if (step < f(1e-5) || this.stopped)
            return;
        const accumulated = f(this.pendingFrameTime + total);
        if (accumulated > 5)
            throw new Error('Original particle long catch-up branch requires native verification');
        this.pendingFrameTime = accumulated;
        while (this.pendingFrameTime >= f(1e-6)) {
            const consumed = Math.min(step, this.pendingFrameTime);
            this.advanceSimulation(consumed, localToWorld);
            this.pendingFrameTime = f(this.pendingFrameTime - consumed);
        }
    }
    private validateStep(delta: number, localToWorld: ArrayLike<number>, simulationSpeed: number): void {
        if (!Number.isFinite(delta) || delta < 0 || !Number.isFinite(simulationSpeed) || simulationSpeed < 0 || localToWorld.length !== 16)
            throw new Error('Invalid native World particle frame input');
        const left = localToWorld[0] <= 0 && localToWorld[10] === -1
            && localToWorld[8] === f(2 * f(Math.cos(f(Math.PI / 2))));
        if ([1, 4, 6, 9].some(index => localToWorld[index] !== 0)
            || (!left && (localToWorld[2] !== 0 || localToWorld[8] !== 0)))
            throw new Error('World Circle rotation requires further native frame verification');
    }
    private advanceSimulation(dt: number, localToWorld: ArrayLike<number>): void {
        if (!dt || this.stopped)
            return;
        for (let index = 0; index < this.particles.length; index++) {
            const p = this.particles[index];
            this.move(p, dt, localToWorld, this.particles[index - index % 4].randomSeed);
            this.ageParticle(p, dt);
        }
        // Native GetParticles captures retain packed storage: the final live entry
        // fills each expired slot, rather than preserving the order of survivors.
        // UnityPlayer 0x180D7F207..0x180D7F24F checks lanes 3,2,1,0,
        // then checks the same packet again after swaps before moving ahead.
        for (let first = 0; first < this.particles.length;) {
            let removed = false;
            for (let lane = 3; lane >= 0; lane--) {
                const index = first + lane;
                if (index >= this.particles.length || this.particles[index].agePercent <= 100)
                    continue;
                const last = this.particles.pop()!;
                if (index < this.particles.length)
                    this.particles[index] = last;
                removed = true;
            }
            if (!removed)
                first += 4;
        }
        if (this.source.EmissionModule.enabled && this.emitting) {
            this.source.EmissionModule.m_Bursts.forEach((burst, index) => {
                for (;;) {
                    const cycle = this.nextCycles[index];
                    if (burst.cycleCount && cycle >= burst.cycleCount)
                        break;
                    const at = f(burst.time + f(cycle * burst.repeatInterval));
                    const end = f(this.playbackTime + dt);
                    if (at >= this.source.lengthInSec || at >= end)
                        break;
                    // Native D1FE70..D1FF16: start <= burst < end, then retain the
                    // fraction of this simulation step after the burst time. At 1.1x
                    // game speed this can be a partial step; using a full dt is wrong.
                    const fraction = f(1 - Math.max(0, Math.min(1, f(f(at - this.playbackTime) / f(end - this.playbackTime)))));
                    this.emit(burst.countCurve.scalar, f(dt * fraction), localToWorld);
                    this.nextCycles[index]++;
                }
            });
        }
        this.playbackTime = Math.min(this.source.lengthInSec, f(this.playbackTime + dt));
    }
    private emit(count: number, age: number, m: ArrayLike<number>): void {
        const init = this.source.InitialModule, shape = this.source.ShapeModule;
        const emitted: CharacterWorldParticle[] = [];
        for (let first = 0; first < count; first += 4) {
            const draws = this.initial.map(r => Array.from({ length: 5 }, () => r.nextUInt()));
            const points = this.shape.map(r => [r.nextFloat(), r.nextFloat()]);
            for (let lane = 0; lane < Math.min(4, count - first); lane++) {
                const randomSeed = draws[lane][0], draw = (index: number) => f((draws[lane][index] & 0x7fffff) * f(1 / 0x7fffff));
                const inner = f(1 - shape.radiusThickness), innerSquared = f(inner * inner);
                const radius = f(f(Math.sqrt(f(innerSquared + f(f(1 - innerSquared) * points[lane][1])))) * shape.radius.value);
                const circle = characterParticleCircleDirection(points[lane][0], shape.arc.value);
                const direction = { x: f(circle.x * shape.m_Scale.x), y: f(circle.y * shape.m_Scale.y), z: 0 };
                const normal = characterParticleNormalize({ ...circle, z: 0 });
                const transformedNormal = this.direction(characterParticleNormalize({ x: f(normal.x * shape.m_Scale.x),
                    y: f(normal.y * shape.m_Scale.y), z: f(normal.z * shape.m_Scale.z) }), m);
                const speed = curve(init.startSpeed, this.playbackTime, salted(randomSeed, 0x96aa4de3).nextFloat());
                const inverseLifetime = characterParticleReciprocal(curve(init.startLifetime, this.playbackTime, draw(1)));
                const lifetime = f(1 / inverseLifetime);
                const size = curve(init.startSize, this.playbackTime, draw(2));
                const color = init.startColor.minMaxState === 0 ? init.startColor.maxColor
                    : init.startColor.minMaxState === 4 ? gradient(init.startColor.maxGradient, draw(4)) : null;
                if (!color)
                    throw new Error('Unaudited World Circle initial color mode');
                const position = this.direction({ x: f(shape.m_Position.x + f(direction.x * radius)),
                    y: f(shape.m_Position.y + f(direction.y * radius)), z: shape.m_Position.z }, m);
                for (let axis = 0; axis < 3; axis++)
                    position[axes[axis]] = f(position[axes[axis]] + m[12 + axis]);
                const p: CharacterWorldParticle = { randomSeed, position,
                    velocity: { x: f(transformedNormal.x * speed), y: f(transformedNormal.y * speed), z: f(transformedNormal.z * speed) },
                    animatedVelocity: { x: 0, y: 0, z: 0 }, startLifetime: lifetime, remainingLifetime: lifetime, inverseLifetime, agePercent: 0,
                    startSize3D: { x: size, y: size, z: size }, startColor: { r: byte(color.r), g: byte(color.g), b: byte(color.b), a: byte(color.a) },
                    rotation: curve(init.startRotation, this.playbackTime, draw(3)),
                    gravity: curve(init.gravityModifier, this.playbackTime, salted(randomSeed, 0xe2b7c3c3).nextFloat()) };
                emitted.push(p);
            }
        }
        // Original Emit starts with aligned packets, then places the final values
        // into the unaligned leading slots (native 1/2/3/30 + 15 Emit captures).
        for (let index = 0; index < emitted.length; index++) {
            const p = emitted[index];
            this.move(p, age, m, emitted[index - index % 4].randomSeed, true);
            this.ageParticle(p, age);
        }
        const leading = Math.min(count, (4 - this.particles.length % 4) % 4);
        if (leading)
            emitted.unshift(...emitted.splice(emitted.length - leading, leading));
        this.particles.push(...emitted.slice(0, init.maxNumParticles - this.particles.length));
    }
    private ageParticle(p: CharacterWorldParticle, dt: number): void {
        // Native storage is percentage age + reciprocal lifespan. GetParticles
        // reconstructs lifetime at 0x180D94C98..0x180D94CBE.
        p.agePercent = f(p.agePercent + f(f(dt * 100) * p.inverseLifetime));
        p.remainingLifetime = f(f(1 - f(p.agePercent * f(.01))) * p.startLifetime);
    }
    private move(p: CharacterWorldParticle, dt: number, m: ArrayLike<number>, batchSeed: number, emitting = false): void {
        const s = this.source, age = f(p.agePercent * f(.01));
        p.custom1 = { x: curve(s.CustomDataModule.vector0_0, age), y: curve(s.CustomDataModule.vector0_1, age) };
        const random = salted(p.randomSeed, 0xe0fbd834), localVelocity = { x: 0, y: 0, z: 0 };
        for (const axis of axes)
            localVelocity[axis] = s.VelocityModule.enabled ? curve(s.VelocityModule[axis], age, random.nextFloat()) : 0;
        p.animatedVelocity = s.VelocityModule.inWorldSpace ? localVelocity : this.direction(localVelocity, m);
        const total = { x: 0, y: 0, z: 0 };
        for (const axis of axes) {
            // Native gravity two-constant branch D4FA73..D4FA7E applies dt
            // to world gravity before multiplying the per-particle modifier D4FDE9.
            p.velocity[axis] = f(p.velocity[axis] + f(f(this.gravity[axis] * dt) * p.gravity));
            total[axis] = f(p.velocity[axis] + p.animatedVelocity[axis]);
        }
        const limit = s.ClampVelocityModule;
        if (limit.enabled) {
            const speed = f(Math.sqrt(f(f(total.x * total.x) + f(f(total.y * total.y) + f(total.z * total.z)))));
            const maximum = curve(limit.magnitude, age, swordParticleLimitRandom(p.randomSeed));
            let clamped = speed;
            if (speed > maximum && speed > 0) {
                const damping = f(1 - f(Math.pow(f(1 - limit.dampen), f(Math.abs(dt) * 30))));
                clamped = f(speed + f(f(maximum - speed) * damping));
            }
            // Native 0x180D3FDC5..0x180D3FE7D normalizes every lane then
            // multiplies by its (possibly unchanged) magnitude before subtracting
            // animated velocity. Skipping that round trip changes even unclamped lanes.
            const normal = characterParticleNormalize(total);
            for (const axis of axes) {
                total[axis] = f(normal[axis] * clamped);
                p.velocity[axis] = f(total[axis] - p.animatedVelocity[axis]);
                total[axis] = f(p.velocity[axis] + p.animatedVelocity[axis]);
            }
        }
        // UnityPlayer 0x18118467D broadcasts lane zero with pshufd ... ,0.
        const modifier = s.VelocityModule.enabled ? characterParticleSpeedModifier(s.VelocityModule.speedModifier, age, batchSeed) : 1;
        // Emission job 0x180D8A843 multiplies dt by modifier before totalVelocity;
        // subsequent frames 0x180D7EABB multiply totalVelocity by modifier first.
        for (const axis of axes)
            p.position[axis] = f(p.position[axis] + (emitting
                ? f(total[axis] * f(dt * modifier)) : f(f(total[axis] * modifier) * dt)));
        p.rotation3D = { x: 0, y: 0, z: f(p.rotation * f(180 / Math.PI)) };
    }
}
