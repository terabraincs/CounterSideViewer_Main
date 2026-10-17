import { deploymentUrl } from "@/lib/deployment";
import type { ReactNode } from "react";
import assets from "@/lib/collectionProfileAssets.json";
import { collectionProfileScene, profileFields, type ProfileDocumentData, type ProfileImageLayer, type ProfileTextLayer } from "@/lib/collectionProfileLayout";
import { layoutCollectionProfileText } from "@/lib/collectionProfileText";
import styles from "./CollectionProfileDocument.module.css";
type Props = ProfileDocumentData & {
    layout?: "character" | "operator";
    fullHeight?: boolean;
};
type Sprite = (typeof assets.sprites)[keyof typeof assets.sprites];
const sprites: Record<string, Sprite> = assets.sprites;
const toneId = (color: number[]) => `profile-tone-${color.map(value => Math.round(value * 255)).join("-")}`;
/** Unity Image Simple/Sliced: retain native border widths when a slot stretches. */
function SpriteImage({ layer }: {
    layer: ProfileImageLayer;
}) {
    const sprite = sprites[layer.sprite];
    if (!sprite)
        throw new Error(`Missing original profile sprite: ${layer.sprite}`);
    const [x, y, width, height] = layer.rect;
    if (!(width > 0 && height > 0))
        return null;
    const src = layer.imagePath ?? sprite.src;
    const filter = layer.color.some(value => value !== 1) ? `url(#${toneId(layer.color)})` : undefined;
    if (layer.imageType !== 1 || layer.imagePath) {
        return <image href={deploymentUrl(src)} x={x} y={y} width={width} height={height} preserveAspectRatio="none" filter={filter}/>;
    }
    const { x: left, y: bottom, z: right, w: top } = sprite.border;
    const sx = [0, left, sprite.imageWidth - right, sprite.imageWidth];
    const sy = [0, top, sprite.imageHeight - bottom, sprite.imageHeight];
    const scaleX = left + right ? Math.min(1, width / (left + right)) : 1;
    const scaleY = top + bottom ? Math.min(1, height / (top + bottom)) : 1;
    const dx = [0, left * scaleX, width - right * scaleX, width];
    const dy = [0, top * scaleY, height - bottom * scaleY, height];
    const patches: ReactNode[] = [];
    for (let row = 0; row < 3; row++) {
        for (let column = 0; column < 3; column++) {
            const sw = sx[column + 1] - sx[column], sh = sy[row + 1] - sy[row];
            const dw = dx[column + 1] - dx[column], dh = dy[row + 1] - dy[row];
            if (!(sw > 0 && sh > 0 && dw > 0 && dh > 0))
                continue;
            // Overlap internal clip edges to avoid SVG antialias seams at fractional scale.
            // Expand the source viewport by the same ratio, preserving the native mapping.
            const bleed = Math.min(2, dw / 2, dh / 2);
            const bleedLeft = dx[column] > 0 ? bleed : 0, bleedRight = dx[column + 1] < width ? bleed : 0;
            const bleedTop = dy[row] > 0 ? bleed : 0, bleedBottom = dy[row + 1] < height ? bleed : 0;
            patches.push(<svg key={`${row}-${column}`} x={x + dx[column] - bleedLeft} y={y + dy[row] - bleedTop} width={dw + bleedLeft + bleedRight} height={dh + bleedTop + bleedBottom} viewBox={`${sx[column] - bleedLeft * sw / dw} ${sy[row] - bleedTop * sh / dh} ${sw * (1 + (bleedLeft + bleedRight) / dw)} ${sh * (1 + (bleedTop + bleedBottom) / dh)}`} preserveAspectRatio="none" overflow="hidden">
          <image href={deploymentUrl(src)} width={sprite.imageWidth} height={sprite.imageHeight} filter={filter}/>
        </svg>);
        }
    }
    return <g data-profile-sprite={layer.sprite}>{patches}</g>;
}
function ProfileText({ layer }: {
    layer: ProfileTextLayer;
}) {
    const [x, y, width, height] = layer.rect;
    const text = layer.settings;
    const formatted = layoutCollectionProfileText(layer.value, { ...text, width, height });
    const anchor = text.horizontal === 4 ? "end" : text.horizontal === 2 ? "middle" : "start";
    const tx = x + (anchor === "end" ? width : anchor === "middle" ? width / 2 : 0);
    const lineExtent = Math.max(0, formatted.lines.length - 1) * formatted.lineHeight;
    const ty = text.vertical === 256 ? y : text.vertical === 1024 ? y + height - lineExtent : y + height / 2 - lineExtent / 2;
    const baseline = text.vertical === 256 ? "text-before-edge" : text.vertical === 1024 ? "text-after-edge" : "central";
    const [r, g, b, a] = text.color;
    return (<text x={tx} y={ty} textAnchor={anchor} dominantBaseline={baseline} className={text.font === "id" ? styles.idFont : styles.mainFont} fontSize={formatted.fontSize} letterSpacing={text.letterSpacingEm * formatted.fontSize} fill={`rgb(${r * 255},${g * 255},${b * 255})`} opacity={a} data-native-text={text.id} data-native-bold={text.bold}>
      {formatted.lines.map((line, index) => <tspan key={index} x={tx} dy={index ? formatted.lineHeight : 0}>{line || "\u00a0"}</tspan>)}
    </text>);
}
/** One original-client document renderer for employee and operator pages. */
export default function CollectionProfileDocument(props: Props) {
    const scene = collectionProfileScene(props);
    const height = props.fullHeight
        ? Math.max(scene.height, ...scene.layers.map(layer => layer.rect[1] + layer.rect[3] - scene.top))
        : scene.height;
    const tones = new Map(scene.layers.flatMap(layer => layer.kind === "image" && layer.color.some(value => value !== 1)
        ? [[toneId(layer.color), layer.color] as const] : []));
    const fields = profileFields(props.profileRows);
    return (<div className={styles.documentPanel} data-collection-profile={props.layout ?? "character"}>
      <svg className={styles.document} viewBox={`0 ${scene.top} ${scene.width} ${height}`} aria-hidden="true">
        <defs>
          {[...tones].map(([id, color]) => (<filter key={id} id={id} colorInterpolationFilters="sRGB">
              <feColorMatrix type="matrix" values={`${color[0]} 0 0 0 0 0 ${color[1]} 0 0 0 0 0 ${color[2]} 0 0 0 0 0 ${color[3]} 0`}/>
            </filter>))}
        </defs>
        {scene.layers.map((layer, index) => layer.kind === "image"
            ? <SpriteImage key={index} layer={layer}/> : <ProfileText key={index} layer={layer}/>)}
      </svg>
      {props.empty ? <p className={styles.empty}>등록된 프로필 정보가 없습니다.</p> : null}
      <div className={styles.accessible}>
        {props.employeeId ? <p>{props.employeeId}</p> : null}
        <h2>{props.profileTitle || "프로필"}</h2>
        <dl>{fields.map((field, index) => <div key={index}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}</dl>
        {props.measureTitle ? <><h3>{props.measureTitle}</h3><dl>{props.measureRows?.map((row, index) => <div key={index}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl></> : null}
        {props.team ? <p>{props.team.name}{props.team.description ? ` · ${props.team.description}` : ""}</p> : null}
      </div>
    </div>);
}
