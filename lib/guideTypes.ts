export type GuideArticle = {
  id: string;
  title: string;
  guideId: string;
  pageIds: string[];
  retired: boolean;
};

export type GuideCategory = {
  id: string;
  title: string;
  articles: GuideArticle[];
};

export type GuideColor = [number, number, number, number];

export type GuideImage = {
  src: string | null;
  spriteName: string | null;
  width: number;
  height: number;
  color: GuideColor;
  preserveAspect: boolean;
  type: number;
  border: [number, number, number, number];
  pixelsPerUnit: number;
  fillCenter: boolean;
  pixelsPerUnitMultiplier?: number;
  fillAmount?: number;
  spriteRect?: [number, number];
  textureRectOffset?: [number, number];
};

export type GuideText = {
  value: string;
  stringKey: string;
  fontSize: number;
  fontStyle: number;
  alignment: number;
  lineSpacing: number;
  richText: boolean;
  bestFit: boolean;
  minSize: number;
  maxSize: number;
  horizontalOverflow: number;
  verticalOverflow: number;
  color: GuideColor;
  outline?: { color: GuideColor; x: number; y: number };
  fontName?: string;
  lineHeightRatio?: number;
  fontLineHeight?: number;
  fontAscent?: number;
  fontDescent?: number;
  fontSourceSize?: number;
  tmp?: boolean;
  letterSpacing?: number;
  tmpLineSpacing?: number;
  margin?: [number, number, number, number];
};

export type GuideLayoutGroup = {
  axis: "horizontal" | "vertical";
  padding: [number, number, number, number];
  spacing: number;
  childAlignment: number;
  childControlWidth: boolean;
  childControlHeight: boolean;
  childForceExpandWidth: boolean;
  childForceExpandHeight: boolean;
  childScaleWidth: boolean;
  childScaleHeight: boolean;
  reverseArrangement: boolean;
};

type Vector2 = { x: number; y: number };
export type GuideSourceRect = {
  m_AnchorMin: Vector2;
  m_AnchorMax: Vector2;
  m_AnchoredPosition: Vector2;
  m_SizeDelta: Vector2;
  m_Pivot: Vector2;
};

export type GuideNode = {
  id: string;
  transformId?: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  rotationQuaternion?: [number, number, number, number];
  pivot: [number, number];
  opacity: number;
  clip: boolean;
  image?: GuideImage;
  text?: GuideText;
  children: GuideNode[];
  sourceRect?: GuideSourceRect;
  layoutGroup?: GuideLayoutGroup;
  contentSizeFitter?: { horizontalFit: number; verticalFit: number };
  layoutElement?: {
    ignoreLayout: boolean;
    minWidth: number; minHeight: number;
    preferredWidth: number; preferredHeight: number;
    flexibleWidth: number; flexibleHeight: number;
    layoutPriority: number;
  };
  scrollRect?: { horizontal: boolean; vertical: boolean; contentId: string; viewportId: string };
  letterSpacingSource?: number;
  contentTag?: { tagInfo: { tagType: number; tagName: string }[]; applyAsIgnoreTag: number };
};

export type GuidePage = {
  version: number;
  id: string;
  bundle: string;
  width: number;
  height: number;
  root: GuideNode;
  warnings: string[];
};
