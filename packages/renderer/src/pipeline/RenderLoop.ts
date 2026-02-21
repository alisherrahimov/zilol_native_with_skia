/**
 * RenderLoop.ts — Frame lifecycle manager.
 *
 * Drives the render pipeline:
 *   1. Layout pass (Yoga)
 *   2. Collect damage rects
 *   3. Generate display lists for dirty nodes
 *   4. Execute draw commands on Skia canvas
 *   5. Clear dirty flags
 *   6. Flush surface
 *
 * Integrates with DirtyTracker's `onFrameNeeded` callback.
 */

import type { SkiaNode } from "@zilol-native/nodes";
import { dirtyTracker } from "@zilol-native/nodes";
import type { YogaBridge } from "@zilol-native/layout";
import { syncLayoutResults } from "@zilol-native/layout";
import type { SkSurface } from "../types";
import { collectDamageRects, mergeRects, intersects } from "./DamageRect";
import { DisplayList } from "./DisplayList";
import type { CommandExecutor } from "./DisplayList";
import { drawNode } from "../draw/drawNode";

// ---------------------------------------------------------------------------
// RenderLoop
// ---------------------------------------------------------------------------

export class RenderLoop {
  private _surface: SkSurface | null = null;
  private _rootNode: SkiaNode | null = null;
  private _yogaBridge: YogaBridge | null = null;
  private _executor: CommandExecutor | null = null;
  private _running: boolean = false;

  /** Frame count (for debugging / devtools). */
  frameCount: number = 0;

  /**
   * Start the render loop.
   *
   * @param surface - The Skia surface to draw on
   * @param rootNode - The root of the SkiaNode tree
   * @param yogaBridge - The Yoga layout bridge
   * @param executor - Function to execute DrawCommands on the actual canvas
   */
  start(
    surface: SkSurface,
    rootNode: SkiaNode,
    yogaBridge: YogaBridge,
    executor: CommandExecutor,
  ): void {
    this._surface = surface;
    this._rootNode = rootNode;
    this._yogaBridge = yogaBridge;
    this._executor = executor;
    this._running = true;

    // Register with DirtyTracker — schedule a vsync frame callback
    // so rendering happens inside beginFrame()/endFrame() with an active
    // Metal drawable, rather than calling renderFrame() directly.
    dirtyTracker.onFrameNeeded(() => {
      if (this._running) {
        __skiaRequestFrame(() => {
          this.renderFrame();
        });
      }
    });
  }

  /** Stop the render loop. */
  stop(): void {
    this._running = false;
    this._surface = null;
    this._rootNode = null;
    this._yogaBridge = null;
    this._executor = null;
  }

  /** Whether the loop is currently active. */
  get isRunning(): boolean {
    return this._running;
  }

  /**
   * Execute a single render frame.
   *
   * This is the core frame lifecycle:
   * 1. Layout (Yoga incremental)
   * 2. Collect damage rects
   * 3. Draw dirty subtrees
   * 4. Clear dirty flags
   * 5. Flush surface
   */
  renderFrame(): void {
    const surface = this._surface;
    const root = this._rootNode;
    const bridge = this._yogaBridge;
    const executor = this._executor;

    if (!surface || !root || !bridge || !executor) return;

    // Skip if nothing is dirty
    if (!root.dirty && !root.hasDirtyDescendant) return;

    // 1. Layout pass
    bridge.calculateLayout(surface.width(), surface.height());
    syncLayoutResults(root, bridge);

    // 2. Collect and merge damage rects
    const rawRects = collectDamageRects(root);
    const damageRects = mergeRects(rawRects);

    // 3. Draw — for each damage rect, draw the affected subtree
    if (damageRects.length > 0) {
      for (let i = 0; i < damageRects.length; i++) {
        drawNode(root, damageRects[i], executor);
      }
    }

    // 4. Clear dirty flags
    dirtyTracker.flush();

    // 5. Flush surface
    surface.flush();

    this.frameCount++;
  }
}
