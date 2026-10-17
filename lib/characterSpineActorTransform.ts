import type { CharacterSpineMotionData } from "./characterSpineEffectMotion";
import { nativeHitDepthScale } from "./characterSpineEffectHit.ts";
/** NKMUnitClient.LoadUnitCompleteUnitSprite / SetDataObject: the unit prefab is
 * under MAIN_SPRITE; SkeletonBinary scale and SPINE_SkeletonAnimation's original
 * child transform both contribute to the actor/effect world-unit relationship. */
export function characterSpineActorTransform(data: CharacterSpineMotionData) {
    const source = data.spineContract;
    if (!source?.sourcePointer)
        throw new Error("Missing original Spine transform contract");
    for (const rotation of [source.prefabRotation, source.skeletonObjectRotation]) {
        if (!rotation || rotation.some((value, index) => Math.abs(value - (index === 3 ? 1 : 0)) > 1e-6)) {
            throw new Error("Original actor prefab rotation requires a full transform binding");
        }
    }
    const f = Math.fround;
    const spriteScale = f(Number(data.unit.nativeFields.m_SpriteScale ?? 1) * nativeHitDepthScale(0, 0));
    const scale = [0, 1].map(axis => f(f(f(spriteScale * source.prefabScale[axis]) * source.skeletonObjectScale[axis]) * source.skeletonScale));
    const offset = ["m_SpriteOffsetX", "m_SpriteOffsetY"].map((field, axis) => f(Number(data.unit.nativeFields[field] ?? 0) + f(f(source.skeletonObjectPosition[axis] * source.prefabScale[axis]) * spriteScale)));
    if (scale.some(value => !Number.isFinite(value) || value <= 0) || offset.some(value => !Number.isFinite(value))) {
        throw new Error("Invalid original actor transform");
    }
    return { scaleX: scale[0], scaleY: scale[1], offsetX: offset[0], offsetY: offset[1] };
}
