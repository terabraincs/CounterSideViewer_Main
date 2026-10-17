import fs from "node:fs";
import path from "node:path";
type JsonTable<T> = {
    data?: T[];
};
type TextTable = JsonTable<[
    string,
    string
]> & {
    m_dicString?: Record<string, string>;
};
type CollectionUnit = {
    Idx: number;
    m_UnitID: number;
    m_UnitStrID: string;
    m_NKM_UNIT_TYPE: string;
    m_bExclude?: boolean;
};
type CollectionEmployee = {
    UnitID: number;
    CharacterType?: string;
    NameType?: string;
    NameValue?: string;
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
    OPR_Profile_01?: string;
    OPR_Profile_02?: string;
    OPR_Profile_03?: string;
    ProfileValue_1?: string;
};
type VoiceActor = {
    VOICE_ACTOR_NAME_StrID: string;
    Actor_Name_VKOR?: string;
};
type VoiceActorText = {
    StringKey: string;
    StringValue_KOR?: string;
};
export type OperatorProfile = {
    /** The collection index, hidden for client-excluded collaboration operators. */
    collectionId: string;
    profileTitle: string;
    /** Two label/value pairs per row, in the original client slot order. */
    profileRows: string[][];
    intro: string;
    voiceActor: string;
};
function readJson<T>(relativePath: string): T {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), "json", relativePath), "utf8")) as T;
}
function loadTextMap() {
    const texts = new Map<string, string>();
    for (const fileName of [
        "KR/operator/096_LUA_SI_UNIT_OPR_KOREA_h.json",
        "KR/character/040_LUA_SI_COLLECTION_V0_KOREA_b.json",
        "KR/character/036_LUA_SI_COLLECTION_UNIT_INTRO_KOREA_t.json",
    ]) {
        const table = readJson<TextTable>(fileName);
        for (const [key, value] of table.data ?? [])
            texts.set(key, value);
        for (const [key, value] of Object.entries(table.m_dicString ?? {})) {
            texts.set(key, value);
        }
    }
    return texts;
}
function resolveText(value: string | undefined, texts: Map<string, string>) {
    if (!value || value === "SI_BLANK")
        return "";
    const resolvePart = (part: string) => {
        if (part === "SI_BLANK")
            return "";
        const text = texts.get(part);
        if (text !== undefined)
            return text;
        if (part.startsWith("SI_")) {
            throw new Error(`Missing original operator profile string: ${part}`);
        }
        return part;
    };
    const [key, ...parameters] = value.split("@@");
    const template = resolvePart(key);
    if (!parameters.length)
        return template;
    const values = parameters.map(resolvePart);
    return template.replace(/\{(\d+)\}/g, (_, index: string) => values[Number(index)] ?? "");
}
let profiles: Map<string, OperatorProfile> | undefined;
function loadProfiles() {
    const collection = readJson<JsonTable<CollectionUnit>>("character/024_LUA_COLLECTION_UNIT_TEMPLET_a.json").data ?? [];
    const employees = new Map((readJson<JsonTable<CollectionEmployee>>("character/123_LUA_COLLECTION_V0_EMPLOYEE_b.json").data ?? []).map((row) => [row.UnitID, row]));
    const actors = new Map((readJson<JsonTable<VoiceActor>>("character/196_LUA_VOICE_ACTOR_NAME_TEMPLET_V6_w.json").data ?? []).map((row) => [row.VOICE_ACTOR_NAME_StrID, row.Actor_Name_VKOR]));
    const actorTexts = new Map((readJson<JsonTable<VoiceActorText>>("KR/character/100_LUA_STRING_VOICE_ACTOR_NAME_KOR_w.json").data ?? []).map((row) => [row.StringKey, row.StringValue_KOR ?? ""]));
    const texts = loadTextMap();
    const result = new Map<string, OperatorProfile>();
    for (const unit of collection) {
        if (unit.m_NKM_UNIT_TYPE !== "NUT_OPERATOR")
            continue;
        const employee = employees.get(unit.m_UnitID);
        if (!employee)
            continue;
        // NKCUICollectionUnitProfile.SetData: operators omit CombatLevel,
        // CommandLevel and the entire CRF root, then append these three OPR slots.
        const fields = [
            [employee.NameType, employee.NameValue],
            [employee.GenderType, employee.GenderValueStrID],
            [employee.BirthType, employee.BirthValueStrID],
            [employee.HeightType, employee.HeightValueStrID],
            [employee.SpecialityType, employee.SpecialityValueStrID],
            [employee.LikeType, employee.LikeValueStrID],
            [employee.DisLikeType, employee.DisLikeValueStrID],
            ...(employee.OPR_Profile_01 ? [["SI_COLLECTION_OPR_PROFILE_TYPE_01", employee.OPR_Profile_01]] : []),
            ...(employee.OPR_Profile_02 ? [["SI_COLLECTION_OPR_PROFILE_TYPE_02", employee.OPR_Profile_02]] : []),
            ...(employee.OPR_Profile_03 ? [["SI_COLLECTION_OPR_PROFILE_TYPE_03", employee.OPR_Profile_03]] : []),
        ].filter(([label]) => Boolean(label));
        const pairs = fields.map(([label, value]) => [resolveText(label, texts), resolveText(value, texts)]);
        const profileRows: string[][] = [];
        for (let index = 0; index < pairs.length; index += 2) {
            profileRows.push([...pairs[index], ...(pairs[index + 1] ?? ["", ""])]);
        }
        result.set(unit.m_UnitStrID, {
            // NKCUICollectionOperatorInfoV2.SetData hides the ID root when excluded.
            collectionId: unit.m_bExclude ? "" : String(unit.Idx).padStart(3, "0"),
            profileTitle: resolveText(employee.CharacterType, texts),
            profileRows,
            intro: resolveText(employee.ProfileValue_1, texts).trim(),
            voiceActor: actorTexts.get(actors.get(unit.m_UnitStrID) ?? "") ?? "",
        });
    }
    return result;
}
export function getOperatorProfile(unitStrId: string): OperatorProfile | null {
    profiles ??= loadProfiles();
    return profiles.get(unitStrId) ?? null;
}
