import { deploymentUrl } from "@/lib/deployment";
import type { CSSProperties, ReactNode } from "react";
import { CharacterTypeInfoTrigger } from "@/components/CharacterTypeInfo";
import { collectionProfileSummaryScene, type CollectionSummaryData, type SummaryLayer } from "@/lib/collectionProfileSummary";
import { measureCollectionProfileText } from "@/lib/collectionProfileText";
import { mainImageAssetUrl } from "@/lib/mainImageAssets";
import styles from "./CollectionProfileSummary.module.css";
function position(rect: number[], view: number[]): CSSProperties {
    return { left: `${(rect[0] - view[0]) / view[2] * 100}%`, top: `${(rect[1] - view[1]) / view[3] * 100}%`,
        width: `${rect[2] / view[2] * 100}%`, height: `${rect[3] / view[3] * 100}%` };
}
function NativeText({ layer }: {
    layer: SummaryLayer;
}) {
    const [x, y, width, height] = layer.rect;
    const value = layer.text ?? "";
    let size = layer.fontSize ?? 26;
    if (layer.bestFit) {
        while (size > Math.max(1, layer.minSize ?? 1) && measureCollectionProfileText(value, size, 0, "main") > width)
            size--;
    }
    const anchor = layer.horizontal === 4 ? "end" : layer.horizontal === 2 ? "middle" : "start";
    const tx = x + (anchor === "end" ? width : anchor === "middle" ? width / 2 : 0);
    const ty = layer.vertical === 256 ? y : layer.vertical === 1024 ? y + height : y + height / 2;
    const baseline = layer.vertical === 256 ? "text-before-edge" : layer.vertical === 1024 ? "text-after-edge" : "central";
    const attrs = { textAnchor: anchor, dominantBaseline: baseline, fontSize: size,
        fontWeight: layer.bold ? 700 : 400, className: styles.text } as const;
    const [r, g, b, a] = layer.color ?? [255, 255, 255, 255];
    return <g data-summary-text={layer.nodeName}>
    {layer.shadows?.flatMap((shadow, index) => {
            const [dx, dy] = shadow.offset;
            const offsets = shadow.type === "Outline" ? [[dx, -dy], [dx, dy], [-dx, -dy], [-dx, dy]] : [[dx, -dy]];
            const [sr, sg, sb, sa] = shadow.color;
            return offsets.map(([ox, oy], i) => <text key={`${index}-${i}`} x={tx + ox} y={ty + oy} {...attrs} fill={`rgb(${sr},${sg},${sb})`} opacity={sa / 255}>{value}</text>);
        })}
    <text x={tx} y={ty} {...attrs} fill={layer.cssColor ?? `rgb(${r},${g},${b})`} opacity={a / 255}>{value}</text>
  </g>;
}
function NativeImage({ layer }: {
    layer: SummaryLayer;
}) {
    let [x, y] = layer.rect;
    const [, , w, h] = layer.rect;
    const transforms: string[] = [];
    if (layer.rotation) {
        const [px, py] = layer.pivot ?? [0.5, 0.5];
        transforms.push(`rotate(${layer.rotation} ${x + w * px} ${y + h * (1 - py)})`);
    }
    if (w < 0 || h < 0) {
        transforms.push(`translate(${x} ${y}) scale(${w < 0 ? -1 : 1} ${h < 0 ? -1 : 1})`);
        x = y = 0;
    }
    return layer.src ? <image href={deploymentUrl(mainImageAssetUrl(layer.src))} x={x} y={y} width={Math.abs(w)} height={Math.abs(h)} preserveAspectRatio="none" transform={transforms.join(" ") || undefined} style={layer.blend === "additive" ? { mixBlendMode: "plus-lighter" } : undefined}/> : null;
}
export default function CollectionProfileSummary(props: CollectionSummaryData & {
    children?: ReactNode;
}) {
    const scene = collectionProfileSummaryScene(props);
    const [x, y, width, height] = scene.cardRect;
    return <div className={styles.summary} data-collection-summary={props.kind ?? "character"}>
    <svg className={styles.canvas} viewBox={scene.viewBox.join(" ")} aria-hidden="true">
      {props.children ? <foreignObject x={x} y={y} width={width} height={height}>
        <div className={styles.cardEffect}>{props.children}</div>
      </foreignObject> : null}
      {props.imagePath ? <image href={deploymentUrl(mainImageAssetUrl(props.imagePath))} x={x} y={y} width={width} height={height} preserveAspectRatio="none"/>
            : <text x={x + width / 2} y={y + height / 2} textAnchor="middle" fill="#9298a5">NO IMAGE</text>}
      {scene.layers.map((layer, index) => layer.kind === "text" ? <NativeText key={index} layer={layer}/> : <NativeImage key={index} layer={layer}/>)}
    </svg>
    {scene.hitAreas.map((area, index) => <div key={index} className={styles.hitArea} style={position(area.rect, scene.viewBox)}>
      <CharacterTypeInfoTrigger label={area.label} tab={area.tab} className={styles.trigger}>
        <span className={styles.accessible}>{area.label}</span>
      </CharacterTypeInfoTrigger>
    </div>)}
    <div className={styles.accessible}>
      <p>{props.grade} · {props.title} · {props.name}{props.respawnCountText ? ` ${props.respawnCountText.trim()}` : ""}</p>
      {props.cost ? <p>코스트 {props.cost}</p> : null}
      {props.voiceActor ? <p>성우 {props.voiceActor}</p> : null}
    </div>
  </div>;
}
