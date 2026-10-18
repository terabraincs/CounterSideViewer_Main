export type StoryStageDescriptionSegment = {
    text: string;
    color?: string;
};
const STORY_STAGE_COLOR_PATTERN = /<color=#([0-9a-f]{6})>([\s\S]*?)<\/color>/gi;
export function parseStoryStageDescription(value: string): StoryStageDescriptionSegment[] {
    const segments: StoryStageDescriptionSegment[] = [];
    let cursor = 0;
    for (const match of value.matchAll(STORY_STAGE_COLOR_PATTERN)) {
        const matchIndex = match.index;
        if (matchIndex > cursor) {
            segments.push({ text: value.slice(cursor, matchIndex) });
        }
        segments.push({
            text: match[2],
            color: `#${match[1]}`,
        });
        cursor = matchIndex + match[0].length;
    }
    if (cursor < value.length) {
        segments.push({ text: value.slice(cursor) });
    }
    return segments;
}
