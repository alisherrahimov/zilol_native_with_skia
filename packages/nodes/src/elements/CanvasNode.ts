/**
 * CanvasNode — Factory for canvas-type SkiaNodes.
 *
 * Canvas nodes allow raw Skia drawing via an onDraw callback.
 */

import { SkiaNode } from "../core/SkiaNode";

/** Props specific to a canvas node. */
export interface CanvasNodeProps {
  readonly key?: string;
  readonly onDraw?: (canvas: unknown) => void;
  readonly width?: number | string;
  readonly height?: number | string;
  readonly opacity?: number;
}

/** Create a canvas node with optional initial props. */
export function createCanvasNode(props?: CanvasNodeProps): SkiaNode {
  const node = new SkiaNode("canvas");

  if (props !== undefined) {
    if (props.key !== undefined) node.key = props.key;
    if (props.onDraw !== undefined) node.props.onDraw = props.onDraw;
    if (props.width !== undefined) node.props.width = props.width;
    if (props.height !== undefined) node.props.height = props.height;
    if (props.opacity !== undefined) node.props.opacity = props.opacity;
  }

  return node;
}
