export interface CharacterSlicedSpriteSource {
    readonly rectSize: readonly [
        number,
        number
    ];
    readonly textureSize: readonly [
        number,
        number
    ];
    readonly textureRect: readonly [
        number,
        number,
        number,
        number
    ];
    readonly textureRectOffset: readonly [
        number,
        number
    ];
    readonly pivot: readonly [
        number,
        number
    ];
    readonly border: readonly [
        number,
        number,
        number,
        number
    ];
    readonly pixelsPerUnit: number;
    readonly packed: boolean;
    readonly downscaleMultiplier: number;
}
/** UnityPlayer 3533C0 -> 353FE0 -> 354560, positive full-texture Sliced branch.
 * Nine cells retain independent vertices and original float operation order.
 * Tiling, atlas/trim, overlapping borders and negative/zero size stay rejected.
 */
export function characterSlicedSpriteGeometry(source: CharacterSlicedSpriteSource, requestedSize: readonly number[]) {
    const f = Math.fround;
    if (source.packed || source.downscaleMultiplier !== 1 || requestedSize.length !== 2
        || ![source.pixelsPerUnit, ...source.rectSize, ...source.textureSize, ...requestedSize].every(value => Number.isFinite(value) && value > 0)
        || source.pivot.some(value => !Number.isFinite(value) || value < 0 || value > 1)
        || source.border.some(value => !Number.isFinite(value) || value <= 0)
        || source.textureRectOffset.some(value => value !== 0)
        || source.textureRect[0] !== 0 || source.textureRect[1] !== 0
        || source.rectSize.some((value, index) => value !== source.textureSize[index] || value !== source.textureRect[index + 2]))
        throw new Error('Sliced Sprite requires original positive full-texture source bounds and borders');
    const reciprocal = f(1 / f(source.pixelsPerUnit));
    const originalSize = source.rectSize.map(value => f(f(value) * reciprocal));
    const border = source.border.map(value => f(f(value) * reciprocal));
    const size = requestedSize.map(f);
    const axes = originalSize.map((original, axis) => {
        const first = border[axis], last = border[axis + 2], sum = f(first + last);
        if (!(original > sum && size[axis] > sum))
            throw new Error('Sliced overlapping/empty borders require a separate original branch');
        // 3534A3..3534DA scales the pixel pivot through requested size before division.
        const offset = f(f(-f(f(source.rectSize[axis]) * f(source.pivot[axis])) * size[axis]) / f(source.rectSize[axis]));
        const sourceLengths = [first, f(original - sum), last];
        const targetLengths = [first, f(size[axis] - sum), last];
        const inverseOriginal = f(1 / original);
        let sourceOffset = 0, targetOffset = 0;
        return sourceLengths.map((sourceLength, index) => {
            const targetLength = targetLengths[index];
            const position = f(targetOffset + offset);
            const value = { min: position, max: f(position + targetLength),
                uvMin: f(sourceOffset * inverseOriginal), uvMax: f(f(sourceOffset + sourceLength) * inverseOriginal) };
            sourceOffset = f(sourceOffset + sourceLength);
            targetOffset = f(targetOffset + targetLength);
            return value;
        });
    });
    const positions: number[][] = [], uv: number[][] = [], indices: number[] = [];
    for (const y of axes[1])
        for (const x of axes[0]) {
            const first = positions.length;
            positions.push([x.min, y.min, 0], [x.max, y.min, 0], [x.max, y.max, 0], [x.min, y.max, 0]);
            uv.push([x.uvMin, y.uvMin], [x.uvMax, y.uvMin], [x.uvMax, y.uvMax], [x.uvMin, y.uvMax]);
            indices.push(first, first + 2, first + 1, first, first + 3, first + 2);
        }
    return { positions, uv, indices };
}
/** Original SpriteRenderer.GetSpriteBounds, native 50C575..50C75B.
 * This uses renderer size and pivot, not the accumulated mesh endpoint.
 */
export function characterSlicedSpriteLocalBounds(source: CharacterSlicedSpriteSource, size: readonly number[], flip: readonly number[]) {
    if (size.length !== 2 || flip.length !== 2 || size.some(value => !Number.isFinite(value) || value <= 0)
        || flip.some(value => value !== -1 && value !== 1) || source.pivot.some(value => !Number.isFinite(value) || value < 0 || value > 1))
        throw new Error('Explicit original positive Sprite size, pivot and flip required');
    const f = Math.fround;
    const pairs = size.map((value, axis) => {
        const pivot = f(f(f(value) * f(source.pivot[axis])) * flip[axis]);
        const end = f(f(f(value) * flip[axis]) - pivot);
        return [Math.min(-pivot, end), Math.max(-pivot, end)];
    });
    pairs.push([-f(.1), f(.1)]);
    return { center: pairs.map(([min, max]) => f(f(max + min) * .5)),
        size: pairs.map(([min, max]) => f(f(f(max - min) * .5) * 2)) };
}
