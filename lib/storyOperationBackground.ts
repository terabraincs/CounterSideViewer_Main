export type StoryOperationBackgroundStageMap = {
    backgroundName?: string;
    backgroundUrl?: string;
};
export type StoryOperationBackgroundEpisode = {
    id: number;
    category: string;
    backgroundName: string;
    backgroundUrl: string;
    stageMaps: Record<string, StoryOperationBackgroundStageMap>;
};
export type StoryOperationBackground = {
    name: string;
    url: string;
    act: number;
};
export function resolveStoryOperationBackground(episode: StoryOperationBackgroundEpisode | null | undefined, acts: readonly number[], selectedAct: number): StoryOperationBackground | null {
    if (!episode) {
        return null;
    }
    const usesFirstStageActBackground = episode.category === "EC_SEASONAL" ||
        (episode.category === "EC_EVENT" && episode.id === 256);
    if (usesFirstStageActBackground) {
        // STV-MAP-075/STV-MAP-076: these exact selector thumbnails do not own
        // the operation map. Use the selected ACT's first-stage m_ACT_BG_Image
        // and never fall back to the selector image on this surface because
        // Image.preserveAspect=false would stretch it across the 16:9 root.
        const activeAct = acts.includes(selectedAct) ? selectedAct : (acts[0] ?? 0);
        const stageMap = episode.stageMaps[String(activeAct)] ?? null;
        return stageMap?.backgroundUrl
            ? {
                name: stageMap.backgroundName ?? "",
                url: stageMap.backgroundUrl,
                act: activeAct,
            }
            : null;
    }
    return episode.backgroundUrl
        ? {
            name: episode.backgroundName,
            url: episode.backgroundUrl,
            act: selectedAct,
        }
        : null;
}
