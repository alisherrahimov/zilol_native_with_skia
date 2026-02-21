/**
 * TextNode — Factory for text-type SkiaNodes.
 *
 * Text nodes render text content via the Skia Paragraph API (Phase 3).
 * They support font sizing, weight, color, alignment, and line clamping.
 */

import { SkiaNode } from "../core/SkiaNode";
import type { SkiaNodeProps } from "../core/types";

/** Props specific to a text node. */
export interface TextNodeProps {
  readonly key?: string;
  readonly text?: string;
  readonly fontSize?: number;
  readonly fontFamily?: string;
  readonly fontWeight?: SkiaNodeProps["fontWeight"];
  readonly color?: string;
  readonly lineHeight?: number;
  readonly maxLines?: number;
  readonly textAlign?: SkiaNodeProps["textAlign"];
  readonly textOverflow?: SkiaNodeProps["textOverflow"];
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
  readonly marginHorizontal?: number;
  readonly marginVertical?: number;
}

/** Create a text node with optional initial props. */
export function createTextNode(props?: TextNodeProps): SkiaNode {
  const node = new SkiaNode("text");

  if (props !== undefined) {
    if (props.key !== undefined) node.key = props.key;
    const { key: _key, ...rest } = props;
    Object.assign(node.props, rest);
  }

  return node;
}
