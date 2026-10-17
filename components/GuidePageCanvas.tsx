"use client";

import { deploymentUrl } from "@/lib/deployment";

import { useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { layoutGuide } from "@/lib/guideLayout";
import { mainImageAssetUrl } from "@/lib/mainImageAssets";
import type { GuideColor, GuideImage, GuideNode, GuidePage, GuideText } from "@/lib/guideTypes";
import styles from "./GuidePageCanvas.module.css";

function rgba([r, g, b, a]: GuideColor) {
  return `rgba(${r * 255}, ${g * 255}, ${b * 255}, ${a})`;
}

function textStyle(text: GuideText): CSSProperties {
  return {
    color: rgba(text.color), fontSize: text.fontSize,
    fontFamily: text.fontName && /Rajdhani|Rajhani/i.test(text.fontName) ? '"Guide Number", sans-serif' : '"Guide Main", sans-serif',
    fontWeight: text.fontStyle === 1 || text.fontStyle === 3 ? 700 : 400,
    fontStyle: text.fontStyle === 2 || text.fontStyle === 3 ? "italic" : "normal",
    lineHeight: (text.fontLineHeight ?? text.lineHeightRatio ?? 1.5) * text.lineSpacing + (text.tmpLineSpacing ?? 0) * 0.01,
    letterSpacing: text.tmp ? `${(text.letterSpacing ?? 0) * 0.01}em` : undefined,
    textAlign: text.alignment % 3 === 1 ? "center" : text.alignment % 3 === 2 ? "right" : "left",
    whiteSpace: text.horizontalOverflow === 0 ? "pre-wrap" : "pre",
  };
}

/** Interpret only Unity's text formatting tags; source text never becomes HTML. */
function richText(value: string, enabled: boolean): ReactNode {
  if (!enabled) return value;
  const tokens = value.split(/(<\/?(?:color|size|b|i)(?:=[^>]+)?>|<br\s*\/?>)/gi);
  const stack: { tag: string; style: CSSProperties }[] = [];
  return tokens.map((token, index) => {
    if (/^<br\s*\/?>$/i.test(token)) return <br key={index} />;
    const tag = token.match(/^<(\/?)(color|size|b|i)(?:=([^>]+))?>$/i);
    if (tag) {
      const name = tag[2].toLowerCase();
      if (tag[1]) {
        const last = stack.findLastIndex((item) => item.tag === name);
        if (last >= 0) stack.splice(last, 1);
      } else {
        const argument = (tag[3] ?? "").replace(/^["']|["']$/g, "");
        const style: CSSProperties = {};
        if (name === "color" && /^(?:#[0-9a-f]{6}(?:[0-9a-f]{2})?|white|black|red|green|blue|yellow|cyan|magenta|gray|grey)$/i.test(argument)) style.color = argument;
        if (name === "size" && /^\d+(?:\.\d+)?%?$/.test(argument)) style.fontSize = argument.endsWith("%") ? argument : Number(argument);
        if (name === "b") style.fontWeight = 700;
        if (name === "i") style.fontStyle = "italic";
        stack.push({ tag: name, style });
      }
      return null;
    }
    const style = Object.assign({}, ...stack.map((item) => item.style));
    return <span key={index} style={style}>{token}</span>;
  });
}

function GuideTextLayer({ text, width, height }: { text: GuideText; width: number; height: number }) {
  const textRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = textRef.current;
    if (!element || !text.bestFit) return;
    let disposed = false;
    function fit() {
      if (!element || disposed) return;
      let low = Math.max(1, text.minSize);
      let high = Math.max(low, text.maxSize);
      let best = low;
      while (low <= high) {
        const size = Math.floor((low + high) / 2);
        element.style.fontSize = `${size}px`;
        const fits = element.scrollHeight <= height + 0.5
          && (text.horizontalOverflow !== 0 || element.scrollWidth <= width + 0.5);
        if (fits) { best = size; low = size + 1; } else high = size - 1;
      }
      element.style.fontSize = `${best}px`;
    }
    fit();
    void document.fonts.ready.then(fit);
    return () => { disposed = true; };
  }, [text, width, height]);
  const vertical = Math.floor(text.alignment / 3);
  const outline = text.outline;
  const shadow = outline ? [[outline.x, outline.y], [-outline.x, outline.y], [outline.x, -outline.y], [-outline.x, -outline.y]]
    .map(([x, y]) => `${x}px ${y}px 0 ${rgba(outline.color)}`).join(",") : undefined;
  return (
    <div className={styles.textBox} style={{
      justifyContent: vertical === 1 ? "center" : vertical === 2 ? "flex-end" : "flex-start",
      overflow: text.verticalOverflow === 0 ? "hidden" : "visible",
    }}>
      <div ref={textRef} className={styles.textValue} data-guide-text={text.stringKey || undefined} style={{
        ...textStyle(text),
        textShadow: shadow,
      }}>{richText(text.value, text.richText)}</div>
    </div>
  );
}

function SpriteLayer({ image, width, height }: { image: GuideImage; width: number; height: number }) {
  const filterId = useId().replace(/:/g, "");
  const src = image.src ? mainImageAssetUrl(image.src) : undefined;
  const tinted = image.color.some((value) => value !== 1);
  const tint = tinted ? `url("${deploymentUrl(`#${filterId}`)}")` : undefined;
  let content: ReactNode;
  if (image.type === 2 && image.src) {
    const ratio = 100 / (image.pixelsPerUnit * (image.pixelsPerUnitMultiplier ?? 1));
    const tileWidth = image.width * ratio, tileHeight = image.height * ratio;
    content = <><defs><pattern id={`${filterId}-tile`} patternUnits="userSpaceOnUse" width={tileWidth} height={tileHeight}>
      <image href={src} width={tileWidth} height={tileHeight} filter={tint} />
    </pattern></defs><rect width={width} height={height} fill={`url("${deploymentUrl(`#${filterId}-tile`)}")`} /></>;
  } else if (image.type === 1 && image.border.some(Boolean)) {
    const [left, bottom, right, top] = image.border;
    const unitsPerPixel = 100 / (image.pixelsPerUnit * (image.pixelsPerUnitMultiplier ?? 1));
    const scaleX = Math.min(unitsPerPixel, width / (left + right || 1));
    const scaleY = Math.min(unitsPerPixel, height / (top + bottom || 1));
    const sx = [0, left, image.width - right, image.width];
    const sy = [0, top, image.height - bottom, image.height];
    const dx = [0, left * scaleX, width - right * scaleX, width];
    const dy = [0, top * scaleY, height - bottom * scaleY, height];
    const patches: ReactNode[] = [];
    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 3; column += 1) {
        if (!image.fillCenter && row === 1 && column === 1) continue;
        const sw = sx[column + 1] - sx[column], sh = sy[row + 1] - sy[row];
        const dw = dx[column + 1] - dx[column], dh = dy[row + 1] - dy[row];
        if (!(sw > 0 && sh > 0 && dw > 0 && dh > 0)) continue;
        patches.push(<svg key={`${row}-${column}`} x={dx[column]} y={dy[row]} width={dw} height={dh}
          viewBox={`${sx[column]} ${sy[row]} ${sw} ${sh}`} preserveAspectRatio="none" overflow="hidden">
          <image href={src} width={image.width} height={image.height} filter={tint} />
        </svg>);
      }
    }
    content = patches;
  } else {
    const [logicalWidth, logicalHeight] = image.spriteRect ?? [image.width, image.height];
    const [offsetX, offsetY] = image.textureRectOffset ?? [0, 0];
    content = image.src ? <svg width={width} height={height} viewBox={`0 0 ${logicalWidth} ${logicalHeight}`}
      preserveAspectRatio={image.preserveAspect ? "xMidYMid meet" : "none"} overflow="hidden">
      <image href={src} x={offsetX} y={logicalHeight - offsetY - image.height} width={image.width} height={image.height} filter={tint} />
    </svg> : <rect width={width} height={height} fill={rgba(image.color)} />;
  }
  return <svg className={styles.image} width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
    {tinted ? <defs><filter id={filterId} colorInterpolationFilters="sRGB">
      <feColorMatrix type="matrix" values={`${image.color[0]} 0 0 0 0 0 ${image.color[1]} 0 0 0 0 0 ${image.color[2]} 0 0 0 0 0 ${image.color[3]} 0`} />
    </filter></defs> : null}
    {content}
  </svg>;
}

function nodeTransform(node: GuideNode) {
  const quaternion = node.rotationQuaternion;
  if (!quaternion) return `rotate(${node.rotation}deg) scale(${node.scaleX}, ${node.scaleY})`;
  // Unity's upward Y axis is reflected into CSS's downward Y axis.
  const [x, qy, qz, w] = quaternion;
  const y = -qy, z = -qz;
  return `matrix3d(${[
    1 - 2 * (y*y + z*z), 2 * (x*y + z*w), 2 * (x*z - y*w), 0,
    2 * (x*y - z*w), 1 - 2 * (x*x + z*z), 2 * (y*z + x*w), 0,
    2 * (x*z + y*w), 2 * (y*z - x*w), 1 - 2 * (x*x + y*y), 0,
    0, 0, 0, 1,
  ].join(",")}) scale(${node.scaleX}, ${node.scaleY})`;
}

function PageNode({ node, scrolls }: { node: GuideNode; scrolls: Map<string, NonNullable<GuideNode["scrollRect"]>> }) {
  const scroll = scrolls.get(node.transformId ?? "");
  return <div className={styles.node} data-guide-node={node.name} style={{
    left: node.x, top: node.y, width: node.width, height: node.height,
    transform: nodeTransform(node),
    transformOrigin: `${node.pivot[0] * 100}% ${node.pivot[1] * 100}%`,
    opacity: node.opacity, overflow: node.clip ? "hidden" : undefined,
    overflowY: scroll ? scroll.vertical ? "auto" : "hidden" : undefined,
    overflowX: scroll ? scroll.horizontal ? "auto" : "hidden" : undefined,
  }}>
    {node.image && node.width > 0 && node.height > 0 ? <SpriteLayer image={node.image} width={node.width} height={node.height} /> : null}
    {node.text ? <div style={{ position: "absolute", inset: 0,
      letterSpacing: node.letterSpacingSource ? node.letterSpacingSource * node.text.fontSize / 100 : undefined,
      transform: node.letterSpacingSource ? `translateX(${node.letterSpacingSource * node.text.fontSize / 100 * (node.text.alignment % 3) * 0.5}px)` : undefined,
    }}><GuideTextLayer text={node.text} width={node.width} height={node.height} /></div> : null}
    {node.children.map((child) => <PageNode key={child.id} node={child} scrolls={scrolls} />)}
  </div>;
}

export default function GuidePageCanvas({ page, label }: { page: GuidePage; label: string }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const probes = useRef(new Map<string, HTMLDivElement>());
  const [resolved, setResolved] = useState<{ page: GuidePage; root: GuideNode } | null>(null);
  const [newDescription, setNewDescription] = useState(true);
  const displayRoot = useMemo(() => {
    function select(node: GuideNode): GuideNode {
      return { ...node, children: node.children
        .filter((child) => !child.contentTag?.tagInfo.some((tag) => tag.tagName === "DIVE_SKIP_V2")
          || Boolean(child.contentTag.applyAsIgnoreTag) !== newDescription)
        .map(select) };
    }
    return select(page.root);
  }, [page, newDescription]);
  const hasVariants = useMemo(() => {
    const find = (node: GuideNode): boolean => Boolean(node.contentTag) || node.children.some(find);
    return find(page.root);
  }, [page]);
  const { texts, scrolls } = useMemo(() => {
    const texts = new Map<string, GuideText>();
    const scrolls = new Map<string, NonNullable<GuideNode["scrollRect"]>>();
    function visit(node: GuideNode) {
      if (node.text) texts.set(JSON.stringify(node.text), node.text);
      if (node.scrollRect) scrolls.set(node.scrollRect.viewportId === "0" ? node.transformId! : node.scrollRect.viewportId, node.scrollRect);
      node.children.forEach(visit);
    }
    visit(page.root);
    return { texts, scrolls };
  }, [page]);
  useLayoutEffect(() => {
    let disposed = false;
    let frame = 0;
    const resolve = () => {
      if (disposed) return;
      const root = layoutGuide(displayRoot, (text, width) => {
        const probe = probes.current.get(JSON.stringify(text));
        if (!probe) return [0, 0];
        probe.style.whiteSpace = "pre";
        probe.style.width = "max-content";
        const preferredWidth = probe.getBoundingClientRect().width;
        if (width !== undefined && text.horizontalOverflow === 0) {
          probe.style.whiteSpace = "pre-wrap";
          probe.style.width = `${Math.max(0, width)}px`;
        }
        return [preferredWidth, probe.getBoundingClientRect().height];
      });
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { if (!disposed) setResolved({ page, root }); });
    };
    resolve();
    void document.fonts.ready.then(resolve);
    return () => { disposed = true; cancelAnimationFrame(frame); };
  }, [page, displayRoot]);
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const parent = viewport.parentElement!;
    const resize = () => {
      const fullscreen = document.fullscreenElement?.contains(viewport);
      const variantsHeight = parent.querySelector<HTMLElement>(`.${styles.variants}`)?.offsetHeight ?? 0;
      viewport.style.width = fullscreen
        ? `${Math.min(parent.clientWidth, Math.max(0, parent.clientHeight - variantsHeight) * page.width / page.height)}px`
        : "100%";
      viewport.style.setProperty("--guide-scale", String(viewport.clientWidth / page.width));
    };
    const observer = new ResizeObserver(resize);
    observer.observe(viewport);
    observer.observe(parent);
    document.addEventListener("fullscreenchange", resize);
    resize();
    return () => { observer.disconnect(); document.removeEventListener("fullscreenchange", resize); };
  }, [page.width, page.height, hasVariants]);
  return <>{hasVariants ? <div className={styles.variants} aria-label="안내 버전">
    <button type="button" aria-pressed={newDescription} onClick={() => setNewDescription(true)}>변경 후 안내</button>
    <button type="button" aria-pressed={!newDescription} onClick={() => setNewDescription(false)}>변경 전 안내</button>
  </div> : null}<div className={styles.measurements} aria-hidden="true">
    {[...texts].map(([key, text]) => <div key={key} ref={(element) => { if (element) probes.current.set(key, element); else probes.current.delete(key); }}
      className={styles.probe} style={textStyle(text)}>{richText(text.value, text.richText)}</div>)}
  </div><div ref={viewportRef} className={styles.viewport} role="region" aria-label={label}
    style={{ aspectRatio: `${page.width} / ${page.height}` }} data-guide-page={page.id}>
    <div className={styles.canvas} style={{ width: page.width, height: page.height }}>
      <PageNode node={resolved?.page === page ? resolved.root : displayRoot} scrolls={scrolls} />
    </div>
  </div></>;
}
