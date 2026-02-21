/**
 * drawScroll.ts — Draw commands for scroll nodes.
 *
 * Clips viewport, translates by scroll offset, then draws children.
 */

import type { SkiaNode, Rect } from "@zilol-native/nodes";
import type { CommandExecutor } from "../pipeline/DisplayList";
import { drawView } from "./drawView";

/**
 * Draw a scroll node.
 *
 * A scroll node is essentially a view node with a viewport clip
 * and a content offset translation. The children are drawn relative
 * to the scroll offset.
 */
export function drawScroll(
  node: SkiaNode,
  damageRect: Rect,
  executor: CommandExecutor,
): void {
  const layout = node.layout;

  // Draw the view part (background, border)
  drawView(node, damageRect, executor);

  // Clip to viewport
  executor({
    type: "save",
  });

  executor({
    type: "clipRRect",
    x: layout.absoluteX,
    y: layout.absoluteY,
    width: layout.width,
    height: layout.height,
    rx: 0,
    ry: 0,
  });

  // Translate by scroll offset
  const scrollX = (node.props.scrollX as number) ?? 0;
  const scrollY = (node.props.scrollY as number) ?? 0;

  if (scrollX !== 0 || scrollY !== 0) {
    executor({
      type: "translate",
      dx: -scrollX,
      dy: -scrollY,
    });
  }

  // Children are drawn by drawNode — it handles recursion.
  // We just provide the clip/translation context here.

  executor({
    type: "restore",
  });
}
