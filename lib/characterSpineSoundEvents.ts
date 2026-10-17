import type { CharacterSpineRuntimeEvent } from "./characterSpineEffectData";
import { nativeSoundIsRightSkin, readNativeSoundEvent, type NativeSoundEvent } from "./characterSpineSound.ts";
/** Shared original EventTimer body. The caller supplies its zero-frame rule:
 * Unit uses nearly-zero current time; DE uses m_bStateFirstFrame. */
export function nativeSoundEventTimer(time: number, previous: number, current: number, zeroFrame: boolean, oneTime: boolean, stamps: Map<number, boolean>): boolean {
    if (!((time > previous && time <= current) || (Math.abs(time) < Math.fround(.00001) && zeroFrame)))
        return false;
    if (!oneTime)
        return true;
    if (!stamps.has(time))
        stamps.set(time, false);
    return !stamps.get(time);
}
/** Original ProcessEventSound gates; application is synchronous so shared RNG
 * and later event families retain original call order. */
export function processNativeSoundEvents<T extends CharacterSpineRuntimeEvent>(events: readonly T[], context: {
    readonly stateEnd: boolean;
    readonly animationLoop: boolean;
    readonly getSkinId: () => number;
    readonly checkCondition: (event: T) => boolean;
    readonly eventTimer: (event: T, oneTime: boolean) => boolean;
}, apply: (event: T, sound: NativeSoundEvent) => void): void {
    for (const event of events) {
        if (!context.checkCondition(event))
            continue;
        const sound = readNativeSoundEvent(event);
        if (!nativeSoundIsRightSkin(sound, context.getSkinId()))
            continue;
        const atEnd = event.nativeFields.m_bStateEndTime ?? false;
        if (typeof atEnd !== "boolean")
            throw new Error("Invalid original sound state-end flag");
        if ((atEnd && context.stateEnd) || (context.eventTimer(event, !context.animationLoop) && !atEnd))
            apply(event, sound);
    }
}
