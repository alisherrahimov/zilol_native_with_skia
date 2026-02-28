/**
 * ZilolApp.ts — Application bootstrap and lifecycle management.
 *
 * Wires together:
 * - Runtime (signals / reactive)
 * - SkiaNode tree (mirrored to C++ via JSI)
 * - Yoga layout bridge (C++ via JSI)
 * - C++ render pipeline (SkiaNodeRenderer draws directly)
 * - Event dispatch (touch → hit test → handlers)
 * - Frame scheduling (vsync-driven layout sync)
 *
 * Rendering is handled entirely by C++ (SkiaNodeRenderer.h).
 * This file only manages tree construction, layout, and event wiring.
 */

import { SkiaNode, dirtyTracker } from "@zilol-native/nodes";
import {
  YogaBridge,
  syncLayoutResults,
  setTextMeasurer,
} from "@zilol-native/layout";
import { EventDispatcher } from "./EventDispatch";
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
   * Passed to C++ renderer via node prop.
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
 * 5. Registers touch event handlers
 * 6. Starts the vsync-driven layout loop (rendering is in C++)
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
      (
        text,
        fontSize,
        _fontFamily,
        fontWeight,
        maxWidth,
        widthMode,
        _maxHeight,
        _heightMode,
        lineHeight,
        maxLines,
      ) => {
        return __skiaMeasureText(
          text,
          fontSize,
          maxWidth,
          lineHeight,
          fontWeight,
          maxLines,
          widthMode,
        );
      },
    );
  }

  // 4. Create root node and build tree
  const rootNode = new SkiaNode("view");
  rootNode.setProp("width", screenDimensions.width);
  rootNode.setProp("height", screenDimensions.height);
  rootNode.setProp("backgroundColor", options.backgroundColor ?? "#FFFFFF");

  const childTree = buildTree();
  rootNode.appendChild(childTree);

  // Set root in C++ node tree for direct rendering
  if (
    (rootNode as any).cppNodeId &&
    typeof (globalThis as any).__nodeSetRoot === "function"
  ) {
    (globalThis as any).__nodeSetRoot((rootNode as any).cppNodeId);
  }

  // 5. Initialize Yoga layout bridge
  const yogaBridge = new YogaBridge();
  attachTreeToYoga(rootNode, yogaBridge);

  // 6. Set up event dispatch
  const eventDispatcher = new EventDispatcher();
  eventDispatcher.setRoot(rootNode);

  __registerTouchHandler((phase, x, y, pointerId) => {
    eventDispatcher.handleTouch(phase, x, y, pointerId);
  });

  // 7. Layout-only frame loop
  // Rendering is handled by C++ SkiaNodeRenderer in onVsync.
  // This loop only syncs Yoga layout when the tree is dirty.
  const layoutWidth = screenDimensions.width;
  const layoutHeight = screenDimensions.height;
  let frameId: number | null = null;

  function layoutFrame(): void {
    try {
      yogaBridge.calculateLayout(layoutWidth, layoutHeight);
      syncLayoutResults(rootNode, yogaBridge);
    } catch (e: any) {
      // Layout error — log but don't crash
    }
    frameId = null;
    dirtyTracker.flush();
  }

  function scheduleFrame(): void {
    if (frameId !== null) return;
    frameId = adapter.requestAnimationFrame(layoutFrame);
  }

  // Initial layout
  scheduleFrame();

  // Re-layout when signals change
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
