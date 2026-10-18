"use client";
import { deploymentUrl } from "@/lib/deployment";
import { useEffect, useRef } from "react";
import type { StoryFxmCurveKey, StoryFxmTransformNode, StoryWaveDistortionEffect as StoryWaveDistortionEffectData, } from "@/lib/storyPlayback";
const SOURCE_SHADER = "NKC/NKC_DISTORTION";
const VERTEX_SHADER = `
attribute vec2 a_position;
attribute vec2 a_uv;
uniform mat3 u_matrix;
uniform sampler2D u_noise;
uniform sampler2D u_base;
uniform sampler2D u_mask;
uniform vec2 u_noise_scale;
uniform vec2 u_base_scale;
uniform vec2 u_base_offset;
uniform float u_time;
uniform float u_speed;
uniform float u_distortion;
varying highp vec2 v_displaced_screen_uv;
void main() {
  vec3 pixel = u_matrix * vec3(a_position, 1.0);
  gl_Position = vec4(pixel.x / 960.0, pixel.y / 540.0, 0.0, 1.0);
  float noise = texture2D(u_noise, a_uv * u_noise_scale).r;
  float base = texture2D(u_base, a_uv * u_base_scale + u_base_offset).r;
  float mask = texture2D(u_mask, a_uv).r;
  float angle = u_time * noise * u_speed;
  vec2 direction = vec2(cos(angle), -sin(angle));
  vec2 screen_uv = vec2(pixel.x / 1920.0 + 0.5, pixel.y / 1080.0 + 0.5);
  v_displaced_screen_uv = screen_uv + direction * base * mask * u_distortion * 0.1;
}`;
const FRAGMENT_SHADER = `
precision highp float;
varying highp vec2 v_displaced_screen_uv;
uniform sampler2D u_screen;
void main() {
  gl_FragColor = texture2D(u_screen, clamp(v_displaced_screen_uv, vec2(0.0), vec2(1.0)));
}`;
function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
    const shader = gl.createShader(type);
    if (!shader)
        throw new Error("WAVE distortion shader creation failed");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader) ?? "WAVE distortion shader compile failed");
    }
    return shader;
}
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
function transformMatrix(chain: StoryFxmTransformNode[], playerTime: number, rotation: number) {
    let matrix = [1, 0, 0, 1, 0, 0];
    chain.forEach((node, index) => {
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
        const nodeRotation = node.rotation + (index === chain.length - 1 ? rotation : 0);
        const radians = nodeRotation * Math.PI / 180;
        const cosine = Math.cos(radians);
        const sine = Math.sin(radians);
        const right = [
            cosine * scaleX,
            sine * scaleX,
            -sine * scaleY,
            cosine * scaleY,
            node.x,
            node.y,
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
function loadImage(path: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.decoding = "async";
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`WAVE distortion texture load failed: ${path}`));
        image.src = deploymentUrl(path);
    });
}
function createTexture(gl: WebGLRenderingContext, image: TexImageSource | null, wrapU: number, wrapV: number) {
    const texture = gl.createTexture();
    if (!texture)
        throw new Error("WAVE distortion texture creation failed");
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    if (image) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    }
    else {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1920, 1080, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }
    const wrap = (value: number) => value === 0 ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap(wrapU));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap(wrapV));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return texture;
}
function captureBackground(canvas: HTMLCanvasElement, target: HTMLCanvasElement) {
    const context = target.getContext("2d");
    const theater = canvas.closest<HTMLElement>("[data-command-index]");
    if (!context || !theater)
        return false;
    const canvasRect = canvas.getBoundingClientRect();
    if (canvasRect.width <= 0 || canvasRect.height <= 0)
        return false;
    context.clearRect(0, 0, target.width, target.height);
    const sources = theater.querySelectorAll<HTMLImageElement | HTMLCanvasElement>("[data-story-background-graphic] img, [data-story-background-graphic] canvas");
    sources.forEach((source) => {
        if (source === canvas || !(source.compareDocumentPosition(canvas) & Node.DOCUMENT_POSITION_FOLLOWING))
            return;
        const rect = source.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0)
            return;
        const x = (rect.left - canvasRect.left) / canvasRect.width * target.width;
        const y = (rect.top - canvasRect.top) / canvasRect.height * target.height;
        const width = rect.width / canvasRect.width * target.width;
        const height = rect.height / canvasRect.height * target.height;
        try {
            context.drawImage(source, x, y, width, height);
        }
        catch {
            // A not-yet-ready image or canvas is skipped until the next capture frame.
        }
    });
    return true;
}
export default function StoryWaveDistortionEffect({ effect, processId, paused, className, }: {
    effect: StoryWaveDistortionEffectData;
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
        const gl = canvas?.getContext("webgl", {
            alpha: true,
            antialias: false,
            depth: false,
            premultipliedAlpha: false,
        });
        if (!canvas || !gl)
            return;
        const vertexTextureUnits = Number(gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS));
        if (vertexTextureUnits < 3) {
            canvas.dataset.storyWaveDistortionError = `vertex-texture-units-${vertexTextureUnits}`;
            return;
        }
        let disposed = false;
        let animationFrame = 0;
        let elapsed = 0;
        let previous = performance.now();
        let lastCapture = -1;
        const resources: Array<WebGLBuffer | WebGLProgram | WebGLShader | WebGLTexture> = [];
        const captureCanvas = document.createElement("canvas");
        captureCanvas.width = 1920;
        captureCanvas.height = 1080;
        Promise.all([
            loadImage(effect.textures.noise.path),
            loadImage(effect.textures.base.path),
            loadImage(effect.textures.mask.path),
        ]).then(([noiseImage, baseImage, maskImage]) => {
            if (disposed)
                return;
            const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
            const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
            const program = gl.createProgram();
            if (!program)
                throw new Error("WAVE distortion program creation failed");
            resources.push(vertexShader, fragmentShader, program);
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                throw new Error(gl.getProgramInfoLog(program) ?? "WAVE distortion program link failed");
            }
            gl.useProgram(program);
            const position = gl.createBuffer();
            const uv = gl.createBuffer();
            const index = gl.createBuffer();
            if (!position || !uv || !index)
                throw new Error("WAVE distortion mesh buffer creation failed");
            resources.push(position, uv, index);
            gl.bindBuffer(gl.ARRAY_BUFFER, position);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(effect.mesh.positions), gl.STATIC_DRAW);
            const positionLocation = gl.getAttribLocation(program, "a_position");
            gl.enableVertexAttribArray(positionLocation);
            gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ARRAY_BUFFER, uv);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(effect.mesh.uvs), gl.STATIC_DRAW);
            const uvLocation = gl.getAttribLocation(program, "a_uv");
            gl.enableVertexAttribArray(uvLocation);
            gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(effect.mesh.indices), gl.STATIC_DRAW);
            const screenTexture = createTexture(gl, null, 1, 1);
            const noiseTexture = createTexture(gl, noiseImage, effect.textures.noise.wrapU, effect.textures.noise.wrapV);
            const baseTexture = createTexture(gl, baseImage, effect.textures.base.wrapU, effect.textures.base.wrapV);
            const maskTexture = createTexture(gl, maskImage, effect.textures.mask.wrapU, effect.textures.mask.wrapV);
            resources.push(screenTexture, noiseTexture, baseTexture, maskTexture);
            const location = (name: string) => gl.getUniformLocation(program, name);
            [screenTexture, noiseTexture, baseTexture, maskTexture].forEach((texture, unit) => {
                gl.activeTexture(gl.TEXTURE0 + unit);
                gl.bindTexture(gl.TEXTURE_2D, texture);
            });
            gl.uniform1i(location("u_screen"), 0);
            gl.uniform1i(location("u_noise"), 1);
            gl.uniform1i(location("u_base"), 2);
            gl.uniform1i(location("u_mask"), 3);
            canvas.width = 1920;
            canvas.height = 1080;
            gl.viewport(0, 0, 1920, 1080);
            gl.disable(gl.DEPTH_TEST);
            gl.disable(gl.BLEND);
            gl.clearColor(0, 0, 0, 0);
            canvas.dataset.storyWaveDistortionReady = "true";
            const render = (now: number) => {
                if (disposed)
                    return;
                const delta = Math.min(Math.max((now - previous) / 1000, 0), 0.1);
                previous = now;
                if (!pausedRef.current)
                    elapsed = Math.min(elapsed + delta, 3.2);
                gl.clear(gl.COLOR_BUFFER_BIT);
                if (now - lastCapture >= 1000 / 30 && captureBackground(canvas, captureCanvas)) {
                    lastCapture = now;
                    gl.activeTexture(gl.TEXTURE0);
                    gl.bindTexture(gl.TEXTURE_2D, screenTexture);
                    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
                    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, captureCanvas);
                }
                const activeLayers = effect.layers.filter((layer) => {
                    const localTime = elapsed - layer.startTime;
                    return localTime >= 0 && localTime <= layer.duration;
                });
                activeLayers.forEach((layer, layerIndex) => {
                    const localTime = elapsed - layer.startTime;
                    const progress = layer.duration > 0 ? Math.min(localTime / layer.duration, 1) : 1;
                    gl.uniformMatrix3fv(location("u_matrix"), false, transformMatrix(layer.transformChain, elapsed, layer.rotationSpeed * localTime));
                    gl.uniform2fv(location("u_noise_scale"), layer.noiseScale);
                    gl.uniform2fv(location("u_base_scale"), layer.baseScale);
                    gl.uniform2fv(location("u_base_offset"), layer.baseOffset);
                    gl.uniform1f(location("u_time"), localTime);
                    gl.uniform1f(location("u_speed"), layer.speed);
                    gl.uniform1f(location("u_distortion"), sampleCurve(layer.distortionCurve, progress) * layer.distortionMultiplier);
                    gl.drawElements(gl.TRIANGLES, effect.mesh.indices.length, gl.UNSIGNED_SHORT, 0);
                    if (layerIndex < activeLayers.length - 1) {
                        gl.flush();
                        const context = captureCanvas.getContext("2d");
                        context?.drawImage(canvas, 0, 0, captureCanvas.width, captureCanvas.height);
                        gl.activeTexture(gl.TEXTURE0);
                        gl.bindTexture(gl.TEXTURE_2D, screenTexture);
                        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
                        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, captureCanvas);
                    }
                });
                canvas.dataset.storyWaveDistortionElapsed = elapsed.toFixed(3);
                animationFrame = requestAnimationFrame(render);
            };
            animationFrame = requestAnimationFrame(render);
        }).catch((error) => {
            canvas.dataset.storyWaveDistortionError = error instanceof Error ? error.message : "unknown-error";
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
    }, [effect, processId]);
    return (<canvas ref={canvasRef} className={className} data-story-wave-distortion-mesh={effect.mesh.name} data-story-wave-distortion-shader={effect.shader.name} data-story-wave-distortion-source-shader={SOURCE_SHADER} data-story-wave-distortion-layers={effect.layers.length} aria-hidden="true"/>);
}
