import type { SwordTrainingPmaMesh } from "@/components/minigames/sword-training/SwordTrainingPmaMeshes";
export const STORY_OMEN_PARTICLE_ROOT = "UI_EC_SIDESTORY_OMEN/UI_PTC";
export const STORY_OMEN_ACTIVE_PARTICLES = [
    `${STORY_OMEN_PARTICLE_ROOT}/ENV_PTC_EMBER_AMBIENT_ORANGE_00`,
    `${STORY_OMEN_PARTICLE_ROOT}/PTC_ASH/GLOW`,
    `${STORY_OMEN_PARTICLE_ROOT}/PTC_ASH/SHAPE`,
    `${STORY_OMEN_PARTICLE_ROOT}/UI_PTC_ENV_TRIM_DUST/SMOKE`,
] as const;
export const STORY_OMEN_INACTIVE_PARTICLES = [
    `${STORY_OMEN_PARTICLE_ROOT}/UI_PTC_ENV_TRIM_DUST/DEBRIS_A`,
    `${STORY_OMEN_PARTICLE_ROOT}/UI_PTC_ENV_TRIM_DUST/DEBRIS_B`,
    `${STORY_OMEN_PARTICLE_ROOT}/UI_PTC_ENV_TRIM_DUST/DEBRIS_C`,
    `${STORY_OMEN_PARTICLE_ROOT}/UI_PTC_ENV_TRIM_DUST/TRIANGLE`,
] as const;
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
export type StoryOmenNativeMesh = {
    positions: readonly NativeVector[];
    uv0: readonly NativeVector[];
    uv1: readonly NativeVector[];
    uv2: readonly NativeVector[];
    uv3: readonly NativeVector[];
    colors: readonly NativeColor32[];
    triangles: readonly number[];
};
type NativeMaterialProperty = {
    name: string;
    type: string;
    scalar: number;
    vector: {
        x: number;
        y: number;
        z: number;
        w: number;
    };
    texture?: {
        name: string;
    } | null;
    textureScale?: {
        x: number;
        y: number;
    };
    textureOffset?: {
        x: number;
        y: number;
    };
};
type NativeMaterial = {
    name: string;
    shader: string;
    properties: readonly NativeMaterialProperty[];
};
export type StoryOmenParticleProbeSystem = {
    path: string;
    activeSelf: boolean;
    activeInHierarchy: boolean;
    isPlaying: boolean;
    particleCount: number;
    randomSeed: number;
    useAutoRandomSeed: boolean;
    simulationSpace: "Local" | "World" | string;
    localToWorld: readonly number[];
    localToRoot: readonly number[];
    hasUiParticles: boolean;
    uiParticlesEnabled: boolean;
    rendererEnabled: boolean;
    meshSource: string;
    mesh: StoryOmenNativeMesh;
    material: NativeMaterial | null;
};
export type StoryOmenParticleProbeRenderer = {
    path: string;
    renderMode: "Billboard" | "Stretch" | string;
    alignment: "View" | "Local" | string;
    sortMode: string;
    enabled: boolean;
    activeInHierarchy: boolean;
    localToSelected: readonly number[];
    bakedMesh: StoryOmenNativeMesh;
};
export type StoryOmenGraphicProbeFrame = {
    path: string;
    type: string;
    enabled: boolean;
    activeInHierarchy: boolean;
    color: {
        r: number;
        g: number;
        b: number;
        a: number;
    };
    canvasRendererAlpha: number;
    sprite: string;
    mainTexture: string;
    localToStage: readonly number[];
    localToSelected?: readonly number[];
    mesh: StoryOmenNativeMesh;
    material: NativeMaterial | null;
};
export type StoryOmenNativeProbeFrame = {
    sourceRoot: string;
    selectedSourcePath: string;
    frame: number;
    particles: {
        systems: readonly StoryOmenParticleProbeSystem[];
    };
    graphics: readonly StoryOmenGraphicProbeFrame[];
    particleRenderers: readonly StoryOmenParticleProbeRenderer[];
};
type ParticleShader = "ui-alpha" | "ptc-pma-stream" | "ptc-alpha-additive";
export type StoryOmenParticleDescriptor = {
    path: (typeof STORY_OMEN_ACTIVE_PARTICLES)[number];
    nativePath: string;
    modules: readonly string[];
    material: string;
    textureName: string;
    texture: string;
    shader: ParticleShader;
    renderMode: 0 | 1;
    renderAlignment: 0 | 2;
    sortMode: 1 | 3;
    sortingFudge: number;
    sortingOrder: 101;
};
export type StoryOmenParticleSource = {
    descriptors: ReadonlyMap<string, StoryOmenParticleDescriptor>;
    inactivePaths: readonly string[];
};
export type StoryOmenCapturedParticleDraw = {
    path: string;
    particleCount: number;
    randomSeed: number;
    autoRandomSeed: boolean;
    meshKind: "ui-canvas" | "renderer-baked";
    /** Exact native vertices transformed into the selected UI_PTC root, Y up. */
    mesh: StoryOmenNativeMesh;
};
const EXPECTED_MODULES: Record<string, readonly string[]> = {
    ENV_PTC_EMBER_AMBIENT_ORANGE_00: [
        "InitialModule", "ShapeModule", "EmissionModule", "SizeModule", "ColorModule",
        "UVModule", "VelocityModule", "ClampVelocityModule", "NoiseModule", "CustomDataModule",
    ],
    GLOW: [
        "InitialModule", "ShapeModule", "EmissionModule", "SizeModule", "RotationModule",
        "ColorModule", "UVModule", "VelocityModule", "ForceModule", "ClampVelocityModule",
        "NoiseModule", "CustomDataModule",
    ],
    SHAPE: [
        "InitialModule", "ShapeModule", "EmissionModule", "SizeModule", "RotationModule",
        "ColorModule", "UVModule", "VelocityModule", "ForceModule", "ClampVelocityModule",
        "NoiseModule", "CustomDataModule",
    ],
    SMOKE: [
        "InitialModule", "ShapeModule", "EmissionModule", "SizeModule", "ColorModule",
        "VelocityModule", "NoiseModule", "RotationBySpeedModule",
    ],
};
const EXPECTED_CHILDREN: Record<string, readonly (readonly [
    string,
    boolean
])[]> = {
    UI_EC_SIDESTORY_OMEN: [["Background", true], ["Contents", true], ["UI_PTC", true]],
    [STORY_OMEN_PARTICLE_ROOT]: [["UI_PTC_ENV_TRIM_DUST", true], ["PTC_ASH", true], ["ENV_PTC_EMBER_AMBIENT_ORANGE_00", true]],
    [`${STORY_OMEN_PARTICLE_ROOT}/PTC_ASH`]: [["SHAPE", true], ["GLOW", true]],
    [`${STORY_OMEN_PARTICLE_ROOT}/UI_PTC_ENV_TRIM_DUST`]: [
        ["DEBRIS_A", false], ["DEBRIS_B", false], ["DEBRIS_C", false], ["SMOKE", true], ["TRIANGLE", false],
    ],
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
    if (typeof value !== "string")
        throw new Error(`Missing ${label}`);
    return value;
}
function numeric(value: unknown, label: string): number {
    if (typeof value !== "number" || !Number.isFinite(value))
        throw new Error(`Invalid ${label}`);
    return value;
}
function boolean(value: unknown, label: string): boolean {
    if (typeof value !== "boolean")
        throw new Error(`Missing ${label}`);
    return value;
}
function equalArray(actual: readonly unknown[], expected: readonly unknown[], label: string): void {
    if (actual.length !== expected.length || actual.some((value, index) => value !== expected[index]))
        throw new Error(`Client ${label} changed`);
}
function sourceParticlePath(path: string): string {
    if (path.startsWith("UI_EC_SIDESTORY_OMEN/"))
        return path;
    if (path === "UI_PTC" || path.startsWith("UI_PTC/"))
        return `UI_EC_SIDESTORY_OMEN/${path}`;
    throw new Error(`Particle escaped the selected Omen hierarchy: ${path}`);
}
function expectValue(actual: unknown, expected: unknown, label: string): void {
    if (actual !== expected)
        throw new Error(`Client ${label} changed: ${String(actual)}`);
}
/**
 * Converts the UnityPy evidence into the only three shader paths proven for the
 * four active popup systems. Any hierarchy, module, renderer, material or
 * texture drift is rejected before a native frame is allowed to draw.
 */
export function storyOmenParticleSource(evidence: unknown): StoryOmenParticleSource {
    const root = object(evidence, "Omen particle evidence");
    expectValue(root.schemaVersion, 1, "particle evidence schema");
    const hierarchy = object(root.hierarchy, "particle hierarchy");
    equalArray(array(hierarchy.activeParticleSystems, "active particle paths"), STORY_OMEN_ACTIVE_PARTICLES, "active particle paths");
    equalArray(array(hierarchy.intentionallyInactiveParticleSystems, "inactive particle paths"), STORY_OMEN_INACTIVE_PARTICLES, "inactive particle paths");
    const childGroups = array(hierarchy.directChildOrder, "direct-child order");
    for (const [parentPath, expected] of Object.entries(EXPECTED_CHILDREN)) {
        const group = childGroups.map((value) => object(value, "direct-child group"))
            .find((value) => value.parentPath === parentPath);
        if (!group)
            throw new Error(`Missing client direct-child group: ${parentPath}`);
        const children = array(group.children, `${parentPath} children`).map((value, index) => {
            const child = object(value, `${parentPath} child`);
            expectValue(child.siblingIndex, index, `${parentPath} sibling index`);
            return [text(child.name, "child name"), boolean(child.activeSelf, "child activeSelf")] as const;
        });
        if (children.length !== expected.length || children.some((value, index) => value[0] !== expected[index][0] || value[1] !== expected[index][1]))
            throw new Error(`Client direct-child order/active state changed: ${parentPath}`);
    }
    const textures = new Map(array(root.textures, "particle textures").map((value) => {
        const texture = object(value, "particle texture");
        return [text(texture.name, "texture name"), text(texture.publicPath, "texture publicPath")] as const;
    }));
    const materials = new Map(array(root.materials, "particle materials").map((value) => {
        const material = object(value, "particle material");
        return [text(material.name, "material name"), material] as const;
    }));
    const expected = new Map<string, Omit<StoryOmenParticleDescriptor, "path" | "nativePath" | "modules" | "texture"> & {
        modules: readonly string[];
    }>([
        [STORY_OMEN_ACTIVE_PARTICLES[0], { material: "(legacy)CMN_SPRITE_INTENSITY_PA", textureName: "Default-Particle", shader: "ptc-alpha-additive", modules: EXPECTED_MODULES.ENV_PTC_EMBER_AMBIENT_ORANGE_00, renderMode: 1, renderAlignment: 0, sortMode: 3, sortingFudge: 10, sortingOrder: 101 }],
        [STORY_OMEN_ACTIVE_PARTICLES[1], { material: "PTCS_DEBRIS_GLOW_00_PM", textureName: "PTCS_DEBRIS_GLOW_00", shader: "ptc-pma-stream", modules: EXPECTED_MODULES.GLOW, renderMode: 0, renderAlignment: 0, sortMode: 1, sortingFudge: -2, sortingOrder: 101 }],
        [STORY_OMEN_ACTIVE_PARTICLES[2], { material: "PTCS_DEBRIS_GLOW_00_PM", textureName: "PTCS_DEBRIS_GLOW_00", shader: "ptc-pma-stream", modules: EXPECTED_MODULES.SHAPE, renderMode: 0, renderAlignment: 0, sortMode: 1, sortingFudge: -1, sortingOrder: 101 }],
        [STORY_OMEN_ACTIVE_PARTICLES[3], { material: "PTCS_UI_SMOKE", textureName: "PTCS_UI_SMOKE_00", shader: "ui-alpha", modules: EXPECTED_MODULES.SMOKE, renderMode: 0, renderAlignment: 2, sortMode: 1, sortingFudge: -2, sortingOrder: 101 }],
    ]);
    const descriptors = new Map<string, StoryOmenParticleDescriptor>();
    for (const value of array(root.particles, "particle systems")) {
        const particle = object(value, "particle system");
        const path = text(particle.path, "particle path");
        const wanted = expected.get(path);
        if (!wanted)
            throw new Error(`Unexpected active Omen particle: ${path}`);
        expectValue(particle.active, true, `${path} activeSelf`);
        expectValue(particle.material, wanted.material, `${path} material`);
        expectValue(particle.mainTexture, wanted.textureName, `${path} texture`);
        const system = object(particle.system, `${path} system`);
        expectValue(system.looping, true, `${path} looping`);
        expectValue(system.prewarm, true, `${path} prewarm`);
        expectValue(system.playOnAwake, true, `${path} playOnAwake`);
        const modules = array(system.enabledModules, `${path} enabled modules`).map((entry) => text(entry, "module"));
        equalArray(modules, wanted.modules, `${path} enabled modules`);
        const renderer = object(particle.renderer, `${path} renderer`);
        expectValue(renderer.m_RenderMode, wanted.renderMode, `${path} render mode`);
        expectValue(renderer.m_RenderAlignment, wanted.renderAlignment, `${path} render alignment`);
        expectValue(renderer.m_SortMode, wanted.sortMode, `${path} sort mode`);
        expectValue(renderer.m_SortingFudge, wanted.sortingFudge, `${path} sorting fudge`);
        expectValue(renderer.m_SortingOrder, wanted.sortingOrder, `${path} sorting order`);
        const material = materials.get(wanted.material);
        if (!material)
            throw new Error(`Missing client material: ${wanted.material}`);
        const shader = object(material.shader, `${wanted.material} shader`);
        const floats = object(material.floats, `${wanted.material} floats`);
        const blend = object(material.blend, `${wanted.material} blend`);
        const sourceBlend = object(blend.source, `${wanted.material} source blend`).value;
        const destinationBlend = object(blend.destination, `${wanted.material} destination blend`).value;
        if (wanted.shader === "ptc-alpha-additive") {
            expectValue(shader.name, "NKC/NKC_PTC_PMA", "ember shader");
            expectValue(floats._PMA, 0, "ember PMA flag");
            expectValue(floats._BypassStream, 1, "ember bypass stream");
            expectValue(sourceBlend, 5, "ember source blend");
            expectValue(destinationBlend, 1, "ember destination blend");
        }
        else if (wanted.shader === "ptc-pma-stream") {
            expectValue(shader.name, "NKC/NKC_PTC_PMA", "ash shader");
            expectValue(floats._PMA, 1, "ash PMA flag");
            expectValue(floats._BypassStream, 0, "ash bypass stream");
            expectValue(sourceBlend, 1, "ash source blend");
            expectValue(destinationBlend, 10, "ash destination blend");
        }
        else {
            expectValue(shader.name, "UI/Particles/Alpha Blended", "smoke shader");
            expectValue(sourceBlend, 5, "smoke source blend");
            expectValue(destinationBlend, 10, "smoke destination blend");
            const tint = object(object(material.colors, "smoke colors")._TintColor, "smoke tint");
            for (const channel of ["r", "g", "b", "a"] as const)
                expectValue(tint[channel], 0.5, `smoke tint ${channel}`);
        }
        const texture = textures.get(wanted.textureName);
        if (!texture)
            throw new Error(`Missing client texture: ${wanted.textureName}`);
        descriptors.set(path, { ...wanted, path: path as StoryOmenParticleDescriptor["path"], nativePath: path.slice("UI_EC_SIDESTORY_OMEN/".length), modules, texture });
    }
    if (descriptors.size !== STORY_OMEN_ACTIVE_PARTICLES.length)
        throw new Error("Missing active Omen particle descriptors");
    return { descriptors, inactivePaths: STORY_OMEN_INACTIVE_PARTICLES };
}
function multiplyMatrix(left: readonly number[], right: readonly number[]): number[] {
    if (left.length !== 16 || right.length !== 16 || [...left, ...right].some((value) => !Number.isFinite(value)))
        throw new Error("Invalid native particle matrix");
    const result = new Array<number>(16).fill(0);
    for (let row = 0; row < 4; row++)
        for (let column = 0; column < 4; column++)
            for (let inner = 0; inner < 4; inner++)
                result[row * 4 + column] += left[row * 4 + inner] * right[inner * 4 + column];
    return result;
}
function inverseAffine(matrix: readonly number[]): number[] {
    if (matrix.length !== 16 || matrix.some((value) => !Number.isFinite(value)) || matrix[12] !== 0 || matrix[13] !== 0 || matrix[14] !== 0 || matrix[15] !== 1)
        throw new Error("Unsupported native particle transform matrix");
    const [a, b, c, tx, d, e, f, ty, g, h, i, tz] = matrix;
    const A = e * i - f * h, B = c * h - b * i, C = b * f - c * e;
    const D = f * g - d * i, E = a * i - c * g, F = c * d - a * f;
    const G = d * h - e * g, H = b * g - a * h, I = a * e - b * d;
    const determinant = a * A + b * D + c * G;
    if (!Number.isFinite(determinant) || Math.abs(determinant) <= Number.EPSILON)
        throw new Error("Singular native particle transform matrix");
    const inverse = [A / determinant, B / determinant, C / determinant, 0, D / determinant, E / determinant, F / determinant, 0, G / determinant, H / determinant, I / determinant, 0, 0, 0, 0, 1];
    inverse[3] = -(inverse[0] * tx + inverse[1] * ty + inverse[2] * tz);
    inverse[7] = -(inverse[4] * tx + inverse[5] * ty + inverse[6] * tz);
    inverse[11] = -(inverse[8] * tx + inverse[9] * ty + inverse[10] * tz);
    return inverse;
}
function transformMesh(mesh: StoryOmenNativeMesh, matrix: readonly number[]): StoryOmenNativeMesh {
    return { ...mesh, positions: mesh.positions.map((position) => {
            const z = position.z ?? 0;
            return {
                x: Math.fround(matrix[0] * position.x + matrix[1] * position.y + matrix[2] * z + matrix[3]),
                y: Math.fround(matrix[4] * position.x + matrix[5] * position.y + matrix[6] * z + matrix[7]),
                z: Math.fround(matrix[8] * position.x + matrix[9] * position.y + matrix[10] * z + matrix[11]),
            };
        }) };
}
function validateCounterexamples(frame: StoryOmenNativeProbeFrame): void {
    const systems = new Map(frame.particles.systems.map((system) => [sourceParticlePath(system.path), system]));
    for (const path of STORY_OMEN_INACTIVE_PARTICLES) {
        const system = systems.get(path);
        if (!system || system.activeSelf || system.activeInHierarchy || system.isPlaying || system.particleCount !== 0 || system.mesh.positions.length !== 0)
            throw new Error(`Inactive Omen particle counterexample became renderable: ${path}`);
    }
}
/** Convert a real ParticlesProbe frame; no ParticleSystem physics are inferred. */
export function storyOmenCapturedParticleDraws(frame: StoryOmenNativeProbeFrame, source: StoryOmenParticleSource): StoryOmenCapturedParticleDraw[] {
    validateCounterexamples(frame);
    const renderers = new Map(frame.particleRenderers.map((renderer) => [sourceParticlePath(renderer.path), renderer]));
    const output: StoryOmenCapturedParticleDraw[] = [];
    for (const system of frame.particles.systems) {
        const path = sourceParticlePath(system.path);
        const descriptor = source.descriptors.get(path);
        if (!descriptor)
            continue;
        if (!system.activeSelf || !system.activeInHierarchy)
            continue;
        if (!system.isPlaying)
            throw new Error(`Active Omen particle is not playing: ${path}`);
        const renderer = renderers.get(path);
        if (!renderer)
            throw new Error(`Missing native Omen renderer capture: ${path}`);
        let mesh: StoryOmenNativeMesh;
        let meshKind: StoryOmenCapturedParticleDraw["meshKind"];
        if (descriptor.shader === "ui-alpha") {
            if (!system.hasUiParticles || !system.uiParticlesEnabled || system.rendererEnabled || renderer.enabled || system.meshSource !== "original UiParticles.OnPopulateMesh; global Random restored")
                throw new Error(`Unsupported native UiParticles branch: ${path}`);
            mesh = transformMesh(system.mesh, system.localToRoot);
            meshKind = "ui-canvas";
        }
        else {
            if (system.hasUiParticles || !system.rendererEnabled || !renderer.enabled || !renderer.activeInHierarchy)
                throw new Error(`Unsupported native ParticleSystemRenderer branch: ${path}`);
            if (system.simulationSpace === "Local")
                mesh = transformMesh(renderer.bakedMesh, renderer.localToSelected);
            else if (system.simulationSpace === "World") {
                const worldToSelected = multiplyMatrix(system.localToRoot, inverseAffine(system.localToWorld));
                mesh = transformMesh(renderer.bakedMesh, worldToSelected);
            }
            else
                throw new Error(`Unsupported Omen simulation space: ${path}/${system.simulationSpace}`);
            meshKind = "renderer-baked";
        }
        if (mesh.positions.length !== system.particleCount * 4)
            throw new Error(`Native Omen mesh/particle count mismatch: ${path}`);
        output.push({ path, particleCount: system.particleCount, randomSeed: system.randomSeed,
            autoRandomSeed: system.useAutoRandomSeed, meshKind, mesh });
    }
    return output;
}
function checkedColor(color: NativeColor32, label: string): readonly [
    number,
    number,
    number,
    number
] {
    const channels = [color.r, color.g, color.b, color.a] as const;
    if (channels.some((value) => !Number.isInteger(value) || value < 0 || value > 255))
        throw new Error(`Invalid native Color32: ${label}`);
    return [color.r / 255, color.g / 255, color.b / 255, color.a / 255];
}
function validateQuadMesh(mesh: StoryOmenNativeMesh, draw: StoryOmenCapturedParticleDraw): void {
    const count = mesh.positions.length;
    if (count % 4 || mesh.uv0.length !== count || mesh.colors.length !== count || mesh.triangles.length !== count / 4 * 6)
        throw new Error(`Unexpected native Omen particle streams: ${draw.path}`);
    if (draw.meshKind === "ui-canvas") {
        if (mesh.uv1.length !== count || mesh.uv2.length !== count || mesh.uv3.length !== count)
            throw new Error(`UiParticles additional canvas channels changed: ${draw.path}`);
    }
    else if (mesh.uv1.length || mesh.uv2.length || mesh.uv3.length) {
        throw new Error(`ParticleSystemRenderer unexpectedly populated extra UV streams: ${draw.path}`);
    }
}
/** Build exact per-billboard draws for the shared audited WebGL renderer. */
export function storyOmenParticleMeshes(draws: readonly StoryOmenCapturedParticleDraw[], source: StoryOmenParticleSource, width = 1920, height = 1080): SwordTrainingPmaMesh[] {
    if (!(width > 0 && height > 0))
        throw new RangeError("Invalid Omen particle canvas");
    const output: SwordTrainingPmaMesh[] = [];
    for (const draw of draws) {
        const descriptor = source.descriptors.get(draw.path);
        if (!descriptor)
            throw new Error(`Unverified Omen particle draw: ${draw.path}`);
        validateQuadMesh(draw.mesh, draw);
        for (let vertex = 0; vertex < draw.mesh.positions.length; vertex += 4) {
            const color = draw.mesh.colors[vertex], custom = draw.mesh.uv0[vertex];
            const positions: number[] = [], uvs: number[] = [];
            for (let offset = 0; offset < 4; offset++) {
                const index = vertex + offset, position = draw.mesh.positions[index], uv = draw.mesh.uv0[index], currentColor = draw.mesh.colors[index];
                if (currentColor.r !== color.r || currentColor.g !== color.g || currentColor.b !== color.b || currentColor.a !== color.a)
                    throw new Error(`Omen billboard vertex colors diverged: ${draw.path}`);
                if (descriptor.shader === "ptc-pma-stream" && (uv.z !== custom.z || uv.w !== custom.w))
                    throw new Error(`Omen Custom1 stream diverged inside a billboard: ${draw.path}`);
                positions.push(width / 2 + position.x, height / 2 - position.y);
                uvs.push(uv.x, 1 - uv.y);
            }
            const firstIndex = vertex / 4 * 6;
            const indices = draw.mesh.triangles.slice(firstIndex, firstIndex + 6).map((index) => index - vertex);
            if (indices.some((index) => !Number.isInteger(index) || index < 0 || index > 3))
                throw new Error(`Omen particle triangles cross billboards: ${draw.path}`);
            const mesh: SwordTrainingPmaMesh = { id: `${draw.path}:${vertex / 4}`, texture: descriptor.texture,
                positions, uvs, indices, color: checkedColor(color, draw.path) };
            if (descriptor.shader === "ptc-pma-stream") {
                if (![custom.z, custom.w].every((value) => typeof value === "number" && Number.isFinite(value)))
                    throw new Error(`Missing native Omen Custom1 stream: ${draw.path}`);
                mesh.particleCustom = [custom.z!, custom.w!];
                mesh.particleTint = [1, 1, 1, 1];
            }
            else if (descriptor.shader === "ptc-alpha-additive") {
                mesh.sourceAlphaAdditive = true;
                mesh.sourceAlphaAdditiveMultiplier = 1;
            }
            else
                mesh.sourceStraightAlpha = true;
            output.push(mesh);
        }
    }
    return output;
}
export type StoryOmenGlitchDraw = {
    id: string;
    positions: readonly number[];
    unityUvs: readonly number[];
    colors: readonly number[];
    indices: readonly number[];
    maskTexture: string;
    noiseTexture: string;
    noiseScaleOffset: readonly [
        number,
        number,
        number,
        number
    ];
    channelOffsets: readonly [
        number,
        number,
        number,
        number,
        number,
        number
    ];
    shapeTest: number;
};
export type StoryOmenGraphicDraws = {
    meshes: SwordTrainingPmaMesh[];
    glitches: StoryOmenGlitchDraw[];
};
export type StoryOmenTmpMaterial = {
    atlasTexture: string;
    keywords: readonly string[];
    gradientScale: number;
    sharpness: number;
    weightNormal: number;
    weightBold: number;
    faceDilate: number;
    scaleRatioA: number;
    outlineWidth: number;
    outlineSoftness: number;
    scaleX: number;
    scaleY: number;
    vertexOffsetX: number;
    vertexOffsetY: number;
    textureWidth: number;
    textureHeight: number;
    faceColor: readonly [
        number,
        number,
        number,
        number
    ];
    outlineColor: readonly [
        number,
        number,
        number,
        number
    ];
    underlayColor: readonly [
        number,
        number,
        number,
        number
    ];
    underlayDilate: number;
    underlaySoftness: number;
    scaleRatioC: number;
    underlayOffsetX: number;
    underlayOffsetY: number;
};
export type StoryOmenTmpDraw = {
    id: string;
    /** Native TMP glyph vertices transformed into surface pixels, Y down. */
    positions: readonly number[];
    unityUvs: readonly number[];
    scales: readonly number[];
    /** Native Color32 vertex channels, kept as bytes until the WebGL upload. */
    colors: readonly number[];
    indices: readonly number[];
    material: StoryOmenTmpMaterial;
};
export type StoryOmenNativeTmpDrawOptions = {
    atlasTexture: string;
    /** Captured TMP local-to-surface matrix, row-major for column vectors. */
    localToSurface?: readonly number[];
    /** Canvas origin corresponding to Unity local (0,0), in Y-down pixels. */
    surfaceOrigin: readonly [
        number,
        number
    ];
};
function tmpMaterialProperty(material: Record<string, unknown>, name: string): Record<string, unknown> {
    const matches = array(material.properties, `TMP ${name} properties`)
        .map((value) => object(value, `TMP ${name} property`))
        .filter((property) => property.name === name);
    if (matches.length !== 1)
        throw new Error(`Missing native TMP material property: ${name}`);
    return matches[0];
}
function tmpMaterialNumber(material: Record<string, unknown>, name: string): number {
    return numeric(tmpMaterialProperty(material, name).number, `TMP ${name}`);
}
function tmpMaterialColor(material: Record<string, unknown>, name: string): readonly [
    number,
    number,
    number,
    number
] {
    const vector = object(tmpMaterialProperty(material, name).vector, `TMP ${name} color`);
    return [numeric(vector.x, `${name}.x`), numeric(vector.y, `${name}.y`),
        numeric(vector.z, `${name}.z`), numeric(vector.w, `${name}.w`)];
}
function nativeVectorArray(value: unknown, label: string): NativeVector[] {
    return array(value, label).map((entry, index) => {
        const vector = object(entry, `${label}[${index}]`);
        return { x: numeric(vector.x, `${label}[${index}].x`), y: numeric(vector.y, `${label}[${index}].y`),
            z: vector.z === undefined ? undefined : numeric(vector.z, `${label}[${index}].z`),
            w: vector.w === undefined ? undefined : numeric(vector.w, `${label}[${index}].w`) };
    });
}
/**
 * Convert native TMP textInfo meshes from the Omen Unity probe. Glyph layout is
 * never regenerated in JavaScript: the exact vertices, UV2 scale, Color32 and
 * material values captured after TMP.GenerateTextMesh are retained.
 */
export function storyOmenNativeTmpDraws(captureValue: unknown, options: StoryOmenNativeTmpDrawOptions): StoryOmenTmpDraw[] {
    const capture = object(captureValue, "native Omen TMP capture");
    expectValue(capture.nativeType, "TMPro.TextMeshProUGUI", "TMP native type");
    const captureId = text(capture.id, "TMP capture id");
    if (!options.atlasTexture)
        throw new Error(`Missing native TMP atlas path: ${captureId}`);
    const origin = options.surfaceOrigin;
    if (origin.length !== 2 || origin.some((value) => !Number.isFinite(value)))
        throw new Error(`Invalid native TMP surface origin: ${captureId}`);
    const matrix = options.localToSurface ?? array(capture.localToStage, "TMP localToStage").map((value) => numeric(value, "TMP matrix"));
    if (matrix.length !== 16 || matrix.some((value) => !Number.isFinite(value)))
        throw new Error(`Invalid native TMP matrix: ${captureId}`);
    const output: StoryOmenTmpDraw[] = [];
    for (const [meshIndex, meshValue] of array(capture.meshes, "TMP meshes").entries()) {
        const mesh = object(meshValue, `TMP mesh ${meshIndex}`);
        const vertexCount = numeric(mesh.vertexCount, `TMP mesh ${meshIndex} vertexCount`);
        if (!Number.isInteger(vertexCount) || vertexCount < 0)
            throw new Error(`Invalid native TMP vertex count: ${captureId}`);
        if (vertexCount === 0)
            continue;
        const vertices = nativeVectorArray(mesh.vertices, "TMP vertices");
        const uv0 = nativeVectorArray(mesh.uv0, "TMP uv0");
        const uv2 = nativeVectorArray(mesh.uv2, "TMP uv2");
        const colors = array(mesh.colors32, "TMP colors32").map((entry, index) => {
            const color = object(entry, `TMP colors32[${index}]`);
            return [numeric(color.r, "TMP color r"), numeric(color.g, "TMP color g"),
                numeric(color.b, "TMP color b"), numeric(color.a, "TMP color a")] as const;
        });
        const indices = array(mesh.triangles, "TMP triangles").map((value) => numeric(value, "TMP triangle"));
        if (vertices.length !== vertexCount || uv0.length !== vertexCount || uv2.length !== vertexCount || colors.length !== vertexCount)
            throw new Error(`Native TMP stream lengths changed: ${captureId}/${meshIndex}`);
        const material = object(mesh.material, `TMP material ${meshIndex}`);
        expectValue(material.shader, "TextMeshPro/Distance Field", "TMP shader");
        const mainTexture = object(tmpMaterialProperty(material, "_MainTex").texture, "TMP atlas texture");
        if (!text(mainTexture.name, "TMP atlas name"))
            throw new Error(`Missing native TMP atlas name: ${captureId}`);
        const keywords = array(material.keywords, "TMP keywords").map((value) => text(value, "TMP keyword"));
        const positions: number[] = [];
        for (const vertex of vertices) {
            const z = vertex.z ?? 0;
            const x = Math.fround(matrix[0] * vertex.x + matrix[1] * vertex.y + matrix[2] * z + matrix[3]);
            const y = Math.fround(matrix[4] * vertex.x + matrix[5] * vertex.y + matrix[6] * z + matrix[7]);
            positions.push(origin[0] + x, origin[1] - y);
        }
        output.push({
            id: `${captureId}:material-${numeric(mesh.materialReferenceIndex, "TMP materialReferenceIndex")}`,
            positions,
            unityUvs: uv0.flatMap((uv) => [uv.x, uv.y]),
            scales: uv2.map((uv) => numeric(uv.y, "TMP UV2 scale")),
            colors: colors.flat(),
            indices,
            material: {
                atlasTexture: options.atlasTexture,
                keywords,
                gradientScale: tmpMaterialNumber(material, "_GradientScale"),
                sharpness: tmpMaterialNumber(material, "_Sharpness"),
                weightNormal: tmpMaterialNumber(material, "_WeightNormal"),
                weightBold: tmpMaterialNumber(material, "_WeightBold"),
                faceDilate: tmpMaterialNumber(material, "_FaceDilate"),
                scaleRatioA: tmpMaterialNumber(material, "_ScaleRatioA"),
                outlineWidth: tmpMaterialNumber(material, "_OutlineWidth"),
                outlineSoftness: tmpMaterialNumber(material, "_OutlineSoftness"),
                scaleX: tmpMaterialNumber(material, "_ScaleX"),
                scaleY: tmpMaterialNumber(material, "_ScaleY"),
                vertexOffsetX: tmpMaterialNumber(material, "_VertexOffsetX"),
                vertexOffsetY: tmpMaterialNumber(material, "_VertexOffsetY"),
                textureWidth: tmpMaterialNumber(material, "_TextureWidth"),
                textureHeight: tmpMaterialNumber(material, "_TextureHeight"),
                faceColor: tmpMaterialColor(material, "_FaceColor"),
                outlineColor: tmpMaterialColor(material, "_OutlineColor"),
                underlayColor: tmpMaterialColor(material, "_UnderlayColor"),
                underlayDilate: tmpMaterialNumber(material, "_UnderlayDilate"),
                underlaySoftness: tmpMaterialNumber(material, "_UnderlaySoftness"),
                scaleRatioC: tmpMaterialNumber(material, "_ScaleRatioC"),
                underlayOffsetX: tmpMaterialNumber(material, "_UnderlayOffsetX"),
                underlayOffsetY: tmpMaterialNumber(material, "_UnderlayOffsetY"),
            },
        });
    }
    if (!output.length)
        throw new Error(`Native Omen TMP capture has no renderable mesh: ${captureId}`);
    return output;
}
export type StoryOmenNativeSurface = "popup" | "chronicle-node";
export type StoryOmenNativeMotionPolicy = "native" | "freeze-first-native-frame";
export type StoryOmenSceneDrawCommand = {
    kind: "mesh";
    sourcePath: string;
    mesh: SwordTrainingPmaMesh;
    clipRect?: readonly [
        number,
        number,
        number,
        number
    ];
} | {
    kind: "tmp";
    sourcePath: string;
    draw: StoryOmenTmpDraw;
    clipRect?: readonly [
        number,
        number,
        number,
        number
    ];
} | {
    kind: "grab-glitch";
    sourcePath: string;
    draw: StoryOmenGlitchDraw;
    clipRect?: readonly [
        number,
        number,
        number,
        number
    ];
};
export type StoryOmenSceneFrame = {
    surface: StoryOmenNativeSurface;
    elapsedSeconds: number;
    /** Unity Canvas sibling traversal order. Grab commands read every prior draw. */
    commands: readonly StoryOmenSceneDrawCommand[];
};
export type StoryOmenNativeInteractionFrame = {
    pressedTarget: string | null;
    previousPressedTarget: string | null;
    /** Seconds since the latest pointer down/up/cancel transition. */
    transitionElapsedSeconds: number;
    /**
     * Time that the previous target had tracked toward its touch scale before
     * pointer up/cancel. NKCUIComStateButtonBase resumes from that in-flight
     * value; it does not snap to m_fTouchSize before returning.
     */
    previousPressElapsedSeconds: number;
    /** Independent in-flight return trackers, one per source StateButton. */
    releasedTargets: readonly {
        target: string;
        pressElapsedSeconds: number;
        releaseElapsedSeconds: number;
    }[];
};
export type StoryOmenSceneTexture = {
    path: string;
    /** Exact Unity Texture.filterMode branch captured for this source texture. */
    filter: "nearest" | "linear";
    /** Exact Unity Texture.wrapModeU branch captured for this source texture. */
    wrapU: "repeat" | "clamp";
    /** Exact Unity Texture.wrapModeV branch captured for this source texture. */
    wrapV: "repeat" | "clamp";
};
export type StoryOmenContinuousSceneSource = {
    surface: StoryOmenNativeSurface;
    sourceRoot: string;
    referenceWidth: number;
    referenceHeight: number;
    /** Exact StateButton source paths accepted from transparent DOM hit targets. */
    interactiveTargets: readonly string[];
    maximumInteractionTransitionSeconds: number;
    /**
     * Every texture that the infinite evaluator can ever emit. Loading the whole
     * set first prevents a partial framebuffer from becoming a GrabPass source.
     */
    preloadTextures: readonly StoryOmenSceneTexture[];
    /** Finite native traces are calibration evidence, never a playback source. */
    continuity: "procedural-infinite";
    frameAt: (elapsedSeconds: number, interaction: StoryOmenNativeInteractionFrame) => StoryOmenSceneFrame;
};
function commandTextures(command: StoryOmenSceneDrawCommand): readonly string[] {
    if (command.kind === "mesh")
        return [command.mesh.texture];
    if (command.kind === "tmp")
        return [command.draw.material.atlasTexture];
    return [command.draw.maskTexture, command.draw.noiseTexture];
}
/**
 * Validate the strict scene contract used by the shared framebuffer renderer.
 * There is deliberately no finite-trace, CSS, DOM-snapshot or frozen fallback.
 */
export function storyOmenSceneFrameAt(source: StoryOmenContinuousSceneSource, elapsedSeconds: number, motionPolicy: StoryOmenNativeMotionPolicy = "native", interaction: StoryOmenNativeInteractionFrame = {
    pressedTarget: null,
    previousPressedTarget: null,
    transitionElapsedSeconds: 0,
    previousPressElapsedSeconds: 0,
    releasedTargets: [],
}): StoryOmenSceneFrame {
    if (source.continuity !== "procedural-infinite")
        throw new Error("Omen scene source must be procedurally infinite");
    if (!(source.referenceWidth > 0 && source.referenceHeight > 0))
        throw new Error("Invalid Omen scene reference size");
    if (!source.sourceRoot)
        throw new Error("Missing Omen scene source root");
    if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0)
        throw new RangeError("Invalid Omen scene elapsed time");
    const interactiveTargets = new Set(source.interactiveTargets);
    if (interactiveTargets.size !== source.interactiveTargets.length || [...interactiveTargets].some((path) => !path))
        throw new Error("Invalid Omen scene interactive target list");
    if (!Number.isFinite(source.maximumInteractionTransitionSeconds) || source.maximumInteractionTransitionSeconds < 0)
        throw new Error("Invalid Omen StateButton transition duration");
    for (const target of [interaction.pressedTarget, interaction.previousPressedTarget]) {
        if (target !== null && !interactiveTargets.has(target))
            throw new Error(`Unknown Omen pressed target: ${target}`);
    }
    if (!Number.isFinite(interaction.transitionElapsedSeconds) || interaction.transitionElapsedSeconds < 0)
        throw new RangeError("Invalid Omen interaction transition time");
    if (!Number.isFinite(interaction.previousPressElapsedSeconds) || interaction.previousPressElapsedSeconds < 0)
        throw new RangeError("Invalid Omen previous press time");
    const releasedTargets = new Set<string>();
    for (const release of interaction.releasedTargets) {
        if (!interactiveTargets.has(release.target))
            throw new Error(`Unknown released Omen target: ${release.target}`);
        if (releasedTargets.has(release.target))
            throw new Error(`Duplicate released Omen target: ${release.target}`);
        if (release.target === interaction.pressedTarget)
            throw new Error(`Pressed Omen target is also releasing: ${release.target}`);
        if (!Number.isFinite(release.pressElapsedSeconds) || release.pressElapsedSeconds < 0 ||
            !Number.isFinite(release.releaseElapsedSeconds) || release.releaseElapsedSeconds < 0)
            throw new RangeError("Invalid Omen released-target time");
        releasedTargets.add(release.target);
    }
    const requestedTime = motionPolicy === "freeze-first-native-frame" ? 0 : elapsedSeconds;
    const frame = source.frameAt(requestedTime, interaction);
    if (frame.surface !== source.surface)
        throw new Error("Omen scene evaluator returned the wrong surface");
    if (frame.elapsedSeconds !== requestedTime)
        throw new Error("Omen scene evaluator returned the wrong time");
    const declaredTextures = new Map(source.preloadTextures.map((texture) => [texture.path, texture]));
    if (declaredTextures.size !== source.preloadTextures.length ||
        source.preloadTextures.some((texture) => !texture.path ||
            !["nearest", "linear"].includes(texture.filter) ||
            !["repeat", "clamp"].includes(texture.wrapU) ||
            !["repeat", "clamp"].includes(texture.wrapV)))
        throw new Error("Invalid Omen scene preload texture list");
    const commandIds = new Set<string>();
    for (const command of frame.commands) {
        if (!command.sourcePath)
            throw new Error("Omen scene command is missing its client path");
        const id = command.kind === "mesh" ? command.mesh.id : command.draw.id;
        if (!id || commandIds.has(id))
            throw new Error(`Duplicate Omen scene command id: ${id}`);
        commandIds.add(id);
        for (const path of commandTextures(command)) {
            if (!declaredTextures.has(path))
                throw new Error(`Omen scene emitted an undeclared texture: ${path}`);
        }
    }
    return frame;
}
function materialProperty(material: NativeMaterial, name: string): NativeMaterialProperty {
    const matches = material.properties.filter((property) => property.name === name);
    if (matches.length !== 1)
        throw new Error(`Missing native material property: ${material.name}.${name}`);
    return matches[0];
}
function meshToCanvas(mesh: StoryOmenNativeMesh, matrix: readonly number[], width: number, height: number) {
    const transformed = transformMesh(mesh, matrix);
    return transformed.positions.flatMap((position) => [width / 2 + position.x, height / 2 - position.y]);
}
function graphicMatrix(graphic: StoryOmenGraphicProbeFrame, selectedWorldToLocal: readonly number[]): readonly number[] {
    if (graphic.localToSelected) {
        if (graphic.localToSelected.length !== 16 || graphic.localToSelected.some((value) => !Number.isFinite(value)))
            throw new Error(`Invalid native Graphic localToSelected: ${graphic.path}`);
        return graphic.localToSelected;
    }
    return multiplyMatrix(selectedWorldToLocal, graphic.localToStage);
}
/** Exact DXBC inputs for StudioBside-Custom-GlitchUI; framebuffer sampling is performed by the component. */
export function storyOmenGlitchDraw(graphic: StoryOmenGraphicProbeFrame, texturePaths: Readonly<Record<string, string>>, selectedWorldToLocal: readonly number[], width = 1920, height = 1080): StoryOmenGlitchDraw | null {
    if (!graphic.enabled || !graphic.activeInHierarchy || !graphic.mesh.positions.length)
        return null;
    const material = graphic.material;
    if (!material || material.shader !== "StudioBside/Custom/StudioBside-Custom-GlitchUI")
        throw new Error(`Unsupported Omen glitch material: ${graphic.path}`);
    // UI shaders receive Graphic.mainTexture through CanvasRenderer's
    // per-renderer _MainTex binding. The shared material still exposes its
    // serialized default texture, but using that value here would sample the
    // wrong mask (the node material default is MASK_CIRCLE_00 while the native
    // Image actually renders NK_AURA_SEQ_00).
    materialProperty(material, "_MainTex");
    const main = graphic.mainTexture;
    const noise = materialProperty(material, "_NoiseTex");
    const noiseName = noise.texture?.name;
    if (!main || !noiseName || !texturePaths[main] || !texturePaths[noiseName])
        throw new Error(`Unresolved Omen glitch textures: ${graphic.path}`);
    const st = materialProperty(material, "_NoiseTex_ST").vector;
    const scalar = (name: string) => numeric(materialProperty(material, name).scalar, `${graphic.path}.${name}`);
    const colorCount = graphic.mesh.colors.length;
    if (graphic.mesh.uv0.length !== graphic.mesh.positions.length || colorCount !== graphic.mesh.positions.length)
        throw new Error(`Unexpected Omen glitch mesh streams: ${graphic.path}`);
    const localToSelected = graphicMatrix(graphic, selectedWorldToLocal);
    return {
        id: graphic.path,
        positions: meshToCanvas(graphic.mesh, localToSelected, width, height),
        unityUvs: graphic.mesh.uv0.flatMap((uv) => [uv.x, uv.y]),
        colors: graphic.mesh.colors.flatMap((color) => checkedColor(color, graphic.path)),
        indices: graphic.mesh.triangles,
        maskTexture: texturePaths[main],
        noiseTexture: texturePaths[noiseName],
        noiseScaleOffset: [st.x, st.y, st.z, st.w],
        channelOffsets: [scalar("_GlitchRedX"), scalar("_GlitchRedY"), scalar("_GlitchGreenX"), scalar("_GlitchGreenY"), scalar("_GlitchBlueX"), scalar("_GlitchBlueY")],
        shapeTest: scalar("_ShapeTest"),
    };
}
/**
 * Converts only the explicitly scoped FXM Images. This keeps the seven popup
 * Gridient tracks and the popup/node glitch tracks independent from unrelated
 * Images that happened to be active in the same prefab capture.
 */
export function storyOmenGraphicDraws(graphics: readonly StoryOmenGraphicProbeFrame[], includedPaths: readonly string[], texturePaths: Readonly<Record<string, string>>, selectedWorldToLocal: readonly number[], width = 1920, height = 1080): StoryOmenGraphicDraws {
    const wanted = new Set(includedPaths);
    if (wanted.size !== includedPaths.length)
        throw new Error("Duplicate Omen FXM Image path");
    const selected = graphics.filter((graphic) => wanted.has(graphic.path));
    const found = new Set(selected.map((graphic) => graphic.path));
    for (const path of includedPaths)
        if (!found.has(path))
            throw new Error(`Missing captured Omen FXM Image: ${path}`);
    const meshes: SwordTrainingPmaMesh[] = [], glitches: StoryOmenGlitchDraw[] = [];
    for (const graphic of selected) {
        if (!graphic.enabled || !graphic.activeInHierarchy || !graphic.mesh.positions.length)
            continue;
        const material = graphic.material;
        if (!material)
            throw new Error(`Missing captured Omen FXM material: ${graphic.path}`);
        if (material.shader === "StudioBside/Custom/StudioBside-Custom-GlitchUI") {
            const glitch = storyOmenGlitchDraw(graphic, texturePaths, selectedWorldToLocal, width, height);
            if (glitch)
                glitches.push(glitch);
            continue;
        }
        const texture = texturePaths[graphic.mainTexture];
        if (!texture)
            throw new Error(`Unresolved captured Omen Image texture: ${graphic.path}/${graphic.mainTexture}`);
        const mesh = graphic.mesh;
        if (mesh.uv0.length !== mesh.positions.length || mesh.colors.length !== mesh.positions.length)
            throw new Error(`Unexpected captured Omen Image streams: ${graphic.path}`);
        const color = mesh.colors[0];
        for (const current of mesh.colors)
            if (current.r !== color.r || current.g !== color.g || current.b !== color.b || current.a !== color.a)
                throw new Error(`Omen Image uses an unsupported per-vertex color gradient: ${graphic.path}`);
        const output: SwordTrainingPmaMesh = {
            id: graphic.path,
            texture,
            positions: meshToCanvas(mesh, graphicMatrix(graphic, selectedWorldToLocal), width, height),
            uvs: mesh.uv0.flatMap((uv) => [uv.x, 1 - uv.y]),
            indices: mesh.triangles,
            color: checkedColor(color, graphic.path),
        };
        if (material.shader === "UI/Particles/Additive") {
            const tint = materialProperty(material, "_TintColor").vector;
            if (tint.x !== 1 || tint.y !== 1 || tint.z !== 1 || tint.w !== 1)
                throw new Error(`Unsupported Omen additive Image tint: ${graphic.path}`);
            output.sourceAlphaAdditive = true;
            output.sourceAlphaAdditiveMultiplier = 2;
        }
        else if (material.shader === "UI/Default")
            output.sourceStraightAlpha = true;
        else if (material.shader !== "NKC/NKC_FX_SPRITE_UI")
            throw new Error(`Unsupported Omen Image shader: ${graphic.path}/${material.shader}`);
        meshes.push(output);
    }
    return { meshes, glitches };
}
