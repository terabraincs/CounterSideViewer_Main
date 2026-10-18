"use client";
import { deploymentUrl } from "@/lib/deployment";
import { useEffect, useRef } from "react";
import type { StoryFxmCurveKey, StoryGameObjectEffect, StoryIceMaterialLayer, } from "@/lib/storyPlayback";
const VERTEX_SHADER = `
attribute vec2 a_position;
varying highp vec2 v_screen_uv;

void main() {
  v_screen_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;
// 원본 D3D11 pixel program의 무키워드 변형을 ICE/ICE_GRA가 실제로 쓰는
// 고정 분기(UV=Screen, channel=RGBA, MaskRef=Texture, SoftDissolve=1)로 줄였다.
// RGB는 PMA 상태로 출력되어 Unity의 One / OneMinusSrcAlpha 합성과 같다.
const FRAGMENT_SHADER = `
precision highp float;

varying highp vec2 v_screen_uv;

uniform sampler2D u_main_texture;
uniform sampler2D u_sub_texture;
uniform sampler2D u_mask_texture;
uniform sampler2D u_dissolve_texture;

uniform vec4 u_main_st;
uniform vec4 u_sub_st;
uniform vec4 u_mask_st;
uniform vec4 u_dissolve_st;
uniform vec2 u_main_scroll;
uniform vec2 u_sub_scroll;
uniform vec2 u_mask_scroll;
uniform vec2 u_dissolve_scroll;
uniform float u_main_angle;
uniform float u_sub_angle;
uniform float u_mask_angle;
uniform float u_dissolve_angle;
uniform float u_shader_time;

uniform vec4 u_main_color;
uniform vec4 u_sub_color;
uniform vec4 u_tint_color;
uniform float u_main_amount;
uniform float u_sub_amount;
uniform float u_mask_amount;
uniform float u_dissolve_amount;
uniform float u_intensity;
uniform float u_blend_factor;
uniform int u_sub_blend;

vec2 transform_screen_uv(
  vec2 uv,
  vec4 st,
  vec2 scroll,
  float angle
) {
  float radians = angle * 0.017453292519943295;
  float sine = sin(radians);
  float cosine = cos(radians);
  vec2 centered = uv - vec2(0.5);
  // Unity vertex program은 양의 각도를 시계 방향으로 적용한다.
  vec2 rotated = vec2(
    cosine * centered.x + sine * centered.y,
    -sine * centered.x + cosine * centered.y
  ) + vec2(0.5);
  return rotated * st.xy + st.zw + scroll * u_shader_time;
}

vec3 overlay_rgb(vec3 main_rgb, vec3 sub_pma_rgb) {
  vec3 low = 2.0 * main_rgb * sub_pma_rgb;
  vec3 high = 1.0 - 2.0 * (1.0 - main_rgb) * (1.0 - sub_pma_rgb);
  return mix(high, low, step(main_rgb, vec3(0.5)));
}

float overlay_alpha(float main_alpha, float sub_alpha) {
  float low = 2.0 * main_alpha * sub_alpha;
  float high = 1.0 - 2.0 * (1.0 - main_alpha) * (1.0 - sub_alpha);
  return main_alpha <= 0.5 ? low : high;
}

void main() {
  vec2 main_uv = transform_screen_uv(
    v_screen_uv, u_main_st, u_main_scroll, u_main_angle
  );
  vec2 sub_uv = transform_screen_uv(
    v_screen_uv, u_sub_st, u_sub_scroll, u_sub_angle
  );
  vec2 mask_uv = transform_screen_uv(
    v_screen_uv, u_mask_st, u_mask_scroll, u_mask_angle
  );
  vec2 dissolve_uv = transform_screen_uv(
    v_screen_uv, u_dissolve_st, u_dissolve_scroll, u_dissolve_angle
  );

  vec4 main_sample = texture2D(u_main_texture, main_uv) * u_main_color;
  vec4 main_color = mix(vec4(1.0), main_sample, u_main_amount);
  vec4 sub_color = texture2D(u_sub_texture, sub_uv) * u_sub_color;
  vec3 sub_pma_rgb = sub_color.rgb * sub_color.a;
  float add_alpha = clamp(main_color.a + sub_color.a, 0.0, 1.0);
  vec3 blended_rgb;
  float blended_alpha;

  if (u_sub_blend == 0) {
    float threshold = clamp(main_color.a - sub_color.a, 0.0, 1.0);
    blended_rgb = sub_color.a >= threshold ? sub_pma_rgb : main_color.rgb;
    blended_alpha = add_alpha;
  } else if (u_sub_blend == 1) {
    blended_rgb = main_color.rgb + sub_pma_rgb;
    blended_alpha = add_alpha;
  } else if (u_sub_blend == 2) {
    blended_rgb = 1.0 - (1.0 - main_color.rgb) * (1.0 - sub_pma_rgb);
    blended_alpha = add_alpha;
  } else if (u_sub_blend == 3) {
    blended_rgb = main_color.rgb * sub_pma_rgb;
    blended_alpha = clamp(main_color.a * sub_color.a, 0.0, 1.0);
  } else {
    blended_rgb = overlay_rgb(main_color.rgb, sub_pma_rgb);
    blended_alpha = overlay_alpha(main_color.a, sub_color.a);
  }

  vec4 material_color = mix(
    main_color,
    vec4(blended_rgb, blended_alpha),
    u_sub_amount
  );
  vec4 mask_sample = texture2D(u_mask_texture, mask_uv);
  material_color = mix(
    material_color,
    material_color * mask_sample,
    u_mask_amount
  );

  vec3 dissolve_sample = texture2D(u_dissolve_texture, dissolve_uv).rgb;
  float dissolve_noise = dot(
    dissolve_sample,
    vec3(0.300000012, 0.589999974, 0.109999999)
  );
  float dissolve_ratio = clamp(
    1.0 - u_dissolve_amount / max(dissolve_noise, 0.000001),
    0.0,
    1.0
  );
  float visible = dissolve_ratio * dissolve_ratio * (3.0 - 2.0 * dissolve_ratio);
  float pma_alpha = material_color.a * visible;
  vec4 result = vec4(material_color.rgb * pma_alpha, pma_alpha);

  result.rgb *= u_tint_color.rgb * u_tint_color.a * u_intensity;
  result.a *= u_tint_color.a * u_intensity * u_blend_factor;
  gl_FragColor = result;
}
`;
type IceUniforms = {
    mainTexture: WebGLUniformLocation;
    subTexture: WebGLUniformLocation;
    maskTexture: WebGLUniformLocation;
    dissolveTexture: WebGLUniformLocation;
    mainSt: WebGLUniformLocation;
    subSt: WebGLUniformLocation;
    maskSt: WebGLUniformLocation;
    dissolveSt: WebGLUniformLocation;
    mainScroll: WebGLUniformLocation;
    subScroll: WebGLUniformLocation;
    maskScroll: WebGLUniformLocation;
    dissolveScroll: WebGLUniformLocation;
    mainAngle: WebGLUniformLocation;
    subAngle: WebGLUniformLocation;
    maskAngle: WebGLUniformLocation;
    dissolveAngle: WebGLUniformLocation;
    shaderTime: WebGLUniformLocation;
    mainColor: WebGLUniformLocation;
    subColor: WebGLUniformLocation;
    tintColor: WebGLUniformLocation;
    mainAmount: WebGLUniformLocation;
    subAmount: WebGLUniformLocation;
    maskAmount: WebGLUniformLocation;
    dissolveAmount: WebGLUniformLocation;
    intensity: WebGLUniformLocation;
    blendFactor: WebGLUniformLocation;
    subBlend: WebGLUniformLocation;
};
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
        const duration = right.time - left.time;
        if (duration <= 0) {
            return right.value;
        }
        const leftSlope = Number(left.outSlope ?? 0);
        const rightSlope = Number(right.inSlope ?? 0);
        if (!Number.isFinite(leftSlope) || !Number.isFinite(rightSlope)) {
            return time < right.time ? left.value : right.value;
        }
        const progress = (time - left.time) / duration;
        const squared = progress * progress;
        const cubed = squared * progress;
        return ((2 * cubed - 3 * squared + 1) * left.value +
            (cubed - 2 * squared + progress) * leftSlope * duration +
            (-2 * cubed + 3 * squared) * right.value +
            (cubed - squared) * rightSlope * duration);
    }
    return keys.at(-1)?.value ?? 0;
}
function propertyOf(layer: StoryIceMaterialLayer, name: string) {
    return layer.properties.find((property) => property.name === name);
}
function scalarProperty(layer: StoryIceMaterialLayer, name: string, fallback: number, progress: number) {
    const property = propertyOf(layer, name);
    if (!property) {
        return fallback;
    }
    if (property.mode === 0) {
        return property.constant[0];
    }
    if (property.mode === 1) {
        return property.constant[0] * sampleCurve(property.curve, progress);
    }
    return fallback;
}
function vectorProperty(layer: StoryIceMaterialLayer, name: string, fallback: [
    number,
    number,
    number,
    number
]) {
    const property = propertyOf(layer, name);
    return property?.mode === 2 ? property.constant : fallback;
}
function colorProperty(layer: StoryIceMaterialLayer, name: string, fallback: [
    number,
    number,
    number,
    number
]) {
    const property = propertyOf(layer, name);
    return property?.mode === 9 ? property.color : fallback;
}
function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
    const shader = gl.createShader(type);
    if (!shader) {
        throw new Error("WebGL 셰이더를 만들지 못했습니다.");
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
function uniform(gl: WebGLRenderingContext, program: WebGLProgram, name: string) {
    const location = gl.getUniformLocation(program, name);
    if (!location) {
        throw new Error(`WebGL uniform이 없습니다: ${name}`);
    }
    return location;
}
function createTexture(gl: WebGLRenderingContext, image: HTMLImageElement, wrapU: number, wrapV: number) {
    const texture = gl.createTexture();
    if (!texture) {
        throw new Error("WebGL 텍스처를 만들지 못했습니다.");
    }
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
function loadImage(path: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new window.Image();
        image.decoding = "async";
        image.addEventListener("load", () => resolve(image), { once: true });
        image.addEventListener("error", () => reject(new Error(`ICE 텍스처를 읽지 못했습니다: ${path}`)), { once: true });
        image.src = deploymentUrl(path);
    });
}
export default function StoryIceMaterialEffect({ effect, processId, paused, className, }: {
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
        const source = effect.iceMaterial;
        if (!canvas || !source) {
            return;
        }
        const gl = canvas.getContext("webgl", {
            alpha: true,
            antialias: false,
            depth: false,
            premultipliedAlpha: true,
            preserveDrawingBuffer: false,
            stencil: false,
        });
        if (!gl) {
            canvas.dataset.storyIceError = "webgl-unavailable";
            return;
        }
        canvas.width = source.renderWidth;
        canvas.height = source.renderHeight;
        let disposed = false;
        let animationFrame = 0;
        let elapsed = 0;
        let previousTime = performance.now();
        const resources: Array<WebGLBuffer | WebGLProgram | WebGLShader | WebGLTexture> = [];
        Promise.all((["main", "sub", "mask", "dissolve"] as const).map(async (key) => ({
            key,
            image: await loadImage(source.textures[key].path),
        }))).then((loaded) => {
            if (disposed) {
                return;
            }
            try {
                const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
                const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
                const program = gl.createProgram();
                if (!program) {
                    throw new Error("WebGL 프로그램을 만들지 못했습니다.");
                }
                resources.push(vertexShader, fragmentShader, program);
                gl.attachShader(program, vertexShader);
                gl.attachShader(program, fragmentShader);
                gl.linkProgram(program);
                if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                    throw new Error(gl.getProgramInfoLog(program) ?? "WebGL 링크 오류");
                }
                gl.useProgram(program);
                const position = gl.getAttribLocation(program, "a_position");
                const buffer = gl.createBuffer();
                if (position < 0 || !buffer) {
                    throw new Error("WebGL 정점 버퍼를 만들지 못했습니다.");
                }
                resources.push(buffer);
                gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
                gl.enableVertexAttribArray(position);
                gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
                const uniforms: IceUniforms = {
                    mainTexture: uniform(gl, program, "u_main_texture"),
                    subTexture: uniform(gl, program, "u_sub_texture"),
                    maskTexture: uniform(gl, program, "u_mask_texture"),
                    dissolveTexture: uniform(gl, program, "u_dissolve_texture"),
                    mainSt: uniform(gl, program, "u_main_st"),
                    subSt: uniform(gl, program, "u_sub_st"),
                    maskSt: uniform(gl, program, "u_mask_st"),
                    dissolveSt: uniform(gl, program, "u_dissolve_st"),
                    mainScroll: uniform(gl, program, "u_main_scroll"),
                    subScroll: uniform(gl, program, "u_sub_scroll"),
                    maskScroll: uniform(gl, program, "u_mask_scroll"),
                    dissolveScroll: uniform(gl, program, "u_dissolve_scroll"),
                    mainAngle: uniform(gl, program, "u_main_angle"),
                    subAngle: uniform(gl, program, "u_sub_angle"),
                    maskAngle: uniform(gl, program, "u_mask_angle"),
                    dissolveAngle: uniform(gl, program, "u_dissolve_angle"),
                    shaderTime: uniform(gl, program, "u_shader_time"),
                    mainColor: uniform(gl, program, "u_main_color"),
                    subColor: uniform(gl, program, "u_sub_color"),
                    tintColor: uniform(gl, program, "u_tint_color"),
                    mainAmount: uniform(gl, program, "u_main_amount"),
                    subAmount: uniform(gl, program, "u_sub_amount"),
                    maskAmount: uniform(gl, program, "u_mask_amount"),
                    dissolveAmount: uniform(gl, program, "u_dissolve_amount"),
                    intensity: uniform(gl, program, "u_intensity"),
                    blendFactor: uniform(gl, program, "u_blend_factor"),
                    subBlend: uniform(gl, program, "u_sub_blend"),
                };
                const textures = new Map<string, WebGLTexture>();
                loaded.forEach(({ key, image }, textureIndex) => {
                    const metadata = source.textures[key];
                    const texture = createTexture(gl, image, metadata.wrapU, metadata.wrapV);
                    resources.push(texture);
                    textures.set(key, texture);
                    gl.activeTexture(gl.TEXTURE0 + textureIndex);
                    gl.bindTexture(gl.TEXTURE_2D, texture);
                    gl.uniform1i(key === "main"
                        ? uniforms.mainTexture
                        : key === "sub"
                            ? uniforms.subTexture
                            : key === "mask"
                                ? uniforms.maskTexture
                                : uniforms.dissolveTexture, textureIndex);
                });
                const floats = source.material.floats;
                const colors = source.material.colors;
                const transforms = source.material.textureTransforms;
                const vector4 = (location: WebGLUniformLocation, values: number[]) => {
                    gl.uniform4f(location, values[0], values[1], values[2], values[3]);
                };
                const vector2 = (location: WebGLUniformLocation, x: number, y: number) => {
                    gl.uniform2f(location, x, y);
                };
                vector4(uniforms.mainSt, transforms._MainTex);
                vector4(uniforms.maskSt, transforms._Mask);
                vector4(uniforms.dissolveSt, transforms._Dissolve);
                vector2(uniforms.mainScroll, floats._MainTex_Scroll_X, floats._MainTex_Scroll_Y);
                vector2(uniforms.subScroll, floats._SubTex_Scroll_X, floats._SubTex_Scroll_Y);
                vector2(uniforms.maskScroll, floats._Mask_Scroll_X, floats._Mask_Scroll_Y);
                vector2(uniforms.dissolveScroll, floats._Dissolve_Scroll_X, floats._Dissolve_Scroll_Y);
                gl.uniform1f(uniforms.mainAngle, floats._MainTexAngle);
                gl.uniform1f(uniforms.subAngle, floats._SubTexAngle);
                gl.uniform1f(uniforms.maskAngle, floats._MaskAngle);
                gl.uniform1f(uniforms.dissolveAngle, floats._DissolveAngle);
                vector4(uniforms.mainColor, colors._MainTexColor);
                vector4(uniforms.subColor, colors._SubTexColor);
                gl.uniform1f(uniforms.mainAmount, floats._MainTexAmount);
                gl.uniform1f(uniforms.blendFactor, floats._BlendFactor);
                gl.viewport(0, 0, canvas.width, canvas.height);
                gl.disable(gl.DEPTH_TEST);
                gl.enable(gl.BLEND);
                gl.blendEquation(gl.FUNC_ADD);
                gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
                gl.clearColor(0, 0, 0, 0);
                canvas.dataset.storyIceReady = "true";
                const draw = (now: number) => {
                    if (disposed) {
                        return;
                    }
                    const delta = Math.min(Math.max((now - previousTime) / 1000, 0), 0.1);
                    previousTime = now;
                    if (!pausedRef.current) {
                        elapsed = Math.min(elapsed + delta, effect.duration);
                    }
                    const sourceTime = elapsed * source.timeScale;
                    gl.clear(gl.COLOR_BUFFER_BIT);
                    source.layers.forEach((layer) => {
                        if (sourceTime < layer.startTime) {
                            return;
                        }
                        const progress = layer.duration > 0
                            ? Math.min(Math.max((sourceTime - layer.startTime) / layer.duration, 0), 1)
                            : 1;
                        const intensity = scalarProperty(layer, "_Intensity", floats._Intensity, progress);
                        const dissolveAmount = scalarProperty(layer, "_DissolveAmount", floats._DissolveAmount, progress);
                        const maskAmount = scalarProperty(layer, "_MaskAmount", floats._MaskAmount, progress);
                        const subAmount = scalarProperty(layer, "_SubTexAmount", floats._SubTexAmount, progress);
                        const subBlend = Math.trunc(scalarProperty(layer, "_Subblend", floats._Subblend, progress));
                        const subSt = vectorProperty(layer, "_SubTex_ST", transforms._SubTex);
                        const tintColor = colorProperty(layer, "_TintColor", colors._TintColor);
                        vector4(uniforms.subSt, subSt);
                        vector4(uniforms.tintColor, tintColor);
                        gl.uniform1f(uniforms.shaderTime, elapsed);
                        gl.uniform1f(uniforms.intensity, intensity);
                        gl.uniform1f(uniforms.dissolveAmount, dissolveAmount);
                        gl.uniform1f(uniforms.maskAmount, maskAmount);
                        gl.uniform1f(uniforms.subAmount, subAmount);
                        gl.uniform1i(uniforms.subBlend, subBlend);
                        gl.drawArrays(gl.TRIANGLES, 0, 6);
                    });
                    canvas.dataset.storyIceSourceTime = sourceTime.toFixed(3);
                    canvas.dataset.storyIceLayerCount = String(source.layers.length);
                    animationFrame = requestAnimationFrame(draw);
                };
                animationFrame = requestAnimationFrame(draw);
            }
            catch (error) {
                canvas.dataset.storyIceError =
                    error instanceof Error ? error.message : "unknown-webgl-error";
            }
        }).catch((error) => {
            canvas.dataset.storyIceError =
                error instanceof Error ? error.message : "unknown-texture-error";
        });
        return () => {
            disposed = true;
            cancelAnimationFrame(animationFrame);
            resources.forEach((resource) => {
                if (resource instanceof WebGLTexture) {
                    gl.deleteTexture(resource);
                }
                else if (resource instanceof WebGLBuffer) {
                    gl.deleteBuffer(resource);
                }
                else if (resource instanceof WebGLProgram) {
                    gl.deleteProgram(resource);
                }
                else if (resource instanceof WebGLShader) {
                    gl.deleteShader(resource);
                }
            });
        };
    }, [effect, processId]);
    return (<canvas ref={canvasRef} className={className} data-story-ice-material={effect.iceMaterial?.shader ?? ""} data-story-ice-process={processId} aria-hidden="true"/>);
}
