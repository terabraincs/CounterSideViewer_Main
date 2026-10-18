export type SkillKeyword = {
    key: string;
    name: string;
    description: string;
};
type SkillKeywordRow = {
    Keyword: string;
    m_KeywordName: string;
    m_KeywordDesc: string;
};
export function createSkillKeywordMap(rows: readonly SkillKeywordRow[], strings: ReadonlyMap<string, string>): Map<string, SkillKeyword> {
    const keywords = new Map<string, SkillKeyword>();
    for (const row of rows) {
        const name = strings.get(row.m_KeywordName);
        const description = strings.get(row.m_KeywordDesc);
        if (name === undefined || description === undefined) {
            continue;
        }
        keywords.set(row.Keyword, { key: row.Keyword, name, description });
    }
    return keywords;
}
export function splitSkillKeywordText(text: string, keywords: ReadonlyMap<string, SkillKeyword>): Array<string | SkillKeyword> {
    const parts: Array<string | SkillKeyword> = [];
    let cursor = 0;
    // NKCStringTable.KeywordRegex; unresolved keys remain literal in the client.
    for (const match of text.matchAll(/\[#([a-zA-Z0-9_]*)#\]/g)) {
        const keyword = keywords.get(match[1]);
        if (!keyword) {
            continue;
        }
        if (match.index > cursor) {
            parts.push(text.slice(cursor, match.index));
        }
        parts.push(keyword);
        cursor = match.index + match[0].length;
    }
    if (cursor < text.length || parts.length === 0) {
        parts.push(text.slice(cursor));
    }
    return parts;
}
