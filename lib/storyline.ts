import { publicFileExists } from "@/lib/publicAssets";
import { deploymentData } from "@/lib/deployment";
import fs from "node:fs";
import path from "node:path";
import { getMusicAssetAudioPath, getMusicTitle } from "@/lib/music";
export type StorylinePoint = {
    x: number;
    y: number;
};
export type StorylineWebRect = {
    centerX: number;
    centerY: number;
    left: number;
    top: number;
    width: number;
    height: number;
};
export type StorylineNode = {
    order: number;
    episodeId: number;
    episodeStrId: string;
    titleKo: string;
    subtitleKo: string;
    categoryKo: string;
    navigationGroup: "side" | "supplement";
    sortIndex: number;
    descriptionKo: string;
    bgmName: string;
    bgmTitleKo: string;
    bgmPath: string;
    connectEpisodeIds: number[];
    detailImageUrl: string;
    shortcutThumbnail: {
        sprite: string;
        url: string;
    } | null;
    sourceVisual: {
        firstBattleLevel: number;
        titleColor: {
            r: number;
            g: number;
            b: number;
            a: number;
        };
    };
    unity: {
        anchoredPosition: StorylinePoint;
    };
    web: StorylineWebRect;
    detailThumbnail: {
        file: string;
    };
    mapButton: {
        file: string;
        mode: "full-card" | "icon-with-text";
        visible: boolean;
        webPlacement: {
            left: number;
            top: number;
            width: number;
            height: number;
        };
    };
};
export type StorylineMainEpisode = {
    name: string;
    episodeId: number;
    titleKo: string;
    subtitleKo: string;
    categoryKo: string;
    descriptionKo: string;
    bgmName: string;
    bgmTitleKo: string;
    bgmPath: string;
    connectEpisodeIds: number[];
    detailImageUrl: string;
    web: StorylineWebRect;
};
export type StorylineSeasonalEpisode = {
    episodeId: number;
    episodeStrId: string;
    sortIndex: number;
    titleKo: string;
    subtitleKo: string;
    categoryKo: string;
    descriptionKo: string;
    bgmName: string;
    bgmTitleKo: string;
    bgmPath: string;
    connectEpisodeIds: number[];
    detailImageUrl: string;
};
export type StorylineOmenShortcut = {
    name: "전조";
    titleKo: "전조";
    unity: {
        anchoredPosition: StorylinePoint;
        sizeDelta: StorylinePoint;
        anchorMin: StorylinePoint;
        anchorMax: StorylinePoint;
        pivot: StorylinePoint;
    };
    web: StorylineWebRect;
    button: {
        touchSize: number;
        trackingTime: number;
        selectByClick: false;
        sound: "FX_UI_BUTTON_SELECT";
    };
    shortcut: {
        type: 53;
        parameter: string;
        force: false;
        prefab: "UI_EC_SIDESTORY_OMEN";
        baseRect: "UIFrontCommon";
    };
    thumbnail: {
        sprite: "SUB_THUMB_BIG_OMEN";
        file: "SUB_THUMB_BIG_OMEN.png";
        unity: {
            anchoredPosition: StorylinePoint;
            sizeDelta: StorylinePoint;
        };
        webPlacement: {
            left: number;
            top: number;
            width: number;
            height: number;
        };
    };
    title: {
        unity: {
            anchoredPosition: StorylinePoint;
            sizeDelta: StorylinePoint;
            anchorMin: StorylinePoint;
            anchorMax: StorylinePoint;
            pivot: StorylinePoint;
        };
        fontSize: 30;
        characterSpacing: -5;
        color: {
            r: number;
            g: number;
            b: number;
            a: number;
        };
    };
};
export type StorylineOmenEpisode = StorylineSeasonalEpisode & {
    slotName: string;
    requiredStep: number;
    areaNameKo: string;
    mapIconFile: string;
    popupPosition: StorylinePoint;
};
export type StorylineConnection = {
    name: string;
    unity: {
        lineThickness: number;
        color: {
            r: number;
            g: number;
            b: number;
            a: number;
        };
    };
    webPoints: StorylinePoint[];
};
export type StorylineScreenLayers = {
    background: {
        file: string;
        web: {
            placement: "viewport";
            inset: number;
            objectFit: "fill";
            movesWithTimeline: false;
        };
    };
    vignette: {
        file: string;
        unity: {
            tint: {
                r: number;
                g: number;
                b: number;
                a: number;
            };
        };
        web: {
            placement: "viewportOverlay";
            movesWithTimeline: false;
        };
    };
    mapAreaDecoration: {
        file: string;
        imageSize: {
            width: number;
            height: number;
        };
        unity: {
            anchoredPosition: StorylinePoint;
        };
        web: {
            placement: "timelineCanvas";
            movesWithTimeline: true;
        };
    };
};
export type StorylineLayout = {
    metadata: {
        canvas: {
            width: number;
            height: number;
        };
        nodeCount: number;
        mainEpisodeCount: number;
        lineRendererCount: number;
    };
    navigation: {
        seasonalEpisodeId: number;
        counterCaseEpisodeId: number;
    };
    seasonalEpisodes: StorylineSeasonalEpisode[];
    omenShortcut: StorylineOmenShortcut;
    omenEpisodes: StorylineOmenEpisode[];
    screenLayers: StorylineScreenLayers;
    nodes: StorylineNode[];
    mainEpisodes: StorylineMainEpisode[];
    lineRenderers: StorylineConnection[];
};
type RawStorylineLayout = Omit<StorylineLayout, "nodes" | "mainEpisodes" | "navigation" | "seasonalEpisodes" | "omenEpisodes"> & {
    nodes: Array<Omit<StorylineNode, "descriptionKo" | "categoryKo" | "navigationGroup" | "sortIndex" | "bgmName" | "bgmTitleKo" | "bgmPath" | "detailImageUrl" | "shortcutThumbnail">>;
    mainEpisodes: Array<Omit<StorylineMainEpisode, "titleKo" | "subtitleKo" | "descriptionKo" | "categoryKo" | "bgmName" | "bgmTitleKo" | "bgmPath" | "connectEpisodeIds" | "detailImageUrl">>;
};
const OMEN_POPUP_SLOTS = [
    {
        slotName: "01_CAMPAMENTO",
        episodeId: 1043,
        requiredStep: 2,
        areaNameKo: "캄파멘토",
        mapIconFile: "UI_SUB_LIST_MAP_01.png",
        popupPosition: { x: 704, y: -128.599976 },
    },
    {
        slotName: "02_LOTUS",
        episodeId: 1044,
        requiredStep: 3,
        areaNameKo: "로터스",
        mapIconFile: "UI_SUB_LIST_MAP_02.png",
        popupPosition: { x: -655.5, y: -32.199974 },
    },
    {
        slotName: "03_CHAMBER",
        episodeId: 1045,
        requiredStep: 4,
        areaNameKo: "챔버",
        mapIconFile: "UI_SUB_LIST_MAP_04.png",
        popupPosition: { x: 475, y: 172.100021 },
    },
    {
        slotName: "04_FRONTBAY",
        episodeId: 1046,
        requiredStep: 5,
        areaNameKo: "프론트 베이",
        mapIconFile: "UI_SUB_LIST_MAP_03.png",
        popupPosition: { x: -26.799999, y: -264.099976 },
    },
    {
        slotName: "05_CHARADE",
        episodeId: 1047,
        requiredStep: 6,
        areaNameKo: "샤레이드",
        mapIconFile: "UI_SUB_LIST_MAP_05.png",
        popupPosition: { x: -445.200012, y: 224.900024 },
    },
    {
        slotName: "06_ADC_G1",
        episodeId: 1048,
        requiredStep: 7,
        areaNameKo: "ADC-G1",
        mapIconFile: "UI_SUB_LIST_MAP_06.png",
        popupPosition: { x: -84, y: 152 },
    },
] as const;
type EpisodeRow = {
    m_EpisodeID?: number;
    m_Difficulty?: string;
    m_EpisodeStrID?: string;
    m_EpisodeTitle?: string;
    m_EpisodeName?: string;
    m_EPCategory?: string;
    m_SortIndex?: number;
    m_bSupplement?: boolean;
    m_EpisodeDesc_1?: string;
    m_EPThumbnail?: string;
    m_EPThumbnail_SUB_Node?: string;
    m_BG_Music?: string;
    m_OpenTag?: string;
    Connect_EpisodeID?: number[];
};
type EpisodeTable = {
    data?: EpisodeRow[];
};
type TextTable = {
    data?: unknown[];
};
const STORY_FILE_PATHS = {
    layout: path.join(process.cwd(), "json", "story", "스토리라인_레이아웃.json"),
    episodes: path.join(process.cwd(), "json", "story", "148_LUA_EPISODE_TEMPLET_V6_g.json"),
    koreanText: path.join(process.cwd(), "json", "story", "021_LUA_SI_EPISODE_TEMPLET_KOREA_z.json"),
    dynamicKoreanText: path.join(process.cwd(), "json", "KR", "018_LUA_SI_DYNAMIC_PREFAB_KOREA_a.json"),
};
function readStoryJson<T>(filePath: string) {
    if (!publicFileExists(filePath)) {
        return null;
    }
    try {
        return deploymentData(JSON.parse(fs.readFileSync(filePath, "utf8"))) as T;
    }
    catch {
        return null;
    }
}
function createTextMap(...tables: Array<TextTable | null>) {
    const textMap = new Map<string, string>();
    for (const table of tables) {
        for (const row of table?.data ?? []) {
            if (Array.isArray(row) &&
                typeof row[0] === "string" &&
                typeof row[1] === "string") {
                textMap.set(row[0], row[1]);
            }
        }
    }
    return textMap;
}
function getEpisodeData(episodeId: number, episodeRows: EpisodeRow[], textMap: Map<string, string>) {
    const matchingRows = episodeRows.filter((episode) => episode.m_EpisodeID === episodeId);
    const episode = matchingRows.find((row) => row.m_Difficulty === "NORMAL") ??
        matchingRows[0];
    const bgmName = episode?.m_BG_Music?.trim() ?? "";
    const backgroundName = episode?.m_EPThumbnail?.trim() ?? "";
    const backgroundFile = backgroundName
        ? `${backgroundName.toLocaleLowerCase("en-US")}.png`
        : "";
    const backgroundPublicPath = backgroundFile
        ? path.join(process.cwd(), "public", "story", "reader", "episodes", backgroundFile)
        : "";
    // STV-CHR-019: the original popup splits EC_SIDESTORY by the episode
    // template's m_bIsSupplement field, not by account progress or tag text.
    const isSupplement = episode?.m_EPCategory === "EC_SIDESTORY" &&
        Boolean(episode.m_bSupplement);
    const categoryKey = isSupplement
        ? "SI_DP_EPISODE_SUPPLEMENT"
        : episode?.m_EPCategory
            ? `SI_EPISODE_CATEGORY_${episode.m_EPCategory}`
            : "";
    const shortcutThumbnailSprite = episode?.m_EPCategory === "EC_SIDESTORY" && !isSupplement
        ? (episode.m_EPThumbnail_SUB_Node?.trim() ?? "")
        : "";
    return {
        titleKo: episode?.m_EpisodeTitle
            ? (textMap.get(episode.m_EpisodeTitle) ?? "")
            : "",
        subtitleKo: episode?.m_EpisodeName
            ? (textMap.get(episode.m_EpisodeName) ?? "")
            : "",
        categoryKo: categoryKey
            ? (textMap.get(categoryKey) ?? episode?.m_EPCategory ?? "")
            : "",
        navigationGroup: (isSupplement ? "supplement" : "side") as StorylineNode["navigationGroup"],
        sortIndex: episode?.m_SortIndex ?? Number.MAX_SAFE_INTEGER,
        descriptionKo: episode?.m_EpisodeDesc_1
            ? (textMap.get(episode.m_EpisodeDesc_1) ?? "")
            : "",
        bgmName,
        bgmTitleKo: getMusicTitle(bgmName),
        bgmPath: getMusicAssetAudioPath(bgmName),
        connectEpisodeIds: [...(episode?.Connect_EpisodeID ?? [])].sort((left, right) => left - right),
        detailImageUrl: backgroundPublicPath && publicFileExists(backgroundPublicPath)
            ? `/story/reader/episodes/${backgroundFile}`
            : "",
        shortcutThumbnail: shortcutThumbnailSprite
            ? {
                sprite: shortcutThumbnailSprite,
                url: `/story/map-ui/shortcut-slots/${shortcutThumbnailSprite}.png`,
            }
            : null,
    };
}
export function loadStorylineLayout(): StorylineLayout | null {
    const layout = readStoryJson<RawStorylineLayout>(STORY_FILE_PATHS.layout);
    if (!layout) {
        return null;
    }
    const episodeTable = readStoryJson<EpisodeTable>(STORY_FILE_PATHS.episodes);
    const textMap = createTextMap(readStoryJson<TextTable>(STORY_FILE_PATHS.koreanText), readStoryJson<TextTable>(STORY_FILE_PATHS.dynamicKoreanText));
    const episodeRows = episodeTable?.data ?? [];
    const normalEpisodes = episodeRows.filter((episode) => episode.m_Difficulty === "NORMAL");
    const seasonalEpisodes = normalEpisodes
        .filter((episode) => episode.m_EPCategory === "EC_SEASONAL")
        .sort((left, right) => (left.m_SortIndex ?? Number.MAX_SAFE_INTEGER) -
        (right.m_SortIndex ?? Number.MAX_SAFE_INTEGER) ||
        (left.m_EpisodeID ?? Number.MAX_SAFE_INTEGER) -
            (right.m_EpisodeID ?? Number.MAX_SAFE_INTEGER));
    const counterCaseEpisode = normalEpisodes.find((episode) => episode.m_EPCategory === "EC_COUNTERCASE");
    const omenEpisodeById = new Map(normalEpisodes
        .filter((episode) => episode.m_EPCategory === "EC_SIDESTORY_OMEN")
        .flatMap((episode) => episode.m_EpisodeID ? [[episode.m_EpisodeID, episode] as const] : []));
    return {
        ...layout,
        navigation: {
            seasonalEpisodeId: seasonalEpisodes[0]?.m_EpisodeID ?? 0,
            counterCaseEpisodeId: counterCaseEpisode?.m_EpisodeID ?? 0,
        },
        seasonalEpisodes: seasonalEpisodes.flatMap((episode) => {
            if (!episode.m_EpisodeID) {
                return [];
            }
            const { titleKo, subtitleKo, categoryKo, descriptionKo, bgmName, bgmTitleKo, bgmPath, connectEpisodeIds, detailImageUrl, } = getEpisodeData(episode.m_EpisodeID, episodeRows, textMap);
            return [
                {
                    episodeId: episode.m_EpisodeID,
                    episodeStrId: episode.m_EpisodeStrID ?? "",
                    sortIndex: episode.m_SortIndex ?? Number.MAX_SAFE_INTEGER,
                    titleKo,
                    subtitleKo,
                    categoryKo,
                    descriptionKo,
                    bgmName,
                    bgmTitleKo,
                    bgmPath,
                    connectEpisodeIds,
                    detailImageUrl,
                },
            ];
        }),
        omenEpisodes: OMEN_POPUP_SLOTS.flatMap((slot) => {
            const episode = omenEpisodeById.get(slot.episodeId);
            if (!episode) {
                return [];
            }
            const { titleKo, subtitleKo, categoryKo, descriptionKo, bgmName, bgmTitleKo, bgmPath, connectEpisodeIds, detailImageUrl, } = getEpisodeData(slot.episodeId, episodeRows, textMap);
            return [
                {
                    ...slot,
                    episodeStrId: episode.m_EpisodeStrID ?? "",
                    sortIndex: episode.m_SortIndex ?? Number.MAX_SAFE_INTEGER,
                    titleKo,
                    subtitleKo,
                    categoryKo,
                    descriptionKo,
                    bgmName,
                    bgmTitleKo,
                    bgmPath,
                    connectEpisodeIds,
                    detailImageUrl,
                },
            ];
        }),
        nodes: layout.nodes.map((node) => {
            const { categoryKo, navigationGroup, sortIndex, descriptionKo, bgmName, bgmTitleKo, bgmPath, shortcutThumbnail, } = getEpisodeData(node.episodeId, episodeRows, textMap);
            return {
                ...node,
                categoryKo,
                navigationGroup,
                sortIndex,
                descriptionKo,
                bgmName,
                bgmTitleKo,
                bgmPath,
                shortcutThumbnail,
                detailImageUrl: `/story/detail-thumbnails/${node.detailThumbnail.file}`,
            };
        }),
        mainEpisodes: layout.mainEpisodes.map((episode) => {
            const { titleKo, subtitleKo, categoryKo, descriptionKo, bgmName, bgmTitleKo, bgmPath, detailImageUrl, } = getEpisodeData(episode.episodeId, episodeRows, textMap);
            return {
                ...episode,
                titleKo,
                subtitleKo,
                categoryKo,
                descriptionKo,
                bgmName,
                bgmTitleKo,
                bgmPath,
                // STV-CHR-016: no direct main-stream list was exported with the
                // chronicle layout, so do not synthesize one from reverse links.
                connectEpisodeIds: [],
                detailImageUrl,
            };
        }),
    };
}
