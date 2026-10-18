import { deploymentData } from "@/lib/deployment";
import fs from "node:fs";
import path from "node:path";
import catalogRaw from "@/data/character-skin-series.json";
const catalog = deploymentData(catalogRaw);
import { getCharacterSkinsForUnit, type CharacterSkin } from "@/lib/characterSkins";
type Unit = {
    idx: number;
    unitId: number;
    unitStrId?: string;
    nameKey: string;
};
export type CharacterSkinSeries = {
    id: string;
    title: string;
    skins: Array<CharacterSkin & {
        unitName: string;
    }>;
};
const includedSkinIds = new Set(catalog.series.flatMap((series) => series.skinIds.map(String)));
let cachedSeries: Map<string, CharacterSkinSeries> | null = null;
function readTable<T>(fileName: string): T {
    const file = ["json/character", "json/KR/character", "json", "json/KR"]
        .map((directory) => path.join(process.cwd(), directory, fileName))
        .find((candidate) => fs.existsSync(candidate));
    if (!file)
        throw new Error(`Missing skin series source: ${fileName}`);
    return deploymentData(JSON.parse(fs.readFileSync(file, "utf8"))) as T;
}
function buildSeries() {
    if (catalog.schemaVersion !== 1)
        throw new Error("Unsupported skin series catalog");
    const units = readTable<Unit[]>("merged_units.json");
    const names = new Map(readTable<{
        data: [
            string,
            string
        ][];
    }>("002_LUA_SI_UNIT_KOREA_l.json").data);
    const owners = new Map(readTable<{
        data: Array<{
            m_SkinID: number;
            m_SkinEquipUnitID: number;
        }>;
    }>("064_LUA_SKIN_TEMPLET_m.json").data.map((skin) => [String(skin.m_SkinID), skin.m_SkinEquipUnitID]));
    const cards = new Map<string, CharacterSkinSeries["skins"][number]>();
    for (const unit of units) {
        for (const skin of getCharacterSkinsForUnit(unit)) {
            if (!includedSkinIds.has(skin.id))
                continue;
            // Shared rearm skins link to their original owner's detail page once.
            if (cards.has(skin.id) && owners.get(skin.id) !== unit.unitId)
                continue;
            cards.set(skin.id, { ...skin, unitName: names.get(unit.nameKey) ?? unit.nameKey });
        }
    }
    const result = new Map<string, CharacterSkinSeries>();
    for (const group of catalog.series) {
        const series: CharacterSkinSeries = {
            id: group.id,
            title: group.title,
            skins: group.skinIds.map((skinId) => {
                const skin = cards.get(String(skinId));
                if (!skin)
                    throw new Error(`Missing detail page for series skin: ${skinId}`);
                return skin;
            }),
        };
        for (const skin of series.skins)
            result.set(skin.id, series);
    }
    return result;
}
export function getCharacterSkinSeries(skinId: string): CharacterSkinSeries | null {
    if (!includedSkinIds.has(skinId))
        return null;
    cachedSeries ??= buildSeries();
    return cachedSeries.get(skinId) ?? null;
}
