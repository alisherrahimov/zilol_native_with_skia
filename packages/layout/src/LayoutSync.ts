/**
 * LayoutSync.ts — Sync computed layout from Yoga back to SkiaNodes.
 *
 * After Yoga calculates layout, this module reads the computed values
 * via JSI and writes them back to SkiaNode.layout, including accumulated
 * absolute positions.
 */

import type { SkiaNode } from "@zilol-native/nodes";
import type { YogaBridge } from "./YogaBridge";

// ---------------------------------------------------------------------------
// Layout sync
// ---------------------------------------------------------------------------

/**
 * Sync computed layout from Yoga back to SkiaNodes.
 *
 * Walks the SkiaNode tree starting from the root, reads computed
 * layout from the corresponding Yoga node via JSI, and updates the
 * SkiaNode's layout fields.
 *
 * @param root - The root SkiaNode
 * @param bridge - The YogaBridge that holds the handle map
 */
export function syncLayoutResults(root: SkiaNode, bridge: YogaBridge): void {
  _syncNode(root, bridge, 0, 0);
}

/**
 * Recursively sync a single node and its children.
 *
 * @param node - The SkiaNode to sync
 * @param bridge - The YogaBridge
 * @param parentAbsX - Parent's absolute X position
 * @param parentAbsY - Parent's absolute Y position
 */
function _syncNode(
  node: SkiaNode,
  bridge: YogaBridge,
  parentAbsX: number,
  parentAbsY: number,
): void {
  const computedLayout = bridge.getComputedLayout(node);
  if (!computedLayout) return;

  const x = computedLayout.left;
  const y = computedLayout.top;
  const width = computedLayout.width;
  const height = computedLayout.height;
  const absoluteX = parentAbsX + x;
  const absoluteY = parentAbsY + y;

  // Only update if layout actually changed
  const old = node.layout;
  if (
    old.x !== x ||
    old.y !== y ||
    old.width !== width ||
    old.height !== height ||
    old.absoluteX !== absoluteX ||
    old.absoluteY !== absoluteY
  ) {
    node.layout = { x, y, width, height, absoluteX, absoluteY };
  }

  // Recurse into children
  for (let i = 0; i < node.children.length; i++) {
    _syncNode(node.children[i], bridge, absoluteX, absoluteY);
  }
}
