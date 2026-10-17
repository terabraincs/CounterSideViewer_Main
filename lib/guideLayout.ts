import type { GuideLayoutGroup, GuideNode, GuideText } from "./guideTypes";

type Axis = 0 | 1;
type Metrics = { min: number; preferred: number; flexible: number };
type Property = keyof Metrics;
type RuntimeRect = {
  anchorMin: [number, number];
  anchorMax: [number, number];
  position: [number, number];
  sizeDelta: [number, number];
  pivot: [number, number];
};

export type GuideTextMeasure = (text: GuideText, width?: number) => [number, number];

const dimension = (node: GuideNode, axis: Axis) => axis === 0 ? node.width : node.height;
const alignment = (group: GuideLayoutGroup, axis: Axis) =>
  (axis === 0 ? group.childAlignment % 3 : Math.floor(group.childAlignment / 3)) * 0.5;
const clamp = (value: number, min: number, max: number) => value < min ? min : value > max ? max : value;

/**
 * Unity uGUI's layout calculation/control order and H/V layout formulas.
 * Text preferred sizes are supplied by the renderer after its fonts are ready.
 * Only the returned clone is changed; original source rectangles remain intact.
 */
export function layoutGuide(root: GuideNode, measureText: GuideTextMeasure): GuideNode {
  const result = structuredClone(root);
  const parents = new Map<GuideNode, GuideNode | null>();
  const rectangles = new Map<GuideNode, RuntimeRect>();
  const metrics = new Map<GuideNode, [Metrics, Metrics]>();
  const groupMetrics = new Map<GuideNode, [Metrics, Metrics]>();

  function collect(node: GuideNode, parent: GuideNode | null) {
    parents.set(node, parent);
    const source = node.sourceRect;
    rectangles.set(node, source ? {
      anchorMin: [source.m_AnchorMin.x, source.m_AnchorMin.y],
      anchorMax: [source.m_AnchorMax.x, source.m_AnchorMax.y],
      position: [source.m_AnchoredPosition.x, source.m_AnchoredPosition.y],
      sizeDelta: [source.m_SizeDelta.x, source.m_SizeDelta.y],
      pivot: [source.m_Pivot.x, source.m_Pivot.y],
    } : {
      anchorMin: [0, 1], anchorMax: [0, 1],
      position: [node.x + node.width * node.pivot[0], -node.y - node.height * node.pivot[1]],
      sizeDelta: [node.width, node.height], pivot: [node.pivot[0], 1 - node.pivot[1]],
    });
    metrics.set(node, [{ min: 0, preferred: 0, flexible: 0 }, { min: 0, preferred: 0, flexible: 0 }]);
    groupMetrics.set(node, [{ min: 0, preferred: 0, flexible: 0 }, { min: 0, preferred: 0, flexible: 0 }]);
    node.children.forEach((child) => collect(child, node));
  }

  function refresh(node: GuideNode, axis: Axis) {
    const rect = rectangles.get(node)!;
    const parent = parents.get(node);
    if (parent) {
      const parentSize = dimension(parent, axis);
      const size = parentSize * (rect.anchorMax[axis] - rect.anchorMin[axis]) + rect.sizeDelta[axis];
      const pivotPosition = parentSize * (rect.anchorMin[axis]
        + (rect.anchorMax[axis] - rect.anchorMin[axis]) * rect.pivot[axis]) + rect.position[axis];
      if (axis === 0) {
        node.width = size;
        node.x = pivotPosition - size * rect.pivot[axis];
      } else {
        node.height = size;
        node.y = parentSize - pivotPosition - size * (1 - rect.pivot[axis]);
      }
    }
    node.children.forEach((child) => refresh(child, axis));
  }

  function childMetrics(child: GuideNode, group: GuideLayoutGroup, axis: Axis): Metrics {
    const control = axis === 0 ? group.childControlWidth : group.childControlHeight;
    const expand = axis === 0 ? group.childForceExpandWidth : group.childForceExpandHeight;
    const size = rectangles.get(child)!.sizeDelta[axis];
    const value = control ? { ...metrics.get(child)![axis] } : { min: size, preferred: size, flexible: 0 };
    if (expand) value.flexible = Math.max(1, value.flexible);
    return value;
  }

  function calculateGroup(node: GuideNode, axis: Axis): Metrics {
    const group = node.layoutGroup!;
    const padding = group.padding[axis] + group.padding[axis + 2];
    const across = (group.axis === "vertical") !== (axis === 1);
    const useScale = axis === 0 ? group.childScaleWidth : group.childScaleHeight;
    const children = node.children.filter((child) => !child.layoutElement?.ignoreLayout);
    const total = { min: padding, preferred: padding, flexible: 0 };
    for (const child of children) {
      const value = childMetrics(child, group, axis);
      const scale = useScale ? (axis === 0 ? child.scaleX : child.scaleY) : 1;
      if (across) {
        total.min = Math.max(total.min, value.min * scale + padding);
        total.preferred = Math.max(total.preferred, value.preferred * scale + padding);
        total.flexible = Math.max(total.flexible, value.flexible * scale);
      } else {
        total.min += value.min * scale + group.spacing;
        total.preferred += value.preferred * scale + group.spacing;
        total.flexible += value.flexible * scale;
      }
    }
    if (!across && children.length) {
      total.min -= group.spacing;
      total.preferred -= group.spacing;
    }
    total.preferred = Math.max(total.min, total.preferred);
    return total;
  }

  function calculate(node: GuideNode, axis: Axis) {
    node.children.forEach((child) => calculate(child, axis));
    const providers: { priority: number; value: Metrics }[] = [];
    if (node.text) {
      const measured = measureText(node.text, axis === 0 ? undefined : node.width);
      providers.push({ priority: 0, value: { min: 0, preferred: measured[axis], flexible: -1 } });
    }
    if (node.image) {
      const image = node.image;
      const native = image.type === 1 || image.type === 2
        ? image.border[axis] + image.border[axis + 2]
        : image.spriteRect?.[axis] ?? (axis === 0 ? image.width : image.height);
      // Original NKM_SCEN_APP FRONT_Canvas declares referencePixelsPerUnit = 100.
      providers.push({ priority: 0, value: { min: 0, preferred: native * 100 / image.pixelsPerUnit, flexible: -1 } });
    }
    if (node.layoutGroup) {
      const total = calculateGroup(node, axis);
      groupMetrics.get(node)![axis] = total;
      providers.push({ priority: 0, value: total });
    }
    if (node.layoutElement) {
      const element = node.layoutElement;
      providers.push({ priority: element.layoutPriority, value: axis === 0
        ? { min: element.minWidth, preferred: element.preferredWidth, flexible: element.flexibleWidth }
        : { min: element.minHeight, preferred: element.preferredHeight, flexible: element.flexibleHeight } });
    }
    const selected = { min: 0, preferred: 0, flexible: 0 };
    for (const key of ["min", "preferred", "flexible"] as Property[]) {
      let priority = -Infinity;
      for (const provider of providers) {
        const value = provider.value[key];
        if (value < 0 || provider.priority < priority) continue;
        if (provider.priority > priority) {
          selected[key] = value;
          priority = provider.priority;
        } else selected[key] = Math.max(selected[key], value);
      }
    }
    selected.preferred = Math.max(selected.min, selected.preferred);
    metrics.get(node)![axis] = selected;
  }

  function fitSelf(node: GuideNode, axis: Axis) {
    const fitting = axis === 0 ? node.contentSizeFitter?.horizontalFit : node.contentSizeFitter?.verticalFit;
    if (!fitting) return;
    const size = metrics.get(node)![axis][fitting === 1 ? "min" : "preferred"];
    const rect = rectangles.get(node)!;
    const parent = parents.get(node);
    rect.sizeDelta[axis] = size - (parent ? dimension(parent, axis) * (rect.anchorMax[axis] - rect.anchorMin[axis]) : 0);
    if (!parent) {
      if (axis === 0) node.width = size;
      else node.height = size;
    }
    refresh(node, axis);
  }

  function positionChild(child: GuideNode, axis: Axis, position: number, size: number | undefined, scale: number) {
    const rect = rectangles.get(child)!;
    // SetChildAlongAxisWithScale drives both anchors to Vector2.up.
    rect.anchorMin = [0, 1];
    rect.anchorMax = [0, 1];
    if (size !== undefined) rect.sizeDelta[axis] = size;
    rect.position[axis] = axis === 0
      ? position + rect.sizeDelta[axis] * rect.pivot[axis] * scale
      : -position - rect.sizeDelta[axis] * (1 - rect.pivot[axis]) * scale;
    refresh(child, 0);
    refresh(child, 1);
  }

  function positionChildren(node: GuideNode, axis: Axis) {
    const group = node.layoutGroup!;
    const size = dimension(node, axis);
    const padding = group.padding[axis] + group.padding[axis + 2];
    const leading = group.padding[axis];
    const control = axis === 0 ? group.childControlWidth : group.childControlHeight;
    const useScale = axis === 0 ? group.childScaleWidth : group.childScaleHeight;
    const align = alignment(group, axis);
    const across = (group.axis === "vertical") !== (axis === 1);
    const children = node.children.filter((child) => !child.layoutElement?.ignoreLayout);
    if (group.reverseArrangement) children.reverse();
    const startOffset = (required: number) => leading + (size - required - padding) * align;
    const total = groupMetrics.get(node)![axis];
    let position = leading;
    let flexibleMultiplier = 0;
    if (size > total.preferred) {
      if (total.flexible === 0) position = startOffset(total.preferred - padding);
      else if (total.flexible > 0) flexibleMultiplier = (size - total.preferred) / total.flexible;
    }
    const ratio = total.min === total.preferred ? 0 : clamp((size - total.min) / (total.preferred - total.min), 0, 1);
    for (const child of children) {
      const value = childMetrics(child, group, axis);
      const scale = useScale ? (axis === 0 ? child.scaleX : child.scaleY) : 1;
      if (across) {
        const required = clamp(size - padding, value.min, value.flexible > 0 ? size : value.preferred);
        const start = startOffset(required * scale);
        const offset = control ? 0 : (required - rectangles.get(child)!.sizeDelta[axis]) * align;
        positionChild(child, axis, start + offset, control ? required : undefined, scale);
      } else {
        const required = value.min + (value.preferred - value.min) * ratio + value.flexible * flexibleMultiplier;
        const offset = control ? 0 : (required - rectangles.get(child)!.sizeDelta[axis]) * align;
        positionChild(child, axis, position + offset, control ? required : undefined, scale);
        position += required * scale + group.spacing;
      }
    }
  }

  function control(node: GuideNode, axis: Axis) {
    fitSelf(node, axis);
    if (node.layoutGroup) positionChildren(node, axis);
    node.children.forEach((child) => control(child, axis));
  }

  collect(result, null);
  refresh(result, 0);
  refresh(result, 1);
  calculate(result, 0);
  control(result, 0);
  calculate(result, 1);
  control(result, 1);
  return result;
}
