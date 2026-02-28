/**
 * @module @zilol-native/layout
 *
 * Zilol Native — Yoga Layout Bridge (C++ via JSI)
 *
 * Bridges the SkiaNode tree to the native C++ Yoga engine via JSI
 * for high-performance flexbox layout calculation. Reads layout props
 * from SkiaNodes, applies them via JSI calls, and syncs computed
 * layout results back.
 *
 * @example
 * ```ts
 * import { YogaBridge, syncLayoutResults, setTextMeasurer } from '@zilol-native/layout';
 *
 * const bridge = new YogaBridge();
 * bridge.attachNode(rootNode);
 * bridge.attachNode(childNode);
 * bridge.calculateLayout(375, 812);
 * syncLayoutResults(rootNode, bridge);
 * ```
 */

// Core
export { YogaBridge } from "./YogaBridge";
export { syncLayoutResults } from "./LayoutSync";

// Text measurement
export {
  setTextMeasurer,
  getTextMeasurer,
  parseFontWeight,
  _resetTextMeasurer,
  MeasureMode,
} from "./TextMeasure";
export type { TextMeasureFunc, MeasureResult } from "./TextMeasure";

// Constants (Yoga enums)
export {
  FlexDirection,
  Justify,
  Align,
  PositionType,
  Overflow,
  Display,
  Wrap,
  Direction,
  Edge,
  Gutter,
  toFlexDirection,
  toJustifyContent,
  toAlign,
  toPositionType,
  toOverflow,
  toDisplay,
  toFlexWrap,
  LTR,
  RTL,
  EDGE_TOP,
  EDGE_RIGHT,
  EDGE_BOTTOM,
  EDGE_LEFT,
  EDGE_ALL,
} from "./constants";
