import actionCatalog from "@/data/character-skill-spine-actions.json";
type SkillSpineCatalog = {
    actions?: readonly {
        id: string;
    }[];
};
const actionCategories = new Map<string, readonly string[]>([
    ["NST_ATTACK", ["Attack", "AirAttack"]],
    ["NST_SKILL", ["Skill", "AirSkill"]],
    ["NST_HYPER", ["HyperSkill", "AirHyperSkill"]],
]);
const cacheLimit = 128;
const cachedActions = new Map<string, ReadonlyMap<string, readonly string[]>>();
/** Choose existing battle dropdown entries by skill category, preserving their
 * display order. Passive and leader icons have no category-wide shortcut. */
export function matchCharacterSkillSpineActions(catalog: SkillSpineCatalog, skillType: string): readonly string[] {
    const categories = actionCategories.get(skillType);
    if (!categories)
        return [];
    return (catalog.actions ?? []).filter(action => typeof action.id === "string" && categories.includes(action.id.split(":")[0])).map(action => action.id);
}
/** Cache only the dropdown IDs, not the much larger unit effect payload. */
export function getCharacterSkillSpineActions(unitStrId: string, skillType: string): readonly string[] {
    if (!/^[A-Z0-9_]{1,128}$/.test(unitStrId) || !actionCategories.has(skillType))
        return [];
    let actions = cachedActions.get(unitStrId);
    if (actions) {
        cachedActions.delete(unitStrId);
        cachedActions.set(unitStrId, actions);
    }
    else {
        let catalog: (SkillSpineCatalog & {
            unitStrId?: string;
            status?: string;
        }) | undefined;
        try {
            catalog = (actionCatalog as Record<string, SkillSpineCatalog & { unitStrId?: string; status?: string }>)[unitStrId];
        }
        catch {
            // Missing catalogs leave the skill icon without a playback shortcut.
        }
        actions = new Map([...actionCategories.keys()].map(type => [type,
            catalog?.unitStrId === unitStrId && catalog.status === "resolved"
                ? Object.freeze([...matchCharacterSkillSpineActions(catalog, type)]) : [],
        ]));
        cachedActions.set(unitStrId, actions);
        if (cachedActions.size > cacheLimit)
            cachedActions.delete(cachedActions.keys().next().value!);
    }
    return actions.get(skillType) ?? [];
}
/** The icon is a shortcut to the first existing dropdown entry of its type. */
export function getCharacterSkillSpineAction(unitStrId: string, skillType: string): string | undefined {
    return getCharacterSkillSpineActions(unitStrId, skillType)[0];
}
