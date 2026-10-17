import { getCharacterSpineEffectShader, nativeCharacterSpriteVertexColor } from "./characterSpineEffectShaders";
type Vec = number[];
export type EffectGeometry = {
    name: string;
    positions: Vec[];
    uv: Vec[];
    indices: number[];
    texture: string;
    colors?: Vec[];
    uv1?: Vec[];
};
export type EffectMaterial = {
    shader: string;
    keywords: string[];
    properties: Record<string, number | Vec>;
    renderQueue: number;
    textureBindings?: Record<string, {
        texture: string;
        scaleOffset: Vec;
        sourceId: string;
        sourceRawSha256: string;
    }>;
};
export type EffectTexture = {
    file: string;
    width: number;
    height: number;
    filterMode: string;
    wrapMode: string;
};
export type CharacterEffectDraw = {
    path: string;
    geometry: string;
    material: string;
    objectToWorld: Vec;
    color: Vec;
    flip: Vec;
    sortingLayerId: number;
    sortingOrder: number;
    boundsCenter: Vec;
    sourceRendererOrder: number;
    sortingFudge?: number;
    /** Live source ParticleSystem mesh, in world space; never captured geometry. */
    particleGeometry?: EffectGeometry;
    /** Live SpriteRenderer Sliced geometry in the renderer's local coordinates. */
    spriteGeometry?: EffectGeometry;
    sortingGroups?: {
        path: string;
        sortingLayerId: number;
        sortingOrder: number;
        depth: number;
        sourceOrder: number;
    }[];
};
export type CharacterEffectFrame = {
    time: number;
    draws: CharacterEffectDraw[];
    /** Original axis-aligned orthographic camera for native sorting verification. */
    sortWorldToCamera?: number[];
};
export type CharacterEffectMeshAssets = {
    schemaVersion: 1;
    geometries: Record<string, EffectGeometry>;
    materials: Record<string, EffectMaterial>;
    textures: Record<string, EffectTexture>;
    sortingLayerValues?: Record<string, number>;
};
export type CharacterEffectMeshTrace = {
    schemaVersion: 1;
    kind: "native-sprite-render-trace";
    name: string;
    fps: number;
    frames: CharacterEffectFrame[];
    geometries: Record<string, EffectGeometry>;
    materials: Record<string, EffectMaterial>;
    textures: Record<string, EffectTexture>;
    source: {
        native: {
            projectionColumnMajor: Vec;
            worldToCameraColumnMajor: Vec;
        };
    };
};
export function multiplyCharacterEffectMatrices(a: ArrayLike<number>, b: ArrayLike<number>) {
    const result = new Float32Array(16);
    for (let column = 0; column < 4; column++) {
        for (let row = 0; row < 4; row++) {
            let value = 0;
            for (let k = 0; k < 4; k++)
                value += a[k * 4 + row] * b[column * 4 + k];
            result[column * 4 + row] = value;
        }
    }
    return result;
}
function compile(gl: WebGLRenderingContext, type: number, source: string) {
    const shader = gl.createShader(type);
    if (!shader)
        throw new Error("Could not allocate character effect shader");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(`Character effect shader compile failed: ${error}`);
    }
    return shader;
}
function createProgram(gl: WebGLRenderingContext, vertex: string, fragment: string) {
    const vs = compile(gl, gl.VERTEX_SHADER, vertex);
    const fs = compile(gl, gl.FRAGMENT_SHADER, fragment);
    const program = gl.createProgram();
    if (!program)
        throw new Error("Could not allocate character effect program");
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const error = gl.getProgramInfoLog(program);
        gl.deleteProgram(program);
        throw new Error(`Character effect shader link failed: ${error}`);
    }
    return program;
}
function originalBlend(gl: WebGLRenderingContext, value: number) {
    // UnityEngine.Rendering.BlendMode numeric values from the original runtime.
    const modes = [gl.ZERO, gl.ONE, gl.DST_COLOR, gl.SRC_COLOR, gl.ONE_MINUS_DST_COLOR,
        gl.SRC_ALPHA, gl.ONE_MINUS_SRC_COLOR, gl.DST_ALPHA, gl.ONE_MINUS_DST_ALPHA,
        gl.SRC_ALPHA_SATURATE, gl.ONE_MINUS_SRC_ALPHA];
    if (!Number.isInteger(value) || modes[value] === undefined)
        throw new Error(`Unsupported native blend mode ${value}`);
    return modes[value];
}
async function imageAt(url: string, signal: AbortSignal) {
    const response = await fetch(url, { signal });
    if (!response.ok)
        throw new Error(`Character effect texture HTTP ${response.status}`);
    return createImageBitmap(await response.blob(), { premultiplyAlpha: "none", colorSpaceConversion: "none", imageOrientation: "flipY" });
}
/** Native mesh playback renderer. Scheduling and attachment belong to the unit runtime.
 * The caller owns the framebuffer, viewport, and ordering with character geometry.
 * Render into that same framebuffer to preserve the source additive/PMA blending.
 */
export async function createCharacterSpineEffectMeshRenderer(gl: WebGLRenderingContext, trace: CharacterEffectMeshAssets, assetBaseUrl: string, signal: AbortSignal) {
    if (trace.schemaVersion !== 1)
        throw new Error("Unsupported character effect asset schema");
    const programs = new Map<string, WebGLProgram>();
    const textures = new Map<string, WebGLTexture>();
    const buffers: WebGLBuffer[] = [];
    const vertex = gl.createBuffer();
    const index = gl.createBuffer();
    if (!vertex || !index)
        throw new Error("Could not allocate character effect geometry");
    buffers.push(vertex, index);
    // Keep raw attribute/index writes out of the host renderer's cached VAOs.
    const gl2 = gl as WebGL2RenderingContext;
    const vaoExtension = typeof gl2.createVertexArray === "function" ? null : gl.getExtension("OES_vertex_array_object");
    const vao = typeof gl2.createVertexArray === "function" ? gl2.createVertexArray() : vaoExtension?.createVertexArrayOES();
    const bindVao = () => {
        if (typeof gl2.bindVertexArray === "function")
            gl2.bindVertexArray(vao ?? null);
        else if (vaoExtension)
            vaoExtension.bindVertexArrayOES(vao ?? null);
    };
    const maxAttributes = gl.getParameter(gl.MAX_VERTEX_ATTRIBS) as number;
    let disposed = false;
    function dispose() {
        if (disposed)
            return;
        disposed = true;
        for (const program of programs.values())
            gl.deleteProgram(program);
        for (const texture of textures.values())
            gl.deleteTexture(texture);
        for (const buffer of buffers)
            gl.deleteBuffer(buffer);
        if (vao) {
            if (typeof gl2.deleteVertexArray === "function")
                gl2.deleteVertexArray(vao);
            else
                vaoExtension?.deleteVertexArrayOES(vao);
        }
    }
    try {
        for (const [key, material] of Object.entries(trace.materials)) {
            const shader = getCharacterSpineEffectShader(material.shader, material.keywords);
            programs.set(key, createProgram(gl, shader.vert, shader.frag));
        }
        // Sequential GPU upload keeps abort/dispose ownership deterministic.
        for (const [key, source] of Object.entries(trace.textures)) {
            if (signal.aborted)
                throw new DOMException("Aborted", "AbortError");
            const bitmap = await imageAt(new URL(source.file, assetBaseUrl).href, signal);
            const previousTexture = gl.getParameter(gl.TEXTURE_BINDING_2D) as WebGLTexture | null;
            try {
                if (signal.aborted)
                    throw new DOMException("Aborted", "AbortError");
                const texture = gl.createTexture();
                if (!texture)
                    throw new Error("Could not allocate character effect texture");
                textures.set(key, texture);
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
                gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
                if (!["Point", "Bilinear", "Trilinear"].includes(source.filterMode))
                    throw new Error(`Unsupported native texture filter ${source.filterMode}`);
                if (!["Clamp", "Repeat", "Mirror"].includes(source.wrapMode))
                    throw new Error(`Unsupported native texture wrap ${source.wrapMode}`);
                const filter = source.filterMode === "Point" ? gl.NEAREST : gl.LINEAR;
                const wrap = source.wrapMode === "Repeat" ? gl.REPEAT : source.wrapMode === "Mirror" ? gl.MIRRORED_REPEAT : gl.CLAMP_TO_EDGE;
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
            }
            finally {
                gl.bindTexture(gl.TEXTURE_2D, previousTexture);
                bitmap.close();
            }
        }
    }
    catch (error) {
        dispose();
        throw error;
    }
    function uniform(program: WebGLProgram, name: string, value: number | ArrayLike<number>) {
        const location = gl.getUniformLocation(program, name);
        if (location === null)
            return;
        if (typeof value === "number")
            gl.uniform1f(location, value);
        else if (value.length === 16)
            gl.uniformMatrix4fv(location, false, new Float32Array(value));
        else if (value.length === 4)
            gl.uniform4fv(location, new Float32Array(value));
        else if (value.length === 3)
            gl.uniform3fv(location, new Float32Array(value));
        else if (value.length === 2)
            gl.uniform2fv(location, new Float32Array(value));
        else
            throw new Error(`Unsupported shader uniform shape for ${name}`);
    }
    function draw(frame: CharacterEffectFrame, viewProjection: Float32Array) {
        if (disposed)
            throw new Error("Character effect renderer was disposed");
        bindVao();
        for (let attribute = 0; attribute < maxAttributes; attribute++)
            gl.disableVertexAttribArray(attribute);
        gl.enable(gl.BLEND);
        gl.blendEquation(gl.FUNC_ADD);
        gl.disable(gl.CULL_FACE);
        gl.disable(gl.DEPTH_TEST);
        gl.depthMask(false);
        // The checked orthographic native camera sorts by Z after layer/order.
        // Non-default sorting layers need their original order table before use.
        const sortDepth = (z: number, fudge = 0) => {
            const camera = frame.sortWorldToCamera;
            if (!camera) {
                if (fudge)
                    throw new Error("Particle sorting requires the original camera");
                return z;
            }
            if (camera.length !== 16 || camera[2] !== 0 || camera[6] !== 0 || camera[10] !== -1)
                throw new Error("Unverified transparent sort camera orientation");
            // UnityPlayer 42007D..4200B7: orthographic view-space Z minus the
            // renderer sortingFudge. Negation retains this renderer's far-first key.
            return -Math.fround(Math.fround(Math.fround(z * camera[10]) + camera[14]) - Math.fround(fudge));
        };
        const draws = frame.draws.slice().sort((a, b) => {
            const aKeys = [...a.sortingGroups?.map(group => ({ ...group, depth: sortDepth(group.depth) })) ?? [], { path: a.path, sortingLayerId: a.sortingLayerId, sortingOrder: a.sortingOrder, depth: sortDepth(a.boundsCenter[2], a.sortingFudge), sourceOrder: a.sourceRendererOrder }];
            const bKeys = [...b.sortingGroups?.map(group => ({ ...group, depth: sortDepth(group.depth) })) ?? [], { path: b.path, sortingLayerId: b.sortingLayerId, sortingOrder: b.sortingOrder, depth: sortDepth(b.boundsCenter[2], b.sortingFudge), sourceOrder: b.sourceRendererOrder }];
            let index = 0;
            while (index < aKeys.length - 1 && index < bKeys.length - 1 && aKeys[index].path === bKeys[index].path)
                index++;
            const left = aKeys[index], right = bKeys[index];
            let layerDifference = 0;
            if (left.sortingLayerId !== right.sortingLayerId) {
                const leftValue = trace.sortingLayerValues?.[left.sortingLayerId];
                const rightValue = trace.sortingLayerValues?.[right.sortingLayerId];
                if (leftValue === undefined || rightValue === undefined)
                    throw new Error("Native sorting layer order is unavailable");
                layerDifference = leftValue - rightValue;
            }
            return layerDifference || left.sortingOrder - right.sortingOrder ||
                trace.materials[a.material].renderQueue - trace.materials[b.material].renderQueue ||
                // Native SortingGroup orders its contents by layer/order, independently
                // of each child's camera distance. Only the external group uses depth.
                (index === 0 ? right.depth - left.depth : 0) || left.sourceOrder - right.sourceOrder;
        });
        for (const command of draws) {
            const geometry = command.particleGeometry ?? command.spriteGeometry ?? trace.geometries[command.geometry];
            const material = trace.materials[command.material];
            if (command.spriteGeometry && (command.particleGeometry || material.shader !== 'NKC/NKC_FX_SPRITE'
                || geometry.uv.length !== geometry.positions.length || geometry.positions.length > 65535))
                throw new Error('Incomplete original Sliced Sprite vertex streams');
            if (command.particleGeometry && (material.shader !== "NKC/NKC_PTC_PMA"
                || geometry.colors?.length !== geometry.positions.length || geometry.uv1?.length !== geometry.positions.length
                || geometry.uv.length !== geometry.positions.length || geometry.positions.length > 65535))
                throw new Error("Incomplete source particle vertex streams");
            const program = programs.get(command.material)!;
            gl.useProgram(program);
            gl.blendFunc(originalBlend(gl, Number(material.properties._Src)), originalBlend(gl, Number(material.properties._Dst)));
            for (const [name, value] of Object.entries(material.properties)) {
                if (name !== "_Flip")
                    uniform(program, name, value);
            }
            uniform(program, "uObjectToWorld", command.objectToWorld);
            uniform(program, "uViewProjection", viewProjection);
            uniform(program, "_Flip", command.flip);
            // Viewer opacity settings: display the source effect at full strength.
            uniform(program, "_FxGlobalTransparency", 0);
            uniform(program, "_FxGlobalTransparencyEnemy", 0);
            uniform(program, "_IsMine", 1);
            const packed = new Float32Array(geometry.positions.length * 11);
            const color = material.shader === "NKC/NKC_FX_SPRITE"
                ? command.color.map(nativeCharacterSpriteVertexColor) : command.color;
            for (let i = 0; i < geometry.positions.length; i++) {
                packed.set([geometry.positions[i][0], geometry.positions[i][1], geometry.positions[i][2] ?? 0,
                    ...geometry.colors?.[i] ?? color, geometry.uv[i][0], geometry.uv[i][1],
                    geometry.uv1?.[i][0] ?? 0, geometry.uv1?.[i][1] ?? 0], i * 11);
            }
            gl.bindBuffer(gl.ARRAY_BUFFER, vertex);
            gl.bufferData(gl.ARRAY_BUFFER, packed, gl.DYNAMIC_DRAW);
            for (const [name, size, offset] of [["aPosition", 3, 0], ["aColor", 4, 3], ["aUv0", 2, 7], ["aUv1", 2, 9]] as const) {
                const location = gl.getAttribLocation(program, name);
                if (location < 0)
                    continue;
                gl.enableVertexAttribArray(location);
                gl.vertexAttribPointer(location, size, gl.FLOAT, false, 44, offset * 4);
            }
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(geometry.indices), gl.DYNAMIC_DRAW);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, textures.get(geometry.texture)!);
            gl.uniform1i(gl.getUniformLocation(program, "_MainTex"), 0);
            gl.drawElements(gl.TRIANGLES, geometry.indices.length, gl.UNSIGNED_SHORT, 0);
        }
    }
    return { draw, dispose };
}
