import fs from "node:fs";
import path from "node:path";
export type NativeJson = null | boolean | number | string | NativeJson[] | {
    [key: string]: NativeJson;
};
export type NativeObject = {
    [key: string]: NativeJson;
};
export type SourcePath = (string | number)[];
export type NativeSourceLayer = {
    sourceFile: string;
    sourcePath: SourcePath;
    fields: NativeObject;
    payloadSha256?: string;
    pathId?: string;
    clientRequestedName?: string;
};
export type NativeFieldSource = Omit<NativeSourceLayer, "fields">;
export type NativeIssue = {
    kind: string;
    message: string;
    sourcePaths?: NativeFieldSource[];
};
export type NativeReference = {
    kind: "effect" | "damage-effect" | "damage-template";
    name: string;
    field: string;
    sourcePaths: NativeFieldSource[];
    skinId?: number;
};
export type NativeLayeredFields = {
    nativeFields: NativeObject;
    fieldSources: Record<string, NativeFieldSource[]>;
    sourceLayers: NativeSourceLayer[];
    // Compound Lua values require their own native loader; do not recursively merge them.
    objectFieldLayers: Record<string, {
        value: NativeJson;
        source: NativeFieldSource;
    }[]>;
    constructorDefaults: NativeObject;
};
export type NativeStateEvent = NativeLayeredFields & {
    type: string;
    listName: string;
    nativeIndex: number;
    references: NativeReference[];
    skinEffectNames: Record<string, string> | null;
    unresolved: NativeIssue[];
};
export type NativeMotionState = NativeLayeredFields & {
    name: string;
    animationName: string | null;
    events: Record<string, NativeStateEvent[]>;
};
export type NativeDamageEffect = NativeLayeredFields & {
    id: string;
    statesByName: Record<string, NativeMotionState>;
    deathEvents: Record<string, NativeStateEvent[]>;
    references: NativeReference[];
};
export type NativeDamageTemplate = NativeLayeredFields & {
    name: string;
    baseFields: NativeLayeredFields | null;
    hitEffects: NativeReference[];
    additionalDamage: NativeReference[];
    unresolved: NativeIssue[];
};
export type CharacterSpineEffects = {
    schemaVersion: 1;
    unitStrId: string;
    status: "resolved" | "unresolved" | "missing";
    unitFields: NativeLayeredFields | null;
    statesByName: Record<string, NativeMotionState>;
    clipStates: Record<string, string[]>;
    damageEffects: Record<string, NativeDamageEffect>;
    damageTemplates: Record<string, NativeDamageTemplate>;
    prefabReferences: NativeReference[];
    unresolved: NativeIssue[];
};
type SourceMetadata = {
    payloadSha256?: string;
    pathId?: string;
    clientRequestedName?: string;
};
type UnitTable = {
    name?: string;
    file: string;
    source: SourceMetadata;
    data: NativeObject;
};
type ExtractedUnit = {
    unitStrId: string;
    templateName: string;
    status: string;
    unitTemplate: UnitTable | null;
    explicitBaseTemplates: UnitTable[];
    clientDefaultBaseTemplates: UnitTable[];
    unresolved: {
        kind: string;
        id: string;
        reason: string;
    }[];
};
type Definition = {
    file: string;
    rootName: string;
    rowIndex: number | string;
};
type SourceIndex = {
    units: Record<string, string>;
    damageEffects: Record<string, Definition[]>;
    damageTemplates: Record<string, Definition[]>;
    damageLoadOrder: {
        base: string[];
        normal: string[];
        evidence: string;
    };
};
type SourceTable = {
    source: SourceMetadata;
    globals: NativeObject;
};
const sourceRoot = path.join(process.cwd(), "json", "spine-effects");
const jsonCache = new Map<string, unknown>();
const resultCache = new Map<string, CharacterSpineEffects>();
function readSource<T>(relative: string): T | null {
    const file = path.resolve(sourceRoot, relative);
    const withinRoot = path.relative(sourceRoot, file);
    if (withinRoot.startsWith("..") || path.isAbsolute(withinRoot))
        return null;
    if (!jsonCache.has(relative)) {
        try {
            jsonCache.set(relative, JSON.parse(fs.readFileSync(file, "utf8")));
        }
        catch {
            jsonCache.set(relative, null);
        }
    }
    return jsonCache.get(relative) as T | null;
}
function isObject(value: NativeJson | undefined): value is NativeObject {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}
function isScalar(value: NativeJson): boolean {
    return value === null || typeof value !== "object" || (isObject(value) && typeof value.$luaNumber === "string");
}
function luaRows(value: NativeJson | undefined): {
    value: NativeObject;
    sourceKey: string | number;
}[] {
    if (Array.isArray(value)) {
        const result: {
            value: NativeObject;
            sourceKey: string | number;
        }[] = [];
        for (let index = 0; index < value.length; index += 1) {
            const row = value[index];
            if (!isObject(row))
                break;
            result.push({ value: row, sourceKey: index });
        }
        return result;
    }
    if (!isObject(value))
        return [];
    const result: {
        value: NativeObject;
        sourceKey: string | number;
    }[] = [];
    for (let index = 1; Object.hasOwn(value, String(index)); index += 1) {
        const row = value[String(index)];
        if (!isObject(row))
            break;
        result.push({ value: row, sourceKey: String(index) });
    }
    return result;
}
function location(layer: NativeSourceLayer, field?: string): NativeFieldSource {
    return {
        sourceFile: layer.sourceFile,
        sourcePath: field === undefined ? [...layer.sourcePath] : [...layer.sourcePath, field],
        ...(layer.payloadSha256 ? { payloadSha256: layer.payloadSha256 } : {}),
        ...(layer.pathId ? { pathId: layer.pathId } : {}),
        ...(layer.clientRequestedName ? { clientRequestedName: layer.clientRequestedName } : {}),
    };
}
function childLayer(layer: NativeSourceLayer, fields: NativeObject, ...keys: SourcePath): NativeSourceLayer {
    return { ...layer, fields, sourcePath: [...layer.sourcePath, ...keys] };
}
function layered(defaults: NativeObject = {}): NativeLayeredFields {
    return { nativeFields: { ...defaults }, constructorDefaults: { ...defaults }, fieldSources: {}, sourceLayers: [], objectFieldLayers: {} };
}
function overlayScalars(target: NativeLayeredFields, layer: NativeSourceLayer, excluded = new Set<string>()) {
    target.sourceLayers.push(layer);
    for (const [key, value] of Object.entries(layer.fields)) {
        if (excluded.has(key))
            continue;
        if (isScalar(value)) {
            target.nativeFields[key] = value;
            target.fieldSources[key] = [location(layer, key)];
        }
        else {
            (target.objectFieldLayers[key] ??= []).push({ value, source: location(layer, key) });
        }
    }
}
// Constructor values verified in the preserved DLL. Unknown defaults remain absent.
const EFFECT_DEFAULTS: NativeObject = {
    m_bAnimTime: true, m_fEventTime: 0, m_bStateEndTime: false,
    m_SkinID: -1, m_EffectName: "", m_fScaleFactor: 1, m_bUseZScale: true,
    m_BoneName: "", m_AnimName: "", m_fAnimSpeed: 1, m_ApplyStopTime: true,
};
// NKMDamageTemplet::.ctor IL003A-0040, 00A0-00E8, 014B-0151 and 0174-0185.
// Keep the exact lowercase spelling from the constructor; asset lookup is a separate concern.
const DAMAGE_VISUAL_DEFAULTS: NativeObject = {
    m_ReAttackCount: 1, m_fReAttackGap: 0,
    m_HitEffect: "AB_fx_hit_b_blue_small", m_HitEffectAnimName: "BASE",
    m_fHitEffectRange: 50, m_fHitEffectOffsetZ: 50, m_bHitEffectLand: false,
    m_HitEffectAir: "AB_fx_hit_b_blue_small", m_HitEffectAirAnimName: "BASE",
    m_fHitEffectAirRange: 50, m_fHitEffectAirOffsetZ: 0, m_ExtraHitDamageTempletID: "",
};
function reference(fields: NativeLayeredFields, field: string, kind: NativeReference["kind"]): NativeReference[] {
    const name = fields.nativeFields[field];
    return typeof name === "string" && name.length > 0
        ? [{ kind, name, field, sourcePaths: fields.fieldSources[field] ?? [] }] : [];
}
/** NKMDamageEffectTemplet.LoadFromLUA IL03D2..0445 loads named skin rows
 * into m_dicSkinMainEffect with Dictionary.Add. These are DE main prefab
 * references, distinct from NKMEventEffect's positional skin-name rows. */
export function damageEffectSkinReferences(effect: NativeLayeredFields): {
    references: NativeReference[];
    unresolved: NativeIssue[];
} {
    const references: NativeReference[] = [], unresolved: NativeIssue[] = [];
    const skinIds = new Set<number>();
    for (const layer of effect.objectFieldLayers.m_dicSkinEffect ?? []) {
        if (!Array.isArray(layer.value)) {
            unresolved.push({ kind: "damage-effect-skin-table", message: "DE skin source requires the native indexed table", sourcePaths: [layer.source] });
            continue;
        }
        for (const [index, entry] of layer.value.entries()) {
            const source = { ...layer.source, sourcePath: [...layer.source.sourcePath, index] };
            if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
                unresolved.push({ kind: "damage-effect-skin-row", message: "DE skin rows require named fields", sourcePaths: [source] });
                continue;
            }
            // Original local defaults before GetData; absent keys preserve them.
            const skinId = entry.m_SkinID === undefined ? -1 : entry.m_SkinID;
            const name = entry.m_MainEffectName === undefined ? "AB_FX_DUMMY" : entry.m_MainEffectName;
            if (typeof skinId !== "number" || !Number.isInteger(skinId) || skinId < -2147483648 || skinId > 2147483647 || typeof name !== "string") {
                unresolved.push({ kind: "damage-effect-skin-value", message: "DE skin row requires original Int32/String values", sourcePaths: [source] });
                continue;
            }
            if (skinIds.has(skinId)) {
                unresolved.push({ kind: "damage-effect-skin-duplicate", message: `Native Dictionary.Add rejects duplicate DE skin ${skinId}`, sourcePaths: [source] });
                continue;
            }
            skinIds.add(skinId);
            if (name)
                references.push({ kind: "effect", name, skinId, field: "m_dicSkinEffect",
                    sourcePaths: [{ ...source, sourcePath: [...source.sourcePath, "m_MainEffectName"] }] });
        }
    }
    return { references, unresolved };
}
function eventReferences(event: NativeStateEvent): NativeReference[] {
    switch (event.listName) {
        case "m_listNKMDieEventEffect":
        case "m_listNKMEventEffect": {
            const references = reference(event, "m_EffectName", "effect");
            const last = event.objectFieldLayers.m_dicSkinEffectName?.at(-1);
            event.skinEffectNames = null;
            event.unresolved = [];
            if (!last)
                return references;
            // NKMEventEffect.LoadFromLUA IL0207-020D replaces the entire dictionary.
            const entries = Array.isArray(last.value) ? last.value : [];
            event.skinEffectNames = {};
            for (let index = 0; index < entries.length; index += 1) {
                const entry = entries[index];
                if (!Array.isArray(entry) || !Number.isInteger(entry[0]) || typeof entry[1] !== "string") {
                    event.unresolved.push({ kind: "skin-effect-row", message: "Skin dictionary row requires the native Int32/String loader", sourcePaths: [last.source] });
                    continue;
                }
                const skinId = entry[0] as number;
                if (Object.hasOwn(event.skinEffectNames, String(skinId))) {
                    event.unresolved.push({ kind: "skin-effect-duplicate", message: `Native Dictionary.Add rejects duplicate skin ${skinId}`, sourcePaths: [last.source] });
                    continue;
                }
                event.skinEffectNames[String(skinId)] = entry[1];
                if (entry[1])
                    references.push({ kind: "effect", name: entry[1], skinId, field: "m_dicSkinEffectName", sourcePaths: [{ ...last.source, sourcePath: [...last.source.sourcePath, index, 1] }] });
            }
            return references;
        }
        case "m_listNKMDieEventDamageEffect":
        case "m_listNKMEventDamageEffect": return [...reference(event, "m_DEName", "damage-effect"),
            ...reference(event, "m_DENamePVP", "damage-effect").filter(value => value.name.length > 1)];
        case "m_listNKMDieEventAttack":
        case "m_listNKMEventAttack": return reference(event, "m_DamageTempletName", "damage-template");
        default: return [];
    }
}
const DEATH_EVENT_LISTS = ["m_listNKMDieEventAttack", "m_listNKMDieEventEffect", "m_listNKMDieEventDamageEffect", "m_listNKMDieEventSound"];
function loadEventList(events: NativeStateEvent[], layer: NativeSourceLayer, listName: string): void {
    const rows = luaRows(layer.fields[listName]);
    for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        // The Lua death-list name still constructs an ordinary NKMEvent* class.
        const type = listName.slice("m_list".length).replace("NKMDieEvent", "NKMEvent");
        const event = events[index] ??= {
            ...layered(type === "NKMEventEffect" ? EFFECT_DEFAULTS : {}),
            type, listName, nativeIndex: index + 1, references: [], skinEffectNames: null, unresolved: [],
        };
        overlayScalars(event, childLayer(layer, row.value, listName, row.sourceKey));
        event.references = eventReferences(event);
    }
}
/** NKMDamageEffectTemplet.LoadFromLUA IL02F5..0338 uses LoadAndMergeEventList,
 * unlike the whole-list replacement performed by NKMDamageEffectState. */
function normalizeDeathEventLayers(layers: NativeSourceLayer[]): Record<string, NativeStateEvent[]> {
    const result: Record<string, NativeStateEvent[]> = {};
    for (const layer of layers)
        for (const name of DEATH_EVENT_LISTS) {
            if (!Object.hasOwn(layer.fields, name))
                continue;
            loadEventList(result[name] ??= [], layer, name);
        }
    return result;
}
/** Native loader: exact state-name reuse, then each event's one-based row reuses that index.
 * Missing rows/fields retain inherited values and inherited trailing events remain present.
 * NKMEventCondition and other compound loaders are deliberately represented as source layers.
 */
export function normalizeNativeStateLayers(layers: NativeSourceLayer[], stateField = "m_dicNKMUnitState", eventListMode: "merge" | "replace" = "merge"): Record<string, NativeMotionState> {
    const states: Record<string, NativeMotionState> = {};
    for (const template of layers) {
        for (const { value: fields, sourceKey } of luaRows(template.fields[stateField])) {
            const name = fields.m_StateName;
            if (typeof name !== "string" || !name)
                continue;
            const state = states[name] ??= { ...layered(), name, animationName: null, events: {} };
            const stateLayer = childLayer(template, fields, stateField, sourceKey);
            const eventFields = new Set(Object.keys(fields).filter((key) => key.startsWith("m_listNKMEvent")));
            overlayScalars(state, stateLayer, eventFields);
            for (const listName of eventFields) {
                // DE states call LoadEventList: an existing table clears the whole list
                // and constructs fresh events. Unit states call LoadAndMergeEventList.
                if (eventListMode === "replace" && (Array.isArray(fields[listName]) || isObject(fields[listName])))
                    state.events[listName] = [];
                const events = state.events[listName] ??= [];
                loadEventList(events, stateLayer, listName);
            }
            state.animationName = typeof state.nativeFields.m_AnimName === "string" ? state.nativeFields.m_AnimName : null;
        }
    }
    return states;
}
function unitLayer(table: UnitTable): NativeSourceLayer {
    return { sourceFile: table.file, sourcePath: ["globals", "NKMUnitTemplet"], fields: table.data,
        payloadSha256: table.source.payloadSha256, pathId: table.source.pathId, clientRequestedName: table.source.clientRequestedName };
}
function definitionLayer(definition: Definition): NativeSourceLayer | null {
    const table = readSource<SourceTable>(definition.file);
    const root = table?.globals[definition.rootName];
    const row = Array.isArray(root) ? root[Number(definition.rowIndex)] : isObject(root) ? root[String(definition.rowIndex)] : undefined;
    return table && isObject(row) ? {
        sourceFile: definition.file, sourcePath: ["globals", definition.rootName, definition.rowIndex],
        fields: row, payloadSha256: table.source.payloadSha256, pathId: table.source.pathId, clientRequestedName: table.source.clientRequestedName,
    } : null;
}
// NKCMain.NKCInit IL00EE..0132. Decoded filenames have different numeric suffixes.
const DAMAGE_EFFECT_LOAD_ORDER = ["LUA_DAMAGE_EFFECT_TEMPLET", "LUA_DAMAGE_EFFECT_TEMPLET2", "LUA_DAMAGE_EFFECT_TEMPLET3",
    "LUA_DAMAGE_EFFECT_TEMPLET4", "LUA_DAMAGE_EFFECT_TEMPLET5", "LUA_DAMAGE_EFFECT_TEMPLET6"];
// Exact original DeepCopyFromSource fields; IDs are loaded from the derived row.
const DAMAGE_EFFECT_COPY_FIELDS = new Set([
    "m_MainEffectName", "m_bSpine", "m_fScaleFactor", "m_bUseTargetBuffScaleFactor", "m_DamageCountMax", "m_bDamageCountMaxDie",
    "m_fTargetDistDie", "m_bTargetDistDieOnlyTargetDie", "m_FindTargetData", "m_fSeeTargetTime", "m_bSeeTarget", "m_bSeeTargetSpeed",
    // Lua aliases loaded into the copied NKMFindTargetData object. Priority sets
    // are cleared on EVERY LoadFromLUA, even when the derived table omits them.
    "m_fFindTargetTime", "m_fSeeRange", "m_NKM_FIND_TARGET_TYPE", "m_bTargetNoChange", "m_bNoBackTarget",
    "m_bUseTargetDir", "m_fTargetDirSpeed", "m_bLookDir", "m_fEffectSize", "m_bNoMove", "m_bLandStruck", "m_bLandBind",
    "m_bLandEdge", "m_bLandConnect", "m_bDamageSpeedDependMaster", "m_fReloadAccel", "m_fGAccel", "m_fMaxGSpeed", "m_NKC_TEAM_COLOR_TYPE",
    "m_fShadowScaleX", "m_fShadowScaleY", "m_fShadowRotateX", "m_fShadowRotateZ", "m_CanIgnoreStopTime", "m_UseMasterAnimSpeed",
    "m_listNKMDieEventAttack", "m_listNKMDieEventEffect", "m_listNKMDieEventDamageEffect", "m_listNKMDieEventSound", "m_dicNKMState",
    "m_dicSkinEffect", // Lua table loaded into native m_dicSkinMainEffect.
]);
type DamageEffectLayers = {
    layers: NativeSourceLayer[];
    unresolved: NativeIssue[];
};
const damageEffectLayerCache = new Map<string, DamageEffectLayers>();
function damageEffectLayers(name: string, index: SourceIndex, visiting = new Set<string>()): DamageEffectLayers {
    const cached = damageEffectLayerCache.get(name);
    if (cached)
        return cached;
    const definitions = index.damageEffects[name] ?? [];
    const layer = definitions.length === 1 ? definitionLayer(definitions[0]) : null;
    const issue = (message: string): DamageEffectLayers => ({ layers: [], unresolved: [{ kind: "damage-effect-inheritance", message,
                ...(layer ? { sourcePaths: [location(layer)] } : {}) }] });
    if (!layer)
        return issue(`Missing or ambiguous original DE ${name}`);
    if (visiting.has(name))
        return issue(`Cyclic original DE inheritance ${name}`);
    const rank = DAMAGE_EFFECT_LOAD_ORDER.indexOf(layer.clientRequestedName ?? "");
    if (rank < 0)
        return issue(`DE ${name} is outside the original file load order`);
    const baseId = layer.fields.m_BASE_ID;
    let layers: NativeSourceLayer[] = [];
    if (typeof baseId === "string" && baseId.length > 1) {
        const baseDefinitions = index.damageEffects[baseId] ?? [];
        const baseLayer = baseDefinitions.length === 1 ? definitionLayer(baseDefinitions[0]) : null;
        const baseRank = DAMAGE_EFFECT_LOAD_ORDER.indexOf(baseLayer?.clientRequestedName ?? "");
        if (!baseLayer || baseRank < 0 || baseRank > rank || (baseRank === rank && Number(baseLayer.sourcePath.at(-1)) >= Number(layer.sourcePath.at(-1))))
            return issue(`DE ${name} requires an earlier loaded original base ${baseId}`);
        const base = damageEffectLayers(baseId, index, new Set([...visiting, name]));
        if (base.unresolved.length)
            return base;
        layers = base.layers.map(value => ({ ...value, fields: Object.fromEntries(Object.entries(value.fields).filter(([key]) => DAMAGE_EFFECT_COPY_FIELDS.has(key))) }));
    }
    const result = { layers: [...layers, layer], unresolved: [] };
    damageEffectLayerCache.set(name, result);
    return result;
}
function stateReferences(states: Record<string, NativeMotionState>): NativeReference[] {
    return Object.values(states).flatMap((state) => Object.values(state.events).flatMap((events) => events.flatMap((event) => event.references)));
}
function normalizeDamageTemplate(name: string, layers: NativeSourceLayer[], order: SourceIndex["damageLoadOrder"]): NativeDamageTemplate {
    const result: NativeDamageTemplate = { ...layered(DAMAGE_VISUAL_DEFAULTS), name, baseFields: null, hitEffects: [], additionalDamage: [], unresolved: [] };
    const ordered = (names: string[]) => layers.filter((layer) => names.includes(layer.clientRequestedName ?? ""))
        .sort((a, b) => names.indexOf(a.clientRequestedName!) - names.indexOf(b.clientRequestedName!) || Number(a.sourcePath.at(-1)) - Number(b.sourcePath.at(-1)));
    const baseLayers = ordered(order.base);
    const normalLayers = ordered(order.normal);
    if (baseLayers.length + normalLayers.length !== layers.length || !baseLayers.length || !normalLayers.length) {
        result.unresolved.push({ kind: "damage-template-load-order", message: `${name} has a definition outside the exact native file list or lacks a base/normal row`, sourcePaths: layers.map((layer) => location(layer)) });
        return result;
    }
    // LoadFromLuaBase constructs a NEW base for every row and replaces m_DamageTempletBase.
    result.baseFields = layered();
    overlayScalars(result.baseFields, baseLayers.at(-1)!);
    result.baseFields.sourceLayers = baseLayers;
    // LoadFromLua reuses the existing DamageTemplet and invokes its loader on EVERY matching row.
    for (const layer of normalLayers)
        overlayScalars(result, layer);
    result.hitEffects = [...reference(result, "m_HitEffect", "effect"), ...reference(result, "m_HitEffectAir", "effect")];
    result.additionalDamage = reference(result, "m_ExtraHitDamageTempletID", "damage-template");
    return result;
}
export function getCharacterSpineEffects(unitStrId: string): CharacterSpineEffects {
    const cached = resultCache.get(unitStrId);
    if (cached)
        return cached;
    const result: CharacterSpineEffects = {
        schemaVersion: 1, unitStrId, status: "missing", unitFields: null, statesByName: {}, clipStates: {},
        damageEffects: {}, damageTemplates: {}, prefabReferences: [], unresolved: [],
    };
    const index = readSource<SourceIndex>("index.json");
    const source = index?.units[unitStrId] ? readSource<ExtractedUnit>(index.units[unitStrId]) : null;
    if (!index || !source) {
        result.unresolved.push({ kind: "unit-source-missing", message: `No exact preserved source for ${unitStrId}` });
        return result;
    }
    if (source.unitStrId !== unitStrId || !source.unitTemplate) {
        result.status = "unresolved";
        result.unresolved = source.unresolved.map((issue) => ({ kind: issue.kind, message: `${issue.id}: ${issue.reason}` }));
        resultCache.set(unitStrId, result);
        return result;
    }
    result.status = "resolved";
    // The extractor records nearest explicit parent first; the native loader starts at the deepest base.
    const bases = [...source.explicitBaseTemplates, ...source.clientDefaultBaseTemplates];
    const layers = [...bases.reverse(), source.unitTemplate].map(unitLayer);
    result.unitFields = layered();
    for (const layer of layers)
        overlayScalars(result.unitFields, layer, new Set(["m_dicNKMUnitState"]));
    result.statesByName = normalizeNativeStateLayers(layers);
    for (const state of Object.values(result.statesByName)) {
        if (state.animationName)
            (result.clipStates[state.animationName] ??= []).push(state.name);
    }
    const pending = stateReferences(result.statesByName);
    const loadedDE = new Set<string>();
    const loadedDT = new Set<string>();
    while (pending.length) {
        const item = pending.shift()!;
        if (item.kind === "effect") {
            result.prefabReferences.push(item);
            continue;
        }
        const loaded = item.kind === "damage-effect" ? loadedDE : loadedDT;
        if (loaded.has(item.name))
            continue;
        loaded.add(item.name);
        const definitions = (item.kind === "damage-effect" ? index.damageEffects : index.damageTemplates)[item.name] ?? [];
        const definitionLayers = definitions.map(definitionLayer).filter((layer): layer is NativeSourceLayer => layer !== null);
        if (!definitionLayers.length || definitionLayers.length !== definitions.length) {
            result.unresolved.push({ kind: "referenced-source-missing", message: `Missing ${item.kind}: ${item.name}`, sourcePaths: item.sourcePaths });
            continue;
        }
        if (item.kind === "damage-template") {
            const damage = normalizeDamageTemplate(item.name, definitionLayers, index.damageLoadOrder);
            result.damageTemplates[item.name] = damage;
            result.unresolved.push(...damage.unresolved);
            pending.push(...damage.hitEffects, ...damage.additionalDamage);
        }
        else if (definitionLayers.length !== 1) {
            result.unresolved.push({ kind: "damage-effect-definition-order", message: `Multiple native definitions for ${item.name}`, sourcePaths: definitionLayers.map((layer) => location(layer)) });
        }
        else {
            const inherited = damageEffectLayers(item.name, index);
            result.unresolved.push(...inherited.unresolved);
            if (inherited.unresolved.length)
                continue;
            const effect: NativeDamageEffect = { ...layered(), id: item.name, statesByName: {}, deathEvents: {}, references: [] };
            for (const layer of inherited.layers)
                overlayScalars(effect, layer, new Set(["m_dicNKMState"]));
            effect.statesByName = normalizeNativeStateLayers(inherited.layers, "m_dicNKMState", "replace");
            effect.deathEvents = normalizeDeathEventLayers(inherited.layers);
            effect.references = reference(effect, "m_MainEffectName", "effect");
            const skins = damageEffectSkinReferences(effect);
            effect.references.push(...skins.references);
            result.unresolved.push(...skins.unresolved);
            result.damageEffects[item.name] = effect;
            const deathEvents = Object.values(effect.deathEvents).flat();
            result.unresolved.push(...deathEvents.flatMap(event => event.unresolved));
            pending.push(...effect.references, ...stateReferences(effect.statesByName), ...deathEvents.flatMap(event => event.references));
        }
    }
    resultCache.set(unitStrId, result);
    return result;
}
