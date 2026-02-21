/**
 * types.ts — Shared types for the component builder system.
 *
 * Defines the Component interface and helper for resolving
 * builder instances to their underlying SkiaNodes.
 */

import type { SkiaNode } from "@zilol-native/nodes";

// ---------------------------------------------------------------------------
// Component interface
// ---------------------------------------------------------------------------

/**
 * Any object that wraps a SkiaNode.
 *
 * Both ViewBuilder and TextBuilder implement this interface.
 * This allows builders to be passed as children to other builders.
 */
export interface Component {
  /** The underlying SkiaNode. */
  readonly node: SkiaNode;
}

// ---------------------------------------------------------------------------
// Children
// ---------------------------------------------------------------------------

/** A valid child: another component builder, a raw SkiaNode, or falsy. */
export type ComponentChild = Component | SkiaNode | null | undefined | false;

// ---------------------------------------------------------------------------
// Resolve
// ---------------------------------------------------------------------------

/**
 * Extract the underlying SkiaNode from a ComponentChild.
 *
 * If the child is a builder (has `.node`), returns the node.
 * If the child is already a SkiaNode, returns it directly.
 */
export function resolveNode(child: ComponentChild): SkiaNode | null {
  if (child == null || child === false) return null;
  if ("node" in child && child.node !== undefined) return child.node;
  return child as SkiaNode;
}
