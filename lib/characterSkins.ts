import { publicFileExists } from "@/lib/publicAssets";
import { deploymentData } from "@/lib/deployment";
import fs from "node:fs";
import path from "node:path";
import { createVoiceAudioPath } from "@/lib/voice";
type MergedUnit = {
    idx: number;
    unitId: number;
    unitStrId?: string;
    nameKey: string;
};
type UnitTemplate = {
    m_UnitID?: number;
    m_UnitStrID?: string;
    m_BaseUnitID?: number;
    m_NKM_UNIT_STYLE_TYPE?: string;
};
type SkinRow = {
    m_bEnable?: boolean;
    m_SkinID?: number;
    m_SkinStrID?: string;
    m_SkinEquipUnitID?: number;
    m_SkinGrade?: string;
    m_Title?: string;
    m_SkinDesc?: string;
    m_FaceCardName?: string;
};
type VoiceTemplateRow = {
    IDX?: number;
    m_bVoiceCondLifetime?: boolean;
    m_VoicePostID?: string;
    m_VoiceButtonName?: string;
};
type JsonTable<T> = {
    data?: T[];
};
type TextTable = {
    data?: unknown[];
    m_dicString?: Record<string, string>;
};
export type CharacterSkinDialogue = {
    id: string;
    audioPath: string;
    japaneseAudioPath: string;
    isLifetime: boolean;
    label: string;
    text: string;
};
export type CharacterSkin = {
    id: string;
    skinStrId: string;
    href: string;
    title: string;
    description: string;
    grade: string;
    backgroundPath: string;
    imagePath: string;
};
export type CharacterSkinDetail = {
    unitId: string;
    unitName: string;
    skin: CharacterSkin;
    dialogues: CharacterSkinDialogue[];
    otherSkins: CharacterSkin[];
};
const skinGradeMap: Record<string, string> = {
    SG_NORMAL: "언커먼",
    SG_RARE: "레어",
    SG_PREMIUM: "프리미엄",
    SG_SPECIAL: "스페셜",
};
const skinBackgroundMap: Record<string, string> = {
    SG_NORMAL: "/unit/unit_bg/NKM_UI_UNIT_SELECT_LIST_UNIT_SLOT_BG_R.png",
    SG_RARE: "/unit/unit_bg/NKM_UI_UNIT_SELECT_LIST_UNIT_SLOT_BG_SR.png",
    SG_PREMIUM: "/unit/unit_bg/NKM_UI_UNIT_SELECT_LIST_UNIT_SLOT_BG_SSR.png",
    SG_SPECIAL: "/unit/unit_bg/NKM_UI_UNIT_SELECT_LIST_UNIT_SLOT_SKIN_BG_SP.png",
};
const ordinalSkinAliases = [
    "firstskin",
    "secondskin",
    "thirdskin",
    "fourthskin",
    "fifthskin",
];
let cachedUnitTemplates: UnitTemplate[] | null = null;
function readLocalJson<T>(fileName: string) {
    const filePaths = [
        path.join(process.cwd(), "json", "character", fileName),
        path.join(process.cwd(), "json", "KR", "character", fileName),
        path.join(process.cwd(), "json", fileName),
        path.join(process.cwd(), "json", "KR", fileName),
    ];
    const filePath = filePaths.find((candidatePath) => publicFileExists(candidatePath));
    if (!filePath) {
        return null;
    }
    try {
        return deploymentData(JSON.parse(fs.readFileSync(filePath, "utf8"))) as T;
    }
    catch {
        return null;
    }
}
function createTextMap(table: TextTable | null) {
    const textMap = new Map<string, string>();
    if (!table) {
        return textMap;
    }
    if (Array.isArray(table.data)) {
        for (const row of table.data) {
            if (Array.isArray(row) &&
                typeof row[0] === "string" &&
                typeof row[1] === "string") {
                textMap.set(row[0], row[1]);
            }
        }
    }
    if (table.m_dicString) {
        for (const [key, value] of Object.entries(table.m_dicString)) {
            if (typeof value === "string") {
                textMap.set(key, value);
            }
        }
    }
    return textMap;
}
function readMergedUnits() {
    return (readLocalJson<MergedUnit[]>("merged_units.json") ??
        readLocalJson<MergedUnit[]>("merged_units copy.json") ??
        []);
}
function findUnit(routeId: string) {
    const decodedRouteId = decodeURIComponent(routeId);
    return (readMergedUnits().find((unit) => {
        return (unit.unitStrId === decodedRouteId ||
            String(unit.idx) === decodedRouteId ||
            String(unit.unitId) === decodedRouteId);
    }) ?? null);
}
function getSkinRowsForUnit(unit: MergedUnit) {
    const skinRows = readLocalJson<JsonTable<SkinRow>>("064_LUA_SKIN_TEMPLET_m.json")?.data ??
        [];
    let matchedRows = skinRows.filter((skin) => {
        return skin.m_bEnable === true && skin.m_SkinEquipUnitID === unit.unitId;
    });
    if (matchedRows.length === 0 && unit.unitStrId?.endsWith("_RA")) {
        cachedUnitTemplates ??= [
            ...(readLocalJson<JsonTable<UnitTemplate>>("004_LUA_UNIT_TEMPLET_BASE_h.json")?.data ?? []),
            ...(readLocalJson<JsonTable<UnitTemplate>>("006_LUA_UNIT_TEMPLET_BASE6_g.json")?.data ?? []),
        ];
        const template = cachedUnitTemplates.find((candidate) => candidate.m_UnitID === unit.unitId &&
            candidate.m_UnitStrID === unit.unitStrId);
        // NKMSkinManager.GetBaseUnitID shares skins through the original template,
        // even when that base unit has no public page (C.C. 2230 -> 1230).
        const skinOwnerId = template?.m_BaseUnitID &&
            template.m_NKM_UNIT_STYLE_TYPE !== "NUST_TRAINER"
            ? template.m_BaseUnitID
            : unit.unitId;
        matchedRows = skinRows.filter((skin) => {
            return skin.m_bEnable === true && skin.m_SkinEquipUnitID === skinOwnerId;
        });
    }
    return matchedRows.sort((first, second) => (first.m_SkinID ?? 0) - (second.m_SkinID ?? 0));
}
function createSkinList(unit: MergedUnit) {
    const skinTextMap = createTextMap(readLocalJson<TextTable>("088_LUA_SI_SKIN_KOREA_l.json"));
    const unitRouteId = unit.unitStrId ?? String(unit.idx);
    return getSkinRowsForUnit(unit).flatMap((skin, index) => {
        if (!skin.m_SkinStrID) {
            return [];
        }
        const fileName = skin.m_FaceCardName ? `${skin.m_FaceCardName}.png` : "";
        const imageExists = fileName
            ? publicFileExists(path.join(process.cwd(), "public", "unit", "unit_face", fileName))
            : false;
        return [
            {
                id: String(skin.m_SkinID ?? skin.m_SkinStrID),
                skinStrId: skin.m_SkinStrID,
                href: `/characters/${encodeURIComponent(unitRouteId)}/${ordinalSkinAliases[index] ?? encodeURIComponent(skin.m_SkinStrID)}`,
                title: (skin.m_Title ? skinTextMap.get(skin.m_Title) : "") ||
                    skin.m_SkinStrID,
                description: (skin.m_SkinDesc ? skinTextMap.get(skin.m_SkinDesc) : "") || "",
                grade: skinGradeMap[skin.m_SkinGrade ?? ""] || "스킨",
                backgroundPath: skinBackgroundMap[skin.m_SkinGrade ?? ""] || "",
                imagePath: imageExists ? `/unit/unit_face/${fileName}` : "",
            },
        ];
    });
}
function createSkinDialogues(skinStrId: string) {
    const captionTextMap = createTextMap(readLocalJson<TextTable>("016_LUA_SI_CAPTION_KOREA_i.json"));
    const menuTextMap = createTextMap(readLocalJson<TextTable>("052_LUA_SI_MENU_KOREA_l.json"));
    const voiceTemplateRows = readLocalJson<JsonTable<VoiceTemplateRow>>("147_LUA_COLLECTION_VOICE_TEMPLET_z.json")?.data ?? [];
    const bundleId = `AB_UI_SKIN_VOICE_${skinStrId}`;
    const bundlePrefix = `${bundleId}@`;
    const captionEntries = Array.from(captionTextMap.entries()).flatMap(([key, text]) => {
        if (!key.toUpperCase().startsWith(bundlePrefix.toUpperCase())) {
            return [];
        }
        const [, soundId = ""] = key.split("@");
        return [{ soundId, text: text.trim() }];
    });
    return voiceTemplateRows
        .sort((first, second) => (first.IDX ?? 0) - (second.IDX ?? 0))
        .flatMap((row) => {
        const postId = row.m_VoicePostID ?? "";
        const suffix = `_${postId}`.toUpperCase();
        const matchingCaptions = captionEntries.filter((entry) => {
            const upperSoundId = entry.soundId.toUpperCase();
            if (upperSoundId.endsWith(suffix)) {
                return true;
            }
            return (postId === "LOBBY_INTRO_ORIGINAL" &&
                /_LOBBY_INTRO_\d+$/.test(upperSoundId));
        });
        const label = row.m_VoiceButtonName
            ? menuTextMap.get(row.m_VoiceButtonName)
            : "";
        return matchingCaptions.map((caption, index) => ({
            id: `${postId}-${index + 1}`,
            audioPath: createVoiceAudioPath("unit", bundleId, caption.soundId),
            japaneseAudioPath: createVoiceAudioPath("unit", bundleId, caption.soundId, "ja"),
            isLifetime: row.m_bVoiceCondLifetime === true,
            label: (label || postId).replaceAll("_", " "),
            text: caption.text,
        }));
    });
}
export function getCharacterSkinsForUnit(unit: MergedUnit) {
    return createSkinList(unit);
}
export function getCharacterSkinStaticParams() {
    return readMergedUnits().flatMap((unit) => {
        const unitRouteId = unit.unitStrId ?? String(unit.idx);
        return createSkinList(unit).map((skin, index) => ({
            id: unitRouteId,
            skinId: ordinalSkinAliases[index] ?? skin.skinStrId,
        }));
    });
}
export function getCharacterSkinDetail(unitRouteId: string, skinRouteId: string): CharacterSkinDetail | null {
    const unit = findUnit(unitRouteId);
    if (!unit) {
        return null;
    }
    const skins = createSkinList(unit);
    const decodedSkinRouteId = decodeURIComponent(skinRouteId);
    const aliasIndex = ordinalSkinAliases.indexOf(decodedSkinRouteId.toLowerCase());
    const skin = skins.find((candidate) => {
        return (candidate.skinStrId === decodedSkinRouteId ||
            candidate.id === decodedSkinRouteId);
    }) ?? (aliasIndex >= 0 ? skins[aliasIndex] : undefined);
    if (!skin) {
        return null;
    }
    const unitTextMap = createTextMap(readLocalJson<TextTable>("002_LUA_SI_UNIT_KOREA_l.json"));
    return {
        unitId: unit.unitStrId ?? String(unit.idx),
        unitName: unitTextMap.get(unit.nameKey) ?? unit.nameKey,
        skin,
        dialogues: createSkinDialogues(skin.skinStrId),
        otherSkins: skins.filter((candidate) => candidate.id !== skin.id),
    };
}
