import { CharacterSpineTrackingFloat } from "./characterSpineTracking.ts";
export interface NativeDamageMotionPosition {
    posX: number;
    posZ: number;
    jumpYPos: number;
}
export interface NativeDamageMotionTarget extends NativeDamageMotionPosition {
    unitSizeY: number;
    dying: boolean;
}
export interface NativeDamageMotionState {
    position: NativeDamageMotionPosition;
    beforePosition: NativeDamageMotionPosition;
    right: boolean;
    speedX: number;
    speedY: number;
    speedZ: number;
    addRotate: number;
    speedFactorX: number;
    speedFactorY: number;
    direction: {
        x: number;
        y: number;
        z: number;
    };
    magnitude: number;
    eventDirSpeed: number;
    footOnLand: boolean;
    lastTargetX: number;
    targetDirSpeed: CharacterSpineTrackingFloat;
    directionTrackX: CharacterSpineTrackingFloat;
    directionTrackY: CharacterSpineTrackingFloat;
    moveTracks: {
        posX: CharacterSpineTrackingFloat;
        posZ: CharacterSpineTrackingFloat;
        jumpYPos: CharacterSpineTrackingFloat;
    };
}
export interface NativeDamageMotionTemplate {
    useTargetDir: boolean;
    noMove: boolean;
    landConnect: boolean;
    landStruck: boolean;
    reloadAccel: number;
    gAccel: number;
    maxGSpeed: number;
}
const f = Math.fround;
const near = (value: number): boolean => Math.abs(value) < f(1e-5);
/** Original NKMVector3 uses XYZ for magnitude but XZY for normalization.
 * Its scalar stores and method boundaries determine float32 rounding. */
function normalize(v: NativeDamageMotionState["direction"]): void {
    const squared = f(v.x * v.x + v.z * v.z + v.y * v.y);
    if (squared > 0) {
        const length = f(Math.sqrt(squared));
        v.x = f(v.x / length);
        v.y = f(v.y / length);
        v.z = f(v.z / length);
    }
}
/** Original NKMDamageEffect.MakeDirVec. Missing homing targets retain the
 * previous direction. SpeedZ does not replace the stored direction.z. */
export function makeNativeDamageEffectDirection(state: NativeDamageMotionState, useTargetDir: boolean, target: NativeDamageMotionTarget | null, delta: number): void {
    const v = state.direction;
    if (useTargetDir) {
        if (target) {
            const x = f(target.posX - state.position.posX);
            const y = f(target.jumpYPos + target.unitSizeY * .5 - state.position.jumpYPos);
            if (state.targetDirSpeed.nowValue > 0) {
                state.directionTrackX.setTracking(x, state.targetDirSpeed.nowValue, 1);
                state.directionTrackY.setTracking(y, state.targetDirSpeed.nowValue, 1);
            }
            else {
                state.directionTrackX.setNowValue(x);
                state.directionTrackY.setNowValue(y);
            }
            state.directionTrackX.update(delta);
            state.directionTrackY.update(delta);
            v.x = state.directionTrackX.nowValue;
            v.y = state.directionTrackY.nowValue;
            normalize(v);
        }
    }
    else {
        v.x = state.speedX;
        v.y = state.speedY;
        if (!near(state.speedFactorX))
            v.x = f(v.x * state.speedFactorX);
        if (!near(state.speedFactorY))
            v.y = f(v.y * state.speedFactorY);
        if (!near(state.addRotate)) {
            const radians = f(state.addRotate * f(.017453292));
            const cosine = f(Math.cos(radians)), sine = f(Math.sin(radians));
            const x = v.x, y = v.y;
            v.x = f(x * cosine - y * sine);
            v.y = f(x * sine + y * cosine);
        }
        if (!state.right)
            v.x = -v.x;
        state.magnitude = f(Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z));
        normalize(v);
    }
    if (near(v.x) && near(v.y) && near(v.z)) {
        v.x = state.right ? 1 : -1;
        state.directionTrackX.setNowValue(v.x);
    }
}
/** Original PhysicProcess, including its separate tracking override pass.
 * Landing/map clamping belongs to the subsequent MapEdgeProcess call. */
export function advanceNativeDamageEffectPhysics(state: NativeDamageMotionState, template: NativeDamageMotionTemplate, stateNoMove: boolean, target: NativeDamageMotionTarget | null, delta: number): void {
    state.beforePosition = { ...state.position };
    const noMove = stateNoMove || template.noMove;
    if (noMove || (state.footOnLand && template.landStruck))
        state.speedX = state.speedY = state.speedZ = 0;
    if (template.landConnect)
        state.position.jumpYPos = 0;
    makeNativeDamageEffectDirection(state, template.useTargetDir, target, delta);
    const closeToTarget = target !== null && !target.dying && template.useTargetDir && Math.abs(f(state.lastTargetX - state.position.posX)) < 40;
    const speed = state.eventDirSpeed === 0 ? state.magnitude : state.eventDirSpeed;
    if (!near(speed) && !closeToTarget) {
        const distance = near(state.speedFactorX) ? f(speed * delta) : f(speed * delta * state.speedFactorX);
        state.position.posX = f(state.position.posX + state.direction.x * distance);
        state.position.posZ = f(state.position.posZ + state.direction.z * distance);
        state.position.jumpYPos = f(state.position.jumpYPos + state.direction.y * distance);
    }
    if (template.useTargetDir) {
        state.position.jumpYPos = near(state.speedFactorY) ? f(state.position.jumpYPos + state.speedY * delta)
            : f(state.position.jumpYPos + state.speedY * state.speedFactorY * delta);
        const afterDistance = f(state.lastTargetX - state.position.posX);
        if ((state.lastTargetX - state.beforePosition.posX) * afterDistance <= 0)
            state.position.posX = state.lastTargetX;
    }
    for (const key of ["speedX", "speedZ"] as const) {
        if (state[key] >= 0) {
            state[key] = f(state[key] - template.reloadAccel * delta);
            if (state[key] <= 0)
                state[key] = 0;
        }
        else {
            state[key] = f(state[key] + template.reloadAccel * delta);
            if (state[key] > 0)
                state[key] = 0;
        }
    }
    state.speedY = f(state.speedY - template.gAccel * delta);
    if (state.speedY <= template.maxGSpeed)
        state.speedY = template.maxGSpeed;
    if (noMove)
        for (const track of Object.values(state.moveTracks))
            track.stopTracking();
    for (const key of ["posX", "posZ", "jumpYPos"] as const)
        state.moveTracks[key].update(delta);
    for (const [key, speedKey] of [["posX", "speedX"], ["posZ", "speedZ"], ["jumpYPos", "speedY"]] as const) {
        const track = state.moveTracks[key];
        if (track.tracking) {
            state[speedKey] = 0;
            state.position[key] = track.nowValue;
        }
    }
    if (template.landConnect)
        state.position.jumpYPos = 0;
}
/** Original MapEdgeProcess. A bounce preserves the previous foot bit. */
export function constrainNativeDamageEffectPosition(state: NativeDamageMotionState, landBind: boolean, map: {
    minX: number;
    maxX: number;
} | null): void {
    if (state.position.jumpYPos <= 0) {
        state.position.jumpYPos = 0;
        if (landBind && state.speedY <= -10)
            state.speedY = f(-state.speedY * .5);
        else {
            state.speedY = 0;
            state.footOnLand = true;
        }
    }
    else
        state.footOnLand = false;
    if (map) {
        if (state.position.posX > map.maxX)
            state.position.posX = map.maxX;
        if (state.position.posX < map.minX)
            state.position.posX = map.minX;
    }
}
