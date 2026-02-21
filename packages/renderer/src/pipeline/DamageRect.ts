/**
 * DamageRect.ts — Damage rect collection and merging.
 *
 * Collects bounding rectangles of dirty nodes and merges overlapping
 * rects to minimize the number of Skia draw calls per frame.
 */

import type { SkiaNode, Rect } from "@zilol-native/nodes";

// ---------------------------------------------------------------------------
// Rect utilities
// ---------------------------------------------------------------------------

/**
 * Test whether two rectangles intersect.
 */
export function intersects(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/**
 * Merge two rectangles into their bounding union.
 */
export function unionRects(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const right = Math.max(a.x + a.width, b.x + b.width);
  const bottom = Math.max(a.y + a.height, b.y + b.height);
  return { x, y, width: right - x, height: bottom - y };
}

// ---------------------------------------------------------------------------
// Collect damage rects
// ---------------------------------------------------------------------------

/**
 * Walk the SkiaNode tree and collect damage rects from dirty nodes.
 *
 * Only visits nodes that are dirty or have dirty descendants, so the
 * walk is proportional to the dirty set, not the full tree.
 *
 * @returns Array of damage rects, or empty array if nothing is dirty.
 */
export function collectDamageRects(root: SkiaNode): Rect[] {
  const rects: Rect[] = [];
  _walk(root, rects);
  return rects;
}

function _walk(node: SkiaNode, rects: Rect[]): void {
  if (node.dirty && node.dirtyRect) {
    rects.push(node.dirtyRect);
  }

  if (node.hasDirtyDescendant) {
    for (let i = 0; i < node.children.length; i++) {
      _walk(node.children[i], rects);
    }
  }
}

// ---------------------------------------------------------------------------
// Merge overlapping rects
// ---------------------------------------------------------------------------

/**
 * Merge overlapping damage rects to reduce draw calls.
 *
 * Uses a simple greedy algorithm: for each rect, try to merge with
 * an existing group. If merged rect area is less than the sum of
 * individual areas * threshold, merge them.
 *
 * For small numbers of rects (typical: 1-10), this is fast enough.
 */
export function mergeRects(rects: Rect[]): Rect[] {
  if (rects.length <= 1) return rects;

  const merged: Rect[] = [rects[0]];

  for (let i = 1; i < rects.length; i++) {
    const rect = rects[i];
    let didMerge = false;

    for (let j = 0; j < merged.length; j++) {
      if (intersects(merged[j], rect)) {
        merged[j] = unionRects(merged[j], rect);
        didMerge = true;
        break;
      }
    }

    if (!didMerge) {
      merged.push(rect);
    }
  }

  return merged;
}
