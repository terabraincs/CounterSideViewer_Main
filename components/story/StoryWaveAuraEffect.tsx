"use client";
import { deploymentUrl } from "@/lib/deployment";
import { useEffect, useRef } from "react";
import type { StoryFxmCurveKey, StoryFxmTransformNode, StoryIceMaterialTexture, StoryWaveAuraEffect as StoryWaveAuraEffectData, } from "@/lib/storyPlayback";
const VERTEX_SHADER = `
attribute vec2 a_position;
attribute vec2 a_uv;
uniform mat3 u_matrix;
varying vec2 v_uv;
void main() {
  vec3 pixel = u_matrix * vec3(a_position, 1.0);
  gl_Position = vec4(pixel.x / 960.0, pixel.y / 540.0, 0.0, 1.0);
  v_uv = a_uv;
}`;
// SYLVIA_AURA_WAVE가 사용하는 원본 셰이더의 고정 분기만 재현한다.
const FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_main;
uniform sampler2D u_main_ds;
uniform sampler2D u_mask;
uniform sampler2D u_ramp;
uniform vec2 u_mainScale;
uniform vec2 u_mainOffset;
uniform vec2 u_dsScale;
uniform vec2 u_dsOffset;
uniform float u_mainAngle;
uniform float u_maskAngle;
uniform vec2 u_dsStrength;
uniform float u_intensity;
uniform float u_rampRange;
uniform float u_rampOffset;
uniform vec4 u_tint;

vec2 rotateUv(vec2 uv, float degrees) {
  float angle = radians(degrees);
  float c = cos(angle);
  float s = sin(angle);
  vec2 p = uv - 0.5;
  return vec2(c * p.x + s * p.y, -s * p.x + c * p.y) + 0.5;
}

void main() {
  vec2 dsUv = v_uv * u_dsScale + u_dsOffset;
  float displacement = clamp(texture2D(u_main_ds, dsUv).r, 0.0, 1.0);
  vec2 mainUv = rotateUv(v_uv, u_mainAngle) * u_mainScale + u_mainOffset - displacement * u_dsStrength;
  vec4 mainColor = texture2D(u_main, mainUv);
  float mask = texture2D(u_mask, rotateUv(v_uv, u_maskAngle)).r;
  float luminance = dot(mainColor.rgb, vec3(0.300000012, 0.589999974, 0.109999999));
  float rampX = luminance / clamp(u_rampRange, 0.01, 5.0);
  vec3 ramp = texture2D(u_ramp, vec2(rampX, 1.0 - u_rampOffset)).rgb;
  float alpha = mainColor.a * mask * u_tint.a * u_intensity;
  gl_FragColor = vec4(mainColor.rgb * ramp * u_tint.rgb * u_intensity, alpha);
}`;
function shader(gl: WebGLRenderingContext, type: number, source: string) {
    const value = gl.createShader(type);
    if (!value)
        throw new Error("WAVE aura WebGL shader creation failed.");
    gl.shaderSource(value, source);
    gl.compileShader(value);
    if (!gl.getShaderParameter(value, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(value) || "WAVE aura shader compile failed.");
    }
    return value;
}
function sample(keys: Array<{
    time: number;
    value: number;
}>, progress: number) {
    if (!keys.length)
        return 1;
    if (progress <= keys[0].time)
        return keys[0].value;
    for (let index = 1; index < keys.length; index += 1) {
        const next = keys[index];
        const previous = keys[index - 1];
        if (progress <= next.time) {
            const range = next.time - previous.time;
            const amount = range > 0 ? (progress - previous.time) / range : 1;
            return previous.value + (next.value - previous.value) * amount;
        }
    }
    return keys.at(-1)?.value ?? 1;
}
function sampleColor(keys: Array<{
    time: number;
    value: [
        number,
        number,
        number
    ];
}>, progress: number) {
    return [0, 1, 2].map((channel) => sample(keys.map((key) => ({ time: key.time, value: key.value[channel] })), progress)) as [
        number,
        number,
        number
    ];
}
function sampleCurve(keys: StoryFxmCurveKey[], time: number) {
    if (!keys.length)
        return 1;
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
    return keys.at(-1)?.value ?? 1;
}
function transformMatrix(chain: StoryFxmTransformNode[], playerTime: number) {
    let matrix = [1, 0, 0, 1, 0, 0];
    chain.forEach((node) => {
        let scaleX = node.scaleX;
        let scaleY = node.scaleY;
        const evaluator = node.evaluator;
        if (evaluator?.kind === "scale" && playerTime >= evaluator.startTime) {
            const progress = evaluator.duration > 0
                ? Math.min(Math.max((playerTime - evaluator.startTime) / evaluator.duration, 0), 1)
                : 1;
            scaleX = sampleCurve(evaluator.curveX, progress) * evaluator.factorX;
            scaleY = evaluator.separateAxes
                ? sampleCurve(evaluator.curveY, progress) * evaluator.factorY
                : scaleX;
        }
        const radians = node.rotation * Math.PI / 180;
        const c = Math.cos(radians);
        const s = Math.sin(radians);
        const right = [c * scaleX, s * scaleX, -s * scaleY, c * scaleY, node.x, node.y];
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
function loadImage(url: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`WAVE aura texture load failed: ${url}`));
        image.src = deploymentUrl(url);
    });
}
function texture(gl: WebGLRenderingContext, image: HTMLImageElement, source: StoryIceMaterialTexture) {
    const value = gl.createTexture();
    if (!value)
        throw new Error("WAVE aura WebGL texture creation failed.");
    gl.bindTexture(gl.TEXTURE_2D, value);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    const wrap = (value: number) => value === 0 ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap(source.wrapU));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap(source.wrapV));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return value;
}
export function StoryWaveAuraEffect({ effect, processId, paused, className, }: {
    effect: StoryWaveAuraEffectData;
    processId: string;
    paused: boolean;
    className?: string;
}) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const pausedRef = useRef(paused);
    useEffect(() => {
        pausedRef.current = paused;
    }, [paused]);
    useEffect(() => {
        const canvas = canvasRef.current;
        const gl = canvas?.getContext("webgl", { alpha: true, premultipliedAlpha: false });
        if (!canvas || !gl)
            return;
        const program = gl.createProgram();
        if (!program)
            return;
        gl.attachShader(program, shader(gl, gl.VERTEX_SHADER, VERTEX_SHADER));
        gl.attachShader(program, shader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS))
            return;
        gl.useProgram(program);
        const positionBuffer = gl.createBuffer();
        const uvBuffer = gl.createBuffer();
        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(effect.mesh.positions), gl.STATIC_DRAW);
        const positionLocation = gl.getAttribLocation(program, "a_position");
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(effect.mesh.uvs), gl.STATIC_DRAW);
        const uvLocation = gl.getAttribLocation(program, "a_uv");
        gl.enableVertexAttribArray(uvLocation);
        gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(effect.mesh.indices), gl.STATIC_DRAW);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        let disposed = false;
        let frame = 0;
        let elapsed = 0;
        let previous = performance.now();
        const material = effect.material;
        Promise.all([
            material.mainTexture,
            material.mainDsTexture,
            material.maskTexture,
            material.rampTexture,
        ].map(loadImage)).then((images) => {
            if (disposed)
                return;
            const settings = [
                material.textureSettings.main,
                material.textureSettings.mainDs,
                material.textureSettings.mask,
                material.textureSettings.ramp,
            ];
            images.forEach((image, index) => {
                gl.activeTexture(gl.TEXTURE0 + index);
                gl.bindTexture(gl.TEXTURE_2D, texture(gl, image, settings[index]));
            });
            gl.uniform1i(gl.getUniformLocation(program, "u_main"), 0);
            gl.uniform1i(gl.getUniformLocation(program, "u_main_ds"), 1);
            gl.uniform1i(gl.getUniformLocation(program, "u_mask"), 2);
            gl.uniform1i(gl.getUniformLocation(program, "u_ramp"), 3);
            gl.uniform2fv(gl.getUniformLocation(program, "u_mainScale"), material.mainScale);
            gl.uniform2fv(gl.getUniformLocation(program, "u_dsScale"), material.mainDsScale);
            gl.uniform1f(gl.getUniformLocation(program, "u_mainAngle"), material.mainTexAngle);
            gl.uniform1f(gl.getUniformLocation(program, "u_maskAngle"), material.maskAngle);
            gl.uniform2f(gl.getUniformLocation(program, "u_dsStrength"), material.mainDsAmount * material.mainDsU, material.mainDsAmount * material.mainDsV);
            gl.uniform1f(gl.getUniformLocation(program, "u_intensity"), material.intensity);
            gl.uniform1f(gl.getUniformLocation(program, "u_rampRange"), material.rampRange);
            gl.uniform1f(gl.getUniformLocation(program, "u_rampOffset"), material.rampOffset);
            canvas.dataset.storyWaveAuraAssetsReady = "true";
            const render = (now: number) => {
                if (disposed)
                    return;
                const delta = Math.min((now - previous) / 1000, 0.1);
                previous = now;
                if (!pausedRef.current)
                    elapsed += delta;
                gl.clearColor(0, 0, 0, 0);
                gl.clear(gl.COLOR_BUFFER_BIT);
                const local = elapsed - effect.startTime;
                if (local >= 0 && local <= effect.duration) {
                    const progress = Math.min(local / effect.duration, 1);
                    gl.uniformMatrix3fv(gl.getUniformLocation(program, "u_matrix"), false, transformMatrix(effect.transformChain, elapsed));
                    const rgb = sampleColor(material.tintGradient.colors, progress);
                    const alpha = sample(material.tintGradient.alphas, progress);
                    gl.uniform4f(gl.getUniformLocation(program, "u_tint"), rgb[0], rgb[1], rgb[2], alpha);
                    gl.uniform2f(gl.getUniformLocation(program, "u_mainOffset"), material.mainScroll[0] * local, material.mainScroll[1] * local);
                    gl.uniform2f(gl.getUniformLocation(program, "u_dsOffset"), material.mainDsScroll[0] * local, material.mainDsScroll[1] * local);
                    gl.drawElements(gl.TRIANGLES, effect.mesh.indices.length, gl.UNSIGNED_SHORT, 0);
                }
                canvas.dataset.storyWaveAuraElapsed = elapsed.toFixed(3);
                frame = requestAnimationFrame(render);
            };
            frame = requestAnimationFrame(render);
        }).catch(() => {
            canvas.dataset.storyWaveAuraAssetsReady = "error";
        });
        return () => {
            disposed = true;
            cancelAnimationFrame(frame);
        };
    }, [effect, processId]);
    return (<canvas ref={canvasRef} className={className} width={1920} height={1080} data-story-wave-aura-mesh={effect.mesh.name} data-story-wave-aura-shader={effect.shader.name} aria-hidden="true"/>);
}
