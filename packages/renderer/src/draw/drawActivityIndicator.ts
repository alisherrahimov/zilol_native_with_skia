/**
 * drawActivityIndicator.ts — Draw commands for activity indicator nodes.
 *
 * Draws a spinning arc (stroked circle segment) that rotates
 * around the node's center. The rotation angle is stored as
 * `_rotationAngle` in the node's props, updated by the
 * component's animation loop.
 */

import type { SkiaNode, Rect } from "@zilol-native/nodes";
import type { CommandExecutor } from "../pipeline/DisplayList";

/**
 * Draw an activity indicator (spinning arc).
 *
 * Flow:
 *   1. Save canvas state
 *   2. Rotate around center by _rotationAngle
 *   3. Draw a stroked arc (270° sweep)
 *   4. Restore canvas state
 */
export function drawActivityIndicator(
  node: SkiaNode,
  _damageRect: Rect,
  executor: CommandExecutor,
): void {
  const layout = node.layout;
  const props = node.props;

  // Skip if not animating and hidden
  if (props.visible === false) return;

  const w = layout.width;
  const h = layout.height;
  if (w <= 0 || h <= 0) return;

  const cx = layout.absoluteX + w / 2;
  const cy = layout.absoluteY + h / 2;
  const radius = Math.min(w, h) / 2 - 2; // slight inset for stroke
  const color = (props.color as string) ?? "#FFFFFF";
  const strokeWidth = Math.max(2, radius * 0.2); // proportional stroke
  const angle = (props._rotationAngle as number) ?? 0;

  // Save → Rotate → Draw Arc → Restore
  executor({ type: "save" });

  executor({
    type: "rotate",
    degrees: angle,
    cx,
    cy,
  });

  executor({
    type: "drawArc",
    cx,
    cy,
    radius,
    startAngle: 0,
    sweepAngle: 270,
    color,
    strokeWidth,
  });

  executor({ type: "restore" });
}
