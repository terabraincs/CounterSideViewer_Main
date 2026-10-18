import type { SwordTrainingPmaMesh } from "@/components/minigames/sword-training/SwordTrainingPmaMeshes";
import { SwordTrainingParticleSystem, swordParticleCurve, swordTrainingNativeParticleMeshes, type SwordNativeParticle, type SwordParticleSystemSource, } from "./swordTrainingClientParticles.ts";
import { storyOmenGlitchDraw, storyOmenGraphicDraws, storyOmenNativeTmpDraws, type StoryOmenContinuousSceneSource, type StoryOmenGlitchDraw, type StoryOmenGraphicProbeFrame, type StoryOmenNativeInteractionFrame, type StoryOmenSceneDrawCommand, type StoryOmenTmpDraw, } from "./storyOmenNativeRuntime.ts";
import { STORY_OMEN_NODE_CANVAS_WITHIN_BUTTON, STORY_OMEN_NODE_HIT_TARGET, STORY_OMEN_NODE_ROOT, } from "./storyOmenSceneGeometry.ts";
import { StoryOmenUnityRandom, storyOmenUnityRandomFloatRangeFromUInt, storyOmenUnityRandomStateFromSeed, } from "./storyOmenUnityRandom.ts";
import { sampleSwordTrainingClientButtonTracking } from "./swordTrainingClientDecoration.ts";
type JsonObject = Record<string, unknown>;
const WIDTH = STORY_OMEN_NODE_CANVAS_WITHIN_BUTTON.width;
const HEIGHT = STORY_OMEN_NODE_CANVAS_WITHIN_BUTTON.height;
const ORIGIN = STORY_OMEN_NODE_CANVAS_WITHIN_BUTTON.selectedOrigin;
const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] as const;
const NODE_AURA_PATH = `${STORY_OMEN_NODE_ROOT}/Shadow/LOOP/PTC_AURA/GameObject/AURA`;
const NODE_BG_PATH = `${STORY_OMEN_NODE_ROOT}/Bg`;
const NODE_THUMB_PATH = `${STORY_OMEN_NODE_ROOT}/THUMB`;
const NODE_GLITCH_PATH = `${STORY_OMEN_NODE_ROOT}/GRAB_GLITCH_UI (1)`;
const OPERATION_ATLAS_TEXTURE = "sactx-0-1024x2048-BC7-AB_UI_OPERATION_Sprite_Atlas-f931e129";
const OPERATION_ADDITIVE_TEXTURE = "/story/map-ui/omen-native/AB_UI_OPERATION_ADDITIVE.png";
const THUMB_TEXTURE = "/story/map-ui/omen-native/SUB_THUMB_BIG_OMEN.png";
const AURA_TEXTURE = "/story/map-ui/omen-native/UI_AURA_SEQ_01.png";
const GLITCH_MASK_TEXTURE = "/story/map-ui/omen-native/NK_AURA_SEQ_00.png";
const GLITCH_NOISE_TEXTURE = "/story/map-ui/omen-native/NOISE_DISSOLVE_00.png";
const TMP_ATLAS_TEXTURE = "/story/map-ui/omen-native/tmp-node-atlas.png";
const NATIVE_STEP = 0.01666666753590107;
const MAXIMUM_PARTICLE_STEP = 0.10000000149011612;
function object(value: unknown, label: string): JsonObject {
    if (!value || typeof value !== "object" || Array.isArray(value))
        throw new Error(`Missing ${label}`);
    return value as JsonObject;
}
function array(value: unknown, label: string): unknown[] {
    if (!Array.isArray(value))
        throw new Error(`Missing ${label}`);
    return value;
}
function text(value: unknown, label: string): string {
    if (typeof value !== "string" || !value)
        throw new Error(`Missing ${label}`);
    return value;
}
function number(value: unknown, label: string): number {
    if (typeof value !== "number" || !Number.isFinite(value))
        throw new Error(`Invalid ${label}`);
    return value;
}
function expect(actual: unknown, expected: unknown, label: string): void {
    if (actual !== expected)
        throw new Error(`Client ${label} changed: ${String(actual)}`);
}
function component(hierarchy: readonly unknown[], path: string, type: string): JsonObject {
    const node = hierarchy.map((entry) => object(entry, "node hierarchy entry"))
        .find((entry) => entry.path === path);
    if (!node)
        throw new Error(`Missing client Omen node: ${path}`);
    expect(node.effectiveActive, true, `${path} effective active state`);
    const matches = array(node.components, `${path} components`).map((entry) => object(entry, `${path} component`))
        .filter((entry) => entry.type === type);
    if (matches.length !== 1)
        throw new Error(`Missing client Omen component: ${path}/${type}`);
    return object(matches[0].serialized, `${path}/${type} serialization`);
}
function assetPath(runtime: JsonObject, filename: string): string {
    const matches = array(runtime.assets, "node asset inventory").map((entry) => object(entry, "node asset"))
        .filter((entry) => entry.filename === filename);
    if (matches.length !== 1)
        throw new Error(`Missing exact Omen node asset: ${filename}`);
    return text(matches[0].publicPath, `${filename} publicPath`);
}
function matrix(value: unknown, label: string): number[] {
    const output = array(value, label).map((entry) => number(entry, label));
    if (output.length !== 16)
        throw new Error(`Invalid ${label}`);
    return output;
}
function remapOperationAdditive(graphicValue: unknown): StoryOmenGraphicProbeFrame {
    const graphic = structuredClone(object(graphicValue, "node Bg native Graphic"));
    expect(graphic.path, NODE_BG_PATH, "node Bg path");
    expect(graphic.sprite, "AB_UI_OPERATION_ADDITIVE", "node Bg sprite");
    expect(graphic.mainTexture, OPERATION_ATLAS_TEXTURE, "node Bg atlas");
    const sprite = object(graphic.spriteSource, "node Bg sprite source");
    const textureRect = object(sprite.textureRect, "node Bg texture rect");
    expect(textureRect.x, 321, "node Bg texture rect X");
    expect(textureRect.y, 1098, "node Bg texture rect Y");
    expect(textureRect.width, 50, "node Bg texture rect width");
    expect(textureRect.height, 50, "node Bg texture rect height");
    const mesh = object(graphic.mesh, "node Bg mesh");
    mesh.uv0 = array(mesh.uv0, "node Bg UV0").map((value) => {
        const uv = object(value, "node Bg UV0 value");
        return {
            ...uv,
            // The source Sprite occupies [321,371]x[1098,1148] in the exact
            // 1024x2048 operation atlas. The shipped 50x50 PNG is that Sprite crop,
            // so this is a source-rect coordinate change, never a mesh-bounds fit.
            x: (number(uv.x, "node Bg U") * 1024 - 321) / 50,
            y: (number(uv.y, "node Bg V") * 2048 - 1098) / 50,
        };
    });
    graphic.mainTexture = "AB_UI_OPERATION_ADDITIVE";
    return graphic as unknown as StoryOmenGraphicProbeFrame;
}
function sourceGraphic(value: unknown, expectedPath: string): StoryOmenGraphicProbeFrame {
    const graphic = object(value, "native node Graphic");
    expect(graphic.path, expectedPath, `${expectedPath} path`);
    return graphic as unknown as StoryOmenGraphicProbeFrame;
}
function cloneMesh(mesh: SwordTrainingPmaMesh): SwordTrainingPmaMesh {
    return { ...mesh, positions: [...mesh.positions], uvs: [...mesh.uvs], indices: [...mesh.indices] };
}
function scalePositions(positions: readonly number[], scale: number): number[] {
    if (scale === 1)
        return [...positions];
    const output = new Array<number>(positions.length);
    for (let index = 0; index < positions.length; index += 2) {
        output[index] = ORIGIN[0] + (positions[index] - ORIGIN[0]) * scale;
        output[index + 1] = ORIGIN[1] + (positions[index + 1] - ORIGIN[1]) * scale;
    }
    return output;
}
function scaleCommand(command: StoryOmenSceneDrawCommand, scale: number): StoryOmenSceneDrawCommand {
    if (scale === 1)
        return command;
    if (command.kind === "mesh")
        return {
            ...command,
            mesh: { ...cloneMesh(command.mesh), positions: scalePositions(command.mesh.positions, scale) },
        };
    if (command.kind === "tmp")
        return {
            ...command,
            draw: { ...command.draw, positions: scalePositions(command.draw.positions, scale) },
        };
    return { ...command, draw: { ...command.draw, positions: scalePositions(command.draw.positions, scale) } };
}
export function storyOmenNodeStateButtonScale(interaction: StoryOmenNativeInteractionFrame): number {
    const duration = STORY_OMEN_NODE_HIT_TARGET.trackingSeconds;
    const pressed = STORY_OMEN_NODE_HIT_TARGET.pressScale;
    if (interaction.pressedTarget === STORY_OMEN_NODE_HIT_TARGET.path)
        return sampleSwordTrainingClientButtonTracking(1, pressed, interaction.transitionElapsedSeconds, duration);
    const release = interaction.releasedTargets.find((candidate) => candidate.target === STORY_OMEN_NODE_HIT_TARGET.path);
    if (release) {
        const releaseStart = sampleSwordTrainingClientButtonTracking(1, pressed, release.pressElapsedSeconds, duration);
        return sampleSwordTrainingClientButtonTracking(releaseStart, 1, release.releaseElapsedSeconds, duration);
    }
    return 1;
}
type NodeAuraRuntime = {
    draw(frameIndex: number): SwordTrainingPmaMesh[];
    seedBeforeLoop(loopIndex: number): number;
};
function nativeAuraLoopSeed(particles: readonly SwordNativeParticle[]): number {
    if (particles.length < 2)
        throw new Error("Node AURA loop boundary has too few particles");
    let expiringIndex = 0;
    for (let index = 1; index < particles.length; index++) {
        if (particles[index].remainingLifetime < particles[expiringIndex].remainingLifetime)
            expiringIndex = index;
    }
    const nextLifetime = Math.min(...particles
        .filter((_, index) => index !== expiringIndex)
        .map((particle) => particle.remainingLifetime));
    if (!(particles[expiringIndex].remainingLifetime >= 0 &&
        particles[expiringIndex].remainingLifetime < NATIVE_STEP &&
        nextLifetime > NATIVE_STEP))
        throw new Error("Node AURA loop boundary no longer has one source-scheduled expiry");
    // Native ParticleSystem removes the expiring item by moving the last item
    // into its slot. The web evaluator can retain that alpha-zero item for one
    // frame because public Time.deltaTime is rounded differently; only the
    // buffer seed feeding NKC_FXM_PLAYER needs this exact native operation.
    const output = [...particles];
    const last = output.pop()!;
    if (expiringIndex < output.length)
        output[expiringIndex] = last;
    const seed = output.at(-1)?.randomSeed;
    if (seed === undefined)
        throw new Error("Node AURA loop boundary became empty");
    return seed;
}
function capturedRandomState(value: unknown, label: string): readonly number[] {
    const entries = array(value, label).map((entry) => object(entry, `${label} entry`));
    const names = ["s0", "s1", "s2", "s3"];
    if (entries.length !== names.length || entries.some((entry, index) => entry.name !== names[index]))
        throw new Error(`Invalid ${label}`);
    return entries.map((entry) => Number(text(entry.value, `${label} value`)) >>> 0);
}
function buildAura(runtime: JsonObject, hierarchy: readonly unknown[], continuous: JsonObject): NodeAuraRuntime {
    const serialized = component(hierarchy, NODE_AURA_PATH, "ParticleSystem");
    expect(serialized.randomSeed, 0, "node AURA random seed");
    expect(serialized.looping, true, "node AURA looping");
    expect(serialized.prewarm, true, "node AURA prewarm");
    expect(serialized.playOnAwake, false, "node AURA playOnAwake");
    expect(serialized.simulationSpeed, 1, "node AURA simulation speed");
    expect(serialized.lengthInSec, 1, "node AURA duration");
    const shape = object(serialized.ShapeModule, "node AURA ShapeModule");
    expect(shape.type, 18, "node AURA shape type");
    const noise = object(serialized.NoiseModule, "node AURA NoiseModule");
    expect(noise.enabled, false, "node AURA noise branch");
    const size = object(serialized.SizeModule, "node AURA SizeModule");
    expect(size.enabled, false, "node AURA size branch");
    const frames = array(continuous.frames, "node continuous frames").map((entry) => object(entry, "node continuous frame"));
    expect(frames.length, 181, "node continuous frame count");
    expect(continuous.framesPerSecond, 60, "node continuous frame rate");
    const initialFrame = frames[1];
    expect(initialFrame.frame, 1, "node AURA initial frame index");
    expect(initialFrame.unityDeltaTime, NATIVE_STEP, "node AURA PlayerLoop step");
    const systems = array(initialFrame.systems, "node AURA initial systems").map((entry) => object(entry, "node AURA system"));
    const initial = systems.find((entry) => entry.sourcePath === NODE_AURA_PATH || entry.path === NODE_AURA_PATH ||
        (typeof entry.path === "string" && NODE_AURA_PATH.endsWith(`/${entry.path}`)));
    if (!initial)
        throw new Error("Missing native node AURA frame-one state");
    expect(initial.randomSeed, 0, "node AURA native seed");
    expect(initial.isPlaying, true, "node AURA native playing state");
    const nativeInitial = {
        time: number(initial.time, "node AURA initial time"),
        localToRoot: matrix(initial.localToRoot, "node AURA localToRoot"),
        playbackState: array(initial.playbackState, "node AURA playback state") as SwordParticleSystemSource["nativeInitial"]["playbackState"],
        particles: array(initial.particles, "node AURA particles") as SwordParticleSystemSource["nativeInitial"]["particles"],
    };
    const node = object(runtime.chronicleNode, "chronicle node runtime");
    const systemEvidence = object(node.system, "chronicle node AURA evidence");
    expect(systemEvidence.path, NODE_AURA_PATH, "node AURA source path");
    expect(systemEvidence.texturePublicPath, AURA_TEXTURE, "node AURA texture path");
    const renderer = object(systemEvidence.renderer, "node AURA renderer");
    expect(renderer.renderMode, "Billboard", "node AURA render mode");
    expect(renderer.alignment, "View", "node AURA alignment");
    const localToRoot = matrix(renderer.localToSelected, "node AURA renderer localToSelected");
    const material = object(systemEvidence.material, "node AURA material");
    expect(material.name, "PTCS_UI_AURA_SEQ_02_PM", "node AURA material");
    expect(material.shader, "UI/Particles/Premultiply Alpha", "node AURA shader");
    const tintProperty = array(material.properties, "node AURA material properties").map((entry) => object(entry, "node AURA material property"))
        .find((entry) => entry.name === "_TintColor");
    if (!tintProperty)
        throw new Error("Missing node AURA tint");
    const tintValue = object(tintProperty.vector, "node AURA tint value");
    const tint = [number(tintValue.x, "node AURA tint R"), number(tintValue.y, "node AURA tint G"),
        number(tintValue.z, "node AURA tint B"), number(tintValue.w, "node AURA tint A")] as const;
    const config: SwordParticleSystemSource = {
        path: NODE_AURA_PATH,
        name: "AURA",
        kind: "result",
        texture: AURA_TEXTURE,
        controller: null,
        tint,
        nativeInitial,
        source: serialized as unknown as SwordParticleSystemSource["source"],
    };
    // Unity's internal ParticleSystem lifetime clock and public Time.deltaTime
    // straddle the zero-lifetime edge. That difference is visually inert (the
    // retained quad has zero alpha), but NKC_FXM_PLAYER observes the global
    // Random state left by the final *native* buffer particle at each 2 s loop.
    // Prove the source-scheduled single swap-remove operation against two clean
    // native boundaries before using it for the unbounded procedural timeline.
    const calibration = new SwordTrainingParticleSystem(config);
    const boundaryEvidence = object(node.loopBoundaryEvidence, "node AURA loop-boundary evidence");
    expect(boundaryEvidence.framesPerSecond, 60, "node AURA loop-boundary frame rate");
    const boundaryFrames = new Map(array(boundaryEvidence.frames, "node AURA loop-boundary frames")
        .map((entry) => object(entry, "node AURA loop-boundary frame"))
        .map((frame) => [number(frame.frame, "node AURA loop-boundary frame index"), frame]));
    for (let frameIndex = 2; frameIndex <= 240; frameIndex++) {
        calibration.advanceFrame(NATIVE_STEP, MAXIMUM_PARTICLE_STEP);
        if (frameIndex !== 120 && frameIndex !== 240)
            continue;
        const frame = boundaryFrames.get(frameIndex);
        if (!frame)
            throw new Error(`Missing native node AURA loop boundary ${frameIndex}`);
        const expectedRandom = capturedRandomState(frame.globalRandomStateAfterNativeFrame, `node AURA loop boundary ${frameIndex} global Random`);
        const seed = nativeAuraLoopSeed(calibration.snapshot());
        const actualRandom = storyOmenUnityRandomStateFromSeed(seed);
        if (actualRandom.some((word, index) => word !== expectedRandom[index]))
            throw new Error(`Node AURA native loop seed diverged at frame ${frameIndex}`);
    }
    let system = new SwordTrainingParticleSystem(config);
    let currentFrame = 1;
    const loopSeeds = new Map<number, number>();
    const currentNativeSeed = () => nativeAuraLoopSeed(system.snapshot());
    const reset = () => {
        system = new SwordTrainingParticleSystem(config);
        currentFrame = 1;
        loopSeeds.clear();
    };
    return {
        draw(frameIndex: number): SwordTrainingPmaMesh[] {
            if (frameIndex <= 0) {
                reset();
                return [];
            }
            if (frameIndex < currentFrame)
                reset();
            while (currentFrame < frameIndex) {
                const nextFrame = currentFrame + 1;
                if (nextFrame > 1 && (nextFrame - 1) % 120 === 0)
                    loopSeeds.set((nextFrame - 1) / 120, currentNativeSeed());
                system.advanceFrame(NATIVE_STEP, MAXIMUM_PARTICLE_STEP);
                currentFrame = nextFrame;
            }
            return swordTrainingNativeParticleMeshes({
                id: NODE_AURA_PATH,
                mesh: system.mesh(),
                localToRoot,
                width: WIDTH,
                height: HEIGHT,
                texture: AURA_TEXTURE,
                tint,
            }) as SwordTrainingPmaMesh[];
        },
        seedBeforeLoop(loopIndex: number): number {
            const seed = loopSeeds.get(loopIndex);
            if (seed === undefined)
                throw new Error(`Missing node AURA Random seed before loop ${loopIndex}`);
            return seed;
        },
    };
}
type NodeGlitchRuntime = {
    draw(frameIndex: number): StoryOmenGlitchDraw | null;
};
type NativeCurve = Parameters<typeof swordParticleCurve>[0];
type GlitchDynamic = {
    channels: [
        number,
        number,
        number,
        number,
        number,
        number
    ];
    noiseScaleOffset: [
        number,
        number,
        number,
        number
    ];
};
type GlitchEvaluatedFrame = {
    draw: StoryOmenGlitchDraw | null;
    playerTime: number;
    sprite: string;
    alpha: number;
    dynamic: GlitchDynamic;
};
const GLITCH_CHANNELS = [
    "_GlitchRedX", "_GlitchRedY", "_GlitchGreenX",
    "_GlitchGreenY", "_GlitchBlueX", "_GlitchBlueY",
] as const;
function serializedProperty(properties: readonly JsonObject[], index: number, name: string, mode: number): JsonObject {
    const property = properties[index];
    if (!property)
        throw new Error(`Missing node glitch property ${index}`);
    expect(property.Enable, 1, `node glitch ${name} enabled`);
    expect(property.PropertyName, name, `node glitch property ${index} name`);
    expect(property.Mode, mode, `node glitch ${name} mode`);
    return property;
}
function graphicMaterialProperty(materialValue: unknown, name: string): JsonObject {
    const material = object(materialValue, "node glitch material");
    const matches = array(material.properties, "node glitch material properties")
        .map((entry) => object(entry, "node glitch material property"))
        .filter((property) => property.name === name);
    if (matches.length !== 1)
        throw new Error(`Missing node glitch material property: ${name}`);
    return matches[0];
}
function capturedGlitchDynamic(frame: JsonObject): GlitchDynamic {
    const material = object(frame.material, "native node glitch frame material");
    const channels = GLITCH_CHANNELS.map((name) => number(graphicMaterialProperty(material, name).scalar, `node glitch ${name}`)) as GlitchDynamic["channels"];
    const vector = object(graphicMaterialProperty(material, "_NoiseTex_ST").vector, "node glitch noise vector");
    return {
        channels,
        noiseScaleOffset: [number(vector.x, "node glitch noise X"), number(vector.y, "node glitch noise Y"),
            number(vector.z, "node glitch noise Z"), number(vector.w, "node glitch noise W")],
    };
}
function equalNumbers(actual: readonly number[], expected: readonly number[], label: string): void {
    if (actual.length !== expected.length || actual.some((value, index) => !Object.is(value, expected[index])))
        throw new Error(`Native ${label} diverged: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
}
/**
 * Unity AnimationCurve wrap value 1 is the one loop branch present in GreenX.
 * The cache construction and Horner order below mirror UnityPlayer 2022.3.62f2
 * at 0x18058B310 and 0x18058A9D0. Building a normalized Hermite polynomial is
 * mathematically equivalent, but differs by observable float32 ULPs near a key.
 */
function glitchCurve(curve: NativeCurve, input: number): number {
    const keys = curve.m_Curve;
    if (!keys.length)
        return 0;
    let time = input;
    const first = keys[0].time, last = keys[keys.length - 1].time;
    if (time > last && curve.m_PostInfinity === 1) {
        const length = Math.fround(last - first);
        if (!(length > 0))
            throw new Error("Invalid looping node glitch curve");
        const offset = Math.fround(time - first);
        time = Math.fround(first + Math.fround(offset - Math.fround(Math.floor(Math.fround(offset / length)) * length)));
    }
    if (time <= keys[0].time)
        return keys[0].value;
    if (time >= keys[keys.length - 1].time)
        return keys[keys.length - 1].value;
    let index = 1;
    while (keys[index].time <= time)
        index++;
    const a = keys[index - 1], b = keys[index];
    if (a.weightedMode || b.weightedMode)
        throw new Error("Unsupported weighted node glitch curve");
    const f32 = Math.fround;
    const outSlope = Number(a.outSlope), inSlope = Number(b.inSlope);
    if (outSlope === Number.POSITIVE_INFINITY || inSlope === Number.POSITIVE_INFINITY)
        return a.value;
    if (outSlope === Number.NEGATIVE_INFINITY || inSlope === Number.NEGATIVE_INFINITY)
        return b.value;
    if (!Number.isFinite(outSlope) || !Number.isFinite(inSlope))
        throw new Error("Unsupported non-finite node glitch curve tangent");
    const duration = f32(b.time - a.time);
    if (!(duration > 0))
        throw new Error("Invalid node glitch curve key interval");
    const valueDelta = f32(b.value - a.value);
    const inverseDuration = f32(1 / duration);
    const tangentA = f32(outSlope * duration);
    const tangentB = f32(duration * inSlope);
    const inverseDurationSquared = f32(inverseDuration * inverseDuration);
    let cubic = f32(tangentB + tangentA);
    cubic = f32(cubic - valueDelta);
    cubic = f32(cubic - valueDelta);
    cubic = f32(cubic * inverseDurationSquared);
    cubic = f32(cubic * inverseDuration);
    let quadratic = f32(valueDelta + valueDelta);
    quadratic = f32(quadratic + valueDelta);
    quadratic = f32(quadratic - tangentA);
    quadratic = f32(quadratic - tangentA);
    quadratic = f32(quadratic - tangentB);
    quadratic = f32(quadratic * inverseDurationSquared);
    const delta = f32(time - a.time);
    let value = f32(cubic * delta);
    value = f32(value + quadratic);
    value = f32(value * delta);
    value = f32(value + outSlope);
    value = f32(value * delta);
    return f32(value + a.value);
}
function materialPlayerTime(frame: JsonObject): number {
    const matches = array(frame.evaluaters, "node glitch evaluator states")
        .map((entry) => object(entry, "node glitch evaluator state"))
        .filter((entry) => entry.type === "NKC.FX.NKC_FXM_PLAYER" && entry.path === NODE_GLITCH_PATH);
    if (matches.length !== 1)
        throw new Error("Missing native node glitch player state");
    return number(matches[0].playbackTime, "node glitch player time");
}
function buildGlitch(runtime: JsonObject, hierarchy: readonly unknown[], continuous: JsonObject, aura: NodeAuraRuntime): NodeGlitchRuntime {
    const player = component(hierarchy, NODE_GLITCH_PATH, "NKC_FXM_PLAYER");
    expect(player.Duration, 2, "node glitch player duration");
    expect(player.TimeScale, 1, "node glitch player time scale");
    expect(player.AutoStart, 1, "node glitch player auto-start");
    expect(player.AutoDisable, 0, "node glitch player auto-disable");
    expect(player.Loop, 1, "node glitch player loop");
    expect(player.RandomMode, 1, "node glitch player RandomMode");
    const image = component(hierarchy, NODE_GLITCH_PATH, "NKC_FXM_UI_IMAGE");
    expect(image.StartTime, 0, "node glitch Image start");
    expect(image.Duration, 0.30000001192092896, "node glitch Image duration");
    expect(image.RandomValue, 0, "node glitch Image own RandomValue");
    expect(image.Resimulate, 1, "node glitch Image resimulate");
    expect(image.ResetMode, 0, "node glitch Image reset mode");
    expect(image.UseAlphaCurve, 1, "node glitch Image alpha curve");
    expect(image.AlphaMultiplier, 0.4009999930858612, "node glitch Image alpha multiplier");
    expect(image.UseSheetAnimation, 0, "node glitch Image sheet-animation branch");
    expect(image.RandomSprite, 0, "node glitch Image random-sprite branch");
    const imageCurve = object(image.Curve, "node glitch Image alpha curve") as unknown as NativeCurve;
    const frameCurve = object(image.Frame, "node glitch Image frame curve") as unknown as NativeCurve;
    const material = component(hierarchy, NODE_GLITCH_PATH, "NKC_FXM_MATERIAL_UI");
    expect(material.StartTime, 0, "node glitch material start");
    expect(material.Duration, 0.20000000298023224, "node glitch material duration");
    expect(material.RandomValue, 1, "node glitch material RandomValue");
    expect(material.Resimulate, 1, "node glitch material resimulate");
    expect(material.ResetMode, 1, "node glitch material reset mode");
    expect(material.SyncRenderer, 1, "node glitch material renderer sync");
    expect(material.AdditiveCurve, 1, "node glitch additive-curve branch");
    const properties = array(material.Properties, "node glitch properties")
        .map((entry) => object(entry, "node glitch property"));
    expect(properties.length, 9, "node glitch property count");
    const scalarProperties = GLITCH_CHANNELS.map((name, index) => {
        const property = serializedProperty(properties, index, name, 1);
        expect(property.RandomValue, 1, `node glitch ${name} RandomValue`);
        return property;
    });
    const scalarRanges = [
        [0.03999999910593033, 0.20000000298023224],
        [0.03999999910593033, 0.009999999776482582],
        [0.03999999910593033, 0.30000001192092896],
        [0.03999999910593033, 0.019999999552965164],
        [0.03999999910593033, 1],
        [0.03999999910593033, 0.009999999776482582],
    ] as const;
    scalarProperties.forEach((property, index) => {
        expect(property.rndX, scalarRanges[index][0], `node glitch ${GLITCH_CHANNELS[index]} random minimum`);
        expect(property.rndY, scalarRanges[index][1], `node glitch ${GLITCH_CHANNELS[index]} random maximum`);
    });
    const noiseBase = serializedProperty(properties, 7, "_NoiseTex_ST", 2);
    expect(noiseBase.ConstantX, 2, "node glitch noise scale X");
    expect(noiseBase.ConstantY, 25, "node glitch noise scale Y");
    expect(noiseBase.ConstantZ, 15, "node glitch noise base Z");
    expect(noiseBase.ConstantW, 5, "node glitch noise base W");
    const noiseTime = serializedProperty(properties, 8, "_NoiseTex_ST", 17);
    expect(noiseTime.rndTimeX, -1, "node glitch noise TimeZ random minimum");
    expect(noiseTime.rndTimeY, 1, "node glitch noise TimeZ random maximum");
    expect(noiseTime.rndTimeZ, 2, "node glitch noise TimeW random minimum");
    expect(noiseTime.rndTimeW, -2, "node glitch noise TimeW random maximum");
    const nodeImages = object(runtime.nodeImages, "node image evidence");
    const source = object(nodeImages.source, "node image source");
    const summary = object(source.glitchSummary, "node glitch source summary");
    const frameOrder = array(summary.frameOrder, "node glitch frame order").map((entry) => text(entry, "node glitch sprite"));
    const expectedFrameOrder = Array.from({ length: 16 }, (_, index) => `NK_AURA_SEQ_00_${index}`);
    if (frameOrder.length !== expectedFrameOrder.length || frameOrder.some((name, index) => name !== expectedFrameOrder[index]))
        throw new Error("Client node glitch sprite order changed");
    const coverage = array(continuous.nativeGlitchSpriteMeshCoverage, "node glitch native mesh coverage")
        .map((entry) => object(entry, "node glitch native mesh coverage entry"));
    expect(coverage.length, frameOrder.length, "node glitch native mesh coverage count");
    const graphicBySprite = new Map<string, StoryOmenGraphicProbeFrame>();
    for (const entry of coverage) {
        const sprite = text(entry.sprite, "node glitch covered sprite");
        if (!frameOrder.includes(sprite) || graphicBySprite.has(sprite))
            throw new Error(`Invalid node glitch mesh coverage: ${sprite}`);
        const nativeFrame = object(entry.nativeGraphicFrame, `node glitch ${sprite} native frame`);
        const graphics = array(nativeFrame.graphics, `node glitch ${sprite} graphics`);
        if (graphics.length !== 1)
            throw new Error(`Unexpected node glitch Graphic count: ${sprite}`);
        const graphic = structuredClone(object(graphics[0], `node glitch ${sprite} Graphic`));
        expect(graphic.path, NODE_GLITCH_PATH, `node glitch ${sprite} path`);
        expect(graphic.sprite, sprite, `node glitch ${sprite} source sprite`);
        expect(graphic.mainTexture, "NK_AURA_SEQ_00", `node glitch ${sprite} atlas`);
        graphicBySprite.set(sprite, graphic as unknown as StoryOmenGraphicProbeFrame);
    }
    const node = object(runtime.chronicleNode, "chronicle node runtime");
    const baseGraphic = object(node.glitchGraphic, "node glitch base Graphic");
    expect(baseGraphic.path, NODE_GLITCH_PATH, "node glitch base path");
    const localToSelected = matrix(baseGraphic.localToSelected, "node glitch localToSelected");
    const localToStage = matrix(baseGraphic.localToStage, "node glitch localToStage");
    const trace = array(continuous.glitchTimeline, "node glitch continuous timeline")
        .map((entry) => object(entry, "node glitch continuous frame"));
    expect(trace.length, 181, "node glitch continuous frame count");
    trace.forEach((frame, index) => expect(frame.frame, index, `node glitch continuous frame ${index}`));
    const firstLoopDynamics = trace.slice(0, 13).map(capturedGlitchDynamic);
    const texturePaths = { NK_AURA_SEQ_00: GLITCH_MASK_TEXTURE, NOISE_DISSOLVE_00: GLITCH_NOISE_TEXTURE } as const;
    const f32 = Math.fround;
    const timeStep = f32(f32(NATIVE_STEP * f32(.1)));
    const baseZ = number(noiseBase.ConstantZ, "node glitch noise base Z");
    const baseW = number(noiseBase.ConstantW, "node glitch noise base W");
    const continuousFrames = array(continuous.frames, "node continuous particle frames")
        .map((entry) => object(entry, "node continuous particle frame"));
    const startupPostRandomState = capturedRandomState(continuousFrames[0].randomState, "node glitch startup post-Random state");
    // After UI_IMAGE's two and MATERIAL_UI's eight calls, the xorshift state
    // retains calls 7..10. Calls 9/10 are the exact mode-17 TimeZ/TimeW samples.
    const startupSpeedZ = storyOmenUnityRandomFloatRangeFromUInt(startupPostRandomState[2], -1, 1);
    const startupSpeedW = storyOmenUnityRandomFloatRangeFromUInt(startupPostRandomState[3], 2, -2);
    const startupTerminal = (() => {
        let z = 0, w = 0;
        const dz = f32(timeStep * startupSpeedZ), dw = f32(timeStep * startupSpeedW);
        for (let frameIndex = 1; frameIndex < firstLoopDynamics.length; frameIndex++) {
            z = f32(z + dz);
            w = f32(w + dw);
            const expected = firstLoopDynamics[frameIndex].noiseScaleOffset;
            equalNumbers([2, 25, f32(baseZ + z), f32(baseW + w)], expected, `node glitch startup noise vector at frame ${frameIndex}`);
        }
        return [z, w] as const;
    })();
    const createEvaluator = (seedBeforeLoop: (loopIndex: number) => number) => {
        let currentFrame = 0, playerTime = 0, loopIndex = 0;
        let materialComplete = false;
        let channels = [...firstLoopDynamics[0].channels] as GlitchDynamic["channels"];
        let noise = [...firstLoopDynamics[0].noiseScaleOffset] as GlitchDynamic["noiseScaleOffset"];
        let amplitudes = [0, 0, 0, 0, 0, 0] as GlitchDynamic["channels"];
        let speedZ = 0, speedW = 0, offsetZ = 0, offsetW = 0;
        const reset = () => {
            currentFrame = 0;
            playerTime = 0;
            loopIndex = 0;
            materialComplete = false;
            channels = [...firstLoopDynamics[0].channels] as GlitchDynamic["channels"];
            noise = [...firstLoopDynamics[0].noiseScaleOffset] as GlitchDynamic["noiseScaleOffset"];
            amplitudes = [0, 0, 0, 0, 0, 0];
            speedZ = 0;
            speedW = 0;
            offsetZ = 0;
            offsetW = 0;
        };
        const animateNoise = () => {
            const animate = (value: number, speed: number) => {
                const next = f32(value + f32(timeStep * speed));
                return next > 10 ? f32(next - 10) : next < -10 ? f32(next + 10) : next;
            };
            offsetZ = animate(offsetZ, speedZ);
            offsetW = animate(offsetW, speedW);
        };
        const sampleLoop = () => {
            const random = StoryOmenUnityRandom.fromSeed(seedBeforeLoop(loopIndex));
            // NKC_FXM_PLAYER.SetEvaluaterState(2) calls UI_IMAGE first. Its forced
            // RandomMode branch consumes Random.value and Random.Range(int) even
            // though this Image has RandomValue=0 and does not use either result.
            random.nextUInt();
            random.nextUInt();
            amplitudes = scalarRanges.map(([minimum, maximum]) => random.range(minimum, maximum)) as GlitchDynamic["channels"];
            speedZ = random.range(-1, 1);
            speedW = random.range(2, -2);
            materialComplete = false;
            // SetRandomValue's mode-17 branch executes once at a state-2 restart;
            // the regular evaluator update below executes it a second time.
            animateNoise();
        };
        const dynamicMaterial = (normalized: number): GlitchDynamic => {
            channels = scalarProperties.map((property, index) => f32(glitchCurve(object(property.CurveX, `node glitch ${GLITCH_CHANNELS[index]} curve`) as unknown as NativeCurve, normalized) * amplitudes[index])) as GlitchDynamic["channels"];
            noise = [2, 25, f32(baseZ + offsetZ), f32(baseW + offsetW)];
            return { channels: [...channels], noiseScaleOffset: [...noise] };
        };
        const graphicFor = (sprite: string, alpha: number, dynamic: GlitchDynamic): StoryOmenGlitchDraw => {
            const sourceGraphic = graphicBySprite.get(sprite);
            if (!sourceGraphic)
                throw new Error(`Missing exact node glitch mesh: ${sprite}`);
            const graphic = structuredClone(sourceGraphic) as StoryOmenGraphicProbeFrame;
            graphic.type = text(baseGraphic.type, "node glitch base Graphic type");
            graphic.localToSelected = localToSelected;
            graphic.localToStage = localToStage;
            graphic.color = { r: 1, g: 1, b: 1, a: alpha };
            const alphaByte = Math.trunc(f32(f32(Math.max(0, Math.min(1, alpha)) * 255) + .5));
            graphic.mesh.colors = graphic.mesh.colors.map((color) => {
                if (color.r !== 255 || color.g !== 255 || color.b !== 255)
                    throw new Error(`Unexpected node glitch vertex RGB: ${sprite}`);
                return { ...color, a: alphaByte };
            });
            const materialInstance = object(graphic.material, "node glitch Graphic material");
            GLITCH_CHANNELS.forEach((name, index) => {
                graphicMaterialProperty(materialInstance, name).scalar = dynamic.channels[index];
            });
            const noiseProperty = graphicMaterialProperty(materialInstance, "_NoiseTex_ST");
            noiseProperty.vector = { x: dynamic.noiseScaleOffset[0], y: dynamic.noiseScaleOffset[1],
                z: dynamic.noiseScaleOffset[2], w: dynamic.noiseScaleOffset[3] };
            const draw = storyOmenGlitchDraw(graphic, texturePaths, IDENTITY, WIDTH, HEIGHT);
            if (!draw)
                throw new Error(`Exact node glitch Graphic became non-renderable: ${sprite}`);
            return draw;
        };
        const advance = (): GlitchEvaluatedFrame => {
            const nextPlayer = f32(playerTime + NATIVE_STEP);
            const restarted = nextPlayer > number(player.Duration, "node glitch player duration");
            playerTime = restarted ? f32(nextPlayer - number(player.Duration, "node glitch player duration")) : nextPlayer;
            if (restarted) {
                loopIndex++;
                sampleLoop();
            }
            currentFrame++;
            const imageDuration = number(image.Duration, "node glitch Image duration");
            let sprite = frameOrder[0], alpha = 0;
            if (playerTime < imageDuration) {
                const normalized = f32(playerTime / imageDuration);
                const spriteIndex = Math.max(0, Math.min(frameOrder.length - 1, Math.floor(glitchCurve(frameCurve, normalized))));
                sprite = frameOrder[spriteIndex];
                alpha = f32(glitchCurve(imageCurve, normalized) * number(image.AlphaMultiplier, "node glitch alpha multiplier"));
            }
            let dynamic: GlitchDynamic;
            if (loopIndex === 0) {
                const startupIndex = Math.min(currentFrame, firstLoopDynamics.length - 1);
                dynamic = { channels: [...firstLoopDynamics[startupIndex].channels],
                    noiseScaleOffset: [...firstLoopDynamics[startupIndex].noiseScaleOffset] };
                channels = [...dynamic.channels];
                noise = [...dynamic.noiseScaleOffset];
                if (currentFrame === firstLoopDynamics.length - 1) {
                    materialComplete = true;
                    offsetZ = startupTerminal[0];
                    offsetW = startupTerminal[1];
                }
            }
            else if (!materialComplete) {
                const materialDuration = number(material.Duration, "node glitch material duration");
                const playback = Math.min(playerTime, materialDuration);
                animateNoise();
                dynamic = dynamicMaterial(f32(playback / materialDuration));
                if (playerTime >= materialDuration)
                    materialComplete = true;
            }
            else
                dynamic = { channels: [...channels], noiseScaleOffset: [...noise] };
            return { draw: graphicFor(sprite, alpha, dynamic), playerTime, sprite, alpha, dynamic };
        };
        return {
            frame(frameIndex: number): GlitchEvaluatedFrame | null {
                if (frameIndex <= 0) {
                    reset();
                    return null;
                }
                if (frameIndex < currentFrame)
                    reset();
                let evaluated: GlitchEvaluatedFrame | null = null;
                while (currentFrame < frameIndex)
                    evaluated = advance();
                if (!evaluated) {
                    // Repeated frameAt calls must be referentially stable without
                    // consuming UnityEngine.Random or advancing FXM state.
                    const dynamic = { channels: [...channels], noiseScaleOffset: [...noise] } as GlitchDynamic;
                    const imageDuration = number(image.Duration, "node glitch Image duration");
                    let sprite = frameOrder[0], alpha = 0;
                    if (playerTime < imageDuration) {
                        const normalized = f32(playerTime / imageDuration);
                        sprite = frameOrder[Math.max(0, Math.min(frameOrder.length - 1, Math.floor(glitchCurve(frameCurve, normalized))))];
                        alpha = f32(glitchCurve(imageCurve, normalized) * number(image.AlphaMultiplier, "node glitch alpha multiplier"));
                    }
                    evaluated = { draw: graphicFor(sprite, alpha, dynamic), playerTime, sprite, alpha, dynamic };
                }
                return evaluated;
            },
        };
    };
    // Exercise the independently captured second loop before exposing the
    // infinite evaluator. This proves player float wrapping, UI curve/sprite
    // timing, material curve wrapping, 2+8 Random calls and mode-17 persistence.
    const oracle = createEvaluator((loop) => {
        const boundary = loop * 120;
        const capturedFrame = object(array(continuous.frames, "node continuous frames")[boundary], `node loop ${loop} boundary`);
        const auraSystem = array(capturedFrame.systems, `node loop ${loop} AURA systems`)
            .map((entry) => object(entry, `node loop ${loop} AURA system`))
            .find((entry) => typeof entry.path === "string" && entry.path.endsWith("/AURA"));
        if (!auraSystem)
            throw new Error(`Missing node AURA loop ${loop} boundary`);
        const particles = array(auraSystem.particles, `node loop ${loop} AURA particles`)
            .map((entry) => object(entry, `node loop ${loop} AURA particle`));
        const seed = particles.at(-1)?.randomSeed;
        return number(seed, `node loop ${loop} AURA final seed`);
    });
    for (let frameIndex = 1; frameIndex < trace.length; frameIndex++) {
        const actual = oracle.frame(frameIndex)!;
        const expectedFrame = trace[frameIndex];
        expect(actual.sprite, expectedFrame.sprite, `node glitch sprite at frame ${frameIndex}`);
        expect(actual.alpha, number(object(expectedFrame.color, "node glitch color").a, "node glitch alpha"), `node glitch alpha at frame ${frameIndex}`);
        expect(actual.playerTime, materialPlayerTime(expectedFrame), `node glitch player time at frame ${frameIndex}`);
        const expectedDynamic = capturedGlitchDynamic(expectedFrame);
        equalNumbers(actual.dynamic.channels, expectedDynamic.channels, `node glitch channels at frame ${frameIndex}`);
        equalNumbers(actual.dynamic.noiseScaleOffset, expectedDynamic.noiseScaleOffset, `node glitch noise vector at frame ${frameIndex}`);
    }
    const evaluator = createEvaluator((loopIndex) => aura.seedBeforeLoop(loopIndex));
    return { draw(frameIndex) { return evaluator.frame(frameIndex)?.draw ?? null; } };
}
function validateAssets(runtime: JsonObject): void {
    expect(assetPath(runtime, "AB_UI_OPERATION_ADDITIVE.png"), OPERATION_ADDITIVE_TEXTURE, "node Bg public path");
    expect(assetPath(runtime, "SUB_THUMB_BIG_OMEN.png"), THUMB_TEXTURE, "node THUMB public path");
    expect(assetPath(runtime, "UI_AURA_SEQ_01.png"), AURA_TEXTURE, "node AURA public path");
    expect(assetPath(runtime, "NK_AURA_SEQ_00.png"), GLITCH_MASK_TEXTURE, "node glitch atlas path");
    expect(assetPath(runtime, "NOISE_DISSOLVE_00.png"), GLITCH_NOISE_TEXTURE, "node glitch noise path");
    expect(assetPath(runtime, "tmp-node-atlas.png"), TMP_ATLAS_TEXTURE, "node TMP atlas path");
}
export function buildStoryOmenChronicleNodeExactSource(runtimeValue: unknown): StoryOmenContinuousSceneSource {
    const runtime = object(runtimeValue, "node Omen runtime");
    expect(runtime.surface, "chronicle-node", "node runtime surface");
    validateAssets(runtime);
    const coordinate = object(runtime.coordinateSpace, "node coordinate space");
    const canvas = object(coordinate.canvas, "node canvas");
    expect(canvas.width, WIDTH, "node canvas width");
    expect(canvas.height, HEIGHT, "node canvas height");
    const node = object(runtime.chronicleNode, "chronicle node runtime");
    expect(node.rootPath, STORY_OMEN_NODE_ROOT, "node root path");
    expect(node.activeParticlePath, NODE_AURA_PATH, "node active particle path");
    expect(node.activeGlitchPath, NODE_GLITCH_PATH, "node active glitch path");
    const inactive = array(node.inactiveCounterexamples, "node inactive counterexamples");
    const expectedInactive = ["FOCUS_FX", "New", "SORT_ICON", "EVENT_DROP"];
    for (const suffix of expectedInactive) {
        if (!inactive.some((path) => typeof path === "string" && path === `${STORY_OMEN_NODE_ROOT}/${suffix}`))
            throw new Error(`Missing inactive Omen node counterexample: ${suffix}`);
    }
    const nodeImages = object(runtime.nodeImages, "node image evidence");
    expect(nodeImages.rectMaskCount, 0, "node RectMask count");
    const hierarchySource = object(nodeImages.source, "node image source");
    const hierarchy = array(hierarchySource.hierarchy, "node source hierarchy");
    const frames = array(nodeImages.frames, "node image frames").map((entry) => object(entry, "node image frame"));
    if (!frames.length)
        throw new Error("Missing rendered node image frame");
    const graphics = array(frames[0].activeImages, "node active Images");
    expect(graphics.length, 2, "node active static Image count");
    const bg = graphics.find((entry) => object(entry, "node Image").path === NODE_BG_PATH);
    const thumb = graphics.find((entry) => object(entry, "node Image").path === NODE_THUMB_PATH);
    if (!bg || !thumb)
        throw new Error("Missing node Bg/THUMB native Graphic");
    const texturePaths = {
        AB_UI_OPERATION_ADDITIVE: OPERATION_ADDITIVE_TEXTURE,
        SUB_THUMB_BIG_OMEN: THUMB_TEXTURE,
        NK_AURA_SEQ_00: GLITCH_MASK_TEXTURE,
        NOISE_DISSOLVE_00: GLITCH_NOISE_TEXTURE,
    } as const;
    const staticDraws = storyOmenGraphicDraws([
        remapOperationAdditive(bg),
        sourceGraphic(thumb, NODE_THUMB_PATH),
    ], [NODE_BG_PATH, NODE_THUMB_PATH], texturePaths, IDENTITY, WIDTH, HEIGHT);
    if (staticDraws.glitches.length || staticDraws.meshes.length !== 2)
        throw new Error("Unexpected native node static Image branch");
    const staticByPath = new Map(staticDraws.meshes.map((mesh) => [mesh.id, mesh]));
    const bgMesh = staticByPath.get(NODE_BG_PATH), thumbMesh = staticByPath.get(NODE_THUMB_PATH);
    if (!bgMesh || !thumbMesh)
        throw new Error("Missing converted node static Image");
    const nativeText = object(runtime.nativeText, "node native text");
    const capture = object(nativeText.chronicleNode, "node native TMP");
    const tmp = storyOmenNativeTmpDraws(capture, {
        atlasTexture: TMP_ATLAS_TEXTURE,
        localToSurface: matrix(capture.localToSelected, "node TMP localToSelected"),
        surfaceOrigin: ORIGIN,
    });
    if (tmp.length !== 1)
        throw new Error("Unexpected node TMP material count");
    const continuous = object(runtime.nodeContinuousEvidence, "node continuous evidence");
    const aura = buildAura(runtime, hierarchy, continuous);
    const glitch = buildGlitch(runtime, hierarchy, continuous, aura);
    return {
        surface: "chronicle-node",
        sourceRoot: STORY_OMEN_NODE_ROOT,
        referenceWidth: WIDTH,
        referenceHeight: HEIGHT,
        interactiveTargets: [STORY_OMEN_NODE_HIT_TARGET.path],
        maximumInteractionTransitionSeconds: STORY_OMEN_NODE_HIT_TARGET.trackingSeconds,
        preloadTextures: [
            { path: OPERATION_ADDITIVE_TEXTURE, filter: "linear", wrapU: "clamp", wrapV: "clamp" },
            { path: THUMB_TEXTURE, filter: "linear", wrapU: "clamp", wrapV: "clamp" },
            { path: AURA_TEXTURE, filter: "linear", wrapU: "clamp", wrapV: "clamp" },
            { path: TMP_ATLAS_TEXTURE, filter: "linear", wrapU: "clamp", wrapV: "clamp" },
            { path: GLITCH_MASK_TEXTURE, filter: "linear", wrapU: "clamp", wrapV: "clamp" },
            { path: GLITCH_NOISE_TEXTURE, filter: "linear", wrapU: "repeat", wrapV: "repeat" },
        ],
        continuity: "procedural-infinite",
        frameAt(elapsedSeconds: number, interaction: StoryOmenNativeInteractionFrame) {
            const frameIndex = Math.max(0, Math.floor(elapsedSeconds * 60 + 0.000001));
            const commands: StoryOmenSceneDrawCommand[] = [
                { kind: "mesh", sourcePath: NODE_BG_PATH, mesh: bgMesh },
                ...aura.draw(frameIndex).map((mesh): StoryOmenSceneDrawCommand => ({ kind: "mesh", sourcePath: NODE_AURA_PATH, mesh })),
                { kind: "mesh", sourcePath: NODE_THUMB_PATH, mesh: thumbMesh },
                ...tmp.map((draw: StoryOmenTmpDraw): StoryOmenSceneDrawCommand => ({ kind: "tmp", sourcePath: text(capture.sourcePath, "node TMP sourcePath"), draw })),
            ];
            const glitchDraw = glitch.draw(frameIndex);
            if (glitchDraw)
                commands.push({ kind: "grab-glitch", sourcePath: NODE_GLITCH_PATH, draw: glitchDraw });
            const scale = storyOmenNodeStateButtonScale(interaction);
            return { surface: "chronicle-node", elapsedSeconds, commands: commands.map((command) => scaleCommand(command, scale)) };
        },
    };
}
