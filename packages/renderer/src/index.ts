/**
 * @module @zilol-native/renderer
 *
 * Zilol Native — Skia Render Pipeline
 *
 * Rendering is now handled by C++ (SkiaNodeRenderer.h).
 * This package retains damage rect collection, paint caching,
 * and type definitions.
 */

// Types
export type {
  SkCanvas,
  SkPaint,
  SkSurface,
  SkImage,
  SkImageFilter,
  PaintStyle,
  DrawCommand,
  DrawRectCommand,
  DrawRRectCommand,
  DrawRRectStrokeCommand,
  DrawTextCommand,
  DrawImageCommand,
  DrawShadowCommand,
  ClipRRectCommand,
  SaveCommand,
  RestoreCommand,
  TranslateCommand,
  ClearCommand,
} from "./types";

// Pipeline (damage rects only — DisplayList and RenderLoop removed)
export {
  collectDamageRects,
  mergeRects,
  intersects,
  unionRects,
  Compositor,
} from "./pipeline";
export type { PlatformViewFrame } from "./pipeline";

// Paint
export {
  PaintCache,
  paintCache,
  setPaintFactory,
  createShadowFilter,
  setShadowFilterFactory,
} from "./paint";
export type { PaintFactory, ShadowParams, ShadowFilterFactory } from "./paint";
