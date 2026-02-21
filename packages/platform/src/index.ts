/**
 * @module @zilol-native/platform
 *
 * Zilol Native — Platform Layer
 *
 * The orchestrator that ties together runtime, nodes, layout, and
 * renderer. Provides JSI abstractions for Skia, events, and app lifecycle.
 *
 * @example
 * ```ts
 * import { runApp, getCurrentApp } from '@zilol-native/platform';
 *
 * runApp(() => {
 *   const root = new SkiaNode("view");
 *   root.setProp("flex", 1);
 *   root.setProp("backgroundColor", "#FFFFFF");
 *   return root;
 * });
 * ```
 */

// App bootstrap
export { runApp, getCurrentApp } from "./ZilolApp";
export type { RunAppOptions, ZilolAppInstance } from "./ZilolApp";

// Event dispatch
export { EventDispatcher, TouchPhase } from "./EventDispatch";
export type { TouchEvent } from "./EventDispatch";

// Hit testing
export { hitTest } from "./HitTest";
export type { Point } from "./HitTest";

// Canvas executor
export { createCanvasExecutor } from "./CanvasExecutor";

// Platform adapter
export {
  setPlatformAdapter,
  getPlatformAdapter,
  JSIPlatformAdapter,
  _resetPlatformAdapter,
} from "./PlatformAdapter";
export type {
  PlatformAdapter,
  ScreenDimensions,
  SafeAreaInsets,
} from "./PlatformAdapter";
