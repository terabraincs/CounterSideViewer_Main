import { publicFileExists } from "@/lib/publicAssets";
import fs from "node:fs";
import path from "node:path";
import type { SpineBackgroundLayer, SpineModel } from "@/components/SpineViewer";
type UnitRow = {
    unitId: number;
    unitStrId?: string;
    nameKey?: string;
};
type UnitTemplate = {
    m_UnitID?: number;
    m_UnitStrID?: string;
    m_BaseUnitID?: number;
    m_NKM_UNIT_STYLE_TYPE?: string;
    m_SpriteBundleName?: string;
    m_SpineSDName?: string;
    m_SpineIllustName?: string;
};
type SkinTemplate = {
    m_bEnable?: boolean;
    m_SkinID?: number;
    m_SkinStrID?: string;
    m_SkinEquipUnitID?: number;
    m_Title?: string;
    m_SpriteBundleName?: string;
    m_SpineSDName?: string;
    m_SpineIllustName?: string;
};
type JsonTable<T> = {
    data?: T[];
};
type TextTable = {
    data?: unknown[];
    m_dicString?: Record<string, string>;
};
type IllustrationBindings = {
    schemaVersion: 1;
    bundles: Record<string, {
        primaryModelIds: string[];
        initialSkinName: string;
        backgroundLayers?: {
            modelIds: string[];
            initialSkinName: string;
            startingAnimation: string;
            startingLoop: boolean;
            transform: SpineBackgroundLayer["transform"];
        }[];
    }>;
};
type CutinModelBinding = {
    modelId: string;
    animation?: string;
    skin?: string;
};
type CutinBindings = {
    schemaVersion: 1;
    units: Record<string, {
        base: CutinModelBinding[];
        skins: Record<string, CutinModelBinding[]>;
    }>;
};
export type CharacterSpineModel = SpineModel & {
    initialState?: {
        skin?: string;
        animation?: string;
    };
    backgroundLayers?: SpineBackgroundLayer[];
};
export type CharacterSpineCostume = {
    id: number;
    skinStrId: string;
    label: string;
    combat: CharacterSpineModel[];
    sd: CharacterSpineModel[];
    illustration: CharacterSpineModel[];
    cutin: CharacterSpineModel[];
};
export type CharacterSpineModels = {
    combat: CharacterSpineModel[];
    sd: CharacterSpineModel[];
    illustration: CharacterSpineModel[];
    cutin: CharacterSpineModel[];
    costumes: CharacterSpineCostume[];
};
export type CharacterSpineMode = "combat" | "sd" | "illustration" | "cutin";
let cachedModels: Map<string, CharacterSpineModels> | null = null;
function readJson<T>(filePath: string): T | null {
    try {
        return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
    }
    catch {
        return null;
    }
}
function readLocalJson<T>(projectRoot: string, fileName: string): T | null {
    for (const directory of [
        ["json", "character"],
        ["json", "KR", "character"],
        ["json"],
        ["json", "KR"],
    ]) {
        const filePath = path.join(projectRoot, ...directory, fileName);
        if (publicFileExists(filePath)) {
            return readJson<T>(filePath);
        }
    }
    return null;
}
function hasPublicFile(url: string) {
    try {
        if (!url.startsWith("/spine/")) {
            return false;
        }
        // These PNG/atlas/JSON payloads are served from public/spine separately.
        // Check their availability at runtime without tracing the entire asset
        // directory into every character's server bundle (same as voice.ts).
        const spineRoot = path.join(
        /* turbopackIgnore: true */ process.cwd(), "public", "spine");
        const filePath = path.resolve(
        /* turbopackIgnore: true */ spineRoot, decodeURIComponent(url.slice("/spine/".length)));
        const relativePath = path.relative(spineRoot, filePath);
        if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
            return false;
        }
        return publicFileExists(filePath);
    }
    catch {
        return false;
    }
}
function createUnitNames(table: TextTable | null) {
    const names = new Map<string, string>();
    for (const row of table?.data ?? []) {
        if (Array.isArray(row) &&
            typeof row[0] === "string" &&
            typeof row[1] === "string") {
            names.set(row[0], row[1]);
        }
    }
    for (const [key, value] of Object.entries(table?.m_dicString ?? {})) {
        if (typeof value === "string") {
            names.set(key, value);
        }
    }
    return names;
}
function sourceVariantLabel(model: SpineModel, index: number) {
    const source = /__(assetbundles|streamingassets)__CAB-[a-f0-9]+$/i.exec(model.variant)?.[1]?.toLowerCase();
    if (source === "assetbundles") {
        return "Assetbundles";
    }
    if (source === "streamingassets") {
        return "StreamingAssets";
    }
    return String(index + 1);
}
function loadCharacterSpineModels() {
    const projectRoot = process.cwd();
    const units = readLocalJson<UnitRow[]>(projectRoot, "merged_units.json") ?? [];
    const templates = [
        ...(readLocalJson<JsonTable<UnitTemplate>>(projectRoot, "004_LUA_UNIT_TEMPLET_BASE_h.json")?.data ?? []),
        ...(readLocalJson<JsonTable<UnitTemplate>>(projectRoot, "006_LUA_UNIT_TEMPLET_BASE6_g.json")?.data ?? []),
    ];
    const names = createUnitNames(readLocalJson<TextTable>(projectRoot, "002_LUA_SI_UNIT_KOREA_l.json"));
    const skinNames = createUnitNames(readLocalJson<TextTable>(projectRoot, "088_LUA_SI_SKIN_KOREA_l.json"));
    const skins = readLocalJson<JsonTable<SkinTemplate>>(projectRoot, "064_LUA_SKIN_TEMPLET_m.json")?.data ?? [];
    const manifest = readJson<{
        models?: SpineModel[];
    }>(path.join(projectRoot, "public", "spine", "manifest.json"));
    const illustrationBindings = readLocalJson<IllustrationBindings>(projectRoot, "spine-illustration-bindings.json");
    const cutinBindings = readLocalJson<CutinBindings>(projectRoot, "spine-cutin-bindings.json");
    const modelsById = new Map((manifest?.models ?? []).map((model) => [model.id, model]));
    const modelsByBundle = new Map<string, SpineModel[]>();
    for (const model of manifest?.models ?? []) {
        if (model.kind !== "spine") {
            continue;
        }
        const key = model.bundle.toLowerCase();
        const models = modelsByBundle.get(key) ?? [];
        models.push(model);
        modelsByBundle.set(key, models);
    }
    const fileAvailability = new Map<string, boolean>();
    function isAvailable(model: SpineModel) {
        if (!fileAvailability.has(model.id)) {
            fileAvailability.set(model.id, [model.jsonUrl, model.atlasUrl, model.textureUrl].every(hasPublicFile));
        }
        return fileAvailability.get(model.id) === true;
    }
    function selectCutinModels(unitStrId: string, skinId: number, label: string): CharacterSpineModel[] {
        if (cutinBindings?.schemaVersion !== 1)
            return [];
        const unit = cutinBindings.units[unitStrId];
        // The extracted event/prefab bindings already apply GetSkillCutin's exact
        // skin override and default-resource fallback. Never infer a bundle name.
        const bindings = (skinId ? unit?.skins[String(skinId)] : unit?.base) ?? [];
        const selected = bindings.flatMap((binding) => {
            const model = modelsById.get(binding.modelId);
            if (model?.kind !== "spine" || !isAvailable(model))
                return [];
            return [{
                    ...model,
                    initialState: { animation: binding.animation, skin: binding.skin },
                }];
        });
        return selected.map((model, index) => ({
            ...model,
            displayName: `${label} · 컷인${selected.length > 1 ? ` (${sourceVariantLabel(model, index)})` : ""}`,
        }));
    }
    function selectModels(bundle: string | undefined, mode: Exclude<CharacterSpineMode, "cutin">, label: string, costume = false): CharacterSpineModel[] {
        if (!bundle)
            return [];
        const binding = mode === "illustration" && illustrationBindings?.schemaVersion === 1
            ? illustrationBindings.bundles[bundle.toLowerCase()] : undefined;
        const primaryIds = binding?.primaryModelIds ?? [];
        // NKCASUISpineIllust selects the main SkeletonGraphic through the original
        // prefab. Its SkeletonDataAsset can also point into another unit's bundle.
        if (mode === "illustration" && !primaryIds.length)
            return [];
        const primaryModels = primaryIds.flatMap((id) => {
            const model = modelsById.get(id);
            return model?.kind === "spine" ? [model] : [];
        });
        const candidates = [...primaryModels,
            ...(modelsByBundle.get(bundle.toLowerCase()) ?? []).filter((model) => !primaryIds.includes(model.id))];
        const models = candidates.filter((model) => {
            const categories = model.categories ?? [model.category];
            // Some costumes belong to a base unit absent from merged_units (e.g.
            // Lancelot). Their original bundle is classified as other_sd/other_combat.
            if (!categories.includes(mode) &&
                !((costume || primaryIds.includes(model.id)) && categories.includes(`other_${mode}`))) {
                return false;
            }
            return isAvailable(model);
        });
        const backgroundBindings = binding?.backgroundLayers ?? [];
        const backgroundIds = new Set(backgroundBindings.flatMap((layer) => layer.modelIds));
        const foregroundModels = models.filter((model) => !backgroundIds.has(model.id));
        const backgroundModels = models.filter((model) => backgroundIds.has(model.id));
        // Only an original SPINE_BG reference adds a layer. Extra skeletons and
        // alternate source copies remain independent selectable models.
        return models.map((model) => {
            const backgroundBinding = backgroundBindings.find((layer) => layer.modelIds.includes(model.id));
            const peers = backgroundBinding ? backgroundModels : foregroundModels;
            const suffix = peers.length > 1 ? ` (${sourceVariantLabel(model, peers.indexOf(model))})` : "";
            const backgroundLayers: SpineBackgroundLayer[] = primaryIds.includes(model.id)
                ? backgroundBindings.flatMap((layer) => {
                    // Match an exact source variant when the original exists twice.
                    // Otherwise the catalog's resolved PPtr supplies its single model.
                    const candidates = layer.modelIds.flatMap((id) => {
                        const candidate = modelsById.get(id);
                        return candidate?.kind === "spine" && isAvailable(candidate) ? [candidate] : [];
                    });
                    const source = /__(assetbundles|streamingassets)__CAB-[a-f0-9]+$/i.exec(model.variant)?.[1]?.toLowerCase();
                    const target = candidates.length === 1 ? candidates[0] : candidates.find((candidate) => source && candidate.variant.toLowerCase().includes(`__${source}__`));
                    if (!target)
                        return [];
                    return [{
                            model: { ...target, displayName: `${label} · 배경` },
                            transform: layer.transform,
                            animation: layer.startingAnimation,
                            skin: layer.initialSkinName,
                            loop: layer.startingLoop,
                        }];
                }) : [];
            return {
                ...model,
                ...(backgroundBinding ? {
                    initialState: { skin: backgroundBinding.initialSkinName, animation: backgroundBinding.startingAnimation },
                } : primaryIds.includes(model.id) && binding?.initialSkinName
                    ? { initialState: { skin: binding.initialSkinName } } : {}),
                ...(backgroundLayers.length ? { backgroundLayers } : {}),
                displayName: `${label} · ${backgroundBinding ? "배경" : { combat: "인게임", sd: "SD", illustration: "스탠딩" }[mode]}${suffix}`,
            };
        });
    }
    const result = new Map<string, CharacterSpineModels>();
    for (const unit of units) {
        if (!unit.unitStrId) {
            continue;
        }
        // Keep the character's own template for the default model. Costume sharing
        // uses the separate NKMSkinManager.GetBaseUnitID rule below.
        const candidates = templates.filter((template) => template.m_UnitID === unit.unitId &&
            template.m_UnitStrID === unit.unitStrId);
        if (candidates.length !== 1) {
            continue;
        }
        const template = candidates[0];
        const unitName = names.get(unit.nameKey ?? "") ?? unit.unitStrId;
        // Original NKMSkinManager.GetSkinlistForCharacter calls GetBaseUnitID:
        // use m_BaseUnitID when nonzero, except NUST_TRAINER (enum value 6).
        // This also includes _RB and characters whose base has no public page.
        const skinOwnerId = template.m_BaseUnitID && template.m_NKM_UNIT_STYLE_TYPE !== "NUST_TRAINER"
            ? template.m_BaseUnitID
            : unit.unitId;
        const costumes = skins
            .filter((skin) => skin.m_bEnable === true && skin.m_SkinEquipUnitID === skinOwnerId)
            .sort((first, second) => (first.m_SkinID ?? 0) - (second.m_SkinID ?? 0))
            .flatMap((skin): CharacterSpineCostume[] => {
            if (!skin.m_SkinID || !skin.m_SkinStrID)
                return [];
            const label = skinNames.get(skin.m_Title ?? "") || skin.m_SkinStrID;
            // Missing preserved assets stay unavailable; they are not evidence that
            // the original client's resource load failed or selected another bundle.
            return [{
                    id: skin.m_SkinID,
                    skinStrId: skin.m_SkinStrID,
                    label,
                    combat: selectModels(skin.m_SpriteBundleName, "combat", label, true),
                    sd: selectModels(skin.m_SpineSDName, "sd", label, true),
                    illustration: selectModels(skin.m_SpineIllustName, "illustration", label, true),
                    cutin: selectCutinModels(unit.unitStrId!, skin.m_SkinID, label),
                }];
        });
        const selected: CharacterSpineModels = {
            combat: selectModels(template.m_SpriteBundleName, "combat", unitName),
            sd: selectModels(template.m_SpineSDName, "sd", unitName),
            illustration: selectModels(template.m_SpineIllustName, "illustration", unitName),
            cutin: selectCutinModels(unit.unitStrId, 0, unitName),
            costumes,
        };
        result.set(unit.unitStrId, selected);
    }
    return result;
}
export function getCharacterSpineModels(unitStrId: string): CharacterSpineModels {
    cachedModels ??= loadCharacterSpineModels();
    return cachedModels.get(unitStrId) ?? { combat: [], sd: [], illustration: [], cutin: [], costumes: [] };
}
