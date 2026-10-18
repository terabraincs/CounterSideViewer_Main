import { deploymentData } from "@/lib/deployment";
import fs from "node:fs";
import path from "node:path";
import { getVoiceSourceLocale } from "@/lib/voice";
import type { VoiceGroup } from "@/lib/voiceGroups";
const BATTLE_VOICE_BASE_URL = "https://raw.githubusercontent.com/terabraincs/CS_Voice/main";
type BattleVoiceReference = {
    id: string;
    bundle: string;
    soundId: string;
};
type BattleVoiceSourceGroup = {
    id: string;
    label: string;
    clips: BattleVoiceReference[];
};
type BattleVoiceCatalog = {
    schemaVersion: 1;
    units: Record<string, {
        base: BattleVoiceSourceGroup[];
        skins: Record<string, BattleVoiceSourceGroup[]>;
    }>;
};
type BattleVoiceAssets = {
    schemaVersion: 1;
    clips: Record<string, {
        ko?: string;
        ja?: string;
    }>;
};
export type CharacterBattleVoiceGroup = VoiceGroup;
let catalog: BattleVoiceCatalog | undefined;
let assets: BattleVoiceAssets | undefined;
const audioPaths = new Map<string, string>();
function readJson<T>(directory: string, file: string): T {
    const filePath = path.join(
    /* turbopackIgnore: true */ process.cwd(), directory, file);
    return deploymentData(JSON.parse(fs.readFileSync(/* turbopackIgnore: true */ filePath, "utf8"))) as T;
}
function resolveAudioPath(relativePath: string | undefined): string {
    if (!relativePath)
        return "";
    const cached = audioPaths.get(relativePath);
    if (cached !== undefined)
        return cached;
    if (!/^battle_voice\/[a-z0-9_-]+\.(?:vkor|vjpn)\/[A-Za-z0-9_-]+\.ogg$/.test(relativePath)) {
        return "";
    }
    // The verified manifest records uploaded locale files. Spoken-language
    // exceptions are applied separately when each clip is mapped below.
    // Remote playback must not depend on a local copy of the audio at build time.
    const url = `${BATTLE_VOICE_BASE_URL}/${relativePath.split("/").map(encodeURIComponent).join("/")}`;
    audioPaths.set(relativePath, url);
    return url;
}
/** Catalog entries follow original state events and skin sound overrides.
 * Missing skin entries inherit the base events; an explicit empty list does not. */
export function getCharacterBattleVoices(unitStrId: string, skinId?: string | number): CharacterBattleVoiceGroup[] {
    catalog ??= readJson<BattleVoiceCatalog>("json", "character-battle-voices.json");
    assets ??= readJson<BattleVoiceAssets>("data", "character-battle-voice-assets.json");
    const availableAssets = assets;
    const unit = catalog.units[unitStrId];
    if (!unit)
        return [];
    const groups = skinId === undefined ? unit.base : unit.skins[String(skinId)] ?? unit.base;
    return groups.map((group) => ({
        id: group.id,
        label: group.label,
        clips: group.clips.map((clip) => {
            const available = availableAssets.clips[`${clip.bundle.toLowerCase()}@${clip.id}`];
            const koreanSource = getVoiceSourceLocale("battle", clip.bundle, "ko");
            const japaneseSource = getVoiceSourceLocale("battle", clip.bundle, "ja");
            return {
                id: clip.id,
                bundle: clip.bundle,
                audioPath: koreanSource ? resolveAudioPath(available?.[koreanSource]) : "",
                japaneseAudioPath: japaneseSource ? resolveAudioPath(available?.[japaneseSource]) : "",
            };
        }).filter((clip) => clip.audioPath || clip.japaneseAudioPath),
    })).filter((group) => group.clips.length > 0);
}
/** Skin pages only show battle voices when the skin changes the base voices.
 * The catalog omits skins whose source voice groups are identical to the base. */
export function getCharacterSkinBattleVoices(unitStrId: string, skinId: string | number): CharacterBattleVoiceGroup[] {
    catalog ??= readJson<BattleVoiceCatalog>("json", "character-battle-voices.json");
    const unit = catalog.units[unitStrId];
    if (!unit || !Object.hasOwn(unit.skins, String(skinId)))
        return [];
    return getCharacterBattleVoices(unitStrId, skinId);
}
