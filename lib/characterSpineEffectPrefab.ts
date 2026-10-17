import { CharacterSpineEffectFxm, type CharacterFxmContext, type CharacterFxmFields, type CharacterFxmFrame, type CharacterFxmNode, type CharacterFxmSource } from './characterSpineEffectFxm';
import { CharacterSpineEffectRandom } from './characterSpineEffectRandom';
import type { CharacterEffectAnimatorSource } from './characterSpineEffectAnimator';
interface SourceReference {
    field: string;
    cab: string;
    pathId: string;
    resolved: boolean;
}
interface SourceComponent {
    id: string;
    nodePath: string;
    type: string;
    fields: CharacterFxmFields;
    references: readonly SourceReference[];
}
interface SourceNode extends CharacterFxmNode {
    readonly children: readonly string[];
    readonly componentIds: readonly string[];
    readonly sourceId?: string;
    readonly sourceHierarchyPath?: string;
}
export interface CharacterSpineEffectPrefabCatalog extends CharacterFxmSource {
    readonly particleControlOnly?: boolean;
    /** Per-prefab promotion after original manager, particles and GPU verification. */
    readonly worldParticleContracts?: Readonly<Record<string, {
        readonly branch: 'fresh-base-world-v1';
        readonly sourcePointer: string;
        readonly leftFacingVerified?: true;
    }>>;
    readonly nodes: readonly SourceNode[];
    readonly prefabs: readonly {
        name: string;
        cab: string;
        pathId: string;
    }[];
    readonly otherComponents: readonly SourceComponent[];
    /** Explicit one-layer controllers used only by the separate lifecycle path. */
    readonly manualAnimators?: readonly CharacterEffectAnimatorSource[];
}
export interface CharacterSpineEffectPrefabSource extends CharacterFxmSource {
    readonly rootPath: string;
    readonly randomActivators: readonly {
        id: string;
        nodePath: string;
        targetPath: string;
        rate: number;
        enabled: boolean;
    }[];
    readonly distanceSorters: readonly {
        id: string;
        nodePath: string;
        distance: number;
        enabled: boolean;
    }[];
}
/** Resolve an exact prefab and its original Transform children; no name/substring aliases. */
export function selectCharacterSpineEffectPrefab(catalog: CharacterSpineEffectPrefabCatalog, name: string): CharacterSpineEffectPrefabSource {
    const matches = catalog.prefabs.filter(prefab => prefab.name === name);
    if (matches.length !== 1)
        throw new Error(`Missing/ambiguous source effect prefab ${name}`);
    const allNodes = new Map(catalog.nodes.map(node => [node.path, node]));
    const selected: SourceNode[] = [];
    const paths = new Set<string>();
    function visit(path: string, parent: string | null): void {
        const node = allNodes.get(path);
        if (!node || node.parentPath !== parent || paths.has(path))
            throw new Error(`Invalid source effect hierarchy ${path}`);
        paths.add(path);
        selected.push(node);
        for (const child of node.children)
            visit(child, path);
    }
    visit(matches[0].name, null);
    const components = [...catalog.players, ...catalog.evaluators, ...catalog.otherComponents];
    const gameObjects = new Map<string, string>();
    for (const component of components) {
        const pointer = component.fields.m_GameObject as {
            m_FileID: number;
            m_PathID: string;
        };
        if (!pointer || pointer.m_FileID !== 0)
            throw new Error('Unsupported source component GameObject pointer');
        const key = `${component.id.split(':')[0].toLowerCase()}:${pointer.m_PathID}`;
        const prior = gameObjects.get(key);
        if (prior && prior !== component.nodePath)
            throw new Error('Ambiguous source GameObject binding');
        gameObjects.set(key, component.nodePath);
    }
    gameObjects.set(`${matches[0].cab.toLowerCase()}:${matches[0].pathId}`, matches[0].name);
    const others = new Map(catalog.otherComponents.map(component => [component.id, component]));
    const randomActivators: CharacterSpineEffectPrefabSource['randomActivators'][number][] = [];
    const distanceSorters: CharacterSpineEffectPrefabSource['distanceSorters'][number][] = [];
    for (const node of selected)
        for (const id of node.componentIds) {
            const component = others.get(id);
            if (!component)
                continue;
            const particleControlMetadata = (catalog.particleControlOnly || catalog.worldParticleContracts?.[name]?.branch === 'fresh-base-world-v1')
                && ['ParticleSystem', 'ParticleSystemRenderer', 'NKC_FX_PARTICLE_SYSTEM_SYNC_FLAG'].includes(component.type);
            if (!particleControlMetadata && !['NKC_FX_RANDOM_ACTIVATER', 'NKC_FX_DISTANCE_SORT', 'Animator', 'NKC_FX_ANIMATOR_UPDATE_SYNC', 'SortingGroup'].includes(component.type))
                throw new Error(`Unsupported source prefab component ${component.type}`);
            if (component.type === 'NKC_FX_DISTANCE_SORT') {
                const distance = component.fields.Distance;
                if (typeof distance !== 'number' || !Number.isFinite(distance))
                    throw new Error('Invalid source DistanceSort distance');
                if (node.path === matches[0].name)
                    throw new Error('DistanceSort root semantics require an explicit original parent hierarchy');
                for (let ancestor: SourceNode | undefined = node; ancestor; ancestor = ancestor.parentPath ? allNodes.get(ancestor.parentPath) : undefined)
                    if (ancestor.localRotation[0] !== 0 || ancestor.localRotation[1] !== 0)
                        throw new Error('DistanceSort source ancestor needs unaudited Euler conversion');
                distanceSorters.push({ id, nodePath: node.path, distance: Math.fround(distance), enabled: component.fields.m_Enabled === 1 });
                continue;
            }
            if (component.type !== 'NKC_FX_RANDOM_ACTIVATER')
                continue;
            const refs = component.references.filter(reference => reference.field === 'Obj');
            if (refs.length !== 1 || !refs[0].resolved)
                throw new Error('Missing source RandomActivater Obj');
            const targetPath = gameObjects.get(`${refs[0].cab.toLowerCase()}:${refs[0].pathId}`);
            const rate = component.fields.rate;
            if (!targetPath || !paths.has(targetPath) || typeof rate !== 'number' || !Number.isFinite(rate))
                throw new Error('Invalid source RandomActivater binding/rate');
            randomActivators.push({ id, nodePath: node.path, targetPath, rate: Math.fround(rate), enabled: component.fields.m_Enabled === 1 });
        }
    // All audited hit prefabs have one player. Multiple delayed Invoke order needs
    // separate native evidence; retaining catalog enumeration is not a substitute.
    const players = catalog.players.filter(player => paths.has(player.nodePath));
    if (players.length !== 1)
        throw new Error('Source prefab needs unverified multi-player startup ordering');
    return { rootPath: matches[0].name, nodes: selected, players,
        evaluators: catalog.evaluators.filter(evaluator => paths.has(evaluator.nodePath)),
        animators: catalog.animators.filter(animator => paths.has(animator.nodePath)), randomActivators, distanceSorters };
}
export interface CharacterSpineEffectPrefabContext extends Omit<CharacterFxmContext, 'randomSamples'> {
    /** Shared Unity stream: constructing/selecting a prefab does not reseed it. */
    readonly random: CharacterSpineEffectRandom;
    /** Original planar facing rotation; a negative-scale matrix cannot substitute for this. */
    readonly sourceRootEulerY: 0 | 180;
}
/** Source RandomActivater and delayed FXM startup for a selected original prefab. */
export class CharacterSpineEffectPrefab {
    readonly source: CharacterSpineEffectPrefabSource;
    private readonly fxm: CharacterSpineEffectFxm;
    private readonly random: CharacterSpineEffectRandom;
    private readonly activation = new Map<string, {
        awake: boolean;
        init: boolean;
        active: boolean;
    }>();
    private readonly distanceState = new Map<string, {
        z: number;
        changed: boolean;
    }>();
    private rootEulerY: 0 | 180;
    private isEnabled = false;
    constructor(catalog: CharacterSpineEffectPrefabCatalog, name: string, context: CharacterSpineEffectPrefabContext) {
        this.source = selectCharacterSpineEffectPrefab(catalog, name);
        this.random = context.random;
        if (context.sourceRootEulerY !== 0 && context.sourceRootEulerY !== 180)
            throw new Error('Explicit source planar facing 0/180 is required');
        this.rootEulerY = context.sourceRootEulerY;
        for (const activator of this.source.randomActivators)
            this.activation.set(activator.id, { awake: false, init: false, active: this.source.nodes.find(node => node.path === activator.targetPath)!.activeSelf });
        for (const sorter of this.source.distanceSorters)
            this.distanceState.set(sorter.id, { z: this.source.nodes.find(node => node.path === sorter.nodePath)!.localPosition[2], changed: true });
        this.fxm = new CharacterSpineEffectFxm(this.source, { ...context, eventRandomValue: () => this.random.value(), randomSamples: request => {
                if (request.kind === 'transform')
                    return { factors: [this.random.range(request.min[0], request.max[0]),
                            this.random.range(request.min[1], request.max[1]), this.random.range(request.min[2], request.max[2])] };
                const colorSeed = this.random.value();
                // Both sprite evaluators omit Range(int) for an empty Sprites array.
                return { colorSeed, currentIndex: request.spriteCount ? this.random.rangeInt(0, request.spriteCount) : 0 };
            } });
    }
    get enabled(): boolean { return this.isEnabled; }
    get randomState(): readonly number[] { return this.random.snapshot(); }
    /** Parent facing changes dirty the original child transforms; next Update applies depth. */
    setSourceRootEulerY(value: 0 | 180): void {
        if (value !== 0 && value !== 180)
            throw new Error('Unsupported source effect facing');
        if (this.rootEulerY !== value) {
            this.rootEulerY = value;
            for (const state of this.distanceState.values())
                state.changed = true;
        }
    }
    /** Native end of activation frame, after Invoke(Restart,0), FXM time still zero. */
    enable(activationFrameDelta: number, playedLayer?: {
        animatorId: string;
        layer: number;
    }): CharacterFxmFrame {
        if (this.isEnabled)
            return this.snapshot(); // SetActive(true) has no OnEnable when already active.
        if (!Number.isFinite(activationFrameDelta) || activationFrameDelta < 0)
            throw new Error('Invalid source activation-frame delta');
        const active = new Map(this.source.nodes.map(node => [node.path, node.activeSelf]));
        const byPath = new Map(this.source.nodes.map(node => [node.path, node]));
        const activeInHierarchy = (path: string): boolean => {
            for (let node = byPath.get(path); node; node = node.parentPath ? byPath.get(node.parentPath) : undefined)
                if (!active.get(node.path))
                    return false;
            return true;
        };
        for (const activator of this.source.randomActivators) {
            const state = this.activation.get(activator.id)!;
            active.set(activator.targetPath, state.active);
            if (!activeInHierarchy(activator.nodePath))
                throw new Error('Unaudited delayed RandomActivater activation');
            if (!state.awake) {
                // Awake IL0000..0029: only an activeInHierarchy target is disabled/initialized.
                state.awake = true;
                if (activeInHierarchy(activator.targetPath)) {
                    active.set(activator.targetPath, false);
                    state.init = true;
                }
            }
            // OnEnable IL0000..0033: sample > rate enables; failure does not disable.
            // There is no OnDisable override: target.activeSelf and init survive reuse.
            if (activator.enabled && state.init && this.random.range(0, 1) > activator.rate
                && !activeInHierarchy(activator.targetPath))
                active.set(activator.targetPath, true);
            state.active = active.get(activator.targetPath)!;
        }
        this.isEnabled = true;
        return this.applyDistanceSort(this.fxm.restart(Object.fromEntries(this.source.randomActivators.map(activator => [activator.targetPath, this.activation.get(activator.id)!.active])), activationFrameDelta, playedLayer), true);
    }
    advance(delta: number, externalTimeScale = 1, animatorSpeed = 1): CharacterFxmFrame {
        return this.isEnabled ? this.applyDistanceSort(this.fxm.advance(delta, externalTimeScale, animatorSpeed), true) : this.snapshot();
    }
    advancePlayers(delta: number, externalTimeScale = 1): CharacterFxmFrame {
        return this.isEnabled ? this.applyDistanceSort(this.fxm.advancePlayers(delta, externalTimeScale), true) : this.snapshot();
    }
    advanceAnimators(delta: number, animatorSpeed = 1, unityFrameDelta = delta, playedLayer?: {
        animatorId: string;
        layer: number;
    }): CharacterFxmFrame {
        return this.isEnabled ? this.applyDistanceSort(this.fxm.advanceAnimators(delta, animatorSpeed, unityFrameDelta, playedLayer), false) : this.snapshot();
    }
    resetAnimatorLayer(animatorId: string, layer: number): void {
        this.fxm.resetAnimatorLayer(animatorId, layer);
    }
    disable(): CharacterFxmFrame {
        if (this.isEnabled) {
            // FXM_PLAYER.OnDisable calls Stop and cancels its delayed Restart. It does
            // not reset RandomActivater targets or consume Unity RNG.
            this.fxm.stop();
            this.isEnabled = false;
        }
        return this.snapshot();
    }
    snapshot(): CharacterFxmFrame {
        const frame = this.applyDistanceSort(this.fxm.snapshot(), false);
        if (this.isEnabled)
            return frame;
        // The wrapper represents the external instance host, preserving source activeSelf.
        return { ...frame, nodes: Object.fromEntries(Object.entries(frame.nodes).map(([path, node]) => [path, { ...node, activeInHierarchy: false }])) };
    }
    private applyDistanceSort(frame: CharacterFxmFrame, update: boolean): CharacterFxmFrame {
        for (const sorter of this.source.distanceSorters) {
            const node = frame.nodes[sorter.nodePath], state = this.distanceState.get(sorter.id)!;
            if (update && state.changed && sorter.enabled && node.activeInHierarchy) {
                // NKC_FX_DISTANCE_SORT.SetPosition IL000B..0087 preserves local x/y.
                // The supported hierarchy has only local Z rotations, so world Euler Y
                // remains the explicitly supplied original root facing (0 or 180).
                state.z = this.rootEulerY >= 180 ? Math.fround(-sorter.distance) : sorter.distance;
                state.changed = false;
            }
            node.localPosition[2] = state.z;
        }
        return frame;
    }
}
