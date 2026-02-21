/**
 * PlatformNode — Factory for platform-type SkiaNodes.
 *
 * Platform nodes represent native view islands (TextInput, Maps, Video, etc.)
 * that are composited on top of the Skia canvas.
 */

import { SkiaNode } from "../core/SkiaNode";

/** Props specific to a platform node. */
export interface PlatformNodeProps {
  readonly key?: string;
  readonly nativeViewType?: string;
  readonly nativeProps?: Record<string, unknown>;
  readonly width?: number | string;
  readonly height?: number | string;
  readonly opacity?: number;
}

/** Create a platform node with optional initial props. */
export function createPlatformNode(props?: PlatformNodeProps): SkiaNode {
  const node = new SkiaNode("platform");

  if (props !== undefined) {
    if (props.key !== undefined) node.key = props.key;
    if (props.nativeViewType !== undefined)
      node.props.nativeViewType = props.nativeViewType;
    if (props.nativeProps !== undefined)
      node.props.nativeProps = props.nativeProps;
    if (props.width !== undefined) node.props.width = props.width;
    if (props.height !== undefined) node.props.height = props.height;
    if (props.opacity !== undefined) node.props.opacity = props.opacity;
  }

  return node;
}
