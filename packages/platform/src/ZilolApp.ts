/**
 * ZilolApp.ts — Application bootstrap and lifecycle management.
 *
 * This is the entry point that wires together:
 * - Runtime (signals / reactive)
 * - SkiaNode tree
 * - Yoga layout bridge (C++ via JSI)
 * - Render pipeline (display list → Skia canvas)
 * - Event dispatch (touch → hit test → handlers)
 * - Frame scheduling (vsync-driven)
 *
 * @example
 * ```ts
 * import { runApp } from '@zilol-native/platform';
 *
 * runApp(() => {
 *   const root = new SkiaNode("view");
 *   root.setProp("backgroundColor", "#FFFFFF");
 *   root.setProp("flex", 1);
 *   return root;
 * });
 * ```
 */

import { SkiaNode, dirtyTracker } from "@zilol-native/nodes";
import {
  YogaBridge,
  syncLayoutResults,
  setTextMeasurer,
} from "@zilol-native/layout";
import { RenderLoop } from "@zilol-native/renderer";
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
  /** The render loop. */
  renderLoop: RenderLoop;
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
 * 2. Creates a root SkiaNode
 * 3. Runs the component function to build the tree
 * 4. Sets up the Yoga layout bridge
 * 5. Connects the render loop to the Skia surface
 * 6. Registers touch event handlers
 * 7. Starts the vsync-driven render loop
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

  // 3. Set up text measurer if provided
  if (options.textMeasurer) {
    setTextMeasurer(options.textMeasurer);
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

  // 6. Get Skia surface and create canvas executor
  const surfaceProxy = __skiaGetSurface();
  const canvas = surfaceProxy.getCanvas();
  const executor = createCanvasExecutor(canvas);

  // 7. Create render loop
  const renderLoop = new RenderLoop();
  const bgColor = options.backgroundColor ?? "#FFFFFF";

  // Wrap the render loop to handle frame scheduling
  renderLoop.start(
    surfaceProxy as any, // SkSurface interface
    rootNode,
    yogaBridge,
    (command) => {
      // Before first draw command, clear with background color
      executor(command);
    },
  );

  // 8. Set up event dispatch
  const eventDispatcher = new EventDispatcher();
  eventDispatcher.setRoot(rootNode);

  __registerTouchHandler((phase, x, y, pointerId) => {
    eventDispatcher.handleTouch(phase, x, y, pointerId);
  });

  // 9. Start vsync-driven frame loop
  let frameId: number | null = null;

  function onFrame(timestamp: number): void {
    if (!_currentApp) return;

    // Clear canvas
    canvas.clear(bgColor);

    // Render frame
    renderLoop.renderFrame();

    // Schedule next frame
    frameId = adapter.requestAnimationFrame(onFrame);
  }

  // Register with DirtyTracker so the first dirty signal starts rendering
  dirtyTracker.onFrameNeeded(() => {
    if (frameId === null) {
      frameId = adapter.requestAnimationFrame(onFrame);
    }
  });

  // 10. Create app instance
  const app: ZilolAppInstance = {
    rootNode,
    yogaBridge,
    renderLoop,
    eventDispatcher,
    screenDimensions,
    destroy() {
      if (frameId !== null) {
        adapter.cancelAnimationFrame(frameId);
        frameId = null;
      }
      renderLoop.stop();
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
