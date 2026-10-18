import type { SwordTrainingPmaMesh } from "@/components/minigames/sword-training/SwordTrainingPmaMeshes";
import { sampleCafeFxmColorV2 } from "./cafeStregaFxmColorV2.ts";
import { CafeStregaFxmTransformV2 } from "./cafeStregaFxmTransformV2.ts";
import { swordTrainingColor32 } from "./swordTrainingClientPma.ts";
import { sampleSwordTrainingClientButtonTracking } from "./swordTrainingClientDecoration.ts";
import { storyOmenGraphicDraws, storyOmenNativeTmpDraws, type StoryOmenContinuousSceneSource, type StoryOmenGraphicProbeFrame, type StoryOmenNativeInteractionFrame, type StoryOmenSceneDrawCommand, type StoryOmenSceneTexture, type StoryOmenTmpDraw, } from "./storyOmenNativeRuntime.ts";
import { buildStoryOmenPopupParticleRuntime } from "./storyOmenPopupParticleScene.ts";
import { STORY_OMEN_EPISODE_15_HIT_TARGET, STORY_OMEN_POPUP_INTERACTIVE_TARGETS, STORY_OMEN_POPUP_REFERENCE, STORY_OMEN_POPUP_ROOT, STORY_OMEN_POPUP_SLOT_HIT_TARGETS, } from "./storyOmenSceneGeometry.ts";
type JsonObject = Record<string, unknown>;
const WIDTH = STORY_OMEN_POPUP_REFERENCE.width;
const HEIGHT = STORY_OMEN_POPUP_REFERENCE.height;
const ORIGIN = [WIDTH / 2, HEIGHT / 2] as const;
const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] as const;
const TMP_ATLAS_TEXTURE = "/story/map-ui/omen-native/tmp-popup-atlas.png";
const GLITCH_NOISE_TEXTURE = "/story/map-ui/omen-native/NOISE_DISSOLVE_00.png";
const SLOT_NAMES = Object.keys(STORY_OMEN_POPUP_SLOT_HIT_TARGETS);
type PopupImage = {
    traversalIndex: number;
    path: string;
    sourceSprite: string;
    sourceTexture: string;
    sourceTextureSize: readonly [
        number,
        number
    ];
    graphic: StoryOmenGraphicProbeFrame;
};
type PopupStaticScene = {
    images: readonly PopupImage[];
    texts: ReadonlyMap<string, readonly StoryOmenTmpDraw[]>;
    texturePaths: Readonly<Record<string, string>>;
    preloadTextures: readonly StoryOmenSceneTexture[];
};
type PopupComponentDescriptor = {
    nodePath: string;
    componentType: string;
    componentPathId: number;
    fields: JsonObject;
    targetConnections: readonly JsonObject[];
};
type PopupNormalBranch = {
    slotName: string;
    player: PopupComponentDescriptor;
    rotates: readonly PopupComponentDescriptor[];
    gradient: PopupComponentDescriptor;
};
type PopupGlitchBranch = {
    slotName: string;
    player: PopupComponentDescriptor;
    image: PopupComponentDescriptor;
};
type PopupPackedCurveKey = {
    time: number;
    value: number;
    coefficients: readonly [
        number,
        number,
        number
    ];
};
type PopupPackedCurve = {
    curveIndex: number;
    property: string;
    preInfinityValue: number;
    keys: readonly PopupPackedCurveKey[];
};
type PopupContentsAnimator = {
    mapAngle: PopupPackedCurve;
    mapAlpha: PopupPackedCurve;
    buttonAlpha: PopupPackedCurve;
    episode15Alpha: PopupPackedCurve;
    idleMapAngle: number;
    idleMapAlpha: number;
    idleButtonAlpha: number;
    idleEpisode15Alpha: number;
    transitionExitTime: number;
    transitionDuration: number;
};
type PopupFxmScene = {
    normalBranches: readonly PopupNormalBranch[];
    glitchBranches: readonly PopupGlitchBranch[];
    animator: PopupContentsAnimator;
    mapPivotY: number;
};
function object(value: unknown, label: string): JsonObject {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error(`Missing ${label}`);
    }
    return value as JsonObject;
}
function array(value: unknown, label: string): unknown[] {
    if (!Array.isArray(value)) {
        throw new Error(`Missing ${label}`);
    }
    return value;
}
function text(value: unknown, label: string): string {
    if (typeof value !== "string" || !value) {
        throw new Error(`Missing ${label}`);
    }
    return value;
}
function numeric(value: unknown, label: string): number {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new Error(`Invalid ${label}`);
    }
    return value;
}
function expect(actual: unknown, expected: unknown, label: string): void {
    if (actual !== expected) {
        throw new Error(`Client ${label} changed: ${String(actual)}`);
    }
}
function matrix(value: unknown, label: string): number[] {
    const output = array(value, label).map((entry) => numeric(entry, label));
    if (output.length !== 16) {
        throw new Error(`Invalid ${label}`);
    }
    return output;
}
function parseComponentDescriptor(value: unknown, expectedType: string, expectedPath: string): PopupComponentDescriptor {
    const descriptor = object(value, `${expectedPath} ${expectedType}`);
    expect(descriptor.nodePath, expectedPath, `${expectedType} node path`);
    numeric(descriptor.nodePathId, `${expectedPath} node path ID`);
    object(descriptor.transform, `${expectedPath} source transform`);
    const component = object(descriptor.component, `${expectedPath} source component`);
    expect(component.type, expectedType, `${expectedPath} component type`);
    const componentPathId = numeric(component.pathId, `${expectedPath} component path ID`);
    const fields = object(component.serialized, `${expectedPath} serialized fields`);
    return {
        nodePath: expectedPath,
        componentType: expectedType,
        componentPathId,
        fields,
        targetConnections: array(descriptor.targetConnections, `${expectedPath} target connections`).map((entry) => object(entry, `${expectedPath} target connection`)),
    };
}
function validatePlayer(descriptor: PopupComponentDescriptor, durationSeconds: number): void {
    const fields = descriptor.fields;
    const expected: Readonly<Record<string, unknown>> = {
        m_Enabled: 1,
        m_Name: "",
        Duration: durationSeconds,
        TimeScale: 1,
        AutoStart: 1,
        AutoDisable: 0,
        Loop: 1,
        SingleGO: 0,
        TimeMode: 0,
        RandomMode: 0,
        SimulationSpace: 1,
    };
    for (const [name, value] of Object.entries(expected)) {
        expect(fields[name], value, `${descriptor.nodePath}.${name}`);
    }
    if (descriptor.targetConnections.length) {
        throw new Error(`Unexpected popup PLAYER target: ${descriptor.nodePath}`);
    }
}
function validateTarget(descriptor: PopupComponentDescriptor, resolvedComponentType: "Image" | null): void {
    if (descriptor.targetConnections.length !== 1) {
        throw new Error(`Unexpected popup target count: ${descriptor.nodePath}`);
    }
    const connection = descriptor.targetConnections[0];
    expect(connection.field, "Target", `${descriptor.nodePath} target field`);
    expect(connection.fileId, 0, `${descriptor.nodePath} target file ID`);
    const target = object(descriptor.fields.Target, `${descriptor.nodePath} serialized Target`);
    expect(target.m_FileID, 0, `${descriptor.nodePath} serialized target file ID`);
    expect(numeric(target.m_PathID, `${descriptor.nodePath} serialized target path ID`), numeric(connection.pathId, `${descriptor.nodePath} resolved target path ID`), `${descriptor.nodePath} target path ID`);
    if (resolvedComponentType === null) {
        expect(connection.resolvedNodePath, null, `${descriptor.nodePath} unresolved Transform target path`);
        expect(connection.resolvedComponentType, null, `${descriptor.nodePath} unresolved Transform target type`);
    }
    else {
        expect(connection.resolvedNodePath, descriptor.nodePath, `${descriptor.nodePath} resolved target path`);
        expect(connection.resolvedComponentType, resolvedComponentType, `${descriptor.nodePath} resolved target type`);
    }
}
function clientComponent(descriptor: PopupComponentDescriptor) {
    return {
        type: descriptor.componentType,
        pathId: String(descriptor.componentPathId),
        fields: descriptor.fields,
        references: descriptor.targetConnections.map((connection) => ({
            field: String(connection.field),
            pathId: String(connection.pathId),
            resolved: connection.resolvedNodePath !== null,
            type: typeof connection.resolvedComponentType === "string"
                ? connection.resolvedComponentType
                : undefined,
            nodePath: typeof connection.resolvedNodePath === "string"
                ? connection.resolvedNodePath
                : descriptor.nodePath,
        })),
    };
}
function originalTextureSize(textureName: string, spriteSource: JsonObject): readonly [
    number,
    number
] {
    const atlas = /-([0-9]+)x([0-9]+)-/u.exec(textureName);
    if (atlas) {
        return [Number(atlas[1]), Number(atlas[2])];
    }
    const rect = object(spriteSource.rect, `${textureName} sprite rect`);
    const width = numeric(rect.width, `${textureName} sprite rect width`);
    const height = numeric(rect.height, `${textureName} sprite rect height`);
    if (!(width > 0 && height > 0)) {
        throw new Error(`Invalid original Omen texture size: ${textureName}`);
    }
    return [width, height];
}
/**
 * Native Graphic meshes address their original Texture2D or SpriteAtlas. The
 * public files are exact tight Sprite crops, so retain the native mesh and
 * convert UVs by the client textureRect rather than fitting the mesh bounds.
 */
function remapTightSprite(value: unknown): PopupImage {
    const source = structuredClone(object(value, "popup native Image"));
    const path = text(source.path, "popup Image path");
    const traversalIndex = numeric(source.traversalIndex, `${path} traversal index`);
    if (!Number.isInteger(traversalIndex) || traversalIndex < 0) {
        throw new Error(`Invalid popup Image traversal index: ${path}`);
    }
    const mainTexture = text(source.mainTexture, `${path} main texture`);
    const sourceSprite = text(source.sprite, `${path} Sprite name`);
    const spriteAsset = object(source.spriteAsset, `${path} Sprite asset`);
    const publicPath = text(spriteAsset.publicPath, `${path} Sprite public path`);
    const decodedWidth = numeric(spriteAsset.decodedWidth, `${path} decoded width`);
    const decodedHeight = numeric(spriteAsset.decodedHeight, `${path} decoded height`);
    if (!(decodedWidth > 0 && decodedHeight > 0)) {
        throw new Error(`Invalid tight Sprite dimensions: ${path}`);
    }
    const spriteSource = object(source.spriteSource, `${path} Sprite source`);
    expect(spriteSource.texture, mainTexture, `${path} Sprite texture`);
    const textureRect = object(spriteSource.textureRect, `${path} Sprite textureRect`);
    const textureRectX = numeric(textureRect.x, `${path} textureRect X`);
    const textureRectY = numeric(textureRect.y, `${path} textureRect Y`);
    const [textureWidth, textureHeight] = originalTextureSize(mainTexture, spriteSource);
    const mesh = object(source.mesh, `${path} native mesh`);
    mesh.uv0 = array(mesh.uv0, `${path} native UV0`).map((entry) => {
        const uv = object(entry, `${path} native UV0 value`);
        return {
            ...uv,
            x: (numeric(uv.x, `${path} native U`) * textureWidth - textureRectX) /
                decodedWidth,
            y: (numeric(uv.y, `${path} native V`) * textureHeight - textureRectY) /
                decodedHeight,
        };
    });
    source.mainTexture = publicPath;
    // The image probe also records localToSelected relative to UI_PTC because
    // that was the particle capture root. Popup Images belong to the full stage;
    // retaining that matrix would shift every client Graphic by +247 Unity Y.
    delete source.localToSelected;
    return {
        traversalIndex,
        path,
        sourceSprite,
        sourceTexture: mainTexture,
        sourceTextureSize: [textureWidth, textureHeight],
        graphic: source as unknown as StoryOmenGraphicProbeFrame,
    };
}
function samplerMode(value: unknown, label: string): "repeat" | "clamp" {
    if (value === "Repeat")
        return "repeat";
    if (value === "Clamp")
        return "clamp";
    throw new Error(`Unsupported ${label}: ${String(value)}`);
}
function parsePopupImageSamplers(popupImages: JsonObject, images: readonly PopupImage[]): StoryOmenSceneTexture[] {
    const source = object(popupImages.sourceTextureSamplers, "popup source texture samplers");
    expect(source.captureId, "omen-popup-image-samplers-native-001", "popup sampler capture ID");
    expect(source.frame, 0, "popup sampler frame");
    expect(source.activeImageCount, 61, "popup sampler active Image count");
    expect(source.uniqueTextureCount, 15, "popup sampler unique texture count");
    text(source.rawTraceSha256, "popup sampler trace SHA-256");
    text(source.mappingContract, "popup sampler mapping contract");
    const forced = object(source.forcedVisualState, "popup sampler forced visual state");
    expect(forced.accountStateClaim, false, "popup forced visual account-state claim");
    const inactive = array(forced.forceInactivePaths, "popup forced inactive paths");
    const active = array(forced.forceActivePaths, "popup forced active paths");
    if (inactive.length !== SLOT_NAMES.length ||
        active.length !== SLOT_NAMES.length + 2) {
        throw new Error("Popup forced-normal scope changed");
    }
    const records = array(source.byImagePath, "popup sampler Image records");
    if (records.length !== images.length) {
        throw new Error(`Unexpected popup sampler mapping count: ${records.length}`);
    }
    const byPath = new Map<string, JsonObject>();
    for (const value of records) {
        const record = object(value, "popup sampler Image record");
        const path = text(record.imagePath, "popup sampler Image path");
        if (byPath.has(path))
            throw new Error(`Duplicate popup sampler Image: ${path}`);
        byPath.set(path, record);
    }
    const sourceSignatures = new Map<string, string>();
    const output = new Map<string, StoryOmenSceneTexture>();
    for (const image of images) {
        const record = byPath.get(image.path);
        if (!record)
            throw new Error(`Missing popup sampler Image: ${image.path}`);
        expect(record.sprite, image.sourceSprite, `${image.path} sampler Sprite`);
        expect(record.mainTexture, image.sourceTexture, `${image.path} sampler texture`);
        const sampler = object(record.sampler, `${image.path} source sampler`);
        expect(sampler.name, image.sourceTexture, `${image.path} sampler name`);
        expect(sampler.dimension, "Tex2D", `${image.path} sampler dimension`);
        expect(sampler.filterMode, "Bilinear", `${image.path} sampler filter`);
        expect(sampler.width, image.sourceTextureSize[0], `${image.path} sampler width`);
        expect(sampler.height, image.sourceTextureSize[1], `${image.path} sampler height`);
        expect(sampler.mipmapCount, 1, `${image.path} sampler mip count`);
        const texture: StoryOmenSceneTexture = {
            path: image.graphic.mainTexture,
            filter: "linear",
            wrapU: samplerMode(sampler.wrapModeU, `${image.path} wrap U`),
            wrapV: samplerMode(sampler.wrapModeV, `${image.path} wrap V`),
        };
        const signature = JSON.stringify([
            sampler.dimension,
            sampler.filterMode,
            sampler.wrapModeU,
            sampler.wrapModeV,
            sampler.width,
            sampler.height,
            sampler.mipmapCount,
        ]);
        const priorSource = sourceSignatures.get(image.sourceTexture);
        if (priorSource !== undefined && priorSource !== signature) {
            throw new Error(`Conflicting client sampler for ${image.sourceTexture}`);
        }
        sourceSignatures.set(image.sourceTexture, signature);
        const priorPublic = output.get(texture.path);
        if (priorPublic &&
            (priorPublic.filter !== texture.filter ||
                priorPublic.wrapU !== texture.wrapU ||
                priorPublic.wrapV !== texture.wrapV)) {
            throw new Error(`Conflicting tight-crop sampler for ${texture.path}`);
        }
        output.set(texture.path, texture);
    }
    if (byPath.size !== images.length || sourceSignatures.size !== 15) {
        throw new Error("Popup sampler Image/source coverage changed");
    }
    const unique = array(source.uniqueTextures, "popup unique source samplers");
    if (unique.length !== sourceSignatures.size) {
        throw new Error(`Unexpected popup unique sampler count: ${unique.length}`);
    }
    const uniqueNames = new Set<string>();
    for (const value of unique) {
        const sampler = object(value, "popup unique source sampler");
        const name = text(sampler.name, "popup unique source sampler name");
        if (uniqueNames.has(name))
            throw new Error(`Duplicate popup unique sampler: ${name}`);
        uniqueNames.add(name);
        const signature = JSON.stringify([
            sampler.dimension,
            sampler.filterMode,
            sampler.wrapModeU,
            sampler.wrapModeV,
            sampler.width,
            sampler.height,
            sampler.mipmapCount,
        ]);
        if (sourceSignatures.get(name) !== signature) {
            throw new Error(`Popup unique sampler diverged: ${name}`);
        }
    }
    return [...output.values()];
}
function parsePopupNoiseSampler(runtime: JsonObject, images: readonly PopupImage[]): StoryOmenSceneTexture {
    const popupFxm = object(runtime.popupFxm, "popup FXM evidence");
    const source = object(popupFxm.source, "popup FXM source");
    const materialSamplers = array(source.materialTextureSamplers, "popup FXM material texture samplers").map((value) => object(value, "popup FXM material texture sampler"));
    if (materialSamplers.length !== 2) {
        throw new Error(`Unexpected popup FXM material sampler count: ${materialSamplers.length}`);
    }
    const grabPaths = images
        .filter((candidate) => candidate.path.endsWith("/GRAB_GLITCH_UI"))
        .map((image) => image.path);
    if (grabPaths.length !== SLOT_NAMES.length) {
        throw new Error(`Unexpected popup GrabPass Image count: ${grabPaths.length}`);
    }
    const sourceSampler = (propertyName: "_MainTex" | "_NoiseTex", expectedName: string, expectedPath: string, expectedWrap: "Clamp" | "Repeat", expectedSize: number): JsonObject => {
        const matches = materialSamplers.filter((entry) => entry.materialProperty === propertyName);
        if (matches.length !== 1)
            throw new Error(`Missing popup ${propertyName} source sampler`);
        const entry = matches[0];
        expect(entry.publicPath, expectedPath, `popup ${propertyName} public path`);
        const sampler = object(entry.nativeRuntimeSampler, `popup ${propertyName} runtime sampler`);
        expect(sampler.name, expectedName, `popup ${propertyName} sampler name`);
        expect(sampler.dimension, "Tex2D", `popup ${propertyName} sampler dimension`);
        expect(sampler.filterMode, "Bilinear", `popup ${propertyName} sampler filter`);
        expect(sampler.wrapModeU, expectedWrap, `popup ${propertyName} sampler wrap U`);
        expect(sampler.wrapModeV, expectedWrap, `popup ${propertyName} sampler wrap V`);
        expect(sampler.width, expectedSize, `popup ${propertyName} sampler width`);
        expect(sampler.height, expectedSize, `popup ${propertyName} sampler height`);
        expect(sampler.mipmapCount, 1, `popup ${propertyName} sampler mip count`);
        const serialized = object(entry.sourceSerialized, `popup ${propertyName} serialized texture`);
        expect(serialized.name, expectedName, `popup ${propertyName} serialized name`);
        expect(serialized.width, expectedSize, `popup ${propertyName} serialized width`);
        expect(serialized.height, expectedSize, `popup ${propertyName} serialized height`);
        expect(serialized.mipCount, 1, `popup ${propertyName} serialized mip count`);
        const settings = object(serialized.textureSettings, `popup ${propertyName} texture settings`);
        expect(settings.m_FilterMode, 1, `popup ${propertyName} serialized Bilinear mode`);
        const wrap = expectedWrap === "Repeat" ? 0 : 1;
        expect(settings.m_WrapU, wrap, `popup ${propertyName} serialized wrap U`);
        expect(settings.m_WrapV, wrap, `popup ${propertyName} serialized wrap V`);
        const activePaths = array(entry.activeGraphicPaths, `popup ${propertyName} active Graphic paths`)
            .map((value) => text(value, `popup ${propertyName} active Graphic path`));
        if (activePaths.length !== grabPaths.length ||
            activePaths.some((path, index) => path !== grabPaths[index])) {
            throw new Error(`Popup ${propertyName} active Graphic scope changed`);
        }
        return sampler;
    };
    // The shared material's serialized _MainTex is not the rendered mask:
    // CanvasRenderer binds each Graphic.mainTexture (the tight CMN_GLOW_01 crop).
    // Keep this source-backed counterexample so MASK_CIRCLE_00 cannot leak in.
    sourceSampler("_MainTex", "MASK_CIRCLE_00", "/story/map-ui/omen-native/MASK_CIRCLE_00.png", "Clamp", 256);
    sourceSampler("_NoiseTex", "NOISE_DISSOLVE_00", GLITCH_NOISE_TEXTURE, "Repeat", 512);
    let signature: string | undefined;
    for (const image of images.filter((candidate) => grabPaths.includes(candidate.path))) {
        const material = object(image.graphic.material, `${image.path} glitch material`);
        expect(material.shader, "StudioBside/Custom/StudioBside-Custom-GlitchUI", `${image.path} glitch shader`);
        const properties = array(material.properties, `${image.path} material properties`)
            .map((value) => object(value, `${image.path} material property`));
        const matches = properties.filter((property) => property.name === "_NoiseTex");
        if (matches.length !== 1)
            throw new Error(`Missing popup glitch noise sampler: ${image.path}`);
        const texture = object(matches[0].texture, `${image.path} glitch noise texture`);
        expect(texture.name, "NOISE_DISSOLVE_00", `${image.path} glitch noise name`);
        expect(texture.dimension, "Tex2D", `${image.path} glitch noise dimension`);
        expect(texture.filterMode, "Bilinear", `${image.path} glitch noise filter`);
        expect(texture.wrapModeU, "Repeat", `${image.path} glitch noise wrap U`);
        expect(texture.wrapModeV, "Repeat", `${image.path} glitch noise wrap V`);
        expect(texture.width, 512, `${image.path} glitch noise width`);
        expect(texture.height, 512, `${image.path} glitch noise height`);
        expect(texture.mipmapCount, 1, `${image.path} glitch noise mip count`);
        const current = JSON.stringify(texture);
        if (signature !== undefined && current !== signature) {
            throw new Error("Popup glitch noise samplers diverged");
        }
        signature = current;
    }
    if (!signature)
        throw new Error("Missing popup glitch noise sampler evidence");
    return {
        path: GLITCH_NOISE_TEXTURE,
        filter: "linear",
        wrapU: "repeat",
        wrapV: "repeat",
    };
}
function parsePopupTmpSampler(captures: readonly unknown[]): StoryOmenSceneTexture {
    let nativeAtlasSha256: string | undefined;
    let found = 0;
    for (const value of captures) {
        const capture = object(value, "popup native TMP capture");
        const captureSha = text(capture.nativeAtlasSha256, "popup native TMP atlas SHA-256");
        for (const fontValue of array(capture.fonts, "popup native TMP fonts")) {
            const font = object(fontValue, "popup native TMP font");
            for (const atlasValue of array(font.atlases, "popup native TMP atlases")) {
                const atlas = object(atlasValue, "popup native TMP atlas");
                if (atlas.publicPath !== TMP_ATLAS_TEXTURE)
                    continue;
                expect(atlas.name, "TmpFont Atlas", "popup TMP atlas name");
                expect(atlas.nativeType, "UnityEngine.Texture2D", "popup TMP atlas type");
                expect(atlas.format, "Alpha8", "popup TMP atlas format");
                const atlasSha = text(atlas.sha256, "popup TMP atlas SHA-256");
                expect(atlasSha.toUpperCase(), captureSha.toUpperCase(), "popup TMP atlas capture SHA-256");
                expect(atlas.width, 1024, "popup TMP atlas width");
                expect(atlas.height, 1024, "popup TMP atlas height");
                const sampler = object(atlas.nativeRuntimeSampler, "popup TMP native runtime sampler");
                expect(sampler.name, "TmpFont Atlas", "popup TMP sampler name");
                expect(sampler.dimension, "Tex2D", "popup TMP sampler dimension");
                expect(sampler.filterMode, "Bilinear", "popup TMP sampler filter");
                expect(sampler.wrapModeU, "Repeat", "popup TMP sampler wrap U");
                expect(sampler.wrapModeV, "Repeat", "popup TMP sampler wrap V");
                expect(sampler.width, 1024, "popup TMP sampler width");
                expect(sampler.height, 1024, "popup TMP sampler height");
                const serialized = object(atlas.sourceSerialized, "popup TMP serialized atlas");
                expect(serialized.name, "TmpFont Atlas", "popup TMP serialized atlas name");
                const settings = object(serialized.textureSettings, "popup TMP atlas texture settings");
                expect(settings.m_FilterMode, 1, "popup TMP atlas serialized Bilinear mode");
                expect(settings.m_WrapU, 0, "popup TMP atlas serialized wrap U");
                expect(settings.m_WrapV, 0, "popup TMP atlas serialized wrap V");
                if (nativeAtlasSha256 !== undefined && nativeAtlasSha256 !== captureSha) {
                    throw new Error("Popup TMP atlas hashes diverged");
                }
                nativeAtlasSha256 = captureSha;
                found += 1;
            }
        }
    }
    if (found < 7 || !nativeAtlasSha256) {
        throw new Error(`Incomplete popup TMP atlas sampler coverage: ${found}`);
    }
    return {
        path: TMP_ATLAS_TEXTURE,
        filter: "linear",
        wrapU: "repeat",
        wrapV: "repeat",
    };
}
function buildPopupStaticScene(runtime: JsonObject): PopupStaticScene {
    const popupImages = object(runtime.popupImages, "popup Image evidence");
    expect(popupImages.surface, "popup-full-prefab", "popup Image capture surface");
    expect(popupImages.activeImageCount, 61, "popup active Image count");
    expect(popupImages.inactiveRectMaskCounterexampleCount, 24, "popup locked-only RectMask count");
    const frames = array(popupImages.frames, "popup Image frames").map((entry) => object(entry, "popup Image frame"));
    const first = frames.find((frame) => frame.frame === 0);
    if (!first) {
        throw new Error("Missing popup native frame zero");
    }
    const images = array(first.activeImages, "popup active Images")
        .map(remapTightSprite)
        .sort((left, right) => left.traversalIndex - right.traversalIndex);
    if (images.length !== 61) {
        throw new Error(`Unexpected popup normal Image count: ${images.length}`);
    }
    const indices = new Set(images.map((image) => image.traversalIndex));
    if (indices.size !== images.length) {
        throw new Error("Duplicate popup Image traversal index");
    }
    if (images.some((image) => image.path.includes("/Locked/") ||
        image.path.includes("/Denied/") ||
        image.path.includes("/Complete/"))) {
        throw new Error("A non-Normal account-state Image escaped into Omen popup");
    }
    const texturePaths: Record<string, string> = {
        [GLITCH_NOISE_TEXTURE]: GLITCH_NOISE_TEXTURE,
        NOISE_DISSOLVE_00: GLITCH_NOISE_TEXTURE,
    };
    for (const image of images) {
        const path = image.graphic.mainTexture;
        texturePaths[path] = path;
    }
    const nativeText = object(runtime.nativeText, "popup native text");
    const captures = array(nativeText.popup, "popup native TMP captures");
    const texts = new Map<string, readonly StoryOmenTmpDraw[]>();
    for (const value of captures) {
        const capture = object(value, "popup native TMP capture");
        const id = text(capture.id, "popup native TMP id");
        const sourcePath = text(capture.sourcePath, `${id} source path`);
        const isArea = /^popup-[0-9]{2}-area$/u.test(id);
        const isEpisode15 = id === "popup-ep15";
        if (!isArea && !isEpisode15) {
            if (!/^popup-[0-9]{2}-denied$/u.test(id)) {
                throw new Error(`Unexpected popup TMP capture: ${id}`);
            }
            continue;
        }
        if (texts.has(sourcePath)) {
            throw new Error(`Duplicate popup TMP source path: ${sourcePath}`);
        }
        texts.set(sourcePath, storyOmenNativeTmpDraws(capture, {
            atlasTexture: TMP_ATLAS_TEXTURE,
            localToSurface: matrix(capture.localToStage, `${sourcePath} localToStage`),
            surfaceOrigin: ORIGIN,
        }));
    }
    if (texts.size !== 7) {
        throw new Error(`Unexpected popup Normal TMP count: ${texts.size}`);
    }
    return {
        images,
        texts,
        texturePaths,
        preloadTextures: mergePreloadTextures([
            ...parsePopupImageSamplers(popupImages, images),
            parsePopupTmpSampler(captures),
            parsePopupNoiseSampler(runtime, images),
        ]),
    };
}
function cloneMesh(mesh: SwordTrainingPmaMesh): SwordTrainingPmaMesh {
    return {
        ...mesh,
        positions: [...mesh.positions],
        uvs: [...mesh.uvs],
        indices: [...mesh.indices],
    };
}
function scalePositions(positions: readonly number[], scale: number, pivot: readonly [
    number,
    number
]): number[] {
    if (scale === 1) {
        return [...positions];
    }
    const output = new Array<number>(positions.length);
    for (let index = 0; index < positions.length; index += 2) {
        output[index] = pivot[0] + (positions[index] - pivot[0]) * scale;
        output[index + 1] =
            pivot[1] + (positions[index + 1] - pivot[1]) * scale;
    }
    return output;
}
function scaleCommand(command: StoryOmenSceneDrawCommand, scale: number, pivot: readonly [
    number,
    number
]): StoryOmenSceneDrawCommand {
    if (scale === 1) {
        return command;
    }
    if (command.kind === "mesh") {
        return {
            ...command,
            mesh: {
                ...cloneMesh(command.mesh),
                positions: scalePositions(command.mesh.positions, scale, pivot),
            },
        };
    }
    if (command.kind === "tmp") {
        return {
            ...command,
            draw: {
                ...command.draw,
                positions: scalePositions(command.draw.positions, scale, pivot),
            },
        };
    }
    return {
        ...command,
        draw: {
            ...command.draw,
            positions: scalePositions(command.draw.positions, scale, pivot),
        },
    };
}
function colorCommand(command: StoryOmenSceneDrawCommand, color: readonly [
    number,
    number,
    number,
    number
]): StoryOmenSceneDrawCommand {
    const quantized = swordTrainingColor32(color) as [
        number,
        number,
        number,
        number
    ];
    if (command.kind === "mesh") {
        return { ...command, mesh: { ...cloneMesh(command.mesh), color: quantized } };
    }
    if (command.kind === "grab-glitch") {
        const colors: number[] = [];
        for (let index = 0; index < command.draw.colors.length; index += 4) {
            colors.push(...quantized);
        }
        return { ...command, draw: { ...command.draw, colors } };
    }
    throw new Error(`Popup FXM color targeted native TMP: ${command.sourcePath}`);
}
const UNITY_FIXED_DELTA = Math.fround(1 / 60);
const playerPlaybackCaches = new Map<number, number[]>([
    [1, [0]],
    [4, [0]],
]);
function playerPlayback(frameIndex: number, durationSeconds: number): number {
    if (!Number.isInteger(frameIndex) || frameIndex < 0) {
        throw new RangeError("Invalid popup PLAYER frame");
    }
    if (!(durationSeconds > 0))
        throw new RangeError("Invalid popup PLAYER duration");
    let cache = playerPlaybackCaches.get(durationSeconds);
    if (!cache) {
        cache = [0];
        playerPlaybackCaches.set(durationSeconds, cache);
    }
    while (cache.length <= frameIndex) {
        let next = Math.fround(cache[cache.length - 1] + UNITY_FIXED_DELTA);
        if (next >= durationSeconds) {
            // FXM_PLAYER retains the single-step overshoot rather than snapping the
            // reset frame to zero (1 s: frame 60 -> .9999997, 61 -> .0166664).
            next = Math.fround(next - durationSeconds);
        }
        cache.push(next);
    }
    return cache[frameIndex];
}
function imageColorAt(descriptor: PopupComponentDescriptor, playerTime: number): readonly [
    number,
    number,
    number,
    number
] {
    const fields = descriptor.fields;
    const start = numeric(fields.StartTime, `${descriptor.nodePath}.StartTime`);
    const duration = numeric(fields.Duration, `${descriptor.nodePath}.Duration`);
    expect(fields.m_Enabled, 1, `${descriptor.nodePath}.m_Enabled`);
    expect(fields.RandomValue, 0, `${descriptor.nodePath}.RandomValue`);
    expect(fields.Resimulate, 0, `${descriptor.nodePath}.Resimulate`);
    expect(fields.ResetMode, 0, `${descriptor.nodePath}.ResetMode`);
    expect(fields.UseMultiTargets, 0, `${descriptor.nodePath}.UseMultiTargets`);
    expect(fields.UseSheetAnimation, 0, `${descriptor.nodePath}.UseSheetAnimation`);
    if (playerTime <= start || playerTime - start >= duration)
        return [0, 0, 0, 0];
    return sampleCafeFxmColorV2(clientComponent(descriptor), Math.fround(playerTime - start));
}
type RotationCache = {
    evaluator: CafeStregaFxmTransformV2;
    angles: number[];
    playerTime: number;
};
const rotationCaches = new Map<PopupComponentDescriptor, RotationCache>();
function rotateAngleAt(descriptor: PopupComponentDescriptor, frameIndex: number, durationSeconds: number): number {
    const fields = descriptor.fields;
    expect(fields.m_Enabled, 1, `${descriptor.nodePath}.m_Enabled`);
    expect(fields.StartTime, 0, `${descriptor.nodePath}.StartTime`);
    expect(fields.Duration, 4, `${descriptor.nodePath}.Duration`);
    expect(fields.RandomValue, 0, `${descriptor.nodePath}.RandomValue`);
    expect(fields.Resimulate, 0, `${descriptor.nodePath}.Resimulate`);
    expect(fields.ResetMode, 0, `${descriptor.nodePath}.ResetMode`);
    expect(fields.UseMultiTargets, 0, `${descriptor.nodePath}.UseMultiTargets`);
    expect(fields.UseMultiRandom, 0, `${descriptor.nodePath}.UseMultiRandom`);
    expect(fields.SeparateAxes, 0, `${descriptor.nodePath}.SeparateAxes`);
    expect(fields.Dimension, 0, `${descriptor.nodePath}.Dimension`);
    expect(fields.Space, 1, `${descriptor.nodePath}.Space`);
    let cache = rotationCaches.get(descriptor);
    if (!cache) {
        const evaluator = new CafeStregaFxmTransformV2(clientComponent(descriptor), {
            localPosition: [0, 0, 0],
            localScale: [1, 1, 1],
            localRotationZ: 0,
        });
        cache = {
            evaluator,
            angles: [evaluator.reset().localRotationZ],
            playerTime: 0,
        };
        rotationCaches.set(descriptor, cache);
    }
    while (cache.angles.length <= frameIndex) {
        const nextFrame = cache.angles.length;
        const playback = playerPlayback(nextFrame, durationSeconds);
        if (playback < cache.playerTime)
            cache.evaluator.loop();
        cache.angles.push(cache.evaluator.step(playback, UNITY_FIXED_DELTA).localRotationZ);
        cache.playerTime = playback;
    }
    return cache.angles[frameIndex];
}
function wrappedAngleDistance(left: number, right: number): number {
    const delta = Math.abs(((left % 360) + 360) % 360 - ((right % 360) + 360) % 360);
    return Math.min(delta, 360 - delta);
}
function validatePopupContinuousFxm(popupFxm: JsonObject, fxm: PopupFxmScene): void {
    const evidence = object(popupFxm.continuousLoopEvidence, "popup continuous FXM evidence");
    expect(evidence.captureId, "omen-popup-fxm-continuous-full-native-001", "popup continuous FXM capture ID");
    expect(evidence.framesPerSecond, 60, "popup continuous FXM rate");
    expect(evidence.requestedFrames, 301, "popup continuous FXM requested frames");
    expect(evidence.uninterrupted, true, "popup continuous FXM uninterrupted flag");
    expect(evidence.rawTraceSha256, "FC8760FBCBDCBFC70C1AEFA66B5B276D966C688081E1D40BAFA868BDC4BD86EF", "popup continuous FXM trace SHA-256");
    text(evidence.evidenceBoundary, "popup continuous FXM evidence boundary");
    const forced = object(evidence.forcedVisualState, "popup continuous FXM forced visual state");
    expect(forced.accountStateClaim, false, "popup continuous FXM account-state claim");
    const forcedInactive = array(forced.forceInactivePaths, "popup continuous FXM forced inactive paths");
    const forcedActive = array(forced.forceActivePaths, "popup continuous FXM forced active paths");
    if (forcedInactive.length !== SLOT_NAMES.length ||
        forcedActive.length !== SLOT_NAMES.length + 2 ||
        forcedInactive.some((path, index) => path !== `Contents/BTN/${SLOT_NAMES[index]}/BTN/Locked`) ||
        forcedActive.some((path, index) => index < SLOT_NAMES.length
            ? path !== `Contents/BTN/${SLOT_NAMES[index]}/BTN/Normal`
            : path !== ["Contents/EP15", "Contents/EP15/Normal"][index - SLOT_NAMES.length])) {
        throw new Error("Popup continuous FXM forced-normal scope changed");
    }
    const counts = object(evidence.capturedComponentCounts, "popup continuous FXM component counts");
    const expectedCounts: Readonly<Record<string, number>> = {
        graphics: 27,
        evaluaters: 33,
        rotates: 14,
        uiImages: 13,
        players: 6,
        rotatingTransforms: 14,
    };
    for (const [name, value] of Object.entries(expectedCounts)) {
        expect(counts[name], value, `popup continuous FXM ${name} count`);
    }
    const boundaries = object(evidence.verifiedBoundaries, "popup continuous FXM verified boundaries");
    const expectedBoundaries: Readonly<Record<string, readonly number[]>> = {
        uiImagePointFourSecond: [22, 23, 24, 25, 26],
        glitchOneSecond: [58, 59, 60, 61, 62, 63],
        normalPlayerFourSecond: [238, 239, 240, 241, 242, 243],
    };
    for (const [name, expected] of Object.entries(expectedBoundaries)) {
        if (JSON.stringify(boundaries[name]) !== JSON.stringify(expected)) {
            throw new Error(`Popup continuous FXM ${name} boundary changed`);
        }
    }
    const embeddedIndices = array(evidence.embeddedFrameIndices, "popup continuous FXM embedded indices").map((value) => numeric(value, "popup continuous FXM embedded frame"));
    const frames = array(evidence.frames, "popup continuous FXM frames").map((value) => object(value, "popup continuous FXM frame"));
    if (frames.length !== embeddedIndices.length ||
        frames.some((frame, index) => frame.frame !== embeddedIndices[index])) {
        throw new Error("Popup continuous FXM embedded-frame coverage changed");
    }
    for (const frame of frames) {
        const frameIndex = numeric(frame.frame, "popup continuous FXM frame index");
        const graphics = array(frame.graphics, "popup continuous FXM Graphics").map((value) => object(value, "popup continuous FXM Graphic"));
        const evaluators = array(frame.evaluaters, "popup continuous FXM evaluators").map((value) => object(value, "popup continuous FXM evaluator"));
        const rotatingTransforms = array(frame.rotatingTransforms, "popup continuous FXM rotating transforms").map((value) => object(value, "popup continuous FXM rotating transform"));
        if (graphics.length !== expectedCounts.graphics ||
            evaluators.length !== expectedCounts.evaluaters ||
            rotatingTransforms.length !== expectedCounts.rotatingTransforms) {
            throw new Error(`Popup continuous FXM frame scope changed: ${frameIndex}`);
        }
        const evaluator = (path: string, type: string): JsonObject => {
            const matches = evaluators.filter((entry) => entry.path === path && entry.type === type);
            if (matches.length !== 1) {
                throw new Error(`Missing popup continuous ${type} evaluator at frame ${frameIndex}: ${path}`);
            }
            expect(matches[0].enabled, true, `${path} enabled at frame ${frameIndex}`);
            expect(matches[0].activeInHierarchy, true, `${path} active at frame ${frameIndex}`);
            return matches[0];
        };
        const graphic = (path: string): JsonObject => {
            const matches = graphics.filter((entry) => entry.path === path);
            if (matches.length !== 1) {
                throw new Error(`Missing popup continuous Graphic at frame ${frameIndex}: ${path}`);
            }
            return matches[0];
        };
        for (const branch of fxm.normalBranches) {
            const duration = numeric(branch.player.fields.Duration, `${branch.player.nodePath}.Duration`);
            const playback = playerPlayback(frameIndex, duration);
            const image = evaluator(branch.gradient.nodePath, "NKC.FX.NKC_FXM_UI_IMAGE");
            expect(image.playbackTime, playback, `${branch.gradient.nodePath} playback at frame ${frameIndex}`);
            const observedColor = object(graphic(branch.gradient.nodePath).color, `${branch.gradient.nodePath} color`);
            const expectedColor32 = swordTrainingColor32(imageColorAt(branch.gradient, playback));
            const observedColor32 = swordTrainingColor32([
                numeric(observedColor.r, `${branch.gradient.nodePath} red`),
                numeric(observedColor.g, `${branch.gradient.nodePath} green`),
                numeric(observedColor.b, `${branch.gradient.nodePath} blue`),
                numeric(observedColor.a, `${branch.gradient.nodePath} alpha`),
            ]);
            const observedRaw = [
                numeric(observedColor.r, `${branch.gradient.nodePath} red`),
                numeric(observedColor.g, `${branch.gradient.nodePath} green`),
                numeric(observedColor.b, `${branch.gradient.nodePath} blue`),
                numeric(observedColor.a, `${branch.gradient.nodePath} alpha`),
            ];
            const expectedRaw = imageColorAt(branch.gradient, playback);
            if (expectedRaw.some((value, index) => Math.abs(value - observedRaw[index]) > 0.00000025)) {
                throw new Error(`Popup continuous UI_IMAGE raw color mismatch at frame ${frameIndex}: ${branch.gradient.nodePath}`);
            }
            if (expectedColor32.some((value, index) => value !== observedColor32[index])) {
                throw new Error(`Popup continuous UI_IMAGE Color32 mismatch at frame ${frameIndex}: ${branch.gradient.nodePath}`);
            }
            for (const rotate of branch.rotates) {
                const rotateEvaluator = evaluator(rotate.nodePath, "NKC.FX.NKC_FXM_ROTATE");
                expect(rotateEvaluator.playbackTime, playback, `${rotate.nodePath} playback at frame ${frameIndex}`);
                const transformMatches = rotatingTransforms.filter((entry) => entry.path === rotate.nodePath);
                if (transformMatches.length !== 1) {
                    throw new Error(`Missing popup rotating transform at frame ${frameIndex}: ${rotate.nodePath}`);
                }
                const euler = object(transformMatches[0].localEulerAngles, `${rotate.nodePath} Euler`);
                const expectedAngle = rotateAngleAt(rotate, frameIndex, duration);
                const observedAngle = numeric(euler.z, `${rotate.nodePath} Euler Z at frame ${frameIndex}`);
                // Unity exposes the quaternion-derived Euler value while the evaluator
                // retains its float32 accumulator. This bound is only for validating
                // those two representations; rendered matrices use the source value.
                const eulerX = numeric(euler.x, `${rotate.nodePath} Euler X at frame ${frameIndex}`);
                const eulerY = numeric(euler.y, `${rotate.nodePath} Euler Y at frame ${frameIndex}`);
                const scale = object(transformMatches[0].localScale, `${rotate.nodePath} scale`);
                if (eulerX !== 0 ||
                    eulerY !== 0 ||
                    scale.x !== 1 ||
                    scale.y !== 1 ||
                    scale.z !== 1 ||
                    wrappedAngleDistance(expectedAngle, observedAngle) > 0.00015) {
                    throw new Error(`Popup continuous ROTATE mismatch at frame ${frameIndex}: ${rotate.nodePath}`);
                }
            }
        }
        for (const branch of fxm.glitchBranches) {
            const duration = numeric(branch.player.fields.Duration, `${branch.player.nodePath}.Duration`);
            const playback = playerPlayback(frameIndex, duration);
            const player = evaluator(branch.player.nodePath, "NKC.FX.NKC_FXM_PLAYER");
            const image = evaluator(branch.image.nodePath, "NKC.FX.NKC_FXM_UI_IMAGE");
            expect(player.playbackTime, playback, `${branch.player.nodePath} playback at frame ${frameIndex}`);
            expect(player.isStarted, false, `${branch.player.nodePath} started state`);
            expect(player.isCompleted, false, `${branch.player.nodePath} completed state`);
            const imageDuration = numeric(branch.image.fields.Duration, `${branch.image.nodePath}.Duration`);
            const imageRunning = frameIndex > 0 && playback < imageDuration;
            expect(image.playbackTime, imageRunning ? playback : 0, `${branch.image.nodePath} playback at frame ${frameIndex}`);
            expect(image.isStarted, frameIndex > 0, `${branch.image.nodePath} started state at frame ${frameIndex}`);
            expect(image.isCompleted, frameIndex > 0 && !imageRunning, `${branch.image.nodePath} completed state at frame ${frameIndex}`);
            const observedColor = object(graphic(branch.image.nodePath).color, `${branch.image.nodePath} color`);
            const expectedColor32 = swordTrainingColor32(imageColorAt(branch.image, playback));
            const observedColor32 = swordTrainingColor32([
                numeric(observedColor.r, `${branch.image.nodePath} red`),
                numeric(observedColor.g, `${branch.image.nodePath} green`),
                numeric(observedColor.b, `${branch.image.nodePath} blue`),
                numeric(observedColor.a, `${branch.image.nodePath} alpha`),
            ]);
            const expectedRaw = imageColorAt(branch.image, playback);
            const observedRaw = [
                numeric(observedColor.r, `${branch.image.nodePath} red`),
                numeric(observedColor.g, `${branch.image.nodePath} green`),
                numeric(observedColor.b, `${branch.image.nodePath} blue`),
                numeric(observedColor.a, `${branch.image.nodePath} alpha`),
            ];
            if (expectedRaw.some((value, index) => value !== observedRaw[index])) {
                throw new Error(`Popup continuous glitch raw color mismatch at frame ${frameIndex}: ${branch.image.nodePath}`);
            }
            if (expectedColor32.some((value, index) => value !== observedColor32[index])) {
                throw new Error(`Popup continuous glitch Color32 mismatch at frame ${frameIndex}: ${branch.image.nodePath}`);
            }
        }
    }
}
export function storyOmenPopupStateButtonScale(target: string, interaction: StoryOmenNativeInteractionFrame): number {
    const descriptor = target === STORY_OMEN_EPISODE_15_HIT_TARGET.path
        ? STORY_OMEN_EPISODE_15_HIT_TARGET
        : Object.values(STORY_OMEN_POPUP_SLOT_HIT_TARGETS).find((candidate) => candidate.path === target);
    if (!descriptor) {
        throw new Error(`Unknown popup StateButton target: ${target}`);
    }
    if (interaction.pressedTarget === target) {
        return sampleSwordTrainingClientButtonTracking(1, descriptor.pressScale, interaction.transitionElapsedSeconds, descriptor.trackingSeconds);
    }
    const release = interaction.releasedTargets.find((candidate) => candidate.target === target);
    if (release) {
        const releaseStart = sampleSwordTrainingClientButtonTracking(1, descriptor.pressScale, release.pressElapsedSeconds, descriptor.trackingSeconds);
        return sampleSwordTrainingClientButtonTracking(releaseStart, 1, release.releaseElapsedSeconds, descriptor.trackingSeconds);
    }
    return 1;
}
function slotPressPivot(slotName: string): readonly [
    number,
    number
] {
    const target = STORY_OMEN_POPUP_SLOT_HIT_TARGETS[slotName as keyof typeof STORY_OMEN_POPUP_SLOT_HIT_TARGETS];
    if (!target) {
        throw new Error(`Unknown popup slot press pivot: ${slotName}`);
    }
    const [rotationX, rotationY, rotationZ, rotationW] = target.rootTransform.localRotation;
    if (rotationY !== 0 || rotationZ !== 0) {
        throw new Error(`Unsupported popup slot rotation: ${slotName}`);
    }
    const angleX = 2 * Math.atan2(rotationX, rotationW);
    const stageX = target.rootTransform.anchoredPosition[0];
    const targetCenterFromRoot = target.height / 2 -
        (target.targetRectWithinRoot.top + target.targetRectWithinRoot.height / 2);
    const stageY = target.rootTransform.anchoredPosition[1] +
        Math.cos(angleX) *
            target.rootTransform.localScale[1] *
            targetCenterFromRoot;
    return [ORIGIN[0] + stageX, ORIGIN[1] - stageY];
}
function applyInteraction(command: StoryOmenSceneDrawCommand, interaction: StoryOmenNativeInteractionFrame): StoryOmenSceneDrawCommand {
    const episode15 = STORY_OMEN_EPISODE_15_HIT_TARGET.path;
    if (command.sourcePath === episode15 ||
        command.sourcePath.startsWith(`${episode15}/`)) {
        return scaleCommand(command, storyOmenPopupStateButtonScale(episode15, interaction), [ORIGIN[0] + 214, ORIGIN[1]]);
    }
    for (const slotName of SLOT_NAMES) {
        const target = STORY_OMEN_POPUP_SLOT_HIT_TARGETS[slotName as keyof typeof STORY_OMEN_POPUP_SLOT_HIT_TARGETS];
        if (command.sourcePath === target.path ||
            command.sourcePath.startsWith(`${target.path}/`)) {
            return scaleCommand(command, storyOmenPopupStateButtonScale(target.path, interaction), slotPressPivot(slotName));
        }
    }
    return command;
}
function staticCommands(scene: PopupStaticScene): StoryOmenSceneDrawCommand[] {
    const commands: StoryOmenSceneDrawCommand[] = [];
    for (const image of scene.images) {
        const converted = storyOmenGraphicDraws([image.graphic], [image.path], scene.texturePaths, IDENTITY, WIDTH, HEIGHT);
        if (converted.meshes.length + converted.glitches.length !== 1) {
            throw new Error(`Popup Image did not produce exactly one draw: ${image.path}`);
        }
        if (converted.meshes[0]) {
            commands.push({
                kind: "mesh",
                sourcePath: image.path,
                mesh: converted.meshes[0],
            });
        }
        else {
            commands.push({
                kind: "grab-glitch",
                sourcePath: image.path,
                draw: converted.glitches[0],
            });
        }
        const slot = SLOT_NAMES.find((name) => image.path.endsWith(`/BTN/${name}/GRAB_GLITCH_UI`));
        if (slot) {
            const textPath = `${STORY_OMEN_POPUP_ROOT}/Contents/BTN/${slot}/INFO/AreaName`;
            const draws = scene.texts.get(textPath);
            if (!draws) {
                throw new Error(`Missing popup area TMP draw: ${slot}`);
            }
            // INFO is sibling 1 and GRAB_GLITCH_UI sibling 2. Insert the native TMP
            // immediately before the GrabPass command so its pixels are captured.
            const grab = commands.pop()!;
            commands.push(...draws.map((draw): StoryOmenSceneDrawCommand => ({
                kind: "tmp",
                sourcePath: textPath,
                draw,
            })), grab);
        }
    }
    const episode15TextPath = `${STORY_OMEN_POPUP_ROOT}/Contents/EP15/text`;
    const episode15 = scene.texts.get(episode15TextPath);
    if (!episode15) {
        throw new Error("Missing popup EP.15 TMP draw");
    }
    commands.push(...episode15.map((draw): StoryOmenSceneDrawCommand => ({
        kind: "tmp",
        sourcePath: episode15TextPath,
        draw,
    })));
    return commands;
}
function normalRoot(slotName: string): string {
    if (slotName === "EP15")
        return `${STORY_OMEN_POPUP_ROOT}/Contents/EP15`;
    if (!SLOT_NAMES.includes(slotName)) {
        throw new Error(`Unexpected popup Normal branch: ${slotName}`);
    }
    return `${STORY_OMEN_POPUP_ROOT}/Contents/BTN/${slotName}/BTN`;
}
function parseNormalBranch(value: unknown, expectedSlot: string): PopupNormalBranch {
    const branch = object(value, `popup ${expectedSlot} Normal branch`);
    expect(branch.slotName, expectedSlot, "popup Normal branch name");
    const root = normalRoot(expectedSlot);
    const animation = `${root}/Normal/Bottom/Anim`;
    const player = parseComponentDescriptor(branch.player, "NKC_FXM_PLAYER", animation);
    validatePlayer(player, 4);
    const expectedRotates = [`${animation}/Deco`, `${animation}/Deco_2`];
    const rotates = array(branch.rotates, `${expectedSlot} rotate components`).map((entry, index) => parseComponentDescriptor(entry, "NKC_FXM_ROTATE", expectedRotates[index]));
    if (rotates.length !== expectedRotates.length) {
        throw new Error(`Unexpected popup rotate count: ${expectedSlot}`);
    }
    for (const rotate of rotates)
        validateTarget(rotate, null);
    const gradientPath = `${animation}/Gridient`;
    const gradient = parseComponentDescriptor(branch.gradient, "NKC_FXM_UI_IMAGE", gradientPath);
    validateTarget(gradient, "Image");
    expect(gradient.fields.Duration, 4, `${gradientPath}.Duration`);
    return { slotName: expectedSlot, player, rotates, gradient };
}
function parseGlitchBranch(value: unknown, expectedSlot: string): PopupGlitchBranch {
    const branch = object(value, `popup ${expectedSlot} glitch branch`);
    expect(branch.slotName, expectedSlot, "popup glitch branch name");
    const path = `${STORY_OMEN_POPUP_ROOT}/Contents/BTN/${expectedSlot}/GRAB_GLITCH_UI`;
    const player = parseComponentDescriptor(branch.player, "NKC_FXM_PLAYER", path);
    validatePlayer(player, 1);
    const image = parseComponentDescriptor(branch.image, "NKC_FXM_UI_IMAGE", path);
    validateTarget(image, "Image");
    expect(image.fields.Duration, 0.4000000059604645, `${path}.Duration`);
    return { slotName: expectedSlot, player, image };
}
function mapFrameAngle(value: unknown, expectedFrame: number): {
    angle: number;
    matrix: readonly number[];
} {
    const frame = object(value, `popup Map frame ${expectedFrame}`);
    expect(frame.frame, expectedFrame, "popup Map frame index");
    const transform = object(frame.transform, `popup Map transform ${expectedFrame}`);
    expect(transform.path, `${STORY_OMEN_POPUP_ROOT}/Contents/Map`, "popup Map source path");
    const euler = object(transform.localEulerAngles, "popup Map local Euler");
    expect(euler.y, 0, "popup Map local Euler Y");
    expect(euler.z, 0, "popup Map local Euler Z");
    const angle = numeric(euler.x, "popup Map local Euler X");
    const localToStage = matrix(transform.localToStage, "popup Map localToStage");
    const radians = (angle * Math.PI) / 180;
    if (Math.abs(localToStage[5] - Math.cos(radians)) > 0.000001 ||
        Math.abs(localToStage[6] + Math.sin(radians)) > 0.000001 ||
        Math.abs(localToStage[9] - Math.sin(radians)) > 0.000001 ||
        Math.abs(localToStage[10] - Math.cos(radians)) > 0.000001) {
        throw new Error(`Popup Map matrix/angle diverged at frame ${expectedFrame}`);
    }
    return { angle, matrix: localToStage };
}
function parsePackedCurve(value: unknown, expectedIndex: number, expectedProperty: string, label: string): PopupPackedCurve {
    const curve = object(value, label);
    expect(curve.curveIndex, expectedIndex, `${label} index`);
    expect(curve.property, expectedProperty, `${label} property`);
    const preInfinityValue = numeric(curve.preInfinityValue, `${label} pre-infinity value`);
    const keys = array(curve.keys, `${label} keys`).map((value, index) => {
        const key = object(value, `${label} key ${index}`);
        expect(key.weightedMode, null, `${label} key ${index} weighted mode boundary`);
        text(key.inSlopeSource, `${label} key ${index} slope source`);
        const coefficients = array(key.coefficients, `${label} key ${index} coefficients`).map((entry) => numeric(entry, `${label} coefficient`));
        if (coefficients.length !== 3) {
            throw new Error(`Invalid ${label} packed coefficient count`);
        }
        numeric(key.inSlope, `${label} key ${index} in slope`);
        numeric(key.outSlope, `${label} key ${index} out slope`);
        return {
            time: numeric(key.time, `${label} key ${index} time`),
            value: numeric(key.value, `${label} key ${index} value`),
            coefficients: coefficients as [
                number,
                number,
                number
            ],
        };
    });
    if (!keys.length ||
        keys.some((key, index) => index > 0 && key.time <= keys[index - 1].time)) {
        throw new Error(`Invalid ${label} key ordering`);
    }
    return { curveIndex: expectedIndex, property: expectedProperty, preInfinityValue, keys };
}
function parseAnimatorBinding(value: unknown, relativePath: string, nodePath: string, typeId: number, channels: readonly [
    number,
    string
][]): PopupPackedCurve[] {
    const binding = object(value, `popup Animator ${relativePath} binding`);
    expect(binding.relativePath, relativePath, `popup Animator ${relativePath} relative path`);
    expect(binding.nodePath, nodePath, `popup Animator ${relativePath} node path`);
    numeric(binding.pathCrc32, `popup Animator ${relativePath} path CRC`);
    numeric(binding.attributeCrc32, `popup Animator ${relativePath} attribute CRC`);
    expect(binding.typeId, typeId, `popup Animator ${relativePath} type ID`);
    const values = array(binding.channels, `popup Animator ${relativePath} channels`);
    if (values.length !== channels.length) {
        throw new Error(`Unexpected popup Animator ${relativePath} channel count`);
    }
    return values.map((channel, index) => parsePackedCurve(channel, channels[index][0], channels[index][1], `popup Animator ${relativePath} curve ${channels[index][0]}`));
}
function zeroPackedCurve(curve: PopupPackedCurve, label: string): void {
    if (curve.preInfinityValue !== 0 ||
        curve.keys.some((key) => key.value !== 0 || key.coefficients.some((value) => value !== 0))) {
        throw new Error(`Popup Animator ${label} is no longer constant zero`);
    }
}
function parseContentsAnimator(source: JsonObject, evidenceValue: unknown): PopupContentsAnimator {
    const mapMotion = object(source.mapMotion, "popup serialized Map motion");
    expect(mapMotion.initialLocalXDegrees, 19.99999769855548, "popup serialized Map initial X");
    expect(mapMotion.durationSeconds, 2, "popup serialized Map duration");
    expect(mapMotion.easeName, "Linear", "popup serialized Map ease");
    expect(mapMotion.loopName, "Yoyo", "popup serialized Map loop");
    expect(mapMotion.loops, -1, "popup serialized Map loop count");
    const end = object(mapMotion.endWorldEuler, "popup serialized Map end Euler");
    expect(end.x, 0, "popup serialized Map end X");
    expect(end.y, 0, "popup serialized Map end Y");
    expect(end.z, 0, "popup serialized Map end Z");
    const animator = object(source.contentsAnimator, "popup Contents Animator source");
    const bundle = object(animator.sourceBundle, "popup Contents Animator bundle");
    expect(bundle.pathBelowFirstDecryption, "Data/StreamingAssets/ui_ec_sidestory_omen_animation.asset", "popup Contents Animator bundle path");
    expect(bundle.sha256, "358081AC84650231EE84A0E4D81375F3FEAEDC5478BE7E946247CBE92A40AE06", "popup Contents Animator bundle SHA-256");
    expect(animator.animatorNodePath, `${STORY_OMEN_POPUP_ROOT}/Contents`, "popup Contents Animator node");
    const controller = object(animator.controller, "popup Contents Animator controller");
    expect(controller.name, "Contents", "popup Animator controller name");
    expect(controller.layerName, "Base Layer", "popup Animator layer");
    expect(controller.defaultState, "OMEN_INTRO", "popup Animator default state");
    const states = array(controller.states, "popup Animator states");
    if (states.length !== 2)
        throw new Error(`Unexpected popup Animator state count: ${states.length}`);
    const introState = object(states[0], "popup Animator intro state");
    const idleState = object(states[1], "popup Animator idle state");
    expect(introState.name, "OMEN_INTRO", "popup Animator intro state name");
    expect(introState.speed, 1, "popup Animator intro speed");
    expect(introState.loop, true, "popup Animator intro loop");
    expect(idleState.name, "OMEN_IDLE", "popup Animator idle state name");
    expect(idleState.speed, 1, "popup Animator idle speed");
    expect(idleState.loop, true, "popup Animator idle loop");
    const transition = object(controller.introToIdleTransition, "popup Animator intro-to-idle transition");
    expect(transition.m_DestinationState, 1, "popup Animator transition destination");
    const transitionDuration = numeric(transition.m_TransitionDuration, "popup Animator transition duration");
    const transitionExitTime = numeric(transition.m_ExitTime, "popup Animator transition exit time");
    expect(transitionDuration, 0.25, "popup Animator fixed transition duration");
    expect(transitionExitTime, 0.75, "popup Animator exit time");
    expect(transition.m_TransitionOffset, 0, "popup Animator transition offset");
    expect(transition.m_HasExitTime, true, "popup Animator exit-time flag");
    expect(transition.m_HasFixedDuration, true, "popup Animator fixed-duration flag");
    expect(transition.m_InterruptionSource, 0, "popup Animator interruption source");
    expect(transition.m_OrderedInterruption, true, "popup Animator ordered interruption");
    const intro = object(animator.introClip, "popup Animator intro clip");
    expect(intro.name, "OMEN_INTRO", "popup Animator intro clip name");
    expect(intro.sampleRate, 60, "popup Animator sample rate");
    expect(intro.startTime, 0, "popup Animator intro start");
    expect(intro.stopTime, 1, "popup Animator intro stop");
    expect(intro.loopTime, true, "popup Animator intro loop flag");
    text(intro.packedEvaluator, "popup Animator packed evaluator contract");
    text(intro.weightedModeBoundary, "popup Animator weighted-mode boundary");
    const bindings = array(intro.bindings, "popup Animator intro bindings");
    if (bindings.length !== 4) {
        throw new Error(`Unexpected popup Animator binding count: ${bindings.length}`);
    }
    const [mapAngle, mapY, mapZ] = parseAnimatorBinding(bindings[0], "Map", `${STORY_OMEN_POPUP_ROOT}/Contents/Map`, 4, [
        [0, "localEulerAnglesRaw.x"],
        [1, "localEulerAnglesRaw.y"],
        [2, "localEulerAnglesRaw.z"],
    ]);
    zeroPackedCurve(mapY, "Map Y curve");
    zeroPackedCurve(mapZ, "Map Z curve");
    const [mapAlpha] = parseAnimatorBinding(bindings[1], "Map", `${STORY_OMEN_POPUP_ROOT}/Contents/Map`, 225, [[3, "m_Alpha"]]);
    const [buttonAlpha] = parseAnimatorBinding(bindings[2], "BTN", `${STORY_OMEN_POPUP_ROOT}/Contents/BTN`, 225, [[4, "m_Alpha"]]);
    const [episode15Alpha] = parseAnimatorBinding(bindings[3], "EP15", `${STORY_OMEN_POPUP_ROOT}/Contents/EP15`, 225, [[5, "m_Alpha"]]);
    const idle = object(animator.idleClip, "popup Animator idle clip");
    expect(idle.name, "OMEN_IDLE", "popup Animator idle clip name");
    expect(idle.sampleRate, 60, "popup Animator idle sample rate");
    expect(idle.startTime, 0, "popup Animator idle start");
    expect(idle.stopTime, 0, "popup Animator idle stop");
    expect(idle.loopTime, true, "popup Animator idle loop flag");
    const constants = array(idle.constantChannelsInBindingOrder, "popup Animator idle constants").map((value) => numeric(value, "popup Animator idle constant"));
    if (constants.length !== 6 ||
        constants.some((value, index) => value !== [20, 0, 0, 1, 1, 1][index])) {
        throw new Error("Popup Animator idle constants changed");
    }
    const timingContract = text(animator.timingContract, "popup Animator timing contract");
    if (!timingContract.includes("activation-relative") || !timingContract.includes("authoritative")) {
        throw new Error("Popup Animator activation clock is no longer authoritative");
    }
    const evidence = object(evidenceValue, "popup Map motion evidence");
    expect(evidence.framesPerSecond, 60, "popup Map evidence rate");
    const sourceReference = object(evidence.activationRelativeContentsAnimatorSource, "popup activation-relative Animator evidence");
    expect(sourceReference.sourceField, "popupFxm.source.contentsAnimator", "popup Animator evidence field");
    expect(sourceReference.sourceBundleSha256, bundle.sha256, "popup Animator evidence bundle SHA-256");
    expect(sourceReference.mapRotationXCurveIndex, 0, "popup Animator Map curve index");
    text(sourceReference.timingContract, "popup Animator evidence timing contract");
    const scheduling = object(evidence.fullPrefabSchedulingCounterexample, "popup Animator scheduling counterexample");
    expect(scheduling.authoritativeActivationClock, false, "popup capture-clock authority");
    text(scheduling.reason, "popup capture-clock counterexample reason");
    const runs = array(scheduling.runs, "popup capture-clock counterexample runs");
    if (runs.length !== 2)
        throw new Error("Popup capture-clock counterexample coverage changed");
    for (const value of runs) {
        const run = object(value, "popup capture-clock counterexample run");
        text(run.captureId, "popup capture-clock counterexample ID");
        text(run.rawTraceSha256, "popup capture-clock counterexample SHA-256");
        numeric(run.frame30LocalEulerX, "popup capture-clock frame 30 angle");
    }
    const isolated = array(evidence.isolatedDotweenFrames, "popup isolated DOTween frames");
    const isolatedExpected = new Map([
        [0, 20],
        [120, 0.000011920928955078125],
        [240, 19.999977111816406],
    ]);
    for (const [frame, angle] of isolatedExpected) {
        const value = isolated.find((entry) => object(entry, "popup isolated DOTween frame").frame === frame);
        if (!value || mapFrameAngle(value, frame).angle !== angle) {
            throw new Error(`Popup isolated DOTween counterexample changed at frame ${frame}`);
        }
    }
    const parsed = {
        mapAngle,
        mapAlpha,
        buttonAlpha,
        episode15Alpha,
        idleMapAngle: constants[0],
        idleMapAlpha: constants[3],
        idleButtonAlpha: constants[4],
        idleEpisode15Alpha: constants[5],
        transitionExitTime,
        transitionDuration,
    };
    validateContentsAnimatorNativeTransition(animator, parsed);
    return parsed;
}
function buildPopupFxmScene(runtime: JsonObject, scene: PopupStaticScene): PopupFxmScene {
    const popupFxm = object(runtime.popupFxm, "popup FXM evidence");
    const source = object(popupFxm.source, "popup FXM source");
    text(source.targetResolutionBoundary, "popup target-resolution boundary");
    const normalValues = array(source.normalBranches, "popup Normal branches");
    if (normalValues.length !== SLOT_NAMES.length) {
        throw new Error(`Unexpected popup slot Normal count: ${normalValues.length}`);
    }
    const normalBranches = normalValues.map((value, index) => parseNormalBranch(value, SLOT_NAMES[index]));
    normalBranches.push(parseNormalBranch(source.episode15Branch, "EP15"));
    expect(source.normalBranchCountIncludingEpisode15, 7, "popup total Normal branch count");
    const glitchValues = array(source.glitchBranches, "popup glitch branches");
    if (glitchValues.length !== SLOT_NAMES.length) {
        throw new Error(`Unexpected popup glitch count: ${glitchValues.length}`);
    }
    const glitchBranches = glitchValues.map((value, index) => parseGlitchBranch(value, SLOT_NAMES[index]));
    const animator = parseContentsAnimator(source, popupFxm.mapMotionEvidence);
    const mapReference = scene.images.find((image) => image.path === `${STORY_OMEN_POPUP_ROOT}/Contents/Map/BG2`);
    if (!mapReference)
        throw new Error("Missing popup Map transform reference");
    const base = mapReference.graphic.localToStage;
    if (base.length !== 16 ||
        base[0] !== 1 ||
        base[1] !== 0 ||
        base[2] !== 0 ||
        base[3] !== 0 ||
        base[4] !== 0 ||
        base[5] !== 1 ||
        base[6] !== 0 ||
        base[7] !== -60) {
        throw new Error("Popup Map source coordinate basis changed");
    }
    return { normalBranches, glitchBranches, animator, mapPivotY: base[7] };
}
const fixedFrameTimes = [0];
function fixedFrameTime(frameIndex: number): number {
    if (!Number.isInteger(frameIndex) || frameIndex < 0) {
        throw new RangeError("Invalid popup fixed frame");
    }
    while (fixedFrameTimes.length <= frameIndex) {
        fixedFrameTimes.push(Math.fround(fixedFrameTimes[fixedFrameTimes.length - 1] + UNITY_FIXED_DELTA));
    }
    return fixedFrameTimes[frameIndex];
}
function samplePackedCurve(curve: PopupPackedCurve, time: number): number {
    if (!Number.isFinite(time))
        throw new RangeError("Invalid popup Animator time");
    if (time < curve.keys[0].time)
        return curve.preInfinityValue;
    const last = curve.keys[curve.keys.length - 1];
    if (time >= last.time)
        return last.value;
    let key = curve.keys[0];
    for (let index = 1; index < curve.keys.length; index += 1) {
        if (time < curve.keys[index].time)
            break;
        key = curve.keys[index];
    }
    const delta = Math.fround(time - key.time);
    const [a, b, c] = key.coefficients;
    return Math.fround(Math.fround(Math.fround(Math.fround(a * delta) + b) * delta + c) * delta + key.value);
}
function validateContentsAnimatorNativeTransition(source: JsonObject, animator: PopupContentsAnimator): void {
    const evidence = object(source.nativeTransitionEvidence, "popup native Animator transition evidence");
    expect(evidence.captureId, "omen-popup-contents-animator-blend-native-001", "popup native Animator transition capture ID");
    expect(evidence.framesPerSecond, 60, "popup native Animator transition rate");
    expect(evidence.sourceDotweenRetained, false, "popup Animator transition DOTween isolation");
    text(evidence.rawTraceSha256, "popup native Animator transition SHA-256");
    text(evidence.evidenceBoundary, "popup native Animator transition boundary");
    const contract = object(evidence.observedBlendContract, "popup native Animator blend contract");
    expect(contract.currentClip, "OMEN_INTRO", "popup Animator blend current clip");
    expect(contract.nextClip, "OMEN_IDLE", "popup Animator blend next clip");
    expect(contract.currentWeightPlusNextWeight, 1, "popup Animator blend weight sum");
    expect(contract.nextClipWeightEqualsTransitionNormalizedTime, true, "popup Animator transition weight contract");
    expect(contract.transitionDurationSeconds, 0.25, "popup Animator observed duration");
    expect(contract.serializedExitTime, 0.75, "popup Animator observed exit time");
    expect(contract.firstTransitionSample, 44, "popup Animator first transition sample");
    expect(contract.lastTransitionSample, 58, "popup Animator last transition sample");
    expect(contract.firstIdleOnlySample, 59, "popup Animator first Idle-only sample");
    const transitionFrames = new Set(array(evidence.transitionFrameIndices, "popup Animator transition frames").map((value) => numeric(value, "popup Animator transition frame")));
    const frames = array(evidence.frames, "popup native Animator frames");
    if (!frames.length)
        throw new Error("Missing popup native Animator frames");
    for (const value of frames) {
        const frame = object(value, "popup native Animator frame");
        const frameIndex = numeric(frame.frame, "popup native Animator frame index");
        const map = object(frame.mapTransform, `popup native Animator Map ${frameIndex}`);
        expect(map.path, `${STORY_OMEN_POPUP_ROOT}/Contents/Map`, "popup native Animator Map path");
        const position = object(map.localPosition, "popup native Animator Map position");
        expect(position.x, 0, "popup native Animator Map X");
        expect(position.y, -60, "popup native Animator Map Y");
        expect(position.z, 0, "popup native Animator Map Z");
        const euler = object(map.localEulerAngles, "popup native Animator Map Euler");
        expect(euler.y, 0, "popup native Animator Map Euler Y");
        expect(euler.z, 0, "popup native Animator Map Euler Z");
        const observed = numeric(euler.x, "popup native Animator Map Euler X");
        const animatorFrame = object(frame.animator, "popup native Animator state");
        expect(animatorFrame.path, `${STORY_OMEN_POPUP_ROOT}/Contents`, "popup native Animator path");
        expect(animatorFrame.runtimeAnimatorController, "Contents", "popup native Animator controller");
        const layer = object(animatorFrame.layer, "popup native Animator layer");
        const currentState = object(layer.currentState, "popup native Animator current state");
        const currentTime = numeric(currentState.normalizedTime, "popup native Animator current normalized time");
        const inTransition = layer.isInTransition === true;
        if (inTransition !== transitionFrames.has(frameIndex)) {
            throw new Error(`Popup native Animator transition membership changed: ${frameIndex}`);
        }
        let expected: number;
        if (inTransition) {
            const transition = object(layer.transition, "popup native Animator transition");
            expect(transition.duration, 0.25, "popup native Animator transition duration");
            const weight = numeric(transition.normalizedTime, "popup native Animator transition normalized time");
            const currentClips = array(layer.currentClips, "popup native Animator current clips");
            const nextClips = array(layer.nextClips, "popup native Animator next clips");
            if (currentClips.length !== 1 || nextClips.length !== 1) {
                throw new Error(`Unexpected popup native Animator clip count: ${frameIndex}`);
            }
            const currentClip = object(currentClips[0], "popup native Animator current clip");
            const nextClip = object(nextClips[0], "popup native Animator next clip");
            expect(currentClip.name, "OMEN_INTRO", "popup native Animator current clip name");
            expect(nextClip.name, "OMEN_IDLE", "popup native Animator next clip name");
            const currentWeight = numeric(currentClip.weight, "popup native Animator current weight");
            const nextWeight = numeric(nextClip.weight, "popup native Animator next weight");
            if (Math.abs(currentWeight + nextWeight - 1) > 0.000001 ||
                Math.abs(nextWeight - weight) > 0.000001) {
                throw new Error(`Popup native Animator blend weights changed: ${frameIndex}`);
            }
            const introValue = samplePackedCurve(animator.mapAngle, currentTime);
            expected = introValue * currentWeight + animator.idleMapAngle * nextWeight;
        }
        else {
            const clips = array(layer.currentClips, "popup native Animator current clips");
            if (clips.length !== 1)
                throw new Error(`Unexpected popup native Animator clip: ${frameIndex}`);
            const clip = object(clips[0], "popup native Animator current clip");
            const name = text(clip.name, "popup native Animator current clip name");
            expect(clip.weight, 1, "popup native Animator current clip weight");
            expected = name === "OMEN_INTRO"
                ? samplePackedCurve(animator.mapAngle, currentTime)
                : name === "OMEN_IDLE"
                    ? animator.idleMapAngle
                    : Number.NaN;
        }
        // The probe reads quaternion-derived Euler angles after Animator writes
        // localEulerAnglesRaw. Across all 91 native samples the maximum measured
        // conversion delta is 0.00025482586270975105 degrees (frame 45).
        if (!Number.isFinite(expected) || Math.abs(expected - observed) > 0.00026) {
            throw new Error(`Popup packed Animator/native Map mismatch at diagnostic frame ${frameIndex}: ${expected}/${observed}`);
        }
    }
}
function sampleAnimatorChannel(animator: PopupContentsAnimator, curve: PopupPackedCurve, idleValue: number, frameIndex: number): number {
    const time = fixedFrameTime(frameIndex);
    const source = samplePackedCurve(curve, Math.min(1, time));
    if (time <= animator.transitionExitTime)
        return source;
    const end = animator.transitionExitTime + animator.transitionDuration;
    if (time >= end)
        return idleValue;
    // The shipped fixed-duration transition linearly blends the packed intro
    // output into the zero-length Idle constants. The uninterrupted native Map
    // trace confirms this at every transition frame; capture-frame offsets are
    // intentionally excluded from this activation-relative clock.
    const weight = Math.fround((time - animator.transitionExitTime) / animator.transitionDuration);
    return Math.fround(source + Math.fround((idleValue - source) * weight));
}
type PopupAnimatorFrame = {
    mapAngle: number;
    mapAlpha: number;
    buttonAlpha: number;
    episode15Alpha: number;
};
function contentsAnimatorFrame(animator: PopupContentsAnimator, frameIndex: number): PopupAnimatorFrame {
    return {
        mapAngle: sampleAnimatorChannel(animator, animator.mapAngle, animator.idleMapAngle, frameIndex),
        mapAlpha: sampleAnimatorChannel(animator, animator.mapAlpha, animator.idleMapAlpha, frameIndex),
        buttonAlpha: sampleAnimatorChannel(animator, animator.buttonAlpha, animator.idleButtonAlpha, frameIndex),
        episode15Alpha: sampleAnimatorChannel(animator, animator.episode15Alpha, animator.idleEpisode15Alpha, frameIndex),
    };
}
function multiplyMatrix(left: readonly number[], right: readonly number[]): number[] {
    if (left.length !== 16 || right.length !== 16)
        throw new Error("Invalid popup Graphic matrix");
    const output = new Array<number>(16).fill(0);
    for (let row = 0; row < 4; row += 1) {
        for (let column = 0; column < 4; column += 1) {
            for (let inner = 0; inner < 4; inner += 1) {
                output[row * 4 + column] +=
                    left[row * 4 + inner] * right[inner * 4 + column];
            }
        }
    }
    return output;
}
function translationMatrix(x: number, y: number, z: number): number[] {
    return [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z, 0, 0, 0, 1];
}
function rotationMatrix(axis: "x" | "z", degrees: number): number[] {
    const radians = (degrees * Math.PI) / 180;
    const cosine = Math.cos(radians);
    const sine = Math.sin(radians);
    return axis === "x"
        ? [1, 0, 0, 0, 0, cosine, -sine, 0, 0, sine, cosine, 0, 0, 0, 0, 1]
        : [cosine, -sine, 0, 0, sine, cosine, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}
function rebuildGraphicCommand(scene: PopupStaticScene, path: string, matrixTransform: (base: readonly number[]) => readonly number[]): StoryOmenSceneDrawCommand {
    const image = scene.images.find((candidate) => candidate.path === path);
    if (!image)
        throw new Error(`Missing dynamic popup Graphic: ${path}`);
    const graphic = structuredClone(image.graphic) as StoryOmenGraphicProbeFrame;
    graphic.localToStage = matrixTransform(graphic.localToStage);
    graphic.localToSelected = undefined;
    const converted = storyOmenGraphicDraws([graphic], [path], scene.texturePaths, IDENTITY, WIDTH, HEIGHT);
    if (converted.meshes.length + converted.glitches.length !== 1) {
        throw new Error(`Dynamic popup Graphic did not produce one draw: ${path}`);
    }
    return converted.meshes[0]
        ? { kind: "mesh", sourcePath: path, mesh: converted.meshes[0] }
        : { kind: "grab-glitch", sourcePath: path, draw: converted.glitches[0] };
}
function alphaCommand(command: StoryOmenSceneDrawCommand, sourceAlpha: number): StoryOmenSceneDrawCommand {
    if (!Number.isFinite(sourceAlpha) || sourceAlpha < -0.00001 || sourceAlpha > 1.00001) {
        throw new Error(`Invalid popup CanvasGroup alpha: ${sourceAlpha}`);
    }
    const alpha = Math.max(0, Math.min(1, sourceAlpha));
    if (alpha === 1)
        return command;
    if (command.kind === "mesh") {
        const mesh = cloneMesh(command.mesh);
        mesh.color = [
            mesh.color[0],
            mesh.color[1],
            mesh.color[2],
            Math.fround(mesh.color[3] * alpha),
        ];
        return { ...command, mesh };
    }
    if (command.kind === "tmp") {
        const colors = [...command.draw.colors];
        for (let index = 3; index < colors.length; index += 4) {
            const quantized = swordTrainingColor32([
                Math.fround((colors[index] / 255) * alpha),
            ])[0];
            colors[index] = Math.round(quantized * 255);
        }
        return { ...command, draw: { ...command.draw, colors } };
    }
    const colors = [...command.draw.colors];
    for (let index = 3; index < colors.length; index += 4) {
        colors[index] = Math.fround(colors[index] * alpha);
    }
    return { ...command, draw: { ...command.draw, colors } };
}
function applyContentsAnimatorAlpha(command: StoryOmenSceneDrawCommand, animator: PopupAnimatorFrame): StoryOmenSceneDrawCommand {
    const mapRoot = `${STORY_OMEN_POPUP_ROOT}/Contents/Map`;
    const buttonRoot = `${STORY_OMEN_POPUP_ROOT}/Contents/BTN`;
    const episode15Root = `${STORY_OMEN_POPUP_ROOT}/Contents/EP15`;
    if (command.sourcePath === mapRoot || command.sourcePath.startsWith(`${mapRoot}/`)) {
        return alphaCommand(command, animator.mapAlpha);
    }
    if (command.sourcePath === buttonRoot ||
        command.sourcePath.startsWith(`${buttonRoot}/`)) {
        return alphaCommand(command, animator.buttonAlpha);
    }
    if (command.sourcePath === episode15Root ||
        command.sourcePath.startsWith(`${episode15Root}/`)) {
        return alphaCommand(command, animator.episode15Alpha);
    }
    return command;
}
function applyPopupFxm(command: StoryOmenSceneDrawCommand, frameIndex: number, scene: PopupStaticScene, fxm: PopupFxmScene, animator: PopupAnimatorFrame): StoryOmenSceneDrawCommand {
    let output = command;
    if (command.sourcePath.startsWith(`${STORY_OMEN_POPUP_ROOT}/Contents/Map/`)) {
        const aroundRoot = multiplyMatrix(multiplyMatrix(translationMatrix(0, fxm.mapPivotY, 0), rotationMatrix("x", animator.mapAngle)), translationMatrix(0, -fxm.mapPivotY, 0));
        output = rebuildGraphicCommand(scene, command.sourcePath, (base) => multiplyMatrix(aroundRoot, base));
    }
    else {
        for (const branch of fxm.normalBranches) {
            const duration = numeric(branch.player.fields.Duration, `${branch.player.nodePath}.Duration`);
            const playback = playerPlayback(frameIndex, duration);
            const rotate = branch.rotates.find((descriptor) => descriptor.nodePath === command.sourcePath);
            if (rotate) {
                const angle = rotateAngleAt(rotate, frameIndex, duration);
                output = rebuildGraphicCommand(scene, command.sourcePath, (base) => multiplyMatrix(base, rotationMatrix("z", angle)));
                break;
            }
            if (command.sourcePath === branch.gradient.nodePath) {
                output = colorCommand(command, imageColorAt(branch.gradient, playback));
                break;
            }
        }
        const glitch = fxm.glitchBranches.find((branch) => branch.image.nodePath === command.sourcePath);
        if (glitch) {
            const duration = numeric(glitch.player.fields.Duration, `${glitch.player.nodePath}.Duration`);
            const playback = playerPlayback(frameIndex, duration);
            output = colorCommand(command, imageColorAt(glitch.image, playback));
        }
    }
    return applyContentsAnimatorAlpha(output, animator);
}
function mergePreloadTextures(textures: readonly StoryOmenSceneTexture[]): StoryOmenSceneTexture[] {
    const output = new Map<string, StoryOmenSceneTexture>();
    for (const texture of textures) {
        const previous = output.get(texture.path);
        if (previous &&
            (previous.filter !== texture.filter ||
                previous.wrapU !== texture.wrapU ||
                previous.wrapV !== texture.wrapV)) {
            throw new Error(`Conflicting popup texture sampler: ${texture.path}`);
        }
        output.set(texture.path, texture);
    }
    return [...output.values()];
}
/**
 * The public builder is completed only when the native map/FXM and all four
 * procedural particle evaluators are present in the split popup manifest.
 * Static conversion is intentionally strict so locked account-state branches
 * can never become an accidental browser fallback.
 */
export function buildStoryOmenPopupExactSource(runtimeValue: unknown): StoryOmenContinuousSceneSource {
    const runtime = object(runtimeValue, "popup Omen runtime");
    expect(runtime.surface, "popup", "popup runtime surface");
    const scene = buildPopupStaticScene(runtime);
    const baseCommands = staticCommands(scene);
    const popupFxm = object(runtime.popupFxm, "popup FXM evidence");
    const fxm = buildPopupFxmScene(runtime, scene);
    validatePopupContinuousFxm(popupFxm, fxm);
    const particles = buildStoryOmenPopupParticleRuntime(runtime);
    const maximumInteractionTransitionSeconds = Math.max(STORY_OMEN_EPISODE_15_HIT_TARGET.trackingSeconds, ...Object.values(STORY_OMEN_POPUP_SLOT_HIT_TARGETS).map((target) => target.trackingSeconds));
    return {
        surface: "popup",
        sourceRoot: STORY_OMEN_POPUP_ROOT,
        referenceWidth: WIDTH,
        referenceHeight: HEIGHT,
        interactiveTargets: STORY_OMEN_POPUP_INTERACTIVE_TARGETS,
        maximumInteractionTransitionSeconds,
        preloadTextures: mergePreloadTextures([
            ...scene.preloadTextures,
            ...particles.preloadTextures,
        ]),
        continuity: "procedural-infinite",
        frameAt(elapsedSeconds: number, interaction: StoryOmenNativeInteractionFrame) {
            const frameIndex = Math.max(0, Math.floor(elapsedSeconds * 60 + 0.000001));
            const animator = contentsAnimatorFrame(fxm.animator, frameIndex);
            const commands = baseCommands.map((command) => applyInteraction(applyPopupFxm(command, frameIndex, scene, fxm, animator), interaction));
            commands.push(...particles.draw(frameIndex));
            return { surface: "popup", elapsedSeconds, commands };
        },
    };
}
