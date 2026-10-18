"use client";
import { deploymentUrl } from "@/lib/deployment";
import { useEffect, useRef, useState } from "react";
import type { SwordTrainingPmaMesh } from "@/components/minigames/sword-training/SwordTrainingPmaMeshes";
import { swordTrainingColor32 } from "@/lib/swordTrainingClientPma";
import { storyOmenSceneFrameAt, type StoryOmenContinuousSceneSource, type StoryOmenGlitchDraw, type StoryOmenNativeMotionPolicy, type StoryOmenSceneTexture, type StoryOmenTmpDraw, } from "@/lib/storyOmenNativeRuntime";
type Props = {
    source: StoryOmenContinuousSceneSource;
    /** Change this when the native popup/node lifecycle is restarted. */
    activationKey: string | number;
    active?: boolean;
    /** Source path currently held by a transparent DOM pointer hit target. */
    pressedTarget?: string | null;
    motionPolicy?: StoryOmenNativeMotionPolicy;
    /** Expand the logical canvas around the centered 1920x1080 root exactly as the client CanvasScaler does. */
    canvasLayout?: "reference" | "client-fullscreen";
    className?: string;
    onReady?: () => void;
    onError?: (message: string) => void;
};
type LoadedTexture = {
    texture: WebGLTexture;
    image: HTMLImageElement;
    loaded: boolean;
    filter: StoryOmenSceneTexture["filter"];
    wrapU: StoryOmenSceneTexture["wrapU"];
    wrapV: StoryOmenSceneTexture["wrapV"];
};
type Program = {
    program: WebGLProgram;
    shaders: readonly WebGLShader[];
};
const SPRITE_VERTEX = `#version 300 es
in vec2 aPosition;
in vec2 aUv;
uniform vec2 uSize;
uniform vec2 uOffset;
out vec2 vUv;
void main() {
  vec2 position = aPosition + uOffset;
  gl_Position = vec4(position.x / uSize.x * 2.0 - 1.0, 1.0 - position.y / uSize.y * 2.0, 0.0, 1.0);
  vUv = aUv;
}`;
// These are the same audited PMA/UI particle branches used by
// SwordTrainingPmaMeshes. Keeping one mesh contract lets the Omen compositor
// interleave normal UI, additive UI and ParticleSystem draws before GrabPass.
const SPRITE_FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D uTexture;
uniform vec4 uColor;
uniform vec2 uParticleCustom;
uniform vec4 uParticleTint;
uniform bool uParticleShader;
uniform bool uSourceAlphaAdditive;
uniform float uAdditiveMultiplier;
uniform bool uStraightAlpha;
in vec2 vUv;
out vec4 outputColor;
void main() {
  if (uStraightAlpha) {
    vec4 sampled = texture(uTexture, vUv) * uColor;
    outputColor = vec4(sampled.rgb * sampled.a, sampled.a);
  } else if (uSourceAlphaAdditive) {
    vec4 sampled = texture(uTexture, vUv) * uColor * uAdditiveMultiplier;
    outputColor = vec4(sampled.rgb * clamp(sampled.a, 0.0, 1.0), 0.0);
  } else if (uParticleShader) {
    vec4 sampled = texture(uTexture, vUv) * uParticleTint;
    float amount = uColor.a * uParticleCustom.x;
    outputColor = sampled * vec4(amount * uColor.rgb, amount * uParticleCustom.y);
  } else {
    vec4 color = texture(uTexture, vUv) * uColor * 2.0;
    color.a = clamp(color.a, 0.0, 1.0);
    outputColor = color;
  }
}`;
// Original ab_font_tmp_loc.asset, TextMeshPro/Distance Field shader
// 3039605131867672570, D3D11 programs 2/3 and 12/13. This is the same
// client-derived SDF branch used by swordTrainingNativeTextRaster, adapted only
// so already-transformed Omen glyph vertices address the shared Y-down surface.
const TMP_VERTEX = `#version 300 es
in vec2 aPosition;
in vec2 aUnityUv;
in float aScale;
in vec4 aColor;
uniform vec2 uSize;
uniform vec2 uOffset;
uniform vec2 uDensity;
uniform vec2 uScaleXY;
uniform float uGradientScale;
uniform float uSharpness;
uniform float uWeightNormal;
uniform float uWeightBold;
uniform float uFaceDilate;
uniform float uRatioA;
uniform float uOutlineWidth;
uniform float uOutlineSoftness;
uniform vec2 uVertexOffset;
out vec2 vUnityUv;
out vec4 vColor;
out vec4 vSdf;
void main() {
  vec2 position = aPosition + uVertexOffset + uOffset;
  gl_Position = vec4(position.x / uSize.x * 2.0 - 1.0, 1.0 - position.y / uSize.y * 2.0, 0.0, 1.0);
  vec2 pixel = 1.0 / (2.0 * uDensity * uScaleXY);
  float scale = inversesqrt(dot(pixel, pixel)) * abs(aScale) * uGradientScale * (uSharpness + 1.0);
  float weight = ((aScale <= 0.0 ? uWeightBold : uWeightNormal) * 0.25 + uFaceDilate) * uRatioA * 0.5;
  vSdf = vec4(0.5 - weight - (uOutlineWidth + uOutlineSoftness) * uRatioA * 0.5 - 0.5 / scale,
              scale, 0.5 - weight + 0.5 / scale, weight);
  vColor = aColor;
  vUnityUv = aUnityUv;
}`;
const TMP_FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D uAtlas;
uniform vec4 uFaceColor;
uniform vec4 uOutlineColor;
uniform float uOutlineWidth;
uniform float uOutlineSoftness;
uniform float uRatioA;
uniform bool uUnderlay;
uniform vec4 uUnderlayColor;
uniform float uUnderlayDilate;
uniform float uUnderlaySoftness;
uniform float uRatioC;
uniform vec2 uUnderlayOffset;
uniform vec2 uTextureSize;
uniform float uGradientScale;
in vec2 vUnityUv;
in vec4 vColor;
in vec4 vSdf;
out vec4 outputColor;
float atlas(vec2 uv) { return texture(uAtlas, vec2(uv.x, 1.0 - uv.y)).a; }
void main() {
  float alpha = atlas(vUnityUv);
  if (!uUnderlay && alpha < vSdf.x) discard;
  float distance = vSdf.z - alpha;
  float outline = uOutlineWidth * uRatioA * vSdf.y;
  float softness = uOutlineSoftness * uRatioA * vSdf.y;
  vec4 face = uFaceColor; face.rgb *= vColor.rgb * face.a;
  vec4 edge = uOutlineColor; edge.rgb *= edge.a;
  float blend = sqrt(min(1.0, outline)) * clamp(distance * vSdf.y + outline * 0.5, 0.0, 1.0);
  vec4 color = mix(face, edge, blend);
  color *= 1.0 - clamp((distance * vSdf.y - outline * 0.5 + softness * 0.5) / (1.0 + softness), 0.0, 1.0);
  if (uUnderlay) {
    float underScale = vSdf.y / (1.0 + uUnderlaySoftness * uRatioC * vSdf.y);
    float underBias = (0.5 - vSdf.w) * underScale - 0.5 - uUnderlayDilate * uRatioC * underScale * 0.5;
    vec2 uv = vUnityUv - uUnderlayOffset * uRatioC * uGradientScale / uTextureSize;
    float coverage = clamp(atlas(uv) * underScale - underBias, 0.0, 1.0);
    color += vec4(uUnderlayColor.rgb * uUnderlayColor.a, uUnderlayColor.a) * coverage * (1.0 - color.a);
  }
  outputColor = color * vColor.a;
}`;
const GLITCH_VERTEX = `#version 300 es
in vec2 aPosition;
in vec2 aUnityUv;
in vec4 aColor;
uniform vec2 uSize;
uniform vec2 uOffset;
out vec2 vUnityUv;
out float vAlpha;
out vec2 vScreen;
void main() {
  vec2 position = aPosition + uOffset;
  gl_Position = vec4(position.x / uSize.x * 2.0 - 1.0, 1.0 - position.y / uSize.y * 2.0, 0.0, 1.0);
  vUnityUv = aUnityUv;
  vAlpha = aColor.a;
  vScreen = position / uSize;
}`;
// Installed common/shaders.asset, StudioBside/Custom/StudioBside-Custom-GlitchUI.
// The WebGL grab texture is bottom-up, so Y and Y offsets are inverted only at
// the framebuffer sampling boundary. Sprite/noise inputs retain Unity UVs.
const GLITCH_FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D uMask;
uniform sampler2D uNoise;
uniform sampler2D uGrab;
uniform vec4 uNoiseST;
uniform vec4 uRedGreen;
uniform vec2 uBlue;
uniform float uShapeTest;
in vec2 vUnityUv;
in float vAlpha;
in vec2 vScreen;
out vec4 outputColor;
vec2 uploadedSpriteUv(vec2 unityUv) {
  return vec2(unityUv.x, 1.0 - unityUv.y);
}
vec2 grabUv(float x, float y) {
  return vec2(vScreen.x + x, 1.0 - vScreen.y - y);
}
void main() {
  vec2 noiseUnityUv = vUnityUv * uNoiseST.xy + uNoiseST.zw;
  float noise = texture(uNoise, uploadedSpriteUv(noiseUnityUv)).r;
  vec4 redSample = texture(uGrab, grabUv(noise * uRedGreen.x, noise * uRedGreen.y));
  vec4 greenSample = texture(uGrab, grabUv(noise * uRedGreen.z, noise * uRedGreen.w));
  vec4 blueSample = texture(uGrab, grabUv(noise * uBlue.x, noise * uBlue.y));
  vec4 grabbed = vec4(redSample.r, greenSample.g, blueSample.b, 1.0);
  vec4 shape = texture(uMask, uploadedSpriteUv(vUnityUv));
  outputColor = mix(grabbed, shape, uShapeTest) * (shape.r * vAlpha);
}`;
function compileProgram(gl: WebGL2RenderingContext, vertexSource: string, fragmentSource: string, label: string): Program {
    const program = gl.createProgram();
    if (!program)
        throw new Error(`${label} program allocation failed.`);
    const shaders: WebGLShader[] = [];
    try {
        for (const [type, source] of [[gl.VERTEX_SHADER, vertexSource], [gl.FRAGMENT_SHADER, fragmentSource]] as const) {
            const shader = gl.createShader(type);
            if (!shader)
                throw new Error(`${label} shader allocation failed.`);
            shaders.push(shader);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
                throw new Error(gl.getShaderInfoLog(shader) || `${label} shader compilation failed.`);
            gl.attachShader(program, shader);
        }
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS))
            throw new Error(gl.getProgramInfoLog(program) || `${label} program link failed.`);
        return { program, shaders };
    }
    catch (error) {
        for (const shader of shaders)
            gl.deleteShader(shader);
        gl.deleteProgram(program);
        throw error;
    }
}
function requireAttribute(gl: WebGL2RenderingContext, program: WebGLProgram, name: string): number {
    const location = gl.getAttribLocation(program, name);
    if (location < 0)
        throw new Error(`Omen WebGL attribute was optimized out: ${name}`);
    return location;
}
function requireUniform(gl: WebGL2RenderingContext, program: WebGLProgram, name: string): WebGLUniformLocation {
    const location = gl.getUniformLocation(program, name);
    if (!location)
        throw new Error(`Omen WebGL uniform was optimized out: ${name}`);
    return location;
}
function bindFloatBuffer(gl: WebGL2RenderingContext, buffer: WebGLBuffer, location: number, values: readonly number[], size: number): void {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(values), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
}
function bindIndices(gl: WebGL2RenderingContext, buffer: WebGLBuffer, indices: readonly number[]): void {
    if (indices.some((index) => !Number.isInteger(index) || index < 0 || index > 65535))
        throw new Error("Omen WebGL mesh requires unsupported 32-bit indices");
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.DYNAMIC_DRAW);
}
function validateSpriteMesh(mesh: SwordTrainingPmaMesh): void {
    const vertexCount = mesh.positions.length / 2;
    if (!Number.isInteger(vertexCount) || mesh.positions.length !== mesh.uvs.length || mesh.color.length !== 4 ||
        mesh.positions.some((value) => !Number.isFinite(value)) || mesh.uvs.some((value) => !Number.isFinite(value)) ||
        mesh.indices.some((index) => !Number.isInteger(index) || index < 0 || index >= vertexCount))
        throw new Error(`Invalid original Omen mesh: ${mesh.id}`);
    const branches = Number(Boolean(mesh.particleCustom)) + Number(Boolean(mesh.sourceAlphaAdditive)) + Number(Boolean(mesh.sourceStraightAlpha));
    if (branches > 1)
        throw new Error(`Conflicting Omen shader branches: ${mesh.id}`);
    if (!mesh.sourceAlphaAdditive && mesh.sourceAlphaAdditiveMultiplier !== undefined)
        throw new Error(`Omen additive multiplier escaped its shader branch: ${mesh.id}`);
}
function validateGlitchMesh(draw: StoryOmenGlitchDraw): void {
    const vertexCount = draw.positions.length / 2;
    if (!Number.isInteger(vertexCount) || draw.positions.length !== draw.unityUvs.length || draw.colors.length !== vertexCount * 4 ||
        draw.positions.some((value) => !Number.isFinite(value)) || draw.unityUvs.some((value) => !Number.isFinite(value)) ||
        draw.colors.some((value) => !Number.isFinite(value)) ||
        draw.indices.some((index) => !Number.isInteger(index) || index < 0 || index >= vertexCount) ||
        [...draw.noiseScaleOffset, ...draw.channelOffsets, draw.shapeTest].some((value) => !Number.isFinite(value)))
        throw new Error(`Invalid original Omen GlitchUI mesh: ${draw.id}`);
}
function validateTmpDraw(draw: StoryOmenTmpDraw): void {
    const vertexCount = draw.positions.length / 2;
    const materialNumbers = [
        draw.material.gradientScale, draw.material.sharpness, draw.material.weightNormal,
        draw.material.weightBold, draw.material.faceDilate, draw.material.scaleRatioA,
        draw.material.outlineWidth, draw.material.outlineSoftness, draw.material.scaleX,
        draw.material.scaleY, draw.material.vertexOffsetX, draw.material.vertexOffsetY,
        draw.material.textureWidth, draw.material.textureHeight, draw.material.underlayDilate,
        draw.material.underlaySoftness, draw.material.scaleRatioC,
        draw.material.underlayOffsetX, draw.material.underlayOffsetY,
        ...draw.material.faceColor, ...draw.material.outlineColor, ...draw.material.underlayColor,
    ];
    if (!Number.isInteger(vertexCount) || draw.unityUvs.length !== vertexCount * 2 ||
        draw.scales.length !== vertexCount || draw.colors.length !== vertexCount * 4 ||
        draw.positions.some((value) => !Number.isFinite(value)) ||
        draw.unityUvs.some((value) => !Number.isFinite(value)) ||
        draw.scales.some((value) => !Number.isFinite(value)) ||
        draw.colors.some((value) => !Number.isInteger(value) || value < 0 || value > 255) ||
        draw.indices.some((index) => !Number.isInteger(index) || index < 0 || index >= vertexCount) ||
        materialNumbers.some((value) => !Number.isFinite(value)) ||
        !(draw.material.textureWidth > 0 && draw.material.textureHeight > 0) ||
        !draw.material.atlasTexture)
        throw new Error(`Invalid native Omen TMP draw: ${draw.id}`);
    const unsupportedKeywords = draw.material.keywords.filter((keyword) => keyword !== "UNDERLAY_ON");
    if (unsupportedKeywords.length)
        throw new Error(`Unsupported native Omen TMP shader keywords: ${unsupportedKeywords.join(",")}`);
    // The current native programs are proven for the zero vertex-offset branch.
    // A non-zero material requires its offset to be transformed by the captured
    // TMP object matrix rather than silently treating it as surface pixels.
    if (draw.material.vertexOffsetX !== 0 || draw.material.vertexOffsetY !== 0)
        throw new Error(`Unsupported non-zero native Omen TMP vertex offset: ${draw.id}`);
}
/**
 * One framebuffer for the full native visual surface. DOM buttons/ARIA remain
 * transparent overlays; every visible pixel, including each GrabPass source,
 * is emitted by the ordered client-evidence evaluator.
 */
export default function StoryOmenNativeSceneCanvas({ source, activationKey, active = true, pressedTarget = null, motionPolicy = "native", canvasLayout = "reference", className, onReady, onError }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const latest = useRef({ source, active, pressedTarget, motionPolicy, canvasLayout, onReady, onError });
    const startedAt = useRef(0);
    const interaction = useRef({
        current: pressedTarget,
        previous: null as string | null,
        changedAt: 0,
        previousPressElapsedSeconds: 0,
        releases: [] as {
            target: string;
            pressElapsedSeconds: number;
            releasedAt: number;
        }[],
    });
    const renderRef = useRef<(() => void) | null>(null);
    const [status, setStatus] = useState("loading");
    useEffect(() => {
        latest.current = { source, active, pressedTarget, motionPolicy, canvasLayout, onReady, onError };
        renderRef.current?.();
    }, [source, active, pressedTarget, motionPolicy, canvasLayout, onReady, onError]);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        // The client sampler evidence includes NPOT sprites with Repeat on one
        // axis. WebGL1 makes those textures incomplete; WebGL2 preserves the
        // original Bilinear/Repeat/Clamp contract without changing the assets or
        // silently substituting Clamp.
        const gl = canvas.getContext("webgl2", {
            alpha: true,
            premultipliedAlpha: true,
            antialias: true,
            preserveDrawingBuffer: false,
        });
        if (!gl) {
            setStatus("error");
            latest.current.onError?.("The exact Omen scene requires WebGL2 for native NPOT Repeat sampling.");
            return;
        }
        const canvasElement = canvas;
        const glContext = gl;
        let cancelled = false;
        let animationFrame = 0;
        let ready = false;
        let errorMessage = "";
        let grabWidth = 0;
        let grabHeight = 0;
        const textures = new Map<string, LoadedTexture>();
        const programs: Program[] = [];
        const buffers: WebGLBuffer[] = [];
        const maximumTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
        const maximumViewport = gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array;
        const fail = (error: unknown) => {
            if (cancelled)
                return;
            const message = error instanceof Error ? error.message : String(error);
            canvas.dataset.omenNativeError = message;
            if (errorMessage !== message) {
                errorMessage = message;
                setStatus("error");
                latest.current.onError?.(message);
            }
            if (animationFrame)
                cancelAnimationFrame(animationFrame);
            animationFrame = 0;
        };
        const schedule = () => {
            if (!cancelled && !errorMessage && !animationFrame)
                animationFrame = requestAnimationFrame(render);
        };
        const ensureTexture = (sourceTexture: StoryOmenSceneTexture): LoadedTexture => {
            const { path, filter, wrapU, wrapV } = sourceTexture;
            const cached = textures.get(path);
            if (cached) {
                if (cached.filter !== filter ||
                    cached.wrapU !== wrapU ||
                    cached.wrapV !== wrapV)
                    throw new Error(`Conflicting original Omen texture sampling: ${path}`);
                return cached;
            }
            const texture = gl.createTexture();
            if (!texture)
                throw new Error("Omen texture allocation failed.");
            const image = new Image();
            const entry = { texture, image, loaded: false, filter, wrapU, wrapV };
            textures.set(path, entry);
            image.onload = () => {
                if (cancelled)
                    return;
                try {
                    gl.bindTexture(gl.TEXTURE_2D, texture);
                    const glFilter = filter === "nearest" ? gl.NEAREST : gl.LINEAR;
                    const glWrapU = wrapU === "repeat" ? gl.REPEAT : gl.CLAMP_TO_EDGE;
                    const glWrapV = wrapV === "repeat" ? gl.REPEAT : gl.CLAMP_TO_EDGE;
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, glFilter);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, glFilter);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, glWrapU);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, glWrapV);
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
                    entry.loaded = true;
                    schedule();
                }
                catch (error) {
                    fail(error);
                }
            };
            image.onerror = () => fail(`Omen source texture failed: ${path}`);
            image.src = deploymentUrl(path);
            return entry;
        };
        let sprite: Program;
        let tmp: Program;
        let glitch: Program;
        let grabTexture: WebGLTexture | null = null;
        try {
            sprite = compileProgram(gl, SPRITE_VERTEX, SPRITE_FRAGMENT, "Omen PMA");
            tmp = compileProgram(gl, TMP_VERTEX, TMP_FRAGMENT, "Omen native TMP SDF");
            glitch = compileProgram(gl, GLITCH_VERTEX, GLITCH_FRAGMENT, "Omen GlitchUI");
            programs.push(sprite, tmp, glitch);
            for (let index = 0; index < 5; index++) {
                const buffer = gl.createBuffer();
                if (!buffer)
                    throw new Error("Omen mesh buffer allocation failed.");
                buffers.push(buffer);
            }
            grabTexture = gl.createTexture();
            if (!grabTexture)
                throw new Error("Omen GrabPass texture allocation failed.");
            gl.bindTexture(gl.TEXTURE_2D, grabTexture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
            gl.disable(gl.DEPTH_TEST);
            gl.disable(gl.CULL_FACE);
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
            gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
            gl.clearColor(0, 0, 0, 0);
        }
        catch (error) {
            fail(error);
            return;
        }
        const spriteLocations = {
            position: requireAttribute(gl, sprite.program, "aPosition"),
            uv: requireAttribute(gl, sprite.program, "aUv"),
            size: requireUniform(gl, sprite.program, "uSize"),
            offset: requireUniform(gl, sprite.program, "uOffset"),
            color: requireUniform(gl, sprite.program, "uColor"),
            particleShader: requireUniform(gl, sprite.program, "uParticleShader"),
            sourceAlphaAdditive: requireUniform(gl, sprite.program, "uSourceAlphaAdditive"),
            additiveMultiplier: requireUniform(gl, sprite.program, "uAdditiveMultiplier"),
            straightAlpha: requireUniform(gl, sprite.program, "uStraightAlpha"),
            particleCustom: requireUniform(gl, sprite.program, "uParticleCustom"),
            particleTint: requireUniform(gl, sprite.program, "uParticleTint"),
            texture: requireUniform(gl, sprite.program, "uTexture"),
        };
        const glitchLocations = {
            position: requireAttribute(gl, glitch.program, "aPosition"),
            uv: requireAttribute(gl, glitch.program, "aUnityUv"),
            color: requireAttribute(gl, glitch.program, "aColor"),
            size: requireUniform(gl, glitch.program, "uSize"),
            offset: requireUniform(gl, glitch.program, "uOffset"),
            noiseST: requireUniform(gl, glitch.program, "uNoiseST"),
            redGreen: requireUniform(gl, glitch.program, "uRedGreen"),
            blue: requireUniform(gl, glitch.program, "uBlue"),
            shapeTest: requireUniform(gl, glitch.program, "uShapeTest"),
            mask: requireUniform(gl, glitch.program, "uMask"),
            noise: requireUniform(gl, glitch.program, "uNoise"),
            grab: requireUniform(gl, glitch.program, "uGrab"),
        };
        const tmpLocations = {
            position: requireAttribute(gl, tmp.program, "aPosition"),
            uv: requireAttribute(gl, tmp.program, "aUnityUv"),
            scale: requireAttribute(gl, tmp.program, "aScale"),
            color: requireAttribute(gl, tmp.program, "aColor"),
            size: requireUniform(gl, tmp.program, "uSize"),
            offset: requireUniform(gl, tmp.program, "uOffset"),
            density: requireUniform(gl, tmp.program, "uDensity"),
            scaleXY: requireUniform(gl, tmp.program, "uScaleXY"),
            gradientScale: requireUniform(gl, tmp.program, "uGradientScale"),
            sharpness: requireUniform(gl, tmp.program, "uSharpness"),
            weightNormal: requireUniform(gl, tmp.program, "uWeightNormal"),
            weightBold: requireUniform(gl, tmp.program, "uWeightBold"),
            faceDilate: requireUniform(gl, tmp.program, "uFaceDilate"),
            ratioA: requireUniform(gl, tmp.program, "uRatioA"),
            outlineWidth: requireUniform(gl, tmp.program, "uOutlineWidth"),
            outlineSoftness: requireUniform(gl, tmp.program, "uOutlineSoftness"),
            vertexOffset: requireUniform(gl, tmp.program, "uVertexOffset"),
            atlas: requireUniform(gl, tmp.program, "uAtlas"),
            faceColor: requireUniform(gl, tmp.program, "uFaceColor"),
            outlineColor: requireUniform(gl, tmp.program, "uOutlineColor"),
            underlay: requireUniform(gl, tmp.program, "uUnderlay"),
            underlayColor: requireUniform(gl, tmp.program, "uUnderlayColor"),
            underlayDilate: requireUniform(gl, tmp.program, "uUnderlayDilate"),
            underlaySoftness: requireUniform(gl, tmp.program, "uUnderlaySoftness"),
            ratioC: requireUniform(gl, tmp.program, "uRatioC"),
            underlayOffset: requireUniform(gl, tmp.program, "uUnderlayOffset"),
            textureSize: requireUniform(gl, tmp.program, "uTextureSize"),
        };
        const drawSprite = (mesh: SwordTrainingPmaMesh, width: number, height: number, offsetX: number, offsetY: number) => {
            validateSpriteMesh(mesh);
            const texture = textures.get(mesh.texture);
            if (!texture?.loaded)
                throw new Error(`Omen frame used an unloaded texture: ${mesh.texture}`);
            gl.useProgram(sprite.program);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, texture.texture);
            gl.uniform1i(spriteLocations.texture, 0);
            bindFloatBuffer(gl, buffers[0], spriteLocations.position, mesh.positions, 2);
            bindFloatBuffer(gl, buffers[1], spriteLocations.uv, mesh.uvs, 2);
            bindIndices(gl, buffers[2], mesh.indices);
            const color = swordTrainingColor32(mesh.color);
            gl.uniform4f(spriteLocations.color, color[0], color[1], color[2], color[3]);
            gl.uniform2f(spriteLocations.size, width, height);
            gl.uniform2f(spriteLocations.offset, offsetX, offsetY);
            gl.uniform1i(spriteLocations.particleShader, mesh.particleCustom ? 1 : 0);
            gl.uniform1i(spriteLocations.sourceAlphaAdditive, mesh.sourceAlphaAdditive ? 1 : 0);
            gl.uniform1f(spriteLocations.additiveMultiplier, mesh.sourceAlphaAdditiveMultiplier ?? 1);
            gl.uniform1i(spriteLocations.straightAlpha, mesh.sourceStraightAlpha ? 1 : 0);
            const custom = mesh.particleCustom ?? [0, 0];
            const tint = mesh.particleTint ?? [1, 1, 1, 1];
            gl.uniform2f(spriteLocations.particleCustom, custom[0], custom[1]);
            gl.uniform4f(spriteLocations.particleTint, tint[0], tint[1], tint[2], tint[3]);
            gl.drawElements(gl.TRIANGLES, mesh.indices.length, gl.UNSIGNED_SHORT, 0);
        };
        const drawGlitch = (draw: StoryOmenGlitchDraw, width: number, height: number, offsetX: number, offsetY: number) => {
            validateGlitchMesh(draw);
            const mask = textures.get(draw.maskTexture), noise = textures.get(draw.noiseTexture);
            if (!mask?.loaded || !noise?.loaded)
                throw new Error(`Omen GlitchUI used an unloaded texture: ${draw.id}`);
            if (!grabTexture)
                throw new Error("Omen GrabPass texture was released");
            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, grabTexture);
            if (grabWidth !== canvas.width || grabHeight !== canvas.height) {
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
                grabWidth = canvas.width;
                grabHeight = canvas.height;
            }
            gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, canvas.width, canvas.height);
            gl.useProgram(glitch.program);
            bindFloatBuffer(gl, buffers[0], glitchLocations.position, draw.positions, 2);
            bindFloatBuffer(gl, buffers[1], glitchLocations.uv, draw.unityUvs, 2);
            bindFloatBuffer(gl, buffers[3], glitchLocations.color, draw.colors, 4);
            bindIndices(gl, buffers[2], draw.indices);
            gl.uniform2f(glitchLocations.size, width, height);
            gl.uniform2f(glitchLocations.offset, offsetX, offsetY);
            gl.uniform4f(glitchLocations.noiseST, ...draw.noiseScaleOffset);
            gl.uniform4f(glitchLocations.redGreen, draw.channelOffsets[0], draw.channelOffsets[1], draw.channelOffsets[2], draw.channelOffsets[3]);
            gl.uniform2f(glitchLocations.blue, draw.channelOffsets[4], draw.channelOffsets[5]);
            gl.uniform1f(glitchLocations.shapeTest, draw.shapeTest);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, mask.texture);
            gl.uniform1i(glitchLocations.mask, 0);
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, noise.texture);
            gl.uniform1i(glitchLocations.noise, 1);
            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, grabTexture);
            gl.uniform1i(glitchLocations.grab, 2);
            gl.drawElements(gl.TRIANGLES, draw.indices.length, gl.UNSIGNED_SHORT, 0);
        };
        const drawTmp = (draw: StoryOmenTmpDraw, width: number, height: number, offsetX: number, offsetY: number) => {
            validateTmpDraw(draw);
            const atlas = textures.get(draw.material.atlasTexture);
            if (!atlas?.loaded)
                throw new Error(`Omen TMP used an unloaded atlas: ${draw.material.atlasTexture}`);
            const material = draw.material;
            gl.useProgram(tmp.program);
            bindFloatBuffer(gl, buffers[0], tmpLocations.position, draw.positions, 2);
            bindFloatBuffer(gl, buffers[1], tmpLocations.uv, draw.unityUvs, 2);
            bindFloatBuffer(gl, buffers[3], tmpLocations.scale, draw.scales, 1);
            bindFloatBuffer(gl, buffers[4], tmpLocations.color, draw.colors.map((value) => value / 255), 4);
            bindIndices(gl, buffers[2], draw.indices);
            gl.uniform2f(tmpLocations.size, width, height);
            gl.uniform2f(tmpLocations.offset, offsetX, offsetY);
            gl.uniform2f(tmpLocations.density, canvas.width / width, canvas.height / height);
            gl.uniform2f(tmpLocations.scaleXY, material.scaleX, material.scaleY);
            gl.uniform1f(tmpLocations.gradientScale, material.gradientScale);
            gl.uniform1f(tmpLocations.sharpness, material.sharpness);
            gl.uniform1f(tmpLocations.weightNormal, material.weightNormal);
            gl.uniform1f(tmpLocations.weightBold, material.weightBold);
            gl.uniform1f(tmpLocations.faceDilate, material.faceDilate);
            gl.uniform1f(tmpLocations.ratioA, material.scaleRatioA);
            gl.uniform1f(tmpLocations.outlineWidth, material.outlineWidth);
            gl.uniform1f(tmpLocations.outlineSoftness, material.outlineSoftness);
            gl.uniform2f(tmpLocations.vertexOffset, material.vertexOffsetX, material.vertexOffsetY);
            gl.uniform4f(tmpLocations.faceColor, ...material.faceColor);
            gl.uniform4f(tmpLocations.outlineColor, ...material.outlineColor);
            gl.uniform1i(tmpLocations.underlay, material.keywords.includes("UNDERLAY_ON") ? 1 : 0);
            gl.uniform4f(tmpLocations.underlayColor, ...material.underlayColor);
            gl.uniform1f(tmpLocations.underlayDilate, material.underlayDilate);
            gl.uniform1f(tmpLocations.underlaySoftness, material.underlaySoftness);
            gl.uniform1f(tmpLocations.ratioC, material.scaleRatioC);
            gl.uniform2f(tmpLocations.underlayOffset, material.underlayOffsetX, material.underlayOffsetY);
            gl.uniform2f(tmpLocations.textureSize, material.textureWidth, material.textureHeight);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, atlas.texture);
            gl.uniform1i(tmpLocations.atlas, 0);
            gl.drawElements(gl.TRIANGLES, draw.indices.length, gl.UNSIGNED_SHORT, 0);
        };
        function render(timestamp: number) {
            animationFrame = 0;
            if (cancelled || errorMessage)
                return;
            try {
                const current = latest.current;
                const referenceWidth = current.source.referenceWidth;
                const referenceHeight = current.source.referenceHeight;
                if (!(referenceWidth > 0 && referenceHeight > 0))
                    throw new Error("Invalid Omen native canvas size");
                let width = referenceWidth;
                let height = referenceHeight;
                let offsetX = 0;
                let offsetY = 0;
                if (current.canvasLayout === "client-fullscreen") {
                    const cssWidth = Math.max(canvasElement.clientWidth, 1);
                    const cssHeight = Math.max(canvasElement.clientHeight, 1);
                    const canvasScale = Math.min(cssWidth / referenceWidth, cssHeight / referenceHeight);
                    width = cssWidth / canvasScale;
                    height = cssHeight / canvasScale;
                    offsetX = (width - referenceWidth) / 2;
                    offsetY = (height - referenceHeight) / 2;
                }
                for (const texture of current.source.preloadTextures)
                    ensureTexture(texture);
                const waiting = current.source.preloadTextures.some((texture) => !textures.get(texture.path)?.loaded);
                const resolution = window.devicePixelRatio || 1;
                let matrix = new DOMMatrixReadOnly();
                for (let node: HTMLElement | null = canvasElement; node; node = node.parentElement) {
                    const transform = window.getComputedStyle(node).transform;
                    if (transform !== "none")
                        matrix = new DOMMatrixReadOnly(transform).multiply(matrix);
                }
                const requestedWidth = Math.max(1, Math.ceil(canvasElement.clientWidth * Math.hypot(matrix.m11, matrix.m12) * resolution));
                const requestedHeight = Math.max(1, Math.ceil(canvasElement.clientHeight * Math.hypot(matrix.m21, matrix.m22) * resolution));
                const hardwareScale = Math.min(1, maximumTexture / requestedWidth, maximumTexture / requestedHeight, maximumViewport[0] / requestedWidth, maximumViewport[1] / requestedHeight);
                const pixelWidth = Math.max(1, Math.floor(requestedWidth * hardwareScale));
                const pixelHeight = Math.max(1, Math.floor(requestedHeight * hardwareScale));
                if (canvasElement.width !== pixelWidth || canvasElement.height !== pixelHeight) {
                    canvasElement.width = pixelWidth;
                    canvasElement.height = pixelHeight;
                    grabWidth = 0;
                    grabHeight = 0;
                }
                glContext.viewport(0, 0, canvasElement.width, canvasElement.height);
                glContext.clear(glContext.COLOR_BUFFER_BIT);
                canvasElement.dataset.omenNativeRasterRequested = `${requestedWidth}x${requestedHeight}`;
                canvasElement.dataset.omenNativeRasterHardwareScale = String(hardwareScale);
                canvasElement.dataset.omenNativeCanvasLayout = current.canvasLayout;
                canvasElement.dataset.omenNativeLogicalViewport = `${width},${height}`;
                canvasElement.dataset.omenNativeReferenceOffset = `${offsetX},${offsetY}`;
                if (!current.active || waiting) {
                    if (current.active && current.motionPolicy === "native")
                        schedule();
                    return;
                }
                const elapsed = current.motionPolicy === "freeze-first-native-frame"
                    ? 0
                    : Math.max(0, (timestamp - startedAt.current) / 1000);
                const transitionElapsedSeconds = Math.max(0, (timestamp - interaction.current.changedAt) / 1000);
                const releasedTargets = interaction.current.releases
                    .map((release) => ({
                    target: release.target,
                    pressElapsedSeconds: release.pressElapsedSeconds,
                    releaseElapsedSeconds: Math.max(0, (timestamp - release.releasedAt) / 1000),
                }))
                    .filter((release) => release.releaseElapsedSeconds <= current.source.maximumInteractionTransitionSeconds);
                const frame = storyOmenSceneFrameAt(current.source, elapsed, current.motionPolicy, {
                    pressedTarget: interaction.current.current,
                    previousPressedTarget: interaction.current.previous,
                    transitionElapsedSeconds,
                    previousPressElapsedSeconds: interaction.current.previousPressElapsedSeconds,
                    releasedTargets,
                });
                for (const command of frame.commands) {
                    if (command.clipRect)
                        throw new Error(`Unsupported Omen clip command escaped its locked-only branch: ${command.sourcePath}`);
                    if (command.kind === "mesh") {
                        drawSprite(command.mesh, width, height, offsetX, offsetY);
                    }
                    else if (command.kind === "tmp") {
                        drawTmp(command.draw, width, height, offsetX, offsetY);
                    }
                    else {
                        drawGlitch(command.draw, width, height, offsetX, offsetY);
                    }
                }
                canvasElement.dataset.omenNativeSurface = current.source.surface;
                canvasElement.dataset.omenNativeContinuity = current.source.continuity;
                canvasElement.dataset.omenNativeElapsedSeconds = String(frame.elapsedSeconds);
                canvasElement.dataset.omenNativeCommandCount = String(frame.commands.length);
                canvasElement.dataset.omenNativeInteractionReleases = String(releasedTargets.length);
                if (!ready) {
                    ready = true;
                    setStatus("ready");
                    current.onReady?.();
                }
                if (current.motionPolicy === "native" ||
                    transitionElapsedSeconds < current.source.maximumInteractionTransitionSeconds)
                    schedule();
            }
            catch (error) {
                fail(error);
            }
        }
        startedAt.current = performance.now();
        renderRef.current = schedule;
        schedule();
        const resize = () => schedule();
        window.addEventListener("resize", resize);
        const contextLost = (event: Event) => { event.preventDefault(); fail("The exact Omen WebGL context was lost."); };
        canvas.addEventListener("webglcontextlost", contextLost);
        return () => {
            cancelled = true;
            renderRef.current = null;
            if (animationFrame)
                cancelAnimationFrame(animationFrame);
            window.removeEventListener("resize", resize);
            canvas.removeEventListener("webglcontextlost", contextLost);
            for (const entry of textures.values()) {
                entry.image.onload = null;
                entry.image.onerror = null;
                gl.deleteTexture(entry.texture);
            }
            if (grabTexture)
                gl.deleteTexture(grabTexture);
            for (const buffer of buffers)
                gl.deleteBuffer(buffer);
            for (const compiled of programs) {
                for (const shader of compiled.shaders)
                    gl.deleteShader(shader);
                gl.deleteProgram(compiled.program);
            }
        };
    }, []);
    useEffect(() => {
        const now = performance.now();
        startedAt.current = now;
        interaction.current = {
            current: latest.current.pressedTarget,
            previous: null,
            changedAt: now,
            previousPressElapsedSeconds: 0,
            releases: [],
        };
        renderRef.current?.();
    }, [activationKey]);
    useEffect(() => {
        if (interaction.current.current !== pressedTarget) {
            const now = performance.now();
            const previousTarget = interaction.current.current;
            const previousPressElapsedSeconds = previousTarget === null
                ? 0
                : Math.max(0, (now - interaction.current.changedAt) / 1000);
            const releases = interaction.current.releases.filter((release) => now - release.releasedAt <= latest.current.source.maximumInteractionTransitionSeconds * 1000 &&
                release.target !== pressedTarget &&
                release.target !== previousTarget);
            if (previousTarget !== null) {
                releases.push({
                    target: previousTarget,
                    pressElapsedSeconds: previousPressElapsedSeconds,
                    releasedAt: now,
                });
            }
            interaction.current = {
                current: pressedTarget,
                previous: previousTarget,
                changedAt: now,
                previousPressElapsedSeconds,
                releases,
            };
        }
        renderRef.current?.();
    }, [pressedTarget]);
    return <canvas ref={canvasRef} className={className} aria-hidden="true" data-story-omen-native-status={status} data-story-omen-native-css-fallback="none" style={{ display: "block", width: "100%", height: "100%", pointerEvents: "none" }}/>;
}
