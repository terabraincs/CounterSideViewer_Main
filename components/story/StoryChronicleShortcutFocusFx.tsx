"use client";
import { deploymentUrl } from "@/lib/deployment";
import { useEffect, useRef } from "react";
const TEXTURE_PATHS = {
    glow: "/story/map-ui/shortcut-focus/TEX_GLOW_LINE.png",
    ramp: "/story/map-ui/shortcut-focus/TEX_RAMP_ATLAS.png",
    noise: "/story/map-ui/shortcut-focus/NOISE_DISSOLVE_PIXEL_00.png",
    mask: "/story/map-ui/shortcut-focus/MASK_BEAM_DISSOLVE_01.png",
} as const;
const CAMERA_ORTHOGRAPHIC_SIZE = 5.1546630859375;
const MESH_SCALE_X = 2;
const PLANE_SCALE_X = 5;
const PLANE_SCALE_Y = 1.8875999450683594;
const PLAYER_DURATION_SECONDS = 2;
const GLOW_DURATION_SECONDS = 1;
const DISSOLVE_START_SECONDS = 0.5;
const DISSOLVE_DURATION_SECONDS = 0.699999988079071;
const GLOW_ANGLE_DEGREES = 77.80999755859375;
const DISSOLVE_INTENSITY_KEYS = [
    [0, 1, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY],
    [0.021138375625014305, 0.06755482405424118, -0.32249772548675537, -0.32249772548675537],
    [0.03950124606490135, 1, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY],
    [0.0495436005294323, 0.44743940234184265, -0.7099102735519409, -0.7099102735519409],
    [0.06338179856538773, 1, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY],
    [0.08504191040992737, 0.12972964346408844, 0.6993615031242371, 0.6993615031242371],
    [0.11287739872932434, 1, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY],
    [0.12138386070728302, 0.44743940234184265, -6.467914581298828, -6.467914581298828],
    [0.13105042278766632, 1, Number.POSITIVE_INFINITY, 0.0037336652167141438],
    [0.15827523171901703, 0, Number.POSITIVE_INFINITY, -0.6177986860275269],
    [0.1894558072090149, 1, Number.POSITIVE_INFINITY, -1.0854707956314087],
    [0.20499944686889648, 0.44743940234184265, Number.POSITIVE_INFINITY, -1.4587572813034058],
    [0.22721625864505768, 1, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY],
    [0.27669456601142883, 0.29547959566116333, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY],
    [0.2913869619369507, 1, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY],
    [0.3217320144176483, 0.6891841888427734, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY],
    [0.3585091233253479, 1, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY],
] as const;
const DISSOLVE_ALPHA_KEYS = [
    [0, 0],
    [0.18863202868696116, 0.9714357852935791],
    [0.768184939345388, 1],
    [1, 0],
] as const;
const GLOW_OFFSET_KEYS = [
    [0, -1, 0, 0],
    [1, 1, 0, 0],
] as const;
const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
in vec2 a_uv;
out highp vec2 v_uv;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_uv = a_uv;
}`;
// STV-CHR-055: pass one evaluates the two fixed client materials into their
// 512x512 gamma-project RGB10_A2 RenderTexture (Unity ARGB2101010). Their zero
// BlendFactor deliberately keeps additive RGB while alpha remains zero.
const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in highp vec2 v_uv;
uniform sampler2D u_glow;
uniform sampler2D u_ramp;
uniform sampler2D u_noise;
uniform sampler2D u_mask;
uniform vec4 u_main_st;
uniform vec4 u_sub_st;
uniform vec4 u_dissolve_st;
uniform vec4 u_tint;
uniform float u_angle;
uniform float u_intensity;
uniform float u_blend_factor;
uniform float u_color_ramp_amount;
uniform float u_sub_amount;
uniform float u_dissolve_amount;
uniform int u_layer;
out vec4 fragment_color;

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

vec3 overlay(vec3 base, vec3 blend) {
  vec3 low = 2.0 * base * blend;
  vec3 high = 1.0 - 2.0 * (1.0 - base) * (1.0 - blend);
  return mix(low, high, step(vec3(0.5), base));
}

void main() {
  if (u_layer == 0) {
    vec4 main_sample = texture(
      u_glow,
      transform_uv(v_uv, u_main_st, u_angle)
    );
    float luminance = dot(
      main_sample.rgb,
      vec3(0.300000012, 0.589999974, 0.109999999)
    );
    vec3 ramp = texture(u_ramp, vec2(luminance / 1.11, 0.889)).rgb;
    main_sample.rgb = mix(main_sample.rgb, main_sample.rgb * ramp, u_color_ramp_amount);
    fragment_color = vec4(
      main_sample.rgb * u_tint.rgb * u_tint.a * u_intensity,
      main_sample.a * u_tint.a * u_intensity * u_blend_factor
    );
    return;
  }

  vec4 main_sample = texture(u_noise, transform_uv(v_uv, u_main_st, 0.0));
  vec4 sub_sample = texture(u_mask, transform_uv(v_uv, u_sub_st, 45.0));
  vec4 composed = mix(
    main_sample,
    vec4(overlay(main_sample.rgb, sub_sample.rgb * sub_sample.a), main_sample.a),
    u_sub_amount
  );
  vec3 dissolve_sample = texture(
    u_noise,
    transform_uv(v_uv, u_dissolve_st, 0.0)
  ).rgb;
  float dissolve_luminance = dot(
    dissolve_sample,
    vec3(0.300000012, 0.589999974, 0.109999999)
  );
  float visible = step(u_dissolve_amount, dissolve_luminance);
  composed *= visible;
  fragment_color = vec4(
    composed.rgb * u_tint.rgb * u_tint.a * u_intensity,
    composed.a * u_tint.a * u_intensity * u_blend_factor
  );
}`;
// CMN_FX_SPRITE_UI_PM samples the completed RenderTexture bilinearly and
// doubles it. A coverage alpha is added only at the browser boundary so the
// valid premultiplied canvas can be combined with CSS plus-lighter.
const PRESENT_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in highp vec2 v_uv;
uniform sampler2D u_source;
out vec4 fragment_color;

void main() {
  vec4 source = texture(u_source, v_uv);
  vec3 rgb = min(source.rgb * 2.0, vec3(1.0));
  float coverage = max(rgb.r, max(rgb.g, rgb.b));
  fragment_color = vec4(rgb, coverage);
}`;
const imagePromises = new Map<string, Promise<HTMLImageElement>>();
type CurveKey = readonly [
    number,
    number,
    number,
    number
];
function loadImage(path: string) {
    const existing = imagePromises.get(path);
    if (existing)
        return existing;
    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.decoding = "async";
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`Shortcut FocusFX texture load failed: ${path}`));
        image.src = deploymentUrl(path);
    });
    imagePromises.set(path, promise);
    return promise;
}
export function preloadStoryChronicleShortcutFocusTextures() {
    Object.values(TEXTURE_PATHS).forEach((path) => {
        void loadImage(path).catch(() => undefined);
    });
}
function compileShader(gl: WebGL2RenderingContext, type: number, source: string) {
    const shader = gl.createShader(type);
    if (!shader)
        throw new Error("Shortcut FocusFX shader creation failed");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const detail = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(detail ?? "Shortcut FocusFX shader compile failed");
    }
    return shader;
}
function createTexture(gl: WebGL2RenderingContext, image: HTMLImageElement, filter: number, wrapS: number, wrapT: number) {
    const texture = gl.createTexture();
    if (!texture)
        throw new Error("Shortcut FocusFX texture creation failed");
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);
    return texture;
}
function sampleCurve(keys: readonly CurveKey[], progress: number) {
    const f32 = Math.fround;
    const firstTime = f32(keys[0][0]);
    const lastTime = f32(keys[keys.length - 1][0]);
    let time = f32(progress);
    // The client curve's m_PostInfinity is WrapMode.Loop (1). The last key is
    // intentionally before normalized time 1, so clamping here would erase most
    // of the dissolve material's pulsing sequence.
    if (time > lastTime) {
        const duration = f32(lastTime - firstTime);
        const offset = f32(time - firstTime);
        time = f32(firstTime +
            f32(offset - f32(Math.floor(f32(offset / duration)) * duration)));
    }
    if (time <= firstTime)
        return f32(keys[0][1]);
    for (let index = 1; index < keys.length; index += 1) {
        const right = keys[index];
        const rightTime = f32(right[0]);
        if (time > rightTime)
            continue;
        const left = keys[index - 1];
        const leftTime = f32(left[0]);
        if (!Number.isFinite(left[3]) || !Number.isFinite(right[2])) {
            return f32(time < rightTime ? left[1] : right[1]);
        }
        const leftValue = f32(left[1]);
        const rightValue = f32(right[1]);
        const duration = f32(rightTime - leftTime);
        const valueDelta = f32(rightValue - leftValue);
        const inverseDuration = f32(1 / duration);
        const leftTangent = f32(left[3]);
        const rightTangent = f32(right[2]);
        const tangentA = f32(leftTangent * duration);
        const tangentB = f32(duration * rightTangent);
        const inverseDurationSquared = f32(inverseDuration * inverseDuration);
        let cubic = f32(tangentB + tangentA);
        cubic = f32(cubic - valueDelta);
        cubic = f32(cubic - valueDelta);
        cubic = f32(cubic * inverseDurationSquared);
        cubic = f32(cubic * inverseDuration);
        let quadratic = f32(valueDelta + valueDelta);
        quadratic = f32(quadratic + valueDelta);
        quadratic = f32(quadratic - tangentA);
        quadratic = f32(quadratic - tangentA);
        quadratic = f32(quadratic - tangentB);
        quadratic = f32(quadratic * inverseDurationSquared);
        const delta = f32(time - leftTime);
        let value = f32(cubic * delta);
        value = f32(value + quadratic);
        value = f32(value * delta);
        value = f32(value + leftTangent);
        value = f32(value * delta);
        return f32(value + leftValue);
    }
    return f32(keys.at(-1)?.[1] ?? 1);
}
function sampleLinear(keys: typeof DISSOLVE_ALPHA_KEYS, progress: number) {
    const f32 = Math.fround;
    const time = f32(progress);
    if (time <= f32(keys[0][0]))
        return f32(keys[0][1]);
    for (let index = 1; index < keys.length; index += 1) {
        const right = keys[index];
        const rightTime = f32(right[0]);
        if (time > rightTime)
            continue;
        const left = keys[index - 1];
        const leftTime = f32(left[0]);
        const duration = f32(rightTime - leftTime);
        const amount = f32(f32(time - leftTime) / duration);
        const leftValue = f32(left[1]);
        const difference = f32(f32(right[1]) - leftValue);
        return f32(leftValue + f32(difference * amount));
    }
    return f32(keys.at(-1)?.[1] ?? 0);
}
export default function StoryChronicleShortcutFocusFx({ activationKey, variant, className, onComplete, }: {
    activationKey: number;
    variant: "small" | "large";
    className: string;
    onComplete?: (activationKey: number) => void;
}) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const gl = canvas.getContext("webgl2", {
            alpha: true,
            antialias: false,
            depth: false,
            premultipliedAlpha: true,
            preserveDrawingBuffer: true,
            stencil: false,
        });
        if (!gl) {
            canvas.dataset.storyChronicleShortcutFocusState = "unsupported";
            canvas.style.visibility = "hidden";
            onCompleteRef.current?.(activationKey);
            return;
        }
        canvas.style.visibility = "visible";
        canvas.dataset.storyChronicleShortcutFocusState = "loading";
        let disposed = false;
        let animationFrame = 0;
        let released = false;
        let contextLost = false;
        const buffers: WebGLBuffer[] = [];
        const shaders: WebGLShader[] = [];
        const programs: WebGLProgram[] = [];
        const textures: WebGLTexture[] = [];
        const framebuffers: WebGLFramebuffer[] = [];
        const release = () => {
            if (released)
                return;
            released = true;
            framebuffers.forEach((framebuffer) => gl.deleteFramebuffer(framebuffer));
            textures.forEach((texture) => gl.deleteTexture(texture));
            buffers.forEach((buffer) => gl.deleteBuffer(buffer));
            programs.forEach((program) => gl.deleteProgram(program));
            shaders.forEach((shader) => gl.deleteShader(shader));
        };
        const loseContext = () => {
            if (contextLost)
                return;
            contextLost = true;
            gl.getExtension("WEBGL_lose_context")?.loseContext();
        };
        Promise.all(Object.entries(TEXTURE_PATHS).map(async ([name, path]) => [
            name,
            await loadImage(path),
        ] as const))
            .then((loaded) => {
            if (disposed)
                return;
            const images = new Map(loaded);
            const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
            const materialFragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
            const presentFragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, PRESENT_FRAGMENT_SHADER);
            shaders.push(vertexShader, materialFragmentShader, presentFragmentShader);
            const createProgram = (fragmentShader: WebGLShader) => {
                const program = gl.createProgram();
                if (!program) {
                    throw new Error("Shortcut FocusFX program creation failed");
                }
                programs.push(program);
                gl.attachShader(program, vertexShader);
                gl.attachShader(program, fragmentShader);
                gl.linkProgram(program);
                if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                    throw new Error(gl.getProgramInfoLog(program) ??
                        "Shortcut FocusFX program link failed");
                }
                return program;
            };
            const materialProgram = createProgram(materialFragmentShader);
            const presentProgram = createProgram(presentFragmentShader);
            const halfWidth = (MESH_SCALE_X * PLANE_SCALE_X * 0.5) /
                CAMERA_ORTHOGRAPHIC_SIZE;
            const halfHeight = (PLANE_SCALE_Y * 0.5) / CAMERA_ORTHOGRAPHIC_SIZE;
            const sourcePositionBuffer = gl.createBuffer();
            const presentPositionBuffer = gl.createBuffer();
            const uvBuffer = gl.createBuffer();
            const indexBuffer = gl.createBuffer();
            if (!sourcePositionBuffer ||
                !presentPositionBuffer ||
                !uvBuffer ||
                !indexBuffer) {
                throw new Error("Shortcut FocusFX mesh buffer creation failed");
            }
            buffers.push(sourcePositionBuffer, presentPositionBuffer, uvBuffer, indexBuffer);
            gl.bindBuffer(gl.ARRAY_BUFFER, sourcePositionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
                -halfWidth, -halfHeight,
                halfWidth, -halfHeight,
                halfWidth, halfHeight,
                -halfWidth, halfHeight,
            ]), gl.STATIC_DRAW);
            gl.bindBuffer(gl.ARRAY_BUFFER, presentPositionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]), gl.STATIC_DRAW);
            gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), gl.STATIC_DRAW);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
            const bindMesh = (program: WebGLProgram, positionBuffer: WebGLBuffer) => {
                const positionLocation = gl.getAttribLocation(program, "a_position");
                const uvLocation = gl.getAttribLocation(program, "a_uv");
                gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
                gl.enableVertexAttribArray(positionLocation);
                gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
                gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
                gl.enableVertexAttribArray(uvLocation);
                gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 0, 0);
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
            };
            const textureByName = new Map<string, WebGLTexture>();
            const textureContract = [
                ["glow", gl.LINEAR, gl.REPEAT, gl.CLAMP_TO_EDGE],
                ["ramp", gl.LINEAR, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE],
                ["noise", gl.NEAREST, gl.REPEAT, gl.REPEAT],
                ["mask", gl.LINEAR, gl.REPEAT, gl.REPEAT],
            ] as const;
            textureContract.forEach(([name, filter, wrapS, wrapT]) => {
                const image = images.get(name);
                if (!image)
                    throw new Error(`Shortcut FocusFX image missing: ${name}`);
                const texture = createTexture(gl, image, filter, wrapS, wrapT);
                textures.push(texture);
                textureByName.set(name, texture);
            });
            const renderTexture = gl.createTexture();
            const framebuffer = gl.createFramebuffer();
            if (!renderTexture || !framebuffer) {
                throw new Error("Shortcut FocusFX RenderTexture creation failed");
            }
            textures.push(renderTexture);
            framebuffers.push(framebuffer);
            gl.activeTexture(gl.TEXTURE4);
            gl.bindTexture(gl.TEXTURE_2D, renderTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB10_A2, 512, 512, 0, gl.RGBA, gl.UNSIGNED_INT_2_10_10_10_REV, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, renderTexture, 0);
            if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !==
                gl.FRAMEBUFFER_COMPLETE) {
                throw new Error("Shortcut FocusFX RenderTexture is incomplete");
            }
            gl.useProgram(materialProgram);
            const uniform = (program: WebGLProgram, name: string) => {
                const location = gl.getUniformLocation(program, name);
                if (location === null) {
                    throw new Error(`Shortcut FocusFX uniform missing: ${name}`);
                }
                return location;
            };
            const uniforms = {
                glow: uniform(materialProgram, "u_glow"),
                ramp: uniform(materialProgram, "u_ramp"),
                noise: uniform(materialProgram, "u_noise"),
                mask: uniform(materialProgram, "u_mask"),
                mainSt: uniform(materialProgram, "u_main_st"),
                subSt: uniform(materialProgram, "u_sub_st"),
                dissolveSt: uniform(materialProgram, "u_dissolve_st"),
                tint: uniform(materialProgram, "u_tint"),
                angle: uniform(materialProgram, "u_angle"),
                intensity: uniform(materialProgram, "u_intensity"),
                blendFactor: uniform(materialProgram, "u_blend_factor"),
                colorRampAmount: uniform(materialProgram, "u_color_ramp_amount"),
                subAmount: uniform(materialProgram, "u_sub_amount"),
                dissolveAmount: uniform(materialProgram, "u_dissolve_amount"),
                layer: uniform(materialProgram, "u_layer"),
            };
            const presentSource = uniform(presentProgram, "u_source");
            (["glow", "ramp", "noise", "mask"] as const).forEach((name, unit) => {
                gl.activeTexture(gl.TEXTURE0 + unit);
                gl.bindTexture(gl.TEXTURE_2D, textureByName.get(name) ?? null);
                gl.uniform1i(uniforms[name], unit);
            });
            const syncCanvasBackingSize = () => {
                const bounds = canvas.getBoundingClientRect();
                const density = Math.max(window.devicePixelRatio || 1, 1);
                const width = Math.max(1, Math.round(bounds.width * density));
                const height = Math.max(1, Math.round(bounds.height * density));
                if (canvas.width !== width)
                    canvas.width = width;
                if (canvas.height !== height)
                    canvas.height = height;
                canvas.dataset.storyChronicleShortcutFocusDisplayPixels =
                    `${width}x${height}`;
            };
            syncCanvasBackingSize();
            gl.disable(gl.CULL_FACE);
            gl.disable(gl.DEPTH_TEST);
            gl.disable(gl.DITHER);
            gl.blendEquation(gl.FUNC_ADD);
            gl.clearColor(0, 0, 0, 0);
            gl.useProgram(materialProgram);
            gl.uniform1f(uniforms.blendFactor, 0);
            gl.uniform1f(uniforms.colorRampAmount, 0);
            gl.uniform1f(uniforms.subAmount, 0);
            gl.useProgram(presentProgram);
            gl.activeTexture(gl.TEXTURE4);
            gl.bindTexture(gl.TEXTURE_2D, renderTexture);
            gl.uniform1i(presentSource, 4);
            canvas.dataset.storyChronicleShortcutFocusState = "ready";
            const activatedAt = performance.now();
            const drawLayer = (layer: 0 | 1, mainSt: [
                number,
                number,
                number,
                number
            ], subSt: [
                number,
                number,
                number,
                number
            ], dissolveSt: [
                number,
                number,
                number,
                number
            ], angle: number, tint: [
                number,
                number,
                number,
                number
            ], intensity: number, dissolveAmount: number) => {
                gl.useProgram(materialProgram);
                gl.uniform1i(uniforms.layer, layer);
                gl.uniform4fv(uniforms.mainSt, mainSt);
                gl.uniform4fv(uniforms.subSt, subSt);
                gl.uniform4fv(uniforms.dissolveSt, dissolveSt);
                gl.uniform1f(uniforms.angle, angle);
                gl.uniform4fv(uniforms.tint, tint);
                gl.uniform1f(uniforms.intensity, intensity);
                gl.uniform1f(uniforms.dissolveAmount, dissolveAmount);
                gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
            };
            const render = (now: number) => {
                if (disposed)
                    return;
                const f32 = Math.fround;
                const elapsed = f32(Math.min(Math.max(f32(f32(now - activatedAt) / 1000), 0), PLAYER_DURATION_SECONDS));
                syncCanvasBackingSize();
                gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
                gl.viewport(0, 0, 512, 512);
                gl.useProgram(materialProgram);
                bindMesh(materialProgram, sourcePositionBuffer);
                gl.enable(gl.BLEND);
                gl.blendEquation(gl.FUNC_ADD);
                gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
                gl.clear(gl.COLOR_BUFFER_BIT);
                if (elapsed < GLOW_DURATION_SECONDS) {
                    const progress = f32(elapsed / GLOW_DURATION_SECONDS);
                    const mainOffset = f32(1.2000000476837158 * sampleCurve(GLOW_OFFSET_KEYS, progress));
                    drawLayer(0, [1, 0.5, 0, mainOffset], [1, 1, 0, 0], [1, 1, 0, 0], GLOW_ANGLE_DEGREES, [1, 1, 1, 1], 1, 0);
                }
                const dissolveTime = f32(elapsed - DISSOLVE_START_SECONDS);
                if (dissolveTime >= 0 &&
                    dissolveTime < DISSOLVE_DURATION_SECONDS) {
                    const progress = f32(dissolveTime / DISSOLVE_DURATION_SECONDS);
                    const tintAlpha = sampleLinear(DISSOLVE_ALPHA_KEYS, progress);
                    const intensity = f32(sampleCurve(DISSOLVE_INTENSITY_KEYS, progress) * 0.5);
                    const dissolveAmount = f32(0.191619873046875 +
                        f32(0.808380126953125 * progress));
                    drawLayer(1, [1, 0.25, 0, 0], [1, 0.12, 0, 0.16], [1, 0.25, 0, 0], 0, [
                        0.6226415038108826,
                        0.6226415038108826,
                        0.6226415038108826,
                        tintAlpha,
                    ], intensity, dissolveAmount);
                }
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                gl.viewport(0, 0, canvas.width, canvas.height);
                gl.useProgram(presentProgram);
                bindMesh(presentProgram, presentPositionBuffer);
                gl.disable(gl.BLEND);
                gl.clear(gl.COLOR_BUFFER_BIT);
                gl.activeTexture(gl.TEXTURE4);
                gl.bindTexture(gl.TEXTURE_2D, renderTexture);
                gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
                canvas.dataset.storyChronicleShortcutFocusElapsed =
                    elapsed.toFixed(3);
                if (elapsed < PLAYER_DURATION_SECONDS) {
                    animationFrame = window.requestAnimationFrame(render);
                    return;
                }
                canvas.dataset.storyChronicleShortcutFocusState = "complete";
                canvas.style.visibility = "hidden";
                release();
                loseContext();
                onCompleteRef.current?.(activationKey);
            };
            animationFrame = window.requestAnimationFrame(render);
        })
            .catch((error) => {
            if (disposed)
                return;
            canvas.dataset.storyChronicleShortcutFocusState = "error";
            canvas.dataset.storyChronicleShortcutFocusError =
                error instanceof Error ? error.message : "unknown-error";
            canvas.style.visibility = "hidden";
            release();
            loseContext();
            onCompleteRef.current?.(activationKey);
        });
        return () => {
            disposed = true;
            window.cancelAnimationFrame(animationFrame);
            release();
            queueMicrotask(() => {
                if (!canvas.isConnected)
                    loseContext();
            });
        };
    }, [activationKey]);
    return (<canvas ref={canvasRef} className={className} width={512} height={512} data-story-chronicle-shortcut-focus-material="STV-CHR-055" data-story-chronicle-shortcut-focus-run={activationKey} data-story-chronicle-shortcut-focus-variant={variant} data-story-chronicle-shortcut-focus-render-texture="512x512" data-story-chronicle-shortcut-focus-render-texture-format="RGB10_A2" data-story-chronicle-shortcut-focus-shaders="StudioBside/FX/SB-FX-PMA-Main-ColorRamp-Mask,StudioBside/FX/SB-FX-PMA-Main-Sub-Dissolve" aria-hidden="true"/>);
}
