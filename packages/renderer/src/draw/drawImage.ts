/**
 * drawImage.ts — Draw commands for image nodes.
 */

import type { SkiaNode, Rect } from "@zilol-native/nodes";
import { DisplayList } from "../pipeline/DisplayList";
import type { CommandExecutor } from "../pipeline/DisplayList";

/**
 * Draw an image node.
 */
export function drawImage(
  node: SkiaNode,
  damageRect: Rect,
  executor: CommandExecutor,
): void {
  const list = DisplayList.generateForImage(node);
  list.execute(executor);
}
