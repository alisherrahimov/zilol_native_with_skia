/**
 * ZilolApp.ts — Application bootstrap and lifecycle management.
 *
 * Wires together:
 * - Runtime (signals / reactive)
 * - SkiaNode tree
 * - Yoga layout bridge (C++ via JSI)
 * - Render pipeline (display list → Skia canvas)
 * - Event dispatch (touch → hit test → handlers)
 * - Frame scheduling (vsync-driven, on-demand)
 */

import { SkiaNode, dirtyTracker } from "@zilol-native/nodes";
import {
  YogaBridge,
  syncLayoutResults,
  setTextMeasurer,
} from "@zilol-native/layout";
import { drawNode, _advanceDebugColor } from "@zilol-native/renderer";
import { EventDispatcher } from "./EventDispatch";
import { createCanvasExecutor } from "./CanvasExecutor";
import {
  setPlatformAdapter,
  JSIPlatformAdapter,
  getPlatformAdapter,
} from "./PlatformAdapter";
import type { PlatformAdapter, ScreenDimensions } from "./PlatformAdapter";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Options for running the app. */
export interface RunAppOptions {
  /**
   * Custom platform adapter. If not provided, defaults to JSIPlatformAdapter
   * which calls the JSI global functions.
   */
  adapter?: PlatformAdapter;

  /**
   * Custom text measurer for Yoga text layout.
   */
  textMeasurer?: Parameters<typeof setTextMeasurer>[0];

  /**
   * Background color to clear the canvas with each frame.
   * @default "#FFFFFF"
   */
  backgroundColor?: string;
}

/** The running app instance. */
export interface ZilolAppInstance {
  /** The root SkiaNode. */
  rootNode: SkiaNode;
  /** The Yoga layout bridge. */
  yogaBridge: YogaBridge;
  /** The event dispatcher. */
  eventDispatcher: EventDispatcher;
  /** Screen dimensions. */
  screenDimensions: ScreenDimensions;
  /** Stop the app and clean up. */
  destroy(): void;
}

// ---------------------------------------------------------------------------
// Global app state
// ---------------------------------------------------------------------------

let _currentApp: ZilolAppInstance | null = null;

// ---------------------------------------------------------------------------
// runApp
// ---------------------------------------------------------------------------

/**
 * Bootstrap and start a Zilol Native application.
 *
 * This is the main entry point. It:
 * 1. Initializes the platform adapter
 * 2. Creates a root SkiaNode sized to the screen
 * 3. Runs the component function to build the tree
 * 4. Sets up the Yoga layout bridge
 * 5. Connects the Skia canvas for rendering
 * 6. Registers touch event handlers
 * 7. Starts the on-demand vsync-driven render loop
 *
 * @param buildTree - Function that builds and returns the root SkiaNode tree
 * @param options - Configuration options
 * @returns The running app instance
 */
export function runApp(
  buildTree: () => SkiaNode,
  options: RunAppOptions = {},
): ZilolAppInstance {
  // 1. Initialize platform adapter
  const adapter = options.adapter ?? new JSIPlatformAdapter();
  setPlatformAdapter(adapter);

  // 2. Get screen dimensions
  const screenDimensions = adapter.getScreenDimensions();

  // 3. Set up text measurer for Yoga layout
  if (options.textMeasurer) {
    setTextMeasurer(options.textMeasurer);
  } else {
    // Default: use Skia's native text measurement via JSI
    setTextMeasurer(
      (text, fontSize, _fontFamily, _fontWeight, maxWidth, widthMode) => {
        const constraintWidth = widthMode === 0 /* Undefined */ ? 0 : maxWidth;
        return __skiaMeasureText(text, fontSize, constraintWidth);
      },
    );
  }

  // 4. Create root node and build tree
  const rootNode = new SkiaNode("view");
  rootNode.setProp("width", screenDimensions.width);
  rootNode.setProp("height", screenDimensions.height);

  const childTree = buildTree();
  rootNode.appendChild(childTree);

  // 5. Initialize Yoga layout bridge
  const yogaBridge = new YogaBridge();
  attachTreeToYoga(rootNode, yogaBridge);

  // 6. Set up event dispatch
  const eventDispatcher = new EventDispatcher();
  eventDispatcher.setRoot(rootNode);

  __registerTouchHandler((phase, x, y, pointerId) => {
    eventDispatcher.handleTouch(phase, x, y, pointerId);
  });

  // 7. Render pipeline
  // NOTE: Metal creates a NEW surface + canvas per frame (beginFrame → endFrame),
  // so we must re-acquire the canvas on every frame, not cache it.
  const bgColor = options.backgroundColor ?? "#FFFFFF";
  const pixelRatio = screenDimensions.scale;
  const layoutWidth = screenDimensions.width;
  const layoutHeight = screenDimensions.height;
  let frameId: number | null = null;

  /**
   * Single frame lifecycle:
   *   1. Acquire the current frame's canvas from the GPU surface
   *   2. Layout pass (Yoga in logical points)
   *   3. Scale canvas by pixel ratio for Retina
   *   4. Clear canvas with background color
   *   5. Draw the full node tree
   *   6. Restore canvas state
   */
  function renderFrame(): void {
    // Acquire THIS frame's surface + canvas (Metal creates new ones per frame)
    const proxy = __skiaGetSurface();
    if (proxy == null) {
      // Surface not ready yet — retry on next vsync
      frameId = adapter.requestAnimationFrame(renderFrame);
      return;
    }
    const canvas = proxy.getCanvas();
    if (canvas == null) {
      frameId = adapter.requestAnimationFrame(renderFrame);
      return;
    }
    const executor = createCanvasExecutor(canvas);

    try {
      // Layout in logical points
      yogaBridge.calculateLayout(layoutWidth, layoutHeight);
      syncLayoutResults(rootNode, yogaBridge);

      // Scale canvas: logical points → physical pixels
      canvas.save();
      canvas.scale(pixelRatio, pixelRatio);

      // Clear
      canvas.clear(bgColor);

      // Draw full tree
      const fullRect = {
        x: 0,
        y: 0,
        width: layoutWidth,
        height: layoutHeight,
      };
      // Advance debug color (no-op when debug is off)
      _advanceDebugColor();
      drawNode(rootNode, fullRect, executor);

      // Restore (actual GPU flush is handled by native endFrame)
      canvas.restore();
    } catch (e: any) {
      // Attempt recovery: restore canvas to avoid state corruption
      try {
        canvas.restore();
      } catch (_) {}
    }

    // Mark frame complete
    frameId = null;
    dirtyTracker.flush();
  }

  // Schedule a frame on the next vsync (deduplicates multiple requests)
  function scheduleFrame(): void {
    if (frameId !== null) return;
    frameId = adapter.requestAnimationFrame(renderFrame);
  }

  // Initial frame — draws the first content
  scheduleFrame();

  // Re-render when signals change
  dirtyTracker.onFrameNeeded(scheduleFrame);

  // 8. Create app instance
  const app: ZilolAppInstance = {
    rootNode,
    yogaBridge,
    eventDispatcher,
    screenDimensions,
    destroy() {
      if (frameId !== null) {
        adapter.cancelAnimationFrame(frameId);
        frameId = null;
      }
      yogaBridge.destroy();
      eventDispatcher.reset();
      _currentApp = null;
    },
  };

  _currentApp = app;
  return app;
}

/**
 * Get the currently running app instance.
 * Returns null if no app is running.
 */
export function getCurrentApp(): ZilolAppInstance | null {
  return _currentApp;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Recursively attach all nodes in a tree to the Yoga bridge.
 */
function attachTreeToYoga(node: SkiaNode, bridge: YogaBridge): void {
  bridge.attachNode(node);
  for (const child of node.children) {
    attachTreeToYoga(child, bridge);
  }
}
