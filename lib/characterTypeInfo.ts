import { deploymentUrl } from "@/lib/deployment";
import fs from "node:fs";
import path from "node:path";
export type CharacterTypeInfoTabId = "basic" | "attack" | "tag";
export type CharacterTypeInfoItem = {
    id: string;
    label: string;
    description: string;
    iconPath?: string;
};
export type CharacterTypeInfoSection = {
    id: string;
    title: string;
    items: CharacterTypeInfoItem[];
};
export type CharacterTypeInfoCatalog = {
    title: string;
    detailTagsTitle: string;
    tabs: {
        id: CharacterTypeInfoTabId;
        label: string;
        sections: CharacterTypeInfoSection[];
    }[];
};
export type CharacterTypeInfoUnit = {
    unitId?: number;
    unitStrId?: string;
    m_UnitID?: number;
    m_UnitStrID?: string;
    m_NKM_UNIT_STYLE_TYPE?: string;
    m_NKM_UNIT_ROLE_TYPE?: string;
    m_NKM_FIND_TARGET_TYPE?: string;
    m_NKM_FIND_TARGET_TYPE_Desc?: string;
    m_NKM_UNIT_SOURCE_TYPE?: string;
    m_NKM_UNIT_SOURCE_TYPE_SUB?: string;
    m_hsUnitTag?: string[];
    m_lstUnitTag?: string[];
};
export type CharacterTypeInfoUnitTag = {
    id: string;
    label: string;
};
const stringTablePath = path.join(process.cwd(), "json/KR/character/081_LUA_SI_LOBBY_KOREA_k.json");
const iconRoot = deploymentUrl("/unit/unit_type/");
const infoPrefix = "SI_PF_POPUP_UNIT_INFO_";
const popupPrefix = "SI_PF_POPUP_UNIT_INFOPOPUP_";
let cachedCatalog: CharacterTypeInfoCatalog | undefined;
let cachedUnits: Map<number | string, CharacterTypeInfoUnit> | undefined;
let cachedDetailTagNames: Map<string, string> | undefined;
function getOriginalUnit(unit: CharacterTypeInfoUnit): CharacterTypeInfoUnit {
    const id = unit.unitId ?? unit.m_UnitID ?? unit.unitStrId ?? unit.m_UnitStrID;
    if (id === undefined)
        return unit;
    if (!cachedUnits) {
        cachedUnits = new Map();
        for (const filename of [
            "json/004_LUA_UNIT_TEMPLET_BASE_h.json",
            "json/character/006_LUA_UNIT_TEMPLET_BASE6_g.json",
        ]) {
            const table = JSON.parse(fs.readFileSync(path.join(process.cwd(), filename), "utf8")) as {
                data: CharacterTypeInfoUnit[];
            };
            for (const row of table.data) {
                if (row.m_UnitID !== undefined)
                    cachedUnits.set(row.m_UnitID, row);
                if (row.m_UnitStrID)
                    cachedUnits.set(row.m_UnitStrID, row);
            }
        }
    }
    return cachedUnits.get(id) ?? unit;
}
// NKMUnitTempletBase.IsAttackGroundUnit/IsAttackAirUnit/IsAttackAllUnit
// use the description override, then this exact target-enum classification.
const groundTargets = new Set([
    "NFTT_NEAR_ENEMY_LAND",
    "NFTT_NEAR_ENEMY_LAND_RANGER_SUPPORTER_SNIPER_FIRST",
    "NFTT_FAR_ENEMY_LAND",
    "NFTT_FAR_ENEMY_LAND_BOSS_LAST",
    "NFTT_ENEMY_BOSS_LAND",
    "NFTT_NEAR_MY_TEAM_LAND",
    "NFTT_NEAR_MY_TEAM_LOW_HP_LAND",
    "NFTT_FAR_MY_TEAM_LAND",
    "NFTT_NEAR_MY_TEAM_NOT_SELF_LAND",
]);
const airTargets = new Set([
    "NFTT_NEAR_ENEMY_AIR",
    "NFTT_FAR_ENEMY_AIR",
    "NFTT_FAR_ENEMY_AIR_BOSS_LAST",
    "NFTT_ENEMY_BOSS_AIR",
    "NFTT_NEAR_MY_TEAM_AIR",
    "NFTT_NEAR_MY_TEAM_LOW_HP_AIR",
    "NFTT_FAR_MY_TEAM_AIR",
    "NFTT_NEAR_MY_TEAM_NOT_SELF_AIR",
]);
const allTargets = new Set([
    "NFTT_NEAR_ENEMY",
    "NFTT_NEAR_ENEMY_AIR_FIRST",
    "NFTT_FAR_ENEMY",
    "NFTT_FAR_ENEMY_BOSS_LAST",
    "NFTT_ENEMY_BOSS_ONLY",
    "NFTT_ENEMY_BOSS",
    "NFTT_NEAR_MY_TEAM",
    "NFTT_NEAR_MY_TEAM_LOW_HP",
    "NFTT_FAR_MY_TEAM",
    "NFTT_NEAR_MY_TEAM_NOT_SELF",
]);
/** Match NKCPopupUnitRoleInfo.OpenPopup's highlights against original templates. */
export function getCharacterTypeInfoSelectedIds(input: CharacterTypeInfoUnit): string[] {
    const unit = getOriginalUnit(input);
    const ids: string[] = [];
    const style = unit.m_NKM_UNIT_STYLE_TYPE ?? "";
    ids.push(["NUST_COUNTER", "NUST_SOLDIER", "NUST_MECHANIC"].includes(style) ? style : "NUST_ETC");
    if (unit.m_NKM_UNIT_ROLE_TYPE)
        ids.push(unit.m_NKM_UNIT_ROLE_TYPE);
    const override = unit.m_NKM_FIND_TARGET_TYPE_Desc;
    const target = override && override !== "NFTT_INVALID"
        ? override
        : unit.m_NKM_FIND_TARGET_TYPE ?? "NFTT_INVALID";
    if (groundTargets.has(target))
        ids.push("ground");
    if (airTargets.has(target))
        ids.push("air");
    if (allTargets.has(target))
        ids.push("all");
    for (const source of [unit.m_NKM_UNIT_SOURCE_TYPE, unit.m_NKM_UNIT_SOURCE_TYPE_SUB]) {
        if (source && ["NUST_CONFLICT", "NUST_STABLE", "NUST_LIBERAL"].includes(source)) {
            ids.push(source);
        }
    }
    for (const tag of unit.m_hsUnitTag ?? []) {
        if (["NUT_PATROL", "NUT_SWINGBY", "NUT_RESPAWN_FREE_POS", "NUT_REVENGE", "NUT_FURY"].includes(tag)) {
            ids.push(tag);
        }
        else if (["NUT_LIMIT_1", "NUT_LIMIT_2", "NUT_LIMIT_3"].includes(tag)) {
            ids.push("NUT_LIMIT");
        }
    }
    return [...new Set(ids)];
}
/** Client GetTagString(true): the template-selected name, hash, and +/- suffix. */
export function getCharacterTypeInfoUnitTags(input: CharacterTypeInfoUnit): CharacterTypeInfoUnitTag[] {
    const unit = getOriginalUnit(input);
    if (!unit.m_lstUnitTag?.length)
        return [];
    if (!cachedDetailTagNames) {
        const table = JSON.parse(fs.readFileSync(path.join(process.cwd(), "json/character/203_LUA_UNIT_TAG_INFO_TEMPLET_a.json"), "utf8")) as {
            data: {
                NKM_UNIT_TAG: string;
                TAG_STRING_ID: string;
                m_Suffix: "NONE" | "POSITIVE" | "NEGATIVE";
            }[];
        };
        const stringTable = JSON.parse(fs.readFileSync(path.join(process.cwd(), "json/KR/character/082_LUA_SI_UNIT_TAG_KOREA_h.json"), "utf8")) as {
            data: [
                string,
                string
            ][];
        };
        const strings = new Map(stringTable.data);
        const suffixes = { NONE: "", POSITIVE: "+", NEGATIVE: "-" };
        cachedDetailTagNames = new Map(table.data.map((row) => {
            const label = strings.get(row.TAG_STRING_ID);
            if (!label)
                throw new Error(`Missing character detail-tag string: ${row.TAG_STRING_ID}`);
            return [row.NKM_UNIT_TAG, `#${label}${suffixes[row.m_Suffix]}`];
        }));
    }
    return unit.m_lstUnitTag.map((id) => {
        const label = cachedDetailTagNames!.get(id);
        if (!label)
            throw new Error(`Missing character detail-tag template: ${id}`);
        return { id, label };
    });
}
/** Original Korean role-information strings, including their line breaks. */
export function getCharacterTypeInfoCatalog(): CharacterTypeInfoCatalog {
    if (cachedCatalog)
        return cachedCatalog;
    const table = JSON.parse(fs.readFileSync(stringTablePath, "utf8")) as {
        data: [
            string,
            string
        ][];
    };
    const strings = new Map(table.data);
    const text = (key: string) => {
        const value = strings.get(key);
        if (!value)
            throw new Error(`Missing character role-information string: ${key}`);
        return value;
    };
    const item = (id: string, labelKey: string, descriptionKey: string, icon: string): CharacterTypeInfoItem => ({
        id,
        label: text(labelKey),
        description: text(descriptionKey),
        iconPath: `${iconRoot}${icon}.png`,
    });
    const basicItem = (id: string, stringSuffix: string, icon: string) => item(id, `${infoPrefix}${stringSuffix}`, `${infoPrefix}${stringSuffix}_DESC`, icon);
    const tagItem = (id: string, stringSuffix: string, iconSuffix: string) => item(id, `${popupPrefix}${stringSuffix}`, `${popupPrefix}${stringSuffix}_DESC`, `NKM_UI_COMMON_UNIT_TAG_ICON_${iconSuffix}`);
    cachedCatalog = {
        title: text(`${infoPrefix}TitleText`),
        detailTagsTitle: text("SI_PF_UNIT_TAG_TYPE_DETAIL"),
        tabs: [
            {
                id: "basic",
                label: text(`${infoPrefix}TYPE_NORMAL`),
                sections: [
                    {
                        id: "style",
                        title: text(`${infoPrefix}TYPE_UNIT`),
                        items: [
                            basicItem("NUST_COUNTER", "COUNTER", "NKM_UI_COMMON_UNIT_TYPE_COUNTER"),
                            // SOLIDER is the original string-table key, not a typo to normalize.
                            basicItem("NUST_SOLDIER", "SOLIDER", "NKM_UI_COMMON_UNIT_TYPE_SOLDIER"),
                            basicItem("NUST_MECHANIC", "MECH", "NKM_UI_COMMON_UNIT_TYPE_MECHANIC"),
                            basicItem("NUST_ETC", "ETC", "NKM_UI_COMMON_UNIT_TYPE_ETC"),
                        ],
                    },
                    {
                        id: "role",
                        title: text(`${popupPrefix}CLASS`),
                        items: [
                            basicItem("NURT_STRIKER", "STRIKER", "NKM_UI_COMMON_UNIT_CLASS_ICON_STRIKER"),
                            basicItem("NURT_RANGER", "RANGER", "NKM_UI_COMMON_UNIT_CLASS_ICON_RANGER"),
                            basicItem("NURT_SNIPER", "SNIPER", "NKM_UI_COMMON_UNIT_CLASS_ICON_SNIPER"),
                            basicItem("NURT_DEFENDER", "DEFENDER", "NKM_UI_COMMON_UNIT_CLASS_ICON_DEFENDER"),
                            basicItem("NURT_SUPPORTER", "SUPPORTER", "NKM_UI_COMMON_UNIT_CLASS_ICON_SUPPORTER"),
                            basicItem("NURT_SIEGE", "SIDGE", "NKM_UI_COMMON_UNIT_CLASS_ICON_SIEGE"),
                            basicItem("NURT_TOWER", "TOWER", "NKM_UI_COMMON_UNIT_CLASS_ICON_TOWER"),
                        ],
                    },
                ],
            },
            {
                id: "attack",
                label: text(`${infoPrefix}TYPE_ATK`),
                sections: [
                    {
                        id: "attackType",
                        title: text(`${infoPrefix}TYPE_ATK`),
                        items: [
                            item("ground", `${popupPrefix}GROUND_ATK`, `${popupPrefix}GROUND_ATK_DESC`, "UI_COMMON_UNIT_ATTACK_TYPE_LAND"),
                            // GROUND_AIR_DSEC is also an original string-table key.
                            item("air", `${popupPrefix}GROUND_AIR`, `${popupPrefix}GROUND_AIR_DSEC`, "UI_COMMON_UNIT_ATTACK_TYPE_AIR"),
                            item("all", `${popupPrefix}GROUND_ALL`, `${popupPrefix}GROUND_ALL_DESC`, "UI_COMMON_UNIT_ATTACK_TYPE_ALL"),
                        ],
                    },
                    {
                        id: "source",
                        title: text(`${infoPrefix}SOURCE_TYPE`),
                        items: ["CONFLICT", "STABLE", "LIBERAL"].map((source) => item(`NUST_${source}`, `${infoPrefix}SOURCE_${source}_TITLE`, `${infoPrefix}SOURCE_${source}_DESC`, `NKM_UI_COMMON_WEAK_TAG_SYMBOL_${source}`)),
                    },
                ],
            },
            {
                id: "tag",
                label: text(`${infoPrefix}TAG`),
                sections: [
                    {
                        id: "tags",
                        title: text("SI_PF_UNIT_TAG_TYPE_CORE"),
                        items: [
                            tagItem("NUT_PATROL", "PATROL", "PATROL"),
                            tagItem("NUT_SWINGBY", "SWINGBY", "SWINGBY"),
                            tagItem("NUT_RESPAWN_FREE_POS", "FRONTLINE", "RESPAWNFREEPOS"),
                            tagItem("NUT_REVENGE", "COUNTERATTACK", "REVENGE"),
                            tagItem("NUT_FURY", "FURY", "FURY"),
                            // The client uses one description for NUT_LIMIT_1, _2, and _3.
                            tagItem("NUT_LIMIT", "LIMIT", "LIMIT"),
                        ],
                    },
                ],
            },
        ],
    };
    return cachedCatalog;
}
