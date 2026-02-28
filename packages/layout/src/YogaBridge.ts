/**
 * YogaBridge.ts — SkiaNode ↔ Yoga (C++ via JSI) synchronization.
 *
 * Creates and maintains a parallel Yoga layout tree that mirrors the
 * SkiaNode tree. Uses JSI-exposed native functions (`global.__yoga*`)
 * to communicate with the C++ Yoga engine directly — no WASM, no npm
 * package, just synchronous C++ calls over JSI.
 *
 * Each Yoga node is represented by an opaque numeric handle.
 *
 * @example
 * ```ts
 * const bridge = new YogaBridge();
 * bridge.attachNode(rootSkiaNode);
 * bridge.attachNode(childSkiaNode);
 * bridge.calculateLayout(375, 812); // iPhone screen size
 * ```
 */

import type { SkiaNode } from "@zilol-native/nodes";
import {
  toFlexDirection,
  toJustifyContent,
  toAlign,
  toPositionType,
  toOverflow,
  toDisplay,
  toFlexWrap,
  LTR,
  EDGE_TOP,
  EDGE_RIGHT,
  EDGE_BOTTOM,
  EDGE_LEFT,
  Gutter,
} from "./constants";
import { getTextMeasurer, parseFontWeight, MeasureMode } from "./TextMeasure";

// ---------------------------------------------------------------------------
// YogaBridge
// ---------------------------------------------------------------------------

export class YogaBridge {
  /** Map from SkiaNode ID → Yoga node handle (opaque number). */
  private readonly _nodeMap: Map<number, number> = new Map();

  /** The root SkiaNode/handle pair. */
  private _rootHandle: number | null = null;
  private _rootSkiaNode: SkiaNode | null = null;

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Attach a SkiaNode to the Yoga tree.
   *
   * Creates a corresponding Yoga node via JSI, syncs the layout props, and
   * inserts it as a child of the parent's Yoga node (if parent exists).
   */
  attachNode(skiaNode: SkiaNode): void {
    if (this._nodeMap.has(skiaNode.id)) return; // already attached

    const handle = __yogaCreateNode();
    this._nodeMap.set(skiaNode.id, handle);

    // Sync current layout props
    this._syncProps(skiaNode, handle);

    // Set up text measurement for text nodes
    if (skiaNode.type === "text") {
      this._setMeasureFunc(skiaNode, handle);
    }

    // Attach to parent's Yoga node
    if (skiaNode.parent !== null) {
      const parentHandle = this._nodeMap.get(skiaNode.parent.id);
      if (parentHandle !== undefined) {
        const childIndex = skiaNode.parent.children.indexOf(skiaNode);
        __yogaInsertChild(
          parentHandle,
          handle,
          childIndex >= 0 ? childIndex : __yogaGetChildCount(parentHandle),
        );
      }
    }

    // Track root
    if (skiaNode.parent === null) {
      this._rootHandle = handle;
      this._rootSkiaNode = skiaNode;
    }
  }

  /**
   * Detach a SkiaNode from the Yoga tree.
   *
   * Removes the Yoga node from its parent and frees it.
   * Does NOT recursively detach children — caller is responsible.
   */
  detachNode(skiaNode: SkiaNode): void {
    const handle = this._nodeMap.get(skiaNode.id);
    if (handle === undefined) return;

    // Remove from parent
    if (skiaNode.parent !== null) {
      const parentHandle = this._nodeMap.get(skiaNode.parent.id);
      if (parentHandle !== undefined) {
        __yogaRemoveChild(parentHandle, handle);
      }
    }

    __yogaFreeNode(handle);
    this._nodeMap.delete(skiaNode.id);

    if (this._rootSkiaNode === skiaNode) {
      this._rootHandle = null;
      this._rootSkiaNode = null;
    }
  }

  /**
   * Sync the layout props from a SkiaNode to its Yoga node.
   *
   * Call this after prop changes to update the Yoga tree.
   */
  syncProps(skiaNode: SkiaNode): void {
    const handle = this._nodeMap.get(skiaNode.id);
    if (handle === undefined) return;
    this._syncProps(skiaNode, handle);
  }

  /**
   * Run Yoga layout calculation.
   *
   * @param width - Available width (screen/container width)
   * @param height - Available height (screen/container height)
   */
  calculateLayout(width: number, height: number): void {
    if (this._rootHandle === null) return;
    __yogaCalculateLayout(this._rootHandle, width, height, LTR);
  }

  /**
   * Get the Yoga node handle for a given SkiaNode.
   * Returns undefined if not attached.
   */
  getYogaHandle(skiaNode: SkiaNode): number | undefined {
    return this._nodeMap.get(skiaNode.id);
  }

  /**
   * Get computed layout for a SkiaNode.
   * Returns undefined if not attached.
   */
  getComputedLayout(
    skiaNode: SkiaNode,
  ): { left: number; top: number; width: number; height: number } | undefined {
    const handle = this._nodeMap.get(skiaNode.id);
    if (handle === undefined) return undefined;
    return __yogaGetComputedLayout(handle);
  }

  /** Get the root SkiaNode. */
  get rootNode(): SkiaNode | null {
    return this._rootSkiaNode;
  }

  /** Number of attached nodes. */
  get nodeCount(): number {
    return this._nodeMap.size;
  }

  /**
   * Detach all nodes and free all Yoga nodes.
   */
  destroy(): void {
    for (const handle of this._nodeMap.values()) {
      __yogaFreeNode(handle);
    }
    this._nodeMap.clear();
    this._rootHandle = null;
    this._rootSkiaNode = null;
  }

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  /**
   * Sync all layout-related props from a SkiaNode to a Yoga node.
   */
  private _syncProps(skiaNode: SkiaNode, handle: number): void {
    const props = skiaNode.props;

    // --- Dimensions ---
    this._setDimension(handle, "width", props.width);
    this._setDimension(handle, "height", props.height);
    this._setDimension(handle, "minWidth", props.minWidth);
    this._setDimension(handle, "minHeight", props.minHeight);
    this._setDimension(handle, "maxWidth", props.maxWidth);
    this._setDimension(handle, "maxHeight", props.maxHeight);

    // --- Flex ---
    if (props.flex !== undefined) __yogaSetFlex(handle, props.flex as number);
    if (props.flexGrow !== undefined)
      __yogaSetFlexGrow(handle, props.flexGrow as number);
    if (props.flexShrink !== undefined)
      __yogaSetFlexShrink(handle, props.flexShrink as number);

    const flexDir = toFlexDirection(props.flexDirection);
    if (flexDir !== undefined) __yogaSetFlexDirection(handle, flexDir);

    const flexWrap = toFlexWrap(props.flexWrap as string | undefined);
    if (flexWrap !== undefined) __yogaSetFlexWrap(handle, flexWrap);

    // --- Alignment ---
    const justify = toJustifyContent(props.justifyContent);
    if (justify !== undefined) __yogaSetJustifyContent(handle, justify);

    const alignItems = toAlign(props.alignItems);
    if (alignItems !== undefined) __yogaSetAlignItems(handle, alignItems);

    const alignSelf = toAlign(props.alignSelf);
    if (alignSelf !== undefined) __yogaSetAlignSelf(handle, alignSelf);

    const alignContent = toAlign(props.alignContent as string | undefined);
    if (alignContent !== undefined) __yogaSetAlignContent(handle, alignContent);

    // --- Position ---
    const posType = toPositionType(props.position);
    if (posType !== undefined) __yogaSetPositionType(handle, posType);

    if (props.top !== undefined)
      __yogaSetPosition(handle, EDGE_TOP, props.top as number);
    if (props.right !== undefined)
      __yogaSetPosition(handle, EDGE_RIGHT, props.right as number);
    if (props.bottom !== undefined)
      __yogaSetPosition(handle, EDGE_BOTTOM, props.bottom as number);
    if (props.left !== undefined)
      __yogaSetPosition(handle, EDGE_LEFT, props.left as number);

    // --- Padding ---
    if (props.padding !== undefined) {
      const p = props.padding as number;
      __yogaSetPadding(handle, EDGE_TOP, p);
      __yogaSetPadding(handle, EDGE_RIGHT, p);
      __yogaSetPadding(handle, EDGE_BOTTOM, p);
      __yogaSetPadding(handle, EDGE_LEFT, p);
    }
    if (props.paddingHorizontal !== undefined) {
      const p = props.paddingHorizontal as number;
      __yogaSetPadding(handle, EDGE_LEFT, p);
      __yogaSetPadding(handle, EDGE_RIGHT, p);
    }
    if (props.paddingVertical !== undefined) {
      const p = props.paddingVertical as number;
      __yogaSetPadding(handle, EDGE_TOP, p);
      __yogaSetPadding(handle, EDGE_BOTTOM, p);
    }
    if (props.paddingTop !== undefined)
      __yogaSetPadding(handle, EDGE_TOP, props.paddingTop as number);
    if (props.paddingRight !== undefined)
      __yogaSetPadding(handle, EDGE_RIGHT, props.paddingRight as number);
    if (props.paddingBottom !== undefined)
      __yogaSetPadding(handle, EDGE_BOTTOM, props.paddingBottom as number);
    if (props.paddingLeft !== undefined)
      __yogaSetPadding(handle, EDGE_LEFT, props.paddingLeft as number);

    // --- Margin ---
    if (props.margin !== undefined) {
      const m = props.margin as number;
      __yogaSetMargin(handle, EDGE_TOP, m);
      __yogaSetMargin(handle, EDGE_RIGHT, m);
      __yogaSetMargin(handle, EDGE_BOTTOM, m);
      __yogaSetMargin(handle, EDGE_LEFT, m);
    }
    if (props.marginHorizontal !== undefined) {
      const m = props.marginHorizontal as number;
      __yogaSetMargin(handle, EDGE_LEFT, m);
      __yogaSetMargin(handle, EDGE_RIGHT, m);
    }
    if (props.marginVertical !== undefined) {
      const m = props.marginVertical as number;
      __yogaSetMargin(handle, EDGE_TOP, m);
      __yogaSetMargin(handle, EDGE_BOTTOM, m);
    }
    if (props.marginTop !== undefined)
      __yogaSetMargin(handle, EDGE_TOP, props.marginTop as number);
    if (props.marginRight !== undefined)
      __yogaSetMargin(handle, EDGE_RIGHT, props.marginRight as number);
    if (props.marginBottom !== undefined)
      __yogaSetMargin(handle, EDGE_BOTTOM, props.marginBottom as number);
    if (props.marginLeft !== undefined)
      __yogaSetMargin(handle, EDGE_LEFT, props.marginLeft as number);

    // --- Gap ---
    if (props.gap !== undefined)
      __yogaSetGap(handle, Gutter.All, props.gap as number);
    if (props.rowGap !== undefined)
      __yogaSetGap(handle, Gutter.Row, props.rowGap as number);
    if (props.columnGap !== undefined)
      __yogaSetGap(handle, Gutter.Column, props.columnGap as number);

    // --- Overflow ---
    const overflow = toOverflow(props.overflow);
    if (overflow !== undefined) __yogaSetOverflow(handle, overflow);

    // --- Display ---
    const display = toDisplay(props.display as string | undefined);
    if (display !== undefined) __yogaSetDisplay(handle, display);

    // --- Aspect Ratio ---
    if (props.aspectRatio !== undefined)
      __yogaSetAspectRatio(handle, props.aspectRatio as number);
  }

  /**
   * Set a dimension (width/height/min/max) on a Yoga node.
   * Handles number, percentage string, and "auto".
   */
  private _setDimension(
    handle: number,
    prop: string,
    value: number | string | undefined,
  ): void {
    if (value === undefined) return;

    if (value === "auto") {
      switch (prop) {
        case "width":
          __yogaSetWidthAuto(handle);
          break;
        case "height":
          __yogaSetHeightAuto(handle);
          break;
      }
      return;
    }

    if (typeof value === "string" && value.endsWith("%")) {
      const pct = parseFloat(value);
      switch (prop) {
        case "width":
          __yogaSetWidthPercent(handle, pct);
          break;
        case "height":
          __yogaSetHeightPercent(handle, pct);
          break;
        case "minWidth":
          __yogaSetMinWidthPercent(handle, pct);
          break;
        case "minHeight":
          __yogaSetMinHeightPercent(handle, pct);
          break;
        case "maxWidth":
          __yogaSetMaxWidthPercent(handle, pct);
          break;
        case "maxHeight":
          __yogaSetMaxHeightPercent(handle, pct);
          break;
      }
      return;
    }

    const num = typeof value === "number" ? value : parseFloat(value);
    switch (prop) {
      case "width":
        __yogaSetWidth(handle, num);
        break;
      case "height":
        __yogaSetHeight(handle, num);
        break;
      case "minWidth":
        __yogaSetMinWidth(handle, num);
        break;
      case "minHeight":
        __yogaSetMinHeight(handle, num);
        break;
      case "maxWidth":
        __yogaSetMaxWidth(handle, num);
        break;
      case "maxHeight":
        __yogaSetMaxHeight(handle, num);
        break;
    }
  }

  /**
   * Set up a Yoga measure function for text nodes.
   */
  private _setMeasureFunc(skiaNode: SkiaNode, handle: number): void {
    __yogaSetMeasureFunc(
      handle,
      (
        width: number,
        widthMode: number,
        height: number,
        heightMode: number,
      ) => {
        const measurer = getTextMeasurer();
        const props = skiaNode.props;

        return measurer(
          (props.text as string) ?? "",
          (props.fontSize as number) ?? 14,
          props.fontFamily as string | undefined,
          parseFontWeight(props.fontWeight as string | number | undefined),
          width,
          widthMode as MeasureMode,
          height,
          heightMode as MeasureMode,
          props.lineHeight as number | undefined,
          props.maxLines as number | undefined,
        );
      },
    );
  }
}
