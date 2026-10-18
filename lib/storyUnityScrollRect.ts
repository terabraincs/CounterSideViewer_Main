export const STORY_UNITY_SCROLL_RECT_DRAG_THRESHOLD = 50;
export const STORY_UNITY_SCROLL_RECT_ELASTICITY = 0.1;
export const STORY_UNITY_SCROLL_RECT_DECELERATION_RATE = 0.135;
export const STORY_UNITY_SCROLL_RECT_VELOCITY_LERP = 10;
export type StoryUnityScrollRectFrame = {
    visualPosition: number;
    scrollPosition: number;
    rubber: number;
    velocity: number;
    motion: "idle" | "inertia" | "inertia-boundary" | "elastic";
};
export function getStoryUnityScrollRectRubberDelta(overStretching: number, viewSize: number) {
    if (viewSize <= 0 || overStretching === 0) {
        return 0;
    }
    return ((1 - 1 / ((Math.abs(overStretching) * 0.55) / viewSize + 1)) *
        viewSize *
        Math.sign(overStretching));
}
function getRawVisualFrame(visualPosition: number, maximum: number) {
    const safeMaximum = Math.max(0, maximum);
    const scrollPosition = Math.min(safeMaximum, Math.max(0, visualPosition));
    return {
        visualPosition,
        scrollPosition,
        rubber: scrollPosition - visualPosition,
    };
}
export function getStoryUnityScrollRectWheelAxisDelta(deltaX: number, deltaY: number) {
    // STV-MAP-068: ScrollRect.OnScroll keeps X for horizontal-only content,
    // except when the absolute Y delta is strictly larger. Equality stays X.
    return Math.abs(deltaY) > Math.abs(deltaX) ? deltaY : deltaX;
}
export function getStoryUnityScrollRectVerticalWheelDelta(deltaX: number, deltaY: number, deltaMode: number, lineSize: number, pageSize: number, sensitivity = 1) {
    // A vertical-only ScrollRect promotes X only when it is strictly dominant;
    // equality remains Y. The browser unit and ScrollRect sensitivity are both
    // folded into this single delta so callers do not apply either twice.
    const axisDelta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
    const unit = deltaMode === 1 ? lineSize : deltaMode === 2 ? pageSize : 1;
    return axisDelta * unit * sensitivity;
}
export function getStoryUnityScrollRectWheelFrame(desiredVisualPosition: number, maximum: number) {
    // OnScroll only corrects Clamped content immediately. Elastic content keeps
    // the raw wheel overshoot until LateUpdate starts its SmoothDamp spring.
    return getRawVisualFrame(desiredVisualPosition, maximum);
}
export function getStoryUnityScrollRectDragFrame(desiredVisualPosition: number, maximum: number, viewSize: number) {
    const safeMaximum = Math.max(0, maximum);
    const scrollPosition = Math.min(safeMaximum, Math.max(0, desiredVisualPosition));
    let rubber = 0;
    if (desiredVisualPosition < 0) {
        rubber = getStoryUnityScrollRectRubberDelta(-desiredVisualPosition, viewSize);
    }
    else if (desiredVisualPosition > safeMaximum) {
        rubber = -getStoryUnityScrollRectRubberDelta(desiredVisualPosition - safeMaximum, viewSize);
    }
    return {
        visualPosition: scrollPosition - rubber,
        scrollPosition,
        rubber,
    };
}
export function getStoryUnitySmoothDampFrame(current: number, target: number, currentVelocity: number, smoothTime: number, deltaTime: number) {
    // STV-MAP-067: exact managed Mathf.SmoothDamp(float, ..., deltaTime)
    // shape used by this client, including its original-target overshoot clamp.
    const safeSmoothTime = Math.max(0.0001, smoothTime);
    const omega = 2 / safeSmoothTime;
    const x = omega * deltaTime;
    const exponential = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
    const originalTarget = target;
    const change = current - target;
    const temporary = (currentVelocity + omega * change) * deltaTime;
    let velocity = (currentVelocity - omega * temporary) * exponential;
    let value = target + (change + temporary) * exponential;
    if ((originalTarget - current > 0) === (value > originalTarget)) {
        value = originalTarget;
        velocity = deltaTime > 0 ? (value - originalTarget) / deltaTime : 0;
    }
    return { value, velocity };
}
export function getStoryUnityScrollRectReleaseFrame({ visualPosition, maximum, velocity, deltaTime, elasticity = STORY_UNITY_SCROLL_RECT_ELASTICITY, decelerationRate = STORY_UNITY_SCROLL_RECT_DECELERATION_RATE, snapElasticVelocityBelowOne = true, minimumVelocity = 1, }: {
    visualPosition: number;
    maximum: number;
    velocity: number;
    deltaTime: number;
    elasticity?: number;
    decelerationRate?: number;
    snapElasticVelocityBelowOne?: boolean;
    minimumVelocity?: number;
}): StoryUnityScrollRectFrame {
    const safeMaximum = Math.max(0, maximum);
    const safeMinimumVelocity = Number.isFinite(minimumVelocity) && minimumVelocity >= 0
        ? minimumVelocity
        : 1;
    const target = Math.min(safeMaximum, Math.max(0, visualPosition));
    if (target !== visualPosition) {
        const smoothed = getStoryUnitySmoothDampFrame(visualPosition, target, velocity, elasticity, deltaTime);
        const nextVelocity = snapElasticVelocityBelowOne &&
            Math.abs(smoothed.velocity) < safeMinimumVelocity
            ? 0
            : smoothed.velocity;
        return {
            ...getRawVisualFrame(smoothed.value, safeMaximum),
            velocity: nextVelocity,
            motion: "elastic",
        };
    }
    let nextVelocity = velocity * Math.pow(decelerationRate, deltaTime);
    if (Math.abs(nextVelocity) < safeMinimumVelocity) {
        nextVelocity = 0;
    }
    if (nextVelocity === 0) {
        return {
            ...getRawVisualFrame(visualPosition, safeMaximum),
            velocity: 0,
            motion: "idle",
        };
    }
    // ScrollRect calculates its offset before applying inertia. Therefore the
    // first boundary-crossing frame is raw; RubberDelta is pointer-drag only.
    const nextVisualPosition = visualPosition + nextVelocity * deltaTime;
    const next = getRawVisualFrame(nextVisualPosition, safeMaximum);
    return {
        ...next,
        velocity: nextVelocity,
        motion: nextVisualPosition < 0 || nextVisualPosition > safeMaximum
            ? "inertia-boundary"
            : "inertia",
    };
}
