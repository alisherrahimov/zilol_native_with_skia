/**
 * drawScroll.ts — Draw commands for scroll nodes.
 *
 * Clips viewport, translates by scroll offset, draws children
 * inside the clipped/translated context, then restores.
 *
 * Uses viewport culling: only children whose layout positions
 * overlap the visible scroll window emit draw commands.
 * Skia's GPU clip is the second line of defense.
 */

import type { SkiaNode, Rect } from "@zilol-native/nodes";
import type { CommandExecutor } from "../pipeline/DisplayList";
import { drawView } from "./drawView";
import { drawNode } from "./drawNode";

/**
 * Draw a scroll node.
 *
 * Flow:
 *   1. Draw background/border (like a view)
 *   2. Save canvas state
 *   3. Clip to viewport bounds (with optional border radius)
 *   4. Translate by negative scroll offset
 *   5. Draw VISIBLE children only (viewport culling)
 *   6. Restore canvas state
 */
export function drawScroll(
  node: SkiaNode,
  damageRect: Rect,
  executor: CommandExecutor,
): void {
  const layout = node.layout;

  // Draw the view part (background, border)
  drawView(node, damageRect, executor);

  // Save canvas state for clip + translate
  executor({
    type: "save",
  });

  // Resolve border radius for the clip rect
  const brValue = node.props.borderRadius;
  const br = typeof brValue === "number" ? brValue : 0;

  // Clip to viewport bounds
  executor({
    type: "clipRRect",
    x: layout.absoluteX,
    y: layout.absoluteY,
    width: layout.width,
    height: layout.height,
    rx: br,
    ry: br,
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

  // Viewport culling: compute the visible content window.
  // Children are laid out relative to the scroll node's origin.
  // A child is visible if its bottom edge > scrollY AND its top edge < scrollY + viewportH.
  const viewportW = layout.width;
  const viewportH = layout.height;
  const isHorizontal = !!node.props.horizontal;

  // Create a damage rect that covers the visible content area
  // (in the scroll node's coordinate space, accounting for the offset)
  const scrollDamageRect: Rect = {
    x: layout.absoluteX + (isHorizontal ? scrollX : 0),
    y: layout.absoluteY + (isHorizontal ? 0 : scrollY),
    width: isHorizontal ? viewportW + scrollX : viewportW,
    height: isHorizontal ? viewportH : viewportH + scrollY,
  };

  // Draw only children that overlap the visible window
  const children = node.children;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const cl = child.layout;

    // Quick viewport check using child's absolute layout position
    if (isHorizontal) {
      // Horizontal: check x-axis overlap
      const childRight = cl.absoluteX + cl.width;
      const viewLeft = layout.absoluteX + scrollX;
      const viewRight = viewLeft + viewportW;
      if (childRight < viewLeft || cl.absoluteX > viewRight) continue;
    } else {
      // Vertical: check y-axis overlap
      const childBottom = cl.absoluteY + cl.height;
      const viewTop = layout.absoluteY + scrollY;
      const viewBottom = viewTop + viewportH;
      if (childBottom < viewTop || cl.absoluteY > viewBottom) continue;
    }

    drawNode(child, scrollDamageRect, executor);
  }

  // Restore canvas state (removes clip + translate)
  executor({
    type: "restore",
  });
}
