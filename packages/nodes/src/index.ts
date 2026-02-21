/**
 * @module @zilol-native/nodes
 *
 * Zilol Native — SkiaNode Tree
 *
 * Lightweight node tree that replaces native views. Each node is ~100-200 bytes.
 * Supports tree operations, prop storage, dirty tracking, object pooling,
 * and reactive prop binding.
 *
 * @example
 * ```ts
 * import {
 *   SkiaNode, nodePool, dirtyTracker,
 *   createViewNode, createTextNode,
 *   bindProps,
 * } from '@zilol-native/nodes';
 * ```
 */

// Core
export { SkiaNode, _resetNodeIdCounter, dirtyTracker, nodePool } from "./core";
export type {
  SkiaNodeType,
  SkiaNodeProps,
  NodeLayout,
  Rect,
  EdgeInsets,
  BorderRadius,
  ShadowProps,
  TextAlign,
  FontWeight,
  TextOverflow,
  ResizeMode,
  Overflow,
  DirtyReason,
  FrameCallback,
} from "./core";

// Elements
export {
  createViewNode,
  createTextNode,
  createImageNode,
  createScrollNode,
  createCanvasNode,
  createMarkerNode,
  createPlatformNode,
  createActivityIndicatorNode,
} from "./elements";
export type {
  ViewNodeProps,
  TextNodeProps,
  ImageNodeProps,
  ScrollNodeProps,
  CanvasNodeProps,
  PlatformNodeProps,
} from "./elements";

// Props
export { bindProps, normalizeStyle, mergeStyles } from "./props";
export type { ReactiveProp, ReactiveProps, StyleProps } from "./props";
