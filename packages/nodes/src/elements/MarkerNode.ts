/**
 * MarkerNode — Factory for invisible marker SkiaNodes.
 *
 * Markers are invisible structural nodes used by Show/For to mark
 * positions in the tree where child subtrees are dynamically
 * swapped in and out.
 */

import { SkiaNode } from "../core/SkiaNode";

/** Create a marker node. Markers have no visual props. */
export function createMarkerNode(key?: string): SkiaNode {
  const node = new SkiaNode("marker");
  if (key !== undefined) node.key = key;
  return node;
}
