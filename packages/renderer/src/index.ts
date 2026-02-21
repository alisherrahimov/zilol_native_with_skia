/**
 * @module @zilol-native/renderer
 *
 * Zilol Native — Skia Render Pipeline
 *
 * Defines the render pipeline: damage rect collection, display list
 * caching, draw dispatchers, paint caching, and frame lifecycle.
 *
 * Uses opaque Skia interfaces for testability — the actual Skia
 * objects are injected by the platform layer.
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

// Pipeline
export {
  collectDamageRects,
  mergeRects,
  intersects,
  unionRects,
  DisplayList,
  RenderLoop,
  Compositor,
} from "./pipeline";
export type { CommandExecutor, PlatformViewFrame } from "./pipeline";

// Draw
export { drawNode, drawView, drawText, drawImage, drawScroll } from "./draw";

// Paint
export {
  PaintCache,
  paintCache,
  setPaintFactory,
  createShadowFilter,
  setShadowFilterFactory,
} from "./paint";
export type { PaintFactory, ShadowParams, ShadowFilterFactory } from "./paint";
