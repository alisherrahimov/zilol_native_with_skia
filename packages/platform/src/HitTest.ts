/**
 * HitTest.ts — Point-in-rect hit testing for the SkiaNode tree.
 *
 * Since Zilol Native renders everything onto a single Skia canvas,
 * there are no native views to receive touch events. This module
 * implements hit testing by walking the SkiaNode tree in reverse
 * paint order (front-to-back) and checking point-in-rect.
 *
 * Respects:
 * - `overflow: hidden` (clip children to parent bounds)
 * - `pointerEvents: none | box-none | box-only`
 * - Node visibility
 */

import type { SkiaNode } from "@zilol-native/nodes";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Point {
  x: number;
  y: number;
}

// ---------------------------------------------------------------------------
// Hit testing
// ---------------------------------------------------------------------------

/**
 * Find the frontmost SkiaNode at a given point.
 *
 * Walks the tree in reverse child order (front-to-back in painter's
 * algorithm) and returns the first node whose layout bounds contain
 * the point.
 *
 * @param root - Root of the SkiaNode tree
 * @param point - Touch point in screen coordinates
 * @returns The hit node, or null if no node was hit
 */
export function hitTest(root: SkiaNode, point: Point): SkiaNode | null {
  return hitTestNode(root, point);
}

/**
 * Recursive hit test implementation.
 */
function hitTestNode(node: SkiaNode, point: Point): SkiaNode | null {
  // Skip invisible nodes
  if (node.props.visible === false) return null;

  // Skip if pointerEvents is 'none'
  const pointerEvents = node.props.pointerEvents as string | undefined;
  if (pointerEvents === "none") return null;

  // Transform point into node's local coordinate space
  const localX = point.x - node.layout.absoluteX;
  const localY = point.y - node.layout.absoluteY;

  // Check if point is within node's bounds
  const inBounds =
    localX >= 0 &&
    localX <= node.layout.width &&
    localY >= 0 &&
    localY <= node.layout.height;

  // If overflow is hidden and point is outside, skip entire subtree
  if (node.props.overflow === "hidden" && !inBounds) {
    return null;
  }

  // Check children in reverse order (front to back) unless box-only
  if (pointerEvents !== "box-only") {
    for (let i = node.children.length - 1; i >= 0; i--) {
      const hit = hitTestNode(node.children[i], point);
      if (hit) return hit;
    }
  }

  // Check self — node must be "touchable" (has event handlers)
  if (pointerEvents === "box-none") return null;

  if (inBounds && isTouchable(node)) {
    return node;
  }

  return null;
}

/**
 * Check if a node has any touch/gesture handlers.
 */
function isTouchable(node: SkiaNode): boolean {
  return !!(
    node.props.onPress ||
    node.props.onPressIn ||
    node.props.onPressOut ||
    node.props.onLongPress ||
    node.props.onTouchStart ||
    node.props.onTouchMove ||
    node.props.onTouchEnd
  );
}
