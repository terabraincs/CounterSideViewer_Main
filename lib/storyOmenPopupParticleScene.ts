import type { SwordTrainingPmaMesh } from "../components/minigames/sword-training/SwordTrainingPmaMeshes.tsx";
import type { StoryOmenSceneDrawCommand, StoryOmenSceneTexture, } from "./storyOmenNativeRuntime.ts";
import { SwordTrainingParticleRandom, swordParticleGradient, swordParticleMinMaxCurve, } from "./swordTrainingClientParticles.ts";
const POPUP_SURFACE = "popup";
const SOURCE_ROOT = "UI_EC_SIDESTORY_OMEN/UI_PTC";
const PARTICLE_EVIDENCE_SHA256 = "A1283CAB1C89EF2FBE34B7F1DA826172B299241786B873E0DCF2660CC15FC118";
const SMOKE_PATH = `${SOURCE_ROOT}/UI_PTC_ENV_TRIM_DUST/SMOKE`;
const SHAPE_PATH = `${SOURCE_ROOT}/PTC_ASH/SHAPE`;
const GLOW_PATH = `${SOURCE_ROOT}/PTC_ASH/GLOW`;
const EMBER_PATH = `${SOURCE_ROOT}/ENV_PTC_EMBER_AMBIENT_ORANGE_00`;
const ORDERED_PATHS = [SMOKE_PATH, SHAPE_PATH, GLOW_PATH, EMBER_PATH] as const;
type PopupParticlePath = (typeof ORDERED_PATHS)[number];
type ParticleAsset = {
    name: string;
    path: string;
    width: number;
    height: number;
    pngSha256: string;
    filter: StoryOmenSceneTexture["filter"];
    wrapU: StoryOmenSceneTexture["wrapU"];
    wrapV: StoryOmenSceneTexture["wrapV"];
};
// client-evidence.json fixes the decoded PNGs. Texture2D m_TextureSettings in
// the three original bundles fix the sampler branches (1=bilinear, 0=repeat,
// 1=clamp); the browser must not infer them from file extensions.
const PARTICLE_ASSETS = {
    "Default-Particle": {
        name: "Default-Particle",
        path: "/story/map-ui/omen-particles/Default-Particle.png",
        width: 64,
        height: 64,
        pngSha256: "DC7B1450ABD937F6653FF0516E9FE8D7133D4C54E106AAB281100EE96B37DFDA",
        filter: "linear",
        wrapU: "repeat",
        wrapV: "repeat",
    },
    PTCS_DEBRIS_GLOW_00: {
        name: "PTCS_DEBRIS_GLOW_00",
        path: "/story/map-ui/omen-particles/PTCS_DEBRIS_GLOW_00.png",
        width: 128,
        height: 128,
        pngSha256: "59B642C0AFBDD9B792D7D010D42C1C3C862DC26B6CF914671CBD515CA4D78662",
        filter: "linear",
        wrapU: "clamp",
        wrapV: "clamp",
    },
    PTCS_UI_SMOKE_00: {
        name: "PTCS_UI_SMOKE_00",
        path: "/story/map-ui/omen-particles/PTCS_UI_SMOKE_00.png",
        width: 128,
        height: 128,
        pngSha256: "7F931E650CE529AEC7ECC4F99E932E916A19D72858B10CBC26BF66B996230A7D",
        filter: "linear",
        wrapU: "clamp",
        wrapV: "clamp",
    },
} as const satisfies Record<string, ParticleAsset>;
const PATH_CONTRACT: Record<PopupParticlePath, {
    texture: keyof typeof PARTICLE_ASSETS;
    material: string;
    shader: "ui-alpha" | "ptc-pma-stream" | "ptc-alpha-additive";
    renderMode: number;
    renderAlignment: number;
    sortMode: number;
}> = {
    [SMOKE_PATH]: {
        texture: "PTCS_UI_SMOKE_00",
        material: "PTCS_UI_SMOKE",
        shader: "ui-alpha",
        renderMode: 0,
        renderAlignment: 2,
        sortMode: 1,
    },
    [SHAPE_PATH]: {
        texture: "PTCS_DEBRIS_GLOW_00",
        material: "PTCS_DEBRIS_GLOW_00_PM",
        shader: "ptc-pma-stream",
        renderMode: 0,
        renderAlignment: 0,
        sortMode: 1,
    },
    [GLOW_PATH]: {
        texture: "PTCS_DEBRIS_GLOW_00",
        material: "PTCS_DEBRIS_GLOW_00_PM",
        shader: "ptc-pma-stream",
        renderMode: 0,
        renderAlignment: 0,
        sortMode: 1,
    },
    [EMBER_PATH]: {
        texture: "Default-Particle",
        material: "(legacy)CMN_SPRITE_INTENSITY_PA",
        shader: "ptc-alpha-additive",
        renderMode: 1,
        renderAlignment: 0,
        sortMode: 3,
    },
};
type NativeVector = {
    x: number;
    y: number;
    z?: number;
    w?: number;
};
type NativeColor32 = {
    r: number;
    g: number;
    b: number;
    a: number;
};
type Vector3 = {
    x: number;
    y: number;
    z: number;
};
type Color32 = {
    r: number;
    g: number;
    b: number;
    a: number;
};
type ParticleCurve = Parameters<typeof swordParticleMinMaxCurve>[0];
type ParticleGradient = Parameters<typeof swordParticleGradient>[0];
type NativeMesh = {
    positions: readonly NativeVector[];
    uv0: readonly NativeVector[];
    uv1: readonly NativeVector[];
    uv2: readonly NativeVector[];
    uv3: readonly NativeVector[];
    colors: readonly NativeColor32[];
    triangles: readonly number[];
};
export type StoryOmenPopupParticleSnapshot = {
    frameIndex: number;
    systems: readonly {
        sourcePath: PopupParticlePath;
        time: number;
        randomSeed: number;
        particleCount: number;
        playbackState: readonly {
            name: string;
            value: string;
        }[];
        particles: readonly Record<string, unknown>[];
    }[];
};
export type StoryOmenPopupParticleRuntime = {
    preloadTextures: StoryOmenSceneTexture[];
    draw(frameIndex: number): StoryOmenSceneDrawCommand[];
    snapshot(frameIndex: number): StoryOmenPopupParticleSnapshot;
};
type RuntimeSystem = {
    path: PopupParticlePath;
    system: Record<string, unknown>;
    renderer: Record<string, unknown>;
    material: string;
    mainTexture: string;
};
type NativeSystem = {
    path: string;
    time: number;
    randomSeed: number;
    particleCount: number;
    playbackState: readonly {
        name: string;
        value: string;
    }[];
    particles: readonly Record<string, unknown>[];
    geometry: {
        meshKind: string;
        rawPositionSpace: string;
        rawToSelected: readonly number[];
        raw: NativeMesh;
    };
};
type SmokeModules = {
    InitialModule: Record<string, unknown>;
    ShapeModule: Record<string, unknown>;
    EmissionModule: Record<string, unknown>;
    SizeModule: Record<string, unknown>;
    ColorModule: Record<string, unknown>;
    VelocityModule: Record<string, unknown>;
    ForceModule: Record<string, unknown>;
    ClampVelocityModule: Record<string, unknown>;
    NoiseModule: Record<string, unknown>;
    RotationModule: Record<string, unknown>;
    RotationBySpeedModule: Record<string, unknown>;
    CustomDataModule: Record<string, unknown>;
    UVModule: Record<string, unknown>;
};
type SmokeConfig = {
    duration: number;
    simulationSpeed: number;
    randomSeed: number;
    modules: SmokeModules;
};
type SmokeParticle = {
    randomSeed: number;
    position: Vector3;
    velocity: Vector3;
    animatedVelocity: Vector3;
    rotation: Vector3;
    angularVelocity: Vector3;
    startLifetime: number;
    remainingLifetime: number;
    /** Evaluator clock reconstructed from public lifetime fields; not a claimed native age SoA. */
    ageSeconds: number;
    startSize: Vector3;
    startColor: Color32;
};
function object(value: unknown, label: string): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value))
        throw new Error(`Missing ${label}`);
    return value as Record<string, unknown>;
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
function numeric(value: unknown, label: string): number {
    if (typeof value !== "number" || !Number.isFinite(value))
        throw new Error(`Invalid ${label}`);
    return value;
}
function integer(value: unknown, label: string): number {
    const result = numeric(value, label);
    if (!Number.isInteger(result))
        throw new Error(`Invalid ${label}`);
    return result;
}
function expect(actual: unknown, expected: unknown, label: string): void {
    if (actual !== expected)
        throw new Error(`Client ${label} changed: ${String(actual)}`);
}
function exactArray(actual: readonly unknown[], expected: readonly unknown[], label: string): void {
    if (actual.length !== expected.length || actual.some((entry, index) => entry !== expected[index]))
        throw new Error(`Client ${label} changed`);
}
function sourcePath(capturedPath: string): PopupParticlePath {
    const path = capturedPath.startsWith("UI_EC_SIDESTORY_OMEN/")
        ? capturedPath
        : `UI_EC_SIDESTORY_OMEN/${capturedPath}`;
    if (!ORDERED_PATHS.includes(path as PopupParticlePath))
        throw new Error(`Unexpected popup particle path: ${path}`);
    return path as PopupParticlePath;
}
function nativeVector(value: unknown, label: string): NativeVector {
    const entry = object(value, label);
    const result: NativeVector = { x: numeric(entry.x, `${label}.x`), y: numeric(entry.y, `${label}.y`) };
    if (entry.z !== undefined)
        result.z = numeric(entry.z, `${label}.z`);
    if (entry.w !== undefined)
        result.w = numeric(entry.w, `${label}.w`);
    return result;
}
function nativeColor(value: unknown, label: string): NativeColor32 {
    const entry = object(value, label);
    const result = { r: integer(entry.r, `${label}.r`), g: integer(entry.g, `${label}.g`),
        b: integer(entry.b, `${label}.b`), a: integer(entry.a, `${label}.a`) };
    if (Object.values(result).some((channel) => channel < 0 || channel > 255))
        throw new Error(`Invalid ${label}`);
    return result;
}
function nativeMesh(value: unknown, label: string): NativeMesh {
    const mesh = object(value, label);
    return {
        positions: array(mesh.positions, `${label}.positions`).map((entry, index) => nativeVector(entry, `${label}.positions[${index}]`)),
        uv0: array(mesh.uv0, `${label}.uv0`).map((entry, index) => nativeVector(entry, `${label}.uv0[${index}]`)),
        uv1: array(mesh.uv1, `${label}.uv1`).map((entry, index) => nativeVector(entry, `${label}.uv1[${index}]`)),
        uv2: array(mesh.uv2, `${label}.uv2`).map((entry, index) => nativeVector(entry, `${label}.uv2[${index}]`)),
        uv3: array(mesh.uv3, `${label}.uv3`).map((entry, index) => nativeVector(entry, `${label}.uv3[${index}]`)),
        colors: array(mesh.colors, `${label}.colors`).map((entry, index) => nativeColor(entry, `${label}.colors[${index}]`)),
        triangles: array(mesh.triangles, `${label}.triangles`).map((entry, index) => integer(entry, `${label}.triangles[${index}]`)),
    };
}
function matrix(value: unknown, label: string): readonly number[] {
    const result = array(value, label).map((entry, index) => numeric(entry, `${label}[${index}]`));
    if (result.length !== 16)
        throw new Error(`Invalid ${label}`);
    return result;
}
function vector3(value: unknown, label: string): Vector3 {
    const entry = object(value, label);
    return {
        x: numeric(entry.x, `${label}.x`),
        y: numeric(entry.y, `${label}.y`),
        z: numeric(entry.z, `${label}.z`),
    };
}
function color32(value: unknown, label: string): Color32 {
    const entry = object(value, label);
    const result = {
        r: integer(entry.r, `${label}.r`),
        g: integer(entry.g, `${label}.g`),
        b: integer(entry.b, `${label}.b`),
        a: integer(entry.a, `${label}.a`),
    };
    if (Object.values(result).some((channel) => channel < 0 || channel > 255))
        throw new Error(`Invalid ${label}`);
    return result;
}
function moduleRecord(modules: Record<string, unknown>, name: keyof SmokeModules): Record<string, unknown> {
    return object(modules[name], `SMOKE ${name}`);
}
function particleCurve(value: unknown, label: string): ParticleCurve {
    const curve = object(value, label);
    const state = integer(curve.minMaxState, `${label}.minMaxState`);
    if (state < 0 || state > 3)
        throw new Error(`Unsupported ${label} mode`);
    numeric(curve.scalar, `${label}.scalar`);
    numeric(curve.minScalar, `${label}.minScalar`);
    object(curve.maxCurve, `${label}.maxCurve`);
    object(curve.minCurve, `${label}.minCurve`);
    return curve as ParticleCurve;
}
function particleGradient(value: unknown, label: string): ParticleGradient {
    const gradient = object(value, label);
    integer(gradient.m_NumColorKeys, `${label}.m_NumColorKeys`);
    integer(gradient.m_NumAlphaKeys, `${label}.m_NumAlphaKeys`);
    expect(gradient.m_Mode, 0, `${label} mode`);
    return gradient as ParticleGradient;
}
const f32 = Math.fround;
const PARTICLE_FLOAT_SCALE = f32(1 / 0x7fffff);
const RADIANS_TO_DEGREES = f32(180 / Math.PI);
const SMOKE_VELOCITY_RANDOM_SALT = 0xe0fbd834;
const SMOKE_NOISE_STRENGTH_RANDOM_SALT = 0x3edcba94;
const SMOKE_ROTATION_BY_SPEED_RANDOM_SALT = 0xdec4aea1;
const PARTICLE_ROTATION_DIRECTION_RANDOM_SALT = 0xff2bb1a4;
function particleRandom(seed: number, salt: number): SwordTrainingParticleRandom {
    return new SwordTrainingParticleRandom((seed + salt) >>> 0);
}
function particleFloat(value: number): number {
    return f32((value & 0x7fffff) * PARTICLE_FLOAT_SCALE);
}
function curveValue(value: unknown, time: number, random = 0, label = "particle curve"): number {
    return swordParticleMinMaxCurve(particleCurve(value, label), time, random);
}
function colorByte(value: number): number {
    return Math.trunc(f32(f32(Math.max(0, Math.min(1, value)) * 255) + 0.5));
}
function initialGradientColor(value: unknown, random: number): Color32 {
    const source = object(value, "SMOKE Initial.startColor");
    expect(source.minMaxState, 4, "SMOKE initial color mode");
    const color = swordParticleGradient(particleGradient(source.maxGradient, "SMOKE Initial.startColor.maxGradient"), random);
    return { r: colorByte(color.r), g: colorByte(color.g), b: colorByte(color.b), a: colorByte(color.a) };
}
// UnityPlayer 2022.3.62f2 initializes its Medium-quality ParticleSystem noise
// table with the eight normalized 2D gradients below. The source permutation
// table is the one read by the native derivative at VA 0x18112A410.
const MEDIUM_NOISE_PERMUTATION = [
    151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225,
    140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148,
    247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32,
    57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175,
    74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122,
    60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54,
    65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169,
    200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64,
    52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212,
    207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213,
    119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
    129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104,
    218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241,
    81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157,
    184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93,
    222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180,
] as const;
const MEDIUM_NOISE_GRADIENTS: readonly (readonly [
    number,
    number
])[] = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [f32(Math.SQRT1_2), f32(Math.SQRT1_2)], [-f32(Math.SQRT1_2), f32(Math.SQRT1_2)],
    [f32(Math.SQRT1_2), -f32(Math.SQRT1_2)], [-f32(Math.SQRT1_2), -f32(Math.SQRT1_2)],
];
function mediumNoisePermutation(index: number): number {
    return MEDIUM_NOISE_PERMUTATION[index & 255];
}
/** Native Medium/2D derivative wrapper at VA 0x181130040, one octave. */
function mediumNoiseDerivative(xValue: number, yValue: number, frequencyValue: number): readonly [
    number,
    number
] {
    const x = f32(xValue), y = f32(yValue), frequency = f32(frequencyValue);
    const scaledX = f32(x * frequency), scaledY = f32(y * frequency);
    const floorX = Math.floor(scaledX), floorY = Math.floor(scaledY);
    const xFraction = f32(scaledX - floorX), yFraction = f32(scaledY - floorY);
    const gradient = (xOffset: number, yOffset: number) => MEDIUM_NOISE_GRADIENTS[mediumNoisePermutation(mediumNoisePermutation(floorX + xOffset) + floorY + yOffset) & 7];
    const gradient00 = gradient(0, 0), gradient10 = gradient(1, 0);
    const gradient01 = gradient(0, 1), gradient11 = gradient(1, 1);
    const dot = (entry: readonly [
        number,
        number
    ], xDistance: number, yDistance: number) => f32(f32(xDistance * entry[0]) + f32(yDistance * entry[1]));
    const n00 = dot(gradient00, xFraction, yFraction);
    const n10 = dot(gradient10, f32(xFraction - 1), yFraction);
    const n01 = dot(gradient01, xFraction, f32(yFraction - 1));
    const n11 = dot(gradient11, f32(xFraction - 1), f32(yFraction - 1));
    const fade = (value: number) => f32(f32(f32(value * value) * value) *
        f32(f32(value * f32(f32(value * 6) - 15)) + 10));
    // VA 0x18112AA2E-0x18112AA7F multiplies 30*x, then x, before
    // multiplying x*(x-2)+1. Keeping that SSE order avoids a 1-ULP curl drift.
    const fadeDerivative = (value: number) => f32(f32(f32(30 * value) * value) * f32(f32(value * f32(value - 2)) + 1));
    const fadeX = fade(xFraction), fadeY = fade(yFraction);
    const derivativeX = fadeDerivative(xFraction), derivativeY = fadeDerivative(yFraction);
    // 0x18112AB46-0x18112AC49 uses the expanded bicubic derivative rather
    // than two nested lerps. Preserve that SIMD instruction order: Medium
    // noise is chaotic enough for one different add rounding to become visible
    // after a few dozen particle steps.
    const mixedNoise = f32(f32(f32(n11 - n01) - n10) + n00);
    const mixedGradientX = f32(f32(f32(gradient11[0] - gradient01[0]) - gradient10[0]) + gradient00[0]);
    const mixedGradientY = f32(f32(f32(gradient11[1] - gradient01[1]) - gradient10[1]) + gradient00[1]);
    const gradientXAcrossY = f32(f32(gradient01[0] - gradient00[0]) +
        f32(fadeX * mixedGradientX));
    const gradientYAcrossY = f32(f32(gradient01[1] - gradient00[1]) +
        f32(fadeX * mixedGradientY));
    const gradientXBase = f32(f32(fadeX * f32(gradient10[0] - gradient00[0])) +
        f32(f32(fadeY * gradientXAcrossY) + gradient00[0]));
    const gradientYBase = f32(f32(fadeX * f32(gradient10[1] - gradient00[1])) +
        f32(f32(fadeY * gradientYAcrossY) + gradient00[1]));
    const noiseDerivativeX = f32(f32(fadeY * mixedNoise) + f32(n10 - n00));
    const noiseDerivativeY = f32(f32(fadeX * mixedNoise) + f32(n01 - n00));
    const resultX = f32(f32(noiseDerivativeX * derivativeX) + gradientXBase);
    const resultY = f32(f32(noiseDerivativeY * derivativeY) + gradientYBase);
    const scale = f32(f32(1.4142135381698608) * frequency);
    return [f32(scale * resultX), f32(scale * resultY)];
}
function parseRuntimeSystem(value: unknown): RuntimeSystem {
    const entry = object(value, "popup particle source system");
    const path = sourcePath(text(entry.path, "popup particle source path"));
    const contract = PATH_CONTRACT[path];
    const system = object(entry.system, `${path}.system`);
    const renderer = object(entry.renderer, `${path}.renderer`);
    expect(entry.active, true, `${path} active`);
    expect(entry.material, contract.material, `${path} material`);
    expect(entry.mainTexture, contract.texture, `${path} main texture`);
    expect(system.looping, true, `${path} looping`);
    expect(system.prewarm, true, `${path} prewarm`);
    expect(system.playOnAwake, true, `${path} playOnAwake`);
    expect(renderer.m_RenderMode, contract.renderMode, `${path} render mode`);
    expect(renderer.m_RenderAlignment, contract.renderAlignment, `${path} render alignment`);
    expect(renderer.m_SortMode, contract.sortMode, `${path} sort mode`);
    return { path, system, renderer, material: contract.material, mainTexture: contract.texture };
}
function validateSourceTextures(value: unknown): void {
    const textures = array(value, "popup particle source textures");
    exactArray(textures.map((entry) => text(object(entry, "popup particle source texture").name, "source texture name")), Object.keys(PARTICLE_ASSETS), "popup particle source-texture order");
    for (const value of textures) {
        const entry = object(value, "popup particle source texture");
        const name = text(entry.name, "popup particle texture name") as keyof typeof PARTICLE_ASSETS;
        const expected = PARTICLE_ASSETS[name];
        if (!expected)
            throw new Error(`Unexpected popup particle texture: ${name}`);
        expect(entry.publicPath, expected.path, `${name} public path`);
        expect(entry.width, expected.width, `${name} width`);
        expect(entry.height, expected.height, `${name} height`);
        expect(entry.pngSha256, expected.pngSha256, `${name} PNG SHA-256`);
        const sampler = object(entry.nativeRuntimeSampler, `${name} native sampler`);
        expect(sampler.name, name, `${name} sampler name`);
        expect(sampler.dimension, "Tex2D", `${name} sampler dimension`);
        expect(sampler.filterMode, "Bilinear", `${name} sampler filter`);
        expect(sampler.wrapModeU, expected.wrapU === "repeat" ? "Repeat" : "Clamp", `${name} sampler wrap U`);
        expect(sampler.wrapModeV, expected.wrapV === "repeat" ? "Repeat" : "Clamp", `${name} sampler wrap V`);
        expect(sampler.width, expected.width, `${name} sampler width`);
        expect(sampler.height, expected.height, `${name} sampler height`);
        expect(sampler.mipmapCount, name === "Default-Particle" ? 7 : 1, `${name} sampler mip count`);
    }
}
function parseNativeSystem(value: unknown): NativeSystem {
    const entry = object(value, "popup initial native system");
    const path = text(entry.path, "popup initial native path");
    sourcePath(path);
    const geometry = object(entry.geometry, `${path}.geometry`);
    const playbackState = array(entry.playbackState, `${path}.playbackState`).map((state, index) => {
        const item = object(state, `${path}.playbackState[${index}]`);
        return { name: text(item.name, "playback-state name"), value: text(item.value, "playback-state value") };
    });
    const particles = array(entry.particles, `${path}.particles`).map((particle, index) => object(particle, `${path}.particles[${index}]`));
    const particleCount = integer(entry.particleCount, `${path}.particleCount`);
    if (particleCount !== particles.length)
        throw new Error(`Native popup particle count mismatch: ${path}`);
    return {
        path,
        time: numeric(entry.time, `${path}.time`),
        randomSeed: integer(entry.randomSeed, `${path}.randomSeed`),
        particleCount,
        playbackState,
        particles,
        geometry: {
            meshKind: text(geometry.meshKind, `${path}.geometry.meshKind`),
            rawPositionSpace: text(geometry.rawPositionSpace, `${path}.geometry.rawPositionSpace`),
            rawToSelected: matrix(geometry.rawToSelected, `${path}.geometry.rawToSelected`),
            raw: nativeMesh(geometry.raw, `${path}.geometry.raw`),
        },
    };
}
function transformPoint(position: NativeVector, transform: readonly number[]): NativeVector {
    const z = position.z ?? 0;
    const row = (offset: number) => f32(f32(f32(f32(transform[offset] * position.x) +
        f32(transform[offset + 1] * position.y)) + f32(transform[offset + 2] * z)) + transform[offset + 3]);
    return {
        x: row(0),
        y: row(4),
        z: row(8),
    };
}
function transformPosition(position: NativeVector, rawToSelected: readonly number[], selectedToStage: readonly number[]): readonly [
    number,
    number
] {
    // Native captures store particle vertices relative to the selected UI_PTC
    // root. UI_PTC itself is y=-247 in the 1920x1080 popup canvas, so applying
    // rawToSelected alone would put every system 247 stage pixels too high.
    const stage = transformPoint(transformPoint(position, rawToSelected), selectedToStage);
    return [960 + stage.x, 540 - stage.y];
}
function capturedMeshes(system: NativeSystem, selectedToStage: readonly number[]): SwordTrainingPmaMesh[] {
    const path = sourcePath(system.path), contract = PATH_CONTRACT[path], mesh = system.geometry.raw;
    const count = mesh.positions.length;
    if (count !== system.particleCount * 4 || mesh.uv0.length !== count || mesh.colors.length !== count ||
        mesh.triangles.length !== system.particleCount * 6)
        throw new Error(`Native popup particle mesh/count mismatch: ${path}`);
    if (contract.shader === "ui-alpha") {
        if (system.geometry.meshKind !== "ui-canvas" || mesh.uv1.length !== count || mesh.uv2.length !== count || mesh.uv3.length !== count)
            throw new Error(`Native popup UiParticles stream changed: ${path}`);
    }
    else if (system.geometry.meshKind !== "renderer-baked" || mesh.uv1.length || mesh.uv2.length || mesh.uv3.length) {
        throw new Error(`Native popup ParticleSystemRenderer stream changed: ${path}`);
    }
    const output: SwordTrainingPmaMesh[] = [];
    for (let vertex = 0; vertex < count; vertex += 4) {
        const color = mesh.colors[vertex], custom = mesh.uv0[vertex], positions: number[] = [], uvs: number[] = [];
        for (let offset = 0; offset < 4; offset++) {
            const index = vertex + offset, currentColor = mesh.colors[index], uv = mesh.uv0[index];
            if (currentColor.r !== color.r || currentColor.g !== color.g || currentColor.b !== color.b || currentColor.a !== color.a)
                throw new Error(`Native popup billboard color changed inside quad: ${path}`);
            if (contract.shader === "ptc-pma-stream" && (uv.z !== custom.z || uv.w !== custom.w))
                throw new Error(`Native popup Custom1 stream changed inside quad: ${path}`);
            positions.push(...transformPosition(mesh.positions[index], system.geometry.rawToSelected, selectedToStage));
            uvs.push(uv.x, 1 - uv.y);
        }
        const firstTriangle = vertex / 4 * 6;
        const indices = mesh.triangles.slice(firstTriangle, firstTriangle + 6).map((index) => index - vertex);
        if (indices.some((index) => index < 0 || index > 3))
            throw new Error(`Native popup triangles cross billboards: ${path}`);
        const result: SwordTrainingPmaMesh = {
            id: `${path}:${vertex / 4}`,
            texture: PARTICLE_ASSETS[contract.texture].path,
            positions,
            uvs,
            indices,
            color: [color.r / 255, color.g / 255, color.b / 255, color.a / 255],
        };
        if (contract.shader === "ptc-pma-stream") {
            if (typeof custom.z !== "number" || typeof custom.w !== "number")
                throw new Error(`Missing popup Custom1 stream: ${path}`);
            result.particleCustom = [custom.z, custom.w];
            result.particleTint = [1, 1, 1, 1];
        }
        else if (contract.shader === "ptc-alpha-additive") {
            result.sourceAlphaAdditive = true;
            result.sourceAlphaAdditiveMultiplier = 1;
        }
        else
            result.sourceStraightAlpha = true;
        output.push(result);
    }
    return output;
}
function validateFrameIndex(frameIndex: number): void {
    if (!Number.isSafeInteger(frameIndex) || frameIndex < 0)
        throw new RangeError("Popup particle frame index must be a nonnegative safe integer");
}
const PARTICLE_FRAME_DELTA = f32(1 / 60);
function parseSmokeConfig(runtimeSystem: RuntimeSystem, randomSeed: number): SmokeConfig {
    if (runtimeSystem.path !== SMOKE_PATH)
        throw new Error("SMOKE evaluator received another source path");
    const system = runtimeSystem.system;
    const modulesSource = object(system.coreModules, "SMOKE core modules");
    const modules = {
        InitialModule: moduleRecord(modulesSource, "InitialModule"),
        ShapeModule: moduleRecord(modulesSource, "ShapeModule"),
        EmissionModule: moduleRecord(modulesSource, "EmissionModule"),
        SizeModule: moduleRecord(modulesSource, "SizeModule"),
        ColorModule: moduleRecord(modulesSource, "ColorModule"),
        VelocityModule: moduleRecord(modulesSource, "VelocityModule"),
        ForceModule: moduleRecord(modulesSource, "ForceModule"),
        ClampVelocityModule: moduleRecord(modulesSource, "ClampVelocityModule"),
        NoiseModule: moduleRecord(modulesSource, "NoiseModule"),
        RotationModule: moduleRecord(modulesSource, "RotationModule"),
        RotationBySpeedModule: moduleRecord(modulesSource, "RotationBySpeedModule"),
        CustomDataModule: moduleRecord(modulesSource, "CustomDataModule"),
        UVModule: moduleRecord(modulesSource, "UVModule"),
    } satisfies SmokeModules;
    expect(system.duration, 1, "SMOKE duration");
    expect(system.simulationSpeed, 1, "SMOKE simulation speed");
    expect(system.scalingMode, 0, "SMOKE hierarchy scaling mode");
    expect(system.useUnscaledTime, false, "SMOKE scaled-time source");
    expect(modules.InitialModule.enabled, true, "SMOKE InitialModule");
    expect(modules.ShapeModule.enabled, true, "SMOKE ShapeModule");
    expect(modules.ShapeModule.type, 18, "SMOKE rectangle shape");
    expect(modules.EmissionModule.enabled, true, "SMOKE EmissionModule");
    expect(modules.EmissionModule.m_BurstCount, 0, "SMOKE burst count");
    expect(modules.SizeModule.enabled, true, "SMOKE SizeModule");
    expect(modules.SizeModule.separateAxes, false, "SMOKE uniform size");
    expect(modules.ColorModule.enabled, true, "SMOKE ColorModule");
    expect(modules.VelocityModule.enabled, true, "SMOKE VelocityModule");
    expect(modules.ForceModule.enabled, false, "SMOKE ForceModule");
    expect(modules.ClampVelocityModule.enabled, false, "SMOKE ClampVelocityModule");
    expect(modules.NoiseModule.enabled, true, "SMOKE NoiseModule");
    expect(modules.NoiseModule.quality, 1, "SMOKE Medium noise quality");
    expect(modules.NoiseModule.octaves, 1, "SMOKE noise octave count");
    expect(modules.NoiseModule.separateAxes, false, "SMOKE shared noise strength");
    expect(modules.NoiseModule.remapEnabled, false, "SMOKE noise remap");
    expect(modules.NoiseModule.damping, true, "SMOKE noise damping");
    expect(modules.RotationModule.enabled, false, "SMOKE RotationModule");
    expect(modules.RotationBySpeedModule.enabled, true, "SMOKE RotationBySpeedModule");
    expect(modules.RotationBySpeedModule.separateAxes, false, "SMOKE shared rotation-by-speed");
    const range = object(modules.RotationBySpeedModule.range, "SMOKE rotation-by-speed range");
    expect(range.x, 0, "SMOKE rotation-by-speed minimum");
    expect(range.y, 1, "SMOKE rotation-by-speed maximum");
    expect(modules.CustomDataModule.enabled, false, "SMOKE CustomDataModule");
    expect(modules.UVModule.enabled, false, "SMOKE UVModule");
    return {
        duration: numeric(system.duration, "SMOKE duration"),
        simulationSpeed: numeric(system.simulationSpeed, "SMOKE simulation speed"),
        randomSeed,
        modules,
    };
}
function playbackNumbers(entries: readonly {
    name: string;
    value: string;
}[]): Map<string, number> {
    return new Map(entries.map((entry) => {
        const value = Number(entry.value);
        if (!Number.isFinite(value))
            throw new Error(`Invalid SMOKE playback state: ${entry.name}`);
        return [entry.name, value] as const;
    }));
}
function restoreParticleRandomLanes(seed: number, state: Map<string, number> | null, module: "Initial" | "Shape") {
    return (["x", "y", "z", "w"] as const).map((lane, laneIndex) => {
        const random = new SwordTrainingParticleRandom(seed, laneIndex);
        if (state)
            random.restore((["x", "y", "z", "w"] as const).map((word) => state.get(`m_${module}.m_Random.${word}.${lane}`) ?? Number.NaN));
        return random;
    });
}
function smokeParticleFromNative(value: Record<string, unknown>, label: string): SmokeParticle {
    const startLifetime = numeric(value.startLifetime, `${label}.startLifetime`);
    const remainingLifetime = numeric(value.remainingLifetime, `${label}.remainingLifetime`);
    return {
        randomSeed: integer(value.randomSeed, `${label}.randomSeed`),
        position: vector3(value.position, `${label}.position`),
        velocity: vector3(value.velocity, `${label}.velocity`),
        animatedVelocity: vector3(value.animatedVelocity, `${label}.animatedVelocity`),
        rotation: vector3(value.rotation3D, `${label}.rotation3D`),
        angularVelocity: vector3(value.angularVelocity3D, `${label}.angularVelocity3D`),
        startLifetime,
        remainingLifetime,
        ageSeconds: startLifetime - remainingLifetime,
        startSize: vector3(value.startSize3D, `${label}.startSize3D`),
        startColor: color32(value.startColor, `${label}.startColor`),
    };
}
function particleAge(particle: SmokeParticle): number {
    return f32(particle.ageSeconds / particle.startLifetime);
}
function advanceParticleLifetime(particle: SmokeParticle, deltaSeconds: number): void {
    particle.ageSeconds += deltaSeconds;
    particle.remainingLifetime = f32(particle.startLifetime - particle.ageSeconds);
}
function smokeDirectionSign(seed: number, randomizeRotationDirection: number): 1 | -1 {
    // UnityPlayer 0x180D1BAB7 reads the SIMD salt at 0x181AD9760. Probe 030
    // proves the <= comparison for all 4 fixed seeds x 16 emitted particles.
    return particleRandom(seed, PARTICLE_ROTATION_DIRECTION_RANDOM_SALT).nextFloat() <= randomizeRotationDirection
        ? -1
        : 1;
}
function smokeNoiseOffset(seed: number): Vector3 {
    const random = new SwordTrainingParticleRandom(seed);
    return {
        x: f32(random.nextFloat() * 100),
        y: f32(random.nextFloat() * 100),
        z: f32(random.nextFloat() * 100),
    };
}
function smokeNoise(config: SmokeConfig, position: Vector3, age: number, seed: number, scroll: number, enabled: boolean): Vector3 {
    if (!enabled)
        return { x: 0, y: 0, z: 0 };
    const noise = config.modules.NoiseModule;
    const offset = smokeNoiseOffset(config.randomSeed);
    const x = f32(position.x + offset.x), y = f32(position.y + offset.y), z = f32(position.z + offset.z);
    const xPlusHundred = f32(x + 100);
    const frequency = Math.max(f32(0.000001), numeric(noise.frequency, "SMOKE noise frequency"));
    // Native Medium-quality job calls the 2D derivative with these exact three
    // permutations (call sites 0x1811342CE/32A/37F); scroll is the second input.
    const a = mediumNoiseDerivative(z, f32(y + scroll), frequency);
    const b = mediumNoiseDerivative(xPlusHundred, f32(z + scroll), frequency);
    const c = mediumNoiseDerivative(y, f32(xPlusHundred + scroll), frequency);
    const amplitudeRandom = particleRandom(seed, SMOKE_NOISE_STRENGTH_RANDOM_SALT).nextFloat();
    const amplitude = f32(curveValue(noise.strength, age, amplitudeRandom, "SMOKE noise strength") *
        f32(1 / frequency));
    return {
        x: f32(f32(c[0] - b[1]) * amplitude),
        y: f32(f32(a[0] - c[1]) * amplitude),
        z: f32(f32(b[0] - a[1]) * amplitude),
    };
}
function smokeVelocity(config: SmokeConfig, particle: SmokeParticle, age: number, scroll: number, noiseEnabled: boolean): Vector3 {
    const velocity = config.modules.VelocityModule;
    const random = particleRandom(particle.randomSeed, SMOKE_VELOCITY_RANDOM_SALT);
    const noise = smokeNoise(config, particle.position, age, particle.randomSeed, scroll, noiseEnabled);
    return {
        x: f32(curveValue(velocity.x, age, random.nextFloat(), "SMOKE velocity x") + noise.x),
        y: f32(curveValue(velocity.y, age, random.nextFloat(), "SMOKE velocity y") + noise.y),
        z: f32(curveValue(velocity.z, age, random.nextFloat(), "SMOKE velocity z") + noise.z),
    };
}
function smokeAngularVelocity(config: SmokeConfig, particle: SmokeParticle, enabled: boolean): Vector3 {
    if (!enabled)
        return { x: 0, y: 0, z: 0 };
    const rotationBySpeed = config.modules.RotationBySpeedModule;
    const random = particleRandom(particle.randomSeed, SMOKE_ROTATION_BY_SPEED_RANDOM_SALT).nextFloat();
    const direction = smokeDirectionSign(particle.randomSeed, numeric(config.modules.InitialModule.randomizeRotationDirection, "SMOKE randomize rotation direction"));
    return {
        x: 0,
        y: 0,
        z: f32(f32(curveValue(rotationBySpeed.curve, 0, random, "SMOKE rotation by speed") * RADIANS_TO_DEGREES) * direction),
    };
}
function smokeInitialColor(config: SmokeConfig, random: number): Color32 {
    return initialGradientColor(config.modules.InitialModule.startColor, random);
}
function smokeCurrentSize(config: SmokeConfig, particle: SmokeParticle, age: number): Vector3 {
    const factor = curveValue(config.modules.SizeModule.curve, age, 0, "SMOKE size over lifetime");
    return {
        x: f32(particle.startSize.x * factor),
        y: f32(particle.startSize.y * factor),
        z: f32(particle.startSize.z * factor),
    };
}
function smokeCurrentColor(config: SmokeConfig, particle: SmokeParticle, age: number): Color32 {
    const source = object(config.modules.ColorModule.gradient, "SMOKE color over lifetime");
    expect(source.minMaxState, 3, "SMOKE two-gradient lifetime color");
    const minimum = swordParticleGradient(particleGradient(source.minGradient, "SMOKE lifetime minimum gradient"), age);
    const maximum = swordParticleGradient(particleGradient(source.maxGradient, "SMOKE lifetime maximum gradient"), age);
    // Salt 0x591BC05C is the literal at UnityPlayer VA 0x180D1FBF4. The
    // remaining packed Color32 interpolation is separately pinned by the 028
    // audit; keeping it here avoids converting native byte math to CSS colors.
    const random = particleRandom(particle.randomSeed, 0x591bc05c).nextFloat();
    const blend = (minimumValue: number, maximumValue: number) => {
        const minimumByte = colorByte(minimumValue), maximumByte = colorByte(maximumValue);
        return colorByte(f32(minimumByte + f32(f32(maximumByte - minimumByte) * random)) / 255);
    };
    const lifetime = {
        r: blend(minimum.r, maximum.r),
        g: blend(minimum.g, maximum.g),
        b: blend(minimum.b, maximum.b),
        a: blend(minimum.a, maximum.a),
    };
    const channel = (name: keyof Color32) => (particle.startColor[name] * (lifetime[name] + 1)) >> 8;
    return { r: channel("r"), g: channel("g"), b: channel("b"), a: channel("a") };
}
class StoryOmenPopupSmokeSystem {
    private readonly config: SmokeConfig;
    private readonly initialRandom: SwordTrainingParticleRandom[];
    private readonly shapeRandom: SwordTrainingParticleRandom[];
    private readonly emissionRandom: SwordTrainingParticleRandom;
    private readonly basePlaybackState: readonly {
        name: string;
        value: string;
    }[];
    private readonly noiseEnabled: boolean;
    private readonly rotationBySpeedEnabled: boolean;
    private readonly automaticEmission: boolean;
    private particles: SmokeParticle[];
    private playbackTime: number;
    private accumulator: number;
    private noiseScroll: number;
    private constructor(args: {
        config: SmokeConfig;
        playbackState: readonly {
            name: string;
            value: string;
        }[];
        particles: SmokeParticle[];
        restorePlaybackRandom: boolean;
        noiseEnabled: boolean;
        rotationBySpeedEnabled: boolean;
        automaticEmission: boolean;
    }) {
        this.config = args.config;
        const state = args.restorePlaybackRandom ? playbackNumbers(args.playbackState) : null;
        this.initialRandom = restoreParticleRandomLanes(args.config.randomSeed, state, "Initial");
        this.shapeRandom = restoreParticleRandomLanes(args.config.randomSeed, state, "Shape");
        this.emissionRandom = new SwordTrainingParticleRandom(args.config.randomSeed);
        if (state)
            this.emissionRandom.restore((["x", "y", "z", "w"] as const).map((word) => state.get(`m_Emission.m_Random.${word}`) ?? Number.NaN));
        this.basePlaybackState = args.playbackState;
        this.particles = args.particles;
        this.playbackTime = state?.get("m_PlaybackTime") ?? 0;
        this.accumulator = f32(state?.get("m_Emission.m_ToEmitAccumulator") ?? 0);
        this.noiseScroll = f32(state?.get("m_Noise.m_ScrollOffset") ?? 0);
        this.noiseEnabled = args.noiseEnabled;
        this.rotationBySpeedEnabled = args.rotationBySpeedEnabled;
        this.automaticEmission = args.automaticEmission;
    }
    static continuation(runtimeSystem: RuntimeSystem, nativeSystem: NativeSystem): StoryOmenPopupSmokeSystem {
        return new StoryOmenPopupSmokeSystem({
            config: parseSmokeConfig(runtimeSystem, nativeSystem.randomSeed),
            playbackState: nativeSystem.playbackState,
            particles: nativeSystem.particles.map((particle, index) => smokeParticleFromNative(particle, `SMOKE native particle ${index}`)),
            restorePlaybackRandom: true,
            noiseEnabled: true,
            rotationBySpeedEnabled: true,
            automaticEmission: true,
        });
    }
    static manual(runtimeSystem: RuntimeSystem, randomSeed: number, emitCount: number, noiseEnabled: boolean, rotationBySpeedEnabled: boolean): StoryOmenPopupSmokeSystem {
        const result = new StoryOmenPopupSmokeSystem({
            config: parseSmokeConfig(runtimeSystem, randomSeed),
            playbackState: [],
            particles: [],
            restorePlaybackRandom: false,
            noiseEnabled,
            rotationBySpeedEnabled,
            automaticEmission: false,
        });
        result.emit(emitCount, 0, 0);
        return result;
    }
    advanceFrame(): void {
        this.advance(PARTICLE_FRAME_DELTA);
    }
    advanceFrames(frameCount: number): void {
        for (let frame = 0; frame < frameCount; frame++)
            this.advanceFrame();
    }
    private advance(deltaSeconds: number): void {
        const delta = f32(deltaSeconds * this.config.simulationSpeed);
        if (this.noiseEnabled && this.particles.length) {
            const scrollSpeed = curveValue(this.config.modules.NoiseModule.scrollSpeed, this.playbackTime, 0, "SMOKE noise scroll speed");
            this.noiseScroll = f32(this.noiseScroll + f32(scrollSpeed * delta));
        }
        for (const particle of this.particles) {
            this.move(particle, delta);
            advanceParticleLifetime(particle, delta);
        }
        for (let index = 0; index < this.particles.length;) {
            if (this.particles[index].remainingLifetime > 0) {
                index++;
                continue;
            }
            const last = this.particles.pop();
            if (!last)
                throw new Error("SMOKE particle storage underflow");
            if (index < this.particles.length)
                this.particles[index] = last;
        }
        // The playback-state oracle shows one emission PRNG step on every native
        // simulation step even when SMOKE's rate does not cross an integer.
        this.emissionRandom.nextUInt();
        const previousTime = this.playbackTime;
        const nextTime = f32(previousTime + delta);
        const emissionDelta = f32(nextTime - previousTime);
        this.playbackTime = nextTime >= this.config.duration ? f32(nextTime - this.config.duration) : nextTime;
        if (!this.automaticEmission)
            return;
        const rate = curveValue(this.config.modules.EmissionModule.rateOverTime, this.playbackTime, 0, "SMOKE rate over time");
        this.accumulator = f32(this.accumulator + f32(rate * emissionDelta));
        const emitCount = Math.floor(this.accumulator);
        this.accumulator = f32(this.accumulator - emitCount);
        if (emitCount)
            this.emit(emitCount, rate, this.accumulator);
    }
    private emit(count: number, rate: number, remainder: number): void {
        for (let first = 0; first < count; first += 4) {
            const initialInputs = this.initialRandom.map((random) => Array.from({ length: 5 }, () => random.nextUInt()));
            const shapeInputs = this.shapeRandom.map((random) => [random.nextFloat(), random.nextFloat()]);
            for (let lane = 0; lane < Math.min(4, count - first); lane++) {
                const initial = this.config.modules.InitialModule;
                const shape = this.config.modules.ShapeModule;
                const position = vector3(shape.m_Position, "SMOKE shape position");
                const scale = vector3(shape.m_Scale, "SMOKE shape scale");
                const draw = (index: number) => particleFloat(initialInputs[lane][index]);
                const lifetime = curveValue(initial.startLifetime, this.playbackTime, draw(1), "SMOKE start lifetime");
                const size = curveValue(initial.startSize, this.playbackTime, draw(2), "SMOKE start size");
                const direction = smokeDirectionSign(initialInputs[lane][0], numeric(initial.randomizeRotationDirection, "SMOKE randomize rotation direction"));
                const particle: SmokeParticle = {
                    randomSeed: initialInputs[lane][0],
                    position: {
                        x: f32(position.x + f32(f32(shapeInputs[lane][0] - 0.5) * scale.x)),
                        y: f32(position.y + f32(f32(shapeInputs[lane][1] - 0.5) * scale.y)),
                        z: position.z,
                    },
                    velocity: { x: 0, y: 0, z: 0 },
                    animatedVelocity: { x: 0, y: 0, z: 0 },
                    rotation: {
                        x: 0,
                        y: 0,
                        z: f32(f32(curveValue(initial.startRotation, this.playbackTime, draw(3), "SMOKE start rotation") * RADIANS_TO_DEGREES) * direction),
                    },
                    angularVelocity: { x: 0, y: 0, z: 0 },
                    startLifetime: lifetime,
                    remainingLifetime: lifetime,
                    ageSeconds: 0,
                    startSize: { x: size, y: size, z: size },
                    startColor: smokeInitialColor(this.config, draw(4)),
                };
                this.refreshMotion(particle);
                const ageSeconds = rate ? f32((count - first - lane - 1 + remainder) / rate) : 0;
                if (ageSeconds) {
                    this.move(particle, ageSeconds);
                    advanceParticleLifetime(particle, ageSeconds);
                }
                const maximum = integer(initial.maxNumParticles, "SMOKE maximum particles");
                if (this.particles.length < maximum)
                    this.particles.push(particle);
            }
        }
    }
    private refreshMotion(particle: SmokeParticle): void {
        const age = particleAge(particle);
        particle.animatedVelocity = smokeVelocity(this.config, particle, age, this.noiseScroll, this.noiseEnabled);
        particle.angularVelocity = smokeAngularVelocity(this.config, particle, this.rotationBySpeedEnabled);
    }
    private move(particle: SmokeParticle, deltaSeconds: number): void {
        this.refreshMotion(particle);
        for (const axis of ["x", "y", "z"] as const) {
            const totalVelocity = f32(particle.velocity[axis] + particle.animatedVelocity[axis]);
            particle.position[axis] = f32(particle.position[axis] + f32(totalVelocity * deltaSeconds));
            particle.rotation[axis] = f32(particle.rotation[axis] + f32(particle.angularVelocity[axis] * deltaSeconds));
        }
    }
    playbackState(): readonly {
        name: string;
        value: string;
    }[] {
        const values = new Map(this.basePlaybackState.map((entry) => [entry.name, entry.value]));
        values.set("m_PlaybackTime", String(this.playbackTime));
        values.set("m_Emission.m_ToEmitAccumulator", String(this.accumulator));
        values.set("m_Noise.m_ScrollOffset", String(this.noiseScroll));
        const emissionState = this.emissionRandom.snapshot();
        for (const [index, word] of (["x", "y", "z", "w"] as const).entries())
            values.set(`m_Emission.m_Random.${word}`, String(emissionState[index]));
        for (const [module, lanes] of [["Initial", this.initialRandom], ["Shape", this.shapeRandom]] as const) {
            for (const [laneIndex, lane] of (["x", "y", "z", "w"] as const).entries()) {
                const state = lanes[laneIndex].snapshot();
                for (const [wordIndex, word] of (["x", "y", "z", "w"] as const).entries())
                    values.set(`m_${module}.m_Random.${word}.${lane}`, String(state[wordIndex]));
            }
        }
        return [...values].map(([name, value]) => ({ name, value }));
    }
    particleRecords(): readonly Record<string, unknown>[] {
        return this.particles.map((particle, nativeBufferIndex) => {
            const age = particleAge(particle);
            const currentSize = smokeCurrentSize(this.config, particle, age);
            const currentColor = smokeCurrentColor(this.config, particle, age);
            return {
                nativeBufferIndex,
                randomSeed: particle.randomSeed,
                position: { ...particle.position },
                velocity: { ...particle.velocity },
                animatedVelocity: { ...particle.animatedVelocity },
                totalVelocity: {
                    x: f32(particle.velocity.x + particle.animatedVelocity.x),
                    y: f32(particle.velocity.y + particle.animatedVelocity.y),
                    z: f32(particle.velocity.z + particle.animatedVelocity.z),
                },
                rotation3D: { ...particle.rotation },
                angularVelocity3D: { ...particle.angularVelocity },
                axisOfRotation: { x: 0, y: 1, z: 0 },
                startLifetime: particle.startLifetime,
                remainingLifetime: particle.remainingLifetime,
                startSize3D: { ...particle.startSize },
                currentSize3D: currentSize,
                startColor: { ...particle.startColor },
                currentColor,
                custom1: { x: 0, y: 0, z: 0, w: 0 },
                custom2: { x: 0, y: 0, z: 0, w: 0 },
            };
        });
    }
    mesh(): NativeMesh {
        const positions: NativeVector[] = [];
        const uv0: NativeVector[] = [], uv1: NativeVector[] = [], uv2: NativeVector[] = [], uv3: NativeVector[] = [];
        const colors: NativeColor32[] = [], triangles: number[] = [];
        for (const record of this.particleRecords()) {
            const position = vector3(record.position, "SMOKE mesh position");
            const size = vector3(record.currentSize3D, "SMOKE mesh current size");
            const rotation = vector3(record.rotation3D, "SMOKE mesh rotation");
            const color = color32(record.currentColor, "SMOKE mesh color");
            const half = f32(size.x / 2);
            const radians = f32(rotation.z * f32(Math.PI / 180));
            const cosine = f32(Math.cos(radians)), sine = f32(Math.sin(radians));
            const first = positions.length;
            for (const [x, y] of [[-half, -half], [-half, half], [half, half], [half, -half]] as const) {
                positions.push({
                    x: f32(position.x + f32(f32(x * cosine) - f32(y * sine))),
                    y: f32(position.y + f32(f32(x * sine) + f32(y * cosine))),
                    z: position.z,
                });
            }
            uv0.push({ x: 0, y: 0, z: 0, w: 0 }, { x: 0, y: 1, z: 0, w: 0 }, { x: 1, y: 1, z: 0, w: 0 }, { x: 1, y: 0, z: 0, w: 0 });
            for (let vertex = 0; vertex < 4; vertex++) {
                uv1.push({ x: 0, y: 0, z: 0, w: 0 });
                uv2.push({ x: 0, y: 0, z: 0, w: 0 });
                uv3.push({ x: 0, y: 0, z: 0, w: 0 });
                colors.push({ ...color });
            }
            triangles.push(first, first + 1, first + 2, first + 2, first + 3, first);
        }
        return { positions, uv0, uv1, uv2, uv3, colors, triangles };
    }
    get time(): number { return this.playbackTime; }
    get randomSeed(): number { return this.config.randomSeed; }
    get particleCount(): number { return this.particles.length; }
}
type PopupGeneralParticle = SmokeParticle & {
    gravityModifier: number;
};
type PopupGeneralConfig = {
    path: Exclude<PopupParticlePath, typeof SMOKE_PATH>;
    duration: number;
    simulationSpeed: number;
    randomSeed: number;
    modules: SmokeModules;
    renderer: Record<string, unknown>;
    simulationSpace: "Local" | "World";
    localToWorld: readonly number[];
    hierarchyScale: number;
};
const POPUP_VELOCITY_RANDOM_SALT = 0xe0fbd834;
const POPUP_FORCE_RANDOM_SALT = 0x12460f3b;
const POPUP_GRAVITY_RANDOM_SALT = 0xe2b7c3c3;
const POPUP_LIMIT_RANDOM_SALT = 0x13371337;
const POPUP_SIZE_RANDOM_SALT = 0x8d2c8431;
const POPUP_ROTATION_RANDOM_SALT = 0x6aed452e;
const POPUP_CUSTOM_RANDOM_SALT = 0x73a7f7bb;
const POPUP_UV_START_FRAME_RANDOM_SALT = 0x56b3dbb0;
const CLIENT_GRAVITY_Y = f32(-9.8100004196167);
const EMBER_STRETCH_U_MIN = 0.00420359568670392;
const EMBER_STRETCH_U_MAX = 1;
const EMBER_STRETCH_V_MIN = 0;
const EMBER_STRETCH_V_MAX = 0.9998323917388916;
function parseGeneralConfig(runtimeSystem: RuntimeSystem, nativeSystem: NativeSystem, activatedValue: unknown): PopupGeneralConfig {
    if (runtimeSystem.path === SMOKE_PATH)
        throw new Error("General popup evaluator received SMOKE");
    const system = runtimeSystem.system;
    const modulesSource = object(system.coreModules, `${runtimeSystem.path} core modules`);
    const modules = {
        InitialModule: object(modulesSource.InitialModule, `${runtimeSystem.path} InitialModule`),
        ShapeModule: object(modulesSource.ShapeModule, `${runtimeSystem.path} ShapeModule`),
        EmissionModule: object(modulesSource.EmissionModule, `${runtimeSystem.path} EmissionModule`),
        SizeModule: object(modulesSource.SizeModule, `${runtimeSystem.path} SizeModule`),
        ColorModule: object(modulesSource.ColorModule, `${runtimeSystem.path} ColorModule`),
        VelocityModule: object(modulesSource.VelocityModule, `${runtimeSystem.path} VelocityModule`),
        ForceModule: object(modulesSource.ForceModule, `${runtimeSystem.path} ForceModule`),
        ClampVelocityModule: object(modulesSource.ClampVelocityModule, `${runtimeSystem.path} ClampVelocityModule`),
        NoiseModule: object(modulesSource.NoiseModule, `${runtimeSystem.path} NoiseModule`),
        RotationModule: object(modulesSource.RotationModule, `${runtimeSystem.path} RotationModule`),
        RotationBySpeedModule: object(modulesSource.RotationBySpeedModule, `${runtimeSystem.path} RotationBySpeedModule`),
        CustomDataModule: object(modulesSource.CustomDataModule, `${runtimeSystem.path} CustomDataModule`),
        UVModule: object(modulesSource.UVModule, `${runtimeSystem.path} UVModule`),
    } satisfies SmokeModules;
    const activated = object(activatedValue, `${runtimeSystem.path} activated runtime`);
    const simulationSpace = text(activated.simulationSpace, `${runtimeSystem.path} simulation space`);
    if (simulationSpace !== "Local" && simulationSpace !== "World")
        throw new Error(`Unsupported popup simulation space: ${simulationSpace}`);
    const localToWorld = matrix(activated.localToWorld, `${runtimeSystem.path} local-to-world`);
    const hierarchyScale = Math.abs(localToWorld[0]);
    if (!(hierarchyScale > 0) || Math.abs(Math.abs(localToWorld[5]) - hierarchyScale) > 1e-6 ||
        Math.abs(Math.abs(localToWorld[10]) - hierarchyScale) > 1e-6)
        throw new Error(`Unsupported nonuniform popup hierarchy scale: ${runtimeSystem.path}`);
    expect(nativeSystem.randomSeed, nativeSystem.randomSeed >>> 0, `${runtimeSystem.path} native seed uint32`);
    expect(system.scalingMode, 0, `${runtimeSystem.path} hierarchy scaling mode`);
    expect(modules.InitialModule.enabled, true, `${runtimeSystem.path} InitialModule`);
    expect(modules.ShapeModule.enabled, true, `${runtimeSystem.path} ShapeModule`);
    expect(modules.ShapeModule.type, 5, `${runtimeSystem.path} box ShapeModule`);
    expect(modules.EmissionModule.enabled, true, `${runtimeSystem.path} EmissionModule`);
    expect(modules.EmissionModule.m_BurstCount, 1, `${runtimeSystem.path} single burst`);
    expect(modules.SizeModule.enabled, true, `${runtimeSystem.path} SizeModule`);
    expect(modules.SizeModule.separateAxes, true, `${runtimeSystem.path} separate size axes`);
    expect(modules.ColorModule.enabled, true, `${runtimeSystem.path} ColorModule`);
    expect(modules.VelocityModule.enabled, true, `${runtimeSystem.path} VelocityModule`);
    expect(modules.ClampVelocityModule.enabled, true, `${runtimeSystem.path} ClampVelocityModule`);
    expect(modules.ClampVelocityModule.separateAxis, false, `${runtimeSystem.path} shared velocity clamp`);
    expect(modules.ClampVelocityModule.dampen, 1, `${runtimeSystem.path} full velocity dampen`);
    expect(modules.NoiseModule.enabled, true, `${runtimeSystem.path} NoiseModule`);
    expect(modules.NoiseModule.quality, 1, `${runtimeSystem.path} Medium noise`);
    expect(modules.NoiseModule.octaves, 2, `${runtimeSystem.path} two noise octaves`);
    expect(modules.NoiseModule.separateAxes, true, `${runtimeSystem.path} separate noise axes`);
    expect(modules.NoiseModule.remapEnabled, false, `${runtimeSystem.path} noise remap`);
    expect(modules.RotationBySpeedModule.enabled, false, `${runtimeSystem.path} RotationBySpeedModule`);
    expect(modules.CustomDataModule.enabled, true, `${runtimeSystem.path} CustomDataModule`);
    expect(modules.UVModule.enabled, true, `${runtimeSystem.path} UVModule`);
    return {
        path: runtimeSystem.path,
        duration: numeric(system.duration, `${runtimeSystem.path} duration`),
        simulationSpeed: numeric(system.simulationSpeed, `${runtimeSystem.path} simulation speed`),
        randomSeed: nativeSystem.randomSeed,
        modules,
        renderer: runtimeSystem.renderer,
        simulationSpace,
        localToWorld,
        hierarchyScale,
    };
}
function generalParticleFromNative(value: Record<string, unknown>, config: PopupGeneralConfig, label: string): PopupGeneralParticle {
    const randomSeed = integer(value.randomSeed, `${label}.randomSeed`);
    const startLifetime = numeric(value.startLifetime, `${label}.startLifetime`);
    const remainingLifetime = numeric(value.remainingLifetime, `${label}.remainingLifetime`);
    return {
        randomSeed,
        position: vector3(value.position, `${label}.position`),
        velocity: vector3(value.velocity, `${label}.velocity`),
        animatedVelocity: vector3(value.animatedVelocity, `${label}.animatedVelocity`),
        rotation: vector3(value.rotation3D, `${label}.rotation3D`),
        angularVelocity: vector3(value.angularVelocity3D, `${label}.angularVelocity3D`),
        startLifetime,
        remainingLifetime,
        ageSeconds: startLifetime - remainingLifetime,
        startSize: vector3(value.startSize3D, `${label}.startSize3D`),
        startColor: color32(value.startColor, `${label}.startColor`),
        gravityModifier: curveValue(config.modules.InitialModule.gravityModifier, 0, particleRandom(randomSeed, POPUP_GRAVITY_RANDOM_SALT).nextFloat(), `${label}.gravityModifier`),
    };
}
function popupInitialColor(value: unknown, random: number, label: string): Color32 {
    const source = object(value, label);
    const state = integer(source.minMaxState, `${label}.minMaxState`);
    let color: {
        r: number;
        g: number;
        b: number;
        a: number;
    };
    if (state === 0)
        color = object(source.maxColor, `${label}.maxColor`) as typeof color;
    else if (state === 4)
        color = swordParticleGradient(particleGradient(source.maxGradient, `${label}.maxGradient`), random);
    else
        throw new Error(`Unsupported popup initial color mode: ${state}`);
    return { r: colorByte(color.r), g: colorByte(color.g), b: colorByte(color.b), a: colorByte(color.a) };
}
function popupCurrentSize(config: PopupGeneralConfig, particle: PopupGeneralParticle, age: number): Vector3 {
    const moduleSource = config.modules.SizeModule;
    const random = particleRandom(particle.randomSeed, POPUP_SIZE_RANDOM_SALT).nextFloat();
    return {
        x: f32(particle.startSize.x * curveValue(moduleSource.curve, age, random, `${config.path} size x`)),
        y: f32(particle.startSize.y * curveValue(moduleSource.y, age, random, `${config.path} size y`)),
        z: f32(particle.startSize.z * curveValue(moduleSource.z, age, random, `${config.path} size z`)),
    };
}
function popupCurrentColor(config: PopupGeneralConfig, particle: PopupGeneralParticle, age: number): Color32 {
    const source = object(config.modules.ColorModule.gradient, `${config.path} lifetime color`);
    expect(source.minMaxState, 1, `${config.path} lifetime gradient mode`);
    const lifetime = swordParticleGradient(particleGradient(source.maxGradient, `${config.path} lifetime max gradient`), age);
    const channel = (name: keyof Color32) => (particle.startColor[name] * (colorByte(lifetime[name]) + 1)) >> 8;
    return { r: channel("r"), g: channel("g"), b: channel("b"), a: channel("a") };
}
function popupRendererGradientByte(gradient: ParticleGradient, age: number, channel: keyof Color32): number {
    const prefix = channel === "a" ? "atime" : "ctime";
    const count = channel === "a" ? gradient.m_NumAlphaKeys : gradient.m_NumColorKeys;
    if (!Number.isInteger(count) || count < 1 || count > 8)
        throw new Error("Invalid popup renderer gradient key count");
    const keyByte = (index: number) => colorByte((object(gradient[`key${index}`], `popup renderer gradient key ${index}`) as Color32)[channel]);
    const keyTime = (index: number) => f32(numeric(gradient[`${prefix}${index}`], `popup renderer gradient ${prefix}${index}`) / 65535);
    let right = 0;
    while (right < count && keyTime(right) < age)
        right++;
    if (!right)
        return keyByte(0);
    if (right === count)
        return keyByte(count - 1);
    const left = right - 1;
    const leftTime = keyTime(left);
    const inverseSpan = f32(1 / f32(keyTime(right) - leftTime));
    const delta = Math.max(0, Math.min(1, f32(age - leftTime)));
    // UnityPlayer 0x180596F50 uses cvttps2dq after two SIMD multiplies.
    const interpolation = Math.trunc(f32(f32(delta * inverseSpan) * 255));
    const leftByte = keyByte(left), rightByte = keyByte(right);
    return leftByte + (((rightByte - leftByte) * interpolation + 128) >> 8);
}
function popupRendererColorProduct(start: number, gradient: number): number {
    // UnityPlayer 0x180D32300 performs its unsigned /255 round with
    // pmullw,paddw,psrlw,paddw,psrlw rather than a float color product.
    const product = start * gradient + 128;
    return (product + (product >> 8)) >> 8;
}
/** Direct production-path probe for the compact 043/045/048c/048d oracles. */
export function storyOmenPopupRendererGradientColor(options: {
    gradient: unknown;
    startColor: {
        r: number;
        g: number;
        b: number;
        a: number;
    };
    normalizedAge: number;
}): {
    r: number;
    g: number;
    b: number;
    a: number;
} {
    const gradient = particleGradient(options.gradient, "popup renderer gradient oracle");
    const startColor = color32(options.startColor, "popup renderer start color oracle");
    const age = numeric(options.normalizedAge, "popup renderer normalized age oracle");
    const channel = (name: keyof Color32) => popupRendererColorProduct(startColor[name], popupRendererGradientByte(gradient, age, name));
    return { r: channel("r"), g: channel("g"), b: channel("b"), a: channel("a") };
}
/**
 * UiParticles' BakeMesh batch uses an integer Gradient lookup and rounded
 * byte /255 product distinct from ParticleSystem.Particle.GetCurrentColor.
 * Runs 043/045/048c/048d and UnityPlayer 0x180596F50/0x180D32300 fix this
 * path, including source-key 253-to-255 transitions and EMBER's tail.
 */
function popupMeshColor(config: PopupGeneralConfig, particle: PopupGeneralParticle, age: number): Color32 {
    const source = object(config.modules.ColorModule.gradient, `${config.path} mesh lifetime color`);
    expect(source.minMaxState, 1, `${config.path} mesh lifetime gradient mode`);
    const gradient = particleGradient(source.maxGradient, `${config.path} mesh lifetime max gradient`);
    return storyOmenPopupRendererGradientColor({ gradient, startColor: particle.startColor, normalizedAge: age });
}
function popupNoiseCurlOctaves(position: Vector3, noiseOffset: Vector3, scroll: number, frequency: number, octaves: number, octaveScale: number, octaveMultiplier: number): Vector3 {
    const x = f32(position.x + noiseOffset.x), y = f32(position.y + noiseOffset.y);
    const z = f32(position.z + noiseOffset.z), xPlusHundred = f32(x + 100);
    let a0 = 0, a1 = 0, b0 = 0, b1 = 0, c0 = 0, c1 = 0;
    let octaveFrequency = f32(frequency), octaveWeight = 1, weightSum = 0;
    for (let octave = 0; octave < octaves; octave++) {
        const a = mediumNoiseDerivative(z, f32(y + scroll), octaveFrequency);
        const b = mediumNoiseDerivative(xPlusHundred, f32(z + scroll), octaveFrequency);
        const c = mediumNoiseDerivative(y, f32(xPlusHundred + scroll), octaveFrequency);
        a0 = f32(a0 + f32(a[0] * octaveWeight));
        a1 = f32(a1 + f32(a[1] * octaveWeight));
        b0 = f32(b0 + f32(b[0] * octaveWeight));
        b1 = f32(b1 + f32(b[1] * octaveWeight));
        c0 = f32(c0 + f32(c[0] * octaveWeight));
        c1 = f32(c1 + f32(c[1] * octaveWeight));
        weightSum = f32(weightSum + octaveWeight);
        octaveFrequency = f32(octaveFrequency * octaveScale);
        octaveWeight = f32(octaveWeight * octaveMultiplier);
    }
    // 0x181130040 normalizes each derivative component separately. The three
    // curl subtractions happen only in its caller; subtracting each octave's
    // curl before this division changes SHAPE/GLOW by up to 21 ULP in 035b.
    a0 = f32(a0 / weightSum);
    a1 = f32(a1 / weightSum);
    b0 = f32(b0 / weightSum);
    b1 = f32(b1 / weightSum);
    c0 = f32(c0 / weightSum);
    c1 = f32(c1 / weightSum);
    return {
        x: f32(c0 - b1),
        y: f32(a0 - c1),
        z: f32(b0 - a1),
    };
}
/** Native 035b/037 Medium-noise diagnostic with no source-module mutation. */
export function storyOmenPopupMediumNoiseVector(options: {
    systemSeed: number;
    position: Vector3;
    scroll: number;
    frequency: number;
    octaves: number;
    octaveScale: number;
    octaveMultiplier: number;
    damping: boolean;
}): Vector3 {
    const offsetRandom = new SwordTrainingParticleRandom(options.systemSeed);
    const noiseOffset = {
        x: f32(offsetRandom.nextFloat() * 100),
        y: f32(offsetRandom.nextFloat() * 100),
        z: f32(offsetRandom.nextFloat() * 100),
    };
    const curl = popupNoiseCurlOctaves(options.position, noiseOffset, f32(options.scroll), options.frequency, options.octaves, options.octaveScale, options.octaveMultiplier);
    const result = { x: 0, y: 0, z: 0 };
    for (const axis of ["x", "y", "z"] as const) {
        result[axis] = options.damping ? f32(curl[axis] / f32(options.frequency)) : curl[axis];
    }
    return result;
}
function popupGeneralNoise(config: PopupGeneralConfig, particle: PopupGeneralParticle, age: number, noiseOffset: Vector3, scroll: number): Vector3 {
    const noise = config.modules.NoiseModule;
    const frequency = Math.max(f32(0.000001), numeric(noise.frequency, `${config.path} noise frequency`));
    const octaveScale = numeric(noise.octaveScale, `${config.path} octave scale`);
    const octaveMultiplier = numeric(noise.octaveMultiplier, `${config.path} octave multiplier`);
    const curl = popupNoiseCurlOctaves(particle.position, noiseOffset, scroll, frequency, integer(noise.octaves, `${config.path} octave count`), octaveScale, octaveMultiplier);
    const strengthCurves = [noise.strength, noise.strengthY, noise.strengthZ] as const;
    const positionRandom = particleRandom(particle.randomSeed, 0xb77ce39a).nextFloat();
    const positionAmount = curveValue(noise.positionAmount, age, positionRandom, `${config.path} noise position amount`);
    // Unity's separate-axis Medium branch initializes one salted xorshift state
    // and consumes x/y/z in order. 035b's seed-3690984874 values are
    // .3552582562, .0215060730, .5827495456; treating the axes as salt+0/1/2
    // moves SHAPE/GLOW by more than twenty world units over the 60-step oracle.
    const strengthRandom = particleRandom(particle.randomSeed, SMOKE_NOISE_STRENGTH_RANDOM_SALT);
    const result = { x: 0, y: 0, z: 0 };
    for (const [axisIndex, axis] of (["x", "y", "z"] as const).entries()) {
        const strength = curveValue(strengthCurves[axisIndex], age, strengthRandom.nextFloat(), `${config.path} noise strength ${axis}`);
        const damped = noise.damping ? f32(curl[axis] / frequency) : curl[axis];
        result[axis] = f32(f32(damped * strength) * positionAmount);
    }
    return result;
}
function popupGeneralCustom(config: PopupGeneralConfig, particle: PopupGeneralParticle, age: number): NativeVector {
    const custom = config.modules.CustomDataModule;
    const curves = [custom.vector0_0, custom.vector0_1, custom.vector0_2, custom.vector0_3] as const;
    const values = curves.map((curve, index) => curve === undefined ? 0 : curveValue(curve, age, particleRandom(particle.randomSeed, (POPUP_CUSTOM_RANDOM_SALT + index) >>> 0).nextFloat(), `${config.path} Custom1[${index}]`));
    return { x: values[0], y: values[1], z: values[2], w: values[3] };
}
function popupGeneralAngularVelocity(config: PopupGeneralConfig, particle: PopupGeneralParticle, age: number): Vector3 {
    const rotation = config.modules.RotationModule;
    if (!rotation.enabled)
        return { x: 0, y: 0, z: 0 };
    const random = particleRandom(particle.randomSeed, POPUP_ROTATION_RANDOM_SALT).nextFloat();
    return {
        x: f32(curveValue(rotation.x, age, random, `${config.path} rotation x`) * RADIANS_TO_DEGREES),
        y: f32(curveValue(rotation.y, age, random, `${config.path} rotation y`) * RADIANS_TO_DEGREES),
        z: f32(curveValue(rotation.curve, age, random, `${config.path} rotation z`) * RADIANS_TO_DEGREES),
    };
}
function popupSpeedSquared(total: Vector3): number {
    return f32(f32(total.z * total.z) + f32(f32(total.y * total.y) + f32(total.x * total.x)));
}
function popupSpeed(speedSquared: number): number {
    return f32(Math.sqrt(speedSquared));
}
function popupClampInverseSpeed(speedSquared: number): number {
    // UnityPlayer 2022.3.62f2 VA 0x180D40122-0x180D40176 keeps the
    // ParticleSystem clamp normalization in SIMD float precision. One Newton
    // step follows the hardware reciprocal-square-root estimate. Browsers do
    // not expose rsqrtps, so start from the correctly-rounded reciprocal root;
    // the captured 035b synthetic clamp oracle pins every operation after that
    // estimate and catches a differing final float below.
    let inverse = f32(1 / Math.sqrt(speedSquared));
    inverse = f32(Math.min(Number.MAX_VALUE, f32(inverse * f32(0.9999998211860657))));
    const squaredEstimate = f32(f32(speedSquared * inverse) * inverse);
    return f32(f32(3.000000238418579 - squaredEstimate) * f32(f32(0.5) * inverse));
}
function popupInitialBurstTime(clock: number, burst: Record<string, unknown>): number {
    const first = numeric(burst.time, "popup burst time");
    const interval = numeric(burst.repeatInterval, "popup burst interval");
    if (!(interval > 0))
        throw new Error("Popup burst repeat interval must be positive");
    if (clock <= first)
        return first;
    return f32(first + Math.ceil(f32((clock - first) / interval)) * interval);
}
class StoryOmenPopupGeneralSystem {
    private readonly config: PopupGeneralConfig;
    private readonly initialRandom: SwordTrainingParticleRandom[];
    private readonly shapeRandom: SwordTrainingParticleRandom[];
    private readonly emissionRandom: SwordTrainingParticleRandom;
    private readonly basePlaybackState: readonly {
        name: string;
        value: string;
    }[];
    private readonly noiseOffset: Vector3;
    private readonly automaticEmission: boolean;
    private particles: PopupGeneralParticle[];
    private playbackTime: number;
    private burstClock: number;
    private previousBurstClock: number;
    private nextBurstTime: number;
    private noiseScroll: number;
    private constructor(args: {
        config: PopupGeneralConfig;
        playbackState: readonly {
            name: string;
            value: string;
        }[];
        particles: PopupGeneralParticle[];
        restorePlaybackRandom: boolean;
        automaticEmission: boolean;
    }) {
        this.config = args.config;
        const state = args.restorePlaybackRandom ? playbackNumbers(args.playbackState) : null;
        this.initialRandom = restoreParticleRandomLanes(args.config.randomSeed, state, "Initial");
        this.shapeRandom = restoreParticleRandomLanes(args.config.randomSeed, state, "Shape");
        this.emissionRandom = new SwordTrainingParticleRandom(args.config.randomSeed);
        if (state)
            this.emissionRandom.restore((["x", "y", "z", "w"] as const).map((word) => state.get(`m_Emission.m_Random.${word}`) ?? Number.NaN));
        this.basePlaybackState = args.playbackState;
        this.particles = args.particles;
        this.playbackTime = f32(state?.get("m_PlaybackTime") ?? 0);
        this.burstClock = state?.get("m_Shape.m_RadiusTimer") ?? this.playbackTime;
        this.previousBurstClock = state?.get("m_Shape.m_RadiusTimerPrev") ?? this.burstClock;
        this.noiseScroll = f32(state?.get("m_Noise.m_ScrollOffset") ?? 0);
        const offsetRandom = new SwordTrainingParticleRandom(args.config.randomSeed);
        this.noiseOffset = {
            x: f32(offsetRandom.nextFloat() * 100),
            y: f32(offsetRandom.nextFloat() * 100),
            z: f32(offsetRandom.nextFloat() * 100),
        };
        const burst = object(array(args.config.modules.EmissionModule.m_Bursts, `${args.config.path} bursts`)[0], `${args.config.path} burst`);
        this.nextBurstTime = popupInitialBurstTime(this.burstClock, burst);
        this.automaticEmission = args.automaticEmission;
    }
    static continuation(runtimeSystem: RuntimeSystem, nativeSystem: NativeSystem, activatedValue: unknown): StoryOmenPopupGeneralSystem {
        const config = parseGeneralConfig(runtimeSystem, nativeSystem, activatedValue);
        return new StoryOmenPopupGeneralSystem({
            config,
            playbackState: nativeSystem.playbackState,
            particles: nativeSystem.particles.map((particle, index) => generalParticleFromNative(particle, config, `${config.path} native particle ${index}`)),
            restorePlaybackRandom: true,
            automaticEmission: true,
        });
    }
    static manual(runtimeSystem: RuntimeSystem, nativeSystem: NativeSystem, activatedValue: unknown, randomSeed: number, emitCount: number): StoryOmenPopupGeneralSystem {
        const config = parseGeneralConfig(runtimeSystem, { ...nativeSystem, randomSeed }, activatedValue);
        const result = new StoryOmenPopupGeneralSystem({
            config,
            playbackState: [],
            particles: [],
            restorePlaybackRandom: false,
            automaticEmission: false,
        });
        result.emit(emitCount, 0);
        return result;
    }
    advanceFrames(frameCount: number): void {
        for (let frame = 0; frame < frameCount; frame++)
            this.advanceFrame();
    }
    advanceFrame(): void {
        const delta = f32(PARTICLE_FRAME_DELTA * this.config.simulationSpeed);
        if (this.particles.length) {
            const scrollSpeed = curveValue(this.config.modules.NoiseModule.scrollSpeed, this.playbackTime, 0, `${this.config.path} noise scroll speed`);
            this.noiseScroll = f32(this.noiseScroll + f32(scrollSpeed * delta));
        }
        for (const particle of this.particles) {
            this.move(particle, delta);
            advanceParticleLifetime(particle, delta);
        }
        for (let index = 0; index < this.particles.length;) {
            if (this.particles[index].remainingLifetime > 0) {
                index++;
                continue;
            }
            const last = this.particles.pop();
            if (!last)
                throw new Error("Popup particle storage underflow");
            if (index < this.particles.length)
                this.particles[index] = last;
        }
        this.emissionRandom.nextUInt();
        const nextPlaybackTime = f32(this.playbackTime + delta);
        this.playbackTime = nextPlaybackTime >= this.config.duration
            ? f32(nextPlaybackTime - this.config.duration)
            : nextPlaybackTime;
        this.previousBurstClock = this.burstClock;
        // RadiusTimer is advanced from Unity's higher-precision accumulated clock
        // and only narrowed when exposed through ParticleSystem playback state.
        // Re-rounding the accumulator every step moves the probabilistic .5 s
        // SHAPE/GLOW burst across a frame after the 30 s duration boundary.
        this.burstClock += delta;
        if (!this.automaticEmission)
            return;
        const burst = object(array(this.config.modules.EmissionModule.m_Bursts, `${this.config.path} bursts`)[0], `${this.config.path} burst`);
        const interval = numeric(burst.repeatInterval, `${this.config.path} burst interval`);
        while (this.burstClock >= this.nextBurstTime) {
            const probability = numeric(burst.probability, `${this.config.path} burst probability`);
            const accepted = probability >= 1 || this.emissionRandom.nextFloat() <= probability;
            if (accepted) {
                const countCurve = object(burst.countCurve, `${this.config.path} burst count`);
                const state = integer(countCurve.minMaxState, `${this.config.path} burst count mode`);
                let count: number;
                if (state === 0)
                    count = integer(countCurve.scalar, `${this.config.path} burst count constant`);
                else if (state === 3) {
                    const minimum = integer(countCurve.minScalar, `${this.config.path} burst minimum`);
                    const maximum = integer(countCurve.scalar, `${this.config.path} burst maximum`);
                    count = minimum + this.emissionRandom.nextUInt() % (maximum - minimum + 1);
                }
                else
                    throw new Error(`Unsupported popup burst count mode: ${state}`);
                const burstOvershoot = f32(this.burstClock - this.nextBurstTime);
                let emissionTime = f32(this.playbackTime - burstOvershoot);
                if (emissionTime < 0)
                    emissionTime = f32(emissionTime + this.config.duration);
                // Native automatic bursts enter the simulation job for the whole
                // current step. `burstOvershoot` locates the InitialModule curve sample
                // inside that step, but it is not the particle's first-frame age.
                this.emit(count, f32(PARTICLE_FRAME_DELTA * this.config.simulationSpeed), emissionTime);
            }
            this.nextBurstTime = f32(this.nextBurstTime + interval);
        }
    }
    private emit(count: number, ageSeconds: number, emissionTime = this.playbackTime): void {
        const initial = this.config.modules.InitialModule;
        const maximum = integer(initial.maxNumParticles, `${this.config.path} maximum particles`);
        // ParticleSystem rejects a burst at capacity before the SIMD Initial/Shape
        // jobs run. The uninterrupted native trace keeps all 32 lane-state words
        // unchanged at EMBER frame 5 (30/30 particles); generating then discarding
        // a particle advances both jobs and changes every later seed/lifetime.
        count = Math.min(count, Math.max(0, maximum - this.particles.length));
        if (!count)
            return;
        // InitialModule curves use the exact sub-frame burst timestamp, while the
        // automatic particle itself is simulated for the whole current step.
        for (let first = 0; first < count; first += 4) {
            const initialInputs = this.initialRandom.map((random) => Array.from({ length: 5 }, () => random.nextUInt()));
            const shapeInputs = this.shapeRandom.map((random) => [random.nextFloat(), random.nextFloat(), random.nextFloat()] as const);
            for (let lane = 0; lane < Math.min(4, count - first); lane++) {
                const shape = this.config.modules.ShapeModule;
                const draw = (index: number) => particleFloat(initialInputs[lane][index]);
                const lifetime = curveValue(initial.startLifetime, emissionTime, draw(1), `${this.config.path} start lifetime`);
                const size = curveValue(initial.startSize, emissionTime, draw(2), `${this.config.path} start size`);
                const scale = vector3(shape.m_Scale, `${this.config.path} shape scale`);
                const authoredPosition = vector3(shape.m_Position, `${this.config.path} shape position`);
                const authoredRotation = vector3(shape.m_Rotation, `${this.config.path} shape rotation`);
                const centered = {
                    x: f32(f32(shapeInputs[lane][0] - 0.5) * scale.x),
                    y: f32(f32(shapeInputs[lane][1] - 0.5) * scale.y),
                    z: f32(f32(shapeInputs[lane][2] - 0.5) * scale.z),
                };
                let rotated: Vector3;
                if (authoredRotation.x === 0 && authoredRotation.y === 0 && authoredRotation.z === 0)
                    rotated = centered;
                else if (authoredRotation.x === -90 && authoredRotation.y === 0 && authoredRotation.z === 0) {
                    // ShapeModule does not special-case the authored -90 degree Euler.
                    // It builds a float quaternion and then its float rotation matrix.
                    // The 035b `shape-box-unit-rot-x-minus90` oracle is bit-identical for
                    // all 4 seeds x 16 particles only when the small diagonal and the
                    // 0.99999994 off-diagonal terms are retained; an exact axis swap can
                    // move a Medium-noise input across a lattice boundary.
                    const radians = f32(f32(authoredRotation.x) * f32(Math.PI / 180));
                    const halfRadians = f32(radians * f32(0.5));
                    const quaternionX = f32(Math.sin(halfRadians));
                    const quaternionW = f32(Math.cos(halfRadians));
                    const diagonal = f32(1 - f32(f32(2) * f32(quaternionX * quaternionX)));
                    const offDiagonal = f32(f32(2) * f32(quaternionX * quaternionW));
                    rotated = {
                        x: centered.x,
                        y: f32(f32(diagonal * centered.y) - f32(offDiagonal * centered.z)),
                        z: f32(f32(offDiagonal * centered.y) + f32(diagonal * centered.z)),
                    };
                }
                else
                    throw new Error(`Unsupported popup box Euler rotation: ${this.config.path}`);
                let position: Vector3 = {
                    x: f32(rotated.x + authoredPosition.x),
                    y: f32(rotated.y + authoredPosition.y),
                    z: f32(rotated.z + authoredPosition.z),
                };
                if (this.config.simulationSpace === "World")
                    position = vector3(transformPoint(position, this.config.localToWorld), `${this.config.path} world spawn`);
                const randomSeed = initialInputs[lane][0];
                const particle: PopupGeneralParticle = {
                    randomSeed,
                    position,
                    velocity: { x: 0, y: 0, z: 0 },
                    animatedVelocity: { x: 0, y: 0, z: 0 },
                    rotation: {
                        x: 0,
                        y: 0,
                        z: f32(curveValue(initial.startRotation, emissionTime, draw(3), `${this.config.path} start rotation`) * RADIANS_TO_DEGREES),
                    },
                    angularVelocity: { x: 0, y: 0, z: 0 },
                    startLifetime: lifetime,
                    remainingLifetime: lifetime,
                    ageSeconds: 0,
                    startSize: { x: size, y: size, z: size },
                    startColor: popupInitialColor(initial.startColor, draw(4), `${this.config.path} start color`),
                    gravityModifier: curveValue(initial.gravityModifier, emissionTime, particleRandom(randomSeed, POPUP_GRAVITY_RANDOM_SALT).nextFloat(), `${this.config.path} gravity modifier`),
                };
                this.refreshPresentation(particle);
                if (ageSeconds) {
                    this.move(particle, ageSeconds);
                    advanceParticleLifetime(particle, ageSeconds);
                }
                this.particles.push(particle);
            }
        }
    }
    private refreshPresentation(particle: PopupGeneralParticle): void {
        const age = particleAge(particle);
        const velocity = this.config.modules.VelocityModule;
        const velocityRandom = particleRandom(particle.randomSeed, POPUP_VELOCITY_RANDOM_SALT);
        const noise = popupGeneralNoise(this.config, particle, age, this.noiseOffset, this.noiseScroll);
        for (const [axis, curve] of [["x", velocity.x], ["y", velocity.y], ["z", velocity.z]] as const) {
            const authored = curveValue(curve, age, velocityRandom.nextFloat(), `${this.config.path} velocity ${axis}`);
            const scaled = velocity.inWorldSpace ? f32(authored * this.config.hierarchyScale) : authored;
            particle.animatedVelocity[axis] = f32(scaled + noise[axis]);
        }
        particle.angularVelocity = popupGeneralAngularVelocity(this.config, particle, age);
    }
    private move(particle: PopupGeneralParticle, deltaSeconds: number): void {
        const age = particleAge(particle);
        this.refreshPresentation(particle);
        const force = this.config.modules.ForceModule;
        const forceRandom = particleRandom(particle.randomSeed, POPUP_FORCE_RANDOM_SALT);
        const total: Vector3 = { x: 0, y: 0, z: 0 };
        for (const [axis, curve] of [["x", force.x], ["y", force.y], ["z", force.z]] as const) {
            const authoredForce = force.enabled
                ? curveValue(curve, age, forceRandom.nextFloat(), `${this.config.path} force ${axis}`)
                : 0;
            const scaledForce = force.inWorldSpace ? f32(authoredForce * this.config.hierarchyScale) : authoredForce;
            const gravity = this.config.simulationSpace === "Local" && axis === "y"
                ? f32(CLIENT_GRAVITY_Y / this.config.hierarchyScale)
                : 0;
            // Probe 060 actual PlayerLoop: IJobParticleSystem +0x60/+0x80/+0xA0
            // are the public Particle.velocity x/y/z SoA and Force updates those
            // arrays in place. There is no separate private Force accumulator.
            particle.velocity[axis] = f32(particle.velocity[axis] +
                f32(f32(f32(gravity * particle.gravityModifier) + scaledForce) * deltaSeconds));
            total[axis] = f32(particle.velocity[axis] + particle.animatedVelocity[axis]);
        }
        const clamp = this.config.modules.ClampVelocityModule;
        const speedSquared = popupSpeedSquared(total);
        const speed = popupSpeed(speedSquared);
        const maximum = curveValue(clamp.magnitude, age, particleRandom(particle.randomSeed, POPUP_LIMIT_RANDOM_SALT).nextFloat(), `${this.config.path} velocity limit`);
        if (speed > maximum && speed > 0) {
            const inverseSpeed = popupClampInverseSpeed(speedSquared);
            for (const axis of ["x", "y", "z"] as const) {
                total[axis] = f32(f32(total[axis] * inverseSpeed) * maximum);
                particle.velocity[axis] = f32(total[axis] - particle.animatedVelocity[axis]);
            }
        }
        const modifier = curveValue(this.config.modules.VelocityModule.speedModifier, age, 0, `${this.config.path} velocity modifier`);
        for (const axis of ["x", "y", "z"] as const) {
            particle.position[axis] = f32(particle.position[axis] +
                f32(f32(total[axis] * modifier) * deltaSeconds));
            particle.rotation[axis] = f32(particle.rotation[axis] +
                f32(particle.angularVelocity[axis] * deltaSeconds));
        }
    }
    playbackState(): readonly {
        name: string;
        value: string;
    }[] {
        const values = new Map(this.basePlaybackState.map((entry) => [entry.name, entry.value]));
        values.set("m_PlaybackTime", String(this.playbackTime));
        values.set("m_Noise.m_ScrollOffset", String(this.noiseScroll));
        values.set("m_Shape.m_RadiusTimer", String(f32(this.burstClock)));
        values.set("m_Shape.m_RadiusTimerPrev", String(f32(this.previousBurstClock)));
        const emissionState = this.emissionRandom.snapshot();
        for (const [index, word] of (["x", "y", "z", "w"] as const).entries())
            values.set(`m_Emission.m_Random.${word}`, String(emissionState[index]));
        for (const [moduleName, lanes] of [["Initial", this.initialRandom], ["Shape", this.shapeRandom]] as const) {
            for (const [laneIndex, lane] of (["x", "y", "z", "w"] as const).entries()) {
                const state = lanes[laneIndex].snapshot();
                for (const [wordIndex, word] of (["x", "y", "z", "w"] as const).entries())
                    values.set(`m_${moduleName}.m_Random.${word}.${lane}`, String(state[wordIndex]));
            }
        }
        return [...values].map(([name, value]) => ({ name, value }));
    }
    particleRecords(): readonly Record<string, unknown>[] {
        return this.particles.map((particle, nativeBufferIndex) => {
            const age = particleAge(particle);
            const currentSize = popupCurrentSize(this.config, particle, age);
            const currentColor = popupCurrentColor(this.config, particle, age);
            const custom1 = popupGeneralCustom(this.config, particle, age);
            return {
                nativeBufferIndex,
                randomSeed: particle.randomSeed,
                position: { ...particle.position },
                velocity: { ...particle.velocity },
                animatedVelocity: { ...particle.animatedVelocity },
                totalVelocity: {
                    x: f32(particle.velocity.x + particle.animatedVelocity.x),
                    y: f32(particle.velocity.y + particle.animatedVelocity.y),
                    z: f32(particle.velocity.z + particle.animatedVelocity.z),
                },
                rotation3D: { ...particle.rotation },
                angularVelocity3D: { ...particle.angularVelocity },
                axisOfRotation: { x: 0, y: 1, z: 0 },
                startLifetime: particle.startLifetime,
                remainingLifetime: particle.remainingLifetime,
                startSize3D: { ...particle.startSize },
                currentSize3D: currentSize,
                startColor: { ...particle.startColor },
                currentColor,
                custom1,
                custom2: { x: 0, y: 0, z: 0, w: 0 },
            };
        });
    }
    private uvFor(particle: PopupGeneralParticle, age: number): readonly [
        number,
        number,
        number,
        number
    ] {
        if (this.config.path === EMBER_PATH)
            return [EMBER_STRETCH_U_MIN, EMBER_STRETCH_U_MAX, EMBER_STRETCH_V_MIN, EMBER_STRETCH_V_MAX];
        const uv = this.config.modules.UVModule;
        const tilesX = integer(uv.tilesX, `${this.config.path} UV tiles X`);
        const tilesY = integer(uv.tilesY, `${this.config.path} UV tiles Y`);
        const tileCount = tilesX * tilesY;
        const startRandom = particleRandom(particle.randomSeed, POPUP_UV_START_FRAME_RANDOM_SALT).nextFloat();
        const frame = f32(f32(curveValue(uv.frameOverTime, age, 0, `${this.config.path} UV frame`) *
            numeric(uv.cycles, `${this.config.path} UV cycles`)) +
            curveValue(uv.startFrame, age, startRandom, `${this.config.path} UV start frame`));
        const tile = Math.min(tileCount - 1, Math.max(0, Math.floor(f32(frame * tileCount)))) % tileCount;
        const width = f32(1 / tilesX), height = f32(1 / tilesY);
        const column = tile % tilesX, row = Math.floor(tile / tilesX);
        const left = f32(column * width), right = f32(left + width);
        let top = 1;
        for (let index = 0; index < row; index++)
            top = f32(top - height);
        const bottom = f32(top - height);
        return [left, right, bottom, top];
    }
    mesh(): NativeMesh {
        const records = this.particleRecords();
        return this.config.path === EMBER_PATH ? this.stretchMesh(records) : this.billboardMesh(records);
    }
    private billboardMesh(records: readonly Record<string, unknown>[]): NativeMesh {
        const positions: NativeVector[] = [], uv0: NativeVector[] = [], colors: NativeColor32[] = [], triangles: number[] = [];
        for (const record of [...records].reverse()) {
            const particleIndex = integer(record.nativeBufferIndex, `${this.config.path} mesh particle index`);
            const particle = this.particles[particleIndex];
            const position = vector3(record.position, `${this.config.path} mesh position`);
            const size = vector3(record.currentSize3D, `${this.config.path} mesh current size`);
            const rotation = vector3(record.rotation3D, `${this.config.path} mesh rotation`);
            const age = particleAge(particle);
            const color = popupMeshColor(this.config, particle, age);
            const custom = nativeVector(record.custom1, `${this.config.path} mesh custom`);
            const halfX = f32(f32(size.x * this.config.hierarchyScale) / 2);
            const halfY = f32(f32(size.y * this.config.hierarchyScale) / 2);
            const radians = f32(f32(-rotation.z) * f32(Math.PI / 180));
            const xCosine = f32(Math.cos(radians)), xSine = f32(Math.sin(radians));
            const yRadians = f32(radians - f32(Math.PI / 2));
            const yCosine = f32(Math.cos(yRadians)), ySine = f32(Math.sin(yRadians));
            const first = positions.length;
            for (const [xSign, ySign] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
                positions.push({
                    x: f32(position.x + f32(f32(xSign * halfX) * xCosine) +
                        f32(f32(ySign * halfY) * yCosine)),
                    y: f32(position.y + f32(f32(xSign * halfX) * xSine) +
                        f32(f32(ySign * halfY) * ySine)),
                    z: position.z,
                });
            }
            const [left, right, bottom, top] = this.uvFor(particle, age);
            uv0.push({ x: left, y: top, z: custom.x, w: custom.y }, { x: right, y: top, z: custom.x, w: custom.y }, { x: right, y: bottom, z: custom.x, w: custom.y }, { x: left, y: bottom, z: custom.x, w: custom.y });
            for (let vertex = 0; vertex < 4; vertex++)
                colors.push({ ...color });
            triangles.push(first, first + 1, first + 2, first, first + 2, first + 3);
        }
        return { positions, uv0, uv1: [], uv2: [], uv3: [], colors, triangles };
    }
    private stretchMesh(records: readonly Record<string, unknown>[]): NativeMesh {
        const positions: NativeVector[] = [], uv0: NativeVector[] = [], colors: NativeColor32[] = [], triangles: number[] = [];
        const ordered = [...records].sort((left, right) => numeric(left.remainingLifetime, "EMBER remaining lifetime") -
            numeric(right.remainingLifetime, "EMBER remaining lifetime"));
        const velocityScale = numeric(this.config.renderer.m_VelocityScale, "EMBER renderer velocity scale");
        expect(this.config.renderer.m_LengthScale, 0, "EMBER renderer source length scale");
        for (const record of ordered) {
            const particleIndex = integer(record.nativeBufferIndex, "EMBER mesh particle index");
            const particle = this.particles[particleIndex];
            const position = vector3(record.position, "EMBER mesh position");
            const total = vector3(record.totalVelocity, "EMBER mesh total velocity");
            const size = vector3(record.currentSize3D, "EMBER mesh current size");
            const age = particleAge(particle);
            const color = popupMeshColor(this.config, particle, age);
            const speed = f32(Math.hypot(total.x, total.y));
            const inverseSpeed = speed > 0 ? f32(1 / speed) : 0;
            const halfWidth = f32(f32(size.x * this.config.hierarchyScale) / 2);
            const perpendicular = {
                x: f32(f32(-total.y * inverseSpeed) * halfWidth),
                y: f32(f32(total.x * inverseSpeed) * halfWidth),
            };
            const end = {
                x: f32(position.x - f32(total.x * velocityScale)),
                y: f32(position.y - f32(total.y * velocityScale)),
                z: f32(position.z - f32(total.z * velocityScale)),
            };
            const first = positions.length;
            positions.push({ x: f32(position.x + perpendicular.x), y: f32(position.y + perpendicular.y), z: position.z }, { x: f32(end.x + perpendicular.x), y: f32(end.y + perpendicular.y), z: end.z }, { x: f32(end.x - perpendicular.x), y: f32(end.y - perpendicular.y), z: end.z }, { x: f32(position.x - perpendicular.x), y: f32(position.y - perpendicular.y), z: position.z });
            const [left, right, bottom, top] = this.uvFor(particle, age);
            const custom = nativeVector(record.custom1, "EMBER mesh custom");
            uv0.push({ x: left, y: top, z: custom.x, w: custom.y }, { x: right, y: top, z: custom.x, w: custom.y }, { x: right, y: bottom, z: custom.x, w: custom.y }, { x: left, y: bottom, z: custom.x, w: custom.y });
            for (let vertex = 0; vertex < 4; vertex++)
                colors.push({ ...color });
            triangles.push(first, first + 1, first + 2, first, first + 2, first + 3);
        }
        return { positions, uv0, uv1: [], uv2: [], uv3: [], colors, triangles };
    }
    get time(): number { return this.playbackTime; }
    get randomSeed(): number { return this.config.randomSeed; }
    get particleCount(): number { return this.particles.length; }
}
export type StoryOmenPopupSmokeOracleOptions = {
    fixedSeed: number;
    emitCount: number;
    frameIndex: number;
    noiseEnabled: boolean;
    rotationBySpeedEnabled: boolean;
};
/** Source-controlled 028/030 diagnostic surface; not a captured-frame player. */
export function storyOmenPopupSmokeOracleState(runtimeValue: Record<string, unknown>, options: StoryOmenPopupSmokeOracleOptions): {
    time: number;
    playbackState: readonly {
        name: string;
        value: string;
    }[];
    particles: readonly Record<string, unknown>[];
    mesh: NativeMesh;
} {
    validateFrameIndex(options.frameIndex);
    if (!Number.isInteger(options.fixedSeed) || options.fixedSeed < 0 || options.fixedSeed > 0xffffffff)
        throw new RangeError("Invalid SMOKE oracle fixed seed");
    if (!Number.isSafeInteger(options.emitCount) || options.emitCount < 0)
        throw new RangeError("Invalid SMOKE oracle emit count");
    const popupParticles = object(runtimeValue.popupParticles, "popup particles");
    const sourceSystems = array(popupParticles.sourceSystems, "popup source systems").map(parseRuntimeSystem);
    const smokeSource = sourceSystems.find((source) => source.path === SMOKE_PATH);
    if (!smokeSource)
        throw new Error("Missing SMOKE source system");
    const system = StoryOmenPopupSmokeSystem.manual(smokeSource, options.fixedSeed, options.emitCount, options.noiseEnabled, options.rotationBySpeedEnabled);
    system.advanceFrames(options.frameIndex);
    return {
        time: system.time,
        playbackState: system.playbackState(),
        particles: system.particleRecords(),
        mesh: system.mesh(),
    };
}
export type StoryOmenPopupParticleOracleOptions = {
    sourcePath: Exclude<PopupParticlePath, typeof SMOKE_PATH>;
    fixedSeed: number;
    emitCount: number;
    frameIndex: number;
};
/** Source-controlled 031-037 diagnostic surface; not a captured-frame player. */
export function storyOmenPopupParticleOracleState(runtimeValue: Record<string, unknown>, options: StoryOmenPopupParticleOracleOptions): {
    time: number;
    playbackState: readonly {
        name: string;
        value: string;
    }[];
    particles: readonly Record<string, unknown>[];
    mesh: NativeMesh;
} {
    validateFrameIndex(options.frameIndex);
    if (!ORDERED_PATHS.includes(options.sourcePath))
        throw new Error(`Unsupported popup general oracle path: ${options.sourcePath}`);
    if (!Number.isInteger(options.fixedSeed) || options.fixedSeed < 0 || options.fixedSeed > 0xffffffff)
        throw new RangeError("Invalid popup oracle fixed seed");
    if (!Number.isSafeInteger(options.emitCount) || options.emitCount < 0)
        throw new RangeError("Invalid popup oracle emit count");
    const popupParticles = object(runtimeValue.popupParticles, "popup particles");
    const sourceSystems = array(popupParticles.sourceSystems, "popup source systems").map(parseRuntimeSystem);
    const runtimeSystem = sourceSystems.find((source) => source.path === options.sourcePath);
    if (!runtimeSystem)
        throw new Error(`Missing popup source system: ${options.sourcePath}`);
    const initialFrame = object(object(runtimeValue.longParticleEvidence, "popup long-particle evidence").initialNativeFrame, "popup native initial frame");
    const nativeSystem = array(initialFrame.systems, "popup initial native systems").map(parseNativeSystem)
        .find((source) => sourcePath(source.path) === options.sourcePath);
    if (!nativeSystem)
        throw new Error(`Missing popup native system: ${options.sourcePath}`);
    const activated = array(popupParticles.systems, "popup activated systems").map((value) => object(value, "popup activated system")).find((value) => sourcePath(text(value.path, "popup activated path")) === options.sourcePath)?.activated;
    if (!activated)
        throw new Error(`Missing popup activated system: ${options.sourcePath}`);
    const system = StoryOmenPopupGeneralSystem.manual(runtimeSystem, nativeSystem, activated, options.fixedSeed, options.emitCount);
    system.advanceFrames(options.frameIndex);
    return {
        time: system.time,
        playbackState: system.playbackState(),
        particles: system.particleRecords(),
        mesh: system.mesh(),
    };
}
/**
 * Client-derived four-system popup particle runtime. Frame zero is the native
 * public prewarm snapshot; later frames are generated from the serialized
 * source modules and independently probed Unity branches. The finite native
 * trace is never repeated or used as playback. Probe 060 proves Force operates
 * directly on the public velocity SoA, so no missing private Force accumulator
 * is assumed here. The native pre-callback initialization SoA cannot be read;
 * remaining long-run counterexamples are confined to unresolved world-space
 * transform/float operation order. This contract therefore does not claim bit
 * identity for each auto-random-seed particle after frame zero.
 */
export function buildStoryOmenPopupParticleRuntime(runtimeValue: Record<string, unknown>): StoryOmenPopupParticleRuntime {
    const runtime = object(runtimeValue, "popup Omen runtime");
    expect(runtime.schema, "counterside-omen-native-surface-runtime-v1", "popup runtime schema");
    expect(runtime.schemaVersion, 1, "popup runtime schema version");
    expect(runtime.surface, POPUP_SURFACE, "popup runtime surface");
    const coordinateSpace = object(runtime.coordinateSpace, "popup coordinate space");
    const canvas = object(coordinateSpace.canvas, "popup canvas");
    expect(canvas.width, 1920, "popup canvas width");
    expect(canvas.height, 1080, "popup canvas height");
    expect(coordinateSpace.selectedRoot, SOURCE_ROOT, "popup selected root");
    const selectedToStage = matrix(coordinateSpace.selectedToStage, "popup selected-to-stage matrix");
    const provenance = object(runtime.provenance, "popup runtime provenance");
    const staticEvidence = object(provenance.particleStaticEvidence, "popup particle static evidence");
    expect(staticEvidence.publicPath, "/story/map-ui/omen-particles/client-evidence.json", "popup particle evidence path");
    expect(staticEvidence.sha256, PARTICLE_EVIDENCE_SHA256, "popup particle evidence SHA-256");
    const popupParticles = object(runtime.popupParticles, "popup particles");
    exactArray(array(popupParticles.activeOrderedPaths, "popup active particle order"), ORDERED_PATHS, "popup active particle order");
    validateSourceTextures(popupParticles.sourceTextures);
    const sourceSystems = array(popupParticles.sourceSystems, "popup source systems").map(parseRuntimeSystem);
    exactArray(sourceSystems.map((system) => system.path), ORDERED_PATHS, "popup source-system order");
    const initialFrame = object(object(runtime.longParticleEvidence, "popup long-particle evidence").initialNativeFrame, "popup native initial frame");
    expect(initialFrame.frame, 0, "popup initial frame index");
    const nativeSystems = array(initialFrame.systems, "popup initial native systems").map(parseNativeSystem);
    exactArray(nativeSystems.map((system) => sourcePath(system.path)), ORDERED_PATHS, "popup native-system order");
    const activatedSystems = new Map(array(popupParticles.systems, "popup activated systems").map((value) => {
        const entry = object(value, "popup activated system");
        return [sourcePath(text(entry.path, "popup activated path")), entry.activated] as const;
    }));
    const initialMeshes = new Map(nativeSystems.map((system) => [
        sourcePath(system.path),
        capturedMeshes(system, selectedToStage),
    ]));
    const initialSnapshot: StoryOmenPopupParticleSnapshot = {
        frameIndex: 0,
        systems: nativeSystems.map((system) => ({
            sourcePath: sourcePath(system.path),
            time: system.time,
            randomSeed: system.randomSeed,
            particleCount: system.particleCount,
            playbackState: system.playbackState,
            particles: system.particles,
        })),
    };
    type ProceduralSystem = {
        advanceFrames(frameCount: number): void;
        playbackState(): readonly {
            name: string;
            value: string;
        }[];
        particleRecords(): readonly Record<string, unknown>[];
        mesh(): NativeMesh;
        readonly time: number;
        readonly randomSeed: number;
        readonly particleCount: number;
    };
    const createProceduralSystems = (): {
        sourcePath: PopupParticlePath;
        nativeSystem: NativeSystem;
        system: ProceduralSystem;
    }[] => nativeSystems.map((nativeSystem) => {
        const path = sourcePath(nativeSystem.path);
        const runtimeSystem = sourceSystems.find((source) => source.path === path);
        if (!runtimeSystem)
            throw new Error(`Missing popup runtime system: ${path}`);
        if (path === SMOKE_PATH) {
            return { sourcePath: path, nativeSystem,
                system: StoryOmenPopupSmokeSystem.continuation(runtimeSystem, nativeSystem) };
        }
        const activated = activatedSystems.get(path);
        if (!activated)
            throw new Error(`Missing popup activated system: ${path}`);
        return { sourcePath: path, nativeSystem,
            system: StoryOmenPopupGeneralSystem.continuation(runtimeSystem, nativeSystem, activated) };
    });
    let cachedFrameIndex = 0;
    let cachedSystems = createProceduralSystems();
    const evaluatedAt = (frameIndex: number) => {
        // Canvas asks for monotonically increasing RAF frames. Retaining the four
        // native continuations makes that O(delta) instead of replaying 0..N for
        // every draw (O(N^2)). Direct audits may seek backwards, in which case the
        // captured frame-zero continuation is the only evidence-backed reset.
        if (frameIndex < cachedFrameIndex) {
            cachedSystems = createProceduralSystems();
            cachedFrameIndex = 0;
        }
        const delta = frameIndex - cachedFrameIndex;
        if (delta) {
            for (const entry of cachedSystems)
                entry.system.advanceFrames(delta);
            cachedFrameIndex = frameIndex;
        }
        return cachedSystems.map(({ sourcePath: path, system }) => {
            return {
                sourcePath: path,
                time: system.time,
                randomSeed: system.randomSeed,
                particleCount: system.particleCount,
                playbackState: system.playbackState(),
                particles: system.particleRecords(),
                mesh: system.mesh(),
            };
        });
    };
    return {
        preloadTextures: Object.values(PARTICLE_ASSETS).map((asset) => ({
            path: asset.path,
            filter: asset.filter,
            wrapU: asset.wrapU,
            wrapV: asset.wrapV,
        })),
        draw(frameIndex: number) {
            validateFrameIndex(frameIndex);
            if (!frameIndex)
                return ORDERED_PATHS.flatMap((path) => (initialMeshes.get(path) ?? []).map((mesh): StoryOmenSceneDrawCommand => ({
                    kind: "mesh",
                    sourcePath: path,
                    mesh,
                })));
            return evaluatedAt(frameIndex).flatMap((evaluated) => {
                const nativeSystem = nativeSystems.find((entry) => sourcePath(entry.path) === evaluated.sourcePath);
                if (!nativeSystem)
                    throw new Error(`Missing native mesh transform: ${evaluated.sourcePath}`);
                return capturedMeshes({
                    ...nativeSystem,
                    time: evaluated.time,
                    randomSeed: evaluated.randomSeed,
                    particleCount: evaluated.particleCount,
                    playbackState: evaluated.playbackState,
                    particles: evaluated.particles,
                    geometry: { ...nativeSystem.geometry, raw: evaluated.mesh },
                }, selectedToStage).map((mesh): StoryOmenSceneDrawCommand => ({
                    kind: "mesh",
                    sourcePath: evaluated.sourcePath,
                    mesh,
                }));
            });
        },
        snapshot(frameIndex: number) {
            validateFrameIndex(frameIndex);
            if (!frameIndex)
                return structuredClone(initialSnapshot);
            return {
                frameIndex,
                systems: evaluatedAt(frameIndex).map((system) => ({
                    sourcePath: system.sourcePath,
                    time: system.time,
                    randomSeed: system.randomSeed,
                    particleCount: system.particleCount,
                    playbackState: system.playbackState,
                    particles: system.particles,
                })),
            };
        },
    };
}
