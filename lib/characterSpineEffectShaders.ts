export type CharacterEffectShaderName = "NKC/NKC_FX_SPRITE" | "NKC/NKC_PTC_PMA";
export type EffectShaderVec2 = readonly [
    number,
    number
];
export type EffectShaderVec4 = readonly [
    number,
    number,
    number,
    number
];
export interface CharacterEffectShader {
    readonly shaderName: CharacterEffectShaderName;
    readonly vert: string;
    readonly frag: string;
    readonly requiredUniforms: Readonly<Record<string, "float" | "vec2" | "vec4" | "mat4" | "sampler2D">>;
    readonly attributes: Readonly<Record<string, number>>;
    readonly sourcePrograms: readonly string[];
    readonly renderState: {
        readonly sourceBlendProperty: "_Src";
        readonly destinationBlendProperty: "_Dst";
        readonly defaultSourceBlend: number;
        readonly defaultDestinationBlend: number;
        readonly blendOperation: "add";
        readonly separateAlphaBlend: false;
        readonly depthTest: "less-equal";
        readonly depthWrite: false;
        readonly cull: "none";
    };
}
/** Values must come from the actual source global/material state, not viewer opacity guesses. */
export interface CharacterEffectOpacityUniforms {
    readonly _BypassFGO: number;
    readonly _FxGlobalTransparency: number;
    readonly _FxGlobalTransparencyEnemy: number;
    readonly _IsMine: number;
}
export interface CharacterEffectParticleUniforms extends CharacterEffectOpacityUniforms {
    readonly _BypassStream: number;
    readonly _PMA: number;
}
const opacityUniforms = {
    _BypassFGO: "float",
    _FxGlobalTransparency: "float",
    _FxGlobalTransparencyEnemy: "float",
    _IsMine: "float",
} as const;
const opacityGlsl = `
uniform float _BypassFGO;
uniform float _FxGlobalTransparency;
uniform float _FxGlobalTransparencyEnemy;
uniform float _IsMine;
float sourceGlobalOpacity() {
  float transparency = _FxGlobalTransparencyEnemy
    + _IsMine * (_FxGlobalTransparency - _FxGlobalTransparencyEnemy);
  float opacity = 1.0 - transparency;
  return opacity + _BypassFGO * (1.0 - opacity);
}
`;
// Position matrices are supplied by the renderer in its GL clip convention. Source local
// vertex coordinates, stream color, texture sampling/orientation and material blending must
// retain their original meaning. Do not premultiply aColor or apply RendererColor again.
const vertexHeader = `
precision highp float;
attribute vec3 aPosition;
attribute vec4 aColor;
attribute vec2 aUv0;
uniform mat4 uObjectToWorld;
uniform mat4 uViewProjection;
varying vec4 vSourceColor;
varying vec2 vUv0;
`;
const spriteVertex = `${vertexHeader}
uniform vec2 _Flip;
uniform vec4 _Color;
void main() {
  vec3 position = vec3(aPosition.xy * _Flip, aPosition.z);
  gl_Position = uViewProjection * (uObjectToWorld * vec4(position, 1.0));
  vSourceColor = aColor * vec4(_Color.rgb * _Color.a, _Color.a);
  vUv0 = aUv0;
}
`;
function spriteFragment(externalAlpha: boolean): string {
    return `
precision highp float;
uniform sampler2D _MainTex;
${externalAlpha ? "uniform sampler2D _AlphaTex;\nuniform float _EnableExternalAlpha;" : ""}
varying vec4 vSourceColor;
varying vec2 vUv0;
${opacityGlsl}
void main() {
  vec4 sampled = texture2D(_MainTex, vUv0);
  ${externalAlpha ? "sampled.a += _EnableExternalAlpha * (texture2D(_AlphaTex, vUv0).r - sampled.a);" : ""}
  vec4 color = 2.0 * sampled * vSourceColor;
  color.a = clamp(color.a, 0.0, 1.0);
  gl_FragColor = sourceGlobalOpacity() * color;
}
`;
}
const particleVertex = `${vertexHeader}
attribute vec2 aUv1;
uniform vec4 _MainTex_ST;
varying vec2 vStream;
void main() {
  gl_Position = uViewProjection * (uObjectToWorld * vec4(aPosition, 1.0));
  vSourceColor = aColor;
  vUv0 = aUv0 * _MainTex_ST.xy + _MainTex_ST.zw;
  vStream = aUv1;
}
`;
const particleFragment = `
precision highp float;
uniform sampler2D _MainTex;
uniform float _BypassStream;
uniform float _PMA;
varying vec4 vSourceColor;
varying vec2 vUv0;
varying vec2 vStream;
${opacityGlsl}
void main() {
  vec2 stream = vStream + _BypassStream * (vec2(1.0) - vStream);
  vec4 color;
  color.rgb = vSourceColor.rgb + _PMA
    * (stream.x * vSourceColor.rgb * vSourceColor.a - vSourceColor.rgb);
  color.a = vSourceColor.a + _PMA
    * (stream.y * stream.x * vSourceColor.a - vSourceColor.a);
  gl_FragColor = texture2D(_MainTex, vUv0) * color * sourceGlobalOpacity();
}
`;
const commonUniforms = {
    uObjectToWorld: "mat4", uViewProjection: "mat4", _MainTex: "sampler2D", ...opacityUniforms,
} as const;
const commonState = {
    sourceBlendProperty: "_Src", destinationBlendProperty: "_Dst", blendOperation: "add",
    separateAlphaBlend: false, depthTest: "less-equal", depthWrite: false, cull: "none",
} as const;
/**
 * Exact checked DXBC variants from source-audit-20260912T124817463780Z/shader-programs.
 * SPRITE vertex blobs 2/3 are identical; fragments 8/9 select external-alpha off/on.
 * Original common/shaders.asset D3D11 parameter entry 7 (offset 5220, length 204)
 * names UnityPerDrawSprite._EnableExternalAlpha at byte 24 = cb1[1].z, and
 * _AlphaTex at texture/sampler index 1. This metadata entry is not shader bytecode.
 * PTC_PMA vertex/fragment blobs 1/3 have no keywords. PixelSnap/stereo/other shaders
 * are deliberately unsupported until their source programs are translated and checked.
 * Texture defaults: source _MainTex and sprite _AlphaTex properties both specify white.
 */
export function getCharacterSpineEffectShader(shaderName: string, keywords: readonly string[] = []): CharacterEffectShader {
    if (shaderName !== "NKC/NKC_FX_SPRITE" && shaderName !== "NKC/NKC_PTC_PMA") {
        throw new Error(`Unsupported character effect shader: ${shaderName}`);
    }
    const unsupported = keywords.filter((keyword) => shaderName !== "NKC/NKC_FX_SPRITE"
        || keyword !== "ETC1_EXTERNAL_ALPHA");
    if (unsupported.length)
        throw new Error(`Unsupported ${shaderName} keywords: ${unsupported.join(", ")}`);
    if (shaderName === "NKC/NKC_FX_SPRITE") {
        const externalAlpha = keywords.includes("ETC1_EXTERNAL_ALPHA");
        return {
            shaderName,
            vert: spriteVertex,
            frag: spriteFragment(externalAlpha),
            requiredUniforms: {
                ...commonUniforms, _Color: "vec4", _Flip: "vec2",
                ...(externalAlpha ? { _AlphaTex: "sampler2D" as const, _EnableExternalAlpha: "float" as const } : {}),
            },
            attributes: { aPosition: 3, aColor: 4, aUv0: 2 },
            sourcePrograms: externalAlpha ? ["NKC_NKC_FX_SPRITE-3", "NKC_NKC_FX_SPRITE-9"]
                : ["NKC_NKC_FX_SPRITE-2", "NKC_NKC_FX_SPRITE-8"],
            renderState: { ...commonState, defaultSourceBlend: 5, defaultDestinationBlend: 1 },
        };
    }
    return {
        shaderName,
        vert: particleVertex,
        frag: particleFragment,
        requiredUniforms: { ...commonUniforms, _MainTex_ST: "vec4", _BypassStream: "float", _PMA: "float" },
        attributes: { aPosition: 3, aColor: 4, aUv0: 2, aUv1: 2 },
        sourcePrograms: ["NKC_NKC_PTC_PMA-1", "NKC_NKC_PTC_PMA-3"],
        renderState: { ...commonState, defaultSourceBlend: 1, defaultDestinationBlend: 10 },
    };
}
/** Numerical references for source-program regression, before framebuffer blending. */
export function evaluateCharacterEffectOpacity(uniforms: CharacterEffectOpacityUniforms): number {
    const transparency = uniforms._FxGlobalTransparencyEnemy + uniforms._IsMine
        * (uniforms._FxGlobalTransparency - uniforms._FxGlobalTransparencyEnemy);
    const opacity = 1 - transparency;
    return opacity + uniforms._BypassFGO * (1 - opacity);
}
export function evaluateCharacterEffectSpriteVertexColor(sourceColor: EffectShaderVec4, tint: EffectShaderVec4): EffectShaderVec4 {
    return [
        sourceColor[0] * tint[0] * tint[3], sourceColor[1] * tint[1] * tint[3],
        sourceColor[2] * tint[2] * tint[3], sourceColor[3] * tint[3],
    ];
}
export function evaluateCharacterEffectSpriteFragment(texture: EffectShaderVec4, varyingColor: EffectShaderVec4, uniforms: CharacterEffectOpacityUniforms, externalAlpha?: {
    readonly red: number;
    readonly _EnableExternalAlpha: number;
}): EffectShaderVec4 {
    const opacity = evaluateCharacterEffectOpacity(uniforms);
    const alpha = texture[3] + (externalAlpha ? externalAlpha._EnableExternalAlpha * (externalAlpha.red - texture[3]) : 0);
    return [
        2 * texture[0] * varyingColor[0] * opacity,
        2 * texture[1] * varyingColor[1] * opacity,
        2 * texture[2] * varyingColor[2] * opacity,
        Math.max(0, Math.min(1, 2 * alpha * varyingColor[3])) * opacity,
    ];
}
export function evaluateCharacterEffectParticleFragment(texture: EffectShaderVec4, color: EffectShaderVec4, sourceUv1: EffectShaderVec2, uniforms: CharacterEffectParticleUniforms): EffectShaderVec4 {
    const streamX = sourceUv1[0] + uniforms._BypassStream * (1 - sourceUv1[0]);
    const streamY = sourceUv1[1] + uniforms._BypassStream * (1 - sourceUv1[1]);
    const opacity = evaluateCharacterEffectOpacity(uniforms);
    return [
        (color[0] + uniforms._PMA * (streamX * color[0] * color[3] - color[0])) * texture[0] * opacity,
        (color[1] + uniforms._PMA * (streamX * color[1] * color[3] - color[1])) * texture[1] * opacity,
        (color[2] + uniforms._PMA * (streamX * color[2] * color[3] - color[2])) * texture[2] * opacity,
        (color[3] + uniforms._PMA * (streamY * streamX * color[3] - color[3])) * texture[3] * opacity,
    ];
}
/** Unity SpriteRenderer's native UNorm8 color stream, before the source shader.
 * CharacterSpriteColorProbe: 782 original D3D11/Gamma float-framebuffer samples.
 * Both float operations matter at byte boundaries; managed Color32 rounding differs.
 */
export function nativeCharacterSpriteVertexColor(value: number): number {
    const f = Math.fround;
    const clamped = Math.max(0, Math.min(1, f(value)));
    return f(Math.floor(f(f(clamped * 255) + 0.5)) / 255);
}
