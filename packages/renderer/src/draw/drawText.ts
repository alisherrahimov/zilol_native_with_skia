/**
 * drawText.ts — Draw commands for text nodes.
 */

import type { SkiaNode, Rect } from "@zilol-native/nodes";
import { DisplayList } from "../pipeline/DisplayList";
import type { CommandExecutor } from "../pipeline/DisplayList";

/**
 * Draw a text node.
 */
export function drawText(
  node: SkiaNode,
  damageRect: Rect,
  executor: CommandExecutor,
): void {
  const list = DisplayList.generateForText(node);
  list.execute(executor);
}
