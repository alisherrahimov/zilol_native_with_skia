/**
 * ImageNode — Factory for image-type SkiaNodes.
 *
 * Image nodes render bitmaps with resize modes and optional tinting.
 */

import { SkiaNode } from "../core/SkiaNode";
import type { SkiaNodeProps } from "../core/types";

/** Props specific to an image node. */
export interface ImageNodeProps {
  readonly key?: string;
  readonly src?: string;
  readonly resizeMode?: SkiaNodeProps["resizeMode"];
  readonly tintColor?: string;
  readonly opacity?: number;

  // Layout props
  readonly width?: number | string;
  readonly height?: number | string;
  readonly flex?: number;
  readonly alignSelf?: SkiaNodeProps["alignSelf"];
  readonly margin?: number;
  readonly marginTop?: number;
  readonly marginRight?: number;
  readonly marginBottom?: number;
  readonly marginLeft?: number;
}

/** Create an image node with optional initial props. */
export function createImageNode(props?: ImageNodeProps): SkiaNode {
  const node = new SkiaNode("image");

  if (props !== undefined) {
    if (props.key !== undefined) node.key = props.key;
    const { key: _key, ...rest } = props;
    Object.assign(node.props, rest);
  }
  return node;
}
