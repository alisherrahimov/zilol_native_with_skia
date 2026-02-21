/**
 * ViewNode — Factory for view-type SkiaNodes.
 *
 * A view is the fundamental building block: a rectangle that can have
 * background color, border, shadow, border radius, and clip children.
 */

import { SkiaNode } from "../core/SkiaNode";
import type { SkiaNodeProps } from "../core/types";

/** Props specific to a view node. */
export interface ViewNodeProps {
  readonly key?: string;
  readonly backgroundColor?: string;
  readonly borderRadius?: SkiaNodeProps["borderRadius"];
  readonly borderWidth?: number;
  readonly borderColor?: string;
  readonly shadow?: SkiaNodeProps["shadow"];
  readonly opacity?: number;
  readonly clip?: boolean;
  readonly overflow?: SkiaNodeProps["overflow"];

  // Layout props
  readonly width?: number | string;
  readonly height?: number | string;
  readonly flex?: number;
  readonly flexDirection?: SkiaNodeProps["flexDirection"];
  readonly justifyContent?: SkiaNodeProps["justifyContent"];
  readonly alignItems?: SkiaNodeProps["alignItems"];
  readonly alignSelf?: SkiaNodeProps["alignSelf"];
  readonly position?: SkiaNodeProps["position"];
  readonly padding?: number;
  readonly paddingTop?: number;
  readonly paddingRight?: number;
  readonly paddingBottom?: number;
  readonly paddingLeft?: number;
  readonly paddingHorizontal?: number;
  readonly paddingVertical?: number;
  readonly margin?: number;
  readonly marginTop?: number;
  readonly marginRight?: number;
  readonly marginBottom?: number;
  readonly marginLeft?: number;
  readonly marginHorizontal?: number;
  readonly marginVertical?: number;
  readonly top?: number | string;
  readonly right?: number | string;
  readonly bottom?: number | string;
  readonly left?: number | string;

  // Interaction
  readonly touchable?: boolean;
  readonly onPress?: () => void;
  readonly onPressIn?: () => void;
  readonly onPressOut?: () => void;
  readonly onLongPress?: () => void;
}

/** Create a view node with optional initial props. */
export function createViewNode(props?: ViewNodeProps): SkiaNode {
  const node = new SkiaNode("view");

  if (props !== undefined) {
    if (props.key !== undefined) node.key = props.key;
    applyViewProps(node, props);
  }

  return node;
}

/** Apply view-specific props to a node. */
function applyViewProps(node: SkiaNode, props: ViewNodeProps): void {
  const { key: _key, ...rest } = props;
  Object.assign(node.props, rest);
}
