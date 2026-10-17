import type { NativeObject } from "./characterSpineEffects";
const categories = [
    ["Attack", "기본 공격"], ["AirAttack", "대공 기본 공격"],
    ["Skill", "특수기"], ["AirSkill", "대공 특수기"],
    ["HyperSkill", "궁극기"], ["AirHyperSkill", "대공 궁극기"],
    ["PassiveAttack", "패시브 공격"], ["AirPassiveAttack", "대공 패시브 공격"],
] as const;
export interface CharacterSpineAction {
    readonly id: string;
    readonly label: string;
    readonly stateName: string;
    readonly nativeFields: NativeObject;
    readonly sourceLayers: readonly {
        readonly fields: NativeObject;
    }[];
}
/** NKMUnitTemplet.LoadFromLUA: indexed list overlays, then legacy singleton appends,
 * on EACH inherited layer. An absent/shorter list never truncates inherited entries.
 * Entry points come from these declarations, never from clip/state name guesses. */
export function compileCharacterSpineActions(layers: readonly {
    readonly fields: NativeObject;
}[]): CharacterSpineAction[] {
    const lists = categories.map(() => [] as {
        fields: NativeObject;
        layers: {
            fields: NativeObject;
        }[];
    }[]);
    const object = (value: unknown): value is NativeObject => Boolean(value) && typeof value === "object" && !Array.isArray(value);
    const overlay = (entry: typeof lists[number][number], fields: NativeObject) => {
        entry.fields = { ...entry.fields, ...fields };
        entry.layers.push({ fields });
    };
    for (const layer of layers) {
        categories.forEach(([key], category) => {
            const value = layer.fields[`m_list${key}StateData`];
            const rows = Array.isArray(value) ? value : object(value)
                ? Object.keys(value).filter(k => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b)).map(k => value[k]) : [];
            for (let index = 0; index < rows.length; index++) {
                const row = rows[index];
                if (!object(row))
                    break;
                const entry = lists[category][index] ??= { fields: {}, layers: [] };
                overlay(entry, row);
            }
        });
        categories.forEach(([key], category) => {
            const value = layer.fields[`m_${key}StateData`];
            if (!object(value))
                return;
            const entry = { fields: {}, layers: [] } as typeof lists[number][number];
            overlay(entry, value);
            lists[category].push(entry);
        });
    }
    return lists.flatMap((entries, category) => entries.flatMap((entry, index) => {
        const stateName = entry.fields.m_StateName;
        if (typeof stateName !== "string" || !stateName)
            return [];
        return [{ id: `${categories[category][0]}:${index}`, stateName,
                label: categories[category][1] + (entries.length > 1 ? ` ${index + 1}` : ""),
                nativeFields: entry.fields, sourceLayers: entry.layers }];
    }));
}
