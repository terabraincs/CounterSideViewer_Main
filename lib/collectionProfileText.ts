import metrics from "./collectionProfileTextMetrics.json";
export type CollectionProfileTextSettings = {
    fontSize: number;
    minFontSize: number;
    autoSize: boolean;
    letterSpacingEm: number;
    /** TMP line-spacing units, scaled by fontSize * 0.01. */
    lineSpacing: number;
    wrap: boolean;
    width: number;
    height: number;
    font: "main" | "id";
};
const f = Math.fround;
const leading = new Set(metrics.leadingCharacters);
const following = new Set(metrics.followingCharacters);
const noBreak = new Set([160, 8199, 8209, 8239, 8288]);
function advance(code: number, font: "main" | "id") {
    if (code === 10 || code === 13 || code === 8203 || code === 173 || code === 8288)
        return 0;
    const face = metrics.fonts[font];
    const ranges = face.advanceRanges;
    let lo = 0, hi = ranges.length - 1;
    while (lo <= hi) {
        const mid = (lo + hi) >>> 1;
        const [first, last, width] = ranges[mid];
        if (code < first)
            hi = mid - 1;
        else if (code > last)
            lo = mid + 1;
        else
            return width / face.unitsPerEm;
    }
    throw new Error(`Original profile font has no glyph: U+${code.toString(16).toUpperCase()}`);
}
function canBreakAfter(character: string, next: string | undefined) {
    const code = character.codePointAt(0)!;
    if (noBreak.has(code))
        return false;
    if (/\s/u.test(character) || code === 45 || code === 8203 || code === 173)
        return true;
    // TextMeshProUGUI.GenerateTextMesh's original East Asian line-break ranges.
    const hangul = (code > 4352 && code < 4607) || (code > 43360 && code < 43391) || (code > 44032 && code < 55295);
    const cjk = (hangul && !metrics.modernHangul) || (code > 11904 && code < 40959)
        || (code > 63744 && code < 64255) || (code > 65072 && code < 65103) || (code > 65280 && code < 65519);
    return cjk && !leading.has(code) && !following.has(next?.codePointAt(0) ?? -1);
}
/** The original font's unhinted outline advance; no browser/system-font probe. */
export function measureCollectionProfileText(value: string, fontSize: number, letterSpacingEm: number, font: "main" | "id") {
    const characters = [...value];
    let x = 0, visibleWidth = 0;
    for (const character of characters) {
        const glyphWidth = f(advance(character.codePointAt(0)!, font) * fontSize);
        if (!/\s/u.test(character))
            visibleWidth = f(x + glyphWidth);
        x = f(f(x + glyphWidth) + f(letterSpacingEm * fontSize));
    }
    return visibleWidth;
}
function wrapAtSize(value: string, size: number, settings: CollectionProfileTextSettings) {
    const characters = [...value.replace(/\r\n?/g, "\n")];
    const lines: string[] = [];
    const available = f(settings.width + 0.0001);
    let start = 0, index = 0, lastBreak = -1, x = 0, splitWord = false;
    while (index < characters.length) {
        const character = characters[index];
        if (character === "\n") {
            lines.push(characters.slice(start, index).join(""));
            index++;
            start = index;
            lastBreak = -1;
            x = 0;
            continue;
        }
        const glyphWidth = f(advance(character.codePointAt(0)!, settings.font) * size);
        if (settings.wrap && !/\s/u.test(character) && f(x + glyphWidth) > available && index > start) {
            const end = lastBreak >= start ? lastBreak + 1 : index;
            // TMP first reduces the font before splitting an overlong word. At its
            // authored minimum the original Overflow mode allows character wrapping.
            if (lastBreak < start)
                splitWord = true;
            lines.push(characters.slice(start, end).join(""));
            index = end;
            start = end;
            lastBreak = -1;
            x = 0;
            continue;
        }
        x = f(f(x + glyphWidth) + f(settings.letterSpacingEm * size));
        if (canBreakAfter(character, characters[index + 1]))
            lastBreak = index;
        index++;
    }
    if (start < characters.length || characters.at(-1) === "\n" || !lines.length) {
        lines.push(characters.slice(start).join(""));
    }
    const face = metrics.fonts[settings.font];
    const lineHeight = f(f(face.lineHeight * size) + f(settings.lineSpacing * f(size * 0.01)));
    const textHeight = f(f((face.ascent - face.descent) * size) + f((lines.length - 1) * lineHeight));
    const widest = Math.max(0, ...lines.map(line => measureCollectionProfileText(line, size, settings.letterSpacingEm, settings.font)));
    const overflow = textHeight > settings.height + 0.0001 || widest > available;
    return { fontSize: size, lines, lineHeight, textHeight, overflow, splitWord };
}
/** Profile prefab subset of TMP layout: original metrics, global break rules,
 * authored size bounds, 0.05-point sizing and explicit newlines. Shader/SDF
 * edges and native glyph hinting remain the same limits as the approved preview.
 */
export function layoutCollectionProfileText(value: string, settings: CollectionProfileTextSettings) {
    let size = settings.fontSize;
    let lower = Math.min(settings.minFontSize, size), upper = size;
    for (let iteration = 0; iteration < 24; iteration++) {
        const result = wrapAtSize(value, size, settings);
        const shrink = result.overflow || result.splitWord;
        if (!settings.autoSize || (shrink && size <= lower))
            return result;
        if (shrink) {
            upper = size;
            size = Math.max(Math.round((size - Math.max((size - lower) / 2, 0.05)) * 20) / 20, lower);
        }
        else {
            if (upper - lower <= 0.051 || size >= settings.fontSize)
                return result;
            lower = size;
            size = Math.min(Math.round((size + Math.max((upper - size) / 2, 0.05)) * 20) / 20, settings.fontSize);
        }
    }
    return wrapAtSize(value, size, settings);
}
