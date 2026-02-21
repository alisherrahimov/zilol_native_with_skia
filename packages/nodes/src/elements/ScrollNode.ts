/**
 * ScrollNode — Factory for scroll-type SkiaNodes.
 *
 * Scroll nodes are containers with scroll offsets and viewport clipping.
 */

import { SkiaNode } from "../core/SkiaNode";
import type { SkiaNodeProps } from "../core/types";

/** Props specific to a scroll node. */
export interface ScrollNodeProps {
  readonly key?: string;
  readonly scrollX?: number;
  readonly scrollY?: number;
  readonly horizontal?: boolean;
  readonly bounces?: boolean;
  readonly showsScrollIndicator?: boolean;
  readonly opacity?: number;

  // Layout props
  readonly width?: number | string;
  readonly height?: number | string;
  readonly flex?: number;
  readonly flexDirection?: SkiaNodeProps["flexDirection"];
  readonly padding?: number;
  readonly paddingTop?: number;
  readonly paddingRight?: number;
  readonly paddingBottom?: number;
  readonly paddingLeft?: number;
}

/** Create a scroll node with optional initial props. */
export function createScrollNode(props?: ScrollNodeProps): SkiaNode {
  const node = new SkiaNode("scroll");

  // Scroll nodes clip by default
  node.props.clip = true;
  node.props.overflow = "scroll";

  if (props !== undefined) {
    if (props.key !== undefined) node.key = props.key;
    const { key: _key, ...rest } = props;
    Object.assign(node.props, rest);
  }

  return node;
}
