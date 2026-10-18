import imageDimensions from "@/data/character-profile-image-dimensions.json";
import { publicFileExists } from "@/lib/publicAssets";
import { deploymentData } from "@/lib/deployment";
import fs from "node:fs";
import path from "node:path";
export type CharacterProfileIcon = {
    imagePath: string;
    width: number;
    height: number;
    sprite: CharacterProfileSprite;
};
export type CharacterProfileSprite = {
    width: number;
    height: number;
    textureWidth: number;
    textureHeight: number;
    offsetX: number;
    offsetY: number;
    imageIsCanvas?: boolean;
};
type UnitIconTemplate = {
    m_UnitID: number;
    m_InvenIconName?: string;
};
type SkinIconTemplate = {
    m_SkinID: number;
    m_bEnable?: boolean;
    m_InvenIconName?: string;
    m_SkinGrade: string;
};
let cachedIconNames: Map<number, string> | undefined;
const cachedIcons = new Map<number, CharacterProfileIcon | null>();
const cachedNamedIcons = new Map<string, CharacterProfileIcon | null>();
let cachedSkins: Map<number, SkinIconTemplate> | undefined;
let cachedSprites: Record<string, CharacterProfileSprite> | undefined;
function getSpriteLayout(name: string): CharacterProfileSprite {
    if (!cachedSprites) {
        const manifest = deploymentData(JSON.parse(fs.readFileSync(path.join(process.cwd(), "json/character/profile_icon_sprite_layouts.json"), "utf8"))) as {
            sprites: Record<string, CharacterProfileSprite>;
        };
        cachedSprites = manifest.sprites;
    }
    const sprite = cachedSprites[name];
    if (!sprite)
        throw new Error(`Missing original profile sprite layout: ${name}`);
    return sprite;
}
/** Unity UI Image fits the logical Sprite.rect, then applies its trimmed padding. */
export function getCharacterProfileSpriteStyle(sprite: CharacterProfileSprite, preserveAspect: boolean) {
    const scale = 1 / Math.max(sprite.width, sprite.height);
    const width = preserveAspect ? sprite.width * scale : 1;
    const height = preserveAspect ? sprite.height * scale : 1;
    // A few original PNGs already include the transparent canvas; do not pad twice.
    const offsetX = sprite.imageIsCanvas ? 0 : sprite.offsetX;
    const offsetY = sprite.imageIsCanvas ? 0 : sprite.offsetY;
    const textureWidth = sprite.imageIsCanvas ? sprite.width : sprite.textureWidth;
    const textureHeight = sprite.imageIsCanvas ? sprite.height : sprite.textureHeight;
    return {
        left: `${100 * ((1 - width) / 2 + width * offsetX / sprite.width)}%`,
        top: `${100 * ((1 - height) / 2 + height * (sprite.height - offsetY - textureHeight) / sprite.height)}%`,
        width: `${100 * width * textureWidth / sprite.width}%`,
        height: `${100 * height * textureHeight / sprite.height}%`,
    };
}
export function getCharacterProfileBackground(grade: string) {
    if (!["N", "R", "SR", "SSR"].includes(grade))
        return null;
    const name = `AB_INVEN_ICON_FRAME_${grade}`;
    return {
        imagePath: `/unit/unit_icon_bg/${name}.png`,
        sprite: getSpriteLayout(name),
    };
}
/** Resolve the inventory portrait named by the original unit template. */
export function getCharacterProfileIcon(unitId: number): CharacterProfileIcon | null {
    if (cachedIcons.has(unitId))
        return cachedIcons.get(unitId) ?? null;
    if (!cachedIconNames) {
        cachedIconNames = new Map();
        for (const filename of [
            "json/004_LUA_UNIT_TEMPLET_BASE_h.json",
            "json/character/006_LUA_UNIT_TEMPLET_BASE6_g.json",
        ]) {
            const table = deploymentData(JSON.parse(fs.readFileSync(path.join(process.cwd(), filename), "utf8"))) as {
                data: UnitIconTemplate[];
            };
            for (const row of table.data) {
                if (row.m_InvenIconName)
                    cachedIconNames.set(row.m_UnitID, row.m_InvenIconName);
            }
        }
    }
    const iconName = cachedIconNames.get(unitId);
    if (!iconName) {
        cachedIcons.set(unitId, null);
        return null;
    }
    const icon = getProfileIconByName(iconName);
    cachedIcons.set(unitId, icon);
    return icon;
}
/** NKCUISlot.SetSkinData uses the skin's own portrait and skin-grade frame. */
export function getCharacterSkinProfileIcon(skinId: number): {
    icon: CharacterProfileIcon;
    grade: string;
} | null {
    if (!cachedSkins) {
        const table = deploymentData(JSON.parse(fs.readFileSync(path.join(process.cwd(), "json/character/064_LUA_SKIN_TEMPLET_m.json"), "utf8"))) as {
            data: SkinIconTemplate[];
        };
        cachedSkins = new Map(table.data.map((skin) => [skin.m_SkinID, skin]));
    }
    const skin = cachedSkins.get(skinId);
    if (!skin?.m_bEnable || !skin.m_InvenIconName)
        return null;
    const grades: Record<string, string> = {
        SG_VARIATION: "N",
        SG_NORMAL: "R",
        SG_RARE: "SR",
        SG_PREMIUM: "SSR",
        SG_SPECIAL: "SSR",
    };
    const grade = grades[skin.m_SkinGrade];
    if (!grade)
        return null;
    const icon = getProfileIconByName(skin.m_InvenIconName);
    return icon ? { icon, grade } : null;
}
function getProfileIconByName(iconName: string): CharacterProfileIcon | null {
    if (cachedNamedIcons.has(iconName))
        return cachedNamedIcons.get(iconName) ?? null;
    const imagePath = `/unit/unit_icon/${iconName}.png`;
    const filename = path.join(process.cwd(), "public", imagePath);
    if (!publicFileExists(filename)) {
        cachedNamedIcons.set(iconName, null);
        return null;
    }
    // PNGs contain only the trimmed texture. Sprite metadata restores their logical canvas.
    const dimensions = (imageDimensions as Record<string, { width: number; height: number }>)[iconName];
    if (!dimensions) throw new Error(`Missing original character profile icon dimensions: ${imagePath}`);
    const icon = {
        imagePath,
        width: dimensions.width,
        height: dimensions.height,
        sprite: getSpriteLayout(iconName),
    };
    cachedNamedIcons.set(iconName, icon);
    return icon;
}
