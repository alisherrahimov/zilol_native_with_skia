/**
 * Compositor.ts — Surface + platform view compositing.
 *
 * Manages the compositing of Skia-drawn content with native platform
 * views (TextInput, Maps, Video, etc.). Platform view nodes record
 * their required native position/size, and the compositor syncs these
 * with the actual native view layer.
 *
 * This is a minimal placeholder — full implementation will be in Phase 5
 * when the platform package is built.
 */

import type { SkiaNode } from "@zilol-native/nodes";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Position and size for a platform view overlay. */
export interface PlatformViewFrame {
  nodeId: number;
  viewType: string;
  x: number;
  y: number;
  width: number;
  height: number;
  props: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Compositor
// ---------------------------------------------------------------------------

export class Compositor {
  /** Collected platform view frames for the current render pass. */
  private _frames: PlatformViewFrame[] = [];

  /**
   * Collect platform view positions from the SkiaNode tree.
   *
   * Called after layout to determine where native views should be placed.
   */
  collectPlatformViews(root: SkiaNode): PlatformViewFrame[] {
    this._frames = [];
    this._walk(root);
    return this._frames;
  }

  /** Get the last collected frames. */
  get frames(): readonly PlatformViewFrame[] {
    return this._frames;
  }

  /** Reset the compositor. */
  reset(): void {
    this._frames = [];
  }

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  private _walk(node: SkiaNode): void {
    if (node.type === "platform") {
      const layout = node.layout;
      this._frames.push({
        nodeId: node.id,
        viewType: (node.props.nativeViewType as string) ?? "unknown",
        x: layout.absoluteX,
        y: layout.absoluteY,
        width: layout.width,
        height: layout.height,
        props: (node.props.nativeProps as Record<string, unknown>) ?? {},
      });
    }

    for (let i = 0; i < node.children.length; i++) {
      this._walk(node.children[i]);
    }
  }
}
