import type { CharacterFxmFrame, CharacterFxmSource } from "./characterSpineEffectFxm";
import { multiplyCharacterEffectMatrices, type CharacterEffectFrame, type CharacterEffectMeshAssets } from "./characterSpineEffectMesh";
import { characterSlicedSpriteGeometry, characterSlicedSpriteLocalBounds, type CharacterSlicedSpriteSource } from './characterSpineSlicedSprite';
export type CharacterEffectSpriteScene = CharacterFxmSource & CharacterEffectMeshAssets & {
    readonly otherComponents?: readonly {
        nodePath: string;
        type: string;
        fields: Readonly<Record<string, unknown>>;
    }[];
    readonly nativeSpriteBounds?: Readonly<Record<string, {
        readonly center: readonly number[];
        readonly size: readonly number[];
        readonly sourcePointer: string;
    }>>;
    readonly slicedSpriteSources?: Readonly<Record<string, CharacterSlicedSpriteSource>>;
};
/** Unity Transform TRS, column-major, including the original third dimension. */
export function characterEffectTrs(position: readonly number[], rotation: readonly number[], scale: readonly number[]) {
    const [x, y, z, w] = rotation;
    const x2 = x * 2, y2 = y * 2, z2 = z * 2;
    const xx = x * x2, xy = x * y2, xz = x * z2;
    const yy = y * y2, yz = y * z2, zz = z * z2;
    const wx = w * x2, wy = w * y2, wz = w * z2;
    return new Float32Array([
        (1 - yy - zz) * scale[0], (xy + wz) * scale[0], (xz - wy) * scale[0], 0,
        (xy - wz) * scale[1], (1 - xx - zz) * scale[1], (yz + wx) * scale[1], 0,
        (xz + wy) * scale[2], (yz - wx) * scale[2], (1 - xx - yy) * scale[2], 0,
        position[0], position[1], position[2], 1,
    ]);
}
/** Shared source hierarchy composition for Sprite and World ParticleSystem jobs. */
export function characterEffectWorldMatrix(frame: CharacterFxmFrame, rootParents: Readonly<Record<string, ArrayLike<number>>> = {}) {
    const matrices = new Map<string, Float32Array>();
    const visiting = new Set<string>();
    function matrix(path: string): Float32Array {
        const existing = matrices.get(path);
        if (existing)
            return existing;
        if (visiting.has(path))
            throw new Error(`Cyclic source effect hierarchy: ${path}`);
        const node = frame.nodes[path];
        if (!node)
            throw new Error(`Missing source effect transform: ${path}`);
        visiting.add(path);
        const local = characterEffectTrs(node.localPosition, node.localRotation, node.localScale);
        const parent = node.parentPath ? matrix(node.parentPath) : rootParents[path];
        const world = parent ? multiplyCharacterEffectMatrices(parent, local) : local;
        matrices.set(path, world);
        visiting.delete(path);
        return world;
    }
    return matrix;
}
/** Build draw commands from current source component state, never baked frames. */
export function characterEffectSpriteFrame(source: CharacterEffectSpriteScene, frame: CharacterFxmFrame, time: number, rootParents: Readonly<Record<string, ArrayLike<number>>> = {}): CharacterEffectFrame {
    const matrix = characterEffectWorldMatrix(frame, rootParents);
    const draws: CharacterEffectFrame["draws"] = [];
    const groups = new Map(source.otherComponents?.filter(component => component.type === "SortingGroup" && component.fields.m_Enabled === 1)
        .map(component => [component.nodePath, component]) ?? []);
    let rendererOrder = 0;
    for (const node of source.nodes) {
        const pose = frame.nodes[node.path];
        if (!pose)
            throw new Error(`Missing evaluated source node: ${node.path}`);
        const world = matrix(node.path);
        for (const renderer of pose.renderers ?? []) {
            const order = rendererOrder++;
            if (!pose.activeInHierarchy || !renderer.enabled || !renderer.spriteId)
                continue;
            if (renderer.drawMode !== undefined && renderer.drawMode !== 0 && renderer.drawMode !== 1)
                throw new Error(`Original tiled SpriteRenderer mesh needs native verification: ${node.path}`);
            const material = renderer.materialId;
            if (typeof material !== "string" || !source.materials[material])
                throw new Error(`Missing source material: ${renderer.id}`);
            if (!source.geometries[renderer.spriteId])
                throw new Error(`Missing source sprite: ${renderer.spriteId}`);
            if (typeof renderer.sortingLayerId !== "number" || typeof renderer.sortingOrder !== "number")
                throw new Error(`Missing source sorting metadata: ${renderer.id}`);
            const flip = Array.isArray(renderer.flip) ? renderer.flip : [renderer.flipX ? -1 : 1, renderer.flipY ? -1 : 1];
            let spriteGeometry, slicedBounds;
            if (renderer.drawMode === 1) {
                const sprite = source.slicedSpriteSources?.[renderer.spriteId];
                if (!sprite || !Array.isArray(renderer.size) || renderer.spriteSortPoint !== 0)
                    throw new Error(`Missing original Sliced Sprite geometry/bounds source: ${renderer.id}`);
                spriteGeometry = { ...source.geometries[renderer.spriteId], ...characterSlicedSpriteGeometry(sprite, renderer.size) };
                slicedBounds = characterSlicedSpriteLocalBounds(sprite, renderer.size, flip);
            }
            // All supported SpriteRenderer geometry lies in its local XY plane. Its
            // center Z is the Transform origin for the checked flat 2D hit prefabs.
            // A tilted plane requires its original sprite bounds before depth sorting.
            const bounds = source.nativeSpriteBounds?.[renderer.spriteId];
            if (!slicedBounds && !bounds && (Math.abs(world[2]) > 1e-5 || Math.abs(world[6]) > 1e-5))
                throw new Error(`Sprite plane needs original bounds for depth sorting: ${node.path}`);
            if (!slicedBounds && bounds && (bounds.sourcePointer !== renderer.spriteId || bounds.center.length !== 3
                || bounds.center.some(value => !Number.isFinite(value)) || renderer.spriteSortPoint !== undefined && renderer.spriteSortPoint !== 0))
                throw new Error('Original Sprite bounds identity and center sorting are required');
            // Native Simple branch 50C76F -> 4D6810 flips the local bounds endpoints;
            // the resulting center is the immutable Sprite.bounds center with XY flip.
            const localCenter = slicedBounds?.center ?? bounds?.center.map((value, axis) => Math.fround(value * (flip[axis] ?? 1)));
            const boundsCenter = localCenter ? [0, 1, 2].map(axis => Math.fround(world[axis] * localCenter[0]
                + world[4 + axis] * localCenter[1] + world[8 + axis] * localCenter[2] + world[12 + axis]))
                : [world[12], world[13], world[14]];
            draws.push({
                path: node.path, geometry: renderer.spriteId, material,
                objectToWorld: Array.from(world), color: [...renderer.color], flip: [...flip],
                sortingLayerId: renderer.sortingLayerId, sortingOrder: renderer.sortingOrder,
                boundsCenter, sourceRendererOrder: order, ...(spriteGeometry ? { spriteGeometry } : {}),
                sortingGroups: (() => {
                    const result: NonNullable<CharacterEffectFrame["draws"][number]["sortingGroups"]> = [];
                    for (let parent: string | null = node.path; parent; parent = frame.nodes[parent].parentPath) {
                        const group = groups.get(parent);
                        if (!group || !frame.nodes[parent].activeInHierarchy)
                            continue;
                        if (group.fields.m_SortAtRoot)
                            throw new Error("SortAtRoot requires a separate native sorting contract");
                        result.unshift({ path: parent, sortingLayerId: Number(group.fields.m_SortingLayerID), sortingOrder: Number(group.fields.m_SortingOrder),
                            depth: matrix(parent)[14], sourceOrder: source.nodes.findIndex(node => node.path === parent) });
                    }
                    return result;
                })(),
            });
        }
    }
    return { time, draws };
}
