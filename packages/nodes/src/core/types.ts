/**
 * Shared type definitions for the SkiaNode tree.
 *
 * These types are used across all node-related packages.
 * Keep this file dependency-free — no imports from other packages.
 */

// ---------------------------------------------------------------------------
// Node Types
// ---------------------------------------------------------------------------

/** All possible SkiaNode types in the tree. */
export type SkiaNodeType =
  | "view" // Rectangle with bg, border, shadow, clip
  | "text" // Text with Skia Paragraph API
  | "image" // Bitmap/SVG rendering
  | "scroll" // Scrollable container with physics
  | "canvas" // Raw Skia canvas for custom drawing
  | "marker" // Invisible — used by Show/For for structural changes
  | "platform" // Native view island (TextInput, Maps, etc.)
  | "activityIndicator"; // Spinning loading indicator

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

/** Axis-aligned bounding rectangle. */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Computed layout result (populated by Yoga in Phase 3). */
export interface NodeLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  absoluteX: number;
  absoluteY: number;
}

// ---------------------------------------------------------------------------
// Edges (padding, margin, border)
// ---------------------------------------------------------------------------

/** Four-sided edge values. */
export interface EdgeInsets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

// ---------------------------------------------------------------------------
// Border Radius
// ---------------------------------------------------------------------------

/** Per-corner border radius. */
export interface BorderRadius {
  readonly topLeft: number;
  readonly topRight: number;
  readonly bottomRight: number;
  readonly bottomLeft: number;
}

// ---------------------------------------------------------------------------
// Shadow
// ---------------------------------------------------------------------------

/** Drop shadow definition. */
export interface ShadowProps {
  readonly color: string;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly blurRadius: number;
  readonly spreadRadius?: number;
}

// ---------------------------------------------------------------------------
// Text Alignment
// ---------------------------------------------------------------------------

export type TextAlign = "left" | "center" | "right" | "justify";
export type FontWeight =
  | "normal"
  | "bold"
  | "100"
  | "200"
  | "300"
  | "400"
  | "500"
  | "600"
  | "700"
  | "800"
  | "900";
export type TextOverflow = "clip" | "ellipsis" | "visible";
export type ResizeMode = "cover" | "contain" | "stretch" | "center";
export type Overflow = "visible" | "hidden" | "scroll";

// ---------------------------------------------------------------------------
// Node Props
// ---------------------------------------------------------------------------

/**
 * All possible props a SkiaNode can hold.
 * Not all props apply to all node types. The renderer checks node type
 * and reads only the relevant props.
 *
 * Values are stored as `unknown` in the node's prop bag — type-safe
 * element factories constrain what gets set.
 */
export interface SkiaNodeProps {
  // -- Layout (consumed by Yoga in Phase 3) --
  width?: number | string;
  height?: number | string;
  minWidth?: number | string;
  minHeight?: number | string;
  maxWidth?: number | string;
  maxHeight?: number | string;
  flex?: number;
  flexDirection?: "row" | "column" | "row-reverse" | "column-reverse";
  justifyContent?:
    | "flex-start"
    | "flex-end"
    | "center"
    | "space-between"
    | "space-around"
    | "space-evenly";
  alignItems?: "flex-start" | "flex-end" | "center" | "stretch" | "baseline";
  alignSelf?:
    | "auto"
    | "flex-start"
    | "flex-end"
    | "center"
    | "stretch"
    | "baseline";
  position?: "relative" | "absolute";
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
  left?: number | string;
  overflow?: Overflow;

  // -- Spacing --
  padding?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingHorizontal?: number;
  paddingVertical?: number;
  margin?: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginHorizontal?: number;
  marginVertical?: number;

  // -- Visual (consumed by Renderer in Phase 3) --
  backgroundColor?: string;
  borderRadius?: number | BorderRadius;
  borderWidth?: number;
  borderColor?: string;
  shadow?: ShadowProps;
  opacity?: number;
  clip?: boolean;

  // -- Text --
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: FontWeight;
  color?: string;
  lineHeight?: number;
  maxLines?: number;
  textAlign?: TextAlign;
  textOverflow?: TextOverflow;

  // -- Image --
  src?: string;
  resizeMode?: ResizeMode;
  tintColor?: string;

  // -- Scroll --
  scrollX?: number;
  scrollY?: number;
  horizontal?: boolean;
  bounces?: boolean;
  showsScrollIndicator?: boolean;
  scrollEnabled?: boolean;
  pagingEnabled?: boolean;
  snapToInterval?: number;
  decelerationRate?: "normal" | "fast" | number;
  contentWidth?: number;
  contentHeight?: number;
  onScroll?: (offset: { x: number; y: number }) => void;
  onScrollEnd?: (offset: { x: number; y: number }) => void;
  onScrollBeginDrag?: () => void;
  onScrollEndDrag?: () => void;

  // -- Canvas --
  onDraw?: (canvas: unknown) => void;

  // -- Platform --
  nativeViewType?: string;
  nativeProps?: Record<string, unknown>;

  // -- Interaction --
  touchable?: boolean;
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  onLongPress?: () => void;

  // -- Catch-all for custom/future props --
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Dirty Tracking
// ---------------------------------------------------------------------------

/** Why a node was marked dirty. */
export type DirtyReason = "prop" | "layout" | "children";

// ---------------------------------------------------------------------------
// Frame Callback
// ---------------------------------------------------------------------------

/** Callback invoked when a render frame is needed. */
export type FrameCallback = () => void;
