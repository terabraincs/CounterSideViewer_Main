type RowTextTable = {
    data?: unknown[];
};
type DictionaryTextTable = {
    data?: unknown;
    m_dicString?: Record<string, string>;
};
/** Preserve source order: the last valid row for a key wins. */
export function createRowTextMap(...tables: Array<RowTextTable | null>) {
    const textMap = new Map<string, string>();
    for (const table of tables) {
        for (const row of table?.data ?? []) {
            if (Array.isArray(row) && typeof row[0] === "string" && typeof row[1] === "string") {
                textMap.set(row[0], row[1]);
            }
        }
    }
    return textMap;
}
/** Dictionary entries override row entries, as in the equipment/unit tables. */
export function createDictionaryTextMap(table: DictionaryTextTable | null) {
    const textMap = createRowTextMap(Array.isArray(table?.data) ? { data: table.data } : null);
    if (table?.m_dicString) {
        for (const [key, value] of Object.entries(table.m_dicString))
            textMap.set(key, value);
    }
    return textMap;
}
