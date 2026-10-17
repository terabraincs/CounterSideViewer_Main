import unusedVoiceCatalog from "@/data/unused-voices.json";
import { getVoiceSourceLocale, type VoiceLanguage } from "@/lib/voice";
import type { VoiceGroup } from "@/lib/voiceGroups";
type UnusedVoiceTarget = {
    kind: "unit" | "skin" | "operator";
    id: string;
    skinId?: string;
};
type UnusedVoiceEntry = {
    id: string;
    bundle: string;
    category: "unit" | "battle" | "operator";
    groupId: string;
    groupLabel: string;
    targets: UnusedVoiceTarget[];
    files: Partial<Record<VoiceLanguage, string>>;
};
const entries = unusedVoiceCatalog.entries as UnusedVoiceEntry[];
function audioPath(entry: UnusedVoiceEntry, language: VoiceLanguage): string {
    const sourceLocale = getVoiceSourceLocale(entry.category, entry.bundle, language);
    if (!sourceLocale)
        return "";
    const relative = entry.files[sourceLocale];
    const suffix = sourceLocale === "ja" ? "vjpn" : "vkor";
    if (!/^[a-z0-9_]+$/.test(entry.bundle) ||
        !/^[A-Za-z0-9_-]+$/.test(entry.id) ||
        relative !== `voice/unused/${entry.bundle}.${suffix}/${entry.id}.ogg`)
        return "";
    return `/${relative.split("/").map(encodeURIComponent).join("/")}`;
}
function getUnusedVoices(target: UnusedVoiceTarget): VoiceGroup[] {
    const groups = new Map<string, VoiceGroup>();
    for (const entry of entries) {
        if (!entry.targets.some((owner) => owner.kind === target.kind && owner.id === target.id &&
            (target.kind !== "skin" || owner.skinId === target.skinId)))
            continue;
        const koreanAudio = audioPath(entry, "ko");
        const japaneseAudio = audioPath(entry, "ja");
        if (!koreanAudio && !japaneseAudio)
            continue;
        let group = groups.get(entry.groupId);
        if (!group) {
            group = { id: entry.groupId, label: entry.groupLabel, clips: [] };
            groups.set(entry.groupId, group);
        }
        group.clips.push({
            id: entry.id,
            bundle: entry.bundle,
            audioPath: koreanAudio,
            japaneseAudioPath: japaneseAudio,
        });
    }
    return [...groups.values()];
}
/** Only explicitly reviewed owners are listed; skin pages never inherit these clips. */
export function getCharacterUnusedVoices(unitStrId: string, skinId?: string | number) {
    return getUnusedVoices(skinId === undefined
        ? { kind: "unit", id: unitStrId }
        : { kind: "skin", id: unitStrId, skinId: String(skinId) });
}
export function getOperatorUnusedVoices(operatorId: string) {
    return getUnusedVoices({ kind: "operator", id: operatorId });
}
