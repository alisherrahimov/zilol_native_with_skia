/**
 * YogaJSI.d.ts — TypeScript declarations for the native C++ Yoga JSI bindings.
 *
 * These functions are registered by the native host on `globalThis` during
 * app startup. Each Yoga node is represented by an opaque numeric handle
 * (the native side maintains a handle → YGNodeRef map).
 *
 * Numeric enum values (FlexDirection, Justify, Align, etc.) must match
 * the C++ YGEnums.h values defined in constants.ts.
 */

/* eslint-disable no-var */

/** Result of a computed layout query. */
interface YogaComputedLayout {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Result returned from a measure callback. */
interface YogaMeasureResult {
  width: number;
  height: number;
}

/** Measure callback signature (JS → native → JS round-trip). */
type YogaMeasureCallback = (
  width: number,
  widthMode: number,
  height: number,
  heightMode: number,
) => YogaMeasureResult;

declare global {
  // -------------------------------------------------------------------------
  // Node lifecycle
  // -------------------------------------------------------------------------

  /** Create a new Yoga node. Returns an opaque handle. */
  var __yogaCreateNode: () => number;

  /** Free a Yoga node by handle. */
  var __yogaFreeNode: (handle: number) => void;

  // -------------------------------------------------------------------------
  // Tree operations
  // -------------------------------------------------------------------------

  /** Insert a child node at the given index. */
  var __yogaInsertChild: (parent: number, child: number, index: number) => void;

  /** Remove a child node from its parent. */
  var __yogaRemoveChild: (parent: number, child: number) => void;

  /** Get the number of children. */
  var __yogaGetChildCount: (handle: number) => number;

  // -------------------------------------------------------------------------
  // Layout calculation
  // -------------------------------------------------------------------------

  /** Calculate layout for the tree rooted at this node. */
  var __yogaCalculateLayout: (
    handle: number,
    availableWidth: number,
    availableHeight: number,
    direction: number,
  ) => void;

  /** Get computed layout results after calculation. */
  var __yogaGetComputedLayout: (handle: number) => YogaComputedLayout;

  /** Mark a node as dirty (needs re-layout). */
  var __yogaMarkDirty: (handle: number) => void;

  // -------------------------------------------------------------------------
  // Dimensions
  // -------------------------------------------------------------------------

  var __yogaSetWidth: (handle: number, value: number) => void;
  var __yogaSetWidthPercent: (handle: number, value: number) => void;
  var __yogaSetWidthAuto: (handle: number) => void;

  var __yogaSetHeight: (handle: number, value: number) => void;
  var __yogaSetHeightPercent: (handle: number, value: number) => void;
  var __yogaSetHeightAuto: (handle: number) => void;

  var __yogaSetMinWidth: (handle: number, value: number) => void;
  var __yogaSetMinWidthPercent: (handle: number, value: number) => void;

  var __yogaSetMinHeight: (handle: number, value: number) => void;
  var __yogaSetMinHeightPercent: (handle: number, value: number) => void;

  var __yogaSetMaxWidth: (handle: number, value: number) => void;
  var __yogaSetMaxWidthPercent: (handle: number, value: number) => void;

  var __yogaSetMaxHeight: (handle: number, value: number) => void;
  var __yogaSetMaxHeightPercent: (handle: number, value: number) => void;

  // -------------------------------------------------------------------------
  // Flex
  // -------------------------------------------------------------------------

  var __yogaSetFlex: (handle: number, value: number) => void;
  var __yogaSetFlexGrow: (handle: number, value: number) => void;
  var __yogaSetFlexShrink: (handle: number, value: number) => void;
  var __yogaSetFlexDirection: (handle: number, value: number) => void;
  var __yogaSetFlexWrap: (handle: number, value: number) => void;

  // -------------------------------------------------------------------------
  // Alignment
  // -------------------------------------------------------------------------

  var __yogaSetJustifyContent: (handle: number, value: number) => void;
  var __yogaSetAlignItems: (handle: number, value: number) => void;
  var __yogaSetAlignSelf: (handle: number, value: number) => void;
  var __yogaSetAlignContent: (handle: number, value: number) => void;

  // -------------------------------------------------------------------------
  // Position
  // -------------------------------------------------------------------------

  var __yogaSetPositionType: (handle: number, value: number) => void;
  var __yogaSetPosition: (handle: number, edge: number, value: number) => void;

  // -------------------------------------------------------------------------
  // Spacing (Padding, Margin)
  // -------------------------------------------------------------------------

  var __yogaSetPadding: (handle: number, edge: number, value: number) => void;

  var __yogaSetMargin: (handle: number, edge: number, value: number) => void;

  // -------------------------------------------------------------------------
  // Gap
  // -------------------------------------------------------------------------

  var __yogaSetGap: (handle: number, gutter: number, value: number) => void;

  // -------------------------------------------------------------------------
  // Other properties
  // -------------------------------------------------------------------------

  var __yogaSetOverflow: (handle: number, value: number) => void;
  var __yogaSetDisplay: (handle: number, value: number) => void;
  var __yogaSetAspectRatio: (handle: number, value: number) => void;

  // -------------------------------------------------------------------------
  // Measure function
  // -------------------------------------------------------------------------

  /** Register a JS measure callback for leaf nodes (e.g. text). */
  var __yogaSetMeasureFunc: (
    handle: number,
    callback: YogaMeasureCallback,
  ) => void;

  // -------------------------------------------------------------------------
  // Config
  // -------------------------------------------------------------------------

  /** Set the point scale factor for the global Yoga config. */
  var __yogaSetPointScaleFactor: (factor: number) => void;
}

export {};
