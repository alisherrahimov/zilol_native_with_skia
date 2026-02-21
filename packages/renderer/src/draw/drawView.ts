/**
 * drawView.ts — Draw commands for view nodes.
 *
 * Generates draw commands for: background, border, shadow, clip.
 */

import type { SkiaNode, Rect } from "@zilol-native/nodes";
import { DisplayList } from "../pipeline/DisplayList";
import type { CommandExecutor } from "../pipeline/DisplayList";

/**
 * Draw a view node.
 *
 * @param node - The view SkiaNode
 * @param damageRect - The damage rect to clip against
 * @param executor - The command executor
 */
export function drawView(
  node: SkiaNode,
  damageRect: Rect,
  executor: CommandExecutor,
): void {
  const list = DisplayList.generateForView(node);
  list.execute(executor);
}
