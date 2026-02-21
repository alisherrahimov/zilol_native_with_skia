/**
 * ScrollNode — Factory for scroll-type SkiaNodes.
 *
 * Scroll nodes are containers with scroll offsets, viewport clipping,
 * and physics-based scroll behavior (deceleration, rubber-band, snap).
 */

import { SkiaNode } from "../core/SkiaNode";
import type { SkiaNodeProps } from "../core/types";

/** Props specific to a scroll node. */
export interface ScrollNodeProps {
  readonly key?: string;

  // Scroll offsets
  readonly scrollX?: number;
  readonly scrollY?: number;

  // Scroll behavior
  readonly horizontal?: boolean;
  readonly bounces?: boolean;
  readonly showsScrollIndicator?: boolean;
  readonly scrollEnabled?: boolean;
  readonly pagingEnabled?: boolean;
  readonly snapToInterval?: number;
  readonly decelerationRate?: "normal" | "fast" | number;

  // Content dimensions (computed by controller)
  readonly contentWidth?: number;
  readonly contentHeight?: number;

  // Scroll events
  readonly onScroll?: (offset: { x: number; y: number }) => void;
  readonly onScrollEnd?: (offset: { x: number; y: number }) => void;
  readonly onScrollBeginDrag?: () => void;
  readonly onScrollEndDrag?: () => void;

  // Visual
  readonly opacity?: number;
  readonly backgroundColor?: string;
  readonly borderRadius?: number;
  readonly borderWidth?: number;
  readonly borderColor?: string;

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

  // Default scroll behavior
  node.props.scrollX = 0;
  node.props.scrollY = 0;
  node.props.bounces = true;
  node.props.scrollEnabled = true;
  node.props.showsScrollIndicator = true;

  if (props !== undefined) {
    if (props.key !== undefined) node.key = props.key;
    const { key: _key, ...rest } = props;
    Object.assign(node.props, rest);
  }

  return node;
}
