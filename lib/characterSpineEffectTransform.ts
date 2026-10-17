import { CHARACTER_PARTICLE_RCPPS } from './characterSpineParticleReciprocalTable';
type V3 = [
    number,
    number,
    number
];
type V4 = [
    number,
    number,
    number,
    number
];
type M3 = [
    V4,
    V4,
    V4
];
export interface CharacterEffectTransformInput {
    readonly id: string;
    parent: string | null;
    position: V3;
    rotation: V4;
    scale: V3;
    active: boolean;
}
const f = Math.fround;
const add = (a: V4, b: V4) => a.map((value, i) => f(value + b[i])) as V4;
const sub = (a: V4, b: V4) => a.map((value, i) => f(value - b[i])) as V4;
const mul = (a: V4, b: V4) => a.map((value, i) => f(value * b[i])) as V4;
const splat = (value: number): V4 => [value, value, value, value];
const shuffle = (v: V4, mask: number): V4 => [v[mask & 3], v[(mask >> 2) & 3], v[(mask >> 4) & 3], v[mask >> 6]];
const vector = (v: V3): V4 => [...v, 0];
const xyz = (v: V4): V3 => [v[0], v[1], v[2]];
const conjugate = (q: V4): V4 => [-q[0], -q[1], -q[2], q[3]];
const C0: V4 = [-2, 2, -2, 0], C1: V4 = [-2, -2, 2, 0], C2: V4 = [2, -2, -2, 0];
// UnityPlayer 2022.3.62f2, RVA 0x44BED0. Each operation corresponds to a
// rounded SIMD instruction. Matrix multiplication alone does not reproduce
// Transform.get_position, whose quaternion/vector operation order differs.
function rotationColumns(q: V4): M3 {
    const a = shuffle(q, 0x71), b = shuffle(q, 0x8e), c = shuffle(q, 0xdb);
    return [
        add(add(mul(mul(splat(q[1]), C0), a), mul(mul(splat(q[2]), [-2, 2, 2, 0]), b)), [1, 0, 0, 0]),
        add(add(mul(mul(splat(q[2]), C1), c), mul(mul(splat(q[0]), [2, -2, 2, 0]), a)), [0, 1, 0, 0]),
        add(add(mul(mul(splat(q[0]), C2), b), mul(mul(splat(q[1]), [2, 2, -2, 0]), c)), [0, 0, 1, 0]),
    ];
}
function rotate(q: V4, v: V4): V4 {
    const a = shuffle(q, 0x71), b = shuffle(q, 0x8e), c = shuffle(q, 0xdb);
    const x = sub(mul(mul(splat(q[1]), C0), a), mul(mul(splat(q[2]), C2), b));
    const y = sub(mul(mul(splat(q[2]), C1), c), mul(mul(splat(q[0]), C0), a));
    const z = sub(mul(mul(splat(q[0]), C2), b), mul(mul(splat(q[1]), C1), c));
    return add(add(mul(x, splat(v[0])), v), add(mul(y, splat(v[1])), mul(z, splat(v[2]))));
}
function multiplyQuaternion(a: V4, b: V4): V4 {
    // RVA 0x4C99D..0x4C9F0 (also inverse traversal 0x4D65C).
    const t0 = mul(shuffle(b, 0x88), a), t1 = mul([a[0], a[1], a[0], a[1]], shuffle(b, 0xf5));
    const t2 = mul(shuffle(a, 0xaf), b);
    return conjugate(shuffle(sub(sub(sub(mul(shuffle(b, 0xd2), a), shuffle(t0, 0x1e)), shuffle(t2, 0x8d)), shuffle(t1, 0x63)), 0xd2));
}
/** Original Transform world rotation, local-to-root quaternion traversal. */
export function characterEffectWorldQuaternion(localToRoot: readonly (readonly number[])[]): V4 {
    if (!localToRoot.length || localToRoot.some(row => row.length !== 4 || row.some(value => !Number.isFinite(f(value)))))
        throw new Error('Explicit original rotation chain required');
    let rotation = localToRoot[0].map(f) as V4;
    for (const parent of localToRoot.slice(1))
        rotation = multiplyQuaternion(parent.map(f) as V4, rotation);
    return rotation;
}
function normalizedQuaternion(q: V4): V4 {
    // RVA 0x4CE96..0x4CECD: four lane-specific sums, SQRTPS then DIVPS.
    const squared = mul(q, q), pairs = add(shuffle(squared, 0x39), squared);
    const lengths = add(shuffle(pairs, 0x4e), pairs);
    return q.map((value, i) => lengths[i] > f(1e-30) ? f(value / f(Math.sqrt(lengths[i]))) : (i === 3 ? 1 : 0)) as V4;
}
function matrixProduct(a: M3, b: M3): M3 {
    return b.map(v => add(mul(a[0], splat(v[0])), add(mul(a[1], splat(v[1])), mul(a[2], splat(v[2]))))) as M3;
}
const reciprocalBits = new Uint32Array(1), reciprocalFloat = new Float32Array(reciprocalBits.buffer);
function inverseScale(value: number): number {
    // 0x44C6CC..0x44C754 / 0x4D534..0x4D5E8. Same original RCPPS
    // table and two biased Newton refinements as the particle native path.
    if (Math.abs(value) < f(1e-9))
        return 0;
    reciprocalFloat[0] = Math.abs(value);
    const bits = reciprocalBits[0], exponent = (bits >>> 23) & 255;
    if (exponent === 0 || exponent === 255)
        throw new Error('Unverified Transform reciprocal input');
    reciprocalBits[0] = CHARACTER_PARTICLE_RCPPS[(bits & 0x7fffff) >>> 11];
    const estimate = f(reciprocalFloat[0] * 2 ** (127 - exponent)) * (value < 0 ? -1 : 1);
    const first = f(f(2.000000476837158 - f(value * estimate)) * estimate);
    return f(first * f(2 - f(value * first)));
}
/** Source Transform hierarchy and native SetParent(worldPositionStays=true).
 * Verified source domain uses positive scales. Zero/negative scales and missing
 * parents are rejected; this is not a generic substitute for all Unity objects.
 */
export class CharacterSpineEffectTransform {
    private readonly nodes = new Map<string, CharacterEffectTransformInput>();
    private readonly changed = new Set<string>();
    private readonly onParentChanged?: (id: string) => void;
    constructor(input: readonly CharacterEffectTransformInput[], onParentChanged?: (id: string) => void) {
        this.onParentChanged = onParentChanged;
        for (const node of input) {
            if (!node.id || this.nodes.has(node.id) || typeof node.active !== 'boolean'
                || node.position.length !== 3 || node.rotation.length !== 4 || node.scale.length !== 3
                || [...node.position, ...node.rotation, ...node.scale].some(value => !Number.isFinite(f(value)))
                || node.scale.some(value => f(value) <= 0))
                throw new Error('Unverified source Transform input');
            this.nodes.set(node.id, { ...node, position: node.position.map(f) as V3,
                rotation: node.rotation.map(f) as V4, scale: node.scale.map(f) as V3 });
            this.changed.add(node.id);
        }
        for (const id of this.nodes.keys())
            this.chain(id);
    }
    private node(id: string): CharacterEffectTransformInput {
        const node = this.nodes.get(id);
        if (!node)
            throw new Error(`Missing original Transform ${id}`);
        return node;
    }
    private chain(id: string): CharacterEffectTransformInput[] {
        const result: CharacterEffectTransformInput[] = [], visited = new Set<string>();
        for (let next: string | null = id; next !== null;) {
            if (visited.has(next))
                throw new Error('Cyclic Transform parent');
            visited.add(next);
            const node = this.node(next);
            result.push(node);
            next = node.parent;
        }
        return result;
    }
    active(id: string): boolean { return this.chain(id).every(node => node.active); }
    hasChanged(id: string): boolean { this.node(id); return this.changed.has(id); }
    /** Original set_hasChanged changes only this Transform's flag (116FD6..11701A). */
    setChanged(id: string, value: boolean): void {
        this.node(id);
        if (value)
            this.changed.add(id);
        else
            this.changed.delete(id);
    }
    private markSubtreeChanged(id: string): void {
        // Native local setters 4CA50/4CB20/4CC30 mark the affected descendants.
        for (const candidate of this.nodes.keys())
            if (this.chain(candidate).some(node => node.id === id))
                this.changed.add(candidate);
    }
    setActive(id: string, active: boolean): void { this.node(id).active = active; }
    setPosition(id: string, value: V3): void {
        if (value.length !== 3 || value.some(v => !Number.isFinite(f(v))))
            throw new Error('Invalid Transform position');
        const node = this.node(id), next = value.map(f) as V3;
        if (next.some((component, axis) => component !== node.position[axis]))
            this.markSubtreeChanged(id);
        node.position = next;
    }
    setScale(id: string, value: V3): void {
        if (value.length !== 3 || value.some(v => !Number.isFinite(f(v)) || f(v) <= 0))
            throw new Error('Unverified Transform scale');
        const node = this.node(id), next = value.map(f) as V3;
        if (next.some((component, axis) => component !== node.scale[axis]))
            this.markSubtreeChanged(id);
        node.scale = next;
    }
    /** Copy an already stored source localRotation; do not normalize it twice. */
    setRotation(id: string, value: V4): void {
        if (value.length !== 4 || value.some(v => !Number.isFinite(f(v))))
            throw new Error('Invalid Transform rotation');
        const node = this.node(id), next = value.map(f) as V4;
        if (next.some((component, axis) => component !== node.rotation[axis]))
            this.markSubtreeChanged(id);
        node.rotation = next;
    }
    restoreIdentityEuler(id: string): void { this.setRotation(id, [0, 0, 0, 1]); }
    worldPose(id: string): {
        position: V3;
        rotation: V4;
    } {
        const [node, ...parents] = this.chain(id);
        let position = vector(node.position), rotation = [...node.rotation] as V4;
        for (const parent of parents) {
            position = add(rotate(parent.rotation, mul(vector(parent.scale), position)), vector(parent.position));
            rotation = multiplyQuaternion(parent.rotation, rotation);
        }
        return { position: xyz(position), rotation };
    }
    private worldRotationScale(id: string): M3 {
        const local = (node: CharacterEffectTransformInput) => rotationColumns(node.rotation).map((v, i) => mul(v, splat(node.scale[i]))) as M3;
        const [node, ...parents] = this.chain(id);
        let matrix = local(node);
        for (const parent of parents)
            matrix = matrixProduct(local(parent), matrix);
        return matrix;
    }
    setParent(id: string, parentId: string | null): void {
        const node = this.node(id);
        if (node.parent === parentId)
            return;
        if (parentId !== null && this.chain(parentId).some(parent => parent.id === id))
            throw new Error('Cyclic Transform reparent');
        const world = this.worldPose(id), inverseRotation = rotationColumns(conjugate(world.rotation));
        const savedScaleMatrix = matrixProduct(inverseRotation, this.worldRotationScale(id));
        let position = vector(world.position), rotation = world.rotation;
        if (parentId !== null)
            for (const parent of this.chain(parentId).reverse()) {
                position = mul(rotate(conjugate(parent.rotation), sub(position, vector(parent.position))), [...parent.scale.map(inverseScale), 0] as V4);
                rotation = multiplyQuaternion(conjugate(parent.rotation), rotation);
            }
        node.parent = parentId;
        node.position = xyz(position);
        node.rotation = normalizedQuaternion(rotation);
        let scale = savedScaleMatrix.map((v, i) => v[i]) as V3;
        if (parentId !== null) {
            const denominator = matrixProduct(inverseRotation, matrixProduct(this.worldRotationScale(parentId), rotationColumns(node.rotation)));
            scale = scale.map((value, i) => f(value * inverseScale(denominator[i][i]))) as V3;
        }
        node.scale = scale;
        this.markSubtreeChanged(id);
        this.onParentChanged?.(id);
    }
    snapshot(id: string) {
        const node = this.node(id), world = this.worldPose(id);
        return { parent: node.parent, localPosition: [...node.position], localRotation: [...node.rotation], localScale: [...node.scale],
            worldPosition: world.position, worldRotation: world.rotation, active: this.active(id) };
    }
}
/** Original NKC_FXM_PLAYER World-space parent binding, without choosing an
 * automatic Unity callback schedule or supplying evaluator/clock state.
 * Source players currently verified here capture identity local Euler angles.
 */
export class CharacterSpineEffectWorldBinding {
    private readonly graph: CharacterSpineEffectTransform;
    private readonly node: string;
    private readonly world: string | null;
    private capturedParent: string | null = null;
    private capturedPosition: V3 = [0, 0, 0];
    private isLocal = false;
    constructor(graph: CharacterSpineEffectTransform, node: string, world: string | null) {
        this.graph = graph;
        this.node = node;
        this.world = world;
    }
    captureTransform(): void {
        const pose = this.graph.snapshot(this.node);
        if (pose.parent === null)
            throw new Error('Unverified FXM captured-parent destruction branch');
        if (pose.localRotation.some((value, i) => value !== (i === 3 ? 1 : 0)))
            throw new Error('Unverified FXM captured local Euler rotation');
        this.capturedParent = pose.parent;
        this.capturedPosition = [...pose.localPosition] as V3;
    }
    private resetTransform(): void {
        if (this.capturedParent === null)
            throw new Error('Unverified FXM missing captured parent');
        this.graph.setParent(this.node, this.capturedParent);
        this.graph.setPosition(this.node, this.capturedPosition);
        this.graph.restoreIdentityEuler(this.node);
        this.isLocal = true;
    }
    beforeUpdate(playbackTime: number): void {
        // Original UpdateInternal, after the onUpdate/init guard, before evaluators.
        if (playbackTime !== 0)
            return;
        if (!this.isLocal)
            this.resetTransform();
        if (this.isLocal && this.graph.active(this.node)) {
            this.graph.setParent(this.node, this.world);
            this.isLocal = false;
        }
    }
    lateUpdate(isStopped: boolean, onUpdate: boolean): void {
        if (!this.isLocal && isStopped && !onUpdate)
            this.resetTransform();
    }
    snapshot() {
        return { isLocal: this.isLocal, capturedParent: this.capturedParent,
            capturedPosition: [...this.capturedPosition], capturedEuler: [0, 0, 0] };
    }
}
