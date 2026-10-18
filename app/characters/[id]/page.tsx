import { deploymentData } from "@/lib/deployment";
import { publicFileExists } from "@/lib/publicAssets";
import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Image from "@/components/DeploymentImage";
import Link from "@/components/DeploymentLink";
import CharacterAwakenCircuit from "@/components/CharacterAwakenCircuit";
import BattleVoiceList from "@/components/BattleVoiceList";
import UnusedVoiceList from "@/components/UnusedVoiceList";
import CharacterSkinCard from "@/components/CharacterSkinCard";
import CharacterStatsPanel from "@/components/CharacterStatsPanel";
import CharacterProfileIcon from "@/components/CharacterProfileIcon";
import { getCharacterProfileIcon } from "@/lib/characterProfileIcon";
import CharacterTeamup from "@/components/CharacterTeamup";
import { getCharacterTeamup } from "@/lib/characterTeamups";
import CharacterReactorPanel from "@/components/CharacterReactorPanel";
import { getCharacterReactor } from "@/lib/characterReactors";
import CharacterTypeInfo, { type CharacterTypeInfoTab } from "@/components/CharacterTypeInfo";
import { getCharacterTypeInfoCatalog, getCharacterTypeInfoSelectedIds, getCharacterTypeInfoUnitTags } from "@/lib/characterTypeInfo";
import CharacterSpineViewer from "@/components/CharacterSpineViewer";
import { CharacterSkillMotionButton, CharacterSkillPlaybackProvider } from "@/components/CharacterSkillPlayback";
import { getCharacterSkillSpineAction } from "@/lib/characterSkillSpine";
import type { CharacterStat } from "@/components/CharacterStatsPanel";
import RarityIcon from "@/components/RarityIcon";
import SkillDescription from "@/components/SkillDescription";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import FloatingSectionNav from "@/components/FloatingSectionNav";
import CollectionProfileDocument from "@/components/CollectionProfileDocument";
import CollectionProfilePanel from "@/components/CollectionProfilePanel";
import CollectionProfileSummary from "@/components/CollectionProfileSummary";
import DetailSection from "@/components/DetailSection";
import ProfileIntroduction from "@/components/ProfileIntroduction";
import SkillCard from "@/components/SkillCard";
import DialoguePanel from "@/components/DialoguePanel";
import { getPrivateEquipmentForUnit, type EquipmentListItem, } from "@/lib/equipment";
import { getCharacterSkinsForUnit, type CharacterSkin, } from "@/lib/characterSkins";
import { getTacticalCollectionTitlesForUnit, type CollectionTacticalTitleItem, } from "@/lib/collectionTitles";
import { createVoiceAudioPath } from "@/lib/voice";
import { getCharacterSpineModels } from "@/lib/characterSpine";
import { getCharacterBattleVoices } from "@/lib/characterBattleVoices";
import { getCharacterUnusedVoices } from "@/lib/unusedVoices";
type CharacterDetailPageProps = {
    params: Promise<{
        id: string;
    }>;
};
export const dynamicParams = false;
export function generateStaticParams() {
    return (readMergedUnits() ?? []).map((unit) => ({
        id: unit.unitStrId ?? String(unit.idx),
    }));
}
type BasicInfoCell = {
    label: string;
    value: string;
    infoTab: CharacterTypeInfoTab;
    values?: string[];
    iconPath?: string;
    isAttack?: boolean;
};
type MergedUnit = {
    idx: number;
    unitId: number;
    unitStrId?: string;
    nameKey: string;
    titleKey: string;
    m_NKM_UNIT_GRADE?: string;
    m_bAwaken?: boolean;
    m_NKM_UNIT_STYLE_TYPE?: string;
    m_NKM_UNIT_ROLE_TYPE?: string;
    m_bAirUnit?: boolean;
    m_NKM_FIND_TARGET_TYPE?: string;
    m_RespawnCost?: number;
    m_NKM_UNIT_SOURCE_TYPE?: string;
    m_hsUnitTag?: string[];
    teamupKey?: string | null;
};
type TextTable = {
    data?: unknown[];
    m_dicString?: Record<string, string>;
};
type CollectionEmployee = {
    UnitID: number;
    CharacterType?: string;
    NameType?: string;
    NameValue?: string;
    TeamUpStrID?: string;
    TeamConceptStrID?: string;
    TeamUpMarkStrID?: string;
    GenderType?: string;
    GenderValueStrID?: string;
    BirthType?: string;
    BirthValueStrID?: string;
    HeightType?: string;
    HeightValueStrID?: string;
    SpecialityType?: string;
    SpecialityValueStrID?: string;
    LikeType?: string;
    LikeValueStrID?: string;
    DisLikeType?: string;
    DisLikeValueStrID?: string;
    CombatLevelType?: string;
    CombatLevelValue?: string;
    CommandLevelType?: string;
    CommandLevelValue?: string;
    CRFType?: string;
    CRFSubType_1?: string;
    CRFSubAmount_1?: number;
    CRFSubType_2?: string;
    CRFSubAmount_2?: number;
    CRFSubType_3?: string;
    CRFSubAmount_3?: number;
    CRFSubType_4?: string;
    CRFSubAmount_4?: number;
    CRFSubType_5?: string;
    CRFSubAmount_5?: number;
    ProfileValue_1?: string;
    [key: `CRFSubType_${number}`]: string | undefined;
    [key: `CRFSubAmount_${number}`]: number | undefined;
};
type CollectionUnit = {
    Idx: number;
    m_UnitID: number;
    m_NKM_UNIT_TYPE: string;
    m_bExclude?: boolean;
};
type CollectionEmployeeTable = {
    data?: CollectionEmployee[];
};
type CollectionCrfRow = {
    CRFType?: string;
    ProfileAmountMin?: number;
    ProfileAmountMax?: number;
    ProfileAmountDescStrID?: string;
};
type CollectionCrfTable = {
    data?: CollectionCrfRow[];
};
type UnitStatRow = {
    m_UnitStrID?: string;
    m_RespawnCost?: number;
    m_RespawnCount?: number;
    m_StatData?: {
        m_Stat?: Record<string, number>;
        m_StatPerLevel?: Record<string, number>;
    };
};
type UnitStatTable = {
    data?: UnitStatRow[];
};
type UnitBaseRow = {
    m_UnitStrID?: string;
    m_SkillStrID1?: string;
    m_SkillStrID2?: string;
    m_SkillStrID3?: string;
    m_SkillStrID4?: string;
    m_SkillStrID5?: string;
};
type UnitBaseTable = {
    data?: UnitBaseRow[];
};
type UnitSkillRow = {
    m_UnitSkillStrID?: string;
    m_Level?: number;
    m_UnitSkillIcon?: string;
    m_SkillName?: string;
    m_SkillDesc?: string;
    m_NKM_SKILL_TYPE?: string;
    m_fCooltimeSecond?: number;
};
type UnitSkillTable = {
    data?: UnitSkillRow[];
};
type CharacterSkillUpgrade = {
    level: number;
    description: string;
    cooldown: string;
};
type CharacterSkill = {
    id: string;
    spineActionId?: string;
    name: string;
    type: string;
    iconPath: string;
    baseDescription: string;
    cooldown: string;
    maxLevel: number;
    upgrades: CharacterSkillUpgrade[];
};
type PersonaLink = {
    id: string;
    href: string;
    name: string;
    title: string;
    grade: string;
    gradeColor: string;
    employeeId: string;
    imagePath: string;
    roleType: string;
    roleIconPath: string;
};
type VoiceActorNameRow = {
    VOICE_ACTOR_NAME_StrID?: string;
    Actor_Name_VKOR?: string;
};
type VoiceActorNameTable = {
    data?: VoiceActorNameRow[];
};
type VoiceActorTextRow = {
    StringKey?: string;
    StringValue_KOR?: string;
};
type VoiceActorTextTable = {
    data?: VoiceActorTextRow[];
};
type VoiceTemplateRow = {
    IDX?: number;
    m_bVoiceCondLifetime?: boolean;
    m_VoicePostID?: string;
    m_VoiceButtonName?: string;
};
type VoiceTemplateTable = {
    data?: VoiceTemplateRow[];
};
type CharacterDialogue = {
    id: string;
    audioPath: string;
    japaneseAudioPath: string;
    isLifetime: boolean;
    label: string;
    text: string;
};
type MeasureRow = {
    label: string;
    value: string;
    percent: number;
};
type CharacterDetail = {
    employeeIndex: string;
    employeeId: string;
    name: string;
    title: string;
    imagePath: string;
    teamup: string;
    grade: string;
    gradeColor: string;
    isAwakened: boolean;
    unitType: string;
    roleType: string;
    respawnCost: string;
    respawnCountText: string;
    moveType: string;
    attackType: string;
    sourceType: string;
    unitTags: string[];
    profileTitle: string;
    profileRows: string[][];
    profileTeam?: {
        name: string;
        description: string;
        imagePath: string;
    };
    measureTitle: string;
    measureRows: MeasureRow[];
    statRows: CharacterStat[];
    skills: CharacterSkill[];
    skins: CharacterSkin[];
    privateEquipment: EquipmentListItem[];
    personas: PersonaLink[];
    tacticalTitles: CollectionTacticalTitleItem[];
    voiceActor: string;
    intro: string;
    dialogues: CharacterDialogue[];
};
const gradeMap: Record<string, string> = {
    NUG_N: "N",
    NUG_R: "R",
    NUG_SR: "SR",
    NUG_SSR: "SSR",
};
const gradeColorMap: Record<string, string> = {
    NUG_N: "var(--grade-n)",
    NUG_R: "var(--grade-r)",
    NUG_SR: "var(--grade-sr)",
    NUG_SSR: "var(--grade-ssr)",
};
const unitTypeMap: Record<string, string> = {
    NUST_COUNTER: "카운터",
    NUST_SOLDIER: "솔저",
    NUST_MECHANIC: "메카닉",
};
const roleTypeMap: Record<string, string> = {
    NURT_STRIKER: "스트라이커",
    NURT_RANGER: "레인저",
    NURT_DEFENDER: "디펜더",
    NURT_SNIPER: "스나이퍼",
    NURT_SUPPORTER: "서포터",
    NURT_TOWER: "타워",
    NURT_SIEGE: "시즈",
};
const attackTypeMap: Record<string, string> = {
    NFTT_NEAR_ENEMY: "전천후 공격",
    NFTT_FAR_ENEMY: "전천후 공격",
    NFTT_ENEMY_BOSS: "전천후 공격",
    NFTT_NEAR_ENEMY_AIR_FIRST: "전천후 공격",
    NFTT_NEAR_ENEMY_LAND: "지상 공격",
    NFTT_FAR_ENEMY_LAND: "지상 공격",
    NFTT_ENEMY_BOSS_LAND: "지상 공격",
    NFTT_NEAR_ENEMY_AIR: "공중 공격",
};
const sourceTypeMap: Record<string, string> = {
    NUST_CONFLICT: "투쟁",
    NUST_LIBERAL: "변화",
    NUST_STABLE: "안정",
};
const skillTypeMap: Record<string, string> = {
    NST_ATTACK: "기본 공격",
    NST_PASSIVE: "패시브",
    NST_SKILL: "특수기",
    NST_HYPER: "궁극기",
    NST_LEADER: "리더 스킬",
};
const skillTimeIconPath = "/ui/AB_UI_NKM_UI_LEADER_BOARD_TIME_ICON.png";
const unitTagNameMap: Record<string, string> = {
    NUT_RESPAWN_FREE_POS: "전진출격",
    NUT_REVENGE: "반격기",
    NUT_PATROL: "패트롤",
    NUT_SWINGBY: "스윙바이",
    NUT_FURY: "퓨리",
    NUT_LIMIT_1: "1회 출격 제한",
    NUT_LIMIT_2: "2회 출격 제한",
};
const unitTagIconPath = "/unit/unit_type/NKM_UI_UNIT_INFO_TAG_ICON.png";
const basicInfoIconMap: Record<string, string> = {
    카운터: "/unit/unit_type/NKM_UI_COMMON_UNIT_TYPE_COUNTER.png",
    솔저: "/unit/unit_type/NKM_UI_COMMON_UNIT_TYPE_SOLDIER.png",
    메카닉: "/unit/unit_type/NKM_UI_COMMON_UNIT_TYPE_MECHANIC.png",
    스트라이커: "/unit/unit_type/NKM_UI_COMMON_UNIT_CLASS_ICON_STRIKER.png",
    레인저: "/unit/unit_type/NKM_UI_COMMON_UNIT_CLASS_ICON_RANGER.png",
    디펜더: "/unit/unit_type/NKM_UI_COMMON_UNIT_CLASS_ICON_DEFENDER.png",
    스나이퍼: "/unit/unit_type/NKM_UI_COMMON_UNIT_CLASS_ICON_SNIPER.png",
    서포터: "/unit/unit_type/NKM_UI_COMMON_UNIT_CLASS_ICON_SUPPORTER.png",
    타워: "/unit/unit_type/NKM_UI_COMMON_UNIT_CLASS_ICON_TOWER.png",
    시즈: "/unit/unit_type/NKM_UI_COMMON_UNIT_CLASS_ICON_SIEGE.png",
    "지상 타입": "/unit/unit_type/UI_COMMON_UNIT_TYPE_LAND.png",
    "공중 타입": "/unit/unit_type/UI_COMMON_UNIT_TYPE_AIR.png",
    "지상 공격": "/unit/unit_type/UI_COMMON_UNIT_ATTACK_TYPE_LAND.png",
    "공중 공격": "/unit/unit_type/UI_COMMON_UNIT_ATTACK_TYPE_AIR.png",
    "전천후 공격": "/unit/unit_type/UI_COMMON_UNIT_ATTACK_TYPE_ALL.png",
    투쟁: "/unit/unit_type/NKM_UI_COMMON_WEAK_TAG_SYMBOL_CONFLICT.png",
    안정: "/unit/unit_type/NKM_UI_COMMON_WEAK_TAG_SYMBOL_STABLE.png",
    변화: "/unit/unit_type/NKM_UI_COMMON_WEAK_TAG_SYMBOL_LIBERAL.png",
};
const defaultMeasureRows: MeasureRow[] = [
    {
        label: "화력",
        value: "추가 예정",
        percent: 0,
    },
    {
        label: "생존",
        value: "추가 예정",
        percent: 0,
    },
    {
        label: "보조",
        value: "추가 예정",
        percent: 0,
    },
    {
        label: "기동",
        value: "추가 예정",
        percent: 0,
    },
    {
        label: "난이도",
        value: "추가 예정",
        percent: 0,
    },
];
const statDisplayKeys = [
    "NST_HP",
    "NST_ATK",
    "NST_DEF",
    "NST_CRITICAL",
    "NST_HIT",
    "NST_EVADE",
];
const detailSections = [
    {
        id: "introduction",
        title: "소개",
    },
    {
        id: "stats",
        title: "능력치",
    },
    {
        id: "skills",
        title: "스킬",
    },
    {
        id: "reactor",
        title: "얼터니움 리액터",
    },
    {
        id: "spine",
        title: "스파인 뷰어",
    },
    {
        id: "skins",
        title: "스킨",
    },
    {
        id: "dialogues",
        title: "대사",
    },
    {
        id: "titles",
        title: "칭호",
    },
    {
        id: "persona",
        title: "페르소나",
    },
    {
        id: "teamup",
        title: "팀업",
    },
];
function readLocalJson<T>(fileName: string) {
    const filePaths = [
        path.join(process.cwd(), "json", "character", fileName),
        path.join(process.cwd(), "json", "KR", "character", fileName),
        path.join(process.cwd(), "json", fileName),
        path.join(process.cwd(), "json", "KR", fileName),
    ];
    const filePath = filePaths.find((candidatePath) => fs.existsSync(candidatePath));
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
function readMergedUnits() {
    return (readLocalJson<MergedUnit[]>("merged_units.json") ??
        readLocalJson<MergedUnit[]>("merged_units copy.json"));
}
function readCollectionEmployees() {
    return readLocalJson<CollectionEmployeeTable>("123_LUA_COLLECTION_V0_EMPLOYEE_b.json")?.data;
}
function readCollectionUnits() {
    return readLocalJson<{
        data?: CollectionUnit[];
    }>("024_LUA_COLLECTION_UNIT_TEMPLET_a.json")?.data;
}
function readCollectionCrfRows() {
    return readLocalJson<CollectionCrfTable>("164_LUA_COLLECTION_V5_CRF_h.json")?.data;
}
function readUnitStatRows() {
    const primaryRows = readLocalJson<UnitStatTable>("003_LUA_UNIT_STAT_TEMPLET_h.json")?.data ?? [];
    const additionalRows = readLocalJson<UnitStatTable>("008_LUA_UNIT_STAT_TEMPLET6_g.json")?.data ?? [];
    return [...primaryRows, ...additionalRows];
}
function readUnitBaseRows() {
    return (readLocalJson<UnitBaseTable>("004_LUA_UNIT_TEMPLET_BASE_h.json")?.data ?? []);
}
function readUnitSkillRows() {
    return (readLocalJson<UnitSkillTable>("009_LUA_UNIT_SKILL_TEMPLET_g.json")?.data ?? []);
}
function readVoiceActorNameRows() {
    return readLocalJson<VoiceActorNameTable>("196_LUA_VOICE_ACTOR_NAME_TEMPLET_V6_w.json")?.data;
}
function readVoiceActorTextRows() {
    return readLocalJson<VoiceActorTextTable>("100_LUA_STRING_VOICE_ACTOR_NAME_KOR_w.json")?.data;
}
function readVoiceTemplateRows() {
    return readLocalJson<VoiceTemplateTable>("147_LUA_COLLECTION_VOICE_TEMPLET_z.json")?.data;
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
function createVoiceActorTextMap(rows: VoiceActorTextRow[] | undefined) {
    const textMap = new Map<string, string>();
    if (!rows) {
        return textMap;
    }
    for (const row of rows) {
        if (row.StringKey && row.StringValue_KOR) {
            textMap.set(row.StringKey, row.StringValue_KOR);
        }
    }
    return textMap;
}
function getVoiceActorName(unitStrId: string | undefined) {
    if (!unitStrId) {
        return "";
    }
    const voiceActorKey = readVoiceActorNameRows()?.find((row) => {
        return row.VOICE_ACTOR_NAME_StrID === unitStrId;
    })?.Actor_Name_VKOR;
    if (!voiceActorKey) {
        return "";
    }
    return createVoiceActorTextMap(readVoiceActorTextRows()).get(voiceActorKey) ?? "";
}
function createCharacterDialogues(unitStrId: string | undefined) {
    if (!unitStrId) {
        return [];
    }
    const captionTextMap = createTextMap(readLocalJson<TextTable>("016_LUA_SI_CAPTION_KOREA_i.json"));
    const menuTextMap = createTextMap(readLocalJson<TextTable>("052_LUA_SI_MENU_KOREA_l.json"));
    const directDialoguePrefix = `AB_UI_UNIT_VOICE_${unitStrId}@AB_UI_UNIT_VOICE_${unitStrId}_`;
    const hasDirectDialogues = Array.from(captionTextMap.keys()).some((key) => {
        return key.toUpperCase().startsWith(directDialoguePrefix.toUpperCase());
    });
    const dialogueUnitStrId = hasDirectDialogues
        ? unitStrId
        : unitStrId.replace(/_R[A-Z]$/, "");
    const dialoguePrefix = `AB_UI_UNIT_VOICE_${dialogueUnitStrId}@AB_UI_UNIT_VOICE_${dialogueUnitStrId}_`;
    const upperDialoguePrefix = dialoguePrefix.toUpperCase();
    const dialogueByPostId = new Map<string, {
        bundleId: string;
        soundId: string;
        text: string;
    }>();
    for (const [key, text] of captionTextMap) {
        if (!key.toUpperCase().startsWith(upperDialoguePrefix)) {
            continue;
        }
        const postId = key.slice(dialoguePrefix.length);
        const [bundleId = "", soundId = ""] = key.split("@");
        dialogueByPostId.set(postId, {
            bundleId,
            soundId,
            text: text.trim(),
        });
    }
    return (readVoiceTemplateRows() ?? [])
        .filter((row) => {
        return Boolean(row.m_VoicePostID && dialogueByPostId.has(row.m_VoicePostID));
    })
        .sort((first, second) => (first.IDX ?? 0) - (second.IDX ?? 0))
        .map((row) => {
        const postId = row.m_VoicePostID ?? "";
        const label = row.m_VoiceButtonName
            ? menuTextMap.get(row.m_VoiceButtonName)
            : "";
        const dialogue = dialogueByPostId.get(postId);
        return {
            id: postId,
            audioPath: createVoiceAudioPath("unit", dialogue?.bundleId ?? "", dialogue?.soundId ?? ""),
            japaneseAudioPath: createVoiceAudioPath("unit", dialogue?.bundleId ?? "", dialogue?.soundId ?? "", "ja"),
            isLifetime: row.m_bVoiceCondLifetime === true,
            label: (label || postId).replaceAll("_", " "),
            text: dialogue?.text ?? "",
        };
    });
}
function resolveSingleTextKey(key: string, textMaps: Map<string, string>[]) {
    if (!key || key === "SI_BLANK") {
        return "";
    }
    for (const textMap of textMaps) {
        const text = textMap.get(key);
        if (text) {
            return text;
        }
    }
    return key;
}
function resolveTextValue(value: string | undefined, textMaps: Map<string, string>[]) {
    if (!value || value === "SI_BLANK") {
        return "";
    }
    const parts = value.split("@@");
    if (parts.length === 1) {
        return resolveSingleTextKey(value, textMaps);
    }
    const template = resolveSingleTextKey(parts[0], textMaps);
    const values = parts
        .slice(1)
        .map((part) => resolveSingleTextKey(part, textMaps));
    return template.replace(/\{(\d+)\}/g, (_, index: string) => {
        return values[Number(index)] ?? "";
    });
}
function createCharacterSkills(unitStrId: string | undefined) {
    if (!unitStrId) {
        return [];
    }
    const unitBase = readUnitBaseRows().find((row) => {
        return row.m_UnitStrID === unitStrId;
    });
    if (!unitBase) {
        return [];
    }
    const skillKeys = [
        unitBase.m_SkillStrID1,
        unitBase.m_SkillStrID2,
        unitBase.m_SkillStrID3,
        unitBase.m_SkillStrID4,
        unitBase.m_SkillStrID5,
    ].filter((skillKey): skillKey is string => Boolean(skillKey));
    const allSkillRows = readUnitSkillRows();
    const skillTextMap = createTextMap(readLocalJson<TextTable>("028_LUA_SI_UNIT_SKILL_KOREA_f.json"));
    const textMaps = [skillTextMap];
    const orderedSkillKeys = /_RA(?:_|$)/.test(unitStrId)
        ? [...skillKeys].sort((firstKey, secondKey) => {
            const firstIsLeader = allSkillRows.some((row) => {
                return (row.m_UnitSkillStrID === firstKey &&
                    row.m_NKM_SKILL_TYPE === "NST_LEADER");
            });
            const secondIsLeader = allSkillRows.some((row) => {
                return (row.m_UnitSkillStrID === secondKey &&
                    row.m_NKM_SKILL_TYPE === "NST_LEADER");
            });
            return Number(secondIsLeader) - Number(firstIsLeader);
        })
        : skillKeys;
    return orderedSkillKeys.flatMap((skillKey) => {
        const levelRows = allSkillRows
            .filter((row) => row.m_UnitSkillStrID === skillKey)
            .sort((first, second) => (first.m_Level ?? 0) - (second.m_Level ?? 0));
        const firstLevel = levelRows[0];
        if (!firstLevel) {
            return [];
        }
        const maxLevel = levelRows.at(-1)?.m_Level ?? 1;
        const cooldown = typeof firstLevel.m_fCooltimeSecond === "number"
            ? `${firstLevel.m_fCooltimeSecond}초`
            : "";
        return [
            {
                id: skillKey,
                spineActionId: getCharacterSkillSpineAction(unitStrId, firstLevel.m_NKM_SKILL_TYPE ?? ""),
                name: resolveTextValue(firstLevel.m_SkillName, textMaps) || "스킬 이름 없음",
                type: skillTypeMap[firstLevel.m_NKM_SKILL_TYPE ?? ""] || "스킬",
                iconPath: firstLevel.m_UnitSkillIcon
                    ? `/unit/unit_skill/${firstLevel.m_UnitSkillIcon}.png`
                    : "",
                baseDescription: resolveTextValue(firstLevel.m_SkillDesc, textMaps) ||
                    "스킬 설명이 없습니다.",
                cooldown,
                maxLevel,
                upgrades: levelRows.slice(1).flatMap((row, index) => {
                    const description = resolveTextValue(row.m_SkillDesc, textMaps);
                    const previousCooldown = levelRows[index]?.m_fCooltimeSecond;
                    const cooldownChanged = typeof row.m_fCooltimeSecond === "number" &&
                        typeof previousCooldown === "number" &&
                        row.m_fCooltimeSecond !== previousCooldown;
                    if (!description || typeof row.m_Level !== "number") {
                        return [];
                    }
                    return [
                        {
                            level: row.m_Level,
                            description,
                            cooldown: cooldownChanged ? `${row.m_fCooltimeSecond}초` : "",
                        },
                    ];
                }),
            },
        ];
    });
}
function getMappedValue(map: Record<string, string>, code?: string) {
    if (!code) {
        return "";
    }
    return map[code] ?? code;
}
function getMoveType(isAirUnit?: boolean) {
    if (typeof isAirUnit !== "boolean") {
        return "";
    }
    return isAirUnit ? "공중 타입" : "지상 타입";
}
function getBasicInfoIconPath(value: string) {
    return basicInfoIconMap[value] ?? "";
}
function getUnitTagNames(tags?: string[]) {
    if (!Array.isArray(tags)) {
        return [];
    }
    return tags
        .map((tag) => unitTagNameMap[tag] ?? tag)
        .filter((tagName) => tagName.length > 0);
}
function getUnitFaceUnitStrId(unitStrId: string) {
    if (unitStrId.includes("REPLACER_C_KNIGHT")) {
        return "NKM_MONSTER_BOSS_BASIC_KNIGHT";
    }
    if (unitStrId.includes("REPLACER_CA_KING")) {
        return "NKM_MONSTER_BOSS_BASIC_KING_MOVE";
    }
    if (unitStrId.includes("REPLACER_C_BISHOP")) {
        return "NKM_MONSTER_BOSS_BASIC_BISHOP";
    }
    if (unitStrId.includes("REAPER_C_ARMS")) {
        return "NKM_UNIT_UNION_C_ARMS";
    }
    if (unitStrId.includes("OZ_M_PUPPET")) {
        return "NKM_NPC_PUPPET";
    }
    if (unitStrId.includes("ESPR_C_SNIPER")) {
        return "NKM_UNIT_ESPR_S_SNIPER";
    }
    return unitStrId;
}
function getUnitFaceImagePath(unitStrId: string | undefined) {
    if (!unitStrId) {
        return "";
    }
    const unitFaceUnitStrId = getUnitFaceUnitStrId(unitStrId);
    const fileName = `AB_UNIT_FACE_CARD_${unitFaceUnitStrId}.png`;
    const filePath = path.join(process.cwd(), "public", "unit", "unit_face", fileName);
    if (publicFileExists(filePath)) {
        return `/unit/unit_face/${fileName}`;
    }
    const usesCollaborationImageName = unitStrId.includes("DANMACHI") || unitStrId.includes("GEASS");
    if (usesCollaborationImageName && unitStrId.endsWith("_RA")) {
        const collaborationUnitStrId = unitStrId.slice(0, -3);
        const collaborationFileName = `AB_UNIT_FACE_CARD_${collaborationUnitStrId}.png`;
        const collaborationFilePath = path.join(process.cwd(), "public", "unit", "unit_face", collaborationFileName);
        if (publicFileExists(collaborationFilePath)) {
            return `/unit/unit_face/${collaborationFileName}`;
        }
    }
    return "";
}
function createPersonaLinks(currentUnit: MergedUnit, currentName: string, unitTextMap: Map<string, string>) {
    const normalizedName = currentName.trim();
    if (!normalizedName) {
        return [];
    }
    return (readMergedUnits() ?? [])
        .filter((unit) => {
        const unitName = unitTextMap.get(unit.nameKey)?.trim() ?? "";
        return unit.idx !== currentUnit.idx && unitName === normalizedName;
    })
        .sort((first, second) => first.idx - second.idx)
        .map((unit) => {
        const roleType = getMappedValue(roleTypeMap, unit.m_NKM_UNIT_ROLE_TYPE);
        return {
            id: unit.unitStrId ?? String(unit.idx),
            href: `/characters/${unit.unitStrId ?? unit.idx}`,
            name: unitTextMap.get(unit.nameKey) ?? unit.nameKey,
            title: unitTextMap.get(unit.titleKey) ?? "",
            grade: getMappedValue(gradeMap, unit.m_NKM_UNIT_GRADE),
            gradeColor: gradeColorMap[unit.m_NKM_UNIT_GRADE ?? ""] ??
                gradeColorMap.NUG_N,
            employeeId: formatEmployeeId(String(unit.idx)),
            imagePath: getUnitFaceImagePath(unit.unitStrId),
            roleType,
            roleIconPath: getBasicInfoIconPath(roleType),
        };
    });
}
function findMergedUnit(routeId: string) {
    const mergedUnits = readMergedUnits();
    const decodedRouteId = decodeURIComponent(routeId);
    if (!mergedUnits) {
        return null;
    }
    return (mergedUnits.find((unit) => unit.unitStrId === decodedRouteId ||
        String(unit.idx) === decodedRouteId ||
        String(unit.unitId) === decodedRouteId) ?? null);
}
function findCollectionEmployee(unitId?: number) {
    if (!unitId) {
        return null;
    }
    return (readCollectionEmployees()?.find((employee) => employee.UnitID === unitId) ??
        null);
}
function findUnitStat(unitStrId?: string) {
    if (!unitStrId) {
        return null;
    }
    return (readUnitStatRows()?.find((statRow) => statRow.m_UnitStrID === unitStrId) ??
        null);
}
function createProfileRowsFromPairs(pairs: string[][]) {
    const rows: string[][] = [];
    for (let index = 0; index < pairs.length; index += 2) {
        const firstPair = pairs[index] ?? ["", ""];
        const secondPair = pairs[index + 1] ?? ["", ""];
        rows.push([firstPair[0], firstPair[1], secondPair[0], secondPair[1]]);
    }
    return rows;
}
function createCollectionProfileRows({ employee, detail, textMaps, }: {
    employee: CollectionEmployee | null;
    detail: Pick<CharacterDetail, "name" | "teamup" | "grade" | "unitType" | "roleType" | "moveType" | "attackType" | "sourceType" | "title">;
    textMaps: Map<string, string>[];
}) {
    if (!employee) {
        return createProfileRowsFromPairs([
            ["이름", detail.name],
            ["등급", detail.grade],
            ["클래스", detail.roleType],
            ["기본 타입", detail.unitType],
            ["이동 타입", detail.moveType],
            ["공격 타입", detail.attackType],
            ["근원성", detail.sourceType],
            ["칭호", detail.title],
        ]);
    }
    // NKCUICollectionUnitProfile.SetData adds each slot only when its type key exists.
    // A blank localized value remains blank; it is not replaced by another profile.
    const fields = [
        [employee.NameType, employee.NameValue],
        [employee.GenderType, employee.GenderValueStrID],
        [employee.BirthType, employee.BirthValueStrID],
        [employee.HeightType, employee.HeightValueStrID],
        [employee.SpecialityType, employee.SpecialityValueStrID],
        [employee.LikeType, employee.LikeValueStrID],
        [employee.DisLikeType, employee.DisLikeValueStrID],
        [employee.CombatLevelType, employee.CombatLevelValue],
        [employee.CommandLevelType, employee.CommandLevelValue],
    ];
    return createProfileRowsFromPairs(fields.filter(([label]) => Boolean(label)).map(([label, value]) => [
        resolveTextValue(label, textMaps),
        resolveTextValue(value, textMaps),
    ]));
}
function createCollectionMeasureRows(employee: CollectionEmployee | null, crfRows: CollectionCrfRow[], textMaps: Map<string, string>[]) {
    if (!employee) {
        return defaultMeasureRows;
    }
    // LoadFromLUA reads consecutive subtype and amount lists independently.
    // A subtype without an amount still has a slot, with an empty zero gauge.
    const rows: Array<[
        string,
        number | undefined
    ]> = [];
    let amountsEnded = false;
    for (let index = 1;; index += 1) {
        const labelKey = employee[`CRFSubType_${index}`];
        if (labelKey === undefined)
            break;
        const amount = employee[`CRFSubAmount_${index}`];
        if (amount === undefined)
            amountsEnded = true;
        rows.push([labelKey, amountsEnded ? undefined : amount]);
    }
    return rows.map(([labelKey, value]) => {
        const descriptionKey = value === undefined ? "" : crfRows.find((crfRow) => {
            return (crfRow.CRFType === labelKey &&
                typeof crfRow.ProfileAmountMin === "number" &&
                typeof crfRow.ProfileAmountMax === "number" &&
                crfRow.ProfileAmountMin <= value &&
                value <= crfRow.ProfileAmountMax);
        })?.ProfileAmountDescStrID ?? "";
        return {
            label: resolveTextValue(labelKey, textMaps),
            value: resolveTextValue(descriptionKey, textMaps),
            percent: Math.min(Math.max(value ?? 0, 0), 100),
        };
    });
}
function getStatLabel(statKey: string, statTextMap: Map<string, string>) {
    const label = statTextMap.get(`SI_DP_STAT_SHORT_NAME_${statKey}`) ?? statKey;
    return label.replace(/\s{2,}/g, "");
}
function createStatRows(unitStat: UnitStatRow | null, statTextMap: Map<string, string>) {
    const baseStats = unitStat?.m_StatData?.m_Stat;
    const statsPerLevel = unitStat?.m_StatData?.m_StatPerLevel;
    return statDisplayKeys.map((statKey) => {
        const baseValue = baseStats?.[statKey];
        return {
            statKey,
            label: getStatLabel(statKey, statTextMap),
            baseValue: typeof baseValue === "number" ? baseValue : null,
            perLevelValue: statsPerLevel?.[statKey] ?? 0,
        };
    });
}
function getCharacterDetail(routeId: string, { includeDialogues = true, includeEquipment = true, includeSkills = true, includeSkins = true, includeTitles = true, }: {
    includeDialogues?: boolean;
    includeEquipment?: boolean;
    includeSkills?: boolean;
    includeSkins?: boolean;
    includeTitles?: boolean;
} = {}): CharacterDetail {
    const matchedUnit = findMergedUnit(routeId);
    const employeeIndex = matchedUnit ? String(matchedUnit.idx) : routeId;
    const unitTextMap = createTextMap(readLocalJson<TextTable>("002_LUA_SI_UNIT_KOREA_l.json"));
    const teamupTextMap = createTextMap(readLocalJson<TextTable>("013_LUA_SI_COLLECTION_TEAMUP_TEAM_NAME_KOREA_n.json"));
    const collectionTextMap = createTextMap(readLocalJson<TextTable>("040_LUA_SI_COLLECTION_V0_KOREA_b.json"));
    const introTextMap = createTextMap(readLocalJson<TextTable>("036_LUA_SI_COLLECTION_UNIT_INTRO_KOREA_t.json"));
    const worldmapTextMap = createTextMap(readLocalJson<TextTable>("000_LUA_SI_WORLDMAP_TEMPLET_KOREA_y.json"));
    const statTextMap = createTextMap(readLocalJson<TextTable>("043_LUA_SI_STAT_INFO_KOREA_g.json"));
    const crfRows = readCollectionCrfRows() ?? [];
    const textMaps = [unitTextMap, teamupTextMap, collectionTextMap, introTextMap, worldmapTextMap];
    if (!matchedUnit) {
        return {
            employeeIndex,
            employeeId: formatEmployeeId(employeeIndex),
            name: "사원 이름",
            title: "",
            imagePath: "",
            teamup: "",
            grade: "",
            gradeColor: "",
            isAwakened: false,
            unitType: "",
            roleType: "",
            respawnCost: "",
            respawnCountText: "",
            moveType: "",
            attackType: "",
            sourceType: "",
            unitTags: [],
            profileTitle: "기본 프로필",
            profileRows: [
                ["이름", "사원 이름", "", ""],
                ["성별", "", "생일", ""],
                ["신장", "", "특기", ""],
                ["좋아하는 것", "", "싫어하는 것", ""],
                ["전투 기술", "", "지휘 역량", ""],
            ],
            measureTitle: "측정 정보",
            measureRows: defaultMeasureRows,
            statRows: createStatRows(null, statTextMap),
            skills: [],
            skins: [],
            privateEquipment: [],
            personas: [],
            tacticalTitles: [],
            voiceActor: "",
            intro: "",
            dialogues: [],
        };
    }
    const employee = findCollectionEmployee(matchedUnit.unitId);
    const collection = readCollectionUnits()?.find((unit) => unit.m_UnitID === matchedUnit.unitId);
    const unitStat = findUnitStat(matchedUnit.unitStrId);
    const voiceActor = getVoiceActorName(matchedUnit.unitStrId);
    const profileName = employee
        ? resolveTextValue(employee.NameValue, textMaps)
        : "";
    const profileTeamup = employee
        ? resolveTextValue(employee.TeamUpStrID, textMaps)
        : "";
    const fallbackTeamup = matchedUnit.teamupKey
        ? (teamupTextMap.get(matchedUnit.teamupKey) ?? "")
        : "";
    const detailBase = {
        employeeIndex,
        employeeId: collection && !collection.m_bExclude
            ? `ID. ${String(collection.Idx).padStart(3, "0")}`
            : "",
        name: profileName || unitTextMap.get(matchedUnit.nameKey) || matchedUnit.nameKey,
        title: unitTextMap.get(matchedUnit.titleKey) ?? "",
        imagePath: getUnitFaceImagePath(matchedUnit.unitStrId),
        teamup: profileTeamup || fallbackTeamup,
        grade: getMappedValue(gradeMap, matchedUnit.m_NKM_UNIT_GRADE),
        gradeColor: gradeColorMap[matchedUnit.m_NKM_UNIT_GRADE ?? ""] ??
            gradeColorMap.NUG_N,
        isAwakened: matchedUnit.m_bAwaken === true,
        unitType: getMappedValue(unitTypeMap, matchedUnit.m_NKM_UNIT_STYLE_TYPE),
        roleType: getMappedValue(roleTypeMap, matchedUnit.m_NKM_UNIT_ROLE_TYPE),
        // NKCUICharInfoSummary.SetData: GetRespawnCost(false, null, null).
        respawnCost: typeof unitStat?.m_RespawnCost === "number"
            ? String(Math.min(10, Math.max(1, unitStat.m_RespawnCost)))
            : "-",
        // NKCUtilString.GetRespawnCountText: append xN to the summary name only for groups.
        respawnCountText: typeof unitStat?.m_RespawnCount === "number" && unitStat.m_RespawnCount > 1
            ? `x${unitStat.m_RespawnCount}`
            : "",
        moveType: getMoveType(matchedUnit.m_bAirUnit),
        attackType: getMappedValue(attackTypeMap, matchedUnit.m_NKM_FIND_TARGET_TYPE),
        sourceType: getMappedValue(sourceTypeMap, matchedUnit.m_NKM_UNIT_SOURCE_TYPE),
        unitTags: getUnitTagNames(matchedUnit.m_hsUnitTag),
    };
    return {
        ...detailBase,
        profileTitle: employee
            ? resolveTextValue(employee.CharacterType, textMaps) || "기본 프로필"
            : "기본 프로필",
        profileRows: createCollectionProfileRows({
            employee,
            detail: detailBase,
            textMaps,
        }),
        // This card follows the employee profile, independently of the teamup encyclopedia section.
        profileTeam: collection && !collection.m_bExclude && collection.m_NKM_UNIT_TYPE === "NUT_NORMAL" && employee?.TeamUpMarkStrID
            ? {
                name: resolveTextValue(employee.TeamUpStrID, textMaps),
                description: resolveTextValue(employee.TeamConceptStrID, textMaps),
                imagePath: `/game-assets/common/profile/teamup/${employee.TeamUpMarkStrID}.png`,
            }
            : undefined,
        measureTitle: employee
            ? resolveTextValue(employee.CRFType, textMaps) || "측정 정보"
            : "측정 정보",
        measureRows: createCollectionMeasureRows(employee, crfRows, textMaps),
        statRows: createStatRows(unitStat, statTextMap),
        skills: includeSkills
            ? createCharacterSkills(matchedUnit.unitStrId)
            : [],
        skins: includeSkins ? getCharacterSkinsForUnit(matchedUnit) : [],
        privateEquipment: includeEquipment
            ? getPrivateEquipmentForUnit(matchedUnit.unitId)
            : [],
        personas: createPersonaLinks(matchedUnit, detailBase.name, unitTextMap),
        tacticalTitles: includeTitles
            ? getTacticalCollectionTitlesForUnit(matchedUnit.unitId)
            : [],
        voiceActor,
        intro: employee
            ? resolveTextValue(employee.ProfileValue_1, textMaps).trim()
            : "",
        dialogues: includeDialogues
            ? createCharacterDialogues(matchedUnit.unitStrId)
            : [],
    };
}
function createBasicInfoRows(detail: CharacterDetail): BasicInfoCell[][] {
    return [
        [
            {
                label: "클래스",
                infoTab: "basic",
                value: detail.isAwakened
                    ? `각성 ${detail.roleType}`.trim()
                    : detail.roleType,
                iconPath: getBasicInfoIconPath(detail.roleType),
            },
            {
                label: "이동 타입",
                infoTab: "attack",
                value: detail.moveType,
            },
        ],
        [
            {
                label: "공격타입",
                infoTab: "attack",
                value: detail.attackType,
                isAttack: true,
            },
            {
                label: "특수 태그",
                infoTab: "tag",
                value: detail.unitTags.join(" "),
                values: detail.unitTags,
                iconPath: unitTagIconPath,
            },
        ],
        [
            {
                label: "근원성",
                infoTab: "attack",
                value: detail.sourceType,
            },
            {
                label: "사원 타입",
                value: detail.unitType,
                infoTab: "basic",
            },
        ],
    ];
}
function formatEmployeeId(employeeIndex: string) {
    const numericEmployeeIndex = Number(employeeIndex);
    if (!Number.isInteger(numericEmployeeIndex) ||
        numericEmployeeIndex < 1 ||
        numericEmployeeIndex >= 1000) {
        return "";
    }
    return `ID. ${String(numericEmployeeIndex).padStart(3, "0")}`;
}
export async function generateMetadata({ params, }: CharacterDetailPageProps): Promise<Metadata> {
    const { id } = await params;
    const detail = getCharacterDetail(id, {
        includeDialogues: false,
        includeEquipment: false,
        includeSkills: false,
        includeSkins: false,
        includeTitles: false,
    });
    return {
        title: `${detail.name || detail.employeeId || "사원 상세"} | 카운터사이드 웹뷰어`,
        description: "카운터사이드 사원 상세 정보를 정리하는 페이지입니다.",
    };
}
function LeftUnitPanel({ detail }: {
    detail: CharacterDetail;
}) {
    const tags = createBasicInfoRows(detail).flatMap((row) => row.map((cell) => ({
        ...cell,
        iconPath: cell.iconPath ?? getBasicInfoIconPath(cell.value),
    })));
    return (<CollectionProfileSummary kind="character" name={detail.name} title={detail.title} grade={detail.grade} gradeColor={detail.gradeColor} imagePath={detail.imagePath} voiceActor={detail.voiceActor} unitType={detail.unitType} cost={detail.respawnCost || "-"} respawnCountText={detail.respawnCountText} tags={tags}>
      <CharacterAwakenCircuit grade={detail.grade} isAwakened={detail.isAwakened}/>
    </CollectionProfileSummary>);
}
function SkillList({ skills }: {
    skills: CharacterSkill[];
}) {
    if (skills.length === 0) {
        return (<div className="mt-5 border border-[#343844] bg-[#171a21] px-4 py-8 text-center text-sm font-semibold text-[#9ca3af]">
        스킬 데이터가 없습니다.
      </div>);
    }
    return (<div className="mt-5 grid gap-4">
      {skills.map((skill) => (<SkillCard key={skill.id} icon={<CharacterSkillMotionButton actionId={skill.spineActionId} skillName={skill.name}>
              {skill.iconPath ? (<Image src={skill.iconPath} alt={`${skill.name} 아이콘`} width={88} height={88} className="h-full w-full object-contain"/>) : (<span className="text-xs font-bold text-[#565c6b]">NO IMAGE</span>)}
            </CharacterSkillMotionButton>}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="border border-[#4b5160] bg-[#222631] px-2 py-1 text-xs font-black text-[#cfd4dc]">
                {skill.type}
              </span>
              {skill.maxLevel !== 5 ? (<span className="text-xs font-bold text-[#9ca3af]">
                  최대 Lv. {skill.maxLevel}
                </span>) : null}
              {skill.cooldown ? (<span className="flex items-center border-l border-[#4b5160] pl-2 text-sm font-bold text-[#b9bec8]">
                  <Image src={skillTimeIconPath} alt="" width={18} height={18} className="mr-1 h-[18px] w-[18px] object-contain"/>
                  {skill.cooldown}
                </span>) : null}
            </div>

            <h3 className="mt-3 text-xl font-black text-[#e5e7eb]">
              {skill.name}
            </h3>
            <p className="mt-2 whitespace-pre-line text-sm leading-7 text-[#c4c8d0]">
              <SkillDescription id={`${skill.id}-base`} text={skill.baseDescription}/>
            </p>

            {skill.upgrades.length > 0 ? (<div className="mt-4 border-t border-[#343844] pt-2">
                {skill.upgrades.map((upgrade) => (<div key={`${skill.id}-${upgrade.level}`} className="grid grid-cols-[58px_minmax(0,1fr)] gap-3 border-b border-[#2b2f39] py-2.5 last:border-b-0">
                    <span className="text-sm font-black text-[#bf9000]">
                      Lv. {upgrade.level}
                    </span>
                    <div className="min-w-0">
                      <span className="block whitespace-pre-line text-sm leading-6 text-[#b9bec8]">
                        <SkillDescription id={`${skill.id}-level-${upgrade.level}`} text={upgrade.description}/>
                      </span>
                      {upgrade.cooldown ? (<div className="mt-1 flex items-center text-sm font-bold text-[#cfd4dc]">
                          <span>(쿨타임</span>
                          <Image src={skillTimeIconPath} alt="" width={18} height={18} className="ml-1 mr-1 h-[18px] w-[18px] object-contain"/>
                          <span>{upgrade.cooldown}로 감소)</span>
                        </div>) : null}
                    </div>
                  </div>))}
              </div>) : null}
        </SkillCard>))}
    </div>);
}
function SkinList({ skins }: {
    skins: CharacterSkin[];
}) {
    if (skins.length === 0) {
        return (<div className="mt-5 border border-[#343844] bg-[#171a21] px-4 py-8 text-center text-sm font-semibold text-[#9ca3af]">
        등록된 스킨이 없습니다.
      </div>);
    }
    return (<div className="mt-5 grid gap-4">
      {skins.map((skin) => (<CharacterSkinCard key={skin.id} skin={skin}/>))}
    </div>);
}
function PersonaList({ personas }: {
    personas: PersonaLink[];
}) {
    if (personas.length === 0) {
        return (<div className="mt-5 border border-[#343844] bg-[#171a21] px-4 py-8 text-center text-sm font-semibold text-[#9ca3af]">
        같은 이름의 다른 사원이 없습니다.
      </div>);
    }
    return (<div className="mt-5 grid gap-3 md:grid-cols-2">
      {personas.map((persona) => (<Link key={persona.id} href={persona.href} className="group grid grid-cols-[120px_minmax(0,1fr)] overflow-hidden border border-[#343844] bg-[#171a21] transition hover:border-white hover:bg-[#1d2029] sm:grid-cols-[150px_minmax(0,1fr)]">
          <div className="flex items-center justify-center border-r border-[#343844] bg-[#111318] p-2">
            <div className="w-[104px] sm:w-[132px]">
              <div className="relative aspect-[256/354] w-full overflow-hidden bg-[#0b0d12]">
                {persona.imagePath ? (<Image src={persona.imagePath} alt={`${persona.name} 이미지`} fill sizes="(min-width: 640px) 132px, 104px" className="object-fill"/>) : (<div className="flex h-full items-center justify-center text-[10px] font-bold text-[#565c6b]">
                    NO IMAGE
                  </div>)}
              </div>
              <div className="h-1.5 w-full" style={{ backgroundColor: persona.gradeColor }}>
                <span className="sr-only">{persona.grade} 등급</span>
              </div>
            </div>
          </div>

          <div className="min-w-0 p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              {persona.grade ? (<RarityIcon grade={persona.grade} size="sm"/>) : null}
              {persona.roleIconPath ? (<span title={persona.roleType} aria-label={persona.roleType} className="flex h-7 w-7 items-center justify-center">
                  <Image src={persona.roleIconPath} alt="" width={26} height={26} className="h-[26px] w-[26px] object-contain"/>
                </span>) : null}
              {persona.employeeId ? (<span className="text-[#9ca3af]">{persona.employeeId}</span>) : null}
            </div>
            {persona.title ? (<p className="mt-3 text-sm font-bold text-[#9ca3af]">
                {persona.title}
              </p>) : null}
            <h3 className="mt-1 text-lg font-black text-[#e5e7eb] transition group-hover:text-white">
              {persona.name}
            </h3>
          </div>
        </Link>))}
    </div>);
}
function PrivateEquipmentList({ equipment, }: {
    equipment: EquipmentListItem[];
}) {
    return (<div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {equipment.map((item) => (<Link key={item.id} href={item.href} className="group grid min-h-28 grid-cols-[112px_minmax(0,1fr)] overflow-hidden border border-[#343844] bg-[#171a21] transition hover:border-white hover:bg-[#1d2029] focus:outline-none focus:ring-2 focus:ring-[#9ca3af]">
          <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-[#0f1117]">
            {item.backgroundImagePath ? (<Image src={item.backgroundImagePath} alt="" fill sizes="112px" className="object-cover"/>) : null}
            {item.imagePath ? (<Image src={item.imagePath} alt={`${item.name} 이미지`} fill sizes="112px" className="z-10 object-contain p-2"/>) : (<span className="relative z-10 text-[10px] font-bold text-[#565c6b]">
                NO IMAGE
              </span>)}
          </div>

          <div className="min-w-0 p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs font-black text-[#d1d5db]">
              <span>T{item.tier}</span>
              <RarityIcon grade={item.grade} size="sm"/>
              <span className="text-[#9ca3af]">{item.position}</span>
            </div>
            <h3 className="mt-3 line-clamp-2 text-base font-black leading-6 text-white">
              {item.name}
            </h3>
          </div>
        </Link>))}
    </div>);
}
function createTitleOutlineShadow(color: string) {
    return [
        `-1px -1px 0 ${color}`,
        `0 -1px 0 ${color}`,
        `1px -1px 0 ${color}`,
        `-1px 0 0 ${color}`,
        `1px 0 0 ${color}`,
        `-1px 1px 0 ${color}`,
        `0 1px 0 ${color}`,
        `1px 1px 0 ${color}`,
    ].join(", ");
}
function TacticalTitleList({ titles, }: {
    titles: CollectionTacticalTitleItem[];
}) {
    return (<div className="mt-5 grid gap-4 lg:grid-cols-2">
      {titles.map((title) => (<article key={title.id} className="min-w-0 border border-[#343844] bg-[#171a21] p-4">
          <div className="flex justify-center border border-[#2b303a] bg-[#0b0d12] p-3">
            <div className="relative aspect-[4/1] w-full max-w-[256px] overflow-hidden">
              {title.imagePath ? (<Image src={title.imagePath} alt="" fill sizes="256px" className="object-fill"/>) : null}
              {!title.isImageTitle ? (<span className="absolute inset-0 flex items-center justify-center px-3 text-center text-sm font-black" style={{
                    color: title.textColor,
                    textShadow: createTitleOutlineShadow(title.outlineColor),
                }}>
                  {title.name}
                </span>) : null}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className="border border-[#4b5563] bg-[#111318] px-2 py-1 text-[#c7cbd1]">
              전술 업데이트 {title.tacticalLevel}단계
            </span>
            {title.hasEffect ? (<span className="border border-[#4b5563] bg-[#111318] px-2 py-1 text-[#c7cbd1]">
                효과
              </span>) : null}
          </div>

          <h3 className="mt-3 text-lg font-black text-white">{title.name}</h3>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#9ca3af]">
            {title.description}
          </p>
        </article>))}
    </div>);
}
export default async function CharacterDetailPage({ params, }: CharacterDetailPageProps) {
    const { id } = await params;
    const detail = getCharacterDetail(id);
    const mergedUnit = findMergedUnit(id);
    const profileIcon = mergedUnit ? getCharacterProfileIcon(mergedUnit.unitId) : null;
    const teamup = mergedUnit ? getCharacterTeamup(mergedUnit.unitId) : null;
    const reactor = mergedUnit ? getCharacterReactor(mergedUnit.unitId) : null;
    const spineUnitStrId = mergedUnit?.unitStrId ?? id;
    const spineModels = getCharacterSpineModels(spineUnitStrId);
    const battleVoices = getCharacterBattleVoices(spineUnitStrId);
    const unusedVoices = getCharacterUnusedVoices(spineUnitStrId);
    const availableDetailSections = detailSections.filter((section) => {
        if (section.id === "reactor") {
            return reactor !== null;
        }
        if (section.id === "teamup") {
            return teamup !== null;
        }
        if (section.id === "skins") {
            return detail.skins.length > 0;
        }
        if (section.id === "persona") {
            return detail.personas.length > 0;
        }
        if (section.id === "titles") {
            return detail.tacticalTitles.length > 0;
        }
        if (section.id === "dialogues") {
            return detail.dialogues.length > 0 || battleVoices.length > 0 || unusedVoices.length > 0;
        }
        return true;
    });
    const visibleDetailSections = availableDetailSections.flatMap((section) => {
        if (section.id === "spine" && detail.privateEquipment.length > 0) {
            return [section, { id: "equipment", title: "전용 장비" }];
        }
        return [section];
    });
    return (<div id="profile" className="flex min-h-screen flex-col bg-[#0b0d12] text-[#e5e7eb]">
      <SiteHeader />
      <FloatingSectionNav sections={[
            { id: "profile", title: "프로필", number: null },
            ...visibleDetailSections.map((section, index) => ({ ...section, number: index + 1 })),
        ]} contentWidth="wide"/>

      <main className="flex-1">
        <article className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <Link href="/characters" className="inline-flex items-center text-sm font-semibold text-white transition hover:text-[#d1d5db]">
            ← 사원 목록
          </Link>

          <header className="mt-5 border-b border-[#343844] pb-5">
            <h1 className="text-3xl font-bold text-[#cfd4dc] sm:text-4xl">
              {detail.name || "사원 상세"}
            </h1>
          </header>

          <section aria-label="프로필" className="mt-8 flex flex-wrap justify-center">
            <CharacterTypeInfo catalog={getCharacterTypeInfoCatalog()} selectedIds={getCharacterTypeInfoSelectedIds(mergedUnit ?? {})} detailTags={getCharacterTypeInfoUnitTags(mergedUnit ?? {})}>
              <CollectionProfilePanel summary={<LeftUnitPanel detail={detail}/>}>
                <CollectionProfileDocument fullHeight employeeId={detail.employeeId} profileTitle={detail.profileTitle} profileRows={detail.profileRows} measureTitle={detail.measureTitle} measureRows={detail.measureRows} team={detail.profileTeam}/>
              </CollectionProfilePanel>
            </CharacterTypeInfo>
          </section>

          <CharacterSkillPlaybackProvider key={spineUnitStrId}>
          <div className="mt-8 space-y-10">
            {visibleDetailSections.map((section, index) => {
            if (section.id === "teamup" && teamup && mergedUnit) {
                return (<CharacterTeamup key={section.id} teamup={teamup} currentUnitId={mergedUnit.unitId} sectionNumber={index + 1}/>);
            }
            if (section.id === "stats") {
                return (<DetailSection key={section.id} id={section.id} title={section.title} number={index + 1}>
                    <div className="mt-5 rounded-md border border-[#343844] bg-[#171a21] p-5">
                      <CharacterStatsPanel stats={detail.statRows}/>
                    </div>
                  </DetailSection>);
            }
            if (section.id === "skills") {
                return (<DetailSection key={section.id} id={section.id} title={section.title} number={index + 1}>
                    <SkillList skills={detail.skills}/>
                  </DetailSection>);
            }
            if (section.id === "reactor" && reactor) {
                return (<DetailSection key={section.id} id={section.id} title={section.title} number={index + 1}>
                    <CharacterReactorPanel reactor={reactor}/>
                  </DetailSection>);
            }
            if (section.id === "spine") {
                return (<DetailSection key={section.id} id={section.id} title={section.title} number={index + 1}>
                    <CharacterSpineViewer key={spineUnitStrId} unitId={findMergedUnit(id)?.unitId} unitStrId={spineUnitStrId} models={spineModels}/>
                  </DetailSection>);
            }
            if (section.id === "equipment") {
                return (<DetailSection key={section.id} id={section.id} title={section.title} number={index + 1}>
                    <PrivateEquipmentList equipment={detail.privateEquipment}/>
                  </DetailSection>);
            }
            if (section.id === "skins") {
                return (<DetailSection key={section.id} id={section.id} title={section.title} number={index + 1}>
                    <SkinList skins={detail.skins}/>
                  </DetailSection>);
            }
            if (section.id === "dialogues") {
                return (<DetailSection key={section.id} id={section.id} title={section.title} number={index + 1}>
                    {detail.dialogues.length > 0 ? (<DialoguePanel dialogues={detail.dialogues.filter((dialogue) => !dialogue.isLifetime)} extraDialogues={detail.dialogues.filter((dialogue) => dialogue.isLifetime)} extraTitle="종신계약 대사" extraBadge="종신계약"/>) : null}
                    {battleVoices.length > 0 ? (<div id="battle-dialogues" className="mt-5 scroll-mt-44 sm:scroll-mt-24">
                        <BattleVoiceList groups={battleVoices}/>
                      </div>) : null}
                    {unusedVoices.length > 0 ? (<div id="unused-dialogues" className="mt-5 scroll-mt-44 sm:scroll-mt-24">
                        <UnusedVoiceList groups={unusedVoices}/>
                      </div>) : null}
                  </DetailSection>);
            }
            if (section.id === "titles") {
                return (<DetailSection key={section.id} id={section.id} title={section.title} number={index + 1}>
                    <TacticalTitleList titles={detail.tacticalTitles}/>
                  </DetailSection>);
            }
            if (section.id === "persona") {
                return (<DetailSection key={section.id} id={section.id} title={section.title} number={index + 1}>
                    <PersonaList personas={detail.personas}/>
                  </DetailSection>);
            }
            return (<DetailSection key={section.id} id={section.id} title={section.title} number={index + 1}>
                  <ProfileIntroduction text={detail.intro}>
                    {profileIcon ? (<div className="w-fit rounded-md border border-[#343844] bg-[#171a21] p-3">
                        <CharacterProfileIcon icon={profileIcon} name={detail.name} grade={detail.grade}/>
                      </div>) : null}
                  </ProfileIntroduction>
                </DetailSection>);
        })}
          </div>
          </CharacterSkillPlaybackProvider>
        </article>
      </main>

      <SiteFooter />
    </div>);
}
