"use client";
import { deploymentUrl } from "@/lib/deployment";
import { useEffect, useRef } from "react";
import type { StoryFxmCurveKey, StoryFxmGradient, StoryFxmTransformNode, StoryWaveRenderStageMaterialProperty, StoryWaveRenderStageMeshEffect, } from "@/lib/storyPlayback";
import { getStorySpineBonePosition } from "./StorySpineActor";
const SOURCE_SHADERS = [
    "StudioBside/FX/SB-FX-PMA-MainDs-Mask-Dissolve",
    "StudioBside/FX/SB-FX-PMA-MainDs-Mask",
    "StudioBside/FX/SB-FX-PMA-MainDs-ColorRamp-Mask-Dissolve",
    "StudioBside/FX/SB-FX-PMA-MainDs-ColorRamp-Mask",
];
const VERTEX_SHADER = `
attribute vec2 a_position;
attribute vec2 a_uv;
uniform mat3 u_matrix;
varying highp vec2 v_uv;
void main() {
  vec3 pixel = u_matrix * vec3(a_position, 1.0);
  gl_Position = vec4(pixel.x / 960.0, pixel.y / 540.0, 0.0, 1.0);
  v_uv = a_uv;
}`;
// CMN_SHOCKWAVE_01의 고정 분기(MainDs, Mask, Soft Dissolve, PMA)만 재현한다.
const FRAGMENT_SHADER = `
precision highp float;
varying highp vec2 v_uv;
uniform sampler2D u_main;
uniform sampler2D u_distortion;
uniform sampler2D u_dissolve;
uniform sampler2D u_mask;
uniform sampler2D u_ramp;
uniform vec4 u_main_st;
uniform vec4 u_distortion_st;
uniform vec4 u_dissolve_st;
uniform vec4 u_mask_st;
uniform vec4 u_tint;
uniform float u_intensity;
uniform float u_blend_factor;
uniform float u_distortion_amount;
uniform vec2 u_distortion_axis;
uniform float u_mask_amount;
uniform float u_mask_ref;
uniform float u_mask_hardness;
uniform float u_mask_inner;
uniform float u_mask_outer;
uniform float u_mask_inverse;
uniform float u_dissolve_amount;
uniform int u_main_channel;
uniform int u_distortion_channel;
uniform int u_mask_channel;
uniform int u_dissolve_channel;
uniform int u_profile;
uniform float u_ramp_range;
uniform float u_ramp_offset;
uniform vec4 u_angles;
uniform vec4 u_raw_image_color;

vec2 transform_uv(vec2 uv, vec4 st, float angle_degrees) {
  float angle = radians(angle_degrees);
  float cosine = cos(angle);
  float sine = sin(angle);
  vec2 centered = uv - vec2(0.5);
  vec2 rotated = vec2(
    cosine * centered.x + sine * centered.y,
    -sine * centered.x + cosine * centered.y
  ) + vec2(0.5);
  return rotated * st.xy + st.zw;
}

float selected_channel(vec4 value, int channel) {
  if (channel == 1) return value.r;
  if (channel == 2) return value.g;
  if (channel == 3) return value.b;
  if (channel == 4) return value.a;
  return value.a;
}

float selected_scalar(vec4 value, int channel) {
  if (channel == 2) return value.g;
  if (channel == 3) return value.b;
  if (channel == 4) return value.a;
  if (channel >= 5) return 1.0 - value.a;
  return value.r;
}

void main() {
  vec2 distortion_uv = transform_uv(v_uv, u_distortion_st, u_angles.y);
  float distortion = clamp(
    selected_scalar(texture2D(u_distortion, distortion_uv), u_distortion_channel),
    0.0,
    1.0
  ) * u_distortion_amount;
  vec2 main_uv = transform_uv(v_uv, u_main_st, u_angles.x)
    - distortion * u_distortion_axis;
  vec4 main_sample = texture2D(u_main, main_uv);
  if (u_main_channel != 0) {
    float channel = selected_channel(main_sample, u_main_channel);
    main_sample = vec4(vec3(channel), channel);
  }
  vec2 mask_uv = transform_uv(v_uv, u_mask_st, u_angles.z);
  float mask_sample = selected_scalar(
    texture2D(u_mask, mask_uv),
    u_mask_channel
  );
  mask_sample = mix(mask_sample, 1.0 - mask_sample, u_mask_inverse);
  float mask = mix(1.0, mask_sample, u_mask_amount);
  if (u_profile == 3 && u_mask_ref < 0.5) {
    float midpoint = (u_mask_inner + u_mask_outer) * 0.5;
    float radius = length(vec2(0.5) - mask_uv);
    float ratio = clamp(
      abs(radius - midpoint) / max(u_mask_outer - midpoint, 0.000001),
      0.0,
      1.0
    );
    float procedural_mask = mix(
      1.0 - pow(ratio, u_mask_hardness),
      pow(ratio, u_mask_hardness),
      u_mask_inverse
    );
    mask = mix(1.0, procedural_mask, u_mask_amount);
  }
  float dissolve_noise = selected_scalar(
    texture2D(u_dissolve, transform_uv(v_uv, u_dissolve_st, u_angles.w)),
    u_dissolve_channel
  );
  float dissolve_ratio = clamp(
    1.0 - u_dissolve_amount / max(dissolve_noise, 0.000001),
    0.0,
    1.0
  );
  float visible = (u_profile == 1 || u_profile == 3)
    ? 1.0
    : dissolve_ratio * dissolve_ratio * (3.0 - 2.0 * dissolve_ratio);
  if (u_profile == 2 || u_profile == 3) {
    float luminance = dot(main_sample.rgb, vec3(0.300000012, 0.589999974, 0.109999999));
    float ramp_u = luminance / clamp(u_ramp_range, 0.01, 5.0);
    vec4 ramp = texture2D(u_ramp, vec2(ramp_u, 1.0 - u_ramp_offset));
    main_sample.rgb *= ramp.rgb;
  }
  float blend_factor = u_profile == 3 ? 1.0 : u_blend_factor;
  float alpha = main_sample.a * mask * visible * u_tint.a;
  vec3 rgb = main_sample.rgb * alpha * u_tint.rgb * u_intensity;
  gl_FragColor = vec4(
    rgb * u_raw_image_color.rgb,
    alpha * u_intensity * blend_factor * u_raw_image_color.a
  );
}`;
function sampleCurve(keys: StoryFxmCurveKey[], time: number) {
    if (!keys.length)
        return 0;
    if (time <= keys[0].time)
        return keys[0].value;
    for (let index = 1; index < keys.length; index += 1) {
        const right = keys[index];
        if (time > right.time)
            continue;
        const left = keys[index - 1];
        const duration = right.time - left.time;
        if (duration <= 0)
            return right.value;
        const progress = (time - left.time) / duration;
        const squared = progress * progress;
        const cubed = squared * progress;
        const leftSlope = Number(left.outSlope ?? 0);
        const rightSlope = Number(right.inSlope ?? 0);
        if (!Number.isFinite(leftSlope) || !Number.isFinite(rightSlope)) {
            return time < right.time ? left.value : right.value;
        }
        return ((2 * cubed - 3 * squared + 1) * left.value +
            (cubed - 2 * squared + progress) * leftSlope * duration +
            (-2 * cubed + 3 * squared) * right.value +
            (cubed - squared) * rightSlope * duration);
    }
    return keys.at(-1)?.value ?? 0;
}
function sampleGradient(gradient: StoryFxmGradient, progress: number) {
    const linear = <T extends number | [
        number,
        number,
        number
    ]>(keys: Array<{
        time: number;
        value: T;
    }>, fallback: T): T => {
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
    };
    const color = linear(gradient.colors, [1, 1, 1]);
    return [
        color[0],
        color[1],
        color[2],
        linear(gradient.alphas, 1),
    ] as [
        number,
        number,
        number,
        number
    ];
}
function propertiesOf(properties: StoryWaveRenderStageMaterialProperty[], name: string) {
    return properties.filter((property) => property.name === name);
}
function scalarValue(properties: StoryWaveRenderStageMaterialProperty[], name: string, fallback: number, progress: number) {
    let value = fallback;
    propertiesOf(properties, name).forEach((property) => {
        if (property.mode === 0 || property.mode === 11 || property.mode === 12 || property.mode === 13) {
            value = property.constant[0];
        }
        else if (property.mode === 1) {
            value = sampleCurve(property.curveX, progress) * property.constant[0];
        }
    });
    return value;
}
function vectorValue(properties: StoryWaveRenderStageMaterialProperty[], name: string, fallback: [
    number,
    number,
    number,
    number
], localTime: number, progress: number, randomUnit: number) {
    const value = [...fallback] as [
        number,
        number,
        number,
        number
    ];
    propertiesOf(properties, name).forEach((property) => {
        if (property.mode === 2) {
            value.splice(0, 4, ...property.constant);
        }
        else if (property.mode === 4) {
            value[0] = sampleCurve(property.curveX, progress) * property.constant[0];
            value[1] = sampleCurve(property.curveY, progress) * property.constant[1];
        }
        else if (property.mode === 5) {
            value[2] = property.random
                ? property.randomRange[0] + (property.randomRange[1] - property.randomRange[0]) * randomUnit
                : property.constant[2];
            value[3] = property.random
                ? property.randomRange[2] + (property.randomRange[3] - property.randomRange[2]) * ((randomUnit * 1.61803398875) % 1)
                : property.constant[3];
        }
        else if (property.mode === 6) {
            value[2] = sampleCurve(property.curveZ, progress) * property.constant[2];
            value[3] = sampleCurve(property.curveW, progress) * property.constant[3];
        }
        else if (property.mode === 17) {
            value[2] += property.time[2] * localTime * 0.1;
            value[3] += property.time[3] * localTime * 0.1;
        }
    });
    return value;
}
function tintValue(properties: StoryWaveRenderStageMaterialProperty[], fallback: [
    number,
    number,
    number,
    number
], progress: number) {
    const property = propertiesOf(properties, "_TintColor").find((candidate) => candidate.mode === 9 || candidate.mode === 10);
    if (property?.mode === 9 && property.color)
        return property.color;
    return property?.mode === 10
        ? sampleGradient(property.gradient, progress)
        : fallback;
}
function selectedMainTexture(properties: StoryWaveRenderStageMaterialProperty[]) {
    return propertiesOf(properties, "_MainTex").find((property) => property.mode === 28)?.texture ?? "main";
}
function stableUnit(value: string) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) / 0x100000000;
}
function transformMatrix(chain: StoryFxmTransformNode[], playerTime: number, spineInstanceId?: string) {
    let matrix = [1, 0, 0, 1, 0, 0];
    chain.forEach((node) => {
        let scaleX = node.scaleX;
        let scaleY = node.scaleY;
        const evaluator = node.evaluator;
        if (evaluator?.kind === "scale") {
            const progress = evaluator.duration > 0
                ? Math.min(Math.max((playerTime - evaluator.startTime) / evaluator.duration, 0), 1)
                : 1;
            const sampledX = sampleCurve(evaluator.curveX, progress) * evaluator.factorX;
            scaleX = sampledX;
            scaleY = evaluator.separateAxes
                ? sampleCurve(evaluator.curveY, progress) * evaluator.factorY
                : sampledX;
        }
        const bonePosition = node.spineBone && spineInstanceId
            ? getStorySpineBonePosition(spineInstanceId, node.spineBone)
            : null;
        const rotation = node.spineBoneRotation && bonePosition
            ? bonePosition.rotation
            : node.rotation;
        const radians = rotation * Math.PI / 180;
        const cosine = Math.cos(radians);
        const sine = Math.sin(radians);
        const right = [
            cosine * scaleX,
            sine * scaleX,
            -sine * scaleY,
            cosine * scaleY,
            node.spineBone ? bonePosition?.x ?? node.x : node.x,
            node.spineBone ? bonePosition?.y ?? node.y : node.y,
        ];
        const left = matrix;
        matrix = [
            left[0] * right[0] + left[2] * right[1],
            left[1] * right[0] + left[3] * right[1],
            left[0] * right[2] + left[2] * right[3],
            left[1] * right[2] + left[3] * right[3],
            left[0] * right[4] + left[2] * right[5] + left[4],
            left[1] * right[4] + left[3] * right[5] + left[5],
        ];
    });
    return new Float32Array([
        matrix[0], matrix[1], 0,
        matrix[2], matrix[3], 0,
        matrix[4], matrix[5], 1,
    ]);
}
function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
    const shader = gl.createShader(type);
    if (!shader)
        throw new Error("WAVE RenderTexture shader creation failed");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader) ?? "WAVE RenderTexture shader compile failed");
    }
    return shader;
}
function loadImage(path: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.decoding = "async";
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`WAVE RenderTexture texture load failed: ${path}`));
        image.src = deploymentUrl(path);
    });
}
function createTexture(gl: WebGLRenderingContext, image: HTMLImageElement, wrapU: number, wrapV: number) {
    const texture = gl.createTexture();
    if (!texture)
        throw new Error("WAVE RenderTexture texture creation failed");
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapU === 0 ? gl.REPEAT : gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapV === 0 ? gl.REPEAT : gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return texture;
}
export default function StoryWaveRenderStageMeshEffect({ effect, processId, paused, className, maximumSortingOrder, minimumSortingOrderExclusive, spineInstanceId, }: {
    effect: StoryWaveRenderStageMeshEffect;
    processId: string;
    paused: boolean;
    className: string;
    maximumSortingOrder?: number;
    minimumSortingOrderExclusive?: number;
    spineInstanceId?: string;
}) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const pausedRef = useRef(paused);
    useEffect(() => {
        pausedRef.current = paused;
    }, [paused]);
    useEffect(() => {
        const canvas = canvasRef.current;
        const gl = canvas?.getContext("webgl", {
            alpha: true,
            antialias: false,
            depth: false,
            premultipliedAlpha: true,
        });
        if (!canvas || !gl)
            return;
        let disposed = false;
        let animationFrame = 0;
        let elapsed = 0;
        let previous = performance.now();
        const resources: Array<WebGLBuffer | WebGLProgram | WebGLShader | WebGLTexture> = [];
        const textureEntries = Object.entries(effect.textures);
        Promise.all(textureEntries.map(async ([key, metadata]) => ({
            key,
            metadata,
            image: await loadImage(metadata.path),
        }))).then((loaded) => {
            if (disposed)
                return;
            const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
            const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
            const program = gl.createProgram();
            if (!program)
                throw new Error("WAVE RenderTexture program creation failed");
            resources.push(vertexShader, fragmentShader, program);
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                throw new Error(gl.getProgramInfoLog(program) ?? "WAVE RenderTexture program link failed");
            }
            gl.useProgram(program);
            const buffers = new Map<string, {
                position: WebGLBuffer;
                uv: WebGLBuffer;
                index: WebGLBuffer;
                count: number;
            }>();
            Object.entries(effect.meshes).forEach(([key, mesh]) => {
                const position = gl.createBuffer();
                const uv = gl.createBuffer();
                const index = gl.createBuffer();
                if (!position || !uv || !index)
                    throw new Error("WAVE RenderTexture mesh buffer creation failed");
                resources.push(position, uv, index);
                gl.bindBuffer(gl.ARRAY_BUFFER, position);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.positions), gl.STATIC_DRAW);
                gl.bindBuffer(gl.ARRAY_BUFFER, uv);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.uvs), gl.STATIC_DRAW);
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mesh.indices), gl.STATIC_DRAW);
                buffers.set(key, { position, uv, index, count: mesh.indices.length });
            });
            const textures = new Map<string, WebGLTexture>();
            loaded.forEach(({ key, metadata, image }) => {
                const value = createTexture(gl, image, metadata.wrapU, metadata.wrapV);
                resources.push(value);
                textures.set(key, value);
            });
            const positionLocation = gl.getAttribLocation(program, "a_position");
            const uvLocation = gl.getAttribLocation(program, "a_uv");
            const location = (name: string) => {
                const value = gl.getUniformLocation(program, name);
                if (value === null)
                    throw new Error(`WAVE RenderTexture uniform missing: ${name}`);
                return value;
            };
            const uniforms = {
                matrix: location("u_matrix"),
                main: location("u_main"),
                distortion: location("u_distortion"),
                dissolve: location("u_dissolve"),
                mask: location("u_mask"),
                ramp: location("u_ramp"),
                mainSt: location("u_main_st"),
                distortionSt: location("u_distortion_st"),
                dissolveSt: location("u_dissolve_st"),
                maskSt: location("u_mask_st"),
                tint: location("u_tint"),
                intensity: location("u_intensity"),
                blendFactor: location("u_blend_factor"),
                distortionAmount: location("u_distortion_amount"),
                distortionAxis: location("u_distortion_axis"),
                maskAmount: location("u_mask_amount"),
                maskRef: location("u_mask_ref"),
                maskHardness: location("u_mask_hardness"),
                maskInner: location("u_mask_inner"),
                maskOuter: location("u_mask_outer"),
                maskInverse: location("u_mask_inverse"),
                dissolveAmount: location("u_dissolve_amount"),
                mainChannel: location("u_main_channel"),
                distortionChannel: location("u_distortion_channel"),
                maskChannel: location("u_mask_channel"),
                dissolveChannel: location("u_dissolve_channel"),
                profile: location("u_profile"),
                rampRange: location("u_ramp_range"),
                rampOffset: location("u_ramp_offset"),
                angles: location("u_angles"),
                rawImageColor: location("u_raw_image_color"),
            };
            const bindTexture = (uniform: WebGLUniformLocation, key: string, unit: number) => {
                gl.activeTexture(gl.TEXTURE0 + unit);
                gl.bindTexture(gl.TEXTURE_2D, textures.get(key) ?? null);
                gl.uniform1i(uniform, unit);
            };
            canvas.width = 1920;
            canvas.height = 1080;
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.disable(gl.DEPTH_TEST);
            gl.enable(gl.BLEND);
            gl.blendEquation(gl.FUNC_ADD);
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
            gl.clearColor(0, 0, 0, 0);
            gl.uniform4fv(uniforms.rawImageColor, effect.rawImageColor);
            canvas.dataset.storyWaveShockwaveReady = "true";
            const vector4 = (uniform: WebGLUniformLocation, value: number[]) => {
                gl.uniform4f(uniform, value[0], value[1], value[2], value[3]);
            };
            const render = (now: number) => {
                if (disposed)
                    return;
                const delta = Math.min(Math.max((now - previous) / 1000, 0), 0.1);
                previous = now;
                if (!pausedRef.current) {
                    elapsed = effect.loop
                        ? elapsed + delta
                        : Math.min(elapsed + delta, effect.duration ?? 2);
                }
                const playerTime = effect.loop && (effect.duration ?? 0) > 0
                    ? elapsed % (effect.duration ?? 1)
                    : elapsed;
                gl.clear(gl.COLOR_BUFFER_BIT);
                effect.layers.forEach((layer) => {
                    if ((maximumSortingOrder !== undefined && layer.sortingOrder > maximumSortingOrder) ||
                        (minimumSortingOrderExclusive !== undefined &&
                            layer.sortingOrder <= minimumSortingOrderExclusive))
                        return;
                    const localTime = playerTime - layer.startTime;
                    if (localTime < 0 || localTime > layer.duration)
                        return;
                    const progress = layer.duration > 0 ? Math.min(localTime / layer.duration, 1) : 1;
                    const mesh = buffers.get(layer.mesh);
                    const material = effect.materials[layer.material];
                    if (!mesh || !material)
                        return;
                    const floats = material.floats;
                    const colors = material.colors;
                    const transforms = material.textureTransforms;
                    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.position);
                    gl.enableVertexAttribArray(positionLocation);
                    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
                    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.uv);
                    gl.enableVertexAttribArray(uvLocation);
                    gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 0, 0);
                    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.index);
                    const selectedTexture = selectedMainTexture(layer.properties);
                    const mainTexture = selectedTexture === "main"
                        ? (material.textureSlots._MainTex ?? "main")
                        : selectedTexture;
                    bindTexture(uniforms.main, mainTexture, 0);
                    bindTexture(uniforms.distortion, material.textureSlots._MainDs ?? "distortion", 1);
                    bindTexture(uniforms.dissolve, material.textureSlots._Dissolve ?? "dissolve", 2);
                    bindTexture(uniforms.mask, material.textureSlots._Mask ?? "mask", 3);
                    bindTexture(uniforms.ramp, material.textureSlots._RampTex ?? "main", 4);
                    gl.uniformMatrix3fv(uniforms.matrix, false, transformMatrix(layer.transformChain, playerTime, spineInstanceId));
                    const randomUnit = stableUnit(`${processId}:${layer.path}`);
                    vector4(uniforms.mainSt, vectorValue(layer.properties, "_MainTex_ST", transforms._MainTex ?? [1, 1, 0, 0], localTime, progress, randomUnit));
                    vector4(uniforms.distortionSt, vectorValue(layer.properties, "_MainDs_ST", transforms._MainDs ?? [1, 1, 0, 0], localTime, progress, randomUnit));
                    vector4(uniforms.dissolveSt, vectorValue(layer.properties, "_Dissolve_ST", transforms._Dissolve ?? [1, 1, 0, 0], localTime, progress, randomUnit));
                    vector4(uniforms.maskSt, vectorValue(layer.properties, "_Mask_ST", transforms._Mask ?? [1, 1, 0, 0], localTime, progress, randomUnit));
                    vector4(uniforms.tint, tintValue(layer.properties, colors._TintColor ?? [1, 1, 1, 1], progress));
                    gl.uniform1f(uniforms.intensity, scalarValue(layer.properties, "_Intensity", floats._Intensity ?? 1, progress));
                    gl.uniform1f(uniforms.blendFactor, scalarValue(layer.properties, "_BlendFactor", floats._BlendFactor ?? 1, progress));
                    gl.uniform1f(uniforms.distortionAmount, scalarValue(layer.properties, "_MainDsAmount", floats._MainDsAmount ?? 0, progress));
                    gl.uniform2f(uniforms.distortionAxis, scalarValue(layer.properties, "_MainDsU", floats._MainDsU ?? 0, progress), scalarValue(layer.properties, "_MainDsV", floats._MainDsV ?? 0, progress));
                    gl.uniform1f(uniforms.maskAmount, scalarValue(layer.properties, "_MaskAmount", floats._MaskAmount ?? 0, progress));
                    gl.uniform1f(uniforms.maskRef, scalarValue(layer.properties, "_MaskRef", floats._MaskRef ?? 1, progress));
                    gl.uniform1f(uniforms.maskHardness, scalarValue(layer.properties, "_MaskHardness", floats._MaskHardness ?? 1, progress));
                    gl.uniform1f(uniforms.maskInner, scalarValue(layer.properties, "_MaskInner", floats._MaskInner ?? 0, progress));
                    gl.uniform1f(uniforms.maskOuter, scalarValue(layer.properties, "_MaskOuter", floats._MaskOuter ?? 1, progress));
                    gl.uniform1f(uniforms.maskInverse, scalarValue(layer.properties, "_MaskInverse", floats._MaskInverse ?? 0, progress));
                    gl.uniform1f(uniforms.dissolveAmount, scalarValue(layer.properties, "_DissolveAmount", floats._DissolveAmount ?? 0, progress));
                    gl.uniform1i(uniforms.mainChannel, Math.trunc(scalarValue(layer.properties, "_MainTexChannel", floats._MainTexChannel ?? 0, progress)));
                    gl.uniform1i(uniforms.distortionChannel, Math.trunc(floats._MainDsChannel ?? 0));
                    gl.uniform1i(uniforms.maskChannel, Math.trunc(floats._MaskChannel ?? 0));
                    gl.uniform1i(uniforms.dissolveChannel, Math.trunc(floats._DissolveChannel ?? 0));
                    gl.uniform4f(uniforms.angles, scalarValue(layer.properties, "_MainTexAngle", floats._MainTexAngle ?? 0, progress), scalarValue(layer.properties, "_MainDsAngle", floats._MainDsAngle ?? 0, progress), scalarValue(layer.properties, "_MaskAngle", floats._MaskAngle ?? 0, progress), scalarValue(layer.properties, "_DissolveAngle", floats._DissolveAngle ?? 0, progress));
                    gl.uniform1i(uniforms.profile, layer.material === "touch"
                        ? 1
                        : layer.material === "outline"
                            ? 2
                            : layer.material === "aura"
                                ? 3
                                : 0);
                    gl.uniform1f(uniforms.rampRange, scalarValue(layer.properties, "_RampRange", floats._RampRange ?? 1, progress));
                    gl.uniform1f(uniforms.rampOffset, scalarValue(layer.properties, "_RampOffset", floats._RampOffset ?? 0, progress));
                    gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
                });
                canvas.dataset.storyWaveShockwaveElapsed = elapsed.toFixed(3);
                animationFrame = requestAnimationFrame(render);
            };
            animationFrame = requestAnimationFrame(render);
        }).catch((error) => {
            canvas.dataset.storyWaveShockwaveError = error instanceof Error ? error.message : "unknown-error";
        });
        return () => {
            disposed = true;
            cancelAnimationFrame(animationFrame);
            resources.forEach((resource) => {
                if (resource instanceof WebGLTexture)
                    gl.deleteTexture(resource);
                else if (resource instanceof WebGLBuffer)
                    gl.deleteBuffer(resource);
                else if (resource instanceof WebGLProgram)
                    gl.deleteProgram(resource);
                else if (resource instanceof WebGLShader)
                    gl.deleteShader(resource);
            });
        };
    }, [effect, maximumSortingOrder, minimumSortingOrderExclusive, processId, spineInstanceId]);
    return (<canvas ref={canvasRef} className={className} data-story-wave-shockwave-shader={Object.values(effect.materials).map((material) => material.shader.name).join(",")} data-story-wave-shockwave-source-shader={SOURCE_SHADERS.join(",")} data-story-wave-shockwave-layers={effect.layers.length} data-story-wave-shockwave-maximum-order={maximumSortingOrder} data-story-wave-shockwave-minimum-order-exclusive={minimumSortingOrderExclusive} aria-hidden="true"/>);
}
