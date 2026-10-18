import { deploymentData } from "@/lib/deployment";
import fs from "node:fs";
import path from "node:path";
type ReactorRow = {
    ReactorID: number;
    ReactorName: string;
    ReactorDesc: string;
    ReactorIllust: string;
    [key: `Level${number}`]: number | undefined;
};
type ReactorSkillRow = {
    IDX: number;
    ReactorID: number;
    ReactorLevelTitle: string;
    ReactorLevelDesc: string;
    UnitSkillIconStrID: string;
    [key: `LevelUpReqItemID_${number}`]: number | undefined;
    [key: `LevelUpReqItemValue_${number}`]: number | undefined;
};
type ItemRow = {
    m_ItemMiscID: number;
    m_ItemMiscName: string;
};
export type CharacterReactorCost = {
    itemId: number;
    name: string;
    count: number;
    iconPath: string | null;
};
export type CharacterReactorLevel = {
    id: number;
    level: number;
    title: string;
    description: string;
    skillIconPath: string | null;
    costs: CharacterReactorCost[];
};
export type CharacterReactor = {
    id: number;
    name: string;
    description: string;
    illustrationPath: string;
    levels: CharacterReactorLevel[];
};
let reactorsByUnit: Map<number, CharacterReactor> | undefined;
function readJson<T>(relativePath: string): T {
    return deploymentData(JSON.parse(fs.readFileSync(path.join(process.cwd(), relativePath), "utf8"))) as T;
}
function buildReactorsByUnit(): Map<number, CharacterReactor> {
    const root = "json/character/reactors";
    const reactors = readJson<{
        data: ReactorRow[];
    }>(`${root}/026_LUA_REACTOR_TEMPLET_j.json`).data;
    const skills = new Map(readJson<{
        data: ReactorSkillRow[];
    }>(`${root}/207_LUA_REACTOR_SKILL_TEMPLET_a.json`).data.map((row) => [row.IDX, row]));
    const strings = new Map(readJson<{
        data: [
            string,
            string
        ][];
    }>(`${root}/045_LUA_SI_REACTOR_TEMPLET_KOREA_z.json`).data);
    const items = new Map(readJson<{
        data: ItemRow[];
    }>("json/collection/012_LUA_ITEM_MISC_TEMPLET_h.json").data.map((row) => [row.m_ItemMiscID, row]));
    const itemStrings = new Map(readJson<{
        data: [
            string,
            string?
        ][];
    }>("json/collection/053_LUA_SI_ITEM_TEMPLET_KOREA_a.json").data.filter((row): row is [
        string,
        string
    ] => typeof row[1] === "string"));
    function text(key: string, table = strings): string {
        const value = table.get(key);
        if (value === undefined)
            throw new Error(`Missing original reactor string: ${key}`);
        return value;
    }
    const result = new Map<number, CharacterReactor>();
    for (const reactor of reactors) {
        if (result.has(reactor.ReactorID))
            throw new Error(`Duplicate reactor: ${reactor.ReactorID}`);
        const levels: CharacterReactorLevel[] = Object.entries(reactor)
            .filter(([key]) => /^Level\d+$/.test(key))
            .map(([key, value]) => ({ level: Number(key.slice(5)), skillId: Number(value) }))
            .filter(({ skillId }) => skillId > 0)
            .sort((first, second) => first.level - second.level)
            .map(({ level, skillId }) => {
            const skill = skills.get(skillId);
            if (!skill || skill.ReactorID !== reactor.ReactorID) {
                throw new Error(`Missing reactor level: ${reactor.ReactorID}/${skillId}`);
            }
            const costs: CharacterReactorCost[] = Object.keys(skill)
                .filter((key) => /^LevelUpReqItemID_\d+$/.test(key))
                .map((key) => Number(key.slice("LevelUpReqItemID_".length)))
                .sort((first, second) => first - second)
                .flatMap((index) => {
                const itemId = skill[`LevelUpReqItemID_${index}`];
                const count = skill[`LevelUpReqItemValue_${index}`];
                if (!itemId || !count)
                    return [];
                const item = items.get(itemId);
                if (!item)
                    throw new Error(`Missing reactor requirement item: ${itemId}`);
                return [{ itemId, name: text(item.m_ItemMiscName, itemStrings), count, iconPath: null }];
            });
            return {
                id: skill.IDX,
                level,
                title: text(skill.ReactorLevelTitle),
                description: text(skill.ReactorLevelDesc),
                // The preserved client names COMMON_STAT, but no matching sprite exists.
                skillIconPath: skill.UnitSkillIconStrID && skill.UnitSkillIconStrID !== "NKM_UNIT_COMMON_STAT"
                    ? `/unit/unit_skill/${skill.UnitSkillIconStrID}.png`
                    : null,
                costs,
            };
        });
        if (levels.length === 0)
            throw new Error(`Reactor has no levels: ${reactor.ReactorID}`);
        result.set(reactor.ReactorID, {
            id: reactor.ReactorID,
            name: text(reactor.ReactorName),
            description: text(reactor.ReactorDesc),
            illustrationPath: `/character/reactors/${reactor.ReactorIllust}.png`,
            levels,
        });
    }
    return result;
}
/** Historical reactor definitions use the original unit ID directly.
 * Do not inherit from base/rearmed forms or filter the retired system by OpenTag. */
export function getCharacterReactor(unitId: number): CharacterReactor | null {
    reactorsByUnit ??= buildReactorsByUnit();
    return reactorsByUnit.get(unitId) ?? null;
}
