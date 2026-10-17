import source from "../data/collection-profile-layout.json";
export type ProfileMeasureRow = {
    label: string;
    value: string;
    percent: number;
};
export type ProfileTeam = {
    name: string;
    description?: string;
    imagePath: string;
};
export type ProfileDocumentData = {
    employeeId: string;
    profileTitle: string;
    profileRows: string[][];
    measureTitle?: string;
    measureRows?: ProfileMeasureRow[];
    team?: ProfileTeam;
    empty?: boolean;
};
type Rect = {
    x: number;
    y: number;
    width: number;
    height: number;
    scaleX?: number;
    scaleY?: number;
};
export type ProfileTextSettings = {
    id: string;
    font: "main" | "id";
    fontSize: number;
    minFontSize: number;
    autoSize: boolean;
    bold: boolean;
    letterSpacingEm: number;
    lineSpacing: number;
    wrap: boolean;
    horizontal: number;
    vertical: number;
    color: number[];
};
type SourceNode = {
    name: string;
    id: string;
    active: boolean;
    rect: Rect;
    pivot: {
        x: number;
        y: number;
    };
    image?: {
        sprite: string;
        type: number;
        color: number[];
        enabled: boolean;
    };
    text?: ProfileTextSettings;
    children: SourceNode[];
};
export type ProfileImageLayer = {
    kind: "image";
    rect: number[];
    sprite: string;
    imageType: number;
    color: number[];
    originalObject: string;
    imagePath?: string;
};
export type ProfileTextLayer = {
    kind: "text";
    rect: number[];
    value: string;
    settings: ProfileTextSettings;
};
export type ProfileLayer = ProfileImageLayer | ProfileTextLayer;
const nodes = source.nodes as Record<keyof typeof source.nodes, SourceNode>;
function find(node: SourceNode, name: string): SourceNode | undefined {
    if (node.name === name)
        return node;
    for (const child of node.children) {
        const result = find(child, name);
        if (result)
            return result;
    }
}
function collect(node: SourceNode, layers: ProfileLayer[], origin: number[] = [0, 0], values: Record<string, string> = {}, parentScale: number[] = [1, 1]) {
    if (!node.active)
        return;
    const { rect: r, pivot } = node;
    const sx = r.scaleX ?? 1, sy = r.scaleY ?? 1;
    const x = origin[0] + (r.x + r.width * pivot.x * (1 - sx)) * parentScale[0];
    const y = origin[1] + (r.y + r.height * (1 - pivot.y) * (1 - sy)) * parentScale[1];
    const scale = [sx * parentScale[0], sy * parentScale[1]];
    const rect = [x, y, r.width * scale[0], r.height * scale[1]];
    if (node.image?.enabled) {
        layers.push({ kind: "image", rect, sprite: node.image.sprite, imageType: node.image.type,
            color: node.image.color, originalObject: node.id,
            ...(values[`${node.name}:sprite`] ? { imagePath: values[`${node.name}:sprite`] } : {}) });
    }
    if (node.text && values[node.name])
        layers.push({ kind: "text", rect, value: values[node.name], settings: node.text });
    for (const child of node.children)
        collect(child, layers, [x, y], values, scale);
}
export function profileFields(rows: string[][]) {
    return rows.flatMap(row => [0, 2].flatMap(offset => row[offset] ? [{ label: row[offset], value: row[offset + 1] ?? "" }] : []));
}
/** Original NKCUICollectionUnitProfile layout groups, shared by both page types. */
export function collectionProfileScene(data: ProfileDocumentData) {
    const layers: ProfileLayer[] = [];
    const paper = structuredClone(nodes.paper);
    const id = find(paper, "UNIT_ID");
    if (id)
        id.active = Boolean(data.employeeId);
    collect(paper, layers, [0, 0], { deco: "ID.", ID_TEXT: data.employeeId.replace(/^ID\.\s*/, "") });
    if (data.empty)
        return { layers, width: source.width, height: source.height, top: source.top };
    const d = source.dynamic, c = d.character;
    const fields = profileFields(data.profileRows);
    const rows = Math.ceil(fields.length / c.columns);
    const gridHeight = rows * c.cellSize[1] + Math.max(0, rows - 1) * c.spacing[1];
    collect(nodes.profileTitle, layers, [source.profileX, source.profileTop], { text: data.profileTitle });
    const line = structuredClone(nodes.profileLine);
    line.rect.height = gridHeight;
    if (rows)
        collect(line, layers, [source.profileX, source.profileTop + d.characterTitleHeight]);
    fields.forEach((field, index) => collect(nodes.profileSlot, layers, [c.firstCellRelativeToPaper[0] + index % c.columns * c.columnStride,
        c.firstCellRelativeToPaper[1] + Math.floor(index / c.columns) * c.rowStride], { text01: field.label, text02: field.value }));
    const measures = data.measureRows ?? [];
    if (data.measureTitle && measures.length) {
        const crf = d.crf;
        const top = source.profileTop + d.characterTitleHeight + d.gridGroupPadding.top + gridHeight + d.outerVerticalSpacing;
        collect(nodes.measureTitle, layers, [source.profileX, top], { text: data.measureTitle });
        const height = Math.ceil(measures.length / crf.columns) * crf.cellSize[1];
        const border = structuredClone(nodes.measureLine);
        border.rect.height = height;
        find(border, "Deco_Line")!.rect.height = height;
        collect(border, layers, [source.profileX, top + d.crfTitleHeight]);
        measures.forEach((row, index) => {
            const slot = structuredClone(nodes.measureSlot);
            const fill = find(slot, "GAUGE_Slider_Bg")!, gauge = find(slot, "GAUGE_Root")!;
            // UnityEngine.UI.Slider.UpdateVisuals drives fill anchors (0,0)..(ratio,1).
            fill.rect = { ...fill.rect, x: 0, y: 0,
                width: gauge.rect.width * Math.max(0, Math.min(1, row.percent / 100)), height: gauge.rect.height };
            collect(slot, layers, [crf.firstCellXRelativeToPaper + index % crf.columns * crf.columnStride,
                top + d.crfTitleHeight + d.gridGroupPadding.top + Math.floor(index / crf.columns) * crf.rowStride], { text01: row.label, text02: row.value });
        });
    }
    if (data.team)
        collect(nodes.team, layers, [source.profileX, 0], {
            Team_Name: data.team.name, Team_Intelligence: data.team.description ?? "", "TeamUpMark_Res:sprite": data.team.imagePath,
        });
    return { layers, width: source.width, height: source.height, top: source.top };
}
