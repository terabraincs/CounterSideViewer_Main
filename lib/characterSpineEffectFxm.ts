import { characterEffectEulerQuaternion, characterEffectQuaternionEuler, characterEffectStoredQuaternion } from './characterSpineEffectRotation';
import { CharacterSpineEffectTransform, CharacterSpineEffectWorldBinding, characterEffectWorldQuaternion } from './characterSpineEffectTransform';
export type CharacterFxmVec3 = [
    number,
    number,
    number
];
export type CharacterFxmVec4 = [
    number,
    number,
    number,
    number
];
export type CharacterFxmFields = Readonly<Record<string, unknown>>;
export type CharacterFxmEvaluatorType = 'NKC_FXM_SCALE' | 'NKC_FXM_POSITION' | 'NKC_FXM_ROTATION' | 'NKC_FXM_SPRITE' | 'NKC_FXM_SPRITE_PMA' | 'NKC_FXM_PARTICLE_SYSTEM_RENDERER' | 'NKC_FXM_EVENT';
export interface CharacterFxmRenderer {
    readonly id: string;
    spriteId: string | null;
    color: CharacterFxmVec4;
    enabled: boolean;
    flipX?: boolean;
    flipY?: boolean;
    readonly [sourceKey: string]: unknown;
}
export interface CharacterFxmNode {
    readonly path: string;
    parentPath: string | null;
    activeSelf: boolean;
    localPosition: CharacterFxmVec3;
    localRotation: CharacterFxmVec4;
    localScale: CharacterFxmVec3;
    renderers?: CharacterFxmRenderer[];
}
export interface CharacterFxmEvaluator {
    readonly id: string;
    readonly nodePath: string;
    readonly targetPath: string | null;
    readonly targetPaths?: readonly (string | null)[];
    readonly targetId?: string;
    readonly type: CharacterFxmEvaluatorType;
    readonly fields: CharacterFxmFields;
    /** Exact source Sprites array, including its original ordering. */
    readonly spriteIds?: readonly string[];
}
export interface CharacterFxmPlayer {
    readonly id: string;
    readonly nodePath: string;
    readonly fields: CharacterFxmFields;
    /** GetComponentsInChildren(true): original child order, then GameObject component order. */
    readonly memberIds: readonly string[];
}
export interface CharacterFxmSource {
    readonly nodes: readonly CharacterFxmNode[];
    readonly players: readonly CharacterFxmPlayer[];
    readonly evaluators: readonly CharacterFxmEvaluator[];
    readonly animators: readonly CharacterFxmAnimator[];
}
export interface CharacterFxmAnimator {
    readonly id: string;
    readonly nodePath: string;
    readonly layers: readonly {
        layer: number;
        fullPathHash: number;
        length: number;
        speed: number;
        loop: boolean;
    }[];
    readonly activeTracks: readonly {
        layer: number;
        targetPath: string;
        keys: readonly {
            time: number;
            value: number;
        }[];
        stopTime: number;
        loopTime: boolean;
    }[];
    readonly syncGroups: readonly {
        layer: number;
        playerIds: readonly string[];
        multiplyAnimatorSpeed: boolean;
    }[];
}
export type CharacterFxmRandomRequest = {
    readonly evaluator: CharacterFxmEvaluator;
    readonly restart: number;
} & ({
    readonly kind: 'transform';
    readonly min: CharacterFxmVec3;
    readonly max: CharacterFxmVec3;
} | {
    readonly kind: 'sprite';
    readonly spriteCount: number;
});
export interface CharacterFxmRandomSample {
    readonly factors?: CharacterFxmVec3;
    readonly colorSeed?: number;
    readonly currentIndex?: number;
}
export interface CharacterFxmContext {
    /** Explicit native Awake/OnEnable/Update/LateUpdate dispatch. World parent
     * must be supplied from the actual instance environment, never guessed. */
    readonly lifecycle?: {
        readonly worldParentPath: string | null;
        readonly onHierarchyChanged?: () => void;
    };
    /** HandleEvent consumes Unity.Random.value even for probability one/empty calls. */
    readonly eventRandomValue?: () => number;
    /** Explicit original particle control ports; no substitute when simulation is unavailable. */
    readonly particleControllers?: ReadonlyMap<string, CharacterSpineParticleController>;
    /** Source Unity Random samples, or independently captured samples for native verification. */
    readonly randomSamples: (request: CharacterFxmRandomRequest) => CharacterFxmRandomSample;
    readonly maximumParticleDeltaTime: number;
    /** NKC_FX_UPDATE_SYNC_SMB: derive with getCharacterFxmAnimatorSyncAdjustTimeScale. */
    readonly animatorSyncAdjustTimeScale: 1 | 2;
}
/**
 * NKC_FX_UPDATE_SYNC_SMB ctor sets 1. OnStateEnter IL0013 jumps over the entire
 * option block when manager/options is null, preserving the existing value.
 * With options present, IL002D..0072 resets to 1 and doubles for either zero enum.
 */
export function getCharacterFxmAnimatorSyncAdjustTimeScale(options: {
    AnimationQuality: number;
    GameFrameLimit: number;
} | null, previous: 1 | 2 = 1): 1 | 2 {
    if (previous !== 1 && previous !== 2)
        throw new Error('Invalid previous source Animator sync adjustment');
    if (options === null)
        return previous;
    if (!Number.isInteger(options.AnimationQuality) || !Number.isInteger(options.GameFrameLimit))
        throw new Error('Explicit source Animator option enum values are required');
    return options.AnimationQuality === 0 || options.GameFrameLimit === 0 ? 2 : 1;
}
export interface CharacterFxmEvaluatorFrame {
    playbackTime: number;
    deltaTime: number;
    isStarted: boolean;
    isCompleted: boolean;
    colorSeed: number;
    currentIndex: number;
    spriteIndex: number | null;
    factors: CharacterFxmVec3;
    targetFactors?: CharacterFxmVec3[];
    eventExecuted?: boolean;
}
export interface CharacterFxmFrame {
    readonly nodes: Readonly<Record<string, CharacterFxmNode & {
        activeInHierarchy: boolean;
    }>>;
    readonly players: Readonly<Record<string, {
        playbackTime: number;
        isPlaying: boolean;
        onUpdate: boolean;
        isStopped: boolean;
    }>>;
    readonly evaluators: Readonly<Record<string, CharacterFxmEvaluatorFrame>>;
    readonly animators: Readonly<Record<string, readonly {
        layer: number;
        normalizedTime: number;
    }[]>>;
}
const f = Math.fround;
/** Original NKC_FXM_SPRITE.SetOutputColor, distinct from premultiplied PMA.
 * IL005A..0068 retains the alpha product on Mono's evaluation stack until the
 * final field store. Native 640-row fixture verifies all four output bits.
 */
export function nativeCharacterFxmSpriteColor(input: CharacterFxmVec4, intensity: number, alpha: number | null): CharacterFxmVec4 {
    const gain = f(intensity);
    return [f(f(input[0]) * gain), f(f(input[1]) * gain), f(f(input[2]) * gain),
        alpha === null ? f(f(input[3]) * gain) : f(f(input[3]) * gain * f(alpha))];
}
/** Original NKC_FXM_SPRITE_PMA.SetOutputColor. Mono keeps each RGB product
 * on its double evaluation stack until the final float field store. Alpha and
 * blend round at the Mathf.Lerp call boundary, not at every multiplication.
 */
export function nativeCharacterFxmPmaColor(input: CharacterFxmVec4, boost: number, blend: number, alpha: number | null, alphaMultiplier: number): CharacterFxmVec4 {
    const rgba = input.map(f), gain = f(boost);
    const rgb = rgba.slice(0, 3).map(value => alpha === null
        ? f(value * rgba[3] * gain)
        : f(value * rgba[3] * f(alpha) * f(alphaMultiplier) * gain));
    const opacity = alpha === null ? rgba[3] : f(rgba[3] * f(alpha) * f(alphaMultiplier));
    return [...rgb, f(opacity * Math.max(0, Math.min(1, f(blend))))] as CharacterFxmVec4;
}
interface PlayerState {
    playbackTime: number;
    isPlaying: boolean;
    onUpdate: boolean;
    isStopped: boolean;
    init: boolean;
    lastUpdateTime: number;
    waitTime: number;
    wait: boolean;
}
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
// Original Mathf.Repeat: float argument, Floor(float division), then Clamp.
const repeat = (value: number, length: number) => clamp(f(value - f(Math.floor(f(value / length)) * length)), 0, length);
function numeric(fields: CharacterFxmFields, name: string): number {
    const value = fields[name];
    if (typeof value !== 'number' || !Number.isFinite(value))
        throw new Error(`Missing/invalid source FXM ${name}`);
    return f(value);
}
function flag(fields: CharacterFxmFields, name: string): boolean {
    const value = fields[name];
    if (value !== true && value !== false && value !== 0 && value !== 1)
        throw new Error(`Missing/invalid FXM flag ${name}`);
    return Boolean(value);
}
type SourceCurve = {
    m_Curve: {
        time: number;
        value: number;
        inSlope: number | string;
        outSlope: number | string;
        weightedMode: number;
    }[];
    m_PreInfinity: number;
    m_PostInfinity: number;
};
function curve(fields: CharacterFxmFields, name: string, time: number): number {
    const source = fields[name] as SourceCurve;
    if (!source?.m_Curve?.length || source.m_Curve.some(key => key.weightedMode !== 0)
        || source.m_PreInfinity !== 2 || ![1, 2].includes(source.m_PostInfinity))
        throw new Error(`Unsupported source FXM curve ${name}`);
    // Same native cache/Horner operations as storyOmenNodeScene.glitchCurve:
    // UnityPlayer 2022.3.62f2 0x18058B310 / 0x18058A9D0. Serialized wrap 1 loops.
    const keys = source.m_Curve, first = keys[0], last = keys[keys.length - 1];
    if (time > last.time && source.m_PostInfinity === 1) {
        const length = f(last.time - first.time);
        if (!(length > 0))
            throw new Error('Invalid looping source FXM curve');
        const offset = f(time - first.time);
        time = f(first.time + f(offset - f(Math.floor(f(offset / length)) * length)));
    }
    if (time <= first.time)
        return first.value;
    if (time >= last.time)
        return last.value;
    let index = 1;
    while (keys[index].time <= time)
        index++;
    const a = keys[index - 1], b = keys[index];
    const outSlope = Number(a.outSlope), inSlope = Number(b.inSlope);
    if (outSlope === Infinity || inSlope === Infinity)
        return a.value;
    if (outSlope === -Infinity || inSlope === -Infinity)
        return b.value;
    if (!Number.isFinite(outSlope) || !Number.isFinite(inSlope))
        throw new Error('Unsupported FXM curve tangent');
    const duration = f(b.time - a.time), valueDelta = f(b.value - a.value);
    if (!(duration > 0))
        throw new Error('Invalid FXM curve interval');
    const inverse = f(1 / duration), inverseSquared = f(inverse * inverse);
    const tangentA = f(outSlope * duration), tangentB = f(duration * inSlope);
    let cubic = f(tangentB + tangentA);
    cubic = f(cubic - valueDelta);
    cubic = f(cubic - valueDelta);
    cubic = f(cubic * inverseSquared);
    cubic = f(cubic * inverse);
    let quadratic = f(valueDelta + valueDelta);
    quadratic = f(quadratic + valueDelta);
    quadratic = f(quadratic - tangentA);
    quadratic = f(quadratic - tangentA);
    quadratic = f(quadratic - tangentB);
    quadratic = f(quadratic * inverseSquared);
    const delta = f(time - a.time);
    let value = f(cubic * delta);
    value = f(value + quadratic);
    value = f(value * delta);
    value = f(value + outSlope);
    value = f(value * delta);
    return f(value + a.value);
}
function gradientChannel(gradient: CharacterFxmFields, channel: string, time: number): number {
    if (gradient.m_Mode !== 0)
        throw new Error('Unsupported FXM gradient interpolation mode');
    const alpha = channel === 'a';
    const count = numeric(gradient, alpha ? 'm_NumAlphaKeys' : 'm_NumColorKeys');
    if (count < 1 || count > 8)
        throw new Error('Invalid FXM gradient key count');
    const keyTime = (index: number) => numeric(gradient, `${alpha ? 'atime' : 'ctime'}${index}`);
    const value = (index: number) => numeric(gradient[`key${index}`] as CharacterFxmFields, channel);
    // Native Gradient.Evaluate (EFA80 -> 5825A0) first multiplies the clamped
    // float time by 65535. Dividing ushort keys by 65535 instead is not float32
    // equivalent. Native keeps source key order, including unsorted interiors.
    if (count === 1)
        return 1;
    time = clamp(f(clamp(f(time), 0, 1) * 65535), keyTime(0), keyTime(count - 1));
    for (let index = 1; index < count; index++)
        if (time <= keyTime(index)) {
            const t = Math.min(1, f(f(time - keyTime(index - 1)) / Math.max(f(keyTime(index) - keyTime(index - 1)), f(1e-6))));
            return f(value(index - 1) + f(f(value(index) - value(index - 1)) * t));
        }
    return 1;
}
export function nativeCharacterFxmGradientColor(gradient: CharacterFxmFields, time: number): CharacterFxmVec4 {
    return ['r', 'g', 'b', 'a'].map(channel => gradientChannel(gradient, channel, time)) as CharacterFxmVec4;
}
function cloneNode(node: CharacterFxmNode): CharacterFxmNode {
    return { ...node, localPosition: [...node.localPosition], localRotation: [...node.localRotation],
        localScale: [...node.localScale], renderers: node.renderers?.map(renderer => ({ ...renderer, color: [...renderer.color] })) };
}
/**
 * Native FXM subset verified against original common-hit and attack prefabs,
 * including separate-axis POSITION. Original Animator streamed BASE/m_IsActive
 * tracks and NKC_FX_UPDATE_SYNC_SMB clocks are included; no transition is requested.
 * The caller owns RandomActivater, effect lifetime, sorting and world-matrix composition.
 * Unsupported components/branches are rejected; existing Cafe guards are not changed.
 */
export class CharacterSpineEffectFxm {
    private readonly source: CharacterFxmSource;
    private readonly context: CharacterFxmContext;
    private readonly evaluators = new Map<string, CharacterFxmEvaluator>();
    private readonly states = new Map<string, CharacterFxmEvaluatorFrame>();
    private readonly initializedEvaluators = new Set<string>();
    private readonly nodes = new Map<string, CharacterFxmNode>();
    private readonly changedNodes = new Set<string>();
    private readonly childNodes = new Map<string | null, Set<string>>();
    private readonly playerStates = new Map<string, PlayerState>();
    private readonly worldBindings = new Map<string, CharacterSpineEffectWorldBinding>();
    private readonly worldPaths = new Set<string>();
    private readonly worldGraph?: CharacterSpineEffectTransform;
    private readonly animatorStates = new Map<string, {
        layer: number;
        normalizedTime: number;
        syncCurrent: number;
    }[]>();
    private readonly syncedPlayers = new Set<string>();
    private restartCount = 0;
    constructor(source: CharacterFxmSource, context: CharacterFxmContext) {
        if (typeof context?.randomSamples !== 'function' || !(context.maximumParticleDeltaTime > 0))
            throw new Error('Source FXM random samples and maximumParticleDeltaTime are required');
        this.source = source;
        this.context = context;
        for (const node of source.nodes) {
            if (this.nodes.has(node.path))
                throw new Error(`Duplicate FXM node ${node.path}`);
            this.nodes.set(node.path, cloneNode(node));
            this.changedNodes.add(node.path);
            if (!this.childNodes.has(node.parentPath))
                this.childNodes.set(node.parentPath, new Set());
            this.childNodes.get(node.parentPath)!.add(node.path);
        }
        for (const node of source.nodes)
            if (node.parentPath && !this.nodes.has(node.parentPath))
                throw new Error(`Missing FXM parent ${node.parentPath}`);
        for (const evaluator of source.evaluators) {
            const fields = evaluator.fields;
            const particle = evaluator.type === 'NKC_FXM_PARTICLE_SYSTEM_RENDERER', event = evaluator.type === 'NKC_FXM_EVENT';
            const sprite = evaluator.type === 'NKC_FXM_SPRITE' || evaluator.type === 'NKC_FXM_SPRITE_PMA';
            if (!['NKC_FXM_SCALE', 'NKC_FXM_POSITION', 'NKC_FXM_ROTATION', 'NKC_FXM_SPRITE', 'NKC_FXM_SPRITE_PMA', 'NKC_FXM_PARTICLE_SYSTEM_RENDERER', 'NKC_FXM_EVENT'].includes(evaluator.type))
                throw new Error(`Unsupported FXM type ${evaluator.type}`);
            const multi = !event && (particle || flag(fields, 'UseMultiTargets'));
            const targets = multi ? evaluator.targetPaths : [evaluator.targetPath];
            if (!this.nodes.has(evaluator.nodePath) || !targets || targets.some(path => path !== null && !this.nodes.has(path)))
                throw new Error(`Missing FXM binding ${evaluator.id}`);
            if (![0, 1, 2].includes(numeric(fields, 'ResetMode'))
                || numeric(fields, 'Duration') < 0 || numeric(fields, 'StartTime') < 0)
                throw new Error(`Unsupported FXM evaluator branch ${evaluator.id}`);
            if (event) {
                if (!context.eventRandomValue || numeric(fields, 'Duration') !== 0)
                    throw new Error('Original FXM Event random source and zero-duration Init contract required');
                numeric(fields, 'ProbFxEvent');
                this.eventCalls(evaluator);
            }
            else if (particle) {
                const controller = context.particleControllers?.get(evaluator.id);
                if (!controller)
                    throw new Error(`Original particle controller backend is unavailable: ${evaluator.id}`);
                controller.initialize();
            }
            else if (sprite) {
                if (multi)
                    throw new Error(`Unaudited multi-target FXM ${evaluator.type}`);
                if (evaluator.targetPath === null || !this.nodes.get(evaluator.targetPath)!.renderers?.some(renderer => renderer.id === evaluator.targetId))
                    throw new Error('FXM sprite target has no matching source renderer');
                if (['RandomSprite', 'ShuffleArray', 'RandomFlipX', 'RandomFlipY'].some(name => flag(fields, name)))
                    throw new Error('Unsupported randomized FXM sprite branch');
                const gradient = fields.MinMaxGradient as CharacterFxmFields;
                if (![0, 1].includes(numeric(gradient, 'm_Mode')))
                    throw new Error('Only audited constant-color/single-gradient FXM sprites are supported');
                if (gradient.m_Mode === 0)
                    for (const channel of ['r', 'g', 'b', 'a'])
                        numeric(gradient.m_ColorMax as CharacterFxmFields, channel);
                if (evaluator.type === 'NKC_FXM_SPRITE')
                    numeric(fields, 'Intensity');
            }
            else {
                if (evaluator.type !== 'NKC_FXM_ROTATION' && numeric(fields, 'Dimension') !== 1)
                    throw new Error('Unsupported FXM transform branch');
                if (multi && flag(fields, 'UseMultiRandom') && (!Array.isArray(fields.RandomValues) || fields.RandomValues.length < targets.length))
                    throw new Error('Source FXM RandomValues cannot cover its Targets');
                if (evaluator.type === 'NKC_FXM_POSITION' && !flag(fields, 'SeparateAxes'))
                    throw new Error('Unaudited directional FXM POSITION requires native world orientation');
                // SCALE.SetRandomValue(true) IL00DA-011A uses the same X/Y/Z Range
                // sequence as ROTATION; randomize() preserves all three source factors.
                // ROTATION.GetValue does not read Dimension. With SeparateAxes off it
                // preserves current local Euler X/Y and uses CurveX/FactorX for Z.
            }
            this.evaluators.set(evaluator.id, evaluator);
            this.states.set(evaluator.id, { playbackTime: 0, deltaTime: 0, isStarted: false, isCompleted: false,
                colorSeed: 0.5, currentIndex: 0, spriteIndex: null, ...(event ? { eventExecuted: false } : {}), factors: event || particle || sprite ? [0, 0, 0]
                    : ['X', 'Y', 'Z'].map(axis => numeric(fields, `Factor${axis}`)) as CharacterFxmVec3,
                ...(!event && !particle && !sprite && multi && flag(fields, 'UseMultiRandom')
                    ? { targetFactors: (fields.RandomValues as CharacterFxmFields[]).map(value => ['x', 'y', 'z'].map(axis => numeric(value, axis)) as CharacterFxmVec3) } : {}) });
        }
        for (const player of source.players) {
            const fields = player.fields;
            if (flag(fields, 'AutoDisable') || !flag(fields, 'AutoStart')
                || numeric(fields, 'TimeMode') !== 0 || ![0, 1].includes(numeric(fields, 'SimulationSpace'))
                || numeric(fields, 'SimulationSpace') === 0 && !context.lifecycle
                || ![0, 1].includes(numeric(fields, 'RandomMode')) || !(numeric(fields, 'Duration') > 0))
                throw new Error(`Unsupported FXM player branch ${player.id}`);
            if (!this.nodes.has(player.nodePath) || player.memberIds.some(id => !this.evaluators.has(id)))
                throw new Error(`Missing FXM player members ${player.id}`);
            this.playerStates.set(player.id, { playbackTime: 0, isPlaying: false, onUpdate: false, isStopped: false,
                init: !context.lifecycle, lastUpdateTime: 0, waitTime: 0, wait: false });
        }
        if (context.lifecycle) {
            const addChain = (path: string) => {
                const visited = new Set<string>();
                for (let next: string | null = path; next !== null;) {
                    if (visited.has(next))
                        throw new Error('Cyclic explicit World ancestry');
                    visited.add(next);
                    const node = this.nodes.get(next);
                    if (!node)
                        throw new Error(`Missing explicit World transform ${next}`);
                    this.worldPaths.add(next);
                    next = node.parentPath;
                }
            };
            for (const player of source.players)
                if (numeric(player.fields, 'SimulationSpace') === 0)
                    addChain(player.nodePath);
            if (context.lifecycle.worldParentPath !== null)
                addChain(context.lifecycle.worldParentPath);
            this.worldGraph = new CharacterSpineEffectTransform([...this.worldPaths].map(path => {
                const node = this.nodes.get(path)!;
                return { id: path, parent: node.parentPath, position: node.localPosition, rotation: node.localRotation, scale: node.localScale, active: node.activeSelf };
            }), path => { this.writeWorldNode(path); context.lifecycle!.onHierarchyChanged?.(); });
            for (const player of source.players)
                if (numeric(player.fields, 'SimulationSpace') === 0)
                    this.worldBindings.set(player.id, new CharacterSpineEffectWorldBinding(this.worldGraph, player.nodePath, context.lifecycle.worldParentPath));
        }
        if (!Array.isArray(source.animators as unknown) || ![1, 2].includes(context.animatorSyncAdjustTimeScale))
            throw new Error('Original Animator bindings and explicit sync quality context are required');
        for (const animator of source.animators) {
            if (!this.nodes.has(animator.nodePath) || !animator.layers.length
                || animator.layers.some(layer => !(layer.length > 0) || layer.speed !== 1)
                || animator.activeTracks.some(track => track.loopTime || !this.nodes.has(track.targetPath)
                    || !track.keys.length || track.keys.some(key => key.value !== 0 && key.value !== 1)))
                throw new Error('Unsupported source hit Animator branch');
            for (const group of animator.syncGroups)
                for (const id of group.playerIds) {
                    if (!this.playerStates.has(id) || this.syncedPlayers.has(id))
                        throw new Error('Missing/duplicate source Animator sync player');
                    this.syncedPlayers.add(id);
                }
            this.animatorStates.set(animator.id, animator.layers.map(layer => ({ layer: layer.layer, normalizedTime: 0, syncCurrent: 0 })));
        }
    }
    /** Native state after OnEnable's Invoke(Restart,0), before the first positive Update. */
    restart(activeOverrides: Readonly<Record<string, boolean>>, activationFrameDelta: number, playedLayer?: {
        animatorId: string;
        layer: number;
    }): CharacterFxmFrame {
        if (this.context.lifecycle)
            throw new Error('Explicit lifecycle must dispatch native initialization and delayed Restart separately');
        if (!Number.isFinite(activationFrameDelta) || activationFrameDelta < 0)
            throw new Error('Explicit original Animator activation-frame delta is required');
        if (playedLayer)
            this.resetAnimatorLayer(playedLayer.animatorId, playedLayer.layer);
        this.restartCount++;
        for (const node of this.source.nodes)
            this.nodes.get(node.path)!.activeSelf = node.activeSelf;
        for (const [path, active] of Object.entries(activeOverrides)) {
            const node = this.nodes.get(path);
            if (!node)
                throw new Error(`Missing RandomActivater node ${path}`);
            node.activeSelf = active;
        }
        for (const animator of this.source.animators) {
            for (const layer of animator.layers) {
                const state = this.animatorStates.get(animator.id)!.find(value => value.layer === layer.layer)!;
                // Native Animator.Play(name,-1,0) keeps its selected layer at zero during
                // the immediate Update(.001); other layers advance. Original Anim2D oracle.
                state.normalizedTime = playedLayer?.animatorId === animator.id && playedLayer.layer === layer.layer
                    ? 0 : f(f(activationFrameDelta) / f(layer.length));
                // OnStateEnter stores normalizedTime itself, before the delayed FXM Restart.
                state.syncCurrent = state.normalizedTime;
            }
            this.writeActiveTracks(animator);
        }
        for (const player of this.source.players) {
            const state = this.playerStates.get(player.id)!;
            const active = flag(player.fields, 'm_Enabled') && this.isActive(player.nodePath);
            state.playbackTime = 0;
            state.isPlaying = state.onUpdate = active;
            if (!active)
                continue;
            this.restartPlayer(player.id);
        }
        return this.snapshot();
    }
    advance(delta: number, externalTimeScale = 1, animatorSpeed = 1): CharacterFxmFrame {
        this.advancePlayers(delta, externalTimeScale);
        return this.advanceAnimators(delta, animatorSpeed);
    }
    /** Manual NKCASEffect Animator updates and MonoBehaviour FXM updates are separate phases. */
    advancePlayers(delta: number, externalTimeScale = 1): CharacterFxmFrame {
        if (!Number.isFinite(delta) || delta < 0 || !Number.isFinite(externalTimeScale) || externalTimeScale < 0)
            throw new Error('Invalid source FXM frame delta/scale');
        const sourceDelta = f(Math.min(f(delta), this.context.maximumParticleDeltaTime));
        for (const player of this.source.players) {
            if (this.syncedPlayers.has(player.id))
                continue;
            if (!this.isActive(player.nodePath) || !flag(player.fields, 'm_Enabled'))
                continue;
            const dt = f(f(sourceDelta * numeric(player.fields, 'TimeScale')) * f(externalTimeScale));
            this.updatePlayer(player, dt);
        }
        return this.snapshot();
    }
    /** NKC_FX_UPDATE_SYNC_SMB -> PLAYER.UpdateInternal with game-update enabled:
     * supplied game delta,
     * TimeScale only, without the MonoBehaviour particle-delta cap. */
    advanceGamePlayer(playerId: string, delta: number): void {
        if (!Number.isFinite(delta) || delta < 0)
            throw new Error('Invalid original FXM game delta');
        const player = this.source.players.find(value => value.id === playerId);
        if (!player)
            throw new Error('Missing original FXM game-update player');
        this.updatePlayer(player, f(f(delta) * numeric(player.fields, 'TimeScale')));
    }
    restartPlayer(playerId: string): void {
        const player = this.source.players.find(value => value.id === playerId);
        if (!player)
            throw new Error('Missing original FXM restart player');
        // Restart calls SetEvaluaterState before clearing time and Play.
        for (const id of player.memberIds) {
            const evaluator = this.evaluators.get(id)!;
            if (flag(evaluator.fields, 'm_Enabled'))
                this.randomize(evaluator);
            this.resetEvaluator(evaluator);
        }
        const state = this.playerStates.get(playerId)!;
        state.playbackTime = state.lastUpdateTime = state.waitTime = 0;
        state.isPlaying = state.onUpdate = true;
        state.isStopped = state.wait = false;
    }
    /** Native Awake -> Init; this does not schedule or execute OnEnable/Restart. */
    initializePlayer(playerId: string): void {
        if (!this.context.lifecycle)
            throw new Error('Explicit FXM lifecycle context is required');
        const player = this.source.players.find(value => value.id === playerId);
        if (!player)
            throw new Error('Missing original initialization player');
        const state = this.playerStates.get(playerId)!;
        state.isPlaying = false;
        state.isStopped = true;
        const binding = this.worldBindings.get(playerId);
        if (binding) {
            this.syncWorldGraph();
            binding.captureTransform();
        }
        // Evaluator state starts from the source serialized fields. Original Init
        // type-specific field writes are applied below before any delayed Restart.
        for (const id of player.memberIds)
            this.initializeEvaluator(this.evaluators.get(id)!);
        state.init = true;
    }
    updateNativePlayer(playerId: string, delta: number, externalTimeScale: number): void {
        if (!this.context.lifecycle || ![delta, externalTimeScale].every(value => Number.isFinite(value) && value >= 0))
            throw new Error('Explicit native FXM clock is required');
        const player = this.source.players.find(value => value.id === playerId);
        if (!player)
            throw new Error('Missing original update player');
        const sourceDelta = f(Math.min(f(delta), this.context.maximumParticleDeltaTime));
        this.updatePlayer(player, f(sourceDelta * numeric(player.fields, 'TimeScale') * f(externalTimeScale)));
    }
    lateUpdatePlayer(playerId: string, delta: number): void {
        if (!this.context.lifecycle || !Number.isFinite(delta) || delta < 0)
            throw new Error('Explicit native LateUpdate delta is required');
        const player = this.source.players.find(value => value.id === playerId);
        if (!player)
            throw new Error('Missing original LateUpdate player');
        const state = this.playerStates.get(playerId)!, binding = this.worldBindings.get(playerId);
        if (binding) {
            this.syncWorldGraph();
            binding.lateUpdate(state.isStopped, state.onUpdate);
            this.writeWorldNode(player.nodePath);
        }
        if (!state.isPlaying)
            return;
        if (state.lastUpdateTime < state.playbackTime) {
            state.wait = false;
            state.waitTime = 0;
            state.lastUpdateTime = state.playbackTime;
        }
        else if (!state.wait && state.lastUpdateTime === state.playbackTime)
            state.waitTime = f(state.waitTime + f(delta));
        if (!state.wait && f(delta) < state.waitTime) {
            this.updateEvaluators(player, 0);
            state.wait = true;
        }
    }
    disablePlayer(playerId: string): void {
        const player = this.source.players.find(value => value.id === playerId);
        if (!this.context.lifecycle || !player)
            throw new Error('Explicit original OnDisable player is required');
        if (this.playerStates.get(playerId)!.init)
            this.stopPlayer(player);
    }
    setNodeActive(path: string, active: boolean): void {
        if (!this.context.lifecycle || !this.nodes.has(path) || typeof active !== 'boolean')
            throw new Error('Explicit source activation binding is required');
        this.nodes.get(path)!.activeSelf = active;
    }
    nodeActive(path: string): boolean {
        if (!this.nodes.has(path))
            throw new Error('Missing source activation node');
        return this.isActive(path);
    }
    nodeActiveSelf(path: string): boolean {
        const node = this.nodes.get(path);
        if (!node)
            throw new Error('Missing source activation node');
        return node.activeSelf;
    }
    setNodePose(path: string, pose: {
        position?: CharacterFxmVec3;
        rotation?: CharacterFxmVec4;
        scale?: CharacterFxmVec3;
    }): void {
        const node = this.nodes.get(path);
        if (!this.context.lifecycle || !node)
            throw new Error('Explicit source pose binding is required');
        if (Object.values(pose).flat().some(value => !Number.isFinite(f(value))))
            throw new Error('Invalid source pose value');
        if (pose.position)
            this.writeNodeVector(node, 'localPosition', pose.position.map(f) as CharacterFxmVec3);
        if (pose.rotation)
            this.writeNodeVector(node, 'localRotation', pose.rotation.map(f) as CharacterFxmVec4);
        if (pose.scale)
            this.writeNodeVector(node, 'localScale', pose.scale.map(f) as CharacterFxmVec3);
    }
    nodeChanged(path: string): boolean {
        if (!this.nodes.has(path))
            throw new Error('Missing original Transform');
        return this.changedNodes.has(path);
    }
    setNodeChanged(path: string, value: boolean): void {
        if (!this.nodes.has(path))
            throw new Error('Missing original Transform');
        if (value)
            this.changedNodes.add(path);
        else
            this.changedNodes.delete(path);
    }
    nodeTransform(path: string) {
        const rotations: CharacterFxmVec4[] = [], visited = new Set<string>();
        for (let next: string | null = path; next !== null;) {
            const node = this.nodes.get(next);
            if (!node || visited.has(next))
                throw new Error('Missing/cyclic original Transform');
            visited.add(next);
            rotations.push(node.localRotation);
            next = node.parentPath;
        }
        const node = this.nodes.get(path)!;
        return { parent: node.parentPath, localPosition: [...node.localPosition], worldRotation: characterEffectWorldQuaternion(rotations) };
    }
    private markNodeChanged(path: string): void {
        this.changedNodes.add(path);
        for (const child of this.childNodes.get(path) ?? [])
            this.markNodeChanged(child);
    }
    private writeNodeVector<K extends 'localPosition' | 'localRotation' | 'localScale'>(node: CharacterFxmNode, key: K, next: CharacterFxmNode[K]): void {
        if (next.some((value, axis) => value !== node[key][axis]))
            this.markNodeChanged(node.path);
        node[key] = next;
    }
    private syncWorldGraph(): void {
        for (const path of this.worldPaths) {
            const node = this.nodes.get(path)!;
            this.worldGraph!.setPosition(path, node.localPosition);
            this.worldGraph!.setRotation(path, node.localRotation);
            this.worldGraph!.setScale(path, node.localScale);
            this.worldGraph!.setActive(path, node.activeSelf);
        }
    }
    private writeWorldNode(path: string): void {
        const pose = this.worldGraph!.snapshot(path), node = this.nodes.get(path)!;
        if (node.parentPath !== pose.parent) {
            this.childNodes.get(node.parentPath)!.delete(path);
            if (!this.childNodes.has(pose.parent))
                this.childNodes.set(pose.parent, new Set());
            this.childNodes.get(pose.parent)!.add(path);
            node.parentPath = pose.parent;
            this.markNodeChanged(path);
        }
        this.writeNodeVector(node, 'localPosition', pose.localPosition as CharacterFxmVec3);
        this.writeNodeVector(node, 'localRotation', pose.localRotation as CharacterFxmVec4);
        this.writeNodeVector(node, 'localScale', pose.localScale as CharacterFxmVec3);
    }
    private initializeEvaluator(evaluator: CharacterFxmEvaluator): void {
        // Original TRANSFORM and SPRITE/PMA Init only validate/bind these supported
        // single targets; they do not reset playback or completion flags. Other
        // subclasses and multi-target initialization need their own lifecycle proof.
        if (!['NKC_FXM_POSITION', 'NKC_FXM_ROTATION', 'NKC_FXM_SCALE', 'NKC_FXM_SPRITE', 'NKC_FXM_SPRITE_PMA'].includes(evaluator.type)
            || flag(evaluator.fields, 'UseMultiTargets') || evaluator.targetPath === null)
            throw new Error('Unverified explicit evaluator Init branch');
        this.initializedEvaluators.add(evaluator.id);
    }
    /** Caller supplies Time.deltaTime separately for an explicit Animator.Update(.001) call. */
    advanceAnimators(delta: number, animatorSpeed = 1, unityFrameDelta = delta, playedLayer?: {
        animatorId: string;
        layer: number;
    }): CharacterFxmFrame {
        if (![delta, animatorSpeed, unityFrameDelta].every(value => Number.isFinite(value) && value >= 0) || animatorSpeed === 0)
            throw new Error('Invalid or unaudited source Animator delta/speed');
        if (playedLayer)
            this.resetAnimatorLayer(playedLayer.animatorId, playedLayer.layer);
        for (const animator of this.source.animators) {
            if (!this.isActive(animator.nodePath))
                continue;
            const states = this.animatorStates.get(animator.id)!;
            for (const layer of animator.layers) {
                const state = states.find(value => value.layer === layer.layer)!;
                if (playedLayer?.animatorId !== animator.id || playedLayer.layer !== layer.layer)
                    state.normalizedTime = f(state.normalizedTime + f(f(f(delta) * f(animatorSpeed)) / f(layer.length)));
            }
            this.writeActiveTracks(animator);
            for (const group of animator.syncGroups) {
                const state = states.find(value => value.layer === group.layer)!;
                const layer = animator.layers.find(value => value.layer === group.layer)!;
                // AnimatorStateInfo.length is the runtime duration (source length / speed),
                // confirmed by original NKCAnim2D speed1/speed2 native captures.
                const since = f(f(f(layer.length) / f(animatorSpeed)) * state.normalizedTime);
                // Original Mono OnStateUpdate JIT 0109..013C keeps sub/mul in
                // double precision (subsd, mulsd), rounding only at the float field
                // store. Rounding the subtraction early differs at speed 1.005.
                let dt = group.multiplyAnimatorSpeed
                    ? f((since - state.syncCurrent) * f(animatorSpeed)) : f(since - state.syncCurrent);
                const estimated = f(f(unityFrameDelta) * this.context.animatorSyncAdjustTimeScale);
                if (Math.abs(f(estimated - dt)) > f(unityFrameDelta))
                    dt = estimated;
                state.syncCurrent = since;
                for (const id of group.playerIds) {
                    // SetUseGameUpdate(true): ExternalTimeScale is intentionally absent.
                    // Original SMB checks gameObject.activeSelf, while a direct
                    // UpdateInternal call itself has no active/enabled guard.
                    const player = this.source.players.find(value => value.id === id)!;
                    if (!this.nodes.get(player.nodePath)!.activeSelf)
                        continue;
                    this.advanceGamePlayer(id, dt);
                }
            }
        }
        return this.snapshot();
    }
    /** Exact single-state layer slice; source controller/name validation belongs to the scene catalog. */
    resetAnimatorLayer(animatorId: string, layer: number): void {
        const state = this.animatorStates.get(animatorId)?.find(value => value.layer === layer);
        if (!state)
            throw new Error('Missing source Animator layer');
        state.normalizedTime = 0;
        // The four source sync behaviours are on separate layers; resetting one with
        // a behaviour would need its actual OnStateEnter callback ordering.
        if (this.source.animators.find(value => value.id === animatorId)!.syncGroups.some(group => group.layer === layer))
            throw new Error('Unsupported Animator state re-entry with sync behaviour');
    }
    private updatePlayer(player: CharacterFxmPlayer, dt: number): void {
        const state = this.playerStates.get(player.id)!;
        if (!state.onUpdate || !state.init)
            return;
        const binding = this.worldBindings.get(player.id);
        if (binding) {
            this.syncWorldGraph();
            binding.beforeUpdate(state.playbackTime);
            this.writeWorldNode(player.nodePath);
        }
        const duration = numeric(player.fields, 'Duration');
        const looping = flag(player.fields, 'Loop');
        const nextTime = f(state.playbackTime + dt);
        if (looping && nextTime > duration) {
            // ExecuteEvaluaterState(Loop), IL004E..009A: reset only flags.
            // Playback values/renderer outputs remain; resimulate redraws randomness.
            for (const id of player.memberIds) {
                const evaluator = this.evaluators.get(id)!, value = this.states.get(id)!;
                value.isStarted = value.isCompleted = false;
                if (flag(evaluator.fields, 'Resimulate') && flag(evaluator.fields, 'm_Enabled'))
                    this.randomize(evaluator);
            }
        }
        state.playbackTime = looping ? repeat(nextTime, duration) : clamp(nextTime, 0, duration);
        if (state.playbackTime > 0)
            this.updateEvaluators(player, dt);
        if (!looping && state.playbackTime >= duration)
            this.stopPlayer(player);
    }
    private updateEvaluators(player: CharacterFxmPlayer, dt: number): void {
        const state = this.playerStates.get(player.id)!;
        for (const id of player.memberIds) {
            const evaluator = this.evaluators.get(id)!, value = this.states.get(id)!;
            if (value.isCompleted)
                continue;
            if (numeric(evaluator.fields, 'StartTime') <= state.playbackTime)
                this.updateEvaluator(evaluator, state.playbackTime, dt);
            else if (value.playbackTime > 0)
                this.updateEvaluator(evaluator, 0, dt);
        }
    }
    private writeActiveTracks(animator: CharacterFxmAnimator): void {
        for (const track of animator.activeTracks) {
            const layer = this.animatorStates.get(animator.id)!.find(value => value.layer === track.layer)!;
            const time = Math.min(f(layer.normalizedTime * f(track.stopTime)), track.stopTime);
            let active = track.keys[0].value;
            for (const key of track.keys) {
                if (key.time > time)
                    break;
                active = key.value;
            }
            const target = this.nodes.get(track.targetPath)!;
            const wasActive = target.activeSelf;
            target.activeSelf = active !== 0;
            if (wasActive && !target.activeSelf)
                for (const player of this.source.players) {
                    if (!this.isActive(player.nodePath))
                        this.stopPlayer(player);
                }
        }
    }
    stop(): CharacterFxmFrame {
        for (const player of this.source.players)
            this.stopPlayer(player);
        return this.snapshot();
    }
    private randomize(evaluator: CharacterFxmEvaluator, random = true): void {
        const fields = evaluator.fields, state = this.states.get(evaluator.id)!;
        if (evaluator.type === 'NKC_FXM_EVENT')
            return; // Inherited SetRandomValue is empty.
        if (evaluator.type === 'NKC_FXM_PARTICLE_SYSTEM_RENDERER') {
            this.context.particleControllers!.get(evaluator.id)!.setRandomValue(true);
            return;
        }
        if (evaluator.type === 'NKC_FXM_SPRITE' || evaluator.type === 'NKC_FXM_SPRITE_PMA') {
            if (!random || !flag(fields, 'm_Enabled'))
                return;
            // Both sprite classes sample despite RandomValue=false; empty/null arrays
            // consume only Random.value, without a Range(int) call.
            const count = evaluator.spriteIds?.length ?? 0;
            const sample = this.context.randomSamples({ kind: 'sprite', evaluator, restart: this.restartCount, spriteCount: count });
            if (!Number.isFinite(sample.colorSeed) || sample.colorSeed! < 0 || sample.colorSeed! > 1
                || !Number.isInteger(sample.currentIndex) || sample.currentIndex! < 0 || sample.currentIndex! >= Math.max(1, count))
                throw new Error(`Missing/invalid source sprite random samples ${evaluator.id}`);
            state.colorSeed = f(sample.colorSeed!);
            state.currentIndex = sample.currentIndex!;
        }
        else if (flag(fields, 'RandomValue')) {
            const sampleFactors = () => {
                if (!random)
                    return ['X', 'Y', 'Z'].map(axis => {
                        const min = numeric(fields, `min${axis}`), max = numeric(fields, `max${axis}`);
                        return f(min + (max - min) * .5); // Original Mono Mathf.Lerp(float,float,.5f).
                    }) as CharacterFxmVec3;
                const sample = this.context.randomSamples({ kind: 'transform', evaluator, restart: this.restartCount,
                    min: ['X', 'Y', 'Z'].map(axis => numeric(fields, `min${axis}`)) as CharacterFxmVec3,
                    max: ['X', 'Y', 'Z'].map(axis => numeric(fields, `max${axis}`)) as CharacterFxmVec3 });
                if (!sample.factors || sample.factors.length !== 3 || sample.factors.some(value => !Number.isFinite(value)))
                    throw new Error(`Missing source rotation random samples ${evaluator.id}`);
                return sample.factors.map(f) as CharacterFxmVec3;
            };
            // Native SetRandomValue iterates serialized RandomValues, even for null
            // Targets, and leaves the scalar FactorX/Y/Z fields unchanged in this branch.
            if (state.targetFactors)
                state.targetFactors = state.targetFactors.map(sampleFactors);
            else
                state.factors = sampleFactors();
        }
    }
    private resetEvaluator(evaluator: CharacterFxmEvaluator): void {
        const state = this.states.get(evaluator.id)!;
        state.isStarted = state.isCompleted = false;
        if (numeric(evaluator.fields, 'ResetMode') !== 2) {
            state.playbackTime = 0;
            this.write(evaluator, false);
        }
    }
    private updateEvaluator(evaluator: CharacterFxmEvaluator, playerTime: number, delta: number): void {
        const state = this.states.get(evaluator.id)!, duration = numeric(evaluator.fields, 'Duration');
        state.playbackTime = clamp(f(playerTime - numeric(evaluator.fields, 'StartTime')), 0, duration);
        state.deltaTime = delta;
        if (!flag(evaluator.fields, 'm_Enabled'))
            return;
        if (!state.isStarted) {
            state.isStarted = true;
            if (evaluator.type === 'NKC_FXM_PARTICLE_SYSTEM_RENDERER')
                this.context.particleControllers!.get(evaluator.id)!.start();
            else if (evaluator.type === 'NKC_FXM_EVENT' && this.isActive(evaluator.nodePath) && !state.eventExecuted) {
                const sample = this.context.eventRandomValue!();
                if (!Number.isFinite(sample) || sample < 0 || sample > 1)
                    throw new Error('Invalid original FXM Event random value');
                const calls = this.eventCalls(evaluator);
                if (calls.length && numeric(evaluator.fields, 'ProbFxEvent') > sample) {
                    for (const call of calls)
                        if (call.enabled)
                            this.stopPlayer(this.source.players.find(player => player.id === call.target)!);
                    state.eventExecuted = true;
                }
            }
        }
        this.write(evaluator, true);
        if (state.playbackTime >= duration) {
            state.isCompleted = true;
            if (evaluator.type === 'NKC_FXM_EVENT') {
                state.playbackTime = 0;
                state.eventExecuted = false;
            }
            else if (numeric(evaluator.fields, 'ResetMode') === 0) {
                state.playbackTime = 0;
                this.write(evaluator, false);
            }
        }
    }
    private write(evaluator: CharacterFxmEvaluator, executing: boolean): void {
        const fields = evaluator.fields, state = this.states.get(evaluator.id)!;
        if (!flag(fields, 'm_Enabled'))
            return;
        if (evaluator.type === 'NKC_FXM_PARTICLE_SYSTEM_RENDERER' || evaluator.type === 'NKC_FXM_EVENT')
            return; // Original particle OnExecute is editor-only; Event inherits empty OnExecute.
        const duration = numeric(fields, 'Duration');
        const time = duration === 0 ? 0 : f(state.playbackTime / duration);
        const targets = flag(fields, 'UseMultiTargets') ? evaluator.targetPaths! : [evaluator.targetPath];
        for (let index = 0; index < targets.length; index++) {
            const path = targets[index];
            if (path === null)
                continue; // Original OnExecute skips null Transform PPtrs.
            const target = this.nodes.get(path)!;
            const factors = state.targetFactors ? state.targetFactors[index] : state.factors;
            if (evaluator.type === 'NKC_FXM_SCALE') {
                const x = f(curve(fields, 'CurveX', time) * factors[0]);
                this.writeNodeVector(target, 'localScale', [x, flag(fields, 'SeparateAxes') ? f(curve(fields, 'CurveY', time) * factors[1]) : x, 1]);
            }
            else if (evaluator.type === 'NKC_FXM_POSITION') {
                // Original GetValue IL00BC-00E3: separate-axis 2D replaces localPosition.
                // OnExecute assigns this vector directly; the prefab start pose is not added.
                this.writeNodeVector(target, 'localPosition', [f(curve(fields, 'CurveX', time) * factors[0]),
                    f(curve(fields, 'CurveY', time) * factors[1]), 0]);
            }
            else if (evaluator.type === 'NKC_FXM_ROTATION') {
                const angles = flag(fields, 'SeparateAxes')
                    ? ['X', 'Y', 'Z'].map((axis, index) => f(curve(fields, `Curve${axis}`, time) * factors[index]))
                    : [...characterEffectQuaternionEuler(target.localRotation).slice(0, 2), f(curve(fields, 'CurveX', time) * factors[0])];
                this.writeNodeVector(target, 'localRotation', characterEffectStoredQuaternion(characterEffectEulerQuaternion(angles)));
            }
            else {
                const renderer = target.renderers!.find(value => value.id === evaluator.targetId)!;
                const sprites = evaluator.spriteIds ?? [];
                // Original OnExecute does not consult UseSheetAnimation in either class.
                if (sprites.length) {
                    const frame = curve(fields, 'Frame', time);
                    state.spriteIndex = clamp(Math.trunc(flag(fields, 'ShuffleStart') ? repeat(f(frame + state.currentIndex), sprites.length) : frame), 0, sprites.length - 1);
                    renderer.spriteId = sprites[state.spriteIndex];
                }
                const gradient = fields.MinMaxGradient as CharacterFxmFields;
                // Original ParticleSystem.MinMaxGradient.Evaluate(float,float) IL0026-002D:
                // mode 0 returns m_ColorMax; it performs no gradient interpolation or RNG.
                const input = ['r', 'g', 'b', 'a'].map(channel => gradient.m_Mode === 0
                    ? numeric(gradient.m_ColorMax as CharacterFxmFields, channel)
                    : gradientChannel(gradient.m_GradientMax as CharacterFxmFields, channel, time)) as CharacterFxmVec4;
                if (evaluator.type === 'NKC_FXM_SPRITE') {
                    renderer.color = nativeCharacterFxmSpriteColor(input, numeric(fields, 'Intensity'), flag(fields, 'UseAlphaCurve') ? curve(fields, 'Alpha', time) : null);
                }
                else {
                    const blend = f(numeric(fields, 'BlendFactor') * (flag(fields, 'UseBlendCurve') ? curve(fields, 'Blend', time) : 1));
                    renderer.color = nativeCharacterFxmPmaColor(input, numeric(fields, 'ColorBoost'), blend, flag(fields, 'UseAlphaCurve') ? curve(fields, 'Alpha', time) : null, numeric(fields, 'AlphaMultiplier'));
                }
                renderer.enabled = executing;
            }
        }
    }
    private stopPlayer(player: CharacterFxmPlayer): void {
        const state = this.playerStates.get(player.id)!;
        if (state.isStopped)
            return;
        state.isStopped = true;
        state.isPlaying = state.onUpdate = false;
        state.playbackTime = 0;
        state.lastUpdateTime = state.waitTime = 0;
        for (const id of player.memberIds)
            this.resetEvaluator(this.evaluators.get(id)!);
    }
    private eventCalls(evaluator: CharacterFxmEvaluator): {
        target: string;
        enabled: boolean;
    }[] {
        const event = evaluator.fields.Evt as {
            m_PersistentCalls?: {
                m_Calls?: {
                    m_Target: {
                        m_FileID: number;
                        m_PathID: string;
                    };
                    m_MethodName: string;
                    m_Mode: number;
                    m_CallState: number;
                }[];
            };
        };
        const calls = event?.m_PersistentCalls?.m_Calls;
        if (!Array.isArray(calls))
            throw new Error('Original persistent FXM Event calls are required');
        return calls.map(call => {
            const target = `${evaluator.id.split(':')[0]}:${call.m_Target.m_PathID}`;
            if (call.m_Target.m_FileID !== 0 || call.m_MethodName !== 'Stop' || call.m_Mode !== 1
                || ![0, 1, 2].includes(call.m_CallState) || !this.source.players.some(player => player.id === target))
                throw new Error('Unverified FXM persistent call; only exact source PLAYER.Stop bindings are supported');
            return { target, enabled: call.m_CallState !== 0 };
        });
    }
    private isActive(path: string): boolean {
        const visited = new Set<string>();
        for (let node = this.nodes.get(path); node; node = node.parentPath ? this.nodes.get(node.parentPath) : undefined) {
            if (visited.has(node.path))
                throw new Error('Cyclic FXM source transform hierarchy');
            visited.add(node.path);
            if (!node.activeSelf)
                return false;
        }
        return true;
    }
    snapshot(): CharacterFxmFrame {
        return {
            nodes: Object.fromEntries([...this.nodes].map(([path, node]) => [path, { ...cloneNode(node), activeInHierarchy: this.isActive(path) }])),
            players: Object.fromEntries([...this.playerStates].map(([id, state]) => [id, this.context.lifecycle
                    ? { ...state, isLocal: this.worldBindings.get(id)?.snapshot().isLocal ?? false }
                    : { playbackTime: state.playbackTime, isPlaying: state.isPlaying, onUpdate: state.onUpdate, isStopped: state.isStopped }])),
            evaluators: Object.fromEntries([...this.states].map(([id, state]) => [id, { ...state,
                    ...(this.context.lifecycle ? { init: this.initializedEvaluators.has(id) } : {}), factors: [...state.factors] as CharacterFxmVec3,
                    ...(state.targetFactors ? { targetFactors: state.targetFactors.map(value => [...value] as CharacterFxmVec3) } : {}) }])),
            animators: Object.fromEntries([...this.animatorStates].map(([id, states]) => [id, states.map(state => ({ layer: state.layer, normalizedTime: state.normalizedTime }))])),
        };
    }
}
import type { CharacterSpineParticleController } from './characterSpineParticleController';
