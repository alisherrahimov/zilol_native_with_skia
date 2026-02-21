/**
 * yogaJSIMock.ts — In-memory mock of the Yoga JSI bindings.
 *
 * Provides a minimal flexbox layout implementation backed by plain
 * JS objects for testing purposes. Supports:
 * - Width / Height / Percent / Auto dimensions
 * - Flex / FlexGrow / FlexShrink
 * - FlexDirection (row / column)
 * - Padding / Margin
 * - Position (relative / absolute)
 *
 * This is NOT a full Yoga implementation — just enough to satisfy
 * the existing test suite.
 */

import { Edge, FlexDirection, Direction } from "../src/constants";

// ---------------------------------------------------------------------------
// Internal mock node
// ---------------------------------------------------------------------------

interface MockYogaNode {
  parent: MockYogaNode | null;
  children: MockYogaNode[];
  measureFunc:
    | ((
        w: number,
        wm: number,
        h: number,
        hm: number,
      ) => { width: number; height: number })
    | null;

  // Style
  width: number | undefined;
  widthPercent: number | undefined;
  widthAuto: boolean;
  height: number | undefined;
  heightPercent: number | undefined;
  heightAuto: boolean;
  minWidth: number | undefined;
  minWidthPercent: number | undefined;
  minHeight: number | undefined;
  minHeightPercent: number | undefined;
  maxWidth: number | undefined;
  maxWidthPercent: number | undefined;
  maxHeight: number | undefined;
  maxHeightPercent: number | undefined;

  flex: number | undefined;
  flexGrow: number;
  flexShrink: number;
  flexDirection: number;
  flexWrap: number;

  justifyContent: number;
  alignItems: number;
  alignSelf: number;
  alignContent: number;

  positionType: number;
  position: Record<number, number | undefined>;

  padding: Record<number, number>;
  margin: Record<number, number>;

  gap: Record<number, number>;

  overflow: number;
  display: number;
  aspectRatio: number | undefined;

  // Computed layout
  computedLayout: { left: number; top: number; width: number; height: number };
}

// ---------------------------------------------------------------------------
// Node storage
// ---------------------------------------------------------------------------

let _nextHandle = 1;
const _nodes = new Map<number, MockYogaNode>();

function createNode(): MockYogaNode {
  return {
    parent: null,
    children: [],
    measureFunc: null,
    width: undefined,
    widthPercent: undefined,
    widthAuto: false,
    height: undefined,
    heightPercent: undefined,
    heightAuto: false,
    minWidth: undefined,
    minWidthPercent: undefined,
    minHeight: undefined,
    minHeightPercent: undefined,
    maxWidth: undefined,
    maxWidthPercent: undefined,
    maxHeight: undefined,
    maxHeightPercent: undefined,
    flex: undefined,
    flexGrow: 0,
    flexShrink: 0,
    flexDirection: FlexDirection.Column,
    flexWrap: 0,
    justifyContent: 0,
    alignItems: 4, // Stretch
    alignSelf: 0,
    alignContent: 0,
    positionType: 1, // Relative
    position: {},
    padding: {},
    margin: {},
    gap: {},
    overflow: 0,
    display: 0,
    aspectRatio: undefined,
    computedLayout: { left: 0, top: 0, width: 0, height: 0 },
  };
}

function getNode(handle: number): MockYogaNode {
  const node = _nodes.get(handle);
  if (!node) throw new Error(`YogaJSI mock: invalid handle ${handle}`);
  return node;
}

// ---------------------------------------------------------------------------
// Simple layout calculator
// ---------------------------------------------------------------------------

function resolveWidth(
  node: MockYogaNode,
  parentWidth: number,
): number | undefined {
  if (node.width !== undefined) return node.width;
  if (node.widthPercent !== undefined)
    return (node.widthPercent / 100) * parentWidth;
  return undefined;
}

function resolveHeight(
  node: MockYogaNode,
  parentHeight: number,
): number | undefined {
  if (node.height !== undefined) return node.height;
  if (node.heightPercent !== undefined)
    return (node.heightPercent / 100) * parentHeight;
  return undefined;
}

function getPadding(node: MockYogaNode, edge: number): number {
  return node.padding[edge] ?? 0;
}

function getMargin(node: MockYogaNode, edge: number): number {
  return node.margin[edge] ?? 0;
}

/**
 * Layout a node's children within the node's content area.
 * The node's own computedLayout dimensions must already be set by the caller
 * (or by resolving against availableWidth/Height for the root node).
 */
function calculateLayoutRecursive(
  node: MockYogaNode,
  availableWidth: number,
  availableHeight: number,
  isRoot: boolean = false,
): void {
  const padTop = getPadding(node, Edge.Top);
  const padRight = getPadding(node, Edge.Right);
  const padBottom = getPadding(node, Edge.Bottom);
  const padLeft = getPadding(node, Edge.Left);

  // Only resolve the node's own dimensions for the root call.
  // Non-root nodes already have their computedLayout set by their parent.
  if (isRoot) {
    const nodeWidth = resolveWidth(node, availableWidth) ?? availableWidth;
    const nodeHeight = resolveHeight(node, availableHeight) ?? availableHeight;
    node.computedLayout.width = nodeWidth;
    node.computedLayout.height = nodeHeight;
  }

  // Content area (inside padding)
  const contentWidth = node.computedLayout.width - padLeft - padRight;
  const contentHeight = node.computedLayout.height - padTop - padBottom;

  const isRow =
    node.flexDirection === FlexDirection.Row ||
    node.flexDirection === FlexDirection.RowReverse;

  // Pass 1: measure fixed children, collect flex totals
  let usedMain = 0;
  let totalFlex = 0;
  const childSizes: {
    main: number | undefined;
    cross: number | undefined;
    flex: number;
    marginMain: number;
    marginCross: number;
  }[] = [];

  for (const child of node.children) {
    const childResolvedWidth = resolveWidth(child, contentWidth);
    const childResolvedHeight = resolveHeight(child, contentHeight);

    const flexVal = child.flex ?? (child.flexGrow > 0 ? child.flexGrow : 0);

    const marginTop = getMargin(child, Edge.Top);
    const marginLeft = getMargin(child, Edge.Left);

    if (isRow) {
      const marginMain = marginLeft;
      const marginCross = marginTop;
      if (flexVal > 0 && childResolvedWidth === undefined) {
        totalFlex += flexVal;
        childSizes.push({
          main: undefined,
          cross: childResolvedHeight,
          flex: flexVal,
          marginMain,
          marginCross,
        });
      } else {
        const w = childResolvedWidth ?? 0;
        usedMain += w + marginMain;
        childSizes.push({
          main: w,
          cross: childResolvedHeight,
          flex: 0,
          marginMain,
          marginCross,
        });
      }
    } else {
      const marginMain = marginTop;
      const marginCross = marginLeft;
      if (flexVal > 0 && childResolvedHeight === undefined) {
        totalFlex += flexVal;
        childSizes.push({
          main: undefined,
          cross: childResolvedWidth,
          flex: flexVal,
          marginMain,
          marginCross,
        });
      } else {
        const h = childResolvedHeight ?? 0;
        usedMain += h + marginMain;
        childSizes.push({
          main: h,
          cross: childResolvedWidth,
          flex: 0,
          marginMain,
          marginCross,
        });
      }
    }
  }

  // Pass 2: distribute remaining space to flex children
  const mainContent = isRow ? contentWidth : contentHeight;
  const remaining = Math.max(0, mainContent - usedMain);

  for (const size of childSizes) {
    if (size.flex > 0 && size.main === undefined) {
      size.main = totalFlex > 0 ? (size.flex / totalFlex) * remaining : 0;
    }
  }

  // Pass 3: position children and recurse
  let mainOffset = isRow ? padLeft : padTop;
  const crossOffset = isRow ? padTop : padLeft;

  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    const size = childSizes[i];

    const childMainSize = size.main ?? 0;
    const crossContent = isRow ? contentHeight : contentWidth;

    // Apply margin to offset
    mainOffset += size.marginMain;

    // Determine child dimensions
    let childWidth: number;
    let childHeight: number;

    if (isRow) {
      childWidth = childMainSize;
      childHeight = size.cross ?? crossContent; // stretch by default
      child.computedLayout.left = mainOffset;
      child.computedLayout.top = crossOffset + size.marginCross;
    } else {
      childWidth = size.cross ?? crossContent; // stretch by default
      childHeight = childMainSize;
      child.computedLayout.left = crossOffset + size.marginCross;
      child.computedLayout.top = mainOffset;
    }

    child.computedLayout.width = childWidth;
    child.computedLayout.height = childHeight;

    // Recurse into children (dimensions already set, not root)
    calculateLayoutRecursive(child, childWidth, childHeight, false);

    mainOffset += childMainSize;
  }
}

// ---------------------------------------------------------------------------
// Install mock on globalThis
// ---------------------------------------------------------------------------

export function installYogaJSIMock(): void {
  _nextHandle = 1;
  _nodes.clear();

  // Node lifecycle
  (globalThis as any).__yogaCreateNode = (): number => {
    const handle = _nextHandle++;
    _nodes.set(handle, createNode());
    return handle;
  };

  (globalThis as any).__yogaFreeNode = (handle: number): void => {
    _nodes.delete(handle);
  };

  // Tree operations
  (globalThis as any).__yogaInsertChild = (
    parent: number,
    child: number,
    index: number,
  ): void => {
    const p = getNode(parent);
    const c = getNode(child);
    c.parent = p;
    p.children.splice(index, 0, c);
  };

  (globalThis as any).__yogaRemoveChild = (
    parent: number,
    child: number,
  ): void => {
    const p = getNode(parent);
    const c = getNode(child);
    const idx = p.children.indexOf(c);
    if (idx >= 0) p.children.splice(idx, 1);
    c.parent = null;
  };

  (globalThis as any).__yogaGetChildCount = (handle: number): number => {
    return getNode(handle).children.length;
  };

  // Layout
  (globalThis as any).__yogaCalculateLayout = (
    handle: number,
    width: number,
    height: number,
    _dir: number,
  ): void => {
    const node = getNode(handle);
    node.computedLayout.left = 0;
    node.computedLayout.top = 0;
    calculateLayoutRecursive(node, width, height, true);
  };

  (globalThis as any).__yogaGetComputedLayout = (
    handle: number,
  ): { left: number; top: number; width: number; height: number } => {
    return { ...getNode(handle).computedLayout };
  };

  (globalThis as any).__yogaMarkDirty = (_handle: number): void => {
    // no-op in mock
  };

  // Dimensions
  (globalThis as any).__yogaSetWidth = (handle: number, v: number) => {
    getNode(handle).width = v;
  };
  (globalThis as any).__yogaSetWidthPercent = (handle: number, v: number) => {
    getNode(handle).widthPercent = v;
  };
  (globalThis as any).__yogaSetWidthAuto = (handle: number) => {
    getNode(handle).widthAuto = true;
    getNode(handle).width = undefined;
    getNode(handle).widthPercent = undefined;
  };

  (globalThis as any).__yogaSetHeight = (handle: number, v: number) => {
    getNode(handle).height = v;
  };
  (globalThis as any).__yogaSetHeightPercent = (handle: number, v: number) => {
    getNode(handle).heightPercent = v;
  };
  (globalThis as any).__yogaSetHeightAuto = (handle: number) => {
    getNode(handle).heightAuto = true;
    getNode(handle).height = undefined;
    getNode(handle).heightPercent = undefined;
  };

  (globalThis as any).__yogaSetMinWidth = (handle: number, v: number) => {
    getNode(handle).minWidth = v;
  };
  (globalThis as any).__yogaSetMinWidthPercent = (
    handle: number,
    v: number,
  ) => {
    getNode(handle).minWidthPercent = v;
  };
  (globalThis as any).__yogaSetMinHeight = (handle: number, v: number) => {
    getNode(handle).minHeight = v;
  };
  (globalThis as any).__yogaSetMinHeightPercent = (
    handle: number,
    v: number,
  ) => {
    getNode(handle).minHeightPercent = v;
  };
  (globalThis as any).__yogaSetMaxWidth = (handle: number, v: number) => {
    getNode(handle).maxWidth = v;
  };
  (globalThis as any).__yogaSetMaxWidthPercent = (
    handle: number,
    v: number,
  ) => {
    getNode(handle).maxWidthPercent = v;
  };
  (globalThis as any).__yogaSetMaxHeight = (handle: number, v: number) => {
    getNode(handle).maxHeight = v;
  };
  (globalThis as any).__yogaSetMaxHeightPercent = (
    handle: number,
    v: number,
  ) => {
    getNode(handle).maxHeightPercent = v;
  };

  // Flex
  (globalThis as any).__yogaSetFlex = (handle: number, v: number) => {
    getNode(handle).flex = v;
  };
  (globalThis as any).__yogaSetFlexGrow = (handle: number, v: number) => {
    getNode(handle).flexGrow = v;
  };
  (globalThis as any).__yogaSetFlexShrink = (handle: number, v: number) => {
    getNode(handle).flexShrink = v;
  };
  (globalThis as any).__yogaSetFlexDirection = (handle: number, v: number) => {
    getNode(handle).flexDirection = v;
  };
  (globalThis as any).__yogaSetFlexWrap = (handle: number, v: number) => {
    getNode(handle).flexWrap = v;
  };

  // Alignment
  (globalThis as any).__yogaSetJustifyContent = (handle: number, v: number) => {
    getNode(handle).justifyContent = v;
  };
  (globalThis as any).__yogaSetAlignItems = (handle: number, v: number) => {
    getNode(handle).alignItems = v;
  };
  (globalThis as any).__yogaSetAlignSelf = (handle: number, v: number) => {
    getNode(handle).alignSelf = v;
  };
  (globalThis as any).__yogaSetAlignContent = (handle: number, v: number) => {
    getNode(handle).alignContent = v;
  };

  // Position
  (globalThis as any).__yogaSetPositionType = (handle: number, v: number) => {
    getNode(handle).positionType = v;
  };
  (globalThis as any).__yogaSetPosition = (
    handle: number,
    edge: number,
    v: number,
  ) => {
    getNode(handle).position[edge] = v;
  };

  // Spacing
  (globalThis as any).__yogaSetPadding = (
    handle: number,
    edge: number,
    v: number,
  ) => {
    getNode(handle).padding[edge] = v;
  };
  (globalThis as any).__yogaSetMargin = (
    handle: number,
    edge: number,
    v: number,
  ) => {
    getNode(handle).margin[edge] = v;
  };

  // Gap
  (globalThis as any).__yogaSetGap = (
    handle: number,
    gutter: number,
    v: number,
  ) => {
    getNode(handle).gap[gutter] = v;
  };

  // Other
  (globalThis as any).__yogaSetOverflow = (handle: number, v: number) => {
    getNode(handle).overflow = v;
  };
  (globalThis as any).__yogaSetDisplay = (handle: number, v: number) => {
    getNode(handle).display = v;
  };
  (globalThis as any).__yogaSetAspectRatio = (handle: number, v: number) => {
    getNode(handle).aspectRatio = v;
  };

  // Measure function
  (globalThis as any).__yogaSetMeasureFunc = (
    handle: number,
    cb: (
      w: number,
      wm: number,
      h: number,
      hm: number,
    ) => { width: number; height: number },
  ) => {
    getNode(handle).measureFunc = cb;
  };

  // Config
  (globalThis as any).__yogaSetPointScaleFactor = (_factor: number): void => {
    // no-op in mock
  };
}

export function uninstallYogaJSIMock(): void {
  const fns = [
    "__yogaCreateNode",
    "__yogaFreeNode",
    "__yogaInsertChild",
    "__yogaRemoveChild",
    "__yogaGetChildCount",
    "__yogaCalculateLayout",
    "__yogaGetComputedLayout",
    "__yogaMarkDirty",
    "__yogaSetWidth",
    "__yogaSetWidthPercent",
    "__yogaSetWidthAuto",
    "__yogaSetHeight",
    "__yogaSetHeightPercent",
    "__yogaSetHeightAuto",
    "__yogaSetMinWidth",
    "__yogaSetMinWidthPercent",
    "__yogaSetMinHeight",
    "__yogaSetMinHeightPercent",
    "__yogaSetMaxWidth",
    "__yogaSetMaxWidthPercent",
    "__yogaSetMaxHeight",
    "__yogaSetMaxHeightPercent",
    "__yogaSetFlex",
    "__yogaSetFlexGrow",
    "__yogaSetFlexShrink",
    "__yogaSetFlexDirection",
    "__yogaSetFlexWrap",
    "__yogaSetJustifyContent",
    "__yogaSetAlignItems",
    "__yogaSetAlignSelf",
    "__yogaSetAlignContent",
    "__yogaSetPositionType",
    "__yogaSetPosition",
    "__yogaSetPadding",
    "__yogaSetMargin",
    "__yogaSetGap",
    "__yogaSetOverflow",
    "__yogaSetDisplay",
    "__yogaSetAspectRatio",
    "__yogaSetMeasureFunc",
    "__yogaSetPointScaleFactor",
  ];
  for (const fn of fns) {
    delete (globalThis as any)[fn];
  }
  _nodes.clear();
}
