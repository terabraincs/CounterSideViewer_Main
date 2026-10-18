"use client";
import { deploymentUrl } from "@/lib/deployment";
import { useEffect, useRef } from "react";
import type { StoryFxmCurveKey, StoryGameObjectEffect } from "@/lib/storyPlayback";
const VERTEX_SHADER = `
attribute vec2 a_position;
attribute vec2 a_uv;
varying highp vec2 v_uv;

void main() {
  v_uv = a_uv;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;
// 원본 StudioBside/FX/SB-FX-PMA-Main-Mask의 CHAIN 고정 분기다.
// 이 프리팹은 Main RGBA, 90도 Mask, PMA 블렌딩만 사용한다.
const FRAGMENT_SHADER = `
precision highp float;

varying highp vec2 v_uv;
uniform sampler2D u_main_texture;
uniform sampler2D u_mask_texture;
uniform vec4 u_main_st;
uniform vec4 u_mask_st;
uniform vec4 u_tint;
uniform float u_intensity;
uniform float u_mask_angle;

vec2 rotate_uv(vec2 uv, float degrees) {
  float radians = degrees * 0.017453292519943295;
  float sine = sin(radians);
  float cosine = cos(radians);
  vec2 centered = uv - vec2(0.5);
  return vec2(
    cosine * centered.x + sine * centered.y,
    -sine * centered.x + cosine * centered.y
  ) + vec2(0.5);
}

void main() {
  vec2 main_uv = v_uv * u_main_st.xy + u_main_st.zw;
  vec2 mask_uv = rotate_uv(v_uv, u_mask_angle) * u_mask_st.xy + u_mask_st.zw;
  vec4 sampled = texture2D(u_main_texture, main_uv);
  float mask_value = texture2D(u_mask_texture, mask_uv).r;
  float alpha = sampled.a * u_tint.a * u_intensity * mask_value;
  gl_FragColor = vec4(
    sampled.rgb * u_tint.rgb * u_tint.a * u_intensity * mask_value,
    alpha
  );
}
`;
function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
    const shader = gl.createShader(type);
    if (!shader)
        throw new Error("CHAIN WebGL shader creation failed.");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const detail = gl.getShaderInfoLog(shader) ?? "unknown shader error";
        gl.deleteShader(shader);
        throw new Error(detail);
    }
    return shader;
}
function createProgram(gl: WebGLRenderingContext) {
    const program = gl.createProgram();
    if (!program)
        throw new Error("CHAIN WebGL program creation failed.");
    const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const detail = gl.getProgramInfoLog(program) ?? "unknown link error";
        gl.deleteProgram(program);
        throw new Error(detail);
    }
    return program;
}
function loadImage(url: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.decoding = "async";
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`CHAIN texture load failed: ${url}`));
        image.src = deploymentUrl(url);
    });
}
function createTexture(gl: WebGLRenderingContext, image: HTMLImageElement, wrap: number) {
    const texture = gl.createTexture();
    if (!texture)
        throw new Error("CHAIN WebGL texture creation failed.");
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return texture;
}
function evaluateCurve(keys: StoryFxmCurveKey[], time: number) {
    if (keys.length === 0)
        return 0;
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
        const span = Math.max(right.time - left.time, 0.000001);
        const ratio = (time - left.time) / span;
        const leftSlope = Number(left.outSlope);
        const rightSlope = Number(right.inSlope);
        if (!Number.isFinite(leftSlope) || !Number.isFinite(rightSlope)) {
            return time < right.time ? left.value : right.value;
        }
        const ratio2 = ratio * ratio;
        const ratio3 = ratio2 * ratio;
        return ((2 * ratio3 - 3 * ratio2 + 1) * left.value +
            (ratio3 - 2 * ratio2 + ratio) * span * leftSlope +
            (-2 * ratio3 + 3 * ratio2) * right.value +
            (ratio3 - ratio2) * span * rightSlope);
    }
    return last.value;
}
function integrateCurve(keys: StoryFxmCurveKey[], normalizedTime: number) {
    const steps = 24;
    let total = 0;
    let previousTime = 0;
    let previousValue = evaluateCurve(keys, 0);
    for (let index = 1; index <= steps; index += 1) {
        const currentTime = (normalizedTime * index) / steps;
        const currentValue = evaluateCurve(keys, currentTime);
        total += (currentTime - previousTime) * (previousValue + currentValue) * 0.5;
        previousTime = currentTime;
        previousValue = currentValue;
    }
    return total;
}
function wrapSigned(value: number, limit: number) {
    let result = value;
    while (result > limit)
        result -= limit;
    while (result < -limit)
        result += limit;
    return result;
}
export default function StoryChainEffect({ effect, processId, paused, className, }: {
    effect: StoryGameObjectEffect;
    processId: string;
    paused: boolean;
    className?: string;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pausedRef = useRef(paused);
    useEffect(() => {
        pausedRef.current = paused;
    }, [paused]);
    useEffect(() => {
        const canvas = canvasRef.current;
        const chain = effect.chain;
        if (!canvas || !chain)
            return;
        if (chain.maskRef !== 1) {
            canvas.dataset.storyChainError = `unsupported-mask-ref-${chain.maskRef}`;
            return;
        }
        const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true });
        if (!gl)
            return;
        let disposed = false;
        let animationFrame = 0;
        let pauseStarted = 0;
        let pausedDuration = 0;
        const started = performance.now();
        Promise.all([loadImage(chain.mainTexture), loadImage(chain.maskTexture)])
            .then(([mainImage, maskImage]) => {
            if (disposed)
                return;
            const program = createProgram(gl);
            const buffer = gl.createBuffer();
            const mainTexture = createTexture(gl, mainImage, gl.REPEAT);
            const maskTexture = createTexture(gl, maskImage, gl.CLAMP_TO_EDGE);
            const position = gl.getAttribLocation(program, "a_position");
            const uv = gl.getAttribLocation(program, "a_uv");
            const uniforms = {
                mainTexture: gl.getUniformLocation(program, "u_main_texture"),
                maskTexture: gl.getUniformLocation(program, "u_mask_texture"),
                mainSt: gl.getUniformLocation(program, "u_main_st"),
                maskSt: gl.getUniformLocation(program, "u_mask_st"),
                tint: gl.getUniformLocation(program, "u_tint"),
                intensity: gl.getUniformLocation(program, "u_intensity"),
                maskAngle: gl.getUniformLocation(program, "u_mask_angle"),
            };
            gl.useProgram(program);
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.enableVertexAttribArray(position);
            gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 16, 0);
            gl.enableVertexAttribArray(uv);
            gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 16, 8);
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, mainTexture);
            gl.uniform1i(uniforms.mainTexture, 0);
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, maskTexture);
            gl.uniform1i(uniforms.maskTexture, 1);
            const draw = (now: number) => {
                if (disposed)
                    return;
                if (pausedRef.current) {
                    if (!pauseStarted)
                        pauseStarted = now;
                    animationFrame = requestAnimationFrame(draw);
                    return;
                }
                if (pauseStarted) {
                    pausedDuration += now - pauseStarted;
                    pauseStarted = 0;
                }
                const elapsed = (now - started - pausedDuration) / 1000;
                gl.viewport(0, 0, canvas.width, canvas.height);
                gl.clearColor(0, 0, 0, 0);
                gl.clear(gl.COLOR_BUFFER_BIT);
                for (const layer of chain.layers) {
                    const layerTime = elapsed - (effect.triggerDelay ?? 0) - layer.startTime;
                    if (layerTime < 0 || layerTime > layer.duration)
                        continue;
                    const normalized = Math.min(Math.max(layerTime / layer.duration, 0), 1);
                    const radians = (layer.rotation * Math.PI) / 180;
                    const cosine = Math.cos(radians);
                    const sine = Math.sin(radians);
                    const vertices: number[] = [];
                    for (const [localX, localY, textureX, textureY] of [
                        [-0.5, -0.5, 0, 0],
                        [0.5, -0.5, 1, 0],
                        [-0.5, 0.5, 0, 1],
                        [-0.5, 0.5, 0, 1],
                        [0.5, -0.5, 1, 0],
                        [0.5, 0.5, 1, 1],
                    ] as const) {
                        const scaledX = localX * layer.width;
                        const scaledY = localY * layer.height;
                        const worldX = layer.x + scaledX * cosine - scaledY * sine;
                        const worldY = layer.y + scaledX * sine + scaledY * cosine;
                        vertices.push(worldX / 960, worldY / 540, textureX, textureY);
                    }
                    const maskX = layer.maskScaleX + evaluateCurve(layer.maskCurveX, normalized) * layer.maskCurveFactorX;
                    const maskY = layer.maskScaleY + evaluateCurve(layer.maskCurveY, normalized) * layer.maskCurveFactorY;
                    const scroll = wrapSigned(layer.scrollStart +
                        layer.scrollSpeed *
                            0.1 *
                            layer.duration *
                            integrateCurve(layer.scrollCurve, normalized), 10);
                    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
                    gl.uniform4f(uniforms.mainSt, layer.mainTilingX, 1, scroll, 0);
                    gl.uniform4f(uniforms.maskSt, maskX, maskY, 0, 0);
                    gl.uniform4f(uniforms.tint, ...layer.tint);
                    gl.uniform1f(uniforms.intensity, layer.intensity);
                    gl.uniform1f(uniforms.maskAngle, chain.maskAngle);
                    gl.drawArrays(gl.TRIANGLES, 0, 6);
                }
                animationFrame = requestAnimationFrame(draw);
            };
            animationFrame = requestAnimationFrame(draw);
        })
            .catch((error) => console.error(error));
        return () => {
            disposed = true;
            cancelAnimationFrame(animationFrame);
        };
    }, [effect, processId]);
    return (<canvas ref={canvasRef} className={className} width={1920} height={1080} aria-hidden="true" data-story-chain-process={processId} data-story-chain-layer-count={effect.chain?.layers.length ?? 0}/>);
}
