"use client";
import { deploymentUrl } from "@/lib/deployment";
import { useEffect, useRef } from "react";
import type { StoryFxmCurveKey, StoryGameObjectEffect, StorySlashTraceSource, StorySlashTraceSpriteLayer, } from "@/lib/storyPlayback";
const VERTEX_SHADER = `
attribute vec2 a_position;
attribute vec2 a_uv;
varying highp vec2 v_uv;

void main() {
  v_uv = a_uv;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;
const FRAGMENT_SHADER = `
precision highp float;

varying highp vec2 v_uv;
uniform sampler2D u_texture;
uniform sampler2D u_ramp_texture;
uniform vec4 u_texture_st;
uniform vec4 u_color;
uniform float u_intensity;
uniform float u_color_ramp_amount;
uniform float u_ramp_range;
uniform float u_ramp_offset;
uniform float u_regrading;
uniform float u_main_amount;
uniform float u_input_black;
uniform float u_input_white;
uniform float u_mask_amount;
uniform float u_mask_hardness;
uniform float u_mask_inner;
uniform float u_mask_outer;
uniform float u_mask_inverse;
uniform int u_is_mesh;

void main() {
  vec2 uv = v_uv * u_texture_st.xy + u_texture_st.zw;
  vec4 sampled = texture2D(u_texture, uv);
  vec4 result = mix(vec4(1.0), sampled * u_color, u_main_amount);

  if (u_is_mesh == 1) {
    result.rgb = clamp(result.rgb, vec3(u_input_black), vec3(u_input_white));
    float luminance = dot(result.rgb, vec3(0.300000012, 0.589999974, 0.109999999));
    float ramp_u = luminance / clamp(u_ramp_range, 0.01, 5.0);
    vec3 ramp = texture2D(
      u_ramp_texture,
      vec2(ramp_u, 1.0 - u_ramp_offset)
    ).rgb;
    vec3 graded = mix(result.rgb * ramp, ramp, u_regrading);
    result.rgb = mix(result.rgb, graded, u_color_ramp_amount);

    // 이 재질은 MaskRef=0, Mask UV identity 고정 분기다. 원본 DXBC처럼
    // 절차형 방사 마스크를 RGB가 아니라 alpha에만 적용한다.
    float radius = length(vec2(0.5) - v_uv);
    float midpoint = (u_mask_inner + u_mask_outer) * 0.5;
    float ratio = clamp(
      abs(radius - midpoint) / max(u_mask_outer - midpoint, 0.000001),
      0.0,
      1.0
    );
    float mask_power = pow(ratio, u_mask_hardness);
    float mask_value = mix(1.0 - mask_power, mask_power, u_mask_inverse);
    result.a *= mix(1.0, mask_value, u_mask_amount);
  }

  result.rgb *= u_intensity;
  result.a *= u_intensity;
  gl_FragColor = result;
}
`;
type LoadedTexture = {
    image: HTMLImageElement;
    texture: WebGLTexture;
};
function loadImage(path: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new window.Image();
        image.decoding = "async";
        image.addEventListener("load", () => resolve(image), { once: true });
        image.addEventListener("error", () => reject(new Error(`SLASH_TRACE 이미지를 읽지 못했습니다: ${path}`)), { once: true });
        image.src = deploymentUrl(path);
    });
}
function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
    const shader = gl.createShader(type);
    if (!shader) {
        throw new Error("SLASH_TRACE WebGL 셰이더를 만들지 못했습니다.");
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const detail = gl.getShaderInfoLog(shader) ?? "알 수 없는 셰이더 오류";
        gl.deleteShader(shader);
        throw new Error(detail);
    }
    return shader;
}
function createTexture(gl: WebGLRenderingContext, image: HTMLImageElement) {
    const texture = gl.createTexture();
    if (!texture) {
        throw new Error("SLASH_TRACE WebGL 텍스처를 만들지 못했습니다.");
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return texture;
}
function uniform(gl: WebGLRenderingContext, program: WebGLProgram, name: string) {
    const location = gl.getUniformLocation(program, name);
    if (location === null) {
        throw new Error(`SLASH_TRACE WebGL uniform이 없습니다: ${name}`);
    }
    return location;
}
function sampleCurve(keys: StoryFxmCurveKey[], time: number) {
    if (!keys.length) {
        return 0;
    }
    if (time <= keys[0].time) {
        return keys[0].value;
    }
    for (let index = 1; index < keys.length; index += 1) {
        const right = keys[index];
        if (time > right.time) {
            continue;
        }
        const left = keys[index - 1];
        const span = right.time - left.time;
        if (span <= 0) {
            return right.value;
        }
        const leftSlope = Number(left.outSlope);
        const rightSlope = Number(right.inSlope);
        if (!Number.isFinite(leftSlope) || !Number.isFinite(rightSlope)) {
            return time < right.time ? left.value : right.value;
        }
        const progress = (time - left.time) / span;
        const squared = progress * progress;
        const cubed = squared * progress;
        return ((2 * cubed - 3 * squared + 1) * left.value +
            (cubed - 2 * squared + progress) * leftSlope * span +
            (-2 * cubed + 3 * squared) * right.value +
            (cubed - squared) * rightSlope * span);
    }
    return keys.at(-1)?.value ?? 0;
}
function sampleLoopingCurve(keys: StoryFxmCurveKey[], time: number) {
    const end = keys.at(-1)?.time ?? 0;
    if (end <= 0) {
        return sampleCurve(keys, time);
    }
    const wrapped = ((time % end) + end) % end;
    return sampleCurve(keys, wrapped);
}
function sampleGradient<T extends number | [
    number,
    number,
    number
]>(keys: Array<{
    time: number;
    value: T;
}>, progress: number): T {
    if (!keys.length) {
        return 1 as T;
    }
    if (progress <= keys[0].time) {
        return keys[0].value;
    }
    for (let index = 1; index < keys.length; index += 1) {
        const right = keys[index];
        if (progress > right.time) {
            continue;
        }
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
    return keys.at(-1)?.value ?? (1 as T);
}
function property(source: StorySlashTraceSource, name: string, mode?: number) {
    return source.materialEvaluator.properties.find((item) => item.name === name && (mode === undefined || item.mode === mode));
}
function makeSpriteVertices(layer: StorySlashTraceSpriteLayer, orthographicSize: number) {
    const left = (layer.x - layer.width * layer.pivotX) / orthographicSize;
    const right = (layer.x + layer.width * (1 - layer.pivotX)) / orthographicSize;
    const bottom = (layer.y - layer.height * layer.pivotY) / orthographicSize;
    const top = (layer.y + layer.height * (1 - layer.pivotY)) / orthographicSize;
    return new Float32Array([
        left, bottom, right, bottom, left, top,
        left, top, right, bottom, right, top,
    ]);
}
function makeSpriteUvs(layer: StorySlashTraceSpriteLayer) {
    const left = layer.flipX ? 1 : 0;
    const right = layer.flipX ? 0 : 1;
    const bottom = layer.flipY ? 1 : 0;
    const top = layer.flipY ? 0 : 1;
    return new Float32Array([
        left, bottom, right, bottom, left, top,
        left, top, right, bottom, right, top,
    ]);
}
export default function StorySlashTraceEffect({ effect, processId, paused, className, }: {
    effect: StoryGameObjectEffect;
    processId: string;
    paused: boolean;
    className: string;
}) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const pausedRef = useRef(paused);
    useEffect(() => {
        pausedRef.current = paused;
    }, [paused]);
    useEffect(() => {
        const canvas = canvasRef.current;
        const metadata = effect.slashTrace;
        if (!canvas || !metadata) {
            return;
        }
        const abort = new AbortController();
        let disposed = false;
        let animationFrame = 0;
        const resources: Array<WebGLBuffer | WebGLProgram | WebGLShader | WebGLTexture> = [];
        void fetch(deploymentUrl(metadata.dataPath), { signal: abort.signal })
            .then(async (response) => {
            if (!response.ok) {
                throw new Error(`SLASH_TRACE 원본 데이터 응답 오류: ${response.status}`);
            }
            const source = (await response.json()) as StorySlashTraceSource;
            const texturePaths = new Set([
                source.textures.main,
                source.textures.ramp,
                ...source.sprites.map((layer) => layer.texture),
            ]);
            const images = new Map(await Promise.all(Array.from(texturePaths, async (path) => [path, await loadImage(path)] as const)));
            return { source, images };
        })
            .then(({ source, images }) => {
            if (disposed) {
                return;
            }
            canvas.width = source.renderWidth;
            canvas.height = source.renderHeight;
            const gl = canvas.getContext("webgl", {
                alpha: false,
                antialias: false,
                depth: false,
                premultipliedAlpha: false,
                preserveDrawingBuffer: false,
                stencil: false,
            });
            if (!gl) {
                throw new Error("SLASH_TRACE WebGL을 사용할 수 없습니다.");
            }
            const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
            const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
            const program = gl.createProgram();
            if (!program) {
                throw new Error("SLASH_TRACE WebGL 프로그램을 만들지 못했습니다.");
            }
            resources.push(vertexShader, fragmentShader, program);
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                throw new Error(gl.getProgramInfoLog(program) ?? "SLASH_TRACE WebGL 링크 오류");
            }
            gl.useProgram(program);
            const positionLocation = gl.getAttribLocation(program, "a_position");
            const uvLocation = gl.getAttribLocation(program, "a_uv");
            const positionBuffer = gl.createBuffer();
            const uvBuffer = gl.createBuffer();
            const indexBuffer = gl.createBuffer();
            if (positionLocation < 0 || uvLocation < 0 || !positionBuffer || !uvBuffer || !indexBuffer) {
                throw new Error("SLASH_TRACE WebGL 버퍼를 만들지 못했습니다.");
            }
            resources.push(positionBuffer, uvBuffer, indexBuffer);
            const textureMap = new Map<string, LoadedTexture>();
            images.forEach((image, path) => {
                const texture = createTexture(gl, image);
                resources.push(texture);
                textureMap.set(path, { image, texture });
            });
            const mainTexture = textureMap.get(source.textures.main)?.texture;
            const rampTexture = textureMap.get(source.textures.ramp)?.texture;
            if (!mainTexture || !rampTexture) {
                throw new Error("SLASH_TRACE 핵심 텍스처가 없습니다.");
            }
            const textureLocation = uniform(gl, program, "u_texture");
            const rampTextureLocation = uniform(gl, program, "u_ramp_texture");
            const textureStLocation = uniform(gl, program, "u_texture_st");
            const colorLocation = uniform(gl, program, "u_color");
            const intensityLocation = uniform(gl, program, "u_intensity");
            const rampAmountLocation = uniform(gl, program, "u_color_ramp_amount");
            const rampRangeLocation = uniform(gl, program, "u_ramp_range");
            const rampOffsetLocation = uniform(gl, program, "u_ramp_offset");
            const regradingLocation = uniform(gl, program, "u_regrading");
            const mainAmountLocation = uniform(gl, program, "u_main_amount");
            const inputBlackLocation = uniform(gl, program, "u_input_black");
            const inputWhiteLocation = uniform(gl, program, "u_input_white");
            const maskAmountLocation = uniform(gl, program, "u_mask_amount");
            const maskHardnessLocation = uniform(gl, program, "u_mask_hardness");
            const maskInnerLocation = uniform(gl, program, "u_mask_inner");
            const maskOuterLocation = uniform(gl, program, "u_mask_outer");
            const maskInverseLocation = uniform(gl, program, "u_mask_inverse");
            const isMeshLocation = uniform(gl, program, "u_is_mesh");
            gl.enableVertexAttribArray(positionLocation);
            gl.enableVertexAttribArray(uvLocation);
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
            gl.disable(gl.CULL_FACE);
            gl.disable(gl.DEPTH_TEST);
            gl.viewport(0, 0, source.renderWidth, source.renderHeight);
            gl.uniform1i(textureLocation, 0);
            gl.uniform1i(rampTextureLocation, 1);
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, rampTexture);
            const meshPositions = new Float32Array(source.mesh.positions);
            const meshUvs = new Float32Array(source.mesh.uvs);
            const meshIndices = new Uint16Array(source.mesh.indices);
            const intensityProperty = property(source, "_Intensity", 1);
            const stConstant = property(source, "_MainTex_ST", 2)?.constant ?? [0.5, 1, 0, 0];
            const stCurve = property(source, "_MainTex_ST", 6);
            const rampAmount = property(source, "_ColorRampAmount", 12)?.constant[0] ?? 0;
            const rampRange = property(source, "_RampRange", 12)?.constant[0] ?? 1;
            const rampOffset = property(source, "_RampOffset", 12)?.constant[0] ?? 0;
            const mainColor = source.material.colors._MainTexColor ?? [1, 1, 1, 1];
            const tintColor = source.material.colors._TintColor ?? [1, 1, 1, 1];
            const regrading = source.material.floats._ReGrading ?? 0;
            gl.uniform1f(maskAmountLocation, source.material.floats._MaskAmount ?? 1);
            gl.uniform1f(maskHardnessLocation, source.material.floats._MaskHardness ?? 1);
            gl.uniform1f(maskInnerLocation, source.material.floats._MaskInner ?? 0);
            gl.uniform1f(maskOuterLocation, source.material.floats._MaskOuter ?? 0.5);
            gl.uniform1f(maskInverseLocation, source.material.floats._MaskInverse ?? 0);
            let elapsed = 0;
            let previous = performance.now();
            const bindArrays = (positions: Float32Array, uvs: Float32Array, indices?: Uint16Array) => {
                gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
                gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
                gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.DYNAMIC_DRAW);
                gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 0, 0);
                if (indices) {
                    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
                    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
                }
            };
            const draw = (now: number) => {
                if (disposed) {
                    return;
                }
                if (!pausedRef.current) {
                    elapsed += Math.max(0, Math.min(now - previous, 100)) / 1000;
                }
                previous = now;
                gl.clearColor(...source.clearColor);
                gl.clear(gl.COLOR_BUFFER_BIT);
                const activeTime = Math.min(elapsed, source.duration);
                for (const layer of [...source.sprites].sort((left, right) => left.sortingOrder - right.sortingOrder)) {
                    const localTime = activeTime - layer.startTime;
                    if (localTime < 0 || localTime > layer.duration) {
                        continue;
                    }
                    const progress = Math.min(Math.max(localTime / Math.max(layer.duration, 1e-7), 0), 1);
                    const gradientColor = sampleGradient(layer.gradient.colors, progress) as [
                        number,
                        number,
                        number
                    ];
                    const gradientAlpha = sampleGradient(layer.gradient.alphas, progress) as number;
                    const curveAlpha = layer.useAlphaCurve ? sampleCurve(layer.alphaCurve, progress) : 1;
                    const texture = textureMap.get(layer.texture)?.texture;
                    if (!texture) {
                        continue;
                    }
                    bindArrays(makeSpriteVertices(layer, source.orthographicSize), makeSpriteUvs(layer));
                    gl.activeTexture(gl.TEXTURE0);
                    gl.bindTexture(gl.TEXTURE_2D, texture);
                    gl.uniform4f(textureStLocation, 1, 1, 0, 0);
                    gl.uniform4f(colorLocation, gradientColor[0], gradientColor[1], gradientColor[2], gradientAlpha * curveAlpha);
                    gl.uniform1f(intensityLocation, layer.intensity);
                    gl.uniform1f(rampAmountLocation, 0);
                    gl.uniform1f(rampRangeLocation, 1);
                    gl.uniform1f(rampOffsetLocation, 0);
                    gl.uniform1f(regradingLocation, 0);
                    gl.uniform1f(mainAmountLocation, 1);
                    gl.uniform1f(inputBlackLocation, 0);
                    gl.uniform1f(inputWhiteLocation, 1);
                    gl.uniform1i(isMeshLocation, 0);
                    gl.drawArrays(gl.TRIANGLES, 0, 6);
                }
                const materialTime = activeTime - source.materialEvaluator.startTime;
                if (materialTime >= 0 && materialTime <= source.materialEvaluator.duration) {
                    const progress = Math.min(Math.max(materialTime / Math.max(source.materialEvaluator.duration, 1e-7), 0), 1);
                    const intensity = intensityProperty
                        ? intensityProperty.constant[0] * sampleCurve(intensityProperty.curveX, progress)
                        : source.material.floats._Intensity ?? 1;
                    const offsetX = stCurve
                        ? stCurve.constant[2] * sampleLoopingCurve(stCurve.curveZ, progress)
                        : stConstant[2];
                    const offsetY = stCurve
                        ? stCurve.constant[3] * sampleLoopingCurve(stCurve.curveW, progress)
                        : stConstant[3];
                    bindArrays(meshPositions, meshUvs, meshIndices);
                    gl.activeTexture(gl.TEXTURE0);
                    gl.bindTexture(gl.TEXTURE_2D, mainTexture);
                    gl.uniform4f(textureStLocation, stConstant[0], stConstant[1], offsetX, offsetY);
                    gl.uniform4f(colorLocation, mainColor[0] * tintColor[0], mainColor[1] * tintColor[1], mainColor[2] * tintColor[2], mainColor[3] * tintColor[3]);
                    gl.uniform1f(intensityLocation, intensity);
                    gl.uniform1f(rampAmountLocation, rampAmount);
                    gl.uniform1f(rampRangeLocation, rampRange);
                    gl.uniform1f(rampOffsetLocation, rampOffset);
                    gl.uniform1f(regradingLocation, regrading);
                    gl.uniform1f(mainAmountLocation, source.material.floats._MainTexAmount ?? 1);
                    gl.uniform1f(inputBlackLocation, source.material.floats._InputBlack ?? 0);
                    gl.uniform1f(inputWhiteLocation, source.material.floats._InputWhite ?? 1);
                    gl.uniform1i(isMeshLocation, 1);
                    gl.drawElements(gl.TRIANGLES, meshIndices.length, gl.UNSIGNED_SHORT, 0);
                }
                canvas.dataset.storySlashTraceReady = "true";
                canvas.dataset.storySlashTraceElapsed = activeTime.toFixed(3);
                if (elapsed < source.duration || pausedRef.current) {
                    animationFrame = window.requestAnimationFrame(draw);
                }
            };
            animationFrame = window.requestAnimationFrame(draw);
        })
            .catch((error: unknown) => {
            if (disposed || abort.signal.aborted) {
                return;
            }
            canvas.dataset.storySlashTraceError =
                error instanceof Error ? error.message : String(error);
        });
        return () => {
            disposed = true;
            abort.abort();
            window.cancelAnimationFrame(animationFrame);
            const gl = canvas.getContext("webgl");
            if (gl) {
                resources.forEach((resource) => {
                    if (resource instanceof WebGLBuffer) {
                        gl.deleteBuffer(resource);
                    }
                    else if (resource instanceof WebGLTexture) {
                        gl.deleteTexture(resource);
                    }
                    else if (resource instanceof WebGLShader) {
                        gl.deleteShader(resource);
                    }
                    else if (resource instanceof WebGLProgram) {
                        gl.deleteProgram(resource);
                    }
                });
            }
        };
    }, [effect, processId]);
    return (<canvas ref={canvasRef} className={className} data-story-slash-trace={effect.slashTrace?.dataPath ?? ""} aria-hidden="true"/>);
}
