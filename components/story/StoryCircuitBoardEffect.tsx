"use client";
import { deploymentUrl } from "@/lib/deployment";
import { useEffect, useRef } from "react";
import type { StoryCircuitBoardCurve, StoryCircuitMaterialProperty, StoryCircuitTexture, StoryFxmCurveKey, StoryGameObjectEffect, } from "@/lib/storyPlayback";
const VERTEX_SHADER = `
attribute vec2 a_position;
attribute vec2 a_uv;
uniform vec2 u_scale;
varying highp vec2 v_uv;

void main() {
  v_uv = a_uv;
  gl_Position = vec4(a_position * u_scale, 0.0, 1.0);
}
`;
// StudioBside-Custom-HorizonCircuitBoard의 D3D11 pixel program을
// 무키워드 단일 패스 GLSL로 옮긴 것이다. 재질의 채널 선택과 두 합성식,
// 방사형 mask/shockwave 계산 순서를 원본 명령 순서대로 유지한다.
const BOARD_FRAGMENT_SHADER = `
precision highp float;

varying highp vec2 v_uv;
uniform sampler2D u_base_texture;
uniform sampler2D u_emissive_texture;
uniform vec4 u_tint_color;
uniform vec4 u_base_color;
uniform vec4 u_symbol_color;
uniform vec4 u_emissive_a_color;
uniform vec4 u_emissive_b_color;
uniform float u_intensity;
uniform float u_base_amount;
uniform float u_base_channel;
uniform float u_symbol_amount;
uniform float u_symbol_channel;
uniform float u_emissive_a_amount;
uniform float u_emissive_a_intensity;
uniform float u_emissive_a_channel;
uniform float u_shockwave_amount;
uniform vec2 u_shockwave_position;
uniform float u_shockwave_offset;
uniform float u_shockwave_density;
uniform float u_emissive_b_amount;
uniform float u_emissive_b_intensity;
uniform float u_emissive_b_channel;
uniform float u_mask_amount;
uniform float u_mask_hardness;

vec4 channel_value(vec4 sampled, float channel) {
  if (channel < 0.5) return sampled;
  if (channel < 1.5) return vec4(sampled.r);
  if (channel < 2.5) return vec4(sampled.g);
  if (channel < 3.5) return vec4(sampled.b);
  return vec4(sampled.a);
}

void main() {
  vec3 emissive_a = channel_value(
    texture2D(u_emissive_texture, v_uv), u_emissive_a_channel
  ).rgb;
  emissive_a *= u_emissive_a_amount * u_emissive_a_color.rgb;
  emissive_a *= 2.0 * u_emissive_a_intensity + 1.0;

  vec2 wave_delta = u_shockwave_position - v_uv;
  float wave = max(sin(
    dot(wave_delta, wave_delta) * u_shockwave_density + u_shockwave_offset
  ), 0.0);
  emissive_a *= mix(1.0, wave, u_shockwave_amount);

  vec3 symbol = channel_value(
    texture2D(u_emissive_texture, v_uv), u_symbol_channel
  ).rgb;
  symbol *= u_symbol_amount * u_symbol_color.rgb;
  vec3 symbol_squared = symbol * symbol;
  vec3 combined = emissive_a * (emissive_a - symbol_squared) + symbol_squared;

  vec3 emissive_b = channel_value(
    texture2D(u_emissive_texture, v_uv), u_emissive_b_channel
  ).rgb;
  emissive_b *= u_emissive_b_amount * u_emissive_b_color.rgb;
  emissive_b *= 2.0 * u_emissive_b_intensity + 1.0;

  float radial_distance = distance(v_uv, vec2(0.5));
  float half_mask = max(u_mask_amount, 0.0) * 0.5;
  float mask_ratio = clamp(
    abs(radial_distance - half_mask) / max(half_mask, 0.000001), 0.0, 1.0
  );
  float radial_mask = 1.0 - pow(mask_ratio, u_mask_hardness);
  vec3 masked_b = emissive_b * radial_mask;
  combined = combined + masked_b * (masked_b - combined);

  vec4 base_sample = channel_value(
    texture2D(u_base_texture, v_uv), u_base_channel
  );
  vec4 base = mix(vec4(1.0), base_sample * u_base_color, u_base_amount);
  base.rgb += combined;
  gl_FragColor = base * u_tint_color * u_intensity;
}
`;
// SB-FX-PMA-MainDs-ColorRamp-Mask의 실제 CIRCUIT_BOARD 고정 분기
// (UV0, RGBA, MaskRef=R, PMA)를 원본 D3D11 순서로 줄인 패스다.
const SHOCK_FRAGMENT_SHADER = `
precision highp float;

varying highp vec2 v_uv;
uniform sampler2D u_main_texture;
uniform sampler2D u_distortion_texture;
uniform sampler2D u_mask_texture;
uniform sampler2D u_ramp_texture;
uniform vec4 u_main_st;
uniform vec4 u_distortion_st;
uniform vec4 u_mask_st;
uniform vec4 u_tint_color;
uniform vec4 u_main_color;
uniform float u_intensity;
uniform float u_main_amount;
uniform float u_distortion_amount;
uniform vec2 u_distortion_strength;
uniform float u_color_ramp_amount;
uniform float u_ramp_range;
uniform float u_ramp_offset;
uniform float u_input_black;
uniform float u_input_white;
uniform float u_regrading;
uniform float u_mask_amount;

void main() {
  vec2 distortion_uv = v_uv * u_distortion_st.xy + u_distortion_st.zw;
  float distortion = texture2D(u_distortion_texture, distortion_uv).r;
  distortion = clamp(distortion, 0.0, 1.0) * u_distortion_amount;
  vec2 main_uv = v_uv * u_main_st.xy + u_main_st.zw;
  main_uv -= distortion * u_distortion_strength;

  vec4 sampled = texture2D(u_main_texture, main_uv);
  vec4 result = mix(vec4(1.0), sampled * u_main_color, u_main_amount);
  vec3 clamped_rgb = clamp(result.rgb, vec3(u_input_black), vec3(u_input_white));
  float luminance = dot(clamped_rgb, vec3(0.300000012, 0.589999974, 0.109999999));
  vec3 ramp = texture2D(
    u_ramp_texture,
    vec2(luminance / clamp(u_ramp_range, 0.01, 5.0), 1.0 - u_ramp_offset)
  ).rgb;
  vec3 graded = mix(clamped_rgb * ramp, ramp, u_regrading);
  result.rgb = mix(clamped_rgb, graded, u_color_ramp_amount);

  float mask = texture2D(u_mask_texture, v_uv * u_mask_st.xy + u_mask_st.zw).r;
  result = mix(result, result * mask, u_mask_amount);
  float alpha = result.a * u_tint_color.a * u_intensity;
  gl_FragColor = vec4(result.rgb * u_tint_color.rgb * u_tint_color.a * u_intensity, alpha);
}
`;
const SPRITE_FRAGMENT_SHADER = `
precision highp float;
varying highp vec2 v_uv;
uniform sampler2D u_texture;
uniform vec4 u_color;

void main() {
  gl_FragColor = texture2D(u_texture, v_uv) * u_color;
}
`;
const SOLID_FRAGMENT_SHADER = `
precision highp float;
uniform vec4 u_color;

void main() {
  gl_FragColor = u_color;
}
`;
type Props = {
    effect: StoryGameObjectEffect;
    processId: string;
    paused: boolean;
    className?: string;
};
const SHOCK_PATH = "AB_UI_NKM_UI_CUTSCEN_FX_CIRCUIT_BOARD/RENDER_TEXTURE/RENDER_STAGE/SHOCKWAVE";
function loadImage(path: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.decoding = "async";
        image.addEventListener("load", () => resolve(image), { once: true });
        image.addEventListener("error", () => reject(new Error(`회로판 이미지를 불러오지 못했습니다: ${path}`)), { once: true });
        image.src = deploymentUrl(path);
    });
}
function sampleKeys(keys: StoryFxmCurveKey[], time: number, fallback: number) {
    if (!keys.length)
        return fallback;
    if (time <= keys[0].time)
        return keys[0].value;
    const last = keys[keys.length - 1];
    if (time >= last.time)
        return last.value;
    for (let index = 1; index < keys.length; index += 1) {
        const right = keys[index];
        if (time > right.time)
            continue;
        const left = keys[index - 1];
        const span = right.time - left.time;
        const progress = span > 0 ? (time - left.time) / span : 1;
        const p2 = progress * progress;
        const p3 = p2 * progress;
        return ((2 * p3 - 3 * p2 + 1) * left.value +
            (p3 - 2 * p2 + progress) * span * Number(left.outSlope || 0) +
            (-2 * p3 + 3 * p2) * right.value +
            (p3 - p2) * span * Number(right.inSlope || 0));
    }
    return last.value;
}
function sampleGradient<T extends number | [
    number,
    number,
    number
]>(keys: Array<{
    time: number;
    value: T;
}>, progress: number, fallback: T) {
    if (!keys.length)
        return fallback;
    if (progress <= keys[0].time)
        return keys[0].value;
    for (let index = 1; index < keys.length; index += 1) {
        const right = keys[index];
        if (progress > right.time)
            continue;
        const left = keys[index - 1];
        const amount = (progress - left.time) / Math.max(right.time - left.time, 1e-7);
        if (Array.isArray(left.value) && Array.isArray(right.value)) {
            const rightColor = right.value as [
                number,
                number,
                number
            ];
            return left.value.map((value, channel) => value + (rightColor[channel] - value) * amount) as T;
        }
        return ((left.value as number) +
            ((right.value as number) - (left.value as number)) * amount) as T;
    }
    return keys.at(-1)?.value ?? fallback;
}
function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
    const shader = gl.createShader(type);
    if (!shader)
        throw new Error("회로판 WebGL 셰이더를 만들지 못했습니다.");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const detail = gl.getShaderInfoLog(shader) ?? "알 수 없는 셰이더 오류";
        gl.deleteShader(shader);
        throw new Error(detail);
    }
    return shader;
}
function createProgram(gl: WebGLRenderingContext, fragmentSource: string, resources: Array<WebGLProgram | WebGLShader | WebGLBuffer | WebGLTexture>) {
    const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    if (!program)
        throw new Error("회로판 WebGL 프로그램을 만들지 못했습니다.");
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) ?? "회로판 WebGL 링크 오류");
    }
    resources.push(vertex, fragment, program);
    return program;
}
function createTexture(gl: WebGLRenderingContext, image: HTMLImageElement, source?: StoryCircuitTexture) {
    const texture = gl.createTexture();
    if (!texture)
        throw new Error("회로판 WebGL 텍스처를 만들지 못했습니다.");
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    const wrap = (value?: number) => value === 1 ? gl.CLAMP_TO_EDGE : gl.REPEAT;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap(source?.wrapU));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap(source?.wrapV));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return texture;
}
function uniform(gl: WebGLRenderingContext, program: WebGLProgram, name: string) {
    const location = gl.getUniformLocation(program, name);
    if (location === null)
        throw new Error(`회로판 WebGL uniform이 없습니다: ${name}`);
    return location;
}
function curveOf(curves: StoryCircuitBoardCurve[], path: string, attribute: string) {
    return curves.find((curve) => curve.path === path && curve.attribute === attribute);
}
function sampleMaterialProperty(curves: StoryCircuitBoardCurve[], path: string, name: string, channel: "r" | "g" | "b" | "a" | null, time: number, fallback: number) {
    const attribute = `material.${name}${channel ? `.${channel}` : ""}`;
    const curve = curveOf(curves, path, attribute);
    return curve ? sampleKeys(curve.keys, time, fallback) : fallback;
}
function evaluateVectorProperties(properties: StoryCircuitMaterialProperty[], name: string, progress: number, fallback: [
    number,
    number,
    number,
    number
]) {
    const value: [
        number,
        number,
        number,
        number
    ] = [...fallback];
    for (const property of properties) {
        if (property.name !== name)
            continue;
        if (property.mode === 2) {
            value.splice(0, 4, ...property.constant);
        }
        else if (property.mode === 6) {
            value[2] += sampleKeys(property.curveZ, progress, 0) * property.constant[2];
            value[3] += sampleKeys(property.curveW, progress, 0) * property.constant[3];
        }
    }
    return value;
}
function configureGeometry(gl: WebGLRenderingContext, program: WebGLProgram, positionBuffer: WebGLBuffer, uvBuffer: WebGLBuffer) {
    const position = gl.getAttribLocation(program, "a_position");
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const uv = gl.getAttribLocation(program, "a_uv");
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.enableVertexAttribArray(uv);
    gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 0, 0);
}
function bindTexture(gl: WebGLRenderingContext, program: WebGLProgram, name: string, unit: number, texture: WebGLTexture) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(uniform(gl, program, name), unit);
}
export default function StoryCircuitBoardEffect({ effect, processId, paused, className, }: Props) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const pausedRef = useRef(paused);
    useEffect(() => {
        pausedRef.current = paused;
    }, [paused]);
    useEffect(() => {
        const source = effect.circuitBoard;
        const canvas = canvasRef.current;
        if (!source || !canvas)
            return;
        const gl = canvas.getContext("webgl", {
            alpha: true,
            antialias: false,
            depth: false,
            premultipliedAlpha: false,
            preserveDrawingBuffer: false,
        });
        if (!gl) {
            canvas.dataset.storyCircuitAssetsReady = "false";
            return;
        }
        let disposed = false;
        let animationFrame = 0;
        let elapsed = 0;
        let previousTime = performance.now();
        const resources: Array<WebGLProgram | WebGLShader | WebGLBuffer | WebGLTexture> = [];
        const textureSources = [
            source.base,
            source.emissive,
            source.core,
            source.shockwave.textures.main.path,
            source.shockwave.textures.distortion.path,
            source.shockwave.textures.mask.path,
            source.shockwave.textures.ramp.path,
        ];
        void Promise.all(textureSources.map(loadImage)).then((images) => {
            if (disposed)
                return;
            const boardProgram = createProgram(gl, BOARD_FRAGMENT_SHADER, resources);
            const shockProgram = createProgram(gl, SHOCK_FRAGMENT_SHADER, resources);
            const spriteProgram = createProgram(gl, SPRITE_FRAGMENT_SHADER, resources);
            const solidProgram = createProgram(gl, SOLID_FRAGMENT_SHADER, resources);
            const positionBuffer = gl.createBuffer();
            const uvBuffer = gl.createBuffer();
            if (!positionBuffer || !uvBuffer)
                throw new Error("회로판 WebGL 버퍼 오류");
            resources.push(positionBuffer, uvBuffer);
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
            gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]), gl.STATIC_DRAW);
            const textures = images.map((image, index) => createTexture(gl, image, index >= 3
                ? Object.values(source.shockwave.textures)[index - 3]
                : undefined));
            resources.push(...textures);
            const [baseTexture, emissiveTexture, coreTexture, mainTexture, distortionTexture, maskTexture, rampTexture] = textures;
            canvas.dataset.storyCircuitAssetsReady = "true";
            canvas.dataset.storyCircuitBoardShader = source.boardShader.programSha256;
            canvas.dataset.storyCircuitShockShader = source.shockwave.shader.programSha256;
            const clipOffsets: number[] = [];
            const sequenceDuration = source.clips.reduce((offset, clip) => {
                clipOffsets.push(offset);
                return offset + clip.duration;
            }, 0);
            const boardPath = "RENDER_STAGE/STAGE/CIRCUIT_BOARD_MAIN";
            const corePath = "RENDER_STAGE/STAGE/CORE";
            const floats = source.boardMaterial.floats;
            const colors = source.boardMaterial.colors;
            const shockFloats = source.shockwave.material.floats;
            const shockColors = source.shockwave.material.colors;
            const shockProperties = source.shockwave.materialEvaluator.properties;
            const visibleHeight = 2 * Math.tan(source.cameraFieldOfView * Math.PI / 360) * Math.abs(source.cameraZ);
            const aspect = source.renderWidth / source.renderHeight;
            const scaleForWorldSize = (worldSize: number): [
                number,
                number
            ] => {
                const halfY = worldSize / visibleHeight;
                return [halfY / aspect, halfY];
            };
            const render = (now: number) => {
                const delta = Math.max(now - previousTime, 0) / 1000;
                previousTime = now;
                if (!pausedRef.current)
                    elapsed += delta;
                const animationTime = Math.min(elapsed, sequenceDuration);
                let clipIndex = source.clips.length - 1;
                for (let index = 0; index < source.clips.length; index += 1) {
                    if (animationTime <= clipOffsets[index] + source.clips[index].duration) {
                        clipIndex = index;
                        break;
                    }
                }
                const clip = source.clips[clipIndex];
                const clipTime = animationTime - clipOffsets[clipIndex];
                const scalar = (name: string, fallback: number) => sampleMaterialProperty(clip.curves, boardPath, name, null, clipTime, fallback);
                const color = (name: string, fallback: [
                    number,
                    number,
                    number,
                    number
                ]): [
                    number,
                    number,
                    number,
                    number
                ] => [
                    sampleMaterialProperty(clip.curves, boardPath, name, "r", clipTime, fallback[0]),
                    sampleMaterialProperty(clip.curves, boardPath, name, "g", clipTime, fallback[1]),
                    sampleMaterialProperty(clip.curves, boardPath, name, "b", clipTime, fallback[2]),
                    sampleMaterialProperty(clip.curves, boardPath, name, "a", clipTime, fallback[3]),
                ];
                gl.viewport(0, 0, canvas.width, canvas.height);
                gl.clearColor(0, 0, 0, 0);
                gl.clear(gl.COLOR_BUFFER_BIT);
                gl.disable(gl.DEPTH_TEST);
                gl.enable(gl.BLEND);
                gl.useProgram(boardProgram);
                configureGeometry(gl, boardProgram, positionBuffer, uvBuffer);
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
                gl.uniform2fv(uniform(gl, boardProgram, "u_scale"), scaleForWorldSize(source.boardScale));
                bindTexture(gl, boardProgram, "u_base_texture", 0, baseTexture);
                bindTexture(gl, boardProgram, "u_emissive_texture", 1, emissiveTexture);
                gl.uniform4fv(uniform(gl, boardProgram, "u_tint_color"), color("_TintColor", colors._TintColor));
                gl.uniform4fv(uniform(gl, boardProgram, "u_base_color"), color("_BaseColor", colors._BaseColor));
                gl.uniform4fv(uniform(gl, boardProgram, "u_symbol_color"), color("_EmissiveSymbolColor", colors._EmissiveSymbolColor));
                gl.uniform4fv(uniform(gl, boardProgram, "u_emissive_a_color"), colors._EmissiveAColor);
                gl.uniform4fv(uniform(gl, boardProgram, "u_emissive_b_color"), colors._EmissiveBColor);
                gl.uniform1f(uniform(gl, boardProgram, "u_intensity"), floats._Intensity);
                gl.uniform1f(uniform(gl, boardProgram, "u_base_amount"), floats._BaseAmount);
                gl.uniform1f(uniform(gl, boardProgram, "u_base_channel"), floats._BaseChannel);
                gl.uniform1f(uniform(gl, boardProgram, "u_symbol_amount"), scalar("_EmissiveSymbolAmount", floats._EmissiveSymbolAmount));
                gl.uniform1f(uniform(gl, boardProgram, "u_symbol_channel"), floats._EmissiveSymbolChannel);
                gl.uniform1f(uniform(gl, boardProgram, "u_emissive_a_amount"), scalar("_EmissiveAAmount", floats._EmissiveAAmount));
                gl.uniform1f(uniform(gl, boardProgram, "u_emissive_a_intensity"), floats._EmissiveAIntensity);
                gl.uniform1f(uniform(gl, boardProgram, "u_emissive_a_channel"), floats._EmissiveAChannel);
                gl.uniform1f(uniform(gl, boardProgram, "u_shockwave_amount"), floats._ShockwaveAAmount);
                gl.uniform2f(uniform(gl, boardProgram, "u_shockwave_position"), floats._ShockwaveAPositionX, floats._ShockwaveAPositionY);
                gl.uniform1f(uniform(gl, boardProgram, "u_shockwave_offset"), scalar("_ShockwaveAOffset", floats._ShockwaveAOffset));
                gl.uniform1f(uniform(gl, boardProgram, "u_shockwave_density"), floats._ShockwaveADensity);
                gl.uniform1f(uniform(gl, boardProgram, "u_emissive_b_amount"), scalar("_EmissiveBAmount", floats._EmissiveBAmount));
                gl.uniform1f(uniform(gl, boardProgram, "u_emissive_b_intensity"), floats._EmissiveBIntensity);
                gl.uniform1f(uniform(gl, boardProgram, "u_emissive_b_channel"), floats._EmissiveBChannel);
                gl.uniform1f(uniform(gl, boardProgram, "u_mask_amount"), scalar("_MaskAmount", floats._MaskAmount));
                gl.uniform1f(uniform(gl, boardProgram, "u_mask_hardness"), floats._MaskHardless);
                gl.drawArrays(gl.TRIANGLES, 0, 6);
                const coreCurve = curveOf(clip.curves, corePath, "typetree_2526845255");
                const coreAlpha = coreCurve ? sampleKeys(coreCurve.keys, clipTime, 0) : 0;
                if (coreAlpha > 0) {
                    const coreWorldSize = images[2].naturalHeight / 100 * source.coreScale;
                    gl.useProgram(spriteProgram);
                    configureGeometry(gl, spriteProgram, positionBuffer, uvBuffer);
                    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
                    gl.uniform2fv(uniform(gl, spriteProgram, "u_scale"), scaleForWorldSize(coreWorldSize));
                    bindTexture(gl, spriteProgram, "u_texture", 0, coreTexture);
                    gl.uniform4f(uniform(gl, spriteProgram, "u_color"), 1, 1, 1, coreAlpha);
                    gl.drawArrays(gl.TRIANGLES, 0, 6);
                }
                const shockStart = source.triggerDelays[SHOCK_PATH];
                const shockElapsed = elapsed - shockStart;
                if (shockElapsed >= 0 && shockElapsed <= source.shockwave.duration) {
                    const sourceTime = shockElapsed * source.shockwave.timeScale;
                    const progress = Math.min(sourceTime / source.shockwave.sourceDuration, 1);
                    const scale = sampleKeys(source.shockwave.scaleCurve, progress, 1);
                    const mainBase = source.shockwave.material.textures._MainTex;
                    const distortionBase = source.shockwave.material.textures._MainDs;
                    const maskBase = source.shockwave.material.textures._Mask;
                    const mainSt = evaluateVectorProperties(shockProperties, "_MainTex_ST", progress, [...mainBase.scale, ...mainBase.offset]);
                    const distortionSt = evaluateVectorProperties(shockProperties, "_MainDs_ST", progress, [...distortionBase.scale, ...distortionBase.offset]);
                    const tintProperty = shockProperties.find((property) => property.name === "_TintColor" && property.mode === 10);
                    const tintRgb = sampleGradient(tintProperty?.gradient.colors ?? [], progress, [1, 1, 1] as [
                        number,
                        number,
                        number
                    ]);
                    const tintAlpha = sampleGradient(tintProperty?.gradient.alphas ?? [], progress, 1);
                    gl.useProgram(shockProgram);
                    configureGeometry(gl, shockProgram, positionBuffer, uvBuffer);
                    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
                    gl.uniform2fv(uniform(gl, shockProgram, "u_scale"), scaleForWorldSize(source.shockwave.localScale * source.shockwave.scaleFactor * scale));
                    bindTexture(gl, shockProgram, "u_main_texture", 0, mainTexture);
                    bindTexture(gl, shockProgram, "u_distortion_texture", 1, distortionTexture);
                    bindTexture(gl, shockProgram, "u_mask_texture", 2, maskTexture);
                    bindTexture(gl, shockProgram, "u_ramp_texture", 3, rampTexture);
                    gl.uniform4fv(uniform(gl, shockProgram, "u_main_st"), mainSt);
                    gl.uniform4fv(uniform(gl, shockProgram, "u_distortion_st"), distortionSt);
                    gl.uniform4f(uniform(gl, shockProgram, "u_mask_st"), ...maskBase.scale, ...maskBase.offset);
                    gl.uniform4f(uniform(gl, shockProgram, "u_tint_color"), ...tintRgb, tintAlpha);
                    gl.uniform4fv(uniform(gl, shockProgram, "u_main_color"), shockColors._MainTexColor);
                    gl.uniform1f(uniform(gl, shockProgram, "u_intensity"), shockFloats._Intensity);
                    gl.uniform1f(uniform(gl, shockProgram, "u_main_amount"), shockFloats._MainTexAmount);
                    gl.uniform1f(uniform(gl, shockProgram, "u_distortion_amount"), shockFloats._MainDsAmount);
                    gl.uniform2f(uniform(gl, shockProgram, "u_distortion_strength"), shockFloats._MainDsU, shockFloats._MainDsV);
                    gl.uniform1f(uniform(gl, shockProgram, "u_color_ramp_amount"), shockFloats._ColorRampAmount);
                    gl.uniform1f(uniform(gl, shockProgram, "u_ramp_range"), shockFloats._RampRange);
                    gl.uniform1f(uniform(gl, shockProgram, "u_ramp_offset"), shockFloats._RampOffset);
                    gl.uniform1f(uniform(gl, shockProgram, "u_input_black"), shockFloats._InputBlack);
                    gl.uniform1f(uniform(gl, shockProgram, "u_input_white"), shockFloats._InputWhite);
                    gl.uniform1f(uniform(gl, shockProgram, "u_regrading"), shockFloats._ReGrading);
                    gl.uniform1f(uniform(gl, shockProgram, "u_mask_amount"), shockFloats._MaskAmount);
                    gl.drawArrays(gl.TRIANGLES, 0, 6);
                }
                const panelCurve = curveOf(clip.curves, "Panel", "script_304273561");
                const panelAlpha = panelCurve ? sampleKeys(panelCurve.keys, clipTime, 0) : 0;
                if (panelAlpha > 0) {
                    gl.useProgram(solidProgram);
                    configureGeometry(gl, solidProgram, positionBuffer, uvBuffer);
                    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
                    gl.uniform2f(uniform(gl, solidProgram, "u_scale"), 1, 1);
                    gl.uniform4f(uniform(gl, solidProgram, "u_color"), 1, 1, 1, panelAlpha);
                    gl.drawArrays(gl.TRIANGLES, 0, 6);
                }
                canvas.dataset.storyCircuitClip = clip.name;
                canvas.dataset.storyCircuitElapsed = elapsed.toFixed(3);
                canvas.dataset.storyCircuitPanelAlpha = panelAlpha.toFixed(3);
                canvas.dataset.storyCircuitShockActive = String(shockElapsed >= 0 && shockElapsed <= source.shockwave.duration);
                if (!disposed && elapsed < effect.duration) {
                    animationFrame = window.requestAnimationFrame(render);
                }
            };
            animationFrame = window.requestAnimationFrame(render);
        }).catch((error: unknown) => {
            canvas.dataset.storyCircuitAssetsReady = "false";
            canvas.dataset.storyCircuitError = error instanceof Error ? error.message : String(error);
        });
        return () => {
            disposed = true;
            window.cancelAnimationFrame(animationFrame);
            for (const resource of resources) {
                if (resource instanceof WebGLTexture)
                    gl.deleteTexture(resource);
                else if (resource instanceof WebGLBuffer)
                    gl.deleteBuffer(resource);
                else if (resource instanceof WebGLProgram)
                    gl.deleteProgram(resource);
                else if (resource instanceof WebGLShader)
                    gl.deleteShader(resource);
            }
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
        };
    }, [effect, processId]);
    return (<canvas ref={canvasRef} className={className} width={1920} height={1080} data-story-circuit-assets-ready="pending" data-story-circuit-clip="" data-story-circuit-elapsed="0" data-story-circuit-shock-active="false" aria-hidden="true"/>);
}
