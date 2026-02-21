/**
 * DirtyTracker — Global dirty tracking singleton.
 *
 * Collects dirty nodes across the tree, merges damage rects,
 * and notifies the renderer when a frame is needed.
 *
 * The renderer (Phase 3) registers a frame callback via `onFrameNeeded`.
 * When any node is marked dirty through this tracker, the callback is
 * invoked (at most once per batch).
 *
 * @example
 * ```ts
 * import { dirtyTracker } from '@zilol-native/nodes';
 *
 * dirtyTracker.onFrameNeeded(() => {
 *   const damage = dirtyTracker.collectDamageRect();
 *   // render only the damaged area
 *   dirtyTracker.flush();
 * });
 * ```
 */

import type { SkiaNode } from "./SkiaNode";
import type { Rect, DirtyReason, FrameCallback } from "./types";

// ---------------------------------------------------------------------------
// DirtyTracker
// ---------------------------------------------------------------------------

class DirtyTrackerImpl {
  /** All nodes marked dirty since last flush. */
  private readonly _dirtyNodes: Set<SkiaNode> = new Set();

  /** Registered frame callback. */
  private _frameCallback: FrameCallback | null = null;

  /** Whether a frame has already been requested this batch. */
  private _frameRequested: boolean = false;

  /**
   * Mark a node dirty and schedule a frame if needed.
   * Also delegates to node.markDirty() for tree propagation.
   */
  markDirty(node: SkiaNode, reason: DirtyReason): void {
    node.markDirty(reason);
    this._dirtyNodes.add(node);
    this._requestFrame();
  }

  /**
   * Notify that a node is already dirty — add it and request a frame,
   * but do NOT call node.markDirty() again (avoids recursion when
   * called from within SkiaNode.markDirty).
   */
  notifyDirty(node: SkiaNode): void {
    this._dirtyNodes.add(node);
    this._requestFrame();
  }

  /**
   * Collect the merged damage rect from all dirty nodes.
   * Returns null if no nodes are dirty.
   */
  collectDamageRect(): Rect | null {
    if (this._dirtyNodes.size === 0) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const node of this._dirtyNodes) {
      const rect = node.dirtyRect;
      if (rect === null) continue;

      if (rect.x < minX) minX = rect.x;
      if (rect.y < minY) minY = rect.y;
      if (rect.x + rect.width > maxX) maxX = rect.x + rect.width;
      if (rect.y + rect.height > maxY) maxY = rect.y + rect.height;
    }

    if (minX === Infinity) return null;

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Flush all dirty markers after a render pass.
   * Clears dirty flags on all tracked nodes and resets the set.
   */
  flush(): void {
    for (const node of this._dirtyNodes) {
      node.clearDirty();
    }
    this._dirtyNodes.clear();
    this._frameRequested = false;
  }

  /**
   * Register a callback to be invoked when a render frame is needed.
   * Only one callback can be registered at a time.
   */
  onFrameNeeded(callback: FrameCallback): void {
    this._frameCallback = callback;
  }

  /** Get the number of dirty nodes (for testing/devtools). */
  get dirtyCount(): number {
    return this._dirtyNodes.size;
  }

  /** Reset tracker state — for testing only. */
  _reset(): void {
    this._dirtyNodes.clear();
    this._frameCallback = null;
    this._frameRequested = false;
  }

  // --- Internal ---

  private _requestFrame(): void {
    if (this._frameRequested) return;
    if (this._frameCallback === null) return;

    this._frameRequested = true;
    this._frameCallback();
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

/** Global dirty tracker singleton. */
export const dirtyTracker = new DirtyTrackerImpl();
