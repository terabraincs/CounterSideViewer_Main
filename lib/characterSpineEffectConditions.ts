import type { NativeJson, NativeObject, NativeSourceLayer } from "./characterSpineEffects";
export type EffectConditionDiagnostic = {
    field: string;
    message: string;
};
export type CompiledEffectCondition = {
    legacy: NativeObject;
    v2: NativeJson | null;
    diagnostics: EffectConditionDiagnostic[];
};
export type EffectConditionResult = {
    passes: boolean;
    diagnostics: EffectConditionDiagnostic[];
};
export type EffectConditionActor = {
    skillLevels: Readonly<Record<string, number>>;
    isLeader: boolean;
};
export type EffectConditionContext = EffectConditionActor & {
    isPve: boolean;
    isPvp: boolean;
    isAir: boolean;
    hasMaster: boolean;
    master: EffectConditionActor | null;
    // ProcessEventEffect passes null. Attack-target conditions may explicitly pass a logical target.
    target: {
        isEnemy: boolean;
        isAlly: boolean;
    } | null;
    phase?: number;
    shipSkillIds?: readonly string[];
    macros?: Readonly<Record<string, NativeJson>>;
    buffDefinitions?: Readonly<Record<string, number>>;
    buffs?: readonly {
        id: number;
        statLevel: number;
        overlapCount: number;
    }[];
};
const RANGE_FIELDS = new Set([
    "m_Phase", "m_SkillLevel", "m_MasterSkillLevel", "m_NeedBuffLevel", "m_NeedBuffOverlapCount",
    "m_IgnoreBuffLevel", "m_IgnoreBuffOverlapCount", "m_MapPositon", "m_fHPRate", "m_LevelRange",
    "m_BuffCount", "m_DebuffCount", "m_ReactorLevel", "m_EventVariableValue",
]);
const SUPPORTED_LEGACY_FIELDS = new Set([
    "m_Phase", "m_SkillStrID", "m_SkillLevel", "m_MasterSkillStrID", "m_MasterSkillLevel",
    "m_bLeaderUnit", "m_bUsePVE", "m_bUsePVP", "m_NeedBuffStrID", "m_NeedBuffLevel",
    "m_NeedBuffOverlapCount", "m_IgnoreBuffStrID", "m_IgnoreBuffLevel", "m_IgnoreBuffOverlapCount",
]);
function object(value: unknown): value is NativeObject {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}
/** NKMMinMaxInt.LoadFromLua: scalar sets both; missing table entries retain previous values. */
function loadRange(value: NativeJson | undefined, previous: NativeJson = [-1, -1]): number[] {
    const range = Array.isArray(previous) ? [...previous] as number[] : [-1, -1];
    if (typeof value === "number" && Number.isFinite(value))
        return [value, value];
    const low = Array.isArray(value) ? value[0] : object(value) ? value["1"] : undefined;
    const high = Array.isArray(value) ? value[1] : object(value) ? value["2"] : undefined;
    if (typeof low === "number" && Number.isFinite(low))
        range[0] = low;
    if (typeof high === "number" && Number.isFinite(high))
        range[1] = high;
    // Native logs this malformed range and assigns max=min before returning false to the caller.
    if (range[0] > range[1])
        range[1] = range[0];
    return range;
}
/**
 * NKMEventCondition.LoadFromLUA IL0000-0053: every load replaces V2 (absent becomes null),
 * a present V2 bypasses the legacy table, and an absent legacy table retains its prior fields.
 * Use full EVENT sourceLayers, including child rows with neither condition field.
 */
export function compileCharacterSpineEffectCondition(sourceLayers: readonly Pick<NativeSourceLayer, "fields">[], field = "m_Condition"): CompiledEffectCondition {
    const result: CompiledEffectCondition = { legacy: {}, v2: null, diagnostics: [] };
    for (const layer of sourceLayers) {
        const v2 = layer.fields[`${field}V2`];
        result.v2 = typeof v2 === "string" || Array.isArray(v2) || object(v2) ? v2 : null;
        if (result.v2 !== null)
            continue;
        const legacy = layer.fields[field];
        if (!object(legacy))
            continue;
        for (const [key, value] of Object.entries(legacy)) {
            result.legacy[key] = RANGE_FIELDS.has(key) ? loadRange(value, result.legacy[key]) : value;
        }
        // This loader explicitly nulls the list if GetDataList fails (IL0204-021A).
        if (!Object.hasOwn(legacy, "m_listReqUnit"))
            delete result.legacy.m_listReqUnit;
    }
    return result;
}
function accepted(passes: boolean): EffectConditionResult {
    return { passes, diagnostics: [] };
}
function unsupported(field: string, message: string): EffectConditionResult {
    return { passes: false, diagnostics: [{ field, message }] };
}
function inRange(value: number, source: NativeJson | undefined): boolean {
    const [low, high] = loadRange(source);
    return (low === -1 || value >= low) && (high === -1 || value <= high);
}
function leader(context: EffectConditionContext): boolean {
    return context.hasMaster ? context.master?.isLeader === true : context.isLeader;
}
function skill(name: NativeJson | undefined, range: NativeJson | undefined, actor: EffectConditionActor | null, context: EffectConditionContext, missingMasterPasses: boolean): EffectConditionResult {
    if (typeof name !== "string")
        return unsupported("m_SkillStrID", "An exact native skill string is required");
    if (!actor)
        return accepted(missingMasterPasses); // Legacy CanUseMasterSkill(-1) returns true.
    const level = actor.skillLevels[name];
    if (typeof level !== "number" || !Number.isFinite(level))
        return unsupported(name, "The explicit actor skill level is unavailable");
    if (level === -1 && missingMasterPasses)
        return accepted(true);
    if (context.shipSkillIds?.includes(name) && level === 0)
        return accepted(false);
    return accepted(inRange(level, range));
}
function legacyBuffs(fields: NativeObject, context: EffectConditionContext): EffectConditionResult {
    for (const kind of ["Ignore", "Need"] as const) {
        const name = fields[`m_${kind}BuffStrID`];
        if (typeof name !== "string" || name.length <= 1)
            continue;
        const id = context.buffDefinitions?.[name];
        if (id === undefined || !context.buffs)
            return unsupported(`m_${kind}BuffStrID`, "The native buff ID registry and current buff snapshot are required");
        // Native resolves missing definitions to ID 0, which disables that named check.
        if (id <= 0)
            continue;
        const found = context.buffs.find((buff) => Math.abs(buff.id) === id);
        if (!found) {
            if (kind === "Need")
                return accepted(false);
            continue;
        }
        const matches = inRange(found.statLevel, fields[`m_${kind}BuffLevel`])
            && inRange(found.overlapCount, fields[`m_${kind}BuffOverlapCount`]);
        // CanUseBuff returns immediately for the first matching Ignore ID, even on range mismatch.
        return accepted(kind === "Ignore" ? !matches : matches);
    }
    return accepted(true);
}
function evaluateLegacy(fields: NativeObject, context: EffectConditionContext): EffectConditionResult {
    const unknown = Object.keys(fields).filter((field) => !SUPPORTED_LEGACY_FIELDS.has(field));
    if (unknown.length)
        return { passes: false, diagnostics: unknown.map((field) => ({ field, message: "This native condition requires an unimplemented predicate" })) };
    for (const [field, value] of Object.entries(fields)) {
        if ((field.startsWith("m_b") && typeof value !== "boolean") || (field.endsWith("StrID") && typeof value !== "string")) {
            return unsupported(field, "The declared condition value has an unsupported native type");
        }
    }
    if (context.isPvp && fields.m_bUsePVP === false)
        return accepted(false);
    if (context.isPve && fields.m_bUsePVE === false)
        return accepted(false);
    if (fields.m_Phase !== undefined) {
        if (context.phase === undefined)
            return unsupported("m_Phase", "The explicit actor phase is required");
        if (!inRange(context.phase, fields.m_Phase))
            return accepted(false);
    }
    const buff = legacyBuffs(fields, context);
    if (!buff.passes)
        return buff;
    if (fields.m_bLeaderUnit === true && !leader(context))
        return accepted(false);
    for (const master of [false, true]) {
        const name = fields[master ? "m_MasterSkillStrID" : "m_SkillStrID"];
        if (typeof name !== "string" || name.length <= 1)
            continue;
        const result = skill(name, fields[master ? "m_MasterSkillLevel" : "m_SkillLevel"], master ? context.master : context, context, true);
        if (!result.passes)
            return result;
    }
    return accepted(true);
}
function evaluateDetail(fields: NativeObject, context: EffectConditionContext): EffectConditionResult {
    const type = fields.Type;
    const allowed = new Set(["Type", "Inverse", ...(type === "SkillLevel" ? ["m_SkillStrID", "m_SkillLevel"] : [])]);
    const unknown = Object.keys(fields).filter((key) => !allowed.has(key));
    if (unknown.length)
        return unsupported(String(type), `Unimplemented detail fields: ${unknown.join(", ")}`);
    switch (type) {
        case "SkillLevel": return skill(fields.m_SkillStrID, fields.m_SkillLevel, context.hasMaster ? context.master : context, context, false);
        case "Leader": return accepted(leader(context));
        case "PVE": return accepted(context.isPve);
        case "PVP": return accepted(context.isPvp);
        case "Land": return accepted(!context.isAir);
        case "Air": return accepted(context.isAir);
        case "Enemy": return accepted(context.target?.isEnemy === true);
        case "Ally": return accepted(context.target?.isAlly === true);
        default: return unsupported(String(type), "This native V2 condition type is not implemented");
    }
}
function evaluateV2(value: NativeJson, context: EffectConditionContext, seen: ReadonlySet<string>): EffectConditionResult {
    const entries: NativeJson[] = Array.isArray(value) ? value : object(value) ? [] : [value];
    if (object(value)) {
        const unknown = Object.keys(value).filter((key) => key !== "ConditionType" && !/^[1-9]\d*$/.test(key));
        if (unknown.length)
            return unsupported("m_ConditionV2", `Unimplemented container fields: ${unknown.join(", ")}`);
        for (let index = 1; Object.hasOwn(value, String(index)); index += 1)
            entries.push(value[String(index)]);
    }
    if (typeof entries[0] === "string") {
        for (const entry of entries) {
            if (typeof entry !== "string")
                break; // Native sequential GetData<String> stops here.
            if (!entry)
                continue;
            if (seen.has(entry))
                return unsupported(entry, "Recursive condition macro");
            const macro = context.macros?.[entry];
            if (macro === undefined)
                return unsupported(entry, "The exact native condition macro is unavailable");
            const result = evaluateV2(macro, context, new Set([...seen, entry]));
            if (!result.passes)
                return result;
        }
        return accepted(true);
    }
    const values: boolean[] = [];
    for (const entry of entries) {
        if (!object(entry))
            return unsupported("m_ConditionV2", "A native condition detail table is required");
        const result = evaluateDetail(entry, context);
        // Unknown predicates must never turn true through Inverse or a negating combination.
        if (result.diagnostics.length)
            return result;
        values.push(result.passes !== (entry.Inverse === true));
    }
    const mode = object(value) ? value.ConditionType ?? "ALL" : "ALL";
    switch (mode) {
        case "ALL": return accepted(values.every(Boolean));
        case "ANY": return accepted(values.some(Boolean));
        // Preserve native enum names AND its actual switch branches (IL0193 / IL01DD).
        case "NOT_ANY": return accepted(values.some((item) => !item));
        case "NOT_ALL": return accepted(values.every((item) => !item));
        default: return unsupported("ConditionType", `Unknown native combination ${String(mode)}`);
    }
}
export function evaluateCharacterSpineEffectCondition(condition: CompiledEffectCondition, context: EffectConditionContext): EffectConditionResult {
    if (condition.diagnostics.length)
        return { passes: false, diagnostics: condition.diagnostics };
    return condition.v2 !== null ? evaluateV2(condition.v2, context, new Set()) : evaluateLegacy(condition.legacy, context);
}
/** Exact skill IDs from m_SkillStrID1..n and their existing source rows; never assume level 5/10/99. */
export function getMaximumCharacterSpineSkillLevels(skillIds: readonly string[], rows: readonly {
    m_UnitSkillStrID: string;
    m_Level: number;
}[]): Record<string, number> {
    const names = new Set(skillIds);
    const result: Record<string, number> = {};
    for (const row of rows) {
        if (names.has(row.m_UnitSkillStrID) && Number.isFinite(row.m_Level)) {
            result[row.m_UnitSkillStrID] = Math.max(result[row.m_UnitSkillStrID] ?? -1, row.m_Level);
        }
    }
    return result;
}
