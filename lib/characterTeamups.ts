import { publicFileExists } from "@/lib/publicAssets";
import { deploymentData } from "@/lib/deployment";
import fs from "node:fs";
import path from "node:path";
type CollectionTeamupRow = {
    Idx: number;
    m_TeamID: number;
    m_TeamName: string;
    m_UnitID: number;
    m_UnitStrID: string;
};
type Unit = {
    unitId: number;
    unitStrId: string;
    nameKey: string;
    titleKey: string;
    m_NKM_UNIT_GRADE: string;
    m_bAwaken?: boolean;
};
export type CharacterTeamupMember = {
    unitId: number;
    unitStrId: string;
    href: string;
    name: string;
    title: string;
    imagePath: string | null;
    grade: string;
    isAwakened: boolean;
};
export type CharacterTeamup = {
    id: string;
    title: string;
    members: CharacterTeamupMember[];
};
const gradeNames: Record<string, string> = {
    NUG_N: "N",
    NUG_R: "R",
    NUG_SR: "SR",
    NUG_SSR: "SSR",
};
let cachedTeamupsByUnit: Map<number, CharacterTeamup> | null = null;
function readJson<T>(relativePath: string): T {
    return deploymentData(JSON.parse(fs.readFileSync(path.join(process.cwd(), relativePath), "utf8"))) as T;
}
function getFaceImagePath(unitStrId: string): string | null {
    // These are the same face-card asset aliases used by character detail pages.
    const aliases: Array<[
        string,
        string
    ]> = [
        ["REPLACER_C_KNIGHT", "NKM_MONSTER_BOSS_BASIC_KNIGHT"],
        ["REPLACER_CA_KING", "NKM_MONSTER_BOSS_BASIC_KING_MOVE"],
        ["REPLACER_C_BISHOP", "NKM_MONSTER_BOSS_BASIC_BISHOP"],
        ["REAPER_C_ARMS", "NKM_UNIT_UNION_C_ARMS"],
        ["OZ_M_PUPPET", "NKM_NPC_PUPPET"],
        ["ESPR_C_SNIPER", "NKM_UNIT_ESPR_S_SNIPER"],
    ];
    const assetId = aliases.find(([unitName]) => unitStrId.includes(unitName))?.[1] ?? unitStrId;
    const candidates = [assetId];
    if ((unitStrId.includes("DANMACHI") || unitStrId.includes("GEASS")) && unitStrId.endsWith("_RA")) {
        candidates.push(unitStrId.slice(0, -3));
    }
    for (const candidate of candidates) {
        const imagePath = `/unit/unit_face/AB_UNIT_FACE_CARD_${candidate}.png`;
        if (publicFileExists(path.join(process.cwd(), "public", imagePath)))
            return imagePath;
    }
    return null;
}
function buildTeamupsByUnit() {
    const rows = readJson<{
        data: CollectionTeamupRow[];
    }>("json/character/087_LUA_COLLECTION_TEAMUP_TEMPLET_y.json").data;
    const units = new Map(readJson<Unit[]>("json/character/merged_units.json").map((unit) => [unit.unitId, unit]));
    const stringTables = [
        "json/KR/character/013_LUA_SI_COLLECTION_TEAMUP_TEAM_NAME_KOREA_n.json",
        "json/KR/002_LUA_SI_UNIT_KOREA_l.json",
        "json/KR/character/040_LUA_SI_COLLECTION_V0_KOREA_b.json",
    ].map((filename) => new Map(readJson<{
        data: [
            string,
            string
        ][];
    }>(filename).data));
    function text(key: string): string {
        for (const strings of stringTables) {
            const value = strings.get(key);
            if (value !== undefined)
                return value;
        }
        throw new Error(`Missing teamup collection string: ${key}`);
    }
    const groups = new Map<number, CharacterTeamup>();
    const result = new Map<number, CharacterTeamup>();
    // Only the collection's explicit rows define membership and ordering.
    // Profile affiliations, rearm relationships, and merged team fields are not used.
    for (const row of [...rows].sort((first, second) => first.Idx - second.Idx)) {
        const unit = units.get(row.m_UnitID);
        if (!unit || unit.unitStrId !== row.m_UnitStrID) {
            throw new Error(`Missing character detail for teamup collection unit: ${row.m_UnitID}`);
        }
        if (result.has(row.m_UnitID)) {
            throw new Error(`Duplicate teamup collection unit: ${row.m_UnitID}`);
        }
        const title = text(row.m_TeamName);
        let teamup = groups.get(row.m_TeamID);
        if (!teamup) {
            teamup = { id: String(row.m_TeamID), title, members: [] };
            groups.set(row.m_TeamID, teamup);
        }
        else if (teamup.title !== title) {
            throw new Error(`Conflicting teamup collection names: ${row.m_TeamID}`);
        }
        const grade = gradeNames[unit.m_NKM_UNIT_GRADE];
        if (!grade)
            throw new Error(`Unknown teamup member grade: ${unit.m_NKM_UNIT_GRADE}`);
        teamup.members.push({
            unitId: row.m_UnitID,
            unitStrId: row.m_UnitStrID,
            href: `/characters/${row.m_UnitStrID}`,
            name: text(unit.nameKey),
            title: unit.titleKey ? text(unit.titleKey) : "",
            imagePath: getFaceImagePath(row.m_UnitStrID),
            grade,
            isAwakened: unit.m_bAwaken === true,
        });
        result.set(row.m_UnitID, teamup);
    }
    return result;
}
export function getCharacterTeamup(unitId: number): CharacterTeamup | null {
    cachedTeamupsByUnit ??= buildTeamupsByUnit();
    return cachedTeamupsByUnit.get(unitId) ?? null;
}
