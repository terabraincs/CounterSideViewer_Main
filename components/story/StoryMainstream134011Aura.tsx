"use client";
import { deploymentUrl } from "@/lib/deployment";
import { useEffect, useRef } from "react";
import type { StoryGameObjectEffect, StoryMainstream134011AuraProperty, StoryMainstream134011AuraSource, } from "@/lib/storyPlayback";
const VERTEX_SHADER = `
attribute vec2 a_position;
attribute vec2 a_uv;
uniform mat3 u_matrix;
varying highp vec2 v_uv;

void main() {
  vec3 pixel = u_matrix * vec3(a_position, 1.0);
  gl_Position = vec4(pixel.x / 960.0, pixel.y / 540.0, 0.0, 1.0);
  v_uv = a_uv;
}
`;
// 원본 SB-FX-Main-Sub-ColorRamp-Mask DXBC에서 이 재질이 선택한 고정 분기만 사용한다.
const FRAGMENT_SHADER = `
precision highp float;

varying highp vec2 v_uv;
uniform sampler2D u_main;
uniform sampler2D u_ramp;
uniform vec4 u_main_st;
uniform vec4 u_sub_st;
uniform vec4 u_mask_st;
uniform vec4 u_main_color;
uniform vec4 u_sub_color;
uniform vec4 u_tint;
uniform float u_intensity;
uniform float u_ramp_range;
uniform float u_ramp_offset;
uniform float u_mask_hardness;
uniform float u_mask_inner;
uniform float u_mask_outer;

void main() {
  vec2 mainUv = v_uv * u_main_st.xy + u_main_st.zw;
  vec2 subUv = v_uv * u_sub_st.xy + u_sub_st.zw;
  vec2 maskUv = v_uv * u_mask_st.xy + u_mask_st.zw;
  // Channel 0은 R 선택이 아니라 원본 RGBA 전체를 그대로 사용하는 분기다.
  vec4 mainValue = texture2D(u_main, mainUv) * u_main_color;
  vec4 subValue = texture2D(u_main, subUv) * u_sub_color;
  // 원본 고정 분기 Subblend=3: RGB는 sub alpha를 포함한 multiply, alpha도 multiply.
  vec4 combined = vec4(
    mainValue.rgb * subValue.rgb * subValue.a,
    mainValue.a * subValue.a
  );
  vec3 graded = clamp(combined.rgb, 0.0, 1.0);
  float luminance = dot(graded, vec3(0.3, 0.59, 0.11));
  vec3 ramp = texture2D(
    u_ramp,
    vec2(clamp(luminance / clamp(u_ramp_range, 0.01, 5.0), 0.0, 1.0), 1.0 - u_ramp_offset)
  ).rgb;
  float midpoint = (u_mask_inner + u_mask_outer) * 0.5;
  float radius = length(vec2(0.5) - maskUv);
  float radialMask = 1.0 - pow(
    clamp(abs(radius - midpoint) / max(u_mask_outer - midpoint, 0.000001), 0.0, 1.0),
    u_mask_hardness
  );
  // 이 재질의 MaskRef=0, MaskAmount=1 고정 분기는 절차형 마스크를 alpha에만 적용한다.
  combined.a *= radialMask;
  gl_FragColor = vec4(graded * ramp, combined.a) * u_tint * u_intensity;
}
`;
function loadImage(path: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.decoding = "async";
        image.addEventListener("load", () => resolve(image), { once: true });
        image.addEventListener("error", () => reject(new Error(`134011 오라 텍스처를 읽지 못했습니다: ${path}`)), { once: true });
        image.src = deploymentUrl(path);
    });
}
function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
    const shader = gl.createShader(type);
    if (!shader) {
        throw new Error("134011 오라 WebGL 셰이더를 만들지 못했습니다.");
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
        throw new Error("134011 오라 WebGL 텍스처를 만들지 못했습니다.");
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return texture;
}
function property(properties: StoryMainstream134011AuraProperty[], name: string, mode: number) {
    return properties.find((item) => item.name === name && item.mode === mode);
}
function animateTime(initial: number, speed: number, elapsed: number) {
    const value = initial + elapsed * speed * 0.1;
    return ((value + 10) % 20 + 20) % 20 - 10;
}
function layerMatrix(chain: StoryMainstream134011AuraSource["layers"][number]["transformChain"]) {
    let matrix = [1, 0, 0, 1, 0, 0];
    chain.forEach((node) => {
        const radians = node.rotation * Math.PI / 180;
        const cosine = Math.cos(radians);
        const sine = Math.sin(radians);
        const right = [
            cosine * node.scaleX,
            sine * node.scaleX,
            -sine * node.scaleY,
            cosine * node.scaleY,
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
function uniform(gl: WebGLRenderingContext, program: WebGLProgram, name: string) {
    const location = gl.getUniformLocation(program, name);
    if (location === null) {
        throw new Error(`134011 오라 WebGL uniform이 없습니다: ${name}`);
    }
    return location;
}
export default function StoryMainstream134011Aura({ effect, activePaths, side, processId, paused, className, }: {
    effect: StoryGameObjectEffect;
    activePaths: string[];
    side: "back" | "front";
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
        const metadata = effect.mainstream134011Aura;
        if (!canvas || !metadata || activePaths.length === 0) {
            return;
        }
        const abort = new AbortController();
        let disposed = false;
        let frame = 0;
        const resources: Array<WebGLBuffer | WebGLProgram | WebGLShader | WebGLTexture> = [];
        void fetch(deploymentUrl(metadata.dataPath), { signal: abort.signal })
            .then(async (response) => {
            if (!response.ok) {
                throw new Error(`134011 오라 원본 데이터 응답 오류: ${response.status}`);
            }
            const source = (await response.json()) as StoryMainstream134011AuraSource;
            const images = await Promise.all([
                loadImage(source.textures.main),
                loadImage(source.textures.ramp),
            ]);
            return { source, images };
        })
            .then(({ source, images }) => {
            if (disposed) {
                return;
            }
            canvas.width = source.renderWidth;
            canvas.height = source.renderHeight;
            const gl = canvas.getContext("webgl", {
                alpha: true,
                antialias: true,
                depth: false,
                premultipliedAlpha: false,
            });
            if (!gl) {
                throw new Error("134011 오라 WebGL을 사용할 수 없습니다.");
            }
            const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
            const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
            const program = gl.createProgram();
            if (!program) {
                throw new Error("134011 오라 WebGL 프로그램을 만들지 못했습니다.");
            }
            resources.push(vertexShader, fragmentShader, program);
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                throw new Error(gl.getProgramInfoLog(program) ?? "134011 오라 WebGL 링크 오류");
            }
            gl.useProgram(program);
            const positionBuffer = gl.createBuffer();
            const uvBuffer = gl.createBuffer();
            const indexBuffer = gl.createBuffer();
            const positionLocation = gl.getAttribLocation(program, "a_position");
            const uvLocation = gl.getAttribLocation(program, "a_uv");
            if (!positionBuffer || !uvBuffer || !indexBuffer || positionLocation < 0 || uvLocation < 0) {
                throw new Error("134011 오라 WebGL 버퍼를 만들지 못했습니다.");
            }
            resources.push(positionBuffer, uvBuffer, indexBuffer);
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(source.mesh.positions), gl.STATIC_DRAW);
            gl.enableVertexAttribArray(positionLocation);
            gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(source.mesh.uvs), gl.STATIC_DRAW);
            gl.enableVertexAttribArray(uvLocation);
            gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(source.mesh.indices), gl.STATIC_DRAW);
            images.forEach((image, index) => {
                gl.activeTexture(gl.TEXTURE0 + index);
                const texture = createTexture(gl, image);
                resources.push(texture);
                gl.bindTexture(gl.TEXTURE_2D, texture);
            });
            gl.uniform1i(uniform(gl, program, "u_main"), 0);
            gl.uniform1i(uniform(gl, program, "u_ramp"), 1);
            const floats = source.material.floats;
            const colors = source.material.colors;
            const mainColor = colors._MainTexColor ?? [1, 1, 1, 1];
            const subColor = colors._SubTexColor ?? [1, 1, 1, 1];
            const tint = colors._TintColor ?? [1, 1, 1, 1];
            gl.uniform4fv(uniform(gl, program, "u_main_color"), mainColor);
            gl.uniform4fv(uniform(gl, program, "u_sub_color"), subColor);
            gl.uniform4fv(uniform(gl, program, "u_tint"), tint);
            gl.uniform1f(uniform(gl, program, "u_ramp_range"), floats._RampRange ?? 1);
            gl.uniform1f(uniform(gl, program, "u_ramp_offset"), floats._RampOffset ?? 0);
            gl.uniform1f(uniform(gl, program, "u_mask_hardness"), floats._MaskHardness ?? 1);
            gl.uniform1f(uniform(gl, program, "u_mask_inner"), floats._MaskInner ?? 0);
            gl.uniform1f(uniform(gl, program, "u_mask_outer"), floats._MaskOuter ?? 1);
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
            gl.disable(gl.CULL_FACE);
            gl.disable(gl.DEPTH_TEST);
            gl.viewport(0, 0, source.renderWidth, source.renderHeight);
            const selected = source.layers.filter((layer) => layer.camera === side && activePaths.includes(layer.path));
            const matrixLocation = uniform(gl, program, "u_matrix");
            const mainStLocation = uniform(gl, program, "u_main_st");
            const subStLocation = uniform(gl, program, "u_sub_st");
            const maskStLocation = uniform(gl, program, "u_mask_st");
            const intensityLocation = uniform(gl, program, "u_intensity");
            let elapsed = 0;
            let previous = performance.now();
            canvas.dataset.storyMainstream134011AuraReady = "true";
            const render = (now: number) => {
                if (disposed) {
                    return;
                }
                if (!pausedRef.current) {
                    elapsed += Math.max(0, Math.min(now - previous, 100)) / 1000;
                }
                previous = now;
                gl.clearColor(0, 0, 0, 0);
                gl.clear(gl.COLOR_BUFFER_BIT);
                selected.forEach((layer) => {
                    const mainBase = source.material.textureTransforms._MainTex ?? [1, 1, 0, 0];
                    const subBase = source.material.textureTransforms._SubTex ?? [1, 1, 0, 0];
                    const maskBase = source.material.textureTransforms._Mask ?? [1, 1, 0, 0];
                    const mainScale = property(layer.properties, "_MainTex_ST", 2)?.constant ?? [1, 1, 0, 0];
                    const mainMotion = property(layer.properties, "_MainTex_ST", 17);
                    const subScale = property(layer.properties, "_SubTex_ST", 2)?.constant ?? [1, 1, 0, 0];
                    const subMotion = property(layer.properties, "_SubTex_ST", 17);
                    const intensity = property(layer.properties, "_Intensity", 12)?.constant[0] ?? 1;
                    gl.uniformMatrix3fv(matrixLocation, false, layerMatrix(layer.transformChain));
                    gl.uniform4f(mainStLocation, mainScale[0], mainScale[1], mainBase[2] + animateTime(mainMotion?.constant[2] ?? 0, mainMotion?.time[2] ?? 0, elapsed), mainBase[3] + animateTime(mainMotion?.constant[3] ?? 0, mainMotion?.time[3] ?? 0, elapsed));
                    gl.uniform4f(subStLocation, subScale[0], subScale[1], subBase[2] + animateTime(subMotion?.constant[2] ?? 0, subMotion?.time[2] ?? 0, elapsed), subBase[3] + animateTime(subMotion?.constant[3] ?? 0, subMotion?.time[3] ?? 0, elapsed));
                    gl.uniform4f(maskStLocation, maskBase[0], maskBase[1], maskBase[2], maskBase[3]);
                    gl.uniform1f(intensityLocation, intensity);
                    gl.drawElements(gl.TRIANGLES, source.mesh.indices.length, gl.UNSIGNED_SHORT, 0);
                });
                canvas.dataset.storyMainstream134011AuraElapsed = elapsed.toFixed(3);
                frame = requestAnimationFrame(render);
            };
            frame = requestAnimationFrame(render);
        })
            .catch(() => {
            if (!disposed) {
                canvas.dataset.storyMainstream134011AuraReady = "error";
            }
        });
        return () => {
            disposed = true;
            abort.abort();
            cancelAnimationFrame(frame);
            const gl = canvas.getContext("webgl");
            resources.forEach((resource) => {
                if (resource instanceof WebGLTexture)
                    gl?.deleteTexture(resource);
                else if (resource instanceof WebGLBuffer)
                    gl?.deleteBuffer(resource);
                else if (resource instanceof WebGLProgram)
                    gl?.deleteProgram(resource);
                else if (resource instanceof WebGLShader)
                    gl?.deleteShader(resource);
            });
        };
    }, [activePaths, effect, processId, side]);
    return (<canvas ref={canvasRef} className={className} width={1920} height={1080} data-story-mainstream-134011-aura-side={side} aria-hidden="true"/>);
}
