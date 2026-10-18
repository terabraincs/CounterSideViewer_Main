import { deploymentData } from "@/lib/deployment";
import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import CharacterSearchList from "@/components/CharacterSearchList";
import type { CharacterCard } from "@/components/CharacterSearchList";
import CatalogPage from "@/components/CatalogPage";
export const metadata: Metadata = {
    title: "사원 | 카운터사이드 웹뷰어",
    description: "카운터사이드 사원 목록을 확인하는 페이지입니다.",
};
type MergedUnit = {
    idx: number;
    unitId: number;
    unitStrId: string;
    nameKey: string;
    titleKey: string;
    m_NKM_UNIT_GRADE?: string;
    m_bAwaken?: boolean;
    m_RearmGrade?: number;
    m_NKM_UNIT_STYLE_TYPE?: string;
    m_NKM_UNIT_ROLE_TYPE?: string;
    m_bAirUnit?: boolean;
    m_NKM_FIND_TARGET_TYPE?: string;
    m_RespawnCost?: number;
    m_NKM_UNIT_SOURCE_TYPE?: string;
    teamupKey: string | null;
};
type TextTable = {
    data: unknown[];
};
const unitGradeMap: Record<string, {
    label: string;
    color: string;
}> = {
    NUG_N: {
        label: "N",
        color: "var(--grade-n)",
    },
    NUG_R: {
        label: "R",
        color: "var(--grade-r)",
    },
    NUG_SR: {
        label: "SR",
        color: "var(--grade-sr)",
    },
    NUG_SSR: {
        label: "SSR",
        color: "var(--grade-ssr)",
    },
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
    NFTT_NEAR_ENEMY: "모두",
    NFTT_FAR_ENEMY: "모두",
    NFTT_ENEMY_BOSS: "모두",
    NFTT_NEAR_ENEMY_AIR_FIRST: "모두",
    NFTT_NEAR_ENEMY_LAND: "지상",
    NFTT_FAR_ENEMY_LAND: "지상",
    NFTT_ENEMY_BOSS_LAND: "지상",
    NFTT_NEAR_ENEMY_AIR: "공중",
};
const sourceTypeMap: Record<string, string> = {
    NUST_CONFLICT: "투쟁",
    NUST_LIBERAL: "변화",
    NUST_STABLE: "안정",
};
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
function createTextMap(table: TextTable) {
    const textMap = new Map<string, string>();
    for (const row of table.data) {
        if (Array.isArray(row) &&
            typeof row[0] === "string" &&
            typeof row[1] === "string") {
            textMap.set(row[0], row[1]);
        }
    }
    return textMap;
}
function hasGradeData(units: MergedUnit[]) {
    return units.some((unit) => typeof unit.m_NKM_UNIT_GRADE === "string");
}
function readMergedUnits() {
    const mainUnits = readLocalJson<MergedUnit[]>("merged_units.json");
    const copiedUnits = readLocalJson<MergedUnit[]>("merged_units copy.json");
    if (mainUnits && hasGradeData(mainUnits)) {
        return mainUnits;
    }
    if (copiedUnits && hasGradeData(copiedUnits)) {
        return copiedUnits;
    }
    return mainUnits ?? copiedUnits;
}
function getUnitGradeInfo(gradeKey?: string) {
    return unitGradeMap[gradeKey ?? ""] ?? unitGradeMap.NUG_N;
}
function getMappedValue(map: Record<string, string>, code?: string) {
    if (!code) {
        return "";
    }
    return map[code] ?? "";
}
function getMoveType(isAirUnit?: boolean) {
    if (typeof isAirUnit !== "boolean") {
        return "";
    }
    return isAirUnit ? "공중" : "지상";
}
function getGrowthType(unit: MergedUnit) {
    if (unit.m_bAwaken === true) {
        return "각성";
    }
    if (typeof unit.m_RearmGrade === "number" && unit.m_RearmGrade > 0) {
        return "재무장";
    }
    return "일반";
}
function createPlaceholderCharacters() {
    return Array.from({ length: 60 }, (_, index): CharacterCard => {
        const number = String(index + 1).padStart(3, "0");
        const gradeInfo = getUnitGradeInfo("NUG_N");
        return {
            id: number,
            href: `/characters/${number}`,
            name: number,
            title: "데이터 미연결",
            teamup: "자리표시자",
            grade: gradeInfo.label,
            gradeColor: gradeInfo.color,
            isPlaceholder: true,
        };
    });
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
function getUnitFaceImagePath(unitStrId: string) {
    const unitFaceUnitStrId = getUnitFaceUnitStrId(unitStrId);
    const fileName = `AB_UNIT_FACE_CARD_${unitFaceUnitStrId}.png`;
    const filePath = path.join(process.cwd(), "public", "unit", "unit_face", fileName);
    if (fs.existsSync(filePath)) {
        return `/unit/unit_face/${fileName}`;
    }
    const usesCollaborationImageName = unitStrId.includes("DANMACHI") || unitStrId.includes("GEASS");
    if (usesCollaborationImageName && unitStrId.endsWith("_RA")) {
        const collaborationUnitStrId = unitStrId.slice(0, -3);
        const collaborationFileName = `AB_UNIT_FACE_CARD_${collaborationUnitStrId}.png`;
        const collaborationFilePath = path.join(process.cwd(), "public", "unit", "unit_face", collaborationFileName);
        if (fs.existsSync(collaborationFilePath)) {
            return `/unit/unit_face/${collaborationFileName}`;
        }
    }
    return "";
}
function loadLocalCharacters() {
    const mergedUnits = readMergedUnits();
    const unitKoreaText = readLocalJson<TextTable>("002_LUA_SI_UNIT_KOREA_l.json");
    const teamupKoreaText = readLocalJson<TextTable>("013_LUA_SI_COLLECTION_TEAMUP_TEAM_NAME_KOREA_n.json");
    if (!mergedUnits || !unitKoreaText || !teamupKoreaText) {
        return null;
    }
    const unitTextMap = createTextMap(unitKoreaText);
    const teamupTextMap = createTextMap(teamupKoreaText);
    return mergedUnits.map((unit): CharacterCard => {
        const gradeInfo = getUnitGradeInfo(unit.m_NKM_UNIT_GRADE);
        return {
            id: unit.unitStrId,
            href: `/characters/${encodeURIComponent(unit.unitStrId)}`,
            name: unitTextMap.get(unit.nameKey) ?? unit.nameKey,
            title: unitTextMap.get(unit.titleKey) ?? "칭호 정보 없음",
            teamup: unit.teamupKey ? (teamupTextMap.get(unit.teamupKey) ?? "") : "",
            grade: gradeInfo.label,
            gradeColor: gradeInfo.color,
            imagePath: getUnitFaceImagePath(unit.unitStrId),
            unitId: unit.unitId,
            displayIndex: unit.idx,
            unitType: getMappedValue(unitTypeMap, unit.m_NKM_UNIT_STYLE_TYPE),
            growthType: getGrowthType(unit),
            roleType: getMappedValue(roleTypeMap, unit.m_NKM_UNIT_ROLE_TYPE),
            moveType: getMoveType(unit.m_bAirUnit),
            attackType: getMappedValue(attackTypeMap, unit.m_NKM_FIND_TARGET_TYPE),
            sourceType: getMappedValue(sourceTypeMap, unit.m_NKM_UNIT_SOURCE_TYPE),
            cost: typeof unit.m_RespawnCost === "number" ? unit.m_RespawnCost : undefined,
        };
    });
}
export default function CharactersPage() {
    const localCharacters = loadLocalCharacters();
    const characters = localCharacters ?? createPlaceholderCharacters();
    return (<CatalogPage title="사원 목록">
      <CharacterSearchList characters={characters}/>
    </CatalogPage>);
}
