import source from "../data/collection-profile-summary.json";
import { measureCollectionProfileText } from "./collectionProfileText";
export type SummaryTag = {
    label: string;
    value: string;
    values?: string[];
    iconPath?: string;
    infoTab: "basic" | "attack" | "tag";
    isAttack?: boolean;
};
export type CollectionSummaryData = {
    kind?: "character" | "operator";
    name: string;
    title: string;
    grade: string;
    gradeColor: string;
    imagePath?: string | null;
    voiceActor?: string;
    unitType?: string;
    cost?: string;
    respawnCountText?: string;
    tags?: SummaryTag[];
};
export type SummaryLayer = {
    kind: "image" | "text";
    rect: number[];
    nodeName: string;
    hierarchy: string;
    src?: string;
    text?: string;
    originalSprite?: string;
    originalObject?: string;
    originalTextComponent?: string;
    rotation?: number;
    pivot?: number[];
    blend?: string;
    fontSize?: number;
    minSize?: number;
    bestFit?: boolean;
    bold?: boolean;
    horizontal?: number;
    vertical?: number;
    color?: number[];
    cssColor?: string;
    shadows?: Array<{
        type: string;
        color: number[];
        offset: number[];
    }>;
};
export type SummaryHitArea = {
    rect: number[];
    label: string;
    tab: SummaryTag["infoTab"];
};
const templates = source.scenes as unknown as Record<"character" | "operator", {
    layers: SummaryLayer[];
}>;
const raritySprites = source.rarities as Record<string, {
    src: string;
}>;
const rarityGlows = source.rarityGlows as Record<string, {
    src: string;
    rect: number[];
}>;
// NKCUtil.GetColorForUnitGrade (06004680), used by NKCUICharInfoSummary.SetData.
const unitGradeColors: Record<string, number[]> = {
    N: [171, 171, 171, 255],
    R: [0, 144, 255, 255],
    SR: [192, 0, 255, 255],
    SSR: [255, 192, 1, 255],
};
const groupLabels: Record<string, string> = {
    NKM_UI_UNIT_CLASS: "클래스",
    NKM_UI_UNIT_BATTLE_TYPE: "이동 타입",
    NKM_UI_UNIT_BATTLE_TYPE_ATK: "공격타입",
    WEAK_TAG: "근원성",
};
function tagGroup(layer: SummaryLayer) {
    return layer.hierarchy.split("/").find(part => part in groupLabels);
}
function tagValue(tag: SummaryTag) {
    return tag.values?.length ? tag.values.join(" · ") : tag.value;
}
function bindTag(layer: SummaryLayer, tag: SummaryTag): SummaryLayer | null {
    if (layer.kind === "text")
        return { ...layer, text: tagValue(tag), bestFit: true, minSize: 14 };
    if (/icon/i.test(layer.nodeName))
        return tag.iconPath ? { ...layer, src: tag.iconPath } : null;
    return layer;
}
/** Approved client-derived layout, bound to the current employee's data. */
export function collectionProfileSummaryScene(data: CollectionSummaryData) {
    const kind = data.kind ?? "character";
    const tags = new Map((data.tags ?? []).filter(tag => tagValue(tag)).map(tag => [tag.label, tag]));
    const layers: SummaryLayer[] = [];
    const hitAreas: SummaryHitArea[] = [];
    for (const original of templates[kind].layers) {
        let layer = { ...original, rect: [...original.rect] };
        const group = tagGroup(layer);
        if (group) {
            const tag = tags.get(groupLabels[group]);
            if (!tag)
                continue;
            const bound = bindTag(layer, tag);
            if (!bound)
                continue;
            layer = bound;
            if (layer.originalSprite === "AB_UI_COLLECTION_DOT") {
                hitAreas.push({ rect: layer.rect, label: tagValue(tag), tab: tag.infoTab });
            }
        }
        else if (layer.hierarchy.includes("/UNIT_INFO_VOICE_ACTOR/")) {
            if (!data.voiceActor)
                continue;
            if (layer.nodeName === "VOICE_ACTOR_NAME") {
                layer.text = data.voiceActor;
                layer.rect[2] = source.viewBox[0] + source.viewBox[2] - 20 - layer.rect[0];
                layer.bestFit = true;
                layer.minSize = 14;
            }
        }
        else if (layer.nodeName === "NKM_UI_UNIT_INFO_DESC_SUMMARY_NAME") {
            layer.text = data.name + (data.respawnCountText ? ` ${data.respawnCountText.trim()}` : "");
        }
        else if (layer.nodeName === "NKM_UI_UNIT_INFO_DESC_SUMMARY_TITLE") {
            layer.text = data.title;
        }
        else if (layer.nodeName === "NKM_UI_UNIT_INFO_DESC_SUMMARY_COST_Text") {
            layer.text = data.cost ?? "-";
        }
        else if (layer.nodeName === "NKM_UI_UNIT_INFO_DESC_SUMMARY_CLASS_MARK_COUNTER_TEXT") {
            if (!data.unitType)
                continue;
            layer.text = `[${data.unitType}]`;
            layer.color = unitGradeColors[data.grade] ?? [255, 255, 255, 255];
            const size = layer.fontSize ?? 26;
            const [x, y, , height] = layer.rect;
            hitAreas.push({
                rect: [x, y + (height - size) / 2, measureCollectionProfileText(layer.text, size, 0, "main"), size],
                label: data.unitType,
                tab: "basic",
            });
        }
        else if (layer.nodeName === "Rarity_icon") {
            const rarity = raritySprites[data.grade];
            if (!rarity)
                continue;
            layer.src = rarity.src;
        }
        else if (layer.nodeName === "FX - Light") {
            const glow = rarityGlows[data.grade];
            if (!glow)
                continue;
            layer.src = glow.src;
            layer.rect = [...glow.rect];
        }
        layers.push(layer);
    }
    // The empty second cell in the attack row accommodates native special tags.
    // Reuse the approved cell's icon/text proportions instead of another UI style.
    const special = kind === "character" ? tags.get("특수 태그") : undefined;
    if (special) {
        for (const original of templates.character.layers.filter(layer => tagGroup(layer) === "NKM_UI_UNIT_BATTLE_TYPE")) {
            const layer = bindTag({ ...original, rect: [...original.rect] }, special);
            if (!layer)
                continue;
            layer.rect[1] += 54;
            if (layer.originalSprite === "AB_UI_COLLECTION_DOT") {
                hitAreas.push({ rect: layer.rect, label: tagValue(special), tab: special.infoTab });
            }
            layers.push(layer);
        }
    }
    return { layers, hitAreas, viewBox: [...source.viewBox], cardRect: [...source.cardRect] };
}
