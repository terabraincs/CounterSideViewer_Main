import type { CharacterSpineRuntimeEvent } from "./characterSpineEffectData";
type Fields = Readonly<Record<string, unknown>>;
export interface NativeSoundFields {
    readonly m_SkinID: number;
    readonly m_bVoice: boolean;
    readonly m_fLocalVol: number;
    readonly m_fFocusRange: number;
    readonly m_b3D: boolean;
    readonly m_bLoop: boolean;
    readonly m_PlayRate: number;
    readonly m_bStopSound: boolean;
}
export interface NativeSoundEvent {
    readonly fields: NativeSoundFields;
    readonly names: readonly string[];
    readonly skins: ReadonlyMap<number, readonly string[]> | null;
}
export interface NativeSoundRandom {
    range(minimum: number, maximum: number): number;
    rangeInt(minimum: number, maximum: number): number;
}
export interface NativeSoundPlaybackPlan {
    readonly soundName: string;
    readonly track: "sound" | "voice";
    readonly localVolume: number;
    readonly positionX: number;
    readonly focusRange: number;
    readonly loop: boolean;
    readonly reserveTime: 0;
    readonly showCaption: false;
    readonly startTime: 0;
    /** Add the returned UID (including 0) to the owner's m_listSoundUID. */
    readonly trackUid: boolean;
    readonly voice: {
        readonly gameUnitUid: number;
        readonly clearVoice: true;
        readonly ignoreSameVoice: true;
    } | null;
}
export type NativeDeathSoundPlan = NativeSoundPlaybackPlan;
function int(value: unknown): number {
    if (typeof value !== "number" || !Number.isInteger(value) || value < -2147483648 || value > 2147483647)
        throw new Error("Native sound field requires Int32");
    return value;
}
function float(value: unknown): number {
    if (typeof value !== "number" || !Number.isFinite(Math.fround(value)))
        throw new Error("Native sound field requires finite float32");
    return Math.fround(value);
}
function boolean(value: unknown): boolean {
    if (typeof value !== "boolean")
        throw new Error("Native sound field requires boolean");
    return value;
}
function names(value: unknown): string[] {
    if (value === null || typeof value !== "object")
        throw new Error("Native sound list requires an indexed string table");
    const result: string[] = [];
    // NKMLua.GetData(index, ref string) starts at 1 and stops at the first
    // missing/non-string value. Named fields inside the table are not event fields.
    for (let index = 1;; index++) {
        const item: unknown = Array.isArray(value) ? value[index - 1] : (value as Fields)[index];
        if (typeof item === "string")
            result.push(item);
        else if (typeof item === "number") {
            // Lua also accepts numbers as strings. Only the integral Int32 domain is
            // supported here; other Lua number formatting needs its own native proof.
            result.push(String(int(item)));
        }
        else
            break;
    }
    return result;
}
/** Original NKMEventSound.LoadFromLUA overlays scalars, but replaces each present list/table.
 * Native execution checks both inherited rows and all extracted death-sound rows. */
export function readNativeSoundEvent(event: Pick<CharacterSpineRuntimeEvent, "nativeFields" | "sourceLayers">): NativeSoundEvent {
    const fields: Record<string, unknown> = { m_SkinID: -1, m_bVoice: false, m_fLocalVol: 1,
        m_fFocusRange: 1200, m_b3D: false, m_bLoop: false, m_PlayRate: 1, m_bStopSound: false };
    let soundNames: string[] = [];
    let skins: Map<number, readonly string[]> | null = null;
    const layers: readonly Fields[] = event.sourceLayers.length ? event.sourceLayers.map(layer => layer.fields) : [event.nativeFields];
    for (const layer of layers) {
        for (const key of Object.keys(fields))
            if (layer[key] !== undefined)
                fields[key] = layer[key];
        if (layer.m_listSoundName !== undefined)
            soundNames = names(layer.m_listSoundName);
        if (layer.m_dicSkinSound !== undefined) {
            if (!Array.isArray(layer.m_dicSkinSound))
                throw new Error("Native skin sound table requires indexed rows");
            skins = new Map();
            for (const row of layer.m_dicSkinSound) {
                if (!Array.isArray(row) || row.length < 1)
                    throw new Error("Invalid native skin sound row");
                const skin = int(row[0]);
                if (skins.has(skin))
                    throw new Error(`Duplicate native skin sound key ${skin}`);
                skins.set(skin, names(row.slice(1)));
            }
        }
    }
    return { fields: { m_SkinID: int(fields.m_SkinID), m_bVoice: boolean(fields.m_bVoice), m_fLocalVol: float(fields.m_fLocalVol),
            m_fFocusRange: float(fields.m_fFocusRange), m_b3D: boolean(fields.m_b3D), m_bLoop: boolean(fields.m_bLoop),
            m_PlayRate: float(fields.m_PlayRate), m_bStopSound: boolean(fields.m_bStopSound) }, names: soundNames, skins };
}
export function nativeSoundIsRightSkin(event: NativeSoundEvent, skinId: number): boolean {
    return event.fields.m_SkinID < 0 || event.fields.m_SkinID === int(skinId);
}
export function selectNativeSound(event: NativeSoundEvent, skinId: number, random: NativeSoundRandom): string | null {
    const list = nativeSoundNamesForSkin(event, skinId);
    if (!list.length)
        return null;
    const index = random.rangeInt(0, list.length);
    if (!Number.isInteger(index) || index < 0 || index >= list.length)
        throw new Error("Invalid original sound selection random index");
    return list[index];
}
/** Candidate names for resource preparation; selection still consumes RNG only
 * when the native sound event is applied. Empty skin lists use the base list. */
export function nativeSoundNamesForSkin(event: NativeSoundEvent, skinId: number): readonly string[] {
    const skinNames = event.skins?.get(int(skinId));
    return skinNames?.length ? skinNames : event.names;
}
/** NKCUnitClient/NKCDamageEffect.ApplyEventSound, after condition/skin/timer
 * processing. Ordinary DE events always use PlaySound even when m_bVoice is set. */
export function resolveNativeAppliedSound(event: NativeSoundEvent, context: {
    readonly skinId: number;
    readonly positionX: number;
    readonly random: NativeSoundRandom;
} & ({
    readonly owner: "unit";
    readonly gameUnitUid: number;
} | {
    readonly owner: "damage-effect";
})): NativeSoundPlaybackPlan | null {
    if (!(context.random.range(0, 1) <= event.fields.m_PlayRate))
        return null;
    const soundName = selectNativeSound(event, context.skinId, context.random);
    if (soundName === null)
        return null;
    const voice = context.owner === "unit" && event.fields.m_bVoice;
    if (voice && (!Number.isInteger(context.gameUnitUid) || context.gameUnitUid < -32768 || context.gameUnitUid > 32767))
        throw new Error("Native unit voice owner requires Int16");
    return { soundName, track: voice ? "voice" : "sound", localVolume: event.fields.m_fLocalVol,
        positionX: float(context.positionX), focusRange: event.fields.m_fFocusRange, loop: event.fields.m_bLoop,
        reserveTime: 0, showCaption: false, startTime: 0, trackUid: event.fields.m_bStopSound,
        voice: voice ? { gameUnitUid: context.gameUnitUid, clearVoice: true, ignoreSameVoice: true } : null };
}
/** NKCDamageEffect.ProcessDieEventSound. Unlike ordinary DE sound, this path
 * branches on m_bVoice and sends voice UID0 with bClearVoice=true. */
export function resolveNativeDeathSound(event: NativeSoundEvent, context: {
    readonly checkCondition: () => boolean;
    readonly masterSkinId: number;
    readonly positionX: number;
    readonly random: NativeSoundRandom;
}): NativeDeathSoundPlan | null {
    if (!context.checkCondition() || !nativeSoundIsRightSkin(event, context.masterSkinId))
        return null;
    return resolveNativeAppliedSound(event, { owner: "unit", gameUnitUid: 0, skinId: context.masterSkinId,
        positionX: context.positionX, random: context.random });
}
