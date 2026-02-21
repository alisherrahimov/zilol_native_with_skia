/**
 * ActivityIndicatorNode — Factory for activity-indicator-type SkiaNodes.
 *
 * A spinning loading indicator drawn as a stroked arc.
 * Default size: 36×36.
 */

import { SkiaNode } from "../core/SkiaNode";

/** Create an activity indicator node. */
export function createActivityIndicatorNode(): SkiaNode {
  const node = new SkiaNode("activityIndicator");
  node.props.width = 36;
  node.props.height = 36;
  return node;
}
